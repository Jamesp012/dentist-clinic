import React, { useState } from "react";
import { Check } from "lucide-react";

export const PrescriptionFormMaano: React.FC = () => {
  const [selections, setSelections] = useState<Record<string, boolean>>({});

  const toggleSelection = (id: string) => {
    setSelections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const UnderlineInput = ({ label, className = "" }: { label: string; className?: string }) => (
    <div className={`flex items-end ${className}`}>
      <span className="text-xs font-bold uppercase mr-2">{label}:</span>
      <input 
        type="text" 
        className="flex-1 border-b border-slate-400 focus:outline-none focus:border-slate-600 bg-transparent px-1 h-[18px] mb-[-1px] font-sans text-sm" 
      />
    </div>
  );

  const MedRow = ({ name, doses, sig, id }: { name: string; doses: string[]; sig: string; id: string }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-12">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => toggleSelection(id)}
        >
          <div className={`w-5 h-5 rounded-full border-2 border-slate-400 flex items-center justify-center transition-colors ${selections[id] ? "bg-slate-800 border-slate-800" : "bg-white"}`}>
            {selections[id] && <Check className="text-white w-3 h-3 stroke-[4]" />}
          </div>
          <span className="text-lg font-bold tracking-wide uppercase">{name}</span>
        </div>
        <div className="flex gap-8">
          {doses.map((dose, idx) => {
            const doseId = `${id}-dose-${idx}`;
            return (
              <div 
                key={dose} 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => toggleSelection(doseId)}
              >
                <div className={`w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center ${selections[doseId] ? "bg-slate-600 border-slate-600" : ""}`}>
                  {selections[doseId] && <Check className="text-white w-2.5 h-2.5" />}
                </div>
                <span className="text-sm font-bold">{dose}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="pl-8 space-y-2">
        <div className="flex items-center gap-2">
           <span className="text-2xl font-serif opacity-50">#</span>
           <input type="text" className="w-12 border-b border-slate-400 focus:outline-none focus:border-slate-600 bg-transparent text-center font-sans text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold italic text-slate-700">Sig.</span>
          <input 
            type="text" 
            defaultValue={sig}
            className="flex-1 border-b border-slate-200 focus:outline-none focus:border-slate-400 bg-transparent font-serif italic text-slate-700 px-1" 
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-[600px] mx-auto bg-slate-50 p-12 border border-slate-200 shadow-xl relative min-h-[950px] font-serif text-slate-800">
      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
        <svg viewBox="0 0 100 100" className="w-[400px] h-[400px] fill-current text-slate-900">
          <path d="M50 5C30 5 15 20 15 45C15 70 35 95 50 95C65 95 85 70 85 45C85 20 70 5 50 5Z" />
        </svg>
      </div>

      {/* Header - Moved lower by adding top padding/margin */}
      <div className="mt-8 text-center mb-10 border-b border-slate-300 pb-4">
        <h1 className="text-2xl font-bold tracking-widest text-slate-900">JOSEPH E. MAAÑO, D.M.D.</h1>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">GENERAL DENTISTRY / ORTHODONTICS</p>
        <div className="flex justify-center items-center gap-2 mt-4 text-[10px] text-slate-600 font-sans">
          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current text-slate-400">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          </svg>
          <p>#29 Emilio Jacinto St. San Diego Zone 2 Tayabas City 4327</p>
        </div>
        <div className="mt-4 flex flex-col items-center gap-1 text-[9px] font-bold text-slate-500 italic font-sans">
          <p>Monday to Friday 5pm / Saturday Sunday: By appointment</p>
          <div className="flex gap-4">
            <p>Tel # (042)7171156</p>
            <p>Cp # 09773651397</p>
          </div>
        </div>
      </div>

      {/* Patient Info Fields */}
      <div className="grid grid-cols-12 gap-y-4 gap-x-6 mb-12 relative z-10">
        <UnderlineInput label="NAME" className="col-span-8" />
        <UnderlineInput label="AGE" className="col-span-2" />
        <UnderlineInput label="SEX" className="col-span-2" />
        <UnderlineInput label="ADDRESS" className="col-span-12" />
        <UnderlineInput label="DATE" className="col-span-12" />
      </div>

      {/* Rx Section */}
      <div className="relative z-10">
        <div className="mb-6">
          <span className="text-6xl font-serif italic text-slate-900 opacity-80">Rx</span>
        </div>

        <div className="space-y-10 pl-8">
          <MedRow id="mef" name="MEFENAMIC Acid" doses={["500mg.", "250mg."]} sig="Take 1 cap 3x a day" />
          <MedRow id="amox" name="AMOXICILLIN" doses={["500mg.", "250mg."]} sig="Take 1 cap 3x a day" />
          <MedRow id="tran" name="TRANEXAMIC Acid" doses={["500mg.", "250mg."]} sig="Take 1 cap 3x a day" />
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-10 right-12 w-64 border-t border-slate-900 pt-2 text-right">
        <h4 className="font-bold text-sm tracking-tight">JOSEPH E. MAAÑO, D.M.D.</h4>
        <div className="space-y-1 mt-1 text-[10px] font-bold text-slate-600 font-sans">
           <p className="flex justify-end gap-2 items-center">LIC NO. <input type="text" defaultValue="0033129" className="border-b border-slate-300 w-24 bg-transparent outline-none text-right" /></p>
           <p className="flex justify-end gap-2 items-center">PTR. <input type="text" className="border-b border-slate-300 w-24 bg-transparent outline-none text-right" /></p>
        </div>
      </div>
    </div>
  );
};
