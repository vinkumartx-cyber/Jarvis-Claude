'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import {
  CheckCircle2, Circle, ExternalLink, RefreshCw, AlertCircle,
  Mail, Calendar, BookOpen, DollarSign, MessageSquare, Users, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ServiceConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  connected: boolean;
  lastSync?: string;
  connectUrl?: string;
  requiresCredentials?: boolean;
  fields?: { key: string; label: string; type: string; placeholder: string }[];
}

export default function ConnectionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [psCredentials, setPsCredentials] = useState({ username: '', password: '' });
  const [showPsForm, setShowPsForm] = useState(false);
  const [services, setServices] = useState<ServiceConfig[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    // In a real app, fetch connection status from DB
    setServices([
      {
        id: 'google',
        name: 'Google (Gmail + Calendar + Tasks)',
        description: 'Read and send emails, view calendar events, manage tasks',
        icon: <Mail size={22} />,
        color: 'from-red-500 to-orange-500',
        connected: !!session,
        lastSync: session ? 'Connected via Google Sign-In' : undefined,
      },
      {
        id: 'parentsquare',
        name: 'ParentSquare',
        description: 'Auto-pull school updates, assignments, and announcements for your children',
        icon: <BookOpen size={22} />,
        color: 'from-blue-500 to-indigo-600',
        connected: false,
        requiresCredentials: true,
        fields: [
          { key: 'username', label: 'Email / Username', type: 'email', placeholder: 'parent@email.com' },
          { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
        ],
      },
      {
        id: 'quickbooks',
        name: 'QuickBooks',
        description: 'Pull financial data: revenue, expenses, cash flow, and reports',
        icon: <DollarSign size={22} />,
        color: 'from-green-500 to-emerald-600',
        connected: false,
        connectUrl: '/api/auth/quickbooks',
      },
      {
        id: 'twilio',
        name: 'Twilio (SMS)',
        description: 'Send and receive SMS messages from your Twilio number',
        icon: <MessageSquare size={22} />,
        color: 'from-red-400 to-pink-600',
        connected: false,
        requiresCredentials: true,
        fields: [
          { key: 'accountSid', label: 'Account SID', type: 'text', placeholder: 'ACxxxxxxxx...' },
          { key: 'authToken', label: 'Auth Token', type: 'password', placeholder: '••••••••' },
          { key: 'phoneNumber', label: 'Twilio Phone Number', type: 'tel', placeholder: '+1234567890' },
        ],
      },
      {
        id: 'elevenlabs',
        name: 'ElevenLabs (Voice)',
        description: 'High-quality AI voice synthesis for Jarvis responses and briefings',
        icon: <Users size={22} />,
        color: 'from-purple-500 to-violet-600',
        connected: false,
        requiresCredentials: true,
        fields: [
          { key: 'apiKey', label: 'ElevenLabs API Key', type: 'password', placeholder: 'el_xxxxxxxx...' },
        ],
      },
    ]);
  }, [session]);

  const handleConnect = async (serviceId: string, creds?: Record<string, string>) => {
    setConnecting(serviceId);
    try {
      const res = await fetch('/api/connections/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, credentials: creds }),
      });
      if (!res.ok) throw new Error('Failed to save connection');
      setServices((prev) =>
        prev.map((s) => s.id === serviceId ? { ...s, connected: true, lastSync: 'Just connected' } : s)
      );
      toast.success(`${serviceId} connected!`);
      if (serviceId === 'parentsquare') setShowPsForm(false);
    } catch (err: any) {
      toast.error(err.message || 'Connection failed');
    } finally {
      setConnecting(null);
    }
  };

  const handleSync = async (serviceId: string) => {
    setSyncing(serviceId);
    try {
      const endpoint = serviceId === 'parentsquare' ? '/api/sync/parentsquare' : '/api/sync';
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      setServices((prev) =>
        prev.map((s) => s.id === serviceId ? { ...s, lastSync: new Date().toLocaleTimeString() } : s)
      );
      toast.success(`${serviceId} synced!`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (serviceId: string) => {
    if (serviceId === 'google') {
      toast.error('Google is connected via your sign-in — sign out to disconnect');
      return;
    }
    try {
      await fetch('/api/connections/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId }),
      });
      setServices((prev) => prev.map((s) => s.id === serviceId ? { ...s, connected: false, lastSync: undefined } : s));
      toast.success('Disconnected');
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  if (status === 'loading') return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <Loader2 size={32} className="animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Connected Services</h1>
            <p className="text-gray-500 text-sm">
              Connect your accounts so Jarvis can pull real-time information and take actions on your behalf.
              Credentials are encrypted and stored securely.
            </p>
          </div>

          {/* Auto-sync notice */}
          <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-8">
            <RefreshCw size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-300">
              All connected services sync automatically every hour in the background. You can also trigger a manual sync at any time.
            </p>
          </div>

          {/* Service cards */}
          <div className="space-y-4">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
              >
                <div className="flex items-start gap-4 p-5">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center text-white flex-shrink-0`}>
                    {service.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-100 text-sm">{service.name}</h3>
                      {service.connected ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 size={11} />
                          Connected
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                          <Circle size={11} />
                          Not connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{service.description}</p>
                    {service.connected && service.lastSync && (
                      <p className="text-xs text-gray-600 mt-1">Last sync: {service.lastSync}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {service.connected && (
                      <>
                        <button
                          onClick={() => handleSync(service.id)}
                          disabled={syncing === service.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 text-xs transition-colors disabled:opacity-40"
                        >
                          {syncing === service.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <RefreshCw size={12} />
                          )}
                          Sync
                        </button>
                        <button
                          onClick={() => handleDisconnect(service.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition-colors border border-red-500/20"
                        >
                          Disconnect
                        </button>
                      </>
                    )}

                    {!service.connected && !service.requiresCredentials && (
                      <button
                        onClick={() => service.connectUrl
                          ? router.push(service.connectUrl)
                          : handleConnect(service.id)}
                        disabled={connecting === service.id}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r ${service.color} text-white text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-40`}
                      >
                        {connecting === service.id ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
                        Connect
                      </button>
                    )}

                    {!service.connected && service.requiresCredentials && (
                      <button
                        onClick={() => {
                          if (service.id === 'parentsquare') setShowPsForm((v) => !v);
                          else toast('Credentials form coming up ↓');
                        }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r ${service.color} text-white text-xs font-medium hover:opacity-90`}
                      >
                        <ExternalLink size={12} />
                        Connect
                      </button>
                    )}
                  </div>
                </div>

                {/* ParentSquare credentials form */}
                {service.id === 'parentsquare' && showPsForm && !service.connected && (
                  <div className="border-t border-gray-800 px-5 pb-5 pt-4">
                    <p className="text-xs text-amber-400 flex items-center gap-1.5 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                      <AlertCircle size={13} />
                      Your credentials are encrypted with AES-256 and never stored in plaintext.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">ParentSquare Email</label>
                        <input
                          type="email"
                          value={psCredentials.username}
                          onChange={(e) => setPsCredentials((p) => ({ ...p, username: e.target.value }))}
                          placeholder="parent@email.com"
                          className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Password</label>
                        <input
                          type="password"
                          value={psCredentials.password}
                          onChange={(e) => setPsCredentials((p) => ({ ...p, password: e.target.value }))}
                          placeholder="••••••••"
                          className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                      <button
                        onClick={() => handleConnect('parentsquare', psCredentials)}
                        disabled={!psCredentials.username || !psCredentials.password || connecting === 'parentsquare'}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-40 transition-colors"
                      >
                        {connecting === 'parentsquare' ? <Loader2 size={14} className="animate-spin" /> : null}
                        Save & Connect
                      </button>
                      <button
                        onClick={() => setShowPsForm(false)}
                        className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
