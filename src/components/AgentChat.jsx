import React, { useState, useEffect, useRef } from "react"

const API_BASE = "https://dommyhoopsbackend.onrender.com/api"
const STORAGE_KEY = "dommyhoops_agent_tabs_v1"

export default function AgentChat({
  context,
  initialContext,
  onClose = () => console.log("Close clicked"),
}) {
  const effectiveContext = context ?? initialContext ?? ""

  // Tabs: [{ id, title, createdAt, messages: [{role, content}, ...] }]
  const [tabs, setTabs] = useState(() => {
    if (typeof window === "undefined") {
      return [
        {
          id: "tab-1",
          title: "Chat 1",
          createdAt: Date.now(),
          messages: [],
        },
      ]
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return [
          {
            id: "tab-1",
            title: "Chat 1",
            createdAt: Date.now(),
            messages: [],
          },
        ]
      }
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
        return parsed.tabs
      }
    } catch (e) {
      console.warn("agent tabs parse error", e)
    }
    return [
      {
        id: "tab-1",
        title: "Chat 1",
        createdAt: Date.now(),
        messages: [],
      },
    ]
  })

  const [activeTabId, setActiveTabId] = useState(() => {
    if (typeof window === "undefined") return "tab-1"
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return "tab-1"
      const parsed = JSON.parse(raw)
      if (parsed.activeTabId) return parsed.activeTabId
    } catch {
      /* ignore */
    }
    return "tab-1"
  })

  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  // Refs
  const scrollContainerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Derive active tab and messages
  const activeTab =
    tabs.find(t => t.id === activeTabId) || tabs[0] || null
  const messages = activeTab?.messages || []

  // Persist tabs and activeTabId
  useEffect(() => {
    try {
      const payload = { tabs, activeTabId }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (e) {
      console.warn("agent tabs save error", e)
    }
  }, [tabs, activeTabId])

  // Scroll logic
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    const timeout = setTimeout(scrollToBottom, 50)
    return () => clearTimeout(timeout)
  }, [messages.length, loading, activeTabId])

  // Auto-resize input
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = Math.min(
        textareaRef.current.scrollHeight + 2,
        120,
      ) + "px"
    }
  }, [input])

  // Helpers to update messages for the active tab
  function updateActiveTabMessages(updater) {
    if (!activeTab) return
    setTabs(prev =>
      prev.map(tab =>
        tab.id === activeTab.id
          ? {
              ...tab,
              messages: updater(tab.messages || []),
            }
          : tab,
      ),
    )
  }

  async function send(overrideInput = null) {
    const textToSend = overrideInput ?? input
    if (!textToSend.trim() || loading || !activeTab) return

    const userMsg = { role: "user", content: textToSend.trim() }

    const currentMessages = activeTab.messages || []
    const nextMessages = [...currentMessages, userMsg]

    // Update tab messages locally
    setTabs(prev =>
      prev.map(tab =>
        tab.id === activeTab.id
          ? {
              ...tab,
              messages: nextMessages,
              // If this is the first message, name the tab after it
              title:
                tab.messages && tab.messages.length > 0
                  ? tab.title
                  : textToSend.slice(0, 20) || tab.title,
            }
          : tab,
      ),
    )

    setInput("")
    setLoading(true)

    const apiMessages = nextMessages.map((msg, index) => {
      // Attach context only to the latest user message going out
      if (index === nextMessages.length - 1 && effectiveContext) {
        return {
          ...msg,
          content: `Context: ${effectiveContext}\n\nQuestion: ${msg.content}`,
        }
      }
      return msg
    })

    try {
      const res = await fetch(`${API_BASE}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      })

      let replyContent = "I do not have enough data to answer that."

      try {
        const data = await res.json()
        if (data?.message?.content) {
          replyContent = data.message.content
        } else if (typeof data?.answer === "string") {
          replyContent = data.answer
        } else if (data?.error) {
          replyContent = `Error: ${data.error}`
        }
      } catch {
        replyContent = "Error parsing server response."
      }

      // Append assistant reply to the same active tab
      setTabs(prev =>
        prev.map(tab =>
          tab.id === activeTab.id
            ? {
                ...tab,
                messages: [
                  ...(tab.messages || []),
                  { role: "assistant", content: replyContent },
                ],
              }
            : tab,
        ),
      )
    } catch (e) {
      console.error(e)
      setTabs(prev =>
        prev.map(tab =>
          tab.id === activeTab.id
            ? {
                ...tab,
                messages: [
                  ...(tab.messages || []),
                  {
                    role: "assistant",
                    content: "Connection error. Please try again.",
                  },
                ],
              }
            : tab,
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const showEmpty = messages.length === 0 && !loading

  // Tab actions
  function handleNewTab() {
    const newId = `tab-${Date.now()}`
    const newTab = {
      id: newId,
      title: `Chat ${tabs.length + 1}`,
      createdAt: Date.now(),
      messages: [],
    }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newId)
    setInput("")
  }

  function handleCloseTab(tabId) {
    if (tabs.length === 1) {
      return
    }
    setTabs(prev => prev.filter(t => t.id !== tabId))
    if (activeTabId === tabId) {
      const remaining = tabs.filter(t => t.id !== tabId)
      if (remaining.length > 0) {
        setActiveTabId(remaining[remaining.length - 1].id)
      }
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden relative text-slate-900">
      {/* Header */}
      <div className="flex-none flex justify-between items-center p-3 bg-white border-b border-slate-200 z-20">
        <h2 className="text-sm font-semibold text-slate-800">
          DommyHoops AI Chat
        </h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1 -m-1 rounded-full"
          aria-label="Close Chat"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Tabs bar */}
      <div className="flex-none bg-slate-50 border-b border-slate-200 px-2 py-1.5">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map(tab => {
            const isActive = tab.id === activeTabId
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={[
                  "group flex items-center max-w-[160px] px-3 py-1.5 rounded-full border text-xs whitespace-nowrap",
                  "transition-colors",
                  isActive
                    ? "bg-white border-sky-500 text-sky-700 shadow-sm"
                    : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300",
                ].join(" ")}
              >
                <span className="truncate">{tab.title || "Chat"}</span>
                {tabs.length > 1 && (
                  <span
                    onClick={e => {
                      e.stopPropagation()
                      handleCloseTab(tab.id)
                    }}
                    className="ml-2 text-[10px] text-slate-400 group-hover:text-slate-500 hover:text-slate-700"
                  >
                    ✕
                  </span>
                )}
              </button>
            )
          })}

          <button
            type="button"
            onClick={handleNewTab}
            className="ml-1 flex items-center justify-center h-7 w-7 rounded-full border border-dashed border-slate-300 text-slate-500 text-sm hover:border-slate-400 hover:text-slate-700"
            aria-label="New chat"
          >
            +
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-3 min-h-0 space-y-4"
      >
        {showEmpty && (
          <div className="h-full flex flex-col justify-end pb-8 px-2">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
                Suggested Questions
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  "How efficient is this team on offense?",
                  "Which player adds the most value per minute?",
                  "How did this team perform in close games?",
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="text-xs bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-100 hover:border-slate-300 text-left transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-center text-[10px] text-slate-400">
              Powered by DommyHoops Analytics
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const isUser = m.role === "user"
          return (
            <div
              key={i}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm border whitespace-pre-wrap ${
                  isUser
                    ? "bg-sky-600 text-white border-sky-600 rounded-tr-sm"
                    : "bg-white text-slate-900 border-slate-200 rounded-tl-sm"
                }`}
              >
                {!isUser && (
                  <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase">
                    AI Agent
                  </div>
                )}
                {m.content}
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm inline-flex items-center gap-2">
              <span className="flex gap-1 h-2 items-center">
                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" />
                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-px" />
      </div>

      {/* Input area */}
      <div className="flex-none bg-white border-t border-slate-200 p-3 z-10">
        <form
          className="relative flex items-end gap-2"
          onSubmit={e => {
            e.preventDefault()
            send()
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask a question..."
            className="w-full resize-none bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
            style={{
              minHeight: "44px",
              maxHeight: "120px",
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={`flex-none h-[44px] w-[44px] flex items-center justify-center rounded-xl transition-all shadow-sm ${
              loading || !input.trim()
                ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                : "bg-sky-600 text-white hover:bg-sky-500 hover:scale-105"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}

