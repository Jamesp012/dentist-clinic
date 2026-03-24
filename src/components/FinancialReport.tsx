import { useState } from 'react';
import { Patient, TreatmentRecord, Payment } from '../App';
import { TrendingUp, TrendingDown, Calendar, FileText, Download, PieChart, BarChart3, Plus, X, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PesoSign } from './icons/PesoSign';
import { generateReceipt, generatePatientHistoryPDF, generateFinancialPDF } from '../utils/pdfGenerator';
import { PatientSearchInput } from './PatientSearchInput';
import { formatToDD_MM_YYYY } from '../utils/dateHelpers';
import { treatmentRecordAPI, paymentAPI } from '../api';

type FinancialReportProps = {
  patients: Patient[];
  treatmentRecords: TreatmentRecord[];
  setTreatmentRecords: (records: TreatmentRecord[]) => void;
  payments: Payment[];
  setPayments: (payments: Payment[]) => void;
  currentUser?: any;
  onDataChanged?: () => Promise<void>;
};

type PatientBalance = {
  patientId: string;
  patientName: string;
  totalBilled: number;
  totalPaid: number;
  balance: number;
};

export function FinancialReport({ patients, treatmentRecords, setTreatmentRecords, payments, setPayments, currentUser, onDataChanged }: FinancialReportProps) {
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
    if (!record.date) return false;  // Skip records with null/undefined date
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

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatientId || !selectedTreatmentId || !paymentAmount) {
      alert('Please select a patient, procedure, and enter payment amount');
      return;
    }

    // Fix: Convert IDs to strings for proper comparison
    const treatment = treatmentRecords.find(t => String(t.id) === String(selectedTreatmentId) && String(t.patientId) === String(selectedPatientId));
    if (!treatment) {
      alert('Treatment record not found for this patient');
      return;
    }

    const paidAmount = parseFloat(paymentAmount) || 0;
    if (paidAmount <= 0) {
      alert('Payment amount must be greater than 0');
      return;
    }

    // Validate payment amount doesn't exceed remaining balance
    const remainingBalance = treatment.remainingBalance !== undefined ? Number(treatment.remainingBalance) : (Number(treatment.cost || 0) - Number(treatment.amountPaid || 0));
    if (paidAmount > remainingBalance) {
      alert(`Payment amount cannot exceed remaining balance of ₱${remainingBalance.toLocaleString()}`);
      return;
    }

    try {
      // Update the treatment record with the new payment
      const newAmountPaid = Number(treatment.amountPaid || 0) + paidAmount;
      const updatedTreatment = {
        ...treatment,
        amountPaid: newAmountPaid,
        remainingBalance: Math.max(0, Number(treatment.cost || 0) - newAmountPaid),
      };

      // STEP 1: Save treatment record update to database FIRST
      const treatmentUpdateResult = await treatmentRecordAPI.update(String(treatment.id), {
        amountPaid: newAmountPaid,
        remainingBalance: Math.max(0, Number(treatment.cost || 0) - newAmountPaid),
      }).catch(err => {
        console.error('Treatment update error:', err);
        return null;
      });

      if (!treatmentUpdateResult) {
        alert('Failed to update treatment record. Please try again.');
        return;
      }

      // STEP 2: Save payment record to database
      const paymentResult = await paymentAPI.create({
        patientId: String(selectedPatientId),
        treatmentRecordId: String(selectedTreatmentId),
        amount: paidAmount,
        paymentDate: new Date().toISOString(),
        paymentMethod: paymentMethod,
        status: 'paid',
        notes: paymentNotes,
        recordedBy: currentUser?.name || 'Unknown User'
      }).catch(err => {
        console.error('Payment create error:', err);
        return null;
      });

      if (!paymentResult) {
        alert('Failed to save payment. Please try again.');
        return;
      }

      // STEP 3: Create new payment record for local state
      const newPayment: Payment = {
        id: paymentResult.id || Date.now().toString(),
        patientId: String(selectedPatientId),
        treatmentRecordId: String(selectedTreatmentId),
        amount: paidAmount,
        paymentDate: new Date().toISOString(),
        paymentMethod: paymentMethod,
        status: 'paid',
        notes: paymentNotes,
        recordedBy: currentUser?.name || 'Unknown User'
      };

      // STEP 4: Update local state ONLY after database save succeeds
      // Update treatment records first (this is the single source of truth for balance calculations)
      const updatedRecords = treatmentRecords.map(r => 
        String(r.id) === String(selectedTreatmentId) && String(r.patientId) === String(selectedPatientId)
          ? updatedTreatment
          : r
      );
      setTreatmentRecords(updatedRecords);
      
      // Add to payments array for history display
      setPayments([...payments, newPayment]);
      
      alert('Payment recorded successfully!');
      
      // STEP 5: Refresh from server to ensure data consistency
      // This re-fetches treatmentRecords, payments, and all other data
      if (onDataChanged) {
        await onDataChanged();
      }
      
      // Reset form and navigate to Patient Balances view to show updated balance
      setSelectedPatientId('');
      setSelectedTreatmentId('');
      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentMethod('cash');
      setShowPaymentForm(false);
      setViewType('patients'); // Auto-navigate to Patient Balances view
    } catch (error: any) {
      console.error('Error recording payment:', error);
      alert('An error occurred while recording the payment. Please try again.');
    }
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-4">
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
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <PesoSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase">Revenue</p>
                    <p className="text-lg font-bold text-gray-900">₱{totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-600">+12%</span>
              </motion.div>

              {/* Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <PesoSign className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase">Billed</p>
                    <p className="text-lg font-bold text-gray-900">₱{totalBilled.toLocaleString()}</p>
                  </div>
                </div>
                <span className="text-xs text-teal-600 font-semibold">
                  {totalBilled > 0 ? ((totalRevenue / totalBilled) * 100).toFixed(0) : 0}%
                </span>
              </motion.div>

              {/* Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase">Balance</p>
                    <p className="text-lg font-bold text-gray-900">₱{totalOutstanding.toLocaleString()}</p>
                  </div>
                </div>
                <span className="text-xs text-cyan-600 font-semibold">
                  {patientBalances.filter(pb => pb.balance > 0).length}
                </span>
              </motion.div>

              {/* Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase">Monthly</p>
                    <p className="text-lg font-bold text-gray-900">₱{monthlyRevenue.toLocaleString()}</p>
                  </div>
                </div>
                <span className="text-xs text-emerald-600 font-semibold">
                  {monthlyTransactions}
                </span>
              </motion.div>
            </div>

            {/* Controls Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border rounded-xl px-4 py-3 shadow-sm">
  
            {/* Left: Month Picker */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
                  📅 Month
                </span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-auto"
                />
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() =>
                    generateFinancialPDF(
                      { totalRevenue, totalBilled },
                      monthlyRevenue,
                      totalOutstanding,
                      treatmentBreakdown
                    )
                  }
                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all w-full sm:w-auto"
                >
                  <Printer className="w-4 h-4" />
                  <span>PDF</span>
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
              <div className="space-y-4 max-h-[50vh] overflow-y-auto scrollbar-thin">
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
              className="bg-white rounded-2xl shadow-md p-4 sm:p-6 border border-gray-100"
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
              <div className="space-y-3 max-h-[70vh] overflow-y-auto scrollbar-thin">
                {treatmentRecords.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No transaction records available</p>
                  </div>
                ) : (
                  treatmentRecords
                    .filter(record => record.date)
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
                          className="group px-3 py-2 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl hover:from-emerald-50 hover:to-teal-50 transition-all duration-300 border border-gray-100 hover:border-emerald-200"
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
                              <div className="ml-12 space-y-1 text-sm text-gray-600">
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
          <div className="h-screen flex flex-col overflow-hidden bg-gray-50">

            {/* 🔹 TOP SECTION (cards, filters, etc.) */}
            <div className="flex-shrink-0 p-4 space-y-4">
              
              {/* Example: Your compact controls */}
              <div className="bg-white border rounded-xl px-4 py-3 shadow-sm flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-600">Dashboard</span>
              </div>

              {/* Example: Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-lg shadow-sm">Card 1</div>
                <div className="bg-white p-3 rounded-lg shadow-sm">Card 2</div>
                <div className="bg-white p-3 rounded-lg shadow-sm">Card 3</div>
                <div className="bg-white p-3 rounded-lg shadow-sm">Card 4</div>
              </div>

            </div>

            {/* 🔹 MAIN CONTENT (THIS FIXES OVERFLOW) */}
            <div className="flex-1 min-h-0 px-4 pb-4">
              
              <div className="h-full flex flex-col min-h-0">
                
                {/* CARD CONTAINER */}
                <div className="flex flex-col flex-1 min-h-0 bg-white rounded-xl border shadow-sm overflow-hidden">
                  
                  {/* HEADER */}
                  <div className="flex items-center gap-3 p-4 border-b flex-shrink-0">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold text-gray-900 truncate">
                        Patient Balances
                      </h2>
                      <p className="text-xs text-gray-500 truncate">
                        Account overview
                      </p>
                    </div>
                  </div>

                  {/* 🔥 SCROLLABLE CONTENT */}
                  <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-3">

                    {patientBalances.filter(pb => pb.balance > 0).length === 0 ? (
                      <div className="text-center py-10 text-gray-500">
                        <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No outstanding balances</p>
                      </div>
                    ) : (
                      patientBalances
                        .filter(pb => pb.balance > 0)
                        .sort((a, b) => b.balance - a.balance)
                        .map((pb, index) => {
                          const progress =
                            pb.totalBilled > 0
                              ? (pb.totalPaid / pb.totalBilled) * 100
                              : 0;

                          return (
                            <div
                              key={pb.patientId}
                              className="bg-gray-50 rounded-lg p-3 border flex flex-col gap-3"
                            >

                              {/* TOP ROW */}
                              <div className="flex justify-between items-start gap-2 flex-wrap">
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm text-gray-900 truncate">
                                    {pb.patientName}
                                  </p>
                                  <p className="text-[10px] text-gray-500 truncate">
                                    ID: {pb.patientId}
                                  </p>
                                </div>

                                <div className="text-right">
                                  <p className="text-sm font-bold text-amber-600">
                                    ₱{pb.balance.toLocaleString()}
                                  </p>
                                  <p className="text-[10px] text-gray-400">
                                    Pending
                                  </p>
                                </div>
                              </div>

                              {/* STATS */}
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-blue-50 rounded p-2">
                                  <p className="text-gray-500">Billed</p>
                                  <p className="font-semibold text-blue-700">
                                    ₱{pb.totalBilled.toLocaleString()}
                                  </p>
                                </div>
                                <div className="bg-green-50 rounded p-2">
                                  <p className="text-gray-500">Paid</p>
                                  <p className="font-semibold text-green-700">
                                    ₱{pb.totalPaid.toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              {/* PROGRESS */}
                              <div>
                                <div className="flex justify-between text-[10px] mb-1">
                                  <span>Progress</span>
                                  <span>{progress.toFixed(0)}%</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>

                              {/* BUTTON */}
                              {pb.balance > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedPatientId(pb.patientId);
                                    setShowPaymentForm(true);
                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                  }}
                                  className="text-xs py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md"
                                >
                                  Pay
                                </button>
                              )}

                            </div>
                          );
                        })
                    )}

                  </div>
                </div>
              </div>
            </div>
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
                        .filter(t => String(t.patientId) === String(selectedPatientId) && (t.remainingBalance !== undefined ? Number(t.remainingBalance) > 0 : Number(t.cost || 0) > 0))
                        .map(treatment => (
                          <option key={treatment.id} value={treatment.id}>
                            {treatment.treatment} - Balance: ₱{(treatment.remainingBalance !== undefined ? Number(treatment.remainingBalance) : Number(treatment.cost || 0)).toLocaleString()}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Remaining Balance Display */}
                  {selectedTreatmentId && (() => {
                    const selected = treatmentRecords.find(t => String(t.id) === String(selectedTreatmentId));
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
                      <option value="card">💳 Card</option>
                      <option value="check">📝 Check</option>
                      <option value="bank_transfer">🏦 Bank Transfer</option>
                    </select>
                  </div>

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
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all duration-300 text-lg no-spinners"
                      />
                    </div>
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
                <div className="space-y-3 max-h-[50vh] overflow-y-auto scrollbar-thin">
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
