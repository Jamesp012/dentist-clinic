import React from "react";
import { motion } from "motion/react";
import { Clock, Calendar, ChevronRight } from "lucide-react";

interface HistoryItem {
  color: { name: string; value: string };
  timestamp: string;
}

interface ColorHistoryProps {
  history: HistoryItem[];
  onSelectItem?: (index: number) => void;
}

export const ColorHistory: React.FC<ColorHistoryProps> = ({ history, onSelectItem }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-8 space-y-8"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">Clinical Application Log</h3>
        <span className="text-[9px] bg-orange-100 px-2.5 py-1 rounded-full font-black text-orange-700">
          {history.length} RECORDS
        </span>
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-orange-50/50 rounded-full flex items-center justify-center mb-5 border border-orange-100/50 shadow-inner">
            <Clock className="w-10 h-10 text-orange-200" />
          </div>
          <p className="text-sm font-bold text-slate-400 leading-relaxed italic">
            Patient history is currently empty.<br/>
            Initialize color mapping to record.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item, index) => (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={index}
              className={`group bg-white border border-orange-50 p-5 rounded-3xl flex items-center gap-5 hover:border-orange-200 hover:shadow-2xl hover:shadow-orange-100/50 transition-all ${onSelectItem ? 'cursor-pointer' : 'cursor-default'}`}
              onClick={onSelectItem ? () => onSelectItem(index) : undefined}
            >
              <div 
                className="w-14 h-14 rounded-2xl shadow-sm border-2 border-white ring-1 ring-slate-100 flex-shrink-0"
                style={{ backgroundColor: item.color.value }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-slate-800 truncate tracking-tight">{item.color.name}</span>
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">{item.color.value}</span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase">
                    <Calendar className="w-3.5 h-3.5" />
                    {item.timestamp.split(',')[0]}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase">
                    <Clock className="w-3.5 h-3.5" />
                    {item.timestamp.split(',')[1]}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-orange-400 transition-colors" />
            </motion.div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <button className="w-full py-4 text-[10px] font-black tracking-widest text-orange-700 hover:text-white hover:bg-orange-600 rounded-2xl transition-all border-2 border-orange-100 hover:border-orange-600 uppercase shadow-sm">
          EXPORT COMPLETE DIAGNOSTIC LOG
        </button>
      )}
    </motion.div>
  );
};
