import { useEffect, useCallback, useRef } from 'react';
import { patientAPI, appointmentAPI, inventoryAPI, referralAPI, treatmentRecordAPI, paymentAPI, announcementAPI, serviceAPI } from '../api';

/**
 * Helper function to normalize appointment dates to YYYY-MM-DD format
 * This prevents timezone issues when displaying appointments
 */
const getDateString = (date: string | Date): string => {
  if (typeof date === 'string') {
    return date.includes('T') ? date.split('T')[0] : date;
  }
  // Use UTC methods to avoid timezone conversion
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Custom hook for real-time data synchronization across the application
 * Automatically refreshes data from the server at intervals and when triggered
 */

type UseDataSyncProps = {
  setPatients: (patients: any[]) => void;
  setAppointments: (appointments: any[]) => void;
  setTreatmentRecords: (records: any[]) => void;
  setInventory?: (inventory: any[]) => void;
  setReferrals?: (referrals: any[]) => void;
  setPayments?: (payments: any[]) => void;
  setAnnouncements?: (announcements: any[]) => void;
  isAuthenticated?: boolean;
};

export function useDataSync({
  setPatients,
  setAppointments,
  setTreatmentRecords,
  setInventory,
  setReferrals,
  setPayments,
  setAnnouncements,
  isAuthenticated = false,
}: UseDataSyncProps) {
  const isSyncing = useRef(false);
  const hasEncountered401 = useRef(false);
  
  /**
   * Fetch and update patients
   */
  const refreshPatients = useCallback(async () => {
    if (!isAuthenticated || hasEncountered401.current) return false;
    try {
      const patientsData = await patientAPI.getAll();
      // Reduce console spam - only log if count changes or on error
      setPatients(patientsData || []);
      return true;
    } catch (error: any) {
      if (error.message?.includes('401')) {
        hasEncountered401.current = true;
      }
      console.error('Failed to refresh patients:', error);
      return false;
    }
  }, [setPatients, isAuthenticated]);

  /**
   * Fetch and update treatment records
   */
  const refreshTreatmentRecords = useCallback(async () => {
    if (!isAuthenticated || hasEncountered401.current) return false;
    try {
      const recordsData = await treatmentRecordAPI.getAll();
      const convertedRecords = (recordsData || []).map(record => ({
        ...record,
        cost: typeof record.cost === 'string' ? parseFloat(record.cost) : record.cost,
        amountPaid: typeof record.amountPaid === 'string' ? parseFloat(record.amountPaid) : record.amountPaid,
        remainingBalance: typeof record.remainingBalance === 'string' ? parseFloat(record.remainingBalance) : record.remainingBalance,
      }));
      setTreatmentRecords(convertedRecords);
      return true;
    } catch (error: any) {
      if (error.message?.includes('401')) {
        hasEncountered401.current = true;
      }
      console.error('Failed to refresh treatment records:', error);
      return false;
    }
  }, [setTreatmentRecords, isAuthenticated]);

  /**
   * Fetch and update payments
   */
  const refreshPayments = useCallback(async () => {
    if (!isAuthenticated || hasEncountered401.current) return false;
    try {
      if (!setPayments) return false;
      const paymentsData = await paymentAPI.getAll();
      const convertedPayments = (paymentsData || []).map(payment => ({
        ...payment,
        amount: typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount,
      }));
      setPayments(convertedPayments);
      return true;
    } catch (error: any) {
      if (error.message?.includes('401')) {
        hasEncountered401.current = true;
      }
      console.error('Failed to refresh payments:', error);
      return false;
    }
  }, [setPayments, isAuthenticated]);

  /**
   * Fetch and update announcements
   */
  const refreshAnnouncements = useCallback(async () => {
    if (!isAuthenticated || hasEncountered401.current) return false;
    try {
      if (!setAnnouncements) return false;
      const announcementsData = await announcementAPI.getAll();
      setAnnouncements(announcementsData || []);
      return true;
    } catch (error: any) {
      if (error.message?.includes('401')) {
        hasEncountered401.current = true;
      }
      console.error('Failed to refresh announcements:', error);
      return false;
    }
  }, [setAnnouncements, isAuthenticated]);

  /**
   * Fetch and update appointments
   */
  const refreshAppointments = useCallback(async () => {
    if (!isAuthenticated || hasEncountered401.current) return false;
    try {
      const appointmentsData = await appointmentAPI.getAll();
      // Normalize all appointment dates to YYYY-MM-DD format to prevent timezone issues
      const normalizedAppointments = (appointmentsData || []).map(apt => ({
        ...apt,
        date: getDateString(apt.date)
      }));
      setAppointments(normalizedAppointments);
      return true;
    } catch (error: any) {
      if (error.message?.includes('401')) {
        hasEncountered401.current = true;
      }
      console.error('Failed to refresh appointments:', error);
      return false;
    }
  }, [setAppointments, isAuthenticated]);

  /**
   * Fetch and update inventory
   */
  const refreshInventory = useCallback(async () => {
    if (!isAuthenticated || hasEncountered401.current) return false;
    try {
      if (!setInventory) return false;
      const inventoryData = await inventoryAPI.getAll();
      const convertedInventory = (inventoryData || []).map(item => ({
        ...item,
        quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity,
        minQuantity: typeof item.minQuantity === 'string' ? parseInt(item.minQuantity) : item.minQuantity,
        cost: typeof item.cost === 'string' ? parseFloat(item.cost) : item.cost,
      }));
      setInventory(convertedInventory);
      return true;
    } catch (error: any) {
      if (error.message?.includes('401')) {
        hasEncountered401.current = true;
      }
      console.error('Failed to refresh inventory:', error);
      return false;
    }
  }, [setInventory, isAuthenticated]);

  /**
   * Fetch and update referrals
   */
  const refreshReferrals = useCallback(async () => {
    if (!isAuthenticated || hasEncountered401.current) return false;
    try {
      if (!setReferrals) return false;
      const referralsData = await referralAPI.getAll();
      setReferrals(referralsData || []);
      return true;
    } catch (error: any) {
      if (error.message?.includes('401')) {
        hasEncountered401.current = true;
      }
      console.error('Failed to refresh referrals:', error);
      return false;
    }
  }, [setReferrals, isAuthenticated]);

  /**
   * Refresh all data
   */
  const refreshAll = useCallback(async () => {
    if (!isAuthenticated || hasEncountered401.current || isSyncing.current) return false;
    
    isSyncing.current = true;
    try {
      // Use sequential instead of parallel to stop at the first 401
      const p = await refreshPatients();
      if (hasEncountered401.current) return false;
      
      const a = await refreshAppointments();
      if (hasEncountered401.current) return false;
      
      const i = await refreshInventory();
      if (hasEncountered401.current) return false;
      
      const r = await refreshReferrals();
      if (hasEncountered401.current) return false;
      
      const t = await refreshTreatmentRecords();
      if (hasEncountered401.current) return false;
      
      const py = await refreshPayments();
      if (hasEncountered401.current) return false;
      
      const an = await refreshAnnouncements();
      
      return p && a && i && r && t && py && an;
    } catch (error) {
      console.error('Failed to refresh all data:', error);
      return false;
    } finally {
      isSyncing.current = false;
    }
  }, [refreshPatients, refreshAppointments, refreshInventory, refreshReferrals, refreshTreatmentRecords, refreshPayments, refreshAnnouncements, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      hasEncountered401.current = false;
      // Disabled to prevent infinite re-renders
      // refreshAll();
    }
  }, [isAuthenticated]);

  /**
   * Set up auto-refresh intervals
   */
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Disabled to prevent infinite re-renders while debugging
    // const patientsInterval = setInterval(refreshPatients, 30000);
    // const appointmentsInterval = setInterval(refreshAppointments, 30000);
    // const treatmentRecordsInterval = setInterval(refreshTreatmentRecords, 30000);
    // const paymentsInterval = setInterval(refreshPayments, 30000);
    // const announcementsInterval = setInterval(refreshAnnouncements, 60000);
    // const inventoryInterval = setInterval(refreshInventory, 60000);

    // return () => {
    //   clearInterval(patientsInterval);
    //   clearInterval(appointmentsInterval);
    //   clearInterval(treatmentRecordsInterval);
    //   clearInterval(paymentsInterval);
    //   clearInterval(announcementsInterval);
    //   clearInterval(inventoryInterval);
    // };
  }, [isAuthenticated]);

  return {
    refreshAll,
    refreshPatients,
    refreshAppointments,
    refreshInventory,
    refreshReferrals,
    refreshTreatmentRecords,
    refreshPayments,
    refreshAnnouncements,
  };
}
