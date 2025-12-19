import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { 
  FaUser, 
  FaPhone, 
  FaIdCard, 
  FaCheck, 
  FaTimes, 
  FaSearch,
  FaWhatsapp,
  FaExclamationTriangle,
  FaSpinner,
  FaUserCheck,
  FaUserTimes
} from 'react-icons/fa'
import { isDatabaseAvailable, databaseClient } from '../../lib/database'

// Safe toast wrapper to prevent "toast is not a function" errors
const safeToast = {
  success: (message: string) => {
    try {
      if (toast && typeof toast.success === 'function') {
        toast.success(message)
      } else {
        console.log('✅ SUCCESS:', message)
      }
    } catch (error) {
      console.error('Toast success error:', error)
      console.log('✅ SUCCESS:', message)
    }
  },
  error: (message: string) => {
    try {
      if (toast && typeof toast.error === 'function') {
        toast.error(message)
      } else {
        console.log('❌ ERROR:', message)
      }
    } catch (error) {
      console.error('Toast error error:', error)
      console.log('❌ ERROR:', message)
    }
  },
  info: (message: string) => {
    try {
      if (toast && typeof toast.info === 'function') {
        toast.info(message)
      } else {
        console.log('ℹ️ INFO:', message)
      }
    } catch (error) {
      console.error('Toast info error:', error)
      console.log('ℹ️ INFO:', message)
    }
  },
  warning: (message: string) => {
    try {
      if (toast && typeof toast.warning === 'function') {
        toast.warning(message)
      } else {
        console.log('⚠️ WARNING:', message)
      }
    } catch (error) {
      console.error('Toast warning error:', error)
      console.log('⚠️ WARNING:', message)
    }
  }
}

interface Member {
  id: string
  nama_lengkap: string
  nik: string
  alamat: string
  no_hp: string
  status_keanggotaan: 'aktif' | 'non_aktif' | 'pending'
  tanggal_masuk: string
  jabatan: string
  id_anggota: string
  created_at: string
  updated_at: string
}

interface WhatsAppVerification {
  id: string
  phone_number: string
  member_id: string
  verification_token: string
  is_verified: boolean
  verified_at: string | null
  created_at: string
  member?: Member
}

interface MemberVerificationProps {
  onVerificationComplete?: (verification: WhatsAppVerification) => void
}

const MemberVerification: React.FC<MemberVerificationProps> = ({ onVerificationComplete }) => {
  const [databaseAvailable, setDatabaseAvailable] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'phone' | 'member_id' | 'name'>('phone')
  const [searchResults, setSearchResults] = useState<Member[]>([])
  
  // Verification states
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [showVerificationForm, setShowVerificationForm] = useState(false)
  
  // Existing verifications
  const [verifications, setVerifications] = useState<WhatsAppVerification[]>([])
  const [showVerifications, setShowVerifications] = useState(false)

  useEffect(() => {
    checkDatabaseConnection()
    loadVerifications()
  }, [])

  const checkDatabaseConnection = async () => {
    try {
      const available = await isDatabaseAvailable()
      setDatabaseAvailable(available)
    } catch (error) {
      console.error('Error checking database:', error)
      setDatabaseAvailable(false)
    }
  }

  const loadVerifications = async () => {
    if (!databaseAvailable) return

    try {
      const { data, error } = await databaseClient
        .from('whatsapp_verifications')
        .select(`
          *,
          member:members(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setVerifications(data || [])
    } catch (error) {
      console.error('Error loading verifications:', error)
      safeToast.error('Gagal memuat data verifikasi')
    }
  }

  const searchMembers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      let query = databaseClient.from('members').select('*')

      switch (searchType) {
        case 'phone':
          query = query.ilike('no_hp', `%${searchQuery}%`)
          break
        case 'member_id':
          query = query.ilike('id_anggota', `%${searchQuery}%`)
          break
        case 'name':
          query = query.ilike('nama_lengkap', `%${searchQuery}%`)
          break
      }

      const { data, error } = await query.limit(10)

      if (error) throw error
      setSearchResults(data || [])
    } catch (error) {
      console.error('Error searching members:', error)
      safeToast.error('Gagal mencari anggota')
    } finally {
      setSearchLoading(false)
    }
  }

  const selectMember = (member: Member) => {
    setSelectedMember(member)
    setWhatsappNumber(member.no_hp)
    setShowVerificationForm(true)
    setSearchResults([])
    setSearchQuery('')
  }

  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  const createVerification = async () => {
    if (!selectedMember || !whatsappNumber.trim()) {
      safeToast.error('Pilih anggota dan masukkan nomor WhatsApp')
      return
    }

    setLoading(true)
    try {
      // Check if verification already exists
      const { data: existing } = await databaseClient
        .from('whatsapp_verifications')
        .select('*')
        .eq('member_id', selectedMember.id)
        .eq('phone_number', whatsappNumber)
        .single()

      if (existing) {
        safeToast.error('Verifikasi untuk anggota dan nomor ini sudah ada')
        return
      }

      const code = generateVerificationCode()

      const { data, error } = await databaseClient
        .from('whatsapp_verifications')
        .insert({
          phone_number: whatsappNumber,
          member_id: selectedMember.id,
          verification_token: code,
          is_verified: false
        })
        .select()
        .single()

      if (error) throw error

      safeToast.success(`Kode verifikasi: ${code}`)
      safeToast.success('Kirim kode ini ke WhatsApp anggota')
      
      setShowVerificationForm(false)
      setSelectedMember(null)
      setWhatsappNumber('')
      loadVerifications()
    } catch (error) {
      console.error('Error creating verification:', error)
      safeToast.error('Gagal membuat verifikasi')
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async (verificationId: string, inputCode: string) => {
    try {
      const verification = verifications.find(v => v.id === verificationId)
      if (!verification) return

      if (verification.verification_token !== inputCode) {
        safeToast.error('Kode verifikasi salah')
        return
      }

      const { error } = await databaseClient
        .from('whatsapp_verifications')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString()
        })
        .eq('id', verificationId)

      if (error) throw error

      safeToast.success('Verifikasi berhasil!')
      loadVerifications()
      
      if (onVerificationComplete) {
        const updatedVerification = { ...verification, is_verified: true, verified_at: new Date().toISOString() }
        onVerificationComplete(updatedVerification)
      }
    } catch (error) {
      console.error('Error verifying code:', error)
      safeToast.error('Gagal memverifikasi kode')
    }
  }

  const deleteVerification = async (verificationId: string) => {
    try {
      const { error } = await databaseClient
        .from('whatsapp_verifications')
        .delete()
        .eq('id', verificationId)

      if (error) throw error

      safeToast.success('Verifikasi dihapus')
      loadVerifications()
    } catch (error) {
      console.error('Error deleting verification:', error)
      safeToast.error('Gagal menghapus verifikasi')
    }
  }

  if (!databaseAvailable) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-6">
        <div className="text-center">
          <FaExclamationTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Database Tidak Tersedia</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Fitur verifikasi anggota memerlukan koneksi database.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <FaUserCheck className="h-6 w-6 mr-2 text-green-600" />
              Verifikasi Anggota WhatsApp
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Hubungkan nomor WhatsApp dengan data anggota KP2A
            </p>
          </div>
          <button
            onClick={() => setShowVerifications(!showVerifications)}
            className="bg-blue-600 dark:bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-700 flex items-center"
          >
            <FaWhatsapp className="h-4 w-4 mr-2" />
            {showVerifications ? 'Sembunyikan' : 'Lihat'} Verifikasi
          </button>
        </div>
      </div>

      {/* Search Members */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Cari Anggota</h3>
        
        <div className="flex gap-4 mb-4">
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="phone">Nomor HP</option>
            <option value="member_id">ID Anggota</option>
            <option value="name">Nama</option>
          </select>
          
          <div className="flex-1 flex">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchMembers()}
              placeholder={`Cari berdasarkan ${searchType === 'phone' ? 'nomor HP' : searchType === 'member_id' ? 'ID anggota' : 'nama'}`}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={searchMembers}
              disabled={searchLoading}
              className="bg-blue-600 dark:bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 dark:hover:bg-blue-700 disabled:opacity-50"
            >
              {searchLoading ? <FaSpinner className="h-4 w-4 animate-spin" /> : <FaSearch className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="border border-gray-200 dark:border-gray-600 rounded-md">
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Hasil Pencarian ({searchResults.length})</h4>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {searchResults.map((member) => (
                <div
                  key={member.id}
                  onClick={() => selectMember(member)}
                  className="p-4 border-b border-gray-200 dark:border-gray-600 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-gray-100">{member.nama_lengkap}</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-300">ID: {member.id_anggota}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">HP: {member.no_hp}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Status: {member.status_keanggotaan}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        member.status_keanggotaan === 'aktif' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : member.status_keanggotaan === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}>
                        {member.status_keanggotaan}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Verification Form Modal */}
      <AnimatePresence>
        {showVerificationForm && selectedMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Buat Verifikasi</h3>
                  <button
                    onClick={() => setShowVerificationForm(false)}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    <FaTimes className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Data Anggota</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Nama:</strong> {selectedMember.nama_lengkap}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300"><strong>ID:</strong> {selectedMember.id_anggota}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300"><strong>HP:</strong> {selectedMember.no_hp}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nomor WhatsApp
                    </label>
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="Nomor WhatsApp (contoh: 628123456789)"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Gunakan format internasional (628xxx)
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => setShowVerificationForm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Batal
                    </button>
                    <button
                      onClick={createVerification}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                    >
                      {loading ? <FaSpinner className="h-4 w-4 animate-spin" /> : 'Buat Verifikasi'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing Verifications */}
      <AnimatePresence>
        {showVerifications && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Daftar Verifikasi</h3>
              
              {verifications.length === 0 ? (
                <div className="text-center py-8">
                  <FaUserTimes className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">Belum ada verifikasi</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {verifications.map((verification) => (
                    <VerificationCard
                      key={verification.id}
                      verification={verification}
                      onVerify={verifyCode}
                      onDelete={deleteVerification}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface VerificationCardProps {
  verification: WhatsAppVerification
  onVerify: (id: string, code: string) => void
  onDelete: (id: string) => void
}

const VerificationCard: React.FC<VerificationCardProps> = ({ verification, onVerify, onDelete }) => {
  const [inputCode, setInputCode] = useState('')
  const [showCodeInput, setShowCodeInput] = useState(false)

  const isExpired = false // Remove expiry check since expires_at column doesn't exist

  return (
    <div className={`border rounded-lg p-4 ${verification.is_verified ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : isExpired ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            {verification.is_verified ? (
              <FaCheck className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
            ) : isExpired ? (
              <FaTimes className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            ) : (
              <FaSpinner className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
            )}
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              {verification.member?.nama_lengkap || 'Unknown Member'}
            </h4>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <p><strong>WhatsApp:</strong> {verification.phone_number}</p>
            <p><strong>ID Anggota:</strong> {verification.member?.id_anggota}</p>
            <p><strong>Status:</strong> 
              <span className={`ml-1 ${verification.is_verified ? 'text-green-600 dark:text-green-400' : isExpired ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                {verification.is_verified ? 'Terverifikasi' : isExpired ? 'Kadaluarsa' : 'Menunggu'}
              </span>
            </p>
            {verification.is_verified && verification.verified_at && (
              <p><strong>Diverifikasi:</strong> {new Date(verification.verified_at).toLocaleString('id-ID')}</p>
            )}
            {!verification.is_verified && (
              <p><strong>Dibuat:</strong> {new Date(verification.created_at).toLocaleString('id-ID')}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 ml-4">
          {!verification.is_verified && !isExpired && (
            <>
              <button
                onClick={() => setShowCodeInput(!showCodeInput)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
              >
                Verifikasi
              </button>
              <button
                onClick={() => onDelete(verification.id)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
              >
                Hapus
              </button>
            </>
          )}
          {(verification.is_verified || isExpired) && (
            <button
              onClick={() => onDelete(verification.id)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
            >
              Hapus
            </button>
          )}
        </div>
      </div>

      {showCodeInput && !verification.is_verified && !isExpired && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Masukkan kode verifikasi"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={6}
            />
            <button
              onClick={() => {
                onVerify(verification.id, inputCode)
                setInputCode('')
                setShowCodeInput(false)
              }}
              disabled={inputCode.length !== 6}
              className="bg-blue-600 dark:bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-700 disabled:opacity-50"
            >
              Verifikasi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MemberVerification
