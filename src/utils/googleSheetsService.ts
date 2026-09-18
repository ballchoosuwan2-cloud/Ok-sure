import { Product, BillTransaction, DailyClosing } from '../types';

export interface SpreadsheetInfo {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface SheetMetadata {
  sheetId: number;
  title: string;
  index: number;
}

/**
 * List spreadsheets from user's Google Drive
 */
export const listUserSpreadsheets = async (accessToken: string): Promise<SpreadsheetInfo[]> => {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=20`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `เกิดข้อผิดพลาดในการดึงรายการ Google Sheets (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
};

/**
 * Get spreadsheet details including all sheet/tab names
 */
export const getSpreadsheetDetails = async (
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; sheets: SheetMetadata[]; webViewLink?: string }> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `ไม่สามารถเข้าถึง Google Spreadsheet ID: ${spreadsheetId}`);
  }

  const data = await res.json();
  const sheets: SheetMetadata[] = (data.sheets || []).map((s: any) => ({
    sheetId: s.properties.sheetId,
    title: s.properties.title,
    index: s.properties.index,
  }));

  return {
    title: data.properties.title,
    sheets,
    webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
};

/**
 * Create a new Google Spreadsheet for store POS & Inventory
 */
export const createStoreSpreadsheet = async (
  accessToken: string,
  storeName: string
): Promise<{ spreadsheetId: string; url: string }> => {
  const nowStr = new Date().toLocaleDateString('th-TH');
  const title = `[โอเค ชัวร์] ฐานข้อมูลสต็อก & ยอดขาย (${storeName}) - ${nowStr}`;

  const requestBody = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'สินค้าและสต็อก',
          gridProperties: { rowCount: 200, columnCount: 12 },
        },
      },
      {
        properties: {
          title: 'ประวัติการขาย',
          gridProperties: { rowCount: 500, columnCount: 14 },
        },
      },
      {
        properties: {
          title: 'สรุปการปิดกะ',
          gridProperties: { rowCount: 100, columnCount: 10 },
        },
      },
    ],
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'ไม่สามารถสร้าง Google Spreadsheet ใหม่ได้');
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const url = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return { spreadsheetId, url };
};

/**
 * Ensure a specific sheet/tab exists in the spreadsheet, or create it
 */
export const ensureSheetExists = async (
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string
): Promise<void> => {
  const details = await getSpreadsheetDetails(accessToken, spreadsheetId);
  const exists = details.sheets.some((s) => s.title === sheetTitle);

  if (!exists) {
    const addSheetBody = {
      requests: [
        {
          addSheet: {
            properties: {
              title: sheetTitle,
            },
          },
        },
      ],
    };

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(addSheetBody),
    });
  }
};

/**
 * Export products / inventory to Google Sheets
 */
export const exportInventoryToSheets = async (
  accessToken: string,
  spreadsheetId: string,
  products: Product[],
  sheetTitle: string = 'สินค้าและสต็อก'
): Promise<{ rowsUpdated: number }> => {
  await ensureSheetExists(accessToken, spreadsheetId, sheetTitle);

  const headers = [
    'รหัสสินค้า (SKU)',
    'บาร์โค้ด (Barcode)',
    'ชื่อสินค้า (Product Name)',
    'หมวดหมู่ (Category)',
    'ราคาทุน (Cost)',
    'ราคาขาย (Selling Price)',
    'กำไร/ชิ้น (Profit)',
    'คงเหลือในคลัง (Stock)',
    'หน่วยนับ (Unit)',
    'สต็อกขั้นต่ำ (Min Stock)',
    'อัปเดตล่าสุด',
  ];

  const rows = products.map((p) => {
    const profit = Math.max(0, p.sellingPrice - p.costPrice);
    return [
      p.sku || '',
      p.barcode || '',
      p.name || '',
      p.category || 'ทั่วไป',
      p.costPrice || 0,
      p.sellingPrice || 0,
      profit,
      p.stock || 0,
      p.unit || 'ชิ้น',
      p.minStock || 0,
      p.updatedAt ? new Date(p.updatedAt).toLocaleString('th-TH') : new Date().toLocaleString('th-TH'),
    ];
  });

  const values = [headers, ...rows];

  // Clear existing values in this sheet first to avoid ghost rows
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(
      sheetTitle
    )}'!A1:Z1000:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  // Write new data
  const range = `'${encodeURIComponent(sheetTitle)}'!A1`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'เกิดข้อผิดพลาดในการเขียนข้อมูลลง Google Sheets');
  }

  return { rowsUpdated: rows.length };
};

/**
 * Export sales transactions to Google Sheets
 */
export const exportSalesToSheets = async (
  accessToken: string,
  spreadsheetId: string,
  orders: BillTransaction[],
  sheetTitle: string = 'ประวัติการขาย'
): Promise<{ rowsUpdated: number }> => {
  await ensureSheetExists(accessToken, spreadsheetId, sheetTitle);

  const headers = [
    'เลขที่บิล (Bill Number)',
    'วัน-เวลา (Date Time)',
    'หมายเลขคิว (Queue)',
    'พนักงานขาย (Cashier)',
    'ยอดรวมสินค้า (Subtotal)',
    'ส่วนลดท้ายบิล (Discount)',
    'ยอดชำระสุทธิ (Grand Total)',
    'กำไรขั้นต้น (Gross Profit)',
    'วิธีชำระเงิน (Payment)',
    'เงินสดที่รับ (Cash In)',
    'เงินทอน (Change)',
    'สถานะบิล (Status)',
    'รายการสินค้าที่สั่งซื้อ (Items Summary)',
  ];

  const rows = orders.map((o) => {
    const itemsSummary = o.items.map((i) => `${i.productName} x${i.quantity}`).join(', ');
    const paymentLabel =
      o.paymentMethod === 'cash'
        ? 'เงินสด'
        : o.paymentMethod === 'promptpay'
        ? 'พร้อมเพย์ QR'
        : o.paymentMethod === 'card'
        ? 'บัตรเครดิต'
        : 'แยกชำระ';

    return [
      o.billNumber,
      `${o.dateStr} ${o.timeStr}`,
      o.queueNumber || '-',
      o.cashierName,
      o.subtotal,
      o.billDiscount,
      o.grandTotal,
      o.grossProfit,
      paymentLabel,
      o.cashReceived ?? '-',
      o.changeGiven ?? '-',
      o.status === 'completed' ? 'สำเร็จ' : o.status === 'refunded' ? 'ยกเลิก/คืนเงิน' : 'พักบิล',
      itemsSummary,
    ];
  });

  const values = [headers, ...rows];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(
      sheetTitle
    )}'!A1:Z2000:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const range = `'${encodeURIComponent(sheetTitle)}'!A1`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'เกิดข้อผิดพลาดในการบันทึกประวัติการขาย');
  }

  return { rowsUpdated: rows.length };
};

/**
 * Export daily closings to Google Sheets
 */
export const exportClosingsToSheets = async (
  accessToken: string,
  spreadsheetId: string,
  closings: DailyClosing[],
  sheetTitle: string = 'สรุปการปิดกะ'
): Promise<{ rowsUpdated: number }> => {
  await ensureSheetExists(accessToken, spreadsheetId, sheetTitle);

  const headers = [
    'วันที่ปิดยอด (Date)',
    'เวลาที่บันทึก (Time)',
    'พนักงานผู้ปิดยอด (Staff)',
    'ยอดขายรวมทั้งสิ้น (Total Sales)',
    'ยอดเงินสดขายได้ (Cash Sales)',
    'ยอดพร้อมเพย์ (PromptPay)',
    'ยอดบัตรเครดิต (Card)',
    'เงินทอนเปิดร้าน (Opening Cash)',
    'เงินสดที่ควรมีในลิ้นชัก (Expected)',
    'เงินสดนับได้จริง (Actual Counted)',
    'ส่วนต่างเงินสด (Difference)',
    'หมายเหตุ (Notes)',
  ];

  const rows = closings.map((c) => [
    c.dateStr,
    new Date(c.timestamp).toLocaleTimeString('th-TH'),
    c.staffName,
    c.totalSales,
    c.totalCash,
    c.totalPromptPay,
    c.totalCard,
    c.openingCash,
    c.expectedCashInDrawer,
    c.actualCashCounted,
    c.cashDifference,
    c.notes || '',
  ]);

  const values = [headers, ...rows];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(
      sheetTitle
    )}'!A1:Z1000:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const range = `'${encodeURIComponent(sheetTitle)}'!A1`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลสรุปการปิดกะ');
  }

  return { rowsUpdated: rows.length };
};

/**
 * Import products from a Google Sheet tab
 */
export const importInventoryFromSheets = async (
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string
): Promise<{ products: Product[]; skipped: number }> => {
  const range = `'${encodeURIComponent(sheetTitle)}'!A1:Z500`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'ไม่สามารถอ่านข้อมูลจาก Google Sheets ได้');
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  if (rows.length <= 1) {
    return { products: [], skipped: 0 };
  }

  // Parse header row
  const headerRow = rows[0].map((h) => String(h).trim().toLowerCase());

  const findCol = (keywords: string[]): number => {
    return headerRow.findIndex((h) => keywords.some((kw) => h.includes(kw.toLowerCase())));
  };

  const skuCol = findCol(['sku', 'รหัสสินค้า', 'รหัส']);
  const barcodeCol = findCol(['barcode', 'บาร์โค้ด']);
  const nameCol = findCol(['name', 'ชื่อสินค้า', 'ชื่อ', 'รายการ']);
  const categoryCol = findCol(['category', 'หมวดหมู่', 'หมวด', 'ประเภท']);
  const costCol = findCol(['cost', 'ราคาทุน', 'ต้นทุน', 'ทุน']);
  const priceCol = findCol(['price', 'ราคาขาย', 'ราคา']);
  const stockCol = findCol(['stock', 'คงเหลือ', 'จำนวน', 'สต็อก', 'สตอก']);
  const unitCol = findCol(['unit', 'หน่วยนับ', 'หน่วย']);
  const minStockCol = findCol(['min', 'ขั้นต่ำ']);

  const parsedProducts: Product[] = [];
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) {
      skipped++;
      continue;
    }

    const name = nameCol !== -1 ? String(row[nameCol] || '').trim() : '';
    if (!name) {
      skipped++;
      continue;
    }

    const barcode =
      barcodeCol !== -1 && row[barcodeCol]
        ? String(row[barcodeCol]).trim()
        : 'OK' + Math.floor(100000 + Math.random() * 900000);

    const sku =
      skuCol !== -1 && row[skuCol]
        ? String(row[skuCol]).trim()
        : 'SKU-' + barcode.slice(-6);

    const category =
      categoryCol !== -1 && row[categoryCol]
        ? String(row[categoryCol]).trim()
        : 'ทั่วไป';

    const costPrice =
      costCol !== -1 && row[costCol] !== undefined
        ? parseFloat(String(row[costCol]).replace(/[^0-9.-]/g, '')) || 0
        : 0;

    const sellingPrice =
      priceCol !== -1 && row[priceCol] !== undefined
        ? parseFloat(String(row[priceCol]).replace(/[^0-9.-]/g, '')) || costPrice || 10
        : costPrice || 10;

    const stock =
      stockCol !== -1 && row[stockCol] !== undefined
        ? parseInt(String(row[stockCol]).replace(/[^0-9-]/g, ''), 10) || 0
        : 10;

    const unit =
      unitCol !== -1 && row[unitCol] ? String(row[unitCol]).trim() : 'ชิ้น';

    const minStock =
      minStockCol !== -1 && row[minStockCol] !== undefined
        ? parseInt(String(row[minStockCol]).replace(/[^0-9-]/g, ''), 10) || 5
        : 5;

    parsedProducts.push({
      id: 'prod_' + Date.now() + '_' + i,
      sku,
      barcode,
      name,
      category,
      costPrice,
      sellingPrice,
      stock,
      unit,
      minStock,
      updatedAt: new Date().toISOString(),
    });
  }

  return { products: parsedProducts, skipped };
};
