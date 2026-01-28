import { useState, useEffect } from 'react';
import { Patient, Appointment, Referral } from '../App';
import { Bell, X, AlertCircle, Calendar, FileText, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type Notification = {
  id: string;
  type: 'appointment' | 'referral';
  patientId: string;
  patientName: string;
  message: string;
  date: string;
  read: boolean;
  details?: any;
};

type NotificationsProps = {
  patients: Patient[];
  appointments: Appointment[];
  referrals: Referral[];
  currentPatientId?: string; // For patient portal
};

export function Notifications({ patients, appointments, referrals, currentPatientId }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Generate notifications based on appointments and referrals
  useEffect(() => {
    const generatedNotifications: Notification[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Appointment reminders (2 days before)
    appointments.forEach(appointment => {
      // Only show for current patient in patient portal, or all in staff view
      if (currentPatientId && appointment.patientId !== currentPatientId) return;

      const appointmentDate = new Date(appointment.date);
      appointmentDate.setHours(0, 0, 0, 0);
      
      const twoDaysBefore = new Date(appointmentDate);
      twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);
      
      // Show notification if today is 2 days before or appointment is upcoming
      if (today >= twoDaysBefore && appointmentDate >= today && appointment.status === 'scheduled') {
        const daysUntil = Math.ceil((appointmentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        let message = '';
        if (daysUntil === 0) {
          message = `Your ${appointment.type} appointment is today at ${appointment.time}`;
        } else if (daysUntil === 1) {
          message = `Your ${appointment.type} appointment is tomorrow at ${appointment.time}`;
        } else {
          message = `Your ${appointment.type} appointment is in ${daysUntil} days on ${new Date(appointment.date).toLocaleDateString()} at ${appointment.time}`;
        }

        generatedNotifications.push({
          id: `apt-${appointment.id}`,
          type: 'appointment',
          patientId: appointment.patientId,
          patientName: appointment.patientName,
          message,
          date: appointment.date,
          read: false,
          details: appointment
        });
      }
    });

    // Referral notifications
    referrals.forEach(referral => {
      // Only show for current patient in patient portal, or all in staff view
      if (currentPatientId && referral.patientId !== currentPatientId) return;

      const referralDate = new Date(referral.date);
      const daysSinceReferral = Math.ceil((today.getTime() - referralDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Show notification for referrals made within the last 7 days
      if (daysSinceReferral >= 0 && daysSinceReferral <= 7) {
        let message = `You have been referred to ${referral.referredTo} (${referral.specialty})`;
        
        if (referral.specialty === 'X-Ray Imaging') {
          message += '. Please schedule your X-ray appointment as soon as possible';
        } else if (referral.specialty.includes('Orthodontics')) {
          message += ' for specialized orthodontic treatment';
        } else {
          message += ` for specialized treatment. Reason: ${referral.reason}`;
        }

        if (referral.urgency === 'urgent' || referral.urgency === 'emergency') {
          message = `⚠️ URGENT: ${message}`;
        }

        generatedNotifications.push({
          id: `ref-${referral.id}`,
          type: 'referral',
          patientId: referral.patientId,
          patientName: referral.patientName,
          message,
          date: referral.date,
          read: false,
          details: referral
        });
      }
    });

    setNotifications(generatedNotifications);
    setUnreadCount(generatedNotifications.filter(n => !n.read).length);
  }, [appointments, referrals, currentPatientId]);

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const dismissNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
    const notification = notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <motion.button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Bell className="w-6 h-6 text-gray-700" />
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
              className="fixed inset-0 z-[50000]"
              onClick={() => setShowPanel(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="fixed right-8 top-20 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-[50001] max-h-[600px] flex flex-col pointer-events-auto"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-purple-50">
                <div>
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  <p className="text-sm text-gray-600">{unreadCount} unread</p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 hover:bg-gray-50 transition-colors ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Icon */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                            notification.type === 'appointment' 
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-purple-100 text-purple-600'
                          }`}>
                            {notification.type === 'appointment' ? (
                              <Calendar className="w-5 h-5" />
                            ) : (
                              <FileText className="w-5 h-5" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notification.read ? 'font-semibold' : ''}`}>
                              {notification.message}
                            </p>
                            {!currentPatientId && notification.patientName && (
                              <p className="text-xs text-gray-500 mt-1">
                                Patient: {notification.patientName}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notification.date).toLocaleDateString()}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="text-blue-600 hover:text-blue-700"
                                title="Mark as read"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => dismissNotification(notification.id)}
                              className="text-gray-400 hover:text-gray-600"
                              title="Dismiss"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}