import React, { useState } from "react";
import { 
  ClipboardList, 
  ExternalLink, 
  Search, 
  Building2, 
  UserCircle2, 
  Calendar,
  MoreHorizontal,
  ArrowUpRight,
  MapPin,
  Phone,
  FileText
} from "lucide-react";

interface Referral {
  id: string;
  patientName: string;
  specialistName: string;
  specialty: string;
  clinic: string;
  reason: string;
  dateSent: string;
  status: "pending" | "accepted" | "scheduled" | "completed";
}

const mockReferrals: Referral[] = [
  {
    id: "REF-001",
    patientName: "Robert Miller",
    specialistName: "Dr. Kevin Zhang",
    specialty: "Orthodontist",
    clinic: "Straight Smiles Clinic",
    reason: "Severe malocclusion and overcrowding",
    dateSent: "2024-01-18",
    status: "scheduled"
  },
  {
    id: "REF-002",
    patientName: "Sarah Johnson",
    specialistName: "Dr. Maria Lopez",
    specialty: "Oral Surgeon",
    clinic: "City Oral & Maxillofacial",
    reason: "Impacted wisdom teeth extraction",
    dateSent: "2024-01-25",
    status: "pending"
  },
  {
    id: "REF-003",
    patientName: "David Wilson",
    specialistName: "Dr. Alan Grant",
    specialty: "Endodontist",
    clinic: "Root Specialist Center",
    reason: "Complex root canal retreat",
    dateSent: "2024-01-10",
    status: "completed"
  }
];

export const ReferralManager: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Specialist Referrals</h2>
          <p className="text-slate-500">Track outgoing patient referrals to partner clinics.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          <ArrowUpRight size={20} />
          <span>New Referral</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardList className="text-blue-600" size={20} />
            </div>
            <span className="text-2xl font-bold text-blue-900">12</span>
          </div>
          <p className="text-sm font-semibold text-blue-800">Active Referrals</p>
          <p className="text-xs text-blue-600 mt-1">4 pending acceptance</p>
        </div>
        <div className="bg-green-50 border border-green-100 p-5 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCircle2 className="text-green-600" size={20} />
            </div>
            <span className="text-2xl font-bold text-green-900">48</span>
          </div>
          <p className="text-sm font-semibold text-green-800">Partner Specialists</p>
          <p className="text-xs text-green-600 mt-1">Across 12 specialties</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 p-5 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="text-purple-600" size={20} />
            </div>
            <span className="text-2xl font-bold text-purple-900">92%</span>
          </div>
          <p className="text-sm font-semibold text-purple-800">Success Rate</p>
          <p className="text-xs text-purple-600 mt-1">Completed treatments</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Filter by specialist or patient..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {mockReferrals.map((ref) => (
            <div key={ref.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col lg:flex-row gap-6 lg:items-center">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-slate-900 text-lg">{ref.patientName}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    ref.status === "completed" ? "bg-green-100 text-green-700" :
                    ref.status === "scheduled" ? "bg-blue-100 text-blue-700" :
                    ref.status === "pending" ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {ref.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-y-2 gap-x-6 text-sm text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <UserCircle2 size={16} />
                    <span>Referred to: <span className="text-slate-900 font-medium">{ref.specialistName}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building2 size={16} />
                    <span>{ref.clinic}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={16} />
                    <span>Sent: {ref.dateSent}</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-2">
                  <FileText size={16} className="text-slate-400 mt-0.5" />
                  <p className="text-sm text-slate-600"><span className="font-semibold text-slate-700">Reason:</span> {ref.reason}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
                  <Phone size={16} />
                  Call Clinic
                </button>
                <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm">
                  <ExternalLink size={16} />
                  Patient Portal
                </button>
                <button className="p-2 text-slate-400 hover:text-slate-600">
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
