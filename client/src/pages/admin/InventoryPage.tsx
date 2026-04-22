import React, { useState, useRef, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Filter, Package, X, UploadCloud, ImageIcon, Loader2, Camera, RotateCw, Check, Settings, ScanBarcode } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { productsApi, categoriesApi } from '../../utils/api';

const API_HOST = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Variant {
  id?: number;
  variant_name: string;
  price_php: string;
  price_jpy: string;
  stock: string;
  image_file?: File | null;
  image_preview?: string;
  image_path?: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price_php: string;
  price_jpy: string;
  category_id: number;
  category_name: string;
  stock: number;
  image_path: string;
  variants?: any[];
  has_variants?: boolean;
  min_price?: string;
  max_price?: string;
}

interface Category {
  id: number;
  name: string;
}

export const InventoryPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  // Form States
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPricePhp, setFormPricePhp] = useState("");
  const [formPriceJpy, setFormPriceJpy] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [formVariants, setFormVariants] = useState<Variant[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [targetVariantIndex, setTargetVariantIndex] = useState<number | null>(null);
  const [showPasteButton, setShowPasteButton] = useState(false);
  const longPressTimerRef = useRef<any>(null);

  // Live Camera States
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isFlashing, setIsFlashing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Barcode Scanner States
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodData, catData] = await Promise.all([
        productsApi.getAll({ category: activeCategoryFilter, search: searchQuery }),
        categoriesApi.getAll(),
      ]);
      setProducts(prodData.products);
      setCategories(catData.categories);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reload when filter changes
  useEffect(() => {
    const timer = setTimeout(() => loadData(), 300);
    return () => clearTimeout(timer);
  }, [activeCategoryFilter, searchQuery]);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormName(product.name);
      setFormDescription(product.description || "");
      setFormPricePhp(product.price_php);
      setFormPriceJpy(product.price_jpy || "");
      setFormCategory(String(product.category_id));
      setFormStock(String(product.stock));
      setFormImagePreview(product.image_path ? getImageUrl(product.image_path) : "");
      setFormImageFile(null);
      setFormVariants(product.variants || []);
    } else {
      setEditingProduct(null);
      setFormName("");
      setFormDescription("");
      setFormPricePhp("");
      setFormPriceJpy("");
      setFormCategory(categories.length > 0 ? String(categories[0].id) : "");
      setFormStock("");
      setFormImagePreview("");
      setFormImageFile(null);
      setFormVariants([]);
    }
    setIsNewCategory(false);
    setNewCategoryName("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleDelete = async (product: Product) => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      try {
        await productsApi.delete(product.id);
        await loadData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleBarcodeLookup = async (barcode: string) => {
    try {
      setLookupLoading(true);
      const data = await productsApi.lookupBarcode(barcode);
      
      if (data.name) setFormName(data.name);
      if (data.brand) setFormDescription(data.brand);
      if (data.image) {
        setFormImagePreview(data.image);
        setFormImageFile(null); // Use the URL from API
      }
      
      setIsBarcodeScannerOpen(false);
    } catch (err: any) {
      console.error('Barcode lookup error:', err);
      alert(err.message || 'Product not found. You might need to enter it manually.');
    } finally {
      setLookupLoading(false);
    }
  };

  // Barcode Scanner Lifecycle
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    
    if (isBarcodeScannerOpen) {
      // We need to wait for the element to be in the DOM
      const timer = setTimeout(() => {
        html5QrCode = new Html5Qrcode("barcode-reader");
        
        // HIGHER QUALITY SETTINGS
        const config = { 
          fps: 20, // Faster scanning
          qrbox: { width: 280, height: 180 }, // Slightly larger box
          aspectRatio: 1.0,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true // Use native phone hardware if available
          }
        };
        
        html5QrCode.start(
          { 
            facingMode: "environment",
            // Use 'ideal' so it doesn't crash if 1080p isn't available
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }, 
          config,
          (decodedText) => {
            // Success
            handleBarcodeLookup(decodedText);
            if (html5QrCode) {
              html5QrCode.stop().catch(err => console.error(err));
            }
          },
          () => {
            // parse error, ignore
          }
        ).catch(err => {
          console.error("Scanner start error:", err);
          // If the high-res fails, try one more time with basic settings
          html5QrCode?.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              handleBarcodeLookup(decodedText);
              html5QrCode?.stop().catch(e => console.error(e));
            },
            () => {}
          ).catch(e => console.error("Final fallback failed:", e));
        });
      }, 300);
      
      return () => {
        clearTimeout(timer);
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().catch(err => console.error(err));
        }
      };
    }
  }, [isBarcodeScannerOpen]);

  // Currency Conversion
  const JPY_TO_PHP_RATE = 0.38;

  const handlePhpChange = (val: string) => {
    setFormPricePhp(val);
    if (val && !isNaN(Number(val))) {
      setFormPriceJpy((Number(val) / JPY_TO_PHP_RATE).toFixed(0));
    } else {
      setFormPriceJpy("");
    }
  };

  const handleJpyChange = (val: string) => {
    setFormPriceJpy(val);
    if (val && !isNaN(Number(val))) {
      setFormPricePhp((Number(val) * JPY_TO_PHP_RATE).toFixed(2));
    } else {
      setFormPricePhp("");
    }
  };

  // Drag and Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setFormImageFile(file);
      setFormImagePreview(URL.createObjectURL(file));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (targetVariantIndex !== null) {
        const updated = [...formVariants];
        updated[targetVariantIndex] = { 
          ...updated[targetVariantIndex], 
          image_file: file, 
          image_preview: URL.createObjectURL(file) 
        };
        setFormVariants(updated);
        // Reset target index after update
        setTargetVariantIndex(null);
      } else {
        setFormImageFile(file);
        setFormImagePreview(URL.createObjectURL(file));
      }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent | ClipboardItems) => {
    let items;
    if ('clipboardData' in e) {
      items = e.clipboardData.items;
    } else {
      // This part handles the mobile paste button click
      try {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              const file = new File([blob], "pasted_image.png", { type });
              setFormImageFile(file);
              setFormImagePreview(URL.createObjectURL(file));
              setShowPasteButton(false);
              return;
            }
          }
        }
        alert("No image found in clipboard.");
      } catch (err) {
        console.error("Paste failed:", err);
      }
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setFormImageFile(file);
          setFormImagePreview(URL.createObjectURL(file));
        }
      }
    }
  };

  // Mobile Long Press Logic
  const handleTouchStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      setShowPasteButton(true);
    }, 500); // 500ms for long press
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  // Live Camera Logic
  const startLiveCamera = async (mode: 'user' | 'environment' = 'environment') => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsLiveCameraOpen(true);
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const stopLiveCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsLiveCameraOpen(false);
  };

  const flipCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    startLiveCamera(newMode);
  };

  const handleEditCategory = (id: number, name: string) => {
    setEditingCategoryId(id);
    setEditCategoryName(name);
  };

  const handleUpdateCategory = async (id: number) => {
    if (!editCategoryName.trim()) return;
    try {
      await categoriesApi.update(id, { name: editCategoryName.trim() });
      setCategories(categories.map(cat => cat.id === id ? { ...cat, name: editCategoryName.trim() } : cat));
      setProducts(products.map(p => p.category_id === id ? { ...p, category_name: editCategoryName.trim() } : p));
      setEditingCategoryId(null);
    } catch (err) {
      alert("Failed to update category name.");
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm("Are you sure? Products assigned to this category will lose their category association.")) return;
    try {
      await categoriesApi.delete(id);
      setCategories(categories.filter(cat => cat.id !== id));
      if (Number(formCategory) === id) setFormCategory("");
    } catch (err) {
      alert("Failed to delete category. Make sure it's not being used by active records if constraints exist.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Trigger flash effect
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 300);

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
            
            if (targetVariantIndex !== null) {
              const updated = [...formVariants];
              updated[targetVariantIndex] = { 
                ...updated[targetVariantIndex], 
                image_file: file, 
                image_preview: URL.createObjectURL(file) 
              };
              setFormVariants(updated);
            } else {
              setFormImageFile(file);
              setFormImagePreview(URL.createObjectURL(file));
            }
            stopLiveCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  // Variant Helpers
  const addVariant = () => {
    setFormVariants([...formVariants, {
      variant_name: "",
      price_php: formPricePhp || "",
      price_jpy: formPriceJpy || "",
      stock: "0",
      image_file: null,
      image_preview: ""
    }]);
  };

  const handleVariantChange = (index: number, field: keyof Variant, value: any) => {
    const updated = [...formVariants];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-conversion for variant prices
    if (field === 'price_php') {
      if (value && !isNaN(Number(value))) {
        updated[index].price_jpy = (Number(value) / JPY_TO_PHP_RATE).toFixed(0);
      } else {
        updated[index].price_jpy = "";
      }
    } else if (field === 'price_jpy') {
      if (value && !isNaN(Number(value))) {
        updated[index].price_php = (Number(value) * JPY_TO_PHP_RATE).toFixed(2);
      } else {
        updated[index].price_php = "";
      }
    }

    setFormVariants(updated);
  };


  // Save product (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let categoryId = formCategory;

      // Create new category if needed
      if (isNewCategory && newCategoryName.trim()) {
        const catData = await categoriesApi.create(newCategoryName.trim());
        categoryId = String(catData.category.id);
        setCategories(prev => [...prev, catData.category]);
      }

      const formData = new FormData();
      formData.append('name', formName);
      formData.append('description', formDescription);
      formData.append('price_php', formPricePhp);
      formData.append('price_jpy', formPriceJpy);
      formData.append('category_id', categoryId);
      formData.append('stock', formStock);
      
      if (formImageFile) {
        formData.append('image', formImageFile);
      } else if (editingProduct && formImagePreview) {
        formData.append('image_path', editingProduct.image_path);
      }

      // Add variants with their images
      const variantsToSubmit = formVariants.map((v, index) => {
        if (v.image_file) {
          formData.append(`variant_image_${index}`, v.image_file);
        }
        return {
          id: v.id,
          variant_name: v.variant_name,
          price_php: v.price_php,
          price_jpy: v.price_jpy,
          stock: v.stock,
          image_path: v.image_path // for existing variants
        };
      });
      formData.append('variants', JSON.stringify(variantsToSubmit));

      if (editingProduct) {
        await productsApi.update(editingProduct.id, formData);
      } else {
        await productsApi.create(formData);
      }

      handleCloseModal();
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getImageUrl = (path: string) => {
    if (!path) return 'https://placehold.co/100x100/f9a8d4/831843?text=No+Img';
    if (path.startsWith('http')) return path;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_HOST}${normalizedPath}`;
  };


  const categoryList = ["All", ...categories.map(c => c.name)];

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-primary-500" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search products..."
            className="input pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-auto">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            <select 
              className="input pl-10 pr-10 appearance-none bg-white dark:bg-dark-surface"
              value={activeCategoryFilter}
              onChange={(e) => setActiveCategoryFilter(e.target.value)}
            >
              {categoryList.map(cat => (
                <option key={cat} value={cat}>{cat === "All" ? "All Categories" : cat}</option>
              ))}
            </select>
          </div>
          <button 
            className="btn-primary flex-1 md:flex-none flex items-center justify-center gap-2 px-6"
            onClick={() => handleOpenModal()}
          >
            <Plus size={18} />
            Add Product
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      {products.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-dark-surfaceAlt border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Price (PHP/JPY)</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50/50 dark:hover:bg-dark-surfaceAlt/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={getImageUrl(product.image_path)} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                        <div>
                          <p className="text-sm font-bold dark:text-white truncate max-w-[200px]" title={product.name}>{product.name}</p>
                          <p className="text-[10px] text-gray-400">ID: {product.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs font-bold">
                        {product.category_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-bold dark:text-white">
                          {product.has_variants && Number(product.min_price) !== Number(product.max_price)
                            ? `₱${Number(product.min_price).toLocaleString()} - ${Number(product.max_price).toLocaleString()}`
                            : `₱${Number(product.min_price || product.price_php).toLocaleString()}`
                          }
                        </p>
                        <p className="text-xs text-gray-400">
                          {product.has_variants ? 'Multi-variant' : `¥${Number(product.price_jpy).toLocaleString()}`}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${product.stock > 10 ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                         <span className="text-sm font-medium dark:text-white">{product.stock} pcs</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenModal(product)} className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(product)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-dark-surface rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
          <div className="bg-gray-50 dark:bg-dark-surfaceAlt w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
            <Package size={32} />
          </div>
          <h3 className="text-lg font-bold dark:text-white">No items found</h3>
          <p className="text-gray-500 text-sm mt-1">Try a different filter or add a new product.</p>
          <button className="btn-primary mt-6" onClick={() => handleOpenModal()}>Add New Product</button>
        </div>
      )}

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm bg-black/60 p-0 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-dark-surface w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-full sm:max-h-[90vh] animate-scale-up">
            <div className="flex justify-between items-center p-5 sm:p-6 border-b dark:border-gray-800">
              <h2 className="text-xl font-bold dark:text-white">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={handleCloseModal} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X size={20} />
              </button>
            </div>

            <form className="p-6 overflow-y-auto space-y-5" onSubmit={handleSave}>
              
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Product Image</label>
                <div 
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    dragActive 
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' 
                      : 'border-gray-300 dark:border-gray-700 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onPaste={handlePaste}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onClick={() => {
                    if (showPasteButton) {
                      setShowPasteButton(false);
                    } else {
                      setTargetVariantIndex(null);
                      fileInputRef.current?.click();
                    }
                  }}
                  tabIndex={0}
                >
                  
                  {showPasteButton && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in rounded-xl">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePaste(null as any);
                        }}
                        className="bg-white text-primary-600 px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 transform scale-110 active:scale-95 transition-transform"
                      >
                        <UploadCloud size={20} />
                        Paste from Clipboard
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetVariantIndex(null);
                          setShowPasteButton(false);
                        }}
                        className="absolute top-4 right-4 text-white/70 hover:text-white"
                      >
                        <X size={24} />
                      </button>
                    </div>
                  )}
                  {formImagePreview ? (
                    <div className="relative w-full h-48 sm:h-64 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-dark-surfaceAlt">
                       <img src={formImagePreview} alt="Preview" className="w-full h-full object-contain" />
                       <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); setTargetVariantIndex(null); fileInputRef.current?.click(); }}
                            className="text-white font-medium flex flex-col items-center gap-1 hover:text-primary-300 transition-colors"
                          >
                            <UploadCloud size={24} />
                            <span className="text-[10px]">Replace File</span>
                          </button>
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); setTargetVariantIndex(null); startLiveCamera('environment'); }}
                            className="text-white font-medium flex flex-col items-center gap-1 hover:text-primary-300 transition-colors"
                          >
                            <Camera size={24} />
                            <span className="text-[10px]">New Photo</span>
                          </button>
                       </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6">
                      <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 text-primary-500 rounded-full flex items-center justify-center mb-3">
                        <ImageIcon size={24} />
                      </div>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-500 mt-1 mb-4">SVG, PNG, JPG or GIF (Auto-fit to square)</p>
                      
                      <div className="flex gap-3">
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setTargetVariantIndex(null); fileInputRef.current?.click(); }}
                          className="bg-white dark:bg-gray-800 border-2 border-primary-500 text-primary-500 px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary-500 hover:text-white transition-all transform active:scale-95"
                        >
                          Browse Files
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setTargetVariantIndex(null); startLiveCamera('environment'); }}
                          className="bg-primary-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary-600 shadow-md shadow-primary-500/20 transition-all flex items-center gap-2 transform active:scale-95"
                        >
                          <Camera size={16} />
                          Take Photo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e)} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileChange(e)} />
              </div>

              {/* Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Product Name</label>
                  <div className="flex gap-2">
                    <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="input flex-1" placeholder="e.g. SK-II Facial Treatment Essence" required />
                    <button 
                      type="button" 
                      onClick={() => setIsBarcodeScannerOpen(true)}
                      className="p-3 bg-primary-100 text-primary-600 rounded-xl hover:bg-primary-200 transition-all flex items-center justify-center shrink-0 shadow-sm active:scale-95"
                      title="Scan Barcode"
                    >
                      <ScanBarcode size={20} />
                    </button>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Brand Name (Optional)</label>
                  <input type="text" value={formDescription} onChange={e => setFormDescription(e.target.value)} className="input" placeholder="e.g. Shiseido, Meiji, SK-II" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Price (₱)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">₱</span>
                    <input type="number" value={formPricePhp} onChange={e => handlePhpChange(e.target.value)} className="input pl-8" placeholder="0.00" required />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Price (¥)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">¥</span>
                    <input type="number" value={formPriceJpy} onChange={e => handleJpyChange(e.target.value)} className="input pl-8" placeholder="0" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400">Category</label>
                    <button 
                      type="button" 
                      onClick={() => setIsCategoryManagerOpen(true)}
                      className="text-[10px] font-bold text-primary-500 hover:text-primary-600 flex items-center gap-1 uppercase tracking-wider"
                    >
                      <Settings size={10} />
                      Manage Categories
                    </button>
                  </div>
                  {!isNewCategory ? (
                    <select 
                      className="input" 
                      value={formCategory}
                      onChange={(e) => {
                        if (e.target.value === "ADD_NEW") {
                          setIsNewCategory(true);
                          setFormCategory("");
                        } else {
                          setFormCategory(e.target.value);
                        }
                      }}
                    >
                      {categories.map(cat => (
                         <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                      <option value="ADD_NEW" className="font-bold">+ Add New Category</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                       <input type="text" className="input flex-1" placeholder="New category..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} autoFocus />
                       <button type="button" onClick={() => { setIsNewCategory(false); setFormCategory(categories.length > 0 ? String(categories[0].id) : ""); }} className="btn-secondary px-3" title="Cancel">
                         <X size={16} />
                       </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Base Stock Quantity</label>
                  <input type="number" value={formStock} onChange={e => setFormStock(e.target.value)} className="input" placeholder="0" required={formVariants.length === 0} />
                </div>
              </div>

              {/* Variations Section */}
              <div className="pt-4 border-t dark:border-gray-800">
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Product Variations (Optional)</h3>
                   <button 
                    type="button" 
                    onClick={addVariant}
                    className="flex items-center gap-1.5 text-xs font-bold text-primary-500 hover:text-primary-600 transition-colors"
                   >
                     <Plus size={14} /> Add Variation
                   </button>
                 </div>
                 <div className="space-y-4">
                    {formVariants.map((variant, index) => (
                      <div key={index} className="p-4 bg-gray-50 dark:bg-dark-surfaceAlt rounded-xl border border-gray-100 dark:border-gray-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-400 uppercase tracking-tight">Variation #{index + 1}</span>
                          <button 
                            type="button" 
                            onClick={() => setFormVariants(formVariants.filter((_, i) => i !== index))}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                          {/* Variant Image */}
                          <div 
                            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden relative shrink-0 transition-all ${
                              variant.image_preview || variant.image_path
                                ? 'border-primary-200'
                                : 'border-gray-300 dark:border-gray-700 hover:border-primary-400'
                            }`}
                            onClick={() => {}}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary-500', 'bg-primary-50', 'dark:bg-primary-900/10'); }}
                            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-primary-500', 'bg-primary-50', 'dark:bg-primary-900/10'); }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.remove('border-primary-500', 'bg-primary-50', 'dark:bg-primary-900/10');
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                const file = e.dataTransfer.files[0];
                                const updated = [...formVariants];
                                updated[index] = { ...updated[index], image_file: file, image_preview: URL.createObjectURL(file) };
                                setFormVariants(updated);
                              }
                            }}
                            onPaste={(e) => {
                              const items = e.clipboardData.items;
                              for (let i = 0; i < items.length; i++) {
                                if (items[i].type.indexOf("image") !== -1) {
                                  const file = items[i].getAsFile();
                                  if (file) {
                                    const updated = [...formVariants];
                                    updated[index] = { ...updated[index], image_file: file, image_preview: URL.createObjectURL(file) };
                                    setFormVariants(updated);
                                  }
                                }
                              }
                            }}
                            tabIndex={0}
                          >
                             <div className="absolute inset-0 z-10 opacity-0 hover:opacity-100 bg-black/60 transition-all flex flex-col items-center justify-center gap-1">
                                <button type="button" onClick={() => { setTargetVariantIndex(index); startLiveCamera('environment'); }} className="p-1 text-white hover:text-primary-300">
                                  <Camera size={16} />
                                </button>
                                <button type="button" onClick={() => { setTargetVariantIndex(index); fileInputRef.current?.click(); }} className="p-1 text-white hover:text-primary-300">
                                  <UploadCloud size={16} />
                                </button>
                             </div>
                            {variant.image_preview || (variant.image_path && getImageUrl(variant.image_path)) ? (
                              <img 
                                src={variant.image_preview || (variant.image_path ? getImageUrl(variant.image_path) : '')} 
                                alt="V" 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <ImageIcon size={20} className="text-gray-400" />
                                <span className="text-[8px] text-gray-400 uppercase">Image</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                            <div className="col-span-2 sm:col-span-1">
                              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Name</label>
                              <input
                                placeholder="e.g. Red, XL"
                                className="input py-1.5 text-sm"
                                value={variant.variant_name}
                                onChange={(e) => handleVariantChange(index, 'variant_name', e.target.value)}
                                required
                              />
                            </div>
                            <div>
                               <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Price (₱)</label>
                               <input
                                 type="number"
                                 className="input py-1.5 text-sm"
                                 value={variant.price_php}
                                 onChange={(e) => handleVariantChange(index, 'price_php', e.target.value)}
                                 required
                               />
                             </div>
                            <div>
                               <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Price (¥)</label>
                               <input
                                 type="number"
                                 className="input py-1.5 text-sm"
                                 value={variant.price_jpy}
                                 onChange={(e) => handleVariantChange(index, 'price_jpy', e.target.value)}
                               />
                             </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Stock</label>
                                <input
                                  type="number"
                                  className="input py-1.5 text-sm"
                                  value={variant.stock}
                                  onChange={(e) => handleVariantChange(index, 'stock', e.target.value)}
                                  required
                                />
                              </div>
                              <button 
                                type="button"
                                onClick={() => setFormVariants(formVariants.filter((_, i) => i !== index))}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mb-0.5"
                                title="Remove Variant"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {formVariants.length === 0 && (
                      <p className="text-center py-4 text-xs text-gray-400 italic">No variations added. Using base price and stock.</p>
                    )}
                 </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t dark:border-gray-800 mt-6">
                <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary px-8 flex items-center gap-2" disabled={saving}>
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Camera Viewfinder Modal (Fullscreen) */}
      {isLiveCameraOpen && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black animate-fade-in overflow-hidden">
          {/* Header Overlay */}
          <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-30 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            <div className="flex items-center gap-3">
              <div className="bg-primary-500 p-2 rounded-xl text-white shadow-lg shadow-primary-500/30">
                <Camera size={20} />
              </div>
              <div>
                <h3 className="text-white font-black text-lg tracking-tight">Camera Live</h3>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Capture Mode</p>
              </div>
            </div>
            <button 
              onClick={stopLiveCamera} 
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-xl border border-white/10 transition-all active:scale-95"
            >
              <X size={24} />
            </button>
          </div>

          {/* Video Viewport (Fullscreen) */}
          <div className="relative flex-1 bg-black flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-contain"
            />
            
            {/* Flash Effect Layer */}
            {isFlashing && (
              <div className="absolute inset-0 z-40 bg-white animate-flash pointer-events-none" />
            )}

            <canvas ref={canvasRef} className="hidden" />
            
            {/* Dynamic Guides */}
            <div className="absolute inset-x-12 top-1/2 -translate-y-1/2 aspect-square border border-white/20 rounded-3xl pointer-events-none flex items-center justify-center">
               <div className="w-4 h-4 border-t-2 border-l-2 border-white/40 absolute top-0 left-0 rounded-tl-lg" />
               <div className="w-4 h-4 border-t-2 border-r-2 border-white/40 absolute top-0 right-0 rounded-tr-lg" />
               <div className="w-4 h-4 border-b-2 border-l-2 border-white/40 absolute bottom-0 left-0 rounded-bl-lg" />
               <div className="w-4 h-4 border-b-2 border-r-2 border-white/40 absolute bottom-0 right-0 rounded-br-lg" />
            </div>
          </div>

          {/* Controls Bar */}
          <div className="absolute bottom-0 inset-x-0 p-10 flex flex-col items-center gap-8 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
            <div className="flex items-center gap-12 sm:gap-20">
              {/* Flip Camera */}
              <button 
                onClick={flipCamera}
                className="p-5 bg-white/10 hover:bg-white/20 text-white rounded-3xl backdrop-blur-xl border border-white/10 transition-all active:scale-90"
                title="Switch Camera"
              >
                <RotateCw size={28} />
              </button>

              {/* Shutter Button */}
              <button 
                onClick={capturePhoto}
                className="relative w-24 h-24 rounded-full border-[6px] border-white flex items-center justify-center group active:scale-90 transition-all"
              >
                <div className="w-18 h-18 bg-white rounded-full group-hover:scale-95 transition-transform" />
                <div className="absolute inset-0 rounded-full animate-ping bg-white/20 pointer-events-none group-active:hidden" />
              </button>

              <div className="w-18" /> 
            </div>
            
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Tap to capture product image</p>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {isBarcodeScannerOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center backdrop-blur-md bg-black/60 p-4 animate-fade-in">
          <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scale-up border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-dark-surfaceAlt/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-xl">
                  <ScanBarcode size={20} />
                </div>
                <h2 className="text-lg font-black dark:text-white uppercase tracking-tight">Scan Barcode</h2>
              </div>
              <button 
                onClick={() => setIsBarcodeScannerOpen(false)} 
                className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden border-2 border-gray-100 dark:border-gray-800">
                <div id="barcode-reader" className="w-full h-full"></div>
                
                {lookupLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-10 gap-3">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Finding Product...</p>
                  </div>
                )}

                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
                  <div className="w-64 h-32 border-2 border-primary-500 rounded-xl relative">
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary-500/50 animate-scan-line"></div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed">
                  Center the product's barcode within the box to scan. Details will be auto-filled.
                </p>
                <button 
                  onClick={() => setIsBarcodeScannerOpen(false)}
                  className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all uppercase tracking-widest text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center backdrop-blur-md bg-black/40 p-4 animate-fade-in">
          <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scale-up border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-dark-surfaceAlt/50">
              <h2 className="text-lg font-black dark:text-white uppercase tracking-tight">Manage Categories</h2>
              <button 
                onClick={() => { setIsCategoryManagerOpen(false); setEditingCategoryId(null); }} 
                className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3 bg-gray-50 dark:bg-dark-surfaceAlt p-3 rounded-2xl border border-gray-100 dark:border-gray-800 group">
                  {editingCategoryId === cat.id ? (
                    <div className="flex-1 flex gap-2">
                      <input 
                        type="text" 
                        value={editCategoryName} 
                        onChange={e => setEditCategoryName(e.target.value)}
                        className="input h-9 text-sm"
                        autoFocus
                      />
                      <button onClick={() => handleUpdateCategory(cat.id)} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-md shadow-green-500/20">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setEditingCategoryId(null)} className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm dark:text-white truncate">{cat.name}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditCategory(cat.id, cat.name)} 
                          className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all"
                          title="Rename"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCategory(cat.id)} 
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              
              {categories.length === 0 && (
                <div className="text-center py-8 text-gray-400 italic text-sm">
                  No categories found.
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50/50 dark:bg-dark-surfaceAlt/50 border-t dark:border-gray-800">
               <button 
                 onClick={() => { setIsCategoryManagerOpen(false); setIsNewCategory(true); }}
                 className="w-full btn-primary py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
               >
                 <Plus size={18} />
                 Add New From Form
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
