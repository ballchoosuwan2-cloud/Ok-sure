/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { POSProvider } from './context/POSContext';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { PosView } from './components/PosView';
import { InventoryView } from './components/InventoryView';
import { QueueView } from './components/QueueView';
import { ReportsView } from './components/ReportsView';
import { StaffSettingsView } from './components/StaffSettingsView';
import { GuideView } from './components/GuideView';

export type TabType = 'dashboard' | 'pos' | 'inventory' | 'queue' | 'reports' | 'staff' | 'guide';

function POSApp() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  return (
    <div className="min-h-screen bg-rose-50/40 text-slate-900 flex flex-col font-sans antialiased pb-20 md:pb-8">
      {/* Top and Mobile Navigation */}
      <Navbar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
        {activeTab === 'pos' && <PosView />}
        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'queue' && <QueueView />}
        {activeTab === 'reports' && <ReportsView />}
        {activeTab === 'staff' && <StaffSettingsView />}
        {activeTab === 'guide' && <GuideView onNavigate={setActiveTab} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <POSProvider>
      <POSApp />
    </POSProvider>
  );
}
