'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3, Settings, Plus, LogOut, Menu, X,
  MessageSquare, Plug, Mail, ScanLine,
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false })
      toast.success('Signed out successfully')
      router.push('/auth/signin')
    } catch {
      toast.error('Failed to sign out')
    }
  }

  const navItems = [
    { label: 'New Chat', href: '/', icon: Plus, action: true },
    { label: 'Inbox', href: '/inbox', icon: Mail },
    { label: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { label: 'Scanner', href: '/scanner', icon: ScanLine },
    { label: 'Connections', href: '/connections', icon: Plug },
    { label: 'History', href: '/history', icon: MessageSquare },
    { label: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-6 left-6 z-50 p-2 hover:bg-gray-800 rounded-lg transition-colors"
      >
        {isOpen ? <X size={24} className="text-gray-100" /> : <Menu size={24} className="text-gray-100" />}
      </button>

      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-30" onClick={() => setIsOpen(false)} />
      )}

      <aside
        className={`fixed md:relative w-60 h-screen bg-gray-900/95 backdrop-blur-xl border-r border-gray-800/60 transform md:translate-x-0 transition-transform duration-300 z-40 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white text-xs font-bold">J</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                V.OS
              </h1>
              <p className="text-[10px] text-gray-500 leading-none">Personal Operating System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                  item.action
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-500/20 mb-2'
                    : isActive
                      ? 'bg-gray-800 text-gray-100'
                      : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                }`}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User info */}
        <div className="p-3 border-t border-gray-800/60 space-y-1">
          {session?.user && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-800/40">
              {session.user.image ? (
                <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {session.user.name?.[0] || 'V'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-200 truncate">{session.user.name || 'User'}</p>
                <p className="text-[10px] text-gray-500 truncate">{session.user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-800/60 hover:text-gray-300 transition-colors text-sm"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
