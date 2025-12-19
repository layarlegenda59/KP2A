import React, { useState, useEffect } from 'react';
import { FaTimes, FaPiggyBank, FaSave, FaEdit, FaSpinner } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { SavingsDeposit, MemberSavings } from '../../types/savingsLoans';
import toast from 'react-hot-toast';
import { useMembers, useSavings } from '../../hooks/useSavingsLoans';
import { formatCurrency } from '../../utils/formatters';

interface SavingsDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: SavingsDeposit) => void;
  editData?: MemberSavings | null;
}

const SavingsDepositModal: React.FC<SavingsDepositModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editData
}) => {
  const { members, loading: membersLoading } = useMembers();
  const { createSavings, loading: savingsLoading } = useSavings();
  
  const [formData, setFormData] = useState({
    memberId: '',
    savingsType: 'wajib' as 'wajib' | 'sukarela' | 'pokok',
    amount: 0,
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!editData;

  // Reset form when modal opens/closes or editData changes
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        // Edit mode - populate with existing data
        setFormData({
          memberId: editData.memberId,
          savingsType: 'wajib',
          amount: 0, // For additional deposit
          notes: ''
        });
      } else {
        // Add mode - reset form
        setFormData({
          memberId: '',
          savingsType: 'wajib',
          amount: 0,
          notes: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, editData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.memberId) {
      newErrors.memberId = 'Pilih anggota terlebih dahulu';
    }

    if (!formData.savingsType) {
      newErrors.savingsType = 'Pilih jenis simpanan';
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Jumlah simpanan harus lebih dari 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create savings record
      await createSavings({
        member_id: formData.memberId,
        jenis_simpanan: formData.savingsType,
        jumlah: formData.amount,
        tanggal: new Date().toISOString().split('T')[0],
        keterangan: formData.notes
      });
      
      // Show success message
      toast.success(
        isEditMode 
          ? 'Simpanan berhasil diperbarui!' 
          : 'Setoran simpanan berhasil dicatat!'
      );
      
      // Close modal
      handleClose();
    } catch (error) {
      console.error('Error saving deposit:', error);
      toast.error('Gagal menyimpan setoran. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      memberId: '',
      savingsType: 'wajib',
      amount: 0,
      notes: ''
    });
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  const selectedMember = members.find(m => m.id === formData.memberId);

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
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  {isEditMode ? (
                    <FaEdit className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <FaPiggyBank className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {isEditMode ? 'Tambah Setoran' : 'Catat Setoran Simpanan'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            {/* Current Savings Info (Edit Mode) */}
            {isEditMode && editData && (
              <div className="p-6 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Simpanan Saat Ini
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Anggota:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {editData.memberName} ({editData.memberCode || editData.memberId})
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Simpanan Wajib:</span>
                    <span className="font-medium text-blue-600">
                      {formatCurrency(editData.mandatorySavings)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Simpanan Sukarela:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(editData.voluntarySavings)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-600 pt-2">
                    <span className="text-gray-600 dark:text-gray-400">Total:</span>
                    <span className="font-bold text-purple-600">
                      {formatCurrency(editData.total)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nama Anggota
                </label>
                <select
                  value={formData.memberId}
                  onChange={(e) => setFormData(prev => ({ ...prev, memberId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 transition-colors"
                  required
                  disabled={isEditMode || membersLoading}
                >
                  <option value="">
                    {membersLoading ? 'Memuat anggota...' : 'Pilih anggota'}
                  </option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.nama_lengkap} ({member.id_anggota || member.id})
                    </option>
                  ))}
                </select>
                {errors.memberId && (
                  <p className="text-sm text-red-600 mt-1">{errors.memberId}</p>
                )}
                {isEditMode && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Mode edit: anggota tidak dapat diubah
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Jenis Simpanan
                </label>
                <select
                  value={formData.savingsType}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    savingsType: e.target.value as 'wajib' | 'sukarela' | 'pokok'
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 transition-colors"
                  required
                >
                  <option value="wajib">Simpanan Wajib</option>
                  <option value="sukarela">Simpanan Sukarela</option>
                  <option value="pokok">Simpanan Pokok</option>
                </select>
                {errors.savingsType && (
                  <p className="text-sm text-red-600 mt-1">{errors.savingsType}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Jumlah Simpanan
                </label>
                <input
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    amount: parseInt(e.target.value) || 0 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 transition-colors"
                  placeholder="0"
                  min="0"
                  step="1000"
                  required
                />
                {formData.amount > 0 && (
                  <p className="text-sm text-blue-600 mt-1">
                    {formatCurrency(formData.amount)}
                  </p>
                )}
                {errors.amount && (
                  <p className="text-sm text-red-600 mt-1">{errors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Catatan (Opsional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 transition-colors"
                  placeholder="Tambahkan catatan jika diperlukan..."
                  rows={3}
                />
              </div>

              {formData.amount > 0 && (
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-purple-700 dark:text-purple-300">
                      {isEditMode ? 'Total Tambahan:' : 'Total Setoran:'}
                    </span>
                    <span className="text-lg font-bold text-purple-700 dark:text-purple-300">
                      {formatCurrency(formData.amount)}
                    </span>
                  </div>
                  {isEditMode && editData && (
                    <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-700">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-purple-600 dark:text-purple-400">Total Setelah Tambahan:</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">
                          {formatCurrency(editData.total + formData.amount)}
                        </span>
                      </div>
                    </div>
                  )}
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
                  disabled={isSubmitting || savingsLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <FaSpinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <FaSave className="h-4 w-4" />
                  )}
                  {isSubmitting 
                    ? 'Menyimpan...' 
                    : isEditMode 
                      ? 'Tambah Setoran' 
                      : 'Simpan Setoran'
                  }
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SavingsDepositModal;