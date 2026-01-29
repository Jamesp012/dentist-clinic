import React, { useState } from "react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import mapImg from "figma:asset/560a9f3febdbf6bec1e49ae39030ca1e6dd520a4.png";
import { Check } from "lucide-react";

export const ReferralFormAguilar: React.FC = () => {
  const [selectedServices, setSelectedServices] = useState<Record<string, boolean>>({});

  const toggleService = (id: string) => {
    setSelectedServices(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const ServiceItem = ({ label, id, showInput }: { label: string; id: string; showInput?: boolean }) => (
    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleService(id)}>
      <div className={`w-5 h-5 rounded-full border-2 border-yellow-400 flex items-center justify-center transition-colors ${selectedServices[id] ? "bg-yellow-400" : "bg-white"}`}>
        {selectedServices[id] && <Check className="text-white w-3.5 h-3.5 stroke-[4]" />}
      </div>
      <span className="text-sm font-bold tracking-tight">{label}</span>
      {showInput && (
        <input 
          type="text" 
          onClick={(e) => e.stopPropagation()}
          className="w-16 border-b border-slate-400 focus:outline-none focus:border-yellow-500 bg-transparent text-sm px-1 font-normal" 
        />
      )}
    </div>
  );

  const UnderlineInput = ({ label, className = "" }: { label: string; className?: string }) => (
    <div className={`flex items-end ${className}`}>
      <span className="text-sm whitespace-nowrap mr-2">{label}</span>
      <input 
        type="text" 
        className="flex-1 border-b border-slate-400 focus:outline-none focus:border-yellow-500 bg-transparent px-1 h-[20px] mb-[-1px]" 
      />
    </div>
  );

  return (
    <div className="w-[800px] mx-auto bg-white p-8 border border-slate-200 shadow-lg text-slate-800 font-sans leading-tight">
      {/* Header Form Fields */}
      <div className="space-y-3 mb-6">
        <div className="flex gap-4">
          <UnderlineInput label="Patient's Name:" className="flex-1" />
          <UnderlineInput label="Date:" className="w-48" />
        </div>
        <div className="flex gap-4">
          <UnderlineInput label="Contact No.:" className="flex-1" />
          <UnderlineInput label="Age:" className="w-16" />
          <UnderlineInput label="Date Of Birth:" className="w-40" />
          <UnderlineInput label="Sex:" className="w-16" />
        </div>
        <UnderlineInput label="Referred by:" />
        <div className="flex gap-4">
          <UnderlineInput label="Contact No.:" className="flex-1" />
          <UnderlineInput label="Clinic Email Address:" className="flex-1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Left: Diagnostic Services */}
        <div className="space-y-3">
          <h2 className="font-black text-lg uppercase mb-4">Diagnostic Services:</h2>
          <ServiceItem label="STANDARD PANORAMIC" id="pano" />
          <ServiceItem label="TMJ (OPEN & CLOSE)" id="tmj" />
          <ServiceItem label="SINUS PA" id="sinus" />
          <ServiceItem label="BITEWING LEFT SIDE" id="bite-l" />
          <ServiceItem label="BITEWING RIGHT SIDE" id="bite-r" />
          <ServiceItem label="PERIAPICAL XRAY TOOTH#" id="peri" showInput />
        </div>

        {/* Right: Other Services */}
        <div className="space-y-3 pt-6">
          <h2 className="font-black text-lg uppercase mb-4">OTHER SERVICES</h2>
          <ServiceItem label="DIAGNOSTIC MODEL CAST" id="model" />
          <ServiceItem label="INTRAORAL PHOTOGRAPH" id="intra" />
          <ServiceItem label="EXTRAORAL PHOTOGRAPH" id="extra" />
        </div>
      </div>

      <div className="flex gap-8 mb-8 border-t-4 border-yellow-400 pt-6">
        {/* Clinic Info */}
        <div className="w-1/2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-12 h-12 flex-shrink-0">
               <svg viewBox="0 0 100 100" className="w-full h-full text-yellow-500 fill-current">
                  <path d="M50 5C30 5 15 20 15 45C15 70 35 95 50 95C65 95 85 70 85 45C85 20 70 5 50 5ZM35 45C35 35 40 30 45 30C47.8 30 50 32.2 50 35C50 37.8 47.8 40 45 40C42.2 40 40 42.2 40 45C40 47.8 37.8 50 35 50C32.2 50 30 47.8 30 45C30 42.2 32.2 40 35 40V45ZM65 50C62.2 50 60 47.8 60 45C60 42.2 62.2 40 65 40V45C67.8 45 70 47.8 70 50.6C70 53.4 67.8 55.6 65 55.6V50ZM50 85C40 85 30 75 30 65C30 55 40 45 50 45C60 45 70 55 70 65C70 75 60 85 50 85Z" />
               </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black text-yellow-500 leading-none">J. AGUILAR</h1>
              <h2 className="text-lg font-bold text-yellow-500 leading-none tracking-tight">DENTAL CLINIC</h2>
            </div>
          </div>
          <div className="text-[11px] space-y-1">
            <p className="font-bold">#48 Luis Palad Street, Brgy.</p>
            <p className="font-bold">Angeles Zone 1, Tayabas City</p>
            <p className="font-bold text-slate-500">(Infront of St. Jude Pharmacy,</p>
            <p className="font-bold text-slate-500">beside Motoposh Tayabas)</p>
            <p className="mt-3">j.aguilardentalclinic@gmail.com</p>
            <p className="font-bold">Facebook: <span className="font-black">J. Aguilar Dental Clinic Tayabas Branch</span></p>
            <p className="font-bold">Contact No.: <span className="font-black">0938-171-7695</span></p>
          </div>
        </div>

        {/* Map Image Replacement */}
        <div className="w-1/2 relative border border-slate-300 h-48 overflow-hidden bg-slate-50">
          <ImageWithFallback 
            src={mapImg} 
            alt="J. Aguilar Map" 
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      <div className="border-t-4 border-yellow-400 pt-4">
        <h3 className="font-black text-sm uppercase mb-1">THANK YOU FOR YOUR REFERRAL!</h3>
        <p className="text-[10px] leading-tight text-slate-600">
          It is our policy to decline performing procedures that are not indicated in the referral form. 
          This is based on our strict observance of the Dental Code of Ethics.
        </p>
      </div>
    </div>
  );
};
