import React, { useState } from 'react';
import { Check, Download, X } from 'lucide-react';
import { Patient, Referral } from '../App';
import { toast } from 'sonner';

interface ReferralFormComponentProps {
  patients: Patient[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (referral: Referral) => void;
  currentUser?: any;
}

export const ReferralFormComponent: React.FC<ReferralFormComponentProps> = ({
  patients,
  isOpen,
  onClose,
  onSubmit,
  currentUser
}) => {
  const [selectedServices, setSelectedServices] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    patientName: '',
    patientId: '',
    date: new Date().toISOString().split('T')[0],
    contactNo: '',
    age: '',
    dateOfBirth: '',
    sex: '',
    referredBy: '',
    referredByContact: '',
    referredByEmail: '',
    referredTo: '',
    specialty: '',
    reason: '',
    urgency: 'routine' as 'routine' | 'urgent' | 'emergency'
  });

  const toggleService = (id: string) => {
    setSelectedServices(prev => ({ ...prev, [id]: !prev[id] }));
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

  const handleSubmit = () => {
    if (!formData.patientName || !formData.referredTo || !formData.specialty || !formData.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newReferral: Referral = {
      id: `REF-${Date.now()}`,
      patientId: formData.patientId || patients.find(p => p.name === formData.patientName)?.id || '',
      patientName: formData.patientName,
      referringDentist: formData.referredBy || currentUser?.name || 'Dr. Dentist',
      referredTo: formData.referredTo,
      specialty: formData.specialty,
      reason: formData.reason,
      date: formData.date,
      urgency: formData.urgency
    };

    onSubmit(newReferral);
    resetForm();
    onClose();
    toast.success('Referral created successfully');
  };

  const resetForm = () => {
    setSelectedServices({});
    setFormData({
      patientName: '',
      patientId: '',
      date: new Date().toISOString().split('T')[0],
      contactNo: '',
      age: '',
      dateOfBirth: '',
      sex: '',
      referredBy: currentUser?.name || '',
      referredByContact: currentUser?.phone || '',
      referredByEmail: currentUser?.email || '',
      referredTo: '',
      specialty: '',
      reason: '',
      urgency: 'routine'
    });
  };

  const downloadForm = () => {
    const content = `
═══════════════════════════════════════════════════════════════════
                    DENTAL REFERRAL FORM
═══════════════════════════════════════════════════════════════════

PATIENT INFORMATION
Patient's Name: ${formData.patientName}
Date: ${formData.date}
Contact No.: ${formData.contactNo}
Age: ${formData.age}
Date of Birth: ${formData.dateOfBirth}
Sex: ${formData.sex}

REFERRING DENTIST INFORMATION
Referred by: ${formData.referredBy}
Contact No.: ${formData.referredByContact}
Email: ${formData.referredByEmail}

REFERRAL DETAILS
Referred To: ${formData.referredTo}
Specialty: ${formData.specialty}
Urgency Level: ${formData.urgency.toUpperCase()}

SELECTED DIAGNOSTIC SERVICES
${Object.entries(selectedServices)
  .filter(([, selected]) => selected)
  .map(([service]) => `• ${service}`)
  .join('\n') || 'None selected'}

REASON FOR REFERRAL
${formData.reason}

═══════════════════════════════════════════════════════════════════
Generated on: ${new Date().toLocaleString()}
═══════════════════════════════════════════════════════════════════
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referral-${formData.patientName}-${formData.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Referral form downloaded');
  };

  if (!isOpen) return null;

  const ServiceItem = ({ label, id }: { label: string; id: string }) => (
    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleService(id)}>
      <div className={`w-5 h-5 rounded-full border-2 border-yellow-400 flex items-center justify-center transition-colors ${selectedServices[id] ? 'bg-yellow-400' : 'bg-white'}`}>
        {selectedServices[id] && <Check className="text-white w-3.5 h-3.5 stroke-[4]" />}
      </div>
      <span className="text-sm font-bold tracking-tight">{label}</span>
    </div>
  );

  const UnderlineInput = ({ label, value, onChange, className = '' }: { label: string; value: string; onChange: (v: string) => void; className?: string }) => (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm whitespace-nowrap font-semibold">{label}</span>
      <input 
        type="text" 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 border-b-2 border-slate-400 focus:outline-none focus:border-yellow-500 focus:bg-yellow-50 bg-white px-2 py-1 text-sm transition-colors" 
        style={{ minHeight: '32px' }}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-yellow-50 to-slate-50">
          <h1 className="text-2xl font-bold text-slate-900">Dental Referral Form</h1>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="space-y-6">
            {/* Patient Information */}
            <div className="space-y-4 pb-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 uppercase">Patient Information</h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-bold mb-2">Select Patient</label>
                  <select
                    value={formData.patientId}
                    onChange={(e) => handlePatientSelect(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="">-- Select a Patient --</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={String(patient.id)}>
                        {patient.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <UnderlineInput 
                    label="Patient's Name:" 
                    value={formData.patientName}
                    onChange={(v) => handleInputChange('patientName', v)}
                    className="col-span-2"
                  />
                  <UnderlineInput 
                    label="Contact No.:" 
                    value={formData.contactNo}
                    onChange={(v) => handleInputChange('contactNo', v)}
                  />
                  <UnderlineInput 
                    label="Date:" 
                    value={formData.date}
                    onChange={(v) => handleInputChange('date', v)}
                  />
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <UnderlineInput 
                    label="Age:" 
                    value={formData.age}
                    onChange={(v) => handleInputChange('age', v)}
                  />
                  <UnderlineInput 
                    label="Sex:" 
                    value={formData.sex}
                    onChange={(v) => handleInputChange('sex', v)}
                    className="col-span-1"
                  />
                  <UnderlineInput 
                    label="DOB:" 
                    value={formData.dateOfBirth}
                    onChange={(v) => handleInputChange('dateOfBirth', v)}
                    className="col-span-2"
                  />
                </div>
              </div>
            </div>

            {/* Referring Dentist */}
            <div className="space-y-4 pb-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 uppercase">Referring Dentist</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <UnderlineInput 
                  label="Name:" 
                  value={formData.referredBy}
                  onChange={(v) => handleInputChange('referredBy', v)}
                  className="col-span-2"
                />
                <UnderlineInput 
                  label="Contact No.:" 
                  value={formData.referredByContact}
                  onChange={(v) => handleInputChange('referredByContact', v)}
                />
                <UnderlineInput 
                  label="Email:" 
                  value={formData.referredByEmail}
                  onChange={(v) => handleInputChange('referredByEmail', v)}
                />
              </div>
            </div>

            {/* Specialist Information */}
            <div className="space-y-4 pb-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 uppercase">Referral Details</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <UnderlineInput 
                  label="Referred To:" 
                  value={formData.referredTo}
                  onChange={(v) => handleInputChange('referredTo', v)}
                />
                <UnderlineInput 
                  label="Specialty:" 
                  value={formData.specialty}
                  onChange={(v) => handleInputChange('specialty', v)}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Urgency Level</label>
                <div className="flex gap-4">
                  {['routine', 'urgent', 'emergency'].map(level => (
                    <label key={level} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="urgency"
                        value={level}
                        checked={formData.urgency === level}
                        onChange={(e) => handleInputChange('urgency', e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="capitalize font-semibold">{level}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Diagnostic Services */}
            <div className="space-y-4 pb-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 uppercase">Diagnostic Services</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-700">Imaging</h3>
                  <ServiceItem label="STANDARD PANORAMIC" id="pano" />
                  <ServiceItem label="TMJ (OPEN & CLOSE)" id="tmj" />
                  <ServiceItem label="SINUS PA" id="sinus" />
                  <ServiceItem label="BITEWING LEFT SIDE" id="bite-l" />
                  <ServiceItem label="BITEWING RIGHT SIDE" id="bite-r" />
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-slate-700">Other Services</h3>
                  <ServiceItem label="DIAGNOSTIC MODEL CAST" id="model" />
                  <ServiceItem label="INTRAORAL PHOTOGRAPH" id="intra" />
                  <ServiceItem label="EXTRAORAL PHOTOGRAPH" id="extra" />
                </div>
              </div>
            </div>

            {/* Reason for Referral */}
            <div className="space-y-4 pb-6">
              <label className="block text-lg font-bold text-slate-900 uppercase">Reason for Referral</label>
              <textarea
                value={formData.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                className="w-full border-2 border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500 min-h-24"
                placeholder="Describe the reason for this referral..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={downloadForm}
            className="flex-1 px-4 py-2 flex items-center justify-center gap-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-semibold"
          >
            <Download size={18} />
            Download
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-semibold"
          >
            Create Referral
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReferralFormComponent;
