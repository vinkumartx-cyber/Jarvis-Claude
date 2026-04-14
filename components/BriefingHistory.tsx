'use client'

import { useState, useEffect } from 'react'
import { Play, Download } from 'lucide-react'

interface Briefing {
  id: string
  date: Date
  summary: string
  duration: number
}

export function BriefingHistory() {
  const [briefings, setBriefings] = useState<Briefing[]>([])

  useEffect(() => {
    const mockBriefings: Briefing[] = [
      {
        id: '1',
        date: new Date(Date.now() - 1 * 86400000),
        summary: 'Daily briefing with market updates',
        duration: 3.5,
      },
      {
        id: '2',
        date: new Date(Date.now() - 2 * 86400000),
        summary: 'Weekly summary briefing',
        duration: 5.2,
      },
    ]
    setBriefings(mockBriefings)
  }, [])

  return (
    <div className="p-6 space-y-4">
      {briefings.map((briefing) => (
        <div
          key={briefing.id}
          className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between"
        >
          <div>
            <p className="font-medium text-gray-100">
              {briefing.date.toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-400">{briefing.summary}</p>
          </div>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-gray-800 rounded-lg">
              <Play size={20} />
            </button>
            <button className="p-2 hover:bg-gray-800 rounded-lg">
              <Download size={20} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
