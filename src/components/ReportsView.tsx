import React, { useState, useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  Banknote,
  QrCode,
  CreditCard,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  PieChart as PieIcon,
  BarChart3,
  Award,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const ReportsView: React.FC = () => {
  const {
    transactions,
    dailyClosings,
    currentStaff,
    isTodayClosed,
    settings,
    closeTodaySales,
  } = usePOS();

  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'history'>('daily');

  // Selected date for daily report (defaults to today)
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Selected month for monthly report (YYYY-MM)
  const currentMonthStr = todayStr.substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  // Cash counting drawer modal
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [openingCash, setOpeningCash] = useState<number>(1000);
  const [actualCashCounted, setActualCashCounted] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState<string>('');

  // Transactions of selected date
  const dayTxList = useMemo(() => {
    return transactions.filter((t) => t.dateStr === selectedDate && t.status === 'completed');
  }, [transactions, selectedDate]);

  // Daily totals
  const dayTotalSales = dayTxList.reduce((sum, t) => sum + t.grandTotal, 0);
  const dayTotalBills = dayTxList.length;

  let dayCost = 0;
  dayTxList.forEach((t) => {
    t.items.forEach((item) => {
      dayCost += item.costPrice * item.quantity;
    });
  });
  const dayGrossProfit = Math.max(0, dayTotalSales - dayCost);

  let dayCash = 0;
  let dayPromptPay = 0;
  let dayCard = 0;

  dayTxList.forEach((t) => {
    if (t.paymentMethod === 'cash') {
      dayCash += t.grandTotal;
    } else if (t.paymentMethod === 'promptpay') {
      dayPromptPay += t.grandTotal;
    } else if (t.paymentMethod === 'card') {
      dayCard += t.grandTotal;
    } else if (t.paymentMethod === 'split' && t.splitDetails) {
      dayCash += t.splitDetails.cash;
      dayPromptPay += t.splitDetails.promptpay;
      dayCard += t.splitDetails.card;
    }
  });

  // Expected Cash Drawer
  const expectedCashInDrawer = openingCash + dayCash;
  const cashDifference = actualCashCounted - expectedCashInDrawer;

  // Monthly stats
  const monthTxList = useMemo(() => {
    return transactions.filter(
      (t) => t.dateStr.startsWith(selectedMonth) && t.status === 'completed'
    );
  }, [transactions, selectedMonth]);

  const monthTotalSales = monthTxList.reduce((sum, t) => sum + t.grandTotal, 0);
  const monthTotalBills = monthTxList.length;

  let monthCost = 0;
  monthTxList.forEach((t) => {
    t.items.forEach((i) => {
      monthCost += i.costPrice * i.quantity;
    });
  });
  const monthGrossProfit = Math.max(0, monthTotalSales - monthCost);

  // Daily breakdown for monthly chart
  const monthlyDailyData = useMemo(() => {
    const map: Record<string, { date: string; day: string; sales: number; bills: number }> = {};

    // Get number of days in selected month
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
      map[dStr] = {
        date: dStr,
        day: `${d}`,
        sales: 0,
        bills: 0,
      };
    }

    monthTxList.forEach((t) => {
      if (map[t.dateStr]) {
        map[t.dateStr].sales += t.grandTotal;
        map[t.dateStr].bills += 1;
      }
    });

    return Object.values(map);
  }, [monthTxList, selectedMonth]);

  // Top products in selected month
  const topProducts = useMemo(() => {
    const pMap: Record<string, { name: string; quantity: number; totalSales: number }> = {};
    monthTxList.forEach((t) => {
      t.items.forEach((item) => {
        if (!pMap[item.productId]) {
          pMap[item.productId] = {
            name: item.productName,
            quantity: 0,
            totalSales: 0,
          };
        }
        pMap[item.productId].quantity += item.quantity;
        pMap[item.productId].totalSales += item.subtotal;
      });
    });

    return Object.values(pMap).sort((a, b) => b.quantity - a.quantity);
  }, [monthTxList]);

  // Payment Breakdown for Pie Chart
  const paymentBreakdownData = useMemo(() => {
    let cash = 0;
    let qr = 0;
    let card = 0;
    monthTxList.forEach((t) => {
      if (t.paymentMethod === 'cash') cash += t.grandTotal;
      else if (t.paymentMethod === 'promptpay') qr += t.grandTotal;
      else if (t.paymentMethod === 'card') card += t.grandTotal;
      else if (t.paymentMethod === 'split' && t.splitDetails) {
        cash += t.splitDetails.cash;
        qr += t.splitDetails.promptpay;
        card += t.splitDetails.card;
      }
    });
    return [
      { name: 'เงินสด', value: cash, color: '#10b981' },
      { name: 'พร้อมเพย์ QR', value: qr, color: '#3b82f6' },
      { name: 'บัตรเครดิต', value: card, color: '#8b5cf6' },
    ].filter((item) => item.value > 0);
  }, [monthTxList]);

  // Handle closing submission
  const handleConfirmCloseToday = (e: React.FormEvent) => {
    e.preventDefault();
    closeTodaySales(openingCash, actualCashCounted, closingNotes);
    setIsCloseModalOpen(false);
    alert('บันทึกปิดยอดขายประจำวันเรียบร้อยแล้ว!');
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = 'วันที่,เลขที่ใบเสร็จ,คิว,รายการ,ยอดสุทธิ,ช่องทางชำระ,แคชเชียร์\n';
    const rows = monthTxList
      .map(
        (t) =>
          `"${t.dateStr} ${t.timeStr}","${t.billNumber}","${t.queueNumber}","${t.items.length} รายการ",${t.grandTotal},"${t.paymentMethod}","${t.cashierName}"`
      )
      .join('\n');

    const blob = new Blob([`\uFEFF${headers}${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `POS_Report_${selectedMonth}.csv`;
    link.click();
  };

  return (
    <div id="reports-view" className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            <span>ระบบสรุปยอดขายและบัญชี (Reports & Closing)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            สรุปยอดรายวัน ปิดกะลิ้นชักเงินสด และวิเคราะห์ยอดขายรายเดือน
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>ส่งออก Excel/CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>พิมพ์รายงาน</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'daily'
              ? 'bg-pink-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-pink-50'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>สรุปยอดรายวัน (Daily Closing)</span>
        </button>

        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'monthly'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-rose-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>สรุปยอดรายเดือน (Monthly Report)</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'history'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>ประวัติการปิดยอดประจำวัน ({dailyClosings.length})</span>
        </button>
      </div>

      {/* 1. DAILY REPORT TAB */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          {/* Date Selector & Action */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">เลือกวันที่ตรวจสอบ:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
              {selectedDate === todayStr && (
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded-full">
                  วันนี้
                </span>
              )}
            </div>

            {selectedDate === todayStr && (
              <div>
                {isTodayClosed ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>ปิดยอดประจำวันแล้ว</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setActualCashCounted(expectedCashInDrawer);
                      setIsCloseModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    <Lock className="w-4 h-4 text-pink-100" />
                    <span>บันทึกปิดยอดประจำวัน (Daily Closing)</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Daily Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>ยอดขายรวมวันนี้</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                ฿{dayTotalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">ทั้งหมด {dayTotalBills} บิล</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>กำไรขั้นต้น (Gross Profit)</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-blue-600 mt-2">
                ฿{dayGrossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                คิดเป็น {dayTotalSales > 0 ? ((dayGrossProfit / dayTotalSales) * 100).toFixed(0) : 0}% ของยอดขาย
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>ยอดขายเฉลี่ยต่อบิล</span>
                <Receipt className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-slate-800 mt-2">
                ฿{(dayTotalBills > 0 ? dayTotalSales / dayTotalBills : 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">คำนวณจากบิลสำเร็จ</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>สถานะปิดกะ</span>
                <Lock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-lg font-bold mt-2">
                {isTodayClosed && selectedDate === todayStr ? (
                  <span className="text-emerald-600 font-black">ปิดยอดสมบูรณ์แล้ว</span>
                ) : (
                  <span className="text-amber-600 font-bold">ยังไม่ได้ปิดยอดกะ</span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                แคชเชียร์: {currentStaff.name}
              </div>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-800">
              ยอดขายแยกตามช่องทางชำระเงิน (Payment Breakdown)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">เงินสด (Cash)</div>
                    <div className="text-[11px] text-slate-500">ในลิ้นชักเก็บเงิน</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-emerald-800">
                    ฿{dayCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">พร้อมเพย์ QR Code</div>
                    <div className="text-[11px] text-slate-500">เงินโอนเข้าบัญชีร้าน</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-blue-800">
                    ฿{dayPromptPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-lg">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">บัตรเครดิต / EDC</div>
                    <div className="text-[11px] text-slate-500">ยอดรอเข้าบัญชี</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-indigo-800">
                    ฿{dayCard.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* List of bills on selected day */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-sm text-slate-800">
                รายการบิลขายวันที่ {selectedDate} ({dayTxList.length} บิล)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100/60 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-4">เวลา</th>
                    <th className="py-2.5 px-3">เลขที่ใบเสร็จ</th>
                    <th className="py-2.5 px-3">คิว</th>
                    <th className="py-2.5 px-4">รายการสินค้า</th>
                    <th className="py-2.5 px-3">ช่องทาง</th>
                    <th className="py-2.5 px-3 text-right">ยอดสุทธิ</th>
                    <th className="py-2.5 px-4">แคชเชียร์</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dayTxList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        ไม่มีรายการบิลในวันที่เลือก
                      </td>
                    </tr>
                  ) : (
                    dayTxList.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-4 font-mono text-slate-500">{t.timeStr}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {t.billNumber}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black text-emerald-700">
                          {t.queueNumber}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="truncate max-w-xs text-slate-800">
                            {t.items.map((i) => `${i.productName} (${i.quantity})`).join(', ')}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="capitalize px-2 py-0.5 bg-slate-100 rounded text-[10px] font-medium">
                            {t.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">
                          ฿{t.grandTotal.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">{t.cashierName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. MONTHLY REPORT TAB */}
      {activeTab === 'monthly' && (
        <div className="space-y-4">
          {/* Month picker */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">เลือกเดือนที่ต้องการดูสรุป:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="text-xs font-semibold text-slate-500">
              ข้อมูลเดือน: {selectedMonth}
            </div>
          </div>

          {/* Monthly Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-medium text-slate-500">ยอดขายรวมทั้งเดือน</div>
              <div className="text-2xl font-black text-pink-600 mt-2">
                ฿{monthTotalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">ทั้งหมด {monthTotalBills} บิล</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-medium text-slate-500">กำไรขั้นต้นรวมทั้งเดือน</div>
              <div className="text-2xl font-black text-emerald-600 mt-2">
                ฿{monthGrossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                คิดเป็น {monthTotalSales > 0 ? ((monthGrossProfit / monthTotalSales) * 100).toFixed(0) : 0}% ของยอดขาย
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-medium text-slate-500">ยอดขายเฉลี่ยต่อวัน</div>
              <div className="text-2xl font-black text-slate-800 mt-2">
                ฿{(monthTotalSales / 30).toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">เฉลี่ย 30 วันทำการ</div>
            </div>
          </div>

          {/* Monthly Sales Chart (Bar Chart) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-800">
              กราฟแท่งแนวโน้มยอดขายรายวัน ประจำเดือน {selectedMonth}
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyDailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any) => [`฿${Number(value).toLocaleString()}`, 'ยอดขาย']}
                    labelFormatter={(label: any) => `วันที่ ${label} ${selectedMonth}`}
                  />
                  <Bar dataKey="sales" fill="#db2777" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Selling Products & Payment Methods in Month */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Products */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-800">
                  สินค้าขายดี 5 อันดับแรก (Top 5 Best Sellers)
                </h3>
              </div>

              <div className="space-y-2 pt-2">
                {topProducts.slice(0, 5).map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          idx === 0
                            ? 'bg-amber-100 text-amber-800'
                            : idx === 1
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-slate-900">
                        {p.quantity} ชิ้น
                      </div>
                      <div className="text-[10px] text-slate-500">฿{p.totalSales.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Distribution Pie */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">
                  สัดส่วนการชำระเงินในเดือนนี้
                </h3>
              </div>

              <div className="h-56 w-full flex items-center justify-center">
                {paymentBreakdownData.length === 0 ? (
                  <div className="text-slate-400 text-xs">ไม่มีข้อมูลชำระเงินในเดือนนี้</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentBreakdownData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {paymentBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `฿${Number(value).toLocaleString()}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CLOSING HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-800">
              ประวัติการปิดยอดขายประจำวัน (Daily Closings Audit Log)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">วันที่</th>
                  <th className="py-3 px-3">เวลาปิดกะ</th>
                  <th className="py-3 px-3 text-right">ยอดขายรวม</th>
                  <th className="py-3 px-3 text-right">กำไรขั้นต้น</th>
                  <th className="py-3 px-3 text-right">เงินสด</th>
                  <th className="py-3 px-3 text-right">โอน QR</th>
                  <th className="py-3 px-3 text-right">เงินนับได้จริง</th>
                  <th className="py-3 px-3 text-center">ส่วนต่าง</th>
                  <th className="py-3 px-4">ผู้ปิดกะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {dailyClosings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                      ยังไม่มีประวัติการปิดยอดประจำวัน
                    </td>
                  </tr>
                ) : (
                  dailyClosings.map((dc) => (
                    <tr key={dc.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-800">{dc.dateStr}</td>
                      <td className="py-3 px-3 text-slate-500">{dc.closedAt}</td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        ฿{dc.totalSales.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-600 font-bold">
                        ฿{dc.grossProfit.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700">
                        ฿{(dc.totalCash ?? dc.cashSales).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-blue-600">
                        ฿{(dc.totalPromptPay ?? dc.promptpaySales).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        ฿{(dc.actualCashCounted ?? dc.actualCash).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {dc.cashDifference === 0 ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                            ตรงพอดี (฿0)
                          </span>
                        ) : dc.cashDifference > 0 ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                            +฿{dc.cashDifference} (เกิน)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">
                            -฿{Math.abs(dc.cashDifference)} (ขาด)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600">{dc.closedBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: DAILY CLOSING & CASH COUNTING RECONCILIATION */}
      {isCloseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 my-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-slate-900">
                  ปิดยอดประจำวัน & ตรวจนับเงินสดในลิ้นชัก
                </h3>
              </div>
            </div>

            <form onSubmit={handleConfirmCloseToday} className="space-y-4 text-xs">
              {/* Summary Cards */}
              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>ยอดขายรวมทั้งหมดวันนี้:</span>
                  <span className="font-bold text-slate-900">฿{dayTotalSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>ยอดเงินสดที่ขายได้:</span>
                  <span className="font-bold text-emerald-700">+฿{dayCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>ยอดโอนพร้อมเพย์ QR:</span>
                  <span className="font-bold text-blue-700">฿{dayPromptPay.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>ยอดบัตรเครดิต:</span>
                  <span className="font-bold text-indigo-700">฿{dayCard.toFixed(2)}</span>
                </div>
              </div>

              {/* Cash Reconciliation */}
              <div className="space-y-3 border-t border-slate-200 pt-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    เงินทอนตั้งต้นเปิดร้าน (Opening Cash):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
                  <span className="font-bold text-emerald-900">
                    เงินสดที่ควรมีในลิ้นชัก (ทอน + ขาย):
                  </span>
                  <span className="text-base font-black text-emerald-800">
                    ฿{expectedCashInDrawer.toFixed(2)}
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    เงินสดที่นับได้จริงในลิ้นชัก (Actual Counted):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={actualCashCounted === 0 ? '' : actualCashCounted}
                    onChange={(e) => setActualCashCounted(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 text-lg font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>

                {/* Diff Result */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between font-bold ${
                    cashDifference === 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : cashDifference > 0
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <span>ส่วนต่างเงินสด:</span>
                  <span>
                    {cashDifference === 0
                      ? '✓ เงินในลิ้นชักตรงพอดี'
                      : cashDifference > 0
                      ? `เงินเกิน +฿${cashDifference.toFixed(2)}`
                      : `เงินขาด -฿${Math.abs(cashDifference).toFixed(2)}`}
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    หมายเหตุ / บันทึกเพิ่มเติม:
                  </label>
                  <textarea
                    rows={2}
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="เช่น เงินเหรียญทอนครบถ้วน ยอดขายช่วงเย็นดีมาก..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 rounded-xl shadow-xs"
                >
                  ยืนยันบันทึกปิดยอด
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
