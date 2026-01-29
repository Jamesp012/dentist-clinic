import React, { useState } from "react";
import { 
  Pill, 
  Plus, 
  Search, 
  Calendar, 
  User, 
  FileText, 
  ChevronRight,
  Send,
  History,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";

interface Prescription {
  id: string;
  patientName: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  date: string;
  doctor: string;
  status: "active" | "completed";
}

const mockPrescriptions: Prescription[] = [
  { 
    id: "RX-4401", 
    patientName: "Sarah Johnson", 
    medication: "Amoxicillin", 
    dosage: "500mg", 
    frequency: "Twice daily", 
    duration: "7 days", 
    date: "2024-01-20", 
    doctor: "Dr. Elena Vance",
    status: "active"
  },
  { 
    id: "RX-4402", 
    patientName: "Michael Chen", 
    medication: "Ibuprofen", 
    dosage: "400mg", 
    frequency: "Every 6 hours as needed", 
    duration: "3 days", 
    date: "2024-01-22", 
    doctor: "Dr. Marcus Thorne",
    status: "active"
  },
  { 
    id: "RX-4403", 
    patientName: "Emma Williams", 
    medication: "Chlorhexidine Gluconate", 
    dosage: "0.12% Oral Rinse", 
    frequency: "Swish twice daily", 
    duration: "14 days", 
    date: "2024-01-15", 
    doctor: "Dr. Elena Vance",
    status: "completed"
  }
];

export const PrescriptionManager: React.FC = () => {
  const [showNewForm, setShowNewForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Digital Prescriptions</h2>
          <p className="text-slate-500">Create and track medications for your patients.</p>
        </div>
        <button 
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>New Prescription</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search patient prescriptions..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="space-y-3">
            {mockPrescriptions.map((px) => (
              <div key={px.id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                      <Pill className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{px.medication}</h3>
                      <p className="text-sm text-slate-500">{px.dosage} • {px.frequency}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    px.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {px.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-slate-100">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Patient</p>
                    <p className="text-sm font-medium text-slate-700">{px.patientName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Duration</p>
                    <p className="text-sm font-medium text-slate-700">{px.duration}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date Issued</p>
                    <p className="text-sm font-medium text-slate-700">{format(new Date(px.date), "MMM dd, yyyy")}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Physician</p>
                    <p className="text-sm font-medium text-slate-700">{px.doctor}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-slate-400 font-mono">ID: {px.id}</p>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                      Edit
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                      <Send size={14} />
                      Send to Pharmacy
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative">
            <div className="relative z-10">
              <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                <AlertCircle className="text-amber-400" size={20} />
                Safety Protocol
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Always verify patient allergies and current medications before issuing new prescriptions. Use our automated interaction checker for safety.
              </p>
              <button className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors border border-white/10 backdrop-blur-sm">
                Open Interaction Checker
              </button>
            </div>
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <History size={18} className="text-slate-400" />
              Recent Actions
            </h4>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-xs font-medium text-slate-700">Refill requested for Emma Williams</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">2 hours ago</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              View Audit Log
            </button>
          </div>
        </div>
      </div>

      {/* New Prescription Form Modal (Simplified) */}
      {showNewForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Issue New Prescription</h3>
              <button 
                onClick={() => setShowNewForm(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <Plus className="rotate-45" size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Patient Name</label>
                <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search patient..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Medication</label>
                <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Amoxicillin" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Dosage</label>
                  <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 500mg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Frequency</label>
                  <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Twice daily" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Special Instructions</label>
                <textarea rows={3} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Notes for the patient or pharmacist..."></textarea>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setShowNewForm(false)}
                className="flex-1 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => setShowNewForm(false)}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Sign & Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
