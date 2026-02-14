import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Patient, Appointment, Referral, Announcement } from '../App';
import { Bell, Calendar, FileText, Check, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { convertToDBDate, formatToMonthDayYear, timeAgo } from '../utils/dateHelpers';

export type Notification = {
  id: string;
  type: 'appointment' | 'referral' | 'announcement';
  patientId?: string;
  patientName?: string;
  title: string;
  message: string;
  date: string;
  createdAt: string;
  read: boolean;
  details?: any;
};

type NotificationsProps = {
  patients: Patient[];
  appointments: Appointment[];
  referrals: Referral[];
  announcements?: Announcement[];
  currentPatientId?: string; // For patient portal
  onNavigate?: (tab: string) => void; // Callback to navigate to a specific tab
};

export function Notifications({ patients: _patients, appointments, referrals, announcements = [], currentPatientId, onNavigate }: NotificationsProps) {
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
      return formatToMonthDayYear(normalized);
    }
    return dateStr ? formatToMonthDayYear(dateStr) : 'Invalid Date';
  };

  const getTimestampFromSources = ({
    createdAt,
    date,
    time,
    dateObj
  }: {
    createdAt?: string;
    date?: string;
    time?: string;
    dateObj?: Date;
  }) => {
    if (createdAt) {
      const parsed = new Date(createdAt);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }

    if (dateObj) {
      const derived = new Date(dateObj);
      if (!isNaN(derived.getTime())) {
        if (time) {
          const [hours, minutes] = time.split(':').map(Number);
          if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
            derived.setHours(hours, minutes, 0, 0);
          }
        }
        return derived.toISOString();
      }
    }

    if (date) {
      const normalized = normalizeDate(String(date));
      if (normalized) {
        const candidate = new Date(`${normalized}T${time ?? '09:00'}`);
        if (!isNaN(candidate.getTime())) {
          return candidate.toISOString();
        }
      }
    }

    return new Date().toISOString();
  };

  const formatNotificationTimestamp = (timestamp: string) => {
    if (!timestamp) return 'Date unavailable';
    return timeAgo(timestamp);
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

      // Create a display-friendly appointment type string
      const displayType = Array.isArray(appointment.type) ? appointment.type.join(', ') : String(appointment.type);

      // Show notification for newly scheduled appointments
      // For patients viewing staff-created appointments, always show the initial notification
      if (appointment.status === 'scheduled') {
        const { queueNumber, period } = getQueueInfo(appointment);
        const message = `New appointment scheduled for ${displayType} (Queue #${queueNumber} - ${period}) on ${getDisplayDate(normalizedDate)}`;
        const notifId = `apt-new-${appointment.id}`;
        const isRead = readIds.includes(notifId);
        const createdAt = getTimestampFromSources({
          createdAt: appointment.createdAt,
          date: normalizedDate,
          time: appointment.time
        });
        generatedNotifications.push({
          id: notifId,
          type: 'appointment',
          patientId: String(appointment.patientId),
          patientName: appointment.patientName,
          title: 'Appointment Scheduled',
          message,
          date: normalizedDate,
          createdAt,
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
          message = `Your ${displayType} appointment is today at ${formatTime(appointment.time)}`;
        } else if (daysUntil === 1) {
          message = `Your ${displayType} appointment is tomorrow at ${formatTime(appointment.time)}`;
        } else {
          message = `Your ${displayType} appointment is in ${daysUntil} days on ${getDisplayDate(normalizedDate)} at ${formatTime(appointment.time)}`;
        }

        const notifId = `apt-${appointment.id}`;
        const isRead = readIds.includes(notifId);
        const createdAt = getTimestampFromSources({
          dateObj: twoDaysBefore,
          time: appointment.time
        });
        generatedNotifications.push({
          id: notifId,
          type: 'appointment',
          patientId: String(appointment.patientId),
          patientName: appointment.patientName,
          title: 'Appointment Reminder',
          message,
          date: normalizedDate,
          createdAt,
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

      // Ensure referral date is valid
      if (!referral.date) return;
      const referralDate = new Date(referral.date);
      if (isNaN(referralDate.getTime())) return;

      const daysSinceReferral = Math.ceil((today.getTime() - referralDate.getTime()) / (1000 * 60 * 60 * 24));

      // Show notification for referrals made within the last 7 days
      if (daysSinceReferral >= 0 && daysSinceReferral <= 7) {
        const specialty = referral.specialty || '';
        const isIncoming = referral.referralType === 'incoming';
        
        let message = '';
        if (currentPatientId) {
          // Patient view
          if (isIncoming) {
            message = `You have been referred by ${referral.referredBy || 'another clinic'} (${specialty || 'General'})`;
          } else {
            message = `You have been referred to ${referral.referredTo || 'the specified clinic'} (${specialty || 'General'})`;
          }
        } else {
          // Staff view
          if (isIncoming) {
            message = `${referral.patientName} was referred by ${referral.referredBy || 'another clinic'}`;
          } else {
            message = `${referral.patientName} was referred to ${referral.referredTo || 'the specified clinic'}`;
          }
        }

        if (specialty === 'X-Ray Imaging') {
          message += '. Please schedule your X-ray appointment as soon as possible';
        } else if (specialty.includes('Orthodontics')) {
          message += ' for specialized orthodontic treatment';
        } else if (!isIncoming && !currentPatientId) {
            // No extra reason for staff outgoing
        } else if (referral.reason) {
          message += ` for specialized treatment. Reason: ${referral.reason}`;
        }

        if (referral.urgency === 'urgent' || referral.urgency === 'emergency') {
          message = `⚠️ URGENT: ${message}`;
        }

        const notifId = `ref-${referral.id}`;
        const isRead = readIds.includes(notifId);
        const createdAt = getTimestampFromSources({
          createdAt: referral.createdAt,
          date: referral.date
        });
        const title =
          referral.urgency === 'urgent' || referral.urgency === 'emergency'
            ? 'Urgent Referral'
            : 'Referral Update';
        generatedNotifications.push({
          id: notifId,
          type: 'referral',
          patientId: String(referral.patientId),
          patientName: referral.patientName,
          title,
          message,
          date: referral.date,
          createdAt,
          read: isRead,
          details: referral
        });
      }
    });

    // Announcement notifications
    announcements.forEach(announcement => {
      // Show notification for announcements made within the last 14 days
      const announcementDate = new Date(announcement.date);
      if (isNaN(announcementDate.getTime())) return;

      const diffInTime = today.getTime() - announcementDate.getTime();
      const diffInDays = diffInTime / (1000 * 3600 * 24);

      // Show if it's within the last 14 days (including today)
      // We use -1 to allow today's announcements even if they appear slightly in the future due to timezone
      if (diffInDays >= -1 && diffInDays <= 14) {
        const notifId = `ann-${announcement.id}`;
        const isRead = readIds.includes(notifId);
        
        generatedNotifications.push({
          id: notifId,
          type: 'announcement',
          title: announcement.title,
          message: announcement.message,
          date: announcement.date,
          createdAt: announcement.date,
          read: isRead,
          details: announcement
        });
      }
    });

    // Sort notifications by date in descending order (most recent first)
    const sortedNotifications = generatedNotifications.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    setNotifications(sortedNotifications);
    setUnreadCount(sortedNotifications.filter(n => !n.read).length);
  }, [appointments, referrals, announcements, currentPatientId, readIds]);

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

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <motion.button
        onClick={() => setShowPanel(!showPanel)}
        className="relative text-emerald-600 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-300 transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center font-medium shadow pointer-events-none"
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
                  className="fixed inset-0 z-[2147483646] bg-slate-900/10"
                  onClick={() => setShowPanel(false)}
                />

                {/* Panel */}
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="fixed right-8 top-20 w-96 bg-white rounded-2xl shadow-[0_20px_60px_rgba(15,23,42,0.15)] border border-slate-200 ring-1 ring-emerald-100 z-[2147483647] h-[70vh] max-h-[600px] flex flex-col pointer-events-auto"
                >
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 bg-emerald-50/80 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-slate-900">Notifications</h3>
                  <p className="text-sm text-slate-600">
                    {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-900 px-3 py-1.5 rounded-lg border border-transparent hover:border-emerald-200 hover:bg-white transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-light">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-emerald-100" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map(notification => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`relative p-4 pl-6 rounded-2xl border cursor-pointer transition-colors ${
                          !notification.read
                            ? 'border-emerald-200 bg-emerald-50/80 shadow-[0_10px_30px_rgba(16,185,129,0.18)]'
                            : 'border-slate-100 bg-white hover:border-emerald-100 hover:bg-emerald-50/40'
                        }`}
                        onClick={() => {
                          if (!notification.read) {
                            markAsRead(notification.id);
                          }
                          if (onNavigate) {
                            if (notification.type === 'appointment') {
                              onNavigate('appointments');
                            } else if (notification.type === 'referral') {
                              onNavigate(currentPatientId ? 'forms' : 'referrals');
                            } else if (notification.type === 'announcement') {
                              onNavigate('announcements');
                            }
                            setShowPanel(false);
                          }
                        }}
                      >
                        {!notification.read && (
                          <span className="absolute left-3 top-4 bottom-4 w-1 rounded-full bg-emerald-500" />
                        )}
                        <div className="flex gap-3">
                          {/* Icon */}
                          <div className="flex-shrink-0">
                            <div
                              className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                                notification.type === 'appointment'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : notification.type === 'referral'
                                  ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                  : 'border-blue-200 bg-blue-50 text-blue-700'
                              }`}
                            >
                              {notification.type === 'appointment' ? (
                                <Calendar className="w-5 h-5" />
                              ) : notification.type === 'referral' ? (
                                <FileText className="w-5 h-5" />
                              ) : (
                                <Megaphone className="w-5 h-5" />
                              )}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-slate-700 mt-1">
                              {notification.message}
                            </p>
                            {!currentPatientId && notification.patientName && (
                              <p className="text-xs text-slate-500 mt-2">
                                Patient: {notification.patientName}
                              </p>
                            )}
                            <p className="text-xs text-slate-500 mt-2">
                              {formatNotificationTimestamp(notification.createdAt)}
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
