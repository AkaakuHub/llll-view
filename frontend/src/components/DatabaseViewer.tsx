import { useState, useEffect } from 'react'

const DatabaseViewer = () => {
  const [databases, setDatabases] = useState<string[]>([])
  const [selectedDb, setSelectedDb] = useState<string>('')
  const [tables, setTables] = useState<string[]>([])
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const mockDatabases = ['master.db', 'assets.db', 'user.db']
  const mockTables = ['users', 'items', 'characters', 'songs', 'events']
  const mockData = [
    { id: 1, name: 'Sample Item 1', type: 'character', rarity: 'SSR' },
    { id: 2, name: 'Sample Item 2', type: 'card', rarity: 'SR' },
    { id: 3, name: 'Sample Item 3', type: 'song', rarity: 'R' },
  ]

  useEffect(() => {
    setDatabases(mockDatabases)
  }, [])

  const handleDbSelect = (db: string) => {
    setSelectedDb(db)
    setTables(mockTables)
    setSelectedTable('')
    setData([])
  }

  const handleTableSelect = (table: string) => {
    setSelectedTable(table)
    setLoading(true)
    setTimeout(() => {
      setData(mockData)
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Database</label>
          <select
            value={selectedDb}
            onChange={(e) => handleDbSelect(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2"
          >
            <option value="">Select a database</option>
            {databases.map((db) => (
              <option key={db} value={db}>{db}</option>
            ))}
          </select>
        </div>

        {selectedDb && (
          <div>
            <label className="block text-sm font-medium mb-2">Table</label>
            <select
              value={selectedTable}
              onChange={(e) => handleTableSelect(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2"
            >
              <option value="">Select a table</option>
              {tables.map((table) => (
                <option key={table} value={table}>{table}</option>
              ))}
            </select>
          </div>
        )}

        {selectedTable && (
          <div>
            <h3 className="text-lg font-semibold mb-2">
              {selectedDb} - {selectedTable}
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2">Loading data...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-600">
                      {data.length > 0 && Object.keys(data[0]).map((key) => (
                        <th key={key} className="text-left py-2 px-3 font-medium">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, index) => (
                      <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                        {Object.values(row).map((value, cellIndex) => (
                          <td key={cellIndex} className="py-2 px-3">
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {data.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    No data available
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!selectedDb && (
          <div className="text-center py-8 text-gray-400">
            Select a database to view its contents
          </div>
        )}
      </div>
    </div>
  )
}

export default DatabaseViewer