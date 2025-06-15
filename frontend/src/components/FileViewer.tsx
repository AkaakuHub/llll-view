import { useState, useEffect } from 'react'

interface FileItem {
  name: string
  type: 'file' | 'directory'
  size: number
  modified: string
  path: string
}

interface FileListResponse {
  currentPath: string
  items: FileItem[]
  error?: string
}

interface FileContent {
  filename: string
  size: number
  content: string
  type: string
  extension: string
  error?: string
}

const FileViewer = () => {
  const [currentPath, setCurrentPath] = useState<string>('')
  const [files, setFiles] = useState<FileItem[]>([])
  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([])
  const [currentView, setCurrentView] = useState<'browser' | 'search'>('browser')

  const API_BASE = 'http://localhost:3001'

  const fileTypeOptions = [
    { value: 'audio', label: 'Audio (.acb, .wav, .mp3)' },
    { value: 'video', label: 'Video (.usm, .mp4)' },
    { value: 'bundle', label: 'Asset Bundle (.assetbundle)' },
    { value: 'image', label: 'Images (.png, .jpg, .gif)' },
  ]

  const loadFiles = async (path: string = '') => {
    setLoading(true)
    setError('')
    try {
      const url = path 
        ? `${API_BASE}/files/list?path=${encodeURIComponent(path)}`
        : `${API_BASE}/files/list`
      
      const response = await fetch(url)
      const data: FileListResponse = await response.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setFiles(data.items)
        setCurrentPath(data.currentPath)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files')
    }
    setLoading(false)
  }

  const loadFileContent = async (filePath: string) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/files/content/${encodeURIComponent(filePath)}`)
      const data: FileContent = await response.json()
      setSelectedFile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file content')
    }
    setLoading(false)
  }

  const handleItemClick = (item: FileItem) => {
    if (item.type === 'directory') {
      loadFiles(item.path)
    } else {
      loadFileContent(item.path)
    }
  }

  const goBack = () => {
    if (currentPath) {
      const parentPath = currentPath.split('/').slice(0, -1).join('/')
      loadFiles(parentPath)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString()
  }

  const searchFiles = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setError('')
    try {
      const typesParam = selectedFileTypes.length > 0 ? `&types=${selectedFileTypes.join(',')}` : ''
      const response = await fetch(`${API_BASE}/files/search?q=${encodeURIComponent(searchQuery.trim())}${typesParam}`)
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
        setSearchResults([])
      } else {
        setSearchResults(data.results || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search files')
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  const toggleFileType = (type: string) => {
    setSelectedFileTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  useEffect(() => {
    loadFiles()
  }, [])

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">File Explorer</h3>
        <div className="flex space-x-2">
          {currentPath && currentView === 'browser' && (
            <button
              onClick={goBack}
              className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm"
            >
              ← Back
            </button>
          )}
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setCurrentView('browser')}
          className={`px-4 py-2 rounded-md ${
            currentView === 'browser' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          File Browser
        </button>
        <button
          onClick={() => setCurrentView('search')}
          className={`px-4 py-2 rounded-md ${
            currentView === 'search' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Asset Search
        </button>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {currentView === 'browser' ? (
        <>
          <div className="text-sm text-gray-400 mb-2">
            Path: /{currentPath || 'root'}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2">Loading...</span>
            </div>
          ) : selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{selectedFile.filename}</h4>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕ Close
                </button>
              </div>
              
              {selectedFile.error ? (
                <div className="text-red-400">{selectedFile.error}</div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">
                    Size: {formatFileSize(selectedFile.size)} | Type: {selectedFile.type}
                  </div>
                  <div className="bg-gray-900 p-4 rounded overflow-auto max-h-96">
                    <pre className="text-sm whitespace-pre-wrap">{selectedFile.content}</pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((item) => (
                <div
                  key={item.name}
                  onClick={() => handleItemClick(item)}
                  className="flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">
                      {item.type === 'directory' ? '📁' : '📄'}
                    </span>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-400">
                        {item.type === 'file' && formatFileSize(item.size)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDate(item.modified)}
                  </div>
                </div>
              ))}

              {files.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-400">
                  No files found
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Asset Search Interface */}
          <div className="space-y-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search asset files (e.g., character names, song titles)..."
                className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2"
                onKeyDown={(e) => e.key === 'Enter' && searchFiles()}
              />
              <button
                onClick={searchFiles}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Search
              </button>
            </div>

            {/* File Type Filters */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-300">Filter by type:</span>
              {fileTypeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleFileType(option.value)}
                  className={`px-3 py-1 rounded-md text-sm ${
                    selectedFileTypes.includes(option.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
              {selectedFileTypes.length > 0 && (
                <button
                  onClick={() => setSelectedFileTypes([])}
                  className="px-3 py-1 rounded-md text-sm bg-red-600 text-white hover:bg-red-700"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Search Results */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2">Searching...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                <h4 className="font-medium">
                  Found {searchResults.length} files
                </h4>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      onClick={() => loadFileContent(result.path)}
                      className="flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">
                          {result.type === 'audio' ? '🎵' : 
                           result.type === 'video' ? '🎬' :
                           result.type === 'image' ? '🖼️' :
                           result.type === 'bundle' ? '📦' : '📄'}
                        </span>
                        <div>
                          <div className="font-medium">{result.name}</div>
                          <div className="text-xs text-gray-400">
                            {result.type} • {formatFileSize(result.size)}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDate(result.modified)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : searchQuery && !loading ? (
              <div className="text-center py-8 text-gray-400">
                No files found for "{searchQuery}"
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Enter a search term to find asset files
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default FileViewer