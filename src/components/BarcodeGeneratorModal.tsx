import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Product } from '../types';
import { renderBarcodeSvg } from '../utils/barcodeSvg';
import { Printer, Download, X, QrCode, Tag, Check, Copy } from 'lucide-react';

interface BarcodeGeneratorModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BarcodeGeneratorModal: React.FC<BarcodeGeneratorModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [labelCount, setLabelCount] = useState<number>(4);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (product) {
      // Generate QR Code with product details or barcode for scanner
      const qrContent = JSON.stringify({
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        price: product.sellingPrice,
      });

      QRCode.toDataURL(qrContent, {
        width: 250,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR generation error:', err));
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const barcodeSvgString = renderBarcodeSvg(product.barcode, 260, 60, true);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(product.barcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_${product.sku}_${product.name}.png`;
    a.click();
  };

  return (
    <div
      id="barcode-generator-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="barcode-generator-modal"
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col my-auto border border-slate-200"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-semibold text-base">ระบบสร้างบาร์โค้ด & QR Code สินค้า</h3>
              <p className="text-xs text-slate-400">สำหรับพิมพ์ฉลากติดสินค้า และสแกนขายหน้าร้าน</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Product Meta Banner */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="text-xs text-slate-500 font-medium">ชื่อสินค้า:</div>
              <div className="text-sm font-bold text-slate-900">{product.name}</div>
              <div className="text-xs text-slate-600 mt-0.5">
                รหัส SKU: <span className="font-semibold text-slate-800">{product.sku}</span> | หมวดหมู่: {product.category}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 font-medium">ราคาขาย:</div>
              <div className="text-lg font-extrabold text-emerald-600">
                ฿{product.sellingPrice.toLocaleString()} <span className="text-xs font-normal text-slate-500">/{product.unit}</span>
              </div>
            </div>
          </div>

          {/* Barcode & QR Code Preview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Barcode Preview */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col items-center text-center">
              <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-600" />
                <span>บาร์โค้ด 1 มิติ (Code 128)</span>
              </div>
              <div
                className="bg-white p-2 rounded border border-slate-100 w-full flex justify-center items-center min-h-[90px]"
                dangerouslySetInnerHTML={{ __html: barcodeSvgString }}
              />
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs font-mono text-slate-600 font-bold">{product.barcode}</span>
                <button
                  onClick={handleCopyBarcode}
                  className="p-1 text-slate-400 hover:text-slate-700 transition"
                  title="คัดลอกรหัสบาร์โค้ด"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* QR Code Preview */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col items-center text-center">
              <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-sky-600" />
                <span>QR Code สแกนด้วยกล้อง</span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-100 flex justify-center items-center min-h-[90px]">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Product QR" className="w-24 h-24 object-contain" />
                ) : (
                  <div className="text-xs text-slate-400">กำลังสร้าง QR...</div>
                )}
              </div>
              <button
                onClick={handleDownloadQr}
                className="mt-2 text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1 hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                <span>บันทึกรูป QR Code</span>
              </button>
            </div>
          </div>

          {/* Label Printing Options */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-slate-800">
                ตัวอย่างฉลากราคาสินค้า (Price Tag Preview)
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span>จำนวนดวงที่พิมพ์:</span>
                <select
                  value={labelCount}
                  onChange={(e) => setLabelCount(Number(e.target.value))}
                  className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                >
                  <option value={1}>1 ดวง</option>
                  <option value={4}>4 ดวง</option>
                  <option value={8}>8 ดวง</option>
                  <option value={12}>12 ดวง (เต็มแผ่น A4)</option>
                </select>
              </div>
            </div>

            {/* Printable Label Container */}
            <div
              id="printable-barcode"
              className="p-3 bg-slate-100 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto"
            >
              {Array.from({ length: labelCount }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white p-3 rounded-lg border border-slate-300 shadow-2xs flex flex-col justify-between"
                  style={{ minHeight: '110px' }}
                >
                  <div className="flex justify-between items-start">
                    <div className="pr-2">
                      <div className="text-xs font-bold text-slate-900 truncate max-w-[140px]">{product.name}</div>
                      <div className="text-[10px] text-slate-500">รหัส: {product.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500">ราคา</div>
                      <div className="text-sm font-black text-slate-900">฿{product.sellingPrice}</div>
                    </div>
                  </div>
                  <div
                    className="mt-1 flex justify-center"
                    dangerouslySetInnerHTML={{ __html: renderBarcodeSvg(product.barcode, 200, 38, true) }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <div className="text-xs text-slate-500">
            💡 ใช้กล้องสมาร์ทโฟนหรือเครื่องสแกนบาร์โค้ดยิงที่ฉลากนี้บนหน้าขาย POS ได้ทันที
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition"
            >
              ยกเลิก
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>พิมพ์ฉลากสินค้า (Print)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
