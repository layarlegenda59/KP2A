import React from 'react'
import { FaWhatsapp } from 'react-icons/fa'

const WhatsAppBotPageSimple: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <FaWhatsapp className="mr-3 h-8 w-8 text-green-500" />
          WhatsApp Bot Management
        </h1>
        <p className="text-gray-600 mt-1">Kelola bot WhatsApp SIDARSIH untuk layanan anggota</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          WhatsApp Bot Dashboard
        </h2>
        <p className="text-gray-600">
          Fitur WhatsApp Bot sedang dalam pengembangan. Halaman ini akan segera dilengkapi dengan:
        </p>
        <ul className="mt-4 space-y-2 text-gray-600">
          <li>• QR Code scanner untuk koneksi WhatsApp</li>
          <li>• Template management untuk pesan otomatis</li>
          <li>• Verifikasi anggota melalui WhatsApp</li>
          <li>• Analytics dan monitoring bot</li>
          <li>• Pengaturan keamanan</li>
        </ul>
      </div>
    </div>
  )
}

export default WhatsAppBotPageSimple