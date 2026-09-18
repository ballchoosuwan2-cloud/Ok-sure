import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { PaymentMethod, SplitPaymentDetail, StoreSettings } from '../types';
import { generatePromptPayPayload } from '../utils/promptpay';
import {
  Banknote,
  QrCode,
  CreditCard,
  Layers,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  settings: StoreSettings;
  onConfirmPayment: (
    method: PaymentMethod,
    cashReceived?: number,
    splitDetails?: SplitPaymentDetail,
    customerName?: string
  ) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  grandTotal,
  settings,
  onConfirmPayment,
}) => {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState<number>(grandTotal);
  const [customerName, setCustomerName] = useState<string>('');
  const [promptPayQrUrl, setPromptPayQrUrl] = useState<string>('');
  const [splitDetails, setSplitDetails] = useState<SplitPaymentDetail>({
    cash: 0,
    promptpay: 0,
    card: 0,
  });

  // Calculate change
  const changeAmount = Math.max(0, cashReceived - grandTotal);
  const isCashSufficient = cashReceived >= grandTotal;

  // Split sum
  const splitTotal = splitDetails.cash + splitDetails.promptpay + splitDetails.card;
  const splitRemaining = grandTotal - splitTotal;

  // Generate PromptPay QR Code when method is 'promptpay'
  useEffect(() => {
    if (method === 'promptpay' && grandTotal > 0) {
      const payload = generatePromptPayPayload(settings.promptPayId, grandTotal);
      QRCode.toDataURL(payload, {
        width: 260,
        margin: 1,
        color: {
          dark: '#002d62', // Deep PromptPay Blue
          light: '#ffffff',
        },
      })
        .then((url) => setPromptPayQrUrl(url))
        .catch((err) => console.error('PromptPay QR error:', err));
    }
  }, [method, grandTotal, settings.promptPayId]);

  // Reset values when opened
  useEffect(() => {
    if (isOpen) {
      setCashReceived(grandTotal);
      setSplitDetails({ cash: grandTotal, promptpay: 0, card: 0 });
    }
  }, [isOpen, grandTotal]);

  if (!isOpen) return null;

  const handleQuickCash = (amount: number) => {
    setCashReceived(amount);
  };

  const handleAddQuickCash = (addition: number) => {
    setCashReceived((prev) => prev + addition);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (method === 'cash') {
      if (!isCashSufficient) return;
      onConfirmPayment('cash', cashReceived, undefined, customerName);
    } else if (method === 'promptpay') {
      onConfirmPayment('promptpay', undefined, undefined, customerName);
    } else if (method === 'card') {
      onConfirmPayment('card', undefined, undefined, customerName);
    } else if (method === 'split') {
      if (Math.abs(splitRemaining) > 0.01) return;
      onConfirmPayment('split', undefined, splitDetails, customerName);
    }
  };

  return (
    <div
      id="checkout-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="checkout-modal-card"
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col my-auto border border-slate-200"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">ชำระเงิน (Checkout)</h3>
            <p className="text-xs text-slate-400">เลือกช่องทางชำระเงินและบันทึกการขาย</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grand Total Bar */}
        <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 text-white px-6 py-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-medium text-pink-100 uppercase tracking-wide">ยอดชำระสุทธิ</span>
            <div className="text-3xl font-black tracking-tight">฿{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="text-right">
            <label className="block text-[11px] text-pink-100 mb-1">ชื่อลูกค้า / โน้ตคิว (ถ้ามี):</label>
            <input
              type="text"
              placeholder="ระบุชื่อลูกค้า (ไม่บังคับ)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="px-2.5 py-1 text-xs bg-pink-800/60 text-white placeholder:text-pink-200/70 rounded-lg border border-pink-400 focus:outline-hidden focus:ring-1 focus:ring-white"
            />
          </div>
        </div>

        {/* Payment Methods Tabs */}
        <div className="grid grid-cols-4 p-2 bg-pink-50/50 border-b border-pink-100 gap-1.5">
          <button
            type="button"
            onClick={() => setMethod('cash')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-xs font-semibold transition ${
              method === 'cash'
                ? 'bg-white text-pink-700 shadow-sm border border-pink-200 font-bold'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <Banknote className="w-5 h-5 mb-1 text-pink-600" />
            <span>เงินสด</span>
          </button>

          <button
            type="button"
            onClick={() => setMethod('promptpay')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-xs font-semibold transition ${
              method === 'promptpay'
                ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <QrCode className="w-5 h-5 mb-1 text-blue-600" />
            <span>พร้อมเพย์ QR</span>
          </button>

          <button
            type="button"
            onClick={() => setMethod('card')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-xs font-semibold transition ${
              method === 'card'
                ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <CreditCard className="w-5 h-5 mb-1 text-indigo-600" />
            <span>บัตรเครดิต</span>
          </button>

          <button
            type="button"
            onClick={() => setMethod('split')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-xs font-semibold transition ${
              method === 'split'
                ? 'bg-white text-amber-700 shadow-sm border border-amber-200'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <Layers className="w-5 h-5 mb-1 text-amber-600" />
            <span>แยกชำระ</span>
          </button>
        </div>

        {/* Tab Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
          {/* 1. CASH */}
          {method === 'cash' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  จำนวนเงินที่รับมา (บาท):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">฿</span>
                  <input
                    type="number"
                    step="any"
                    value={cashReceived === 0 ? '' : cashReceived}
                    onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-pink-500 focus:outline-hidden"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-2">
                <span className="text-[11px] text-slate-500 font-medium">ปุ่มลัดระบุยอดเงินสด:</span>
                <div className="grid grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickCash(grandTotal)}
                    className="py-1.5 px-2 bg-pink-50 hover:bg-pink-100 text-pink-800 font-bold text-xs rounded-lg border border-pink-200 transition"
                  >
                    พอดี (฿{Math.ceil(grandTotal)})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCash(100)}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg border border-slate-300 transition"
                  >
                    ฿100
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCash(500)}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg border border-slate-300 transition"
                  >
                    ฿500
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCash(1000)}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg border border-slate-300 transition"
                  >
                    ฿1,000
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuickCash(50)}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg border border-slate-300 transition"
                  >
                    +฿50
                  </button>
                </div>
              </div>

              {/* Change calculation card */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  isCashSufficient
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isCashSufficient ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-rose-600" />
                  )}
                  <div>
                    <div className="text-xs font-semibold">
                      {isCashSufficient ? 'เงินทอน (Change)' : 'เงินสดไม่เพียงพอ'}
                    </div>
                    <div className="text-xs opacity-75">
                      {isCashSufficient
                        ? 'คำนวณเงินทอนให้อัตโนมัติ'
                        : `ขาดอีก ฿${(grandTotal - cashReceived).toFixed(2)}`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black">
                    ฿{changeAmount.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. PROMPTPAY QR */}
          {method === 'promptpay' && (
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 w-full justify-center">
                <span>PromptPay พร้อมเพย์</span>
                <span className="text-blue-300">|</span>
                <span className="font-mono text-blue-200">{settings.promptPayId}</span>
              </div>

              <div className="p-3 bg-white rounded-2xl border-2 border-blue-600 shadow-md">
                {promptPayQrUrl ? (
                  <img src={promptPayQrUrl} alt="PromptPay QR" className="w-52 h-52 object-contain" />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-xs">
                    กำลังสร้าง QR Code...
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-600 max-w-sm">
                ให้ลูกค้าเปิดแอปธนาคารใดก็ได้ (K PLUS, SCB EASY, Krungthai NEXT, ฯลฯ)
                แล้วสแกน QR Code นี้ ระบบจะกรอกยอดเงิน <b>฿{grandTotal.toFixed(2)}</b> ให้อัตโนมัติ
              </div>
            </div>
          )}

          {/* 3. CREDIT / DEBIT CARD */}
          {method === 'card' && (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
              <CreditCard className="w-12 h-12 text-indigo-600 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">ชำระผ่านเครื่องรูดบัตร EDC / Tap to Pay</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                เสียบหรือแตะบัตรเครดิต/เดบิตของลูกค้าที่เครื่องรูดบัตร ยอดเงิน <b>฿{grandTotal.toFixed(2)}</b> เมื่อเครื่อง EDC อนุมัติแล้วกดปุ่มบันทึกด้านล่าง
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs rounded-full font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>รองรับ Visa, Mastercard, JCB, UnionPay</span>
              </div>
            </div>
          )}

          {/* 4. SPLIT PAYMENT */}
          {method === 'split' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-600">
                แยกชำระได้หลายวิธี เช่น เงินสดบางส่วน และโอนเงินพร้อมเพย์บางส่วน:
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>เงินสด (บาท)</span>
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={splitDetails.cash || ''}
                    onChange={(e) =>
                      setSplitDetails({ ...splitDetails, cash: parseFloat(e.target.value) || 0 })
                    }
                    className="w-32 text-right px-2.5 py-1 text-sm font-bold bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-blue-600" />
                    <span>พร้อมเพย์ QR (บาท)</span>
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={splitDetails.promptpay || ''}
                    onChange={(e) =>
                      setSplitDetails({ ...splitDetails, promptpay: parseFloat(e.target.value) || 0 })
                    }
                    className="w-32 text-right px-2.5 py-1 text-sm font-bold bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <span>บัตรเครดิต (บาท)</span>
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={splitDetails.card || ''}
                    onChange={(e) =>
                      setSplitDetails({ ...splitDetails, card: parseFloat(e.target.value) || 0 })
                    }
                    className="w-32 text-right px-2.5 py-1 text-sm font-bold bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Split balance summary */}
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  Math.abs(splitRemaining) < 0.01
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <span>รวมยอดที่ระบุ: <b>฿{splitTotal.toFixed(2)}</b> / ฿{grandTotal.toFixed(2)}</span>
                <span className="font-bold">
                  {Math.abs(splitRemaining) < 0.01 ? (
                    '✓ ยอดรวมตรงกันพอดี'
                  ) : splitRemaining > 0 ? (
                    `ยังเหลืออีก ฿${splitRemaining.toFixed(2)}`
                  ) : (
                    `ยอดเกิน ฿${Math.abs(splitRemaining).toFixed(2)}`
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Footer Submit Button */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={
                (method === 'cash' && !isCashSufficient) ||
                (method === 'split' && Math.abs(splitRemaining) > 0.01)
              }
              className={`flex-2 py-3 px-6 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition ${
                (method === 'cash' && !isCashSufficient) ||
                (method === 'split' && Math.abs(splitRemaining) > 0.01)
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                  : 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 active:from-pink-700 active:to-rose-700'
              }`}
            >
              <span>ยืนยันการรับเงิน & ออกใบเสร็จ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
