import React, { useState } from 'react';
import { FaTimes, FaReceipt, FaSave, FaDollarSign } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { LoanToMember } from '../../types/savingsLoans';
import toast from 'react-hot-toast';

interface LoanInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: string;
  onSubmit: (data: LoanInstallment) => void;
}

// Mock active loans data
const mockActiveLoans = [
  {
    id: '1',
    borrowerName: 'Ahmad Suryadi',
    remainingAmount: 3500000,
    monthlyInstallment: 875000,
    remainingInstallments: 4
  },
  {
    id: '3',
    borrowerName: 'Budi Santoso',
    remainingAmount: 4000000,
    monthlyInstallment: 650000,
    remainingInstallments: 6
  }
];

const LoanInstallmentModal: React.FC<LoanInstallmentModalProps> = ({
  isOpen,
  onClose,
  loanId,
  onSubmit
}) => {
  const [formData, setFormData] = useState<LoanInstallment>({
    loanId: loanId || '',
    amount: 0,
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedLoan = mockActiveLoans.find(loan => loan.id === formData.loanId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.loanId) {
      newErrors.loanId = 'Pilih pinjaman terlebih dahulu';
    }
    
    if (formData.amount <= 0) {
      newErrors.amount = 'Jumlah angsuran harus lebih dari 0';
    }
    
    if (selectedLoan && formData.amount > selectedLoan.remainingAmount) {
      newErrors.amount = 'Jumlah angsuran tidak boleh melebihi sisa pinjaman';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSubmit(formData);
    toast.success('Angsuran berhasil dicatat');
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      loanId: loanId || '',
      amount: 0,
      notes: ''
    });
    setErrors({});
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleQuickAmount = (amount: number) => {
    setFormData(prev => ({ ...prev, amount }));
    setErrors(prev => ({ ...prev, amount: '' }));
  };

  const remainingAfterPayment = selectedLoan ? selectedLoan.remainingAmount - formData.amount : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={handleClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <FaReceipt className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Catat Angsuran Pinjaman
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Loan Selection */}
              <div className="space-y-2">
                <label htmlFor="loan" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pilih Pinjaman *
                </label>
                <select
                  value={formData.loanId}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, loanId: e.target.value, amount: 0 }));
                    setErrors(prev => ({ ...prev, loanId: '' }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Pilih pinjaman yang akan diangsur...</option>
                  {mockActiveLoans.map((loan) => (
                    <option key={loan.id} value={loan.id}>
                      {loan.borrowerName} - Sisa: {formatCurrency(loan.remainingAmount)}
                    </option>
                  ))}
                </select>
                {errors.loanId && (
                  <p className="text-sm text-red-600">{errors.loanId}</p>
                )}
              </div>

              {/* Loan Details */}
              {selectedLoan && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <FaDollarSign className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-700 dark:text-blue-300">
                      Detail Pinjaman
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Peminjam:</span>
                    <span className="font-medium">{selectedLoan.borrowerName}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Sisa Pinjaman:</span>
                    <span className="font-medium text-orange-600">
                      {formatCurrency(selectedLoan.remainingAmount)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Angsuran Bulanan:</span>
                    <span className="font-medium text-blue-600">
                      {formatCurrency(selectedLoan.monthlyInstallment)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Sisa Angsuran:</span>
                    <span className="font-medium">{selectedLoan.remainingInstallments} bulan</span>
                  </div>
                </div>
              )}

              {/* Quick Amount Buttons */}
              {selectedLoan && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pilih Cepat Jumlah Angsuran
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(selectedLoan.monthlyInstallment)}
                      className="px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
                    >
                      Angsuran Normal
                      <br />
                      {formatCurrency(selectedLoan.monthlyInstallment)}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(selectedLoan.remainingAmount)}
                      className="px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
                    >
                      Pelunasan
                      <br />
                      {formatCurrency(selectedLoan.remainingAmount)}
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Amount */}
              <div className="space-y-2">
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Jumlah Angsuran *
                </label>
                <input
                  id="amount"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.amount || ''}
                  onChange={(e) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      amount: parseInt(e.target.value) || 0 
                    }));
                    setErrors(prev => ({ ...prev, amount: '' }));
                  }}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                {formData.amount > 0 && (
                  <p className="text-sm text-green-600">
                    {formatCurrency(formData.amount)}
                  </p>
                )}
                {errors.amount && (
                  <p className="text-sm text-red-600">{errors.amount}</p>
                )}
              </div>

              {/* Remaining Amount After Payment */}
              {selectedLoan && formData.amount > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-green-700 dark:text-green-300">
                      Sisa Setelah Pembayaran:
                    </span>
                    <span className="font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(Math.max(0, remainingAfterPayment))}
                    </span>
                  </div>
                  {remainingAfterPayment <= 0 && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ Pinjaman akan lunas setelah pembayaran ini
                    </p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Catatan (Opsional)
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Tambahkan catatan pembayaran..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <FaTimes className="w-4 h-4" />
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <FaSave className="w-4 h-4" />
                  Simpan Angsuran
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LoanInstallmentModal;