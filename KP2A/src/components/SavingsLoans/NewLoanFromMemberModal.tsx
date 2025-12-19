import React, { useState, useEffect } from 'react';
import { FaTimes, FaHandHoldingUsd, FaSave, FaSpinner } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { LoanFromMember } from '../../types/savingsLoans';
import toast from 'react-hot-toast';
import { useMembers } from '../../hooks/useSavingsLoans';
import { useLoans } from '../../hooks/useSavingsLoans';

interface NewLoanFromMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: NewLoanFromMember) => void;
  editData?: any | null;
  isEditMode?: boolean;
}

const NewLoanFromMemberModal: React.FC<NewLoanFromMemberModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editData,
  isEditMode = false
}) => {
  const { members, loading: membersLoading } = useMembers();
  const { createLoan, updateLoan, loading: loansLoading } = useLoans();

  const [formData, setFormData] = useState({
    member_id: '',
    amount: 0,
    due_date: '',
    interest_rate: 0,
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle edit mode
  useEffect(() => {
    if (isEditMode && editData) {
      setFormData({
        member_id: editData.member_id || '',
        amount: editData.amount || 0,
        due_date: editData.due_date ? new Date(editData.due_date).toISOString().split('T')[0] : '',
        interest_rate: editData.interest_rate || 0,
        notes: editData.notes || ''
      });
    } else {
      setFormData({
        member_id: '',
        amount: 0,
        due_date: '',
        interest_rate: 0,
        notes: ''
      });
    }
    setErrors({});
    setIsSubmitting(false);
  }, [isEditMode, editData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.member_id) {
      newErrors.member_id = 'Anggota harus dipilih';
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Jumlah pinjaman harus lebih dari 0';
    }

    if (!formData.due_date) {
      newErrors.due_date = 'Tanggal jatuh tempo harus diisi';
    } else if (!isEditMode && new Date(formData.due_date) <= new Date()) {
      newErrors.due_date = 'Tanggal jatuh tempo harus di masa depan';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const loanData = {
        member_id: formData.member_id,
        amount: formData.amount,
        due_date: formData.due_date,
        interest_rate: formData.interest_rate,
        notes: formData.notes,
        type: 'from_member' as const
      };

      if (isEditMode && editData) {
        await updateLoan(editData.id, loanData);
        toast.success('Pinjaman berhasil diperbarui');
      } else {
        await createLoan(loanData);
        toast.success('Pinjaman dari anggota berhasil dicatat');
      }

      handleClose();
    } catch (error) {
      console.error('Error saving loan:', error);
      toast.error('Gagal menyimpan pinjaman');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      member_id: '',
      amount: 0,
      due_date: '',
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

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const calculateInterestAmount = () => {
    if (formData.amount > 0 && formData.interest_rate > 0 && formData.due_date) {
      const dueDate = new Date(formData.due_date);
      const monthsDiff = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30));
      return (formData.amount * formData.interest_rate / 100) * monthsDiff;
    }
    return 0;
  };

  const interestAmount = calculateInterestAmount();
  const totalAmount = formData.amount + interestAmount;

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
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <FaHandHoldingUsd className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {isEditMode ? 'Edit Pinjaman dari Anggota' : 'Catat Pinjaman Baru dari Anggota'}
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
                  Anggota
                </label>
                <select
                  value={formData.member_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, member_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-gray-100 transition-colors"
                  required
                  disabled={membersLoading}
                >
                  <option value="">Pilih Anggota</option>
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-gray-100 transition-colors"
                  placeholder="0"
                  min="1"
                  step="100000"
                  required
                />
                {formData.amount > 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    {formatCurrency(formData.amount)}
                  </p>
                )}
                {errors.amount && (
                  <p className="text-sm text-red-600 mt-1">{errors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tanggal Jatuh Tempo
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    due_date: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-gray-100 transition-colors"
                  min={!isEditMode ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined}
                  required
                />
                {errors.due_date && (
                  <p className="text-sm text-red-600 mt-1">{errors.due_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tingkat Jasa (% per tahun)
                </label>
                <input
                  type="number"
                  value={formData.interest_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, interest_rate: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-gray-100 transition-colors"
                  placeholder="Masukkan tingkat bunga"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                />
                {errors.interest_rate && (
                  <p className="text-sm text-red-600 mt-1">{errors.interest_rate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Catatan (Opsional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-gray-100 transition-colors"
                  placeholder="Tambahkan catatan tentang pinjaman..."
                  rows={3}
                />
              </div>

              {/* Interest Calculation */}
              {interestAmount > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Perhitungan Jasa:</h4>
                  <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                    <div className="flex justify-between">
                      <span>Pokok Pinjaman:</span>
                      <span className="font-medium">{formatCurrency(formData.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Jasa:</span>
                      <span className="font-medium">{formatCurrency(interestAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-blue-700 dark:text-blue-300 border-t border-blue-200 dark:border-blue-700 pt-2">
                      <span>Total yang Harus Dibayar:</span>
                      <span>{formatCurrency(totalAmount)}</span>
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
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <FaSpinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <FaSave className="h-4 w-4" />
                  )}
                  {isSubmitting ? 'Menyimpan...' : (isEditMode ? 'Perbarui Pinjaman' : 'Simpan Pinjaman')}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NewLoanFromMemberModal;