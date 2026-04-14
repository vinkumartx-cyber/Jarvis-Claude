'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { GlowingOrb } from '@/components/GlowingOrb'
import { EmailCompose } from '@/components/EmailCompose'
import {
  Send, Mic, MicOff, VolumeX, Volume2, Loader2,
  Calendar, Mail, CheckSquare, BookOpen, Sparkles,
  ChevronRight, Pencil, RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface DashTile {
  id: string
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  color: string
  href: string
}

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const [dashTiles, setDashTiles] = useState<DashTile[]>([])
  const [loadingTiles, setLoadingTiles] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load dashboard tile counts
  useEffect(() => {
    if (!session) return
    setLoadingTiles(true)
    // Fetch lightweight counts (each endpoint returns just a count)
    Promise.allSettled([
      fetch('/api/calendar/events?limit=5').then(r => r.ok ? r.json() : null),
      fetch('/api/email?limit=5').then(r => r.ok ? r.json() : null),
      fetch('/api/tasks?limit=5').then(r => r.ok ? r.json() : null),
      fetch('/api/school/events?limit=5').then(r => r.ok ? r.json() : null),
    ]).then(([cal, email, tasks, school]) => {
      setDashTiles([
        {
          id: 'calendar',
          icon: <Calendar size={16} />,
          label: 'Calendar',
          value: cal.status === 'fulfilled' && cal.value?.events ? `${cal.value.events.length} today` : '—',
          sub: 'View schedule',
          color: 'from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400',
          href: '/dashboard',
        },
        {
          id: 'emails',
          icon: <Mail size={16} />,
          label: 'Inbox',
          value: email.status === 'fulfilled' && email.value?.emails ? `${email.value.emails.length} flagged` : '—',
          sub: 'View emails',
          color: 'from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-400',
          href: '/inbox',
        },
        {
          id: 'tasks',
          icon: <CheckSquare size={16} />,
          label: 'Tasks',
          value: tasks.status === 'fulfilled' && tasks.value?.tasks ? `${tasks.value.tasks.length} active` : '—',
          sub: 'View tasks',
          color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400',
          href: '/dashboard',
        },
        {
          id: 'school',
          icon: <BookOpen size={16} />,
          label: 'School',
          value: school.status === 'fulfilled' && school.value?.events ? `${school.value.events.length} updates` : '—',
          sub: 'ParentSquare',
          color: 'from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400',
          href: '/connections',
        },
      ])
      setLoadingTiles(false)
    })
  }, [session])

  // Speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR = window.SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        e.results[i].isFinal ? (final += t) : (interim += t)
      }
      if (final) { setTranscript(''); handleSendMessage(final.trim()); stopListening() }
      else setTranscript(interim)
    }
    rec.onerror = () => { setVoiceState('idle'); setTranscript('') }
    recognitionRef.current = rec
    return () => rec.abort()
  }, [])

  // Space to talk
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName)) {
        e.preventDefault()
        toggleListening()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [voiceState])

  const startListening = useCallback(() => {
    try { recognitionRef.current?.start(); setVoiceState('listening'); setTranscript('') } catch {}
  }, [])

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop() } catch {}
    setVoiceState('idle'); setTranscript('')
  }, [])

  const toggleListening = useCallback(() => {
    voiceState === 'listening' ? stopListening() : voiceState === 'idle' && startListening()
  }, [voiceState, startListening, stopListening])

  const playAudio = async (text: string) => {
    if (isMuted) return
    try {
      setVoiceState('speaking')
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) { setVoiceState('idle'); return }
      const url = URL.createObjectURL(await res.blob())
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { setVoiceState('idle'); URL.revokeObjectURL(url) }
      audio.onerror = () => { setVoiceState('idle'); URL.revokeObjectURL(url) }
      await audio.play()
    } catch { setVoiceState('idle') }
  }

  const handleSendMessage = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg) return
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: msg, timestamp: new Date() }
    setMessages(p => [...p, userMsg])
    setInput('')
    setVoiceState('processing')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const aMsg: ChatMessage = { id: `a-${Date.now()}`, role: 'assistant', content: data.response, timestamp: new Date() }
      setMessages(p => [...p, aMsg])
      await playAudio(data.response)
    } catch (err: any) {
      setVoiceState('idle')
      setMessages(p => [...p, { id: `e-${Date.now()}`, role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() }])
    }
  }

  const handleBriefing = async () => {
    setIsGeneratingBriefing(true); setVoiceState('processing')
    try {
      const res = await fetch('/api/briefing/generate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const msg: ChatMessage = { id: `b-${Date.now()}`, role: 'assistant', content: data.briefing.content, timestamp: new Date() }
      setMessages(p => [...p, msg])
      await playAudio(data.briefing.content)
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate briefing')
      setVoiceState('idle')
    } finally { setIsGeneratingBriefing(false) }
  }

  if (status === 'loading') return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <div className="w-10 h-10 rounded-full border-4 border-gray-800 border-t-blue-500 animate-spin" />
    </div>
  )

  if (!session) return null

  const firstName = session.user?.name?.split(' ')[0] || 'Vinesh'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar />

      {/* ── Main chat area ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="h-14 border-b border-gray-800/50 bg-gray-900/60 backdrop-blur-xl flex items-center justify-between px-5 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Sparkles size={16} className="text-blue-400" />
            <span className="text-sm font-semibold text-gray-200">V.OS Assistant</span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-500">
              {voiceState === 'listening' ? '🔴 Listening...' : voiceState === 'processing' ? '⏳ Thinking...' : voiceState === 'speaking' ? '🔊 Speaking...' : 'Ready'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCompose(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              <Pencil size={12} /> Compose
            </button>
            <button
              onClick={handleBriefing}
              disabled={isGeneratingBriefing || voiceState === 'processing'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium transition-all disabled:opacity-40"
            >
              {isGeneratingBriefing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Daily Briefing
            </button>
            <button
              onClick={() => { setIsMuted(m => !m); if (!isMuted && audioRef.current) { audioRef.current.pause(); setVoiceState('idle') } }}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
        </div>

        {/* Live transcript */}
        {transcript && (
          <div className="px-5 py-2 bg-blue-500/5 border-b border-blue-500/10 text-xs text-blue-400">
            <span className="text-blue-500 font-medium">Hearing: </span>{transcript}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-600 text-sm">
                  {greeting}, {firstName}. Ask me anything or press <kbd className="bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded text-xs border border-gray-700">Space</kbd> to talk.
                </p>
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-lg xl:max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white'
                  : 'bg-gray-800/80 border border-gray-700/50 text-gray-100'
              }`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className={`text-[10px] mt-1.5 ${m.role === 'user' ? 'text-blue-200' : 'text-gray-600'}`}>
                  {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {voiceState === 'processing' && (
            <div className="flex justify-start">
              <div className="bg-gray-800/80 border border-gray-700/50 px-4 py-3 rounded-2xl flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-blue-400" />
                <span className="text-sm text-gray-400">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-gray-800/50 p-4 bg-gray-900/60 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <button
              onClick={toggleListening}
              disabled={voiceState === 'processing'}
              className={`p-3 rounded-full transition-all flex-shrink-0 ${
                voiceState === 'listening' ? 'bg-red-500 shadow-lg shadow-red-500/30 animate-pulse' :
                voiceState === 'speaking' ? 'bg-purple-600 shadow-lg shadow-purple-500/30' :
                'bg-blue-600 hover:bg-blue-500'
              } text-white disabled:opacity-40`}
            >
              {voiceState === 'listening' ? <MicOff size={18} /> : voiceState === 'processing' ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
            </button>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
              placeholder="Type a message or press Space to talk..."
              className="flex-1 bg-gray-800/60 border border-gray-700/50 text-gray-100 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder-gray-600"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || voiceState === 'processing'}
              className="p-3 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white transition-all flex-shrink-0"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </main>

      {/* ── Right panel: Orb + Dashboard ── */}
      <aside className="hidden lg:flex flex-col w-72 border-l border-gray-800/50 bg-gray-900/40 backdrop-blur-xl overflow-y-auto flex-shrink-0">
        {/* Jarvis Orb */}
        <div className="flex flex-col items-center pt-8 pb-6 border-b border-gray-800/50">
          <GlowingOrb state={voiceState} onClick={toggleListening} size={130} />
          <p className="text-xs text-gray-600 mt-3 text-center px-4">
            {voiceState === 'idle' ? `${greeting}, ${firstName}` : ''}
          </p>
        </div>

        {/* Quick actions */}
        <div className="px-4 py-4 border-b border-gray-800/50">
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-2">Quick Actions</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleBriefing}
              disabled={isGeneratingBriefing || voiceState === 'processing'}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-800/60 hover:bg-gray-800 border border-gray-700/40 text-gray-400 hover:text-gray-200 transition-all disabled:opacity-40"
            >
              {isGeneratingBriefing ? <Loader2 size={18} className="animate-spin text-blue-400" /> : <Sparkles size={18} className="text-blue-400" />}
              <span className="text-[10px] font-medium">Briefing</span>
            </button>
            <button
              onClick={() => setShowCompose(true)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-800/60 hover:bg-gray-800 border border-gray-700/40 text-gray-400 hover:text-gray-200 transition-all"
            >
              <Pencil size={18} className="text-violet-400" />
              <span className="text-[10px] font-medium">Compose</span>
            </button>
            <button
              onClick={() => router.push('/scanner')}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-800/60 hover:bg-gray-800 border border-gray-700/40 text-gray-400 hover:text-gray-200 transition-all"
            >
              <RefreshCw size={18} className="text-emerald-400" />
              <span className="text-[10px] font-medium">Sync All</span>
            </button>
            <button
              onClick={() => router.push('/connections')}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-800/60 hover:bg-gray-800 border border-gray-700/40 text-gray-400 hover:text-gray-200 transition-all"
            >
              <Mail size={18} className="text-amber-400" />
              <span className="text-[10px] font-medium">Services</span>
            </button>
          </div>
        </div>

        {/* Dashboard tiles */}
        <div className="px-4 py-4 flex-1">
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-3">Live Dashboard</p>
          <div className="space-y-2">
            {loadingTiles
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-gray-800/40 animate-pulse" />
                ))
              : dashTiles.map((tile) => (
                  <button
                    key={tile.id}
                    onClick={() => router.push(tile.href)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border bg-gradient-to-r ${tile.color} hover:opacity-80 transition-opacity text-left`}
                  >
                    <div className="flex-shrink-0">{tile.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-200">{tile.label}</p>
                      <p className="text-[10px] text-gray-400 truncate">{tile.value}</p>
                    </div>
                    <ChevronRight size={12} className="text-gray-600 flex-shrink-0" />
                  </button>
                ))}
          </div>
        </div>
      </aside>

      {/* Email compose */}
      {showCompose && <EmailCompose onClose={() => setShowCompose(false)} />}
    </div>
  )
}
