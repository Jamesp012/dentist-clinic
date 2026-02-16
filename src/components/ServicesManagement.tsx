import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Trash2, Check, Edit } from 'lucide-react';
import { toast } from 'sonner';
import type { Service } from '../App';

type ServicesManagementProps = {
  services?: Service[];
  setServices?: (services: Service[]) => void;
};

export default function ServicesManagement({ services = [], setServices }: ServicesManagementProps) {
  const defaultServices: Service[] = [
    { id: 'service_1', serviceName: 'ORAL EXAMINATION / CHECK-UP', category: 'Consultation', description: ['Dental consultation', 'Oral examination', 'Diagnosis', 'Treatment planning'], duration: '30 mins', price: '₱0–₱500' },
    { id: 'service_2', serviceName: 'ORAL PROPHYLAXIS', category: 'Cleaning', description: ['Dental cleaning', 'Scaling', 'Polishing', 'Stain removal'], duration: '45 mins', price: '₱1,000' },
    { id: 'service_3', serviceName: 'RESTORATION (PERMANENT / TEMPORARY)', category: 'Restorative', description: ['Temporary filling', 'Permanent filling', 'Tooth repair', 'Dental bonding'], duration: '60 mins', price: '₱1,000' },
    { id: 'service_4', serviceName: 'TOOTH EXTRACTION', category: 'Extraction', description: ['Simple tooth extraction', 'Surgical extraction', 'Impacted tooth removal'], duration: '45-90 mins', price: '₱1,000' },
    { id: 'service_5', serviceName: 'ORTHODONTIC TREATMENT', category: 'Orthodontics', description: ['Braces installation', 'Braces adjustment', 'Retainers', 'Orthodontic consultation'], duration: 'Varies', price: '₱5,000 downpayment and\n₱1,000 monthly' },
    { id: 'service_6', serviceName: 'PROSTHODONTICS', category: 'Prosthetics', description: ['Complete dentures', 'Partial dentures'], duration: 'Multiple sessions', price: '₱5,000' }
  ];

  const serviceOverrides = services || [];
  const displayServices = [
    ...defaultServices.map(defaultService => serviceOverrides.find(s => s.id === defaultService.id) || defaultService),
    ...serviceOverrides.filter(service => !defaultServices.some(defaultService => defaultService.id === service.id))
  ];

  // Editing / modal state
  const [showAddService, setShowAddService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [isLoadingService, setIsLoadingService] = useState(false);
  const [descriptions, setDescriptions] = useState<string[]>([]);

  const editableServices = displayServices;

  const handleAddService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoadingService(true);
    try {
      const formData = new FormData(e.currentTarget);
      const serviceName = (formData.get('serviceName') as string)?.trim();
      const category = (formData.get('category') as string)?.trim();
      const price = (formData.get('price') as string)?.trim();
      const finalDescriptions = descriptions.filter(d => d.trim() !== '');

      if (!serviceName || !category) {
        toast.error('Service name and category are required');
        setIsLoadingService(false);
        return;
      }

      const newService: Service = {
        id: editingServiceId || Date.now().toString(),
        serviceName,
        category,
        description: finalDescriptions.length > 0 ? finalDescriptions : [],
        
        price: price || 'Price may vary',
      } as Service;

      if (editingServiceId) {
        const isEditingDefault = defaultServices.some(s => s.id === editingServiceId) && !services.some(s => s.id === editingServiceId);
        if (isEditingDefault) {
          const newServicesList = [...services, newService];
          setServices?.(newServicesList);
          toast.success('Service created successfully');
        } else {
          const updatedServices = services.map(s => s.id === editingServiceId ? newService : s);
          setServices?.(updatedServices);
          toast.success('Service updated successfully');
        }
        setEditingServiceId(null);
      } else {
        const newServicesList = [...services, newService];
        setServices?.(newServicesList);
        toast.success('Service added successfully');
      }

      setShowAddService(false);
      setDescriptions([]);
      (e.currentTarget as HTMLFormElement).reset();
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('Failed to save service');
    } finally {
      setIsLoadingService(false);
    }
  };

  const handleDeleteService = (id: string) => {
    const customServiceIndex = services.findIndex(s => s.id === id);
    if (customServiceIndex >= 0) {
      const updatedServices = services.filter(s => s.id !== id);
      setServices?.(updatedServices);
      toast.success('Service deleted');
    } else {
      toast.info('Default service reverted. (Create a custom service to make permanent changes)');
    }
  };

  const handleOpenServiceEditor = (serviceId: string | null) => {
    if (serviceId) {
      const service = editableServices.find(s => s.id === serviceId);
      if (service) {
        setDescriptions([...service.description]);
      }
    } else {
      setDescriptions(['']);
    }
    setEditingServiceId(serviceId);
    setShowAddService(true);
  };

  const handleAddDescription = () => setDescriptions([...descriptions, '']);
  const handleRemoveDescription = (index: number) => {
    const newDescriptions = descriptions.filter((_, i) => i !== index);
    setDescriptions(newDescriptions.length > 0 ? newDescriptions : ['']);
  };
  const handleUpdateDescription = (index: number, value: string) => {
    const newDescriptions = [...descriptions];
    newDescriptions[index] = value;
    setDescriptions(newDescriptions);
  };

  const handleCloseServiceModal = () => { setShowAddService(false); setEditingServiceId(null); setDescriptions([]); };

  return (
    <div className="m-6">
      {displayServices && displayServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          {displayServices.map((service) => (
            <motion.div key={service.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-white via-cyan-50/30 to-teal-50/20 rounded-2xl border border-cyan-200/60 shadow-md hover:shadow-2xl hover:border-teal-300 transition-all duration-300 p-7 group overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-teal-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex justify-between items-start mb-5">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-teal-700 transition-colors">{service.serviceName}</h3>
                    <div className="flex gap-2 mb-1">
                      <span className="px-4 py-1.5 bg-gradient-to-r from-cyan-100 to-teal-100 text-teal-700 rounded-full text-xs font-semibold border border-teal-200">{service.category}</span>
                    </div>
                  </div>
                </div>

                {service.description && service.description.length > 0 && (
                  <div className="mb-6 bg-gradient-to-br from-cyan-50/40 to-teal-50/40 rounded-xl p-5 border border-cyan-200/60">
                    <p className="text-xs font-bold text-teal-700 mb-3 uppercase tracking-widest">Service Includes:</p>
                    <ul className="space-y-2.5">
                      {service.description.map((desc, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
                          <span className="text-teal-600 font-bold mt-0.5 flex-shrink-0">✓</span>
                          <span>{desc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-5 mb-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">Price starts at</span>
                      <span className="text-lg font-black text-teal-600 whitespace-pre-line">{service.price || 'Price may vary'}</span>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-emerald-800 font-semibold bg-emerald-100 rounded-lg p-3 border border-emerald-300">💡 Pricing varies depending on the complexity of your case</p>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-cyan-200/50">
                  <button onClick={() => handleOpenServiceEditor(service.id)} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg transition-all duration-200 font-semibold text-sm hover:from-cyan-700 hover:to-teal-700 hover:shadow-md flex items-center gap-2"><Edit className="w-4 h-4"/>Edit</button>
                  <button onClick={() => handleDeleteService(service.id)} className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg transition-all duration-200 font-semibold text-sm hover:from-red-600 hover:to-pink-600 hover:shadow-md flex items-center gap-2"><Trash2 className="w-4 h-4"/>Delete</button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 px-8 bg-gradient-to-br from-cyan-50/40 to-teal-50/40 rounded-2xl border-2 border-dashed border-cyan-300/50 shadow-sm">
          <div className="text-6xl mb-4 drop-shadow-sm">🏥</div>
          <p className="text-2xl font-bold text-teal-900 mb-2">No services available</p>
          <p className="text-teal-700 text-sm mb-8">Click "Add Service" to create one or initialize with default services.</p>
          <button onClick={() => handleOpenServiceEditor(null)} className="px-8 py-3 bg-gradient-to-r from-teal-600 to-cyan-500 text-white rounded-xl hover:shadow-lg font-semibold transition-all duration-300 hover:scale-105">Add First Service</button>
        </div>
      )}

      {/* Add/Edit Service Modal */}
      {showAddService && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-10 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-visible shadow-2xl border border-gry-auto">
            <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-200">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 mb-1">{editingServiceId ? '✏️ Edit Service' : '➕ Add Service'}</h2>
                <p className="text-sm text-gray-600">Manage your clinic's professional services</p>
              </div>
              <button onClick={handleCloseServiceModal} className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 text-gray-500 hover:text-gray-700 flex-shrink-0"><X className="w-6 h-6"/></button>
            </div>
            <form onSubmit={handleAddService} className="space-y-6" key={editingServiceId || 'add-service'}>
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-800 uppercase tracking-wide">Service Name *</label>
                <input type="text" name="serviceName" required defaultValue={editingServiceId ? editableServices.find(s => s.id === editingServiceId)?.serviceName : ''} placeholder="e.g., ORAL EXAMINATION / CHECK-UP" className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:border-transparent transition-all text-gray-800 placeholder-gray-500" />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-800 uppercase tracking-wide">Category *</label>
                  <input type="text" name="category" required defaultValue={editingServiceId ? editableServices.find(s => s.id === editingServiceId)?.category : ''} placeholder="e.g., Consultation" className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:border-transparent transition-all text-gray-800 placeholder-gray-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-800 uppercase tracking-wide">Price</label>
                <input type="text" name="price" defaultValue={editingServiceId ? editableServices.find(s => s.id === editingServiceId)?.price : 'Price may vary'} placeholder="e.g., Price may vary" className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:border-transparent transition-all text-gray-800 placeholder-gray-500" />
              </div>

              <div className="border-t-2 border-gray-200 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">Service Descriptions</label>
                  <button type="button" onClick={(e) => { e.preventDefault(); handleAddDescription(); }} className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-all text-sm font-semibold">+ Add Item</button>
                </div>
                {descriptions.map((desc, idx) => (
                  <div key={idx} className="flex gap-2 mb-3">
                    <input type="text" value={desc} onChange={(e) => handleUpdateDescription(idx, e.target.value)} placeholder={`Service item ${idx + 1}`} className="flex-1 px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:border-transparent transition-all text-gray-800" />
                    {descriptions.length > 1 && (
                      <button type="button" onClick={() => handleRemoveDescription(idx)} className="px-3 py-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all font-semibold flex items-center gap-1"><Trash2 className="w-4 h-4"/>Remove</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end pt-6 border-t-2 border-gray-200">
                <button type="button" onClick={handleCloseServiceModal} className="px-7 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold text-gray-900 hover:shadow-sm hover:border-gray-400">Cancel</button>
                <button type="submit" disabled={isLoadingService} className={`px-7 py-3 rounded-xl text-white flex items-center gap-2 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl ${isLoadingService ? 'bg-pink-400 cursor-not-allowed opacity-75' : 'bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 hover:scale-105'}`}>
                  {editingServiceId ? (<><Check className="w-4 h-4" />{isLoadingService ? 'Updating...' : 'Update Service'}</>) : (<><Plus className="w-4 h-4" />{isLoadingService ? 'Adding...' : 'Add Service'}</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
