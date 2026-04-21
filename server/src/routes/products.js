const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const { authenticate, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Multer config for image uploads (Still local for now, can be moved to Supabase Storage later)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/products');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `product_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// GET /api/products - List all active products (public)
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let query = supabase
      .from('products')
      .select('*, categories!inner(name), product_variants(*)')
      .eq('is_active', true);

    if (category && category !== 'All') {
      query = query.eq('categories.name', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: products, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    const productsWithVariants = products.map(p => {
      const variants = p.product_variants || [];
      const stats = {
        min_price: variants.length > 0 ? Math.min(...variants.map(v => Number(v.price_php))) : Number(p.price_php),
        max_price: variants.length > 0 ? Math.max(...variants.map(v => Number(v.price_php))) : Number(p.price_php),
        has_variants: variants.length > 0,
        category_name: p.categories?.name
      };
      return { ...p, ...stats, variants };
    });

    res.json({ products: productsWithVariants });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Failed to fetch products.' });
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
    const baseFile = req.files.find(f => f.fieldname === 'image');
    const image_path = baseFile ? `/uploads/products/${baseFile.filename}` : null;

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

    if (req.body.variants) {
      const variants = JSON.parse(req.body.variants).map((v, i) => {
        const variantFile = req.files.find(f => f.fieldname === `variant_image_${i}`);
        return {
          product_id: product.id,
          variant_name: v.variant_name,
          price_php: Number(v.price_php) || 0,
          price_jpy: Number(v.price_jpy) || null,
          stock: Number(v.stock) || 0,
          image_path: variantFile ? `/uploads/products/${variantFile.filename}` : (v.image_path || null)
        };
      });

      if (variants.length > 0) {
        const { error: vError } = await supabase.from('product_variants').insert(variants);
        if (vError) throw vError;
      }
    }

    res.status(201).json({ product });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

// DELETE /api/products/:id - Soft delete
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
