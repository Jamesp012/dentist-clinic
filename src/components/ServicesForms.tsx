import { useState } from 'react';
import { Patient, TreatmentRecord, Payment } from '../App';
import { FileText, Printer, Download, Plus, X, CreditCard } from 'lucide-react';
import { treatmentRecordAPI, paymentAPI } from '../api';
import { toast } from 'sonner';
import { generateReceipt, generatePrescriptionPDF, generatePatientHistoryPDF, generateDetailedReceiptPDF } from '../utils/pdfGenerator';

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
  }[];
  dentist: string;
  notes: string;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFromAppointment, setIsFromAppointment] = useState<boolean>(!!prefilledAppointment);

  const services: ServiceType[] = ['Extraction', 'Pasta', 'Braces', 'Cleaning', 'Pustiso/Dentures'];

  const handleCreateService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePrescription = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const patientId = prescriptionPatientId || selectedPatient;
    const patient = patients.find(p => String(p.id) === String(patientId));

    const medications = [];
    let index = 0;
    while (formData.get(`medication_${index}`)) {
      medications.push({
        name: formData.get(`medication_${index}`) as string,
        dosage: formData.get(`dosage_${index}`) as string,
        frequency: formData.get(`frequency_${index}`) as string,
        duration: formData.get(`duration_${index}`) as string,
      });
      index++;
    }

    const newPrescription: Prescription = {
      id: Date.now().toString(),
      patientId,
      patientName: patient?.name || '',
      date: formData.get('date') as string,
      medications,
      dentist: formData.get('dentist') as string,
      notes: formData.get('notes') as string,
    };

    setPrescriptions([...prescriptions, newPrescription]);
    setViewingPrescription(newPrescription);
    setActiveForm(null);
    setPrescriptionPatientSearch('');
    setPrescriptionPatientId('');
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

  const [medicationCount, setMedicationCount] = useState(1);

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
        <div className="space-y-3">
          {treatmentRecords.slice(-5).reverse().map((record) => {
            const patient = patients.find(p => String(p.id) === String(record.patientId));
            return (
              <div key={record.id} className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-gray-900">{patient?.name}</p>
                    <p className="text-sm text-gray-700 mt-1">{record.treatment} {record.tooth ? `- Tooth ${record.tooth}` : ''}</p>
                    <p className="text-sm text-gray-500 mt-1">{new Date(record.date).toLocaleDateString()} • Dr. {record.dentist}</p>
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
      <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Recent Prescriptions</h2>
        <div className="space-y-3">
          {prescriptions.slice(-5).reverse().map((prescription) => (
            <div key={prescription.id} className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-gradient-to-br from-white to-green-50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{prescription.patientName}</p>
                  <p className="text-sm text-gray-700 mt-1">{prescription.medications.length} medication(s) prescribed</p>
                  <p className="text-sm text-gray-500 mt-1">{new Date(prescription.date).toLocaleDateString()} • Dr. {prescription.dentist}</p>
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
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
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
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                      {patients.filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase())).map(patient => (
                        <div
                          key={patient.id}
                          onMouseDown={() => {
                            setSelectedPatient(patient.id);
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
                    type="date"
                    name="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
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
          <div className="bg-white rounded-xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
              <h2 className="text-3xl font-bold text-gray-900">Create Prescription</h2>
              <button onClick={() => setActiveForm(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreatePrescription} className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900">Patient *</label>
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                    {prescriptionPatientSearch && showPrescriptionSuggestions && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                        {patients.filter(p => p.name.toLowerCase().includes(prescriptionPatientSearch.toLowerCase())).map(patient => (
                          <div
                            key={patient.id}
                            onMouseDown={() => {
                              setPrescriptionPatientId(patient.id);
                              setPrescriptionPatientSearch(patient.name);
                              setShowPrescriptionSuggestions(false);
                            }}
                            className="px-4 py-3 hover:bg-green-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                          >
                            <p className="font-semibold text-gray-900">{patient.name}</p>
                            <p className="text-sm text-gray-500">{patient.phone}</p>
                          </div>
                        ))}
                        {patients.filter(p => p.name.toLowerCase().includes(prescriptionPatientSearch.toLowerCase())).length === 0 && (
                          <div className="px-4 py-3 text-gray-500 text-center">No patients found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900">Date *</label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="border-t-2 border-gray-200 pt-6">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg font-bold text-gray-900">Medications</h3>
                  <button
                    type="button"
                    onClick={() => setMedicationCount(medicationCount + 1)}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-semibold"
                  >
                    + Add Medication
                  </button>
                </div>

                {Array.from({ length: medicationCount }).map((_, index) => (
                  <div key={index} className="mb-5 p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <p className="text-sm font-bold mb-4 text-gray-900">Medication #{index + 1}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-semibold mb-2 text-gray-900">Medicine Name *</label>
                        <input
                          type="text"
                          name={`medication_${index}`}
                          required
                          placeholder="e.g., Amoxicillin"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-900">Dosage *</label>
                        <input
                          type="text"
                          name={`dosage_${index}`}
                          required
                          placeholder="e.g., 500mg"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-900">Frequency *</label>
                        <input
                          type="text"
                          name={`frequency_${index}`}
                          required
                          placeholder="e.g., 3 times a day"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-semibold mb-2 text-gray-900">Duration *</label>
                        <input
                          type="text"
                          name={`duration_${index}`}
                          required
                          placeholder="e.g., 7 days"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">Dentist *</label>
                <input
                  type="text"
                  name="dentist"
                  required
                  placeholder="Dr. Name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">Additional Instructions</label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Special instructions for patient..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                />
              </div>

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
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-300">
              <h2 className="text-3xl font-bold text-gray-900">Prescription</h2>
              <button onClick={() => setViewingPrescription(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-700 font-semibold mb-2">Date</p>
                  <p className="text-gray-900 font-medium">{new Date(viewingPrescription.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-700 font-semibold mb-2">Prescription ID</p>
                  <p className="text-gray-900 font-medium">{viewingPrescription.id}</p>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Patient Information</h3>
                <p className="text-lg font-semibold text-gray-900">{viewingPrescription.patientName}</p>
              </div>

              <div className="pt-4 border-t-2 border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Medications</h3>
                <div className="space-y-4">
                  {viewingPrescription.medications.map((med, index) => (
                    <div key={index} className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-300 rounded-lg">
                      <p className="mb-4 font-bold text-gray-900">{index + 1}. {med.name}</p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1">Dosage</p>
                          <p className="text-gray-900 font-medium">{med.dosage}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1">Frequency</p>
                          <p className="text-gray-900 font-medium">{med.frequency}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1">Duration</p>
                          <p className="text-gray-900 font-medium">{med.duration}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {viewingPrescription.notes && (
                <div className="pt-4 border-t-2 border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Instructions</h3>
                  <p className="text-gray-800 leading-relaxed">{viewingPrescription.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t-2 border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Prescribing Dentist</h3>
                <p className="text-gray-900 font-semibold">Dr. {viewingPrescription.dentist}</p>
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
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
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
                  <p className="text-gray-900 font-medium">{new Date(viewingReceipt.date).toLocaleDateString()}</p>
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
                  setSelectedPatient(lastCreatedService.patientId);
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
