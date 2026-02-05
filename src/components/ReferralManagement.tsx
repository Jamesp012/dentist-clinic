import { useState } from 'react';
import { ArrowRight, ArrowLeft, FileText, User, Calendar, AlertCircle, CheckCircle, Clock, Shield, Download } from 'lucide-react';
import { Referral, Patient } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { generateReferralPDF } from '../utils/referralPdfGenerator';

interface ReferralManagementProps {
  referrals: Referral[];
  patients: Patient[];
  currentUserName?: string;
}

type ReferralFilter = 'all' | 'incoming' | 'outgoing';

export function ReferralManagement({ referrals, patients, currentUserName = 'Doc Maaño' }: ReferralManagementProps) {
  const [filterType, setFilterType] = useState<ReferralFilter>('all');
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);

  // Categorize referrals
  const incomingReferrals = referrals.filter(
    r => r.referralType === 'incoming' || (r.createdByRole === 'patient' && r.referredByContact)
  );

  const outgoingReferrals = referrals.filter(
    r => r.referralType === 'outgoing' || r.createdByRole === 'staff'
  );

  // Apply filter
  const displayedReferrals = filterType === 'incoming'
    ? incomingReferrals
    : filterType === 'outgoing'
    ? outgoingReferrals
    : referrals;

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'urgent':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'routine':
      default:
        return 'bg-green-100 text-green-700 border-green-300';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return <AlertCircle className="w-4 h-4" />;
      case 'urgent':
        return <Clock className="w-4 h-4" />;
      case 'routine':
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getSpecialtyColor = (specialty: string) => {
    if (specialty === 'X-Ray Imaging' || specialty === 'X-Ray') {
      return 'bg-cyan-50 border-cyan-200';
    }
    return 'bg-amber-50 border-amber-200';
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${
            filterType === 'all'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          All Referrals
          <span className="ml-2 text-xs opacity-75">({referrals.length})</span>
        </button>

        <button
          onClick={() => setFilterType('incoming')}
          className={`px-4 py-2.5 rounded-lg transition-all font-medium text-sm flex items-center gap-2 ${
            filterType === 'incoming'
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Incoming
          <span className="ml-2 text-xs opacity-75">({incomingReferrals.length})</span>
        </button>

        <button
          onClick={() => setFilterType('outgoing')}
          className={`px-4 py-2.5 rounded-lg transition-all font-medium text-sm flex items-center gap-2 ${
            filterType === 'outgoing'
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <ArrowRight className="w-4 h-4" />
          Outgoing
          <span className="ml-2 text-xs opacity-75">({outgoingReferrals.length})</span>
        </button>
      </div>

      {/* Referrals Grid */}
      <div className="grid gap-4">
        <AnimatePresence mode="wait">
          {displayedReferrals.length > 0 ? (
            <>
              {displayedReferrals
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((referral, idx) => {
                  const isIncoming = incomingReferrals.some(r => r.id === referral.id);
                  const patient = patients.find(p => String(p.id) === referral.patientId);

                  return (
                    <motion.div
                      key={referral.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`p-5 border-l-4 rounded-lg transition-all hover:shadow-md ${
                        isIncoming
                          ? 'border-l-green-500 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
                          : 'border-l-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200'
                      }`}
                    >
                      {/* Header with Direction Badge */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {isIncoming ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              <ArrowLeft className="w-3.5 h-3.5" />
                              Incoming Referral
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                              <ArrowRight className="w-3.5 h-3.5" />
                              Outgoing Referral
                            </div>
                          )}

                          {/* Urgency Badge */}
                          <div
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${getUrgencyColor(
                              referral.urgency
                            )}`}
                          >
                            {getUrgencyIcon(referral.urgency)}
                            <span className="capitalize">{referral.urgency}</span>
                          </div>
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {new Date(referral.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </div>

                      {/* Main Content */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        {/* Patient Information */}
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">Patient</p>
                          <div className="flex items-start gap-2">
                            <User className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800">{referral.patientName}</p>
                              {patient && (
                                <p className="text-xs text-gray-600">
                                  DOB: {new Date(patient.dateOfBirth).toLocaleDateString('en-GB')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Referral Direction */}
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">
                            {isIncoming ? 'Referred From' : 'Referred To'}
                          </p>
                          <div>
                            <p className="font-semibold text-gray-800">
                              {isIncoming ? referral.referringDentist : referral.referredTo}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              Specialty: {referral.specialty || 'General'}
                            </p>
                          </div>
                        </div>

                        {/* Reason */}
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">Reason for Referral</p>
                          <p className="text-sm text-gray-800 line-clamp-2">{referral.reason || 'No specific reason provided'}</p>
                        </div>
                      </div>

                      {/* Footer with Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-opacity-20 border-gray-400">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Shield className="w-4 h-4" />
                          {isIncoming ? 'From' : 'By'}: {referral.referringDentist}
                        </div>
                        <button
                          onClick={() => generateReferralPDF(referral, patient)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded transition-colors text-sm font-medium text-gray-700"
                        >
                          <Download className="w-4 h-4" />
                          Export PDF
                        </button>
                      </div>

                      {/* Uploaded Files Indicator */}
                      {referral.uploadedFiles && referral.uploadedFiles.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-opacity-20 border-gray-400">
                          <p className="text-xs font-medium text-gray-600 mb-2">
                            Attached Files ({referral.uploadedFiles.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {referral.uploadedFiles.map(file => (
                              <div key={file.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white rounded-full text-xs border border-gray-200">
                                <FileText className="w-3.5 h-3.5 text-gray-500" />
                                <span className="font-medium text-gray-700">{file.fileName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 font-medium">
                {filterType === 'incoming'
                  ? 'No incoming referrals yet'
                  : filterType === 'outgoing'
                  ? 'No outgoing referrals yet'
                  : 'No referrals available'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {filterType === 'incoming'
                  ? 'Referrals from other doctors will appear here'
                  : filterType === 'outgoing'
                  ? 'Create new referrals to send to other specialists'
                  : 'Start creating referrals to manage them here'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
