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

  // Helper to get Label from ID (for primary teeth)
  const getToothLabel = (id: number) => {
    const PRIMARY_LABELS: Record<number, string> = {
      101: 'A', 102: 'B', 103: 'C', 104: 'D', 105: 'E',
      106: 'F', 107: 'G', 108: 'H', 109: 'I', 110: 'J',
      111: 'K', 112: 'L', 113: 'M', 114: 'N', 115: 'O',
      116: 'P', 117: 'Q', 118: 'R', 119: 'S', 120: 'T',
    };
    return id > 32 ? PRIMARY_LABELS[id] || id.toString() : id.toString();
  };

  const handleSetCondition = (condition: ToothData['generalCondition'], label: string) => {
    // Toggle membership in the `conditions` array (multi-select). Maintain `generalCondition` as a fallback.
    const existing = toothData.conditions && toothData.conditions.length > 0 ? toothData.conditions.slice() : [toothData.generalCondition];
    
    // Normalize existing conditions to handle cases where it might contain 'healthy'
    const cleanExisting = existing.filter(c => c !== 'healthy');
    
    const idx = cleanExisting.indexOf(condition as any);
    let normalized: any[];
    
    if (idx >= 0) {
      cleanExisting.splice(idx, 1);
      normalized = cleanExisting.length > 0 ? cleanExisting : ['healthy'];
    } else {
      cleanExisting.push(condition as any);
      normalized = cleanExisting;
    }

    const notes = idx >= 0 ? toothData.notes : (toothData.notes ? `${toothData.notes}, ${label}` : label);

    onUpdateTooth(selectedTooth, {
      conditions: normalized as any,
      generalCondition: (normalized[normalized.length - 1] as any) || 'healthy',
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
            className="fixed inset-0 bg-black z-[9998]"
          />
          
          {/* Sidebar Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-[900px] max-w-[95vw] sm:max-w-[90vw] bg-white z-[9999] shadow-2xl flex overflow-hidden border-l border-slate-200"
          >
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
               {/* Header Section with Back Button */}
               <div className="bg-white p-4 sm:p-8 border-b border-slate-200 flex-shrink-0">
                  <div className="flex items-center justify-between mb-4">
                     <button
                       onClick={onClose}
                       className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                     >
                       <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5" />
                       <span className="font-medium text-sm sm:text-base">Back</span>
                     </button>
                     <h2 className="text-xl sm:text-3xl font-light text-slate-700">
                       Tooth {getToothLabel(selectedTooth)}
                     </h2>
                  </div>

                  {/* Permanent/Temporary Toggle (or fixed label) */}
                  {typeof fixedIsPermanent === 'boolean' ? (
                    <div className="mt-4 sm:mt-6 flex items-center justify-center">
                      <span
                        className={cn(
                          "px-4 py-2 sm:px-6 sm:py-3 rounded-lg border-2 font-medium text-xs sm:text-base",
                          fixedIsPermanent
                            ? "border-black bg-black text-white"
                            : "border-slate-400 bg-slate-400 text-white"
                        )}
                      >
                        {fixedIsPermanent ? 'Permanent' : 'Temporary'}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-4 sm:mt-6 flex items-center justify-center gap-2 sm:gap-4">
                      <button
                        onClick={() => onUpdateTooth(selectedTooth, { isPermanent: true })}
                        className={cn(
                          "px-4 py-2 sm:px-6 sm:py-3 rounded-lg border-2 font-medium transition-all text-xs sm:text-base",
                          toothData.isPermanent
                            ? "border-black bg-black text-white"
                            : "border-slate-300 text-slate-600 hover:border-slate-400"
                        )}
                      >
                        Permanent
                      </button>
                      <button
                        onClick={() => onUpdateTooth(selectedTooth, { isPermanent: false })}
                        className={cn(
                          "px-4 py-2 sm:px-6 sm:py-3 rounded-lg border-2 font-medium transition-all text-xs sm:text-base",
                          !toothData.isPermanent
                            ? "border-slate-400 bg-slate-400 text-white"
                            : "border-slate-300 text-slate-600 hover:border-slate-400"
                        )}
                      >
                        Temporary
                      </button>
                    </div>
                  )}
               </div>

               {/* Tooth Conditions Section */}
               <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
                  <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-slate-100">
                     <h3 className="text-xl sm:text-2xl font-light text-slate-600 mb-6">Tooth Conditions</h3>
                     
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
                        {allConditions.map((condition, index) => {
                          const isActive = (toothData.conditions && toothData.conditions.includes(condition.value as any)) || toothData.generalCondition === condition.value;
                          return (
                            <button
                              key={index}
                              onClick={() => handleSetCondition(condition.value, condition.label)}
                              className={cn(
                                "p-2 sm:p-3 rounded-lg border-2 text-center transition-all font-medium text-[11px] sm:text-sm leading-tight min-h-[44px] sm:min-h-[50px] flex items-center justify-center",
                                isActive
                                  ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm"
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
