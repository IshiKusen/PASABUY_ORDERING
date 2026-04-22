const express = require('express');
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const { authenticate, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Memory storage for cloud uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

/**
 * Helper to upload a file to Supabase Storage
 * Returns the public URL of the uploaded file
 */
const uploadToSupabase = async (file) => {
  // Use a flat structure in the bucket for simplicity
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;

  const { data, error } = await supabase.storage
    .from('products')
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('products')
    .getPublicUrl(fileName);

  return publicUrl;
};

/**
 * Syncs an external image URL to Supabase storage if it's not already hosted there.
 */
const syncExternalImage = async (url) => {
  if (!url || !url.startsWith('http')) return url;
  
  // Skip if already in our Supabase storage
  if (url.includes('supabase.co') && url.includes('/storage/v1/object/public/products/')) {
    return url;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) return url;

    const buffer = Buffer.from(await response.arrayBuffer());
    const mimetype = response.headers.get('content-type') || 'image/jpeg';
    const extension = mimetype.split('/')[1]?.split('+')[0] || 'jpg';
    
    const mockFile = {
      originalname: `synced_${Date.now()}.${extension}`,
      buffer: buffer,
      mimetype: mimetype
    };

    return await uploadToSupabase(mockFile);
  } catch (err) {
    console.warn('Failed to sync external image:', url, err.message);
    return url; // Fallback to original URL
  }
};

// GET /api/products - List all active products (public)
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let query = supabase
      .from('products')
      .select('*, categories(name), product_variants(*)')
      .eq('is_active', true);
    
    if (category && category !== 'All') {
      const { data: cat } = await supabase.from('categories').select('id').eq('name', category).single();
      if (cat) query = query.eq('category_id', cat.id);
    }
    
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: products, error } = await query.order('name');
    if (error) throw error;

    const productsWithVariants = (products || []).map(p => {
        const variants = p.product_variants || [];
        const prices = variants.length > 0 
            ? variants.map(v => Number(v.price_php))
            : [Number(p.price_php)];
        
        return {
            ...p,
            variants,
            category_name: p.categories?.name,
            has_variants: variants.length > 0,
            min_price: Math.min(...prices),
            max_price: Math.max(...prices)
        };
    });

    res.json({ products: productsWithVariants });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});


const { identifyProductFromBarcode } = require('../services/gemini');

// GET /api/products/lookup/:barcode - Tiered Product Lookup
router.get('/lookup/:barcode', authenticate, requireAdmin, async (req, res) => {
  const { barcode } = req.params;
  
  try {
    // TIER 0: Local Database Search
    const { data: localProduct } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .maybeSingle();

    if (localProduct) {
      return res.json({
        name: localProduct.name,
        brand: localProduct.brand,
        image: localProduct.image_path,
        source: 'local-db'
      });
    }

    // TIER 1: UPCitemdb (General)
    try {
      const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
      const upcData = await upcRes.json();
      if (upcData.code === 'OK' && upcData.items?.length > 0) {
        const item = upcData.items[0];
        return res.json({ 
          name: item.title, 
          brand: item.brand, 
          image: item.images?.[0] || null, 
          source: 'upcitemdb' 
        });
      }
    } catch (e) { console.warn('UPCitemdb failed:', e.message); }

    // TIER 2: Open Food Facts (Best for Japanese Snacks & Food - FREE)
    try {
      const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const offData = await offRes.json();
      if (offData.status === 1 && offData.product) {
        return res.json({
          name: offData.product.product_name || offData.product.generic_name,
          brand: offData.product.brands,
          image: offData.product.image_url || null,
          source: 'openfoodfacts'
        });
      }
    } catch (e) { console.warn('OpenFoodFacts failed:', e.message); }

    // TIER 3: Go-UPC (Requires Key)
    if (process.env.GO_UPC_API_KEY) {
      try {
        const goRes = await fetch(`https://go-upc.com/api/v1/code/${barcode}`, {
          headers: { 'Authorization': `Bearer ${process.env.GO_UPC_API_KEY}` }
        });
        const goData = await goRes.json();
        if (goData.product) {
          return res.json({ 
            name: goData.product.name, 
            brand: goData.product.brand, 
            image: goData.product.imageUrl || null, 
            source: 'go-upc' 
          });
        }
      } catch (e) { console.warn('Go-UPC failed:', e.message); }
    }

    // TIER 4: Gemini AI (Smart Fallback)
    const aiData = await identifyProductFromBarcode(barcode);
    if (aiData && aiData.name) {
      return res.json({ 
        ...aiData, 
        source: 'gemini-ai', 
        image: null 
      });
    }

    res.status(404).json({ error: 'Product not found in any database.' });
  } catch (err) {
    console.error('Lookup system error:', err);
    res.status(500).json({ error: 'Search failed. Please enter manually.' });
  }
});


// GET /api/products/:id - Get single product
router.get('/:id', async (req, res) => {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*, categories(name), product_variants(*)')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product.' });
  }
});

// POST /api/products - Create product (admin)
router.post('/', authenticate, requireAdmin, upload.any(), async (req, res) => {
  try {
    const { name, description, price_php, price_jpy, category_id, stock, barcode, brand } = req.body;
    
    // Handle main product image
    let image_path = req.body.image_path || null;
    const baseFile = req.files.find(f => f.fieldname === 'image');
    if (baseFile) {
      image_path = await uploadToSupabase(baseFile);
    } else if (image_path && image_path.startsWith('http')) {
      // Sync external image from barcode lookup or paste
      image_path = await syncExternalImage(image_path);
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert([{ 
        name, description, 
        price_php: Number(price_php) || 0, 
        price_jpy: Number(price_jpy) || null, 
        category_id: Number(category_id), 
        stock: Number(stock) || 0, 
        image_path,
        barcode,
        brand
      }])
      .select()
      .single();

    if (error) throw error;

    // Handle variants
    if (req.body.variants) {
      const variantsData = JSON.parse(req.body.variants);
      const variantsToInsert = [];

      for (let i = 0; i < variantsData.length; i++) {
        const v = variantsData[i];
        let vImagePath = v.image_path || null;
        const variantFile = req.files.find(f => f.fieldname === `variant_image_${i}`);
        if (variantFile) {
          vImagePath = await uploadToSupabase(variantFile);
        } else if (vImagePath && vImagePath.startsWith('http')) {
          vImagePath = await syncExternalImage(vImagePath);
        }

        variantsToInsert.push({
          product_id: product.id,
          variant_name: v.variant_name,
          price_php: Number(v.price_php) || 0,
          price_jpy: Number(v.price_jpy) || null,
          stock: Number(v.stock) || 0,
          image_path: vImagePath
        });
      }

      if (variantsToInsert.length > 0) {
        const { error: vError } = await supabase.from('product_variants').insert(variantsToInsert);
        if (vError) throw vError;
      }
    }

    res.status(201).json({ product });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/products/:id - Update product (admin)
router.patch('/:id', authenticate, requireAdmin, upload.any(), async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, description, price_php, price_jpy, category_id, stock, barcode, brand } = req.body;

    // Handle main product image
    let image_path = req.body.image_path; // retain existing if not new
    const baseFile = req.files.find(f => f.fieldname === 'image');
    if (baseFile) {
      image_path = await uploadToSupabase(baseFile);
    } else if (image_path && image_path.startsWith('http')) {
      image_path = await syncExternalImage(image_path);
    }

    const { data: product, error } = await supabase
      .from('products')
      .update({ 
        name, description, 
        price_php: Number(price_php), 
        price_jpy: Number(price_jpy) || null, 
        category_id: Number(category_id), 
        stock: Number(stock), 
        image_path,
        barcode,
        brand,
        updated_at: new Date()
      })
      .eq('id', productId)
      .select()
      .single();
    if (error) throw error;

    // Handle variants (Complex update: delete old, insert new or update)
    if (req.body.variants) {
      const variantsData = JSON.parse(req.body.variants);
      
      // For simplicity in a cloud setting, we'll sync by deleting variants not in the new list
      // and updating/inserting the rest. 
      // Professional approach: separate variant IDs.
      
      // 1. Delete existing variants for this product to do a clean sync if they don't have IDs
      // (Or better: manage by ID)
      const existingVariantIds = variantsData.filter(v => v.id).map(v => v.id);
      if (existingVariantIds.length > 0) {
        await supabase.from('product_variants').delete().eq('product_id', productId).not('id', 'in', `(${existingVariantIds.join(',')})`);
      } else {
        await supabase.from('product_variants').delete().eq('product_id', productId);
      }

      for (let i = 0; i < variantsData.length; i++) {
        const v = variantsData[i];
        let vImagePath = v.image_path || null;
        const variantFile = req.files.find(f => f.fieldname === `variant_image_${i}`);
        if (variantFile) {
          vImagePath = await uploadToSupabase(variantFile);
        } else if (vImagePath && vImagePath.startsWith('http')) {
          vImagePath = await syncExternalImage(vImagePath);
        }

        const variantObj = {
          product_id: productId,
          variant_name: v.variant_name,
          price_php: Number(v.price_php) || 0,
          price_jpy: Number(v.price_jpy) || null,
          stock: Number(v.stock) || 0,
          image_path: vImagePath
        };

        if (v.id) {
          await supabase.from('product_variants').update(variantObj).eq('id', v.id);
        } else {
          await supabase.from('product_variants').insert([variantObj]);
        }
      }
    }

    res.json({ message: 'Updated successfully' });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id - Smart Delete
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const productId = req.params.id;
  try {
    // 1. Attempt Hard Delete (if no orders exist)
    // First, delete variants (they CASCADE anyway, but good to be explicit)
    await supabase.from('product_variants').delete().eq('product_id', productId);
    
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (deleteError) {
      // Check if it's a foreign key constraint error (PostgreSQL error code 23503)
      if (deleteError.code === '23503') {
        console.log(`Product ${productId} has dependent orders. Performing soft delete instead.`);
        
        // 2. Fallback: Soft Delete
        const { error: softDeleteError } = await supabase
          .from('products')
          .update({ is_active: false })
          .eq('id', productId);

        if (softDeleteError) throw softDeleteError;
        return res.json({ message: 'Product hidden (has existing orders)' });
      }
      throw deleteError;
    }

    res.json({ message: 'Product permanently deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to remove product' });
  }
});


module.exports = router;

