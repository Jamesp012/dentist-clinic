import { useState } from 'react';
import { Announcement } from '../App';
import { Plus, X, Trash2, Check, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { announcementAPI } from '../api';

type Service = {
  id: string;
  serviceName: string;
  category: string;
  description: string[];
  duration: string;
  price?: string;
};

type AnnouncementsManagementProps = {
  announcements: Announcement[];
  setAnnouncements: (announcements: Announcement[]) => void;
  services?: Service[];
  setServices?: (services: Service[]) => void;
};

export function AnnouncementsManagement({ announcements, setAnnouncements, services = [], setServices }: AnnouncementsManagementProps) {
  const [activeTab, setActiveTab] = useState<'announcements' | 'services'>('announcements');
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<Announcement['id'] | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<Announcement['id'] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [isLoadingService, setIsLoadingService] = useState(false);
  const [descriptions, setDescriptions] = useState<string[]>([]);

  const defaultServices: Service[] = [
    {
      id: 'service_1',
      serviceName: 'ORAL EXAMINATION / CHECK-UP',
      category: 'Consultation',
      description: ['Dental consultation', 'Oral examination', 'Diagnosis', 'Treatment planning'],
      duration: '30 mins',
      price: 'Price may vary'
    },
    {
      id: 'service_2',
      serviceName: 'ORAL PROPHYLAXIS',
      category: 'Cleaning',
      description: ['Dental cleaning', 'Scaling', 'Polishing', 'Stain removal'],
      duration: '45 mins',
      price: 'Price may vary'
    },
    {
      id: 'service_3',
      serviceName: 'RESTORATION (PERMANENT / TEMPORARY)',
      category: 'Restorative',
      description: ['Temporary filling', 'Permanent filling', 'Tooth repair', 'Dental bonding'],
      duration: '60 mins',
      price: 'Price may vary'
    },
    {
      id: 'service_4',
      serviceName: 'TOOTH EXTRACTION',
      category: 'Extraction',
      description: ['Simple tooth extraction', 'Surgical extraction', 'Impacted tooth removal'],
      duration: '45-90 mins',
      price: 'Price may vary'
    },
    {
      id: 'service_5',
      serviceName: 'ORTHODONTIC TREATMENT',
      category: 'Orthodontics',
      description: ['Braces installation', 'Braces adjustment', 'Retainers', 'Orthodontic consultation'],
      duration: 'Varies',
      price: 'Price may vary'
    },
    {
      id: 'service_6',
      serviceName: 'PROSTHODONTICS',
      category: 'Prosthetics',
      description: ['Complete dentures', 'Partial dentures'],
      duration: 'Multiple sessions',
      price: 'Price may vary'
    }
  ];

  const serviceOverrides = services || [];
  const displayServices = [
    ...defaultServices.map(defaultService => serviceOverrides.find(s => s.id === defaultService.id) || defaultService),
    ...serviceOverrides.filter(service => !defaultServices.some(defaultService => defaultService.id === service.id))
  ];

  // For editing operations, allow both real and default services to be edited
  const editableServices = displayServices;

  const handleAddAnnouncement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPostingAnnouncement(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const title = (formData.get('title') as string)?.trim();
      const message = (formData.get('message') as string)?.trim();
      const type = formData.get('type') as Announcement['type'];

      if (!title || !message) {
        toast.error('Title and message are required');
        setIsPostingAnnouncement(false);
        return;
      }

      const createdAnnouncement = await announcementAPI.create({
        title,
        message,
        type,
        date: new Date().toISOString().split('T')[0],
      });
      
      toast.success('Announcement posted successfully');
      
      if (createdAnnouncement && createdAnnouncement.id) {
        setAnnouncements([createdAnnouncement, ...announcements]);
      }
      
      setShowAddAnnouncement(false);
      
    } catch (error) {
      console.error('Failed to post announcement:', error);
      toast.error('Failed to post announcement. Please try again.');
    } finally {
      setIsPostingAnnouncement(false);
    }
  };

  const handleShowDeleteConfirmation = (id: Announcement['id']) => {
    setShowDeleteConfirmation(id);
  };

  const handleConfirmDeleteAnnouncement = async (id: Announcement['id']) => {
    try {
      setIsDeleting(true);
      await announcementAPI.delete(id);
      setAnnouncements(announcements.filter((a: Announcement) => a.id !== id));
      toast.success('Announcement deleted successfully');
      setShowDeleteConfirmation(null);
    } catch (error) {
      console.error('Failed to delete announcement', error);
      toast.error('Failed to delete announcement. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDeleteAnnouncement = () => {
    setShowDeleteConfirmation(null);
  };

  const getAnnouncementColor = (type: string) => {
    switch (type) {
      case 'promo': return 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200';
      case 'closure': return 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200';
      case 'important': return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200';
      default: return 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200';
    }
  };

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'promo': return '🎉';
      case 'closure': return '🚫';
      case 'important': return '⚠️';
      default: return '📢';
    }
  };

  const formatToDD_MM_YYYY = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleAddService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoadingService(true);
    try {
      const formData = new FormData(e.currentTarget);
      const serviceName = (formData.get('serviceName') as string)?.trim();
      const category = (formData.get('category') as string)?.trim();
      const duration = (formData.get('duration') as string)?.trim();
      const price = (formData.get('price') as string)?.trim();
      
      // Use descriptions from state instead of FormData
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
        duration: duration || '',
        price: price || 'Price may vary',
      };

      if (editingServiceId) {
        // Check if this is a default service being edited for the first time
        const isEditingDefault = defaultServices.some(s => s.id === editingServiceId) && 
                                !services.some(s => s.id === editingServiceId);
        
        if (isEditingDefault) {
          // Converting default service to real custom service - add to services array
          const newServicesList = [...services, newService];
          setServices?.(newServicesList);
          console.log('✅ Default service converted to custom:', { newService, totalServices: newServicesList.length });
          toast.success('Service created successfully');
        } else {
          // Editing an existing custom service
          const updatedServices = services.map(s => s.id === editingServiceId ? newService : s);
          setServices?.(updatedServices);
          console.log('✅ Service updated:', { editingServiceId, newService, allServices: updatedServices });
          toast.success('Service updated successfully');
        }
        setEditingServiceId(null);
      } else {
        // Adding a brand new service
        const newServicesList = [...services, newService];
        setServices?.(newServicesList);
        console.log('✅ Service added:', { newService, totalServices: newServicesList.length, allServices: newServicesList });
        toast.success('Service added successfully');
      }

      setShowAddService(false);
      setDescriptions([]);
      e.currentTarget.reset();
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('Failed to save service');
    } finally {
      setIsLoadingService(false);
    }
  };

  const handleDeleteService = (id: string) => {
    // Only delete if it's a real custom service in the services array
    const customServiceIndex = services.findIndex(s => s.id === id);
    if (customServiceIndex >= 0) {
      const updatedServices = services.filter(s => s.id !== id);
      setServices?.(updatedServices);
      console.log('✅ Service deleted:', { deletedId: id, remainingServices: updatedServices.length });
      toast.success('Service deleted');
    } else {
      // It's a default service - don't actually delete, just don't persist it
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

  const handleAddDescription = () => {
    setDescriptions([...descriptions, '']);
  };

  const handleRemoveDescription = (index: number) => {
    const newDescriptions = descriptions.filter((_, i) => i !== index);
    setDescriptions(newDescriptions.length > 0 ? newDescriptions : ['']);
  };

  const handleUpdateDescription = (index: number, value: string) => {
    const newDescriptions = [...descriptions];
    newDescriptions[index] = value;
    setDescriptions(newDescriptions);
  };

  const handleCloseServiceModal = () => {
    setShowAddService(false);
    setEditingServiceId(null);
    setDescriptions([]);
  };

  return (
    <div className="p-8 bg-gradient-to-br from-white via-cyan-50/20 to-teal-50/20 min-h-screen">

      {/* Tab Navigation */}
      <div className="flex gap-3 bg-white/70 backdrop-blur-sm p-1 rounded-2xl shadow-md mb-4 border border-cyan-200/60">
        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-300 text-center ${
            activeTab === 'announcements'
              ? 'bg-gradient-to-r from-teal-600 to-cyan-500 text-white shadow-lg shadow-teal-200/50'
              : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
          }`}
        >
          📢 Announcements
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-300 text-center ${
            activeTab === 'services'
              ? 'bg-gradient-to-r from-cyan-600 to-teal-500 text-white shadow-lg shadow-cyan-200/50'
              : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
          }`}
        >
          🦷 Services Offered
        </button>
      </div>

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div>
          <div className="flex justify-end mb-8">
            <button
              onClick={() => setShowAddAnnouncement(true)}
              className="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-500 text-white rounded-xl hover:shadow-xl shadow-lg hover:shadow-teal-200/50 flex items-center gap-2 font-semibold transition-all duration-300 hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Post Announcement
            </button>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-visible pr-2">
            {announcements && announcements.length > 0 ? (
              announcements.map(announcement => (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  className="bg-white rounded-xl border border-cyan-200/60 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group"
                >
                  <div className={`h-1.5 bg-gradient-to-r`} style={{
                    backgroundImage: announcement.type === 'important' 
                      ? 'linear-gradient(to right, #005461, #003a47)' :
                      announcement.type === 'promo' 
                      ? 'linear-gradient(to right, #6AECE1, #52d4d1)' :
                      announcement.type === 'closure' 
                      ? 'linear-gradient(to right, #A7E399, #94d975)' :
                      'linear-gradient(to right, #3BC1A8, #2aaa95)'
                  }} />
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="text-3xl mt-1">{getAnnouncementIcon(announcement.type)}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-teal-700 transition-colors">{announcement.title}</h3>
                          <div className="flex flex-wrap gap-4 items-center text-sm">
                            <span className="text-gray-600 font-medium flex items-center gap-1">
                              📅 {formatToDD_MM_YYYY(announcement.date)}
                            </span>
                            <span className="text-gray-600 font-medium flex items-center gap-1">
                              👤 {announcement.createdBy}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleShowDeleteConfirmation(announcement.id)}
                        className="p-2 rounded-lg transition-all duration-200 flex-shrink-0 hover:bg-red-50 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-gray-700 leading-relaxed mb-4 text-sm whitespace-pre-wrap">{announcement.message}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200/50">
                      <span className="px-3 py-1 rounded-full text-xs font-bold capitalize" style={{
                        backgroundColor: announcement.type === 'important' 
                          ? '#E8F0F2' :
                          announcement.type === 'promo' 
                          ? '#E0FCFA' :
                          announcement.type === 'closure' 
                          ? '#F0F7E0' :
                          '#E6F5F1',
                        color: announcement.type === 'important' 
                          ? '#005461' :
                          announcement.type === 'promo' 
                          ? '#6AECE1' :
                          announcement.type === 'closure' 
                          ? '#A7E399' :
                          '#3BC1A8'
                      }}>
                        {announcement.type}
                      </span>
                      <span className="text-xs text-gray-500 font-medium hidden">ID: {String(announcement.id).substring(0, 8)}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-16 px-8 bg-gradient-to-br from-cyan-50/40 to-teal-50/40 rounded-2xl border-2 border-dashed border-cyan-300/50 shadow-sm">
                <div className="text-6xl mb-4 drop-shadow-sm">📢</div>
                <p className="text-lg font-bold text-teal-900 mb-2">No Announcements Yet</p>
                <p className="text-teal-700 text-sm mb-8">Start sharing important updates with your clinic team</p>
                <button
                  onClick={() => setShowAddAnnouncement(true)}
                  className="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-500 text-white rounded-xl hover:shadow-lg font-semibold transition-all duration-300 hover:scale-105"
                >
                  Create First Announcement
                </button>
              </div>
            )}
          </div>

          {/* Add Announcement Modal */}
          {showAddAnnouncement && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-2xl shadow-2xl border border-cyan-200/60 overflow-hidden animate-in scale-in duration-300 max-w-2xl w-full">
                <div className="bg-gradient-to-r from-teal-700 via-cyan-600 to-cyan-500 p-8 flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-1">📢 Post New Announcement</h2>
                    <p className="text-cyan-100 text-sm font-medium">Share important updates with your clinic team</p>
                  </div>
                  <button onClick={() => setShowAddAnnouncement(false)} className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 text-white backdrop-blur-sm">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleAddAnnouncement} className="p-8 space-y-6">
                  <div>
                    <label className="block text-sm font-bold mb-3 text-gray-800 uppercase tracking-wider">Announcement Title <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="title"
                      required
                      placeholder="e.g., Holiday Clinic Closure, Special Promotion"
                      className="w-full px-4 py-3 border border-cyan-200/60 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all hover:border-cyan-300 text-gray-800 placeholder-gray-500 font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold mb-3 text-gray-800 uppercase tracking-wider">Announcement Type <span className="text-red-500">*</span></label>
                      <select
                        name="type"
                        required
                        className="w-full px-4 py-3 border border-cyan-200/60 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all hover:border-cyan-300 appearance-none cursor-pointer text-gray-800 font-medium"
                        style={{backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2314b8a6' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', paddingRight: '2.5rem'}}
                      >
                        <option value="general">📌 General</option>
                        <option value="promo">🎉 Promotion</option>
                        <option value="closure">🚫 Closure Notice</option>
                        <option value="important">⚠️ Important</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-3 text-gray-800 uppercase tracking-wider">Date</label>
                      <input
                        type="date"
                        disabled
                        value={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 border border-cyan-200/60 rounded-lg bg-gray-50 text-gray-600 font-medium text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-3 text-gray-800 uppercase tracking-wider">Message Details <span className="text-red-500">*</span></label>
                    <textarea
                      name="message"
                      required
                      rows={6}
                      placeholder="Enter the complete announcement message here. Include all relevant details, dates, and important information for your team..."
                      className="w-full px-4 py-3 border border-cyan-200/60 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all hover:border-cyan-300 resize-none text-gray-800 placeholder-gray-500 font-medium"
                    />
                  </div>
                  <div className="flex gap-3 justify-end pt-6 border-t border-gray-200/50">
                    <button
                      type="button"
                      onClick={() => setShowAddAnnouncement(false)}
                      className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-semibold transition-all duration-200 hover:border-gray-400 hover:shadow-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPostingAnnouncement}
                      className={`px-7 py-3 rounded-lg text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 ${
                        isPostingAnnouncement
                          ? 'bg-teal-400 cursor-not-allowed opacity-75'
                          : 'bg-gradient-to-r from-teal-600 to-cyan-500 hover:from-teal-700 hover:to-cyan-600 hover:scale-105'
                      }`}
                    >
                      <Check className="w-5 h-5" />
                      {isPostingAnnouncement ? 'Posting...' : 'Post Announcement'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Announcement Confirmation Modal */}
          <AnimatePresence>
            {showDeleteConfirmation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-w-md w-full"
                >
                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-200 p-8 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center mb-4 shadow-lg">
                      <Trash2 className="w-8 h-8 text-teal-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 text-center">Delete Announcement?</h3>
                    <p className="text-gray-600 text-center mt-2 text-sm">This action cannot be undone. Are you sure you want to permanently delete this announcement?</p>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Announcement Preview */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Announcement to be deleted:</p>
                      <p className="text-gray-900 font-bold">{announcements.find(a => a.id === showDeleteConfirmation)?.title}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 p-6 flex gap-3">
                    <button
                      onClick={handleCancelDeleteAnnouncement}
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all duration-200 hover:border-gray-400 hover:shadow-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleConfirmDeleteAnnouncement(showDeleteConfirmation)}
                      disabled={isDeleting}
                      className={`flex-1 px-4 py-3 rounded-lg text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 ${
                        isDeleting
                          ? 'bg-teal-400 cursor-not-allowed opacity-75'
                          : 'bg-gradient-to-r from-teal-600 to-cyan-500 hover:from-teal-700 hover:to-cyan-600 hover:scale-105'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div>

          {displayServices && displayServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
              {displayServices.map((service) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-white via-cyan-50/30 to-teal-50/20 rounded-2xl border border-cyan-200/60 shadow-md hover:shadow-2xl hover:border-teal-300 transition-all duration-300 p-7 group overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-teal-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-teal-700 transition-colors">{service.serviceName}</h3>
                        <div className="flex gap-2 mb-1">
                          <span className="px-4 py-1.5 bg-gradient-to-r from-cyan-100 to-teal-100 text-teal-700 rounded-full text-xs font-semibold border border-teal-200">
                            {service.category}
                          </span>
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
                      <p className="text-xs text-emerald-800 font-semibold bg-emerald-100 rounded-lg p-3 border border-emerald-300">💡 Pricing varies depending on the complexity of your case</p>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-cyan-200/50">
                      <button
                        onClick={() => handleOpenServiceEditor(service.id)}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg transition-all duration-200 font-semibold text-sm hover:from-cyan-700 hover:to-teal-700 hover:shadow-md flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg transition-all duration-200 font-semibold text-sm hover:from-red-600 hover:to-pink-600 hover:shadow-md flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
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
              <button
                onClick={() => handleOpenServiceEditor(null)}
                className="px-8 py-3 bg-gradient-to-r from-teal-600 to-cyan-500 text-white rounded-xl hover:shadow-lg font-semibold transition-all duration-300 hover:scale-105"
              >
                Add First Service
              </button>
            </div>
          )}

          {/* Add/Edit Service Modal */}
          {showAddService && (
            <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl p-10 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-visible shadow-2xl border border-gry-auto max-a-scre00 animate-in scale-in duration-3ll scro00bar-thin scrollbar-thumb-teal-500 scrollbar-track-cyan-50">
                <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-200">
                  <div>
                    <h2 className="text-4xl font-bold text-gray-900 mb-1">{editingServiceId ? '✏️ Edit Service' : '➕ Add Service'}</h2>
                    <p className="text-sm text-gray-600">Manage your clinic's professional services</p>
                  </div>
                  <button
                    onClick={handleCloseServiceModal}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 text-gray-500 hover:text-gray-700 flex-shrink-0"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleAddService} className="space-y-6" key={editingServiceId || 'add-service'}>
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-800 uppercase tracking-wide">Service Name *</label>
                    <input
                      type="text"
                      name="serviceName"
                      required
                      defaultValue={editingServiceId ? editableServices.find(s => s.id === editingServiceId)?.serviceName : ''}
                      placeholder="e.g., ORAL EXAMINATION / CHECK-UP"
                      className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:border-transparent transition-all text-gray-800 placeholder-gray-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-800 uppercase tracking-wide">Category *</label>
                      <input
                        type="text"
                        name="category"
                        required
                        defaultValue={editingServiceId ? editableServices.find(s => s.id === editingServiceId)?.category : ''}
                        placeholder="e.g., Consultation"
                        className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:border-transparent transition-all text-gray-800 placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-800 uppercase tracking-wide">Duration *</label>
                      <input
                        type="text"
                        name="duration"
                        required
                        defaultValue={editingServiceId ? editableServices.find(s => s.id === editingServiceId)?.duration : ''}
                        placeholder="e.g., 30 mins"
                        className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:border-transparent transition-all text-gray-800 placeholder-gray-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-800 uppercase tracking-wide">Price</label>
                    <input
                      type="text"
                      name="price"
                      defaultValue={editingServiceId ? editableServices.find(s => s.id === editingServiceId)?.price : 'Price may vary'}
                      placeholder="e.g., Price may vary"
                      className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:border-transparent transition-all text-gray-800 placeholder-gray-500"
                    />
                  </div>

                  <div className="border-t-2 border-gray-200 pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">Service Descriptions</label>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleAddDescription();
                        }}
                        className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-all text-sm font-semibold"
                      >
                        + Add Item
                      </button>
                    </div>
                    {descriptions.map((desc, idx) => (
                      <div key={idx} className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={desc}
                          onChange={(e) => handleUpdateDescription(idx, e.target.value)}
                          placeholder={`Service item ${idx + 1}`}
                          className="flex-1 px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:border-transparent transition-all text-gray-800"
                        />
                        {descriptions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDescription(idx)}
                            className="px-3 py-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all font-semibold flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 justify-end pt-6 border-t-2 border-gray-200">
                    <button
                      type="button"
                      onClick={handleCloseServiceModal}
                      className="px-7 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold text-gray-900 hover:shadow-sm hover:border-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoadingService}
                      className={`px-7 py-3 rounded-xl text-white flex items-center gap-2 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl ${
                        isLoadingService
                          ? 'bg-pink-400 cursor-not-allowed opacity-75'
                          : 'bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 hover:scale-105'
                      }`}
                    >
                      {editingServiceId ? (
                        <>
                          <Check className="w-4 h-4" />
                          {isLoadingService ? 'Updating...' : 'Update Service'}
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          {isLoadingService ? 'Adding...' : 'Add Service'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
