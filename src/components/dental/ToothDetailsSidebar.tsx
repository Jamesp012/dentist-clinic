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
import { cn } from '../../lib/utils';
import { RealisticOcclusal, RealisticBuccal, getToothType } from './ToothAssets';

interface ToothDetailsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTooth: number | null;
  toothData: ToothData | null;
  onUpdateTooth: (id: number, updates: Partial<ToothData>) => void;
  onSelectTooth: (id: number) => void;
  // When provided, the tooth type is fixed and the Permanent/Temporary
  // toggle in the header is replaced with a static label.
  fixedIsPermanent?: boolean;
}

export function ToothDetailsSidebar({
  isOpen,
  onClose,
  selectedTooth,
  toothData,
  onUpdateTooth,
  onSelectTooth,
  fixedIsPermanent
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
    // Toggle membership in the `conditions` array (multi-select). Maintain `generalCondition` as a fallback.
    const existing = toothData.conditions && toothData.conditions.length > 0 ? toothData.conditions.slice() : [toothData.generalCondition];
    const idx = existing.indexOf(condition as any);
    if (idx >= 0) {
      existing.splice(idx, 1);
    } else {
      existing.push(condition as any);
    }

    const normalized = existing.length > 0 ? existing : ['healthy' as ToothData['generalCondition']];
    const notes = idx >= 0 ? toothData.notes : label;

    onUpdateTooth(selectedTooth, {
      conditions: normalized as any,
      generalCondition: (normalized[0] as any) || 'healthy',
      notes,
    });
  };

  // All available conditions
  const allConditions: Array<{ value: ToothData['generalCondition'], label: string }> = [
    { value: 'dental_caries', label: 'Dental caries' },
    { value: 'cavity', label: 'Cavity' },
    { value: 'tooth_decay', label: 'Tooth decay' },
    { value: 'tooth_abscess', label: 'Tooth abscess' },
    { value: 'non_vital_tooth', label: 'Non-vital tooth' },
    { value: 'broken_tooth', label: 'Broken tooth' },
    { value: 'cracked_tooth', label: 'Cracked tooth' },
    { value: 'chipped_tooth', label: 'Chipped tooth' },
    { value: 'missing_tooth', label: 'Missing tooth' },
    { value: 'retained_root', label: 'Retained root' },
    { value: 'impacted_tooth', label: 'Impacted tooth' },
    { value: 'loose_tooth', label: 'Loose tooth' },
    { value: 'tooth_erosion', label: 'Tooth erosion' },
    { value: 'discolored_tooth', label: 'Discolored tooth' },
    { value: 'stained_tooth', label: 'Stained tooth' },
    { value: 'needs_filling', label: 'Needs filling' },
    { value: 'needs_root_canal_treatment', label: 'Needs root canal treatment' },
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
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-white">
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

                  {/* Permanent/Temporary Toggle (or fixed label) */}
                  {typeof fixedIsPermanent === 'boolean' ? (
                    <div className="mt-6 flex items-center justify-center">
                      <span
                        className={cn(
                          "px-6 py-3 rounded-lg border-2 font-medium",
                          fixedIsPermanent
                            ? "border-black bg-black text-white"
                            : "border-slate-400 bg-slate-400 text-white"
                        )}
                      >
                        {fixedIsPermanent ? 'Permanent Tooth' : 'Temporary Tooth'}
                      </span>
                    </div>
                  ) : (
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
                  )}
               </div>

               {/* Tooth Conditions Section */}
               <div className="flex-1 p-8 overflow-y-auto">
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-100">
                     <h3 className="text-2xl font-light text-slate-600 mb-6">Tooth Conditions</h3>
                     
                     <div className="grid grid-cols-3 gap-4">
                        {allConditions.map((condition, index) => {
                          const isActive = (toothData.conditions && toothData.conditions.includes(condition.value as any)) || toothData.generalCondition === condition.value;
                          return (
                            <button
                              key={index}
                              onClick={() => handleSetCondition(condition.value, condition.label)}
                              className={cn(
                                "p-4 rounded-lg border-2 text-center transition-all font-medium",
                                isActive
                                  ? "border-sky-500 bg-sky-50 text-sky-700"
                                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                              )}
                            >
                              {condition.label}
                            </button>
                          );
                        })}
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