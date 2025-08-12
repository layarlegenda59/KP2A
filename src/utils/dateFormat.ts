/**
 * Utility functions for consistent date formatting
 */

/**
 * Get current date in YYYY-MM-DD format
 * Ensures year is always 4 digits
 */
export const getCurrentDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format date string to YYYY-MM-DD format
 * Handles various input formats and ensures 4-digit year
 */
export const formatDateString = (dateInput: string | Date): string => {
  if (!dateInput) return getCurrentDateString();
  
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) {
    console.warn('Invalid date input:', dateInput);
    return getCurrentDateString();
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Ensure year is 4 digits and reasonable
  if (year < 1000 || year > 9999) {
    console.warn('Invalid year detected:', year, 'Using current year instead');
    return getCurrentDateString();
  }
  
  return `${year}-${month}-${day}`;
};

/**
 * Fix date string that might have wrong year format
 * Specifically handles cases where year shows as "0023" instead of "2023"
 */
export const fixDateString = (dateStr: string): string => {
  if (!dateStr) return getCurrentDateString();
  
  // Handle YYYY-MM-DD format with potential year issues
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    let [year, month, day] = parts;
    
    // Fix year if it's in wrong format (e.g., "0023" -> "2023")
    if (year.length === 4 && year.startsWith('00')) {
      year = '20' + year.slice(2);
    }
    
    // Validate year range
    const yearNum = parseInt(year, 10);
    if (yearNum < 2020 || yearNum > 2100) {
      console.warn('Year out of expected range:', yearNum, 'Using current year');
      year = String(new Date().getFullYear());
    }
    
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // If not in expected format, try to parse and reformat
  return formatDateString(dateStr);
};

/**
 * Get default date value for form inputs
 * Ensures consistent format across all forms
 */
export const getDefaultDateValue = (initialDate?: string): string => {
  if (initialDate) {
    return fixDateString(initialDate);
  }
  return getCurrentDateString();
};