'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Play, Download, Trash2 } from 'lucide-react'

interface Briefing {
  id: string
  date: Date
  summary: string
  duration: number
  topics: string[]
}

export default function HistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [briefings, setBriefings] = useState<Briefing[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else {
      // Load briefing history
      const mockBriefings: Briefing[] = [
        {
          id: '1',
          date: new Date(Date.now() - 1 * 86400000),
          summary:
            'Daily briefing for April 6, 2026. Key highlights include market updates and project milestones.',
          duration: 3.5,
          topics: ['Market Analysis', 'Projects', 'Calendar'],
        },
        {
          id: '2',
          date: new Date(Date.now() - 2 * 86400000),
          summary:
            'Daily briefing for April 5, 2026. Focus on upcoming meetings and deliverables.',
          duration: 4.2,
          topics: ['Meetings', 'Deliverables', 'News'],
        },
        {
          id: '3',
          date: new Date(Date.now() - 3 * 86400000),
          summary:
            'Daily briefing for April 4, 2026. Business updates and team communications.',
          duration: 3.8,
          topics: ['Business', 'Team Updates', 'Weather'],
        },
        {
          id: '4',
          date: new Date(Date.now() - 4 * 86400000),
          summary:
            'Daily briefing for April 3, 2026. Weekly summary with performance metrics.',
          duration: 5.1,
          topics: ['Performance', 'Metrics', 'Goals'],
        },
        {
          id: '5',
          date: new Date(Date.now() - 5 * 86400000),
          summary:
            'Daily briefing for April 2, 2026. Quarterly planning and strategy review.',
          duration: 6.2,
          topics: ['Planning', 'Strategy', 'Finance'],
        },
      ]
      setBriefings(mockBriefings)
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-gray-800 border-t-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="h-16 border-b border-gray-800 flex items-center px-6 bg-gray-900/50 backdrop-blur">
          <h1 className="text-2xl font-bold text-gray-100">Briefing History</h1>
        </div>

        <div className="max-w-4xl mx-auto p-8">
          {briefings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No briefings yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {briefings.map((briefing) => (
                <div
                  key={briefing.id}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-100">
                          {briefing.date.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </h3>
                        <span className="text-sm text-gray-400">
                          {briefing.duration.toFixed(1)} min
                        </span>
                      </div>
                      <p className="text-gray-300 mb-4">{briefing.summary}</p>
                      <div className="flex gap-2 flex-wrap">
                        {briefing.topics.map((topic) => (
                          <span
                            key={topic}
                            className="px-3 py-1 text-xs font-medium text-blue-300 bg-blue-500/10 rounded-full"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-gray-300">
                        <Play size={20} />
                      </button>
                      <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-gray-300">
                        <Download size={20} />
                      </button>
                      <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-red-400">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
