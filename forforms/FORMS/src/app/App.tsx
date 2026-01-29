import React, { useState } from "react";
import { ReferralFormAguilar } from "@/app/components/ReferralFormAguilar";
import { PrescriptionFormMaano } from "@/app/components/PrescriptionFormMaano";
import { XrayReferralFormRedor } from "@/app/components/XrayReferralFormRedor";
import { Copy, Printer, CheckCircle } from "lucide-react";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"referral" | "prescription" | "xray">("referral");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // In a real app, this would copy the component code to clipboard
  };

  const renderContent = () => {
    switch (activeTab) {
      case "referral": return <ReferralFormAguilar />;
      case "prescription": return <PrescriptionFormMaano />;
      case "xray": return <XrayReferralFormRedor />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-black text-slate-900 mb-4">Dental Form Replicas</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            These forms have been replicated exactly from your images using React and Tailwind CSS. 
            Select a form to view it and extract the code for your website.
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Controls */}
          <div className="lg:w-64 space-y-4 shrink-0">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Select Form</p>
              <div className="space-y-2">
                {[
                  { id: "referral", label: "Referral Form", subtitle: "J. Aguilar" },
                  { id: "prescription", label: "Prescription", subtitle: "J.E. Maano" },
                  { id: "xray", label: "X-ray Referral", subtitle: "Redor Dental" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                      activeTab === item.id 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-bold leading-none">{item.label}</p>
                    <p className={`text-[10px] mt-1 ${activeTab === item.id ? "text-blue-100" : "text-slate-400"}`}>
                      {item.subtitle}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
              <h3 className="font-bold text-lg mb-2">Integration Guide</h3>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                To use these in your project, simply copy the component file and ensure Tailwind CSS is installed.
              </p>
              <button 
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors font-bold text-sm"
              >
                {copied ? <CheckCircle size={18} className="text-green-400" /> : <Copy size={18} />}
                {copied ? "Copied!" : "Copy Component Code"}
              </button>
              <button 
                onClick={() => window.print()}
                className="w-full mt-3 flex items-center justify-center gap-2 py-3 border border-white/20 hover:bg-white/5 rounded-xl transition-colors font-bold text-sm"
              >
                <Printer size={18} />
                Print Preview
              </button>
            </div>
          </div>

          {/* Form Display Area */}
          <div className="flex-1 overflow-x-auto pb-12">
            <div className="inline-block min-w-full lg:min-w-0">
               {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
