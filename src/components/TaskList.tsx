interface Task {
  id: string
  timestamp: number
  firstMessage: string
}

interface TaskListProps {
  tasks: Task[]
  selectedTask: string | null
  onSelectTask: (id: string) => void
  disabled?: boolean
}

export default function TaskList({ tasks, selectedTask, onSelectTask, disabled = false }: TaskListProps) {
  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden border border-slate-700">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50">
        <h2 className="font-semibold text-slate-200">Tasks ({tasks.length})</h2>
      </div>
      <div className="divide-y divide-slate-700 max-h-[calc(100vh-200px)] overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="p-4 text-slate-400 text-center">No tasks found</div>
        ) : (
          tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => !disabled && onSelectTask(task.id)}
              disabled={disabled}
              className={`w-full text-left p-4 transition-colors ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700/50'
              } ${
                selectedTask === task.id ? 'bg-blue-900/30 border-l-4 border-blue-500' : ''
              }`}
            >
              <div className="text-xs text-slate-400 mb-1">
                {formatDate(task.timestamp)}
              </div>
              <div className="text-sm text-slate-200 line-clamp-3">
                {task.firstMessage}
              </div>
              <div className="text-xs text-slate-500 mt-1 font-mono truncate">
                {task.id}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
