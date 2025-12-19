import React, { useState, useEffect } from 'react'
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendar, FaSave, FaEdit } from 'react-icons/fa'
import { useAuth } from '../../contexts/AuthContext'
import { databaseClient, isDatabaseAvailable } from '../../lib/database'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

interface ProfileData {
  email: string
  role: string
  member?: {
    nama_lengkap: string
    nik: string
    alamat: string
    no_hp: string
    jabatan: string
    tanggal_masuk: string
    status_keanggotaan: string
  }
}

export function ProfilePage() {
  const { user, userProfile } = useAuth()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    nama_lengkap: '',
    alamat: '',
    no_hp: ''
  })

  useEffect(() => {
    if (userProfile) {
      setProfileData({
        email: userProfile.email,
        role: userProfile.role,
        member: userProfile.member
      })
      
      if (userProfile.member) {
        setFormData({
          nama_lengkap: userProfile.member.nama_lengkap || '',
          alamat: userProfile.member.alamat || '',
          no_hp: userProfile.member.no_hp || ''
        })
      } else {
        // Reset form data if no member data
        setFormData({
          nama_lengkap: '',
          alamat: '',
          no_hp: ''
        })
      }
    }
    setLoading(false)
  }, [userProfile])

  const handleSave = async () => {
    if (!user) {
      toast.error('User tidak ditemukan')
      return
    }

    setSaving(true)
    try {
      if (isDatabaseAvailable()) {
        // Check if member exists
        if (userProfile?.member?.id) {
          // Update existing member
          const { error } = await databaseClient
            .from('members')
            .update({
              nama_lengkap: formData.nama_lengkap,
              alamat: formData.alamat,
              no_hp: formData.no_hp
            })
            .eq('id', userProfile.member.id)
            

          if (error) throw error
        } else {
          // Create new member record
          const { data: newMember, error: memberError } = await databaseClient
            .from('members')
            .insert({
              id_anggota: `${Date.now()}-${user.id.slice(0, 8)}`,
              nama_lengkap: formData.nama_lengkap,
              alamat: formData.alamat,
              no_hp: formData.no_hp,
              nik: '',
              jabatan: 'Anggota',
              tanggal_masuk: new Date().toISOString().split('T')[0],
              status_keanggotaan: 'aktif'
            })
            .select()
            .single()

          if (memberError) throw memberError

          // Update users table to link with new member
          if (newMember) {
            const { error: userError } = await databaseClient
              .from('users')
              .update({ member_id: newMember.id })
              .eq('id', user.id)
              

            if (userError) throw userError

            // Update userProfile with new member data
            setProfileData(prev => prev ? {
              ...prev,
              member: newMember
            } : null)
          }
        }
      }

      // Update local state for existing member
      if (userProfile?.member?.id) {
        setProfileData(prev => prev ? {
          ...prev,
          member: prev.member ? {
            ...prev.member,
            nama_lengkap: formData.nama_lengkap,
            alamat: formData.alamat,
            no_hp: formData.no_hp
          } : undefined
        } : null)
      }

      setEditing(false)
      toast.success('Profil berhasil diperbarui')
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error('Gagal memperbarui profil: ' + (error.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <FaUser className="h-5 w-5 text-red-600" />
      case 'pengurus':
        return <FaUser className="h-5 w-5 text-blue-600" />
      default:
        return <FaUser className="h-5 w-5 text-green-600" />
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'pengurus':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-green-100 text-green-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!profileData && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profil Tidak Ditemukan</h2>
          <p className="text-gray-600">Silakan hubungi administrator untuk bantuan.</p>
        </div>
      </div>
    )
  }

  // Use user data if profileData is not available
  const displayData = profileData || {
    email: user?.email || '',
    role: 'anggota',
    member: null
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center">
                <FaUser className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="heading-2 text-white">
                  {displayData.member?.nama_lengkap || 'Nama Belum Diisi'}
                </h1>
                <div className="flex items-center space-x-2 mt-1">
                  {getRoleIcon(displayData.role)}
                  <span className={`badge ${getRoleBadge(displayData.role)}`}>
                    {displayData.role.charAt(0).toUpperCase() + displayData.role.slice(1)}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 label-medium"
            >
              <FaEdit className="h-4 w-4" />
              <span>{editing ? 'Batal' : 'Edit Profil'}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Information */}
            <div className="space-y-4">
              <h3 className="heading-3 text-primary mb-4">Informasi Akun</h3>
              
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <FaEnvelope className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="label-medium text-primary">Email</p>
                  <p className="body-small text-secondary">{displayData.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <FaUser className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="label-medium text-primary">Role</p>
                  <p className="body-small text-secondary">
                    {displayData.role.charAt(0).toUpperCase() + displayData.role.slice(1)}
                  </p>
                </div>
              </div>

              {displayData.member && (
                <>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <FaUser className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="label-medium text-primary">NIK</p>
                      <p className="body-small text-secondary">{displayData.member.nik}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <FaCalendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="label-medium text-primary">Tanggal Masuk</p>
                      <p className="body-small text-secondary">
                        {new Date(displayData.member.tanggal_masuk).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="heading-3 text-primary mb-4">Informasi Pribadi</h3>
              
              {displayData.member ? (
                <>
                  <div className="form-group-compact">
                    <label className="form-label">Nama Lengkap</label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.nama_lengkap}
                        onChange={(e) => setFormData(prev => ({ ...prev, nama_lengkap: e.target.value }))}
                        className="input focus-ring w-full"
                        placeholder="Masukkan nama lengkap"
                      />
                    ) : (
                      <div className="flex items-center space-x-3 p-3 bg-surface rounded-lg">
                        <FaUser className="h-5 w-5 text-secondary" />
                        <p className="body-small text-secondary">{displayData.member.nama_lengkap || 'Belum diisi'}</p>
                      </div>
                    )}
                  </div>

                  <div className="form-group-compact">
                    <label className="form-label">Alamat</label>
                    {editing ? (
                      <textarea
                        value={formData.alamat}
                        onChange={(e) => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                        rows={2}
                        className="textarea focus-ring w-full"
                        placeholder="Masukkan alamat lengkap"
                      />
                    ) : (
                      <div className="flex items-start space-x-3 p-3 bg-surface rounded-lg">
                        <FaMapMarkerAlt className="h-5 w-5 text-secondary mt-0.5" />
                        <p className="body-small text-secondary">{displayData.member.alamat || 'Belum diisi'}</p>
                      </div>
                    )}
                  </div>

                  <div className="form-group-compact">
                    <label className="form-label">Nomor HP</label>
                    {editing ? (
                      <input
                        type="tel"
                        value={formData.no_hp}
                        onChange={(e) => setFormData(prev => ({ ...prev, no_hp: e.target.value }))}
                        className="input focus-ring w-full"
                        placeholder="08123456789"
                      />
                    ) : (
                      <div className="flex items-center space-x-3 p-3 bg-surface rounded-lg">
                        <FaPhone className="h-5 w-5 text-secondary" />
                        <p className="body-small text-secondary">{displayData.member.no_hp || 'Belum diisi'}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <FaUser className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="label-medium text-primary">Jabatan</p>
                      <p className="body-small text-secondary">{displayData.member.jabatan || 'Belum diisi'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <FaUser className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="label-medium text-primary">Status Keanggotaan</p>
                      <p className="body-small text-secondary">
                        {displayData.member.status_keanggotaan ? 
                         displayData.member.status_keanggotaan.charAt(0).toUpperCase() + 
                         displayData.member.status_keanggotaan.slice(1) : 'Belum diisi'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {editing ? (
                    <>
                      <div className="form-group">
                        <label className="form-label">Nama Lengkap</label>
                        <input
                          type="text"
                          value={formData.nama_lengkap}
                          onChange={(e) => setFormData(prev => ({ ...prev, nama_lengkap: e.target.value }))}
                          className="input focus-ring w-full"
                          placeholder="Masukkan nama lengkap"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Alamat</label>
                        <textarea
                          value={formData.alamat}
                          onChange={(e) => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                          rows={3}
                          className="input focus-ring w-full"
                          placeholder="Masukkan alamat lengkap"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Nomor HP</label>
                        <input
                          type="tel"
                          value={formData.no_hp}
                          onChange={(e) => setFormData(prev => ({ ...prev, no_hp: e.target.value }))}
                          className="input focus-ring w-full"
                          placeholder="Masukkan nomor HP"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <FaUser className="h-12 w-12 mx-auto text-secondary mb-3" />
                      <p className="body-medium text-secondary">Data anggota belum tersedia</p>
                      <p className="body-small text-muted mt-1">
                        Klik "Edit Profil" untuk melengkapi data profil Anda
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          {editing && (
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setEditing(false)}
                className="btn btn-secondary"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary flex items-center space-x-2"
              >
                <FaSave className="h-4 w-4" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}