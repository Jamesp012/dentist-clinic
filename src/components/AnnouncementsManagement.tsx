import { useState } from 'react';
import { Announcement, ServicePrice } from '../App';
import { Plus, X, Trash2, Edit, Save } from 'lucide-react';
import { PesoSign } from './icons/PesoSign';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { announcementAPI } from '../api';

type AnnouncementsManagementProps = {
  announcements: Announcement[];
  setAnnouncements: (announcements: Announcement[]) => void;
  servicePrices?: ServicePrice[];
  setServicePrices?: (servicePrices: ServicePrice[]) => void;
};

export function AnnouncementsManagement({ announcements, setAnnouncements, servicePrices = [], setServicePrices }: AnnouncementsManagementProps) {
  const [activeTab, setActiveTab] = useState<'announcements' | 'services'>('announcements');
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<Announcement['id'] | null>(null);
  const [showAddService, setShowAddService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [isLoadingService, setIsLoadingService] = useState(false);

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
      const price = parseFloat(formData.get('price') as string);

      if (!serviceName || !category || !duration || !price) {
        toast.error('All fields are required');
        return;
      }

      const newService: ServicePrice = {
        id: editingServiceId || Date.now().toString(),
        serviceName,
        category,
        duration,
        price,
      };

      if (editingServiceId) {
        const updatedServices = servicePrices.map(s => s.id === editingServiceId ? newService : s);
        setServicePrices?.(updatedServices);
        toast.success('Service updated successfully');
        setEditingServiceId(null);
      } else {
        setServicePrices?.([...servicePrices, newService]);
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
    const updatedServices = servicePrices.filter(s => s.id !== id);
    setServicePrices?.(updatedServices);
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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl">Services Offered</h2>
            <button
              onClick={() => {
                setEditingServiceId(null);
                setShowAddService(true);
              }}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Service
            </button>
          </div>

          {servicePrices && servicePrices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Service Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Duration</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Price</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {servicePrices.map((service) => (
                    <tr key={service.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-800">{service.serviceName}</td>
                      <td className="py-3 px-4 text-gray-700">{service.category}</td>
                      <td className="py-3 px-4 text-gray-700">{service.duration}</td>
                      <td className="py-3 px-4 text-gray-800 font-semibold flex items-center gap-1">
                        <PesoSign className="w-4 h-4" />
                        {service.price?.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            setEditingServiceId(service.id);
                            setShowAddService(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors mr-2"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No services available. Click "Add Service" to create one.</p>
            </div>
          )}

          {/* Add/Edit Service Modal */}
          {showAddService && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl">{editingServiceId ? 'Edit Service' : 'Add Service'}</h2>
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
                <form onSubmit={handleAddService} className="space-y-4">
                  <div>
                    <label className="block text-sm mb-1">Service Name *</label>
                    <input
                      type="text"
                      name="serviceName"
                      required
                      defaultValue={editingServiceId ? servicePrices.find(s => s.id === editingServiceId)?.serviceName : ''}
                      placeholder="e.g., Tooth Extraction"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Category *</label>
                    <input
                      type="text"
                      name="category"
                      required
                      defaultValue={editingServiceId ? servicePrices.find(s => s.id === editingServiceId)?.category : ''}
                      placeholder="e.g., Extraction"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Duration *</label>
                    <input
                      type="text"
                      name="duration"
                      required
                      defaultValue={editingServiceId ? servicePrices.find(s => s.id === editingServiceId)?.duration : ''}
                      placeholder="e.g., 30 mins"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Price *</label>
                    <input
                      type="number"
                      name="price"
                      required
                      step="0.01"
                      defaultValue={editingServiceId ? servicePrices.find(s => s.id === editingServiceId)?.price : ''}
                      placeholder="e.g., 500"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddService(false);
                        setEditingServiceId(null);
                      }}
                      className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoadingService}
                      className={`px-6 py-2 rounded text-white flex items-center gap-2 ${
                        isLoadingService
                          ? 'bg-pink-400 cursor-not-allowed'
                          : 'bg-pink-600 hover:bg-pink-700'
                      }`}
                    >
                      {editingServiceId ? (
                        <>
                          <Save className="w-4 h-4" />
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
