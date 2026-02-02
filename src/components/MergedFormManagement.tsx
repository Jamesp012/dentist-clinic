import React, { useState } from 'react';
import { Patient, Referral, Payment, TreatmentRecord } from '../App';
import {
  FileText,
  X,
  Download,
  Search,
  Eye,
  ClipboardList,
  Building2,
  UserCircle2,
  Calendar,
  ArrowUpRight,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface MergedFormState {
  selectedTab: 'referrals' | 'receipts';
  searchQuery: string;
  filterStatus: string;
}

type MergedFormsComponentProps = {
  referrals: Referral[];
  setReferrals: (referrals: Referral[]) => void;
  patients: Patient[];
  treatmentRecords: TreatmentRecord[];
  payments?: Payment[];
};

export const MergedFormManagement: React.FC<MergedFormsComponentProps> = ({
  referrals,
  patients,
  treatmentRecords,
}) => {
  const [state, setState] = useState<MergedFormState>({
    selectedTab: 'referrals',
    searchQuery: '',
    filterStatus: 'all'
  });

  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<TreatmentRecord | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Filter and search referrals
  const filteredReferrals = referrals.filter(ref => {
    const matchesSearch =
      ref.patientName.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      ref.referredTo.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      ref.specialty.toLowerCase().includes(state.searchQuery.toLowerCase());

    const matchesStatus = state.filterStatus === 'all' || ref.urgency === state.filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Generate receipts from treatment records
  const receipts = treatmentRecords.map(treatment => ({
    ...treatment,
    patientName: patients.find(p => String(p.id) === String(treatment.patientId))?.name || 'Unknown',
    service: treatment.treatment || treatment.type || treatment.description || 'Service',
    status: (treatment.amountPaid && Number(treatment.amountPaid) >= Number(treatment.cost))
      ? 'paid'
      : new Date(treatment.date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) && !treatment.amountPaid
      ? 'overdue'
      : 'pending' as 'paid' | 'pending' | 'overdue'
  }));

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch =
      receipt.patientName.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      receipt.service.toLowerCase().includes(state.searchQuery.toLowerCase());

    const matchesStatus = state.filterStatus === 'all' || receipt.status === state.filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusConfig = {
    'routine': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Routine' },
    'urgent': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Urgent' },
    'emergency': { bg: 'bg-red-100', text: 'text-red-700', label: 'Emergency' },
    'paid': { bg: 'bg-green-100', text: 'text-green-700', label: 'Paid' },
    'pending': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
    'overdue': { bg: 'bg-red-100', text: 'text-red-700', label: 'Overdue' }
  };

  return (
    <div className="space-y-6">
      {/* Referrals Tab */}
      {state.selectedTab === 'referrals' && (
        <>
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
                <span className="text-2xl font-bold text-blue-900">{referrals.length}</span>
              </div>
              <p className="text-sm font-semibold text-blue-800">Total Referrals</p>
              <p className="text-xs text-blue-600 mt-1">{referrals.filter(r => r.urgency !== 'routine').length} urgent/emergency</p>
            </div>

            <div className="bg-green-50 border border-green-100 p-5 rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCircle2 className="text-green-600" size={20} />
                </div>
                <span className="text-2xl font-bold text-green-900">{patients.length}</span>
              </div>
              <p className="text-sm font-semibold text-green-800">Total Patients</p>
              <p className="text-xs text-green-600 mt-1">Active in system</p>
            </div>

            <div className="bg-purple-50 border border-purple-100 p-5 rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building2 className="text-purple-600" size={20} />
                </div>
                <span className="text-2xl font-bold text-purple-900">{new Set(referrals.map(r => r.specialty)).size}</span>
              </div>
              <p className="text-sm font-semibold text-purple-800">Specialties</p>
              <p className="text-xs text-purple-600 mt-1">Referring to specialists</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Filter by specialist or patient..."
                  value={state.searchQuery}
                  onChange={(e) => setState({ ...state, searchQuery: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <select
                value={state.filterStatus}
                onChange={(e) => setState({ ...state, filterStatus: e.target.value })}
                className="px-4 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Urgency</option>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredReferrals.length > 0 ? (
                filteredReferrals.map((ref) => (
                  <div key={ref.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col lg:flex-row gap-6 lg:items-center">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-slate-900 text-lg">{ref.patientName}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          statusConfig[ref.urgency as keyof typeof statusConfig]?.bg
                        } ${statusConfig[ref.urgency as keyof typeof statusConfig]?.text}`}>
                          {statusConfig[ref.urgency as keyof typeof statusConfig]?.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-y-2 gap-x-6 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <UserCircle2 size={16} />
                          <span>Referred to: <span className="text-slate-900 font-medium">{ref.referredTo}</span></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Building2 size={16} />
                          <span>{ref.specialty}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={16} />
                          <span>Sent: {formatToDD_MM_YYYY(ref.date)}</span>
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-2">
                        <FileText size={16} className="text-slate-400 mt-0.5" />
                        <p className="text-sm text-slate-600"><span className="font-semibold text-slate-700">Reason:</span> {ref.reason}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedReferral(ref);
                          setShowModal(true);
                        }}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                      >
                        <Eye size={16} />
                        View
                      </button>
                      <button
                        onClick={() => {
                          const content = `REFERRAL: ${ref.patientName}\nTo: ${ref.referredTo}\nSpecialty: ${ref.specialty}\nReason: ${ref.reason}`;
                          const blob = new Blob([content], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `referral-${ref.patientName}.txt`;
                          a.click();
                          toast.success('Referral downloaded');
                        }}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                      >
                        <Download size={16} />
                        Export
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <FileText size={48} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">No referrals found</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Receipts Tab */}
      {state.selectedTab === 'receipts' && (
        <>
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
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by patient or service..."
                  value={state.searchQuery}
                  onChange={(e) => setState({ ...state, searchQuery: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
              <select
                value={state.filterStatus}
                onChange={(e) => setState({ ...state, filterStatus: e.target.value })}
                className="px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Name</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReceipts.length > 0 ? (
                    filteredReceipts.map((receipt) => (
                      <tr key={receipt.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-900">{receipt.patientName}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {receipt.treatment || receipt.type || receipt.description || 'Service'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatToDD_MM_YYYY(receipt.date)}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          ₱{(receipt.cost || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            statusConfig[receipt.status as keyof typeof statusConfig]?.bg
                          } ${statusConfig[receipt.status as keyof typeof statusConfig]?.text}`}>
                            {statusConfig[receipt.status as keyof typeof statusConfig]?.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedReceipt(receipt);
                              setShowModal(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <DollarSign size={48} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500">No receipts found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tab Buttons */}
      <div className="fixed bottom-6 right-6 flex gap-2">
        <button
          onClick={() => setState({ ...state, selectedTab: 'referrals', searchQuery: '', filterStatus: 'all' })}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            state.selectedTab === 'referrals'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Referrals
        </button>
        <button
          onClick={() => setState({ ...state, selectedTab: 'receipts', searchQuery: '', filterStatus: 'all' })}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            state.selectedTab === 'receipts'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Receipts
        </button>
      </div>

      {/* Referral Detail Modal */}
      <AnimatePresence>
        {showModal && selectedReferral && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <FileText className="text-blue-600 w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Referral Details</h3>
                    <p className="text-xs text-slate-500">ID: {selectedReferral.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-2">Patient</p>
                    <p className="font-bold text-lg text-slate-900">{selectedReferral.patientName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-2">Specialist</p>
                    <p className="font-bold text-lg text-slate-900">{selectedReferral.referredTo}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-2">Specialty</p>
                    <p className="text-slate-700">{selectedReferral.specialty}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-2">Date Referred</p>
                    <p className="text-slate-700">{formatToDD_MM_YYYY(selectedReferral.date)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold mb-3">Reason</p>
                  <p className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-slate-700">{selectedReferral.reason}</p>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receipt Detail Modal */}
      <AnimatePresence>
        {showModal && selectedReceipt && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="text-blue-600 w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Receipt Details</h3>
                    <p className="text-xs text-slate-500">Treatment #{selectedReceipt.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Patient</h4>
                    <p className="font-bold text-lg text-slate-900">{patients.find(p => String(p.id) === String(selectedReceipt.patientId))?.name || 'Unknown'}</p>
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Amount</h4>
                    <p className="font-bold text-2xl text-blue-600">₱{(selectedReceipt.cost || 0).toFixed(2)}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Date</p>
                      <p className="font-medium">{formatToDD_MM_YYYY(selectedReceipt.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Service</p>
                      <p className="font-medium">{selectedReceipt.treatment || selectedReceipt.type || selectedReceipt.description}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const content = `Receipt: ${selectedReceipt.id}\nPatient: ${patients.find(p => String(p.id) === String(selectedReceipt.patientId))?.name}\nService: ${selectedReceipt.treatment || selectedReceipt.type || selectedReceipt.description}\nAmount: ₱${(selectedReceipt.cost || 0).toFixed(2)}`;
                    const blob = new Blob([content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `receipt-${selectedReceipt.id}.txt`;
                    a.click();
                    toast.success('Receipt downloaded');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <Download size={18} />
                  Download
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MergedFormManagement;
