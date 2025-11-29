import { useState, useEffect, useRef } from 'react'
import TaskList from './components/TaskList'
import ConversationView from './components/ConversationView'

interface Task {
  id: string
  timestamp: number
  firstMessage: string
}

interface Message {
  role: 'user' | 'assistant'
  content: ContentBlock[]
  ts: number
}

interface ContentBlock {
  type: string
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string
  is_error?: boolean
  summary?: string[]
}

type Source = 'nightly' | 'production'

function getStoredSource(): Source {
  const stored = localStorage.getItem('convo-viewer-source')
  return stored === 'production' ? 'production' : 'nightly'
}

export default function App() {
  const [source, setSource] = useState<Source>(getStoredSource)
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [conversation, setConversation] = useState<Message[] | null>(null)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadTasks()
  }, [source])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tasks/${source}`)
        if (!res.ok) return
        const data: Task[] = await res.json()
        
        setTasks(prevTasks => {
          const existingIds = new Set(prevTasks.map(t => t.id))
          const newTasks = data.filter(t => !existingIds.has(t.id))
          
          if (newTasks.length === 0) {
            const updatedTasks = prevTasks.map(prevTask => {
              const updated = data.find(t => t.id === prevTask.id)
              return updated ? { ...prevTask, timestamp: updated.timestamp } : prevTask
            })
            updatedTasks.sort((a, b) => b.timestamp - a.timestamp)
            return updatedTasks
          }
          
          const mergedTasks = [...newTasks, ...prevTasks]
          mergedTasks.sort((a, b) => b.timestamp - a.timestamp)
          return mergedTasks
        })
      } catch {
        // Silently ignore polling errors
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [source])

  useEffect(() => {
    if (!selectedTask) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/task/${source}/${selectedTask}`)
        if (!res.ok) return
        const data = await res.json()
        setConversation(data)
      } catch {
        // Silently ignore polling errors
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [selectedTask, source])

  async function loadTasks() {
    setLoadingTasks(true)
    setError(null)
    setSelectedTask(null)
    setConversation(null)
    
    try {
      const res = await fetch(`/api/tasks/${source}`)
      if (!res.ok) throw new Error('Failed to load tasks')
      const data = await res.json()
      setTasks(data)
    } catch (err) {
      setError('Failed to load tasks. Make sure the server is running.')
    } finally {
      setLoadingTasks(false)
    }
  }

  async function loadConversation(taskId: string) {
    // Don't allow clicking if already loading
    if (loadingConversation) return
    
    setLoadingConversation(true)
    setError(null)
    setSelectedTask(taskId) // Set immediately to show selection
    setConversation(null) // Clear old conversation
    
    try {
      const res = await fetch(`/api/task/${source}/${taskId}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError('Conversation not found. The task may have been deleted.')
          setSelectedTask(null)
          loadTasks()
          return
        }
        throw new Error('Failed to load conversation')
      }
      const data = await res.json()
      // Only set if this is still the selected task (prevents race conditions)
      setConversation(data)
    } catch (err) {
      setError('Failed to load conversation')
      setSelectedTask(null)
    } finally {
      setLoadingConversation(false)
    }
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)
        
        if (Array.isArray(data)) {
          setConversation(data)
          setSelectedTask(null)
          setUploadedFileName(file.name)
        } else {
          setError('Invalid file format. Expected an array of messages.')
        }
      } catch {
        setError('Failed to parse JSON file.')
      } finally {
        setLoading(false)
      }
    }
    reader.onerror = () => {
      setError('Failed to read file.')
      setLoading(false)
    }
    reader.readAsText(file)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-100">Convo Viewer</h1>
            <div className="flex items-center gap-4">
              <label className="text-sm text-slate-400">Source:</label>
              <select
                value={source}
                onChange={(e) => {
                  const newSource = e.target.value as Source
                  localStorage.setItem('convo-viewer-source', newSource)
                  setSource(newSource)
                }}
                className="border border-slate-600 rounded-md px-3 py-2 bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="nightly">Nightly</option>
                <option value="production">Production</option>
              </select>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="border border-slate-600 rounded-md px-3 py-2 bg-slate-700 text-sm text-slate-100 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Upload File
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4">
            {loadingTasks ? (
              <div className="bg-slate-800 rounded-lg shadow-lg p-8 text-center text-slate-400 border border-slate-700">
                Loading tasks...
              </div>
            ) : (
              <TaskList
                tasks={tasks}
                selectedTask={selectedTask}
                onSelectTask={loadConversation}
                disabled={loadingConversation}
              />
            )}
          </div>
          <div className="col-span-8">
            {loadingConversation ? (
              <div className="bg-slate-800 rounded-lg shadow-lg p-8 text-center text-slate-400 border border-slate-700">
                <div className="animate-pulse">Loading conversation...</div>
              </div>
            ) : conversation ? (
              <ConversationView
                messages={conversation}
                taskId={selectedTask ?? uploadedFileName ?? 'uploaded'}
                onClose={() => {
                  setConversation(null)
                  setSelectedTask(null)
                  setUploadedFileName(null)
                }}
              />
            ) : (
              <div className="bg-slate-800 rounded-lg shadow-lg p-8 text-center text-slate-400 border border-slate-700">
                Select a task to view the conversation
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
