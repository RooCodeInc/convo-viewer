import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import MessageBlock from './MessageBlock'

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

interface Message {
  role: 'user' | 'assistant'
  content: ContentBlock[] | string
  ts: number
  isSummary?: boolean
  condenseId?: string
  condenseParent?: string
  isTruncationMarker?: boolean
  truncationId?: string
  truncationParent?: string
}

function normalizeContent(content: ContentBlock[] | string): ContentBlock[] {
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }]
  }
  if (!Array.isArray(content)) {
    return [{ type: 'text', text: String(content) }]
  }
  return content
}

interface ConversationViewProps {
  messages: Message[]
  taskId: string
  onClose: () => void
}

export default function ConversationView({ messages, taskId, onClose }: ConversationViewProps) {
  const [expandAll, setExpandAll] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [filterCondensed, setFilterCondensed] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Track tool uses without results (from main)
  const toolUsesMissingResults = useMemo(() => {
    const toolResultIds = new Set<string>()
    const toolUsePositions = new Map<string, { messageIndex: number; blockIndex: number }>()
    
    messages.forEach((message, messageIndex) => {
      normalizeContent(message.content).forEach((block, blockIndex) => {
        if (block.type === 'tool_result' && block.tool_use_id) {
          toolResultIds.add(block.tool_use_id)
        }
        if (block.type === 'tool_use' && block.id) {
          toolUsePositions.set(block.id, { messageIndex, blockIndex })
        }
      })
    })
    
    const missingResults = new Set<string>()
    const lastMessageIndex = messages.length - 1
    
    toolUsePositions.forEach((position, toolUseId) => {
      if (!toolResultIds.has(toolUseId)) {
        const hasMessageAfter = position.messageIndex < lastMessageIndex
        if (hasMessageAfter) {
          missingResults.add(toolUseId)
        }
      }
    })
    
    return missingResults
  }, [messages])

  // Condensed message filtering (from PR)
  const existingSummaryIds = useMemo(() => new Set(
    messages
      .filter((m) => m.isSummary && m.condenseId)
      .map((m) => m.condenseId!)
  ), [messages])

  const existingTruncationIds = useMemo(() => new Set(
    messages
      .filter((m) => m.isTruncationMarker && m.truncationId)
      .map((m) => m.truncationId!)
  ), [messages])

  // Calculate how many messages would be hidden
  const hiddenCount = useMemo(() => {
    return messages.filter((m) =>
      (m.condenseParent && existingSummaryIds.has(m.condenseParent)) ||
      (m.truncationParent && existingTruncationIds.has(m.truncationParent))
    ).length
  }, [messages, existingSummaryIds, existingTruncationIds])

  // Filter messages based on visibility algorithm
  const filteredMessages = useMemo(() => {
    if (!filterCondensed) return messages

    return messages.filter((m) => {
      if (m.condenseParent && existingSummaryIds.has(m.condenseParent)) {
        return false
      }
      if (m.truncationParent && existingTruncationIds.has(m.truncationParent)) {
        return false
      }
      return true
    })
  }, [messages, filterCondensed, existingSummaryIds, existingTruncationIds])

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleString()
  }

  const copyConversation = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(messages, null, 2))
    } catch (err) {
      console.error('Failed to copy conversation:', err)
    }
  }, [messages])

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [])

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
      const atBottom = scrollHeight - scrollTop - clientHeight < 50
      setIsAtBottom(atBottom)
    }
  }, [])

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom()
    }
  }, [messages, isAtBottom, scrollToBottom])

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden border border-slate-700">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-200">Conversation</h2>
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
              {filteredMessages.length} messages
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono">{taskId}</div>
        </div>
        <div className="flex items-center gap-2">
          {hiddenCount > 0 && (
            <button
              onClick={() => setFilterCondensed(!filterCondensed)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                filterCondensed
                  ? 'bg-purple-700 hover:bg-purple-600 text-purple-100'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
              title={filterCondensed
                ? `Showing ${filteredMessages.length} messages (${hiddenCount} hidden)`
                : `Showing all ${messages.length} messages`
              }
            >
              {filterCondensed ? `📦 ${hiddenCount} Hidden` : `📦 Hide ${hiddenCount}`}
            </button>
          )}
          <button
            onClick={() => setExpandAll(!expandAll)}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
          >
            {expandAll ? 'Collapse All' : 'Expand All'}
          </button>
          <button
            onClick={copyConversation}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
            title="Copy conversation JSON"
          >
            Copy
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
      
      <div className="relative">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="max-h-[calc(100vh-200px)] overflow-y-auto p-4 space-y-4"
        >
          {filteredMessages.map((message, index) => (
            <div
              key={index}
              className={`rounded-lg p-4 ${
                message.isSummary
                  ? 'bg-purple-900/30 border border-purple-700'
                  : message.isTruncationMarker
                    ? 'bg-orange-900/30 border border-orange-700'
                    : message.role === 'user'
                      ? 'bg-blue-900/30 border border-blue-800'
                      : 'bg-slate-700/50 border border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-600">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-sm ${
                    message.isSummary
                      ? 'text-purple-300'
                      : message.isTruncationMarker
                        ? 'text-orange-300'
                        : message.role === 'user' ? 'text-blue-300' : 'text-slate-300'
                  }`}>
                    {message.isSummary
                      ? '📋 Summary'
                      : message.isTruncationMarker
                        ? '✂️ Truncation'
                        : message.role === 'user' ? '👤 User' : '🤖 Assistant'}
                  </span>
                  {message.condenseId && (
                    <span className="text-xs bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded">
                      condense: {message.condenseId.slice(0, 8)}…
                    </span>
                  )}
                  {message.truncationId && (
                    <span className="text-xs bg-orange-900/50 text-orange-300 px-1.5 py-0.5 rounded">
                      truncation: {message.truncationId.slice(0, 8)}…
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  {formatTime(message.ts)}
                </span>
              </div>
              
              <div className="space-y-3">
                {normalizeContent(message.content).map((block, blockIndex) => (
                  <MessageBlock
                    key={blockIndex}
                    block={block}
                    expanded={expandAll}
                    hasMissingResult={block.type === 'tool_use' && block.id ? toolUsesMissingResults.has(block.id) : false}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {!isAtBottom && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-6 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2 border border-slate-600"
            title="Scroll to bottom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">Scroll down</span>
          </button>
        )}
      </div>
    </div>
  )
}
