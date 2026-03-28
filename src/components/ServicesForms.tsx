import { treatmentRecordAPI, paymentAPI, prescriptionAPI, appointmentAPI } from '../api';
import { useState, useEffect } from 'react';
import { Patient, TreatmentRecord, Payment } from '../App';
import { FileText, Printer, Download, Plus, X, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { formatToDD_MM_YYYY } from '../utils/dateHelpers';
import { generatePrescriptionPDF, generateDetailedReceiptPDF } from '../utils/pdfGenerator';

type ServicesFormsProps = {
  patients: Patient[];
  treatmentRecords: TreatmentRecord[];
  setTreatmentRecords: (records: TreatmentRecord[]) => void;
  payments: Payment[];
  prefilledAppointment?: {
    patientId: string;
    patientName: string;
    appointmentType: string | string[];
    appointmentId?: string;
  };
  onServiceCreated?: (patientId: string, service: TreatmentRecord) => void;
  onDataChanged?: () => Promise<void>;
};



type Prescription = {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    slot?: 'mefenamic1' | 'amoxicilin' | 'mefenamic2';
  }[];
  dentist: string;
  notes: string;
  licenseNumber?: string;
  ptrNumber?: string;
};

export function ServicesForms({ patients, treatmentRecords, setTreatmentRecords, payments, prefilledAppointment, onServiceCreated, onDataChanged }: ServicesFormsProps) {
    // ...existing code...

    const handleCreatePrescription = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      try {
        const formData = new FormData(e.currentTarget);
        const patientId = prescriptionPatientId;
        const patientName = prescriptionPatientSearch;
        const dentist = formData.get('dentist') as string;
        const licenseNumber = formData.get('license_number') as string;
        const ptrNumber = formData.get('ptr_number') as string;
        const date = formData.get('date') as string;
        const notes = formData.get('notes') as string;

        // Collect medications from form
        const medications: Prescription['medications'] = [];
        // Example: Add logic to collect medication fields from formData
        // (You may need to adjust this based on your actual form structure)
        if (formData.get('med_mefenamic_1') === 'on') {
          const dosage = formData.get('mefenamic1_dosage') as string || '';
          const quantity = formData.get('mefenamic1_quantity') as string || '';
          const sig = formData.get('mefenamic1_sig') as string || 'Take 1 cap 3x a day';
          if (quantity) {
            medications.push({
              name: 'Mefenamic Acid',
              dosage,
              frequency: sig,
              duration: `Quantity: ${quantity}`,
              slot: 'mefenamic1',
            });
          }
        }
        if (formData.get('med_amoxicillin') === 'on') {
          const dosage = formData.get('amoxicillin_dosage') as string || '';
          const quantity = formData.get('amoxicillin_quantity') as string || '';
          const sig = formData.get('amoxicillin_sig') as string || 'Take 1 cap 3x a day';
          if (quantity) {
            medications.push({
              name: 'Amoxicilin',
              dosage,
              frequency: sig,
              duration: `Quantity: ${quantity}`,
              slot: 'amoxicilin',
            });
          }
        }
        if (formData.get('med_mefenamic_2') === 'on') {
          const dosage = formData.get('mefenamic2_dosage') as string || '';
          const quantity = formData.get('mefenamic2_quantity') as string || '';
          const sig = formData.get('mefenamic2_sig') as string || 'Take 1 cap 3x a day';
          if (quantity) {
            medications.push({
              name: 'Tranexamic Acid',
              dosage,
              frequency: sig,
              duration: `Quantity: ${quantity}`,
              slot: 'mefenamic2',
            });
          }
        }

        if (medications.length === 0) {
          toast.error('Please select at least one medication and specify quantity');
          return;
        }

        const prescriptionData = {
          patientId,
          patientName,
          date,
          medications,
          dentist,
          notes,
          licenseNumber,
          ptrNumber,
        };

        // Save to backend
        const savedPrescription = await prescriptionAPI.create(prescriptionData);

        const savedId = savedPrescription && (savedPrescription.id || savedPrescription._id) ? String(savedPrescription.id ?? savedPrescription._id) : `tmp-${Date.now()}`;
        const nowISO = new Date().toISOString();
        const newPrescription: Prescription & { createdAt?: string } = {
          id: savedId,
          patientId,
          patientName,
          date,
          medications,
          dentist,
          notes,
          licenseNumber,
          ptrNumber,
          createdAt: savedPrescription?.createdAt || nowISO,
        };

        // Optimistically prepend the new prescription so it appears immediately as most recent
        setPrescriptions(prev => [newPrescription, ...prev]);
        setViewingPrescription(newPrescription);
        setActiveForm(null);
        setPrescriptionPatientSearch('');
        setPrescriptionPatientId('');

        toast.success('Prescription created and saved successfully');

        // Reload prescriptions to show new one (delay slightly to avoid eventual-consistency race)
        try {
          await new Promise(res => setTimeout(res, 300));
          const allPrescriptions = await prescriptionAPI.getAll();
          if (allPrescriptions) {
            setPrescriptions(allPrescriptions);
          }
        } catch (error) {
          console.error('Failed to reload prescriptions:', error);
        }

        // Refresh all data
        if (onDataChanged) {
          await onDataChanged();
        }
      } catch (error) {
        console.error('Failed to create prescription:', error);
        toast.error('Failed to create prescription');
      }
    };
  const [activeForm, setActiveForm] = useState<'service' | 'prescription' | 'receipt' | null>(prefilledAppointment ? 'service' : null);
  const dentalServices = [
    'Dental consultation',
    'Oral examination',
    'Diagnosis',
    'Treatment planning',
    'Dental cleaning',
    'Scaling',
    'Polishing',
    'Stain removal',
    'Temporary filling',
    'Permanent filling',
    'Tooth repair',
    'Dental bonding',
    'Simple tooth extraction',
    'Surgical extraction',
    'Impacted tooth removal',
    'Braces installation',
    'Braces adjustment',
    'Retainers',
    'Orthodontic consultation',
    'Complete dentures',
    'Partial dentures'
  ];
  const [selectedService, setSelectedService] = useState<string>(() => dentalServices[0]);
    const [selectedServices, setSelectedServices] = useState<string[]>(() => {
      if (!prefilledAppointment) return [];
      const at = prefilledAppointment.appointmentType;
      if (Array.isArray(at)) return at as string[];
      if (typeof at === 'string') return at.split(',').map(s => s.trim()).filter(Boolean);
      return [];
    });
  const [selectedPatient, setSelectedPatient] = useState<string>(prefilledAppointment?.patientId || '');
  const [patientSearch, setPatientSearch] = useState<string>(() => {
    if (prefilledAppointment) {
      return prefilledAppointment.patientName;
    }
    return '';
  });
  const [prescriptionPatientSearch, setPrescriptionPatientSearch] = useState<string>('');
  const [prescriptionPatientId, setPrescriptionPatientId] = useState<string>('');
  const [showReceiptSuggestions, setShowReceiptSuggestions] = useState<boolean>(false);
  const [showPrescriptionSuggestions, setShowPrescriptionSuggestions] = useState<boolean>(false);
  const [viewingPrescription, setViewingPrescription] = useState<Prescription | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<TreatmentRecord | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [showPrescriptionPrompt, setShowPrescriptionPrompt] = useState(false);
  const [lastCreatedService, setLastCreatedService] = useState<TreatmentRecord | null>(null);
  const [paymentType, setPaymentType] = useState<'full' | 'installment'>('full');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [numberOfInstallments, setNumberOfInstallments] = useState<number>(3);
  const [isFromAppointment, setIsFromAppointment] = useState<boolean>(!!prefilledAppointment);

  // ...existing code...

  // Load prescriptions on component mount
  useEffect(() => {
    const loadPrescriptions = async () => {
      try {
        const allPrescriptions = await prescriptionAPI.getAll();
        if (allPrescriptions) {
          setPrescriptions(allPrescriptions);
        }
      } catch (error) {
        console.error('Failed to load prescriptions:', error);
      }
    };
    loadPrescriptions();
  }, []);

  const handleCreateService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const patientId = formData.get('patientId') as string;
      const totalCost = parseFloat(formData.get('cost') as string) || 0;
      const paid = parseFloat(formData.get('amountPaid') as string) || 0;
      const type = (formData.get('paymentType') as 'full' | 'installment') || 'full';
      const date = formData.get('date') as string;
      const services = formData.getAll('services');
      const dentist = formData.get('dentist') as string;

      let installmentPlan;
      if (type === 'installment') {
        const numInstallments = parseInt(formData.get('numberOfInstallments') as string) || 3;
        const amountPerInstallment = totalCost / numInstallments;
        installmentPlan = {
          installments: numInstallments,
          amountPerInstallment,
          installmentsDue: Array.from({ length: numInstallments }, (_, i) => ({
            dueDate: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            amount: amountPerInstallment,
            paid: i === 0 && paid > 0,
          })),
        };
      }

      // Convert FormDataEntryValue[] to string[]
      const serviceList = services.map(s => typeof s === 'string' ? s : '').filter(Boolean);

      if (serviceList.length === 0) {
        toast.error('Please select at least one service.');
        return;
      }

      // Create a single combined treatment record representing all selected services
      const combinedTreatment = serviceList.join(', ');
      const newRecordData = {
        patientId,
        appointmentId: prefilledAppointment?.appointmentId || undefined,
        date,
        description: combinedTreatment,
        treatment: combinedTreatment,
        // preserve legacy and new formats for backend compatibility
        type: combinedTreatment,
        types: serviceList,
        selectedServices: serviceList,
        tooth: formData.get('tooth') as string || undefined,
        notes: formData.get('notes') as string,
        cost: totalCost,
        dentist,
        paymentType: type,
        amountPaid: paid,
        remainingBalance: totalCost - paid,
        installmentPlan,
      } as any;

      // Save to backend (single record)
      const savedRecord = await treatmentRecordAPI.create(newRecordData);
      const nowISO = new Date().toISOString();
      (savedRecord as any).createdAt = savedRecord.createdAt || nowISO;

      // Create a single payment record if there's an initial payment
      if (paid > 0) {
        await paymentAPI.create({
          patientId,
          treatmentRecordId: savedRecord.id,
          amount: paid,
          paymentDate: date,
          paymentMethod: 'cash',
          status: 'paid',
          notes: `Initial payment for ${combinedTreatment}`,
          recordedBy: dentist
        });
      }

      setTreatmentRecords([...treatmentRecords, savedRecord]);
      setLastCreatedService(savedRecord);

      if (savedRecord.inventoryDeduction) {
        if (savedRecord.inventoryDeduction.applied && savedRecord.inventoryDeduction.reductions?.length) {
          const summary = savedRecord.inventoryDeduction.reductions
            .map((reduction) => {
              const unitType = (reduction.unitType || 'piece').toLowerCase();
              if (unitType === 'box') {
                return `${reduction.itemName} (-${reduction.unitsDeducted} box${reduction.unitsDeducted === 1 ? '' : 'es'})`;
              }
              return `${reduction.itemName} (-${reduction.piecesDeducted} pc${reduction.piecesDeducted === 1 ? '' : 's'})`;
            })
            .join(', ');
          toast.success(`Inventory deducted: ${summary}`);
        } else if (savedRecord.inventoryDeduction.missingRules?.length) {
          toast.warning(`No inventory rules configured for: ${savedRecord.inventoryDeduction.missingRules.join(', ')}`);
        }
      }
      setPaymentType('full');
      setAmountPaid(0);
      setNumberOfInstallments(3);
      setSelectedPatient('');
      setPatientSearch('');
      toast.success('Service records saved successfully');
      if (onDataChanged) {
        await onDataChanged();
      }
      if (isFromAppointment) {
        // If this receipt was created from an appointment, mark the appointment completed now
        try {
          const appointmentId = prefilledAppointment?.appointmentId;
          if (appointmentId) {
            await appointmentAPI.update(appointmentId, { status: 'completed' });
            toast.success('Appointment marked completed');
            if (onDataChanged) await onDataChanged();
          }
        } catch (err) {
          console.error('Failed to mark appointment completed:', err);
          toast.error('Failed to mark appointment completed');
        }

        setActiveForm(null);
        setIsFromAppointment(false);
        if (onDataChanged) await onDataChanged();
        return;
      }
      setShowPrescriptionPrompt(true);
      if (onServiceCreated) {
        onServiceCreated(patientId, savedRecord);
      }
    } catch (err: any) {
      console.error('Failed to save service:', err);
      const shortages = err?.details?.shortages;
      if (Array.isArray(shortages) && shortages.length > 0) {
        const detail = shortages
          .map((item: any) => {
            const required = item.requestedPieces ?? item.requiredPieces;
            const available = item.availablePieces ?? item.available;
            return `${item.itemName || 'Item'} (need ${required}, available ${available})`;
          })
          .join('; ');
        toast.warning(`Insufficient inventory: ${detail}`);
      } else {
        toast.error(err?.message || 'Failed to save service record');
      }
    }
  }

  const printPrescription = (prescription: Prescription) => {
    const patient = patients.find(p => String(p.id) === String(prescription.patientId));
    if (!patient) {
      toast.error('Patient not found');
      return;
    }
    generatePrescriptionPDF(patient, prescription);
  };

  const printReceipt = (record: TreatmentRecord) => {
    const patient = patients.find(p => String(p.id) === String(record.patientId));
    if (!patient) {
      toast.error('Patient not found');
      return;
    }
    generateDetailedReceiptPDF(patient, record, payments);
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex flex-col flex-1">
      <div className="p-4 md:p-10 space-y-6 md:space-y-10 flex flex-col flex-1 max-w-[1600px] mx-auto w-full">
        {/* Premium Header Section */}
        <div className="relative flex items-center justify-end">
          <div className="absolute -top-4 -left-4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-4 -right-4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
          
          {/* Action Buttons - Right Side */}
          <div className="flex gap-2 md:gap-4">
            <button
              onClick={() => setActiveForm('service')}
              className="group relative px-3 py-2 md:px-5 md:py-2.5 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 text-white rounded-lg md:rounded-xl hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-102 active:scale-95 transition-all duration-200 flex items-center gap-1.5 md:gap-2 font-semibold text-xs md:text-sm overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Plus className="w-4 h-4 md:w-5 md:h-5 relative z-10" />
              <span className="relative z-10">New Receipt</span>
            </button>
            <button
              onClick={() => setActiveForm('prescription')}
              className="group relative px-3 py-2 md:px-5 md:py-2.5 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-lg md:rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-102 active:scale-95 transition-all duration-200 flex items-center gap-1.5 md:gap-2 font-semibold text-xs md:text-sm overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <FileText className="w-4 h-4 md:w-5 md:h-5 relative z-10" />
              <span className="relative z-10">Prescription</span>
            </button>
          </div>
        </div>
        <div className='h-[70vh] overflow-y-auto scrollbar-thin pr-1 md:pr-3 flex flex-col gap-3 md:gap-4'>
          {/* Recent Receipts - Premium Card Design */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 rounded-2xl md:rounded-3xl opacity-20 group-hover:opacity-30 blur transition-all duration-500"></div>
            <div className="relative bg-white/90 backdrop-blur-xl p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-xl border border-slate-200/60 hover:shadow-2xl transition-all duration-500">
              <div className="flex items-center justify-between mb-4 md:mb-8">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-7 h-7 md:w-9 md:h-9 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center shadow">
                    <CreditCard className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                  </div>
                  <h2 className="text-lg md:text-2xl font-semibold text-slate-900">Recent Receipts</h2>
                </div>
                <span className="px-3 py-1 md:px-4 md:py-2 bg-teal-50 text-teal-700 rounded-lg md:rounded-xl text-[10px] md:text-sm font-bold">
                  {treatmentRecords.length} Total
                </span>
              </div>
              
              <div className="space-y-2 md:space-y-3 max-h-[380px] overflow-y-auto scrollbar-thin pr-1 md:pr-2">
                {[...treatmentRecords]
                  .slice()
                  .sort((a, b) => new Date((b as any).createdAt || b.date || 0).getTime() - new Date((a as any).createdAt || a.date || 0).getTime())
                  .map((record) => {
                  const patient = patients.find(p => String(p.id) === String(record.patientId));
                  return (
                    <div key={record.id} className="group/item relative p-3 md:p-4 border border-slate-100 rounded-xl hover:border-cyan-300/60 transition-all duration-300 bg-gradient-to-br from-white via-slate-50/30 to-cyan-50/20 hover:shadow-md hover:scale-[1.01]">
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-teal-500/5 rounded-xl md:rounded-2xl opacity-0 group-hover/item:opacity-100 transition-opacity duration-300"></div>
                      
                      <div className="relative flex justify-between items-start gap-3 md:gap-6">
                        <div className="flex-1 space-y-2 md:space-y-3">
                          <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-cyan-100 to-teal-100 rounded-md flex items-center justify-center font-bold text-cyan-700 text-[10px] md:text-xs">
                              {patient?.name?.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm md:text-lg font-semibold text-slate-900 truncate">{patient?.name}</p>
                              <p className="text-[9px] md:text-xs text-slate-500 mt-0.5">{formatToDD_MM_YYYY((record as any).createdAt || record.date)} • Dr. {record.dentist}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5 md:gap-2 pl-0.5 md:pl-1">
                            <span className="w-1 md:w-1.5 h-1 md:h-1.5 bg-cyan-500 rounded-full flex-shrink-0"></span>
                            <p className="text-[11px] md:text-sm text-slate-700 font-medium line-clamp-1">{record.treatment} {record.tooth ? `- Tooth ${record.tooth}` : ''}</p>
                          </div>
                          
                          <div className="flex gap-2 md:gap-3 flex-wrap items-center">
                            <span className="text-base md:text-xl font-extrabold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                              ₱{Number(record.cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {record.paymentType && (
                              <div className="flex flex-wrap gap-1.5 md:gap-2">
                                <span className={`px-2 py-0.5 md:px-4 md:py-1.5 rounded-lg md:rounded-xl font-bold text-[8px] md:text-xs tracking-wider shadow-sm ${record.paymentType === 'full' ? 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700' : 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700'}`}>
                                  {record.paymentType === 'full' ? '✓ FULL' : '⚡ INST'}
                                </span>
                                {record.amountPaid !== undefined && record.amountPaid > 0 && (
                                  <span className="px-2 py-0.5 md:px-3 md:py-1.5 bg-slate-100 text-slate-700 rounded-lg md:rounded-xl font-bold text-[8px] md:text-xs">
                                    Paid: ₱{Math.round(record.amountPaid).toLocaleString()}
                                  </span>
                                )}
                                {record.remainingBalance !== undefined && record.remainingBalance > 0 && (
                                  <span className="px-2 py-0.5 md:px-3 md:py-1.5 bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 rounded-lg md:rounded-xl font-bold text-[8px] md:text-xs shadow-sm">
                                    Bal: ₱{Math.round(record.remainingBalance).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-1.5 md:gap-2 flex-shrink-0">
                          <button
                            onClick={() => {
                              setViewingReceipt(record);
                            }}
                            className="group/btn px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-md hover:shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 md:gap-2 font-semibold text-[10px] md:text-xs duration-300"
                          >
                            <CreditCard className="w-3 h-3 md:w-4 md:h-4" />
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {treatmentRecords.length === 0 && (
                  <div className="text-center py-10 md:py-16">
                    <div className="w-14 h-14 md:w-20 md:h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                      <CreditCard className="w-7 h-7 md:w-10 md:h-10 text-slate-400" />
                    </div>
                    <p className="text-slate-500 text-base md:text-lg font-medium">No receipts recorded</p>
                    <p className="text-slate-400 text-xs md:text-sm mt-1 md:mt-2">Click "New Receipt" to start</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Prescriptions - Premium Card Design */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl md:rounded-3xl opacity-20 group-hover:opacity-30 blur transition-all duration-500"></div>
            <div className="relative bg-white/90 backdrop-blur-xl p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-xl border border-slate-200/60 hover:shadow-2xl transition-all duration-500">
              <div className="flex items-center justify-between mb-4 md:mb-8">
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="w-7 h-7 md:w-9 md:h-9 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center shadow">
                    <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                  </div>
                  <h2 className="text-lg md:text-2xl font-semibold text-slate-900">Recent Prescriptions</h2>
                </div>
                <span className="px-3 py-1 md:px-4 md:py-2 bg-emerald-50 text-emerald-700 rounded-lg md:rounded-xl text-[10px] md:text-sm font-bold">
                  {prescriptions.length} Total
                </span>
              </div>
              
              <div className="space-y-2 md:space-y-3 max-h-[380px] overflow-y-auto scrollbar-thin pr-1 md:pr-2">
                {[...prescriptions]
                  .slice()
                  .sort((a, b) => new Date((b as any).createdAt || b.date || 0).getTime() - new Date((a as any).createdAt || a.date || 0).getTime())
                  .map((prescription) => (
                  <div key={prescription.id} className="group/item relative p-3 md:p-4 border border-slate-100 rounded-xl hover:border-emerald-300/60 transition-all duration-300 bg-gradient-to-br from-white via-slate-50/30 to-emerald-50/20 hover:shadow-md hover:scale-[1.01]">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-xl md:rounded-2xl opacity-0 group-hover/item:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className="relative flex justify-between items-start gap-3 md:gap-6">
                      <div className="flex-1 space-y-2 md:space-y-3">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-md flex items-center justify-center font-bold text-emerald-700 text-[10px] md:text-xs">
                            {prescription.patientName?.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm md:text-lg font-semibold text-slate-900 truncate">{prescription.patientName}</p>
                            <p className="text-[9px] md:text-xs text-slate-500 mt-0.5">{formatToDD_MM_YYYY((prescription as any).createdAt || prescription.date)} • Dr. {prescription.dentist}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 md:gap-2 pl-0.5 md:pl-1">
                          <span className="w-1 md:w-1.5 h-1 md:h-1.5 bg-emerald-500 rounded-full flex-shrink-0"></span>
                          <p className="text-[11px] md:text-sm text-slate-700 font-medium">{prescription.medications.length} medication(s)</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1.5 md:gap-3 flex-shrink-0">
                        <button
                          onClick={() => setViewingPrescription(prescription)}
                          className="group/btn px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-lg hover:shadow-md hover:shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 md:gap-2 font-semibold text-[10px] md:text-xs duration-300"
                        >
                          <FileText className="w-3 h-3 md:w-4 md:h-4" />
                          View
                        </button>
                        <button
                          onClick={() => printPrescription(prescription)}
                          className="px-2 py-1.5 md:px-3 md:py-2 bg-gradient-to-br from-slate-600 to-slate-700 text-white rounded-lg hover:shadow-md hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 md:gap-2 font-semibold text-[10px] md:text-xs duration-300"
                          title="Print Prescription"
                        >
                          <Download className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {prescriptions.length === 0 && (
                  <div className="text-center py-10 md:py-16">
                    <div className="w-14 h-14 md:w-20 md:h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                      <FileText className="w-7 h-7 md:w-10 md:h-10 text-slate-400" />
                    </div>
                    <p className="text-slate-500 text-base md:text-lg font-medium">No prescriptions created</p>
                    <p className="text-slate-400 text-xs md:text-sm mt-1 md:mt-2">Click "Prescription" to start</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Receipt Modal - Premium Design */}
      {activeForm === 'service' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-2 md:p-4">
          <div className="relative bg-white backdrop-blur-2xl rounded-2xl md:rounded-3xl p-4 md:p-10 max-w-3xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto overflow-x-hidden scrollbar-thin shadow-2xl border border-slate-200/60">
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl"></div>
            
            <div className="relative">
              <div className="flex justify-between items-center mb-4 md:mb-8 pb-3 md:pb-6 border-b-2 border-slate-200/60">
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="w-8 h-8 md:w-14 md:h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg md:rounded-2xl flex items-center justify-center shadow-lg">
                    <CreditCard className="w-4 h-4 md:w-7 md:h-7 text-white" />
                  </div>
                  <h2 className="text-xl md:text-4xl font-extrabold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Record Receipt</h2>
                </div>
                {!isFromAppointment && (
                  <button onClick={() => setActiveForm(null)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full p-1.5 md:p-2 transition-all">
                    <X className="w-5 h-5 md:w-7 md:h-7" />
                  </button>
                )}
              </div>
              <form onSubmit={handleCreateService} className="space-y-4 md:space-y-6 relative">
              <div>
                <label className="block text-[10px] md:text-xs font-extrabold uppercase tracking-widest mb-2 md:mb-4 text-slate-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-teal-500 rounded-full"></span>
                  Patient *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search patient name..."
                    value={patientSearch}
                    onChange={(e) => {
                      if (!isFromAppointment) {
                        setPatientSearch(e.target.value);
                        setShowReceiptSuggestions(true);
                      }
                    }}
                    onFocus={() => {
                      if (!isFromAppointment) {
                        setShowReceiptSuggestions(true);
                      }
                    }}
                    onBlur={() => setTimeout(() => setShowReceiptSuggestions(false), 200)}
                    readOnly={isFromAppointment}
                    className={`w-full px-4 py-3 md:px-5 md:py-4 bg-slate-50/50 backdrop-blur-sm border-2 border-slate-200 rounded-xl md:rounded-2xl focus:outline-none focus:ring-4 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all text-sm md:text-base font-medium placeholder:text-slate-400 ${isFromAppointment ? 'bg-slate-100/70 cursor-not-allowed' : ''}`}
                  />
                  {patientSearch && showReceiptSuggestions && !isFromAppointment && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/98 backdrop-blur-xl border-2 border-slate-200 rounded-xl md:rounded-2xl shadow-2xl z-10 max-h-64 overflow-y-auto scrollbar-thin">
                      {patients.filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase())).map(patient => (
                        <div
                          key={patient.id}
                          onMouseDown={() => {
                            setSelectedPatient(String(patient.id));
                            setPatientSearch(patient.name);
                            setShowReceiptSuggestions(false);
                          }}
                          className="px-4 py-3 md:px-5 md:py-4 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-teal-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-all"
                        >
                          <p className="font-bold text-sm md:text-base text-slate-900">{patient.name}</p>
                          <p className="text-[11px] md:text-sm text-slate-500 mt-1">{patient.phone}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input type="hidden" name="patientId" value={selectedPatient} required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-[10px] md:text-xs font-extrabold uppercase tracking-widest mb-2 md:mb-4 text-slate-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-teal-500 rounded-full"></span>
                    Date *
                  </label>
                  <input
                    type="text"
                    name="date"
                    required
                    defaultValue={formatToDD_MM_YYYY(new Date())}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-4 py-3 md:px-5 md:py-4 bg-slate-50/50 backdrop-blur-sm border-2 border-slate-200 rounded-xl md:rounded-2xl focus:outline-none focus:ring-4 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all text-sm md:text-base font-medium placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-extrabold uppercase tracking-widest mb-2 md:mb-4 text-slate-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-teal-500 rounded-full"></span>
                    Service Types *
                  </label>
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-2 max-h-48 md:max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-teal-400 scrollbar-track-slate-100 p-2 border-2 border-slate-100 rounded-xl">
                    {dentalServices.map(service => (
                      <label key={service} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-slate-50 transition group">
                        <input
                          type="checkbox"
                          value={service}
                          checked={selectedServices.includes(service)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedServices(prev => [...prev, service]);
                            else setSelectedServices(prev => prev.filter(s => s !== service));
                          }}
                          className="w-3.5 h-3.5 md:w-4 md:h-4 accent-teal-500"
                        />
                        <span className="text-[11px] md:text-sm font-medium text-slate-700 group-hover:text-teal-600">{service}</span>
                      </label>
                    ))}
                  </div>
                  {selectedServices.map((service, idx) => (
                    <input key={service + idx} type="hidden" name="services" value={service} />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-[10px] md:text-xs font-extrabold uppercase tracking-widest mb-2 md:mb-4 text-slate-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-slate-400 rounded-full"></span>
                    Tooth (Optional)
                  </label>
                  <input
                    type="text"
                    name="tooth"
                    placeholder="e.g., #14, Upper Right"
                    className="w-full px-4 py-3 md:px-5 md:py-4 bg-slate-50/50 backdrop-blur-sm border-2 border-slate-200 rounded-xl md:rounded-2xl focus:outline-none focus:ring-4 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all text-sm md:text-base font-medium placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-extrabold uppercase tracking-widest mb-2 md:mb-4 text-slate-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-teal-500 rounded-full"></span>
                    Cost (₱) *
                  </label>
                  <input
                    type="number"
                    name="cost"
                    required
                    step="1"
                    placeholder="0"
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full px-4 py-3 md:px-5 md:py-4 bg-slate-50/50 backdrop-blur-sm border-2 border-slate-200 rounded-xl md:rounded-2xl focus:outline-none focus:ring-4 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all text-sm md:text-base font-medium placeholder:text-slate-400 no-spinners"
                  />
                </div>
              </div>

              {/* Payment Type Selection */}
              <div className="p-4 md:p-6 bg-gradient-to-br from-cyan-50 via-teal-50 to-blue-50 border-2 border-cyan-200/60 rounded-xl md:rounded-2xl backdrop-blur-sm shadow-inner">
                <label className="block text-[10px] md:text-xs font-extrabold uppercase tracking-widest mb-3 md:mb-5 text-slate-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-cyan-500 rounded-full"></span>
                  Payment Method *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <label className="flex items-center cursor-pointer p-3 md:p-4 bg-white/70 rounded-xl hover:bg-white transition-all border border-transparent hover:border-cyan-300">
                    <input
                      type="radio"
                      name="paymentType"
                      value="full"
                      checked={paymentType === 'full'}
                      onChange={(e) => setPaymentType(e.target.value as 'full' | 'installment')}
                      className="mr-3 md:mr-4 w-4 h-4 md:w-5 md:h-5 cursor-pointer accent-teal-500"
                    />
                    <span className="text-sm md:text-base font-bold text-slate-900">Full</span>
                  </label>
                  <label className="flex items-center cursor-pointer p-3 md:p-4 bg-white/70 rounded-xl hover:bg-white transition-all border border-transparent hover:border-cyan-300">
                    <input
                      type="radio"
                      name="paymentType"
                      value="installment"
                      checked={paymentType === 'installment'}
                      onChange={(e) => setPaymentType(e.target.value as 'full' | 'installment')}
                      className="mr-3 md:mr-4 w-4 h-4 md:w-5 md:h-5 cursor-pointer accent-teal-500"
                    />
                    <span className="text-sm md:text-base font-bold text-slate-900">Installment</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-[10px] md:text-xs font-extrabold uppercase tracking-widest mb-2 md:mb-4 text-slate-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full"></span>
                    Amount Paid (₱)
                  </label>
                  <input
                    type="number"
                    name="amountPaid"
                    step="0.01"
                    placeholder="0"
                    value={amountPaid === 0 ? '' : amountPaid}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full px-4 py-3 md:px-5 md:py-4 bg-slate-50/50 backdrop-blur-sm border-2 border-slate-200 rounded-xl md:rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-400/30 focus:border-emerald-400 transition-all text-sm md:text-base font-medium placeholder:text-slate-400 no-spinners"
                  />
                </div>
                {paymentType === 'installment' && (
                  <div>
                    <label className="block text-[10px] md:text-xs font-extrabold uppercase tracking-widest mb-2 md:mb-4 text-slate-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full"></span>
                      Installments
                    </label>
                    <select
                      name="numberOfInstallments"
                      value={numberOfInstallments}
                      onChange={(e) => setNumberOfInstallments(parseInt(e.target.value))}
                      className="w-full px-4 py-3 md:px-5 md:py-4 bg-slate-50/50 backdrop-blur-sm border-2 border-slate-200 rounded-xl md:rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-400/30 focus:border-blue-400 transition-all text-sm md:text-base font-medium"
                    >
                      <option value="2">2 months</option>
                      <option value="3">3 months</option>
                      <option value="4">4 months</option>
                      <option value="6">6 months</option>
                      <option value="12">1 year</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] md:text-xs font-extrabold uppercase tracking-widest mb-2 md:mb-4 text-slate-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-teal-500 rounded-full"></span>
                  Dentist *
                </label>
                <input
                  type="text"
                  name="dentist"
                  required
                  placeholder="Dr. Name"
                  className="w-full px-4 py-3 md:px-5 md:py-4 bg-slate-50/50 backdrop-blur-sm border-2 border-slate-200 rounded-xl md:rounded-2xl focus:outline-none focus:ring-4 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all text-sm md:text-base font-medium placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] md:text-xs font-extrabold uppercase tracking-widest mb-2 md:mb-4 text-slate-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-slate-400 rounded-full"></span>
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Observation notes"
                  className="w-full px-4 py-3 md:px-5 md:py-4 bg-slate-50/50 backdrop-blur-sm border-2 border-slate-200 rounded-xl md:rounded-2xl focus:outline-none focus:ring-4 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all resize-none text-sm md:text-base font-medium placeholder:text-slate-400"
                />
              </div>

              <div className="flex gap-2 md:gap-4 justify-end pt-4 md:pt-8 border-t-2 border-slate-200/60">
                {!isFromAppointment && (
                  <button
                    type="button"
                    onClick={() => setActiveForm(null)}
                    className="px-4 py-2 md:px-8 md:py-4 border-2 border-slate-200 rounded-lg md:rounded-2xl hover:bg-slate-50 transition-all font-bold text-[10px] md:text-base text-slate-900 duration-300 active:scale-95"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 md:px-10 md:py-4 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 text-white rounded-lg md:rounded-2xl hover:shadow-2xl hover:shadow-cyan-500/40 transition-all font-bold text-[10px] md:text-base duration-300 active:scale-95"
                >
                  Record Receipt
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Prescription Modal - Premium Design */}
      {activeForm === 'prescription' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-2 md:p-4">
          <div className="relative bg-white backdrop-blur-2xl rounded-2xl md:rounded-3xl p-4 md:p-10 max-w-4xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto overflow-x-hidden scrollbar-thin shadow-2xl border border-slate-200/60">
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl"></div>
            
            <div className="relative">
              <div className="flex justify-end mb-4 md:mb-6">
                <button onClick={() => setActiveForm(null)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full p-1.5 md:p-2 transition-all">
                  <X className="w-5 h-5 md:w-7 md:h-7" />
                </button>
              </div>
            <form onSubmit={handleCreatePrescription} className="space-y-6 md:space-y-8 relative">
              {/* Patient Search Bar - Premium Style */}
              <div className="mb-4 md:mb-8 p-4 md:p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-xl md:rounded-2xl border-2 border-emerald-200/60">
                <label className="block text-[10px] md:text-xs font-extrabold uppercase tracking-widest mb-2 md:mb-4 text-slate-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full"></span>
                  Search Patient *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search patient name..."
                    value={prescriptionPatientSearch}
                    onChange={(e) => {
                      setPrescriptionPatientSearch(e.target.value);
                      setShowPrescriptionSuggestions(true);
                    }}
                    onFocus={() => setShowPrescriptionSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowPrescriptionSuggestions(false), 200)}
                    className="w-full px-4 py-3 md:px-5 md:py-4 bg-white backdrop-blur-sm border-2 border-emerald-200 rounded-xl md:rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-400/30 focus:border-emerald-400 transition-all text-sm md:text-base font-medium placeholder:text-slate-400"
                  />
                  {prescriptionPatientSearch && showPrescriptionSuggestions && (
                    <div className="absolute z-10 w-full bg-white/98 backdrop-blur-xl border-2 border-emerald-200 rounded-xl md:rounded-2xl mt-2 max-h-56 overflow-y-auto scrollbar-thin shadow-2xl">
                      {patients
                        .filter(p => p.name.toLowerCase().includes(prescriptionPatientSearch.toLowerCase()))
                        .map(patient => (
                          <div
                            key={patient.id}
                            onMouseDown={() => {
                              setPrescriptionPatientId(String(patient.id));
                              setPrescriptionPatientSearch(patient.name);
                              setShowPrescriptionSuggestions(false);
                            }}
                            className="px-4 py-3 md:px-5 md:py-4 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-all font-medium text-sm md:text-base"
                          >
                            {patient.name}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Header Section */}
              <div className="text-center border-b-4 border-double border-gray-800 pb-2 md:pb-4 mb-4 md:mb-6">
                <h1 className="text-lg md:text-2xl font-bold text-gray-900">JOSEPH E. MAAÑO, D.M.D</h1>
                <p className="text-[10px] md:text-sm font-semibold text-gray-700 uppercase">General Dentistry / Orthodontics</p>
                <p className="text-[9px] md:text-sm text-gray-600">#29 Emilio Jacinto St. San Diego Zone 2, Tayabas City 4327</p>
                <p className="text-[9px] md:text-sm text-gray-600 mt-0.5">Tel # (042)7171156 • Cp # 09773651397</p>
              </div>

              {/* Patient Information Section */}
              <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-2 items-start md:items-center">
                  <div className="col-span-1 md:col-span-1 flex items-center gap-2">
                    <label className="text-[10px] md:text-sm font-semibold text-gray-900">NAME:</label>
                    <input
                      type="text"
                      value={prescriptionPatientId ? patients.find(p => String(p.id) === String(prescriptionPatientId))?.name || '' : ''}
                      readOnly
                      className="flex-1 border-b border-gray-400 focus:outline-none bg-transparent px-1 md:px-2 py-0.5 md:py-1 text-[11px] md:text-base font-bold"
                    />
                  </div>
                  <div className="hidden md:block md:col-span-5 border-b border-gray-400 h-px self-end mb-1"></div>
                  <div className="col-span-1 md:col-span-6 flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] md:text-sm font-semibold text-gray-900">AGE:</label>
                      <input
                        type="text"
                        value={prescriptionPatientId ? calculateAge(patients.find(p => String(p.id) === String(prescriptionPatientId))?.dateOfBirth || '') : ''}
                        readOnly
                        className="w-12 border-b border-gray-400 focus:outline-none bg-transparent px-1 md:px-2 py-0.5 md:py-1 text-[11px] md:text-base font-bold"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] md:text-sm font-semibold text-gray-900">SEX:</label>
                      <input
                        type="text"
                        value={prescriptionPatientId ? patients.find(p => String(p.id) === String(prescriptionPatientId))?.sex || '' : ''}
                        readOnly
                        className="w-12 border-b border-gray-400 focus:outline-none bg-transparent px-1 md:px-2 py-0.5 md:py-1 text-[11px] md:text-base font-bold"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start md:items-center">
                  <div className="col-span-1 md:col-span-8 flex items-center gap-2">
                    <label className="text-[10px] md:text-sm font-semibold text-gray-900">ADDRESS:</label>
                    <input
                      type="text"
                      value={prescriptionPatientId ? patients.find(p => String(p.id) === String(prescriptionPatientId))?.address || '' : ''}
                      readOnly
                      className="flex-1 border-b border-gray-400 focus:outline-none bg-transparent px-1 md:px-2 py-0.5 md:py-1 text-[10px] md:text-sm"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-4 flex items-center gap-2">
                    <label className="text-[10px] md:text-sm font-semibold text-gray-900">DATE:</label>
                    <input
                      type="text"
                      name="date"
                      defaultValue={formatToDD_MM_YYYY(new Date())}
                      className="flex-1 border-b border-gray-400 focus:outline-none bg-transparent px-1 md:px-2 py-0.5 md:py-1 text-[11px] md:text-base"
                    />
                  </div>
                </div>
              </div>

              {/* RX Section */}
              <div className="mb-2 md:mb-4">
                <h2 className="text-4xl md:text-6xl font-serif text-gray-800 leading-none">℞</h2>
              </div>

              {/* Medicine Options */}
              <div className="space-y-4 md:space-y-6 ml-2 md:ml-8">
                {/* Mefenamic Acid */}
                <div className="space-y-2 border-l-2 border-emerald-100 pl-3 md:pl-4">
                  <div className="flex flex-wrap items-center gap-2 md:gap-4">
                    <input
                      type="checkbox"
                      id="med_mefenamic"
                      name="med_mefenamic"
                      className="w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-gray-400 accent-emerald-500"
                    />
                    <label htmlFor="med_mefenamic" className="text-sm md:text-base font-bold text-gray-900">
                      Mefenamic Acid
                    </label>
                    <div className="flex items-center gap-3 md:gap-4 ml-2 md:ml-8">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="mefenamic_dosage" value="500mg" className="w-3.5 h-3.5 md:w-4 md:h-4 accent-emerald-500" />
                        <span className="text-[11px] md:text-sm font-medium">500mg</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="mefenamic_dosage" value="250mg" className="w-3.5 h-3.5 md:w-4 md:h-4 accent-emerald-500" />
                        <span className="text-[11px] md:text-sm font-medium">250mg</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] md:text-sm font-bold text-gray-700">#</span>
                      <input
                        type="number"
                        name="mefenamic_quantity"
                        placeholder="Qty"
                        className="w-16 md:w-20 border-b border-gray-400 focus:outline-none bg-transparent px-1 md:px-2 py-0.5 md:py-1 text-[11px] md:text-base font-bold"
                      />
                    </div>
                    <div className="flex-1 flex items-baseline gap-2">
                      <span className="text-[11px] md:text-sm italic font-bold text-gray-700">Sig.</span>
                      <input
                        type="text"
                        name="mefenamic_sig"
                        defaultValue="Take 1 cap 3x a day"
                        className="flex-1 border-b border-gray-400 focus:outline-none bg-transparent px-1 md:px-2 py-0.5 md:py-1 text-[11px] md:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Amoxicilin */}
                <div className="space-y-2 border-l-2 border-teal-100 pl-3 md:pl-4">
                  <div className="flex flex-wrap items-center gap-2 md:gap-4">
                    <input
                      type="checkbox"
                      id="med_amoxicillin"
                      name="med_amoxicillin"
                      className="w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-gray-400 accent-teal-500"
                    />
                    <label htmlFor="med_amoxicillin" className="text-sm md:text-base font-bold text-gray-900">
                      Amoxicilin
                    </label>
                    <div className="flex items-center gap-3 md:gap-4 ml-2 md:ml-8">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="amoxicillin_dosage" value="500mg" className="w-3.5 h-3.5 md:w-4 md:h-4 accent-teal-500" />
                        <span className="text-[11px] md:text-sm font-medium">500mg</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="amoxicillin_dosage" value="250mg" className="w-3.5 h-3.5 md:w-4 md:h-4 accent-teal-500" />
                        <span className="text-[11px] md:text-sm font-medium">250mg</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] md:text-sm font-bold text-gray-700">#</span>
                      <input
                        type="number"
                        name="amoxicillin_quantity"
                        placeholder="Qty"
                        className="w-16 md:w-20 border-b border-gray-400 focus:outline-none bg-transparent px-1 md:px-2 py-0.5 md:py-1 text-[11px] md:text-base font-bold"
                      />
                    </div>
                    <div className="flex-1 flex items-baseline gap-2">
                      <span className="text-[11px] md:text-sm italic font-bold text-gray-700">Sig.</span>
                      <input
                        type="text"
                        name="amoxicillin_sig"
                        defaultValue="Take 1 cap 3x a day"
                        className="flex-1 border-b border-gray-400 focus:outline-none bg-transparent px-1 md:px-2 py-0.5 md:py-1 text-[11px] md:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Tranexamic Acid */}
                <div className="space-y-2 border-l-2 border-cyan-100 pl-3 md:pl-4">
                  <div className="flex flex-wrap items-center gap-2 md:gap-4">
                    <input
                      type="checkbox"
                      id="med_mefenamic_2"
                      name="med_mefenamic_2"
                      className="w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-gray-400 accent-cyan-500"
                    />
                    <label htmlFor="med_mefenamic_2" className="text-sm md:text-base font-bold text-gray-900">
                      Tranexamic Acid
                    </label>
                    <div className="flex items-center gap-3 md:gap-4 ml-2 md:ml-8">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="mefenamic2_dosage" value="500mg" className="w-3.5 h-3.5 md:w-4 md:h-4 accent-cyan-500" />
                        <span className="text-[11px] md:text-sm font-medium">500mg</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="mefenamic2_dosage" value="250mg" className="w-3.5 h-3.5 md:w-4 md:h-4 accent-cyan-500" />
                        <span className="text-[11px] md:text-sm font-medium">250mg</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] md:text-sm font-bold text-gray-700">#</span>
                      <input
                        type="number"
                        name="mefenamic2_quantity"
                        placeholder="Qty"
                        className="w-16 md:w-20 border-b border-gray-400 focus:outline-none bg-transparent px-1 md:px-2 py-0.5 md:py-1 text-[11px] md:text-base font-bold"
                      />
                    </div>
                    <div className="flex-1 flex items-baseline gap-2">
                      <span className="text-[11px] md:text-sm italic font-bold text-gray-700">Sig.</span>
                      <input
                        type="text"
                        name="mefenamic2_sig"
                        defaultValue="Take 1 cap 3x a day"
                        className="flex-1 border-b border-gray-400 focus:outline-none bg-transparent px-1 md:px-2 py-0.5 md:py-1 text-[11px] md:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Doctor Signature Section */}
              <div className="flex justify-end mt-8 md:mt-12 pt-4 md:pt-8 border-t-2 border-gray-300">
                <div className="text-center space-y-1.5 md:space-y-2">
                  <h3 className="text-sm md:text-base font-bold text-gray-900">JOSEPH E. MAAÑO, D.M.D</h3>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[10px] md:text-sm font-semibold text-gray-700">LIC NO.</span>
                    <input
                      type="text"
                      name="license_number"
                      defaultValue="0031129"
                      className="w-24 md:w-32 border-b border-gray-400 focus:outline-none bg-transparent px-1 md:px-2 py-0.5 md:py-1 text-[10px] md:text-sm text-center font-bold"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[10px] md:text-sm font-semibold text-gray-700">PTR.</span>
                    <input
                      type="text"
                      name="ptr_number"
                      className="w-24 md:w-32 border-b border-gray-400 focus:outline-none bg-transparent px-1 md:px-2 py-0.5 md:py-1 text-[10px] md:text-sm text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Hidden fields for form submission */}
              <input type="hidden" name="dentist" value="Joseph E. Maaño" />
              <input type="hidden" name="notes" value="" />

              <div className="flex gap-2 justify-end pt-4 md:pt-6 border-t border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setActiveForm(null)}
                  className="px-4 py-2 border-2 border-slate-200 rounded-lg md:rounded-xl hover:bg-slate-50 transition-all font-bold text-[10px] md:text-sm text-slate-900 duration-300 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-lg md:rounded-xl hover:shadow-xl hover:shadow-emerald-500/40 transition-all font-bold text-[10px] md:text-sm duration-300 active:scale-95"
                >
                  Create Prescription
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* View Prescription Modal */}
      {viewingPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 md:p-4 p-2">
          <div className="bg-white rounded-xl md:p-8 p-4 max-w-2xl w-full max-h-[95vh] overflow-y-auto overflow-x-hidden scrollbar-thin shadow-2xl">
            <div className="flex justify-between items-center md:mb-6 mb-3 md:pb-4 pb-2 border-b-2 border-gray-300">
              <h2 className="md:text-3xl text-xl font-bold text-gray-900">Prescription</h2>
              <button onClick={() => setViewingPrescription(null)} className="text-gray-500 hover:text-gray-700">
                <X className="md:w-6 md:h-6 w-5 h-5" />
              </button>
            </div>

            <div className="md:space-y-6 space-y-4">
              <div className="text-center border-b-4 border-double border-gray-800 md:pb-4 pb-2">
                <h1 className="md:text-2xl text-lg font-bold text-gray-900">JOSEPH E. MAAÑO, D.M.D</h1>
                <p className="md:text-sm text-[10px] font-semibold text-gray-700 uppercase">GENERAL DENTISTRY / ORTHODONTICS</p>
                <p className="md:text-sm text-[10px] text-gray-600">#29 Emilio Jacinto St. San Diego Zone 2</p>
                <p className="md:text-sm text-[10px] text-gray-600">Tayabas City 4327</p>
                <p className="md:text-sm text-[10px] text-gray-600 mt-1">Tel # (042)7171156 &nbsp;&nbsp; Cp # 09773651397</p>
              </div>

              {(() => {
                const patient = patients.find(p => String(p.id) === String(viewingPrescription.patientId));
                const age = patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : '';
                return (
                  <div className="md:space-y-3 space-y-2">
                    <div className="grid grid-cols-12 gap-1 items-center">
                      <label className="col-span-2 md:col-span-1 md:text-sm text-[10px] font-semibold text-gray-900">NAME:</label>
                      <div className="col-span-10 md:col-span-5 border-b border-gray-400 px-1 py-0.5 md:text-sm text-[10px] text-gray-900 truncate">
                        {patient?.name || ''}
                      </div>
                      <label className="col-span-2 md:col-span-1 md:text-sm text-[10px] font-semibold text-gray-900 md:text-right">AGE:</label>
                      <div className="col-span-4 md:col-span-2 border-b border-gray-400 px-1 py-0.5 md:text-sm text-[10px] text-gray-900">
                        {age}
                      </div>
                      <label className="col-span-2 md:col-span-1 md:text-sm text-[10px] font-semibold text-gray-900 md:text-right">SEX:</label>
                      <div className="col-span-4 md:col-span-2 border-b border-gray-400 px-1 py-0.5 md:text-sm text-[10px] text-gray-900">
                        {patient?.sex || ''}
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-1 items-center">
                      <label className="col-span-2 md:text-sm text-[10px] font-semibold text-gray-900">ADDRESS:</label>
                      <div className="col-span-10 md:col-span-6 border-b border-gray-400 px-1 py-0.5 md:text-sm text-[10px] text-gray-900 truncate">
                        {patient?.address || ''}
                      </div>
                      <label className="col-span-2 md:col-span-1 md:text-sm text-[10px] font-semibold text-gray-900 md:text-right">DATE:</label>
                      <div className="col-span-10 md:col-span-3 border-b border-gray-400 px-1 py-0.5 md:text-sm text-[10px] text-gray-900">
                        {formatToDD_MM_YYYY(viewingPrescription.date)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div>
                <h2 className="md:text-6xl text-4xl font-serif text-gray-800">℞</h2>
              </div>

              <div className="md:space-y-6 space-y-4 md:ml-8 ml-4">
                {(() => {
                  const meds = viewingPrescription.medications || [];
                  const used = new Set<number>();
                  const pickByName = (name: string) => {
                    const index = meds.findIndex((m, i) => !used.has(i) && m.name === name);
                    if (index >= 0) {
                      used.add(index);
                      return meds[index];
                    }
                    return undefined;
                  };
                  const pickBySlot = (slot: 'mefenamic1' | 'amoxicilin' | 'mefenamic2', name: string) => {
                    const bySlot = meds.find(m => m.slot === slot);
                    if (bySlot) return bySlot;
                    return pickByName(name);
                  };

                  const rows = [
                    { key: 'mefenamic1' as const, label: 'Mefenamic Acid', med: pickBySlot('mefenamic1', 'Mefenamic Acid') },
                    { key: 'amoxicilin' as const, label: 'Amoxicilin', med: pickBySlot('amoxicilin', 'Amoxicilin') },
                    { key: 'mefenamic2' as const, label: 'Tranexamic Acid', med: pickBySlot('mefenamic2', 'Tranexamic Acid') },
                  ];

                  return rows.map((row, index) => {
                    const med = row.med;
                    const quantityMatch = med?.duration?.match(/Quantity:\s*(\d+)/);
                    const quantity = quantityMatch?.[1] || '';
                    const isSelected = Boolean(med && (med.dosage || quantity || med.frequency));
                    return (
                      <div key={`${row.key}-${index}`} className="md:space-y-2 space-y-1">
                        <div className="flex items-center gap-2 md:gap-4">
                          <span className="md:text-base text-xs font-semibold text-gray-900">
                            {isSelected ? '●' : '○'} {row.label}
                          </span>
                          <div className="flex items-center gap-2 md:gap-4 md:ml-8 ml-2">
                            <span className="md:text-sm text-[10px]">{med?.dosage === '500mg' ? '●' : '○'} 500mg</span>
                            <span className="md:text-sm text-[10px]">{med?.dosage === '250mg' ? '●' : '○'} 250mg</span>
                          </div>
                        </div>
                        <div className="md:ml-12 ml-6 flex items-center gap-1">
                          <span className="md:text-sm text-[10px] text-gray-700">#</span>
                          <span className="md:w-20 w-12 border-b border-gray-400 px-1 py-0.5 md:text-sm text-[10px] text-gray-900">{quantity}</span>
                        </div>
                        <div className="md:ml-12 ml-6">
                          <span className="md:text-sm text-[10px] italic text-gray-700">Sig. </span>
                          <span className="md:text-sm text-[10px] text-gray-900 border-b border-gray-400 inline-block md:min-w-[260px] min-w-[150px] px-1 py-0.5">
                            {med?.frequency || ''}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="flex justify-end md:mt-10 mt-6 md:pt-6 pt-4 border-t-2 border-gray-300">
                <div className="text-center space-y-1">
                  <h3 className="md:text-base text-xs font-bold text-gray-900">JOSEPH E. MAAÑO, D.M.D</h3>
                  <div className="flex items-center gap-1">
                    <span className="md:text-sm text-[10px] font-semibold text-gray-700">LIC NO.</span>
                    <span className="md:w-32 w-24 border-b border-gray-400 px-1 py-0.5 md:text-sm text-[10px] text-center text-gray-900">
                      {viewingPrescription.licenseNumber || ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="md:text-sm text-[10px] font-semibold text-gray-700">PTR.</span>
                    <span className="md:w-32 w-24 border-b border-gray-400 px-1 py-0.5 md:text-sm text-[10px] text-center text-gray-900">
                      {viewingPrescription.ptrNumber || ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex md:gap-3 gap-2 justify-end md:pt-6 pt-4 border-t-2 border-gray-200">
                <button
                  onClick={() => printPrescription(viewingPrescription)}
                  className="md:px-6 md:py-3 px-3 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all flex items-center gap-1 md:gap-2 md:text-base text-xs font-semibold"
                >
                  <Printer className="md:w-5 md:h-5 w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => setViewingPrescription(null)}
                  className="md:px-6 md:py-3 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors md:text-base text-xs font-semibold text-gray-900"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Receipt Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 md:p-4 p-2">
          <div className="bg-white rounded-xl md:p-8 p-4 max-w-2xl w-full max-h-[95vh] overflow-y-auto overflow-x-hidden scrollbar-thin shadow-2xl">
            <div className="flex justify-between items-center md:mb-6 mb-3 md:pb-4 pb-2 border-b-2 border-gray-300">
              <h2 className="md:text-3xl text-xl font-bold text-gray-900">Official Receipt</h2>
              <button onClick={() => setViewingReceipt(null)} className="text-gray-500 hover:text-gray-700">
                <X className="md:w-6 md:h-6 w-5 h-5" />
              </button>
            </div>

            <div className="md:space-y-6 space-y-4">
              <div className="grid grid-cols-2 gap-2 md:gap-4 bg-gray-50 md:p-4 p-2 rounded-lg">
                <div>
                  <p className="md:text-sm text-[10px] text-gray-700 font-semibold mb-1">Receipt No.</p>
                  <p className="md:text-base text-xs text-gray-900 font-medium">{viewingReceipt.id}</p>
                </div>
                <div>
                  <p className="md:text-sm text-[10px] text-gray-700 font-semibold mb-1">Date</p>
                  <p className="md:text-base text-xs text-gray-900 font-medium">{formatToDD_MM_YYYY(viewingReceipt.date)}</p>
                </div>
              </div>

              <div className="md:pt-4 pt-2 border-t-2 border-gray-200">
                <h3 className="md:text-lg text-sm font-bold text-gray-900 md:mb-3 mb-2">Patient Information</h3>
                {(() => {
                  const patient = patients.find(p => String(p.id) === String(viewingReceipt.patientId));
                  return patient ? (
                    <div className="md:space-y-3 space-y-1.5 bg-gray-50 md:p-4 p-2 rounded-lg">
                      <p className="md:text-base text-xs text-gray-900"><strong className="text-gray-700">Name:</strong> {patient.name}</p>
                      <p className="md:text-base text-xs text-gray-900"><strong className="text-gray-700">Age:</strong> {calculateAge(patient.dateOfBirth)}</p>
                      <p className="md:text-base text-xs text-gray-900"><strong className="text-gray-700">Sex:</strong> {patient.sex}</p>
                      <p className="md:text-base text-xs text-gray-900"><strong className="text-gray-700">Address:</strong> {patient.address}</p>
                      <p className="md:text-base text-xs text-gray-900"><strong className="text-gray-700">Phone:</strong> {patient.phone}</p>
                      <p className="md:text-base text-xs text-gray-900"><strong className="text-gray-700">Email:</strong> {patient.email}</p>
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="md:pt-4 pt-2 border-t-2 border-gray-200">
                <h3 className="md:text-lg text-sm font-bold text-gray-900 md:mb-3 mb-2">Service Details</h3>
                <div className="md:space-y-3 space-y-1.5 bg-blue-50 md:p-4 p-2 rounded-lg">
                  <p className="md:text-base text-xs text-gray-900"><strong className="text-gray-700">Service:</strong> {viewingReceipt.treatment}</p>
                  {viewingReceipt.tooth && <p className="md:text-base text-xs text-gray-900"><strong className="text-gray-700">Tooth Number:</strong> {viewingReceipt.tooth}</p>}
                  <p className="md:text-base text-xs text-gray-900"><strong className="text-gray-700">Performed by:</strong> Dr. {viewingReceipt.dentist}</p>
                </div>
              </div>

              <div className="md:pt-4 pt-2 border-t-2 border-gray-200">
                <h3 className="md:text-lg text-sm font-bold text-gray-900 md:mb-4 mb-2">Amount</h3>
                <div className="md:space-y-3 space-y-2 bg-gradient-to-br from-gray-50 to-yellow-50 md:p-5 p-3 rounded-lg border border-yellow-200">
                  <div className="flex justify-between md:text-base text-xs text-gray-900">
                    <span className="font-semibold">Total Billed:</span>
                    <span className="font-bold">₱{Number(viewingReceipt.cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between md:text-base text-xs text-green-700 font-semibold">
                    <span>Total Paid:</span>
                    <span>₱{Number(viewingReceipt.amountPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-gray-300 md:pt-3 pt-2 font-bold md:text-lg text-sm">
                    <span className="text-gray-900">Balance:</span>
                    <span className={(viewingReceipt.remainingBalance !== undefined ? Number(viewingReceipt.remainingBalance) : Number(viewingReceipt.cost || 0)) > 0 ? 'text-red-600' : 'text-green-600'}>₱{Number(viewingReceipt.remainingBalance !== undefined ? viewingReceipt.remainingBalance : (viewingReceipt.cost || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {viewingReceipt.paymentType && (
                <div className="md:pt-4 pt-2 border-t-2 border-gray-200">
                  <h3 className="md:text-lg text-sm font-bold text-gray-900 md:mb-3 mb-2">Payment Info</h3>
                  <div className="md:space-y-2 space-y-1 bg-purple-50 md:p-4 p-2 rounded-lg">
                    <p className="md:text-base text-xs text-gray-900"><strong className="text-gray-700">Type:</strong> {viewingReceipt.paymentType === 'full' ? 'Full Payment' : 'Installment Plan'}</p>
                    {viewingReceipt.paymentType === 'installment' && viewingReceipt.installmentPlan && (
                      <>
                        <p className="md:text-base text-xs text-gray-900"><strong className="text-gray-700">Installments:</strong> {viewingReceipt.installmentPlan.installments}</p>
                        <p className="md:text-base text-xs text-gray-900"><strong className="text-gray-700">Per Installment:</strong> ₱{Math.round(viewingReceipt.installmentPlan.amountPerInstallment)}</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {viewingReceipt.notes && (
                <div className="md:pt-4 pt-2 border-t-2 border-gray-200">
                  <h3 className="md:text-lg text-sm font-bold text-gray-900 md:mb-3 mb-2">Notes</h3>
                  <p className="md:text-base text-xs text-gray-800 leading-relaxed">{viewingReceipt.notes}</p>
                </div>
              )}

              <div className="flex md:gap-3 gap-2 justify-end md:pt-6 pt-4 border-t-2 border-gray-200">
                <button
                  onClick={() => printReceipt(viewingReceipt)}
                  className="md:px-6 md:py-3 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all flex items-center gap-1 md:gap-2 md:text-base text-xs font-semibold"
                >
                  <Printer className="md:w-5 md:h-5 w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => setViewingReceipt(null)}
                  className="md:px-6 md:py-3 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors md:text-base text-xs font-semibold text-gray-900"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Prompt Modal */}
      {showPrescriptionPrompt && lastCreatedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl border border-gray-200">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Create Prescription?</h2>
            <p className="text-gray-700 mb-8 leading-relaxed">
              Would you like to create a prescription for <strong>{patients.find(p => String(p.id) === String(lastCreatedService.patientId))?.name || 'this patient'}</strong>?
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => {
                  setShowPrescriptionPrompt(false);
                  setLastCreatedService(null);
                }}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-gray-900"
              >
                No
              </button>
              <button
                onClick={() => {
                  setShowPrescriptionPrompt(false);
                  setSelectedPatient(`${lastCreatedService.patientId}`);
                  setActiveForm('prescription');
                }}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all font-semibold"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
