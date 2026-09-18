import React, { useState, useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  ShoppingBag,
  AlertTriangle,
  Banknote,
  QrCode,
  CreditCard,
  Calendar,
  ArrowRight,
  Sparkles,
  Package,
  Users,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DashboardViewProps {
  onNavigate: (tab: 'pos' | 'inventory' | 'queue' | 'reports' | 'staff' | 'guide') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { products, transactions, settings, currentStaff } = usePOS();
  const [chartRange, setChartRange] = useState<'7' | '30'>('7');

  const todayStr = new Date().toISOString().split('T')[0];

  // Yesterday date string
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // This month prefix YYYY-MM
  const thisMonthStr = todayStr.substring(0, 7);

  // Today's completed transactions
  const todayTx = useMemo(() => {
    return transactions.filter((t) => t.dateStr === todayStr && t.status === 'completed');
  }, [transactions, todayStr]);

  // Yesterday's completed transactions
  const yesterdayTx = useMemo(() => {
    return transactions.filter((t) => t.dateStr === yesterdayStr && t.status === 'completed');
  }, [transactions, yesterdayStr]);

  // This month completed transactions
  const thisMonthTx = useMemo(() => {
    return transactions.filter(
      (t) => t.dateStr.startsWith(thisMonthStr) && t.status === 'completed'
    );
  }, [transactions, thisMonthStr]);

  // Calculations: Today
  const todaySales = todayTx.reduce((sum, t) => sum + t.grandTotal, 0);
  const todayBills = todayTx.length;

  let todayCost = 0;
  todayTx.forEach((t) => {
    t.items.forEach((i) => {
      todayCost += i.costPrice * i.quantity;
    });
  });
  const todayProfit = Math.max(0, todaySales - todayCost);

  // Yesterday
  const yesterdaySales = yesterdayTx.reduce((sum, t) => sum + t.grandTotal, 0);
  const salesChangeVsYesterday =
    yesterdaySales > 0
      ? (((todaySales - yesterdaySales) / yesterdaySales) * 100).toFixed(1)
      : null;

  // Month
  const thisMonthSales = thisMonthTx.reduce((sum, t) => sum + t.grandTotal, 0);

  // Payment channels today
  let todayCash = 0;
  let todayQR = 0;
  let todayCard = 0;

  todayTx.forEach((t) => {
    if (t.paymentMethod === 'cash') todayCash += t.grandTotal;
    else if (t.paymentMethod === 'promptpay') todayQR += t.grandTotal;
    else if (t.paymentMethod === 'card') todayCard += t.grandTotal;
    else if (t.paymentMethod === 'split' && t.splitDetails) {
      todayCash += t.splitDetails.cash;
      todayQR += t.splitDetails.promptpay;
      todayCard += t.splitDetails.card;
    }
  });

  // Low stock products
  const lowStockProducts = useMemo(() => {
    return products
      .filter((p) => p.stock <= p.minStock)
      .sort((a, b) => a.stock - b.stock);
  }, [products]);

  // Top selling products (all completed tx)
  const topSellingProducts = useMemo(() => {
    const map: Record<string, { product: any; count: number; revenue: number }> = {};

    transactions
      .filter((t) => t.status === 'completed')
      .forEach((t) => {
        t.items.forEach((item) => {
          if (!map[item.productId]) {
            const pObj = products.find((p) => p.id === item.productId);
            map[item.productId] = {
              product: pObj || { name: item.productName, image: '', category: '' },
              count: 0,
              revenue: 0,
            };
          }
          map[item.productId].count += item.quantity;
          map[item.productId].revenue += item.subtotal;
        });
      });

    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [transactions, products]);

  // Chart data: 7 days or 30 days
  const chartData = useMemo(() => {
    const days = chartRange === '7' ? 7 : 30;
    const result = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;

      const dayTransactions = transactions.filter(
        (t) => t.dateStr === dStr && t.status === 'completed'
      );
      const daySales = dayTransactions.reduce((sum, t) => sum + t.grandTotal, 0);

      result.push({
        date: dStr,
        label: dayLabel,
        sales: daySales,
        bills: dayTransactions.length,
      });
    }

    return result;
  }, [transactions, chartRange]);

  return (
    <div id="dashboard-view" className="p-4 max-w-7xl mx-auto space-y-5">
      {/* Welcome & Quick Action Bar */}
      <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-4 border border-pink-500/50">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="px-2.5 py-0.5 bg-amber-300 text-pink-950 font-black text-[11px] rounded-full shadow-xs">
              ร้านเดียวครบ จบที่...
            </span>
            <span className="text-xs text-pink-100">
              แคชเชียร์: <b className="text-white font-bold">{currentStaff.name}</b>
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-xs">{settings.storeName}</h2>
          <p className="text-xs text-pink-100/90 font-medium">
            {settings.storeBranch} • จำหน่ายสินค้าเบ็ดเตล็ด แฟชั่นตามกระแส ระบบพร้อมเปิดขายจริง
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            id="quick-nav-pos-btn"
            onClick={() => onNavigate('pos')}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-300 hover:bg-amber-200 active:bg-amber-400 text-pink-950 text-xs font-black rounded-xl shadow-md transition transform hover:-translate-y-0.5"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>เปิดหน้าขาย POS</span>
          </button>

          <button
            onClick={() => onNavigate('inventory')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-xl border border-white/30 transition"
          >
            <Package className="w-4 h-4 text-pink-200" />
            <span>จัดการสต็อกสินค้า</span>
          </button>

          <button
            onClick={() => onNavigate('queue')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-xl border border-white/30 transition"
          >
            <Users className="w-4 h-4 text-pink-200" />
            <span>ระบบเรียกคิว</span>
          </button>

          <button
            onClick={() => onNavigate('guide')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-xl border border-white/30 transition"
            title="เปิดอ่านคู่มือและวิธีใช้งานระบบ"
          >
            <BookOpen className="w-4 h-4 text-amber-300" />
            <span>คู่มือเริ่มต้นใช้งาน</span>
          </button>
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Sales */}
        <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>ยอดขายวันนี้</span>
            <div className="p-2 bg-pink-50 text-pink-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-pink-600 tracking-tight">
              ฿{todaySales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              {salesChangeVsYesterday !== null ? (
                Number(salesChangeVsYesterday) >= 0 ? (
                  <span className="text-pink-600 font-bold flex items-center">
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" />+{salesChangeVsYesterday}%
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold flex items-center">
                    <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                    {salesChangeVsYesterday}%
                  </span>
                )
              ) : (
                <span className="text-slate-400">เมื่อวาน ฿{yesterdaySales.toLocaleString()}</span>
              )}
              <span className="text-slate-400 text-[11px]">เทียบกับเมื่อวาน</span>
            </div>
          </div>
        </div>

        {/* Card 2: Today's Bills */}
        <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>จำนวนบิลวันนี้</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {todayBills} <span className="text-sm font-normal text-slate-500">บิล</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              เฉลี่ย ฿{(todayBills > 0 ? todaySales / todayBills : 0).toFixed(2)} / บิล
            </div>
          </div>
        </div>

        {/* Card 3: Today's Profit */}
        <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>กำไรขั้นต้นวันนี้</span>
            <div className="p-2 bg-pink-50 text-pink-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-pink-600 tracking-tight">
              ฿{todayProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              อัตรากำไร {todaySales > 0 ? ((todayProfit / todaySales) * 100).toFixed(0) : 0}% ของยอดขาย
            </div>
          </div>
        </div>

        {/* Card 4: This Month Sales */}
        <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>ยอดขายเดือนนี้</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ฿{thisMonthSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              สะสมในเดือน {thisMonthStr}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Channels Today Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            ยอดเงินที่รับเข้าวันนี้ แยกตามช่องทางชำระเงิน (Payment Split):
          </span>
          <span className="text-[11px] text-slate-400">
            รวม ฿{todaySales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                <Banknote className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">เงินสด (Cash)</div>
                <div className="text-[10px] text-slate-500">ในลิ้นชัก</div>
              </div>
            </div>
            <div className="text-sm font-black text-emerald-800">
              ฿{todayCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">พร้อมเพย์ QR</div>
                <div className="text-[10px] text-slate-500">เงินโอนเข้าบัญชี</div>
              </div>
            </div>
            <div className="text-sm font-black text-blue-800">
              ฿{todayQR.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-100 text-indigo-800 rounded-lg">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">บัตรเครดิต</div>
                <div className="text-[10px] text-slate-500">เครื่องรูดบัตร</div>
              </div>
            </div>
            <div className="text-sm font-black text-indigo-800">
              ฿{todayCard.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Sales Trend Chart (7 vs 30 days) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              แนวโน้มยอดขาย {chartRange === '7' ? '7 วันที่ผ่านมา' : '30 วันที่ผ่านมา'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              ติดตามปริมาณยอดขายและจำนวนบิลในแต่ละวัน
            </p>
          </div>

          <div className="flex gap-1 p-1 bg-pink-50 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setChartRange('7')}
              className={`px-3 py-1 rounded-lg transition ${
                chartRange === '7' ? 'bg-white text-pink-700 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              7 วันล่าสุด
            </button>
            <button
              onClick={() => setChartRange('30')}
              className={`px-3 py-1 rounded-lg transition ${
                chartRange === '30' ? 'bg-white text-pink-700 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              30 วันล่าสุด
            </button>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#db2777" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#db2777" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip
                formatter={(value: any) => [`฿${Number(value).toLocaleString()}`, 'ยอดขาย']}
                labelFormatter={(label: any) => `วันที่ ${label}`}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#db2777"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#salesGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Columns: Top Selling vs Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Selling Products */}
        <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>สินค้าขายดีที่สุด (Top Sellers)</span>
              </h3>
              <button
                onClick={() => onNavigate('reports')}
                className="text-xs text-pink-600 font-bold hover:underline flex items-center gap-0.5"
              >
                <span>ดูรายงานเต็ม</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {topSellingProducts.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">ยังไม่มีข้อมูลการขาย</div>
              ) : (
                topSellingProducts.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-black text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">{item.product.name}</div>
                        <div className="text-[10px] text-slate-400">
                          ขายได้แล้ว {item.count} ชิ้น
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-black text-pink-600">
                      ฿{item.revenue.toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>สินค้าใกล้หมด & หมดสต็อก ({lowStockProducts.length})</span>
              </h3>
              <button
                onClick={() => onNavigate('inventory')}
                className="text-xs text-pink-600 font-bold hover:underline flex items-center gap-0.5"
              >
                <span>ไปเติมสต็อก</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {lowStockProducts.length === 0 ? (
                <div className="text-center py-8 text-xs text-pink-700 font-medium">
                  ✓ สต็อกสินค้าทุกรายการอยู่ในระดับปลอดภัย
                </div>
              ) : (
                lowStockProducts.slice(0, 5).map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[10px] text-slate-400">
                        SKU: {p.sku} | จุดเตือน: {p.minStock} {p.unit}
                      </div>
                    </div>
                    <div>
                      {p.stock <= 0 ? (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-full text-[10px]">
                          หมดสต็อก (0 {p.unit})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px]">
                          เหลือ {p.stock} {p.unit}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
