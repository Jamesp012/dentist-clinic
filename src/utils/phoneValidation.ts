/**
 * Validates and formats Philippine phone numbers
 * Format: +63XXXXXXXXXX (12 digits) or 09XXXXXXXXX (11 digits)
 */

export const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters except +
  let cleaned = value.replace(/[^\d+]/g, '');
  
  // If starts with 09 and has 11 digits, convert to +639
  if (cleaned.startsWith('09') && cleaned.length === 11) {
    cleaned = '+63' + cleaned.substring(1);
  }
  
  // If starts with 63 without +, add +
  if (cleaned.startsWith('63') && !cleaned.startsWith('+63')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
};

export const validatePhoneNumber = (value: string): { isValid: boolean; error?: string } => {
  const cleaned = value.replace(/[^\d+]/g, '');
  
  // Check if starts with +63 and has 12 digits total
  if (cleaned.startsWith('+63')) {
    if (cleaned.length !== 13) { // +63 (3 chars) + 10 digits = 13
      return {
        isValid: false,
        error: 'Phone number starting with +63 must have 10 digits after +63 (total 12 digits)'
      };
    }
    return { isValid: true };
  }
  
  // Check if starts with 63 and has 12 digits total
  if (cleaned.startsWith('63') && !cleaned.startsWith('+')) {
    if (cleaned.length !== 12) {
      return {
        isValid: false,
        error: 'Phone number starting with 63 must be exactly 12 digits'
      };
    }
    return { isValid: true };
  }
  
  // Check if starts with 09 and has 11 digits
  if (cleaned.startsWith('09')) {
    if (cleaned.length !== 11) {
      return {
        isValid: false,
        error: 'Phone number starting with 09 must be exactly 11 digits'
      };
    }
    return { isValid: true };
  }
  
  // If doesn't match any format
  if (cleaned.length === 0) {
    return { isValid: true }; // Allow empty for optional fields
  }
  
  return {
    isValid: false,
    error: 'Phone number must start with +63, 63, or 09'
  };
};

export const handlePhoneInput = (
  value: string,
  onChange: (formattedValue: string) => void
): void => {
  let formatted = value.replace(/[^\d+]/g, '');
  
  // Limit input based on format
  if (formatted.startsWith('+63')) {
    // Limit to 13 characters (+63 + 10 digits)
    formatted = formatted.substring(0, 13);
  } else if (formatted.startsWith('63') && !formatted.startsWith('+')) {
    // Limit to 12 characters
    formatted = formatted.substring(0, 12);
  } else if (formatted.startsWith('09')) {
    // Limit to 11 characters
    formatted = formatted.substring(0, 11);
  } else if (formatted.startsWith('0')) {
    // Only allow 09 format
    formatted = formatted.substring(0, 11);
  } else if (formatted.startsWith('+')) {
    // Only allow +63 format
    formatted = formatted.substring(0, 13);
  }
  
  onChange(formatted);
};
