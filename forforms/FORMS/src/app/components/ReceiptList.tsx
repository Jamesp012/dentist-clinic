import React, { useState } from "react";
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  MoreVertical,
  ChevronRight,
  Printer,
  X,
  CheckCircle2,
  Clock
} from "lucide-react";
import { format } from "date-fns";

interface Receipt {
  id: string;
  patientName: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  service: string;
}

const mockReceipts: Receipt[] = [
  { id: "RCP-2024-001", patientName: "Sarah Johnson", date: "2024-01-20", amount: 450.00, status: "paid", service: "Root Canal Therapy" },
  { id: "RCP-2024-002", patientName: "Michael Chen", date: "2024-01-22", amount: 120.00, status: "paid", service: "Routine Cleaning" },
  { id: "RCP-2024-003", patientName: "Emma Williams", date: "2024-01-25", amount: 1500.00, status: "pending", service: "Dental Implants" },
  { id: "RCP-2024-004", patientName: "James Wilson", date: "2024-01-28", amount: 85.00, status: "paid", service: "X-Ray Exam" },
  { id: "RCP-2024-005", patientName: "Olivia Brown", date: "2024-01-29", amount: 320.00, status: "overdue", service: "Cavity Filling" },
];

export const ReceiptList: React.FC = () => {
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Receipts & Billing</h2>
          <p className="text-slate-500">Manage all patient transactions and invoices.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
            <Download size={18} />
            <span>Export Report</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <PlusCircle className="w-5 h-5" />
            <span>New Invoice</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by patient or ID..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
              <Filter size={18} className="text-slate-600" />
            </button>
            <select className="px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All Status</option>
              <option>Paid</option>
              <option>Pending</option>
              <option>Overdue</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Receipt ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockReceipts.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-mono text-sm text-slate-600">{receipt.id}</td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-900">{receipt.patientName}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{receipt.service}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {format(new Date(receipt.date), "MMM dd, yyyy")}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    ${receipt.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      receipt.status === "paid" ? "bg-green-100 text-green-700" :
                      receipt.status === "pending" ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedReceipt(receipt)}
                      className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Receipt className="text-blue-600 w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Receipt Details</h3>
                  <p className="text-xs text-slate-500">ID: {selectedReceipt.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Billed To</h4>
                  <p className="font-bold text-lg text-slate-900">{selectedReceipt.patientName}</p>
                  <p className="text-sm text-slate-500">Patient ID: PAT-9921</p>
                </div>
                <div className="text-right">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Clinic</h4>
                  <p className="font-bold text-slate-900">DentalFlow Medical Center</p>
                  <p className="text-sm text-slate-500">123 Health Ave, Suite 400</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Date Issued</p>
                    <p className="font-medium">{format(new Date(selectedReceipt.date), "MMMM dd, yyyy")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Status</p>
                    <div className="flex items-center justify-end gap-1.5 font-medium text-green-600">
                      <CheckCircle2 size={16} />
                      <span>{selectedReceipt.status.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">Treatment Details</h4>
                <div className="flex justify-between items-start py-2">
                  <div>
                    <span className="text-slate-600 block">{selectedReceipt.service}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Tooth #14, #15 • ADA Code D2740</span>
                  </div>
                  <span className="font-semibold">${selectedReceipt.amount.toFixed(2)}</span>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center text-sm">
                  <span className="text-slate-500 italic">Insurance Estimated Coverage (Delta Dental)</span>
                  <span className="text-green-600 font-medium">-$320.00</span>
                </div>

                <div className="flex justify-between items-center py-2 border-t border-slate-100 pt-4">
                  <div>
                    <span className="font-bold text-slate-900 block">Patient Responsibility</span>
                    <span className="text-[10px] text-slate-400">Due upon receipt</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">${(selectedReceipt.amount - 320).toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">Next Appointment Recommendation</p>
                  <p className="text-xs text-blue-700">A follow-up for this service is recommended in 6 months.</p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
                <Printer size={18} />
                <span>Print Receipt</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">
                <Download size={18} />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PlusCircle = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/>
  </svg>
);
