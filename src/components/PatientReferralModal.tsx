import React, { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { referralAPI } from '../api';

const API_BASE = 'http://localhost:5000/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientId: number | string;
  patientName?: string;
  onSaved?: () => void;
}

export const PatientReferralModal: React.FC<Props> = ({ isOpen, onClose, patientId, patientName = '', onSaved }) => {
  const [patientNameLocal, setPatientNameLocal] = useState(patientName || '');
  const [referringClinic, setReferringClinic] = useState('');
  const [referringDoctor, setReferringDoctor] = useState('');
  const [dateReferred, setDateReferred] = useState(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setPatientNameLocal(patientName || '');
    setReferringClinic('');
    setReferringDoctor('');
    setDateReferred(new Date().toISOString().split('T')[0]);
    setFile(null);
  };

  const handleSave = async () => {
    if (!patientNameLocal) {
      toast.error('Please enter patient name');
      return;
    }

    setIsSaving(true);
    try {
      let uploadedFile = null;
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('patientId', String(patientId));
        // client side fileType is not required; backend will detect
        const token = localStorage.getItem('token');
        const resp = await fetch(`${API_BASE}/referrals/upload`, { method: 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: fd });
        if (!resp.ok) throw new Error('Failed to upload file');
        uploadedFile = await resp.json();
      }

      const createBody: any = {
        patientId: patientId ? String(patientId) : null,
        patientName: patientNameLocal,
        referringDentist: referringDoctor,
        referredTo: referringClinic,
        date: dateReferred,
        createdByRole: 'patient',
        referralType: 'incoming',
        source: 'patient-uploaded',
      };

      if (uploadedFile && uploadedFile.id) {
        createBody.uploadedFileIds = [uploadedFile.id];
      }

      await referralAPI.create(createBody);
      toast.success('Referral added successfully');
      resetForm();
      onClose();
      onSaved && onSaved();
    } catch (err: any) {
      console.error('Failed to save referral', err);
      toast.error(err?.message || 'Failed to save referral');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold">Add Referral</h3>
          <button className="p-2" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium">Patient Name</label>
            <input className="w-full px-3 py-2 border rounded" value={patientNameLocal} onChange={(e) => setPatientNameLocal(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium">Dental Clinic Name (Referring Clinic)</label>
            <input className="w-full px-3 py-2 border rounded" value={referringClinic} onChange={(e) => setReferringClinic(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium">Name of Referring Doctor</label>
            <input className="w-full px-3 py-2 border rounded" value={referringDoctor} onChange={(e) => setReferringDoctor(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium">Date Referred</label>
            <input type="date" className="w-full px-3 py-2 border rounded" value={dateReferred} onChange={(e) => setDateReferred(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium">Upload Referral File (Image or PDF)</label>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t">
          <button className="px-4 py-2 rounded border" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
};

export default PatientReferralModal;
