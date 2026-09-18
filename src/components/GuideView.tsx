import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Package,
  ShoppingBag,
  Users,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
  FileText,
  Phone,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { STORE_INFO } from '../config/storeConfig';

interface GuideViewProps {
  onNavigate?: (tab: 'dashboard' | 'pos' | 'inventory' | 'queue' | 'reports' | 'staff') => void;
}

export const GuideView: React.FC<GuideViewProps> = ({ onNavigate }) => {
  const [activeSection, setActiveSection] = useState<number>(1);

  const sections = [
    {
      id: 1,
      title: '1. เริ่มต้นใช้งานและเข้าสู่ระบบ',
      icon: <BookOpen className="w-5 h-5 text-emerald-600" />,
      targetTab: 'dashboard' as const,
      content:
        'เรียนรู้วิธีการเข้าสู่ระบบ สลับบัญชีพนักงานด้วยรหัส PIN และทำความเข้าใจหน้าจอหลักแดชบอร์ด (Dashboard) ที่สรุปยอดขายแบบเรียลไทม์ เปรียบเทียบกับเมื่อวาน และติดตามยอดขายสะสมประจำเดือน',
      steps: [
        'คลิกที่ปุ่มโปรไฟล์พนักงานมุมขวาบน เพื่อสลับบัญชีระหว่าง Admin (รหัส PIN: 1234), Manager (5678) หรือ Cashier (0000)',
        'หน้าแดชบอร์ดจะสรุปยอดขายทันทีเมื่อคิดเงินบิลสำเร็จ พร้อมคำนวณกำไรขั้นต้นและยอดเงินสด/โอน',
        'หากต้องการแก้ไขชื่อร้านหรือเบอร์โทร ให้ไปที่เมนู "พนักงาน/ตั้งค่า"',
      ],
    },
    {
      id: 2,
      title: '2. การจัดการสินค้าและคลังสินค้า (Inventory)',
      icon: <Package className="w-5 h-5 text-blue-600" />,
      targetTab: 'inventory' as const,
      content:
        'วิธีเพิ่มสินค้าใหม่ กำหนดราคาต้นทุน ราคาขาย การจัดการสต็อกขั้นต่ำ การสร้างและพิมพ์บาร์โค้ด (Code 128) รวมถึง QR Code สำหรับติดป้ายสินค้าของร้าน โอเค ชัวร์',
      steps: [
        'คลิกปุ่ม "+ เพิ่มสินค้าใหม่" กรอกชื่อสินค้า รหัสบาร์โค้ด หมวดหมู่ (เช่น กิ๊ฟช็อป, เครื่องสำอาง, ของเล่น ฯลฯ)',
        'ใส่ราคาทุนและราคาขาย ระบบจะคำนวณกำไรและหักสต็อกอัตโนมัติเมื่อมีการคิดเงิน',
        'คลิกไอคอนบาร์โค้ดที่แถวสินค้าเพื่อเปิดหน้าสร้างและพิมพ์สติกเกอร์บาร์โค้ดติดชั้นวางหรือป้ายราคา',
      ],
    },
    {
      id: 3,
      title: '3. ระบบขายหน้าร้าน (POS & Checkout)',
      icon: <ShoppingBag className="w-5 h-5 text-emerald-600" />,
      targetTab: 'pos' as const,
      content:
        'ขั้นตอนการสแกนบาร์โค้ดผ่านกล้องมือถือหรือเครื่องสแกน การเลือกสินค้าใส่ตะกร้า การให้ส่วนลด และการชำระเงินหลากหลายช่องทาง (เงินสด, พร้อมเพย์ QR Code, บัตรเครดิต)',
      steps: [
        'ใช้ปุ่ม "เปิดกล้องสแกนบาร์โค้ด" สำหรับสแกนผ่านกล้อง หรือยิงด้วยปืนบาร์โค้ด/พิมพ์ค้นหาชื่อสินค้า',
        'กดปุ่ม "พักบิล" หากลูกค้าคนก่อนหน้าต้องการไปเลือกของเพิ่ม เพื่อเปิดบิลให้ลูกค้ารายถัดไปได้ทันที',
        'กด "ชำระเงิน" เลือกระหว่างเงินสด (มีปุ่มลัดธนบัตร ฿20, ฿100, ฿500, ฿1000 และทอนเงินอัตโนมัติ) หรือ พร้อมเพย์ QR Code ที่ออกตามยอดจริง',
        'พิมพ์ใบเสร็จความร้อนขนาด 58mm/80mm ได้ทันทีหลังรับเงินสำเร็จ',
      ],
    },
    {
      id: 4,
      title: '4. ระบบจัดการคิวและเสียงประกาศ',
      icon: <Users className="w-5 h-5 text-indigo-600" />,
      targetTab: 'queue' as const,
      content:
        'การออกบัตรคิวอัตโนมัติ การเรียกคิวพร้อมเสียงพูดภาษาไทย (Speech Synthesis) และโหมดแสดงผลสำหรับหน้าจอทีวี (TV Display Mode)',
      steps: [
        'ระบบจะออกหมายเลขคิวอัตโนมัติเมื่อกดชำระเงินสำเร็จ (เช่น A-01, A-02)',
        'กดปุ่ม "เรียกคิว" ระบบจะส่งสัญญาณ Chime และพูดประกาศเสียงภาษาไทย "ขอเชิญหมายเลข ... ที่เคาน์เตอร์ 1 ค่ะ"',
        'สามารถเปิด "โหมดแสดงผลจอทีวี (TV Fullscreen Mode)" เพื่อต่อจอแสดงคิวให้ลูกค้าหน้าร้านมองเห็นได้ชัดเจน',
      ],
    },
    {
      id: 5,
      title: '5. รายงานยอดขายและการปิดรอบประจำวัน',
      icon: <FileText className="w-5 h-5 text-amber-600" />,
      targetTab: 'reports' as const,
      content:
        'การตรวจสอบยอดขายรายวัน/รายเดือน การตรวจนับเงินสดในลิ้นชัก (Cash Drawer Reconciliation) และการปิดรอบการขาย (Daily Closing) อย่างปลอดภัย',
      steps: [
        'ตรวจสอบยอดขายรวม ยอดเงินสดในลิ้นชัก และยอดโอนเงินพร้อมเพย์แยกตามหมวดหมู่และช่วงเวลา',
        'เมื่อสิ้นสุดวัน ให้กด "ปิดยอดกะประจำวัน" กรอกยอดเงินสดที่นับได้จริง ระบบจะคำนวณเงินขาด/เงินเกินให้อัตโนมัติ',
        'ระบบจะบันทึกประวัติการปิดยอดและสามารถพิมพ์ใบสรุปยอด Z-Report ประจำวันได้',
      ],
    },
    {
      id: 6,
      title: '6. การสำรองและกู้คืนข้อมูล (Data Security)',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      targetTab: 'staff' as const,
      content:
        'ระบบจัดเก็บข้อมูลผ่าน IndexedDB ป้องกันข้อมูลสูญหาย พร้อมฟังก์ชันสำรองข้อมูล (Backup JSON) และกู้คืนข้อมูล (Restore) ได้ทันที',
      steps: [
        'ทุกการกระทำ (เพิ่มสินค้า, คิดเงิน, ปิดกะ) จะถูกบันทึกอัตโนมัติลงในฐานข้อมูล IndexedDB ประจำเครื่อง',
        'เข้าเมนู "พนักงาน/ตั้งค่า" -> แถบ "สำรอง & กู้คืนข้อมูล (IndexedDB)" เพื่อดาวน์โหลดไฟล์สำรองข้อมูล JSON เก็บไว้',
        'สามารถนำไฟล์สำรองดังกล่าวมากด "กู้คืนข้อมูลจากไฟล์ (Restore)" ได้ตลอดเวลา ข้อมูลสินค้าและยอดขายจะกลับมาครบถ้วน',
      ],
    },
  ];

  const current = sections[activeSection - 1];

  return (
    <div id="guide-view" className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-pink-900 via-rose-900 to-pink-950 text-white rounded-3xl p-6 md:p-8 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 border border-pink-700/40">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-500/20 text-pink-200 rounded-full text-xs font-bold border border-pink-400/30 mb-2">
            <HelpCircle className="w-3.5 h-3.5 text-pink-300" />
            <span>ศูนย์ช่วยเหลือและคู่มือการใช้งาน • {STORE_INFO.name}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">คู่มือเริ่มต้นใช้งานระบบ POS</h1>
          <p className="text-xs md:text-sm text-pink-100 mt-1 max-w-xl">
            {STORE_INFO.slogan} {STORE_INFO.subSlogan} ({STORE_INFO.location})
            <br />
            เรียนรู้วิธีการใช้งานระบบบริหารจัดการร้านค้าและระบบขายหน้าร้านอย่างละเอียดเพื่อเริ่มต้นใช้งานได้อย่างราบรื่น
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-xs text-white shrink-0 space-y-1">
          <div className="font-bold text-pink-200 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-pink-300" /> {STORE_INFO.location}
          </div>
          <div className="flex items-center gap-1.5 text-pink-100">
            <Phone className="w-3.5 h-3.5 text-amber-300" /> {STORE_INFO.phones.join(', ')}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Navigation Sidebar */}
        <div className="bg-white rounded-2xl border border-pink-100 p-4 shadow-xs space-y-2 md:col-span-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
            หัวข้อคู่มือ (6 ขั้นตอน)
          </h3>
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                activeSection === sec.id
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-pink-50'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className={activeSection === sec.id ? 'text-white' : ''}>{sec.icon}</span>
                <span className="truncate">{sec.title}</span>
              </div>
              <ArrowRight
                className={`w-3.5 h-3.5 shrink-0 ${
                  activeSection === sec.id ? 'text-pink-200' : 'text-slate-400'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Detailed Content Panel */}
        <div className="bg-white rounded-2xl border border-pink-100 p-6 md:p-8 shadow-xs md:col-span-2 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-pink-50 text-pink-600 rounded-2xl">{current.icon}</div>
                <div>
                  <span className="text-[11px] font-bold text-pink-600 uppercase tracking-wider">
                    ขั้นตอนที่ {activeSection} ของ 6
                  </span>
                  <h2 className="text-lg font-black text-slate-900">{current.title}</h2>
                </div>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate(current.targetTab)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold rounded-xl transition border border-pink-200"
                >
                  <span>ไปที่หน้านี้</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-sm text-slate-600 leading-relaxed space-y-4">
              <p>{current.content}</p>

              {/* Step checklist */}
              <div className="p-4 bg-pink-50/50 rounded-xl border border-pink-100 space-y-2">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-pink-600" />
                  <span>แนวทางปฏิบัติที่แนะนำ:</span>
                </div>
                <ul className="list-disc list-inside text-xs text-slate-600 space-y-1.5 pl-1 leading-normal">
                  {current.steps.map((step, sIdx) => (
                    <li key={sIdx}>{step}</li>
                  ))}
                </ul>
              </div>

              {/* Store info reminder */}
              <div className="p-3.5 bg-rose-50/80 rounded-xl border border-rose-200 text-xs text-rose-950 flex items-start gap-2.5">
                <span className="font-bold shrink-0">💡 ข้อแนะนำ:</span>
                <span>
                  ร้าน <strong>{STORE_INFO.name}</strong> สามารถใช้แท็บ <strong>สต็อกสินค้า</strong> เพื่อเพิ่มหมวดหมู่สินค้าเฉพาะทาง เช่น <em>{STORE_INFO.categories.slice(0, 5).join(', ')}</em> และอื่นๆ ได้ไม่จำกัดจำนวน
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Pagination Buttons */}
          <div className="pt-6 mt-8 border-t border-slate-100 flex items-center justify-between">
            <button
              disabled={activeSection === 1}
              onClick={() => setActiveSection((prev) => Math.max(1, prev - 1))}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
                activeSection === 1
                  ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              ก่อนหน้า
            </button>
            <span className="text-xs text-slate-400 font-mono">{activeSection} / 6</span>
            <button
              disabled={activeSection === sections.length}
              onClick={() => setActiveSection((prev) => Math.min(sections.length, prev + 1))}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                activeSection === sections.length
                  ? 'opacity-40 cursor-not-allowed bg-pink-100 text-pink-400'
                  : 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-xs'
              }`}
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
