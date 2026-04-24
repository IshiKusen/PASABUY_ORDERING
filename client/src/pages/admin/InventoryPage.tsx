import React, { useState, useRef, useEffect } from "react";
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
  RefreshCw,
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { productsApi, categoriesApi, configApi } from "../../utils/api";
import { getImageUrl } from "../../utils/image";
import BarcodeGenerator from "../../components/common/BarcodeGenerator";

interface Variant {
  id?: number;
  variant_name: string;
  price_php: string;
  price_jpy: string;
  stock: string;
  image_file?: File | null;
  image_preview?: string;
  image_path?: string;
  barcode?: string;
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
  const [formCategory, setFormCategory] = useState("");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
    null,
  );
  const [editCategoryName, setEditCategoryName] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [formVariants, setFormVariants] = useState<Variant[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [targetVariantIndex, setTargetVariantIndex] = useState<number | null>(
    null,
  );

  // Live Camera States
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );
  const [isFlashing, setIsFlashing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [jpyToPhpRate, setJpyToPhpRate] = useState<number>(0.38);
  const [defaultStock, setDefaultStock] = useState<string>("1000");

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodData, catData, configData] = await Promise.all([
        productsApi.getAll({
          category: activeCategoryFilter,
          search: searchQuery,
        }),
        categoriesApi.getAll(),
        configApi.get(),
      ]);
      setProducts(prodData.products);
      setCategories(catData.categories);

      if (configData.config && configData.config.jpy_to_php_rate) {
        setJpyToPhpRate(Number(configData.config.jpy_to_php_rate));
      }
      if (configData.config && configData.config.default_stock_count) {
        setDefaultStock(configData.config.default_stock_count);
      }
    } catch (err) {
      console.error("Load error:", err);
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
      setFormCategory(String(product.category_id));
      setFormStock(String(product.stock));
      setFormImagePreview(
        product.image_path ? getImageUrl(product.image_path) : "",
      );
      setFormImageFile(null);
      setFormBarcode(product.barcode || "");
      setFormVariants(
        product.variants && product.variants.length > 0
          ? product.variants
          : [
              {
                variant_name: "Default",
                price_php: product.price_php,
                price_jpy: product.price_jpy || "",
                stock: String(product.stock),
                barcode: product.barcode || "",
                image_preview: product.image_path
                  ? getImageUrl(product.image_path)
                  : "",
              },
            ],
      );
    } else {
      setEditingProduct(null);
      setFormName("");
      setFormCategory(categories.length > 0 ? String(categories[0].id) : "");
      setFormStock(defaultStock);
      setFormImagePreview("");
      setFormImageFile(null);
      setFormBarcode("");
      setFormVariants([
        {
          variant_name: "",
          price_php: "",
          price_jpy: "",
          stock: defaultStock,
          barcode: "",
          image_preview: "",
        },
      ]);
    }
    setIsNewCategory(false);
    setNewCategoryName("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleDelete = async (product: Product) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${product.name}"? This cannot be undone.`,
      )
    ) {
      try {
        await productsApi.delete(product.id);
        await loadData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleCleanupInactive = async () => {
    if (
      window.confirm(
        "This will permanently delete ALL hidden/inactive products from the database. Continue?",
      )
    ) {
      try {
        const res = await productsApi.cleanupInactive();
        alert(res.message);
        await loadData();
      } catch (err: any) {
        alert(err.message || "Cleanup failed.");
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
        setLookupSource(data.source || "Database");

        if (data.source === "gemini-ai") {
          setScanTip(
            "🧠 AI identified this product! Please check the details.",
          );
        } else if (data.source === "openfoodfacts") {
          setScanTip("🍱 Found via Open Food Facts (Japan)!");
        } else {
          setScanTip("✅ Product found! Form auto-filled.");
        }
      }

      if (data.image) {
        setFormImagePreview(data.image);
        setFormImageFile(null); // Use the URL from API
      }

      // Don't close immediately if AI was used, so user can see the tip
      if (data.source !== "gemini-ai" && isLiveCameraOpen) {
        stopLiveCamera();
      }
    } catch (err: any) {
      console.error("Barcode lookup error:", err);
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
        advanced: [{ torch: newState } as any],
      });
      setIsTorchOn(newState);
    } catch (err) {
      console.error("Torch error:", err);
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
          image_preview: URL.createObjectURL(file),
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
    if ("clipboardData" in e) {
      items = e.clipboardData.items;
    } else {
      // Mobile paste logic
      try {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          for (const type of item.types) {
            if (type.startsWith("image/")) {
              const blob = await item.getType(type);
              const file = new File([blob], "pasted_image.png", { type });

              if (targetVariantIndex !== null) {
                const updated = [...formVariants];
                updated[targetVariantIndex] = {
                  ...updated[targetVariantIndex],
                  image_file: file,
                  image_preview: URL.createObjectURL(file),
                };
                setFormVariants(updated);
              } else {
                setFormImageFile(file);
                setFormImagePreview(URL.createObjectURL(file));
              }
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

    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const preview = URL.createObjectURL(file);
            if (targetVariantIndex !== null) {
              const updated = [...formVariants];
              updated[targetVariantIndex] = {
                ...updated[targetVariantIndex],
                image_file: file,
                image_preview: preview,
              };
              setFormVariants(updated);
            } else {
              setFormImageFile(file);
              setFormImagePreview(preview);
            }
          }
        }
      }
    }
  };

  // Unified Live Camera & Scanner Logic
  const startLiveCamera = async (
    mode: "user" | "environment" = "environment",
  ) => {
    try {
      // 1. Pre-flight Cleanup: Ensure no previous instance is running
      if (barcodeScannerRef.current) {
        try {
          await barcodeScannerRef.current.stop();
        } catch (e) {}
        barcodeScannerRef.current = null;
      }

      // 2. Check for Secure Context (HTTPS/Localhost)
      if (
        !window.isSecureContext &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1"
      ) {
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

      if (mode === "environment") {
        const backCamera = devices.find(
          (device) =>
            device.label.toLowerCase().includes("back") ||
            device.label.toLowerCase().includes("rear") ||
            device.label.toLowerCase().includes("environment") ||
            device.label.toLowerCase().includes("camera 0"), // Common on some Androids
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
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
        // Use native barcode detector if available (experimental but very powerful)
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      barcodeScannerRef.current = scanner;

      const config = {
        fps: 20, // Increased FPS for faster discovery
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          // Slightly taller box to capture tilted barcodes better
          return {
            width: Math.floor(minEdge * 0.85),
            height: Math.floor(minEdge * 0.55),
          };
        },
        aspectRatio: 1.777778,
        disableFlip: mode === "environment",
        // Request higher resolution for sharper barcode lines
        videoConstraints: {
          facingMode: mode,
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
        },
      };

      // 4. Start using the specific Device ID for better reliability
      await scanner.start(
        targetCameraId,
        config,
        (decodedText) => {
          setLiveDetectedCode(decodedText);
          if (navigator.vibrate) navigator.vibrate(50);
        },
        () => {},
      );

      setScanTip("💡 TIP: Tap screen to focus!");
      setHasTorch(true);

      // Tap to Focus logic
      setTimeout(() => {
        const videoElement = document.querySelector(
          "#live-camera-container video",
        );
        if (videoElement) {
          videoElement.addEventListener("click", () => {
            try {
              const track = (scanner as any).getRunningTrack();
              if (track && track.applyConstraints) {
                track.applyConstraints({
                  advanced: [{ focusMode: "continuous" } as any],
                });
                setScanTip("🎯 Focusing...");
                setTimeout(
                  () => setScanTip("💡 TIP: Tap screen to focus!"),
                  2000,
                );
              }
            } catch (e) {}
          });
        }
      }, 1000);
    } catch (err: any) {
      console.error("Camera/Scanner error:", err);

      let errorMsg = "Could not access camera.";

      if (err.message === "SECURE_CONTEXT_REQUIRED") {
        errorMsg =
          "🔒 HTTPS Required: Camera access is blocked on insecure connections. Please use HTTPS or localhost to test.";
      } else if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        errorMsg =
          "🚫 Permission Denied: Please allow camera access in your browser settings.";
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        errorMsg =
          "❓ Camera Not Found: No camera device detected on this system.";
      } else if (
        err.name === "NotReadableError" ||
        err.name === "TrackStartError"
      ) {
        errorMsg =
          "🎥 Camera Busy: Another application might be using the camera.";
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
    const newMode = facingMode === "user" ? "environment" : "user";
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
      setCategories(
        categories.map((cat) =>
          cat.id === id ? { ...cat, name: editCategoryName.trim() } : cat,
        ),
      );
      setProducts(
        products.map((p) =>
          p.category_id === id
            ? { ...p, category_name: editCategoryName.trim() }
            : p,
        ),
      );
      setEditingCategoryId(null);
    } catch (err) {
      alert("Failed to update category name.");
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (
      !window.confirm(
        "Are you sure? Products assigned to this category will lose their category association.",
      )
    )
      return;
    try {
      await categoriesApi.delete(id);
      setCategories(categories.filter((cat) => cat.id !== id));
      if (Number(formCategory) === id) setFormCategory("");
    } catch (err) {
      alert(
        "Failed to delete category. Make sure it's not being used by active records if constraints exist.",
      );
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const data = await categoriesApi.create(newCategoryName.trim());
      setCategories([...categories, data.category]);
      setNewCategoryName("");
    } catch (err) {
      alert("Failed to add category.");
    }
  };

  const capturePhoto = () => {
    const container = document.getElementById("live-camera-container");
    const video = container?.querySelector("video");
    const canvas = canvasRef.current;

    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Trigger flash effect
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 300);

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], `capture_${Date.now()}.jpg`, {
                type: "image/jpeg",
              });

              if (targetVariantIndex !== null) {
                const updated = [...formVariants];
                updated[targetVariantIndex] = {
                  ...updated[targetVariantIndex],
                  image_file: file,
                  image_preview: URL.createObjectURL(file),
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
          },
          "image/jpeg",
          0.9,
        );
      }
    }
  };

  // Variant Helpers
  const addVariant = () => {
    setFormVariants([
      ...formVariants,
      {
        variant_name: "",
        price_php: "",
        price_jpy: "",
        stock: defaultStock,
        barcode: "",
        image_file: null,
        image_preview: "",
      },
    ]);
  };

  const handleVariantChange = (
    index: number,
    field: keyof Variant,
    value: any,
  ) => {
    const updated = [...formVariants];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-conversion for variant prices
    if (field === "price_php") {
      if (value && !isNaN(Number(value)) && jpyToPhpRate > 0) {
        updated[index].price_jpy = (Number(value) / jpyToPhpRate).toFixed(0);
      } else {
        updated[index].price_jpy = "";
      }
    } else if (field === "price_jpy") {
      if (value && !isNaN(Number(value)) && jpyToPhpRate > 0) {
        updated[index].price_php = (Number(value) * jpyToPhpRate).toFixed(2);
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
        setCategories((prev) => [...prev, catData.category]);
      }

      const formData = new FormData();
      formData.append("name", formName);
      formData.append("description", ""); // Removed as requested
      formData.append("brand", ""); // Removed as requested
      formData.append("barcode", formBarcode);

      // Use first variant's price as base product price for legacy support
      const baseVariant = formVariants[0];
      formData.append("price_php", baseVariant?.price_php || "0");
      formData.append("price_jpy", baseVariant?.price_jpy || "0");

      formData.append("category_id", categoryId);
      formData.append("stock", formStock);

      if (formImageFile) {
        formData.append("image", formImageFile);
      } else if (formImagePreview) {
        // Handle cases where we have a preview but no file (e.g. from lookup or existing)
        if (!editingProduct) {
          // New product created with image from barcode lookup
          formData.append("image_path", formImagePreview);
        } else {
          // Existing product: check if preview matches current path or is a new lookup URL
          const originalResolvedUrl = editingProduct.image_path
            ? getImageUrl(editingProduct.image_path)
            : null;
          if (formImagePreview === originalResolvedUrl) {
            formData.append("image_path", editingProduct.image_path);
          } else {
            // Preview changed (e.g. from lookup during edit)
            formData.append("image_path", formImagePreview);
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
          barcode: v.barcode,
          image_path: v.image_path, // for existing variants
        };
      });
      formData.append("variants", JSON.stringify(variantsToSubmit));

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
            Inventory{" "}
            <span className="text-gray-400 font-light">Management</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Track stock levels, variants, and product details.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setIsCategoryManagerOpen(true)}
            className="btn-secondary flex items-center gap-2 group"
          >
            <Settings
              size={18}
              className="group-hover:rotate-90 transition-transform duration-500"
            />
            <span>Categories</span>
          </button>
          <button
            onClick={handleCleanupInactive}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl font-semibold text-sm hover:bg-red-100 transition-all"
            title="Permanently delete all hidden/inactive products"
          >
            <Trash2 size={16} />
            <span>Clean Up Inactive</span>
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
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
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
          {categories.map((cat) => (
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
            <p className="text-gray-400 font-medium animate-pulse">
              Loading inventory...
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-20 h-20 bg-gray-50 dark:bg-dark-surfaceAlt rounded-full flex items-center justify-center">
              <Package size={40} className="text-gray-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                No products found
              </h3>
              <p className="text-gray-500 max-w-xs">
                Start by adding your first product to the inventory.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-dark-surfaceAlt border-b dark:border-gray-800">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Product Info
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Barcode
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Category
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Price (PHP)
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Stock
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-surfaceAlt flex-shrink-0 border border-gray-100 dark:border-gray-800">
                          <img
                            src={getImageUrl(product.image_path)}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://placehold.co/100x100/f9a8d4/831843?text=No+Img";
                            }}
                          />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">
                            {product.name}
                          </h4>
                          <p className="text-[10px] text-primary-500 font-black uppercase tracking-widest mt-0.5">
                            {product.variants?.length || 0} Variation
                            {(product.variants?.length || 0) !== 1 ? "s" : ""}
                          </p>
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
                          <span className="text-[8px] font-mono font-bold text-gray-400 tracking-wider">
                            {product.barcode}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center opacity-20">
                          <Barcode size={20} className="text-gray-400" />
                          <span className="text-[8px] font-bold uppercase tracking-tighter text-gray-400">
                            N/A
                          </span>
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
                          <span className="text-[10px] text-gray-400 font-medium italic">
                            ~ ¥{Number(product.price_jpy).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const displayStock =
                          product.has_variants &&
                          product.variants &&
                          product.variants.length > 0
                            ? Number(product.variants[0].stock)
                            : Number(product.stock);

                        return (
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${displayStock > 10 ? "bg-green-500" : displayStock > 0 ? "bg-yellow-500" : "bg-red-500"}`}
                            />
                            <span
                              className={`font-bold ${displayStock === 0 ? "text-red-500" : "text-gray-700 dark:text-gray-300"}`}
                            >
                              {displayStock}
                            </span>
                            {product.has_variants &&
                              product.variants &&
                              product.variants.length > 0 && (
                                <span className="text-[10px] text-gray-400 font-medium">
                                  (Base)
                                </span>
                              )}
                          </div>
                        );
                      })()}
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
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Fill in the details below to save to inventory.
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="overflow-y-auto flex-1 p-6 space-y-8 scrollbar-thin"
            >
              {/* Image Upload Area - For Product Level (Optional) */}
              <div className="flex flex-col items-center justify-center">
                <div
                  className={`w-full h-40 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden relative group ${
                    dragActive
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/10"
                      : "border-gray-200 dark:border-gray-800 hover:border-primary-400"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onPaste={handlePaste}
                  onClick={() => {
                    setTargetVariantIndex(null);
                    fileInputRef.current?.click();
                  }}
                >
                  {formImagePreview ? (
                    <div className="relative w-full h-full">
                      <img
                        src={formImagePreview}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startLiveCamera("environment");
                          }}
                          className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40"
                        >
                          <Camera size={24} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40"
                        >
                          <UploadCloud size={24} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-6 text-center">
                      <UploadCloud size={24} className="text-primary-500" />
                      <div>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          Main Product Image (Optional)
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">
                          Drop image here or click to upload
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e)}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFileChange(e)}
                />
              </div>

              {/* Fields Grouped */}
              <div className="space-y-8">
                {/* Step 1: Product Name */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">
                      Product Name
                    </label>
                    {lookupSource && (
                      <span className="text-[10px] bg-primary-50 dark:bg-primary-900/30 text-primary-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-primary-100 dark:border-primary-800 animate-in fade-in slide-in-from-right-2">
                        <Zap size={10} className="fill-current" />
                        Found via {lookupSource}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="input w-full !rounded-[1.5rem] !py-4 text-lg font-bold"
                    placeholder="e.g. SK-II Facial Treatment Essence"
                    required
                  />
                </div>

                {/* Step 2: Barcode and Scanner */}
                <div className="space-y-4">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">
                    Barcode / JAN Code (Product Reference)
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={formBarcode}
                        onChange={(e) => setFormBarcode(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          (e.preventDefault(), handleBarcodeLookup(formBarcode))
                        }
                        className="input w-full !rounded-[1.5rem] !pl-12 !py-4 font-mono text-sm"
                        placeholder="Scan or enter barcode..."
                      />
                      <Barcode
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                        size={20}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetVariantIndex(null);
                        startLiveCamera("environment");
                      }}
                      className="p-4 bg-primary-500 text-white rounded-[1.5rem] hover:bg-primary-600 transition-all flex items-center justify-center shrink-0 shadow-lg shadow-primary-500/20 active:scale-95"
                      title="Scan Barcode"
                    >
                      <Camera size={24} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBarcodeLookup(formBarcode)}
                      disabled={!formBarcode || lookupLoading}
                      className="p-4 bg-gray-100 dark:bg-dark-surfaceAlt text-gray-600 dark:text-gray-400 rounded-[1.5rem] hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50 flex items-center justify-center"
                      title="Lookup Details"
                    >
                      {lookupLoading ? (
                        <Loader2 size={24} className="animate-spin" />
                      ) : (
                        <Search size={24} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Step 3: Categories */}
                <div className="space-y-4">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">
                    Product Category
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {categories.slice(0, 8).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setFormCategory(String(cat.id));
                          setIsNewCategory(false);
                        }}
                        className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase transition-all border ${
                          !isNewCategory && formCategory === String(cat.id)
                            ? "bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/25"
                            : "bg-white dark:bg-dark-surface border-gray-200 dark:border-gray-800 text-gray-500 hover:border-primary-400"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <select
                      value={isNewCategory ? "new" : formCategory}
                      onChange={(e) => {
                        if (e.target.value === "new") {
                          setIsNewCategory(true);
                          setFormCategory("");
                        } else {
                          setIsNewCategory(false);
                          setFormCategory(e.target.value);
                        }
                      }}
                      className="input flex-1 !rounded-[1.5rem] !py-3.5 appearance-none bg-no-repeat bg-[right_1.5rem_center] bg-[length:1.2em_1.2em]"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      }}
                    >
                      <option value="" disabled>
                        Or choose from all categories...
                      </option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                      <option
                        value="new"
                        className="font-bold text-primary-600"
                      >
                        + Add New Category
                      </option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setIsCategoryManagerOpen(true)}
                      className="p-3.5 bg-gray-100 dark:bg-dark-surfaceAlt text-gray-500 rounded-[1.5rem] hover:bg-gray-200 transition-colors"
                    >
                      <Settings size={22} />
                    </button>
                  </div>

                  {isNewCategory && (
                    <div className="animate-in slide-in-from-top-1 duration-200">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="input !rounded-[1.5rem] border-primary-300 focus:border-primary-500 ring-4 ring-primary-500/10"
                        placeholder="Type new category name..."
                        required
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                {/* Step 4: Variations */}
                <div className="space-y-6 pt-4">
                  <div className="flex items-center gap-2 pb-2 border-b dark:border-gray-800">
                    <div className="p-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-500 rounded-lg">
                      <Filter size={16} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Variations (Pricing & Stock)
                    </h3>
                  </div>

                  <div className="space-y-6">
                    {formVariants.map((variant, index) => (
                      <div
                        key={index}
                        onClick={() => setTargetVariantIndex(index)}
                        className={`relative p-6 bg-gray-50/50 dark:bg-white/5 rounded-[2rem] border transition-all ${
                          targetVariantIndex === index
                            ? "border-primary-500 ring-4 ring-primary-500/10 bg-primary-50/10"
                            : "border-gray-100 dark:border-gray-800 hover:border-primary-200"
                        }`}
                      >
                        {formVariants.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormVariants(
                                formVariants.filter((_, i) => i !== index),
                              );
                            }}
                            className="absolute -top-2 -right-2 p-2 bg-white dark:bg-dark-surface text-red-500 rounded-full shadow-lg border border-gray-100 dark:border-gray-800 hover:bg-red-50 transition-all active:scale-90"
                          >
                            <X size={16} />
                          </button>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                          {/* Variant Image */}
                          <div className="md:col-span-3">
                            <div
                              className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group transition-all ${
                                variant.image_preview || variant.image_path
                                  ? "border-transparent"
                                  : "border-gray-200 dark:border-gray-800 hover:border-primary-400"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setTargetVariantIndex(index);
                                fileInputRef.current?.click();
                              }}
                            >
                              {variant.image_preview ||
                              (variant.image_path &&
                                getImageUrl(variant.image_path)) ? (
                                <img
                                  src={
                                    variant.image_preview ||
                                    (variant.image_path
                                      ? getImageUrl(variant.image_path)
                                      : "")
                                  }
                                  alt="Variant"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-center p-2">
                                  <ImageIcon
                                    size={24}
                                    className="mx-auto text-gray-300 mb-1"
                                  />
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                    Add Photo
                                  </span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Camera size={20} className="text-white" />
                              </div>
                            </div>
                          </div>

                          {/* Variant Details */}
                          <div className="md:col-span-9 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                  Variant Name (e.g. Flavor, Color)
                                </label>
                                <input
                                  type="text"
                                  value={variant.variant_name}
                                  onChange={(e) =>
                                    handleVariantChange(
                                      index,
                                      "variant_name",
                                      e.target.value,
                                    )
                                  }
                                  className="input w-full !rounded-xl !py-3 text-sm font-bold"
                                  placeholder="e.g. Matcha, XL, Red"
                                  required
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                  Variant Barcode
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={variant.barcode || ""}
                                    onChange={(e) =>
                                      handleVariantChange(
                                        index,
                                        "barcode",
                                        e.target.value,
                                      )
                                    }
                                    className="input flex-1 !rounded-xl !py-2.5 text-xs font-mono"
                                    placeholder="Scan separate barcode for this flavor"
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTargetVariantIndex(index);
                                      startLiveCamera("environment");
                                    }}
                                    className="p-2.5 bg-gray-100 dark:bg-dark-surfaceAlt text-gray-600 rounded-xl hover:bg-gray-200 transition-all"
                                  >
                                    <Camera size={18} />
                                  </button>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                  Price (₱)
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                                    ₱
                                  </span>
                                  <input
                                    type="number"
                                    value={variant.price_php}
                                    onChange={(e) =>
                                      handleVariantChange(
                                        index,
                                        "price_php",
                                        e.target.value,
                                      )
                                    }
                                    className="input pl-7 w-full !rounded-xl !py-2.5 text-sm font-bold text-[#d62b70]"
                                    placeholder="0.00"
                                    required
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                  Stock Level
                                </label>
                                <input
                                  type="number"
                                  value={variant.stock}
                                  onChange={(e) =>
                                    handleVariantChange(
                                      index,
                                      "stock",
                                      e.target.value,
                                    )
                                  }
                                  className="input w-full !rounded-xl !py-2.5 text-sm font-bold bg-primary-50/30 dark:bg-primary-900/10 text-primary-600"
                                  placeholder="1000"
                                  required
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addVariant}
                      className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2rem] text-gray-400 font-bold hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50/5 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={20} />
                      Add Another Variation
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t dark:border-gray-800 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-8 flex items-center gap-2"
                  disabled={saving}
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving ? "Saving..." : "Save Product"}
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
                    className={`p-2 rounded-full transition-all ${isTorchOn ? "bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)]" : "bg-white/10 text-white"}`}
                  >
                    <Zap
                      className={`w-5 h-5 ${isTorchOn ? "fill-current" : ""}`}
                    />
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
                      setTimeout(
                        () => setScanTip("💡 TIP: Tap screen to focus!"),
                        2000,
                      );
                    }}
                    className="flex items-center gap-2 bg-yellow-400 text-black px-6 py-3 rounded-full font-bold shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_20px_rgba(250,204,21,0.4)] hover:bg-yellow-300 active:scale-95 transition-all group select-none"
                    title="Tap to use, Long Press to Copy"
                  >
                    <div className="relative">
                      <Barcode className="w-5 h-5" />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    </div>
                    <span className="tracking-wider font-mono">
                      {liveDetectedCode}
                    </span>
                    <Search className="w-4 h-4 ml-1 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              )}

              {/* Shutter Button (Taking Photo) */}
              <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center gap-6 bg-gradient-to-t from-black/80 to-transparent z-10">
                <p className="text-white/60 text-xs font-medium uppercase tracking-[0.2em]">
                  {scanTip}
                </p>

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
                    <h3 className="text-lg font-bold mb-4 dark:text-white">
                      Manual Barcode
                    </h3>
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
              <h2 className="text-xl font-black text-gray-900 dark:text-white">
                Manage Categories
              </h2>
              <button
                onClick={() => setIsCategoryManagerOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Add New Category Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type new category name..."
                  className="input flex-1 py-2 text-sm !rounded-xl"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="p-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/20"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto scrollbar-thin space-y-3 pr-1">
                {categories.length === 0 ? (
                  <p className="text-center py-10 text-gray-400 text-sm italic">
                    No categories found.
                  </p>
                ) : (
                  categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-surfaceAlt rounded-xl border dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-all group"
                    >
                      {editingCategoryId === cat.id ? (
                        <div className="flex gap-2 flex-1">
                          <input
                            type="text"
                            value={editCategoryName}
                            onChange={(e) =>
                              setEditCategoryName(e.target.value)
                            }
                            className="input py-1.5 flex-1 text-sm !rounded-lg"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateCategory(cat.id)}
                            className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setEditingCategoryId(null)}
                            className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-700 dark:text-gray-300">
                              {cat.name}
                            </span>
                            <span className="text-[8px] text-gray-400 uppercase font-medium">
                              ID: {cat.id}
                            </span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() =>
                                handleEditCategory(cat.id, cat.name)
                              }
                              className="p-2 text-gray-400 hover:text-primary-500 transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
