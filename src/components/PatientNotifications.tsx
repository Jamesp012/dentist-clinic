import { useState, useEffect } from 'react';
import { Patient, Appointment } from '../App';
import { Bell, X, Check, AlertCircle, Calendar, Trash2, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { notificationAPI } from '../api';
import { formatToMonthDayYear, timeAgo } from '../utils/dateHelpers';
import { toast } from 'sonner';

type PatientNotificationItem = {
  id: string | number;
  patientId: string | number;
  appointmentId?: string | number;
  type: 'appointment_created' | 'appointment_updated' | 'appointment_cancelled' | 'reminder' | 'announcement_posted';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
};

type PatientNotificationsProps = {
  patient: Patient;
  appointments?: Appointment[];
  onNavigate?: (tab: string) => void;
};

export function PatientNotifications({ patient, appointments, onNavigate }: PatientNotificationsProps) {
  const [notifications, setNotifications] = useState<PatientNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load notifications on component mount and set up polling
  useEffect(() => {
    loadNotifications();
    // Poll for new notifications every 5 seconds
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationAPI.getAll();
      
      // Filter out expired notifications
      const now = new Date();
      const validNotifications = data.filter((n: PatientNotificationItem) => {
        if (!n.expiresAt) return true;
        return new Date(n.expiresAt) > now;
      });

      // Sort by createdAt in descending order (newest first)
      const sorted = validNotifications.sort((a: PatientNotificationItem, b: PatientNotificationItem) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setNotifications(sorted);
      const unread = sorted.filter((n: PatientNotificationItem) => !n.isRead).length;
      setUnreadCount(unread);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string | number) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(
        notifications.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead(String(patient.id));
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to update notifications');
    }
  };

  const handleDeleteNotification = async (notificationId: string | number) => {
    try {
      await notificationAPI.delete(notificationId);
      const deletedNotif = notifications.find(n => n.id === notificationId);
      setNotifications(notifications.filter(n => n.id !== notificationId));
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleNotificationClick = (notification: PatientNotificationItem) => {
    // If it's an announcement notification, navigate to the announcements tab
    if (notification.type === 'announcement_posted' && onNavigate) {
      onNavigate('announcements');
      setShowPanel(false);
    }
    // Mark as read if not already
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment_created':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'appointment_cancelled':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'appointment_updated':
        return <Calendar className="w-5 h-5 text-orange-600" />;
      case 'reminder':
        return <Bell className="w-5 h-5 text-yellow-600" />;
      case 'announcement_posted':
        return <Megaphone className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'appointment_created':
        return 'bg-blue-50 border-l-4 border-blue-500';
      case 'appointment_cancelled':
        return 'bg-red-50 border-l-4 border-red-500';
      case 'appointment_updated':
        return 'bg-orange-50 border-l-4 border-orange-500';
      case 'reminder':
        return 'bg-yellow-50 border-l-4 border-yellow-500';
      case 'announcement_posted':
        return 'bg-purple-50 border-l-4 border-purple-500';
      default:
        return 'bg-gray-50 border-l-4 border-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const datePart = formatToMonthDayYear(date);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${datePart} ${hours}:${minutes}`;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Notification bell button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowPanel(!showPanel)}
        className="relative w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-center"
        title="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showPanel && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowPanel(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-20 right-0 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-[500px] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  <p className="text-sm text-gray-600">
                    {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                  </p>
                </div>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>Loading notifications...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 transition-colors ${
                          notification.type === 'announcement_posted' ? 'cursor-pointer hover:bg-purple-50' : 'hover:bg-gray-50'
                        } ${
                          !notification.isRead ? 'bg-blue-50' : ''
                        } ${getNotificationColor(notification.type)}`}
                      >
                        <div className="flex gap-3">
                          {/* Icon */}
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className={`text-sm font-semibold text-gray-900 ${
                                  !notification.isRead ? 'font-bold' : ''
                                }`}>
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-700 mt-1 break-words">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                  {timeAgo(notification.createdAt)}
                                </p>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2 ml-2 flex-shrink-0">
                                {!notification.isRead && (
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleMarkAsRead(notification.id)}
                                    className="p-1 hover:bg-blue-200 rounded-lg transition-colors"
                                    title="Mark as read"
                                  >
                                    <Check className="w-4 h-4 text-blue-600" />
                                  </motion.button>
                                )}
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleDeleteNotification(notification.id)}
                                  className="p-1 hover:bg-red-200 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </motion.button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && unreadCount > 0 && (
                <div className="p-3 bg-gray-50 border-t border-gray-200">
                  <button
                    onClick={handleMarkAllAsRead}
                    className="w-full text-sm text-blue-600 hover:text-blue-700 font-semibold py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Mark all as read
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
