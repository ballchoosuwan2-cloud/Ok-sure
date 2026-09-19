import React, { useState, useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import { Product, PaymentMethod, SplitPaymentDetail, BillTransaction } from '../types';
import { CameraScannerModal } from './CameraScannerModal';
import { CheckoutModal } from './CheckoutModal';
import { ReceiptModal } from './ReceiptModal';
import { BarcodeGeneratorModal } from './BarcodeGeneratorModal';
import {
  Search,
  ScanBarcode,
  Plus,
  Minus,
  Trash2,
  PauseCircle,
  PlayCircle,
  Percent,
  Receipt,
  RotateCcw,
  Tag,
  AlertTriangle,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  X,
} from 'lucide-react';

export const PosView: React.FC = () => {
  const {
    products,
    cart,
    overallDiscount,
    heldBills,
    transactions,
    settings,
    isTodayClosed,
    addToCart,
    updateCartItemQuantity,
    updateCartItemDiscount,
    removeFromCart,
    clearCart,
    setOverallDiscount,
    holdCurrentBill,
    restoreHeldBill,
    deleteHeldBill,
    processCheckout,
    refundTransaction,
  } = usePOS();

  // Search & Category Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [lastCompletedTx, setLastCompletedTx] = useState<BillTransaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedBarcodeProduct, setSelectedBarcodeProduct] = useState<Product | null>(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  // Discount modal state for item or whole bill
  const [discountModalItem, setDiscountModalItem] = useState<{
    productId?: string;
    name: string;
    currentDiscount: number;
    isBillDiscount: boolean;
  } | null>(null);
  const [discountVal, setDiscountVal] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');

  // Held Bills Drawer
  const [isHeldDrawerOpen, setIsHeldDrawerOpen] = useState(false);

  // Refund Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundSearch, setRefundSearch] = useState('');
  const [refundReason, setRefundReason] = useState('ลูกค้าเปลี่ยนใจ / สินค้ามีปัญหา');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category));
    return ['ทั้งหมด', ...Array.from(set)];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'ทั้งหมด' || p.category === selectedCategory;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.barcode.toLowerCase().includes(term);
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  // Handle scanned barcode / text
  const handleScanBarcode = (barcode: string) => {
    const clean = barcode.trim();
    // Try matching barcode or SKU or QR payload
    let matched = products.find((p) => p.barcode === clean || p.sku === clean);
    if (!matched) {
      try {
        // Maybe it's a JSON QR
        const parsed = JSON.parse(clean);
        if (parsed.barcode) {
          matched = products.find((p) => p.barcode === parsed.barcode || p.sku === parsed.sku);
        }
      } catch {
        // ignore
      }
    }

    if (matched) {
      addToCart(matched, 1);
    } else {
      alert(`ไม่พบสินค้าที่มีรหัสบาร์โค้ด: ${clean}`);
    }
  };

  // Cart calculations
  const itemsSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const grandTotal = Math.max(0, itemsSubtotal - overallDiscount);
  const vatAmount = Math.round((grandTotal * (settings.vatRate / (100 + settings.vatRate))) * 100) / 100;
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Checkout confirmation
  const handleConfirmPayment = async (
    method: PaymentMethod,
    cashReceived?: number,
    splitDetails?: SplitPaymentDetail,
    customerName?: string
  ) => {
    const result = await processCheckout(method, cashReceived, splitDetails, customerName);
    setIsCheckoutOpen(false);
    setLastCompletedTx(result.transaction);
    setIsReceiptOpen(true);
  };

  // Apply discount submit
  const handleApplyDiscount = () => {
    if (!discountModalItem) return;
    if (discountModalItem.isBillDiscount) {
      // Overall discount
      let finalDiscount = discountVal;
      if (discountType === 'percent') {
        finalDiscount = Math.round((itemsSubtotal * (discountVal / 100)) * 100) / 100;
      }
      setOverallDiscount(Math.min(itemsSubtotal, Math.max(0, finalDiscount)));
    } else if (discountModalItem.productId) {
      updateCartItemDiscount(discountModalItem.productId, discountVal, discountType);
    }
    setDiscountModalItem(null);
  };

  // Open barcode generator modal for a product
  const handleOpenBarcode = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setSelectedBarcodeProduct(product);
    setIsBarcodeModalOpen(true);
  };

  return (
    <div id="pos-view" className="h-full flex flex-col lg:flex-row gap-4 p-4 max-w-7xl mx-auto">
      {/* LEFT: Product Catalog & Search (60%) */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Search & Action Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="pos-product-search-input"
              type="text"
              placeholder="ค้นหาสินค้า / ยิงบาร์โค้ด / รหัส SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm) {
                  handleScanBarcode(searchTerm);
                  setSearchTerm('');
                }
              }}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="open-camera-scanner-btn"
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-xl transition shadow-2xs"
            >
              <ScanBarcode className="w-4 h-4 text-pink-600" />
              <span>เปิดกล้องสแกน</span>
            </button>

            <button
              id="open-refund-modal-btn"
              onClick={() => setIsRefundModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition shadow-2xs"
              title="ค้นหาบิลเพื่อทำการคืนเงิน"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>คืนสินค้า</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-4 py-2.5 border-b border-pink-100 flex gap-1.5 overflow-x-auto bg-white no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-pink-600 text-white shadow-2xs'
                  : 'bg-pink-50/70 text-slate-600 hover:bg-pink-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Closed warning banner if day is locked */}
        {isTodayClosed && (
          <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2 text-xs text-amber-800 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>วันนี้ได้ทำการปิดยอดประจำวัน (Daily Closing) เรียบร้อยแล้ว ยอดขายใหม่จะถูกบันทึกในประวัติเพิ่มเติม</span>
          </div>
        )}

        {/* Product Grid */}
        <div className="flex-1 p-4 overflow-y-auto min-h-[350px]">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16">
              <ShoppingBag className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
              <p className="text-sm font-medium">ไม่พบรายการสินค้าที่ตรงกับคำค้นหา</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('ทั้งหมด');
                }}
                className="mt-2 text-xs text-emerald-600 hover:underline"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((prod) => {
                const isOutOfStock = prod.stock <= 0;
                const isLowStock = prod.stock > 0 && prod.stock <= prod.minStock;

                return (
                  <div
                    key={prod.id}
                    onClick={() => {
                      if (!isOutOfStock) addToCart(prod, 1);
                    }}
                    className={`group relative flex flex-col justify-between p-3 rounded-xl border transition text-left cursor-pointer select-none ${
                      isOutOfStock
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-pink-500 hover:shadow-md active:scale-[0.98]'
                    }`}
                  >
                    {/* Top image or placeholder */}
                    <div className="relative w-full h-28 bg-pink-50/50 rounded-lg overflow-hidden mb-2">
                      {prod.image ? (
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-pink-300 text-xs font-medium">
                          {prod.category}
                        </div>
                      )}

                      {/* Stock badge */}
                      <div className="absolute top-1.5 right-1.5">
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded-md shadow-xs">
                            หมดสต็อก
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-md shadow-xs">
                            เหลือ {prod.stock}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-pink-600/90 text-white text-[10px] font-semibold rounded-md shadow-xs">
                            {prod.stock} {prod.unit}
                          </span>
                        )}
                      </div>

                      {/* Barcode button overlay */}
                      <button
                        onClick={(e) => handleOpenBarcode(e, prod)}
                        className="absolute bottom-1.5 right-1.5 p-1 bg-white/90 hover:bg-white text-slate-700 rounded shadow-xs text-[10px] flex items-center gap-1 opacity-80 hover:opacity-100 transition"
                        title="พิมพ์ฉลากบาร์โค้ด"
                      >
                        <Tag className="w-3 h-3 text-slate-600" />
                      </button>
                    </div>

                    {/* Meta info */}
                    <div>
                      <div className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-pink-600 transition">
                        {prod.name}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between mt-0.5">
                        <span>SKU: {prod.sku}</span>
                        <span className="font-mono text-[9px] text-slate-400">{prod.barcode}</span>
                      </div>
                    </div>

                    {/* Price and Add button */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-sm font-black text-pink-600">
                        ฿{prod.sellingPrice.toLocaleString()}
                      </div>
                      <button
                        disabled={isOutOfStock}
                        className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                          isOutOfStock
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-pink-50 text-pink-700 group-hover:bg-pink-600 group-hover:text-white'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Current Cart / Bill Checkout (40%) */}
      <div className="w-full lg:w-[420px] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Cart Header */}
        <div className="p-4 border-b border-pink-100 bg-pink-50/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-pink-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">รายการขายปัจจุบัน</h3>
              <p className="text-[11px] text-slate-500">
                {cart.length} รายการ ({totalItemCount} ชิ้น)
              </p>
            </div>
          </div>

          {/* Held bills pill / button */}
          <div className="flex items-center gap-1.5">
            {heldBills.length > 0 && (
              <button
                onClick={() => setIsHeldDrawerOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-lg transition"
              >
                <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>พักไว้ ({heldBills.length})</span>
              </button>
            )}
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="ล้างตะกร้าสินค้า"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[220px]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
              <Receipt className="w-12 h-12 stroke-1 text-pink-200 mb-2" />
              <p className="text-sm font-medium">ยังไม่มีรายการสินค้าในบิล</p>
              <p className="text-xs text-slate-400 mt-1 text-center max-w-[200px]">
                คลิกเลือกสินค้าหรือยิงสแกนบาร์โค้ดเพื่อเริ่มขาย
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl flex flex-col gap-2 hover:bg-pink-50/20 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="pr-2">
                    <div className="text-xs font-bold text-slate-900">{item.product.name}</div>
                    <div className="text-[10px] text-slate-500">
                      ฿{item.product.sellingPrice} / {item.product.unit}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900">
                      ฿{item.subtotal.toFixed(2)}
                    </div>
                    {item.discount > 0 && (
                      <div className="text-[10px] text-rose-600">
                        ลด -฿{item.discount.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quantity Controls & Discount */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                  {/* Qty */}
                  <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                    <button
                      onClick={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}
                      className="px-2 py-1 text-slate-600 hover:bg-slate-100 transition"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2.5 font-bold text-slate-800 min-w-[28px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
                      className="px-2 py-1 text-slate-600 hover:bg-slate-100 transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Discount & Delete */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setDiscountModalItem({
                          productId: item.product.id,
                          name: item.product.name,
                          currentDiscount: item.discount,
                          isBillDiscount: false,
                        });
                        setDiscountVal(item.discount);
                        setDiscountType('amount');
                      }}
                      className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-pink-700 bg-white border border-slate-200 px-2 py-1 rounded-lg transition"
                    >
                      <Percent className="w-3 h-3" />
                      <span>{item.discount > 0 ? `ลด ฿${item.discount}` : 'ส่วนลด'}</span>
                    </button>

                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Checkout Footer */}
        <div className="p-4 bg-pink-50/30 border-t border-pink-100 space-y-3">
          {/* Subtotal & Discounts */}
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>ยอดรวมสินค้า (Subtotal):</span>
              <span className="font-semibold text-slate-800">฿{itemsSubtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1">
                <span>ส่วนลดท้ายบิล:</span>
                <button
                  onClick={() => {
                    setDiscountModalItem({
                      name: 'ส่วนลดท้ายบิล (ทั้งบิล)',
                      currentDiscount: overallDiscount,
                      isBillDiscount: true,
                    });
                    setDiscountVal(overallDiscount);
                    setDiscountType('amount');
                  }}
                  className="text-pink-600 hover:underline text-[11px] font-medium"
                >
                  {overallDiscount > 0 ? `(฿${overallDiscount}) แก้ไข` : '+ ใส่ส่วนลด'}
                </button>
              </span>
              <span className="font-semibold text-rose-600">
                -฿{overallDiscount.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-[11px] text-slate-500">
              <span>ภาษีมูลค่าเพิ่ม (VAT 7% รวมในยอด):</span>
              <span>฿{vatAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Grand Total */}
          <div className="pt-2 border-t border-pink-100 flex justify-between items-center">
            <div>
              <span className="text-xs text-slate-500 font-medium">ยอดชำระสุทธิ</span>
              <div className="text-2xl font-black text-pink-600 tracking-tight">
                ฿{grandTotal.toFixed(2)}
              </div>
            </div>

            {/* Hold bill button */}
            {cart.length > 0 && (
              <button
                onClick={() => holdCurrentBill()}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
                title="พักบิลนี้ไว้ก่อนเพื่อขายลูกค้าท่านอื่น"
              >
                <PauseCircle className="w-4 h-4 text-amber-600" />
                <span>พักบิล</span>
              </button>
            )}
          </div>

          {/* Checkout Big Button */}
          <button
            id="checkout-action-btn"
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            className={`w-full py-3.5 px-4 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition ${
              cart.length === 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 active:from-pink-700 active:to-rose-700'
            }`}
          >
            <span>ชำระเงิน (฿{grandTotal.toFixed(2)})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MODAL: Discount Input */}
      {discountModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-pink-100 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-bold text-sm text-slate-800">
                ใส่ส่วนลด: {discountModalItem.name}
              </h4>
              <button onClick={() => setDiscountModalItem(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2 p-1 bg-pink-50 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDiscountType('amount')}
                className={`flex-1 py-1.5 rounded-md transition ${
                  discountType === 'amount' ? 'bg-white text-pink-700 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                จำนวนเงิน (฿)
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('percent')}
                className={`flex-1 py-1.5 rounded-md transition ${
                  discountType === 'percent' ? 'bg-white text-pink-700 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                เปอร์เซ็นต์ (%)
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {discountType === 'amount' ? 'ส่วนลดเป็นบาท' : 'ส่วนลดเป็น %'}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={discountVal === 0 ? '' : discountVal}
                onChange={(e) => setDiscountVal(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-lg font-bold text-slate-800 focus:ring-2 focus:ring-pink-500 focus:outline-hidden"
                placeholder="0"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDiscountVal(0);
                  handleApplyDiscount();
                }}
                className="flex-1 py-2 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition"
              >
                ล้างส่วนลด
              </button>
              <button
                type="button"
                onClick={handleApplyDiscount}
                className="flex-1 py-2 text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-xl transition shadow-xs"
              >
                บันทึกส่วนลด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: Held Bills */}
      {isHeldDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col p-5 border-l border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900">รายการบิลที่พักไว้ ({heldBills.length})</h3>
              </div>
              <button
                onClick={() => setIsHeldDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {heldBills.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-12">ไม่มีบิลที่พักไว้</div>
              ) : (
                heldBills.map((hb) => {
                  const billTotal = hb.items.reduce((s, i) => s + i.subtotal, 0) - hb.overallDiscount;
                  return (
                    <div
                      key={hb.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-xs text-slate-900">{hb.name}</div>
                          <div className="text-[10px] text-slate-500">
                            เวลาพัก: {hb.timestamp} โดย {hb.cashierName}
                          </div>
                        </div>
                        <div className="font-bold text-sm text-emerald-700">
                          ฿{billTotal.toFixed(2)}
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        {hb.items.map((i, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="truncate max-w-[180px]">• {i.product.name}</span>
                            <span>x{i.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-1 border-t border-slate-200">
                        <button
                          onClick={() => {
                            restoreHeldBill(hb.id);
                            setIsHeldDrawerOpen(false);
                          }}
                          className="flex-1 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center justify-center gap-1"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>ดึงบิลกลับมาขาย</span>
                        </button>
                        <button
                          onClick={() => deleteHeldBill(hb.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="ลบบิลพักนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Refund / Return Bill */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-rose-600">
                <RotateCcw className="w-5 h-5" />
                <h4 className="font-bold text-base text-slate-900">คืนสินค้า / ยกเลิกบิล (Refund)</h4>
              </div>
              <button onClick={() => setIsRefundModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ค้นหาเลขที่บิล หรือหมายเลขคิว:
              </label>
              <input
                type="text"
                placeholder="เช่น INV-202609-1048 หรือ A-45"
                value={refundSearch}
                onChange={(e) => setRefundSearch(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เหตุผลการคืนสินค้า:
              </label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>

            {/* Matching bills */}
            <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
              {transactions
                .filter(
                  (t) =>
                    (!refundSearch ||
                      t.billNumber.toLowerCase().includes(refundSearch.toLowerCase()) ||
                      t.queueNumber.toLowerCase().includes(refundSearch.toLowerCase())) &&
                    t.status === 'completed'
                )
                .slice(0, 5)
                .map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">
                        {t.billNumber} ({t.queueNumber})
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {t.dateStr} {t.timeStr} • {t.items.length} รายการ
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-slate-900">
                        ฿{t.grandTotal.toLocaleString()}
                      </span>
                      <button
                        onClick={() => {
                          if (confirm(`ยืนยันคืนเงินบิล ${t.billNumber} ยอด ฿${t.grandTotal} และดึงสต็อกกลับ?`)) {
                            refundTransaction(t.id, refundReason);
                            setIsRefundModalOpen(false);
                            alert(`คืนเงินและปรับสต็อกสินค้ากลับสำเร็จ`);
                          }
                        }}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-md text-[11px]"
                      >
                        คืนบิลนี้
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            <div className="text-right">
              <button
                onClick={() => setIsRefundModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modals */}
      <CameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanBarcode}
        availableProducts={products}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        grandTotal={grandTotal}
        settings={settings}
        onConfirmPayment={handleConfirmPayment}
      />

      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        transaction={lastCompletedTx}
        settings={settings}
      />

      <BarcodeGeneratorModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        product={selectedBarcodeProduct}
      />
    </div>
  );
};
