import React, { useState, useRef } from 'react';
import { usePOS } from '../context/POSContext';
import { StaffUser, StoreSettings } from '../types';
import { exportSystemBackup, importSystemBackup } from '../utils/storageDB';
import {
  Users,
  ShieldCheck,
  Store,
  KeyRound,
  History,
  Check,
  Save,
  Plus,
  Trash2,
  Lock,
  Phone,
  QrCode,
  FileText,
  Download,
  Upload,
  Database,
} from 'lucide-react';

export const DataBackupSection: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (confirm('การกู้คืนข้อมูลจะแทนที่ข้อมูลปัจจุบันทั้งหมด ต้องการดำเนินการต่อหรือไม่?')) {
      const success = await importSystemBackup(file);
      if (success) {
        alert('กู้คืนข้อมูลสำเร็จ! ระบบจะรีเฟรชหน้าจอเพื่อโหลดข้อมูลใหม่');
        window.location.reload();
      } else {
        alert('เกิดข้อผิดพลาดในการกู้คืนข้อมูล ไฟล์ไม่ถูกต้อง');
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-xs space-y-4">
      <div className="flex items-center gap-2 text-slate-900 font-bold">
        <ShieldCheck className="w-5 h-5 text-pink-600" />
        <h3>ระบบสำรองและกู้คืนข้อมูล (Data Backup & Security)</h3>
      </div>
      <p className="text-xs text-slate-500">
        ป้องกันข้อมูลสูญหายด้วยการสำรองฐานข้อมูล IndexedDB & LocalStorage เก็บไว้เป็นไฟล์ JSON หรือกู้คืนข้อมูลเดิมได้ตลอดเวลา
      </p>

      <div className="flex flex-wrap gap-3 pt-2">
        {/* ปุ่มสำรองข้อมูล */}
        <button
          onClick={exportSystemBackup}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 active:from-pink-700 active:to-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
        >
          <Download className="w-4 h-4" />
          <span>ดาวน์โหลดไฟล์สำรองข้อมูล (Backup JSON)</span>
        </button>

        {/* ปุ่มกู้คืนข้อมูล */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold rounded-xl shadow-xs transition"
        >
          <Upload className="w-4 h-4 text-pink-300" />
          <span>กู้คืนข้อมูลจากไฟล์ (Restore)</span>
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />
      </div>
    </div>
  );
};

export const StaffSettingsView: React.FC = () => {
  const {
    staffList,
    currentStaff,
    activityLogs,
    settings,
    switchStaff,
    addStaff,
    updateStaff,
    deleteStaff,
    updateSettings,
  } = usePOS();

  const [activeTab, setActiveTab] = useState<'staff' | 'logs' | 'store' | 'backup'>('staff');

  // Switch staff pin modal
  const [targetSwitchStaff, setTargetSwitchStaff] = useState<StaffUser | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Add staff modal
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'manager' | 'cashier'>('cashier');
  const [newStaffPin, setNewStaffPin] = useState('1234');

  // Store settings form state
  const [storeForm, setStoreForm] = useState<StoreSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Switch user handler
  const handleConfirmSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSwitchStaff) return;
    if (targetSwitchStaff.pin !== pinInput.trim()) {
      setPinError('รหัส PIN ไม่ถูกต้อง (ลองใช้ 1234)');
      return;
    }
    switchStaff(targetSwitchStaff);
    setTargetSwitchStaff(null);
    setPinInput('');
    setPinError('');
  };

  // Add staff handler
  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    addStaff(newStaffName.trim(), newStaffRole, newStaffPin || '1234');
    setIsAddStaffOpen(false);
    setNewStaffName('');
    setNewStaffPin('1234');
  };

  // Save store settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(storeForm);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div id="staff-settings-view" className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-pink-600" />
            <span>ระบบพนักงาน สิทธิ์ และตั้งค่าร้านค้า</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ผู้ใช้งานปัจจุบัน: <span className="font-bold text-slate-800">{currentStaff.name}</span> (
            <span className="capitalize font-semibold text-pink-600">{currentStaff.role}</span>)
          </p>
        </div>

        <div className="flex gap-2">
          {/* Add Staff button */}
          {currentStaff.role === 'admin' && activeTab === 'staff' && (
            <button
              onClick={() => setIsAddStaffOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มพนักงานใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-2.5 rounded-2xl border border-pink-100 shadow-xs">
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'staff'
              ? 'bg-pink-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-pink-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>รายชื่อพนักงาน ({staffList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('store')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'store'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-rose-50'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>ข้อมูลร้านค้า & พร้อมเพย์ QR</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'backup'
              ? 'bg-fuchsia-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-fuchsia-50'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>สำรอง & กู้คืนข้อมูล (IndexedDB)</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'logs'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>บันทึกการกระทำ (Activity Logs)</span>
        </button>
      </div>

      {/* TAB 1: STAFF LIST */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map((staff) => {
            const isCurrentUser = staff.id === currentStaff.id;

            return (
              <div
                key={staff.id}
                className={`bg-white rounded-2xl p-5 border transition flex flex-col justify-between shadow-xs ${
                  isCurrentUser
                    ? 'border-pink-500 ring-2 ring-pink-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
                          staff.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : staff.role === 'manager'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-pink-100 text-pink-700'
                        }`}
                      >
                        {staff.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          <span>{staff.name}</span>
                          {isCurrentUser && (
                            <span className="px-1.5 py-0.5 bg-pink-100 text-pink-800 text-[10px] font-bold rounded">
                              กำลังใช้งาน
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 capitalize">
                          {staff.role === 'admin'
                            ? '👑 เจ้าของร้าน (Admin)'
                            : staff.role === 'manager'
                            ? '💼 ผู้จัดการ (Manager)'
                            : '🛒 แคชเชียร์ (Cashier)'}
                        </div>
                      </div>
                    </div>

                    {currentStaff.role === 'admin' && !isCurrentUser && (
                      <button
                        onClick={() => {
                          if (confirm(`คุณต้องการลบพนักงาน "${staff.name}" หรือไม่?`)) {
                            deleteStaff(staff.id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="ลบพนักงาน"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>รหัสพนักงาน:</span>
                      <span className="font-mono text-slate-800 font-semibold">{staff.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>รหัส PIN:</span>
                      <span className="font-mono text-slate-800">•••• ({staff.pin})</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  {isCurrentUser ? (
                    <div className="w-full py-2 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-xl text-center border border-emerald-200">
                      เข้าสู่ระบบในชื่อนี้อยู่แล้ว
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setTargetSwitchStaff(staff);
                        setPinInput('');
                        setPinError('');
                      }}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                      <span>สลับเข้าใช้งานผู้ใช้นี้ (Switch)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: STORE SETTINGS */}
      {activeTab === 'store' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h3 className="font-bold text-base text-slate-900">ตั้งค่าข้อมูลร้านค้า & ระบบใบเสร็จ</h3>
              <p className="text-xs text-slate-500">
                ข้อมูลเหล่านี้จะปรากฏบนหัวและท้ายใบเสร็จรับเงิน และใช้สร้าง QR Code ชำระเงิน
              </p>
            </div>
            {savedSuccess && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg animate-in fade-in">
                <Check className="w-4 h-4" />
                <span>บันทึกสำเร็จ</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อร้านค้า: *</label>
                <input
                  type="text"
                  required
                  value={storeForm.storeName}
                  onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อสาขา: *</label>
                <input
                  type="text"
                  required
                  value={storeForm.storeBranch}
                  onChange={(e) => setStoreForm({ ...storeForm, storeBranch: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">ที่อยู่ร้าน:</label>
                <input
                  type="text"
                  value={storeForm.storeAddress}
                  onChange={(e) => setStoreForm({ ...storeForm, storeAddress: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ร้าน:</label>
                <input
                  type="text"
                  value={storeForm.storePhone}
                  onChange={(e) => setStoreForm({ ...storeForm, storePhone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เลขประจำตัวผู้เสียภาษี (Tax ID):
                </label>
                <input
                  type="text"
                  value={storeForm.taxId}
                  onChange={(e) => setStoreForm({ ...storeForm, taxId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2 p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                  <QrCode className="w-5 h-5 text-blue-600" />
                  <span>ตั้งค่าพร้อมเพย์ QR Code (PromptPay Integration)</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    เบอร์พร้อมเพย์ (PromptPay ID) สำหรับรับเงิน: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 0812345678 หรือ เลขบัตร ปชช. 13 หลัก"
                    value={storeForm.promptPayId}
                    onChange={(e) => setStoreForm({ ...storeForm, promptPayId: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl font-mono text-sm font-bold text-blue-950 focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-blue-800/80 mt-1">
                    ระบบจะนำเลขนี้ไปสร้าง EMVCo QR Code Dynamic แบบระบุยอดเงินให้อัตโนมัติทุกครั้งที่ลูกค้าเลือกจ่ายด้วยพร้อมเพย์
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  อัตราภาษีมูลค่าเพิ่ม VAT (%):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={storeForm.vatRate}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, vatRate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  ข้อความท้ายใบเสร็จ (Receipt Footer):
                </label>
                <input
                  type="text"
                  value={storeForm.receiptFooterMessage}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, receiptFooterMessage: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 active:from-pink-700 active:to-rose-700 text-white font-bold rounded-xl shadow-xs transition"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกการตั้งค่าร้านค้า</span>
              </button>
            </div>
          </form>

          {/* Integrated Data Backup in Store settings */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <DataBackupSection />
          </div>
        </div>
      )}

      {/* TAB: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="max-w-3xl space-y-4">
          <DataBackupSection />

          {/* Database Health Info */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>สถานะการทำงานของระบบฐานข้อมูล (IndexedDB Engine)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10px]">ไดรเวอร์ฐานข้อมูล:</span>
                <span className="font-bold text-slate-800 font-mono">localForage (IndexedDB + LocalStorage)</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10px]">ชื่อฐานข้อมูล:</span>
                <span className="font-bold text-slate-800 font-mono">ThaiPOS_Pro_DB</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10px]">ตารางจัดเก็บ:</span>
                <span className="font-bold text-slate-800 font-mono">pos_secure_storage</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-emerald-700 block text-[10px]">สถานะการป้องกันข้อมูล:</span>
                <span className="font-bold text-emerald-900">✓ บันทึกอัตโนมัติทุกครั้งที่มีการเปลี่ยนแปลง</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVITY LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                ประวัติการใช้งานและบันทึกการทำงานของพนักงาน (Audit Activity Logs)
              </h3>
              <p className="text-xs text-slate-500">
                เก็บบันทึกการเข้าสู่ระบบ, การขาย, การคืนบิล, และการปรับปรุงสต็อก
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">วัน-เวลา</th>
                  <th className="py-3 px-3">พนักงาน</th>
                  <th className="py-3 px-3">ประเภทการกระทำ</th>
                  <th className="py-3 px-4">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activityLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400">
                      ยังไม่มีประวัติการใช้งาน
                    </td>
                  </tr>
                ) : (
                  activityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">
                        {new Date(log.timestamp).toLocaleString('th-TH')}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {log.staffName}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium uppercase">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: SWITCH STAFF WITH PIN */}
      {targetSwitchStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center mx-auto mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-slate-900">
                ยืนยันรหัส PIN พนักงาน
              </h4>
              <p className="text-xs text-slate-500">
                กำลังสลับเข้าสู่: <span className="font-bold text-slate-800">{targetSwitchStaff.name}</span>
              </p>
            </div>

            <form onSubmit={handleConfirmSwitch} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="กรอกรหัส PIN (เช่น 1234)"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full text-center tracking-widest text-2xl font-bold py-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  autoFocus
                />
                {pinError && (
                  <p className="text-xs text-rose-600 mt-1.5 text-center font-medium">
                    {pinError}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTargetSwitchStaff(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 rounded-xl shadow-xs"
                >
                  ยืนยัน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW STAFF */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            <h4 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-2">
              เพิ่มพนักงานใหม่
            </h4>

            <form onSubmit={handleAddStaffSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อพนักงาน: *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สมชาย ใจดี"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-pink-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">บทบาท / ตำแหน่ง:</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-1 focus:ring-pink-500"
                >
                  <option value="cashier">แคชเชียร์ (Cashier) - ขายสินค้าและดูคิว</option>
                  <option value="manager">ผู้จัดการ (Manager) - จัดการสต็อกและดูรายงาน</option>
                  <option value="admin">เจ้าของร้าน (Admin) - จัดการได้ทุกส่วน</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">รหัส PIN (4 หลัก):</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={newStaffPin}
                  onChange={(e) => setNewStaffPin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 rounded-xl shadow-xs"
                >
                  บันทึกพนักงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
