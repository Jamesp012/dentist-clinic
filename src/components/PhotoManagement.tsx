import { useState, useEffect } from 'react';
import { Patient, PhotoUpload } from '../App';
import { Camera, Upload, Trash2, RotateCcw, X, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { photoAPI, API_BASE } from '../api';
import { formatToDD_MM_YYYY } from '../utils/dateHelpers';

type PhotoManagementProps = {
  photos: PhotoUpload[];
  patients: Patient[];
  onDataChanged?: () => Promise<void>;
};

export function PhotoManagement({ photos, patients, onDataChanged }: PhotoManagementProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientPhotos, setPatientPhotos] = useState<PhotoUpload[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoUpload | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingPhotoId, setIsDeletingPhotoId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showReplaceModal, setShowReplaceModal] = useState<string | null>(null);

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toString().includes(searchQuery)
  );

  useEffect(() => {
    if (selectedPatient) {
      const photos = patients
        .find(p => p.id === selectedPatient.id)
        ? global.photosByPatient?.[selectedPatient.id] || []
        : [];
      setPatientPhotos(
        (window as any).allPhotos?.filter((p: PhotoUpload) => String(p.patientId) === String(selectedPatient.id)) || []
      );
    }
  }, [selectedPatient, patients]);

  // Update patientPhotos from photos prop
  useEffect(() => {
    if (selectedPatient) {
      setPatientPhotos(
        photos.filter(p => String(p.patientId) === String(selectedPatient.id))
      );
    }
  }, [photos, selectedPatient]);

  const handleDeletePhoto = async (photoId: string) => {
    try {
      setIsDeletingPhotoId(photoId);
      await photoAPI.delete(photoId);
      
      setPatientPhotos(patientPhotos.filter(p => p.id !== photoId));
      setSelectedPhoto(null);
      setShowDeleteConfirm(null);
      
      toast.success('Photo deleted successfully');
      
      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Failed to delete photo:', error);
      toast.error('Failed to delete photo');
    } finally {
      setIsDeletingPhotoId(null);
    }
  };

  const handleReplacePhoto = async (photoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_BASE}/referrals/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Upload failed');
      
      const uploadedData = await response.json();
      const newUrl = uploadedData.url;

      // Update the photo with new URL
      await photoAPI.update(photoId, {
        url: newUrl,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setPatientPhotos(patientPhotos.map(p =>
        p.id === photoId ? { ...p, url: newUrl } : p
      ));

      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto({ ...selectedPhoto, url: newUrl });
      }

      setShowReplaceModal(null);
      toast.success('Photo replaced successfully');

      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Failed to replace photo:', error);
      toast.error('Failed to replace photo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Photo Management</h1>
          <p className="text-slate-600">Upload, view, and manage patient photos and X-rays</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar - Patient Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Patients</h2>
              
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Patient List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map(patient => {
                    const count = photos.filter(p => String(p.patientId) === String(patient.id)).length;
                    return (
                      <button
                        key={patient.id}
                        onClick={() => setSelectedPatient(patient)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          selectedPatient?.id === patient.id
                            ? 'bg-blue-100 border-2 border-blue-500'
                            : 'hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <p className="font-medium text-slate-900">{patient.name}</p>
                        <p className="text-sm text-slate-500">{count} photos</p>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">No patients found</p>
                )}
              </div>
            </div>
          </div>

          {/* Main Content - Photos */}
          <div className="lg:col-span-2">
            {selectedPatient ? (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">
                  Photos - {selectedPatient.name}
                </h2>

                {patientPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {patientPhotos.map(photo => (
                      <motion.div
                        key={photo.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group relative overflow-hidden rounded-lg border border-slate-200 shadow hover:shadow-lg transition-all bg-slate-50"
                      >
                        <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                          <img
                            src={photo.url}
                            alt={photo.type}
                            className="w-full h-full object-contain p-2"
                            style={{ imageRendering: 'crisp-edges' }}
                          />
                        </div>

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => {
                              setSelectedPhoto(photo);
                            }}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            title="View"
                          >
                            <Camera className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setShowReplaceModal(String(photo.id))}
                            className="p-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                            title="Replace"
                          >
                            <RotateCcw className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(String(photo.id))}
                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Badge */}
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full capitalize font-medium">
                            {photo.type}
                          </span>
                        </div>

                        {/* Date */}
                        <div className="absolute bottom-2 left-2">
                          <span className="px-2 py-1 bg-black/60 text-white text-xs rounded">
                            {formatToDD_MM_YYYY(photo.date)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Camera className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-medium text-slate-600">No photos yet</p>
                    <p className="text-sm text-slate-500">Upload photos for this patient</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium text-slate-600">Select a patient to view photos</p>
              </div>
            )}
          </div>
        </div>

        {/* Photo Viewer Modal */}
        <AnimatePresence>
          {selectedPhoto && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedPhoto(null)}
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                className="relative bg-white rounded-xl overflow-hidden flex flex-col"
                style={{ width: '90vw', height: '90vh', maxWidth: '1200px', maxHeight: '800px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 z-10"
                >
                  <X className="w-6 h-6" />
                </button>

                {/* Action Buttons */}
                <div className="absolute top-4 left-4 flex gap-2 z-10">
                  <button
                    onClick={() => setShowReplaceModal(String(selectedPhoto.id))}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Replace
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(String(selectedPhoto.id))}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>

                <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
                  <img
                    src={selectedPhoto.url}
                    alt={selectedPhoto.type}
                    className="w-full h-full object-scale-down"
                    style={{ imageRendering: 'crisp-edges', WebkitFontSmoothing: 'antialiased' }}
                  />
                </div>

                <div className="p-6 bg-white border-t border-slate-200">
                  <p className="font-semibold text-lg capitalize mb-2">{selectedPhoto.type} Photo</p>
                  <p className="text-sm text-slate-600">Date: {formatToDD_MM_YYYY(selectedPhoto.date)}</p>
                  {selectedPhoto.notes && (
                    <p className="text-sm text-slate-700 mt-2">{selectedPhoto.notes}</p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowDeleteConfirm(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl p-6 max-w-sm w-full"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Delete Photo</h3>
                </div>
                <p className="text-slate-600 mb-6">
                  Are you sure you want to delete this photo? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!showDeleteConfirm) {
                        return;
                      }
                      void handleDeletePhoto(showDeleteConfirm);
                    }}
                    disabled={isDeletingPhotoId === showDeleteConfirm}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeletingPhotoId === showDeleteConfirm ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Replace Photo Modal */}
        <AnimatePresence>
          {showReplaceModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowReplaceModal(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl p-6 max-w-sm w-full"
              >
                <h3 className="text-xl font-bold text-slate-900 mb-4">Replace Photo</h3>
                <p className="text-slate-600 mb-6">Select a new image to replace the current photo.</p>
                
                <label className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (!showReplaceModal) {
                        return;
                      }
                      void handleReplacePhoto(showReplaceModal, e);
                    }}
                    disabled={isUploading}
                    className="hidden"
                  />
                  <div className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2">
                    <Upload className="w-5 h-5" />
                    {isUploading ? 'Uploading...' : 'Choose File'}
                  </div>
                </label>

                <button
                  onClick={() => setShowReplaceModal(null)}
                  className="w-full mt-3 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
