import { useState, useEffect } from 'react'

interface AssetStats {
  downloaded: number
  totalExpected: number
  totalSize: number
  progress: string
  formattedSize: string
  breakdown?: {
    assetBundles: number
    storyFiles: number
    audioFiles: number
    otherFiles: number
  }
  error?: string
}

const AssetStats = () => {
  const [stats, setStats] = useState<AssetStats | null>(null)
  const [loading, setLoading] = useState(false)

  const API_BASE = 'http://localhost:3001'

  const loadStats = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/files/assets/stats`)
      const data: AssetStats = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to load asset stats:', error)
      setStats({
        downloaded: 0,
        totalExpected: 0,
        totalSize: 0,
        progress: '0',
        formattedSize: '0 B',
        error: error instanceof Error ? error.message : 'Failed to load stats'
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    loadStats()
    // Auto-refresh every 10 seconds during download
    const interval = setInterval(loadStats, 10000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !stats) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-white">Asset Download Progress</h4>
        <button
          onClick={loadStats}
          disabled={loading}
          className="text-sm bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded disabled:opacity-50"
        >
          {loading ? '⟳' : '↻'}
        </button>
      </div>

      {stats.error ? (
        <div className="text-red-400 text-sm">{stats.error}</div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Downloaded:</span>
            <span className="text-white">
              {stats.downloaded.toLocaleString()} / {stats.totalExpected.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Size:</span>
            <span className="text-white">{stats.formattedSize}</span>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Progress:</span>
              <span className="text-white">{stats.progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(parseFloat(stats.progress), 100)}%` }}
              ></div>
            </div>
          </div>

          {stats.downloaded > 0 && stats.totalExpected > 0 && (
            <div className="text-xs text-gray-500">
              Remaining: {(stats.totalExpected - stats.downloaded).toLocaleString()} files
            </div>
          )}

          {/* Detailed Breakdown */}
          {stats.breakdown && (
            <div className="mt-4 pt-3 border-t border-gray-700">
              <div className="text-xs text-gray-400 mb-2">File Type Breakdown:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Asset Bundles:</span>
                  <span className="text-blue-400">{stats.breakdown.assetBundles.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Story Files:</span>
                  <span className="text-green-400">{stats.breakdown.storyFiles.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Audio Files:</span>
                  <span className="text-yellow-400">{stats.breakdown.audioFiles.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Other Files:</span>
                  <span className="text-purple-400">{stats.breakdown.otherFiles.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AssetStats