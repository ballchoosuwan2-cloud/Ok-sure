import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import {
  Product,
  CartItem,
  BillTransaction,
  QueueItem,
  StockMovement,
  DailyClosingRecord,
  StaffUser,
  StoreSettings,
  ActivityLog,
  PaymentMethod,
  SplitPaymentDetail,
  StockMovementType,
} from '../types';
import {
  INITIAL_PRODUCTS,
  SAMPLE_PRODUCTS_DEMO,
  INITIAL_STAFF,
  INITIAL_SETTINGS,
  INITIAL_QUEUES,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_DAILY_CLOSINGS,
  generateInitialTransactions,
} from '../utils/initialData';
import { announceQueueNumber } from '../utils/audioQueue';
import { saveSecureData } from '../utils/storageDB';

export interface HeldBill {
  id: string;
  name: string;
  items: CartItem[];
  overallDiscount: number;
  timestamp: string;
  cashierName: string;
}

interface POSContextType {
  products: Product[];
  cart: CartItem[];
  overallDiscount: number;
  heldBills: HeldBill[];
  transactions: BillTransaction[];
  queues: QueueItem[];
  currentQueueCalling: QueueItem | null;
  stockMovements: StockMovement[];
  dailyClosings: DailyClosingRecord[];
  currentStaff: StaffUser;
  staffList: StaffUser[];
  settings: StoreSettings;
  activityLogs: ActivityLog[];
  todayDateStr: string;
  isTodayClosed: boolean;

  // Cart actions
  addToCart: (product: Product, quantity?: number) => void;
  updateCartItemQuantity: (productId: string, quantity: number) => void;
  updateCartItemDiscount: (productId: string, discount: number, discountType?: 'amount' | 'percent') => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  setOverallDiscount: (discount: number) => void;
  holdCurrentBill: (name?: string) => boolean;
  restoreHeldBill: (heldBillId: string) => void;
  deleteHeldBill: (heldBillId: string) => void;

  // Checkout & Refund
  processCheckout: (
    paymentMethod: PaymentMethod,
    cashReceived?: number,
    splitDetails?: SplitPaymentDetail,
    customerName?: string
  ) => { transaction: BillTransaction; queue: QueueItem };
  refundTransaction: (transactionId: string, reason: string) => boolean;

  // Inventory actions
  addProduct: (product: Omit<Product, 'id'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (productId: string, quantityChange: number, type: StockMovementType, reason: string) => void;
  importProductsBulk: (newProducts: Product[], mode: 'replace' | 'merge') => void;
  clearAllProductsToBlank: () => void;
  resetProductsToSample: () => void;

  // Queue actions
  createQueue: (customerName?: string) => QueueItem;
  callQueue: (queueId: string) => void;
  recallQueue: (queueId: string) => void;
  completeQueue: (queueId: string) => void;
  skipQueue: (queueId: string) => void;
  cancelQueue: (queueId: string) => void;

  // Daily closing
  closeDailyRegister: (actualCash: number, notes: string) => DailyClosingRecord;
  closeTodaySales: (startingCash: number, actualCash: number, notes?: string) => DailyClosingRecord;

  // Staff & Settings
  switchStaff: (staffOrId: string | StaffUser) => void;
  addStaff: (name: string, role: 'admin' | 'manager' | 'cashier', pin: string) => StaffUser;
  updateStaff: (id: string, updates: Partial<StaffUser>) => void;
  deleteStaff: (id: string) => void;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  addActivityLog: (action: string, details: string, beforeState?: string, afterState?: string) => void;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PRODUCTS: 'pos_products_v2',
  TRANSACTIONS: 'pos_transactions_v2',
  QUEUES: 'pos_queues_v2',
  MOVEMENTS: 'pos_movements_v2',
  CLOSINGS: 'pos_closings_v2',
  SETTINGS: 'pos_settings_v2',
  HELD_BILLS: 'pos_held_bills_v2',
  STAFF_CURRENT: 'pos_current_staff_v2',
  LOGS: 'pos_activity_logs_v2',
};

// ตรวจสอบสถานะเปิดร้านจริง (ครั้งแรกที่เปิดระบบ ทำการล้างข้อมูลจำลองเดิมออกเพื่อเริ่มระบบเปล่าของร้านโอเค ชัวร์)
try {
  const REAL_CLEAN_KEY = 'ok_sure_real_clean_v1';
  if (typeof window !== 'undefined' && localStorage.getItem(REAL_CLEAN_KEY) !== 'true') {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.QUEUES);
    localStorage.removeItem(STORAGE_KEYS.MOVEMENTS);
    localStorage.removeItem(STORAGE_KEYS.CLOSINGS);
    localStorage.removeItem(STORAGE_KEYS.HELD_BILLS);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.QUEUES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CLOSINGS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.HELD_BILLS, JSON.stringify([]));
    localStorage.setItem(REAL_CLEAN_KEY, 'true');
  }
} catch (e) {
  console.warn('Storage init check:', e);
}

export const POSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Products state
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [overallDiscount, setOverallDiscount] = useState<number>(0);

  // Held bills
  const [heldBills, setHeldBills] = useState<HeldBill[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HELD_BILLS);
    return saved ? JSON.parse(saved) : [];
  });

  // Transactions
  const [transactions, setTransactions] = useState<BillTransaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return saved ? JSON.parse(saved) : generateInitialTransactions();
  });

  // Queues
  const [queues, setQueues] = useState<QueueItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.QUEUES);
    return saved ? JSON.parse(saved) : INITIAL_QUEUES;
  });

  // Stock movements
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
    return saved ? JSON.parse(saved) : INITIAL_STOCK_MOVEMENTS;
  });

  // Daily closings
  const [dailyClosings, setDailyClosings] = useState<DailyClosingRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CLOSINGS);
    return saved ? JSON.parse(saved) : INITIAL_DAILY_CLOSINGS;
  });

  // Staff
  const [staffList, setStaffList] = useState<StaffUser[]>(() => {
    const saved = localStorage.getItem('pos_staff_list_v2');
    return saved ? JSON.parse(saved) : INITIAL_STAFF;
  });

  const [currentStaff, setCurrentStaff] = useState<StaffUser>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STAFF_CURRENT);
    if (saved) {
      const found = INITIAL_STAFF.find((s) => s.id === saved);
      if (found) return found;
    }
    return INITIAL_STAFF[0]; // Admin by default for full preview
  });

  useEffect(() => {
    localStorage.setItem('pos_staff_list_v2', JSON.stringify(staffList));
    saveSecureData('pos_staff_list_v2', staffList);
  }, [staffList]);

  // Store settings
  const [settings, setSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  // Activity logs
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 'log-01',
            timestamp: new Date().toISOString(),
            userId: 'staff-admin',
            userName: 'สมชาย ผู้ดูแลระบบ (Admin)',
            action: 'เข้าสู่ระบบ',
            details: 'เปิดระบบจัดการหน้าร้าน POS สำเร็จ',
          },
        ];
  });

  // Persistence effects (LocalStorage + IndexedDB via localForage)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    saveSecureData(STORAGE_KEYS.PRODUCTS, products);
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    saveSecureData(STORAGE_KEYS.TRANSACTIONS, transactions);
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.QUEUES, JSON.stringify(queues));
    saveSecureData(STORAGE_KEYS.QUEUES, queues);
  }, [queues]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(stockMovements));
    saveSecureData(STORAGE_KEYS.MOVEMENTS, stockMovements);
  }, [stockMovements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLOSINGS, JSON.stringify(dailyClosings));
    saveSecureData(STORAGE_KEYS.CLOSINGS, dailyClosings);
  }, [dailyClosings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HELD_BILLS, JSON.stringify(heldBills));
    saveSecureData(STORAGE_KEYS.HELD_BILLS, heldBills);
  }, [heldBills]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    saveSecureData(STORAGE_KEYS.SETTINGS, settings);
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STAFF_CURRENT, currentStaff.id);
    saveSecureData(STORAGE_KEYS.STAFF_CURRENT, currentStaff.id);
  }, [currentStaff]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(activityLogs));
    saveSecureData(STORAGE_KEYS.LOGS, activityLogs);
  }, [activityLogs]);

  // Log activity helper
  const addActivityLog = (action: string, details: string, beforeState?: string, afterState?: string) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: currentStaff.id,
      userName: currentStaff.name,
      staffName: currentStaff.name,
      action,
      details,
      beforeState,
      afterState,
    };
    setActivityLogs((prev) => [newLog, ...prev.slice(0, 150)]);
  };

  // Check if today is already closed
  const isTodayClosed = useMemo(() => {
    return dailyClosings.some((dc) => dc.dateStr === todayDateStr && dc.isLocked);
  }, [dailyClosings, todayDateStr]);

  // Current calling queue
  const currentQueueCalling = useMemo(() => {
    return queues.find((q) => q.status === 'calling') || null;
  }, [queues]);

  // Cart operations
  const addToCart = (product: Product, quantity: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        const discount = existing.discount || 0;
        const subtotal = Math.max(0, newQty * product.sellingPrice - discount);
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty, subtotal } : item
        );
      } else {
        const subtotal = Math.max(0, quantity * product.sellingPrice);
        return [...prev, { product, quantity, discount: 0, subtotal }];
      }
    });
  };

  const updateCartItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const discount = item.discount || 0;
          const subtotal = Math.max(0, quantity * item.product.sellingPrice - discount);
          return { ...item, quantity, subtotal };
        }
        return item;
      })
    );
  };

  const updateCartItemDiscount = (
    productId: string,
    discountVal: number,
    discountType: 'amount' | 'percent' = 'amount'
  ) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const rawTotal = item.quantity * item.product.sellingPrice;
          let calculatedDiscount = 0;
          if (discountType === 'percent') {
            calculatedDiscount = Math.round((rawTotal * (discountVal / 100)) * 100) / 100;
          } else {
            calculatedDiscount = Math.min(rawTotal, Math.max(0, discountVal));
          }
          const subtotal = Math.max(0, rawTotal - calculatedDiscount);
          return {
            ...item,
            discount: calculatedDiscount,
            discountPercent: discountType === 'percent' ? discountVal : undefined,
            subtotal,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setOverallDiscount(0);
  };

  // Hold / Restore Bills
  const holdCurrentBill = (name?: string): boolean => {
    if (cart.length === 0) return false;
    const newHold: HeldBill = {
      id: `hold-${Date.now()}`,
      name: name || `บิลพักที่ #${heldBills.length + 1} (${cart.length} รายการ)`,
      items: [...cart],
      overallDiscount,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      cashierName: currentStaff.name,
    };
    setHeldBills((prev) => [newHold, ...prev]);
    clearCart();
    addActivityLog('พักบิล', `พักบิล: ${newHold.name}`);
    return true;
  };

  const restoreHeldBill = (heldBillId: string) => {
    const bill = heldBills.find((b) => b.id === heldBillId);
    if (!bill) return;
    setCart(bill.items);
    setOverallDiscount(bill.overallDiscount);
    setHeldBills((prev) => prev.filter((b) => b.id !== heldBillId));
    addActivityLog('ดึงบิลที่พักไว้', `ดึงบิล ${bill.name} กลับมาขายต่อ`);
  };

  const deleteHeldBill = (heldBillId: string) => {
    const bill = heldBills.find((b) => b.id === heldBillId);
    setHeldBills((prev) => prev.filter((b) => b.id !== heldBillId));
    if (bill) {
      addActivityLog('ยกเลิกบิลพัก', `ลบบิลพัก: ${bill.name}`);
    }
  };

  // Process Checkout
  const processCheckout = (
    paymentMethod: PaymentMethod,
    cashReceived?: number,
    splitDetails?: SplitPaymentDetail,
    customerName?: string
  ): { transaction: BillTransaction; queue: QueueItem } => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    // Compute bill number
    const billCounter = transactions.length + 1001;
    const billNumber = `INV-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${billCounter}`;

    // Queue numbering
    const queueCounter = (queues.length % 99) + 1;
    const queueNumber = `A-${queueCounter.toString().padStart(2, '0')}`;

    const itemsSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const grandTotal = Math.max(0, itemsSubtotal - overallDiscount);
    const totalCost = cart.reduce((sum, item) => sum + item.product.costPrice * item.quantity, 0);
    const grossProfit = grandTotal - totalCost;
    const tax = Math.round((grandTotal * (settings.vatRate / (100 + settings.vatRate))) * 100) / 100;

    const changeGiven =
      paymentMethod === 'cash' && cashReceived !== undefined
        ? Math.max(0, cashReceived - grandTotal)
        : undefined;

    const transaction: BillTransaction = {
      id: `tx-${Date.now()}`,
      billNumber,
      queueNumber,
      timestamp: now.toISOString(),
      dateStr,
      timeStr,
      items: cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        barcode: item.product.barcode,
        quantity: item.quantity,
        unit: item.product.unit,
        costPrice: item.product.costPrice,
        sellingPrice: item.product.sellingPrice,
        discount: item.discount,
        subtotal: item.subtotal,
      })),
      subtotal: itemsSubtotal,
      billDiscount: overallDiscount,
      tax,
      grandTotal,
      totalCost,
      grossProfit,
      paymentMethod,
      splitDetails,
      cashReceived,
      changeGiven,
      cashierId: currentStaff.id,
      cashierName: currentStaff.name,
      status: 'completed',
    };

    // 1. Cut stock immediately for all items
    const newMovements: StockMovement[] = [];
    setProducts((prevProducts) =>
      prevProducts.map((prod) => {
        const cartItem = cart.find((ci) => ci.product.id === prod.id);
        if (cartItem) {
          const newStock = Math.max(0, prod.stock - cartItem.quantity);
          newMovements.push({
            id: `sm-${Date.now()}-${prod.id}`,
            timestamp: now.toISOString(),
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            type: 'sale',
            quantityChange: -cartItem.quantity,
            previousStock: prod.stock,
            newStock,
            reason: `ขายบิล ${billNumber}`,
            staffName: currentStaff.name,
          });
          return { ...prod, stock: newStock };
        }
        return prod;
      })
    );

    if (newMovements.length > 0) {
      setStockMovements((prev) => [...newMovements, ...prev]);
    }

    // 2. Create queue record
    const queueItem: QueueItem = {
      id: `q-${Date.now()}`,
      queueNumber,
      billNumber,
      customerName: customerName || `ลูกค้าคิว ${queueNumber}`,
      status: 'waiting',
      createdAt: now.toISOString(),
    };
    setQueues((prev) => [queueItem, ...prev]);

    // 3. Save transaction
    setTransactions((prev) => [transaction, ...prev]);

    // 4. Clear cart
    clearCart();

    // 5. Activity log
    addActivityLog(
      'ขายสินค้า (POS)',
      `เปิดบิล ${billNumber} (${queueNumber}) ยอด ฿${grandTotal.toLocaleString()} โดยวิธี ${paymentMethod}`
    );

    return { transaction, queue: queueItem };
  };

  // Refund
  const refundTransaction = (transactionId: string, reason: string): boolean => {
    const tx = transactions.find((t) => t.id === transactionId);
    if (!tx || tx.status === 'refunded') return false;

    // Restore stock
    const refundMovements: StockMovement[] = [];
    setProducts((prevProducts) =>
      prevProducts.map((prod) => {
        const refundedItem = tx.items.find((item) => item.productId === prod.id);
        if (refundedItem) {
          const newStock = prod.stock + refundedItem.quantity;
          refundMovements.push({
            id: `sm-ref-${Date.now()}-${prod.id}`,
            timestamp: new Date().toISOString(),
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            type: 'refund',
            quantityChange: +refundedItem.quantity,
            previousStock: prod.stock,
            newStock,
            reason: `คืนสินค้าบิล ${tx.billNumber}: ${reason}`,
            staffName: currentStaff.name,
          });
          return { ...prod, stock: newStock };
        }
        return prod;
      })
    );

    if (refundMovements.length > 0) {
      setStockMovements((prev) => [...refundMovements, ...prev]);
    }

    // Update transaction status
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === transactionId
          ? {
              ...t,
              status: 'refunded',
              refundReason: reason,
              refundTimestamp: new Date().toISOString(),
              refundedBy: currentStaff.name,
            }
          : t
      )
    );

    addActivityLog('คืนสินค้า / ยกเลิกบิล', `คืนเงินบิล ${tx.billNumber} ยอด ฿${tx.grandTotal.toLocaleString()} เหตุผล: ${reason}`);
    return true;
  };

  // Inventory Management
  const addProduct = (productData: Omit<Product, 'id'>): Product => {
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    setProducts((prev) => [newProduct, ...prev]);

    // Log initial stock movement if > 0
    if (newProduct.stock > 0) {
      const movement: StockMovement = {
        id: `sm-init-${Date.now()}`,
        timestamp: new Date().toISOString(),
        productId: newProduct.id,
        productName: newProduct.name,
        sku: newProduct.sku,
        type: 'restock',
        quantityChange: newProduct.stock,
        previousStock: 0,
        newStock: newProduct.stock,
        reason: 'เพิ่มสินค้าเข้าระบบครั้งแรก',
        staffName: currentStaff.name,
      };
      setStockMovements((prev) => [movement, ...prev]);
    }

    addActivityLog('เพิ่มสินค้าใหม่', `เพิ่ม ${newProduct.name} (SKU: ${newProduct.sku}) สต็อก ${newProduct.stock} ${newProduct.unit}`);
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const target = products.find((p) => p.id === id);
    if (!target) return;

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
    );

    addActivityLog(
      'แก้ไขข้อมูลสินค้า',
      `แก้ไขสินค้า ${target.name}`,
      JSON.stringify({ name: target.name, price: target.sellingPrice, cost: target.costPrice }),
      JSON.stringify(updates)
    );
  };

  const deleteProduct = (id: string) => {
    const target = products.find((p) => p.id === id);
    if (!target) return;

    setProducts((prev) => prev.filter((p) => p.id !== id));
    addActivityLog('ลบสินค้า', `ลบสินค้า ${target.name} (SKU: ${target.sku})`);
  };

  const adjustStock = (
    productId: string,
    quantityChange: number,
    type: StockMovementType,
    reason: string
  ) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;

    const previousStock = target.stock;
    const newStock = Math.max(0, previousStock + quantityChange);

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
    );

    const movement: StockMovement = {
      id: `sm-adj-${Date.now()}`,
      timestamp: new Date().toISOString(),
      productId: target.id,
      productName: target.name,
      sku: target.sku,
      type,
      quantityChange,
      previousStock,
      newStock,
      reason,
      staffName: currentStaff.name,
    };
    setStockMovements((prev) => [movement, ...prev]);

    addActivityLog(
      'ปรับสต็อกสินค้า',
      `${target.name}: ${previousStock} -> ${newStock} (${quantityChange > 0 ? '+' : ''}${quantityChange}) เหตุผล: ${reason}`,
      `สต็อกเดิม: ${previousStock}`,
      `สต็อกใหม่: ${newStock}`
    );
  };

  const importProductsBulk = (newProducts: Product[], mode: 'replace' | 'merge') => {
    if (mode === 'replace') {
      setProducts(newProducts);
      addActivityLog(
        'นำเข้าสินค้าจาก Google Sheets',
        `แทนที่รายการสินค้าทั้งหมดด้วยข้อมูลจาก Google Sheets จำนวน ${newProducts.length} รายการ`
      );
    } else {
      setProducts((prev) => {
        const merged = [...prev];
        newProducts.forEach((incoming) => {
          const existingIdx = merged.findIndex(
            (p) => (incoming.barcode && p.barcode === incoming.barcode) || (incoming.sku && p.sku === incoming.sku)
          );
          if (existingIdx !== -1) {
            merged[existingIdx] = {
              ...merged[existingIdx],
              ...incoming,
              id: merged[existingIdx].id, // preserve ID
              updatedAt: new Date().toISOString(),
            };
          } else {
            merged.push({
              ...incoming,
              id: incoming.id || `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              updatedAt: new Date().toISOString(),
            });
          }
        });
        return merged;
      });
      addActivityLog(
        'นำเข้าสินค้าจาก Google Sheets',
        `รวมรายการสินค้าจาก Google Sheets เพิ่มเติม/อัปเดตจำนวน ${newProducts.length} รายการ`
      );
    }
  };

  const clearAllProductsToBlank = () => {
    setProducts([]);
    setCart([]);
    setHeldBills([]);
    setTransactions([]);
    setQueues([]);
    setStockMovements([]);
    setDailyClosings([]);
    addActivityLog(
      'ล้างสินค้าตัวอย่างเพื่อลงสต็อกจริง',
      'ล้างข้อมูลสินค้าตัวอย่างและประวัติทั้งหมด (0 รายการ) เพื่อเริ่มต้นใช้งานจริงของร้าน โอเค ชัวร์'
    );
  };

  const resetProductsToSample = () => {
    setProducts(SAMPLE_PRODUCTS_DEMO);
    addActivityLog(
      'โหลดสินค้าตัวอย่าง',
      'รีเซ็ตรายการสินค้าตัวอย่างกลับมาสำหรับการทดสอบระบบ'
    );
  };

  // Queue actions
  const createQueue = (customerName?: string): QueueItem => {
    const queueCounter = (queues.length % 99) + 1;
    const queueNumber = `A-${queueCounter.toString().padStart(2, '0')}`;
    const newQueue: QueueItem = {
      id: `q-${Date.now()}`,
      queueNumber,
      customerName: customerName || `ลูกค้าคิว ${queueNumber}`,
      status: 'waiting',
      createdAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    };
    setQueues((prev) => [newQueue, ...prev]);
    addActivityLog('ออกบัตรคิว', `ออกบัตรคิวใหม่ ${queueNumber}`);
    return newQueue;
  };

  const callQueue = (queueId: string) => {
    const target = queues.find((q) => q.id === queueId);
    if (!target) return;

    setQueues((prev) =>
      prev.map((q) => (q.id === queueId ? { ...q, status: 'calling', calledAt: new Date().toISOString() } : q))
    );

    announceQueueNumber(target.queueNumber, 'เคาน์เตอร์ 1');
    addActivityLog('เรียกคิว', `เรียกคิวหมายเลข ${target.queueNumber}`);
  };

  const recallQueue = (queueId: string) => {
    const target = queues.find((q) => q.id === queueId);
    if (!target) return;
    announceQueueNumber(target.queueNumber, 'เคาน์เตอร์ 1');
    addActivityLog('เรียกคิวซ้ำ', `เรียกซ้ำหมายเลขคิว ${target.queueNumber}`);
  };

  const completeQueue = (queueId: string) => {
    setQueues((prev) =>
      prev.map((q) => (q.id === queueId ? { ...q, status: 'completed', completedAt: new Date().toISOString() } : q))
    );
  };

  const skipQueue = (queueId: string) => {
    setQueues((prev) =>
      prev.map((q) => (q.id === queueId ? { ...q, status: 'skipped' } : q))
    );
  };

  const cancelQueue = (queueId: string) => {
    setQueues((prev) =>
      prev.map((q) => (q.id === queueId ? { ...q, status: 'cancelled' } : q))
    );
  };

  // Daily Closing
  const closeDailyRegister = (actualCash: number, notes: string): DailyClosingRecord => {
    const todayTransactions = transactions.filter((t) => t.dateStr === todayDateStr && t.status === 'completed');
    const todayRefunds = transactions.filter((t) => t.dateStr === todayDateStr && t.status === 'refunded');

    const totalSales = todayTransactions.reduce((sum, t) => sum + t.grandTotal, 0);
    const totalBills = todayTransactions.length;
    const totalItemsSold = todayTransactions.reduce(
      (sum, t) => sum + t.items.reduce((s, item) => s + item.quantity, 0),
      0
    );

    const cashSales = todayTransactions
      .filter((t) => t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + t.grandTotal, 0);

    const promptpaySales = todayTransactions
      .filter((t) => t.paymentMethod === 'promptpay')
      .reduce((sum, t) => sum + t.grandTotal, 0);

    const cardSales = todayTransactions
      .filter((t) => t.paymentMethod === 'card')
      .reduce((sum, t) => sum + t.grandTotal, 0);

    const totalDiscount = todayTransactions.reduce(
      (sum, t) => sum + t.billDiscount + t.items.reduce((s, i) => s + (i.discount || 0), 0),
      0
    );

    const totalRefundAmt = todayRefunds.reduce((sum, t) => sum + t.grandTotal, 0);
    const totalCost = todayTransactions.reduce((sum, t) => sum + t.totalCost, 0);
    const grossProfit = totalSales - totalCost;

    const startingCash = settings.startingCashDrawer;
    const expectedCash = startingCash + cashSales;
    const cashDifference = actualCash - expectedCash;

    const closingRecord: DailyClosingRecord = {
      id: `dc-${Date.now()}`,
      dateStr: todayDateStr,
      closedAt: new Date().toISOString(),
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      closedBy: currentStaff.name,
      totalSales,
      totalBills,
      totalItemsSold,
      cashSales,
      promptpaySales,
      cardSales,
      totalCash: cashSales,
      totalPromptPay: promptpaySales,
      totalDiscount,
      totalRefunds: totalRefundAmt,
      totalCost,
      grossProfit,
      startingCash,
      expectedCash,
      actualCash,
      actualCashCounted: actualCash,
      cashDifference,
      notes,
      isLocked: true,
    };

    setDailyClosings((prev) => [closingRecord, ...prev.filter((d) => d.dateStr !== todayDateStr)]);

    addActivityLog(
      'ปิดยอดประจำวัน (Daily Closing)',
      `ปิดยอดวันที่ ${todayDateStr} ยอดขาย ฿${totalSales.toLocaleString()} เงินสดจริง ฿${actualCash.toLocaleString()} ส่วนต่าง ฿${cashDifference.toLocaleString()}`
    );

    return closingRecord;
  };

  const closeTodaySales = (startingCash: number, actualCash: number, notes?: string): DailyClosingRecord => {
    if (startingCash !== settings.startingCashDrawer) {
      updateSettings({ startingCashDrawer: startingCash });
    }
    return closeDailyRegister(actualCash, notes || '');
  };

  // Staff & Settings
  const switchStaff = (staffOrId: string | StaffUser) => {
    const target = typeof staffOrId === 'string'
      ? staffList.find((s) => s.id === staffOrId)
      : staffOrId;
    if (target) {
      setCurrentStaff(target);
      addActivityLog('สลับผู้ใช้งาน', `เปลี่ยนผู้ใช้เป็น ${target.name} (${target.role})`);
    }
  };

  const addStaff = (name: string, role: 'admin' | 'manager' | 'cashier', pin: string): StaffUser => {
    const newStaff: StaffUser = {
      id: `staff-${Date.now()}`,
      name,
      role,
      pin,
      avatar: name.charAt(0).toUpperCase(),
    };
    setStaffList((prev) => [...prev, newStaff]);
    addActivityLog('เพิ่มพนักงานใหม่', `เพิ่ม ${name} ในตำแหน่ง ${role}`);
    return newStaff;
  };

  const updateStaff = (id: string, updates: Partial<StaffUser>) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    if (currentStaff.id === id) {
      setCurrentStaff((prev) => ({ ...prev, ...updates }));
    }
    addActivityLog('แก้ไขข้อมูลพนักงาน', `แก้ไขพนักงาน ID: ${id}`);
  };

  const deleteStaff = (id: string) => {
    setStaffList((prev) => prev.filter((s) => s.id !== id));
    addActivityLog('ลบพนักงาน', `ลบพนักงาน ID: ${id}`);
  };

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    addActivityLog('แก้ไขการตั้งค่าร้านค้า', 'ปรับปรุงข้อมูลร้านค้าหรือระบบเงินทอน');
  };

  return (
    <POSContext.Provider
      value={{
        products,
        cart,
        overallDiscount,
        heldBills,
        transactions,
        queues,
        currentQueueCalling,
        stockMovements,
        dailyClosings,
        currentStaff,
        staffList,
        settings,
        activityLogs,
        todayDateStr,
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

        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        importProductsBulk,
        clearAllProductsToBlank,
        resetProductsToSample,

        createQueue,
        callQueue,
        recallQueue,
        completeQueue,
        skipQueue,
        cancelQueue,

        closeDailyRegister,
        closeTodaySales,
        switchStaff,
        addStaff,
        updateStaff,
        deleteStaff,
        updateSettings,
        addActivityLog,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
