/**
 * Utility functions for consistent date formatting
 * All user-facing dates use Indonesian format: DD/MM/YYYY
 * All database dates use ISO format: YYYY-MM-DD
 */

/**
 * Get current date in Indonesian format DD/MM/YYYY
 */
export const getCurrentDateIndonesian = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Get current date in ISO format YYYY-MM-DD (for database)
 */
export const getCurrentDateISO = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Alias for backward compatibility
export const getCurrentDateString = getCurrentDateISO;

/**
 * Format date to Indonesian format DD/MM/YYYY for display
 */
export const formatToIndonesian = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return getCurrentDateIndonesian();

  let date: Date;

  if (typeof dateInput === 'string') {
    // Try to detect format and parse
    if (dateInput.includes('/')) {
      // Already in DD/MM/YYYY or MM/DD/YYYY format
      const parts = dateInput.split('/');
      if (parts.length === 3) {
        const first = parseInt(parts[0]);
        const second = parseInt(parts[1]);
        const third = parseInt(parts[2]);

        // If third part is 4 digits (year), and first > 12, it's DD/MM/YYYY
        if (parts[2].length === 4) {
          if (first > 12) {
            // DD/MM/YYYY format
            date = new Date(third, second - 1, first);
          } else {
            // Assume DD/MM/YYYY (Indonesian format)
            date = new Date(third, second - 1, first);
          }
        } else {
          date = new Date(dateInput);
        }
      } else {
        date = new Date(dateInput);
      }
    } else if (dateInput.includes('-')) {
      // YYYY-MM-DD format
      const parts = dateInput.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        date = new Date(dateInput);
      }
    } else {
      date = new Date(dateInput);
    }
  } else {
    date = dateInput;
  }

  if (isNaN(date.getTime())) {
    console.warn('Invalid date input:', dateInput);
    return getCurrentDateIndonesian();
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Parse Indonesian format (DD/MM/YYYY) to ISO format (YYYY-MM-DD) for database
 */
export const parseIndonesianToISO = (dateStr: string): string => {
  if (!dateStr) return getCurrentDateISO();

  // Already in ISO format
  if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
    return dateStr.split('T')[0]; // Remove time part if exists
  }

  // Parse DD/MM/YYYY format
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      let day = parseInt(parts[0]);
      let month = parseInt(parts[1]);
      let year = parts[2];

      // Handle 2-digit year
      if (year.length === 2) {
        year = '20' + year;
      }
      const yearNum = parseInt(year);

      // Validate and fix invalid dates (e.g., Feb 30 -> Feb 28/29)
      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

      // Check for leap year
      if (month === 2 && ((yearNum % 4 === 0 && yearNum % 100 !== 0) || yearNum % 400 === 0)) {
        daysInMonth[1] = 29;
      }

      // Clamp day to valid range
      if (month >= 1 && month <= 12) {
        day = Math.min(day, daysInMonth[month - 1]);
      }

      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(month).padStart(2, '0');

      return `${year}-${monthStr}-${dayStr}`;
    }
  }

  // Fallback: try to parse and convert
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return getCurrentDateISO();
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format date string to YYYY-MM-DD format (for database)
 * Handles various input formats
 */
export const formatDateString = (dateInput: string | Date): string => {
  if (!dateInput) return getCurrentDateISO();

  if (typeof dateInput === 'string') {
    return parseIndonesianToISO(dateInput);
  }

  const date = dateInput;
  if (isNaN(date.getTime())) {
    console.warn('Invalid date input:', dateInput);
    return getCurrentDateISO();
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Fix date string that might have wrong year format
 */
export const fixDateString = (dateStr: string): string => {
  if (!dateStr) return getCurrentDateISO();

  return parseIndonesianToISO(dateStr);
};

/**
 * Get default date value for form inputs (in ISO format for HTML date inputs)
 * Note: HTML date inputs require YYYY-MM-DD format
 */
export const getDefaultDateValue = (initialDate?: string): string => {
  if (initialDate) {
    return parseIndonesianToISO(initialDate);
  }
  return getCurrentDateISO();
};

/**
 * Display date in Indonesian format for UI
 * Use this for all user-facing date displays
 */
export const displayDate = formatToIndonesian;