import { useState } from 'react'
import SometoolControls from './components/SometoolControls'
import DatabaseViewer from './components/DatabaseViewer'
import FileViewer from './components/FileViewer'
import CatalogViewer from './components/CatalogViewer'

function App() {
  const [activeTab, setActiveTab] = useState('controls')

  const tabs = [
    { id: 'controls', name: 'Sometool Controls', component: <SometoolControls /> },
    { id: 'database', name: 'Database Viewer', component: <DatabaseViewer /> },
    { id: 'files', name: 'File Explorer', component: <FileViewer /> },
    { id: 'catalog', name: 'Resource Catalog', component: <CatalogViewer /> },
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Some Frontend</h1>
        </header>
        
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          {tabs.find(tab => tab.id === activeTab)?.component}
        </div>
      </div>
    </div>
  )
}

export default App