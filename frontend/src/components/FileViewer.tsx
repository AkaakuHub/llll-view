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

  const API_BASE = 'http://localhost:3001'

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

  useEffect(() => {
    loadFiles()
  }, [])

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">File Explorer</h3>
        {currentPath && (
          <button
            onClick={goBack}
            className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm"
          >
            ← Back
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

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
    </div>
  )
}

export default FileViewer