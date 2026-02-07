import React, { useState } from "react";
import { Check } from "lucide-react";

export const PrescriptionFormMaano: React.FC = () => {
  const [selections, setSelections] = useState<Record<string, boolean>>({});

  const toggleSelection = (id: string) => {
    setSelections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const UnderlineInput = ({ label, className = "" }: { label: string; className?: string }) => (
    <div className={`flex items-center ${className}`}>
      <span className="text-[11px] font-normal text-slate-700 mr-1">{label}:</span>
      <input 
        type="text" 
        className="flex-1 border-b border-slate-900 focus:outline-none focus:border-slate-600 bg-transparent px-1 py-0 font-sans text-xs" 
      />
    </div>
  );

  const MedRow = ({ name, doses, sig, id }: { name: string; doses: string[]; sig: string; id: string }) => (
    <div className="mb-6">
      {/* First Line: Circle, Medication Name, and Dosage Options */}
      <div className="flex items-center gap-3 mb-1">
        <div 
          className="cursor-pointer"
          onClick={() => toggleSelection(id)}
        >
          <div className="w-4 h-4 rounded-full border border-slate-900 bg-white"></div>
        </div>
        <span className="text-sm font-bold text-slate-900">{name}</span>
        <div className="flex gap-6 ml-auto mr-16">
          {doses.map((dose, idx) => {
            const doseId = `${id}-dose-${idx}`;
            return (
              <div 
                key={dose} 
                className="flex items-center gap-1.5 cursor-pointer"
                onClick={() => toggleSelection(doseId)}
              >
                <div className="w-4 h-4 rounded-full border border-slate-900 bg-white"></div>
                <span className="text-sm text-slate-900">{dose}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Second Line: # symbol and input */}
      <div className="pl-7 mb-0.5">
        <div className="flex items-center gap-1">
          <span className="text-xl font-serif text-slate-700">#</span>
        </div>
      </div>

      {/* Third Line: Sig */}
      <div className="pl-7">
        <div className="flex items-start gap-1">
          <span className="text-sm font-normal italic text-slate-900">Sig.</span>
          <span className="text-sm font-normal text-slate-900">{sig}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-[650px] mx-auto bg-white p-8 border border-slate-300 shadow-lg relative min-h-[900px] font-sans text-slate-800">
      {/* Red top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-red-600"></div>
      
      {/* Header */}
      <div className="text-center mb-6 pb-4 border-b border-slate-400">
        <h1 className="text-2xl font-bold text-slate-800 mb-0.5">JOSEPH E. MAAÑO, D.M.D</h1>
        <p className="text-xs text-slate-600 mb-2">GENERAL DENTISTRY/ ORTHODONTICS</p>
        <div className="flex justify-center items-center gap-1 mb-1 text-[11px] text-slate-700">
          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current text-red-500">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          </svg>
          <p>#29 Emilio Jacinto St. San Diego Zone 2</p>
        </div>
        <p className="text-[11px] text-slate-700 mb-2">Tayabas City 4327</p>
        <div className="flex justify-center items-center gap-4 text-[10px] text-slate-600 mb-1">
          <p>Monday to Friday 6pm / Saturday Sunday: By appointment</p>
        </div>
        <div className="flex justify-center gap-6 text-[10px] text-slate-600">
          <div className="flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current text-slate-500">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
            </svg>
            <span>Tel # (042)7171156</span>
          </div>
          <div className="flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current text-slate-500">
              <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
            </svg>
            <span>Cp # 09773651397</span>
          </div>
        </div>
      </div>

      {/* Patient Info Fields */}
      <div className="mb-6 space-y-2">
        <UnderlineInput label="NAME" className="w-full" />
        <div className="flex items-center gap-4">
          <UnderlineInput label="ADDRESS" className="flex-1" />
          <UnderlineInput label="AGE" className="w-20" />
          <UnderlineInput label="SEX" className="w-20" />
        </div>
        <div className="flex items-center justify-end">
          <UnderlineInput label="DATE" className="w-48" />
        </div>
      </div>

      {/* Rx Section */}
      <div className="mt-8 mb-24">
        <div className="mb-4">
          <span className="text-5xl font-serif italic text-slate-900">Rx</span>
        </div>

        <div className="space-y-6 pl-6">
          <MedRow id="mef" name="Mefenamic Acid" doses={["500mg.", "250mg."]} sig="Take 1 cap 3x a day" />
          <MedRow id="amox" name="AMOXICILLIN" doses={["500mg.", "250mg."]} sig="Take 1 cap 3x a day" />
          <MedRow id="tran" name="TRANEXAMIC Acid" doses={["500mg.", "250mg."]} sig="Take 1 cap 3x a day" />
        </div>
      </div>

      {/* Footer with License Info */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center">
        <div className="text-center">
          <div className="border-t border-slate-900 w-64 mb-2"></div>
          <h4 className="font-bold text-sm text-slate-900 mb-1">JOSEPH E. MAAÑO, D.M.D.</h4>
          <div className="space-y-0 text-xs text-slate-700">
            <div className="flex items-center justify-center gap-2">
              <span>LIC NO.</span>
              <span className="border-b border-slate-900 px-4">0033129</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span>PTR.</span>
              <span className="border-b border-slate-900 px-8"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
