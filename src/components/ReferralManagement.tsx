import { useState } from 'react';
import { ArrowRight, ArrowLeft, FileText, User, Calendar, AlertCircle, CheckCircle, Clock, Shield, Download, X } from 'lucide-react';
import { Referral, Patient } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { generateReferralPDF } from '../utils/referralPdfGenerator';
import { timeAgo } from '../utils/dateHelpers';

interface ReferralManagementProps {
  referrals: Referral[];
  patients: Patient[];
  currentUserName?: string;
}

type ReferralFilter = 'all' | 'incoming' | 'outgoing';

import { toast } from 'sonner';
import { getSafeFileUrl } from '../utils/fileUtils';

export function ReferralManagement({ referrals, patients, currentUserName = 'Doc Maaño' }: ReferralManagementProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewExpanded, setPreviewExpanded] = useState(false);

  const handleFileClick = (file: any) => {
    const fileUrl = getSafeFileUrl(file);
    if (!fileUrl) {
      toast.error('File URL not found');
      return;
    }

    if (file.fileType === 'image') {
      setPreviewImage(fileUrl);
      setPreviewExpanded(false);
    } else {
      window.open(fileUrl, '_blank');
    }
  }

  // Categorize referrals
  const incomingReferrals = referrals.filter(
    r => r.referralType === 'incoming' || (r.createdByRole === 'patient' && r.referredByContact)
  );

  const outgoingReferrals = referrals.filter(
    r => r.referralType === 'outgoing' || r.createdByRole === 'staff'
  );

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
      {/* Referrals Grid */}
      <div className="grid gap-4">
        <AnimatePresence mode="wait">
          {referrals.length > 0 ? (
            <>
              {referrals
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
                      className="p-6 bg-white border border-gray-200 rounded-lg transition-all hover:shadow-lg"
                    >
                      {/* Patient Name Header with Type Badge */}
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{referral.patientName}</h3>
                        <div>
                          {referral.specialty === 'X-Ray Imaging' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-700">
                              X-Ray Referral
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                              Doctor Referral
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Date */}
                      <div className="text-xs text-gray-600 mb-4">
                        {timeAgo(referral.createdAt || referral.date)}
                      </div>

                      {/* Information Grid */}
                      <div className="space-y-3 mb-4">
                        {/* Specialty */}
                        <div>
                          <p className="text-xs font-medium text-gray-500">Specialty</p>
                          <p className="text-sm text-gray-800">{referral.specialty || 'General'}</p>
                        </div>

                        {/* Referred To/By */}
                        <div>
                          <p className="text-xs font-medium text-gray-500">
                            {isIncoming ? 'Referred By' : 'Referred To'}
                          </p>
                          <p className="text-sm text-gray-800">
                            {isIncoming 
                              ? (referral.referredBy || 'N/A') 
                              : (referral.referredTo || 'N/A')}
                          </p>
                        </div>

                        {/* Reason */}
                        <div>
                          <p className="text-xs font-medium text-gray-500">Reason</p>
                          <p className="text-sm text-gray-800">{referral.reason || 'N/A...'}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => setSelectedReferral(referral)}
                          className="flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:text-gray-900 border border-gray-300 rounded transition-colors text-sm font-medium"
                        >
                          👁 View
                        </button>
                        {referral.uploadedFiles && referral.uploadedFiles.length > 0 ? (
                          referral.uploadedFiles[0].fileType === 'image' ? (
                            <button
                              onClick={() => handleFileClick(referral.uploadedFiles![0])}
                              className="flex items-center gap-2 px-3 py-1.5 text-emerald-600 hover:text-emerald-700 border border-emerald-300 rounded transition-colors text-sm font-medium"
                            >
                              🖼 View Image
                            </button>
                          ) : (
                            <a
                              href={getSafeFileUrl(referral.uploadedFiles[0])}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-1.5 text-emerald-600 hover:text-emerald-700 border border-emerald-300 rounded transition-colors text-sm font-medium no-underline decoration-0"
                            >
                              📄 Open Document
                            </a>
                          )
                        ) : (
                          <button
                            onClick={() => generateReferralPDF(referral, patient)}
                            className="flex items-center gap-2 px-3 py-1.5 text-blue-600 hover:text-blue-700 border border-blue-300 rounded transition-colors text-sm font-medium"
                          >
                            ⬇ PDF
                          </button>
                        )}
                        <button
                          className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:text-red-700 border border-red-300 rounded transition-colors text-sm font-medium"
                        >
                          🗑 Delete
                        </button>
                      </div>

                      {/* Uploaded Files Indicator */}
                      {referral.uploadedFiles && referral.uploadedFiles.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-2">
                            Attached Files ({referral.uploadedFiles.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {referral.uploadedFiles.map(file => {
                              const fileUrl = getSafeFileUrl(file);
                              return (
                                <a
                                  key={file.id}
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-full text-xs border border-gray-200 transition-colors no-underline decoration-0"
                                >
                                  {file.fileType === 'image' ? (
                                    <>
                                      <img src={fileUrl} alt={file.fileName} className="w-5 h-5 object-cover rounded" />
                                      <span className="font-medium text-gray-700">{file.fileName}</span>
                                    </>
                                  ) : (
                                    <>
                                      <FileText className="w-4 h-4 text-gray-500" />
                                      <span className="font-medium text-gray-700">{file.fileName}</span>
                                    </>
                                  )}
                                </a>
                              );
                            })}
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
              <p className="text-gray-600 font-medium">No referrals available</p>
              <p className="text-sm text-gray-500 mt-1">Start creating referrals to manage them here</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Image preview modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className="relative max-w-[95vw] max-h-[95vh]">
            <button
              onClick={(e) => { e.stopPropagation(); setPreviewImage(null); setPreviewExpanded(false); }}
              className="absolute -top-4 -right-4 z-[70] p-3 bg-white hover:bg-gray-100 rounded-full shadow-lg transition-colors border border-gray-200"
            >
              <X className="w-6 h-6 text-gray-900" />
            </button>

            <img
              src={previewImage}
              alt="Preview"
              className="block max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl bg-white"
              onClick={(e) => { e.stopPropagation(); setPreviewExpanded(prev => !prev); }}
              style={previewExpanded ? { width: '95vw', height: '95vh', cursor: 'zoom-out' } : { cursor: 'zoom-in' }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
