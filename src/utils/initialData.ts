import { Product, StaffUser, StoreSettings, BillTransaction, QueueItem, StockMovement, DailyClosingRecord } from '../types';

export const INITIAL_STAFF: StaffUser[] = [
  {
    id: 'staff-admin',
    name: 'สมชาย ผู้ดูแลระบบ (Admin)',
    role: 'admin',
    pin: '1234',
    avatar: '👨‍💼',
  },
  {
    id: 'staff-manager',
    name: 'วิภาวรรณ ผู้จัดการ (Manager)',
    role: 'manager',
    pin: '5678',
    avatar: '👩‍💼',
  },
  {
    id: 'staff-cashier',
    name: 'กิตติศักดิ์ พนักงานขาย (Cashier)',
    role: 'cashier',
    pin: '0000',
    avatar: '🧑‍💻',
  },
];

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'โอเค ชัวร์',
  storeBranch: 'อยู่ตรงข้ามแว่นท็อปเจริญ',
  storeAddress: 'ตรงข้ามแว่นท็อปเจริญ (ร้านเดียวครบ จบที่... โอเค ชัวร์)',
  storePhone: '092-6964999, 099-6857199',
  taxId: '0105556012345',
  promptPayId: '0926964999',
  receiptFooterMessage: 'ร้านเดียวครบ จบที่... โอเค ชัวร์ ขอบคุณที่อุดหนุนค่ะ',
  startingCashDrawer: 3000,
  vatRate: 7,
};

export const SAMPLE_PRODUCTS_DEMO: Product[] = [
  {
    id: 'prod-001',
    sku: 'W001',
    barcode: '885012340001',
    name: 'น้ำดื่มสิงห์ 600 มล.',
    category: 'เครื่องดื่ม',
    costPrice: 5,
    sellingPrice: 10,
    stock: 3, // 🔴 alert low stock (< minStock)
    unit: 'ขวด',
    minStock: 12,
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=300&q=80',
    description: 'น้ำดื่มสะอาดบริสุทธิ์ ตราสิงห์',
  },
  {
    id: 'prod-002',
    sku: 'D002',
    barcode: '885012340002',
    name: 'นมสดเมจิ รสจืด 200 มล.',
    category: 'เครื่องดื่ม',
    costPrice: 9.5,
    sellingPrice: 14,
    stock: 8, // 🟠 alert warning
    unit: 'กล่อง',
    minStock: 10,
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&q=80',
    description: 'นมโคแท้ 100% พาสเจอร์ไรส์',
  },
  {
    id: 'prod-003',
    sku: 'T003',
    barcode: '885012340003',
    name: 'ชาเขียวโออิชิ รสน้ำผึ้งมะนาว 350 มล.',
    category: 'เครื่องดื่ม',
    costPrice: 14,
    sellingPrice: 20,
    stock: 45, // 🟢 plenty
    unit: 'ขวด',
    minStock: 15,
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300&q=80',
    description: 'ชาเขียวสกัดธรรมชาติ รสเปรี้ยวหวานสดชื่น',
  },
  {
    id: 'prod-004',
    sku: 'N004',
    barcode: '885012340004',
    name: 'มาม่า บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้ง',
    category: 'บะหมี่และอาหารสำเร็จรูป',
    costPrice: 5.25,
    sellingPrice: 7,
    stock: 60,
    unit: 'ซอง',
    minStock: 20,
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=300&q=80',
    description: 'รสชาติแซ่บเข้มข้นถึงรสต้มยำกุ้ง',
  },
  {
    id: 'prod-005',
    sku: 'B005',
    barcode: '885012340005',
    name: 'ขนมปังฟาร์มเฮ้าส์ โฮลวีท 250 กรัม',
    category: 'เบเกอรี่',
    costPrice: 18,
    sellingPrice: 24,
    stock: 14,
    unit: 'แถว',
    minStock: 8,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&q=80',
    description: 'ขนมปังโฮลวีท อุดมด้วยใยอาหาร',
  },
  {
    id: 'prod-006',
    sku: 'S006',
    barcode: '885012340006',
    name: 'มันฝรั่งทอดกรอบ เลย์ คลาสสิก 48 กรัม',
    category: 'ขนมและของว่าง',
    costPrice: 15,
    sellingPrice: 20,
    stock: 35,
    unit: 'ซอง',
    minStock: 12,
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&q=80',
    description: 'มันฝรั่งแท้ทอดกรอบ รสเกลือธรรมชาติ',
  },
  {
    id: 'prod-007',
    sku: 'C007',
    barcode: '885012340007',
    name: 'กาแฟกระป๋อง เบอร์ดี้ โรบัสต้า 180 มล.',
    category: 'เครื่องดื่ม',
    costPrice: 12.5,
    sellingPrice: 17,
    stock: 28,
    unit: 'กระป๋อง',
    minStock: 10,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&q=80',
    description: 'เข้มข้น กลมกล่อม ตื่นเต็มตา',
  },
  {
    id: 'prod-008',
    sku: 'H008',
    barcode: '885012340008',
    name: 'สบู่โพรเทคส์ ไอซ์ซี่ คูล 65 กรัม',
    category: 'ของใช้ประจำวัน',
    costPrice: 10,
    sellingPrice: 15,
    stock: 0, // Out of stock
    unit: 'ก้อน',
    minStock: 6,
    image: 'https://images.unsplash.com/photo-1607006314181-e274b706d888?w=300&q=80',
    description: 'สบู่ก้อนปกป้องแบคทีเรีย เย็นสดชื่น',
  },
  {
    id: 'prod-009',
    sku: 'R009',
    barcode: '885012340009',
    name: 'ข้าวหอมมะลิแท้ ตราฉัตร 1 กก.',
    category: 'ของใช้ประจำวัน',
    costPrice: 42,
    sellingPrice: 55,
    stock: 22,
    unit: 'ถุง',
    minStock: 10,
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&q=80',
    description: 'ข้าวหอมมะลิใหม่ต้นฤดู นุ่ม หอม อร่อย',
  },
];

// ฐานข้อมูลเริ่มต้นสำหรับร้านค้าจริง "โอเค ชัวร์": เริ่มต้นด้วย 0 รายการเพื่อพร้อมบันทึกสินค้าจริง
export const INITIAL_PRODUCTS: Product[] = [];

// ฟังก์ชันสร้างประวัติเริ่มต้น (คืนค่าเป็นรายการว่าง 0 บิล สำหรับเปิดร้านจริง)
export function generateInitialTransactions(): BillTransaction[] {
  return [];
}

export const INITIAL_QUEUES: QueueItem[] = [];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [];

export const INITIAL_DAILY_CLOSINGS: DailyClosingRecord[] = [];
