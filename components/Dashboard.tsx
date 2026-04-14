'use client'

import { useState } from 'react'
import { Calendar, TrendingUp, MessageSquare } from 'lucide-react'

export function Dashboard() {
  const stats = [
    {
      label: 'Total Conversations',
      value: '24',
      icon: MessageSquare,
    },
    {
      label: 'Briefings This Week',
      value: '7',
      icon: Calendar,
    },
    {
      label: 'Assistant Usage',
      value: '87%',
      icon: TrendingUp,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="bg-gray-900 border border-gray-800 rounded-lg p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-100 mt-2">
                  {stat.value}
                </p>
              </div>
              <Icon className="text-blue-500" size={24} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
