import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  writeBatch,
  getDocs,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, Auth, User } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';
import { Product, BillTransaction, QueueItem, StockMovement } from './types';

// 1. Initialize Firebase App (Singleton)
// Supports Vercel environment variables or fallback to firebase-applet-config.json
const resolvedFirebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || firebaseConfig.apiKey,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || firebaseConfig.authDomain,
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || firebaseConfig.projectId,
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || firebaseConfig.storageBucket,
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || firebaseConfig.messagingSenderId,
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || firebaseConfig.appId,
};

export const app: FirebaseApp = getApps().length === 0 ? initializeApp(resolvedFirebaseConfig) : getApp();

// 2. Initialize Firebase Services with provisioned Firestore database
const targetDatabaseId =
  (import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) ||
  firebaseConfig.firestoreDatabaseId ||
  '(default)';

export const db: Firestore =
  targetDatabaseId && targetDatabaseId !== '(default)'
    ? getFirestore(app, targetDatabaseId)
    : getFirestore(app);

export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);

// 3. Ensure Authentication (Anonymous terminal session)
let authInitialized = false;
export async function ensureTerminalAuth(): Promise<User | null> {
  return new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      } else if (!authInitialized) {
        authInitialized = true;
        try {
          const cred = await signInAnonymously(auth);
          unsubscribe();
          resolve(cred.user);
        } catch (err) {
          console.warn('Anonymous auth sign-in warning:', err);
          unsubscribe();
          resolve(null);
        }
      }
    });
  });
}

// 4. Test Firestore Connection per Firebase Skill guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await ensureTerminalAuth();
    await getDocFromServer(doc(db, 'settings', 'connection_test'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore connection: Client is offline. Cached or local state will be used until reconnected.');
      return false;
    }
    // Expected if document doesn't exist, but server responded
    return true;
  }
}

// 5. Image Upload to Firebase Storage
export async function uploadProductImage(file: Blob | File, filenamePrefix: string = 'prod'): Promise<string> {
  try {
    await ensureTerminalAuth();
    const timestamp = Date.now();
    const cleanPrefix = filenamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
    const storageRef = ref(storage, `products/${cleanPrefix}_${timestamp}.jpg`);
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: 'image/jpeg',
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.warn('Failed to upload image to Firebase Storage, falling back to data URL or existing image:', error);
    throw error;
  }
}

// 6. Helper to format product data for Firestore
export function formatProductForFirestore(p: Partial<Product> & { id: string }) {
  const now = new Date().toISOString();
  return {
    id: p.id,
    name: p.name || p.product_name || '',
    product_name: p.name || p.product_name || '',
    category: p.category || 'ทั่วไป',
    sku: p.sku || p.barcode || p.id,
    barcode: p.barcode || '',
    costPrice: Number(p.costPrice ?? p.cost_price ?? 0),
    cost_price: Number(p.costPrice ?? p.cost_price ?? 0),
    sellingPrice: Number(p.sellingPrice ?? p.selling_price ?? 0),
    selling_price: Number(p.sellingPrice ?? p.selling_price ?? 0),
    stock: Number(p.stock ?? 0),
    unit: p.unit || 'ชิ้น',
    minStock: Number(p.minStock ?? p.min_stock ?? 0),
    min_stock: Number(p.minStock ?? p.min_stock ?? 0),
    image: p.image || p.image_url || '',
    image_url: p.image || p.image_url || '',
    minProfit: Number(p.minProfit ?? p.minimum_profit ?? 0),
    minimum_profit: Number(p.minProfit ?? p.minimum_profit ?? 0),
    minProfitType: p.minProfitType || 'amount',
    createdAt: p.createdAt || p.created_at || now,
    created_at: p.createdAt || p.created_at || now,
    updatedAt: now,
    updated_at: now,
  };
}

// 7. Atomic stock deduction with strict validation
export async function deductProductStockInFirestore(productId: string, quantity: number): Promise<number> {
  const productRef = doc(db, 'products', productId);
  return await runTransaction(db, async (transaction) => {
    const productDoc = await transaction.get(productRef);
    if (!productDoc.exists()) {
      throw new Error(`ไม่พบสินค้ารหัส ${productId} ในระบบ`);
    }
    const currentStock = Number(productDoc.data().stock ?? 0);
    if (currentStock < quantity) {
      throw new Error(
        `สต็อกสินค้า "${productDoc.data().name || productId}" ไม่เพียงพอ (คงเหลือ ${currentStock} ชิ้น ต้องการตัด ${quantity} ชิ้น)`
      );
    }
    const newStock = currentStock - quantity;
    transaction.update(productRef, {
      stock: newStock,
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return newStock;
  });
}

// 8. Atomic Checkout Transaction (All-or-Nothing Cloud Sync)
// Reads all products first, verifies stock availability, updates stocks atomically,
// and writes transaction, queue, and stock movement logs in one commit.
export async function processAtomicCheckoutInFirestore({
  transactionData,
  queueData,
  movementsData,
}: {
  transactionData: BillTransaction;
  queueData: QueueItem;
  movementsData: StockMovement[];
}): Promise<void> {
  await ensureTerminalAuth();

  await runTransaction(db, async (t) => {
    // 1. Read all product docs first (Firestore requires all reads before any writes)
    const productUpdates: { ref: ReturnType<typeof doc>; newStock: number; name: string }[] = [];

    for (const item of transactionData.items) {
      const pRef = doc(db, 'products', item.productId);
      const pDoc = await t.get(pRef);
      if (!pDoc.exists()) {
        throw new Error(`ไม่พบข้อมูลสินค้า "${item.productName}" (ID: ${item.productId}) ในฐานข้อมูลกลาง`);
      }
      const currentStock = Number(pDoc.data().stock ?? 0);
      if (currentStock < item.quantity) {
        throw new Error(
          `สต็อกสินค้า "${item.productName}" ไม่เพียงพอ (คงเหลือ ${currentStock} ${item.unit} แต่ในรายการขายต้องการ ${item.quantity} ${item.unit}) กรุณาตรวจสอบสต็อกก่อนทำรายการ`
        );
      }
      productUpdates.push({
        ref: pRef,
        newStock: currentStock - item.quantity,
        name: item.productName,
      });
    }

    // 2. Perform all atomic writes
    const nowIso = new Date().toISOString();

    // Deduct stock for each product
    for (const update of productUpdates) {
      t.update(update.ref, {
        stock: update.newStock,
        updatedAt: nowIso,
        updated_at: nowIso,
      });
    }

    // Record Transaction
    const txRef = doc(db, 'transactions', transactionData.id);
    t.set(txRef, transactionData);

    // Record Queue
    const qRef = doc(db, 'queues', queueData.id);
    t.set(qRef, queueData);

    // Record Stock Movements
    for (const sm of movementsData) {
      const smRef = doc(db, 'stockMovements', sm.id);
      t.set(smRef, sm);
    }
  });
}

