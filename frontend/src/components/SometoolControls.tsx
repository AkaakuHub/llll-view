import { useState } from 'react'
import AssetStats from './AssetStats'

interface SometoolStatus {
  exists: boolean
  built: boolean
}

interface SometoolResult {
  success: boolean
  output: string
  error?: string
}

const SometoolControls = () => {
  const [status, setStatus] = useState<SometoolStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SometoolResult | null>(null)

  const API_BASE = 'http://localhost:3001/sometool'

  const checkStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/status`)
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Failed to check status:', error)
    }
    setLoading(false)
  }

  const buildSometool = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/build`, {
        method: 'POST',
      })
      const data = await response.json()
      setResult(data)
      if (data.success) {
        await checkStatus()
      }
    } catch (error) {
      console.error('Failed to build:', error)
      setResult({
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    setLoading(false)
  }

  const runSometool = async (options: { analyze?: boolean; dbonly?: boolean } = {}) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Failed to run sometool:', error)
      setResult({
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    setLoading(false)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="space-y-4">
        <button
          onClick={checkStatus}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-md"
        >
          {loading ? 'Checking...' : 'Check Status'}
        </button>

        {status && (
          <div className="bg-gray-700 p-4 rounded-md">
            <h3 className="font-semibold mb-2">Status</h3>
            <div className="text-sm space-y-1">
              <div>Exists: <span className={status.exists ? 'text-green-400' : 'text-red-400'}>{status.exists ? 'Yes' : 'No'}</span></div>
              <div>Built: <span className={status.built ? 'text-green-400' : 'text-red-400'}>{status.built ? 'Yes' : 'No'}</span></div>
            </div>
          </div>
        )}

        <button
          onClick={buildSometool}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded-md"
        >
          {loading ? 'Building...' : 'Build Sometool'}
        </button>

        <div className="space-y-2">
          <h3 className="font-semibold">Run Commands</h3>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => runSometool()}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 rounded-md"
            >
              Run Full Sync
            </button>
            <button
              onClick={() => runSometool({ dbonly: true })}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 px-4 py-2 rounded-md"
            >
              DB Only
            </button>
            <button
              onClick={() => runSometool({ analyze: true })}
              disabled={loading}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 px-4 py-2 rounded-md"
            >
              Analyze
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-gray-700 p-4 rounded-md">
            <h3 className="font-semibold mb-2">
              Result: <span className={result.success ? 'text-green-400' : 'text-red-400'}>
                {result.success ? 'Success' : 'Failed'}
              </span>
            </h3>
            {result.output && (
              <div className="mb-2">
                <h4 className="text-sm font-medium mb-1">Output:</h4>
                <pre className="text-xs bg-gray-600 p-2 rounded overflow-x-auto">{result.output}</pre>
              </div>
            )}
            {result.error && (
              <div>
                <h4 className="text-sm font-medium mb-1 text-red-400">Error:</h4>
                <pre className="text-xs bg-red-900 p-2 rounded overflow-x-auto">{result.error}</pre>
              </div>
            )}
          </div>
        )}

        <AssetStats />
      </div>
    </div>
  )
}

export default SometoolControls