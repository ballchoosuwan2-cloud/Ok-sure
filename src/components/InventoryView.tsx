import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import { Product, StockMovementType } from '../types';
import { BarcodeGeneratorModal } from './BarcodeGeneratorModal';
import { CameraScannerModal } from './CameraScannerModal';
import { processAndCompressImage, dataUrlToBlob } from '../utils/imageCompressor';
import { uploadProductImage } from '../firebase';
import { playScannerBeep } from '../utils/audioQueue';
import { STORE_INFO } from '../config/storeConfig';
import {
  Package,
  Plus,
  ArrowDownRight,
  SlidersHorizontal,
  History,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Search,
  Tag,
  Edit2,
  Trash2,
  X,
  Printer,
  TrendingDown,
  TrendingUp,
  Sparkles,
  RotateCcw,
  Store,
  FileSpreadsheet,
  Camera,
  UploadCloud,
  Image as ImageIcon,
  Check,
  ScanLine,
  Percent,
  RefreshCw,
} from 'lucide-react';

// Standard unit options
const STANDARD_UNITS = [
  'ชิ้น',
  'กล่อง',
  'ขวด',
  'กระป๋อง',
  'แพ็ก',
  'ถุง',
  'กิโลกรัม',
  'กรัม',
  'ลิตร',
  'มิลลิลิตร',
  'อื่น ๆ',
];

// Default categories
const DEFAULT_SYSTEM_CATEGORIES = [
  'เครื่องดื่ม',
  'ขนม',
  'อาหาร',
  'ของใช้',
  'เครื่องสำอาง',
  'กิ๊ฟช็อป',
  'เครื่องเขียน',
  'เครื่องครัว',
  'เครื่องมือช่าง',
  'ของเล่น',
  'กระเป๋า',
  'นาฬิกา',
  'รองเท้า',
  'สินค้าเบ็ดเตล็ด',
  'อื่น ๆ',
];

interface InventoryViewProps {
  onOpenGoogleSheets?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onOpenGoogleSheets }) => {
  const {
    products,
    stockMovements,
    currentStaff,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    clearAllProductsToBlank,
    resetProductsToSample,
  } = usePOS();

  // Tab & Filters
  const [activeTab, setActiveTab] = useState<
    'all' | 'low' | 'out' | 'movements'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockActionProduct, setStockActionProduct] = useState<{
    product: Product;
    type: 'restock' | 'adjustment';
  } | null>(null);
  const [stockAmount, setStockAmount] = useState<number>(10);
  const [stockReason, setStockReason] = useState<string>('');
  const [selectedBarcodeProduct, setSelectedBarcodeProduct] = useState<Product | null>(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  // Camera Barcode Scanner for Add/Edit Modal
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Categories custom additions in session
  const [sessionCategories, setSessionCategories] = useState<string[]>([]);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Unit custom state
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [customUnitInput, setCustomUnitInput] = useState('');

  // Image Upload state
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [showDirectUrlInput, setShowDirectUrlInput] = useState(false);

  // Scanner status & notice
  const [scanNotice, setScanNotice] = useState<string | null>(null);

  // Refs
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Add/Edit Form State
  const [formData, setFormData] = useState<{
    name: string;
    sku: string;
    barcode: string;
    category: string;
    costPrice: number;
    sellingPrice: number;
    stock: number;
    unit: string;
    minStock: number;
    image: string;
    description: string;
    minProfit: number;
    minProfitType: 'amount' | 'percent';
  }>({
    name: '',
    sku: '',
    barcode: '',
    category: 'เครื่องดื่ม',
    costPrice: 0,
    sellingPrice: 0,
    stock: 0,
    unit: 'ชิ้น',
    minStock: 5,
    image: '',
    description: '',
    minProfit: 5,
    minProfitType: 'amount',
  });

  // All available categories for dropdown
  const availableCategories = useMemo(() => {
    const set = new Set<string>([
      ...DEFAULT_SYSTEM_CATEGORIES,
      ...STORE_INFO.categories,
      ...sessionCategories,
    ]);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products, sessionCategories]);

  // Combine store categories and product categories for filter tab
  const categories = useMemo(() => {
    const set = new Set<string>([
      ...STORE_INFO.categories,
      ...DEFAULT_SYSTEM_CATEGORIES,
      ...sessionCategories,
    ]);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['ทั้งหมด', ...Array.from(set)];
  }, [products, sessionCategories]);

  // USB / Bluetooth Barcode Scanner (HID Keyboard) listener for Add/Edit Modal
  useEffect(() => {
    if (!isAddModalOpen) return;

    // Auto-focus barcode input when opening modal
    const focusTimer = setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 150);

    let keyBuffer = '';
    let lastKeyTime = 0;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const isBarcodeFocused = activeElement === barcodeInputRef.current;
      const isOtherTextInput =
        activeElement &&
        (activeElement.tagName === 'TEXTAREA' ||
          (activeElement.tagName === 'INPUT' &&
            !isBarcodeFocused &&
            ['text', 'number', 'url'].includes((activeElement as HTMLInputElement).type)));

      const now = Date.now();

      // Scanner sends Enter or Tab at the end of scan
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (keyBuffer.length >= 3 && now - lastKeyTime < 180) {
          e.preventDefault();
          e.stopPropagation();
          const scannedCode = keyBuffer.trim();
          setFormData((prev) => ({ ...prev, barcode: scannedCode }));
          playScannerBeep();
          setScanNotice(`สแกนเนอร์ภายนอกสำเร็จ: ${scannedCode}`);
          setTimeout(() => setScanNotice(null), 2500);
          keyBuffer = '';
          return;
        }

        if (isBarcodeFocused) {
          e.preventDefault();
          e.stopPropagation();
          if (formData.barcode.trim()) {
            playScannerBeep();
            setScanNotice(`บันทึกรหัสบาร์โค้ด: ${formData.barcode.trim()}`);
            setTimeout(() => setScanNotice(null), 2500);
          }
          return;
        }
      }

      // Printable single character capture for rapid scanner burst
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const timeDiff = now - lastKeyTime;
        // Scanner emits characters rapidly (< 65ms apart)
        if (timeDiff < 65 || keyBuffer.length === 0) {
          keyBuffer += e.key;
        } else {
          keyBuffer = e.key;
        }
        lastKeyTime = now;

        // If not typing in another input, redirect scanner keystrokes to barcode
        if (!isOtherTextInput && !isBarcodeFocused && keyBuffer.length >= 2) {
          setFormData((prev) => ({ ...prev, barcode: keyBuffer }));
        }
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown, true);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleWindowKeyDown, true);
    };
  }, [isAddModalOpen, formData.barcode]);

  // Image upload and compression helpers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processSelectedFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processSelectedFile = async (file: File) => {
    setImageError(null);
    setIsCompressingImage(true);
    try {
      const dataUrl = await processAndCompressImage(file);
      // Immediately display local preview
      setFormData((prev) => ({ ...prev, image: dataUrl }));

      // Upload to Firebase Storage for cloud availability across all devices
      try {
        const blob = dataUrlToBlob(dataUrl);
        const cloudUrl = await uploadProductImage(blob, formData.sku || file.name || 'product');
        if (cloudUrl) {
          setFormData((prev) => ({ ...prev, image: cloudUrl, image_url: cloudUrl }));
        }
      } catch (uploadErr) {
        console.warn('Firebase Storage upload notice (using compressed data URL):', uploadErr);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'ไม่สามารถประมวลผลรูปภาพได้';
      setImageError(errorMsg);
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleDropImage = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingImage(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processSelectedFile(file);
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Tab condition
      if (activeTab === 'low' && (p.stock <= 0 || p.stock > p.minStock)) return false;
      if (activeTab === 'out' && p.stock > 0) return false;

      // Category
      if (selectedCategory !== 'ทั้งหมด' && p.category !== selectedCategory) return false;

      // Search
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.barcode.toLowerCase().includes(term)
      );
    });
  }, [products, activeTab, selectedCategory, searchTerm]);

  // Counts
  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length,
    [products]
  );
  const outOfStockCount = useMemo(
    () => products.filter((p) => p.stock <= 0).length,
    [products]
  );

  // Open Edit
  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    const isCustom = !STANDARD_UNITS.includes(product.unit);
    setIsCustomUnit(isCustom);
    setCustomUnitInput(isCustom ? product.unit : '');
    setIsAddingNewCategory(false);
    setNewCategoryInput('');
    setImageError(null);
    setShowDirectUrlInput(Boolean(product.image && !product.image.startsWith('data:')));
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      stock: product.stock,
      unit: product.unit,
      minStock: product.minStock,
      image: product.image || '',
      description: product.description || '',
      minProfit: product.minProfit ?? 5,
      minProfitType: product.minProfitType ?? 'amount',
    });
    setIsAddModalOpen(true);
  };

  // Open New Product Form
  const handleOpenAdd = () => {
    setEditingProduct(null);
    const randSku = `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
    const randBarcode = `885${Math.floor(100000000 + Math.random() * 900000000)}`;
    setIsCustomUnit(false);
    setCustomUnitInput('');
    setIsAddingNewCategory(false);
    setNewCategoryInput('');
    setImageError(null);
    setShowDirectUrlInput(false);
    setFormData({
      name: '',
      sku: randSku,
      barcode: randBarcode,
      category: 'เครื่องดื่ม',
      costPrice: 10,
      sellingPrice: 15,
      stock: 20,
      unit: 'ชิ้น',
      minStock: 5,
      image: '',
      description: '',
      minProfit: 5,
      minProfitType: 'amount',
    });
    setIsAddModalOpen(true);
  };

  // Submit Add / Edit
  const handleSubmitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('กรุณาระบุชื่อสินค้า');
      return;
    }
    if (!formData.barcode.trim()) {
      alert('กรุณาระบุรหัสบาร์โค้ด');
      return;
    }

    const finalUnit = isCustomUnit
      ? (customUnitInput.trim() || formData.unit || 'ชิ้น')
      : formData.unit;

    const finalProductData = {
      ...formData,
      unit: finalUnit,
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, finalProductData);
    } else {
      addProduct(finalProductData);
    }
    setIsAddModalOpen(false);
  };

  // Submit Stock Action (Restock / Adjust)
  const handleSubmitStockAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockActionProduct) return;

    const change =
      stockActionProduct.type === 'restock' ? Math.abs(stockAmount) : stockAmount;

    adjustStock(
      stockActionProduct.product.id,
      change,
      stockActionProduct.type,
      stockReason || (stockActionProduct.type === 'restock' ? 'รับสินค้าเข้าสต็อก' : 'ปรับยอดสต็อก')
    );

    setStockActionProduct(null);
    setStockReason('');
  };

  return (
    <div id="inventory-view" className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Store Banner for โอเค ชัวร์ */}
      <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 text-white p-5 rounded-2xl border border-pink-400/30 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-white/20 text-white rounded-md text-[11px] font-bold border border-white/30 backdrop-blur-xs">
                {STORE_INFO.name}
              </span>
              <span className="text-xs text-pink-100">• {STORE_INFO.location}</span>
            </div>
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Store className="w-5 h-5 text-pink-200" />
              <span>คลังสินค้าและสต็อก — {STORE_INFO.name}</span>
            </h2>
            <p className="text-xs text-pink-100 mt-1">
              {STORE_INFO.slogan} {STORE_INFO.subSlogan}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (window.confirm('คุณต้องการล้างสินค้าตัวอย่างทั้งหมด เพื่อเริ่มต้นลงสต็อกสินค้าจริงของร้าน (0 รายการ) ใช่หรือไม่?')) {
                  clearAllProductsToBlank();
                }
              }}
              className="px-3 py-2 bg-pink-900/40 hover:bg-rose-900/60 text-white text-xs font-semibold rounded-xl border border-pink-400/40 transition flex items-center gap-1.5 backdrop-blur-xs"
              title="ล้างสินค้าทดสอบเพื่อเริ่มใส่ข้อมูลจริง"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-200" />
              <span>ล้างตัวอย่าง (สต็อกจริง 0 ชิ้น)</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('คุณต้องการโหลดรายการสินค้าตัวอย่างกลับมาเพื่อทดสอบระบบใช่หรือไม่?')) {
                  resetProductsToSample();
                }
              }}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition flex items-center gap-1.5 backdrop-blur-xs"
              title="โหลดสินค้าตัวอย่างสำหรับทดลองระบบ"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>โหลดตัวอย่างทดสอบ</span>
            </button>

            {onOpenGoogleSheets && (
              <button
                onClick={onOpenGoogleSheets}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition"
                title="ซิงค์และนำเข้า/ส่งออกสต็อกด้วย Google Sheets"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                <span>Google Sheets</span>
              </button>
            )}

            <button
              id="add-product-btn"
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-pink-50 active:bg-pink-100 text-pink-700 text-xs font-black rounded-xl shadow-md transition"
            >
              <Plus className="w-4 h-4 text-pink-600" />
              <span>+ เพิ่มสินค้าใหม่</span>
            </button>
          </div>
        </div>

        {/* Categories Chips */}
        <div className="mt-4 pt-3 border-t border-white/20 flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
          <span className="text-pink-100 shrink-0 font-medium">หมวดหมู่ร้าน:</span>
          {STORE_INFO.categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setActiveTab('all');
              }}
              className={`px-2.5 py-1 rounded-lg shrink-0 transition font-medium ${
                selectedCategory === cat
                  ? 'bg-white text-pink-700 font-bold shadow-xs'
                  : 'bg-pink-700/50 text-pink-100 hover:bg-pink-700 hover:text-white border border-pink-400/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-pink-100 shadow-xs">
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'all'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-pink-50'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>สินค้าทั้งหมด ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('low')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'low'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>สินค้าใกล้หมด ({lowStockCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('out')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'out'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>สินค้าหมด ({outOfStockCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('movements')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'movements'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-indigo-700 hover:bg-indigo-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>ประวัติการเคลื่อนไหวสต็อก ({stockMovements.length})</span>
          </button>
        </div>

        {/* Filter by Category & Search */}
        {activeTab !== 'movements' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-1 focus:ring-emerald-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  หมวดหมู่: {c}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, SKU, บาร์โค้ด..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl w-48 focus:w-64 transition-all focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* TAB CONTENT: PRODUCTS TABLE */}
      {activeTab !== 'movements' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">รูป / ข้อมูลสินค้า</th>
                  <th className="py-3.5 px-3">SKU / บาร์โค้ด</th>
                  <th className="py-3.5 px-3">หมวดหมู่</th>
                  <th className="py-3.5 px-3 text-right">ราคาทุน</th>
                  <th className="py-3.5 px-3 text-right">ราคาขาย</th>
                  <th className="py-3.5 px-3 text-right">กำไรขั้นต้น</th>
                  <th className="py-3.5 px-4 text-center">คงเหลือ (สต็อก)</th>
                  <th className="py-3.5 px-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      ไม่พบข้อมูลสินค้าที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const profit = p.sellingPrice - p.costPrice;
                    const marginPct =
                      p.sellingPrice > 0 ? ((profit / p.sellingPrice) * 100).toFixed(0) : 0;
                    const isOutOfStock = p.stock <= 0;
                    const isLowStock = p.stock > 0 && p.stock <= p.minStock;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                              {p.image ? (
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-sm">
                                  {p.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{p.name}</div>
                              <div className="text-[10px] text-slate-400 line-clamp-1">
                                {p.description || `หน่วยนับ: ${p.unit}`}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 font-mono">
                          <div className="text-slate-800 font-semibold">{p.sku}</div>
                          <div className="text-[10px] text-slate-400">{p.barcode}</div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                            {p.category}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right font-medium text-slate-600">
                          ฿{p.costPrice.toFixed(2)}
                        </td>

                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          ฿{p.sellingPrice.toFixed(2)}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="font-bold text-emerald-600">+฿{profit.toFixed(2)}</div>
                          <div className="text-[10px] text-slate-400">({marginPct}%)</div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                              <span className="w-2 h-2 rounded-full bg-rose-600" />
                              0 {p.unit} (หมด)
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                              <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                              {p.stock} {p.unit} (ใกล้หมด)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              {p.stock} {p.unit}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Barcode Tag */}
                            <button
                              onClick={() => {
                                setSelectedBarcodeProduct(p);
                                setIsBarcodeModalOpen(true);
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                              title="พิมพ์บาร์โค้ด / ฉลากราคา"
                            >
                              <Tag className="w-3.5 h-3.5" />
                            </button>

                            {/* Stock In (Restock) */}
                            <button
                              onClick={() => {
                                setStockActionProduct({ product: p, type: 'restock' });
                                setStockAmount(10);
                                setStockReason('รับสินค้าเข้าสต็อกล็อตใหม่');
                              }}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
                              title="รับสินค้าเข้า (Stock In)"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                            </button>

                            {/* Stock Adjustment */}
                            <button
                              onClick={() => {
                                setStockActionProduct({ product: p, type: 'adjustment' });
                                setStockAmount(-1);
                                setStockReason('สินค้าชำรุด / ปรับยอดนับสต็อก');
                              }}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition"
                              title="ปรับยอดสต็อก (Adjust)"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                              title="แก้ไขข้อมูลสินค้า"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete (Admin only) */}
                            {currentStaff.role === 'admin' && (
                              <button
                                onClick={() => {
                                  if (confirm(`คุณต้องการลบสินค้า "${p.name}" หรือไม่?`)) {
                                    deleteProduct(p.id);
                                  }
                                }}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                                title="ลบสินค้า"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB CONTENT: STOCK MOVEMENTS LOG */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                ประวัติการเคลื่อนไหวของสต็อก (Stock Movement Audit Log)
              </h3>
              <p className="text-xs text-slate-500">
                บันทึกประวัติการขาย, การรับเข้า, การปรับยอด และการคืนสินค้าแบบเรียลไทม์
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">วัน-เวลา</th>
                  <th className="py-3 px-3">สินค้า</th>
                  <th className="py-3 px-3">ประเภท</th>
                  <th className="py-3 px-3 text-center">จำนวนที่เปลี่ยน</th>
                  <th className="py-3 px-3 text-center">สต็อก (ก่อน → หลัง)</th>
                  <th className="py-3 px-4">เหตุผล / เลขที่บิล</th>
                  <th className="py-3 px-4">ผู้ทำรายการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {stockMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                      ยังไม่มีประวัติการเคลื่อนไหวสต็อก
                    </td>
                  </tr>
                ) : (
                  stockMovements.map((sm) => {
                    const isPositive = sm.quantityChange > 0;
                    return (
                      <tr key={sm.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                          {new Date(sm.timestamp).toLocaleString('th-TH')}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <div className="font-bold text-slate-800">{sm.productName}</div>
                          <div className="text-[10px] text-slate-400">{sm.sku}</div>
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          {sm.type === 'sale' && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">
                              ขาย POS
                            </span>
                          )}
                          {sm.type === 'restock' && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-semibold">
                              รับสินค้าเข้า
                            </span>
                          )}
                          {sm.type === 'adjustment' && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-semibold">
                              ปรับยอดสต็อก
                            </span>
                          )}
                          {sm.type === 'refund' && (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-semibold">
                              คืนสินค้า
                            </span>
                          )}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-center font-bold ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? `+${sm.quantityChange}` : sm.quantityChange}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-700">
                          {sm.previousStock} → <span className="font-bold">{sm.newStock}</span>
                        </td>
                        <td className="py-2.5 px-4 font-sans text-slate-600 text-xs">
                          {sm.reason}
                        </td>
                        <td className="py-2.5 px-4 font-sans text-slate-500 text-xs">
                          {sm.staffName}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PRODUCT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full border border-pink-100 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-pink-600" />
                  <span>{editingProduct ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่ลงสต็อก'}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  กรอกข้อมูลสินค้า สแกนบาร์โค้ด และกำหนดราคาทุน-ราคาขาย
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scanner Toast Notice */}
            {scanNotice && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-150">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{scanNotice}</span>
                </span>
                <span className="text-[10px] text-emerald-600 bg-emerald-100/70 px-2 py-0.5 rounded-full font-mono">
                  พร้อมใช้งาน
                </span>
              </div>
            )}

            <form onSubmit={handleSubmitProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    ชื่อสินค้า: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น น้ำดื่มสิงห์ 600 มล., ปากกาเจล M&G 0.5 มม."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition"
                  />
                </div>

                {/* Category: Select Dropdown with Add New Option */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">
                      หมวดหมู่สินค้า: *
                    </label>
                    {!isAddingNewCategory && (
                      <button
                        type="button"
                        onClick={() => setIsAddingNewCategory(true)}
                        className="text-[11px] text-pink-600 hover:text-pink-700 font-semibold hover:underline flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> เพิ่มหมวดหมู่ใหม่
                      </button>
                    )}
                  </div>

                  {!isAddingNewCategory ? (
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === '__add_new__') {
                          setIsAddingNewCategory(true);
                        } else {
                          setFormData({ ...formData, category: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition font-medium text-slate-800"
                    >
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__add_new__" className="text-pink-600 font-bold bg-pink-50">
                        + เพิ่มหมวดหมู่ใหม่...
                      </option>
                    </select>
                  ) : (
                    <div className="p-2.5 bg-pink-50/60 border border-pink-200 rounded-xl space-y-2">
                      <div className="text-[11px] font-semibold text-pink-900">
                        ระบุชื่อหมวดหมู่สินค้าใหม่:
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="เช่น เบเกอรี่, อุปกรณ์ช่าง"
                          value={newCategoryInput}
                          onChange={(e) => setNewCategoryInput(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-pink-300 rounded-lg text-xs focus:ring-1 focus:ring-pink-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newCategoryInput.trim()) {
                                const newCat = newCategoryInput.trim();
                                setSessionCategories((prev) => [...prev, newCat]);
                                setFormData({ ...formData, category: newCat });
                                setIsAddingNewCategory(false);
                                setNewCategoryInput('');
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newCategoryInput.trim()) {
                              const newCat = newCategoryInput.trim();
                              setSessionCategories((prev) => [...prev, newCat]);
                              setFormData({ ...formData, category: newCat });
                              setIsAddingNewCategory(false);
                              setNewCategoryInput('');
                            }
                          }}
                          className="px-3 py-1.5 bg-pink-600 text-white rounded-lg font-bold text-xs hover:bg-pink-700 transition"
                        >
                          บันทึก
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewCategory(false);
                            setNewCategoryInput('');
                          }}
                          className="px-2.5 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs hover:bg-slate-300 transition"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* SKU */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    รหัส SKU: *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition"
                  />
                </div>

                {/* Barcode with Camera Scan Button & External Scanner support */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">
                      รหัสบาร์โค้ด (Barcode): *
                      <span className="text-[11px] text-slate-500 font-normal ml-1.5">
                        (พิมพ์คีย์บอร์ด, ส่องกล้อง หรือยิงเครื่องสแกน USB/Bluetooth)
                      </span>
                    </label>
                    <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      <ScanLine className="w-3 h-3" /> รองรับ USB / Bluetooth Scanner
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        required
                        placeholder="กรอกตัวเลข หรือยิงสแกนเนอร์"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (formData.barcode.trim()) {
                              playScannerBeep();
                              setScanNotice(`บันทึกรหัสบาร์โค้ด: ${formData.barcode.trim()}`);
                              setTimeout(() => setScanNotice(null), 2500);
                            }
                          }
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm tracking-wider text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition"
                      />
                    </div>

                    {/* Camera Scanner Button */}
                    <button
                      type="button"
                      onClick={() => setIsCameraScannerOpen(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition whitespace-nowrap"
                      title="เปิดกล้องมือถือหรือคอมพิวเตอร์เพื่อสแกนบาร์โค้ด/QR Code"
                    >
                      <Camera className="w-4 h-4" />
                      <span>📷 สแกน</span>
                    </button>

                    {/* Random Barcode Generator */}
                    <button
                      type="button"
                      onClick={() => {
                        const randomCode = `885${Math.floor(100000000 + Math.random() * 900000000)}`;
                        setFormData({ ...formData, barcode: randomCode });
                        playScannerBeep();
                      }}
                      className="px-2.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition whitespace-nowrap"
                      title="สุ่มรหัสบาร์โค้ดมาตรฐาน 885..."
                    >
                      สุ่มรหัส
                    </button>
                  </div>
                </div>

                {/* Cost Price */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ราคาทุน (บาท): *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.costPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ราคาขายหน้าร้าน (บาท): *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  />
                </div>

                {/* Minimum Profit Target Configuration */}
                <div className="md:col-span-2 p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-pink-600" />
                        <span>เป้าหมายกำไรขั้นต่ำต่อชิ้น (แก้ไขได้อิสระ):</span>
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        หากกำไรจากการขายต่ำกว่าเป้าหมายนี้ ระบบจะแสดงการแจ้งเตือนทันที
                      </p>
                    </div>

                    {/* Unit Switch: Baht vs Percent */}
                    <div className="flex bg-slate-200 p-0.5 rounded-lg border border-slate-300/80">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, minProfitType: 'amount' })}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                          formData.minProfitType === 'amount'
                            ? 'bg-white text-pink-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ฿ บาท
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, minProfitType: 'percent' })}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                          formData.minProfitType === 'percent'
                            ? 'bg-white text-pink-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        % เปอร์เซ็นต์
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative w-44">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={formData.minProfit}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            minProfit: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                        {formData.minProfitType === 'percent' ? '%' : '฿'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600">
                      {formData.minProfitType === 'percent' ? (
                        <span>
                          เป้าหมายกำไรขั้นต่ำ:{' '}
                          <strong className="text-slate-800">
                            {formData.minProfit}% = ฿
                            {((formData.sellingPrice * (formData.minProfit || 0)) / 100).toFixed(2)}
                          </strong>
                        </span>
                      ) : (
                        <span>
                          เป้าหมายกำไรขั้นต่ำ:{' '}
                          <strong className="text-slate-800">
                            ฿{(formData.minProfit || 0).toFixed(2)}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Real-time Profit Calculation Display */}
                  {(() => {
                    const actualProfit = formData.sellingPrice - formData.costPrice;
                    const profitPercent =
                      formData.sellingPrice > 0 ? (actualProfit / formData.sellingPrice) * 100 : 0;
                    const minTargetBaht =
                      formData.minProfitType === 'percent'
                        ? (formData.sellingPrice * (formData.minProfit || 0)) / 100
                        : formData.minProfit || 0;
                    const isBelowMin = formData.minProfit > 0 && actualProfit < minTargetBaht;

                    return (
                      <div className="space-y-2 pt-1">
                        {/* Summary Bar */}
                        <div className="p-3 bg-white rounded-xl border border-slate-200/90 flex items-center justify-between shadow-xs">
                          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <span>กำไรต่อชิ้น (ราคาขาย - ราคาทุน):</span>
                          </span>
                          <span
                            className={`font-black text-sm ${
                              actualProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {actualProfit >= 0
                              ? `+฿${actualProfit.toFixed(2)} (${profitPercent.toFixed(2)}%)`
                              : `-฿${Math.abs(actualProfit).toFixed(2)} (ขาดทุน ${Math.abs(
                                  profitPercent
                                ).toFixed(2)}%)`}
                          </span>
                        </div>

                        {/* Warning Box if profit is below minimum */}
                        {isBelowMin && (
                          <div className="p-3 bg-amber-50 border-2 border-amber-300/80 rounded-xl text-amber-900 flex items-start gap-2.5 animate-in fade-in duration-200">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold text-xs text-amber-900">
                                คำเตือน: กำไรต่อชิ้นต่ำกว่าเกณฑ์ขั้นต่ำที่คุณกำหนด!
                              </div>
                              <div className="text-[11px] text-amber-800 mt-0.5">
                                กำไรที่ได้รับจริง: <strong>+฿{actualProfit.toFixed(2)}</strong> (
                                {profitPercent.toFixed(2)}%) ซึ่งน้อยกว่าเป้าหมายขั้นต่ำที่คุณตั้งไว้ที่{' '}
                                <strong>
                                  {formData.minProfitType === 'percent'
                                    ? `${formData.minProfit}% (฿${minTargetBaht.toFixed(2)})`
                                    : `฿${minTargetBaht.toFixed(2)}`}
                                </strong>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Success Notice if profit meets or exceeds target */}
                        {!isBelowMin && formData.minProfit > 0 && (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              กำไรผ่านเกณฑ์ขั้นต่ำ (เป้าหมาย ฿{minTargetBaht.toFixed(2)} / ได้จริง{' '}
                              <strong>+฿{actualProfit.toFixed(2)}</strong>)
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Stock Count */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {editingProduct ? 'จำนวนสต็อกปัจจุบัน:' : 'จำนวนสต็อกเริ่มต้น:'} *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition"
                  />
                </div>

                {/* Unit: Select Dropdown with Other Custom option */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    หน่วยนับ: *
                  </label>
                  {!isCustomUnit ? (
                    <select
                      value={STANDARD_UNITS.includes(formData.unit) ? formData.unit : 'อื่น ๆ'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'อื่น ๆ') {
                          setIsCustomUnit(true);
                          setCustomUnitInput(
                            STANDARD_UNITS.includes(formData.unit) ? '' : formData.unit
                          );
                        } else {
                          setFormData({ ...formData, unit: val });
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition font-medium text-slate-800"
                    >
                      {STANDARD_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        placeholder="ระบุหน่วยนับเอง เช่น ซอง, โหล, แผง"
                        value={customUnitInput}
                        onChange={(e) => {
                          setCustomUnitInput(e.target.value);
                          setFormData({ ...formData, unit: e.target.value });
                        }}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomUnit(false);
                          setFormData({ ...formData, unit: 'ชิ้น' });
                        }}
                        className="px-2.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition whitespace-nowrap"
                      >
                        กลับเป็นตัวเลือก
                      </button>
                    </div>
                  )}
                </div>

                {/* Min Stock Alert */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    จุดเตือนสต็อกขั้นต่ำ (Min Stock): *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({ ...formData, minStock: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition"
                  />
                </div>

                {/* Product Image: File Upload / Drag & Drop with Preview */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-semibold text-slate-700">
                      รูปภาพสินค้า (อัปโหลดจากมือถือ/คอมพิวเตอร์):
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDirectUrlInput(!showDirectUrlInput)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                    >
                      {showDirectUrlInput ? 'ซ่อนช่องกรอก URL' : 'หรือระบุ URL รูปภาพโดยตรง'}
                    </button>
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Direct URL input toggle */}
                  {showDirectUrlInput && (
                    <div className="mb-2">
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-pink-500"
                      />
                    </div>
                  )}

                  {/* Image Preview or Dropzone */}
                  {formData.image ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
                      <div className="w-24 h-24 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                        <img
                          src={formData.image}
                          alt="Product preview"
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                          onError={() => setImageError('รูปภาพไม่สามารถแสดงผลได้ ตรวจสอบไฟล์หรือลิงก์')}
                        />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>เลือกรูปภาพเรียบร้อยแล้ว</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          รูปภาพถูกปรับขนาดและพร้อมบันทึกลงในระบบคลังสินค้า
                        </p>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg shadow-2xs transition"
                          >
                            เปลี่ยนรูปภาพ
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, image: '' });
                              setImageError(null);
                            }}
                            className="px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-lg transition"
                          >
                            ลบรูปภาพ
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingImage(true);
                      }}
                      onDragLeave={() => setIsDraggingImage(false)}
                      onDrop={handleDropImage}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                        isDraggingImage
                          ? 'border-pink-500 bg-pink-50/50'
                          : 'border-slate-300 hover:border-pink-400 bg-slate-50/70 hover:bg-slate-50'
                      }`}
                    >
                      {isCompressingImage ? (
                        <div className="flex flex-col items-center gap-2 py-2">
                          <RefreshCw className="w-6 h-6 text-pink-600 animate-spin" />
                          <span className="text-xs font-semibold text-slate-600">
                            กำลังประมวลผลและย่อขนาดรูปภาพ...
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center">
                            <UploadCloud className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 text-xs">
                              คลิกเพื่อเลือกรูปภาพจากอุปกรณ์
                            </span>
                            <span className="text-slate-500 text-xs ml-1">
                              หรือลากไฟล์มาวางที่นี่
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            รองรับไฟล์ JPG, JPEG, PNG, WEBP จากกล้องมือถือหรือคอมพิวเตอร์ (ปรับขนาดอัตโนมัติ)
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Image upload error alert */}
                  {imageError && (
                    <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{imageError}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 sticky bottom-0 bg-white z-10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 rounded-xl shadow-xs active:scale-95 transition"
                >
                  {editingProduct ? 'บันทึกการแก้ไข' : 'บันทึกเพิ่มสินค้า'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CAMERA SCANNER MODAL FOR BARCODE INPUT */}
      <CameraScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScanSuccess={(scannedCode) => {
          const cleanCode = scannedCode.trim();
          setFormData((prev) => ({ ...prev, barcode: cleanCode }));
          playScannerBeep();
          setScanNotice(`สแกนจากกล้องสำเร็จ: ${cleanCode}`);
          setTimeout(() => setScanNotice(null), 2500);
          setIsCameraScannerOpen(false);
        }}
        availableProducts={products}
        title="สแกนบาร์โค้ด / QR Code สินค้า"
        subtitle="ส่องกล้องไปที่กล่องหรือตัวสินค้าเพื่ออ่านรหัสเข้าช่องบาร์โค้ดอัตโนมัติ"
      />

      {/* MODAL: RESTOCK / STOCK ADJUSTMENT */}
      {stockActionProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                {stockActionProduct.type === 'restock' ? (
                  <>
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <span>รับสินค้าเข้า (Stock In)</span>
                  </>
                ) : (
                  <>
                    <SlidersHorizontal className="w-5 h-5 text-amber-600" />
                    <span>ปรับยอดสต็อก (Stock Adjustment)</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => setStockActionProduct(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="font-bold text-sm text-slate-900">{stockActionProduct.product.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                สต็อกปัจจุบัน: <span className="font-bold text-slate-800">{stockActionProduct.product.stock} {stockActionProduct.product.unit}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitStockAction} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {stockActionProduct.type === 'restock'
                    ? 'จำนวนที่รับเข้า (เพิ่มสต็อก):'
                    : 'จำนวนที่เปลี่ยนแปลง (+เพื่อเพิ่ม, -เพื่อลด):'}
                </label>
                <input
                  type="number"
                  required
                  value={stockAmount === 0 ? '' : stockAmount}
                  onChange={(e) => setStockAmount(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 text-base font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">เหตุผลการทำรายการ / เลขที่ใบสั่งซื้อ PO:</label>
                <input
                  type="text"
                  required
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  placeholder="เช่น ล็อตสั่งซื้อ PO-8890 หรือ สินค้าชำรุดเสียหาย"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Preview Result */}
              <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between font-medium">
                <span>สต็อกใหม่หลังบันทึก:</span>
                <span className="font-extrabold text-sm text-slate-900">
                  {Math.max(
                    0,
                    stockActionProduct.product.stock +
                      (stockActionProduct.type === 'restock'
                        ? Math.abs(stockAmount)
                        : stockAmount)
                  )}{' '}
                  {stockActionProduct.product.unit}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStockActionProduct(null)}
                  className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 rounded-xl shadow-xs"
                >
                  ยืนยันบันทึกสต็อก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BARCODE GENERATOR */}
      <BarcodeGeneratorModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        product={selectedBarcodeProduct}
      />
    </div>
  );
};
