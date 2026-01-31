import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ToothData } from '../Tooth';
import { 
  X, 
  RotateCcw, 
  Hourglass, 
  Plus, 
  ChevronRight,
  Zap,
  Thermometer,
  Flame,
  Activity,
  Hammer,
  Crown,
  Circle,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RealisticOcclusal, RealisticBuccal, getToothType } from './ToothAssets';

interface ToothDetailsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTooth: number | null;
  toothData: ToothData | null;
  onUpdateTooth: (id: number, updates: Partial<ToothData>) => void;
  onSelectTooth: (id: number) => void;
}

export function ToothDetailsSidebar({
  isOpen,
  onClose,
  selectedTooth,
  toothData,
  onUpdateTooth,
  onSelectTooth
}: ToothDetailsSidebarProps) {
  if (!selectedTooth || !toothData) return null;

  const type = getToothType(selectedTooth);

  // Helper to format numbers (FDI)
  const getFDINumber = (id: number) => {
    if (id >= 1 && id <= 8) return `1${9 - id}`;
    if (id >= 9 && id <= 16) return `2${id - 8}`;
    if (id >= 17 && id <= 24) return `3${25 - id}`;
    if (id >= 25 && id <= 32) return `4${id - 24}`;
    return id.toString();
  };

  const handleSetCondition = (condition: ToothData['generalCondition'], label: string) => {
    // Toggle if clicking same
    const isSame = toothData.generalCondition === condition;
    const newCondition = isSame ? 'healthy' : condition;
    
    // Update condition AND notes
    // If setting a new condition, set notes to label.
    // If clearing (toggle off), maybe clear notes or set to 'Healthy'?
    const newNotes = isSame ? 'Healthy' : label;
    
    onUpdateTooth(selectedTooth, { 
      generalCondition: newCondition,
      notes: newNotes
    });
  };

  // All available conditions
  const allConditions: Array<{ value: ToothData['generalCondition'], label: string }> = [
    { value: 'caries', label: 'Dental caries' },
    { value: 'caries', label: 'Cavity' },
    { value: 'caries', label: 'Tooth decay' },
    { value: 'broken', label: 'Broken tooth' },
    { value: 'cracked', label: 'Cracked tooth' },
    { value: 'chipped', label: 'Chipped tooth' },
    { value: 'missing', label: 'Missing tooth' },
    { value: 'loose', label: 'Loose tooth' },
    { value: 'impacted', label: 'Impacted tooth' },
    { value: 'retained_root', label: 'Retained root' },
    { value: 'abscess', label: 'Tooth abscess' },
    { value: 'non_vital', label: 'Non-vital tooth' },
    { value: 'erosion', label: 'Tooth erosion' },
    { value: 'discolored', label: 'Discolored tooth' },
    { value: 'stained', label: 'Stained tooth' },
    { value: 'needs_filling', label: 'Needs filling' },
    { value: 'needs_root_canal', label: 'Needs root canal treatment' },
    { value: 'needs_extraction', label: 'Needs extraction' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black z-40"
          />
          
          {/* Sidebar Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute right-0 top-0 bottom-0 w-[900px] max-w-[90vw] bg-white z-50 shadow-2xl flex overflow-hidden border-l border-slate-200"
          >
            {/* Left Strip: Tooth Navigation & Visuals */}
            <div className="w-48 bg-slate-900 flex flex-col items-center py-6 text-slate-400 relative overflow-hidden shrink-0">
               {/* Background Ruler Lines */}
               <div className="absolute inset-0 flex flex-col gap-8 opacity-10 pointer-events-none">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="w-full h-px bg-white" />
                  ))}
               </div>

               {/* Tooth List/Scroller */}
               <div className="flex-1 w-full overflow-y-auto no-scrollbar flex flex-col items-center gap-1">
                  {/* Ideally this would be a virtual list or scroller centered on selected */}
                  {Array.from({ length: 32 }, (_, i) => i + 1).map(id => (
                    <div 
                      key={id}
                      onClick={() => onSelectTooth(id)}
                      className={cn(
                        "w-full py-2 px-4 flex items-center gap-4 cursor-pointer hover:text-white transition-colors",
                        id === selectedTooth ? "text-white bg-slate-800 border-l-4 border-red-500" : "opacity-50"
                      )}
                    >
                       <span className={cn(
                         "text-xs font-mono",
                         id === selectedTooth && "font-bold text-base"
                       )}>
                         {getFDINumber(id)}
                       </span>
                       {/* Show mini text or Universal ID too? */}
                       <span className="text-[10px] opacity-50 ml-auto">{id}</span>
                    </div>
                  ))}
               </div>

               {/* Large Visual Overlay - Fixed for selected */}
               <div className="absolute left-16 top-1/2 -translate-y-1/2 flex flex-col gap-4 pointer-events-none">
                  {/* Top Root View (Buccal) */}
                  <div className="w-24 h-32 flex items-center justify-center">
                    <svg viewBox="0 0 100 150" className="w-full h-full drop-shadow-lg">
                       <RealisticBuccal 
                         type={type} 
                         fill="#FDFBF7" 
                         stroke="#D1C4B0" 
                       />
                       {/* Red Line Overlay */}
                       <line x1="0" y1="75" x2="100" y2="75" stroke="#DC2626" strokeWidth="2" />
                    </svg>
                  </div>

                  {/* Occlusal View */}
                  <div className="w-24 h-24 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                       <RealisticOcclusal 
                         type={type} 
                         fill="#FDFBF7" 
                         stroke="#D1C4B0" 
                       />
                    </svg>
                  </div>

                  {/* Bottom Root View (Lingual/Buccal again?) - Image shows root again */}
                  <div className="w-24 h-32 flex items-center justify-center">
                    <svg viewBox="0 0 100 150" className="w-full h-full drop-shadow-lg" style={{ transform: "rotate(180deg)" }}>
                       <RealisticBuccal 
                         type={type} 
                         fill="#FDFBF7" 
                         stroke="#D1C4B0" 
                       />
                       <line x1="0" y1="75" x2="100" y2="75" stroke="#DC2626" strokeWidth="2" />
                    </svg>
                  </div>
               </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-slate-50">
               {/* Header Section with Back Button */}
               <div className="bg-white p-8 border-b border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                     <button
                       onClick={onClose}
                       className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                     >
                       <ArrowLeft className="w-5 h-5" />
                       <span className="font-medium">Back to Chart</span>
                     </button>
                     <h2 className="text-3xl font-light text-slate-700">
                       Tooth {selectedTooth}
                     </h2>
                  </div>

                  {/* Permanent/Temporary Toggle */}
                  <div className="mt-6 flex items-center justify-center gap-4">
                     <button
                       onClick={() => onUpdateTooth(selectedTooth, { isPermanent: true })}
                       className={cn(
                         "px-6 py-3 rounded-lg border-2 font-medium transition-all",
                         toothData.isPermanent
                           ? "border-black bg-black text-white"
                           : "border-slate-300 text-slate-600 hover:border-slate-400"
                       )}
                     >
                       Permanent Tooth
                     </button>
                     <button
                       onClick={() => onUpdateTooth(selectedTooth, { isPermanent: false })}
                       className={cn(
                         "px-6 py-3 rounded-lg border-2 font-medium transition-all",
                         !toothData.isPermanent
                           ? "border-slate-400 bg-slate-400 text-white"
                           : "border-slate-300 text-slate-600 hover:border-slate-400"
                       )}
                     >
                       Temporary Tooth
                     </button>
                  </div>
               </div>

               {/* Tooth Conditions Section */}
               <div className="flex-1 p-8 overflow-y-auto">
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-100">
                     <h3 className="text-2xl font-light text-slate-600 mb-6">Tooth Conditions</h3>
                     
                     <div className="grid grid-cols-3 gap-4">
                        {allConditions.map((condition, index) => (
                          <button
                            key={index}
                            onClick={() => handleSetCondition(condition.value, condition.label)}
                            className={cn(
                              "p-4 rounded-lg border-2 text-center transition-all font-medium",
                              toothData.generalCondition === condition.value
                                ? "border-sky-500 bg-sky-50 text-sky-700"
                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                            )}
                          >
                            {condition.label}
                          </button>
                        ))}
                     </div>
                  </div>

                  {/* Notes Section */}
                  <div className="mt-6 bg-white rounded-lg p-6 shadow-sm border border-slate-100">
                    <h3 className="text-2xl font-light text-slate-600 mb-6">Notes</h3>
                    <textarea
                      value={toothData.notes || ''}
                      onChange={(e) => onUpdateTooth(selectedTooth, { notes: e.target.value })}
                      placeholder="Add clinical notes here..."
                      className="w-full h-32 p-4 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none resize-none text-slate-700"
                    />
                  </div>
               </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ActionButton({ icon: Icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 font-bold text-xs tracking-wider transition-colors",
        active ? "text-red-500" : "text-sky-500 hover:text-sky-600"
      )}
    >
      <div className={cn(
        "p-1 rounded-full border-2",
        active ? "border-red-500" : "border-sky-500"
      )}>
        <Icon className="w-4 h-4" />
      </div>
      {label}
    </button>
  );
}

function EndoItem({ icon: Icon, label }: any) {
  return (
    <div className="flex items-center justify-between py-4">
       <div className="flex items-center gap-3 text-slate-600 font-medium">
         <Icon className="w-5 h-5 text-slate-400" />
         {label}
       </div>
       <button className="flex items-center gap-1 text-slate-400 text-sm hover:text-sky-500">
         Test <ChevronRight className="w-4 h-4" />
       </button>
    </div>
  );
}

function ProbingInput({ label }: any) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 flex flex-col items-center gap-2 relative">
       <div className="text-4xl font-light text-slate-600">0</div>
       <div className="absolute top-1/2 -translate-y-1/2 w-full h-px bg-slate-100 -z-0" />
       <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide bg-white px-2 z-10">
         {label}
       </div>
       <div className="absolute top-8 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-slate-50 border border-slate-100 text-[10px] text-slate-300">
         0
       </div>
    </div>
  );
}