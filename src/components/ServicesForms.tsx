import { useState, useEffect } from 'react';
import { Patient, TreatmentRecord, Payment } from '../App';
import { FileText, Printer, Download, Plus, X, CreditCard } from 'lucide-react';
import { treatmentRecordAPI, paymentAPI, prescriptionAPI } from '../api';
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
    appointmentType: string;
  };
  onServiceCreated?: (patientId: string, service: TreatmentRecord) => void;
  onDataChanged?: () => Promise<void>;
};

type ServiceType = 'Extraction' | 'Pasta' | 'Braces' | 'Cleaning' | 'Pustiso/Dentures';

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
  const [activeForm, setActiveForm] = useState<'service' | 'prescription' | 'receipt' | null>(prefilledAppointment ? 'service' : null);
  const [selectedService, setSelectedService] = useState<ServiceType>(() => {
    // Try to match appointment type to service type
    if (prefilledAppointment) {
      const appointmentType = prefilledAppointment.appointmentType.toLowerCase();
      if (appointmentType.includes('extraction')) return 'Extraction';
      if (appointmentType.includes('cleaning')) return 'Cleaning';
      if (appointmentType.includes('braces')) return 'Braces';
      if (appointmentType.includes('root')) return 'Pasta';
      if (appointmentType.includes('denture')) return 'Pustiso/Dentures';
    }
    return 'Cleaning';
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

  const services: ServiceType[] = ['Extraction', 'Pasta', 'Braces', 'Cleaning', 'Pustiso/Dentures'];

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
      const service = formData.get('service') as string;
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

      const newRecordData = {
        patientId,
        date,
        description: service,
        treatment: service,
        tooth: formData.get('tooth') as string || undefined,
        notes: formData.get('notes') as string,
        cost: totalCost,
        dentist,
        paymentType: type,
        amountPaid: paid,
        remainingBalance: totalCost - paid,
        installmentPlan,
      };

      // Save to backend
      const savedRecord = await treatmentRecordAPI.create(newRecordData);
      
      // Also create a payment record if there's an initial payment
      if (paid > 0) {
        await paymentAPI.create({
          patientId,
          treatmentRecordId: savedRecord.id,
          amount: paid,
          paymentDate: date,
          paymentMethod: 'cash', // Default to cash for now
          status: 'paid',
          notes: `Initial payment for ${service}`,
          recordedBy: dentist
        });
      }

      // Update local state immediately to show the receipt
      setTreatmentRecords([...treatmentRecords, savedRecord]);
      
      setLastCreatedService(savedRecord);
      setPaymentType('full');
      setAmountPaid(0);
      setNumberOfInstallments(3);
      setSelectedPatient('');
      setPatientSearch('');
      
      toast.success('Service record saved successfully');
      
      // Refresh all data to update balances
      if (onDataChanged) {
        await onDataChanged();
      }
      
      // If opened from appointment, close immediately after save
      if (isFromAppointment) {
        setActiveForm(null);
        setIsFromAppointment(false);
        return;
      }
      
      // Show prescription prompt for regular service form
      setShowPrescriptionPrompt(true);
      
      // Call callback if provided
      if (onServiceCreated) {
        onServiceCreated(patientId, savedRecord);
      }
    } catch (error) {
      console.error('Failed to save service:', error);
      toast.error('Failed to save service record');
    }
  };

  const handleCreatePrescription = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const patientId = prescriptionPatientId || selectedPatient;
      const patient = patients.find(p => String(p.id) === String(patientId));

      if (!patientId || !patient) {
        toast.error('Please select a patient');
        return;
      }

      const medications = [];
      
      // Check each medicine
      if (formData.get('med_mefenamic') === 'on') {
        const dosage = formData.get('mefenamic_dosage') as string || '';
        const quantity = formData.get('mefenamic_quantity') as string || '';
        const sig = formData.get('mefenamic_sig') as string || 'Take 1 cap 3x a day';
        
        if (quantity) {
          medications.push({
            name: 'MEFENAMIC Acid',
            dosage: dosage,
            frequency: sig,
            duration: `Quantity: ${quantity}`,
            slot: 'mefenamic1' as const,
          });
        }
      }
      
      if (formData.get('med_amoxicillin') === 'on') {
        const dosage = formData.get('amoxicillin_dosage') as string || '';
        const quantity = formData.get('amoxicillin_quantity') as string || '';
        const sig = formData.get('amoxicillin_sig') as string || 'Take 1 cap 3x a day';
        
        if (quantity) {
          medications.push({
            name: 'AMOXICILIN',
            dosage: dosage,
            frequency: sig,
            duration: `Quantity: ${quantity}`,
            slot: 'amoxicilin' as const,
          });
        }
      }
      
      if (formData.get('med_mefenamic_2') === 'on') {
        const dosage = formData.get('mefenamic2_dosage') as string || '';
        const quantity = formData.get('mefenamic2_quantity') as string || '';
        const sig = formData.get('mefenamic2_sig') as string || 'Take 1 cap 3x a day';
        
        if (quantity) {
          medications.push({
            name: 'MEFENAMIC Acid',
            dosage: dosage,
            frequency: sig,
            duration: `Quantity: ${quantity}`,
            slot: 'mefenamic2' as const,
          });
        }
      }

      if (medications.length === 0) {
        toast.error('Please select at least one medication and specify quantity');
        return;
      }

      const prescriptionData = {
        patientId,
        patientName: patient?.name || '',
        date: formData.get('date') as string,
        medications,
        dentist: formData.get('dentist') as string,
        notes: formData.get('notes') as string,
        licenseNumber: formData.get('license_number') as string,
        ptrNumber: formData.get('ptr_number') as string,
      };

      // Save to backend
      const savedPrescription = await prescriptionAPI.create(prescriptionData);
      
      const newPrescription: Prescription = {
        id: savedPrescription.id.toString(),
        patientId,
        patientName: patient?.name || '',
        date: formData.get('date') as string,
        medications,
        dentist: formData.get('dentist') as string,
        notes: formData.get('notes') as string,
        licenseNumber: formData.get('license_number') as string,
        ptrNumber: formData.get('ptr_number') as string,
      };

      setPrescriptions([...prescriptions, newPrescription]);
      setViewingPrescription(newPrescription);
      setActiveForm(null);
      setPrescriptionPatientSearch('');
      setPrescriptionPatientId('');
      
      toast.success('Prescription created and saved successfully');
      
      // Reload prescriptions to show new one
      try {
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
    <div className="p-8">
      <div className="flex justify-end gap-3 mb-8">
        <button
          onClick={() => setActiveForm('service')}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all flex items-center gap-2 font-semibold"
        >
          <Plus className="w-5 h-5" />
          New Receipt
        </button>
        <button
          onClick={() => setActiveForm('prescription')}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all flex items-center gap-2 font-semibold"
        >
          <FileText className="w-5 h-5" />
          Create Prescription
        </button>
      </div>

      {/* Recent Receipts */}
      <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 mb-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Recent Receipts</h2>
        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hover">
          {treatmentRecords.slice(-5).reverse().map((record) => {
            const patient = patients.find(p => String(p.id) === String(record.patientId));
            return (
              <div key={record.id} className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-gray-900">{patient?.name}</p>
                    <p className="text-sm text-gray-700 mt-1">{record.treatment} {record.tooth ? `- Tooth ${record.tooth}` : ''}</p>
                    <p className="text-sm text-gray-500 mt-1">{formatToDD_MM_YYYY(record.date)} • Dr. {record.dentist}</p>
                    <div className="mt-4 flex gap-4 text-sm">
                      <span className="font-bold text-lg text-gray-900">₱{Number(record.cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      {record.paymentType && (
                        <>
                          <span className={`px-3 py-1 rounded-full font-medium ${record.paymentType === 'full' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                            {record.paymentType === 'full' ? 'Full Payment' : 'Installment'}
                          </span>
                          {record.amountPaid !== undefined && record.amountPaid > 0 && (
                            <span className="text-gray-700 font-medium">Paid: ₱{Number(record.amountPaid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          )}
                          {record.remainingBalance !== undefined && record.remainingBalance > 0 && (
                            <span className="text-orange-600 font-bold">Balance: ₱{Number(record.remainingBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setViewingReceipt(record);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-md transition-all flex items-center gap-2 text-sm font-semibold"
                    >
                      <CreditCard className="w-4 h-4" />
                      View Receipt
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {treatmentRecords.length === 0 && (
            <p className="text-gray-500 text-center py-8">No receipts recorded yet</p>
          )}
        </div>
      </div>

      {/* Recent Prescriptions */}
      <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 mb-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Recent Prescriptions</h2>
        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hover">
          {prescriptions.slice(-5).reverse().map((prescription) => (
            <div key={prescription.id} className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-gradient-to-br from-white to-green-50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{prescription.patientName}</p>
                  <p className="text-sm text-gray-700 mt-1">{prescription.medications.length} medication(s) prescribed</p>
                  <p className="text-sm text-gray-500 mt-1">{formatToDD_MM_YYYY(prescription.date)} • Dr. {prescription.dentist}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingPrescription(prescription)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:shadow-md transition-all flex items-center gap-2 text-sm font-semibold"
                  >
                    <FileText className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => printPrescription(prescription)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 hover:shadow-md transition-all flex items-center gap-2 text-sm font-semibold"
                    title="Print Prescription"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {prescriptions.length === 0 && (
            <p className="text-gray-500 text-center py-8">No prescriptions created yet</p>
          )}
        </div>
      </div>

      {/* Add Receipt Modal */}
      {activeForm === 'service' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hover shadow-2xl">
            <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
              <h2 className="text-3xl font-bold text-gray-900">Record Receipt</h2>
              {!isFromAppointment && (
                <button onClick={() => setActiveForm(null)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>
            <form onSubmit={handleCreateService} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">Patient *</label>
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
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${isFromAppointment ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  />
                  {patientSearch && showReceiptSuggestions && !isFromAppointment && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-64 scrollbar-hover">
                      {patients.filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase())).map(patient => (
                        <div
                          key={patient.id}
                          onMouseDown={() => {
                            setSelectedPatient(String(patient.id));
                            setPatientSearch(patient.name);
                            setShowReceiptSuggestions(false);
                          }}
                          className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                        >
                          <p className="font-semibold text-gray-900">{patient.name}</p>
                          <p className="text-sm text-gray-500">{patient.phone}</p>
                        </div>
                      ))}
                      {patients.filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase())).length === 0 && (
                        <div className="px-4 py-3 text-gray-500 text-center">No patients found</div>
                      )}
                    </div>
                  )}
                </div>
                <input
                  type="hidden"
                  name="patientId"
                  value={selectedPatient}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900">Date *</label>
                  <input
                    type="text"
                    name="date"
                    required
                    defaultValue={formatToDD_MM_YYYY(new Date())}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900">Service Type *</label>
                  <select
                    name="service"
                    required
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value as ServiceType)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    {services.map(service => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">Tooth (Optional)</label>
                <input
                  type="text"
                  name="tooth"
                  placeholder="e.g., #14, Upper Right"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">Cost (₱) *</label>
                <input
                  type="number"
                  name="cost"
                  required
                  step="1"
                  placeholder="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Payment Type Selection */}
              <div className="p-5 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg">
                <label className="block text-sm font-bold mb-4 text-gray-900">Payment Method *</label>
                <div className="space-y-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="paymentType"
                      value="full"
                      checked={paymentType === 'full'}
                      onChange={(e) => setPaymentType(e.target.value as 'full' | 'installment')}
                      className="mr-3 w-5 h-5 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-900">Full Payment</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="paymentType"
                      value="installment"
                      checked={paymentType === 'installment'}
                      onChange={(e) => setPaymentType(e.target.value as 'full' | 'installment')}
                      className="mr-3 w-5 h-5 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-900">Installment Plan</span>
                  </label>
                </div>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">Amount Paid (₱)</label>
                <input
                  type="number"
                  name="amountPaid"
                  step="0.01"
                  placeholder="0"
                  value={amountPaid === 0 ? '' : amountPaid}
                  onChange={(e) => {
                    const value = e.target.value;
                    const parsed = parseFloat(value) || 0;
                    setAmountPaid(parsed);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-gray-500 mt-2 font-medium">Leave empty or 0 if no payment yet</p>
              </div>

              {/* Number of Installments */}
              {paymentType === 'installment' && (
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900">Number of Installments</label>
                  <select
                    name="numberOfInstallments"
                    value={numberOfInstallments}
                    onChange={(e) => setNumberOfInstallments(parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="2">2 months</option>
                    <option value="3">3 months</option>
                    <option value="4">4 months</option>
                    <option value="6">6 months</option>
                    <option value="12">12 months (1 year)</option>
                    <option value="24">24 months (2 years)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">Dentist *</label>
                <input
                  type="text"
                  name="dentist"
                  required
                  placeholder="Dr. Name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Receipt details and observations"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {selectedService === 'Extraction' && (
                <div className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-300 rounded-lg">
                  <p className="text-sm text-yellow-900 font-medium">
                    💊 After recording this extraction, you will be prompted to create a prescription for the patient.
                  </p>
                </div>
              )}

              {selectedService === 'Braces' && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg">
                  <p className="text-sm text-blue-900 font-medium">
                    📋 For braces, you may need to create a referral form for x-ray or if referring to another dentist.
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-6 border-t-2 border-gray-200">
                {!isFromAppointment && (
                  <button
                    type="button"
                    onClick={() => setActiveForm(null)}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-gray-900"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all font-semibold"
                >
                  Record Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Prescription Modal */}
      {activeForm === 'prescription' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto scrollbar-hover shadow-2xl">
            <div className="flex justify-end mb-4">
              <button onClick={() => setActiveForm(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreatePrescription} className="space-y-6">
              {/* Patient Search Bar - ABOVE Header */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2 text-gray-900">Search Patient *</label>
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
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                  {prescriptionPatientSearch && showPrescriptionSuggestions && (
                    <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
                      {patients
                        .filter(p => p.name.toLowerCase().includes(prescriptionPatientSearch.toLowerCase()))
                        .map(patient => (
                          <div
                            key={patient.id}
                            onClick={() => {
                              setPrescriptionPatientId(String(patient.id));
                              setPrescriptionPatientSearch(patient.name);
                              setShowPrescriptionSuggestions(false);
                            }}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          >
                            {patient.name}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Header Section */}
              <div className="text-center border-b-4 border-double border-gray-800 pb-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-900">JOSEPH E. MAAÑO, D.M.D</h1>
                <p className="text-sm font-semibold text-gray-700">GENERAL DENTISTRY / ORTHODONTICS</p>
                <p className="text-sm text-gray-600">#29 Emilio Jacinto St. San Diego Zone 2</p>
                <p className="text-sm text-gray-600">Tayabas City 4327</p>
                <p className="text-sm text-gray-600 mt-1">Tel # (042)7171156 &nbsp;&nbsp; Cp # 09773651397</p>
              </div>

              {/* Patient Information Section */}
              <div className="space-y-3 mb-6">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <label className="col-span-1 text-sm font-semibold text-gray-900">NAME:</label>
                  <input
                    type="text"
                    value={prescriptionPatientId ? patients.find(p => String(p.id) === String(prescriptionPatientId))?.name || '' : ''}
                    readOnly
                    className="col-span-5 border-b border-gray-400 focus:outline-none bg-transparent px-2 py-1"
                  />
                  <label className="col-span-1 text-sm font-semibold text-gray-900 text-right">AGE:</label>
                  <input
                    type="text"
                    value={prescriptionPatientId ? calculateAge(patients.find(p => String(p.id) === String(prescriptionPatientId))?.dateOfBirth || '') : ''}
                    readOnly
                    className="col-span-2 border-b border-gray-400 focus:outline-none bg-transparent px-2 py-1"
                  />
                  <label className="col-span-1 text-sm font-semibold text-gray-900 text-right">SEX:</label>
                  <input
                    type="text"
                    value={prescriptionPatientId ? patients.find(p => String(p.id) === String(prescriptionPatientId))?.sex || '' : ''}
                    readOnly
                    className="col-span-2 border-b border-gray-400 focus:outline-none bg-transparent px-2 py-1"
                  />
                </div>
                <div className="grid grid-cols-12 gap-2 items-center">
                  <label className="col-span-2 text-sm font-semibold text-gray-900">ADDRESS:</label>
                  <input
                    type="text"
                    value={prescriptionPatientId ? patients.find(p => String(p.id) === String(prescriptionPatientId))?.address || '' : ''}
                    readOnly
                    className="col-span-6 border-b border-gray-400 focus:outline-none bg-transparent px-2 py-1"
                  />
                  <label className="col-span-1 text-sm font-semibold text-gray-900 text-right">DATE:</label>
                  <input
                    type="text"
                    name="date"
                    defaultValue={formatToDD_MM_YYYY(new Date())}
                    className="col-span-3 border-b border-gray-400 focus:outline-none bg-transparent px-2 py-1"
                  />
                </div>
              </div>

              {/* RX Section */}
              <div className="mb-4">
                <h2 className="text-6xl font-serif text-gray-800 mb-2">℞</h2>
              </div>

              {/* Medicine Options */}
              <div className="space-y-6 ml-8">
                {/* MEFENAMIC Acid */}
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id="med_mefenamic"
                      name="med_mefenamic"
                      className="w-5 h-5 rounded-full border-2 border-gray-400"
                    />
                    <label htmlFor="med_mefenamic" className="text-base font-semibold text-gray-900">
                      MEFENAMIC Acid
                    </label>
                    <div className="flex items-center gap-4 ml-8">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="mefenamic_dosage"
                          value="500mg"
                          className="w-4 h-4"
                        />
                        <span className="text-sm">500mg</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="mefenamic_dosage"
                          value="250mg"
                          className="w-4 h-4"
                        />
                        <span className="text-sm">250mg</span>
                      </label>
                    </div>
                  </div>
                  <div className="ml-12 flex items-center gap-2">
                    <span className="text-sm text-gray-700">#</span>
                    <input
                      type="number"
                      name="mefenamic_quantity"
                      placeholder="0"
                      className="w-20 border-b border-gray-400 focus:outline-none bg-transparent px-2 py-1"
                    />
                  </div>
                  <div className="ml-12">
                    <span className="text-sm italic text-gray-700">Sig. </span>
                    <input
                      type="text"
                      name="mefenamic_sig"
                      defaultValue="Take 1 cap 3x a day"
                      className="w-full border-b border-gray-400 focus:outline-none bg-transparent px-2 py-1 text-sm"
                    />
                  </div>
                </div>

                {/* AMOXICILIN */}
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id="med_amoxicillin"
                      name="med_amoxicillin"
                      className="w-5 h-5 rounded-full border-2 border-gray-400"
                    />
                    <label htmlFor="med_amoxicillin" className="text-base font-semibold text-gray-900">
                      AMOXICILIN
                    </label>
                    <div className="flex items-center gap-4 ml-8">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="amoxicillin_dosage"
                          value="500mg"
                          className="w-4 h-4"
                        />
                        <span className="text-sm">500mg</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="amoxicillin_dosage"
                          value="250mg"
                          className="w-4 h-4"
                        />
                        <span className="text-sm">250mg</span>
                      </label>
                    </div>
                  </div>
                  <div className="ml-12 flex items-center gap-2">
                    <span className="text-sm text-gray-700">#</span>
                    <input
                      type="number"
                      name="amoxicillin_quantity"
                      placeholder="0"
                      className="w-20 border-b border-gray-400 focus:outline-none bg-transparent px-2 py-1"
                    />
                  </div>
                  <div className="ml-12">
                    <span className="text-sm italic text-gray-700">Sig. </span>
                    <input
                      type="text"
                      name="amoxicillin_sig"
                      defaultValue="Take 1 cap 3x a day"
                      className="w-full border-b border-gray-400 focus:outline-none bg-transparent px-2 py-1 text-sm"
                    />
                  </div>
                </div>

                {/* MEFENAMIC Acid (third entry) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id="med_mefenamic_2"
                      name="med_mefenamic_2"
                      className="w-5 h-5 rounded-full border-2 border-gray-400"
                    />
                    <label htmlFor="med_mefenamic_2" className="text-base font-semibold text-gray-900">
                      MEFENAMIC Acid
                    </label>
                    <div className="flex items-center gap-4 ml-8">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="mefenamic2_dosage"
                          value="500mg"
                          className="w-4 h-4"
                        />
                        <span className="text-sm">500mg</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="mefenamic2_dosage"
                          value="250mg"
                          className="w-4 h-4"
                        />
                        <span className="text-sm">250mg</span>
                      </label>
                    </div>
                  </div>
                  <div className="ml-12 flex items-center gap-2">
                    <span className="text-sm text-gray-700">#</span>
                    <input
                      type="number"
                      name="mefenamic2_quantity"
                      placeholder="0"
                      className="w-20 border-b border-gray-400 focus:outline-none bg-transparent px-2 py-1"
                    />
                  </div>
                  <div className="ml-12">
                    <span className="text-sm italic text-gray-700">Sig. </span>
                    <input
                      type="text"
                      name="mefenamic2_sig"
                      defaultValue="Take 1 cap 3x a day"
                      className="w-full border-b border-gray-400 focus:outline-none bg-transparent px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Doctor Signature Section */}
              <div className="flex justify-end mt-12 pt-8 border-t-2 border-gray-300">
                <div className="text-center space-y-2">
                  <h3 className="text-base font-bold text-gray-900">JOSEPH E. MAAÑO, D.M.D</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">LIC NO.</span>
                    <input
                      type="text"
                      name="license_number"
                      defaultValue="0031129"
                      className="w-32 border-b border-gray-400 focus:outline-none bg-transparent px-2 py-1 text-sm text-center"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">PTR.</span>
                    <input
                      type="text"
                      name="ptr_number"
                      className="w-32 border-b border-gray-400 focus:outline-none bg-transparent px-2 py-1 text-sm text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Hidden fields for form submission */}
              <input type="hidden" name="dentist" value="Joseph E. Maaño" />
              <input type="hidden" name="notes" value="" />

              <div className="flex gap-3 justify-end pt-6 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => setActiveForm(null)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all font-semibold"
                >
                  Create Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Prescription Modal */}
      {viewingPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hover shadow-2xl">
            <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-300">
              <h2 className="text-3xl font-bold text-gray-900">Prescription</h2>
              <button onClick={() => setViewingPrescription(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="text-center border-b-4 border-double border-gray-800 pb-4">
                <h1 className="text-2xl font-bold text-gray-900">JOSEPH E. MAAÑO, D.M.D</h1>
                <p className="text-sm font-semibold text-gray-700">GENERAL DENTISTRY / ORTHODONTICS</p>
                <p className="text-sm text-gray-600">#29 Emilio Jacinto St. San Diego Zone 2</p>
                <p className="text-sm text-gray-600">Tayabas City 4327</p>
                <p className="text-sm text-gray-600 mt-1">Tel # (042)7171156 &nbsp;&nbsp; Cp # 09773651397</p>
              </div>

              {(() => {
                const patient = patients.find(p => String(p.id) === String(viewingPrescription.patientId));
                const age = patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : '';
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <label className="col-span-1 text-sm font-semibold text-gray-900">NAME:</label>
                      <div className="col-span-5 border-b border-gray-400 px-2 py-1 text-sm text-gray-900">
                        {patient?.name || ''}
                      </div>
                      <label className="col-span-1 text-sm font-semibold text-gray-900 text-right">AGE:</label>
                      <div className="col-span-2 border-b border-gray-400 px-2 py-1 text-sm text-gray-900">
                        {age}
                      </div>
                      <label className="col-span-1 text-sm font-semibold text-gray-900 text-right">SEX:</label>
                      <div className="col-span-2 border-b border-gray-400 px-2 py-1 text-sm text-gray-900">
                        {patient?.sex || ''}
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <label className="col-span-2 text-sm font-semibold text-gray-900">ADDRESS:</label>
                      <div className="col-span-6 border-b border-gray-400 px-2 py-1 text-sm text-gray-900">
                        {patient?.address || ''}
                      </div>
                      <label className="col-span-1 text-sm font-semibold text-gray-900 text-right">DATE:</label>
                      <div className="col-span-3 border-b border-gray-400 px-2 py-1 text-sm text-gray-900">
                        {formatToDD_MM_YYYY(viewingPrescription.date)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div>
                <h2 className="text-6xl font-serif text-gray-800">℞</h2>
              </div>

              <div className="space-y-6 ml-8">
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
                    { key: 'mefenamic1' as const, label: 'MEFENAMIC Acid', med: pickBySlot('mefenamic1', 'MEFENAMIC Acid') },
                    { key: 'amoxicilin' as const, label: 'AMOXICILIN', med: pickBySlot('amoxicilin', 'AMOXICILIN') },
                    { key: 'mefenamic2' as const, label: 'MEFENAMIC Acid', med: pickBySlot('mefenamic2', 'MEFENAMIC Acid') },
                  ];

                  return rows.map((row, index) => {
                    const med = row.med;
                    const quantityMatch = med?.duration?.match(/Quantity:\s*(\d+)/);
                    const quantity = quantityMatch?.[1] || '';
                    const isSelected = Boolean(med && (med.dosage || quantity || med.frequency));
                    return (
                      <div key={`${row.key}-${index}`} className="space-y-2">
                        <div className="flex items-center gap-4">
                          <span className="text-base font-semibold text-gray-900">
                            {isSelected ? '●' : '○'} {row.label}
                          </span>
                          <div className="flex items-center gap-4 ml-8">
                            <span className="text-sm">{med?.dosage === '500mg' ? '●' : '○'} 500mg</span>
                            <span className="text-sm">{med?.dosage === '250mg' ? '●' : '○'} 250mg</span>
                          </div>
                        </div>
                        <div className="ml-12 flex items-center gap-2">
                          <span className="text-sm text-gray-700">#</span>
                          <span className="w-20 border-b border-gray-400 px-2 py-1 text-sm text-gray-900">{quantity}</span>
                        </div>
                        <div className="ml-12">
                          <span className="text-sm italic text-gray-700">Sig. </span>
                          <span className="text-sm text-gray-900 border-b border-gray-400 inline-block min-w-[260px] px-2 py-1">
                            {med?.frequency || ''}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="flex justify-end mt-10 pt-6 border-t-2 border-gray-300">
                <div className="text-center space-y-2">
                  <h3 className="text-base font-bold text-gray-900">JOSEPH E. MAAÑO, D.M.D</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">LIC NO.</span>
                    <span className="w-32 border-b border-gray-400 px-2 py-1 text-sm text-center text-gray-900">
                      {viewingPrescription.licenseNumber || ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">PTR.</span>
                    <span className="w-32 border-b border-gray-400 px-2 py-1 text-sm text-center text-gray-900">
                      {viewingPrescription.ptrNumber || ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-6 border-t-2 border-gray-200">
                <button
                  onClick={() => printPrescription(viewingPrescription)}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all flex items-center gap-2 font-semibold"
                >
                  <Printer className="w-5 h-5" />
                  Print Prescription
                </button>
                <button
                  onClick={() => setViewingPrescription(null)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-gray-900"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hover shadow-2xl">
            <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-300">
              <h2 className="text-3xl font-bold text-gray-900">Official Receipt</h2>
              <button onClick={() => setViewingReceipt(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-700 font-semibold mb-2">Receipt No.</p>
                  <p className="text-gray-900 font-medium">{viewingReceipt.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-700 font-semibold mb-2">Date</p>
                  <p className="text-gray-900 font-medium">{formatToDD_MM_YYYY(viewingReceipt.date)}</p>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Patient Information</h3>
                {(() => {
                  const patient = patients.find(p => String(p.id) === String(viewingReceipt.patientId));
                  return patient ? (
                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-900"><strong className="text-gray-700">Name:</strong> {patient.name}</p>
                      <p className="text-gray-900"><strong className="text-gray-700">Age:</strong> {calculateAge(patient.dateOfBirth)}</p>
                      <p className="text-gray-900"><strong className="text-gray-700">Sex:</strong> {patient.sex}</p>
                      <p className="text-gray-900"><strong className="text-gray-700">Address:</strong> {patient.address}</p>
                      <p className="text-gray-900"><strong className="text-gray-700">Phone:</strong> {patient.phone}</p>
                      <p className="text-gray-900"><strong className="text-gray-700">Email:</strong> {patient.email}</p>
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="pt-4 border-t-2 border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Service Details</h3>
                <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
                  <p className="text-gray-900"><strong className="text-gray-700">Service:</strong> {viewingReceipt.treatment}</p>
                  {viewingReceipt.tooth && <p className="text-gray-900"><strong className="text-gray-700">Tooth Number:</strong> {viewingReceipt.tooth}</p>}
                  <p className="text-gray-900"><strong className="text-gray-700">Performed by:</strong> Dr. {viewingReceipt.dentist}</p>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Amount</h3>
                <div className="space-y-3 bg-gradient-to-br from-gray-50 to-yellow-50 p-5 rounded-lg border border-yellow-200">
                  <div className="flex justify-between text-gray-900">
                    <span className="font-semibold">Total Billed (Service Fee):</span>
                    <span className="font-bold">₱{Number(viewingReceipt.cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-green-700 font-semibold">
                    <span>Total Paid:</span>
                    <span>₱{Number(viewingReceipt.amountPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-gray-300 pt-3 font-bold text-lg">
                    <span className="text-gray-900">Current Balance:</span>
                    <span className={(viewingReceipt.remainingBalance !== undefined ? Number(viewingReceipt.remainingBalance) : Number(viewingReceipt.cost || 0)) > 0 ? 'text-red-600' : 'text-green-600'}>₱{Number(viewingReceipt.remainingBalance !== undefined ? viewingReceipt.remainingBalance : (viewingReceipt.cost || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {viewingReceipt.paymentType && (
                <div className="pt-4 border-t-2 border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Payment Information</h3>
                  <div className="space-y-2 bg-purple-50 p-4 rounded-lg">
                    <p className="text-gray-900"><strong className="text-gray-700">Payment Type:</strong> {viewingReceipt.paymentType === 'full' ? 'Full Payment' : 'Installment Plan'}</p>
                    {viewingReceipt.paymentType === 'installment' && viewingReceipt.installmentPlan && (
                      <>
                        <p className="text-gray-900"><strong className="text-gray-700">Number of Installments:</strong> {viewingReceipt.installmentPlan.installments}</p>
                        <p className="text-gray-900"><strong className="text-gray-700">Per Installment:</strong> ₱{Math.round(viewingReceipt.installmentPlan.amountPerInstallment)}</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {viewingReceipt.notes && (
                <div className="pt-4 border-t-2 border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Notes</h3>
                  <p className="text-gray-800 leading-relaxed">{viewingReceipt.notes}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-6 border-t-2 border-gray-200">
                <button
                  onClick={() => printReceipt(viewingReceipt)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all flex items-center gap-2 font-semibold"
                >
                  <Printer className="w-5 h-5" />
                  Print Receipt
                </button>
                <button
                  onClick={() => setViewingReceipt(null)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-gray-900"
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
