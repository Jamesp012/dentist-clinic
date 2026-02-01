/**
 * Convert MM/DD/YYYY to YYYY-MM-DD for database storage
 */
export function convertToDBDate(dateStr: string): string {
  if (!dateStr) return '';
  
  // If already in YYYY-MM-DD format, return as is
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  // Convert MM/DD/YYYY to YYYY-MM-DD
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [month, day, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return dateStr;
}

/**
 * Convert YYYY-MM-DD to MM/DD/YYYY for display
 */
export function convertToDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  
  // If already in MM/DD/YYYY format, return as is
  if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    return dateStr;
  }
  
  // Handle ISO date format (YYYY-MM-DDTHH:mm:ss.sssZ)
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  
  // Convert YYYY-MM-DD to MM/DD/YYYY
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${month}/${day}/${year}`;
  }
  
  return dateStr;
}

/**
 * Validate MM/DD/YYYY format
 */
export function isValidDateFormat(dateStr: string): boolean {
  if (!dateStr) return false;
  
  const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
  return regex.test(dateStr);
}

/**
 * Format a date string while typing (auto-adds slashes)
 */
export function formatDateInput(value: string): string {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, '');
  
  // Add slashes as user types
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 4) {
    return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  } else {
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  }
}
