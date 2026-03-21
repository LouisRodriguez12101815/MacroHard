"use client";

import { createContext, useContext, useState } from 'react';
import { Sidebar } from './Sidebar';

const MobileContext = createContext(false);
export const useMobileView = () => useContext(MobileContext);

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileView, setMobileView] = useState(false);

  return (
    <MobileContext.Provider value={mobileView}>
      <Sidebar mobileView={mobileView} onToggleMobile={() => setMobileView(!mobileView)} />
      <main className={`flex-1 h-full overflow-hidden bg-slate-950 ${mobileView ? 'pb-14' : ''}`}>
        {children}
      </main>
    </MobileContext.Provider>
  );
}
