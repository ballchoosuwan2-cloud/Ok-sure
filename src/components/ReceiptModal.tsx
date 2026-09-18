import React from 'react';
import { BillTransaction, StoreSettings } from '../types';
import { renderBarcodeSvg } from '../utils/barcodeSvg';
import { Printer, X, CheckCircle, Clock } from 'lucide-react';

interface ReceiptModalProps {
  transaction: BillTransaction | null;
  settings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  settings,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const barcodeSvgString = renderBarcodeSvg(transaction.billNumber, 200, 45, true);

  return (
    <div
      id="receipt-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="receipt-modal-card"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col my-auto border border-slate-200"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-base">ทำรายการสำเร็จ / ใบเสร็จรับเงิน</h3>
          </div>
          <button
            id="close-receipt-modal-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-6 bg-slate-100/70 overflow-y-auto max-h-[70vh] flex justify-center">
          <div
            id="printable-receipt"
            className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 text-slate-800 w-full max-w-[340px] text-xs font-mono select-none"
            style={{ minHeight: '420px' }}
          >
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="font-bold text-base text-slate-900 tracking-tight">{settings.storeName}</h2>
              <p className="text-[11px] text-slate-600">{settings.storeBranch}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{settings.storeAddress}</p>
              <p className="text-[10px] text-slate-500">โทร: {settings.storePhone}</p>
              <p className="text-[10px] text-slate-500">เลขประจำตัวผู้เสียภาษี: {settings.taxId}</p>
            </div>

            {/* Queue & Invoice Info */}
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <div className="flex justify-between items-center bg-emerald-50 text-emerald-800 px-2 py-1 rounded font-bold text-sm mb-1.5 border border-emerald-200">
                <span>หมายเลขคิว:</span>
                <span className="text-base font-extrabold">{transaction.queueNumber}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>เลขที่ใบเสร็จ:</span>
                <span className="font-semibold text-slate-800">{transaction.billNumber}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[11px] mt-0.5">
                <span>วันที่-เวลา:</span>
                <span>{transaction.dateStr} {transaction.timeStr}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[11px] mt-0.5">
                <span>พนักงานแคชเชียร์:</span>
                <span>{transaction.cashierName}</span>
              </div>
              {transaction.status === 'refunded' && (
                <div className="mt-1 p-1 bg-rose-100 text-rose-800 text-center font-bold rounded">
                  *** คืนเงิน / ยกเลิกบิลแล้ว ***
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <div className="flex justify-between font-bold text-slate-700 pb-1 border-b border-slate-200 text-[11px]">
                <span className="w-1/2">รายการ</span>
                <span className="w-1/6 text-right">จน.</span>
                <span className="w-1/3 text-right">รวม (฿)</span>
              </div>
              <div className="space-y-1.5 pt-1.5">
                {transaction.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] items-start">
                    <div className="w-1/2 pr-1">
                      <div className="font-medium text-slate-800 truncate">{item.productName}</div>
                      <div className="text-[9px] text-slate-400">@{item.sellingPrice.toFixed(2)}</div>
                    </div>
                    <div className="w-1/6 text-right text-slate-600">{item.quantity}</div>
                    <div className="w-1/3 text-right font-medium text-slate-800">
                      {item.subtotal.toFixed(2)}
                      {item.discount > 0 && (
                        <div className="text-[9px] text-rose-500">(-{item.discount.toFixed(2)})</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="py-2.5 space-y-1 border-b border-dashed border-slate-300 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>ยอดรวมสินค้า:</span>
                <span>฿{transaction.subtotal.toFixed(2)}</span>
              </div>
              {transaction.billDiscount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>ส่วนลดท้ายบิล:</span>
                  <span>-฿{transaction.billDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>ภาษีมูลค่าเพิ่ม (VAT 7% รวมในยอด):</span>
                <span>฿{transaction.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                <span>ยอดสุทธิ (Total):</span>
                <span>฿{transaction.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>วิธีชำระเงิน:</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {transaction.paymentMethod === 'cash' && 'เงินสด (Cash)'}
                  {transaction.paymentMethod === 'promptpay' && 'พร้อมเพย์ QR (PromptPay)'}
                  {transaction.paymentMethod === 'card' && 'บัตรเครดิต/เดบิต (Card)'}
                  {transaction.paymentMethod === 'split' && 'แยกชำระหลายช่องทาง (Split)'}
                </span>
              </div>

              {transaction.paymentMethod === 'cash' && transaction.cashReceived !== undefined && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>รับเงินมา:</span>
                    <span>฿{transaction.cashReceived.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700 text-xs">
                    <span>เงินทอน:</span>
                    <span>฿{(transaction.changeGiven || 0).toFixed(2)}</span>
                  </div>
                </>
              )}

              {transaction.splitDetails && (
                <div className="pt-1 text-[10px] text-slate-500 space-y-0.5">
                  {transaction.splitDetails.cash > 0 && (
                    <div className="flex justify-between">
                      <span>• เงินสด:</span>
                      <span>฿{transaction.splitDetails.cash.toFixed(2)}</span>
                    </div>
                  )}
                  {transaction.splitDetails.promptpay > 0 && (
                    <div className="flex justify-between">
                      <span>• พร้อมเพย์:</span>
                      <span>฿{transaction.splitDetails.promptpay.toFixed(2)}</span>
                    </div>
                  )}
                  {transaction.splitDetails.card > 0 && (
                    <div className="flex justify-between">
                      <span>• บัตร:</span>
                      <span>฿{transaction.splitDetails.card.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Barcode & Footer */}
            <div className="pt-3 text-center">
              <div
                className="flex justify-center mb-1.5"
                dangerouslySetInnerHTML={{ __html: barcodeSvgString }}
              />
              <p className="text-[10px] text-slate-500 font-sans mt-1">
                {settings.receiptFooterMessage}
              </p>
              <div className="flex items-center justify-center gap-1 text-[9px] text-slate-400 mt-1">
                <Clock className="w-3 h-3" />
                <span>Powered by Thai POS System</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-white border-t border-slate-200 flex gap-2 justify-end">
          <button
            id="modal-close-action-btn"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            ปิดหน้าต่าง
          </button>
          <button
            id="print-receipt-action-btn"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            พิมพ์ใบเสร็จ (Print)
          </button>
        </div>
      </div>
    </div>
  );
};
