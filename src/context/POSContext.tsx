import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useRef } from 'react';
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
import {
  db,
  ensureTerminalAuth,
  formatProductForFirestore,
  deductProductStockInFirestore,
  processAtomicCheckoutInFirestore,
  testFirestoreConnection,
} from '../firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';

export interface HeldBill {
  id: string;
  name: string;
  items: CartItem[];
  overallDiscount: number;
  timestamp: string;
  cashierName: string;
}

export interface POSContextType {
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

  // Real-time Cloud Database Status
  isOnline: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncedAt: string | null;
  syncError: string | null;

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
  ) => Promise<{ transaction: BillTransaction; queue: QueueItem }>;
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

export const POSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Online / Offline & Real-time Cloud Sync Status
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('syncing');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Products state (defaults to initial/cached, updated live by Firestore)
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  // Cart state (local to terminal until checkout)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [overallDiscount, setOverallDiscount] = useState<number>(0);

  // Held bills (synchronized across terminals)
  const [heldBills, setHeldBills] = useState<HeldBill[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HELD_BILLS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Transactions
  const [transactions, setTransactions] = useState<BillTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return saved ? JSON.parse(saved) : generateInitialTransactions();
    } catch {
      return generateInitialTransactions();
    }
  });

  // Queues
  const [queues, setQueues] = useState<QueueItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.QUEUES);
      return saved ? JSON.parse(saved) : INITIAL_QUEUES;
    } catch {
      return INITIAL_QUEUES;
    }
  });

  // Stock movements
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
      return saved ? JSON.parse(saved) : INITIAL_STOCK_MOVEMENTS;
    } catch {
      return INITIAL_STOCK_MOVEMENTS;
    }
  });

  // Daily closings
  const [dailyClosings, setDailyClosings] = useState<DailyClosingRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLOSINGS);
      return saved ? JSON.parse(saved) : INITIAL_DAILY_CLOSINGS;
    } catch {
      return INITIAL_DAILY_CLOSINGS;
    }
  });

  // Staff
  const [staffList, setStaffList] = useState<StaffUser[]>(() => {
    try {
      const saved = localStorage.getItem('pos_staff_list_v2');
      return saved ? JSON.parse(saved) : INITIAL_STAFF;
    } catch {
      return INITIAL_STAFF;
    }
  });

  const [currentStaff, setCurrentStaff] = useState<StaffUser>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STAFF_CURRENT);
      if (saved) {
        const found = INITIAL_STAFF.find((s) => s.id === saved);
        if (found) return found;
      }
    } catch {
      // fallback
    }
    return INITIAL_STAFF[0];
  });

  // Store settings
  const [settings, setSettings] = useState<StoreSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  // Activity logs
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    try {
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
    } catch {
      return [];
    }
  });

  // Keep track of Firestore initialized status
  const isMigratedRef = useRef(false);

  // Monitor browser online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('synced');
      setSyncError(null);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
      setSyncError('ไม่มีการเชื่อมต่ออินเทอร์เน็ต ข้อมูลยังไม่ได้ซิงก์');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // -------------------------------------------------------------
  // REAL-TIME FIRESTORE SUBSCRIPTIONS (Cross-Device Cloud Sync)
  // -------------------------------------------------------------
  useEffect(() => {
    let unsubProducts: () => void = () => {};
    let unsubTransactions: () => void = () => {};
    let unsubQueues: () => void = () => {};
    let unsubMovements: () => void = () => {};
    let unsubClosings: () => void = () => {};
    let unsubHeldBills: () => void = () => {};
    let unsubSettings: () => void = () => {};
    let unsubStaff: () => void = () => {};
    let unsubLogs: () => void = () => {};

    async function initFirestoreSync() {
      try {
        setSyncStatus('syncing');
        await ensureTerminalAuth();
        await testFirestoreConnection();

        // 1. Subscribe to Products
        const productsCol = collection(db, 'products');
        unsubProducts = onSnapshot(
          productsCol,
          async (snapshot) => {
            if (snapshot.empty && !isMigratedRef.current) {
              isMigratedRef.current = true;
              // If central Firestore database has no products yet, seed initial items
              try {
                const batch = writeBatch(db);
                const seedList = products.length > 0 ? products : INITIAL_PRODUCTS;
                seedList.forEach((p) => {
                  const ref = doc(db, 'products', p.id);
                  batch.set(ref, formatProductForFirestore(p));
                });
                await batch.commit();
              } catch (seedErr) {
                console.warn('Initial products seed notice:', seedErr);
              }
              return;
            }

            const liveProducts: Product[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              liveProducts.push({
                id: docSnap.id,
                name: data.name || data.product_name || '',
                product_name: data.name || data.product_name || '',
                category: data.category || 'ทั่วไป',
                sku: data.sku || data.barcode || docSnap.id,
                barcode: data.barcode || '',
                costPrice: Number(data.costPrice ?? data.cost_price ?? 0),
                cost_price: Number(data.costPrice ?? data.cost_price ?? 0),
                sellingPrice: Number(data.sellingPrice ?? data.selling_price ?? 0),
                selling_price: Number(data.sellingPrice ?? data.selling_price ?? 0),
                stock: Number(data.stock ?? 0),
                unit: data.unit || 'ชิ้น',
                minStock: Number(data.minStock ?? data.min_stock ?? 0),
                min_stock: Number(data.min_stock ?? data.minStock ?? 0),
                image: data.image || data.image_url || '',
                image_url: data.image || data.image_url || '',
                description: data.description || '',
                minProfit: Number(data.minProfit ?? data.minimum_profit ?? 0),
                minimum_profit: Number(data.minProfit ?? data.minimum_profit ?? 0),
                minProfitType: data.minProfitType || 'amount',
                createdAt: data.createdAt || data.created_at,
                created_at: data.createdAt || data.created_at,
                updatedAt: data.updatedAt || data.updated_at,
                updated_at: data.updatedAt || data.updated_at,
              });
            });

            // Sort products by name or creation
            liveProducts.sort((a, b) => a.name.localeCompare(b.name, 'th'));

            setProducts(liveProducts);
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(liveProducts));
            saveSecureData(STORAGE_KEYS.PRODUCTS, liveProducts);
            setSyncStatus('synced');
            setLastSyncedAt(new Date().toLocaleTimeString('th-TH'));
          },
          (err) => {
            console.error('Firestore products sync error:', err);
            setSyncStatus('error');
            setSyncError('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูลออนไลน์');
          }
        );

        // 2. Subscribe to Transactions
        const txCol = collection(db, 'transactions');
        unsubTransactions = onSnapshot(
          txCol,
          (snapshot) => {
            const liveTx: BillTransaction[] = [];
            snapshot.forEach((docSnap) => {
              liveTx.push(docSnap.data() as BillTransaction);
            });
            // Sort by timestamp desc
            liveTx.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            if (liveTx.length > 0) {
              setTransactions(liveTx);
              localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(liveTx));
              saveSecureData(STORAGE_KEYS.TRANSACTIONS, liveTx);
            }
          },
          (err) => console.warn('Transactions sync warning:', err)
        );

        // 3. Subscribe to Queues
        const queueCol = collection(db, 'queues');
        unsubQueues = onSnapshot(
          queueCol,
          (snapshot) => {
            const liveQueues: QueueItem[] = [];
            snapshot.forEach((docSnap) => {
              liveQueues.push(docSnap.data() as QueueItem);
            });
            liveQueues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            if (liveQueues.length > 0) {
              setQueues(liveQueues);
              localStorage.setItem(STORAGE_KEYS.QUEUES, JSON.stringify(liveQueues));
              saveSecureData(STORAGE_KEYS.QUEUES, liveQueues);
            }
          },
          (err) => console.warn('Queues sync warning:', err)
        );

        // 4. Subscribe to Stock Movements
        const movementCol = collection(db, 'stockMovements');
        unsubMovements = onSnapshot(
          movementCol,
          (snapshot) => {
            const liveMovements: StockMovement[] = [];
            snapshot.forEach((docSnap) => {
              liveMovements.push(docSnap.data() as StockMovement);
            });
            liveMovements.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            if (liveMovements.length > 0) {
              setStockMovements(liveMovements);
              localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(liveMovements));
              saveSecureData(STORAGE_KEYS.MOVEMENTS, liveMovements);
            }
          },
          (err) => console.warn('StockMovements sync warning:', err)
        );

        // 5. Subscribe to Daily Closings
        const closingCol = collection(db, 'dailyClosings');
        unsubClosings = onSnapshot(
          closingCol,
          (snapshot) => {
            const liveClosings: DailyClosingRecord[] = [];
            snapshot.forEach((docSnap) => {
              liveClosings.push(docSnap.data() as DailyClosingRecord);
            });
            liveClosings.sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());
            if (liveClosings.length > 0) {
              setDailyClosings(liveClosings);
              localStorage.setItem(STORAGE_KEYS.CLOSINGS, JSON.stringify(liveClosings));
              saveSecureData(STORAGE_KEYS.CLOSINGS, liveClosings);
            }
          },
          (err) => console.warn('DailyClosings sync warning:', err)
        );

        // 6. Subscribe to Held Bills (cross-terminal bill holding)
        const heldCol = collection(db, 'heldBills');
        unsubHeldBills = onSnapshot(
          heldCol,
          (snapshot) => {
            const liveHeld: HeldBill[] = [];
            snapshot.forEach((docSnap) => {
              liveHeld.push(docSnap.data() as HeldBill);
            });
            setHeldBills(liveHeld);
            localStorage.setItem(STORAGE_KEYS.HELD_BILLS, JSON.stringify(liveHeld));
          },
          (err) => console.warn('HeldBills sync warning:', err)
        );

        // 7. Subscribe to Store Settings
        const settingsDocRef = doc(db, 'settings', 'store_config');
        unsubSettings = onSnapshot(
          settingsDocRef,
          async (snapshot) => {
            if (snapshot.exists()) {
              const liveSettings = snapshot.data() as StoreSettings;
              setSettings(liveSettings);
              localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(liveSettings));
            } else {
              // Seed settings if missing
              try {
                await setDoc(settingsDocRef, INITIAL_SETTINGS);
              } catch (e) {
                console.warn('Seed settings error:', e);
              }
            }
          },
          (err) => console.warn('Settings sync warning:', err)
        );

        // 8. Subscribe to Staff List
        const staffCol = collection(db, 'staff');
        unsubStaff = onSnapshot(
          staffCol,
          async (snapshot) => {
            if (snapshot.empty) {
              // Seed staff list
              try {
                const batch = writeBatch(db);
                INITIAL_STAFF.forEach((s) => {
                  batch.set(doc(db, 'staff', s.id), s);
                });
                await batch.commit();
              } catch (e) {
                console.warn('Seed staff error:', e);
              }
              return;
            }
            const liveStaff: StaffUser[] = [];
            snapshot.forEach((docSnap) => {
              liveStaff.push(docSnap.data() as StaffUser);
            });
            setStaffList(liveStaff);
            localStorage.setItem('pos_staff_list_v2', JSON.stringify(liveStaff));
          },
          (err) => console.warn('Staff sync warning:', err)
        );

        // 9. Subscribe to Activity Logs (recent 100)
        const logsCol = collection(db, 'activityLogs');
        unsubLogs = onSnapshot(
          logsCol,
          (snapshot) => {
            const liveLogs: ActivityLog[] = [];
            snapshot.forEach((docSnap) => {
              liveLogs.push(docSnap.data() as ActivityLog);
            });
            liveLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            if (liveLogs.length > 0) {
              setActivityLogs(liveLogs.slice(0, 100));
            }
          },
          (err) => console.warn('ActivityLogs sync warning:', err)
        );
      } catch (err) {
        console.error('Failed to initialize Firestore sync:', err);
        setSyncStatus('error');
        setSyncError('ไม่สามารถเชื่อมต่อฐานข้อมูลออนไลน์ได้');
      }
    }

    initFirestoreSync();

    return () => {
      unsubProducts();
      unsubTransactions();
      unsubQueues();
      unsubMovements();
      unsubClosings();
      unsubHeldBills();
      unsubSettings();
      unsubStaff();
      unsubLogs();
    };
  }, []);

  // Helper for logging
  const addActivityLog = async (action: string, details: string, beforeState?: string, afterState?: string) => {
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
    setActivityLogs((prev) => [newLog, ...prev.slice(0, 99)]);
    try {
      await setDoc(doc(db, 'activityLogs', newLog.id), newLog);
    } catch {
      // Local fallback
    }
  };

  // Check if today is already closed
  const isTodayClosed = useMemo(() => {
    return dailyClosings.some((dc) => dc.dateStr === todayDateStr && dc.isLocked);
  }, [dailyClosings, todayDateStr]);

  // Current calling queue
  const currentQueueCalling = useMemo(() => {
    return queues.find((q) => q.status === 'calling') || null;
  }, [queues]);

  // Cart operations (client-side till payment)
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
            calculatedDiscount = Math.round(rawTotal * (discountVal / 100) * 100) / 100;
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

  // Hold / Restore Bills (Cloud Synced across all terminals)
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

    // Persist to central Firestore
    setDoc(doc(db, 'heldBills', newHold.id), newHold).catch((err) => {
      console.warn('Hold bill sync warning:', err);
    });

    return true;
  };

  const restoreHeldBill = (heldBillId: string) => {
    const bill = heldBills.find((b) => b.id === heldBillId);
    if (!bill) return;
    setCart(bill.items);
    setOverallDiscount(bill.overallDiscount);
    setHeldBills((prev) => prev.filter((b) => b.id !== heldBillId));
    addActivityLog('ดึงบิลที่พักไว้', `ดึงบิล ${bill.name} กลับมาขายต่อ`);

    // Remove from Firestore
    deleteDoc(doc(db, 'heldBills', heldBillId)).catch((err) => {
      console.warn('Remove held bill error:', err);
    });
  };

  const deleteHeldBill = (heldBillId: string) => {
    const bill = heldBills.find((b) => b.id === heldBillId);
    setHeldBills((prev) => prev.filter((b) => b.id !== heldBillId));
    if (bill) {
      addActivityLog('ยกเลิกบิลพัก', `ลบบิลพัก: ${bill.name}`);
    }
    deleteDoc(doc(db, 'heldBills', heldBillId)).catch((err) => {
      console.warn('Delete held bill error:', err);
    });
  };

  // -------------------------------------------------------------
  // ATOMIC CHECKOUT & STOCK DEDUCTION (Cross-Device Central Stock)
  // -------------------------------------------------------------
  const processCheckout = async (
    paymentMethod: PaymentMethod,
    cashReceived?: number,
    splitDetails?: SplitPaymentDetail,
    customerName?: string
  ): Promise<{ transaction: BillTransaction; queue: QueueItem }> => {
    if (!navigator.onLine || syncStatus === 'offline') {
      throw new Error('ไม่มีการเชื่อมต่ออินเทอร์เน็ต ข้อมูลยังไม่ได้ซิงก์');
    }

    if (cart.length === 0) {
      throw new Error('ไม่มีสินค้าในตะกร้า');
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    // Compute bill and unique queue numbers
    const billCounter = transactions.length + 1001;
    const billNumber = `INV-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${billCounter}`;
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
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

    // Prepare movements
    const newMovements: StockMovement[] = cart.map((item) => {
      const currentProd = products.find((p) => p.id === item.product.id);
      const prevStock = currentProd ? currentProd.stock : item.product.stock;
      return {
        id: `sm-${Date.now()}-${item.product.id}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: now.toISOString(),
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        type: 'sale',
        quantityChange: -item.quantity,
        previousStock: prevStock,
        newStock: Math.max(0, prevStock - item.quantity),
        reason: `ขายบิล ${billNumber}`,
        staffName: currentStaff.name,
      };
    });

    // Create queue record
    const queueItem: QueueItem = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      queueNumber,
      billNumber,
      customerName: customerName || `ลูกค้าคิว ${queueNumber}`,
      status: 'waiting',
      createdAt: now.toISOString(),
    };

    // Execute atomic checkout on Cloud Firestore:
    // 1. Reads all products
    // 2. Verifies stock >= quantity for each item (fails and throws if insufficient)
    // 3. Atomically updates stock for all products
    // 4. Writes transaction, queue, and stock movements in one commit
    setSyncStatus('syncing');
    try {
      await processAtomicCheckoutInFirestore({
        transactionData: transaction,
        queueData: queueItem,
        movementsData: newMovements,
      });
      setSyncStatus('synced');
      setLastSyncedAt(new Date().toLocaleTimeString('th-TH'));
    } catch (err: any) {
      setSyncStatus('error');
      setSyncError(err.message || 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต ข้อมูลยังไม่ได้ซิงก์');
      throw err;
    }

    // Update local state ONLY after Firestore transaction succeeded
    setProducts((prevProducts) =>
      prevProducts.map((prod) => {
        const cartItem = cart.find((ci) => ci.product.id === prod.id);
        if (cartItem) {
          return { ...prod, stock: Math.max(0, prod.stock - cartItem.quantity) };
        }
        return prod;
      })
    );

    if (newMovements.length > 0) {
      setStockMovements((prev) => [...newMovements, ...prev]);
    }

    setQueues((prev) => [queueItem, ...prev]);
    setTransactions((prev) => [transaction, ...prev]);
    clearCart();

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

    // Update Firestore centrally
    (async () => {
      try {
        await updateDoc(doc(db, 'transactions', transactionId), {
          status: 'refunded',
          refundReason: reason,
          refundTimestamp: new Date().toISOString(),
          refundedBy: currentStaff.name,
        });

        for (const item of tx.items) {
          const p = products.find((prod) => prod.id === item.productId);
          if (p) {
            await updateDoc(doc(db, 'products', item.productId), {
              stock: p.stock + item.quantity,
              updatedAt: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }

        for (const mov of refundMovements) {
          await setDoc(doc(db, 'stockMovements', mov.id), mov);
        }
      } catch (err) {
        console.error('Refund Firestore sync error:', err);
      }
    })();

    return true;
  };

  // -------------------------------------------------------------
  // INVENTORY MANAGEMENT (Direct Central Firestore Integration)
  // -------------------------------------------------------------
  const addProduct = (productData: Omit<Product, 'id'>): Product => {
    if (!navigator.onLine) {
      alert('ไม่มีการเชื่อมต่ออินเทอร์เน็ต ข้อมูลยังไม่ได้ซิงก์');
    }

    const newId = `prod-${Date.now()}`;
    const formatted = formatProductForFirestore({
      ...productData,
      id: newId,
    });

    const newProduct: Product = {
      ...productData,
      id: newId,
      name: formatted.name,
      product_name: formatted.product_name,
      sku: formatted.sku,
      barcode: formatted.barcode,
      costPrice: formatted.costPrice,
      cost_price: formatted.cost_price,
      sellingPrice: formatted.sellingPrice,
      selling_price: formatted.selling_price,
      stock: formatted.stock,
      unit: formatted.unit,
      minStock: formatted.minStock,
      min_stock: formatted.min_stock,
      image: formatted.image,
      image_url: formatted.image_url,
      minProfit: formatted.minProfit,
      minimum_profit: formatted.minimum_profit,
      minProfitType: formatted.minProfitType as 'amount' | 'percent',
      createdAt: formatted.createdAt,
      created_at: formatted.created_at,
      updatedAt: formatted.updatedAt,
      updated_at: formatted.updated_at,
    };

    // Optimistic local update
    setProducts((prev) => [newProduct, ...prev]);

    // Initial stock movement
    let initialMovement: StockMovement | null = null;
    if (newProduct.stock > 0) {
      initialMovement = {
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
      setStockMovements((prev) => [initialMovement!, ...prev]);
    }

    addActivityLog('เพิ่มสินค้าใหม่', `เพิ่ม ${newProduct.name} (SKU: ${newProduct.sku}) สต็อก ${newProduct.stock} ${newProduct.unit}`);

    // Central Firestore write
    (async () => {
      try {
        setSyncStatus('syncing');
        await setDoc(doc(db, 'products', newProduct.id), formatted);
        if (initialMovement) {
          await setDoc(doc(db, 'stockMovements', initialMovement.id), initialMovement);
        }
        setSyncStatus('synced');
        setLastSyncedAt(new Date().toLocaleTimeString('th-TH'));
      } catch (err) {
        console.error('Error adding product to Firestore:', err);
        setSyncStatus('error');
        setSyncError('ไม่มีการเชื่อมต่ออินเทอร์เน็ต ข้อมูลยังไม่ได้ซิงก์');
      }
    })();

    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    if (!navigator.onLine) {
      alert('ไม่มีการเชื่อมต่ออินเทอร์เน็ต ข้อมูลยังไม่ได้ซิงก์');
    }

    const target = products.find((p) => p.id === id);
    if (!target) return;

    const merged = { ...target, ...updates, updatedAt: new Date().toISOString(), updated_at: new Date().toISOString() };
    const formatted = formatProductForFirestore(merged);

    // Optimistic local update
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: formatted.updatedAt, updated_at: formatted.updated_at } : p))
    );

    addActivityLog(
      'แก้ไขข้อมูลสินค้า',
      `แก้ไขสินค้า ${target.name}`,
      JSON.stringify({ name: target.name, price: target.sellingPrice, cost: target.costPrice }),
      JSON.stringify(updates)
    );

    // Central Firestore write
    (async () => {
      try {
        setSyncStatus('syncing');
        await updateDoc(doc(db, 'products', id), formatted);
        setSyncStatus('synced');
        setLastSyncedAt(new Date().toLocaleTimeString('th-TH'));
      } catch (err) {
        console.error('Error updating product in Firestore:', err);
        setSyncStatus('error');
        setSyncError('ไม่มีการเชื่อมต่ออินเทอร์เน็ต ข้อมูลยังไม่ได้ซิงก์');
      }
    })();
  };

  const deleteProduct = (id: string) => {
    if (!navigator.onLine) {
      alert('ไม่มีการเชื่อมต่ออินเทอร์เน็ต ข้อมูลยังไม่ได้ซิงก์');
    }

    const target = products.find((p) => p.id === id);
    if (!target) return;

    // Optimistic local update
    setProducts((prev) => prev.filter((p) => p.id !== id));
    addActivityLog('ลบสินค้า', `ลบสินค้า ${target.name} (SKU: ${target.sku})`);

    // Central Firestore write
    (async () => {
      try {
        setSyncStatus('syncing');
        await deleteDoc(doc(db, 'products', id));
        setSyncStatus('synced');
        setLastSyncedAt(new Date().toLocaleTimeString('th-TH'));
      } catch (err) {
        console.error('Error deleting product from Firestore:', err);
        setSyncStatus('error');
        setSyncError('ไม่มีการเชื่อมต่ออินเทอร์เน็ต ข้อมูลยังไม่ได้ซิงก์');
      }
    })();
  };

  const adjustStock = (
    productId: string,
    quantityChange: number,
    type: StockMovementType,
    reason: string
  ) => {
    if (!navigator.onLine) {
      alert('ไม่มีการเชื่อมต่ออินเทอร์เน็ต ข้อมูลยังไม่ได้ซิงก์');
    }

    const target = products.find((p) => p.id === productId);
    if (!target) return;

    const previousStock = target.stock;
    const newStock = Math.max(0, previousStock + quantityChange);
    const now = new Date().toISOString();

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: newStock, updatedAt: now, updated_at: now } : p))
    );

    const movement: StockMovement = {
      id: `sm-adj-${Date.now()}`,
      timestamp: now,
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

    // Central Firestore write
    (async () => {
      try {
        setSyncStatus('syncing');
        await updateDoc(doc(db, 'products', productId), {
          stock: newStock,
          updatedAt: now,
          updated_at: now,
        });
        await setDoc(doc(db, 'stockMovements', movement.id), movement);
        setSyncStatus('synced');
        setLastSyncedAt(new Date().toLocaleTimeString('th-TH'));
      } catch (err) {
        console.error('Error adjusting stock in Firestore:', err);
        setSyncStatus('error');
        setSyncError('ไม่มีการเชื่อมต่ออินเทอร์เน็ต ข้อมูลยังไม่ได้ซิงก์');
      }
    })();
  };

  const importProductsBulk = (newProducts: Product[], mode: 'replace' | 'merge') => {
    (async () => {
      try {
        setSyncStatus('syncing');
        const batch = writeBatch(db);

        if (mode === 'replace') {
          // Fetch existing docs to delete
          const snap = await getDocs(collection(db, 'products'));
          snap.forEach((d) => batch.delete(d.ref));
        }

        newProducts.forEach((p) => {
          const id = p.id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const formatted = formatProductForFirestore({ ...p, id });
          batch.set(doc(db, 'products', id), formatted);
        });

        await batch.commit();
        setSyncStatus('synced');
        addActivityLog(
          'นำเข้าสินค้าสู่ระบบคลาวด์',
          `${mode === 'replace' ? 'แทนที่ทั้งหมด' : 'รวมข้อมูล'} จำนวน ${newProducts.length} รายการ`
        );
      } catch (err) {
        console.error('Bulk import Firestore error:', err);
        setSyncStatus('error');
      }
    })();
  };

  const clearAllProductsToBlank = () => {
    (async () => {
      try {
        setSyncStatus('syncing');
        const batch = writeBatch(db);
        const prodSnap = await getDocs(collection(db, 'products'));
        prodSnap.forEach((d) => batch.delete(d.ref));
        const txSnap = await getDocs(collection(db, 'transactions'));
        txSnap.forEach((d) => batch.delete(d.ref));
        const qSnap = await getDocs(collection(db, 'queues'));
        qSnap.forEach((d) => batch.delete(d.ref));
        const mSnap = await getDocs(collection(db, 'stockMovements'));
        mSnap.forEach((d) => batch.delete(d.ref));
        const cSnap = await getDocs(collection(db, 'dailyClosings'));
        cSnap.forEach((d) => batch.delete(d.ref));
        const hSnap = await getDocs(collection(db, 'heldBills'));
        hSnap.forEach((d) => batch.delete(d.ref));

        await batch.commit();
        setProducts([]);
        setCart([]);
        setHeldBills([]);
        setTransactions([]);
        setQueues([]);
        setStockMovements([]);
        setDailyClosings([]);
        setSyncStatus('synced');
        addActivityLog('ล้างฐานข้อมูลออนไลน์', 'ล้างสต็อกและประวัติทั้งหมดเพื่อเริ่มต้นใช้งานจริงของร้าน โอเค ชัวร์');
      } catch (err) {
        console.error('Clear DB error:', err);
      }
    })();
  };

  const resetProductsToSample = () => {
    (async () => {
      try {
        setSyncStatus('syncing');
        const batch = writeBatch(db);
        SAMPLE_PRODUCTS_DEMO.forEach((p) => {
          batch.set(doc(db, 'products', p.id), formatProductForFirestore(p));
        });
        await batch.commit();
        setSyncStatus('synced');
        addActivityLog('โหลดสินค้าตัวอย่างขึ้นคลาวด์', 'รีเซ็ตรายการสินค้าตัวอย่างสำหรับการทดสอบระบบ');
      } catch (err) {
        console.error('Reset to sample error:', err);
      }
    })();
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

    setDoc(doc(db, 'queues', newQueue.id), newQueue).catch((e) => console.warn('Queue write error:', e));
    return newQueue;
  };

  const callQueue = (queueId: string) => {
    const target = queues.find((q) => q.id === queueId);
    if (!target) return;

    const now = new Date().toISOString();
    setQueues((prev) =>
      prev.map((q) => (q.id === queueId ? { ...q, status: 'calling', calledAt: now } : q))
    );

    announceQueueNumber(target.queueNumber, 'เคาน์เตอร์ 1');
    addActivityLog('เรียกคิว', `เรียกคิวหมายเลข ${target.queueNumber}`);

    updateDoc(doc(db, 'queues', queueId), { status: 'calling', calledAt: now }).catch((e) =>
      console.warn('Call queue error:', e)
    );
  };

  const recallQueue = (queueId: string) => {
    const target = queues.find((q) => q.id === queueId);
    if (!target) return;
    announceQueueNumber(target.queueNumber, 'เคาน์เตอร์ 1');
    addActivityLog('เรียกคิวซ้ำ', `เรียกซ้ำหมายเลขคิว ${target.queueNumber}`);
  };

  const completeQueue = (queueId: string) => {
    const now = new Date().toISOString();
    setQueues((prev) =>
      prev.map((q) => (q.id === queueId ? { ...q, status: 'completed', completedAt: now } : q))
    );
    updateDoc(doc(db, 'queues', queueId), { status: 'completed', completedAt: now }).catch((e) =>
      console.warn('Complete queue error:', e)
    );
  };

  const skipQueue = (queueId: string) => {
    setQueues((prev) =>
      prev.map((q) => (q.id === queueId ? { ...q, status: 'skipped' } : q))
    );
    updateDoc(doc(db, 'queues', queueId), { status: 'skipped' }).catch((e) =>
      console.warn('Skip queue error:', e)
    );
  };

  const cancelQueue = (queueId: string) => {
    setQueues((prev) =>
      prev.map((q) => (q.id === queueId ? { ...q, status: 'cancelled' } : q))
    );
    updateDoc(doc(db, 'queues', queueId), { status: 'cancelled' }).catch((e) =>
      console.warn('Cancel queue error:', e)
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

    setDoc(doc(db, 'dailyClosings', closingRecord.id), closingRecord).catch((e) =>
      console.warn('Closing record write error:', e)
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
      localStorage.setItem(STORAGE_KEYS.STAFF_CURRENT, target.id);
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
    setDoc(doc(db, 'staff', newStaff.id), newStaff).catch((e) => console.warn('Staff write error:', e));
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
    updateDoc(doc(db, 'staff', id), updates).catch((e) => console.warn('Staff update error:', e));
  };

  const deleteStaff = (id: string) => {
    setStaffList((prev) => prev.filter((s) => s.id !== id));
    addActivityLog('ลบพนักงาน', `ลบพนักงาน ID: ${id}`);
    deleteDoc(doc(db, 'staff', id)).catch((e) => console.warn('Staff delete error:', e));
  };

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    addActivityLog('แก้ไขการตั้งค่าร้านค้า', 'ปรับปรุงข้อมูลร้านค้าหรือระบบเงินทอน');
    setDoc(doc(db, 'settings', 'store_config'), updated, { merge: true }).catch((e) =>
      console.warn('Settings write error:', e)
    );
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

        isOnline,
        syncStatus,
        lastSyncedAt,
        syncError,

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
