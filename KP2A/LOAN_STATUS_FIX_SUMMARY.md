# Status Column Editing Fix - Loan Payments

## Problem Summary
The Status column in the loan-payments page (http://localhost:5182/loan-payments) could not be properly edited. When users tried to manually change the status from one value to another, the changes were not being saved or were being overwritten.

## Root Causes Identified

### 1. **Auto-Override Issue in Frontend** 
   - File: [src/components/Loans/LoanPaymentForm.tsx](src/components/Loans/LoanPaymentForm.tsx)
   - The `useEffect` hook watching `watchedAngsuranPokok` was automatically setting the status based on whether `sisa_angsuran` was 0
   - This prevented users from manually selecting a status value
   - Solution: Removed the automatic status update logic, allowing manual selection

### 2. **Database ENUM Missing Value**
   - File: Database schema
   - The `loan_payments` table status column had only 2 ENUM values: `'lunas'` and `'terlambat'`
   - The frontend and backend were trying to use 3 values: `'lunas'`, `'belum_lunas'`, and `'terlambat'`
   - Solution: Updated database ENUM to include all 3 values

### 3. **Database Default Value**
   - Changed the default value from `'lunas'` to `'belum_lunas'` to match business logic

## Changes Made

### Frontend Changes

1. **Fixed [src/components/Loans/LoanPaymentForm.tsx](src/components/Loans/LoanPaymentForm.tsx)** (Line 77-86)
   - Removed the automatic status update in the `useEffect` hook
   - Status field now remains as manually selected by the user
   - Only `sisa_angsuran` is auto-calculated based on `angsuran_pokok`

**Before:**
```tsx
useEffect(() => {
  if (selectedLoan) {
    const pokok = Number(watchedAngsuranPokok) || 0
    const sisaPinjaman = Number(selectedLoan.sisa_pinjaman) || 0
    const sisaAngsuran = Math.max(0, sisaPinjaman - pokok)
    setValue('sisa_angsuran' as any, sisaAngsuran)
    
    // Auto-update status based on sisa_angsuran - THIS WAS THE PROBLEM
    if (sisaAngsuran === 0) {
      setValue('status' as any, 'lunas')
    } else {
      setValue('status' as any, 'belum_lunas')
    }
  }
}, [watchedAngsuranPokok, selectedLoan, setValue])
```

**After:**
```tsx
useEffect(() => {
  if (selectedLoan && !initial) {
    const pokok = Number(watchedAngsuranPokok) || 0
    const sisaPinjaman = Number(selectedLoan.sisa_pinjaman) || 0
    const sisaAngsuran = Math.max(0, sisaPinjaman - pokok)
    setValue('sisa_angsuran' as any, sisaAngsuran)
  }
}, [watchedAngsuranPokok, selectedLoan, setValue, initial])
```

### Database Changes

1. **Created SQL Script: [mysql-backend/scripts/fix-loan-status-column.sql](mysql-backend/scripts/fix-loan-status-column.sql)**

```sql
ALTER TABLE loan_payments MODIFY COLUMN status ENUM('lunas', 'belum_lunas', 'terlambat') NOT NULL DEFAULT 'belum_lunas';
```

2. **Applied the SQL fix to the running database**
   - Verified the column was updated successfully
   - New default value is now `'belum_lunas'` (more appropriate for new payments)

### Backend Verification

- Confirmed [mysql-backend/src/routes/loans.js](mysql-backend/src/routes/loans.js) (Line 225-264) correctly handles status updates
- The PUT endpoint accepts and saves the status field properly
- No changes needed to the backend

### Schema Validation

- Frontend schema at [src/schemas/loanPaymentSchema.ts](src/schemas/loanPaymentSchema.ts) already had all 3 status values defined
- No changes needed to the validation schema

## What Works Now

✅ Users can now manually select and change the Status field  
✅ Status changes are properly saved to the database  
✅ All three status values are supported: `'lunas'`, `'belum_lunas'`, `'terlambat'`  
✅ The status field is editable both when creating new payments and editing existing ones  
✅ The form validation works correctly with all status values  

## Testing Steps

1. Navigate to http://localhost:5182/loan-payments
2. Click the Edit button (pencil icon) on any loan payment
3. Change the Status dropdown to a different value
4. Click "Perbarui" to save
5. Verify the status is saved and displays correctly in the table

## Files Modified

- [src/components/Loans/LoanPaymentForm.tsx](src/components/Loans/LoanPaymentForm.tsx) - Removed auto-override logic
- Database: Updated loan_payments table status ENUM
- [mysql-backend/scripts/fix-loan-status-column.sql](mysql-backend/scripts/fix-loan-status-column.sql) - New migration script
