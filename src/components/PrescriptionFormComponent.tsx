import React, { useState } from 'react';
import { Download, X, Plus, Trash2 } from 'lucide-react';
import { Patient } from '../App';
import { toast } from 'sonner';

interface MedicationItem {
  id: string;
  name: string;
  doses: string[];
  selectedDose?: string;
  quantity: string;
  sig: string;
}

interface PrescriptionFormComponentProps {
  patients: Patient[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (prescription: any) => void;
  currentUser?: any;
  clinicInfo?: {
    doctorName: string;
    specialty: string;
    address: string;
    phone: string;
    licenseNo: string;
    ptrNo: string;
  };
}

const defaultMedications: MedicationItem[] = [
  { id: 'mef', name: 'MEFENAMIC ACID', doses: ['500mg', '250mg'], quantity: '', sig: 'Take 1 cap 3x a day' },
  { id: 'amox', name: 'AMOXICILLIN', doses: ['500mg', '250mg'], quantity: '', sig: 'Take 1 cap 3x a day' },
  { id: 'tran', name: 'TRANEXAMIC ACID', doses: ['500mg', '250mg'], quantity: '', sig: 'Take 1 cap 3x a day' },
];

export const PrescriptionFormComponent: React.FC<PrescriptionFormComponentProps> = ({
  patients,
  isOpen,
  onClose,
  onSubmit,
  currentUser,
  clinicInfo
}) => {
  const [medications, setMedications] = useState<MedicationItem[]>(defaultMedications);
  const [formData, setFormData] = useState({
    patientName: '',
    patientId: '',
    age: '',
    sex: '',
    address: '',
    date: new Date().toISOString().split('T')[0],
  });

  const defaultClinic = {
    doctorName: currentUser?.name || 'JOSEPH E. MAAÑO, D.M.D.',
    specialty: currentUser?.position || 'GENERAL DENTISTRY / ORTHODONTICS',
    address: '#29 Emilio Jacinto St. San Diego Zone 2 Tayabas City 4327',
    phone: '(042)7171156',
    licenseNo: '0033129',
    ptrNo: ''
  };

  const clinic = clinicInfo || defaultClinic;

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
        address: patient.address,
        age: String(age),
        sex: patient.sex
      }));
    }
  };

  const updateMedication = (id: string, field: string, value: string) => {
    setMedications(prev => 
      prev.map(med => 
        med.id === id ? { ...med, [field]: value } : med
      )
    );
  };

  const addMedication = () => {
    const newId = `med-${Date.now()}`;
    setMedications(prev => [
      ...prev,
      { id: newId, name: '', doses: [], quantity: '', sig: '' }
    ]);
  };

  const removeMedication = (id: string) => {
    setMedications(prev => prev.filter(med => med.id !== id));
  };

  const handleSubmit = () => {
    if (!formData.patientName) {
      toast.error('Please select a patient');
      return;
    }

    if (medications.filter(m => m.name).length === 0) {
      toast.error('Please add at least one medication');
      return;
    }

    const prescription = {
      id: `PRESC-${Date.now()}`,
      patientId: formData.patientId,
      patientName: formData.patientName,
      date: formData.date,
      medications: medications.filter(m => m.name),
      prescribedBy: clinic.doctorName,
      createdAt: new Date().toISOString()
    };

    if (onSubmit) {
      onSubmit(prescription);
    }

    toast.success('Prescription created successfully');
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setMedications(defaultMedications);
    setFormData({
      patientName: '',
      patientId: '',
      age: '',
      sex: '',
      address: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const downloadForm = () => {
    const content = `
═══════════════════════════════════════════════════════════════════
                    PRESCRIPTION FORM
═══════════════════════════════════════════════════════════════════

DOCTOR: ${clinic.doctorName}
${clinic.specialty}
Address: ${clinic.address}
Phone: ${clinic.phone}
License No.: ${clinic.licenseNo}
PTR No.: ${clinic.ptrNo}

═══════════════════════════════════════════════════════════════════

PATIENT INFORMATION
Name: ${formData.patientName}
Age: ${formData.age}
Sex: ${formData.sex}
Address: ${formData.address}
Date: ${formData.date}

═══════════════════════════════════════════════════════════════════

MEDICATIONS

${medications
  .filter(med => med.name)
  .map(med => `
${med.name}
Dose: ${med.selectedDose || 'Not specified'}
Quantity: ${med.quantity}
Sig: ${med.sig}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
  .join('\n')}

═══════════════════════════════════════════════════════════════════
Generated on: ${new Date().toLocaleString()}
═══════════════════════════════════════════════════════════════════
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prescription-${formData.patientName}-${formData.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Prescription form downloaded');
  };

  if (!isOpen) return null;

  const UnderlineInput = ({ label, value, onChange, className = '' }: { label: string; value: string; onChange: (v: string) => void; className?: string }) => (
    <div className={`flex items-end ${className}`}>
      <span className="text-xs font-bold uppercase mr-2">{label}:</span>
      <input 
        type="text" 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 border-b border-slate-400 focus:outline-none focus:border-slate-600 bg-transparent px-1 h-[18px] mb-[-1px] font-sans text-sm" 
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-50 w-full max-w-3xl rounded-lg shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-300 bg-white">
          <h1 className="text-2xl font-bold text-slate-900">Prescription Form</h1>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Clinic Header */}
          <div className="text-center mb-8 border-b border-slate-300 pb-4">
            <h2 className="text-2xl font-bold tracking-widest text-slate-900">{clinic.doctorName}</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">{clinic.specialty}</p>
            <div className="flex justify-center items-center gap-2 mt-4 text-[10px] text-slate-600 font-sans">
              <p>{clinic.address}</p>
            </div>
            <div className="mt-4 flex flex-col items-center gap-1 text-[9px] font-bold text-slate-500 font-sans">
              <p>Tel # {clinic.phone}</p>
            </div>
          </div>

          {/* Patient Info Fields */}
          <div className="space-y-4 mb-8 bg-white p-6 rounded-lg border border-slate-200">
            <div>
              <label className="block text-sm font-bold mb-2">Select Patient</label>
              <select
                value={formData.patientId}
                onChange={(e) => handlePatientSelect(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              >
                <option value="">-- Select a Patient --</option>
                {patients.map(patient => (
                  <option key={patient.id} value={String(patient.id)}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <UnderlineInput 
                label="NAME" 
                value={formData.patientName}
                onChange={(v) => handleInputChange('patientName', v)}
                className="col-span-6"
              />
              <UnderlineInput 
                label="AGE" 
                value={formData.age}
                onChange={(v) => handleInputChange('age', v)}
                className="col-span-3"
              />
              <UnderlineInput 
                label="SEX" 
                value={formData.sex}
                onChange={(v) => handleInputChange('sex', v)}
                className="col-span-3"
              />
              <UnderlineInput 
                label="ADDRESS" 
                value={formData.address}
                onChange={(v) => handleInputChange('address', v)}
                className="col-span-12"
              />
              <UnderlineInput 
                label="DATE" 
                value={formData.date}
                onChange={(v) => handleInputChange('date', v)}
                className="col-span-12"
              />
            </div>
          </div>

          {/* Rx Section */}
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="mb-8">
              <span className="text-6xl font-serif italic text-slate-900 opacity-80">Rx</span>
            </div>

            <div className="space-y-8 pl-8">
              {medications.map((med, idx) => (
                <div key={med.id} className="pb-8 border-b border-slate-200 last:border-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Medication name"
                        value={med.name}
                        onChange={(e) => updateMedication(med.id, 'name', e.target.value)}
                        className="text-lg font-bold tracking-wide uppercase border-b border-slate-300 focus:outline-none focus:border-slate-600 bg-transparent w-full pb-1"
                      />
                    </div>
                    {idx > 2 && (
                      <button
                        onClick={() => removeMedication(med.id)}
                        className="ml-4 p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  <div className="pl-4 space-y-3">
                    <div className="flex gap-4 items-start">
                      <div className="flex-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">Doses</label>
                        <div className="flex gap-4">
                          {['250mg', '500mg', '1g'].map(dose => (
                            <label key={dose} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={med.doses.includes(dose)}
                                onChange={(e) => {
                                  const doses = e.target.checked 
                                    ? [...med.doses, dose]
                                    : med.doses.filter(d => d !== dose);
                                  updateMedication(med.id, 'doses', JSON.stringify(doses));
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-sm font-bold">{dose}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1"># (Quantity)</label>
                      <input 
                        type="text" 
                        value={med.quantity}
                        onChange={(e) => updateMedication(med.id, 'quantity', e.target.value)}
                        className="w-24 border-b border-slate-400 focus:outline-none focus:border-slate-600 bg-transparent text-center font-sans text-sm"
                        placeholder="e.g., 10 caps"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Sig (Directions)</label>
                      <input 
                        type="text" 
                        value={med.sig}
                        onChange={(e) => updateMedication(med.id, 'sig', e.target.value)}
                        className="flex-1 w-full border-b border-slate-200 focus:outline-none focus:border-slate-400 bg-transparent font-serif italic text-slate-700 px-1"
                        placeholder="e.g., Take 1 cap 3x a day"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addMedication}
              className="mt-6 flex items-center gap-2 px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
            >
              <Plus size={18} />
              Add Medication
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-300 bg-white">
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
            className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-black transition-colors font-semibold"
          >
            Create Prescription
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionFormComponent;
