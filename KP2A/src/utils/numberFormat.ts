// Utility functions for number formatting with thousand separators

/**
 * Format number with thousand separators for display
 * @param value - The number to format
 * @returns Formatted string with thousand separators
 */
export const formatNumberWithSeparator = (value: number | string): string => {
  if (value === '' || value === null || value === undefined) return ''
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return ''
  // Format as integer with dot separators (Indonesian format for currency)
  return Math.floor(num).toLocaleString('id-ID')
}

/**
 * Remove thousand separators and convert to number
 * @param value - The formatted string with separators
 * @returns Number without separators
 */
export const parseNumberFromSeparator = (value: string): number => {
  if (!value) return 0
  // Remove all dots (thousand separators) and convert to number
  const cleanValue = value.replace(/\./g, '')
  const num = parseFloat(cleanValue)
  return isNaN(num) ? 0 : num
}

/**
 * Handle input change for number fields with separators
 * @param event - Input change event
 * @param setValue - React Hook Form setValue function
 * @param fieldName - Name of the field
 */
export const handleNumberInputChange = (
  event: React.ChangeEvent<HTMLInputElement>,
  setValue: (name: string, value: any) => void,
  fieldName: string
) => {
  const inputValue = event.target.value
  
  // Remove all non-digit characters except for the first character if it's a minus sign
  const cleanValue = inputValue.replace(/[^\d]/g, '')
  
  if (cleanValue === '') {
    setValue(fieldName, 0)
    event.target.value = ''
    return
  }
  
  const numericValue = parseInt(cleanValue, 10)
  setValue(fieldName, numericValue)
  
  // Format with separators for display
  event.target.value = formatNumberWithSeparator(numericValue)
}

/**
 * Format currency for display with Rp prefix
 * @param value - The number to format
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number | string): string => {
  if (value === '' || value === null || value === undefined) return 'Rp 0'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return 'Rp 0'
  // Format as integer with dot separators (Indonesian format for currency)
  return `Rp ${Math.floor(num).toLocaleString('id-ID')}`
}

/**
 * Format initial value for input display
 * @param value - The initial numeric value
 * @returns Formatted string for display
 */
export const formatInitialValue = (value: number | string | undefined): string => {
  if (value === undefined || value === null || value === '') return ''
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num) || num === 0) return ''
  return formatNumberWithSeparator(num)
}