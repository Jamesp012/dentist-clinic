import { useState } from 'react';
import { Patient, TreatmentRecord, Payment } from '../App';
import { TrendingUp, TrendingDown, Calendar, FileText, Download, PieChart, BarChart3, Plus, X, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PesoSign } from './icons/PesoSign';
import { generateReceipt, generatePatientHistoryPDF, generateFinancialPDF } from '../utils/pdfGenerator';

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
    
    // Use actual payment data from treatment records
    const totalPaid = patientRecords.reduce((sum, r) => {
      if (r.amountPaid !== undefined) {
        return sum + Number(r.amountPaid || 0);
      }
      return sum;
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

  // Calculate monthly revenue
  const monthlyRecords = treatmentRecords.filter(record => {
    const recordMonth = record.date.slice(0, 7);
    return recordMonth === selectedMonth;
  });

  const monthlyRevenue = monthlyRecords.reduce((sum, record) => sum + Number(record.cost || 0), 0);
  const monthlyTransactions = monthlyRecords.length;

  // Calculate total outstanding balance
  const totalOutstanding = patientBalances.reduce((sum, pb) => sum + Number(pb.balance || 0), 0);

  // Calculate totals
  const totalBilled = treatmentRecords.reduce((sum, record) => sum + Number(record.cost || 0), 0);
  const totalRevenue = patientBalances.reduce((sum, pb) => sum + Number(pb.totalPaid || 0), 0);

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
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl mb-2">Financial Report</h1>
              <p className="text-gray-600">Comprehensive financial overview and patient billing</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => generateFinancialPDF(
                  { totalRevenue, totalBilled },
                  monthlyRevenue,
                  totalOutstanding,
                  treatmentBreakdown
                )}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                <Printer className="w-5 h-5" />
                Print PDF Report
              </button>
              <button
                onClick={downloadReport}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Export JSON
              </button>
            </div>
          </div>

          {/* View Type Tabs */}
          <div className="flex gap-2 bg-white p-2 rounded-lg shadow-sm">
            <button
              onClick={() => setViewType('summary')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                viewType === 'summary'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <PieChart className="w-5 h-5 inline-block mr-2" />
              Summary
            </button>
            <button
              onClick={() => setViewType('details')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                viewType === 'details'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-5 h-5 inline-block mr-2" />
              Details
            </button>
            <button
              onClick={() => setViewType('patients')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                viewType === 'patients'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-5 h-5 inline-block mr-2" />
              Patient Balances
            </button>
            <button
              onClick={() => setViewType('payments')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                viewType === 'payments'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Plus className="w-5 h-5 inline-block mr-2" />
              Record Payment
            </button>
          </div>
        </div>

        {/* Summary View */}
        {viewType === 'summary' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <PesoSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl">₱{totalRevenue.toLocaleString('en-US')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-green-600 mt-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>All time (Paid)</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <PesoSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Billed</p>
                    <p className="text-2xl">₱{totalBilled.toLocaleString('en-US')}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {((totalRevenue / totalBilled) * 100).toFixed(1)}% collection rate
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-red-500"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Outstanding Balance</p>
                    <p className="text-2xl text-red-600">₱{totalOutstanding.toLocaleString('en-US')}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {patientBalances.filter(pb => pb.balance > 0).length} patients with balance
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Monthly Revenue</p>
                    <p className="text-2xl">₱{monthlyRevenue.toLocaleString('en-US')}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {monthlyTransactions} transactions this month
                </p>
              </motion.div>
            </div>

            {/* Month Selector */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Month for Report
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Treatment Breakdown */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl mb-4">Treatment Revenue Breakdown</h2>
              <div className="space-y-3">
                {Object.entries(treatmentBreakdown)
                  .sort(([, a], [, b]) => b.revenue - a.revenue)
                  .map(([treatment, data]) => {
                    const percentage = totalBilled > 0 ? (data.revenue / totalBilled) * 100 : 0;
                    return (
                      <div key={treatment} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <p className="font-medium">{treatment}</p>
                            <p className="text-sm text-gray-600">{data.count} procedures</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₱{data.revenue.toLocaleString('en-US')}</p>
                            <p className="text-sm text-gray-600">{percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Details View */}
        {viewType === 'details' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl mb-4">Transaction History</h2>
              <div className="space-y-2">
                {treatmentRecords
                  .slice()
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(record => {
                    const patient = patients.find(p => String(p.id) === String(record.patientId));
                    return (
                      <div key={record.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{patient?.name || 'Unknown Patient'}</p>
                            <p className="text-sm text-gray-600">{record.treatment}</p>
                            {record.tooth && (
                              <p className="text-sm text-gray-500">Tooth: {record.tooth}</p>
                            )}
                            <p className="text-sm text-gray-500">Dr. {record.dentist}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600 mb-1">
                              {new Date(record.date).toLocaleDateString()}
                            </p>
                            <p className="text-lg font-semibold">₱{record.cost.toLocaleString('en-US')}</p>
                            <button
                              onClick={() => patient && generateReceipt(patient, record, payments)}
                              className="mt-2 px-3 py-1 bg-teal-600 text-white text-xs rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 ml-auto"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Receipt
                            </button>
                          </div>
                        </div>
                        {record.notes && (
                          <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200">
                            {record.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                {treatmentRecords.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No transaction records available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Patient Balances View */}
        {viewType === 'patients' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl mb-4">Patient Account Balances</h2>
              <div className="space-y-2">
                {patientBalances
                  .filter(pb => pb.totalBilled > 0)
                  .sort((a, b) => b.balance - a.balance)
                  .map(pb => (
                    <div key={pb.patientId} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium">{pb.patientName}</p>
                          <p className="text-sm text-gray-600">Patient ID: {pb.patientId}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-medium ${pb.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            Balance: ₱{pb.balance.toLocaleString('en-US')}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-gray-600 mb-1">Total Billed</p>
                          <p className="font-medium">₱{pb.totalBilled.toLocaleString('en-US')}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-gray-600 mb-1">Total Paid</p>
                          <p className="font-medium text-green-600">₱{pb.totalPaid.toLocaleString('en-US')}</p>
                        </div>
                        <div className="p-3 bg-gray-100 rounded-lg">
                          <p className="text-gray-600 mb-1">Payment Rate</p>
                          <p className="font-medium">{((pb.totalPaid / pb.totalBilled) * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {pb.balance > 0 && (
                          <button
                            onClick={() => {
                              setSelectedPatientId(pb.patientId);
                              setSelectedTreatmentId('');
                              setPaymentAmount('');
                              setShowPaymentForm(true);
                              setViewType('payments');
                            }}
                            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition-colors"
                          >
                            Update Balance
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const patient = patients.find(p => String(p.id) === String(pb.patientId));
                            const records = treatmentRecords.filter(r => String(r.patientId) === String(pb.patientId));
                            if (patient) generatePatientHistoryPDF(patient, records);
                          }}
                          className={`${pb.balance > 0 ? 'flex-1' : 'w-full'} px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-medium transition-colors flex items-center justify-center gap-2`}
                        >
                          <Printer className="w-4 h-4" />
                          Print History
                        </button>
                      </div>
                    </div>
                  ))}
                {patientBalances.filter(pb => pb.totalBilled > 0).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No patient billing records available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payments View */}
        {viewType === 'payments' && (
          <div className="space-y-6">
            {/* Record Payment Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-xl shadow-lg"
            >
              <div className="flex items-center gap-3 mb-6">
                <Plus className="w-6 h-6 text-emerald-600" />
                <h2 className="text-2xl font-bold">Record Patient Payment</h2>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Patient Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Patient</label>
                    <select
                      value={selectedPatientId}
                      onChange={(e) => {
                        setSelectedPatientId(e.target.value);
                        setSelectedTreatmentId('');  // Reset procedure selection when patient changes
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors"
                    >
                      <option value="">-- Select a patient --</option>
                      {patients.map(patient => (
                        <option key={patient.id} value={patient.id.toString()}>
                          {patient.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Procedure Selection - Show procedures with remaining balance */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Procedure with Remaining Balance</label>
                    <select
                      value={selectedTreatmentId}
                      onChange={(e) => setSelectedTreatmentId(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors"
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
                      <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                        <p className="text-sm text-gray-600">Remaining Balance</p>
                        <p className="text-2xl font-bold text-blue-600">₱{(selected.remainingBalance !== undefined ? Number(selected.remainingBalance) : Number(selected.cost || 0)).toLocaleString()}</p>
                      </div>
                    ) : null;
                  })()}

                  {/* Payment Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount (₱)</label>
                    <input
                      type="number"
                      step="1"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Credit/Debit Card</option>
                      <option value="check">Check</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Add any notes"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg font-semibold transition-all duration-300"
                >
                  Record Payment
                </button>
              </form>
            </motion.div>

            {/* Payment History */}
            {payments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-xl shadow-lg"
              >
                <h2 className="text-xl font-bold mb-6">Recent Payments</h2>
                <div className="space-y-3">
                  {payments.slice(-10).reverse().map(payment => {
                    const patient = patients.find(p => String(p.id) === String(payment.patientId));
                    return (
                      <div key={payment.id} className="p-4 bg-gray-50 rounded-lg border-l-4 border-emerald-500">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{patient?.name || 'Unknown Patient'}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(payment.paymentDate).toLocaleDateString()} • {payment.paymentMethod.replace('_', ' ')}
                            </p>
                            {payment.notes && <p className="text-sm text-gray-700 mt-1">Note: {payment.notes}</p>}
                            <p className="text-xs text-gray-500 mt-1">Recorded by: {payment.recordedBy}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-emerald-600">
                              +₱{payment.amount.toLocaleString('en-US')}
                            </p>
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded inline-block mt-1 capitalize">
                              {payment.status}
                            </span>
                          </div>
                        </div>
                      </div>
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
