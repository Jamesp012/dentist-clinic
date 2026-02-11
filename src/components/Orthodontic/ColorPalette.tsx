import React from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";

interface Color {
  name: string;
  value: string;
}

interface ColorPaletteProps {
  colors: Color[];
  selectedColor: Color;
  onColorSelect: (color: Color) => void;
  showSpecs?: boolean;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({ 
  colors, 
  selectedColor, 
  onColorSelect 
  , showSpecs = true
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="p-8 space-y-10"
    >
      <div>
        <h3 className="text-[10px] font-black text-slate-400 tracking-[0.2em] mb-5 uppercase">Color Selected</h3>
        <div className="flex items-center gap-5 bg-cyan-50/50 p-5 rounded-3xl border border-cyan-100/50 shadow-sm">
          <div 
            className="w-20 h-20 rounded-2xl shadow-inner border-4 border-white ring-1 ring-cyan-100"
            style={{ backgroundColor: selectedColor.value }}
          />
          <div>
            <div className="text-xl font-black text-slate-800 tracking-tight">{selectedColor.name}</div>
            <div className="text-[11px] font-mono text-cyan-600 font-bold uppercase tracking-wider mt-0.5">{selectedColor.value}</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[9px] bg-white px-2 py-0.5 rounded-full border border-cyan-100 text-slate-500 font-bold uppercase">Medical Grade</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-[10px] font-black text-slate-400 tracking-[0.2em] mb-5 uppercase">Available Colors</h3>
        <div className="grid grid-cols-4 gap-4">
          {colors.map((color) => (
            <button
              key={color.name}
              onClick={() => onColorSelect(color)}
              className={`group relative aspect-square rounded-2xl transition-all duration-300 ${
                selectedColor.value === color.value 
                  ? "ring-2 ring-cyan-600 ring-offset-4 scale-105" 
                  : "hover:scale-110 active:scale-95"
              }`}
            >
              <div 
                className="w-full h-full rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
                style={{ backgroundColor: color.value }}
              />
              {selectedColor.value === color.value && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-2xl">
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 font-bold shadow-xl">
                {color.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {showSpecs && (
        <div className="pt-6 border-t border-cyan-50">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Material Specs</span>
              <p className="text-xs font-bold text-slate-700">Clinical Elastomer</p>
            </div>
            <div className="space-y-1.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Durability</span>
              <p className="text-xs font-bold text-slate-700">Tear Resistant</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
