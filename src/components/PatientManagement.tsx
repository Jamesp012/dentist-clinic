import { useState } from 'react';
import { Patient, TreatmentRecord, PhotoUpload, Payment } from '../App';
import { Search, Plus, X, Edit, Eye, Calendar, FileText, Camera, Trash2, CreditCard, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { patientAPI, treatmentRecordAPI, paymentAPI } from '../api';
import { handlePhoneInput, formatPhoneNumber, validatePhoneNumber } from '../utils/phoneValidation';
import { generateReceipt, generatePatientHistoryPDF } from '../utils/pdfGenerator';

type PatientManagementProps = {
  patients: Patient[];
  setPatients: (patients: Patient[]) => void;
  treatmentRecords: TreatmentRecord[];
  setTreatmentRecords: (records: TreatmentRecord[]) => void;
  photos: PhotoUpload[];
  payments: Payment[];
  onDataChanged?: () => Promise<void>;
};

export function PatientManagement({ patients, setPatients, treatmentRecords, setTreatmentRecords, photos, payments, onDataChanged }: PatientManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoUpload | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{show: boolean, record: TreatmentRecord | null}>({show: false, record: null});
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.includes(searchTerm)
  );

  const handleAddPatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const newPatient = {
        name: formData.get('name') as string,
        dateOfBirth: formData.get('dateOfBirth') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        address: formData.get('address') as string,
        sex: formData.get('sex') as 'Male' | 'Female',
        medicalHistory: formData.get('medicalHistory') as string,
        allergies: formData.get('allergies') as string,
      };
      const createdPatient = await patientAPI.create(newPatient);
      setPatients([...patients, createdPatient as Patient]);
      setShowAddModal(false);
      toast.success('Patient added successfully!');
      // Sync data across all users
      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Failed to add patient:', error);
      toast.error('Failed to add patient');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPatient) return;
    
    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const updatedPatient = {
        ...editingPatient,
        name: formData.get('name') as string,
        dateOfBirth: formData.get('dateOfBirth') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        address: formData.get('address') as string,
        sex: formData.get('sex') as 'Male' | 'Female',
        medicalHistory: formData.get('medicalHistory') as string,
        allergies: formData.get('allergies') as string,
      };
      
      await patientAPI.update(updatedPatient.id, updatedPatient);
      setPatients(patients.map(p => String(p.id) === String(updatedPatient.id) ? updatedPatient : p));
      setEditingPatient(null);
      if (selectedPatient && String(selectedPatient.id) === String(updatedPatient.id)) {
        setSelectedPatient(updatedPatient);
      }
      toast.success('Patient updated successfully!');
      // Sync data across all users
      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Failed to update patient:', error);
      toast.error('Failed to update patient');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTreatment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPatient) return;

    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const cost = parseFloat(formData.get('cost') as string);
      const initialPayment = parseFloat(formData.get('initialPayment') as string) || 0;
      const dentist = formData.get('dentist') as string;
      const patientId = selectedPatient.id.toString();

      const newRecord = {
        patientId,
        date: formData.get('date') as string,
        treatment: formData.get('treatment') as string,
        description: formData.get('treatment') as string,
        tooth: formData.get('tooth') as string || undefined,
        notes: formData.get('notes') as string,
        cost,
        dentist,
        paymentType: initialPayment >= cost ? 'full' : (initialPayment > 0 ? 'installment' : 'full'),
        amountPaid: initialPayment,
        remainingBalance: cost - initialPayment,
      };

      const createdRecord = await treatmentRecordAPI.create(newRecord);
      
      // If there's an initial payment, create a payment record too
      if (initialPayment > 0) {
        await paymentAPI.create({
          patientId,
          treatmentRecordId: createdRecord.id,
          amount: initialPayment,
          paymentDate: newRecord.date,
          paymentMethod: 'cash',
          status: 'paid',
          notes: `Initial payment for ${newRecord.treatment}`,
          recordedBy: dentist
        });
      }

      toast.success('Treatment record added successfully');
      e.currentTarget.reset();
      
      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Failed to add treatment:', error);
      toast.error('Failed to add treatment record');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!paymentModal.record || paymentAmount <= 0) return;

    setIsLoading(true);
    try {
      await paymentAPI.create({
        patientId: paymentModal.record.patientId,
        treatmentRecordId: paymentModal.record.id,
        amount: paymentAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        status: 'paid',
        notes: `Balance payment for ${paymentModal.record.treatment}`,
        recordedBy: paymentModal.record.dentist || 'System'
      });

      toast.success('Payment recorded successfully');
      setPaymentModal({show: false, record: null});
      setPaymentAmount(0);
      
      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Failed to process payment:', error);
      toast.error('Failed to process payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: string | number) => {
    if (!window.confirm('Are you sure you want to delete this payment record? This will update the balance.')) return;

    setIsLoading(true);
    try {
      await paymentAPI.delete(paymentId);
      toast.success('Payment deleted successfully');
      
      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Failed to delete payment:', error);
      toast.error('Failed to delete payment');
    } finally {
      setIsLoading(false);
    }
  };

  const patientRecords = selectedPatient
    ? treatmentRecords.filter(r => String(r.patientId) === String(selectedPatient.id))
    : [];

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

  const handleDeletePatient = (patient: Patient) => {
    setDeletingPatient(patient);
  };

  const confirmDeletePatient = async () => {
    if (!deletingPatient) return;
    
    setIsLoading(true);
    try {
      await patientAPI.delete(deletingPatient.id);
      
      // Remove patient from patients list
      setPatients(patients.filter(p => String(p.id) !== String(deletingPatient.id)));
      
      // Also remove related treatment records
      setTreatmentRecords(treatmentRecords.filter(r => String(r.patientId) !== String(deletingPatient.id)));
      
      toast.success(`Patient ${deletingPatient.name} has been deleted`);
      setDeletingPatient(null);
      
      // If we're viewing the deleted patient, go back to list
      if (selectedPatient && String(selectedPatient.id) === String(deletingPatient.id)) {
        setViewMode('list');
        setSelectedPatient(null);
      }
    } catch (error) {
      console.error('Failed to delete patient:', error);
      toast.error('Failed to delete patient');
    } finally {
      setIsLoading(false);
    }
    // Sync data across all users
    if (onDataChanged) {
      await onDataChanged();
    }
  };

  if (viewMode === 'detail' && selectedPatient) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <button
            onClick={() => {
              setViewMode('list');
              setSelectedPatient(null);
            }}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← Back to Patient List
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl mb-2">{selectedPatient.name}</h1>
              <p className="text-gray-600">Patient ID: {selectedPatient.id}</p>
            </div>
            <button
              onClick={() => setEditingPatient(selectedPatient)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Patient
            </button>
          </div>
        </div>

        {/* Patient Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="mb-4">Personal Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Age</p>
                <p>{calculateAge(selectedPatient.dateOfBirth)} years old</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date of Birth</p>
                <p>{new Date(selectedPatient.dateOfBirth).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p>{selectedPatient.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p>{selectedPatient.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Address</p>
                <p>{selectedPatient.address}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Sex</p>
                <p>{selectedPatient.sex}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="mb-4">Medical Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Medical History</p>
                <p>{selectedPatient.medicalHistory || 'None'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Allergies</p>
                <p className={selectedPatient.allergies !== 'None' ? 'text-red-600' : ''}>
                  {selectedPatient.allergies || 'None'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="mb-4">Visit Summary & Balance</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Last Visit</p>
                <p>{selectedPatient.lastVisit ? new Date(selectedPatient.lastVisit).toLocaleDateString() : 'No visits'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Next Appointment</p>
                <p>{selectedPatient.nextAppointment ? new Date(selectedPatient.nextAppointment).toLocaleDateString() : 'Not scheduled'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Treatments</p>
                <p>{patientRecords.length}</p>
              </div>
              {patientRecords.length > 0 && (
                <>
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Financial Summary</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Total Billed:</span>
                        <span className="font-semibold">₱{patientRecords.reduce((sum, r) => sum + Number(r.cost || 0), 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Total Paid:</span>
                        <span className="font-semibold text-green-600">₱{patientRecords.reduce((sum, r) => sum + Number(r.amountPaid || 0), 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between bg-orange-50 p-2 rounded">
                        <span className="text-sm font-medium">Remaining Balance:</span>
                        <span className="font-bold text-orange-600">₱{(selectedPatient.totalBalance !== undefined ? Number(selectedPatient.totalBalance) : (patientRecords.reduce((sum, r) => sum + Number(r.cost || 0), 0) - patientRecords.reduce((sum, r) => sum + Number(r.amountPaid || 0), 0))).toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => generatePatientHistoryPDF(selectedPatient, patientRecords)}
                        className="w-full mt-2 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                        Print All Services (PDF)
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Treatment History */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h2 className="mb-4">Treatment History & Payment Status</h2>
          <div className="space-y-3">
            {patientRecords.length > 0 ? (
              patientRecords.map(record => (
                <div key={record.id} className="p-4 border border-gray-200 rounded">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-lg">{record.treatment}</p>
                      {record.tooth && <p className="text-sm text-gray-600">Tooth: {record.tooth}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{new Date(record.date).toLocaleDateString()}</p>
                      <p className="font-semibold">₱{record.cost}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{record.notes}</p>
                  <p className="text-sm text-gray-500 mb-2">Performed by: {record.dentist}</p>
                  
                  {/* Payment Status */}
                  {record.paymentType && (
                    <div className="mt-3 pt-3 border-t border-gray-200 bg-gray-50 p-2 rounded">
                      <div className="flex flex-wrap gap-2 items-center text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${record.paymentType === 'full' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                          {record.paymentType === 'full' ? 'Full Payment' : 'Installment Plan'}
                        </span>
                        {record.amountPaid !== undefined && record.amountPaid > 0 && (
                          <span className="text-green-600 font-semibold">Paid: ₱{record.amountPaid}</span>
                        )}
                        {record.remainingBalance !== undefined && record.remainingBalance > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-orange-600 font-semibold">Balance: ₱{record.remainingBalance}</span>
                            <button
                              onClick={() => {
                                setPaymentModal({show: true, record: record});
                                setPaymentAmount(record.remainingBalance || 0);
                              }}
                              className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 flex items-center gap-1"
                            >
                              <CreditCard className="w-3 h-3" />
                              Pay
                            </button>
                            <button
                              onClick={() => selectedPatient && generateReceipt(selectedPatient, record, payments)}
                              className="px-2 py-1 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 flex items-center gap-1"
                              title="Print Receipt"
                            >
                              <Printer className="w-3 h-3" />
                              Receipt
                            </button>
                          </div>
                        )}
                        {record.remainingBalance === 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 font-semibold">✓ Fully Paid</span>
                            <button
                              onClick={() => selectedPatient && generateReceipt(selectedPatient, record, payments)}
                              className="ml-2 px-2 py-1 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 flex items-center gap-1"
                              title="Print Receipt"
                            >
                              <Printer className="w-3 h-3" />
                              Receipt
                            </button>
                          </div>
                        )}
                      </div>
                      {record.paymentType === 'installment' && record.installmentPlan && (
                        <div className="mt-2 text-xs text-gray-600">
                          <p>Installments: {record.installmentPlan.installments} x ₱{record.installmentPlan.amountPerInstallment}</p>
                        </div>
                      )}

                      {/* Payment History for this record */}
                      {payments.filter(p => String(p.treatmentRecordId) === String(record.id)).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Payment History</p>
                          <div className="space-y-1.5">
                            {payments
                              .filter(p => String(p.treatmentRecordId) === String(record.id))
                              .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                              .map(payment => (
                                <div key={payment.id} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-gray-100 group">
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-600">{new Date(payment.paymentDate).toLocaleDateString()}</span>
                                    <span className="text-gray-400">|</span>
                                    <span className="text-gray-500 italic">By {payment.recordedBy}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-green-600">₱{payment.amount}</span>
                                    <button
                                      onClick={() => handleDeletePayment(payment.id)}
                                      className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                                      title="Delete payment"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500">No treatment records</p>
            )}
          </div>
        </div>

        {/* Patient Photos */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h2 className="mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Treatment Photos & X-Rays
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {photos.filter(p => String(p.patientId) === String(selectedPatient.id)).map(photo => (
              <div
                key={photo.id}
                className="relative group cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.url}
                  alt={photo.type}
                  className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-colors"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                  <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-center">
                    <p className="text-sm font-semibold capitalize">{photo.type}</p>
                    <p className="text-xs">{new Date(photo.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="absolute top-2 right-2 px-2 py-1 bg-blue-600 text-white text-xs rounded capitalize">
                  {photo.type}
                </div>
              </div>
            ))}
            {photos.filter(p => String(p.patientId) === String(selectedPatient.id)).length === 0 && (
              <div className="col-span-4 text-center py-8 text-gray-500">
                <Camera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No photos uploaded yet</p>
                <p className="text-xs mt-1">Patient can upload photos from their portal</p>
              </div>
            )}
          </div>
        </div>

        {/* Photo Modal */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-8"
            onClick={() => setSelectedPhoto(null)}
          >
            <div
              className="relative max-w-4xl max-h-full bg-white rounded-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 z-10"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.type}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              <div className="p-6 bg-white">
                <p className="font-semibold text-lg capitalize mb-2">{selectedPhoto.type} Photo</p>
                <p className="text-sm text-gray-600 mb-2">Date: {new Date(selectedPhoto.date).toLocaleDateString()}</p>
                {selectedPhoto.notes && (
                  <p className="text-sm text-gray-700">{selectedPhoto.notes}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Treatment Form */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="mb-4">Add Treatment Record</h2>
          <form onSubmit={handleAddTreatment} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Date</label>
              <input
                type="date"
                name="date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Treatment</label>
              <input
                type="text"
                name="treatment"
                required
                placeholder="e.g., Cleaning, Filling, Crown"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Tooth (Optional)</label>
              <input
                type="text"
                name="tooth"
                placeholder="e.g., #14, Upper Right"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Cost (₱)</label>
              <input
                type="number"
                name="cost"
                required
                step="0.01"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Initial Payment (₱) - Optional</label>
              <input
                type="number"
                name="initialPayment"
                step="0.01"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Dentist</label>
              <input
                type="text"
                name="dentist"
                required
                placeholder="Dr. Name"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm mb-1">Notes</label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Treatment details and observations"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Add Treatment Record
              </button>
            </div>
          </form>
        </div>

        {/* Edit Patient Modal */}
        {editingPatient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-visible">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl">Edit Patient</h2>
                <button onClick={() => setEditingPatient(null)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleUpdatePatient} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      defaultValue={editingPatient.name}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Date of Birth *</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      required
                      defaultValue={editingPatient.dateOfBirth}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Phone *</label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      defaultValue={editingPatient.phone}
                      onBlur={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        e.target.value = formatted;
                      }}
                      placeholder="+63 912 345 6789"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Email *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      defaultValue={editingPatient.email}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-1">Address *</label>
                  <input
                    type="text"
                    name="address"
                    required
                    defaultValue={editingPatient.address}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Sex *</label>
                  <select
                    name="sex"
                    required
                    defaultValue={editingPatient.sex}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Medical History</label>
                  <textarea
                    name="medicalHistory"
                    rows={3}
                    defaultValue={editingPatient.medicalHistory}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Allergies</label>
                  <input
                    type="text"
                    name="allergies"
                    defaultValue={editingPatient.allergies}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingPatient(null)}
                    className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Update Patient
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl mb-2">Patient Management</h1>
          <p className="text-gray-600">Centralized patient database</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Patient
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search patients by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Patient List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm text-gray-600">Name</th>
              <th className="px-6 py-3 text-left text-sm text-gray-600">Age</th>
              <th className="px-6 py-3 text-left text-sm text-gray-600">Phone</th>
              <th className="px-6 py-3 text-left text-sm text-gray-600">Email</th>
              <th className="px-6 py-3 text-left text-sm text-gray-600">Last Visit</th>
              <th className="px-6 py-3 text-left text-sm text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredPatients.map((patient) => (
              <tr key={patient.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{patient.name}</td>
                <td className="px-6 py-4">{calculateAge(patient.dateOfBirth)}</td>
                <td className="px-6 py-4">{patient.phone}</td>
                <td className="px-6 py-4">{patient.email}</td>
                <td className="px-6 py-4">
                  {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : 'No visits'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setSelectedPatient(patient);
                        setViewMode('detail');
                      }}
                      className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleDeletePatient(patient)}
                      className="text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-visible">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl">Add New Patient</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddPatient} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="+63 912 345 6789"
                    onBlur={(e) => {
                      const formatted = formatPhoneNumber(e.target.value);
                      e.target.value = formatted;
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Address *</label>
                <input
                  type="text"
                  name="address"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Sex *</label>
                <select
                  name="sex"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Medical History</label>
                <textarea
                  name="medicalHistory"
                  rows={3}
                  placeholder="Enter any relevant medical conditions..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Allergies</label>
                <input
                  type="text"
                  name="allergies"
                  placeholder="Enter allergies or 'None'"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Patient Confirmation Modal */}
      {deletingPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-visible">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl">Confirm Delete Patient</h2>
              <button onClick={() => setDeletingPatient(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">Are you sure you want to delete patient <strong>{deletingPatient.name}</strong>?</p>
              <p className="text-gray-500">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button
                type="button"
                onClick={() => setDeletingPatient(null)}
                className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePatient}
                className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete Patient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal.show && paymentModal.record && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl">Record Payment</h2>
              <button onClick={() => setPaymentModal({show: false, record: null})} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Treatment</p>
                <p className="font-semibold">{paymentModal.record.treatment}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Remaining Balance</p>
                <p className="font-semibold text-orange-600">₱{paymentModal.record.remainingBalance}</p>
              </div>
              <div>
                <label className="block text-sm mb-1">Payment Amount (₱)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value))}
                  max={paymentModal.record.remainingBalance}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => setPaymentModal({show: false, record: null})}
                className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessPayment}
                disabled={isLoading || paymentAmount <= 0}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}