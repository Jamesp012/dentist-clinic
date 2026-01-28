import { useState } from 'react';
import { Announcement, ServicePrice } from '../App';
import { Megaphone, Plus, X, Edit, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { PesoSign } from './icons/PesoSign';
import { announcementAPI } from '../api';

type AnnouncementsManagementProps = {
  announcements: Announcement[];
  setAnnouncements: (announcements: Announcement[]) => void;
  servicePrices: ServicePrice[];
  setServicePrices: (services: ServicePrice[]) => void;
};

export function AnnouncementsManagement({ announcements, setAnnouncements, servicePrices, setServicePrices }: AnnouncementsManagementProps) {
  const [activeTab, setActiveTab] = useState<'announcements' | 'services'>('announcements');
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [editingService, setEditingService] = useState<ServicePrice | null>(null);
  const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<Announcement['id'] | null>(null);

  const handleAddAnnouncement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = (formData.get('title') as string)?.trim();
    const message = (formData.get('message') as string)?.trim();
    const type = formData.get('type') as Announcement['type'];

    if (!title || !message) {
      toast.error('Title and message are required');
      return;
    }

    try {
      setIsPostingAnnouncement(true);
      const createdAnnouncement = await announcementAPI.create({
        title,
        message,
        type,
        date: new Date().toISOString().split('T')[0],
      });

      setAnnouncements((prev) => [createdAnnouncement, ...prev]);
      e.currentTarget.reset();
      setShowAddAnnouncement(false);
      toast.success('Announcement posted successfully!');
    } catch (error) {
      console.error('Failed to post announcement', error);
      toast.error('Failed to post announcement. Please try again.');
    } finally {
      setIsPostingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (id: Announcement['id']) => {
    try {
      setDeletingAnnouncementId(id);
      await announcementAPI.delete(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success('Announcement deleted');
    } catch (error) {
      console.error('Failed to delete announcement', error);
      toast.error('Failed to delete announcement. Please try again.');
    } finally {
      setDeletingAnnouncementId(null);
    }
  };

  const handleAddService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newService: ServicePrice = {
      id: Date.now().toString(),
      serviceName: formData.get('serviceName') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      category: formData.get('category') as string,
      duration: formData.get('duration') as string
    };
    setServicePrices([...servicePrices, newService]);
    setShowAddService(false);
    toast.success('Service added successfully!');
  };

  const handleUpdateService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingService) return;
    
    const formData = new FormData(e.currentTarget);
    const updatedService: ServicePrice = {
      ...editingService,
      serviceName: formData.get('serviceName') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      category: formData.get('category') as string,
      duration: formData.get('duration') as string
    };
    
    setServicePrices(servicePrices.map(s => s.id === updatedService.id ? updatedService : s));
    setEditingService(null);
    toast.success('Service updated successfully!');
  };

  const handleDeleteService = (id: string) => {
    setServicePrices(servicePrices.filter(s => s.id !== id));
    toast.success('Service deleted');
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

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl mb-2">Announcements & Services</h1>
        <p className="text-gray-600">Manage announcements and service price list</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white p-2 rounded-lg shadow-sm">
        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'announcements'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Megaphone className="w-5 h-5 inline-block mr-2" />
          Announcements
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'services'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <PesoSign className="w-5 h-5 inline-block mr-2" />
          Service Price List
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
            {announcements.map(announcement => (
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
            ))}
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
            <h2 className="text-xl">Service Price List</h2>
            <button
              onClick={() => setShowAddService(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Service
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm text-gray-600">Service Name</th>
                  <th className="px-6 py-3 text-left text-sm text-gray-600">Category</th>
                  <th className="px-6 py-3 text-left text-sm text-gray-600">Duration</th>
                  <th className="px-6 py-3 text-left text-sm text-gray-600">Price</th>
                  <th className="px-6 py-3 text-left text-sm text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {servicePrices.map(service => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium">{service.serviceName}</p>
                      <p className="text-sm text-gray-600">{service.description}</p>
                    </td>
                    <td className="px-6 py-4">{service.category}</td>
                    <td className="px-6 py-4">{service.duration}</td>
                    <td className="px-6 py-4 text-lg">₱{service.price.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingService(service)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add/Edit Service Modal */}
          {(showAddService || editingService) && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl">{editingService ? 'Edit Service' : 'Add Service'}</h2>
                  <button
                    onClick={() => {
                      setShowAddService(false);
                      setEditingService(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={editingService ? handleUpdateService : handleAddService} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-1">Service Name *</label>
                      <input
                        type="text"
                        name="serviceName"
                        required
                        defaultValue={editingService?.serviceName}
                        placeholder="e.g., Teeth Cleaning"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Category *</label>
                      <input
                        type="text"
                        name="category"
                        required
                        defaultValue={editingService?.category}
                        placeholder="e.g., Preventive"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Description *</label>
                    <textarea
                      name="description"
                      required
                      rows={3}
                      defaultValue={editingService?.description}
                      placeholder="Brief description of the service..."
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-1">Price (₱) *</label>
                      <input
                        type="number"
                        name="price"
                        required
                        step="0.01"
                        defaultValue={editingService?.price}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Duration</label>
                      <input
                        type="text"
                        name="duration"
                        defaultValue={editingService?.duration}
                        placeholder="e.g., 30 minutes"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddService(false);
                        setEditingService(null);
                      }}
                      className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {editingService ? 'Update Service' : 'Add Service'}
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
