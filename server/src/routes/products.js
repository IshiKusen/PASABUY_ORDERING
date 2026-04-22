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


// GET /api/products/lookup/:barcode - Lookup product info by barcode (admin only)
router.get('/lookup/:barcode', authenticate, requireAdmin, async (req, res) => {
  try {
    const { barcode } = req.params;
    
    // UPCitemdb Trial API - Supports up to 100 requests per day without a dedicated key
    // For production scaling, a key can be added to the headers
    const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
    const data = await response.json();

    if (data.code === 'OK' && data.items && data.items.length > 0) {
      const item = data.items[0];
      return res.json({
        name: item.title,
        brand: item.brand,
        image: item.images && item.images.length > 0 ? item.images[0] : null
      });
    }

    res.status(404).json({ error: 'Product not found. You may need to enter details manually.' });
  } catch (err) {
    console.error('Barcode lookup error:', err);
    res.status(500).json({ error: 'Failed to connect to the lookup service.' });
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
    const { name, description, price_php, price_jpy, category_id, stock } = req.body;
    
    // Handle main product image
    let image_path = req.body.image_path || null;
    const baseFile = req.files.find(f => f.fieldname === 'image');
    if (baseFile) {
      image_path = await uploadToSupabase(baseFile);
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert([{ 
        name, description, 
        price_php: Number(price_php) || 0, 
        price_jpy: Number(price_jpy) || null, 
        category_id: Number(category_id), 
        stock: Number(stock) || 0, 
        image_path 
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
    const { name, description, price_php, price_jpy, category_id, stock } = req.body;

    // Handle main product image
    let image_path = req.body.image_path; // retain existing if not new
    const baseFile = req.files.find(f => f.fieldname === 'image');
    if (baseFile) {
      image_path = await uploadToSupabase(baseFile);
    }

    const { error } = await supabase
      .from('products')
      .update({
        name, description,
        price_php: Number(price_php),
        price_jpy: Number(price_jpy) || null,
        category_id: Number(category_id),
        stock: Number(stock) || 0,
        image_path
      })
      .eq('id', productId);

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

