import { useState, useEffect } from 'react'

interface Database {
  name: string
  type: string
  description: string
  recordCount?: number
}

interface StoryResult {
  table: string
  Id: number
  Name: string
  Description: string
  ScriptId: number
  storyType: string
  AdvSeriesId?: number
}

const DatabaseViewer = () => {
  const [databases, setDatabases] = useState<Database[]>([])
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [data, setData] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [storySearchQuery, setStorySearchQuery] = useState<string>('')
  const [storyResults, setStoryResults] = useState<StoryResult[]>([])
  const [selectedStory, setSelectedStory] = useState<any>(null)
  const [totalRecords, setTotalRecords] = useState<number>(0)
  const [currentView, setCurrentView] = useState<'tables' | 'stories'>('tables')

  useEffect(() => {
    loadDatabases()
  }, [])

  const loadDatabases = async () => {
    try {
      const response = await fetch('http://localhost:3001/database/list')
      const result = await response.json()
      setDatabases(result.databases || [])
    } catch (error) {
      console.error('Failed to load databases:', error)
    }
  }

  const handleTableSelect = async (tableName: string) => {
    setSelectedTable(tableName)
    setLoading(true)
    setSearchQuery('')
    await loadTableData(tableName)
  }

  const loadTableData = async (tableName: string, search?: string) => {
    try {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : ''
      const response = await fetch(`http://localhost:3001/database/table/${tableName}?limit=100&offset=0${searchParam}`)
      const result = await response.json()
      
      if (result.error) {
        console.error('Error loading table data:', result.error)
        setData([])
        setColumns([])
        setTotalRecords(0)
      } else {
        setData(result.data || [])
        setColumns(result.columns || [])
        setTotalRecords(result.total || 0)
      }
    } catch (error) {
      console.error('Failed to load table data:', error)
      setData([])
      setColumns([])
      setTotalRecords(0)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (selectedTable && searchQuery.trim()) {
      setLoading(true)
      loadTableData(selectedTable, searchQuery.trim())
    } else if (selectedTable) {
      setLoading(true)
      loadTableData(selectedTable)
    }
  }

  const handleStorySearch = async () => {
    if (!storySearchQuery.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`http://localhost:3001/database/stories/search?q=${encodeURIComponent(storySearchQuery.trim())}&limit=50`)
      const result = await response.json()
      
      if (result.error) {
        console.error('Error searching stories:', result.error)
        setStoryResults([])
      } else {
        setStoryResults(result.results || [])
      }
    } catch (error) {
      console.error('Failed to search stories:', error)
      setStoryResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleStorySelect = async (story: StoryResult) => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:3001/database/stories/${story.Id}`)
      const result = await response.json()
      
      if (result.found) {
        setSelectedStory(result)
      } else {
        console.error('Story not found:', result.error)
        setSelectedStory(null)
      }
    } catch (error) {
      console.error('Failed to load story:', error)
      setSelectedStory(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="space-y-4">
        {/* View Toggle */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setCurrentView('tables')}
            className={`px-4 py-2 rounded-md ${
              currentView === 'tables' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Database Tables
          </button>
          <button
            onClick={() => setCurrentView('stories')}
            className={`px-4 py-2 rounded-md ${
              currentView === 'stories' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Story Search
          </button>
        </div>

        {currentView === 'tables' ? (
          <>
            {/* Table Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Table</label>
              <select
                value={selectedTable}
                onChange={(e) => handleTableSelect(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2"
              >
                <option value="">Select a table</option>
                {databases.map((db) => (
                  <option key={db.name} value={db.name}>
                    {db.name} ({db.recordCount} records) - {db.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Table Search */}
            {selectedTable && (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in table..."
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Search
                </button>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    loadTableData(selectedTable)
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Table Data */}
            {selectedTable && (
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {selectedTable} ({totalRecords} records)
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
                          {columns.map((column) => (
                            <th key={column} className="text-left py-2 px-3 font-medium">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((row, index) => (
                          <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                            {columns.map((column) => (
                              <td key={column} className="py-2 px-3 max-w-xs truncate">
                                {String(row[column] || '')}
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

            {!selectedTable && (
              <div className="text-center py-8 text-gray-400">
                Select a table to view its contents
              </div>
            )}
          </>
        ) : (
          <>
            {/* Story Search */}
            <div className="space-y-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={storySearchQuery}
                  onChange={(e) => setStorySearchQuery(e.target.value)}
                  placeholder="Search stories by title, description, or ID..."
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2"
                  onKeyDown={(e) => e.key === 'Enter' && handleStorySearch()}
                />
                <button
                  onClick={handleStorySearch}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Search Stories
                </button>
              </div>

              {/* Story Results */}
              {storyResults.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    Story Search Results ({storyResults.length})
                  </h3>
                  <div className="grid gap-2 max-h-96 overflow-y-auto">
                    {storyResults.map((story) => (
                      <div
                        key={`${story.table}-${story.Id}`}
                        onClick={() => handleStorySelect(story)}
                        className="p-3 bg-gray-700 hover:bg-gray-600 rounded-md cursor-pointer border-l-4 border-blue-500"
                      >
                        <div className="font-medium text-blue-400">{story.Name}</div>
                        <div className="text-sm text-gray-300">{story.Description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {story.storyType} | ID: {story.Id} | Script: {story.ScriptId}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Story Details */}
              {selectedStory && (
                <div className="mt-4 p-4 bg-gray-700 rounded-md">
                  <h3 className="text-lg font-semibold text-blue-400 mb-2">
                    {selectedStory.story.Name}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Description:</span> {selectedStory.story.Description}</div>
                    <div><span className="font-medium">Story ID:</span> {selectedStory.story.Id}</div>
                    <div><span className="font-medium">Script ID:</span> {selectedStory.story.ScriptId}</div>
                    <div><span className="font-medium">Series ID:</span> {selectedStory.story.AdvSeriesId}</div>
                    <div><span className="font-medium">Order:</span> {selectedStory.story.OrderId}</div>
                    <div><span className="font-medium">Type:</span> {selectedStory.storyType}</div>
                    
                    {selectedStory.story.StartTime && (
                      <div><span className="font-medium">Start Time:</span> {new Date(selectedStory.story.StartTime).toLocaleString()}</div>
                    )}

                    {/* Story Text Content */}
                    {selectedStory.storyText && selectedStory.storyText.found && (
                      <div className="mt-4">
                        <div className="font-medium mb-2 text-blue-400">ストーリー内容:</div>
                        
                        {/* Characters */}
                        {selectedStory.storyText.content.metadata.characters.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs text-gray-400 mb-1">登場キャラクター:</div>
                            <div className="flex flex-wrap gap-1">
                              {selectedStory.storyText.content.metadata.characters.map((char: string, index: number) => (
                                <span key={index} className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                                  {char}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Dialogue */}
                        {selectedStory.storyText.content.dialogue.length > 0 && (
                          <div className="mb-4">
                            <div className="text-xs text-gray-400 mb-2">会話:</div>
                            <div className="space-y-2 max-h-80 overflow-y-auto bg-gray-800 p-3 rounded">
                              {selectedStory.storyText.content.dialogue.map((dialogue: any, index: number) => (
                                <div key={index} className="border-l-2 border-blue-500 pl-3">
                                  <div className="text-xs text-blue-400 font-medium">{dialogue.character}</div>
                                  <div className="text-sm text-gray-200">{dialogue.text}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Additional metadata */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {selectedStory.storyText.content.metadata.backgroundMusic.length > 0 && (
                            <div>
                              <div className="text-gray-400 mb-1">BGM:</div>
                              <div className="space-y-1">
                                {selectedStory.storyText.content.metadata.backgroundMusic.map((bgm: string, index: number) => (
                                  <div key={index} className="text-gray-300">{bgm}</div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {selectedStory.storyText.content.metadata.backgrounds.length > 0 && (
                            <div>
                              <div className="text-gray-400 mb-1">背景:</div>
                              <div className="space-y-1">
                                {selectedStory.storyText.content.metadata.backgrounds.map((bg: string, index: number) => (
                                  <div key={index} className="text-gray-300">{bg}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedStory.storyText && !selectedStory.storyText.found && (
                      <div className="mt-4 p-2 bg-yellow-900 border border-yellow-700 text-yellow-200 rounded text-xs">
                        ストーリーテキストファイルが見つかりません: {selectedStory.storyText.error}
                      </div>
                    )}
                    
                    {selectedStory.relatedStories && selectedStory.relatedStories.length > 0 && (
                      <div className="mt-4">
                        <div className="font-medium mb-2">関連ストーリー:</div>
                        <div className="space-y-1">
                          {selectedStory.relatedStories.map((related: any) => (
                            <div 
                              key={related.Id} 
                              className="text-xs text-gray-400 pl-2 hover:text-blue-400 cursor-pointer"
                              onClick={() => handleStorySelect({ ...related, table: 'AdvDatas', storyType: 'Adventure Story' })}
                            >
                              {related.OrderId}. {related.Name} - {related.Description}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-2">Searching...</span>
                </div>
              )}

              {storyResults.length === 0 && storySearchQuery && !loading && (
                <div className="text-center py-8 text-gray-400">
                  No stories found for "{storySearchQuery}"
                </div>
              )}

              {!storySearchQuery && (
                <div className="text-center py-8 text-gray-400">
                  Enter a search term to find stories
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default DatabaseViewer