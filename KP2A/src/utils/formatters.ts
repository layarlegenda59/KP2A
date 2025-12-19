/**
 * Utility functions for formatting data in the application
 */

/**
 * Format number as Indonesian Rupiah currency
 */
export const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return 'Rp 0';
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
};

/**
 * Format number with thousand separators
 */
export const formatNumber = (num: number | string): string => {
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  
  if (isNaN(numValue)) {
    return '0';
  }

  return new Intl.NumberFormat('id-ID').format(numValue);
};

/**
 * Format date to Indonesian format
 */
export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj);
};

/**
 * Format date to long Indonesian format
 */
export const formatDateLong = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
};

/**
 * Format date and time
 */
export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  if (isNaN(value)) {
    return '0%';
  }

  return `${value.toFixed(decimals)}%`;
};

/**
 * Format phone number to Indonesian format
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Convert to Indonesian format
  if (cleaned.startsWith('62')) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith('0')) {
    return `+62${cleaned.substring(1)}`;
  } else {
    return `+62${cleaned}`;
  }
};

/**
 * Format member ID with prefix
 */
export const formatMemberId = (id: string | number): string => {
  if (!id) return '';
  
  const idStr = id.toString();
  return `KP2A-${idStr.padStart(4, '0')}`;
};

/**
 * Parse currency string to number
 */
export const parseCurrency = (currencyStr: string): number => {
  if (!currencyStr) return 0;
  
  // Remove currency symbols and separators
  const cleaned = currencyStr.replace(/[Rp\s.,]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength) + '...';
};

/**
 * Capitalize first letter of each word
 */
export const capitalizeWords = (text: string): string => {
  if (!text) return '';
  
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Format loan status to Indonesian
 */
export const formatLoanStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'active': 'Aktif',
    'paid': 'Lunas',
    'overdue': 'Menunggak',
    'pending': 'Menunggu',
    'approved': 'Disetujui',
    'rejected': 'Ditolak',
  };
  
  return statusMap[status.toLowerCase()] || status;
};

/**
 * Format savings type to Indonesian
 */
export const formatSavingsType = (type: string): string => {
  const typeMap: Record<string, string> = {
    'mandatory': 'Simpanan Wajib',
    'voluntary': 'Simpanan Sukarela',
    'principal': 'Simpanan Pokok',
    'operational': 'Simpanan Operasional',
  };
  
  return typeMap[type.toLowerCase()] || type;
};

/**
 * Get status color class
 */
export const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    'active': 'text-blue-600 bg-blue-100',
    'paid': 'text-green-600 bg-green-100',
    'lunas': 'text-green-600 bg-green-100',
    'overdue': 'text-red-600 bg-red-100',
    'menunggak': 'text-red-600 bg-red-100',
    'pending': 'text-yellow-600 bg-yellow-100',
    'menunggu': 'text-yellow-600 bg-yellow-100',
    'approved': 'text-green-600 bg-green-100',
    'rejected': 'text-red-600 bg-red-100',
  };
  
  return colorMap[status.toLowerCase()] || 'text-gray-600 bg-gray-100';
};

/**
 * Calculate loan installment
 */
export const calculateLoanInstallment = (
  principal: number,
  interestRate: number,
  termMonths: number
): number => {
  if (principal <= 0 || interestRate <= 0 || termMonths <= 0) {
    return 0;
  }
  
  const monthlyRate = interestRate / 100 / 12;
  const installment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                     (Math.pow(1 + monthlyRate, termMonths) - 1);
  
  return Math.round(installment);
};

/**
 * Calculate remaining loan balance
 */
export const calculateRemainingBalance = (
  principal: number,
  monthlyPayment: number,
  interestRate: number,
  paymentsMade: number
): number => {
  if (principal <= 0 || monthlyPayment <= 0 || interestRate <= 0) {
    return principal;
  }
  
  const monthlyRate = interestRate / 100 / 12;
  let balance = principal;
  
  for (let i = 0; i < paymentsMade; i++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    balance -= principalPayment;
    
    if (balance <= 0) {
      balance = 0;
      break;
    }
  }
  
  return Math.max(0, Math.round(balance * 100) / 100);
};