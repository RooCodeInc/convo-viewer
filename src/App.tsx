import { useState, useEffect } from 'react'
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTasks()
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
    setLoading(true)
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
      setLoading(false)
    }
  }

  async function loadConversation(taskId: string) {
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/task/${source}/${taskId}`)
      if (!res.ok) throw new Error('Failed to load conversation')
      const data = await res.json()
      setConversation(data)
      setSelectedTask(taskId)
    } catch (err) {
      setError('Failed to load conversation')
    } finally {
      setLoading(false)
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

        {loading && !conversation && (
          <div className="text-center py-8 text-slate-400">Loading...</div>
        )}

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4">
            <TaskList
              tasks={tasks}
              selectedTask={selectedTask}
              onSelectTask={loadConversation}
            />
          </div>
          <div className="col-span-8">
            {conversation ? (
              <ConversationView
                messages={conversation}
                taskId={selectedTask!}
                onClose={() => {
                  setConversation(null)
                  setSelectedTask(null)
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
