import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { playQueueCallAudio } from '../utils/audioQueue';
import { QueueTicket } from '../types';
import {
  Volume2,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Users,
  Tv,
  X,
  Bell,
  Sparkles,
} from 'lucide-react';

export const QueueView: React.FC = () => {
  const { queues, currentQueueCalling, callQueue, recallQueue, completeQueue, cancelQueue } =
    usePOS();

  const [isTvMode, setIsTvMode] = useState(false);

  // Filter queues
  const waitingQueues = queues.filter((q) => q.status === 'waiting');
  const callingQueues = queues.filter((q) => q.status === 'calling');
  const completedQueues = queues.filter((q) => q.status === 'completed');

  const handleManualCall = (q: QueueTicket) => {
    callQueue(q.id);
    playQueueCallAudio(q.queueNumber);
  };

  const handleRecall = (q: QueueTicket) => {
    recallQueue(q.id);
    playQueueCallAudio(q.queueNumber);
  };

  return (
    <div id="queue-view" className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-pink-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-pink-600" />
            <span>ระบบคิวและเสียงเรียกอัจฉริยะ (Queue System)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ออกคิวอัตโนมัติเมื่อชำระเงิน พร้อมเสียงกระดิ่ง Chime และเสียงพากย์ภาษาไทย
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTvMode(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Tv className="w-4 h-4 text-pink-100" />
            <span>เปิดหน้าจอแสดงผลลูกค้า (TV Mode)</span>
          </button>
        </div>
      </div>

      {/* Main Calling Spotlight Banner */}
      <div className="bg-gradient-to-br from-pink-600 via-rose-600 to-pink-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-pink-400/30">
        <div className="text-center md:text-left space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 text-white rounded-full text-xs font-semibold border border-white/30 backdrop-blur-xs">
            <Bell className="w-3.5 h-3.5 animate-bounce" />
            <span>กำลังเรียกบริการ (NOW CALLING)</span>
          </div>
          <div className="text-xs text-pink-100">
            {currentQueueCalling
              ? `บิล: ${currentQueueCalling.billNumber || '-'} ${
                  currentQueueCalling.totalAmount !== undefined
                    ? `• ยอด ฿${currentQueueCalling.totalAmount.toFixed(2)}`
                    : ''
                }`
              : 'ขณะนี้ไม่มีคิวที่กำลังเรียก'}
          </div>
          <div className="text-6xl sm:text-7xl font-black tracking-tight text-white font-mono">
            {currentQueueCalling ? currentQueueCalling.queueNumber : '---'}
          </div>
          {currentQueueCalling?.customerName && (
            <div className="text-sm font-bold text-pink-100">
              คุณ: {currentQueueCalling.customerName}
            </div>
          )}
        </div>

        {/* Big Recall & Complete Buttons */}
        {currentQueueCalling && (
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => handleRecall(currentQueueCalling)}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-pink-700 hover:bg-pink-50 active:bg-pink-100 font-bold text-sm rounded-2xl shadow-lg transition"
            >
              <Volume2 className="w-5 h-5 text-pink-600" />
              <span>กดเรียกซ้ำ (กดเสียง)</span>
            </button>

            <button
              onClick={() => completeQueue(currentQueueCalling.id)}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-lg transition"
            >
              <CheckCircle className="w-5 h-5 text-emerald-200" />
              <span>ส่งมอบสินค้าเรียบร้อย</span>
            </button>
          </div>
        )}
      </div>

      {/* Queue Columns Grid: Waiting vs Completed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Waiting Queues */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-amber-50/70 border-b border-amber-200/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-sm text-slate-900">
                คิวที่กำลังรอเรียก (Waiting)
              </h3>
            </div>
            <span className="px-2.5 py-0.5 bg-amber-200 text-amber-900 text-xs font-bold rounded-full">
              {waitingQueues.length} คิว
            </span>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[420px]">
            {waitingQueues.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-medium">
                ไม่มีคิวที่รอดำเนินการ
              </div>
            ) : (
              waitingQueues.map((q) => (
                <div
                  key={q.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:border-amber-400 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-slate-900 font-mono">
                        {q.queueNumber}
                      </span>
                      {q.customerName && (
                        <span className="text-xs font-medium text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {q.customerName}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {q.time || ''} • บิล {q.billNumber || '-'} {q.totalAmount !== undefined ? `• ฿${q.totalAmount.toFixed(2)}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleManualCall(q)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>เรียกคิว</span>
                    </button>
                    <button
                      onClick={() => cancelQueue(q.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                      title="ยกเลิกคิว"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. Completed / Recent Queues */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">
                คิวที่เสร็จสิ้นแล้วล่าสุด (Completed)
              </h3>
            </div>
            <span className="px-2.5 py-0.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-full">
              {completedQueues.length} คิว
            </span>
          </div>

          <div className="p-4 space-y-2.5 flex-1 overflow-y-auto max-h-[420px]">
            {completedQueues.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-medium">
                ยังไม่มีคิวที่เสร็จสิ้น
              </div>
            ) : (
              completedQueues.slice(0, 15).map((q) => (
                <div
                  key={q.id}
                  className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-black text-slate-600 font-mono text-base">
                      {q.queueNumber}
                    </span>
                    <div>
                      <div className="font-medium text-slate-800">
                        {q.customerName ? `คุณ ${q.customerName}` : `บิล ${q.billNumber}`}
                      </div>
                      <div className="text-[10px] text-slate-400">{q.time}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-bold">
                      {q.totalAmount !== undefined ? `฿${q.totalAmount.toFixed(2)}` : ''}
                    </span>
                    <button
                      onClick={() => handleRecall(q)}
                      className="p-1 text-slate-400 hover:text-indigo-600 transition"
                      title="เรียกซ้ำอีกครั้ง"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* FULLSCREEN TV / CUSTOMER DISPLAY OVERLAY */}
      {isTvMode && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col p-8 overflow-hidden select-none">
          {/* Header */}
          <div className="flex justify-between items-center pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-emerald-500 animate-ping" />
              <h1 className="text-2xl font-black tracking-wide">หน้าจอแสดงสถานะคิวลูกค้า (Queue Display)</h1>
            </div>
            <button
              onClick={() => setIsTvMode(false)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition flex items-center gap-1 text-xs"
            >
              <X className="w-5 h-5" />
              <span>ปิดหน้าจอ TV</span>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 py-8 items-stretch">
            {/* Left: Now Calling Big View */}
            <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-8 rounded-3xl border-2 border-indigo-500 flex flex-col items-center justify-center text-center shadow-[0_0_50px_rgba(99,102,241,0.2)]">
              <span className="px-4 py-1.5 bg-emerald-500 text-slate-950 font-black text-sm rounded-full uppercase tracking-widest mb-4">
                โปรดรับสินค้าที่เคาน์เตอร์
              </span>
              <div className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">
                หมายเลขคิวที่กำลังเรียก (NOW CALLING)
              </div>
              <div className="text-8xl sm:text-9xl font-black text-white font-mono tracking-wider drop-shadow-lg">
                {currentQueueCalling ? currentQueueCalling.queueNumber : '---'}
              </div>
              {currentQueueCalling?.customerName && (
                <div className="mt-4 text-2xl font-bold text-emerald-400">
                  คุณ: {currentQueueCalling.customerName}
                </div>
              )}
            </div>

            {/* Right: Waiting List */}
            <div className="bg-slate-900/90 p-8 rounded-3xl border border-slate-800 flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <span className="text-lg font-bold text-slate-300">คิวที่กำลังจัดเตรียม (PREPARING)</span>
                <span className="text-sm font-bold text-amber-400">
                  รอ {waitingQueues.length} คิว
                </span>
              </div>

              <div className="flex-1 grid grid-cols-3 gap-4 overflow-y-auto content-start">
                {waitingQueues.slice(0, 15).map((q) => (
                  <div
                    key={q.id}
                    className="p-4 bg-slate-800/80 rounded-2xl text-center border border-slate-700"
                  >
                    <div className="text-3xl font-black font-mono text-amber-300">{q.queueNumber}</div>
                    {q.customerName && (
                      <div className="text-xs text-slate-300 truncate mt-1">{q.customerName}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* TV Footer */}
          <div className="pt-4 border-t border-slate-800 flex justify-between text-xs text-slate-500">
            <span>Thai Smart POS & Queue Automation System</span>
            <span>ขอขอบคุณที่ใช้บริการ</span>
          </div>
        </div>
      )}
    </div>
  );
};
