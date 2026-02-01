import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Patient, Appointment, Referral } from '../App';
import { Bell, X, AlertCircle, Calendar, FileText, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { convertToDBDate, convertToDisplayDate } from '../utils/dateHelpers';

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
  onNavigate?: (tab: string) => void; // Callback to navigate to a specific tab
};

export function Notifications({ patients, appointments, referrals, currentPatientId, onNavigate }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readIds, setReadIds] = useState<string[]>([]);
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  const getReadStorageKey = (patientId?: string) => `notifications:read:${patientId ?? 'staff'}`;
  const readStorageKey = getReadStorageKey(currentPatientId);

  const loadReadIds = () => {
    if (typeof window === 'undefined') return [] as string[];
    try {
      const stored = localStorage.getItem(readStorageKey);
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [] as string[];
    }
  };

  const saveReadIds = (ids: string[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(readStorageKey, JSON.stringify(Array.from(new Set(ids))));
  };

  // Helper function to convert 24-hour time to 12-hour format with AM/PM
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const isValidDbDate = (dateStr: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || month < 1 || month > 12 || day < 1 || day > 31) return false;
    const testDate = new Date(year, month - 1, day);
    return testDate.getFullYear() === year && testDate.getMonth() === month - 1 && testDate.getDate() === day;
  };

  const normalizeDate = (dateStr: string) => {
    const normalized = convertToDBDate(dateStr);
    return isValidDbDate(normalized) ? normalized : '';
  };

  const getDisplayDate = (dateStr: string) => {
    const normalized = normalizeDate(dateStr);
    if (normalized) {
      return convertToDisplayDate(normalized);
    }
    return dateStr ? convertToDisplayDate(dateStr) : 'Invalid Date';
  };

  // Helper function to get queue number and queue period for an appointment
  const getQueueInfo = (appointment: Appointment) => {
    const appointmentHour = parseInt(appointment.time.split(':')[0]);
    const period = appointmentHour < 12 ? 'AM' : 'PM';
    
    // Get all appointments for the same date and period (scheduled or completed)
    const sameQueueAppointments = appointments
      .filter(apt => {
        const aptHour = parseInt(apt.time.split(':')[0]);
        const aptPeriod = aptHour < 12 ? 'AM' : 'PM';
        return (
          normalizeDate(String(apt.date || '')) === normalizeDate(String(appointment.date || '')) &&
          aptPeriod === period &&
          (apt.status === 'scheduled' || apt.status === 'completed')
        );
      })
      .sort((a, b) => {
        // Sort by time to get queue order
        const timeA = parseInt(a.time.split(':')[0]);
        const timeB = parseInt(b.time.split(':')[0]);
        return timeA - timeB;
      });
    
    const queueNumber = sameQueueAppointments.findIndex(apt => apt.id === appointment.id) + 1;
    return { queueNumber, period, totalInQueue: sameQueueAppointments.length, queueList: sameQueueAppointments };
  };

  useEffect(() => {
    setReadIds(loadReadIds());
  }, [currentPatientId]);

  // Generate notifications based on appointments and referrals
  useEffect(() => {
    const generatedNotifications: Notification[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Appointment notifications
    appointments.forEach(appointment => {
      // Only show for current patient in patient portal, or all in staff view
      if (currentPatientId && String(appointment.patientId) !== String(currentPatientId)) return;

      const createdByRole = appointment.createdByRole ?? 'staff';
      if (currentPatientId) {
        if (createdByRole !== 'staff') return;
      } else {
        if (createdByRole !== 'patient') return;
      }

      const normalizedDate = normalizeDate(String(appointment.date || ''));
      if (!normalizedDate) return;

      // Create date with UTC to avoid timezone issues
      const appointmentDate = new Date(normalizedDate + 'T00:00:00Z');
      appointmentDate.setHours(0, 0, 0, 0);
      
      // Show notification for newly scheduled appointments
      // For patients viewing staff-created appointments, always show the initial notification
      if (appointment.status === 'scheduled') {
        const { queueNumber, period } = getQueueInfo(appointment);
        const message = `New appointment scheduled for ${appointment.type} (Queue #${queueNumber} - ${period}) on ${getDisplayDate(normalizedDate)}`;
        const notifId = `apt-new-${appointment.id}`;
        const isRead = readIds.includes(notifId);
        generatedNotifications.push({
          id: notifId,
          type: 'appointment',
          patientId: appointment.patientId,
          patientName: appointment.patientName,
          message,
          date: normalizedDate,
          read: isRead,
          details: appointment
        });
      }
      
      // Appointment reminders (2 days before)
      const twoDaysBefore = new Date(appointmentDate);
      twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);
      
      // Show notification if today is 2 days before or appointment is upcoming
      if (today >= twoDaysBefore && appointmentDate >= today && appointment.status === 'scheduled') {
        const daysUntil = Math.ceil((appointmentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        let message = '';
        if (daysUntil === 0) {
          message = `Your ${appointment.type} appointment is today at ${formatTime(appointment.time)}`;
        } else if (daysUntil === 1) {
          message = `Your ${appointment.type} appointment is tomorrow at ${formatTime(appointment.time)}`;
        } else {
          message = `Your ${appointment.type} appointment is in ${daysUntil} days on ${getDisplayDate(normalizedDate)} at ${formatTime(appointment.time)}`;
        }

        const notifId = `apt-${appointment.id}`;
        const isRead = readIds.includes(notifId);
        generatedNotifications.push({
          id: notifId,
          type: 'appointment',
          patientId: appointment.patientId,
          patientName: appointment.patientName,
          message,
          date: normalizedDate,
          read: isRead,
          details: appointment
        });
      }
    });

    // Referral notifications
    referrals.forEach(referral => {
      // Only show for current patient in patient portal, or all in staff view
      if (currentPatientId && String(referral.patientId) !== String(currentPatientId)) return;

      const createdByRole = referral.createdByRole ?? 'staff';
      if (currentPatientId) {
        if (createdByRole !== 'staff') return;
      } else {
        if (createdByRole !== 'patient') return;
      }

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

        const notifId = `ref-${referral.id}`;
        const isRead = readIds.includes(notifId);
        generatedNotifications.push({
          id: notifId,
          type: 'referral',
          patientId: referral.patientId,
          patientName: referral.patientName,
          message,
          date: referral.date,
          read: isRead,
          details: referral
        });
      }
    });

    setNotifications(generatedNotifications);
    setUnreadCount(generatedNotifications.filter(n => !n.read).length);
  }, [appointments, referrals, currentPatientId, readIds]);

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
    setReadIds(prev => {
      const next = prev.includes(id) ? prev : [...prev, id];
      saveReadIds(next);
      return next;
    });
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    setReadIds(prev => {
      const allIds = notifications.map(n => n.id);
      const next = Array.from(new Set([...prev, ...allIds]));
      saveReadIds(next);
      return next;
    });
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
      {portalTarget &&
        createPortal(
          <AnimatePresence>
            {showPanel && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[2147483646]"
                  onClick={() => setShowPanel(false)}
                />

                {/* Panel */}
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="fixed right-8 top-20 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-[2147483647] h-[70vh] max-h-[600px] flex flex-col pointer-events-auto"
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
              <div className="flex-1 overflow-y-auto">
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
                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => {
                          if (!notification.read) {
                            markAsRead(notification.id);
                          }
                          if (onNavigate) {
                            onNavigate('appointments');
                            setShowPanel(false);
                          }
                        }}
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
                              {getDisplayDate(notification.date)}
                            </p>
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
          </AnimatePresence>,
          portalTarget
        )}
    </div>
  );
}