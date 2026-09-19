import React from 'react';
import { usePOS } from '../context/POSContext';
import {
  Store,
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  BarChart3,
  Settings,
  Lock,
  UserCheck,
  BookOpen,
  FileSpreadsheet,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'pos' | 'inventory' | 'queue' | 'reports' | 'staff' | 'guide';
  onSelectTab: (tab: 'dashboard' | 'pos' | 'inventory' | 'queue' | 'reports' | 'staff' | 'guide') => void;
  onOpenGoogleSheets?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onSelectTab, onOpenGoogleSheets }) => {
  const { settings, currentStaff, cart, products, queues, isTodayClosed, isOnline, syncStatus } = usePOS();

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
  const waitingQueuesCount = queues.filter((q) => q.status === 'waiting').length;

  return (
    <header className="bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 text-white border-b border-pink-700/60 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs border border-white/40 flex items-center justify-center shadow-md group-hover:scale-105 transition">
              <Store className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base leading-tight flex items-center gap-2">
                <span className="tracking-tight">{settings.storeName}</span>
                <span className="hidden sm:inline-block px-2 py-0.5 bg-amber-300 text-pink-950 text-[10px] font-black rounded-md shadow-xs">
                  ร้านเดียวครบ จบที่...
                </span>
              </div>
              <div className="text-[10px] text-pink-100/90">{settings.storeBranch}</div>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              id="nav-dashboard-btn"
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'dashboard'
                  ? 'bg-white text-pink-700 shadow-sm'
                  : 'text-pink-100 hover:bg-white/15 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>แดชบอร์ด</span>
            </button>

            <button
              id="nav-pos-btn"
              onClick={() => onSelectTab('pos')}
              className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition ${
                activeTab === 'pos'
                  ? 'bg-white text-pink-700 shadow-md'
                  : 'bg-amber-300 hover:bg-amber-200 text-pink-950 shadow-sm'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>ขายหน้าร้าน (POS)</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-xs border border-white">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              id="nav-inventory-btn"
              onClick={() => onSelectTab('inventory')}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'inventory'
                  ? 'bg-white text-pink-700 shadow-sm'
                  : 'text-pink-100 hover:bg-white/15 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>สต็อกสินค้า</span>
              {lowStockCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-900 text-white text-[9px] font-bold rounded-full">
                  {lowStockCount}
                </span>
              )}
            </button>

            <button
              id="nav-queue-btn"
              onClick={() => onSelectTab('queue')}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'queue'
                  ? 'bg-white text-pink-700 shadow-sm'
                  : 'text-pink-100 hover:bg-white/15 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>ระบบคิว</span>
              {waitingQueuesCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-300 text-pink-950 text-[9px] font-black rounded-full">
                  {waitingQueuesCount}
                </span>
              )}
            </button>

            <button
              id="nav-reports-btn"
              onClick={() => onSelectTab('reports')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'reports'
                  ? 'bg-white text-pink-700 shadow-sm'
                  : 'text-pink-100 hover:bg-white/15 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>สรุปยอดขาย</span>
            </button>

            <button
              id="nav-staff-btn"
              onClick={() => onSelectTab('staff')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'staff'
                  ? 'bg-white text-pink-700 shadow-sm'
                  : 'text-pink-100 hover:bg-white/15 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>พนักงาน/ตั้งค่า</span>
            </button>

            <button
              id="nav-guide-btn"
              onClick={() => onSelectTab('guide')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'guide'
                  ? 'bg-white text-pink-700 shadow-sm'
                  : 'text-pink-100 hover:bg-white/15 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>คู่มือการใช้งาน</span>
            </button>
          </nav>

          {/* Right Staff & Status Badge */}
          <div className="flex items-center gap-2">
            {/* Real-time Central Cloud Database Status */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] border transition ${
                !isOnline || syncStatus === 'offline'
                  ? 'bg-rose-500/25 border-rose-400/40 text-rose-100'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-400/25 border-amber-300/40 text-amber-100'
                  : 'bg-emerald-500/20 border-emerald-300/30 text-emerald-100'
              }`}
              title={
                !isOnline || syncStatus === 'offline'
                  ? 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต ข้อมูลยังไม่ได้ซิงก์'
                  : 'เชื่อมต่อฐานข้อมูลออนไลน์กลาง (Firestore) เรียบร้อย - ทุกเครื่องซิงก์ข้อมูลตรงกันแบบ Real-time'
              }
            >
              {!isOnline || syncStatus === 'offline' ? (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-rose-300" />
                  <span className="hidden sm:inline font-bold">ออฟไลน์</span>
                </>
              ) : syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                  <span className="hidden sm:inline font-bold">กำลังซิงก์</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                  <span className="hidden sm:inline font-bold">ฐานข้อมูลออนไลน์</span>
                </>
              )}
            </div>

            {/* Google Sheets Sync Trigger */}
            {onOpenGoogleSheets && (
              <button
                id="navbar-sheets-sync-btn"
                onClick={onOpenGoogleSheets}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/90 hover:bg-emerald-400 text-white rounded-xl transition text-xs font-bold border border-emerald-300/40 shadow-xs active:scale-95"
                title="เปิดระบบจัดการและซิงค์ข้อมูล Google Sheets"
              >
                <FileSpreadsheet className="w-4 h-4 text-white" />
                <span className="hidden sm:inline">Google Sheets</span>
              </button>
            )}

            {/* Daily status */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-black/20 rounded-xl text-[11px] border border-white/20">
              <span
                className={`w-2 h-2 rounded-full ${
                  isTodayClosed ? 'bg-amber-300' : 'bg-emerald-300 animate-pulse'
                }`}
              />
              <span className="text-white font-medium">
                {isTodayClosed ? 'ปิดกะวันนี้แล้ว' : 'กำลังเปิดขาย'}
              </span>
            </div>

            {/* Current Staff Badge */}
            <button
              onClick={() => onSelectTab('staff')}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 bg-white/20 hover:bg-white/30 rounded-xl transition text-xs border border-white/30 text-white"
              title="คลิกเพื่อสลับผู้ใช้งานพนักงาน"
            >
              <div className="w-6 h-6 rounded-lg bg-white text-pink-700 flex items-center justify-center font-black text-xs shadow-xs">
                {currentStaff.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="font-bold text-white truncate max-w-[100px]">
                  {currentStaff.name}
                </div>
                <div className="text-[10px] text-pink-100 capitalize">
                  {currentStaff.role}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden border-t border-pink-200 bg-white/95 backdrop-blur-md fixed bottom-0 left-0 right-0 z-40 py-2 px-2 flex justify-around shadow-lg">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] ${
            activeTab === 'dashboard' ? 'text-pink-600 font-bold' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>หน้าแรก</span>
        </button>

        <button
          onClick={() => onSelectTab('pos')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] relative ${
            activeTab === 'pos' ? 'text-pink-600 font-bold' : 'text-slate-500'
          }`}
        >
          <ShoppingBag className="w-4 h-4 mb-0.5" />
          <span>ขาย POS</span>
          {cartCount > 0 && (
            <span className="absolute top-0 right-1 bg-pink-600 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectTab('inventory')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] ${
            activeTab === 'inventory' ? 'text-pink-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Package className="w-4 h-4 mb-0.5" />
          <span>สต็อก</span>
        </button>

        <button
          onClick={() => onSelectTab('queue')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] ${
            activeTab === 'queue' ? 'text-pink-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span>คิว</span>
        </button>

        <button
          onClick={() => onSelectTab('reports')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] ${
            activeTab === 'reports' ? 'text-pink-600 font-bold' : 'text-slate-500'
          }`}
        >
          <BarChart3 className="w-4 h-4 mb-0.5" />
          <span>รายงาน</span>
        </button>

        <button
          onClick={() => onSelectTab('staff')}
          className={`flex flex-col items-center py-1 px-1.5 rounded-lg text-[10px] ${
            activeTab === 'staff' ? 'text-pink-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Settings className="w-4 h-4 mb-0.5" />
          <span>ตั้งค่า</span>
        </button>

        <button
          onClick={() => onSelectTab('guide')}
          className={`flex flex-col items-center py-1 px-1.5 rounded-lg text-[10px] ${
            activeTab === 'guide' ? 'text-pink-600 font-bold' : 'text-slate-500'
          }`}
        >
          <BookOpen className="w-4 h-4 mb-0.5" />
          <span>คู่มือ</span>
        </button>
      </div>
    </header>
  );
};
