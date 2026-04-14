'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Save, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState({
    name: '',
    email: '',
    timezone: 'UTC',
    voiceModel: 'nova',
    voiceSpeed: 1.0,
    autoPlayBriefings: true,
    briefingTime: '08:00',
    newsCategories: {
      realEstate: true,
      construction: true,
      business: true,
      tech: true,
      finance: false,
      politics: false,
    },
    keyContacts: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (session?.user) {
      setSettings((prev) => ({
        ...prev,
        name: session.user.name || '',
        email: session.user.email || '',
      }))
    }
  }, [status, router, session])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

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

  const newsCategories = [
    { key: 'realEstate', label: 'Real Estate' },
    { key: 'construction', label: 'Construction' },
    { key: 'business', label: 'Business' },
    { key: 'tech', label: 'Technology' },
    { key: 'finance', label: 'Finance' },
    { key: 'politics', label: 'Politics' },
  ]

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="h-16 border-b border-gray-800 flex items-center px-6 bg-gray-900/50 backdrop-blur">
          <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
        </div>

        <div className="max-w-3xl mx-auto p-8 space-y-8">
          {/* Profile Section */}
          <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-100 mb-6">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) =>
                    setSettings({ ...settings, name: e.target.value })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.email}
                  disabled
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 opacity-60 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Timezone
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) =>
                    setSettings({ ...settings, timezone: e.target.value })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>UTC</option>
                  <option>EST</option>
                  <option>CST</option>
                  <option>MST</option>
                  <option>PST</option>
                </select>
              </div>
            </div>
          </section>

          {/* Voice Preferences */}
          <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-100 mb-6">
              Voice Preferences
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Voice Model
                </label>
                <select
                  value={settings.voiceModel}
                  onChange={(e) =>
                    setSettings({ ...settings, voiceModel: e.target.value })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="nova">Nova</option>
                  <option value="onyx">Onyx</option>
                  <option value="alloy">Alloy</option>
                  <option value="echo">Echo</option>
                  <option value="fable">Fable</option>
                  <option value="shimmer">Shimmer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Voice Speed: {settings.voiceSpeed.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settings.voiceSpeed}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      voiceSpeed: parseFloat(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="autoPlay"
                  checked={settings.autoPlayBriefings}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      autoPlayBriefings: e.target.checked,
                    })
                  }
                  className="rounded bg-gray-800 border-gray-700"
                />
                <label htmlFor="autoPlay" className="text-sm text-gray-300">
                  Auto-play briefings
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Briefing Time
                </label>
                <input
                  type="time"
                  value={settings.briefingTime}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      briefingTime: e.target.value,
                    })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {/* News Categories */}
          <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-100 mb-6">
              Briefing Preferences
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {newsCategories.map((category) => (
                <div key={category.key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={category.key}
                    checked={
                      settings.newsCategories[
                        category.key as keyof typeof settings.newsCategories
                      ]
                    }
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        newsCategories: {
                          ...settings.newsCategories,
                          [category.key]: e.target.checked,
                        },
                      })
                    }
                    className="rounded bg-gray-800 border-gray-700"
                  />
                  <label htmlFor={category.key} className="text-sm text-gray-300">
                    {category.label}
                  </label>
                </div>
              ))}
            </div>
          </section>

          {/* Key Contacts */}
          <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-100 mb-6">
              Key Contacts
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Phone numbers and emails that should always be flagged in briefings
              (one per line)
            </p>
            <textarea
              value={settings.keyContacts}
              onChange={(e) =>
                setSettings({ ...settings, keyContacts: e.target.value })
              }
              placeholder="john@example.com&#10;+1-555-0100&#10;jane@company.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
            />
          </section>

          {/* Danger Zone */}
          <section className="bg-red-950 border border-red-900 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <AlertTriangle size={20} className="text-red-500" />
              <h2 className="text-lg font-semibold text-red-100">Danger Zone</h2>
            </div>
            <div className="space-y-3">
              <button className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-red-100 rounded-lg transition-colors text-sm font-medium">
                Clear All Data
              </button>
              <button className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-red-100 rounded-lg transition-colors text-sm font-medium">
                Delete Account
              </button>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Save size={20} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
