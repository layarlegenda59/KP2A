import React, { useState, useRef, useCallback, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { FaPlay, FaSave, FaFolderOpen, FaDownload, FaHistory, FaSun, FaMoon, FaCopy, FaTrash, FaFile, FaDatabase, FaCog, FaSearch, FaUndo, FaCheckCircle, FaExclamationCircle, FaClock } from 'react-icons/fa'
import { databaseClient, isDatabaseAvailable } from '../../lib/database'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { saveAs } from 'file-saver'

interface QueryResult {
  data: any[] | null
  error: string | null
  executionTime: number
  rowCount: number
}

interface SavedQuery {
  id: string
  name: string
  query: string
  createdAt: string
  lastExecuted?: string
}

interface QueryHistory {
  id: string
  query: string
  executedAt: string
  executionTime: number
  success: boolean
  error?: string
}

export function SQLEditor() {
  const [query, setQuery] = useState(`-- Welcome to KP2A Cimahi SQL Editor
-- Supported queries (for security, only basic SELECT operations):

-- View all members
SELECT * FROM members;

-- View all dues
SELECT * FROM dues;

-- View all loans
SELECT * FROM loans;

-- View all expenses
SELECT * FROM expenses;

-- View all loan payments
SELECT * FROM loan_payments;

-- View members with their dues (JOIN query)
SELECT * FROM members JOIN dues;`)

  const [result, setResult] = useState<QueryResult | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [savedQueries, setSavedQueries] = useState<FaSavedQuery[]>([])
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showHistoryPanel, setShowHistoryPanel] = useState(false)
  const [showSavedQueries, setShowSavedQueries] = useState(false)
  const [queryName, setQueryName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isFormatting, setIsFormatting] = useState(false)

  const editorRef = useRef<any>(null)

  // Load saved data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('kp2a-saved-queries')
    const history = localStorage.getItem('kp2a-query-history')
    
    if (saved) {
      try {
        setSavedQueries(JSON.parse(saved))
      } catch (e) {
        console.warn('Failed to load saved queries')
      }
    }
    
    if (history) {
      try {
        setQueryHistory(JSON.parse(history))
      } catch (e) {
        console.warn('Failed to load query history')
      }
    }
  }, [])

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('kp2a-saved-queries', JSON.stringify(savedQueries))
  }, [savedQueries])

  useEffect(() => {
    localStorage.setItem('kp2a-query-history', JSON.stringify(queryHistory))
  }, [queryHistory])

  const executeQuery = useCallback(async () => {
    if (!query.trim()) {
      toast.error('Please enter a SQL query')
      return
    }

    // STRICT validation for non-SQL code patterns - BLOCK ALL React/JS code
    const trimmedQuery = query.trim()
    
    // Block extremely long queries (React component code would be much longer)
    if (trimmedQuery.length > 2000) {
      toast.error('🚫 BLOCKED: Query terlalu panjang! Kemungkinan bukan SQL. Editor direset.')
      resetToDefaultQuery()
      return
    }
    
    // Immediate check for React/JS imports
    if (trimmedQuery.startsWith('import ') || trimmedQuery.startsWith('export ')) {
      toast.error('🚫 BLOCKED: Kode React/JS terdeteksi! Gunakan tombol Reset.')
      resetToDefaultQuery()
      return
    }
    
    const invalidPatterns = [
      'import ', 'export ', 'function ', 'const ', 'let ', 'var ',
      'React', 'useState', 'useEffect', 'useCallback', 'useRef',
      'return (', '</', 'className=', 'interface ', 'type ',
      'from \'', 'from "', '=>', '{', '}', 'tsx', 'jsx',
      'motion', 'AnimatePresence', 'toast', 'saveAs', 'Editor',
      'lucide-react', 'file-saver', 'monaco-editor'
    ]
    
    const hasInvalidPattern = invalidPatterns.some(pattern => 
      trimmedQuery.toLowerCase().includes(pattern.toLowerCase())
    )
    
    // Also check if it starts with non-SQL keywords
    const startsWithInvalid = /^(import|export|function|const|let|var|interface|type)\s/i.test(trimmedQuery)
    
    if (hasInvalidPattern || startsWithInvalid) {
      toast.error('🚫 BLOCKED: Hanya query SQL yang diizinkan! Editor direset otomatis.')
      resetToDefaultQuery()
      return
    }
    
    // Additional safety checks for JavaScript/React patterns
    if (trimmedQuery.includes('{ useState') || 
        trimmedQuery.includes('useRef') || 
        trimmedQuery.includes('useCallback') || 
        trimmedQuery.includes('useEffect') ||
        trimmedQuery.includes('} from') ||
        /\{[^}]*\}/g.test(trimmedQuery.replace(/--.*$/gm, '')) // Remove comments first
    ) {
      toast.error('🚫 BLOCKED: JavaScript/React syntax terdeteksi! Editor direset.')
      resetToDefaultQuery()
      return
    }
    
    // Ensure it contains SQL keywords
    const sqlKeywords = ['select', 'from', 'where', 'join', 'order', 'group']
    const hasSqlKeyword = sqlKeywords.some(keyword => 
      trimmedQuery.toLowerCase().includes(keyword)
    )
    
    if (!hasSqlKeyword && !trimmedQuery.startsWith('--')) {
      toast.error('❌ Query harus mengandung kata kunci SQL (SELECT, FROM, dll.) atau komentar (--)')
      return
    }

    if (!isDatabaseAvailable()) {
      toast.error('Database connection not available')
      return
    }

    setIsExecuting(true)
    const startTime = Date.now()

    try {
      // Parse and execute the query using direct Supabase client methods
      const trimmedQuery = query.trim().toLowerCase()
      let data, error
      
      if (trimmedQuery.includes('select * from members')) {
        const result = await databaseClient.from('members').select('*').limit(100)
        data = result.data
        error = result.error
      } else if (trimmedQuery.includes('select * from dues')) {
        const result = await databaseClient.from('dues').select('*').limit(100)
        data = result.data
        error = result.error
      } else if (trimmedQuery.includes('select * from loans')) {
        const result = await databaseClient.from('loans').select('*').limit(100)
        data = result.data
        error = result.error
      } else if (trimmedQuery.includes('select * from expenses')) {
        const result = await databaseClient.from('expenses').select('*').limit(100)
        data = result.data
        error = result.error
      } else if (trimmedQuery.includes('select * from loan_payments')) {
        const result = await databaseClient.from('loan_payments').select('*').limit(100)
        data = result.data
        error = result.error
      } else if (trimmedQuery.includes('from members') && trimmedQuery.includes('join dues')) {
        // Handle JOIN queries for members and dues
        const result = await databaseClient
          .from('members')
          .select(`
            *,
            dues(*)
          `)
          .limit(50)
          
        data = result.data
        error = result.error
      } else {
        // For other queries, provide a safe fallback
        error = { message: 'For security reasons, only basic SELECT queries on main tables (members, dues, loans, expenses, loan_payments) are supported. Use table names directly like: SELECT * FROM members' }
        data = null
      }

      const executionTime = Date.now() - startTime
      const historyEntry: QueryHistory = {
        id: Date.now().toString(),
        query: query.trim(),
        executedAt: new Date().toISOString(),
        executionTime,
        success: !error,
        error: error?.message
      }

      if (error) {
        setResult({
          data: null,
          error: error.message,
          executionTime,
          rowCount: 0
        })
        toast.error(`Query failed: ${error.message}`)
      } else {
        setResult({
          data: Array.isArray(data) ? data : [data],
          error: null,
          executionTime,
          rowCount: Array.isArray(data) ? data.length : 1
        })
        toast.success(`Query executed successfully (${executionTime}ms)`)
      }

      // Add to history
      setQueryHistory(prev => [historyEntry, ...prev.slice(0, 49)]) // Keep last 50 queries
    } catch (error: any) {
      const executionTime = Date.now() - startTime
      setResult({
        data: null,
        error: error.message || 'Unknown error occurred',
        executionTime,
        rowCount: 0
      })
      toast.error(`Execution failed: ${error.message}`)

      // Add failed query to history
      setQueryHistory(prev => [{
        id: Date.now().toString(),
        query: query.trim(),
        executedAt: new Date().toISOString(),
        executionTime,
        success: false,
        error: error.message
      }, ...prev.slice(0, 49)])
    } finally {
      setIsExecuting(false)
    }
  }, [query])

  const saveQuery = useCallback(() => {
    if (!queryName.trim()) {
      toast.error('Please enter a query name')
      return
    }

    const newQuery: SavedQuery = {
      id: Date.now().toString(),
      name: queryName.trim(),
      query: query.trim(),
      createdAt: new Date().toISOString()
    }

    setSavedQueries(prev => [newQuery, ...prev])
    setQueryName('')
    setShowSaveDialog(false)
    toast.success('Query saved successfully')
  }, [query, queryName])

  const loadQuery = useCallback((savedQuery: SavedQuery) => {
    setQuery(savedQuery.query)
    setShowSavedQueries(false)
    toast.success(`Loaded query: ${savedQuery.name}`)
  }, [])

  const deleteQuery = useCallback((id: string) => {
    setSavedQueries(prev => prev.filter(q => q.id !== id))
    toast.success('Query deleted')
  }, [])

  const formatQuery = useCallback(async () => {
    if (!query.trim()) return

    setIsFormatting(true)
    try {
      // Simple SQL formatting
      const formatted = query
        .replace(/\s+/g, ' ')
        .replace(/\s*,\s*/g, ',\n  ')
        .replace(/\s*(SELECT|FROM|WHERE|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|ORDER BY|GROUP BY|HAVING)\s+/gi, '\n$1 ')
        .replace(/\s*;\s*/g, ';\n\n')
        .trim()

      setQuery(formatted)
      toast.success('Query formatted')
    } catch (error) {
      toast.error('Failed to format query')
    } finally {
      setIsFormatting(false)
    }
  }, [query])

  const exportResults = useCallback((format: 'csv' | 'json') => {
    if (!result?.data) {
      toast.error('No data to export')
      return
    }

    try {
      if (format === 'csv') {
        const headers = Object.keys(result.data[0] || {})
        const csvContent = [
          headers.join(','),
          ...result.data.map(row => 
            headers.map(header => 
              JSON.stringify(row[header] || '')
            ).join(',')
          )
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        saveAs(blob, `query-results-${Date.now()}.csv`)
      } else {
        const jsonContent = JSON.stringify(result.data, null, 2)
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
        saveAs(blob, `query-results-${Date.now()}.json`)
      }
      toast.success(`Results exported as ${format.toUpperCase()}`)
    } catch (error) {
      toast.error('Failed to export results')
    }
  }, [result])

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }, [])

  const resetToDefaultQuery = useCallback(() => {
    const defaultQuery = `-- Welcome to KP2A Cimahi SQL Editor
-- Supported queries (for security, only basic SELECT operations):

-- View all members
SELECT * FROM members;

-- View all dues
SELECT * FROM dues;

-- View all loans
SELECT * FROM loans;

-- View all expenses
SELECT * FROM expenses;

-- View all loan payments
SELECT * FROM loan_payments;

-- View members with their dues (JOIN query)
SELECT * FROM members JOIN dues;`
    setQuery(defaultQuery)
    toast.success('✅ Editor direset ke query SQL default')
  }, [])

  // Auto-detect and clean non-SQL content immediately
  useEffect(() => {
    const checkAndCleanQuery = () => {
      const trimmedQuery = query.trim()
      const invalidPatterns = [
        'import ', 'export ', 'function ', 'const ', 'let ', 'var ',
        'React', 'useState', 'useEffect', 'useCallback', 'useRef',
        'return (', '</', 'className=', 'interface ', 'type ',
        'from \'', 'from "', '=>', 'tsx', 'jsx', 'motion', 'AnimatePresence'
      ]
      
      const hasInvalidPattern = invalidPatterns.some(pattern => 
        trimmedQuery.toLowerCase().includes(pattern.toLowerCase())
      )
      
      // Immediate reset if React/JS code is detected
      if (hasInvalidPattern && trimmedQuery.length > 50) {
        toast.error('🚫 Kode non-SQL terdeteksi! Editor direset otomatis.')
        resetToDefaultQuery()
        return
      }
      
      // Also check if it starts with import/export
      if (trimmedQuery.startsWith('import ') || trimmedQuery.startsWith('export ')) {
        toast.error('🚫 Kode React/JS terdeteksi! Editor direset otomatis.')
        resetToDefaultQuery()
        return
      }
    }

    // Check immediately, no delay
    const timeoutId = setTimeout(checkAndCleanQuery, 100)
    return () => clearTimeout(timeoutId)
  }, [query, resetToDefaultQuery])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'Enter':
            e.preventDefault()
            executeQuery()
            break
          case 's':
            e.preventDefault()
            setShowSaveDialog(true)
            break
          case 'o':
            e.preventDefault()
            setShowSavedQueries(true)
            break
          case 'h':
            e.preventDefault()
            setShowHistoryPanel(true)
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [executeQuery])

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor
    
    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 1.5,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
      lineNumbers: 'on',
      folding: true,
      bracketMatching: 'always',
      autoIndent: 'full'
    })
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Warning Banner */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
        <div className="flex items-center">
          <FaExclamationCircle className="h-4 w-4 text-yellow-600 mr-2" />
          <p className="text-sm text-yellow-800">
            <strong>Peringatan:</strong> Hanya query SQL yang diizinkan. Jangan paste kode React/JavaScript ke editor ini.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={executeQuery}
             disabled={isExecuting || !isDatabaseAvailable()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExecuting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <FaPlay className="h-4 w-4 mr-2" />
            )}
            Execute (Ctrl+Enter)
          </button>

          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaSave className="h-4 w-4 mr-2" />
            Save (Ctrl+S)
          </button>

          <button
            onClick={() => setShowSavedQueries(true)}
            className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaFolderOpen className="h-4 w-4 mr-2" />
            Load (Ctrl+O)
          </button>

          <button
            onClick={formatQuery}
            disabled={isFormatting}
            className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <FaCog className="h-4 w-4 mr-2" />
            Format
          </button>

          <button
            onClick={resetToDefaultQuery}
            className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaUndo className="h-4 w-4 mr-2" />
            Reset
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowHistoryPanel(true)}
            className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaHistory className="h-4 w-4 mr-2" />
            History (Ctrl+H)
          </button>

          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {theme === 'light' ? <FaMoon className="h-4 w-4" /> : <FaSun className="h-4 w-4" />}
          </button>

          <div className={`flex items-center px-2 py-1 rounded-full text-xs ${
            isDatabaseAvailable() 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <FaDatabase className="h-3 w-3 mr-1" />
            {isDatabaseAvailable() ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Editor Panel */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 border-r border-gray-200">
            <Editor
              height="100%"
              defaultLanguage="sql"
              theme={theme === 'dark' ? 'vs-dark' : 'vs'}
              value={query}
              onChange={(value) => setQuery(value || '')}
              onMount={handleEditorDidMount}
              options={{
                fontSize: 14,
                lineHeight: 1.5,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                lineNumbers: 'on',
                folding: true,
                bracketMatching: 'always',
                autoIndent: 'full',
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                parameterHints: { enabled: true },
                formatOnPaste: true,
                formatOnType: true
              }}
            />
          </div>
        </div>

        {/* Results Panel */}
        <div className="w-1/2 flex flex-col bg-white">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Query Results</h3>
            {result && (
              <div className="flex items-center space-x-2">
                {result.data && (
                  <>
                    <button
                      onClick={() => exportResults('csv')}
                      className="flex items-center px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                      <FaDownload className="h-3 w-3 mr-1" />
                      CSV
                    </button>
                    <button
                      onClick={() => exportResults('json')}
                      className="flex items-center px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                      <FaDownload className="h-3 w-3 mr-1" />
                      JSON
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {result ? (
              <div className="space-y-4">
                {/* Execution Info */}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      {result.error ? (
                        <FaExclamationCircle className="h-4 w-4 text-red-500 mr-1" />
                      ) : (
                        <FaCheckCircle className="h-4 w-4 text-green-500 mr-1" />
                      )}
                      {result.error ? 'Failed' : 'Success'}
                    </span>
                    <span className="flex items-center">
                      <FaClock className="h-4 w-4 mr-1" />
                      {result.executionTime}ms
                    </span>
                    {result.data && (
                      <span>{result.rowCount} rows</span>
                    )}
                  </div>
                </div>

                {/* Error Display */}
                {result.error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start">
                      <FaExclamationCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-red-800">Query Error</h4>
                        <p className="text-sm text-red-700 mt-1">{result.error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Results Table */}
                {result.data && result.data.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {Object.keys(result.data[0]).map((column) => (
                              <th
                                key={column}
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {result.data.map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              {Object.values(row).map((value: any, cellIndex) => (
                                <td
                                  key={cellIndex}
                                  className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate"
                                  title={String(value)}
                                >
                                  {value === null ? (
                                    <span className="text-gray-400 italic">NULL</span>
                                  ) : (
                                    String(value)
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {result.data && result.data.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FaDatabase className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Query executed successfully but returned no results.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <FaDatabase className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Execute a query to see results here</p>
                  <p className="text-sm mt-2">Press Ctrl+Enter or click Execute</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Query Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowSaveDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-96 max-w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Query</h3>
              <input
                type="text"
                placeholder="Enter query name..."
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveQuery()
                  if (e.key === 'Escape') setShowSaveDialog(false)
                }}
              />
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveQuery}
                  disabled={!queryName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Queries Panel */}
      <AnimatePresence>
        {showSavedQueries && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowSavedQueries(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-2/3 max-w-4xl max-h-2/3 mx-4 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Saved Queries</h3>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <FaSearch className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search queries..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {savedQueries.filter(q => 
                  q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  q.query.toLowerCase().includes(searchTerm.toLowerCase())
                ).length > 0 ? (
                  <div className="space-y-2">
                    {savedQueries
                      .filter(q => 
                        q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        q.query.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((savedQuery) => (
                        <div
                          key={savedQuery.id}
                          className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{savedQuery.name}</h4>
                              <p className="text-sm text-gray-500 mt-1">
                                Created: {new Date(savedQuery.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                              </p>
                              <pre className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded overflow-x-auto">
                                {savedQuery.query.substring(0, 200)}
                                {savedQuery.query.length > 200 && '...'}
                              </pre>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => loadQuery(savedQuery)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Load Query"
                              >
                                <FaFolderOpen className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => copyToClipboard(savedQuery.query)}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Copy Query"
                              >
                                <FaCopy className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteQuery(savedQuery.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete Query"
                              >
                                <FaTrash className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FaFile className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No saved queries found</p>
                    {searchTerm && <p className="text-sm mt-2">Try adjusting your search terms</p>}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Query History Panel */}
      <AnimatePresence>
        {showHistoryPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowHistoryPanel(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-2/3 max-w-4xl max-h-2/3 mx-4 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Query History</h3>
                <button
                  onClick={() => setQueryHistory([])}
                  className="flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <FaTrash className="h-4 w-4 mr-2" />
                  Clear History
                </button>
              </div>

              <div className="flex-1 overflow-auto">
                {queryHistory.length > 0 ? (
                  <div className="space-y-2">
                    {queryHistory.map((historyItem) => (
                      <div
                        key={historyItem.id}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {historyItem.success ? (
                                <FaCheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <FaExclamationCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="text-sm text-gray-500">
                                {new Date(historyItem.executedAt).toLocaleString()}
                              </span>
                              <span className="text-sm text-gray-500">
                                {historyItem.executionTime}ms
                              </span>
                            </div>
                            {historyItem.error && (
                              <p className="text-sm text-red-600 mb-2">{historyItem.error}</p>
                            )}
                            <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                              {historyItem.query}
                            </pre>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => {
                                setQuery(historyItem.query)
                                setShowHistoryPanel(false)
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Load Query"
                            >
                              <FaUndo className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => copyToClipboard(historyItem.query)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title="Copy Query"
                            >
                              <FaCopy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FaHistory className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No query history available</p>
                    <p className="text-sm mt-2">Execute some queries to see them here</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}