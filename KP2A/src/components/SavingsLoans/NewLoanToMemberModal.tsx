import React, { useState, useEffect } from 'react';
import { FaTimes, FaCreditCard, FaSave, FaSpinner } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { LoanToMember } from '../../types/savingsLoans';
import toast from 'react-hot-toast';
import { useMembers } from '../../hooks/useSavingsLoans';
import { useLoans } from '../../hooks/useSavingsLoans';

interface NewLoanToMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: NewLoanToMember) => void;
  editData?: any | null;
  isEditMode?: boolean;
}

const NewLoanToMemberModal: React.FC<NewLoanToMemberModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editData,
  isEditMode = false
}) => {
  const { members, loading: membersLoading } = useMembers();
  const { createLoan, updateLoan } = useLoans();

  const [formData, setFormData] = useState({
    member_id: '',
    amount: 0,
    installment_count: 12,
    interest_rate: 0,
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Effect untuk mengisi form saat mode edit atau reset saat mode tambah
  useEffect(() => {
    if (isEditMode && editData) {
      setFormData({
        member_id: editData.member_id || '',
        amount: editData.amount || 0,
        installment_count: editData.installment_count || 12,
        interest_rate: editData.interest_rate || 0,
        notes: editData.notes || ''
      });
    } else {
      setFormData({
        member_id: '',
        amount: 0,
        installment_count: 12,
        interest_rate: 0,
        notes: ''
      });
    }
    setErrors({});
    setIsSubmitting(false);
  }, [isEditMode, editData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validation
      const newErrors: Record<string, string> = {};

      if (!formData.member_id) {
        newErrors.member_id = 'Pilih anggota peminjam terlebih dahulu';
      }

      if (formData.amount <= 0) {
        newErrors.amount = 'Jumlah pinjaman harus lebih dari 0';
      }

      if (formData.installment_count <= 0) {
        newErrors.installment_count = 'Jumlah angsuran harus lebih dari 0';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setIsSubmitting(false);
        return;
      }

      if (isEditMode && editData) {
        await updateLoanToMember(editData.id, formData);
        toast.success('Pinjaman ke anggota berhasil diperbarui');
      } else {
        await createLoanToMember(formData);
        toast.success('Pinjaman ke anggota berhasil dicatat');
      }

      if (onSubmit) {
        onSubmit(formData);
      }
      handleClose();
    } catch (error) {
      console.error('Error submitting loan:', error);
      toast.error('Gagal menyimpan pinjaman');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      member_id: '',
      amount: 0,
      installment_count: 12,
      interest_rate: 0,
      notes: ''
    });
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const calculateInstallmentAmount = () => {
    if (formData.amount > 0 && formData.installment_count > 0) {
      const principal = formData.amount;
      const monthlyInterestRate = (formData.interest_rate || 0) / 100 / 12; // Convert annual to monthly

      if (monthlyInterestRate > 0) {
        // Calculate with compound interest
        const monthlyPayment = principal *
          (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, formData.installment_count)) /
          (Math.pow(1 + monthlyInterestRate, formData.installment_count) - 1);
        return monthlyPayment;
      } else {
        // Simple division without interest
        return principal / formData.installment_count;
      }
    }
    return 0;
  };

  const installmentAmount = calculateInstallmentAmount();
  const totalPayment = installmentAmount * formData.installment_count;
  const totalInterest = totalPayment - formData.amount;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <FaCreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {isEditMode ? 'Edit Pinjaman ke Anggota' : 'Catat Pinjaman Baru ke Anggota'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Anggota Peminjam
                </label>
                <select
                  value={formData.member_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, member_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-gray-100 transition-colors"
                  required
                  disabled={membersLoading}
                >
                  <option value="">Pilih anggota peminjam</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.nama_lengkap} {member.id_anggota && `(${member.id_anggota})`}
                    </option>
                  ))}
                </select>
                {errors.member_id && (
                  <p className="text-sm text-red-600 mt-1">{errors.member_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Jumlah Pinjaman
                </label>
                <input
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    amount: parseInt(e.target.value) || 0
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-gray-100 transition-colors"
                  placeholder="0"
                  min="0"
                  step="100000"
                  required
                />
                {formData.amount > 0 && (
                  <p className="text-sm text-orange-600 mt-1">
                    {formatCurrency(formData.amount)}
                  </p>
                )}
                {errors.amount && (
                  <p className="text-sm text-red-600 mt-1">{errors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Jumlah Angsuran (bulan)
                </label>
                <select
                  value={formData.installment_count.toString()}
                  onChange={(e) => setFormData(prev => ({ ...prev, installment_count: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-gray-100 transition-colors"
                  required
                >
                  <option value="6">6 bulan</option>
                  <option value="12">12 bulan</option>
                  <option value="18">18 bulan</option>
                  <option value="24">24 bulan</option>
                  <option value="36">36 bulan</option>
                </select>
                {errors.installment_count && (
                  <p className="text-sm text-red-600 mt-1">{errors.installment_count}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tingkat Jasa (% per tahun)
                </label>
                <input
                  type="number"
                  value={formData.interest_rate || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    interest_rate: parseFloat(e.target.value) || 0
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-gray-100 transition-colors"
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.1"
                />
                {formData.interest_rate > 0 && (
                  <p className="text-sm text-blue-600 mt-1">
                    {formData.interest_rate}% per tahun
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Catatan (Opsional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-gray-100 transition-colors"
                  placeholder="Tambahkan catatan tentang pinjaman..."
                  rows={3}
                />
              </div>

              {/* Loan Calculation */}
              {formData.amount > 0 && formData.installment_count > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-orange-700 dark:text-orange-300 mb-2">
                    Rincian Pinjaman
                  </h4>
                  <div className="space-y-1 text-sm text-orange-700 dark:text-orange-300">
                    <div className="flex justify-between">
                      <span>Pokok Pinjaman:</span>
                      <span className="font-medium">{formatCurrency(formData.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Angsuran per Bulan:</span>
                      <span className="font-medium">{formatCurrency(installmentAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Jumlah Angsuran:</span>
                      <span className="font-medium">{formData.installment_count} bulan</span>
                    </div>
                    {formData.interest_rate > 0 && (
                      <div className="flex justify-between">
                        <span>Total Jasa:</span>
                        <span className="font-medium">{formatCurrency(totalInterest)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t border-orange-200 dark:border-orange-700 pt-2">
                      <span>Total Pembayaran:</span>
                      <span>{formatCurrency(totalPayment)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
                >
                  <FaTimes className="h-4 w-4" />
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <FaSpinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <FaSave className="h-4 w-4" />
                  )}
                  {isSubmitting ? 'Menyimpan...' : (isEditMode ? 'Update Pinjaman' : 'Simpan Pinjaman')}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NewLoanToMemberModal;