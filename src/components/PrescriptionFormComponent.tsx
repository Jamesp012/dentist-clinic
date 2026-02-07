import React, { useState } from 'react';
import { Download, X, Plus, Trash2, Printer } from 'lucide-react';
import { Patient } from '../App';
import { toast } from 'sonner';
import { PatientSearchInput } from './PatientSearchInput';

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
  { id: 'mef', name: 'Mefenamic Acid', doses: ['500mg', '250mg'], quantity: '', sig: 'Take 1 cap 3x a day' },
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
  const [showPrintPreview, setShowPrintPreview] = useState(false);
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

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=1000,width=900');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Prescription - ${formData.patientName}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Times New Roman', Times, serif;
              background: white;
              color: #000;
            }
            
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .page {
                margin: 0;
                padding: 0;
                page-break-after: always;
                box-shadow: none;
              }
              button { display: none; }
            }
            
            .page {
              width: 8.5in;
              height: 11in;
              margin: 20px auto;
              padding: 0.4in;
              background: white;
              box-shadow: 0 0 0 1px #ccc;
              position: relative;
              font-size: 11pt;
            }
            
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 1px solid #000;
              padding-bottom: 12px;
            }
            
            .clinic-name {
              font-size: 16pt;
              font-weight: bold;
              letter-spacing: 1px;
              margin-bottom: 3px;
            }
            
            .specialty {
              font-size: 9pt;
              font-weight: bold;
              letter-spacing: 1px;
              color: #333;
              margin-bottom: 8px;
            }
            
            .clinic-details {
              font-size: 8pt;
              line-height: 1.3;
              color: #555;
            }
            
            .patient-info {
              margin-bottom: 20px;
            }
            
            .info-row {
              display: flex;
              margin-bottom: 10px;
              align-items: center;
              gap: 20px;
            }
            
            .info-field {
              display: flex;
              align-items: center;
              gap: 8px;
              flex: 1;
            }
            
            .info-label {
              font-weight: bold;
              font-size: 10pt;
              min-width: 50px;
            }
            
            .info-line {
              border-bottom: 1px solid #000;
              flex: 1;
              height: 18px;
              padding-left: 4px;
            }
            
            .rx-title {
              font-size: 42pt;
              font-style: italic;
              font-weight: bold;
              margin: 15px 0 20px 0;
              opacity: 0.8;
            }
            
            .medication-section {
              margin-bottom: 22px;
            }
            
            .medication-name {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 8px;
            }
            
            .med-radio {
              width: 16px;
              height: 16px;
              cursor: pointer;
            }
            
            .med-label {
              font-weight: bold;
              font-size: 11pt;
              letter-spacing: 0.5px;
              min-width: 140px;
            }
            
            .dose-options {
              display: flex;
              gap: 30px;
              margin-left: 28px;
              margin-bottom: 8px;
            }
            
            .dose-option {
              display: flex;
              align-items: center;
              gap: 6px;
            }
            
            .dose-radio {
              width: 14px;
              height: 14px;
              cursor: pointer;
            }
            
            .dose-label {
              font-size: 10pt;
            }
            
            .qty-sig-row {
              display: flex;
              gap: 30px;
              margin-left: 28px;
              align-items: baseline;
              margin-bottom: 14px;
            }
            
            .qty-field {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            
            .qty-label {
              font-weight: bold;
              font-size: 9pt;
            }
            
            .qty-input {
              width: 60px;
              border: none;
              border-bottom: 1px solid #000;
              font-size: 10pt;
            }
            
            .sig-field {
              display: flex;
              align-items: baseline;
              gap: 8px;
              flex: 1;
            }
            
            .sig-label {
              font-style: italic;
              font-size: 10pt;
              min-width: 35px;
            }
            
            .sig-input {
              border: none;
              border-bottom: 1px solid #000;
              flex: 1;
              font-style: italic;
              font-size: 10pt;
              padding: 2px 4px;
            }
            
            .footer-section {
              margin-top: 30px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            
            .signature-area {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            
            .sig-line {
              border-top: 1px solid #000;
              width: 180px;
              height: 40px;
            }
            
            .sig-text {
              font-size: 9pt;
              font-weight: bold;
              margin-top: 4px;
              text-align: center;
            }
            
            .doctor-info {
              text-align: right;
              font-size: 9pt;
            }
            
            .doctor-name {
              font-weight: bold;
              font-size: 10pt;
            }
            
            .license-info {
              display: flex;
              gap: 20px;
              font-size: 8pt;
              margin-top: 2px;
            }
            
            .print-button {
              text-align: center;
              margin: 20px 0;
            }
            
            .print-button button {
              padding: 10px 20px;
              background: #333;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
            }
            
            .print-button button:hover {
              background: #000;
            }
          </style>
        </head>
        <body>
          <div class="print-button">
            <button onclick="window.print()">🖨️ Print this Prescription</button>
          </div>
          
          <div class="page">
            <!-- Header -->
            <div class="header">
              <div class="clinic-name">${clinic.doctorName}</div>
              <div class="specialty">${clinic.specialty}</div>
              <div class="clinic-details">
                <div>${clinic.address}</div>
                <div>Tel # ${clinic.phone}</div>
              </div>
            </div>
            
            <!-- Patient Information -->
            <div class="patient-info">
              <div class="info-row">
                <div class="info-field" style="flex: 2;">
                  <div class="info-label">NAME:</div>
                  <div class="info-line">${formData.patientName}</div>
                </div>
                <div class="info-field" style="flex: 0.8;">
                  <div class="info-label">AGE:</div>
                  <div class="info-line">${formData.age}</div>
                </div>
                <div class="info-field" style="flex: 0.8;">
                  <div class="info-label">SEX:</div>
                  <div class="info-line">${formData.sex}</div>
                </div>
              </div>
              <div class="info-row">
                <div class="info-field">
                  <div class="info-label">ADDRESS:</div>
                  <div class="info-line">${formData.address}</div>
                </div>
              </div>
              <div class="info-row">
                <div class="info-field" style="flex: 0.6;">
                  <div class="info-label">DATE:</div>
                  <div class="info-line">${formData.date}</div>
                </div>
              </div>
            </div>
            
            <!-- Rx Symbol -->
            <div class="rx-title">Rx</div>
            
            <!-- Medications -->
            <div>
              ${medications
                .filter(med => med.name)
                .map(med => `
                  <div class="medication-section">
                    <div class="medication-name">
                      <input type="radio" class="med-radio" disabled>
                      <span class="med-label">${med.name}</span>
                      <div class="dose-options" style="margin-left: auto; margin-bottom: 0;">
                        ${med.doses.map(dose => `
                          <div class="dose-option">
                            <input type="radio" class="dose-radio" disabled>
                            <span class="dose-label">${dose}</span>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                    <div class="qty-sig-row">
                      <div class="qty-field">
                        <span class="qty-label">#</span>
                        <div style="border-bottom: 1px solid #000; width: 60px; height: 16px;"></div>
                      </div>
                      <div class="sig-field">
                        <span class="sig-label">Sig.</span>
                        <div style="border-bottom: 1px solid #000; flex: 1; height: 16px;"></div>
                      </div>
                    </div>
                  </div>
                `)
                .join('')}
            </div>
            
            <!-- Footer -->
            <div class="footer-section">
              <div class="signature-area">
                <div class="sig-line"></div>
                <div class="sig-text">PHYSICIAN'S SIGNATURE</div>
              </div>
              <div class="doctor-info">
                <div class="doctor-name">${clinic.doctorName}</div>
                <div class="license-info">
                  <div>LIC NO. <span style="font-weight: bold;">${clinic.licenseNo}</span></div>
                  <div>PTR <span style="font-weight: bold;">${clinic.ptrNo || '______'}</span></div>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Print Preview Component
  const PrintPreview = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-300 bg-slate-100">
          <h1 className="text-2xl font-bold text-slate-900">Print Preview</h1>
          <button
            onClick={() => setShowPrintPreview(false)}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="bg-white p-8 rounded-lg shadow mx-auto" style={{ width: '8.5in', fontFamily: "'Times New Roman', Times, serif" }}>
            {/* Header */}
            <div className="text-center mb-8 border-b-2 border-black pb-4">
              <h2 className="text-lg font-bold tracking-widest">{clinic.doctorName}</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mt-1">{clinic.specialty}</p>
              <div className="mt-3 text-xs text-gray-600 space-y-1">
                <p>{clinic.address}</p>
                <p>Tel # {clinic.phone}</p>
                <p>License No.: {clinic.licenseNo}{clinic.ptrNo ? ` | PTR No.: ${clinic.ptrNo}` : ''}</p>
              </div>
            </div>

            {/* Patient Info */}
            <div className="space-y-2 mb-8 text-xs">
              <div className="flex">
                <span className="font-bold w-20">NAME:</span>
                <span className="flex-1 border-b border-black ml-2">{formData.patientName}</span>
              </div>
              <div className="flex gap-8">
                <div className="flex flex-1">
                  <span className="font-bold w-16">AGE:</span>
                  <span className="flex-1 border-b border-black ml-2">{formData.age}</span>
                </div>
                <div className="flex flex-1">
                  <span className="font-bold w-16">SEX:</span>
                  <span className="flex-1 border-b border-black ml-2">{formData.sex}</span>
                </div>
              </div>
              <div className="flex">
                <span className="font-bold w-20">ADDRESS:</span>
                <span className="flex-1 border-b border-black ml-2">{formData.address}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-20">DATE:</span>
                <span className="flex-1 border-b border-black ml-2 w-40">{formData.date}</span>
              </div>
            </div>

            {/* Rx Symbol */}
            <div className="text-5xl font-serif italic mb-4 opacity-70">Rx</div>

            {/* Medications */}
            <div className="ml-8 space-y-6">
              {medications.filter(med => med.name).map(med => (
                <div key={med.id} className="border-b border-gray-300 pb-4">
                  <div className="font-bold text-xs tracking-widest uppercase border-b border-black pb-1 mb-3">{med.name}</div>
                  <div className="ml-4 space-y-1 text-xs">
                    <div className="flex">
                      <span className="font-bold w-12">Dose:</span>
                      <span className="flex-1 border-b border-dotted border-gray-400 ml-2">{med.doses.length > 0 ? med.doses.join(', ') : ''}</span>
                    </div>
                    <div className="flex">
                      <span className="font-bold w-12">Qty #:</span>
                      <span className="flex-1 border-b border-dotted border-gray-400 ml-2">{med.quantity}</span>
                    </div>
                    <div className="flex">
                      <span className="font-bold w-12">Sig:</span>
                      <span className="flex-1 border-b border-dotted border-gray-400 ml-2 italic">{med.sig}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Signature Section */}
            <div className="mt-12 flex justify-between">
              <div className="text-center w-40">
                <div className="border-t border-black h-12 mb-2"></div>
                <p className="text-xs font-bold">PHYSICIAN'S SIGNATURE</p>
              </div>
              <div className="text-center w-40">
                <div className="border-t border-black h-12 mb-2"></div>
                <p className="text-xs font-bold">DATE</p>
              </div>
            </div>

            <div className="text-center mt-8 text-xs text-gray-500">
              <p>Generated on: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-300 bg-white">
          <button
            onClick={() => setShowPrintPreview(false)}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-semibold"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 px-4 py-2 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            <Printer size={18} />
            Print Now
          </button>
        </div>
      </div>
    </div>
  );

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
    <>
      {showPrintPreview && <PrintPreview />}
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
          <div className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-transparent scrollbar-visible">
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
                <label className="block text-sm font-bold mb-2">Search Patient</label>
                <PatientSearchInput
                  patients={patients}
                  selectedPatientId={formData.patientId}
                  onSelectPatient={(id) => handlePatientSelect(id)}
                  placeholder="Search patient..."
                  required
                />
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
              onClick={() => setShowPrintPreview(true)}
              className="flex-1 px-4 py-2 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              <Printer size={18} />
              Print Preview
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
    </>
  );
};

export default PrescriptionFormComponent;
