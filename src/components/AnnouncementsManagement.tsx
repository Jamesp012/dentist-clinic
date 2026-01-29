import { useState } from 'react';
import { Announcement } from '../App';
import { Plus, X, Trash2, Edit, Check } from 'lucide-react';
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
      
      toast.success('Announcement posted successfully!');
      
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
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl mb-2">Announcements & Services</h1>
        <p className="text-gray-600">Manage clinic announcements and services</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'announcements'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Announcements
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'services'
              ? 'text-pink-600 border-b-2 border-pink-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Services Offered
        </button>
      </div>

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl">Clinic Announcements</h2>
            <button
              onClick={() => setShowAddAnnouncement(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Announcement
            </button>
          </div>

          <div className="space-y-4">
            {announcements && announcements.length > 0 ? (
              announcements.map(announcement => (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-6 rounded-xl border-2 shadow-lg ${getAnnouncementColor(announcement.type)}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{getAnnouncementIcon(announcement.type)}</span>
                      <div>
                        <h3 className="text-lg">{announcement.title}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(announcement.date).toLocaleDateString()} • {announcement.createdBy}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                      disabled={deletingAnnouncementId === announcement.id}
                      className={`p-2 text-red-600 rounded-lg transition-colors ${
                        deletingAnnouncementId === announcement.id
                          ? 'opacity-60 cursor-not-allowed'
                          : 'hover:bg-red-100'
                      }`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-gray-700">{announcement.message}</p>
                  <div className="mt-3">
                    <span className="px-3 py-1 bg-white rounded-full text-sm capitalize">
                      {announcement.type}
                    </span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No announcements yet. Click "New Announcement" to create one.</p>
              </div>
            )}
          </div>

          {/* Add Announcement Modal */}
          {showAddAnnouncement && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl">New Announcement</h2>
                  <button onClick={() => setShowAddAnnouncement(false)} className="text-gray-500 hover:text-gray-700">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleAddAnnouncement} className="space-y-4">
                  <div>
                    <label className="block text-sm mb-1">Title *</label>
                    <input
                      type="text"
                      name="title"
                      required
                      placeholder="e.g., Holiday Promo"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Type *</label>
                    <select
                      name="type"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="general">General</option>
                      <option value="promo">Promo</option>
                      <option value="closure">Closure</option>
                      <option value="important">Important</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Message *</label>
                    <textarea
                      name="message"
                      required
                      rows={4}
                      placeholder="Enter announcement details..."
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowAddAnnouncement(false)}
                      className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPostingAnnouncement}
                      className={`px-6 py-2 rounded text-white ${
                        isPostingAnnouncement
                          ? 'bg-blue-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
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
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Professional Services</h2>
              <p className="text-gray-600 font-medium">Comprehensive dental care solutions tailored to your needs</p>
            </div>
            <button
              onClick={() => {
                setEditingServiceId(null);
                setShowAddService(true);
              }}
              className="px-6 py-3 bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all flex items-center gap-2 font-semibold"
            >
              <Plus className="w-5 h-5" />
              Add Service
            </button>
          </div>

          {displayServices && displayServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayServices.map((service) => (
                <div
                  key={service.id}
                  className="bg-white rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{service.serviceName}</h3>
                      <div className="flex gap-2 mb-4">
                        <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-semibold">
                          {service.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {service.description && service.description.length > 0 && (
                    <div className="mb-4 bg-gray-50 rounded-lg p-4">
                      <p className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Service Includes:</p>
                      <ul className="space-y-2">
                        {service.description.map((desc, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-pink-600 font-bold mt-1">•</span>
                            <span>{desc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="border-t-2 border-gray-200 pt-4 mb-4">
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Pricing</p>
                      <p className="text-lg font-bold text-gray-900">{service.price}</p>
                      <p className="text-xs text-gray-600 mt-2 italic">Pricing varies depending on the complexity of your case</p>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => {
                        setEditingServiceId(service.id);
                        setShowAddService(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <p className="text-lg font-semibold mb-2">No services available</p>
              <p>Click "Add Service" to create one or initialize with default services.</p>
            </div>
          )}

          {/* Add/Edit Service Modal */}
          {showAddService && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
                  <h2 className="text-3xl font-bold text-gray-900">{editingServiceId ? 'Edit Service' : 'Add Service'}</h2>
                  <button
                    onClick={() => {
                      setShowAddService(false);
                      setEditingServiceId(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleAddService} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-900">Service Name *</label>
                    <input
                      type="text"
                      name="serviceName"
                      required
                      defaultValue={editingServiceId ? displayServices.find(s => s.id === editingServiceId)?.serviceName : ''}
                      placeholder="e.g., ORAL EXAMINATION / CHECK-UP"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-900">Category *</label>
                      <input
                        type="text"
                        name="category"
                        required
                        defaultValue={editingServiceId ? displayServices.find(s => s.id === editingServiceId)?.category : ''}
                        placeholder="e.g., Consultation"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-900">Duration *</label>
                      <input
                        type="text"
                        name="duration"
                        required
                        defaultValue={editingServiceId ? displayServices.find(s => s.id === editingServiceId)?.duration : ''}
                        placeholder="e.g., 30 mins"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-900">Price</label>
                    <input
                      type="text"
                      name="price"
                      defaultValue={editingServiceId ? displayServices.find(s => s.id === editingServiceId)?.price : 'Price may vary'}
                      placeholder="e.g., Price may vary"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="border-t-2 border-gray-200 pt-5">
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
                          newInput.className = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all';
                          newInput.placeholder = 'e.g., Dental consultation';
                          e.currentTarget.parentElement?.parentElement?.appendChild(newInput);
                        }}
                        className="px-3 py-1 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-colors text-sm font-semibold"
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
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all mb-3"
                        />
                      ))
                    ) : (
                      <input
                        type="text"
                        name="description_0"
                        placeholder="e.g., Dental consultation"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all mb-3"
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
                      className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoadingService}
                      className={`px-6 py-3 rounded-lg text-white flex items-center gap-2 font-semibold transition-all ${
                        isLoadingService
                          ? 'bg-pink-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-pink-600 to-pink-700 hover:shadow-lg transform hover:scale-105'
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
