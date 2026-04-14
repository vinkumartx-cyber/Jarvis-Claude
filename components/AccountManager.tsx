'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface ConnectedAccount {
  id: string
  provider: string
  email: string
  connected: boolean
}

export function AccountManager() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([
    {
      id: '1',
      provider: 'Gmail',
      email: 'user@gmail.com',
      connected: true,
    },
    {
      id: '2',
      provider: 'Google Calendar',
      email: 'user@gmail.com',
      connected: true,
    },
  ])

  const handleDisconnect = (id: string) => {
    setAccounts(accounts.filter((a) => a.id !== id))
    toast.success('Account disconnected')
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-100">Connected Accounts</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">
          <Plus size={18} />
          Connect Account
        </button>
      </div>

      <div className="space-y-2">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between"
          >
            <div>
              <p className="font-medium text-gray-100">{account.provider}</p>
              <p className="text-sm text-gray-400">{account.email}</p>
            </div>
            <button
              onClick={() => handleDisconnect(account.id)}
              className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-red-400"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
