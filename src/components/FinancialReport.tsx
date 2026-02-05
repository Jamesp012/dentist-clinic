import { useState } from 'react';
import { Patient, TreatmentRecord, Payment } from '../App';
import { TrendingUp, TrendingDown, Calendar, FileText, Download, PieChart, BarChart3, Plus, X, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PesoSign } from './icons/PesoSign';
import { generateReceipt, generatePatientHistoryPDF, generateFinancialPDF } from '../utils/pdfGenerator';
import { PatientSearchInput } from './PatientSearchInput';
import { formatToDD_MM_YYYY } from '../utils/dateHelpers';

type FinancialReportProps = {
  patients: Patient[];
  treatmentRecords: TreatmentRecord[];
  setTreatmentRecords: (records: TreatmentRecord[]) => void;
  payments: Payment[];
  setPayments: (payments: Payment[]) => void;
  currentUser?: any;
};

type PatientBalance = {
  patientId: string;
  patientName: string;
  totalBilled: number;
  totalPaid: number;
  balance: number;
};

export function FinancialReport({ patients, treatmentRecords, setTreatmentRecords, payments, setPayments, currentUser }: FinancialReportProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [viewType, setViewType] = useState<'summary' | 'details' | 'patients' | 'payments'>('summary');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedTreatmentId, setSelectedTreatmentId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'check' | 'bank_transfer'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Calculate patient balances from actual treatment records with payment data
  const patientBalances: PatientBalance[] = patients.map(patient => {
    const patientRecords = treatmentRecords.filter(r => String(r.patientId) === String(patient.id));
    const totalBilled = patientRecords.reduce((sum, r) => sum + Number(r.cost || 0), 0);
    
    // Use actual amountPaid from treatment records (matches Dashboard)
    const totalPaid = patientRecords.reduce((sum, r) => {
      return sum + Number(r.amountPaid || 0);
    }, 0);
    
    const balance = totalBilled - totalPaid;

    return {
      patientId: String(patient.id),
      patientName: patient.name,
      totalBilled,
      totalPaid,
      balance
    };
  });

  // Calculate monthly revenue using amountPaid (matches Dashboard)
  const monthlyRecords = treatmentRecords.filter(record => {
    const recordMonth = record.date.slice(0, 7);
    return recordMonth === selectedMonth;
  });

  const monthlyRevenue = monthlyRecords.reduce((sum, record) => sum + Number(record.amountPaid || 0), 0);
  const monthlyTransactions = monthlyRecords.length;

  // Calculate total outstanding balance
  const totalOutstanding = patientBalances.reduce((sum, pb) => sum + Math.max(0, Number(pb.balance || 0)), 0);

  // Calculate totals (match Dashboard calculation)
  const totalBilled = treatmentRecords.reduce((sum, record) => sum + Number(record.cost || 0), 0);
  const totalRevenue = treatmentRecords.reduce((sum, record) => sum + Number(record.amountPaid || 0), 0);

  // Treatment type breakdown
  const treatmentBreakdown = treatmentRecords.reduce((acc, record) => {
    const type = record.treatment;
    if (!acc[type]) {
      acc[type] = { count: 0, revenue: 0 };
    }
    acc[type].count++;
    acc[type].revenue += Number(record.cost || 0);
    return acc;
  }, {} as { [key: string]: { count: number; revenue: number } });

  const downloadReport = () => {
    const reportData = {
      generatedDate: new Date().toISOString(),
      summary: {
        totalRevenue,
        totalBilled,
        totalOutstanding,
        monthlyRevenue,
        monthlyTransactions
      },
      patientBalances,
      treatmentBreakdown
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `financial-report-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatientId || !selectedTreatmentId || !paymentAmount) {
      alert('Please select a patient, procedure, and enter payment amount');
      return;
    }

    const treatment = treatmentRecords.find(t => t.id === selectedTreatmentId);
    if (!treatment) {
      alert('Treatment record not found');
      return;
    }

    const paidAmount = parseFloat(paymentAmount) || 0;
    if (paidAmount <= 0) {
      alert('Payment amount must be greater than 0');
      return;
    }

    // Update the treatment record with the new payment
    const newAmountPaid = (treatment.amountPaid || 0) + paidAmount;
    const updatedTreatment = {
      ...treatment,
      amountPaid: newAmountPaid,
      remainingBalance: treatment.cost - newAmountPaid,
    };

    // Create new payment record
    const newPayment: Payment = {
      id: Date.now().toString(),
      patientId: String(selectedPatientId),
      treatmentRecordId: selectedTreatmentId,
      amount: paidAmount,
      paymentDate: new Date().toISOString(),
      paymentMethod,
      status: 'paid',
      notes: paymentNotes,
      recordedBy: currentUser?.name || 'Unknown User'
    };

    // Update both payments and treatment records
    setPayments([...payments, newPayment]);
    
    // Update treatment records
    const updatedRecords = treatmentRecords.map(r => r.id === selectedTreatmentId ? updatedTreatment : r);
    setTreatmentRecords(updatedRecords);
    
    alert('Payment recorded successfully!');
    
    // Reset form
    setSelectedPatientId('');
    setSelectedTreatmentId('');
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentNotes('');
    setShowPaymentForm(false);
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-10">
          {/* Premium Tab Navigation */}
          <div className="flex gap-2 p-1 bg-white rounded-2xl shadow-lg border border-gray-100 w-full">
            <button
              onClick={() => setViewType('summary')}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                viewType === 'summary'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              <PieChart className="w-4 h-4" />
              Summary
            </button>
            <button
              onClick={() => setViewType('details')}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                viewType === 'details'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Details
            </button>
            <button
              onClick={() => setViewType('patients')}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                viewType === 'patients'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              Patient Balances
            </button>
            <button
              onClick={() => setViewType('payments')}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                viewType === 'payments'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              <Plus className="w-4 h-4" />
              Record Payment
            </button>
          </div>
        </div>

        {/* Summary View */}
        {viewType === 'summary' && (
          <div className="space-y-8">
            {/* Key Metrics - Premium Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Revenue Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-6 sm:p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <PesoSign className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600" />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-600">+12%</span>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm font-medium mb-2 uppercase tracking-wider">Total Revenue</p>
                  <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">₱{totalRevenue.toLocaleString('en-US')}</p>
                  <p className="text-sm text-gray-500">All time paid amount</p>
                </div>
                <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
              </motion.div>

              {/* Total Billed Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group relative bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-6 sm:p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <PesoSign className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">{((totalRevenue / totalBilled) * 100).toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">collection rate</p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm font-medium mb-2 uppercase tracking-wider">Total Billed</p>
                  <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">₱{totalBilled.toLocaleString('en-US')}</p>
                  <p className="text-sm text-gray-500">Total charged amount</p>
                </div>
                <div className="h-1 bg-gradient-to-r from-blue-400 to-cyan-400" />
              </motion.div>

              {/* Outstanding Balance Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="group relative bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-6 sm:p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <TrendingDown className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600" />
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-amber-600">{patientBalances.filter(pb => pb.balance > 0).length}</p>
                      <p className="text-xs text-gray-500">pending</p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm font-medium mb-2 uppercase tracking-wider">Outstanding Balance</p>
                  <p className="text-3xl sm:text-4xl font-bold text-amber-600 mb-1">₱{totalOutstanding.toLocaleString('en-US')}</p>
                  <p className="text-sm text-gray-500">Awaiting payment</p>
                </div>
                <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
              </motion.div>

              {/* Monthly Revenue Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="group relative bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-6 sm:p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-purple-600" />
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-purple-600">{monthlyTransactions}</p>
                      <p className="text-xs text-gray-500">transactions</p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm font-medium mb-2 uppercase tracking-wider">Monthly Revenue</p>
                  <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">₱{monthlyRevenue.toLocaleString('en-US')}</p>
                  <p className="text-sm text-gray-500">This month only</p>
                </div>
                <div className="h-1 bg-gradient-to-r from-purple-400 to-pink-400" />
              </motion.div>
            </div>

            {/* Controls Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 bg-white rounded-2xl p-6 sm:p-8 shadow-md border border-gray-100">
              <div className="w-full sm:w-auto">
                <label className="block text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
                  📅 Select Month for Report
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors w-full sm:w-auto"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  onClick={() => generateFinancialPDF(
                    { totalRevenue, totalBilled },
                    monthlyRevenue,
                    totalOutstanding,
                    treatmentBreakdown
                  )}
                  className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <Printer className="w-5 h-5" />
                  <span className="hidden sm:inline">Print PDF</span>
                  <span className="sm:hidden">PDF</span>
                </button>
                <button
                  onClick={downloadReport}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <Download className="w-5 h-5" />
                  <span className="hidden sm:inline">Export JSON</span>
                  <span className="sm:hidden">JSON</span>
                </button>
              </div>
            </div>

            {/* Treatment Breakdown - Premium Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-md p-6 sm:p-8 border border-gray-100"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Treatment Revenue Breakdown</h2>
                  <p className="text-sm text-gray-500">Revenue by service type</p>
                </div>
              </div>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hover">
                {Object.entries(treatmentBreakdown)
                  .sort(([, a], [, b]) => b.revenue - a.revenue)
                  .map(([treatment, data], index) => {
                    const percentage = totalBilled > 0 ? (data.revenue / totalBilled) * 100 : 0;
                    return (
                      <motion.div
                        key={treatment}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group p-5 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl hover:from-emerald-50 hover:to-teal-50 transition-all duration-300 border border-gray-100 hover:border-emerald-200 cursor-default"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="font-bold text-gray-900 text-lg">{treatment}</p>
                            <p className="text-sm text-gray-600 mt-1">{data.count} procedure{data.count !== 1 ? 's' : ''} • {percentage.toFixed(1)}% of total</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-emerald-600 text-xl">₱{data.revenue.toLocaleString('en-US')}</p>
                            <p className="text-xs text-gray-500 mt-1">Total revenue</p>
                          </div>
                        </div>
                        <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                          />
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </motion.div>
          </div>
        )}

        {/* Details View */}
        {viewType === 'details' && (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-md p-6 sm:p-8 border border-gray-100"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
                  <p className="text-sm text-gray-500">Complete record of all procedures</p>
                </div>
              </div>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto scrollbar-hover">
                {treatmentRecords.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No transaction records available</p>
                  </div>
                ) : (
                  treatmentRecords
                    .slice()
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((record, index) => {
                      const patient = patients.find(p => String(p.id) === String(record.patientId));
                      return (
                        <motion.div
                          key={record.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group p-5 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl hover:from-emerald-50 hover:to-teal-50 transition-all duration-300 border border-gray-100 hover:border-emerald-200"
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-200 to-teal-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <FileText className="w-5 h-5 text-emerald-700" />
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900">{patient?.name || 'Unknown Patient'}</p>
                                  <p className="text-sm text-gray-600">{record.treatment}</p>
                                </div>
                              </div>
                              <div className="ml-13 space-y-1 text-sm text-gray-600">
                                {record.tooth && (
                                  <p>🦷 Tooth: <span className="font-medium text-gray-900">{record.tooth}</span></p>
                                )}
                                <p>👨‍⚕️ Dr. {record.dentist}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500 font-medium mb-2 uppercase">📅 {formatToDD_MM_YYYY(record.date)}</p>
                              <p className="text-3xl font-bold text-emerald-600">₱{record.cost.toLocaleString('en-US')}</p>
                              <button
                                onClick={() => patient && generateReceipt(patient, record, payments)}
                                className="mt-3 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 ml-auto shadow-md hover:shadow-lg"
                              >
                                <Printer className="w-4 h-4" />
                                Receipt
                              </button>
                            </div>
                          </div>
                          {record.notes && (
                            <div className="p-3 bg-white rounded-lg border-l-4 border-amber-400">
                              <p className="text-sm text-gray-700"><span className="font-semibold">Note:</span> {record.notes}</p>
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Patient Balances View */}
        {viewType === 'patients' && (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-md p-6 sm:p-8 border border-gray-100"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Patient Account Balances</h2>
                  <p className="text-sm text-gray-500">Overview of all patient accounts</p>
                </div>
              </div>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hover">
                {patientBalances.filter(pb => pb.totalBilled > 0).length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No patient billing records available</p>
                  </div>
                ) : (
                  patientBalances
                    .filter(pb => pb.totalBilled > 0)
                    .sort((a, b) => b.balance - a.balance)
                    .map((pb, index) => {
                      const balanceStatus = pb.balance > 0 ? 'overdue' : 'paid';
                      return (
                        <motion.div
                          key={pb.patientId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group relative bg-white rounded-xl p-5 sm:p-6 border-2 border-gray-100 hover:border-emerald-200 transition-all duration-300 overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-full -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="relative">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                              <div>
                                <p className="font-bold text-gray-900 text-lg">{pb.patientName}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">ID:</span>
                                  <span className="text-sm font-mono text-gray-600">{pb.patientId}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-sm font-bold uppercase tracking-wider px-3 py-1 rounded-full inline-block ${
                                  balanceStatus === 'paid'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {balanceStatus === 'paid' ? '✓ Paid Up' : '⚠ Pending'}
                                </div>
                                <p className={`text-3xl font-bold mt-2 ${pb.balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                  ₱{Math.abs(pb.balance).toLocaleString('en-US')}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">{pb.balance > 0 ? 'Awaiting' : 'Settled'}</p>
                              </div>
                            </div>
                            
                            {/* Balance Breakdown Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-5">
                              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-100">
                                <p className="text-xs text-gray-600 mb-2 uppercase font-semibold tracking-wider">Billed</p>
                                <p className="text-xl font-bold text-blue-700">₱{pb.totalBilled.toLocaleString('en-US')}</p>
                              </div>
                              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-100">
                                <p className="text-xs text-gray-600 mb-2 uppercase font-semibold tracking-wider">Paid</p>
                                <p className="text-xl font-bold text-green-700">₱{pb.totalPaid.toLocaleString('en-US')}</p>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-5">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold text-gray-600">Collection Progress</span>
                                <span className="text-xs font-bold text-emerald-600">{((pb.totalPaid / pb.totalBilled) * 100).toFixed(1)}%</span>
                              </div>
                              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(pb.totalPaid / pb.totalBilled) * 100}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                                />
                              </div>
                            </div>

                            {/* Action Button */}
                            {pb.balance > 0 && (
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  setSelectedPatientId(pb.patientId);
                                  setSelectedTreatmentId('');
                                  setPaymentAmount('');
                                  setShowPaymentForm(true);
                                  setViewType('payments');
                                }}
                                className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
                              >
                                💳 Record Payment
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Payments View */}
        {viewType === 'payments' && (
          <div className="space-y-8">
            {/* Record Payment Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-md p-6 sm:p-8 border border-gray-100"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center">
                  <Plus className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Record Patient Payment</h2>
                  <p className="text-sm text-gray-500 mt-1">Update patient account with payment</p>
                </div>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Patient Selection */}
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">
                      👤 Search Patient
                    </label>
                    <PatientSearchInput
                      patients={patients}
                      selectedPatientId={selectedPatientId}
                      onSelectPatient={(id) => {
                        setSelectedPatientId(id);
                        setSelectedTreatmentId('');
                      }}
                      placeholder="Search patient name or ID..."
                      required
                    />
                  </div>

                  {/* Procedure Selection */}
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">
                      🦷 Procedure with Remaining Balance
                    </label>
                    <select
                      value={selectedTreatmentId}
                      onChange={(e) => setSelectedTreatmentId(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all duration-300"
                      disabled={!selectedPatientId}
                    >
                      <option value="">-- Select a procedure --</option>
                      {selectedPatientId && treatmentRecords
                        .filter(t => String(t.patientId) === selectedPatientId && (t.remainingBalance !== undefined ? Number(t.remainingBalance) > 0 : Number(t.cost || 0) > 0))
                        .map(treatment => (
                          <option key={treatment.id} value={treatment.id}>
                            {treatment.treatment} - Balance: ₱{(treatment.remainingBalance !== undefined ? Number(treatment.remainingBalance) : Number(treatment.cost || 0)).toLocaleString()}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Remaining Balance Display */}
                  {selectedTreatmentId && (() => {
                    const selected = treatmentRecords.find(t => t.id === selectedTreatmentId);
                    return selected ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="md:col-span-2 p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl"
                      >
                        <p className="text-sm text-gray-600 uppercase font-bold tracking-wider mb-2">💰 Remaining Balance</p>
                        <p className="text-4xl font-bold text-blue-600">₱{(selected.remainingBalance !== undefined ? Number(selected.remainingBalance) : Number(selected.cost || 0)).toLocaleString()}</p>
                        <p className="text-sm text-gray-600 mt-2">Total procedure cost: ₱{Number(selected.cost).toLocaleString()}</p>
                      </motion.div>
                    ) : null;
                  })()}

                  {/* Payment Amount */}
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">
                      💵 Payment Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-2xl text-gray-400">₱</span>
                      <input
                        type="number"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all duration-300 text-lg"
                      />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">
                      💳 Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all duration-300"
                    >
                      <option value="cash">💵 Cash</option>
                      <option value="card">💳 Credit/Debit Card</option>
                      <option value="check">📄 Check</option>
                      <option value="bank_transfer">🏦 Bank Transfer</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">
                      📝 Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Add any payment notes or reference..."
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all duration-300"
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl uppercase tracking-wider"
                >
                  ✓ Record Payment
                </motion.button>
              </form>
            </motion.div>

            {/* Payment History */}
            {payments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-md p-6 sm:p-8 border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Recent Payments</h2>
                    <p className="text-sm text-gray-500 mt-1">Last 10 payment transactions</p>
                  </div>
                </div>
                <div className="space-y-3 max-h-[50vh] overflow-y-auto scrollbar-hover">
                  {payments.slice(-10).reverse().map((payment, index) => {
                    const patient = patients.find(p => String(p.id) === String(payment.patientId));
                    return (
                      <motion.div
                        key={payment.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group p-5 bg-gradient-to-r from-slate-50 to-emerald-50 rounded-xl border-l-4 border-emerald-500 hover:from-emerald-50 hover:to-teal-50 transition-all duration-300 border border-emerald-100 hover:border-emerald-300"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-emerald-200 to-teal-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Plus className="w-5 h-5 text-emerald-700" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{patient?.name || 'Unknown Patient'}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  📅 {formatToDD_MM_YYYY(payment.paymentDate)} • 
                                  <span className="ml-1 font-medium">{payment.paymentMethod.replace(/_/g, ' ').toUpperCase()}</span>
                                </p>
                              </div>
                            </div>
                            {payment.notes && (
                              <p className="text-sm text-gray-700 px-13">📝 {payment.notes}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-2 px-13">Recorded by: {payment.recordedBy}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-3xl font-bold text-emerald-600 mb-2">
                              +₱{payment.amount.toLocaleString('en-US')}
                            </p>
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full inline-block uppercase tracking-wider ${
                              payment.status === 'paid'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {payment.status === 'paid' ? '✓ Paid' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
