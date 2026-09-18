import React, { useState, useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import { Product, StockMovementType } from '../types';
import { BarcodeGeneratorModal } from './BarcodeGeneratorModal';
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
} from 'lucide-react';

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
  }>({
    name: '',
    sku: '',
    barcode: '',
    category: STORE_INFO.categories[0] || 'กิ๊ฟช็อป',
    costPrice: 0,
    sellingPrice: 0,
    stock: 0,
    unit: 'ชิ้น',
    minStock: 5,
    image: '',
    description: '',
  });

  // Combine store categories and product categories
  const categories = useMemo(() => {
    const set = new Set<string>(STORE_INFO.categories);
    products.forEach((p) => set.add(p.category));
    return ['ทั้งหมด', ...Array.from(set)];
  }, [products]);

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
    });
    setIsAddModalOpen(true);
  };

  // Open New Product Form
  const handleOpenAdd = () => {
    setEditingProduct(null);
    const randSku = `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
    const randBarcode = `885${Math.floor(100000000 + Math.random() * 900000000)}`;
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

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        ...formData,
      });
    } else {
      addProduct({
        ...formData,
      });
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
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full border border-pink-100 shadow-2xl space-y-4 my-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-pink-600" />
                <span>{editingProduct ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่ลงสต็อก'}</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ชื่อสินค้า: *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น น้ำดื่มสิงห์ 600 มล."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    หมวดหมู่สินค้า: *
                    <span className="text-[10px] text-emerald-600 ml-1 font-normal">(เลือกจาก 10 หมวดหลัก หรือพิมพ์เอง)</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="store-categories-list"
                    placeholder="เช่น กิ๊ฟช็อป, เครื่องเขียน, ของเล่น ฯลฯ"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                  <datalist id="store-categories-list">
                    {STORE_INFO.categories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">รหัส SKU: *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">รหัสบาร์โค้ด (Barcode): *</label>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ราคาทุน (บาท): *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.costPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ราคาขายหน้าร้าน (บาท): *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-700 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">หน่วยนับ: *</label>
                  <input
                    type="text"
                    required
                    placeholder="ขวด, ชิ้น, ซอง, กล่อง, ฯลฯ"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">จุดเตือนสต็อกขั้นต่ำ (Min Stock): *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({ ...formData, minStock: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">URL รูปภาพสินค้า (ไม่บังคับ):</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Profit calculation badge preview */}
              <div className="p-3 bg-pink-50/70 rounded-xl border border-pink-200 flex items-center justify-between">
                <span className="font-semibold text-pink-900">
                  กำไรขั้นต้นคาดการณ์ต่อชิ้น:
                </span>
                <span className="font-black text-sm text-pink-700">
                  +฿{(formData.sellingPrice - formData.costPrice).toFixed(2)} (
                  {formData.sellingPrice > 0
                    ? (((formData.sellingPrice - formData.costPrice) / formData.sellingPrice) * 100).toFixed(0)
                    : 0}
                  %)
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 rounded-xl shadow-xs"
                >
                  {editingProduct ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
