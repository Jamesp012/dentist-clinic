import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { Referral, Patient } from '../App';
import { toast } from 'sonner';
import { referralAPI } from '../api';


type ReferralType = 'doctor' | 'xray' | null;

interface ReferralGenerationProps {
  referrals: Referral[];
  setReferrals: (referrals: Referral[]) => void;
  patients: Patient[];
}

export function ReferralGeneration({ referrals, setReferrals, patients }: ReferralGenerationProps) {
  const [referralType, setReferralType] = useState<ReferralType>(null);
  const [showTypeSelection, setShowTypeSelection] = useState(false);
  const [selectedServices, setSelectedServices] = useState<Record<string, boolean>>({});
  const [selectedXrayItems, setSelectedXrayItems] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    patientName: '',
    patientId: '',
    contactNo: '',
    age: '',
    dateOfBirth: '',
    sex: '',
    referredBy: '',
    referredByContact: '',
    referredByEmail: '',
    specialty: '',
    reason: '',
    date: new Date().toISOString().split('T')[0],
    urgency: 'routine' as 'routine' | 'urgent' | 'emergency'
  });

  const toggleService = (id: string) => {
    setSelectedServices(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleXrayItem = (id: string) => {
    setSelectedXrayItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePatientSelect = (patientId: string) => {
    const patient = patients.find(p => String(p.id) === patientId);
    if (patient) {
      const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
      setFormData(prev => ({
        ...prev,
        patientId,
        patientName: patient.name,
        contactNo: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        age: String(age),
        sex: patient.sex
      }));
    }
  };

  const handleCreateReferral = async () => {
    if (!formData.patientName) {
      toast.error('Please select a patient');
      return;
    }

    try {
      const newReferral: Referral = {
        id: `REF-${Date.now()}`,
        patientId: formData.patientId,
        patientName: formData.patientName,
        referringDentist: formData.referredBy,
        referredTo: formData.specialty,
        specialty: referralType === 'xray' ? 'X-Ray Imaging' : formData.specialty,
        reason: formData.reason,
        date: formData.date,
        urgency: formData.urgency
      };

      const response = await referralAPI.create(newReferral);
      setReferrals([...referrals, response]);
      
      resetForm();
      setReferralType(null);
      setShowTypeSelection(false);
      toast.success('Referral created successfully');
    } catch (error) {
      console.error('Failed to create referral:', error);
      toast.error('Failed to create referral');
    }
  };

  const resetForm = () => {
    setFormData({
      patientName: '',
      patientId: '',
      contactNo: '',
      age: '',
      dateOfBirth: '',
      sex: '',
      referredBy: '',
      referredByContact: '',
      referredByEmail: '',
      specialty: '',
      reason: '',
      date: new Date().toISOString().split('T')[0],
      urgency: 'routine'
    });
    setSelectedServices({});
    setSelectedXrayItems({});
  };

  const ServiceItem = ({ label, id, showInput }: { label: string; id: string; showInput?: boolean }) => (
    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleService(id)}>
      <div className={`w-5 h-5 rounded-full border-2 border-yellow-400 flex items-center justify-center transition-colors ${selectedServices[id] ? "bg-yellow-400" : "bg-white"}`}>
        {selectedServices[id] && <Check className="text-white w-3.5 h-3.5 stroke-[4]" />}
      </div>
      <span className="text-sm font-bold tracking-tight">{label}</span>
      {showInput && (
        <input 
          type="text" 
          onClick={(e) => e.stopPropagation()}
          className="w-16 border-b border-slate-400 focus:outline-none focus:border-yellow-500 bg-transparent text-sm px-1 font-normal" 
        />
      )}
    </div>
  );

  const UnderlineInput = ({ label, value, onChange, className = '' }: { label: string; value: string; onChange: (v: string) => void; className?: string }) => (
    <div className={`flex items-end ${className}`}>
      <span className="text-sm whitespace-nowrap mr-2">{label}</span>
      <input 
        type="text" 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 border-b border-slate-400 focus:outline-none focus:border-yellow-500 bg-transparent px-1 h-[20px] mb-[-1px]" 
      />
    </div>
  );

  return (
    <div className="p-8">
      {/* Type Selection Modal */}
      {showTypeSelection && referralType === null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Select Referral Type</h2>
              <button onClick={() => setShowTypeSelection(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setReferralType('doctor')}
                className="p-6 border-2 border-yellow-400 rounded-lg hover:bg-yellow-50 transition-colors text-center"
              >
                <div className="text-3xl mb-2">👨‍⚕️</div>
                <h3 className="font-bold text-lg mb-2">Doctor Referral</h3>
                <p className="text-sm text-gray-600">Refer patient to a specialist dentist</p>
              </button>

              <button
                onClick={() => setReferralType('xray')}
                className="p-6 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-center"
              >
                <div className="text-3xl mb-2">🖼️</div>
                <h3 className="font-bold text-lg mb-2">X-Ray Referral</h3>
                <p className="text-sm text-gray-600">Request X-ray imaging services</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Referral Form */}
      {referralType === 'doctor' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-lg shadow-2xl my-8">
            <div className="flex justify-between items-center p-6 border-b">
              <h1 className="text-2xl font-bold">Doctor Referral Form</h1>
              <button onClick={() => { setReferralType(null); setShowTypeSelection(false); }} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Patient Selection */}
              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">Select Patient</label>
                <select
                  value={formData.patientId}
                  onChange={(e) => handlePatientSelect(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="">-- Select a Patient --</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={String(patient.id)}>
                      {patient.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Header Form Fields */}
              <div className="space-y-3 mb-6">
                <div className="flex gap-4">
                  <UnderlineInput label="Patient's Name:" value={formData.patientName} onChange={(v) => handleInputChange('patientName', v)} className="flex-1" />
                  <UnderlineInput label="Date:" value={formData.date} onChange={(v) => handleInputChange('date', v)} className="w-48" />
                </div>
                <div className="flex gap-4">
                  <UnderlineInput label="Contact No.:" value={formData.contactNo} onChange={(v) => handleInputChange('contactNo', v)} className="flex-1" />
                  <UnderlineInput label="Age:" value={formData.age} onChange={(v) => handleInputChange('age', v)} className="w-16" />
                  <UnderlineInput label="Date Of Birth:" value={formData.dateOfBirth} onChange={(v) => handleInputChange('dateOfBirth', v)} className="w-40" />
                  <UnderlineInput label="Sex:" value={formData.sex} onChange={(v) => handleInputChange('sex', v)} className="w-16" />
                </div>
                <UnderlineInput label="Referred by:" value={formData.referredBy} onChange={(v) => handleInputChange('referredBy', v)} />
                <div className="flex gap-4">
                  <UnderlineInput label="Contact No.:" value={formData.referredByContact} onChange={(v) => handleInputChange('referredByContact', v)} className="flex-1" />
                  <UnderlineInput label="Clinic Email Address:" value={formData.referredByEmail} onChange={(v) => handleInputChange('referredByEmail', v)} className="flex-1" />
                </div>
              </div>

              {/* Services Section */}
              <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b-4 border-yellow-400">
                <div className="space-y-3">
                  <h2 className="font-black text-lg uppercase mb-4">Diagnostic Services:</h2>
                  <ServiceItem label="STANDARD PANORAMIC" id="pano" />
                  <ServiceItem label="TMJ (OPEN & CLOSE)" id="tmj" />
                  <ServiceItem label="SINUS PA" id="sinus" />
                  <ServiceItem label="BITEWING LEFT SIDE" id="bite-l" />
                  <ServiceItem label="BITEWING RIGHT SIDE" id="bite-r" />
                  <ServiceItem label="PERIAPICAL XRAY TOOTH#" id="peri" showInput />
                </div>

                <div className="space-y-3 pt-6">
                  <h2 className="font-black text-lg uppercase mb-4">OTHER SERVICES</h2>
                  <ServiceItem label="DIAGNOSTIC MODEL CAST" id="model" />
                  <ServiceItem label="INTRAORAL PHOTOGRAPH" id="intra" />
                  <ServiceItem label="EXTRAORAL PHOTOGRAPH" id="extra" />
                </div>
              </div>

              {/* Specialty & Urgency */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-bold mb-2">Specialty</label>
                  <input
                    type="text"
                    value={formData.specialty}
                    onChange={(e) => handleInputChange('specialty', e.target.value)}
                    placeholder="e.g., Orthodontics, Endodontics"
                    className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Urgency Level</label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => handleInputChange('urgency', e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Reason for Referral</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => handleInputChange('reason', e.target.value)}
                    rows={4}
                    className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t justify-end">
              <button
                onClick={() => { setReferralType(null); setShowTypeSelection(false); resetForm(); }}
                className="px-6 py-2 border border-slate-300 rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReferral}
                className="px-6 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Create Referral
              </button>
            </div>
          </div>
        </div>
      )}

      {/* X-Ray Referral Form */}
      {referralType === 'xray' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-lg shadow-2xl my-8">
            <div className="flex justify-between items-center p-6 border-b">
              <h1 className="text-2xl font-bold">X-Ray Referral Form</h1>
              <button onClick={() => { setReferralType(null); setShowTypeSelection(false); }} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto space-y-6">
              {/* Patient Selection */}
              <div>
                <label className="block text-sm font-bold mb-2">Select Patient</label>
                <select
                  value={formData.patientId}
                  onChange={(e) => handlePatientSelect(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a Patient --</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={String(patient.id)}>
                      {patient.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Patient Fields */}
              <div className="space-y-3 border-b pb-6">
                <UnderlineInput label="Date" value={formData.date} onChange={(v) => handleInputChange('date', v)} className="w-48" />
                <UnderlineInput label="Patient's Name" value={formData.patientName} onChange={(v) => handleInputChange('patientName', v)} />
                <div className="flex gap-12">
                  <UnderlineInput label="Birthday" value={formData.dateOfBirth} onChange={(v) => handleInputChange('dateOfBirth', v)} />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sex"
                        value="Male"
                        checked={formData.sex === 'Male'}
                        onChange={(e) => handleInputChange('sex', e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="font-bold">Male</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sex"
                        value="Female"
                        checked={formData.sex === 'Female'}
                        onChange={(e) => handleInputChange('sex', e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="font-bold">Female</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-8">
                  <UnderlineInput label="Referred by Dr." value={formData.referredBy} onChange={(v) => handleInputChange('referredBy', v)} />
                  <UnderlineInput label="Dentist's Contact #" value={formData.referredByContact} onChange={(v) => handleInputChange('referredByContact', v)} />
                </div>
              </div>

              {/* X-Ray Services */}
              <div className="space-y-4">
                <h3 className="font-black text-center uppercase mb-4">X-RAY IMAGING SERVICES</h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedXrayItems['panoramic'] || false}
                      onChange={() => toggleXrayItem('panoramic')}
                      className="w-4 h-4"
                    />
                    <span className="font-bold">Panoramic X-Ray</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedXrayItems['periapical'] || false}
                      onChange={() => toggleXrayItem('periapical')}
                      className="w-4 h-4"
                    />
                    <span className="font-bold">Periapical X-Ray</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedXrayItems['bitewing'] || false}
                      onChange={() => toggleXrayItem('bitewing')}
                      className="w-4 h-4"
                    />
                    <span className="font-bold">Bitewing X-Ray</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedXrayItems['occlusal'] || false}
                      onChange={() => toggleXrayItem('occlusal')}
                      className="w-4 h-4"
                    />
                    <span className="font-bold">Occlusal X-Ray</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedXrayItems['tmj'] || false}
                      onChange={() => toggleXrayItem('tmj')}
                      className="w-4 h-4"
                    />
                    <span className="font-bold">TMJ X-Ray</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedXrayItems['cbct'] || false}
                      onChange={() => toggleXrayItem('cbct')}
                      className="w-4 h-4"
                    />
                    <span className="font-bold">CBCT (3D Imaging)</span>
                  </label>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-bold mb-2">Reason for X-Ray Imaging</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  rows={3}
                  className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the clinical indication for x-ray imaging..."
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t justify-end">
              <button
                onClick={() => { setReferralType(null); setShowTypeSelection(false); resetForm(); }}
                className="px-6 py-2 border border-slate-300 rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReferral}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create X-Ray Referral
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - List and Create Button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => { setShowTypeSelection(true); setReferralType(null); }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 font-bold"
        >
          <Plus className="w-5 h-5" />
          New Referral
        </button>
      </div>

      {/* Referrals List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {referrals.map((referral) => (
          <div key={referral.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold mb-1">{referral.patientName}</h3>
                <p className="text-sm text-gray-600">{new Date(referral.date).toLocaleDateString()}</p>
              </div>
              <span className={`px-3 py-1 rounded text-xs border font-bold ${
                referral.urgency === 'emergency' ? 'bg-red-100 text-red-700 border-red-500' :
                referral.urgency === 'urgent' ? 'bg-orange-100 text-orange-700 border-orange-500' :
                'bg-blue-100 text-blue-700 border-blue-500'
              }`}>
                {referral.urgency.toUpperCase()}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div>
                <p className="text-sm text-gray-600">Specialty</p>
                <p className="font-semibold">{referral.specialty}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Referred To</p>
                <p className="font-semibold">{referral.referredTo}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Reason</p>
                <p className="text-sm">{referral.reason.substring(0, 60)}...</p>
              </div>
            </div>
          </div>
        ))}

        {referrals.length === 0 && (
          <div className="col-span-2 bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
            <p className="text-gray-600 mb-4">No referrals created yet</p>
            <button
              onClick={() => { setShowTypeSelection(true); setReferralType(null); }}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Your First Referral
            </button>
          </div>
        )}
      </div>
    </div>
  );
}