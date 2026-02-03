import { useState } from 'react';
import { Plus, X, Check, Eye, Trash2, Download } from 'lucide-react';
import { Referral, Patient } from '../App';
import { toast } from 'sonner';
import { referralAPI } from '../api';
import { generateReferralPDF } from '../utils/referralPdfGenerator';
import { PatientSearchInput } from './PatientSearchInput';
import { motion, AnimatePresence } from 'motion/react';
import { redorLogo, clinicLogo, clinicMap, xrayClinic } from '../assets';


type ReferralType = 'doctor' | 'xray' | null;

interface ReferralGenerationProps {
  referrals: Referral[];
  setReferrals: (referrals: Referral[]) => void;
  patients: Patient[];
}

// Helper to get boolean value from selectedServices
const getCheckboxValue = (value: string | boolean | undefined): boolean => {
  return typeof value === 'boolean' ? value : (typeof value === 'string' && value === 'true');
};

const UnderlineInput = ({ label, value, onChange, className = '', disabled = false }: { label: string; value: string; onChange: (v: string) => void; className?: string; disabled?: boolean }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm whitespace-nowrap font-semibold">{label}</span>
      <input 
        type="text" 
        value={value}
        onChange={handleChange}
        disabled={disabled}
        autoComplete="off"
        spellCheck="false"
        className={`flex-1 border-b-2 border-slate-400 focus:outline-none focus:border-yellow-500 focus:bg-yellow-50 px-2 py-2 text-sm transition-colors font-medium ${disabled ? 'bg-slate-50 cursor-not-allowed' : 'bg-white cursor-text'}`}
      />
    </div>
  );
};

export function ReferralGeneration({ referrals, setReferrals, patients }: ReferralGenerationProps) {
  const [referralType, setReferralType] = useState<ReferralType>(null);
  const [showTypeSelection, setShowTypeSelection] = useState(false);
  const [selectedServices, setSelectedServices] = useState<Record<string, string | boolean>>({});
  const [selectedXrayItems, setSelectedXrayItems] = useState<Record<string, string | boolean>>({});
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [referralToDelete, setReferralToDelete] = useState<string | number | null>(null);
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
    urgency: 'routine' as 'routine' | 'urgent' | 'emergency'
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
    if (!formData.patientName) {
      toast.error('Please select a patient');
      return;
    }

    if (!formData.referredBy) {
      toast.error('Please enter who is referring');
      return;
    }

    try {
      const newReferral = {
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
        createdByRole: 'staff'
      };

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
  };

  const formatToDD_MM_YYYY = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('/');
  };

  const handleDownloadReferralPDF = (referral: Referral) => {
    const patient = patients.find(p => String(p.id) === String(referral.patientId));
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

  const ServiceItem = ({ label, id, showInput, onInputChange }: { label: string; id: string; showInput?: boolean; onInputChange?: (id: string, value: string) => void }) => {
    const inputValue = typeof selectedServices[id] === 'string' ? selectedServices[id] : '';
    const isChecked = Boolean(selectedServices[id]);
    
    return (
      <button
        type="button"
        onClick={() => toggleService(id)}
        className="flex items-center gap-3 w-full p-2 rounded hover:bg-yellow-50 transition-colors text-left cursor-pointer"
      >
        <div className={`w-5 h-5 rounded-full border-2 border-yellow-400 flex items-center justify-center flex-shrink-0 transition-colors ${
          isChecked ? "bg-yellow-400" : "bg-white"
        }`}>
          {isChecked && <Check className="text-white w-3.5 h-3.5 stroke-[4]" />}
        </div>
        <span className="text-sm font-bold tracking-tight flex-1">{label}</span>
        {showInput && (
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => {
              e.stopPropagation();
              onInputChange?.(id, e.target.value);
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            className="w-16 border-b border-slate-400 focus:outline-none focus:border-yellow-500 bg-transparent text-sm px-1 font-normal" 
          />
        )}
      </button>
    );
  };

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Type Selection Modal */}
      {showTypeSelection && referralType === null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Select Referral Type</h2>
              <button onClick={() => setShowTypeSelection(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setReferralType('doctor')}
                className="p-6 border-2 border-yellow-400 rounded-lg hover:bg-yellow-50 transition-colors text-center"
              >
                <div className="text-3xl mb-2">👨‍⚕️</div>
                <h3 className="font-bold text-lg mb-2">Doctor Referral</h3>
                <p className="text-sm text-gray-600">Refer patient to a specialist dentist</p>
              </button>

              <button
                onClick={() => setReferralType('xray')}
                className="p-6 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-center"
              >
                <div className="text-3xl mb-2">🖼️</div>
                <h3 className="font-bold text-lg mb-2">X-Ray Referral</h3>
                <p className="text-sm text-gray-600">Request X-ray imaging services</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Referral Form */}
      {referralType === 'doctor' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-lg shadow-2xl my-8">
            <div className="flex justify-between items-center p-6 border-b">
              <h1 className="text-2xl font-bold">Doctor Referral Form</h1>
              <button onClick={() => { setReferralType(null); setShowTypeSelection(false); }} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Patient Selection */}
              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">Search Patient</label>
                <PatientSearchInput
                  patients={patients}
                  selectedPatientId={formData.patientId}
                  onSelectPatient={(id) => handlePatientSelect(id)}
                  placeholder="Search patient..."
                  required
                />
              </div>

              {/* Header Form Fields */}
              <div className="space-y-4 mb-6">
                <UnderlineInput label="Patient's Name:" value={formData.patientName} onChange={(v) => handleInputChange('patientName', v)} disabled />
                <div className="grid grid-cols-3 gap-4">
                  <UnderlineInput label="Date:" value={formData.date} onChange={(v) => handleInputChange('date', v)} />
                  <UnderlineInput label="Contact No.:" value={formData.contactNo} onChange={(v) => handleInputChange('contactNo', v)} disabled />
                  <UnderlineInput label="Age:" value={formData.age} onChange={(v) => handleInputChange('age', v)} disabled />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <UnderlineInput label="Sex:" value={formData.sex} onChange={(v) => handleInputChange('sex', v)} disabled />
                  <UnderlineInput label="Date Of Birth:" value={formData.dateOfBirth} onChange={(v) => handleInputChange('dateOfBirth', v)} disabled />
                </div>
                <UnderlineInput label="Referred by:" value={formData.referredBy} onChange={(v) => handleInputChange('referredBy', v)} />
                <div className="grid grid-cols-2 gap-4">
                  <UnderlineInput label="Contact No.:" value={formData.referredByContact} onChange={(v) => handleInputChange('referredByContact', v)} />
                  <UnderlineInput label="Clinic Email Address:" value={formData.referredByEmail} onChange={(v) => handleInputChange('referredByEmail', v)} />
                </div>
              </div>

              {/* Services Section */}
              <div className="grid grid-cols-2 gap-8 mb-8 py-8 border-t-4 border-yellow-400">
                <div className="space-y-3">
                  <h2 className="font-black text-lg uppercase mb-4">Diagnostic Services:</h2>
                  <ServiceItem label="STANDARD PANORAMIC" id="pano" onInputChange={handleServiceInputChange} />
                  <ServiceItem label="TMJ (OPEN & CLOSE)" id="tmj" onInputChange={handleServiceInputChange} />
                  <ServiceItem label="SINUS PA" id="sinus" onInputChange={handleServiceInputChange} />
                  <ServiceItem label="BITEWING LEFT SIDE" id="bite-l" onInputChange={handleServiceInputChange} />
                  <ServiceItem label="BITEWING RIGHT SIDE" id="bite-r" onInputChange={handleServiceInputChange} />
                  <ServiceItem label="PERIAPICAL XRAY TOOTH#" id="peri" showInput onInputChange={handleServiceInputChange} />
                </div>

                <div className="space-y-3 pt-6">
                  <h2 className="font-black text-lg uppercase mb-4">OTHER SERVICES</h2>
                  <ServiceItem label="DIAGNOSTIC MODEL CAST" id="model" onInputChange={handleServiceInputChange} />
                  <ServiceItem label="INTRAORAL PHOTOGRAPH" id="intra" onInputChange={handleServiceInputChange} />
                  <ServiceItem label="EXTRAORAL PHOTOGRAPH" id="extra" onInputChange={handleServiceInputChange} />
                </div>
              </div>

                {/* Clinic Information */}
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

            </div>

            <div className="flex gap-3 p-6 border-t justify-end">
              <button
                onClick={() => { setReferralType(null); setShowTypeSelection(false); resetForm(); }}
                className="px-6 py-2 border border-slate-300 rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReferral}
                className="px-6 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Create Referral
              </button>
            </div>
          </div>
        </div>
      )}

      {/* X-Ray Referral Form - REDOR Style */}
      {referralType === 'xray' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-lg shadow-2xl my-8">
            <div className="absolute top-4 right-4 z-10">
              <button onClick={() => { setReferralType(null); setShowTypeSelection(false); }} className="text-gray-500 hover:text-gray-700 bg-white rounded-full p-2 shadow-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 max-h-[calc(100vh-100px)] overflow-y-auto space-y-4">
              {/* REDOR Header */}
              <div className="flex justify-between items-start border-b-2 pb-4">
                <div>
                  <img src={redorLogo} alt="REDOR Logo" className="h-24 object-contain" />
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
                        type="checkbox"
                        checked={formData.sex === 'Male'}
                        onChange={(e) => handleInputChange('sex', e.target.checked ? 'Male' : '')}
                        className="w-4 h-4"
                      />
                      <span className="font-bold">Male</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
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
                      <input type="checkbox" className="w-4 h-4" />
                      <span>Peri-apical (please encircle no./nos.)</span>
                    </label>
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={getCheckboxValue(selectedXrayItems['occlusal'])} onChange={() => toggleXrayItem('occlusal')} className="w-4 h-4" />
                      <span>Occlusal</span>
                      <input type="checkbox" className="w-3 h-3 ml-4" />
                      <span className="text-xs">Upper</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm ml-28">
                      <input type="checkbox" className="w-3 h-3" />
                      <span className="text-xs">Lower</span>
                    </label>
                  </div>
                </div>

                {/* Tooth Diagram */}
                <div className="p-6 bg-white rounded">
                  <div className="flex justify-center items-center">
                    <div className="relative">
                      {/* Upper teeth */}
                      <div className="flex text-2xl font-mono mb-2">
                        <span className="inline-block w-10 text-center">8</span>
                        <span className="inline-block w-10 text-center">7</span>
                        <span className="inline-block w-10 text-center">6</span>
                        <span className="inline-block w-10 text-center">5</span>
                        <span className="inline-block w-10 text-center">4</span>
                        <span className="inline-block w-10 text-center">3</span>
                        <span className="inline-block w-10 text-center">2</span>
                        <span className="inline-block w-10 text-center">1</span>
                        <span className="inline-block w-10 text-center"></span>
                        <span className="inline-block w-10 text-center">1</span>
                        <span className="inline-block w-10 text-center">2</span>
                        <span className="inline-block w-10 text-center">3</span>
                        <span className="inline-block w-10 text-center">4</span>
                        <span className="inline-block w-10 text-center">5</span>
                        <span className="inline-block w-10 text-center">6</span>
                        <span className="inline-block w-10 text-center">7</span>
                        <span className="inline-block w-10 text-center">8</span>
                      </div>
                      {/* Upper letters */}
                      <div className="flex text-lg font-mono mb-2">
                        <span className="inline-block w-10 text-center"></span>
                        <span className="inline-block w-10 text-center"></span>
                        <span className="inline-block w-10 text-center"></span>
                        <span className="inline-block w-10 text-center">E</span>
                        <span className="inline-block w-10 text-center">D</span>
                        <span className="inline-block w-10 text-center">C</span>
                        <span className="inline-block w-10 text-center">B</span>
                        <span className="inline-block w-10 text-center">A</span>
                        <span className="inline-block w-10 text-center"></span>
                        <span className="inline-block w-10 text-center">A</span>
                        <span className="inline-block w-10 text-center">B</span>
                        <span className="inline-block w-10 text-center">C</span>
                        <span className="inline-block w-10 text-center">D</span>
                        <span className="inline-block w-10 text-center">E</span>
                      </div>
                      {/* Cross - R and L with lines */}
                      <div className="flex items-center text-xl font-bold my-2 relative">
                        <span className="mr-2">R</span>
                        <div className="flex-1 border-t-2 border-gray-500"></div>
                        <span className="ml-2">L</span>
                        {/* Vertical line positioned absolutely to cross through */}
                        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 w-0.5 bg-gray-500 h-40 -translate-y-20"></div>
                      </div>
                      {/* Lower letters */}
                      <div className="flex text-lg font-mono mb-2">
                        <span className="inline-block w-10 text-center"></span>
                        <span className="inline-block w-10 text-center"></span>
                        <span className="inline-block w-10 text-center"></span>
                        <span className="inline-block w-10 text-center">E</span>
                        <span className="inline-block w-10 text-center">D</span>
                        <span className="inline-block w-10 text-center">C</span>
                        <span className="inline-block w-10 text-center">B</span>
                        <span className="inline-block w-10 text-center">A</span>
                        <span className="inline-block w-10 text-center"></span>
                        <span className="inline-block w-10 text-center">A</span>
                        <span className="inline-block w-10 text-center">B</span>
                        <span className="inline-block w-10 text-center">C</span>
                        <span className="inline-block w-10 text-center">D</span>
                        <span className="inline-block w-10 text-center">E</span>
                      </div>
                      {/* Lower teeth */}
                      <div className="flex text-2xl font-mono">
                        <span className="inline-block w-10 text-center">8</span>
                        <span className="inline-block w-10 text-center">7</span>
                        <span className="inline-block w-10 text-center">6</span>
                        <span className="inline-block w-10 text-center">5</span>
                        <span className="inline-block w-10 text-center">4</span>
                        <span className="inline-block w-10 text-center">3</span>
                        <span className="inline-block w-10 text-center">2</span>
                        <span className="inline-block w-10 text-center">1</span>
                        <span className="inline-block w-10 text-center"></span>
                        <span className="inline-block w-10 text-center">1</span>
                        <span className="inline-block w-10 text-center">2</span>
                        <span className="inline-block w-10 text-center">3</span>
                        <span className="inline-block w-10 text-center">4</span>
                        <span className="inline-block w-10 text-center">5</span>
                        <span className="inline-block w-10 text-center">6</span>
                        <span className="inline-block w-10 text-center">7</span>
                        <span className="inline-block w-10 text-center">8</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* II DIGITAL FORMAT */}
              <div className="space-y-3 pt-4">
                <h3 className="font-bold text-sm">II DIGITAL FORMAT</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={getCheckboxValue(selectedXrayItems['panoramic'])} onChange={() => toggleXrayItem('panoramic')} className="w-4 h-4" />
                      <span>Panoramic</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={getCheckboxValue(selectedXrayItems['cephalometric'])} onChange={() => toggleXrayItem('cephalometric')} className="w-4 h-4" />
                      <span>Cephalometric</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={getCheckboxValue(selectedXrayItems['tmj'])} onChange={() => toggleXrayItem('tmj')} className="w-4 h-4" />
                      <span>TMJ/Transcranial</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={getCheckboxValue(selectedXrayItems['sinus'])} onChange={() => toggleXrayItem('sinus')} className="w-4 h-4" />
                      <span>Sinus</span>
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={getCheckboxValue(selectedXrayItems['handwrist'])} onChange={() => toggleXrayItem('handwrist')} className="w-4 h-4" />
                      <span>Handwrist/Carpal</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={getCheckboxValue(selectedXrayItems['smv'])} onChange={() => toggleXrayItem('smv')} className="w-4 h-4" />
                      <span>Submentovertex (SMV)</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={getCheckboxValue(selectedXrayItems['waters'])} onChange={() => toggleXrayItem('waters')} className="w-4 h-4" />
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
                    <input type="checkbox" checked={getCheckboxValue(selectedXrayItems['photographs'])} onChange={() => toggleXrayItem('photographs')} className="w-4 h-4" />
                    <span>Extra and Intra-oral Photographs</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={getCheckboxValue(selectedXrayItems['model-cast'])} onChange={() => toggleXrayItem('model-cast')} className="w-4 h-4" />
                    <span>Diagnostic Study Model Cast with duplicate casts</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={getCheckboxValue(selectedXrayItems['ortho-records'])} onChange={() => toggleXrayItem('ortho-records')} className="w-4 h-4" />
                    <span>Complete Orthodontic Records (Pano, Ceph, Photos, Caph with free digital tracing)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={getCheckboxValue(selectedXrayItems['ceph-tracing'])} onChange={() => toggleXrayItem('ceph-tracing')} className="w-4 h-4" />
                    <span>Digitalized Ceph Tracing</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={getCheckboxValue(selectedXrayItems['bleeding-tray'])} onChange={() => toggleXrayItem('bleeding-tray')} className="w-4 h-4" />
                      <span>Bleeding Tray</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={getCheckboxValue(selectedXrayItems['post-ortho'])} onChange={() => toggleXrayItem('post-ortho')} className="w-4 h-4" />
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
                onClick={() => { setReferralType(null); setShowTypeSelection(false); resetForm(); }}
                className="px-6 py-2 border border-slate-300 rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReferral}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create X-Ray Referral
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - List and Create Button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => { setShowTypeSelection(true); setReferralType(null); }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 font-bold"
        >
          <Plus className="w-5 h-5" />
          New Referral
        </button>
      </div>

      {/* Referrals List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...referrals]
          .sort((a, b) => {
            const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
            if (dateDiff !== 0) return dateDiff;
            return Number(b.id) - Number(a.id);
          })
          .map((referral) => (
          <div key={referral.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold mb-1">{referral.patientName}</h3>
                <p className="text-sm text-gray-600">{new Date(referral.date).toLocaleDateString()}</p>
              </div>
              <div>
                {referral.specialty === 'X-Ray Imaging' || referral.referredTo === 'X-Ray Facility' ? (
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                    X-Ray Referral
                  </span>
                ) : (
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
                    Doctor Referral
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div>
                <p className="text-sm text-gray-600">Specialty</p>
                <p className="font-semibold">{referral.specialty}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Referred To</p>
                <p className="font-semibold">{referral.referredTo}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Reason</p>
                <p className="text-sm">{referral.reason.substring(0, 60)}...</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setSelectedReferral(referral);
                  setShowDetailModal(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <Eye size={16} />
                View
              </button>
              <button
                onClick={() => handleDownloadReferralPDF(referral)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                <Download size={16} />
                PDF
              </button>
              <button
                onClick={() => handleDeleteReferral(referral.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-red-300 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        ))}

        {referrals.length === 0 && (
          <div className="col-span-2 bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
            <p className="text-gray-600 mb-4">No referrals created yet</p>
            <button
              onClick={() => { setShowTypeSelection(true); setReferralType(null); }}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Your First Referral
            </button>
          </div>
        )}
      </div>

      {/* Referral Detail Modal */}
      {showDetailModal && selectedReferral && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-lg shadow-2xl my-8">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-yellow-50 to-slate-50">
              <h1 className="text-2xl font-bold text-slate-900">
                {isSelectedXrayReferral ? 'X-Ray Referral Form' : 'Doctor Referral Form'}
              </h1>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReferral(null);
                }}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto">
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm whitespace-nowrap font-semibold">Referred by:</span>
                      <input
                        type="text"
                        value={selectedReferral.referringDentist}
                        disabled
                        className="flex-1 border-b-2 border-slate-400 bg-slate-50 px-2 py-2 text-sm font-medium cursor-not-allowed"
                      />
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
                        const serviceValue = selectedReferral.selectedServices?.[id];
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
                        const serviceValue = selectedReferral.selectedServices?.[id];
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
                </div>
              ) : (
                <div className="space-y-6">
                  {/* REDOR Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <img src={redorLogo} alt="REDOR Logo" className="h-24 object-contain" />
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">Date:</span>
                      <input
                        type="text"
                        value={formatToDD_MM_YYYY(selectedReferral.date)}
                        disabled
                        className="flex-1 border-b-2 border-gray-400 bg-white px-2 py-1 text-sm font-medium cursor-not-allowed"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">Patient's Name:</span>
                      <input
                        type="text"
                        value={selectedReferral.patientName}
                        disabled
                        className="flex-1 border-b-2 border-gray-400 bg-white px-2 py-1 text-sm font-medium cursor-not-allowed"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Birthday:</span>
                        <input
                          type="text"
                          value={selectedPatient?.dateOfBirth || ''}
                          disabled
                          className="w-full border-b-2 border-gray-400 bg-white px-2 py-1 text-sm font-medium cursor-not-allowed"
                        />
                      </div>
                      <div className="flex items-center gap-8">
                        {['Male', 'Female'].map(sex => (
                          <label key={sex} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedPatient?.sex === sex}
                              disabled
                              className="w-4 h-4"
                            />
                            <span className="text-sm font-semibold">{sex}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Referred by Dr.:</span>
                        <input
                          type="text"
                          value={selectedReferral.referringDentist}
                          disabled
                          className="w-full border-b-2 border-gray-400 bg-white px-2 py-1 text-sm font-medium cursor-not-allowed"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Dentist's Contact #:</span>
                        <input
                          type="text"
                          value={selectedReferral.referredByContact || ''}
                          disabled
                          className="w-full border-b-2 border-gray-400 bg-white px-2 py-1 text-sm font-medium cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Patient's Address:</span>
                        <input
                          type="text"
                          value={selectedPatient?.address || ''}
                          disabled
                          className="w-full border-b-2 border-gray-400 bg-white px-2 py-1 text-sm font-medium cursor-not-allowed"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Patient's Contact #:</span>
                        <input
                          type="text"
                          value={selectedPatient?.phone || ''}
                          disabled
                          className="w-full border-b-2 border-gray-400 bg-white px-2 py-1 text-sm font-medium cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

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
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReferral(null);
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-semibold"
              >
                Close
              </button>
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
                    setShowDetailModal(false);
                    setSelectedReferral(null);
                    handleDeleteReferral(selectedReferral.id);
                  }
                }}
                className="flex-1 px-4 py-2 flex items-center justify-center gap-2 border border-red-300 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-semibold"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}