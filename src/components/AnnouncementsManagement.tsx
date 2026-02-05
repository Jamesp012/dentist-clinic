import { useState } from 'react';
import { Announcement } from '../App';
import { Plus, X, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
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
  const [showAddService, setShowAddService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [isLoadingService, setIsLoadingService] = useState(false);

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

  // Initialize with default services if empty
  const displayServices = services && services.length > 0 ? services : defaultServices;

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
      
      toast.success('✨ Announcement posted beautifully! Love the sleek form design! ✨');
      
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

  const handleDeleteAnnouncement = async (id: Announcement['id']) => {
    try {
      setDeletingAnnouncementId(id);
      await announcementAPI.delete(id);
      setAnnouncements(announcements.filter((a: Announcement) => a.id !== id));
      toast.success('Announcement deleted');
    } catch (error) {
      console.error('Failed to delete announcement', error);
      toast.error('Failed to delete announcement. Please try again.');
    } finally {
      setDeletingAnnouncementId(null);
    }
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
      
      // Get descriptions from multiple inputs
      const descriptions: string[] = [];
      let descIndex = 0;
      while (formData.get(`description_${descIndex}`)) {
        const desc = (formData.get(`description_${descIndex}`) as string)?.trim();
        if (desc) descriptions.push(desc);
        descIndex++;
      }

      if (!serviceName || !category || !duration) {
        toast.error('Service name, category, and duration are required');
        return;
      }

      const newService: Service = {
        id: editingServiceId || Date.now().toString(),
        serviceName,
        category,
        description: descriptions.length > 0 ? descriptions : [],
        duration,
        price: price || 'Price may vary',
      };

      if (editingServiceId) {
        const updatedServices = services.map(s => s.id === editingServiceId ? newService : s);
        setServices?.(updatedServices);
        toast.success('Service updated successfully');
        setEditingServiceId(null);
      } else {
        setServices?.([...services, newService]);
        toast.success('Service added successfully');
      }

      setShowAddService(false);
      e.currentTarget.reset();
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('Failed to save service');
    } finally {
      setIsLoadingService(false);
    }
  };

  const handleDeleteService = (id: string) => {
    const updatedServices = services.filter(s => s.id !== id);
    setServices?.(updatedServices);
    toast.success('Service deleted');
  };

  return (
    <div className="p-8 bg-gradient-to-br from-white via-white to-gray-50 min-h-screen">

      {/* Tab Navigation */}
      <div className="flex gap-3 bg-white p-3 rounded-2xl shadow-sm mb-8 border border-gray-100">
        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-300 text-center ${
            activeTab === 'announcements'
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          Announcements
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-300 text-center ${
            activeTab === 'services'
              ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-200'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          Services Offered
        </button>
      </div>

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div>
          <div className="flex justify-end items-start mb-8">
            <button
              onClick={() => setShowAddAnnouncement(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-xl shadow-lg hover:shadow-blue-200 flex items-center gap-2 font-semibold transition-all duration-300 hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              New Announcement
            </button>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hover pr-2">
            {announcements && announcements.length > 0 ? (
              announcements.map(announcement => (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  className={`p-6 rounded-2xl border-2 shadow-md hover:shadow-xl transition-all duration-300 ${getAnnouncementColor(announcement.type)}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-4xl drop-shadow-sm">{getAnnouncementIcon(announcement.type)}</div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{announcement.title}</h3>
                        <div className="flex gap-3 items-center">
                          <p className="text-xs text-gray-600 font-medium">
                            📅 {formatToDD_MM_YYYY(announcement.date)}
                          </p>
                          <p className="text-xs text-gray-600 font-medium">
                            👤 {announcement.createdBy}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                      disabled={deletingAnnouncementId === announcement.id}
                      className={`p-3 rounded-lg transition-all duration-200 flex-shrink-0 ${
                        deletingAnnouncementId === announcement.id
                          ? 'opacity-50 cursor-not-allowed text-red-400'
                          : 'text-red-600 hover:bg-red-100 hover:text-red-700'
                      }`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-gray-800 font-medium leading-relaxed mb-4 text-sm">{announcement.message}</p>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 border-opacity-50">
                    <span className="px-4 py-1.5 bg-white bg-opacity-70 rounded-full text-xs capitalize font-semibold text-gray-700">
                      {announcement.type}
                    </span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-16 px-6 bg-white rounded-2xl border-2 border-dashed border-gray-300 shadow-sm">
                <div className="text-5xl mb-4 drop-shadow-sm">📢</div>
                <p className="text-lg font-semibold text-gray-700 mb-2">No announcements yet</p>
                <p className="text-gray-600 text-sm mb-6">Click "New Announcement" to share important updates with your team</p>
                <button
                  onClick={() => setShowAddAnnouncement(true)}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg font-semibold transition-all duration-300"
                >
                  Create First Announcement
                </button>
              </div>
            )}
          </div>

          {/* Add Announcement Modal */}
          {showAddAnnouncement && (
            <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl p-10 max-w-2xl w-full shadow-2xl border border-gray-100 animate-in scale-in duration-300">
                <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-200">
                  <div>
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-1">New Announcement</h2>
                    <p className="text-sm text-gray-600">Share important updates with your clinic team</p>
                  </div>
                  <button onClick={() => setShowAddAnnouncement(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 text-gray-500 hover:text-gray-700">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleAddAnnouncement} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-800 uppercase tracking-wide">Title <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="title"
                      required
                      placeholder="e.g., Holiday Promo"
                      className="w-full px-5 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500 transition-all hover:border-gray-400 text-gray-800 placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-800 uppercase tracking-wide">Type <span className="text-red-500">*</span></label>
                    <select
                      name="type"
                      required
                      className="w-full px-5 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500 transition-all hover:border-gray-400 appearance-none cursor-pointer text-gray-800"
                      style={{backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%233B82F6' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.5rem center', paddingRight: '2.5rem'}}
                    >
                      <option value="general">General</option>
                      <option value="promo">Promo</option>
                      <option value="closure">Closure</option>
                      <option value="important">Important</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-800 uppercase tracking-wide">Message <span className="text-red-500">*</span></label>
                    <textarea
                      name="message"
                      required
                      rows={5}
                      placeholder="Enter announcement details..."
                      className="w-full px-5 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500 transition-all hover:border-gray-400 resize-none text-gray-800 placeholder-gray-500"
                    />
                  </div>
                  <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowAddAnnouncement(false)}
                      className="px-7 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700 font-semibold transition-all duration-200 hover:border-gray-400 hover:shadow-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPostingAnnouncement}
                      className={`px-8 py-3 rounded-xl text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 ${
                        isPostingAnnouncement
                          ? 'bg-blue-400 cursor-not-allowed opacity-75'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-105'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      {isPostingAnnouncement ? 'Posting...' : 'Post Announcement'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div>
          <div className="flex justify-between items-start mb-10">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Professional Services</h2>
              <p className="text-gray-600 text-sm font-medium">Comprehensive dental care solutions tailored to your needs</p>
            </div>
            <button
              onClick={() => {
                setEditingServiceId(null);
                setShowAddService(true);
              }}
              className="px-6 py-3 bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-xl hover:shadow-xl shadow-lg hover:shadow-pink-200 transform hover:scale-105 transition-all duration-300 flex items-center gap-2 font-semibold flex-shrink-0"
            >
              <Plus className="w-5 h-5" />
              Add Service
            </button>
          </div>

          {displayServices && displayServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
              {displayServices.map((service) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -6 }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-2xl transition-all duration-300 p-7 hover:border-pink-200 group"
                >
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">{service.serviceName}</h3>
                      <div className="flex gap-2 mb-1">
                        <span className="px-4 py-1.5 bg-gradient-to-r from-pink-100 to-pink-50 text-pink-700 rounded-full text-xs font-semibold border border-pink-200">
                          {service.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {service.description && service.description.length > 0 && (
                    <div className="mb-6 bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200">
                      <p className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-widest">Service Includes:</p>
                      <ul className="space-y-2.5">
                        {service.description.map((desc, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
                            <span className="text-pink-600 font-bold mt-0.5 flex-shrink-0">✓</span>
                            <span>{desc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-5 mb-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="text-center flex-1">
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-1">Price</p>
                        <p className="text-lg font-bold text-gray-900">{service.price}</p>
                      </div>
                      <p className="text-xs text-gray-600 italic bg-amber-50 rounded-lg p-3 border border-amber-200 flex-shrink-0">💡 Pricing varies depending on the complexity of your case</p>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setEditingServiceId(service.id);
                        setShowAddService(true);
                      }}
                      className="px-4 py-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 font-semibold text-sm hover:text-blue-700"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="px-4 py-2 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 font-semibold text-sm hover:text-red-700"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 px-8 bg-white rounded-2xl border-2 border-dashed border-gray-300 shadow-sm">
              <div className="text-6xl mb-4 drop-shadow-sm">🏥</div>
              <p className="text-2xl font-bold text-gray-700 mb-2">No services available</p>
              <p className="text-gray-600 text-sm mb-8">Click "Add Service" to create one or initialize with default services.</p>
              <button
                onClick={() => {
                  setEditingServiceId(null);
                  setShowAddService(true);
                }}
                className="px-8 py-3 bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-xl hover:shadow-lg font-semibold transition-all duration-300"
              >
                Add First Service
              </button>
            </div>
          )}

          {/* Add/Edit Service Modal */}
          {showAddService && (
            <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl p-10 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hover shadow-2xl border border-gray-100 animate-in scale-in duration-300">
                <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-200">
                  <div>
                    <h2 className="text-4xl font-bold text-gray-900 mb-1">{editingServiceId ? '✏️ Edit Service' : '➕ Add Service'}</h2>
                    <p className="text-sm text-gray-600">Manage your clinic's professional services</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddService(false);
                      setEditingServiceId(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 text-gray-500 hover:text-gray-700 flex-shrink-0"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleAddService} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-800 uppercase tracking-wide">Service Name *</label>
                    <input
                      type="text"
                      name="serviceName"
                      required
                      defaultValue={editingServiceId ? displayServices.find(s => s.id === editingServiceId)?.serviceName : ''}
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
                        defaultValue={editingServiceId ? displayServices.find(s => s.id === editingServiceId)?.category : ''}
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
                        defaultValue={editingServiceId ? displayServices.find(s => s.id === editingServiceId)?.duration : ''}
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
                      defaultValue={editingServiceId ? displayServices.find(s => s.id === editingServiceId)?.price : 'Price may vary'}
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
                          const count = (e.currentTarget.parentElement?.parentElement?.querySelectorAll('input[name^="description_"]').length || 0) + 1;
                          const newInput = document.createElement('input');
                          newInput.setAttribute('type', 'text');
                          newInput.setAttribute('name', `description_${count}`);
                          newInput.className = 'w-full px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:border-transparent transition-all mb-3 text-gray-800';
                          newInput.placeholder = 'e.g., Dental consultation';
                          e.currentTarget.parentElement?.parentElement?.appendChild(newInput);
                        }}
                        className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-all text-sm font-semibold"
                      >
                        + Add Item
                      </button>
                    </div>
                    {editingServiceId && displayServices.find(s => s.id === editingServiceId)?.description ? (
                      displayServices.find(s => s.id === editingServiceId)?.description.map((desc, idx) => (
                        <input
                          key={idx}
                          type="text"
                          name={`description_${idx}`}
                          defaultValue={desc}
                          placeholder={`Service item ${idx + 1}`}
                          className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:border-transparent transition-all mb-3 text-gray-800"
                        />
                      ))
                    ) : (
                      <input
                        type="text"
                        name="description_0"
                        placeholder="e.g., Dental consultation"
                        className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:border-transparent transition-all mb-3 text-gray-800"
                      />
                    )}
                  </div>

                  <div className="flex gap-3 justify-end pt-6 border-t-2 border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddService(false);
                        setEditingServiceId(null);
                      }}
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
