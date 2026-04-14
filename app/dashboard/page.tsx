'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Calendar, TrendingUp, MessageSquare, Clock } from 'lucide-react'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
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

  const stats = [
    {
      label: 'Total Conversations',
      value: '24',
      icon: MessageSquare,
      change: '+2 this week',
    },
    {
      label: 'Briefings Delivered',
      value: '18',
      icon: Calendar,
      change: '+3 this week',
    },
    {
      label: 'Avg. Response Time',
      value: '1.2s',
      icon: Clock,
      change: '-0.3s vs last week',
    },
    {
      label: 'Assistant Usage',
      value: '87%',
      icon: TrendingUp,
      change: '+5% vs last week',
    },
  ]

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="h-16 border-b border-gray-800 flex items-center px-6 bg-gray-900/50 backdrop-blur">
          <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        </div>

        <div className="p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-gray-400 text-sm font-medium">
                        {stat.label}
                      </p>
                      <p className="text-3xl font-bold text-gray-100 mt-2">
                        {stat.value}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <Icon className="text-blue-500" size={24} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">{stat.change}</p>
                </div>
              )
            })}
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">
              Recent Activity
            </h2>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between py-4 border-b border-gray-800 last:border-b-0"
                >
                  <div>
                    <p className="text-gray-100 font-medium">
                      Daily briefing delivered
                    </p>
                    <p className="text-sm text-gray-400">
                      {new Date(Date.now() - item * 86400000).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 text-xs font-medium text-green-400 bg-green-500/10 rounded-full">
                    Completed
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
