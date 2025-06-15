import { useState, useEffect } from 'react'

interface CatalogItem {
  Priority: number
  ResourceType: number
  Size: number
  TypeCrc: number
  LabelCrc: number
  StrTypeCrc: string
  StrLabelCrc: string
  StrContentNameCrcs: string[]
  StrDepCrcs: string[]
  StrCategoryCrcs: string[]
  RealName: string
}

interface CatalogResponse {
  total: number
  items: CatalogItem[]
  hasMore: boolean
  error?: string
}

const CatalogViewer = () => {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const API_BASE = 'http://localhost:3001'

  const loadCatalog = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/files/catalog`)
      const data: CatalogResponse = await response.json()
      setCatalog(data)
    } catch (error) {
      console.error('Failed to load catalog:', error)
      setCatalog({
        total: 0,
        items: [],
        hasMore: false,
        error: error instanceof Error ? error.message : 'Failed to load catalog'
      })
    }
    setLoading(false)
  }

  const filteredItems = catalog?.items.filter(item =>
    item.StrLabelCrc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.StrTypeCrc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.RealName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.StrCategoryCrcs.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || []

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  useEffect(() => {
    loadCatalog()
  }, [])

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Game Resource Catalog</h3>
        <button
          onClick={loadCatalog}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1 rounded text-sm"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {catalog?.error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
          {catalog.error}
        </div>
      )}

      {catalog && !catalog.error && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Total: {catalog.total} items {catalog.hasMore && '(showing first 100)'}</span>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400"
            />
          </div>

          {selectedItem ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{selectedItem.StrLabelCrc}</h4>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕ Close
                </button>
              </div>
              
              <div className="bg-gray-900 p-4 rounded space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-400">Type:</span> {selectedItem.StrTypeCrc}</div>
                  <div><span className="text-gray-400">Size:</span> {formatFileSize(selectedItem.Size)}</div>
                  <div><span className="text-gray-400">Priority:</span> {selectedItem.Priority}</div>
                  <div><span className="text-gray-400">Resource Type:</span> {selectedItem.ResourceType}</div>
                  <div><span className="text-gray-400">Real Name:</span> {selectedItem.RealName}</div>
                </div>
                
                {selectedItem.StrCategoryCrcs.length > 0 && (
                  <div>
                    <span className="text-gray-400">Categories:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedItem.StrCategoryCrcs.map((cat, index) => (
                        <span key={index} className="bg-blue-600 text-xs px-2 py-1 rounded">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedItem.StrContentNameCrcs.length > 0 && (
                  <div>
                    <span className="text-gray-400">Content Names:</span>
                    <div className="mt-1 text-sm">
                      {selectedItem.StrContentNameCrcs.join(', ')}
                    </div>
                  </div>
                )}

                {selectedItem.StrDepCrcs.length > 0 && (
                  <div>
                    <span className="text-gray-400">Dependencies:</span>
                    <div className="mt-1 text-sm">
                      {selectedItem.StrDepCrcs.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredItems.map((item, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedItem(item)}
                  className="flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.StrLabelCrc}</div>
                    <div className="text-sm text-gray-400">
                      {item.StrTypeCrc} • {formatFileSize(item.Size)}
                      {item.StrCategoryCrcs.length > 0 && (
                        <span className="ml-2">
                          {item.StrCategoryCrcs.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.RealName.substring(0, 10)}...
                  </div>
                </div>
              ))}

              {filteredItems.length === 0 && searchTerm && (
                <div className="text-center py-8 text-gray-400">
                  No items match your search
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">Loading catalog...</span>
        </div>
      )}
    </div>
  )
}

export default CatalogViewer