'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'

export function Settings() {
  const [settings, setSettings] = useState({
    voiceModel: 'nova',
    autoPlayBriefings: true,
    briefingTime: '08:00',
  })

  const handleSave = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success('Settings saved')
    } catch (error) {
      toast.error('Failed to save settings')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">
          Voice Settings
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
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100"
            >
              <option>nova</option>
              <option>onyx</option>
              <option>alloy</option>
            </select>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium"
      >
        <Save size={20} />
        Save Changes
      </button>
    </div>
  )
}
