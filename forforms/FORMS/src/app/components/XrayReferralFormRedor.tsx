import React, { useState } from "react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import mapImg from "figma:asset/003b9e532ec6bb983710b076f26531f059111367.png";
import { Check } from "lucide-react";

export const XrayReferralFormRedor: React.FC = () => {
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [toothStatus, setToothStatus] = useState<Record<string, "none" | "black" | "red">>({});

  const toggleItem = (id: string) => {
    setSelectedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const cycleTooth = (id: string) => {
    setToothStatus(prev => {
      const current = prev[id] || "none";
      if (current === "none") return { ...prev, [id]: "black" };
      if (current === "black") return { ...prev, [id]: "red" };
      return { ...prev, [id]: "none" };
    });
  };

  const CheckableItem = ({ label, id, className = "" }: { label: string; id: string; className?: string }) => (
    <div className={`flex items-center gap-2 cursor-pointer group pointer-events-auto ${className}`} onClick={() => toggleItem(id)}>
      <div className="w-10 border-b border-slate-400 relative h-6 pointer-events-auto">
        {selectedItems[id] && (
          <Check className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-blue-700 w-5 h-5 stroke-[4] pointer-events-none" />
        )}
      </div>
      <span className="font-bold">{label}</span>
    </div>
  );

  const UnderlineInput = ({ label, className = "", width = "flex-1" }: { label: string; className?: string; width?: string }) => (
    <div className={`flex items-end ${className} ${width}`}>
      <span className="font-bold mr-2 whitespace-nowrap">{label}:</span>
      <input 
        type="text" 
        className="flex-1 border-b border-slate-500 focus:outline-none focus:border-blue-600 bg-transparent px-1 h-[18px] mb-[-1px]" 
      />
    </div>
  );

  const Tooth = ({ val, id }: { val: string; id: string }) => {
    const status = toothStatus[id] || "none";
    return (
      <span 
        onClick={() => cycleTooth(id)}
        className={`cursor-pointer w-7 h-7 flex items-center justify-center rounded-full transition-all border-2 ${
          status === "black" ? "border-slate-900" : 
          status === "red" ? "border-red-600" : "border-transparent"
        } font-bold text-lg select-none hover:bg-slate-100`}
      >
        {val}
      </span>
    );
  };

  const toothNumbers = ["8", "7", "6", "5", "4", "3", "2", "1"];
  const toothLetters = ["E", "D", "C", "B", "A"];

  return (
    <div className="w-[850px] mx-auto bg-white p-12 border border-slate-200 shadow-2xl font-sans text-slate-800 text-[12px] leading-snug">
      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div className="flex items-center gap-4">
           <div className="w-16 h-16 bg-blue-700 flex items-center justify-center">
             <span className="text-white text-5xl font-black italic">R</span>
           </div>
           <div>
             <h1 className="text-2xl font-black text-blue-700 tracking-tighter leading-none">REDOR</h1>
             <p className="text-[10px] font-bold text-blue-700 tracking-[0.2em] uppercase leading-none mt-1">DENTAL CENTER</p>
           </div>
        </div>
        <div className="text-right text-blue-700 font-bold space-y-0.5 text-[10px]">
           <p>37 Quezon Ave., Lucena City</p>
           <p>Tel. (042) 710-6484</p>
           <p>Mobile 0920-2179688</p>
           <p className="underline lowercase">www.redordentalcenter.com</p>
        </div>
      </div>

      {/* Patient Fields */}
      <div className="space-y-3 mb-10">
        <UnderlineInput label="Date" width="w-48" />
        <UnderlineInput label="Patient's Name" />
        <div className="flex gap-12">
           <UnderlineInput label="Birthday" />
           <div className="flex items-center gap-4 px-4 border-x border-slate-300">
             <div className="flex items-center gap-1 cursor-pointer" onClick={() => toggleItem("male")}>
               <div className="w-3 h-3 border border-slate-400 flex items-center justify-center">
                 {selectedItems["male"] && <div className="w-1.5 h-1.5 bg-blue-700" />}
               </div>
               <span className="font-bold">Male</span>
             </div>
             <div className="flex items-center gap-1 cursor-pointer" onClick={() => toggleItem("female")}>
               <div className="w-3 h-3 border border-slate-400 flex items-center justify-center">
                 {selectedItems["female"] && <div className="w-1.5 h-1.5 bg-blue-700" />}
               </div>
               <span className="font-bold">Female</span>
             </div>
           </div>
        </div>
        <div className="flex gap-8">
           <UnderlineInput label="Referred by Dr." />
           <UnderlineInput label="Dentist's Contact #" />
        </div>
        <div className="flex gap-8">
           <UnderlineInput label="Patient's Address" />
           <UnderlineInput label="Patient's Contact #" />
        </div>
      </div>

      <div className="text-center italic font-bold mb-6">
        Please perform the following radiological procedure/s:
      </div>

      {/* Section I: X-Ray Film Format */}
      <div className="border border-slate-400 p-6 mb-8">
        <h3 className="text-center font-black uppercase mb-8 tracking-widest underline">I X-RAY FILM FORMAT</h3>
        
        <div className="relative max-w-lg mx-auto mb-10">
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-900 -translate-y-1/2"></div>
          <div className="absolute left-1/2 top-0 h-full w-[2px] bg-slate-900 -translate-x-1/2"></div>
          
          <div className="absolute -left-12 top-1/2 -translate-y-1/2 font-black text-2xl">R</div>
          <div className="absolute -right-12 top-1/2 -translate-y-1/2 font-black text-2xl">L</div>

          <div className="grid grid-cols-2 gap-12 text-center py-2">
            <div className="space-y-4 pr-6">
               <div className="flex justify-between">
                 {toothNumbers.map(n => <Tooth key={`tl-${n}`} val={n} id={`tl-${n}`} />)}
               </div>
               <div className="flex justify-end gap-3 pr-2">
                 {toothLetters.map(l => <Tooth key={`tl-l-${l}`} val={l} id={`tl-l-${l}`} />)}
               </div>
            </div>
            <div className="space-y-4 pl-6">
               <div className="flex justify-between">
                 {[...toothNumbers].reverse().map(n => <Tooth key={`tr-${n}`} val={n} id={`tr-${n}`} />)}
               </div>
               <div className="flex justify-start gap-3 pl-2">
                 {[...toothLetters].reverse().map(l => <Tooth key={`tr-l-${l}`} val={l} id={`tr-l-${l}`} />)}
               </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-12 text-center py-2 mt-4">
            <div className="space-y-4 pr-6">
               <div className="flex justify-end gap-3 pr-2">
                 {toothLetters.map(l => <Tooth key={`bl-l-${l}`} val={l} id={`bl-l-${l}`} />)}
               </div>
               <div className="flex justify-between">
                 {toothNumbers.map(n => <Tooth key={`bl-${n}`} val={n} id={`bl-${n}`} />)}
               </div>
            </div>
            <div className="space-y-4 pl-6">
               <div className="flex justify-start gap-3 pl-2">
                 {[...toothLetters].reverse().map(l => <Tooth key={`br-l-${l}`} val={l} id={`br-l-${l}`} />)}
               </div>
               <div className="flex justify-between">
                 {[...toothNumbers].reverse().map(n => <Tooth key={`br-${n}`} val={n} id={`br-${n}`} />)}
               </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 px-12 italic text-[11px]">
          <div className="space-y-2">
             <div className="flex items-center gap-2">
               <div className="w-16 border-b border-slate-400 h-6"></div>
               <span>Peri-apical (please encircle no./nos.)</span>
             </div>
          </div>
          <div className="space-y-2">
             <div className="flex items-center gap-2">
               <div className="w-16 border-b border-slate-400 h-6"></div>
               <span>Occlusal</span>
               <div className="flex flex-col ml-4">
                  <div className="flex items-center gap-2" onClick={() => toggleItem("upper")}>
                     <div className="w-10 border-b border-slate-400 relative h-4">
                        {selectedItems["upper"] && <Check className="absolute bottom-0 w-3 h-3 text-blue-700 left-1/2 -translate-x-1/2" />}
                     </div>
                     <span className="text-[9px]">Upper</span>
                  </div>
                  <div className="flex items-center gap-2" onClick={() => toggleItem("lower")}>
                     <div className="w-10 border-b border-slate-400 relative h-4">
                        {selectedItems["lower"] && <Check className="absolute bottom-0 w-3 h-3 text-blue-700 left-1/2 -translate-x-1/2" />}
                     </div>
                     <span className="text-[9px]">Lower</span>
                  </div>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Section II: Digital Format & Other Services */}
      <div className="grid grid-cols-2 gap-12 mb-10">
        <div className="space-y-4">
          <h3 className="font-black mb-4 uppercase underline">II DIGITAL FORMAT</h3>
          <div className="space-y-2 pl-4">
            {["Panoramic", "Cephalometric", "TMJ/Transcranial", "Sinus"].map(item => (
              <CheckableItem key={item} label={item} id={`digital-${item.toLowerCase()}`} />
            ))}
          </div>
        </div>
        <div className="space-y-4 pt-10">
          <div className="space-y-2 pl-4">
            {["Handwrist/Carpal", "Submentovertex (SMV)", "Water's View"].map(item => (
              <CheckableItem key={item} label={item} id={`digital-${item.toLowerCase()}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Other Services Checklist */}
      <div className="mb-10">
        <h3 className="font-black mb-4 uppercase text-center underline">OTHER SERVICES:</h3>
        <div className="grid grid-cols-1 gap-2 pl-4">
          {[
            "Extra and Intra-oral Photographs",
            "Diagnostic Study Model Cast with duplicate casts",
            "Complete Ortho Diagnosis (Pano, Casts, Photos, Ceph with free digital tracing)",
            "Digitalized Ceph Tracing",
            "Bleaching Tray",
            "Post-Ortho Positioner",
            "Bleaching Machine for Rent"
          ].map(item => (
            <CheckableItem key={item} label={item} id={`other-${item.toLowerCase()}`} />
          ))}
        </div>
      </div>

      {/* Map and Cases */}
      <div className="grid grid-cols-2 gap-12 border-t-2 border-slate-200 pt-8">
        <div className="space-y-4">
           <h3 className="font-black mb-4 uppercase underline">CASES TO BE:</h3>
           <div className="space-y-2 pl-4">
             {[
               "Taken Out by Patient",
               "Delivered to dentist (Lucena area only)",
               "Sent via JRS to Dentist",
               "X-ray/s to be emailed",
               "Pick up by dentist"
             ].map(item => (
               <CheckableItem key={item} label={item} id={`cases-${item.toLowerCase()}`} />
             ))}
           </div>
        </div>
        
        {/* Map Image Replacement */}
        <div className="w-full relative border-2 border-slate-300 h-[280px] overflow-hidden bg-white">
           <ImageWithFallback 
             src={mapImg} 
             alt="Redor Map" 
             className="w-full h-full object-contain"
           />
        </div>
      </div>
    </div>
  );
};
