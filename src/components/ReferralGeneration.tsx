import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Check, Eye, Trash2, Download, FileText, Camera } from 'lucide-react';
import { Referral, Patient } from '../App';
import { toast } from 'sonner';
import { referralAPI } from '../api';
import { generateReferralPDF } from '../utils/referralPdfGenerator';
import { PatientSearchInput } from './PatientSearchInput';
import { getSafeFileUrl } from '../utils/fileUtils';
import { motion, AnimatePresence } from 'motion/react';

// Import image assets
import { clinicLogo, clinicMap, xrayClinic } from '../assets';

type ReferralType = 'doctor' | 'xray' | null;

type ReferralFilter = 'all' | 'incoming' | 'outgoing';

interface ReferralGenerationProps {
  referrals: Referral[];
  setReferrals: (referrals: Referral[]) => void;
  patients: Patient[];
}

type UnderlineInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const getCheckboxValue = (value: any): boolean => {
  if (value === true) return true;
  if (typeof value === 'string') return value.trim() !== '';
  return false;
};

const UnderlineInput = ({ label, value, onChange, disabled }: UnderlineInputProps) => (
  <div className="flex items-center gap-2">
    <span className="text-sm whitespace-nowrap font-semibold">{label}</span>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`flex-1 border-b-2 px-2 py-2 text-sm ${
        disabled
          ? 'border-slate-300 bg-slate-50 cursor-not-allowed text-slate-500'
          : 'border-slate-400 bg-white focus:outline-none focus:border-teal-500'
      }`}
    />
  </div>
);

const formatFullName = (fullName: string | undefined | null) => {
  if (!fullName) return '';
  // Force single line by replacing any newlines or multiple spaces
  const trimmed = fullName.trim().replace(/\s+/g, ' ');
  if (trimmed.includes(',')) {
    const [last, ...given] = trimmed.split(',').map(s => s.trim());
    return `${given.join(' ')} ${last}`.trim();
  }
  return trimmed;
};

// Helpers moved outside component for better performance and structure
const getNameParts = (fullName: string | undefined | null) => {
  if (!fullName) {
    return { lastName: '', givenNames: '' };
  }
  const trimmed = fullName.trim();
  if (trimmed.includes(',')) {
    const [last, ...given] = trimmed.split(',').map(s => s.trim());
    return { lastName: last, givenNames: given.join(' ') };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { lastName: parts[0], givenNames: '' };
  }
  const lastName = parts[parts.length - 1];
  const givenNames = parts.slice(0, -1).join(' ');
  return { lastName, givenNames };
};

const formatPatientName = (fullName: string | undefined | null) => {
  return formatFullName(fullName);
};

const getReferralPatientName = (referral: Referral, patients: Patient[]) => {
  const patient = patients.find(p => String(p.id) === String(referral.patientId));
  return patient?.name || referral.patientName;
};

const isSelectedIncomingPatientReferral = (referral: Referral | null): boolean => {
  if (!referral) return false;
  return (referral.referralType === 'incoming' && referral.source === 'patient-uploaded') || 
         referral.createdByRole === 'patient';
};

const formatToDD_MM_YYYY = (date: string | Date): string => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB').replace(/\//g, '-'); // DD-MM-YYYY
};

// Incoming referral read-only view component
const IncomingReferralView = ({ referral, patient, onClose }: { referral: Referral; patient?: Patient; onClose: () => void }) => {
  const files = referral.uploadedFiles || [];
  
  const patientName = referral.patientName || patient?.name || '';
  const clinicName = referral.referredBy || referral.referringDentist || '';
  const referringDoctor = referral.referringDentist || '';
  const dateReferred = formatToDD_MM_YYYY(referral.date);

  return (
    <div 
      className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl my-8 border border-slate-200/60 relative z-[10001] flex flex-col max-h-[90vh]"
      onClick={(e) => e.stopPropagation()}
      style={{ pointerEvents: 'auto' }}
    >
      <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Incoming Referral</h2>
              <p className="text-sm text-slate-500 font-medium">Patient-uploaded referral document</p>
            </div>
          </div>
          <button 
            type="button" 
            className="p-2.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-all duration-200" 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200">
          {/* Top: Patient Details (read-only row layout) */}
          <div className="space-y-2">
            <div className="flex items-center gap-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100 group">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32 shrink-0">Patient Name</label>
              <div className="text-base font-bold text-slate-900 flex-1">{formatFullName(patientName)}</div>
            </div>
            
            <div className="flex items-center gap-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100 group">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32 shrink-0">Date Referred</label>
              <div className="text-base font-bold text-slate-900 flex-1">{dateReferred}</div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100 group">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32 shrink-0">Referring Clinic</label>
              <div className="text-base font-bold text-slate-900 flex-1">{clinicName || 'Not specified'}</div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100 group">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32 shrink-0">Referring Doctor</label>
              <div className="text-base font-bold text-slate-900 flex-1">{referringDoctor || 'Not specified'}</div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100 group">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32 shrink-0">Contact Number</label>
              <div className="text-base font-bold text-slate-900 flex-1">{referral.referredByContact || patient?.phone || '-'}</div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100 group">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32 shrink-0">Email Address</label>
              <div className="text-base font-bold text-slate-900 flex-1">{referral.referredByEmail || patient?.email || '-'}</div>
            </div>
          </div>

          {/* Bottom: Uploaded file */}
          <div className="pt-6 border-t border-slate-100">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 block">Uploaded Referral Document</label>
            <div className="space-y-4">
              {files.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <FileText className="w-12 h-12 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500 font-medium">No uploaded document available</p>
                </div>
              )}
              {files.length > 0 && files.map((f, idx) => {
                const isImg = f.fileType?.startsWith?.('image/') || /\.(jpg|jpeg|png|gif|bmp)$/i.test(String(f.fileName));
                const isPdf = f.fileType === 'application/pdf' || /\.pdf$/i.test(String(f.fileName)) || f.fileType === 'pdf';
                const fileUrl = getSafeFileUrl(f);
                return (
                  <div key={idx} className="space-y-4">
                    {isImg && (
                      <div className="relative group/img overflow-hidden rounded-2xl border-2 border-slate-200 hover:border-blue-400 transition-all shadow-sm hover:shadow-md">
                        <img
                          src={fileUrl}
                          alt={String(f.fileName)}
                          className="w-full max-h-[500px] object-contain bg-slate-50"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button 
                            onClick={() => window.open(fileUrl, '_blank')}
                            className="px-4 py-2 bg-white text-slate-900 rounded-lg font-bold text-sm shadow-xl hover:scale-105 transition-transform"
                          >
                            Open Full Size
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm">
                          {isPdf ? <FileText className="w-5 h-5 text-red-500" /> : <Camera className="w-5 h-5 text-blue-500" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{f.fileName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{f.fileType || (isPdf ? 'PDF Document' : 'Image')}</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const pdfUrl = getSafeFileUrl(f);
                          if (!pdfUrl) return;
                          const a = document.createElement('a');
                          a.href = pdfUrl;
                          a.download = String(f.fileName || 'referral.pdf');
                          a.target = '_blank';
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                        }}
                        className="px-4 py-2 bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                      >
                        <Download size={16} />
                        Download
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl">
          <button
            onClick={onClose}
            className="w-full px-6 py-3.5 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all font-bold shadow-sm"
          >
            Close Document View
          </button>
        </div>
    </div>
  );
};

const ServiceItem = ({ 
  label, 
  id, 
  showInput, 
  onInputChange, 
  selectedServices, 
  toggleService 
}: { 
  label: string; 
  id: string; 
  showInput?: boolean; 
  onInputChange?: (id: string, value: string) => void;
  selectedServices: Record<string, boolean | string>;
  toggleService: (id: string) => void;
}) => {
  const inputValue = typeof selectedServices[id] === 'string' ? selectedServices[id] as string : '';
  return (
    <div className="flex items-center gap-3 relative z-50" style={{ pointerEvents: 'auto' }}>
      <label className="flex items-center cursor-pointer relative">
        <input
          type="checkbox"
          checked={!!selectedServices[id]}
          onChange={() => toggleService(id)}
          className="w-5 h-5 rounded-full border-2 border-yellow-400 transition-colors flex-shrink-0 checked:bg-yellow-400 checked:border-yellow-400 focus:ring-2 focus:ring-yellow-500"
        />
        {selectedServices[id] && (
          <span className="absolute left-1 top-1 pointer-events-none">
            <Check className="text-white w-3.5 h-3.5 stroke-[4]" />
          </span>
        )}
        <span className="ml-2 text-sm font-bold tracking-tight text-left select-none">{label}</span>
      </label>
      {showInput && (
        <input
          id={`service-${id}`}
          name={`service-${id}`}
          type="text"
          value={inputValue}
          onChange={(e) => {
            e.stopPropagation();
            onInputChange?.(id, e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-16 border-b border-slate-400 focus:outline-none focus:border-yellow-500 bg-transparent text-sm px-1 font-normal"
        />
      )}
    </div>
  );
};

export function ReferralGeneration({ referrals, setReferrals, patients }: ReferralGenerationProps) {
  const [referralType, setReferralType] = useState<ReferralType>(null);
  const [referralFilter, setReferralFilter] = useState<ReferralFilter>('all');
  const [allViewMode, setAllViewMode] = useState<'alphabetical' | 'recent'>('alphabetical');
  const [showTypeSelection, setShowTypeSelection] = useState(false);
  const [selectedServices, setSelectedServices] = useState<Record<string, boolean | string>>({});
  const [selectedXrayItems, setSelectedXrayItems] = useState<Record<string, boolean | string>>({});
  const [xrayDiagramSelections, setXrayDiagramSelections] = useState<Record<string, 'black' | 'red'>>({});
  const [xrayColorMode, setXrayColorMode] = useState<'black' | 'red'>('black');
  const [xrayNotes, setXrayNotes] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
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
  const [formData, setFormData] = useState({
    patientName: '',
    patientId: '',
    contactNo: '',
    age: '',
    dateOfBirth: '',
    sex: '',
    referredBy: '',
    referredByContact: '',
    referredByEmail: '',
    specialty: '',
    reason: '',
    date: new Date().toISOString().split('T')[0],
    urgency: 'routine' as 'routine' | 'urgent' | 'emergency',
  });
  const toggleService = (id: string) => {
    setSelectedServices(prev => {
      const current = prev[id];
      if (typeof current === 'string') {
        return { ...prev, [id]: false };
      }
      return { ...prev, [id]: !current };
    });
  };

  const toggleXrayItem = (id: string) => {
    setSelectedXrayItems(prev => {
      const current = prev[id];
      if (typeof current === 'string') {
        return { ...prev, [id]: false };
      }
      return { ...prev, [id]: !current };
    });
  };

  const handleServiceInputChange = (id: string, value: string) => {
    setSelectedServices(prev => ({ ...prev, [id]: value || false }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleXrayDiagramClick = (elementId: string) => {
    setXrayDiagramSelections(prev => {
      if (prev[elementId] === xrayColorMode) {
        // Toggle off if clicking the same color
        const { [elementId]: _, ...rest } = prev;
        return rest;
      }
      // Set or update with current color mode
      return { ...prev, [elementId]: xrayColorMode };
    });
  };

  const handlePatientSelect = (patientId: string) => {
    const patient = patients.find(p => String(p.id) === patientId);
    if (patient) {
      const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
      setFormData(prev => ({
        ...prev,
        patientId,
        patientName: patient.name,
        contactNo: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        age: String(age),
        sex: patient.sex
      }));
    }
  };

  const handleCreateReferral = async () => {
    console.log('handleCreateReferral called');
    if (!formData.patientName) {
      toast.error('Please select a patient');
      return;
    }

    if (!formData.referredBy) {
      toast.error('Please enter who is referring');
      return;
    }

    try {
      const newReferral: any = {
        patientId: formData.patientId,
        patientName: formData.patientName,
        referringDentist: formData.referredBy,
        referredByContact: formData.referredByContact,
        referredByEmail: formData.referredByEmail,
        referredTo: formData.specialty || (referralType === 'xray' ? 'X-Ray Facility' : ''),
        specialty: referralType === 'xray' ? 'X-Ray Imaging' : formData.specialty,
        reason: formData.reason,
        selectedServices: referralType === 'doctor' ? selectedServices : selectedXrayItems,
        date: formData.date,
        urgency: formData.urgency,
        createdByRole: 'staff',
        referralType: 'outgoing' // Mark as outgoing referral (created by doctor)
      };

      // Include X-ray diagram data if it's an X-ray referral
      if (referralType === 'xray') {
        newReferral.xrayDiagramSelections = xrayDiagramSelections;
        newReferral.xrayNotes = xrayNotes;
      }

      console.log('Creating referral with data:', newReferral);
      const response = await referralAPI.create(newReferral);
      console.log('Referral created successfully:', response);
      setReferrals([...referrals, response]);
      
      resetForm();
      setReferralType(null);
      setShowTypeSelection(false);
      toast.success('Referral created successfully');
    } catch (error) {
      console.error('Failed to create referral error:', error);
      const errorMessage = (error as { message?: string })?.message || 'Failed to create referral';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      patientName: '',
      patientId: '',
      contactNo: '',
      age: '',
      dateOfBirth: '',
      sex: '',
      referredBy: '',
      referredByContact: '',
      referredByEmail: '',
      specialty: '',
      reason: '',
      date: new Date().toISOString().split('T')[0],
      urgency: 'routine'
    });
    setSelectedServices({});
    setSelectedXrayItems({});
    setXrayDiagramSelections({});
    setXrayColorMode('black');
    setXrayNotes('');
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

    // Default behavior for outgoing referrals or when no original PDF exists
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
      setShowDetailModal(false);
      setSelectedReferral(null);
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

  const selectedPatient = selectedReferral
    ? patients.find(p => String(p.id) === String(selectedReferral.patientId))
    : undefined;
  const selectedPatientAge = selectedPatient
    ? String(new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear())
    : '';
  const isSelectedXrayReferral = selectedReferral
    ? selectedReferral.specialty === 'X-Ray Imaging' || selectedReferral.referredTo === 'X-Ray Facility'
    : false;

  // Referral filtering helpers
  const incomingReferrals = referrals.filter(r => 
    r.referralType === 'incoming' || (r.createdByRole === 'patient' && r.referredByContact)
  );

  const outgoingReferrals = referrals.filter(r => 
    r.referralType === 'outgoing' || r.createdByRole === 'staff'
  );

  const filteredReferrals =
    referralFilter === 'incoming'
      ? incomingReferrals
      : referralFilter === 'outgoing'
      ? outgoingReferrals
      : referrals;

  const sortedReferrals = [...filteredReferrals].sort((a, b) => {
    if (referralFilter === 'all' && allViewMode === 'alphabetical') {
      const aParts = getNameParts(getReferralPatientName(a, patients));
      const bParts = getNameParts(getReferralPatientName(b, patients));
      const aLast = aParts.lastName.toLowerCase();
      const bLast = bParts.lastName.toLowerCase();

      if (aLast === bLast) {
        const aGiven = aParts.givenNames.toLowerCase();
        const bGiven = bParts.givenNames.toLowerCase();
        return aGiven.localeCompare(bGiven);
      }
      return aLast.localeCompare(bLast);
    }

    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return Number(b.id) - Number(a.id);
  });

  return (
    <div className="min-h-screen bg-white flex flex-col flex-1">
      {/* Content with padding and relative positioning */}
      <div className="relative z-10 px-8 pt-4 pb-10 space-y-8 flex flex-col flex-1 w-full">
      {/* Type Selection Modal */}
      {showTypeSelection && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-10 max-w-2xl w-full shadow-2xl border border-slate-200/60">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Select Referral Type</h2>
                <p className="text-slate-600 text-lg mt-2">Choose the type of referral you want to create</p>
              </div>
              <button type="button" onClick={() => setShowTypeSelection(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors duration-200">
                <X className="w-6 h-6 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

                <div className="grid grid-cols-2 gap-6">
                  <button
                    type="button"
                    onClick={() => { setReferralType('doctor'); setShowTypeSelection(false); }}
                    className="p-6 bg-white rounded-2xl border border-slate-200 hover:shadow-lg flex flex-col items-start gap-3 text-left"
                  >
                    <div className="text-2xl font-bold">👨‍⚕️ Doctor Referral</div>
                    <div className="text-sm text-slate-600">Create a referral to another dentist or specialist.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setReferralType('xray'); setShowTypeSelection(false); }}
                    className="p-6 bg-white rounded-2xl border border-slate-200 hover:shadow-lg flex flex-col items-start gap-3 text-left"
                  >
                    <div className="text-2xl font-bold">🖼️ X-Ray Referral</div>
                    <div className="text-sm text-slate-600">Create a REDOR-style X-ray referral form.</div>
                  </button>
                </div>
          </div>
        </div>
      )}

      {/* Doctor Referral Form - fixed JSX structure */}
      {referralType === 'doctor' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 overflow-y-auto" style={{ pointerEvents: 'auto', zIndex: 9999 }}>
          <div className="bg-white w-full max-w-3xl rounded-lg shadow-2xl my-8 relative" style={{ pointerEvents: 'auto', zIndex: 9999 }}>
            <div className="flex justify-between items-center p-6 border-b">
              <h1 className="text-2xl font-bold">Doctor Referral Form</h1>
              <button type="button" onClick={() => { setReferralType(null); setShowTypeSelection(false); }} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-transparent" onSubmit={e => { e.preventDefault(); handleCreateReferral(); }}>
              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">Search Patient</label>
                <PatientSearchInput
                  patients={patients}
                  selectedPatientId={formData.patientId}
                  onSelectPatient={handlePatientSelect}
                  placeholder="Search patient..."
                  required
                />
              </div>
              <div className="space-y-4 mb-6">
                <UnderlineInput label="Patient's Name:" value={formData.patientName} onChange={v => handleInputChange('patientName', v)} disabled />
                <div className="grid grid-cols-3 gap-4">
                  <UnderlineInput label="Date:" value={formData.date} onChange={v => handleInputChange('date', v)} />
                  <UnderlineInput label="Contact No.:" value={formData.contactNo} onChange={v => handleInputChange('contactNo', v)} disabled />
                  <UnderlineInput label="Age:" value={formData.age} onChange={v => handleInputChange('age', v)} disabled />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <UnderlineInput label="Sex:" value={formData.sex} onChange={v => handleInputChange('sex', v)} disabled />
                  <UnderlineInput label="Date Of Birth:" value={formData.dateOfBirth} onChange={v => handleInputChange('dateOfBirth', v)} disabled />
                </div>
                <UnderlineInput label="Referred by:" value={formData.referredBy} onChange={v => handleInputChange('referredBy', v)} />
                <div className="grid grid-cols-2 gap-4">
                  <UnderlineInput label="Contact No.:" value={formData.referredByContact} onChange={v => handleInputChange('referredByContact', v)} />
                  <UnderlineInput label="Clinic Email Address:" value={formData.referredByEmail} onChange={v => handleInputChange('referredByEmail', v)} />
                </div>
              </div>
              <div className="mb-8 py-8 border-t-4 border-yellow-400">
                <div className="grid grid-cols-12 gap-8 items-start">
                  <div className="col-span-7">
                    <h3 className="font-black text-lg uppercase mb-3">DIAGNOSTIC SERVICES:</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'STANDARD PANORAMIC', id: 'pano' },
                        { label: 'TMJ (OPEN & CLOSE)', id: 'tmj' },
                        { label: 'SINUS PA', id: 'sinus' },
                        { label: 'BITEWING LEFT SIDE', id: 'bite-l' },
                        { label: 'BITEWING RIGHT SIDE', id: 'bite-r' },
                      ].map(item => (
                        <label key={item.id} className="flex items-center gap-3 cursor-pointer select-none">
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleService(item.id)}
                            className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${selectedServices[item.id] ? 'bg-yellow-400 border-yellow-400' : 'border-yellow-400 bg-white'}`}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            {selectedServices[item.id] && <Check className="w-3 h-3 text-white stroke-[4]" />}
                          </span>
                          <span className="font-bold text-sm">{item.label}</span>
                        </label>
                      ))}

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleService('peri')}
                            className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${selectedServices['peri'] ? 'bg-yellow-400 border-yellow-400' : 'border-yellow-400 bg-white'}`}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            {selectedServices['peri'] && <Check className="w-3 h-3 text-white stroke-[4]" />}
                          </span>
                          <span className="font-bold text-sm">PERIAPICAL XRAY TOOTH#</span>
                        </label>
                        <input
                          type="text"
                          value={typeof selectedServices['peri'] === 'string' ? String(selectedServices['peri']) : ''}
                          onChange={(e) => handleServiceInputChange('peri', e.target.value)}
                          className="border-b border-slate-400 px-2 py-1 w-28 text-sm ml-2"
                          placeholder="_____"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-span-5 flex flex-col justify-center">
                    <h3 className="font-black text-lg uppercase mb-3">OTHER SERVICES</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'DIAGNOSTIC MODEL CAST', id: 'model' },
                        { label: 'INTRAORAL PHOTOGRAPH', id: 'intra' },
                        { label: 'EXTRAORAL PHOTOGRAPH', id: 'extra' },
                      ].map(item => (
                        <label key={item.id} className="flex items-center gap-3 cursor-pointer select-none">
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleService(item.id)}
                            className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${selectedServices[item.id] ? 'bg-yellow-400 border-yellow-400' : 'border-yellow-400 bg-white'}`}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            {selectedServices[item.id] && <Check className="w-3 h-3 text-white stroke-[4]" />}
                          </span>
                          <span className="font-bold text-sm">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 pb-8 grid grid-cols-2 gap-8 border-b-4 border-yellow-400">
                <div className="space-y-3 text-sm">
                  <img src={clinicLogo} alt="Clinic Logo" className="w-full max-h-32 object-contain" />
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
                  <img src={clinicMap} alt="Clinic Map" className="w-full h-auto max-h-80 object-contain rounded-lg shadow-md border border-gray-200" />
                </div>
              </div>
              <div className="mt-6 pt-6 text-left space-y-2">
                <p className="font-bold text-gray-800 text-lg">THANK YOU FOR YOUR REFERRAL!</p>
                <p className="text-gray-700 text-sm leading-relaxed">It is our policy to decline performing procedures that are not indicated in the referral form.<br />This is based on our strict observance of the Dental Code of Ethics.</p>
              </div>
              <div className="flex justify-end mt-8">
                <button type="submit" className="px-6 py-3 bg-yellow-500 text-white font-bold rounded-lg shadow hover:bg-yellow-600 transition-colors">Create Referral</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* X-Ray Referral Form - REDOR Style */}
      {referralType === 'xray' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-lg shadow-2xl my-8">
            <div className="absolute top-4 right-4 z-10">
              <button type="button" onClick={() => { setReferralType(null); setShowTypeSelection(false); }} className="text-gray-500 hover:text-gray-700 bg-white rounded-full p-2 shadow-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 max-h-[calc(100vh-100px)] overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-transparent">
              {/* REDOR Header */}
              <div className="flex justify-between items-start border-b-2 pb-4">
                <div>
                  <img src={clinicMap} alt="Clinic Map" className="h-60 object-contain" />
                </div>
                <div className="text-right text-xs text-[#105397] border-l border-[#105397] pl-3">
                  <p>37 Quezon Ave., Lucena City</p>
                  <p>Tel. (042) 710-6484</p>
                  <p>Mobile 09920-2179688</p>
                  <p>www.redordentalcenter.com</p>
                </div>
              </div>

              {/* Patient Selection (hidden but functional) */}
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Search Patient</label>
                <PatientSearchInput
                  patients={patients}
                  selectedPatientId={formData.patientId}
                  onSelectPatient={(id) => handlePatientSelect(id)}
                  placeholder="Search patient..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <UnderlineInput label="Date:" value={formData.date} onChange={(v) => handleInputChange('date', v)} />
                <UnderlineInput label="Patient's Name:" value={formData.patientName} onChange={(v) => handleInputChange('patientName', v)} disabled />
              </div>

                <div className="grid grid-cols-2 gap-4">
                  <UnderlineInput label="Birthday:" value={formData.dateOfBirth} onChange={(v) => handleInputChange('dateOfBirth', v)} disabled />
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        id="xray-sex-male"
                        name="sex"
                        type="checkbox"
                        checked={formData.sex === 'Male'}
                        onChange={(e) => handleInputChange('sex', e.target.checked ? 'Male' : '')}
                        className="w-4 h-4"
                      />
                      <span className="font-bold">Male</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        id="xray-sex-female"
                        name="sex"
                        type="checkbox"
                        checked={formData.sex === 'Female'}
                        onChange={(e) => handleInputChange('sex', e.target.checked ? 'Female' : '')}
                        className="w-4 h-4"
                      />
                      <span className="font-bold">Female</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <UnderlineInput label="Referred by Dr.:" value={formData.referredBy} onChange={(v) => handleInputChange('referredBy', v)} />
                  <UnderlineInput label="Dentist's Contact #:" value={formData.referredByContact} onChange={(v) => handleInputChange('referredByContact', v)} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <UnderlineInput label="Patient's Address:" value={formData.reason} onChange={(v) => handleInputChange('reason', v)} />
                  <UnderlineInput label="Patient's Contact #:" value={formData.contactNo} onChange={(v) => handleInputChange('contactNo', v)} disabled />
                </div>
              
              {/* Main instruction */}
              <div className="pt-4">
                <p className="text-sm font-normal">Please perform the following radiological procedure/s:</p>
              </div>

              {/* I X-RAY FILM FORMAT */}
              <div className="space-y-3 pt-4">
                <h3 className="font-bold text-sm">I X-RAY FILM FORMAT</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm">
                      <input id="xray-periapical" name="xray-periapical" type="checkbox" className="w-4 h-4" />
                      <span>Peri-apical (please encircle no./nos.)</span>
                    </label>
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-sm">
                      <input id="xray-occlusal" name="xray-occlusal" type="checkbox" checked={getCheckboxValue(selectedXrayItems['occlusal'])} onChange={() => toggleXrayItem('occlusal')} className="w-4 h-4" />
                      <span>Occlusal</span>
                      <input id="xray-occlusal-upper" name="xray-occlusal-upper" type="checkbox" className="w-3 h-3 ml-4" />
                      <span className="text-xs">Upper</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm ml-28">
                      <input id="xray-occlusal-lower" name="xray-occlusal-lower" type="checkbox" className="w-3 h-3" />
                      <span className="text-xs">Lower</span>
                    </label>
                  </div>
                </div>

                {/* Tooth Diagram - Interactive */}
                <div className="p-6 bg-white rounded border-2 border-slate-200">
                  {/* Color Selector */}
                  <div className="mb-4 flex items-start gap-6">
                    {/* Diagram */}
                    <div className="flex-1">
                      <div className="flex justify-center items-center">
                        <div className="relative">
                          {/* Upper teeth */}
                          <div className="flex text-2xl font-mono mb-2 gap-0.5">
                            {['8', '7', '6', '5', '4', '3', '2', '1'].map(num => (
                              <button
                                key={`ut-${num}`}
                                type="button"
                                onClick={() => handleXrayDiagramClick(`ut-${num}`)}
                                className={`w-10 h-10 flex items-center justify-center transition-all cursor-pointer text-center font-bold ${
                                  xrayDiagramSelections[`ut-${num}`] === 'black'
                                    ? 'border-2 border-black rounded-full'
                                    : xrayDiagramSelections[`ut-${num}`] === 'red'
                                    ? 'border-2 border-red-600 rounded-full'
                                    : 'hover:border-2 hover:border-gray-300 hover:rounded-full'
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                            <span className="w-2" />
                            {['1', '2', '3', '4', '5', '6', '7', '8'].map(num => (
                              <button
                                key={`ut-r-${num}`}
                                type="button"
                                onClick={() => handleXrayDiagramClick(`ut-r-${num}`)}
                                className={`w-10 h-10 flex items-center justify-center transition-all cursor-pointer text-center font-bold ${
                                  xrayDiagramSelections[`ut-r-${num}`] === 'black'
                                    ? 'border-2 border-black rounded-full'
                                    : xrayDiagramSelections[`ut-r-${num}`] === 'red'
                                    ? 'border-2 border-red-600 rounded-full'
                                    : 'hover:border-2 hover:border-gray-300 hover:rounded-full'
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                          {/* Upper letters */}
                          <div className="flex text-lg font-mono mb-2 gap-0.5">
                            <div className="w-32" />
                            {['E', 'D', 'C', 'B', 'A'].map(letter => (
                              <button
                                key={`ul-${letter}`}
                                type="button"
                                onClick={() => handleXrayDiagramClick(`ul-${letter}`)}
                                className={`w-10 h-10 flex items-center justify-center transition-all cursor-pointer text-center font-bold ${
                                  xrayDiagramSelections[`ul-${letter}`] === 'black'
                                    ? 'border-2 border-black rounded-full'
                                    : xrayDiagramSelections[`ul-${letter}`] === 'red'
                                    ? 'border-2 border-red-600 rounded-full'
                                    : 'hover:border-2 hover:border-gray-300 hover:rounded-full'
                                }`}
                              >
                                {letter}
                              </button>
                            ))}
                            <span className="w-2" />
                            {['A', 'B', 'C', 'D', 'E'].map(letter => (
                              <button
                                key={`ul-r-${letter}`}
                                type="button"
                                onClick={() => handleXrayDiagramClick(`ul-r-${letter}`)}
                                className={`w-10 h-10 flex items-center justify-center transition-all cursor-pointer text-center font-bold ${
                                  xrayDiagramSelections[`ul-r-${letter}`] === 'black'
                                    ? 'border-2 border-black rounded-full'
                                    : xrayDiagramSelections[`ul-r-${letter}`] === 'red'
                                    ? 'border-2 border-red-600 rounded-full'
                                    : 'hover:border-2 hover:border-gray-300 hover:rounded-full'
                                }`}
                              >
                                {letter}
                              </button>
                            ))}
                          </div>
                          {/* Cross - R and L with lines */}
                          <div className="flex items-center text-xl font-bold my-2 relative">
                            <span className="mr-2">R</span>
                            <div className="flex-1 border-t-2 border-gray-500"></div>
                            <span className="ml-2">L</span>
                            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 w-0.5 bg-gray-500 h-40 -translate-y-20"></div>
                          </div>
                          {/* Lower letters */}
                          <div className="flex text-lg font-mono mb-2 gap-0.5">
                            <div className="w-32" />
                            {['E', 'D', 'C', 'B', 'A'].map(letter => (
                              <button
                                key={`ll-${letter}`}
                                type="button"
                                onClick={() => handleXrayDiagramClick(`ll-${letter}`)}
                                className={`w-10 h-10 flex items-center justify-center transition-all cursor-pointer text-center font-bold ${
                                  xrayDiagramSelections[`ll-${letter}`] === 'black'
                                    ? 'border-2 border-black rounded-full'
                                    : xrayDiagramSelections[`ll-${letter}`] === 'red'
                                    ? 'border-2 border-red-600 rounded-full'
                                    : 'hover:border-2 hover:border-gray-300 hover:rounded-full'
                                }`}
                              >
                                {letter}
                              </button>
                            ))}
                            <span className="w-2" />
                            {['A', 'B', 'C', 'D', 'E'].map(letter => (
                              <button
                                key={`ll-r-${letter}`}
                                type="button"
                                onClick={() => handleXrayDiagramClick(`ll-r-${letter}`)}
                                className={`w-10 h-10 flex items-center justify-center transition-all cursor-pointer text-center font-bold ${
                                  xrayDiagramSelections[`ll-r-${letter}`] === 'black'
                                    ? 'border-2 border-black rounded-full'
                                    : xrayDiagramSelections[`ll-r-${letter}`] === 'red'
                                    ? 'border-2 border-red-600 rounded-full'
                                    : 'hover:border-2 hover:border-gray-300 hover:rounded-full'
                                }`}
                              >
                                {letter}
                              </button>
                            ))}
                          </div>
                          {/* Lower teeth */}
                          <div className="flex text-2xl font-mono gap-0.5">
                            {['8', '7', '6', '5', '4', '3', '2', '1'].map(num => (
                              <button
                                key={`lt-${num}`}
                                type="button"
                                onClick={() => handleXrayDiagramClick(`lt-${num}`)}
                                className={`w-10 h-10 flex items-center justify-center transition-all cursor-pointer text-center font-bold ${
                                  xrayDiagramSelections[`lt-${num}`] === 'black'
                                    ? 'border-2 border-black rounded-full'
                                    : xrayDiagramSelections[`lt-${num}`] === 'red'
                                    ? 'border-2 border-red-600 rounded-full'
                                    : 'hover:border-2 hover:border-gray-300 hover:rounded-full'
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                            <span className="w-2" />
                            {['1', '2', '3', '4', '5', '6', '7', '8'].map(num => (
                              <button
                                key={`lt-r-${num}`}
                                type="button"
                                onClick={() => handleXrayDiagramClick(`lt-r-${num}`)}
                                className={`w-10 h-10 flex items-center justify-center transition-all cursor-pointer text-center font-bold ${
                                  xrayDiagramSelections[`lt-r-${num}`] === 'black'
                                    ? 'border-2 border-black rounded-full'
                                    : xrayDiagramSelections[`lt-r-${num}`] === 'red'
                                    ? 'border-2 border-red-600 rounded-full'
                                    : 'hover:border-2 hover:border-gray-300 hover:rounded-full'
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Color Selector and Legend */}
                    <div className="flex flex-col items-center gap-4 pt-8">
                      <div className="text-sm font-bold text-center">Color</div>
                      <button
                        type="button"
                        onClick={() => setXrayColorMode('black')}
                        className={`w-8 h-8 rounded-full border-4 transition-all ${
                          xrayColorMode === 'black'
                            ? 'border-black shadow-lg scale-125'
                            : 'border-gray-300'
                        } bg-black`}
                        title="Permanent"
                      />
                      <button
                        type="button"
                        onClick={() => setXrayColorMode('red')}
                        className={`w-8 h-8 rounded-full border-4 transition-all ${
                          xrayColorMode === 'red'
                            ? 'border-red-600 shadow-lg scale-125'
                            : 'border-red-200'
                        } bg-red-600`}
                        title="Temporary"
                      />
                      
                      {/* Legend */}
                      <div className="mt-6 pt-4 border-t-2 border-gray-300 text-xs text-center">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 bg-black rounded-full" />
                          <span>Permanent</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-600 rounded-full" />
                          <span>Temporary</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes Field */}
                <div className="mt-4">
                  <label className="block text-sm font-bold mb-2">Notes (Optional)</label>
                  <textarea
                    value={xrayNotes}
                    onChange={(e) => setXrayNotes(e.target.value)}
                    placeholder="Enter any notes related to this X-ray referral..."
                    className="w-full border-2 border-slate-300 rounded p-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
                    rows={3}
                  />
                </div>
              </div>

              {/* II DIGITAL FORMAT */}
              <div className="space-y-3 pt-4">
                <h3 className="font-bold text-sm">II DIGITAL FORMAT</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input id="xray-panoramic" name="xray-panoramic" type="checkbox" checked={getCheckboxValue(selectedXrayItems['panoramic'])} onChange={() => toggleXrayItem('panoramic')} className="w-4 h-4" />
                      <span>Panoramic</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input id="xray-cephalometric" name="xray-cephalometric" type="checkbox" checked={getCheckboxValue(selectedXrayItems['cephalometric'])} onChange={() => toggleXrayItem('cephalometric')} className="w-4 h-4" />
                      <span>Cephalometric</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input id="xray-tmj" name="xray-tmj" type="checkbox" checked={getCheckboxValue(selectedXrayItems['tmj'])} onChange={() => toggleXrayItem('tmj')} className="w-4 h-4" />
                      <span>TMJ/Transcranial</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input id="xray-sinus" name="xray-sinus" type="checkbox" checked={getCheckboxValue(selectedXrayItems['sinus'])} onChange={() => toggleXrayItem('sinus')} className="w-4 h-4" />
                      <span>Sinus</span>
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input id="xray-handwrist" name="xray-handwrist" type="checkbox" checked={getCheckboxValue(selectedXrayItems['handwrist'])} onChange={() => toggleXrayItem('handwrist')} className="w-4 h-4" />
                      <span>Handwrist/Carpal</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input id="xray-smv" name="xray-smv" type="checkbox" checked={getCheckboxValue(selectedXrayItems['smv'])} onChange={() => toggleXrayItem('smv')} className="w-4 h-4" />
                      <span>Submentovertex (SMV)</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input id="xray-waters" name="xray-waters" type="checkbox" checked={getCheckboxValue(selectedXrayItems['waters'])} onChange={() => toggleXrayItem('waters')} className="w-4 h-4" />
                      <span>Water's View</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* OTHER SERVICES */}
              <div className="space-y-3 pt-4">
                <h3 className="font-bold text-sm">OTHER SERVICES:</h3>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input id="xray-photographs" name="xray-photographs" type="checkbox" checked={getCheckboxValue(selectedXrayItems['photographs'])} onChange={() => toggleXrayItem('photographs')} className="w-4 h-4" />
                    <span>Extra and Intra-oral Photographs</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input id="xray-model-cast" name="xray-model-cast" type="checkbox" checked={getCheckboxValue(selectedXrayItems['model-cast'])} onChange={() => toggleXrayItem('model-cast')} className="w-4 h-4" />
                    <span>Diagnostic Study Model Cast with duplicate casts</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input id="xray-ortho-records" name="xray-ortho-records" type="checkbox" checked={getCheckboxValue(selectedXrayItems['ortho-records'])} onChange={() => toggleXrayItem('ortho-records')} className="w-4 h-4" />
                    <span>Complete Orthodontic Records (Pano, Ceph, Photos, Caph with free digital tracing)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input id="xray-ceph-tracing" name="xray-ceph-tracing" type="checkbox" checked={getCheckboxValue(selectedXrayItems['ceph-tracing'])} onChange={() => toggleXrayItem('ceph-tracing')} className="w-4 h-4" />
                    <span>Digitalized Ceph Tracing</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input id="xray-bleeding-tray" name="xray-bleeding-tray" type="checkbox" checked={getCheckboxValue(selectedXrayItems['bleeding-tray'])} onChange={() => toggleXrayItem('bleeding-tray')} className="w-4 h-4" />
                      <span>Bleeding Tray</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input id="xray-post-ortho" name="xray-post-ortho" type="checkbox" checked={getCheckboxValue(selectedXrayItems['post-ortho'])} onChange={() => toggleXrayItem('post-ortho')} className="w-4 h-4" />
                      <span>Post-Ortho Positioner</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={getCheckboxValue(selectedXrayItems['bleaching'])} onChange={() => toggleXrayItem('bleaching')} className="w-4 h-4" />
                      <span>Bleaching Machine for Rent</span>
                    </label>
                  </div>

                  {/* CASES TO BE */}
                  <div className="space-y-3 pt-4 pb-4 border-b-2">
                    <h3 className="font-bold text-sm">CASES TO BE:</h3>
                    
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={getCheckboxValue(selectedXrayItems['patient-takeout'])} onChange={() => toggleXrayItem('patient-takeout')} className="w-4 h-4" />
                        <span>Taken Out by Patient</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={getCheckboxValue(selectedXrayItems['jrs'])} onChange={() => toggleXrayItem('jrs')} className="w-4 h-4" />
                        <span>Sent via JRS to Dentist</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={getCheckboxValue(selectedXrayItems['pickup'])} onChange={() => toggleXrayItem('pickup')} className="w-4 h-4" />
                        <span>Pick up by dentist</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={getCheckboxValue(selectedXrayItems['delivery'])} onChange={() => toggleXrayItem('delivery')} className="w-4 h-4" />
                        <span>Delivered to dentist (Lucena area only)</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={getCheckboxValue(selectedXrayItems['email'])} onChange={() => toggleXrayItem('email')} className="w-4 h-4" />
                        <span>X-ray/s to be emailed</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex items-start justify-start">
                  <img
                    src={xrayClinic}
                    alt="X-ray Clinic"
                    className="w-full max-w-sm h-auto object-contain rounded-lg border-2 border-gray-300"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t justify-end">
              <button
                type="button"
                onClick={() => { setReferralType(null); setShowTypeSelection(false); resetForm(); }}
                className="px-6 py-2 border border-slate-300 rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateReferral}
                className="px-6 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
              >
                Create X-Ray Referral
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Controls Row */}
        <div className="mt-0 mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                if (referralFilter !== 'all') {
                  setReferralFilter('all');
                  setAllViewMode('alphabetical');
                } else {
                  setAllViewMode(prev => (prev === 'alphabetical' ? 'recent' : 'alphabetical'));
                }
              }}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 border-2 ${
                referralFilter === 'all'
                  ? 'bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 text-white border-teal-500 shadow-lg'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              {referralFilter !== 'all'
                ? 'All Referrals'
                : allViewMode === 'alphabetical'
                ? 'View Recent'
                : 'Alphabetical Order'}
            </button>
            <button
              type="button"
              onClick={() => setReferralFilter('incoming')}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 border-2 ${
                referralFilter === 'incoming'
                  ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white border-emerald-500 shadow-lg'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              ↳ Incoming
            </button>
            <button
              type="button"
              onClick={() => setReferralFilter('outgoing')}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 border-2 ${
                referralFilter === 'outgoing'
                  ? 'bg-gradient-to-br from-violet-500 via-purple-500 to-blue-500 text-white border-violet-500 shadow-lg'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              ↗ Outgoing
            </button>
          </div>

          <button
            type="button"
            onClick={() => { setShowTypeSelection(true); }}
            className="group relative px-5 py-2.5 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 text-white rounded-xl hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center gap-2 font-semibold overflow-hidden whitespace-nowrap text-sm"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <Plus className="w-4 h-4 relative z-10" />
            <span className="relative z-10">New Referral</span>
          </button>
        </div>

        {/* Referrals List */}
        <div className="w-full bg-white px-0 sm:px-4 lg:px-8 pt-2 pb-6 flex flex-col gap-3">
          <div className="flex justify-end">
            <span className="px-4 py-1.5 bg-teal-50 text-teal-700 rounded-xl text-xs font-bold">
              {sortedReferrals?.length || 0} Records
            </span>
          </div>

          {/* Referrals Grid */}
          <div className="space-y-3 flex-1 overflow-y-auto scrollbar-thin pr-3">
              {(sortedReferrals && sortedReferrals.length > 0) ? (
                sortedReferrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="group/item relative p-6 border-2 border-slate-100 rounded-2xl hover:border-cyan-300/60 transition-all duration-300 bg-gradient-to-br from-white via-slate-50/30 to-cyan-50/20 hover:shadow-xl"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-teal-500/5 rounded-2xl opacity-0 group-hover/item:opacity-100 transition-opacity duration-300"></div>

                    <div className="relative flex justify-between items-start gap-6">
                      <div className="flex-1 space-y-3">
                        {/* Patient Info */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-100 to-teal-100 rounded-xl flex items-center justify-center font-bold text-cyan-700 text-sm shadow-sm">
                            {getReferralPatientName(referral, patients)?.charAt(0)?.toUpperCase() || 'P'}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <p className="text-lg font-bold text-slate-900">{formatPatientName(getReferralPatientName(referral, patients))}</p>
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full hidden sm:block"></span>
                                <p className="text-sm font-semibold text-slate-500">
                                  {new Date(referral.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="ml-auto">
                            {referral.specialty === 'X-Ray Imaging' || referral.referredTo === 'X-Ray Facility' ? (
                              <span className="inline-flex items-center px-4 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 shadow-sm">
                                🖼️ X-RAY
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-4 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 shadow-sm">
                                👨‍⚕️ DOCTOR
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Referral Details */}
                        <div className="space-y-2 pl-1">
                          <div className="flex items-start gap-3">
                            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-2 flex-shrink-0"></span>
                            <div>
                              {/* Show correct details for each referral type */}
                              {(() => {
                                if (referral.referralType === 'incoming' || (referral.createdByRole === 'patient' && referral.referredByContact)) {
                                  return (
                                    <>
                                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Referred By</p>
                                      <p className="text-base text-slate-900 font-bold">{referral.referredBy || referral.referringDentist || referral.referredTo}</p>
                                    </>
                                  );
                                } else if (referral.referralType === 'outgoing' || referral.createdByRole === 'staff') {
                                  return (
                                    <>
                                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Referred To</p>
                                      <p className="text-base text-slate-900 font-bold">{referral.referredTo}</p>
                                      {referral.specialty === 'X-Ray Imaging' || referral.referredTo === 'X-Ray Facility' ? (
                                        <div className="mt-1 text-xs text-slate-600 font-semibold">Redor Dental Center</div>
                                      ) : (
                                        <div className="mt-1 text-xs text-slate-600 font-semibold">J. Aguilar Dental Clinic</div>
                                      )}
                                    </>
                                  );
                                } else {
                                  return (
                                    <>
                                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Referred To</p>
                                      <p className="text-base text-slate-900 font-bold">{referral.referredTo}</p>
                                    </>
                                  );
                                }
                              })()}
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-2 flex-shrink-0"></span>
                            <div>
                              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Reason</p>
                              <p className="text-sm text-slate-700 line-clamp-2">{referral.reason || 'No reason provided'}</p>
                            </div>
                          </div>
                          {Array.isArray(referral.uploadedFiles) && referral.uploadedFiles.length > 0 && (
                            <div className="flex items-center gap-3 mt-1">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1 flex-shrink-0"></span>
                              <div className="text-xs text-emerald-700 font-semibold">
                                {referral.uploadedFiles.length} attachment{referral.uploadedFiles.length > 1 ? 's' : ''} from patient
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReferral(referral);
                            setShowDetailModal(true);
                          }}
                          className="group/btn px-5 py-3 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 text-white rounded-xl hover:shadow-xl hover:shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-bold duration-300"
                          title="View referral details"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline text-sm">View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadReferralPDF(referral)}
                          className="group/btn px-5 py-3 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-xl hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-bold duration-300"
                          title="Download referral as PDF"
                        >
                          <Download className="w-4 h-4" />
                          <span className="hidden sm:inline text-sm">PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReferral(referral.id)}
                          className="group/btn px-5 py-3 border-2 border-red-300/60 bg-red-50/60 text-red-700 rounded-xl hover:border-red-400 hover:bg-red-100/60 hover:shadow-xl hover:shadow-red-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-bold duration-300"
                          title="Delete referral"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline text-sm">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )))
              : referrals && referrals.length > 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Eye className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-700 font-semibold mb-2">No referrals found for this filter</p>
                  <p className="text-slate-600 text-sm mb-6">Try switching to a different filter above to view other referrals.</p>
                  <button
                    type="button"
                    onClick={() => setReferralFilter('all')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-teal-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-bold"
                  >
                    View All Referrals
                  </button>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
                    <Plus className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">No Referrals Yet</h3>
                  <p className="text-slate-600 mb-8 max-w-md mx-auto">Start creating referrals to manage your patient care coordination efficiently.</p>
                  <button
                    type="button"
                    onClick={() => { setShowTypeSelection(true); }}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 text-white rounded-xl hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all duration-300 font-bold"
                  >
                    <Plus className="w-5 h-5" />
                    Create First Referral
                  </button>
                </div>
              )}
          </div>

      {/* Referral Detail Modal */}
      {showDetailModal && selectedReferral && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 overflow-y-auto"
          style={{ pointerEvents: 'auto' }}
          onClick={() => {
            setShowDetailModal(false);
            setSelectedReferral(null);
          }}
        >
          {isSelectedIncomingPatientReferral(selectedReferral) ? (
            <IncomingReferralView
              referral={selectedReferral}
              patient={selectedPatient}
              onClose={() => {
                setShowDetailModal(false);
                setSelectedReferral(null);
              }}
            />
          ) : (
            <div 
              className="bg-white/90 backdrop-blur-xl w-full max-w-4xl rounded-3xl shadow-2xl my-8 border border-slate-200/60"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
            <div className="flex items-center justify-between p-8 border-b border-slate-200/60 bg-gradient-to-r from-teal-50/80 via-white to-cyan-50/80">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">
                    {isSelectedXrayReferral ? '🖼️ X-Ray Referral' : '👨‍⚕️ Doctor Referral'}
                  </h1>
                  <p className="text-slate-600 text-sm mt-1">Complete referral details and patient information</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReferral(null);
                }}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors duration-200"
              >
                <X className="w-6 h-6 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-8 max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-300 scrollbar-track-transparent">
              {!isSelectedXrayReferral ? (
                <div className="space-y-6">
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-wider w-32 shrink-0">Patient's Name:</span>
                      <div className="text-base font-bold text-slate-900 flex-1">{formatFullName(selectedReferral.patientName)}</div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider w-20 shrink-0">Date:</span>
                        <div className="text-base font-bold text-slate-900">{formatToDD_MM_YYYY(selectedReferral.date)}</div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider w-20 shrink-0">Contact:</span>
                        <div className="text-base font-bold text-slate-900">{selectedPatient?.phone || ''}</div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider w-16 shrink-0">Age:</span>
                        <div className="text-base font-bold text-slate-900">{selectedPatientAge}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider w-20 shrink-0">Sex:</span>
                        <div className="text-base font-bold text-slate-900">{selectedPatient?.sex || ''}</div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider w-20 shrink-0">DOB:</span>
                        <div className="text-base font-bold text-slate-900">{selectedPatient?.dateOfBirth || ''}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-wider w-32 shrink-0">Referred by:</span>
                      <div className="text-base font-bold text-slate-900 flex-1">{selectedReferral.referringDentist}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider w-20 shrink-0">Contact:</span>
                        <div className="text-base font-bold text-slate-900">{selectedReferral.referredByContact || ''}</div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider w-20 shrink-0">Email:</span>
                        <div className="text-base font-bold text-slate-900 truncate flex-1">{selectedReferral.referredByEmail || ''}</div>
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
                        // Parse selectedServices if it's a JSON string
                        let selectedServicesObj = selectedReferral.selectedServices;
                        if (typeof selectedServicesObj === 'string') {
                          try {
                            selectedServicesObj = JSON.parse(selectedServicesObj);
                          } catch (e) {
                            selectedServicesObj = {};
                          }
                        }
                        
                        const serviceValue = selectedServicesObj?.[id];
                        const isChecked = serviceValue === true || (typeof serviceValue === 'string' && serviceValue !== '');
                        const textValue = typeof serviceValue === 'string' ? serviceValue : '';
                        
                        return (
                          <div key={label} className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 border-yellow-400 flex items-center justify-center transition-colors ${
                              isChecked ? 'bg-yellow-400' : 'bg-white'
                            }`}>
                              {isChecked && <Check className="text-white w-3.5 h-3.5 stroke-[4]" />}
                            </div>
                            <span className="text-sm font-bold tracking-tight">{label}</span>
                            {id === 'peri' && textValue && <span className="text-sm text-gray-600 ml-1">{textValue}</span>}
                          </div>
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
                        // Parse selectedServices if it's a JSON string
                        let selectedServicesObj = selectedReferral.selectedServices;
                        if (typeof selectedServicesObj === 'string') {
                          try {
                            selectedServicesObj = JSON.parse(selectedServicesObj);
                          } catch (e) {
                            selectedServicesObj = {};
                          }
                        }
                        
                        const serviceValue = selectedServicesObj?.[id];
                        const isChecked = serviceValue === true || (typeof serviceValue === 'string' && serviceValue !== '');
                        
                        return (
                          <div key={label} className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 border-yellow-400 flex items-center justify-center transition-colors ${
                              isChecked ? 'bg-yellow-400' : 'bg-white'
                            }`}>
                              {isChecked && <Check className="text-white w-3.5 h-3.5 stroke-[4]" />}
                            </div>
                            <span className="text-sm font-bold tracking-tight">{label}</span>
                          </div>
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

                  {/* Attached Files Section for Doctor Referral */}
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
                  {/* REDOR Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <img src={clinicMap} alt="Clinic Map" className="h-40 object-contain" />
                    </div>
                    <div className="text-right text-xs text-[#105397] pl-3 border-l border-[#105397]">
                      <p>37 Quezon Ave., Lucena City</p>
                      <p>Tel. (042) 710-6484</p>
                      <p>Mobile 09920-2179688</p>
                      <p>www.redordentalcenter.com</p>
                    </div>
                  </div>

                  {/* Patient Information */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-wider w-20 shrink-0">Date:</span>
                      <div className="text-base font-bold text-slate-900">{formatToDD_MM_YYYY(selectedReferral.date)}</div>
                    </div>
                    <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-wider w-32 shrink-0">Patient Name:</span>
                      <div className="text-base font-bold text-slate-900 flex-1">{formatFullName(selectedReferral.patientName)}</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider w-24 shrink-0">Birthday:</span>
                        <div className="text-base font-bold text-slate-900">{selectedPatient?.dateOfBirth || ''}</div>
                      </div>
                      <div className="flex items-center gap-8 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
                        {['Male', 'Female'].map(sex => (
                          <label key={sex} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedPatient?.sex === sex}
                              disabled
                              className="w-4 h-4 rounded-full border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-sm font-bold text-slate-700">{sex}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider w-24 shrink-0">Referred by:</span>
                        <div className="text-base font-bold text-slate-900 flex-1">{selectedReferral.referringDentist}</div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider w-24 shrink-0">Contact:</span>
                        <div className="text-base font-bold text-slate-900 flex-1">{selectedReferral.referredByContact || ''}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider w-32 shrink-0">Patient Address:</span>
                        <div className="text-base font-bold text-slate-900 flex-1 truncate">{selectedPatient?.address || ''}</div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider w-32 shrink-0">Patient Contact:</span>
                        <div className="text-base font-bold text-slate-900 flex-1">{selectedPatient?.phone || ''}</div>
                      </div>
                    </div>
                  </div>

                  {/* X-Ray Diagram Display */}
                  {selectedReferral.xrayDiagramSelections && Object.keys(selectedReferral.xrayDiagramSelections).length > 0 && (
                    <div className="p-4 bg-blue-50 rounded border-2 border-blue-200 mt-4">
                      <h4 className="font-bold text-sm mb-3">X-Ray Diagram Selections:</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(selectedReferral.xrayDiagramSelections).map(([id, color]) => (
                          <span
                            key={id}
                            className={`px-3 py-1 rounded text-xs font-bold ${
                              color === 'black'
                                ? 'bg-gray-300 text-black border-2 border-black'
                                : 'bg-red-200 text-red-900 border-2 border-red-600'
                            }`}
                          >
                            {id.replace(/^(ut|ul|lt|ll|r)-/, '').toUpperCase()} ({color})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* X-Ray Notes Display */}
                  {selectedReferral.xrayNotes && (
                    <div className="p-4 bg-amber-50 rounded border-2 border-amber-200 mt-4">
                      <h4 className="font-bold text-sm mb-2">Notes:</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedReferral.xrayNotes}</p>
                    </div>
                  )}

                  {/* II DIGITAL FORMAT */}
                  <div className="space-y-3 pt-4">
                    <h3 className="font-bold text-sm">II DIGITAL FORMAT</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        {[
                          { label: 'Panoramic', id: 'panoramic' },
                          { label: 'Cephalometric', id: 'cephalometric' },
                          { label: 'TMJ/Transcranial', id: 'tmj' },
                          { label: 'Sinus', id: 'sinus' }
                        ].map(({ label, id }) => (
                          <label key={id} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={getCheckboxValue((selectedReferral as any).selectedServices?.[id])} disabled className="w-4 h-4" />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {[
                          { label: 'Handwrist/Carpal', id: 'handwrist' },
                          { label: 'Submentovertex (SMV)', id: 'smv' },
                          { label: "Water's View", id: 'waters' }
                        ].map(({ label, id }) => (
                          <label key={id} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={getCheckboxValue((selectedReferral as any).selectedServices?.[id])} disabled className="w-4 h-4" />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* OTHER SERVICES */}
                  <div className="space-y-3 pt-4">
                    <h3 className="font-bold text-sm">OTHER SERVICES:</h3>
                    <div className="space-y-2">
                      {[
                        { label: 'Extra and Intra-oral Photographs', id: 'photographs' },
                        { label: 'Diagnostic Study Model Cast with duplicate casts', id: 'model-cast' },
                        { label: 'Complete Orthodontic Records (Pano, Ceph, Photos, Caph with free digital tracing)', id: 'ortho-records' },
                        { label: 'Digitalized Ceph Tracing', id: 'ceph-tracing' },
                        { label: 'Bleeding Tray', id: 'bleeding-tray' },
                        { label: 'Post-Ortho Positioner', id: 'post-ortho' },
                        { label: 'Bleaching Machine for Rent', id: 'bleaching' }
                      ].map(({ label, id }) => (
                        <label key={id} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={getCheckboxValue((selectedReferral as any).selectedServices?.[id]) as boolean} disabled className="w-4 h-4" />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* CASES TO BE */}
                  <div className="space-y-3 pt-4 pb-4 border-b-2">
                    <h3 className="font-bold text-sm">CASES TO BE:</h3>
                    <div className="space-y-2">
                      {[
                        { label: 'Taken Out by Patient', id: 'patient-takeout' },
                        { label: 'Sent via JRS to Dentist', id: 'jrs' },
                        { label: 'Pick up by dentist', id: 'pickup' },
                        { label: 'Delivered to dentist (Lucena area only)', id: 'delivery' },
                        { label: "X-ray/s to be emailed", id: 'email' }
                      ].map(({ label, id }) => (
                        <label key={id} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={getCheckboxValue((selectedReferral as any).selectedServices?.[id]) as boolean} disabled className="w-4 h-4" />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Attached Files Section for X-Ray Referral */}
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
            <div className="flex gap-3 p-8 border-t border-slate-200/60 bg-gradient-to-r from-slate-50 to-slate-50 rounded-b-3xl">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReferral(null);
                }}
                className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-700 rounded-xl hover:border-slate-300 hover:bg-white transition-all duration-200 font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (selectedReferral) {
                    handleDownloadReferralPDF(selectedReferral);
                  }
                }}
                className="flex-1 px-4 py-3 flex items-center justify-center gap-2 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-xl hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all duration-300 font-semibold"
              >
                <Download size={18} />
                Download PDF
              </button>
              <button
                onClick={() => {
                  if (selectedReferral) {
                    setShowDetailModal(false);
                    setSelectedReferral(null);
                    handleDeleteReferral(selectedReferral.id);
                  }
                }}
                className="flex-1 px-4 py-3 flex items-center justify-center gap-2 border-2 border-red-300/60 bg-red-50/60 text-red-700 rounded-xl hover:border-red-400 hover:bg-red-100/60 hover:shadow-xl hover:shadow-red-500/20 hover:scale-105 active:scale-95 transition-all duration-300 font-semibold"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>
          </div>
          )}
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10001] p-4"
            onClick={cancelDelete}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 border border-slate-200/60"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center shadow-lg">
                  <Trash2 className="text-red-600" size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Delete Referral?</h3>
                  <p className="text-sm text-slate-500 mt-1">This cannot be undone</p>
                </div>
              </div>
              
              <p className="text-slate-700 mb-8 leading-relaxed">
                You're about to permanently delete this referral and all its associated information. This action cannot be reversed.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-700 rounded-xl hover:border-slate-300 hover:bg-white transition-all duration-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl hover:shadow-xl hover:shadow-red-500/30 hover:scale-105 active:scale-95 transition-all duration-300 font-semibold"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </div>
    </div>
  </div>
  );
}