import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, CheckCircle2, AlertCircle, ScanBarcode } from 'lucide-react';
import { Product } from '../types';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  availableProducts?: Product[];
  title?: string;
  subtitle?: string;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  availableProducts = [],
  title = 'สแกนบาร์โค้ด / QR Code',
  subtitle,
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Clean up camera when closed
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch((err) => console.log('Scanner stop error:', err));
        scannerRef.current = null;
      }
      setIsScanning(false);
      setCameraError(null);
      return;
    }

    const html5QrCodeId = 'reader-scanner-container';
    const timer = setTimeout(() => {
      try {
        const html5QrCode = new Html5Qrcode(html5QrCodeId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 180 },
        };

        html5QrCode
          .start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              // Beep / haptic if available
              if ('vibrate' in navigator) {
                try {
                  navigator.vibrate(100);
                } catch {
                  // ignored
                }
              }
              setLastScanned(decodedText);
              onScanSuccess(decodedText);
              setTimeout(() => {
                onClose();
              }, 400);
            },
            () => {
              // Scan frame dropped or no QR found yet - normal
            }
          )
          .then(() => {
            setIsScanning(true);
            setCameraError(null);
          })
          .catch((err) => {
            console.warn('Camera access issue:', err);
            setCameraError(
              'ไม่สามารถเปิดกล้องได้ (โปรดอนุญาตสิทธิ์กล้องในเบราว์เซอร์ หรือทดสอบด้วยปุ่มคลิกจำลองด้านล่าง)'
            );
            setIsScanning(false);
          });
      } catch (err) {
        setCameraError('เกิดข้อผิดพลาดในการโหลดโมดูลกล้อง');
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch((err) => console.log('Clean scanner stop error:', err));
        scannerRef.current = null;
      }
    };
  }, [isOpen, onClose, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div
      id="camera-scanner-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs"
    >
      <div
        id="camera-scanner-card"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-semibold text-base leading-tight">{title}</h3>
              {subtitle && <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Area */}
        <div className="relative bg-black min-h-[280px] flex items-center justify-center overflow-hidden">
          <div id="reader-scanner-container" className="w-full h-full" />

          {/* Scanner Overlay Visual */}
          {isScanning && !cameraError && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-64 h-40 border-2 border-emerald-400/80 rounded-xl relative overflow-hidden shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                {/* Laser animation line */}
                <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse top-1/2 -translate-y-1/2" />
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
              </div>
              <p className="text-white/90 text-xs font-medium mt-3 bg-black/60 px-3 py-1 rounded-full">
                นำบาร์โค้ดหรือ QR Code มาวางในกรอบ
              </p>
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && (
            <div className="p-6 text-center text-white bg-slate-800/95 absolute inset-0 flex flex-col items-center justify-center">
              <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
              <p className="text-sm font-medium text-slate-200 max-w-xs">{cameraError}</p>
              <p className="text-xs text-slate-400 mt-2">
                สามารถคลิกเลือกสินค้าทดสอบสแกนด่วนด้านล่างได้เลย
              </p>
            </div>
          )}

          {/* Success Overlay */}
          {lastScanned && (
            <div className="absolute inset-0 bg-emerald-950/80 flex flex-col items-center justify-center text-white">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
              <p className="font-bold text-base">สแกนสำเร็จ!</p>
              <p className="text-xs text-emerald-200 mt-1 font-mono">{lastScanned}</p>
            </div>
          )}
        </div>

        {/* Quick Test / Manual Pick Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ScanBarcode className="w-3.5 h-3.5 text-emerald-600" />
              <span>หรือเลือกสินค้าเพื่อทดสอบจำลองการสแกนทันที:</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
            {availableProducts.slice(0, 6).map((prod) => (
              <button
                key={prod.id}
                onClick={() => {
                  onScanSuccess(prod.barcode);
                  onClose();
                }}
                className="text-left p-2 bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-lg text-xs transition group flex items-center justify-between"
              >
                <div className="truncate pr-1">
                  <div className="font-medium text-slate-800 group-hover:text-emerald-700 truncate">
                    {prod.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">{prod.barcode}</div>
                </div>
                <div className="text-xs font-bold text-emerald-600 shrink-0">฿{prod.sellingPrice}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
