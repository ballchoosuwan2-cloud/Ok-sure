import localforage from 'localforage';

// กำหนดค่าเริ่มต้นให้ localForage ใช้ IndexedDB ภายใต้ชื่อฐานข้อมูลของร้าน "โอเค ชัวร์"
localforage.config({
  driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
  name: 'OK_Sure_POS_DB',
  storeName: 'pos_secure_storage',
  description: 'ฐานข้อมูลระบบขายหน้าร้านและคิวอัจฉริยะ ร้าน โอเค ชัวร์ (ตรงข้ามแว่นท็อปเจริญ)',
});

export const STORAGE_KEYS = {
  PRODUCTS: 'pos_products_v2',
  TRANSACTIONS: 'pos_transactions_v2',
  QUEUES: 'pos_queues_v2',
  MOVEMENTS: 'pos_movements_v2',
  CLOSINGS: 'pos_closings_v2',
  SETTINGS: 'pos_settings_v2',
  HELD_BILLS: 'pos_held_bills_v2',
  STAFF_LIST: 'pos_staff_list_v2',
  ACTIVITY_LOGS: 'pos_activity_logs_v2',
  CURRENT_STAFF: 'pos_current_staff_v2',
  REAL_CLEAN_FLAG: 'ok_sure_real_clean_v1',
};

// บันทึกข้อมูลลง IndexedDB
export async function saveSecureData(key: string, data: any): Promise<void> {
  try {
    await localforage.setItem(key, data);
  } catch (err) {
    console.error('Storage save error:', err);
  }
}

// ดึงข้อมูลจาก IndexedDB
export async function getSecureData(key: string): Promise<any> {
  try {
    return await localforage.getItem(key);
  } catch (err) {
    console.error('Storage get error:', err);
    return null;
  }
}

// ตรวจสอบสถานะความพร้อมของแหล่งเก็บข้อมูล (Storage Verification)
export async function verifyStorageHealth(): Promise<{
  isIndexedDB: boolean;
  driver: string;
  dbName: string;
  itemCount: number;
  keys: string[];
  storageEstimate?: { usage: number; quota: number };
}> {
  try {
    const driver = localforage.driver();
    const isIndexedDB = driver === localforage.INDEXEDDB;
    const keys = await localforage.keys();
    let storageEstimate;
    if (navigator.storage && navigator.storage.estimate) {
      storageEstimate = await navigator.storage.estimate();
    }
    return {
      isIndexedDB,
      driver,
      dbName: 'OK_Sure_POS_DB',
      itemCount: keys.length,
      keys,
      storageEstimate: storageEstimate
        ? {
            usage: storageEstimate.usage || 0,
            quota: storageEstimate.quota || 0,
          }
        : undefined,
    };
  } catch (e) {
    return {
      isIndexedDB: false,
      driver: 'unknown',
      dbName: 'OK_Sure_POS_DB',
      itemCount: 0,
      keys: [],
    };
  }
}

// ล้างข้อมูลตัวอย่างทั้งหมดออก เพื่อเตรียมเปิดร้านจริง 100%
export async function clearAllMockDataForRealStore(): Promise<void> {
  const keysToClear = [
    STORAGE_KEYS.PRODUCTS,
    STORAGE_KEYS.TRANSACTIONS,
    STORAGE_KEYS.QUEUES,
    STORAGE_KEYS.MOVEMENTS,
    STORAGE_KEYS.CLOSINGS,
    STORAGE_KEYS.HELD_BILLS,
    STORAGE_KEYS.ACTIVITY_LOGS,
  ];

  for (const k of keysToClear) {
    localStorage.setItem(k, JSON.stringify([]));
    await localforage.setItem(k, []);
  }

  localStorage.setItem(STORAGE_KEYS.REAL_CLEAN_FLAG, 'true');
}

// ฟังก์ชันสำรองข้อมูลทั้งหมดออกมาเป็นไฟล์ JSON ป้องกันข้อมูลหาย
export async function exportSystemBackup(): Promise<void> {
  try {
    const keys = await localforage.keys();
    const backupObj: Record<string, any> = {};

    // First collect all keys from localForage
    for (const key of keys) {
      backupObj[key] = await localforage.getItem(key);
    }

    // Also ensure all key POS storage items from localStorage are captured if any weren't yet in localForage
    const posKeys = Object.values(STORAGE_KEYS);

    for (const pk of posKeys) {
      if (!backupObj[pk]) {
        const item = localStorage.getItem(pk);
        if (item) {
          try {
            backupObj[pk] = JSON.parse(item);
          } catch {
            backupObj[pk] = item;
          }
        }
      }
    }

    const dataStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `OK_SURE_POS_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Backup export error:', err);
    alert('ไม่สามารถสำรองข้อมูลได้');
  }
}

// ฟังก์ชันกู้คืนข้อมูล (Restore) จากไฟล์ JSON
export async function importSystemBackup(file: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const backupData = JSON.parse(content);

        for (const [key, value] of Object.entries(backupData)) {
          // Save to IndexedDB
          await localforage.setItem(key, value);

          // Also mirror to localStorage for instant hydration
          if (typeof value === 'object') {
            localStorage.setItem(key, JSON.stringify(value));
          } else {
            localStorage.setItem(key, String(value));
          }
        }
        resolve(true);
      } catch (err) {
        console.error('Import parse error:', err);
        reject(false);
      }
    };
    reader.onerror = () => reject(false);
    reader.readAsText(file);
  });
}

