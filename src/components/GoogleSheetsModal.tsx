import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CloudUpload,
  CloudDownload,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  LogIn,
  LogOut,
  FolderOpen,
  X,
  Database,
  ArrowRight,
  Sheet,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  initGoogleAuth,
  googleSignIn,
  googleSignOut,
  getAccessToken,
  subscribeToGoogleAuth,
} from '../utils/googleAuth';
import {
  listUserSpreadsheets,
  getSpreadsheetDetails,
  createStoreSpreadsheet,
  exportInventoryToSheets,
  exportSalesToSheets,
  exportClosingsToSheets,
  importInventoryFromSheets,
  SpreadsheetInfo,
  SheetMetadata,
} from '../utils/googleSheetsService';
import { usePOS } from '../context/POSContext';
import { Product } from '../types';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'export' | 'import' | 'settings';
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'export',
}) => {
  const { products, transactions, dailyClosings, settings, importProductsBulk } = usePOS();

  // Auth states
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'settings'>(defaultTab);

  // Spreadsheet Selection
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('ok_sure_google_sheet_id') || '';
  });
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>('');
  const [availableSheets, setAvailableSheets] = useState<SheetMetadata[]>([]);
  const [selectedSheetTab, setSelectedSheetTab] = useState<string>('สินค้าและสต็อก');

  // Drive files list
  const [recentSpreadsheets, setRecentSpreadsheets] = useState<SpreadsheetInfo[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState<boolean>(false);

  // Action status states
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Import preview state
  const [isReadingSheet, setIsReadingSheet] = useState<boolean>(false);
  const [previewProducts, setPreviewProducts] = useState<Product[]>([]);
  const [skippedRows, setSkippedRows] = useState<number>(0);
  const [importConfirmOpen, setImportConfirmOpen] = useState<boolean>(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  // Initialize auth listener
  useEffect(() => {
    const unsub = subscribeToGoogleAuth((user, token) => {
      setGoogleUser(user);
      setAccessToken(token);
    });
    const authUnsub = initGoogleAuth();
    return () => {
      unsub();
      if (authUnsub) authUnsub();
    };
  }, []);

  // Save selected spreadsheet ID to storage
  useEffect(() => {
    if (spreadsheetId) {
      localStorage.setItem('ok_sure_google_sheet_id', spreadsheetId);
    }
  }, [spreadsheetId]);

  // Load details when token and spreadsheetId exist
  useEffect(() => {
    if (accessToken && spreadsheetId) {
      getSpreadsheetDetails(accessToken, spreadsheetId)
        .then((details) => {
          setSpreadsheetTitle(details.title);
          setAvailableSheets(details.sheets);
          if (details.sheets.length > 0) {
            const hasDefault = details.sheets.some((s) => s.title === 'สินค้าและสต็อก');
            setSelectedSheetTab(hasDefault ? 'สินค้าและสต็อก' : details.sheets[0].title);
          }
        })
        .catch((err) => {
          console.warn('Could not fetch sheet details:', err);
        });
    }
  }, [accessToken, spreadsheetId]);

  // Fetch recent spreadsheets from Drive
  const handleFetchRecentSheets = async () => {
    if (!accessToken) return;
    setIsLoadingFiles(true);
    try {
      const files = await listUserSpreadsheets(accessToken);
      setRecentSpreadsheets(files);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'ไม่สามารถดึงรายการไฟล์ Google Sheets ได้' });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (accessToken && isOpen && recentSpreadsheets.length === 0) {
      handleFetchRecentSheets();
    }
  }, [accessToken, isOpen]);

  // Handle Sign In with Google
  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setStatusMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        setStatusMessage({
          type: 'success',
          text: `เชื่อมต่อ Google Account: ${res.user.email} สำเร็จ!`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'เกิดข้อผิดพลาดในการลงชื่อเข้าใช้ด้วย Google',
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    await googleSignOut();
    setGoogleUser(null);
    setAccessToken(null);
    setStatusMessage({ type: 'info', text: 'ออกจากระบบ Google เรียบร้อยแล้ว' });
  };

  // Create a brand new Spreadsheet in user's Drive
  const handleCreateNewSheet = async () => {
    if (!accessToken) return;
    setIsCreatingSheet(true);
    setStatusMessage(null);
    try {
      const { spreadsheetId: newId, url } = await createStoreSpreadsheet(
        accessToken,
        settings.storeName || 'โอเค ชัวร์'
      );
      setSpreadsheetId(newId);
      setStatusMessage({
        type: 'success',
        text: `สร้าง Google Spreadsheet ใหม่สำเร็จ! กำลังเชื่อมต่อ...`,
      });
      // Refresh details
      const details = await getSpreadsheetDetails(accessToken, newId);
      setSpreadsheetTitle(details.title);
      setAvailableSheets(details.sheets);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'เกิดข้อผิดพลาดในการสร้าง Google Spreadsheet',
      });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Export actions
  const handleExportInventory = async () => {
    if (!accessToken || !spreadsheetId) return;
    setIsExporting('inventory');
    setStatusMessage(null);
    try {
      const res = await exportInventoryToSheets(accessToken, spreadsheetId, products);
      setStatusMessage({
        type: 'success',
        text: `ส่งออกข้อมูลสินค้าสำเร็จ ${res.rowsUpdated} รายการ ลงในแผ่นงาน "สินค้าและสต็อก"`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการส่งออกสต็อกสินค้า' });
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportSales = async () => {
    if (!accessToken || !spreadsheetId) return;
    setIsExporting('sales');
    setStatusMessage(null);
    try {
      const res = await exportSalesToSheets(accessToken, spreadsheetId, transactions);
      setStatusMessage({
        type: 'success',
        text: `ส่งออกประวัติการขายสำเร็จ ${res.rowsUpdated} รายการ ลงในแผ่นงาน "ประวัติการขาย"`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการส่งออกประวัติการขาย' });
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportClosings = async () => {
    if (!accessToken || !spreadsheetId) return;
    setIsExporting('closings');
    setStatusMessage(null);
    try {
      const res = await exportClosingsToSheets(accessToken, spreadsheetId, dailyClosings);
      setStatusMessage({
        type: 'success',
        text: `ส่งออกประวัติการปิดกะสำเร็จ ${res.rowsUpdated} รายการ ลงในแผ่นงาน "สรุปการปิดกะ"`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการส่งออกข้อมูลปิดกะ' });
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportAll = async () => {
    if (!accessToken || !spreadsheetId) return;
    setIsExporting('all');
    setStatusMessage(null);
    try {
      const invRes = await exportInventoryToSheets(accessToken, spreadsheetId, products);
      const salesRes = await exportSalesToSheets(accessToken, spreadsheetId, transactions);
      const closingsRes = await exportClosingsToSheets(accessToken, spreadsheetId, dailyClosings);
      setStatusMessage({
        type: 'success',
        text: `ซิงค์ข้อมูลทั้งหมดไปยัง Google Sheets สำเร็จ! (สินค้า: ${invRes.rowsUpdated}, บิล: ${salesRes.rowsUpdated}, ปิดกะ: ${closingsRes.rowsUpdated})`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการซิงค์ข้อมูล' });
    } finally {
      setIsExporting(null);
    }
  };

  // Import read action
  const handleReadSheetForImport = async () => {
    if (!accessToken || !spreadsheetId || !selectedSheetTab) return;
    setIsReadingSheet(true);
    setStatusMessage(null);
    setPreviewProducts([]);
    try {
      const result = await importInventoryFromSheets(accessToken, spreadsheetId, selectedSheetTab);
      setPreviewProducts(result.products);
      setSkippedRows(result.skipped);
      if (result.products.length === 0) {
        setStatusMessage({
          type: 'info',
          text: 'ไม่พบรายการสินค้าที่ระบุชื่อในแผ่นงานนี้ ตรวจสอบหัวตาราง เช่น ชื่อสินค้า, บาร์โค้ด, ราคาขาย',
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `อ่านข้อมูลสินค้าสำเร็จ ${result.products.length} รายการ (ข้ามแถวว่าง ${result.skipped} แถว) ตรวจสอบตัวอย่างด้านล่าง`,
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการอ่านข้อมูลจาก Google Sheets' });
    } finally {
      setIsReadingSheet(false);
    }
  };

  // Confirm Import Execution (MANDATORY explicit confirmation for data mutation)
  const handleExecuteImport = () => {
    if (previewProducts.length === 0) return;
    importProductsBulk(previewProducts, importMode);
    setImportConfirmOpen(false);
    setStatusMessage({
      type: 'success',
      text: `นำเข้าสินค้าจำนวน ${previewProducts.length} รายการ เข้าสู่ระบบ POS เรียบร้อยแล้ว (${
        importMode === 'merge' ? 'รวมสต็อก/อัปเดต' : 'แทนที่สต็อกทั้งหมด'
      })`,
    });
    setPreviewProducts([]);
  };

  if (!isOpen) return null;

  const currentSheetLink = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-pink-100 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-1.5">
                <span>Google Sheets Sync</span>
                <span className="text-[10px] px-2 py-0.5 bg-white/20 rounded-full font-medium">
                  {settings.storeName || 'โอเค ชัวร์'}
                </span>
              </h3>
              <p className="text-xs text-pink-100">
                ซิงค์สต็อกสินค้า, รายการขาย, และยอดปิดกะกับ Google Spreadsheet
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Status message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl border flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              {statusMessage.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              {statusMessage.type === 'error' && (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              {statusMessage.type === 'info' && (
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              )}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
          )}

          {/* 1. GOOGLE ACCOUNT CONNECTION SECTION */}
          {!googleUser || !accessToken ? (
            <div className="bg-pink-50/50 p-5 rounded-2xl border border-pink-100 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mx-auto text-pink-600">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">เข้าสู่ระบบด้วย Google เพื่อเริ่มใช้งาน</h4>
                <p className="text-slate-500 text-[11px] mt-1 max-w-md mx-auto">
                  ระบบจะขออนุญาตเข้าถึง Google Sheets และ Google Drive เพื่อบันทึกข้อมูลสต็อกและประวัติการขายของร้านคุณอย่างปลอดภัย
                </p>
              </div>

              {/* Official Google Button Style */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleSignIn}
                  disabled={isAuthenticating}
                  className="flex items-center gap-3 px-5 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 rounded-xl shadow-xs transition font-semibold text-slate-700 text-xs disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>{isAuthenticating ? 'กำลังเชื่อมต่อ...' : 'Sign in with Google'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || 'Google User'}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full border border-pink-200"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold">
                    {googleUser.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>{googleUser.displayName || googleUser.email}</span>
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                      เชื่อมต่อแล้ว
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px]">{googleUser.email}</div>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 px-3 py-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          )}

          {/* 2. SPREADSHEET CONFIGURATION (Visible when authenticated) */}
          {googleUser && accessToken && (
            <div className="space-y-3 bg-white p-4 rounded-2xl border border-pink-100 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Sheet className="w-4 h-4 text-pink-600" />
                  <span>Google Spreadsheet ที่กำลังใช้งาน:</span>
                </label>

                {currentSheetLink && (
                  <a
                    href={currentSheetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-pink-600 hover:text-pink-700 font-bold hover:underline"
                  >
                    <span>เปิดสเปรดชีต</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Action buttons: Create new or pick existing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={handleCreateNewSheet}
                  disabled={isCreatingSheet}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-xl font-bold shadow-xs transition disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreatingSheet ? 'กำลังสร้าง...' : 'สร้าง Google Sheets ใหม่ให้ร้าน'}</span>
                </button>

                <button
                  onClick={handleFetchRecentSheets}
                  disabled={isLoadingFiles}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                  <span>ค้นหาสเปรดชีตใน Google Drive</span>
                </button>
              </div>

              {/* Select from recent or paste ID */}
              <div className="space-y-1.5">
                {recentSpreadsheets.length > 0 && (
                  <select
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-1 focus:ring-pink-500"
                  >
                    <option value="">-- เลือก Google Spreadsheet จากใน Drive --</option>
                    {recentSpreadsheets.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="หรือวาง Spreadsheet ID หรือ URL เต็ม..."
                    value={spreadsheetId}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      const match = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                      setSpreadsheetId(match ? match[1] : val);
                    }}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:ring-1 focus:ring-pink-500"
                  />
                </div>
              </div>

              {spreadsheetTitle && (
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex items-center justify-between">
                  <span>ชื่อไฟล์: <strong>{spreadsheetTitle}</strong></span>
                  <span className="text-emerald-700">มี {availableSheets.length} แผ่นงาน</span>
                </div>
              )}
            </div>
          )}

          {/* 3. TABS: EXPORT / IMPORT */}
          {googleUser && accessToken && spreadsheetId && (
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setActiveTab('export')}
                  className={`flex-1 py-2 font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'export'
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>ส่งออกข้อมูลไป Google Sheets (Export)</span>
                </button>

                <button
                  onClick={() => setActiveTab('import')}
                  className={`flex-1 py-2 font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'import'
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <CloudDownload className="w-4 h-4" />
                  <span>นำเข้าสินค้าจาก Google Sheets (Import)</span>
                </button>
              </div>

              {/* TAB 1: EXPORT */}
              {activeTab === 'export' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Export Products */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-slate-800 text-sm">สินค้า & สต็อก</div>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          ปัจจุบันมี {products.length} รายการ
                        </p>
                      </div>
                      <button
                        onClick={handleExportInventory}
                        disabled={isExporting !== null}
                        className="mt-3 w-full py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold rounded-xl border border-pink-200 transition disabled:opacity-50"
                      >
                        {isExporting === 'inventory' ? 'กำลังส่งออก...' : 'ส่งออกสต็อก'}
                      </button>
                    </div>

                    {/* Export Sales */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-slate-800 text-sm">ประวัติการขาย</div>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          บันทึกทั้งหมด {transactions.length} บิล
                        </p>
                      </div>
                      <button
                        onClick={handleExportSales}
                        disabled={isExporting !== null}
                        className="mt-3 w-full py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold rounded-xl border border-pink-200 transition disabled:opacity-50"
                      >
                        {isExporting === 'sales' ? 'กำลังส่งออก...' : 'ส่งออกยอดขาย'}
                      </button>
                    </div>

                    {/* Export Closings */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-slate-800 text-sm">สรุปการปิดกะ</div>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          บันทึก {dailyClosings.length} วัน
                        </p>
                      </div>
                      <button
                        onClick={handleExportClosings}
                        disabled={isExporting !== null}
                        className="mt-3 w-full py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold rounded-xl border border-pink-200 transition disabled:opacity-50"
                      >
                        {isExporting === 'closings' ? 'กำลังส่งออก...' : 'ส่งออกปิดกะ'}
                      </button>
                    </div>
                  </div>

                  {/* Sync All Button */}
                  <button
                    onClick={handleExportAll}
                    disabled={isExporting !== null}
                    className="w-full py-3 bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 hover:from-pink-500 hover:to-rose-500 text-white font-bold rounded-2xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isExporting === 'all' ? 'animate-spin' : ''}`} />
                    <span>
                      {isExporting === 'all' ? 'กำลังส่งออกข้อมูลทั้งหมด...' : '⚡ ซิงค์ข้อมูลทั้งหมดไปยัง Google Sheets ในคลิกเดียว'}
                    </span>
                  </button>
                </div>
              )}

              {/* TAB 2: IMPORT */}
              {activeTab === 'import' && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-[11px] text-blue-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>คำแนะนำในการนำเข้าสินค้าจาก Google Sheets:</span>
                    </div>
                    <p>
                      ระบบรองรับหัวตารางทั้งภาษาไทยและอังกฤษ เช่น: <strong>ชื่อสินค้า</strong>, <strong>บาร์โค้ด</strong>, <strong>ราคาทุน</strong>, <strong>ราคาขาย</strong>, <strong>คงเหลือในคลัง</strong>, <strong>หมวดหมู่</strong>
                    </p>
                  </div>

                  {/* Sheet tab picker */}
                  <div className="flex gap-2 items-center">
                    <label className="font-semibold text-slate-700 shrink-0">เลือกแผ่นงาน (Sheet Tab):</label>
                    <select
                      value={selectedSheetTab}
                      onChange={(e) => setSelectedSheetTab(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white"
                    >
                      {availableSheets.map((s) => (
                        <option key={s.sheetId} value={s.title}>
                          {s.title}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleReadSheetForImport}
                      disabled={isReadingSheet}
                      className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isReadingSheet ? 'animate-spin' : ''}`} />
                      <span>{isReadingSheet ? 'กำลังโหลด...' : 'อ่านข้อมูล'}</span>
                    </button>
                  </div>

                  {/* Preview table */}
                  {previewProducts.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700">
                          ตัวอย่างสินค้าที่พบ ({previewProducts.length} รายการ):
                        </span>
                        <span className="text-slate-500">แสดง 5 รายการแรก</span>
                      </div>

                      <div className="border border-slate-200 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-3">บาร์โค้ด</th>
                              <th className="py-2 px-3">ชื่อสินค้า</th>
                              <th className="py-2 px-3">หมวดหมู่</th>
                              <th className="py-2 px-3 text-right">ทุน</th>
                              <th className="py-2 px-3 text-right">ราคาขาย</th>
                              <th className="py-2 px-3 text-right">สต็อก</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {previewProducts.slice(0, 5).map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-1.5 px-3 font-mono text-slate-500">{p.barcode}</td>
                                <td className="py-1.5 px-3 font-semibold text-slate-800">{p.name}</td>
                                <td className="py-1.5 px-3 text-slate-600">{p.category}</td>
                                <td className="py-1.5 px-3 text-right">฿{p.costPrice}</td>
                                <td className="py-1.5 px-3 text-right font-bold text-pink-600">฿{p.sellingPrice}</td>
                                <td className="py-1.5 px-3 text-right font-bold text-slate-800">{p.stock}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Import action button */}
                      <button
                        onClick={() => setImportConfirmOpen(true)}
                        className="w-full py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                      >
                        <CloudDownload className="w-4 h-4" />
                        <span>ยืนยันการนำเข้า {previewProducts.length} รายการ เข้าสู่ระบบ POS</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            ระบบ POS ร้านโอเค ชัวร์ ซิงค์อัตโนมัติแบบ Client-side OAuth 2.0
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* MANDATORY CONFIRMATION DIALOG FOR DATA MUTATION */}
      {importConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-pink-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                <CloudDownload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base">ยืนยันการนำเข้าสินค้าเข้าสู่คลัง</h4>
                <p className="text-xs text-slate-500">
                  กำลังจะนำเข้าสินค้าจำนวน <strong>{previewProducts.length} รายการ</strong>
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-slate-700 block">เลือกรูปแบบการนำเข้าข้อมูล:</span>
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-slate-100 transition">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="text-pink-600 focus:ring-pink-500"
                />
                <div>
                  <span className="font-bold text-slate-800">รวมเข้ากับสต็อกเดิม (แนะนำ)</span>
                  <p className="text-[11px] text-slate-500">
                    อัปเดตข้อมูลสินค้าเดิมตามบาร์โค้ด และเพิ่มสินค้าใหม่อัตโนมัติ
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-rose-50 transition">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="font-bold text-rose-700">แทนที่สินค้าทั้งหมด (Replace All)</span>
                  <p className="text-[11px] text-rose-600">
                    ลบสินค้าเดิมทั้งหมดใน POS แล้วใส่เฉพาะสินค้าจาก Google Sheets นี้
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setImportConfirmOpen(false)}
                className="flex-1 py-2.5 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                className="flex-1 py-2.5 font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 rounded-xl shadow-xs transition text-xs"
              >
                ยืนยันนำเข้าข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
