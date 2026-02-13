import { SERVER_URL } from '../api';

/**
 * Helper to generate safe backend URL for uploaded files
 * @param file File object containing url or filePath
 * @returns Fully qualified URL to the file
 */
export const getSafeFileUrl = (file: any): string => {
  if (!file || (!file.url && !file.filePath)) return '';
  
  // Prefer url, fallback to filePath if url is missing
  let filePath = file.url || file.filePath;
  
  // Normalize slashes for consistency
  filePath = filePath.replace(/\\/g, '/');

  // Case 1: Already a clean URL path (starts with /uploads/)
  if (filePath.startsWith('/uploads/')) {
     // Good to go
  }
  // Case 2: Contains /uploads/ (e.g. absolute path C:/.../uploads/...) - Extract relative path
  else if (filePath.includes('/uploads/')) {
      filePath = filePath.substring(filePath.indexOf('/uploads/'));
  } 
  // Case 3: Just a filename (no slashes) - Assume it belongs in referrals folder
  else if (!filePath.includes('/')) {
      filePath = `/uploads/referrals/${filePath}`;
  }
  // Case 4: Absolute path without /uploads/ keyword -> extract filename as last resort
  else if (filePath.includes(':')) {
       const parts = filePath.split('/');
       const filename = parts[parts.length - 1];
       filePath = `/uploads/referrals/${filename}`;
  }

  // Handle full URLs
  if (filePath.startsWith('http')) {
    // If it's already a full URL, check if it's pointing to localhost:5000 (legacy)
    // and if so, update it to use the current dynamic SERVER_URL
    if (filePath.includes('localhost:5000')) {
      return filePath.replace(/http:\/\/localhost:5000/g, SERVER_URL);
    }
    return filePath;
  }
  
  // Ensure leading slash
  if (!filePath.startsWith('/')) {
    filePath = `/${filePath}`;
  }

  const cleanPath = filePath.trim();
  const finalUrl = `${SERVER_URL}${cleanPath}`;
  return finalUrl;
};
