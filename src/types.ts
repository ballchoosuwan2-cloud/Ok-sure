export type UserRole = 'admin' | 'manager' | 'cashier';

export interface StaffUser {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  avatar: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  product_name?: string;
  category: string;
  costPrice: number;
  cost_price?: number;
  sellingPrice: number;
  selling_price?: number;
  stock: number;
  unit: string;
  minStock: number;
  min_stock?: number;
  image?: string;
  image_url?: string;
  description?: string;
  minProfit?: number;
  minimum_profit?: number;
  minProfitType?: 'amount' | 'percent';
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // in Baht
  discountPercent?: number; // optional %
  subtotal: number;
}

export type PaymentMethod = 'cash' | 'promptpay' | 'card' | 'split';

export interface SplitPaymentDetail {
  cash: number;
  promptpay: number;
  card: number;
}

export interface BillTransaction {
  id: string;
  billNumber: string;
  queueNumber: string;
  timestamp: string; // ISO
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm:ss
  items: {
    productId: string;
    productName: string;
    sku: string;
    barcode: string;
    quantity: number;
    unit: string;
    costPrice: number;
    sellingPrice: number;
    discount: number;
    subtotal: number;
  }[];
  subtotal: number;
  billDiscount: number;
  tax: number;
  grandTotal: number;
  totalCost: number;
  grossProfit: number;
  paymentMethod: PaymentMethod;
  splitDetails?: SplitPaymentDetail;
  cashReceived?: number;
  changeGiven?: number;
  cashierId: string;
  cashierName: string;
  status: 'completed' | 'refunded' | 'held';
  refundReason?: string;
  refundTimestamp?: string;
  refundedBy?: string;
}

export type QueueTicket = QueueItem;

export interface QueueItem {
  id: string;
  queueNumber: string;
  billNumber?: string;
  customerName?: string;
  status: 'waiting' | 'calling' | 'completed' | 'skipped' | 'cancelled';
  createdAt: string;
  calledAt?: string;
  completedAt?: string;
  time?: string;
  totalAmount?: number;
}

export type StockMovementType = 'sale' | 'restock' | 'adjustment' | 'refund';

export interface StockMovement {
  id: string;
  timestamp: string;
  productId: string;
  productName: string;
  sku: string;
  type: StockMovementType;
  quantityChange: number; // e.g. -2 for sale, +50 for restock
  previousStock: number;
  newStock: number;
  reason: string;
  staffName: string;
}

export interface DailyClosingRecord {
  id: string;
  dateStr: string; // YYYY-MM-DD
  closedAt: string;
  staffId: string;
  staffName: string;
  closedBy?: string;
  totalSales: number;
  totalBills: number;
  totalItemsSold: number;
  cashSales: number;
  promptpaySales: number;
  cardSales: number;
  totalCash?: number;
  totalPromptPay?: number;
  totalCard?: number;
  totalDiscount: number;
  totalRefunds: number;
  totalCost: number;
  grossProfit: number;
  startingCash: number;
  openingCash?: number;
  expectedCash: number;
  expectedCashInDrawer?: number;
  actualCash: number;
  actualCashCounted?: number;
  cashDifference: number; // actual - expected (positive = surplus, negative = shortage)
  notes: string;
  isLocked: boolean;
  timestamp?: string;
}

export type DailyClosing = DailyClosingRecord;

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  staffName?: string;
  action: string;
  details: string;
  beforeState?: string;
  afterState?: string;
}

export interface StoreSettings {
  storeName: string;
  storeBranch: string;
  storeAddress: string;
  storePhone: string;
  taxId: string;
  promptPayId: string; // Phone or Tax ID for PromptPay
  receiptFooterMessage: string;
  startingCashDrawer: number;
  vatRate: number; // e.g. 7% (can be 0 if VAT inclusive or exempt)
}
