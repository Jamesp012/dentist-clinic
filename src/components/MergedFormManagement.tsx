import React, { useState } from 'react';
import { Patient, Referral, Payment, TreatmentRecord } from '../App';
import { referralAPI } from '../api';
import { generateReferralPDF } from '../utils/referralPdfGenerator';
import { clinicLogo } from '../assets/index';
import { getSafeFileUrl } from '../utils/fileUtils';
import { timeAgo } from '../utils/dateHelpers';

const clinicMap = '/clinic-map.jpg';
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
  DollarSign,
  Trash2,
  Check
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
  setReferrals,
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [referralToDelete, setReferralToDelete] = useState<string | number | null>(null);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewExpanded, setPreviewExpanded] = useState(false);

  const handleFileClick = (file: any) => {
    const fileUrl = getSafeFileUrl(file);
    if (!fileUrl) {
      toast.error('File URL not found');
      return;
    }

    if (file.fileType === 'image') {
      setPreviewImage(fileUrl);
      setPreviewExpanded(false);
    } else {
      window.open(fileUrl, '_blank');
    }
  };

  // Filter and search referrals
  const filteredReferrals = referrals.filter(ref => {
    const matchesSearch =
      ref.patientName.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      ref.referredTo.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      ref.specialty.toLowerCase().includes(state.searchQuery.toLowerCase());

    const matchesStatus = state.filterStatus === 'all' || ref.urgency === state.filterStatus;
    return matchesSearch && matchesStatus;
  });

  const sortedReferrals = [...filteredReferrals].sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return Number(b.id) - Number(a.id);
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

  const formatToDD_MM_YYYY = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('/');
  };

  const handleDownloadReferralPDF = (referral: Referral) => {
    const patient = patients.find(p => String(p.id) === String(referral.patientId));

    const isIncomingPatient =
      (referral.referralType === 'incoming' && referral.source === 'patient-uploaded') ||
      referral.createdByRole === 'patient';

    if (isIncomingPatient) {
      // If patient uploaded original files, prefer downloading original PDF
      const files = referral.uploadedFiles || [];
      const pdfFile = files.find(f => f.fileType === 'application/pdf' || /\.pdf$/i.test(String(f.fileName)) || f.fileType === 'pdf');
      if (pdfFile) {
        const fileUrl = getSafeFileUrl(pdfFile);
        if (fileUrl) {
          // trigger download of original PDF
          try {
            const a = document.createElement('a');
            a.href = fileUrl;
            a.download = String(pdfFile.fileName || 'referral.pdf');
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            a.remove();
            return;
          } catch (e) {
            // fallback: open in new tab
            window.open(fileUrl, '_blank');
            return;
          }
        }
      }
      // If no original PDF found, fall back to generator to provide a PDF
    }

    generateReferralPDF(referral, patient);
  };

  const handleDeleteReferral = (referralId: string | number) => {
    console.log('Delete button clicked. Referral ID:', referralId, 'Type:', typeof referralId);
    setReferralToDelete(referralId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!referralToDelete) return;
    
    try {
      console.log('Calling delete API with ID:', referralToDelete);
      const result = await referralAPI.delete(referralToDelete);
      console.log('Delete API result:', result);
      setReferrals(referrals.filter(r => r.id !== referralToDelete));
      toast.success('Referral deleted successfully');
      setShowDeleteConfirm(false);
      setReferralToDelete(null);
    } catch (error) {
      toast.error('Failed to delete referral');
      console.error('Delete referral error:', error);
      setShowDeleteConfirm(false);
      setReferralToDelete(null);
    }
  };

  const cancelDelete = () => {
    console.log('Delete cancelled by user');
    setShowDeleteConfirm(false);
    setReferralToDelete(null);
  };

  // Helper to ensure selectedServices is always an object
  const normalizeSelectedServices = (referral: Referral): Record<string, boolean | string> => {
    if (!referral.selectedServices) return {};
    if (typeof referral.selectedServices === 'string') {
      try {
        return JSON.parse(referral.selectedServices);
      } catch {
        return {};
      }
    }
    return referral.selectedServices;
  };

  // Handler to toggle a service in the selected referral
  const handleToggleService = (serviceId: string, isCheckboxType: boolean = false) => {
    if (!selectedReferral) return;
    
    const currentServices = normalizeSelectedServices(selectedReferral);
    const newServices = { ...currentServices };
    const currentValue = newServices[serviceId];
    const isCurrentlyChecked = currentValue === true || (typeof currentValue === 'string' && currentValue !== '');
    
    if (serviceId === 'peri') {
      // For periapical with input, toggle between value and empty
      newServices[serviceId] = isCurrentlyChecked ? '' : (typeof currentValue === 'string' ? currentValue : 'tooth');
    } else {
      // For regular services, toggle boolean
      newServices[serviceId] = !isCurrentlyChecked;
    }
    
    setSelectedReferral({ ...selectedReferral, selectedServices: newServices });
  };

  const selectedPatient = selectedReferral
    ? patients.find(p => String(p.id) === String(selectedReferral.patientId))
    : undefined;
  const selectedPatientAge = selectedPatient
    ? String(new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear())
    : '';
  const isSelectedXrayReferral = selectedReferral
    ? selectedReferral.specialty === 'X-Ray Imaging' || selectedReferral.referredTo === 'X-Ray Facility'
    : false;

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
              {sortedReferrals.length > 0 ? (
                sortedReferrals.map((ref) => (
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
                          <span>
                            {ref.referralType === 'incoming' ? 'Referred by: ' : 'Referred to: '}
                            <span className="text-slate-900 font-medium">
                              {ref.referralType === 'incoming' ? (ref.referredBy || ref.referringDentist) : ref.referredTo}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Building2 size={16} />
                          <span>{ref.specialty}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={16} />
                          <span>Sent: {timeAgo(ref.createdAt || ref.date)}</span>
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-2">
                        <FileText size={16} className="text-slate-400 mt-0.5" />
                        <p className="text-sm text-slate-600"><span className="font-semibold text-slate-700">Reason:</span> {ref.reason}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          const normalizedRef = {
                            ...ref,
                            selectedServices: normalizeSelectedServices(ref)
                          };
                          setSelectedReferral(normalizedRef);
                          setShowModal(true);
                        }}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                      >
                        <Eye size={16} />
                        View
                      </button>
                      <button
                        onClick={() => handleDownloadReferralPDF(ref)}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                      >
                        <Download size={16} />
                        PDF
                      </button>
                      <button
                        onClick={() => handleDeleteReferral(ref.id)}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-red-300 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        <Trash2 size={16} />
                        Delete
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-4xl rounded-lg shadow-2xl my-8"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-yellow-50 to-slate-50">
                <h1 className="text-2xl font-bold text-slate-900">
                  {isSelectedXrayReferral ? 'X-Ray Referral Form' : 'Doctor Referral Form'}
                </h1>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-transparent">
                {!isSelectedXrayReferral ? (
                  <div className="space-y-6">
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm whitespace-nowrap font-semibold">Patient's Name:</span>
                        <input
                          type="text"
                          value={selectedReferral.patientName}
                          disabled
                          className="flex-1 border-b-2 border-slate-400 bg-slate-50 px-2 py-2 text-sm font-medium cursor-not-allowed"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm whitespace-nowrap font-semibold">Date:</span>
                          <input
                            type="text"
                            value={formatToDD_MM_YYYY(selectedReferral.date)}
                            disabled
                            className="w-full border-b-2 border-slate-400 bg-slate-50 px-2 py-2 text-sm font-medium cursor-not-allowed"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm whitespace-nowrap font-semibold">Contact No.:</span>
                          <input
                            type="text"
                            value={selectedPatient?.phone || ''}
                            disabled
                            className="w-full border-b-2 border-slate-400 bg-slate-50 px-2 py-2 text-sm font-medium cursor-not-allowed"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm whitespace-nowrap font-semibold">Age:</span>
                          <input
                            type="text"
                            value={selectedPatientAge}
                            disabled
                            className="w-full border-b-2 border-slate-400 bg-slate-50 px-2 py-2 text-sm font-medium cursor-not-allowed"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm whitespace-nowrap font-semibold">Sex:</span>
                          <input
                            type="text"
                            value={selectedPatient?.sex || ''}
                            disabled
                            className="w-full border-b-2 border-slate-400 bg-slate-50 px-2 py-2 text-sm font-medium cursor-not-allowed"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm whitespace-nowrap font-semibold">Date Of Birth:</span>
                          <input
                            type="text"
                            value={selectedPatient?.dateOfBirth || ''}
                            disabled
                            className="w-full border-b-2 border-slate-400 bg-slate-50 px-2 py-2 text-sm font-medium cursor-not-allowed"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm whitespace-nowrap font-semibold">Referred by:</span>
                          <input
                            type="text"
                            value={selectedReferral.referringDentist || selectedReferral.referredBy || (selectedReferral.referralType === 'outgoing' ? 'Doc Maaño' : '')}
                            disabled
                            className="w-full border-b-2 border-slate-400 bg-slate-50 px-2 py-2 text-sm font-medium cursor-not-allowed"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm whitespace-nowrap font-semibold">Referred to:</span>
                          <input
                            type="text"
                            value={selectedReferral.referredTo || (selectedReferral.referralType === 'incoming' ? 'Doc Maaño' : '')}
                            disabled
                            className="w-full border-b-2 border-slate-400 bg-slate-50 px-2 py-2 text-sm font-medium cursor-not-allowed"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm whitespace-nowrap font-semibold">Contact No.:</span>
                          <input
                            type="text"
                            value={selectedReferral.referredByContact || ''}
                            disabled
                            className="w-full border-b-2 border-slate-400 bg-slate-50 px-2 py-2 text-sm font-medium cursor-not-allowed"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm whitespace-nowrap font-semibold">Clinic Email Address:</span>
                          <input
                            type="text"
                            value={selectedReferral.referredByEmail || ''}
                            disabled
                            className="w-full border-b-2 border-slate-400 bg-slate-50 px-2 py-2 text-sm font-medium cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8 py-8 border-t-4 border-yellow-400">
                      <div className="space-y-3">
                        <h2 className="font-black text-lg uppercase mb-4">Diagnostic Services:</h2>
                        {[
                          { label: 'STANDARD PANORAMIC', id: 'pano' },
                          { label: 'TMJ (OPEN & CLOSE)', id: 'tmj' },
                          { label: 'SINUS PA', id: 'sinus' },
                          { label: 'BITEWING LEFT SIDE', id: 'bite-l' },
                          { label: 'BITEWING RIGHT SIDE', id: 'bite-r' },
                          { label: 'PERIAPICAL XRAY TOOTH#', id: 'peri' }
                        ].map(({ label, id }) => {
                          if (!selectedReferral) return null;
                          const services = normalizeSelectedServices(selectedReferral);
                          const isChecked = services[id] === true || (typeof services[id] === 'string' && services[id] !== '');
                          
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => handleToggleService(id, false)}
                              className="flex items-center gap-3 w-full p-2 rounded hover:bg-yellow-50 transition-colors text-left cursor-pointer"
                            >
                              <div className={`w-5 h-5 rounded-full border-2 border-yellow-400 flex items-center justify-center flex-shrink-0 transition-colors ${
                                isChecked ? 'bg-yellow-400' : 'bg-white'
                              }`}>
                                {isChecked && <Check className="text-white w-3.5 h-3.5 stroke-[4]" />}
                              </div>
                              <span className="text-sm font-bold tracking-tight">{label}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="space-y-3 pt-6">
                        <h2 className="font-black text-lg uppercase mb-4">OTHER SERVICES</h2>
                        {[
                          { label: 'DIAGNOSTIC MODEL CAST', id: 'model' },
                          { label: 'INTRAORAL PHOTOGRAPH', id: 'intra' },
                          { label: 'EXTRAORAL PHOTOGRAPH', id: 'extra' }
                        ].map(({ label, id }) => {
                          if (!selectedReferral) return null;
                          const services = normalizeSelectedServices(selectedReferral);
                          const isChecked = services[id] === true || (typeof services[id] === 'string' && services[id] !== '');
                          
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => handleToggleService(id, false)}
                              className="flex items-center gap-3 w-full p-2 rounded hover:bg-yellow-50 transition-colors text-left cursor-pointer"
                            >
                              <div className={`w-5 h-5 rounded-full border-2 border-yellow-400 flex items-center justify-center flex-shrink-0 transition-colors ${
                                isChecked ? 'bg-yellow-400' : 'bg-white'
                              }`}>
                                {isChecked && <Check className="text-white w-3.5 h-3.5 stroke-[4]" />}
                              </div>
                              <span className="text-sm font-bold tracking-tight">{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 pb-8 grid grid-cols-2 gap-8 border-b-4 border-yellow-400">
                      <div className="space-y-3 text-sm">
                        <img
                          src={clinicLogo}
                          alt="Clinic Logo"
                          className="w-full max-h-32 object-contain"
                        />
                        <div>
                          <p className="font-bold text-gray-800">Address:</p>
                          <p className="text-gray-700">#48 Luis Palad Street, Brgy. Angeles Zone 1, Tayabas City</p>
                          <p className="text-gray-700">(infront of St. Jude Pharmacy, beside Motoposh Tayabas)</p>
                          <p className="text-gray-700">Lucena-Tayabas Road, Luis Palad Street</p>
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">Email:</p>
                          <p className="text-gray-700">j.aguilardentalclinic@gmail.com</p>
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">Facebook:</p>
                          <p className="text-gray-700">J. Aguilar Dental Clinic Tayabas Branch</p>
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">Contact No.:</p>
                          <p className="text-gray-700">0938-171-7695</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        <img 
                          src={clinicMap} 
                          alt="Clinic Location Map" 
                          className="w-full h-auto object-contain rounded-lg border-2 border-gray-300"
                        />
                      </div>
                    </div>

                    {/* Thank You Message */}
                    <div className="mt-6 pt-6 text-left space-y-2">
                      <p className="font-bold text-gray-800 text-lg">THANK YOU FOR YOUR REFERRAL!</p>
                      <p className="text-gray-700 text-sm leading-relaxed">It is our policy to decline performing procedures that are not indicated in the referral form.<br />This is based on our strict observance of the Dental Code of Ethics.</p>
                    </div>

                    {/* Attached Files Section */}
                    {selectedReferral.uploadedFiles && selectedReferral.uploadedFiles.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-slate-200">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <Download size={20} className="text-blue-600" />
                          Attached Patient Documents ({selectedReferral.uploadedFiles.length})
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedReferral.uploadedFiles.map((file) => {
                            const fileUrl = getSafeFileUrl(file);
                            return (
                              <div 
                                key={file.id}
                                className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                              >
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="p-2 bg-white rounded-lg border border-slate-200 flex-shrink-0">
                                    {file.fileType === 'image' ? (
                                      <img src={fileUrl} alt={file.fileName} className="w-8 h-8 object-cover rounded shadow-sm" />
                                    ) : (
                                      <FileText className="w-8 h-8 text-blue-500" />
                                    )}
                                  </div>
                                  <div className="overflow-hidden">
                                    <p className="text-sm font-bold text-slate-900 truncate">{file.fileName}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{file.fileType}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2 ml-2">
                                  {file.fileType === 'image' && (
                                    <button
                                      onClick={() => handleFileClick(file)}
                                      className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:text-blue-600 hover:border-blue-200 transition-colors"
                                      title="Preview"
                                    >
                                      <Eye size={18} />
                                    </button>
                                  )}
                                  <a
                                    href={fileUrl}
                                    download={file.fileName}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:text-green-600 hover:border-green-200 transition-colors"
                                    title="Download"
                                  >
                                    <Download size={18} />
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-4 border-b pb-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm whitespace-nowrap font-semibold">Date:</span>
                        <input
                          type="text"
                          value={formatToDD_MM_YYYY(selectedReferral.date)}
                          disabled
                          className="flex-1 border-b-2 border-slate-400 bg-slate-50 px-2 py-2 text-sm font-medium cursor-not-allowed"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm whitespace-nowrap font-semibold">Patient's Name:</span>
                        <input
                          type="text"
                          value={selectedReferral.patientName}
                          disabled
                          className="flex-1 border-b-2 border-slate-400 bg-slate-50 px-2 py-2 text-sm font-medium cursor-not-allowed"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm whitespace-nowrap font-semibold">Birthday:</span>
                          <input
                            type="text"
                            value={selectedPatient?.dateOfBirth || ''}
                            disabled
                            className="w-full border-b-2 border-slate-400 bg-slate-50 px-2 py-2 text-sm font-medium cursor-not-allowed"
                          />
                        </div>
                        <div className="flex items-center gap-8">
                          {['Male', 'Female'].map(sex => (
                            <label key={sex} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="sex"
                                value={sex}
                                checked={selectedPatient?.sex === sex}
                                disabled
                                className="w-4 h-4"
                              />
                              <span className="font-bold">{sex}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm whitespace-nowrap font-semibold">Referred by Dr.:</span>
                          <input
                            type="text"
                            value={selectedReferral.referringDentist}
                            disabled
                            className="w-full border-b-2 border-slate-400 bg-slate-50 px-2 py-2 text-sm font-medium cursor-not-allowed"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm whitespace-nowrap font-semibold">Dentist's Contact #:</span>
                          <input
                            type="text"
                            value={selectedReferral.referredByContact || ''}
                            disabled
                            className="w-full border-b-2 border-slate-400 bg-slate-50 px-2 py-2 text-sm font-medium cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-black text-center uppercase mb-4">DIAGNOSTIC SERVICES</h3>
                      <div className="grid grid-cols-2 gap-6">
                        {[
                          { label: 'Panoramic X-Ray', id: 'panoramic' },
                          { label: 'Periapical X-Ray', id: 'periapical' },
                          { label: 'Bitewing X-Ray', id: 'bitewing' },
                          { label: 'Occlusal X-Ray', id: 'occlusal' },
                          { label: 'TMJ X-Ray', id: 'tmj' },
                          { label: 'CBCT (3D Imaging)', id: 'cbct' }
                        ].map(({ label, id }) => {
                          if (!selectedReferral) return null;
                          const services = normalizeSelectedServices(selectedReferral);
                          const isChecked = Boolean(services[id]);
                          
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => handleToggleService(id, true)}
                              className="flex items-center gap-3 w-full p-2 rounded hover:bg-blue-50 transition-colors text-left cursor-pointer"
                            >
                              <div className={`w-5 h-5 rounded-full border-2 border-blue-400 flex items-center justify-center flex-shrink-0 transition-colors ${
                                isChecked ? 'bg-blue-400' : 'bg-white'
                              }`}>
                                {isChecked && <Check className="text-white w-3.5 h-3.5 stroke-[4]" />}
                              </div>
                              <span className="font-bold">{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 grid grid-cols-2 gap-8">
                      <div className="space-y-3 text-sm">
                        <img
                          src={clinicLogo}
                          alt="Clinic Logo"
                          className="w-full max-h-32 object-contain"
                        />
                        <div>
                          <p className="font-bold text-gray-800">Address:</p>
                          <p className="text-gray-700">#48 Luis Palad Street, Brgy. Angeles Zone 1, Tayabas City</p>
                          <p className="text-gray-700">(infront of St. Jude Pharmacy, beside Motoposh Tayabas)</p>
                          <p className="text-gray-700">Lucena-Tayabas Road, Luis Palad Street</p>
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">Email:</p>
                          <p className="text-gray-700">j.aguilardentalclinic@gmail.com</p>
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">Facebook:</p>
                          <p className="text-gray-700">J. Aguilar Dental Clinic Tayabas Branch</p>
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">Contact No.:</p>
                          <p className="text-gray-700">0938-171-7695</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        <img
                          src={clinicMap}
                          alt="Clinic Location Map"
                          className="w-full h-auto object-contain rounded-lg border-2 border-gray-300"
                        />
                      </div>
                    </div>

                    {/* Attached Files Section for X-Ray */}
                    {selectedReferral.uploadedFiles && selectedReferral.uploadedFiles.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-slate-200">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <Download size={20} className="text-blue-600" />
                          Attached Patient Documents ({selectedReferral.uploadedFiles.length})
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedReferral.uploadedFiles.map((file) => {
                            const fileUrl = getSafeFileUrl(file);
                            return (
                              <div 
                                key={file.id}
                                className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                              >
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="p-2 bg-white rounded-lg border border-slate-200 flex-shrink-0">
                                    {file.fileType === 'image' ? (
                                      <img src={fileUrl} alt={file.fileName} className="w-8 h-8 object-cover rounded shadow-sm" />
                                    ) : (
                                      <FileText className="w-8 h-8 text-blue-500" />
                                    )}
                                  </div>
                                  <div className="overflow-hidden">
                                    <p className="text-sm font-bold text-slate-900 truncate">{file.fileName}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{file.fileType}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2 ml-2">
                                  {file.fileType === 'image' && (
                                    <button
                                      onClick={() => handleFileClick(file)}
                                      className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:text-blue-600 hover:border-blue-200 transition-colors"
                                      title="Preview"
                                    >
                                      <Eye size={18} />
                                    </button>
                                  )}
                                  <a
                                    href={fileUrl}
                                    download={file.fileName}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:text-green-600 hover:border-green-200 transition-colors"
                                    title="Download"
                                  >
                                    <Download size={18} />
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-semibold"
                >
                  Close
                </button>
                {!isSelectedXrayReferral && (
                  <button
                    onClick={async () => {
                      if (selectedReferral) {
                        try {
                          await referralAPI.update(selectedReferral.id, selectedReferral);
                          toast.success('Referral updated successfully');
                        } catch (error) {
                          toast.error('Failed to update referral');
                        }
                      }
                    }}
                    className="flex-1 px-4 py-2 flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                  >
                    <Check size={18} />
                    Save Changes
                  </button>
                )}
                <button
                  onClick={() => {
                    if (selectedReferral) {
                      handleDownloadReferralPDF(selectedReferral);
                    }
                  }}
                  className="flex-1 px-4 py-2 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  <Download size={18} />
                  Download PDF
                </button>
                <button
                  onClick={() => {
                    if (selectedReferral) {
                      setShowModal(false);
                      handleDeleteReferral(selectedReferral.id);
                    }
                  }}
                  className="flex-1 px-4 py-2 flex items-center justify-center gap-2 border border-red-300 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-semibold"
                >
                  <Trash2 size={18} />
                  Delete
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={cancelDelete}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="text-red-600" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Delete Referral</h3>
                  <p className="text-sm text-slate-500">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-slate-700 mb-6">
                Are you sure you want to delete this referral? All information will be permanently removed.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image preview modal */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-[95vw] max-h-[95vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { setPreviewImage(null); setPreviewExpanded(false); }}
                className="absolute -top-4 -right-4 z-[70] p-3 bg-white hover:bg-gray-100 rounded-full shadow-lg transition-colors border border-gray-200"
              >
                <X className="w-6 h-6 text-gray-900" />
              </button>

              <img
                src={previewImage}
                alt="Preview"
                className="block max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl bg-white"
                onClick={() => setPreviewExpanded(prev => !prev)}
                style={previewExpanded ? { width: '95vw', height: '95vh', cursor: 'zoom-out' } : { cursor: 'zoom-in' }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MergedFormManagement;
