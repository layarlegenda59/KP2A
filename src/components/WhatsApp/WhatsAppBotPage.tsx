import React, { useState, useEffect } from 'react'
import { isSupabaseAvailable, supabase } from '../../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Plus, MessageSquare, Save, X, Send, RefreshCw, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'

type BotStatus = 'active' | 'inactive'
type MessageTemplate = {
  id: string
  name: string
  content: string
  created_at: string
  updated_at?: string
}

// Define the structure for Supabase responses
type SupabaseTemplate = {
  id: string
  name: string
  content: string
  created_at: string
  updated_at?: string
}

type SupabaseConfig = {
  id?: string
  status: BotStatus
  welcome_message: string
  phone_number: string
  auto_reply: boolean
}

type BotConfig = {
  status: BotStatus
  welcomeMessage: string
  phoneNumber: string
  autoReply: boolean
}

const DEMO_TEMPLATES_KEY = 'kp2a-demo-whatsapp-templates'
const DEMO_CONFIG_KEY = 'kp2a-demo-whatsapp-config'

export function WhatsAppBotPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [botConfig, setBotConfig] = useState<BotConfig>({
    status: 'inactive',
    welcomeMessage: 'Selamat datang di KP2A Cimahi. Ketik "menu" untuk melihat daftar layanan.',
    phoneNumber: '+628123456789',
    autoReply: true
  })
  const [supabaseAvailable, setSupabaseAvailable] = useState(false)
  
  const [loading, setLoading] = useState(true)
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState<MessageTemplate | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateContent, setTemplateContent] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [testMessage, setTestMessage] = useState('')
  const [testResponse, setTestResponse] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  
  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const isSupabase = isSupabaseAvailable()
        setSupabaseAvailable(isSupabase)
        
        if (isSupabase && supabase) {
          // Load from Supabase
          const { data: templatesData, error: templatesError } = await supabase
            .from('whatsapp_templates')
            .select('*')
          
          if (templatesError) throw templatesError
          
          const { data: configData, error: configError } = await supabase
            .from('whatsapp_config')
            .select('*')
            .single()
          
          // Handle case where config doesn't exist yet
          if (configError) {
            if (configError.code === 'PGRST116') { // No rows returned
              // Create default config in Supabase
              const defaultConfig: SupabaseConfig = {
                status: 'inactive',
                welcome_message: botConfig.welcomeMessage,
                phone_number: botConfig.phoneNumber,
                auto_reply: botConfig.autoReply
              }
              
              const { error: insertError } = await supabase
                .from('whatsapp_config')
                .insert(defaultConfig)
                .select()
              
              if (insertError) throw insertError
              
              // Fetch the newly created config
              const { data: newConfigData, error: newConfigError } = await supabase
                .from('whatsapp_config')
                .select('*')
                .single()
                
              if (newConfigError) throw newConfigError
              
              if (newConfigData) {
                setBotConfig({
                  status: newConfigData.status,
                  welcomeMessage: newConfigData.welcome_message,
                  phoneNumber: newConfigData.phone_number,
                  autoReply: newConfigData.auto_reply
                })
              }
            } else {
              throw configError
            }
          } else if (configData) {
            // Config exists, update state
            setBotConfig({
              status: configData.status,
              welcomeMessage: configData.welcome_message,
              phoneNumber: configData.phone_number,
              autoReply: configData.auto_reply
            })
          }
          
          // Map Supabase data to component state
          if (templatesData) {
            setTemplates(templatesData.map((template: SupabaseTemplate) => ({
              id: template.id,
              name: template.name,
              content: template.content,
              created_at: template.created_at,
              updated_at: template.updated_at
            })))
          }
        } else {
          // Load from localStorage (demo mode)
          const savedTemplates = localStorage.getItem(DEMO_TEMPLATES_KEY)
          const savedConfig = localStorage.getItem(DEMO_CONFIG_KEY)
          
          if (savedTemplates) setTemplates(JSON.parse(savedTemplates))
          if (savedConfig) setBotConfig(JSON.parse(savedConfig))
          else {
            // Save default config to localStorage
            localStorage.setItem(DEMO_CONFIG_KEY, JSON.stringify(botConfig))
          }
        }
      } catch (error) {
        console.error('Error loading WhatsApp data:', error)
        toast.error('Gagal memuat data WhatsApp')
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])
  
  // Save templates to localStorage in demo mode
  useEffect(() => {
    if (!isSupabaseAvailable() && templates.length > 0) {
      localStorage.setItem(DEMO_TEMPLATES_KEY, JSON.stringify(templates))
    }
  }, [templates])
  
  // Save config to localStorage in demo mode
  useEffect(() => {
    if (!isSupabaseAvailable()) {
      localStorage.setItem(DEMO_CONFIG_KEY, JSON.stringify(botConfig))
    }
  }, [botConfig])
  
  const handleAddTemplate = () => {
    setCurrentTemplate(null)
    setTemplateName('')
    setTemplateContent('')
    setShowTemplateForm(true)
  }
  
  const handleEditTemplate = (template: MessageTemplate) => {
    setCurrentTemplate(template)
    setTemplateName(template.name)
    setTemplateContent(template.content)
    setShowTemplateForm(true)
  }
  
  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !templateContent.trim()) {
      toast.error('Nama dan konten template harus diisi')
      return
    }
    
    try {
      if (currentTemplate) {
        // Update existing template
        const updatedTemplate = {
          ...currentTemplate,
          name: templateName,
          content: templateContent,
          updated_at: new Date().toISOString()
        }
        
        if (supabaseAvailable && supabase) {
          // For Supabase, we need to format the data correctly
          const supabaseData = {
            name: templateName,
            content: templateContent,
            updated_at: new Date().toISOString()
          }
          
          const { error, data } = await supabase
            .from('whatsapp_templates')
            .update(supabaseData)
            .eq('id', currentTemplate.id)
            .select()
          
          if (error) throw error
          
          if (data && data[0]) {
            // Use the returned data from Supabase
            const returnedTemplate: MessageTemplate = {
              id: data[0].id,
              name: data[0].name,
              content: data[0].content,
              created_at: data[0].created_at,
              updated_at: data[0].updated_at
            }
            
            setTemplates(templates.map(t => 
              t.id === currentTemplate.id ? returnedTemplate : t
            ))
          } else {
            // Fallback to local update if no data returned
            setTemplates(templates.map(t => 
              t.id === currentTemplate.id ? updatedTemplate : t
            ))
          }
        } else {
          // Local storage update
          setTemplates(templates.map(t => 
            t.id === currentTemplate.id ? updatedTemplate : t
          ))
        }
        
        toast.success('Template berhasil diperbarui')
      } else {
        // Create new template
        if (supabaseAvailable && supabase) {
          // For Supabase, we create with their format
          const supabaseData = {
            name: templateName,
            content: templateContent
          }
          
          const { error, data } = await supabase
            .from('whatsapp_templates')
            .insert(supabaseData)
            .select()
          
          if (error) throw error
          
          if (data && data[0]) {
            // Use the returned data with UUID from Supabase
            const newTemplate: MessageTemplate = {
              id: data[0].id,
              name: data[0].name,
              content: data[0].content,
              created_at: data[0].created_at,
              updated_at: data[0].updated_at
            }
            
            setTemplates([...templates, newTemplate])
          }
        } else {
          // Create with local ID for localStorage
          const newTemplate: MessageTemplate = {
            id: Date.now().toString(),
            name: templateName,
            content: templateContent,
            created_at: new Date().toISOString()
          }
          
          setTemplates([...templates, newTemplate])
        }
        
        toast.success('Template berhasil ditambahkan')
      }
      
      setShowTemplateForm(false)
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Gagal menyimpan template')
    }
  }
  
  const handleDeleteTemplate = async (id: string) => {
    try {
      if (supabaseAvailable && supabase) {
        const { error } = await supabase
          .from('whatsapp_templates')
          .delete()
          .eq('id', id)
        
        if (error) throw error
      }
      
      setTemplates(templates.filter(t => t.id !== id))
      setConfirmDeleteId(null)
      toast.success('Template berhasil dihapus')
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Gagal menghapus template')
    }
  }
  
  const handleSaveConfig = async () => {
    try {
      if (supabaseAvailable && supabase) {
        // Format data for Supabase
        const supabaseData: SupabaseConfig = {
          status: botConfig.status,
          welcome_message: botConfig.welcomeMessage,
          phone_number: botConfig.phoneNumber,
          auto_reply: botConfig.autoReply
        }
        
        // Get existing config to determine if we need to insert or update
        const { data: existingConfig, error: fetchError } = await supabase
          .from('whatsapp_config')
          .select('id')
          .limit(1)
        
        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError
        
        let error;
        
        if (existingConfig && existingConfig.length > 0) {
          // Update existing config
          const { error: updateError } = await supabase
            .from('whatsapp_config')
            .update({
              ...supabaseData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingConfig[0].id)
          
          error = updateError;
        } else {
          // Insert new config
          const { error: insertError } = await supabase
            .from('whatsapp_config')
            .insert(supabaseData)
          
          error = insertError;
        }
        
        if (error) throw error
      } else {
        // Save to localStorage for demo mode
        localStorage.setItem(DEMO_CONFIG_KEY, JSON.stringify(botConfig))
      }
      
      toast.success('Konfigurasi berhasil disimpan')
    } catch (error) {
      console.error('Error saving config:', error)
      toast.error('Gagal menyimpan konfigurasi')
    }
  }
  
  const handleToggleStatus = () => {
    setBotConfig({
      ...botConfig,
      status: botConfig.status === 'active' ? 'inactive' : 'active'
    })
  }
  
  const handleToggleAutoReply = () => {
    setBotConfig({
      ...botConfig,
      autoReply: !botConfig.autoReply
    })
  }
  
  const handleTestBot = () => {
    if (!testMessage.trim()) {
      toast.error('Pesan tidak boleh kosong')
      return
    }
    
    setTestLoading(true)
    
    // Simulate API call with timeout
    setTimeout(() => {
      let response = ''
      
      // Simple response logic
      const lowerMessage = testMessage.toLowerCase()
      if (lowerMessage.includes('menu')) {
        response = 'Layanan KP2A Cimahi:\n1. Info Iuran\n2. Info Pinjaman\n3. Info Saldo\n4. Hubungi Admin'
      } else if (lowerMessage.includes('iuran')) {
        response = 'Untuk informasi iuran, silakan ketik "iuran [nomor anggota]"'
      } else if (lowerMessage.includes('pinjaman')) {
        response = 'Untuk informasi pinjaman, silakan ketik "pinjaman [nomor anggota]"'
      } else if (lowerMessage.includes('saldo')) {
        response = 'Untuk informasi saldo, silakan ketik "saldo [nomor anggota]"'
      } else if (lowerMessage.includes('admin')) {
        response = 'Silakan hubungi admin kami di nomor 08123456789'
      } else {
        response = 'Maaf, saya tidak mengerti pesan Anda. Ketik "menu" untuk melihat daftar layanan.'
      }
      
      setTestResponse(response)
      setTestLoading(false)
    }, 1000)
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Bot Configuration */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <MessageSquare className="mr-2 h-5 w-5" />
              Konfigurasi Bot
            </h2>
            
            <div className="space-y-4">
              {/* Bot Status */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Status Bot</h3>
                  <p className="text-sm text-gray-500">Aktifkan atau nonaktifkan bot</p>
                </div>
                <button 
                  onClick={handleToggleStatus}
                  className={`flex items-center ${botConfig.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}
                >
                  {botConfig.status === 'active' ? (
                    <>
                      <ToggleRight className="h-6 w-6 mr-1" />
                      <span>Aktif</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-6 w-6 mr-1" />
                      <span>Nonaktif</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nomor WhatsApp
                </label>
                <input
                  type="text"
                  value={botConfig.phoneNumber}
                  onChange={(e) => setBotConfig({...botConfig, phoneNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+628xxxxxxxxxx"
                />
              </div>
              
              {/* Welcome Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pesan Sambutan
                </label>
                <textarea
                  value={botConfig.welcomeMessage}
                  onChange={(e) => setBotConfig({...botConfig, welcomeMessage: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Pesan sambutan untuk pengguna baru"
                />
              </div>
              
              {/* Auto Reply */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Auto Reply</h3>
                  <p className="text-sm text-gray-500">Balas pesan secara otomatis</p>
                </div>
                <button 
                  onClick={handleToggleAutoReply}
                  className={`flex items-center ${botConfig.autoReply ? 'text-green-600' : 'text-gray-400'}`}
                >
                  {botConfig.autoReply ? (
                    <>
                      <ToggleRight className="h-6 w-6 mr-1" />
                      <span>Aktif</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-6 w-6 mr-1" />
                      <span>Nonaktif</span>
                    </>
                  )}
                </button>
              </div>
              
              <button
                onClick={handleSaveConfig}
                className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Simpan Konfigurasi
              </button>
            </div>
          </div>
          
          {/* Test Bot */}
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-xl font-bold mb-4">Test Bot</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pesan Test
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ketik pesan untuk test bot"
                  />
                  <button
                    onClick={handleTestBot}
                    disabled={testLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {testLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              
              {testResponse && (
                <div className="bg-gray-100 p-3 rounded-md">
                  <p className="text-sm font-medium text-gray-700 mb-1">Respons:</p>
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <p className="text-sm whitespace-pre-line">{testResponse}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right column - Message Templates */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Template Pesan</h2>
              <button
                onClick={handleAddTemplate}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Tambah Template
              </button>
            </div>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : templates.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-500 mb-4">Belum ada template pesan</p>
                <button
                  onClick={handleAddTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Tambah Template
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nama Template
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Konten
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tanggal Dibuat
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {templates.map((template) => (
                      <tr key={template.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{template.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500 truncate max-w-xs">{template.content}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(template.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                            {template.updated_at && template.updated_at !== template.created_at && (
                              <div className="text-xs text-gray-400 mt-1">
                                Diperbarui: {new Date(template.updated_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(template.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Template Form Dialog */}
      <AnimatePresence>
        {showTemplateForm && (
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
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">
                    {currentTemplate ? 'Edit Template' : 'Tambah Template'}
                  </h2>
                  <button
                    onClick={() => setShowTemplateForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Template
                    </label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nama template"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Konten Template
                    </label>
                    <textarea
                      value={templateContent}
                      onChange={(e) => setTemplateContent(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={6}
                      placeholder="Konten template pesan"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Gunakan \n untuk baris baru. Contoh: Baris 1\nBaris 2
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button 
                      onClick={() => setShowTemplateForm(false)} 
                      className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSaveTemplate}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Confirm Delete Dialog */}
      <AnimatePresence>
        {confirmDeleteId && (
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
              className="bg-white rounded-lg shadow-xl w-full max-w-md"
            >
              <div className="p-6">
                <div className="flex items-start mb-4">
                  <div className="flex-shrink-0 text-red-500">
                    <Trash2 className="h-6 w-6" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-base font-semibold text-gray-900">Hapus Template?</h4>
                    <p className="text-sm text-gray-600 mt-1">Tindakan ini tidak dapat dibatalkan.</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-6">
                  <button 
                    onClick={() => setConfirmDeleteId(null)} 
                    className="px-4 py-2 rounded border"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={() => handleDeleteTemplate(confirmDeleteId)} 
                    className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}