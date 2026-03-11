import { useState } from 'react';
import { Announcement } from '../App';
import { Plus, X, Trash2, Check, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { announcementAPI } from '../api';
import { timeAgo } from '../utils/dateHelpers';

type Service = {
  id: string;
  serviceName: string;
  category: string;
  description: string[];
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
      
      price: '₱0–₱500'
    },
    {
      id: 'service_2',
      serviceName: 'ORAL PROPHYLAXIS',
      category: 'Cleaning',
      description: ['Dental cleaning', 'Scaling', 'Polishing', 'Stain removal'],
      
      price: '₱1,000'
    },
    {
      id: 'service_3',
      serviceName: 'RESTORATION (PERMANENT / TEMPORARY)',
      category: 'Restorative',
      description: ['Temporary filling', 'Permanent filling', 'Tooth repair', 'Dental bonding'],
      
      price: '₱1,000'
    },
    {
      id: 'service_4',
      serviceName: 'TOOTH EXTRACTION',
      category: 'Extraction',
      description: ['Simple tooth extraction', 'Surgical extraction', 'Impacted tooth removal'],
      
      price: '₱1,000'
    },
    {
      id: 'service_5',
      serviceName: 'ORTHODONTIC TREATMENT',
      category: 'Orthodontics',
      description: ['Braces installation', 'Braces adjustment', 'Retainers', 'Orthodontic consultation'],
      
      price: '₱5,000 downpayment and\n₱1,000 monthly'
    },
    {
      id: 'service_6',
      serviceName: 'PROSTHODONTICS',
      category: 'Prosthetics',
      description: ['Complete dentures', 'Partial dentures'],
      
      price: '₱5,000'
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
      const duration = formData.get('duration') as string;

      if (!title || !message) {
        toast.error('Title and message are required');
        setIsPostingAnnouncement(false);
        return;
      }

      let expiresAt: string | null = null;
      if (duration && duration !== 'never') {
        const now = new Date();
        if (duration === '1day') now.setDate(now.getDate() + 1);
        else if (duration === '3days') now.setDate(now.getDate() + 3);
        else if (duration === '1week') now.setDate(now.getDate() + 7);
        else if (duration === '1month') now.setMonth(now.getMonth() + 1);
        
        // Use UTC for consistency
        expiresAt = now.toISOString().slice(0, 19).replace('T', ' ');
      }

      const createdAnnouncement = await announcementAPI.create({
        title,
        message,
        type,
        date: new Date().toISOString().split('T')[0],
        expiresAt: expiresAt || undefined,
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

  const handleAddService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoadingService(true);
    try {
      const formData = new FormData(e.currentTarget);
      const serviceName = (formData.get('serviceName') as string)?.trim();
      const category = (formData.get('category') as string)?.trim();
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
                              📅 {timeAgo(announcement.date)}
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
                      <div className="flex gap-2">
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
                        {announcement.expiresAt && new Date(announcement.expiresAt) < new Date() && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600">
                            Expired
                          </span>
                        )}
                      </div>
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-bold mb-3 text-gray-800 uppercase tracking-wider">Type <span className="text-red-500">*</span></label>
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
                      <label className="block text-sm font-bold mb-3 text-gray-800 uppercase tracking-wider">Duration</label>
                      <select
                        name="duration"
                        required
                        className="w-full px-4 py-3 border border-cyan-200/60 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all hover:border-cyan-300 appearance-none cursor-pointer text-gray-800 font-medium"
                        style={{backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2314b8a6' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', paddingRight: '2.5rem'}}
                      >
                        <option value="never">♾️ Never Expires</option>
                        <option value="1day">🕐 1 Day</option>
                        <option value="3days">🗓️ 3 Days</option>
                        <option value="1week">📅 1 Week</option>
                        <option value="1month">🌙 1 Month</option>
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

      
    </div>
  );
}
