import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Filter, 
  Package, 
  X, 
  UploadCloud, 
  ImageIcon, 
  Loader2, 
  Camera, 
  Check, 
  Settings, 
  Zap,
  Barcode,
  Keyboard,
  RefreshCw
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { productsApi, categoriesApi, configApi } from '../../utils/api';
import { getImageUrl } from '../../utils/image';
import BarcodeGenerator from '../../components/common/BarcodeGenerator';


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
  barcode?: string;
  brand?: string;
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
  const [formBarcode, setFormBarcode] = useState("");
  const [formBrand, setFormBrand] = useState("");
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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isFlashing, setIsFlashing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [jpyToPhpRate, setJpyToPhpRate] = useState<number>(0.38);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodData, catData, configData] = await Promise.all([
        productsApi.getAll({ category: activeCategoryFilter, search: searchQuery }),
        categoriesApi.getAll(),
        configApi.get()
      ]);
      setProducts(prodData.products);
      setCategories(catData.categories);
      
      if (configData.config && configData.config.jpy_to_php_rate) {
        setJpyToPhpRate(Number(configData.config.jpy_to_php_rate));
      }
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
      setFormBarcode(product.barcode || "");
      setFormBrand(product.brand || "");
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
      setFormBarcode("");
      setFormBrand("");
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

  const [lookupSource, setLookupSource] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const handleBarcodeLookup = async (barcode: string) => {
    try {
      setLookupLoading(true);
      setLookupSource(null);
      const data = await productsApi.lookupBarcode(barcode);
      
      if (data.name) {
        setFormName(data.name);
        setFormBarcode(barcode);
        setLookupSource(data.source || 'Database');
        
        if (data.source === 'gemini-ai') {
          setScanTip("🧠 AI identified this product! Please check the details.");
        } else if (data.source === 'openfoodfacts') {
          setScanTip("🍱 Found via Open Food Facts (Japan)!");
        } else {
          setScanTip("✅ Product found! Form auto-filled.");
        }
      }
      
      if (data.brand) {
        setFormBrand(data.brand);
        // If it's a food product, description is usually the name or brand
        if (!formDescription) setFormDescription(data.name || "");
      }
      if (data.image) {
        setFormImagePreview(data.image);
        setFormImageFile(null); // Use the URL from API
      }
      
      // Don't close immediately if AI was used, so user can see the tip
      if (data.source !== 'gemini-ai' && isLiveCameraOpen) {
        stopLiveCamera();
      }
    } catch (err: any) {
      console.error('Barcode lookup error:', err);
      setScanTip("❌ Product not found in any database.");
    } finally {
      setLookupLoading(false);
    }
  };

  const [manualBarcode, setManualBarcode] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [liveDetectedCode, setLiveDetectedCode] = useState<string | null>(null);
  const [scanTip, setScanTip] = useState("💡 TIP: Tap the screen to focus!");
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  // The scanner instance will be managed within the Live Camera lifecycle
  const barcodeScannerRef = useRef<Html5Qrcode | null>(null);

  // Flashlight Toggle
  const toggleTorch = async () => {
    if (!barcodeScannerRef.current || !hasTorch) return;
    try {
      const newState = !isTorchOn;
      await barcodeScannerRef.current.applyVideoConstraints({
        advanced: [{ torch: newState } as any]
      });
      setIsTorchOn(newState);
    } catch (err) {
      console.error("Torch error:", err);
    }
  };

  // Currency Conversion
  const handlePhpChange = (val: string) => {
    setFormPricePhp(val);
    if (val && !isNaN(Number(val)) && jpyToPhpRate > 0) {
      setFormPriceJpy((Number(val) / jpyToPhpRate).toFixed(0));
    } else {
      setFormPriceJpy("");
    }
  };

  const handleJpyChange = (val: string) => {
    setFormPriceJpy(val);
    if (val && !isNaN(Number(val)) && jpyToPhpRate > 0) {
      setFormPricePhp((Number(val) * jpyToPhpRate).toFixed(2));
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

  // Unified Live Camera & Scanner Logic
  const startLiveCamera = async (mode: 'user' | 'environment' = 'environment') => {
    try {
      // 1. Pre-flight Cleanup: Ensure no previous instance is running
      if (barcodeScannerRef.current) {
        try { await barcodeScannerRef.current.stop(); } catch(e) {}
        barcodeScannerRef.current = null;
      }

      // 2. Check for Secure Context (HTTPS/Localhost)
      if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        throw new Error("SECURE_CONTEXT_REQUIRED");
      }

      setIsLiveCameraOpen(true);
      setLiveDetectedCode(null);
      setScanTip("🔍 Initializing Hardware...");

      // 3. Smart Hardware Discovery
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw { name: "NotFoundError" };
      }

      // Find the best back camera (labels like 'back', 'rear', 'environment', '0', '1')
      let targetCameraId = devices[0].id; // Fallback to first camera
      
      if (mode === 'environment') {
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment') ||
          device.label.toLowerCase().includes('camera 0') // Common on some Androids
        );
        if (backCamera) targetCameraId = backCamera.id;
      }

      const scanner = new Html5Qrcode("live-camera-container", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        verbose: false,
        // Use native barcode detector if available (experimental but very powerful)
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      });
      barcodeScannerRef.current = scanner;

      const config = { 
        fps: 20, // Increased FPS for faster discovery
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          // Slightly taller box to capture tilted barcodes better
          return { width: Math.floor(minEdge * 0.85), height: Math.floor(minEdge * 0.55) };
        },
        aspectRatio: 1.777778, 
        disableFlip: mode === 'environment',
        // Request higher resolution for sharper barcode lines
        videoConstraints: {
          facingMode: mode,
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 }
        }
      };

      // 4. Start using the specific Device ID for better reliability
      await scanner.start(
        targetCameraId,
        config,
        (decodedText) => {
          setLiveDetectedCode(decodedText);
          if (navigator.vibrate) navigator.vibrate(50);
        },
        () => {}
      );

      setScanTip("💡 TIP: Tap screen to focus!");
      setHasTorch(true);
      
      // Tap to Focus logic
      setTimeout(() => {
        const videoElement = document.querySelector('#live-camera-container video');
        if (videoElement) {
          videoElement.addEventListener('click', () => {
            try {
              const track = (scanner as any).getRunningTrack();
              if (track && track.applyConstraints) {
                track.applyConstraints({ advanced: [{ focusMode: "continuous" } as any] });
                setScanTip("🎯 Focusing...");
                setTimeout(() => setScanTip("💡 TIP: Tap screen to focus!"), 2000);
              }
            } catch (e) {}
          });
        }
      }, 1000);

    } catch (err: any) {
      console.error("Camera/Scanner error:", err);
      
      let errorMsg = "Could not access camera.";
      
      if (err.message === "SECURE_CONTEXT_REQUIRED") {
        errorMsg = "🔒 HTTPS Required: Camera access is blocked on insecure connections. Please use HTTPS or localhost to test.";
      } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMsg = "🚫 Permission Denied: Please allow camera access in your browser settings.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMsg = "❓ Camera Not Found: No camera device detected on this system.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorMsg = "🎥 Camera Busy: Another application might be using the camera.";
      }

      alert(errorMsg);
      setIsLiveCameraOpen(false);
    }
  };

  const stopLiveCamera = async () => {
    if (barcodeScannerRef.current) {
      try {
        if (barcodeScannerRef.current.isScanning) {
          await barcodeScannerRef.current.stop();
        }
      } catch (e) {
        console.error("Stop scanner error:", e);
      }
      barcodeScannerRef.current = null;
    }
    setIsLiveCameraOpen(false);
    setLiveDetectedCode(null);
    setTargetVariantIndex(null);
  };

  const flipCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    stopLiveCamera().then(() => startLiveCamera(newMode));
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
    const container = document.getElementById('live-camera-container');
    const video = container?.querySelector('video');
    const canvas = canvasRef.current;

    if (video && canvas) {
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
              // Reset target index after capture
              setTargetVariantIndex(null);
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
      formData.append('brand', formBrand);
      formData.append('barcode', formBarcode);
      formData.append('price_php', formPricePhp);
      formData.append('price_jpy', formPriceJpy);
      formData.append('category_id', categoryId);
      formData.append('stock', formStock);
      
      if (formImageFile) {
        formData.append('image', formImageFile);
      } else if (formImagePreview) {
        // Handle cases where we have a preview but no file (e.g. from lookup or existing)
        if (!editingProduct) {
          // New product created with image from barcode lookup
          formData.append('image_path', formImagePreview);
        } else {
          // Existing product: check if preview matches current path or is a new lookup URL
          const originalResolvedUrl = editingProduct.image_path ? getImageUrl(editingProduct.image_path) : null;
          if (formImagePreview === originalResolvedUrl) {
            formData.append('image_path', editingProduct.image_path);
          } else {
            // Preview changed (e.g. from lookup during edit)
            formData.append('image_path', formImagePreview);
          }
        }
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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24">
      {/* Header section with Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <Package className="text-primary-500" size={32} />
            Inventory <span className="text-gray-400 font-light">Management</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Track stock levels, variants, and product details.</p>
        </div>
        
        <div className="flex gap-3">
           <button 
             onClick={() => setIsCategoryManagerOpen(true)}
             className="btn-secondary flex items-center gap-2 group"
           >
             <Settings size={18} className="group-hover:rotate-90 transition-transform duration-500" />
             <span>Categories</span>
           </button>
           <button 
             onClick={() => handleOpenModal()} 
             className="btn-primary flex items-center gap-2 shadow-lg shadow-primary-500/25"
           >
             <Plus size={20} />
             <span>Add Product</span>
           </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white dark:bg-dark-surface p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, brand, or barcode..." 
            className="input pl-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <Filter size={16} className="text-gray-400 shrink-0" />
          <button 
            onClick={() => setActiveCategoryFilter("All")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeCategoryFilter === "All" 
              ? "bg-primary-500 text-white shadow-md shadow-primary-500/20" 
              : "bg-gray-50 dark:bg-dark-surfaceAlt text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setActiveCategoryFilter(cat.name)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeCategoryFilter === cat.name 
                ? "bg-primary-500 text-white shadow-md shadow-primary-500/20" 
                : "bg-gray-50 dark:bg-dark-surfaceAlt text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Inventory Table/Grid */}
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-primary-500" size={40} />
            <p className="text-gray-400 font-medium animate-pulse">Loading inventory...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-20 h-20 bg-gray-50 dark:bg-dark-surfaceAlt rounded-full flex items-center justify-center">
              <Package size={40} className="text-gray-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">No products found</h3>
              <p className="text-gray-500 max-w-xs">Start by adding your first product to the inventory.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-dark-surfaceAlt border-b dark:border-gray-800">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Product Info</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Barcode</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Category</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Price (PHP)</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Stock</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {products.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-surfaceAlt flex-shrink-0 border border-gray-100 dark:border-gray-800">
                          <img 
                            src={getImageUrl(product.image_path)} 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/f9a8d4/831843?text=No+Img';
                            }}
                          />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{product.name}</h4>
                          <p className="text-xs text-gray-400 font-medium">{product.description || 'No brand specified'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {product.barcode ? (
                        <div className="flex flex-col items-center justify-center gap-1 bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-gray-100 dark:border-gray-800/50">
                          <BarcodeGenerator 
                            value={product.barcode} 
                            width={1.2} 
                            height={25} 
                            className="max-w-[120px]" 
                          />
                          <span className="text-[8px] font-mono font-bold text-gray-400 tracking-wider">{product.barcode}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center opacity-20">
                          <Barcode size={20} className="text-gray-400" />
                          <span className="text-[8px] font-bold uppercase tracking-tighter text-gray-400">N/A</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-dark-surfaceAlt text-gray-600 dark:text-gray-400 text-[10px] font-bold uppercase border border-gray-200/50 dark:border-gray-700/50">
                        {product.category_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {product.has_variants 
                            ? `₱${Number(product.min_price).toLocaleString()} - ₱${Number(product.max_price).toLocaleString()}`
                            : `₱${Number(product.price_php).toLocaleString()}`}
                        </span>
                        {product.price_jpy && !product.has_variants && (
                          <span className="text-[10px] text-gray-400 font-medium italic">~ ¥{Number(product.price_jpy).toLocaleString()}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${Number(product.stock) > 10 ? 'bg-green-500' : Number(product.stock) > 0 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                        <span className={`font-bold ${Number(product.stock) === 0 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                          {product.stock}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(product)}
                          className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(product)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Modal (Add/Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-dark-surface w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/10">
            {/* Modal Header */}
            <div className="p-6 border-b dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Fill in the details below to save to inventory.</p>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-6 space-y-6 scrollbar-thin">
              {/* Image Upload Area */}
              <div className="flex flex-col items-center justify-center">
                <div 
                  className={`w-full h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden relative group ${
                    dragActive ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : 'border-gray-200 dark:border-gray-800 hover:border-primary-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onPaste={handlePaste}
                  onClick={() => fileInputRef.current?.click()}
                  onContextMenu={(e) => { e.preventDefault(); handleTouchStart(); }}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  {formImagePreview ? (
                    <div className="relative w-full h-full">
                       <img src={formImagePreview} alt="Preview" className="w-full h-full object-contain" />
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button type="button" onClick={(e) => { e.stopPropagation(); startLiveCamera('environment'); }} className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40">
                            <Camera size={24} />
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40">
                            <UploadCloud size={24} />
                          </button>
                       </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 p-6 text-center">
                      <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center text-primary-500">
                        <UploadCloud size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Drop image here or click to upload</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Supports PNG, JPG, JPEG • Pasting allowed</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); startLiveCamera('environment'); }}
                        className="mt-2 text-xs font-bold text-primary-500 hover:underline flex items-center gap-1.5"
                      >
                        <Camera size={14} />
                        Or use live camera
                      </button>
                    </div>
                  )}

                  {/* Floating Paste Button for Mobile */}
                  {showPasteButton && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
                      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-2xl w-full max-w-[200px]">
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handlePaste(e as any); }}
                          className="w-full py-3 bg-primary-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                        >
                          Paste Image
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setShowPasteButton(false); }}
                          className="w-full py-2 text-gray-400 text-xs font-bold"
                        >
                          Cancel
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400">Product Name</label>
                    {lookupSource && (
                      <span className="text-[10px] bg-primary-50 dark:bg-primary-900/30 text-primary-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-primary-100 dark:border-primary-800 animate-in fade-in slide-in-from-right-2">
                        <Zap size={10} className="fill-current" />
                        Found via {lookupSource}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="input flex-1" placeholder="e.g. SK-II Facial Treatment Essence" required />
                    <button 
                      type="button" 
                      onClick={() => startLiveCamera('environment')}
                      className="p-3 bg-primary-100 text-primary-600 rounded-xl hover:bg-primary-200 transition-all flex items-center justify-center shrink-0 shadow-sm active:scale-95"
                      title="Open Camera / Scan Barcode"
                    >
                      <Camera size={20} />
                    </button>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Barcode / JAN Code</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={formBarcode} 
                      onChange={e => setFormBarcode(e.target.value)} 
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleBarcodeLookup(formBarcode))}
                      className="input flex-1" 
                      placeholder="e.g. 4901234567890" 
                    />
                    <button 
                      type="button" 
                      onClick={() => handleBarcodeLookup(formBarcode)}
                      disabled={!formBarcode || lookupLoading}
                      className="px-4 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all font-bold text-xs uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
                    >
                      {lookupLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                      Lookup
                    </button>
                  </div>
                  {formBarcode && (
                    <div className="mt-3 p-4 bg-gray-50 dark:bg-dark-surfaceAlt rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-center">
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <BarcodeGenerator 
                          value={formBarcode} 
                          width={2} 
                          height={50} 
                          displayValue={true}
                          className="max-w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Brand Name (Optional)</label>
                  <input type="text" value={formBrand} onChange={e => setFormBrand(e.target.value)} className="input" placeholder="e.g. Shiseido, Meiji, SK-II" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Description / Product Notes</label>
                  <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} className="input min-h-[80px] py-3" placeholder="Additional details about the product..." />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Price (₱)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₱</span>
                    <input 
                      type="number" 
                      value={formPricePhp} 
                      onChange={e => handlePhpChange(e.target.value)} 
                      className="input pl-8 w-full" 
                      placeholder="0.00" 
                      required 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Price (¥)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">¥</span>
                    <input 
                      type="number" 
                      value={formPriceJpy} 
                      onChange={e => handleJpyChange(e.target.value)} 
                      className="input pl-8 w-full" 
                      placeholder="0" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Category</label>
                  <div className="flex gap-2">
                    {!isNewCategory ? (
                      <>
                        <select 
                          value={formCategory} 
                          onChange={e => setFormCategory(e.target.value)} 
                          className="input flex-1"
                        >
                          <option value="">Select Category</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <button 
                          type="button" 
                          onClick={() => setIsNewCategory(true)}
                          className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all shrink-0"
                        >
                          <Plus size={20} />
                        </button>
                      </>
                    ) : (
                      <>
                        <input 
                          type="text" 
                          value={newCategoryName} 
                          onChange={e => setNewCategoryName(e.target.value)} 
                          className="input flex-1" 
                          placeholder="New category name"
                          autoFocus
                        />
                        <button 
                          type="button" 
                          onClick={() => setIsNewCategory(false)}
                          className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all shrink-0"
                        >
                          <X size={20} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Base Stock</label>
                  <input 
                    type="number" 
                    value={formStock} 
                    onChange={e => setFormStock(e.target.value)} 
                    className="input w-full" 
                    placeholder="0" 
                    required 
                  />
                </div>
              </div>

              {/* Variations Section */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-gray-900 dark:text-white tracking-tight uppercase text-xs flex items-center gap-2">
                    <Settings size={14} className="text-primary-500" />
                    Product Variations
                  </h3>
                  <button 
                    type="button" 
                    onClick={addVariant}
                    className="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-700 flex items-center gap-1 group"
                  >
                    <Plus size={14} className="group-hover:scale-125 transition-transform" />
                    Add Variant
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

      {/* Unified Live Camera Modal */}
      {isLiveCameraOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="relative w-full h-full max-w-lg bg-black overflow-hidden flex flex-col">
            
            {/* Header Controls */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-30 bg-gradient-to-b from-black/60 to-transparent">
              <button 
                onClick={stopLiveCamera}
                className="p-2 text-white/90 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowManualInput(true)}
                  className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
                  title="Manual Input"
                >
                  <Keyboard className="w-5 h-5" />
                </button>
                {hasTorch && (
                  <button 
                    onClick={toggleTorch}
                    className={`p-2 rounded-full transition-all ${isTorchOn ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'bg-white/10 text-white'}`}
                  >
                    <Zap className={`w-5 h-5 ${isTorchOn ? 'fill-current' : ''}`} />
                  </button>
                )}
                <button 
                  onClick={flipCamera}
                  className="p-2 bg-white/10 text-white rounded-full"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Camera Viewport */}
            <div className="flex-1 relative bg-zinc-900 overflow-hidden flex items-center justify-center">
              <div id="live-camera-container" className="w-full h-full" />
              
              {/* Scan Reticle / Guide */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[70%] aspect-[1.5/1] border-2 border-white/20 rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/60 rounded-tl-xl -translate-x-1 -translate-y-1" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/60 rounded-tr-xl translate-x-1 -translate-y-1" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/60 rounded-bl-xl -translate-x-1 translate-y-1" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/60 rounded-br-xl translate-x-1 translate-y-1" />
                </div>
              </div>

              {/* Live Barcode Discovery Chip */}
              {liveDetectedCode && (
                <div className="absolute bottom-40 left-0 right-0 flex justify-center z-20 animate-in slide-in-from-bottom-4 fade-in duration-300">
                  <button
                    onClick={() => {
                      setFormBarcode(liveDetectedCode);
                      handleBarcodeLookup(liveDetectedCode);
                      if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
                      stopLiveCamera();
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      navigator.clipboard.writeText(liveDetectedCode);
                      setScanTip("📋 Copied to clipboard!");
                      if (navigator.vibrate) navigator.vibrate(100);
                      setTimeout(() => setScanTip("💡 TIP: Tap screen to focus!"), 2000);
                    }}
                    className="flex items-center gap-2 bg-yellow-400 text-black px-6 py-3 rounded-full font-bold shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_20px_rgba(250,204,21,0.4)] hover:bg-yellow-300 active:scale-95 transition-all group select-none"
                    title="Tap to use, Long Press to Copy"
                  >
                    <div className="relative">
                      <Barcode className="w-5 h-5" />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    </div>
                    <span className="tracking-wider font-mono">{liveDetectedCode}</span>
                    <Search className="w-4 h-4 ml-1 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              )}

              {/* Shutter Button (Taking Photo) */}
              <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center gap-6 bg-gradient-to-t from-black/80 to-transparent z-10">
                <p className="text-white/60 text-xs font-medium uppercase tracking-[0.2em]">{scanTip}</p>
                
                <button
                  onClick={capturePhoto}
                  className="relative group focus:outline-none"
                >
                  <div className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center p-1 group-active:scale-90 transition-transform">
                    <div className="w-full h-full rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.3)]" />
                  </div>
                </button>
              </div>

              {/* Flash effect overlay */}
              {isFlashing && (
                <div className="absolute inset-0 bg-white z-[60] animate-out fade-out duration-300" />
              )}

              {/* Manual Input Overlay */}
              {showManualInput && (
                <div className="absolute inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in-95 duration-200">
                  <div className="w-full max-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl">
                    <h3 className="text-lg font-bold mb-4 dark:text-white">Manual Barcode</h3>
                    <input 
                      autoFocus
                      type="text" 
                      className="input mb-4" 
                      placeholder="Enter Barcode Number..."
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value)}
                    />
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setShowManualInput(false)}
                        className="btn-secondary flex-1"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          if (manualBarcode.trim()) {
                            setFormBarcode(manualBarcode.trim());
                            handleBarcodeLookup(manualBarcode.trim());
                            setShowManualInput(false);
                            stopLiveCamera();
                          }
                        }}
                        className="btn-primary flex-1"
                        disabled={!manualBarcode.trim()}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-white/10">
            <div className="p-6 border-b dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Manage Categories</h2>
              <button onClick={() => setIsCategoryManagerOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-thin">
              <div className="space-y-3">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-surfaceAlt rounded-xl border dark:border-gray-800">
                    {editingCategoryId === cat.id ? (
                      <div className="flex gap-2 flex-1">
                        <input 
                          type="text" 
                          value={editCategoryName} 
                          onChange={e => setEditCategoryName(e.target.value)}
                          className="input py-1.5 flex-1 text-sm"
                          autoFocus
                        />
                        <button onClick={() => handleUpdateCategory(cat.id)} className="p-1.5 bg-green-500 text-white rounded-lg"><Check size={16} /></button>
                        <button onClick={() => setEditingCategoryId(null)} className="p-1.5 bg-gray-200 text-gray-600 rounded-lg"><X size={16} /></button>
                      </div>
                    ) : (
                      <>
                        <span className="font-bold text-gray-700 dark:text-gray-300">{cat.name}</span>
                        <div className="flex gap-1">
                          <button onClick={() => handleEditCategory(cat.id, cat.name)} className="p-2 text-gray-400 hover:text-primary-500"><Edit2 size={16} /></button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
