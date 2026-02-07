import React from 'react';
import { DentalChart } from '@/app/components/DentalChart';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans text-slate-900 overflow-hidden">
      <main className="flex-1 h-full overflow-hidden relative">
        <DentalChart />
      </main>
      
      <Toaster position="top-right" richColors />
    </div>
  );
}
