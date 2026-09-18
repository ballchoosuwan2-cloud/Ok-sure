import localforage from 'localforage';

// 1. กำหนดค่าข้อมูลร้านค้าจริงจากป้ายร้าน "โอเค ชัวร์"
export const STORE_INFO = {
  name: 'โอเค ชัวร์',
  slogan: 'ร้านเดียวครบ จบที่...',
  subSlogan: 'จำหน่ายสินค้าเบ็ดเตล็ด แฟชั่นตามกระแส',
  location: 'อยู่ตรงข้ามแว่นท็อปเจริญ',
  address: 'ตรงข้ามแว่นท็อปเจริญ',
  categories: [
    'กิ๊ฟช็อป',
    'เครื่องสำอาง',
    'เครื่องเขียน',
    'เครื่องครัว',
    'เครื่องมือช่าง',
    'ของเล่น',
    'กระเป๋า',
    'นาฬิกา',
    'รองเท้า',
    'สินค้าเบ็ดเตล็ด',
  ],
  phones: ['092-6964999', '099-6857199'],
  facebook: 'โอเค ชัวร์',
  receiptFooter: 'ขอบคุณที่อุดหนุน โอเค ชัวร์ โทร. 092-6964999, 099-6857199',
};

// 2. ตั้งค่าการเชื่อมต่อ IndexedDB สำหรับเก็บข้อมูลแบบถาวร ไม่สูญหาย
localforage.config({
  driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
  name: 'OK_Sure_POS_DB',
  storeName: 'pos_secure_storage',
});

// 3. ฟังก์ชันล้างข้อมูลสมมุติและเตรียมฐานข้อมูลให้พร้อมใช้งานจริง
export async function initializeRealStoreDatabase(forceClear: boolean = false) {
  try {
    const existingProducts = await localforage.getItem('pos_products_v2');

    // หากยังไม่มีข้อมูล หรือผู้ใช้กดล้างข้อมูลเก่าที่เป็นตัวอย่างทิ้ง
    if (!existingProducts || forceClear) {
      await localforage.setItem('pos_products_v2', []); // สต็อกสินค้าจริงว่างเปล่า (0 รายการ)
      await localforage.setItem('pos_transactions_v2', []); // ประวัติการขายว่างเปล่า
      await localforage.setItem('pos_queues_v2', []); // คิวว่างเปล่า
      await localforage.setItem('pos_movements_v2', []); // สต็อกเคลื่อนไหวว่างเปล่า
      await localforage.setItem('pos_closings_v2', []); // ประวัติปิดกะว่างเปล่า
      await localforage.setItem('pos_held_bills_v2', []); // บิลพักว่างเปล่า

      // อัปเดต localStorage ด้วย
      localStorage.setItem('pos_products_v2', JSON.stringify([]));
      localStorage.setItem('pos_transactions_v2', JSON.stringify([]));
      localStorage.setItem('pos_queues_v2', JSON.stringify([]));
      localStorage.setItem('pos_movements_v2', JSON.stringify([]));
      localStorage.setItem('pos_closings_v2', JSON.stringify([]));
      localStorage.setItem('pos_held_bills_v2', JSON.stringify([]));

      console.log('Initialised Real Store Database for: โอเค ชัวร์ successfully.');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// ฟังก์ชันบันทึกข้อมูลทั่วไปลงฐานข้อมูลปลอดภัย
export async function savePOSData(key: string, data: any) {
  try {
    await localforage.setItem(key, data);
  } catch (err) {
    console.error(`Failed to save ${key}:`, err);
  }
}

// ฟังก์ชันเรียกดูข้อมูลจากฐานข้อมูลปลอดภัย
export async function loadPOSData(key: string) {
  try {
    return await localforage.getItem(key);
  } catch (err) {
    console.error(`Failed to load ${key}:`, err);
    return null;
  }
}
