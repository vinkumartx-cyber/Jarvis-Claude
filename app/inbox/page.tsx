'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { EmailCompose } from '@/components/EmailCompose'
import {
  Mail, Star, StarOff, RefreshCw, Compose, Search, Tag,
  Loader2, ChevronLeft, ChevronRight, Reply, Forward, Trash2,
  Inbox as InboxIcon, Send, Archive, AlertCircle, Pencil
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Email {
  id: string
  threadId: string
  subject: string
  from: string
  fromEmail: string
  snippet: string
  date: string
  isRead: boolean
  isStarred: boolean
  labels: string[]
  body?: string
}

const labelConfig: Record<string, { label: string; gmailId: string; icon: React.ReactNode }> = {
  inbox: { label: 'Inbox', gmailId: 'INBOX', icon: <InboxIcon size={15} /> },
  sent: { label: 'Sent', gmailId: 'SENT', icon: <Send size={15} /> },
  starred: { label: 'Starred', gmailId: 'STARRED', icon: <Star size={15} /> },
  important: { label: 'Important', gmailId: 'IMPORTANT', icon: <AlertCircle size={15} /> },
  drafts: { label: 'Drafts', gmailId: 'DRAFT', icon: <Pencil size={15} /> },
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function InboxPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [replyTo, setReplyTo] = useState<{ to: string; subject: string; threadId?: string } | undefined>()
  const [activeLabel, setActiveLabel] = useState('inbox')
  const [searchQuery, setSearchQuery] = useState('')
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  const fetchEmails = useCallback(async (label = activeLabel, query = '', pageToken = '') => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        label: labelConfig[label]?.gmailId || 'INBOX',
        maxResults: '25',
        ...(query && { q: query }),
        ...(pageToken && { pageToken }),
      })
      const res = await fetch(`/api/email/inbox?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEmails(data.emails || [])
      setNextPageToken(data.nextPageToken || null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load emails')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [activeLabel])

  useEffect(() => {
    if (status === 'authenticated') fetchEmails(activeLabel)
  }, [status, activeLabel, fetchEmails])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchEmails(activeLabel, searchQuery)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchEmails(activeLabel, searchQuery)
  }

  const handleReply = (email: Email) => {
    setReplyTo({ to: email.fromEmail, subject: email.subject, threadId: email.threadId })
    setShowCompose(true)
  }

  const handleCompose = () => {
    setReplyTo(undefined)
    setShowCompose(true)
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />

      {/* Email sidebar */}
      <div className="w-56 border-r border-gray-800/50 bg-gray-900/40 flex flex-col pt-4 hidden md:flex">
        <div className="px-3 pb-3">
          <button
            onClick={handleCompose}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20"
          >
            <Pencil size={14} />
            Compose
          </button>
        </div>

        <nav className="px-2 space-y-0.5">
          {Object.entries(labelConfig).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => { setActiveLabel(key); setSelectedEmail(null) }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeLabel === key
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                  : 'text-gray-500 hover:bg-gray-800/60 hover:text-gray-300'
              }`}
            >
              {cfg.icon}
              <span>{cfg.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-w-0">
        {/* Email list */}
        <div className={`flex flex-col ${selectedEmail ? 'w-80 hidden lg:flex' : 'flex-1'} border-r border-gray-800/50`}>
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-gray-800/50 bg-gray-900/60 flex items-center gap-2">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search emails..."
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </form>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Email list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-blue-500" />
              </div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
                <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center">
                  <Mail size={22} className="text-gray-600" />
                </div>
                <p className="text-gray-500 text-sm">No emails found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {emails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-800/40 transition-colors ${
                      selectedEmail?.id === email.id ? 'bg-blue-600/10 border-l-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <span className={`text-sm truncate ${email.isRead ? 'text-gray-400 font-normal' : 'text-gray-100 font-semibold'}`}>
                        {email.from || email.fromEmail}
                      </span>
                      <span className="text-xs text-gray-600 flex-shrink-0">{timeAgo(email.date)}</span>
                    </div>
                    <p className={`text-xs truncate mb-1 ${email.isRead ? 'text-gray-500' : 'text-gray-300'}`}>
                      {email.subject}
                    </p>
                    <p className="text-xs text-gray-600 truncate">{email.snippet}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Email detail */}
        {selectedEmail ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Detail toolbar */}
            <div className="px-6 py-3 border-b border-gray-800/50 bg-gray-900/60 flex items-center gap-3">
              <button
                onClick={() => setSelectedEmail(null)}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors lg:hidden"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => handleReply(selectedEmail)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors"
                >
                  <Reply size={13} />
                  Reply
                </button>
                <button className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors">
                  <Forward size={14} />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Email content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <h1 className="text-xl font-semibold text-gray-100 mb-4">{selectedEmail.subject}</h1>
              <div className="flex items-start gap-3 mb-6 pb-6 border-b border-gray-800/50">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {selectedEmail.from?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-200">{selectedEmail.from}</span>
                    <span className="text-xs text-gray-500">&lt;{selectedEmail.fromEmail}&gt;</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(selectedEmail.date).toLocaleString([], {
                      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                {selectedEmail.body || selectedEmail.snippet}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden lg:flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-800/60 border border-gray-700 flex items-center justify-center mx-auto mb-3">
                <Mail size={28} className="text-gray-600" />
              </div>
              <p className="text-gray-500 text-sm">Select an email to read</p>
            </div>
          </div>
        )}
      </div>

      {/* Compose modal */}
      {showCompose && (
        <EmailCompose
          onClose={() => { setShowCompose(false); setReplyTo(undefined) }}
          replyTo={replyTo}
        />
      )}
    </div>
  )
}
