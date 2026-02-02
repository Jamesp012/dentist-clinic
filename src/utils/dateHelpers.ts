/**
 * Convert DD/MM/YYYY to YYYY-MM-DD for database storage
 */
export function convertToDBDate(dateStr: string): string {
  if (!dateStr) return '';
  
  // If already in YYYY-MM-DD format, return as is
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  // Convert DD/MM/YYYY to YYYY-MM-DD
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return dateStr;
}

/**
 * Convert YYYY-MM-DD to DD/MM/YYYY for display
 */
export function convertToDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  
  // If already in DD/MM/YYYY format, return as is
  if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    return dateStr;
  }
  
  // Handle ISO date format (YYYY-MM-DDTHH:mm:ss.sssZ)
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  
  // Convert YYYY-MM-DD to DD/MM/YYYY
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  
  return dateStr;
}

/**
 * Validate DD/MM/YYYY format
 */
export function isValidDateFormat(dateStr: string): boolean {
  if (!dateStr) return false;
  
  const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
  return regex.test(dateStr);
}

/**
 * Format a date string while typing (auto-adds slashes for DD/MM/YYYY)
 * Maintains slashes as the user types
 */
export function formatDateInput(value: string): string {
  if (!value) return '';

  // Keep only digits and slashes
  const cleaned = value.replace(/[^\d/]/g, '');
  const slashCount = (cleaned.match(/\//g) || []).length;
  const endsWithSlash = cleaned.endsWith('/');

  // Strip slashes for digit processing
  const digits = cleaned.replace(/\//g, '').slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  // If user typed a slash first, preserve it
  if (!day) {
    return cleaned;
  }

  let result = day;

  // Add/preserve first slash
  if (day.length === 2 && (digits.length > 2 || slashCount >= 1 || endsWithSlash)) {
    result += '/';
  }

  // Add month
  if (month) {
    result += month;

    // Add/preserve second slash
    if (month.length === 2 && (digits.length > 4 || slashCount >= 2 || endsWithSlash)) {
      result += '/';
    }
  } else if (endsWithSlash && result.length === 2) {
    return `${day}/`;
  }

  // Add year
  if (year) {
    result += year;
  } else if (endsWithSlash && result.length === 5) {
    return `${day}/${month}/`;
  }

  return result.slice(0, 10);
}

/**
 * Get today's date in DD/MM/YYYY format
 */
export function getTodayInDisplayFormat(): string {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parse DD/MM/YYYY string to Date object
 */
export function parseDateString(dateStr: string): Date | null {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  
  const [day, month, year] = parts.map(p => parseInt(p, 10));
  
  // Validate ranges
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  
  const date = new Date(year, month - 1, day);
  
  // Check if the date is valid (e.g., no Feb 30)
  if (date.getMonth() !== month - 1) return null;
  
  return date;
}

/**
 * Format a date to DD/MM/YYYY string
 * Accepts Date object, ISO string, or YYYY-MM-DD string
 */
export function formatToDD_MM_YYYY(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // Handle ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
    if (date.includes('T')) {
      dateObj = new Date(date);
    } 
    // Handle YYYY-MM-DD format
    else if (date.includes('-')) {
      const [year, month, day] = date.split('-');
      dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    // Handle DD/MM/YYYY format
    else if (date.includes('/')) {
      const [day, month, year] = date.split('/');
      dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      return date;
    }
  } else {
    dateObj = date;
  }
  
  // Validate the date
  if (isNaN(dateObj.getTime())) return '';
  
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Format a date to "Mon. DD, YYYY" string
 * Accepts Date object, ISO string, YYYY-MM-DD, or DD/MM/YYYY
 */
export function formatToMonthDayYear(date: Date | string | null | undefined): string {
  if (!date) return '';

  let dateObj: Date;

  if (typeof date === 'string') {
    if (date.includes('T')) {
      dateObj = new Date(date);
    } else if (date.includes('-')) {
      const [year, month, day] = date.split('-');
      dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    } else if (date.includes('/')) {
      const [day, month, year] = date.split('/');
      dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    } else {
      return date;
    }
  } else {
    dateObj = date;
  }

  if (isNaN(dateObj.getTime())) return '';

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[dateObj.getMonth()];
  const day = String(dateObj.getDate()).padStart(2, '0');
  const year = dateObj.getFullYear();

  return `${month}. ${day}, ${year}`;
}

