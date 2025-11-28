import { useState, useEffect } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

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
  source?: {
    type: string
    media_type?: string
    data?: string
  }
}

interface MessageBlockProps {
  block: ContentBlock
  expanded: boolean
}

export default function MessageBlock({ block, expanded: initialExpanded }: MessageBlockProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded)

  useEffect(() => {
    setIsExpanded(initialExpanded)
  }, [initialExpanded])

  function renderBlockHeader() {
    const typeColors: Record<string, string> = {
      text: 'bg-green-900/50 text-green-300',
      reasoning: 'bg-purple-900/50 text-purple-300',
      tool_use: 'bg-yellow-900/50 text-yellow-300',
      tool_result: 'bg-blue-900/50 text-blue-300',
      image: 'bg-pink-900/50 text-pink-300',
    }

    const bgColor = typeColors[block.type] || 'bg-slate-700 text-slate-300'

    return (
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${bgColor}`}>
            {block.type}
          </span>
          {block.name && (
            <span className="text-sm font-mono text-slate-300">{block.name}</span>
          )}
          {block.id && (
            <span className="text-xs text-slate-500 font-mono">{block.id}</span>
          )}
          {block.tool_use_id && (
            <span className="text-xs text-slate-500 font-mono">ref: {block.tool_use_id}</span>
          )}
          {block.is_error && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-900/50 text-red-300">
              Error
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          {isExpanded ? '▼ Collapse' : '▶ Expand'}
        </button>
      </div>
    )
  }

  function renderContent() {
    if (!isExpanded) return null

    switch (block.type) {
      case 'text':
        return (
          <div className="message-content">
            <pre className="text-sm text-slate-200 whitespace-pre-wrap break-words bg-slate-900 p-3 rounded border border-slate-600">
              {block.text}
            </pre>
          </div>
        )

      case 'reasoning':
        return (
          <div className="message-content">
            <pre className="text-sm text-purple-200 whitespace-pre-wrap break-words bg-purple-900/30 p-3 rounded border border-purple-800">
              {block.text}
            </pre>
            {block.summary && block.summary.length > 0 && (
              <div className="mt-2 p-2 bg-purple-900/50 rounded">
                <div className="text-xs font-semibold text-purple-300 mb-1">Summary:</div>
                <ul className="list-disc list-inside text-sm text-purple-200">
                  {block.summary.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )

      case 'tool_use':
        return (
          <div className="message-content">
            <div className="bg-yellow-900/30 p-3 rounded border border-yellow-800">
              <div className="text-sm font-semibold text-yellow-300 mb-2">
                Tool: {block.name}
              </div>
              {block.input && (
                <div>
                  <div className="text-xs text-yellow-400 mb-1">Input:</div>
                  <SyntaxHighlighter
                    language="json"
                    style={{
                      ...vscDarkPlus,
                      'pre[class*="language-"]': {
                        ...vscDarkPlus['pre[class*="language-"]'],
                        background: 'rgb(15 23 42)',
                      },
                      'code[class*="language-"]': {
                        ...vscDarkPlus['code[class*="language-"]'],
                        background: 'transparent',
                      },
                    }}
                    customStyle={{
                      margin: 0,
                      padding: '0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      background: 'rgb(15 23 42)',
                      overflow: 'hidden',
                    }}
                    wrapLongLines
                    codeTagProps={{
                      style: {
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        background: 'transparent',
                      }
                    }}
                  >
                    {JSON.stringify(block.input, null, 2)}
                  </SyntaxHighlighter>
                </div>
              )}
            </div>
          </div>
        )

      case 'tool_result':
        return (
          <div className="message-content">
            <div className={`p-3 rounded border ${
              block.is_error 
                ? 'bg-red-900/30 border-red-800' 
                : 'bg-blue-900/30 border-blue-800'
            }`}>
              <pre className={`text-sm whitespace-pre-wrap break-words ${
                block.is_error ? 'text-red-200' : 'text-slate-200'
              }`}>
                {block.content}
              </pre>
            </div>
          </div>
        )

      case 'image':
        return (
          <div className="message-content">
            {block.source?.data ? (
              <img
                src={`data:${block.source.media_type};base64,${block.source.data}`}
                alt="Embedded image"
                className="max-w-full h-auto rounded border border-slate-600"
              />
            ) : (
              <div className="text-slate-400 text-sm">Image data not available</div>
            )}
          </div>
        )

      default:
        return (
          <div className="message-content">
            <pre className="text-xs text-slate-300 bg-slate-900 p-3 rounded overflow-x-auto">
              {JSON.stringify(block, null, 2)}
            </pre>
          </div>
        )
    }
  }

  return (
    <div className="border border-slate-600 rounded p-3 bg-slate-800/50">
      {renderBlockHeader()}
      {renderContent()}
    </div>
  )
}
