'use client';

import { useState } from 'react';
import { X, Send, Paperclip, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface EmailComposeProps {
  onClose: () => void;
  replyTo?: { to: string; subject: string; threadId?: string };
}

export function EmailCompose({ onClose, replyTo }: EmailComposeProps) {
  const [to, setTo] = useState(replyTo?.to || '');
  const [subject, setSubject] = useState(replyTo?.subject ? `Re: ${replyTo.subject}` : '');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const handleSend = async () => {
    if (!to.trim() || !body.trim()) {
      toast.error('Please fill in To and message body');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body, threadId: replyTo?.threadId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      toast.success('Email sent!');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-3 px-4 py-3 text-sm text-gray-200 hover:bg-gray-750 rounded-xl w-full"
        >
          <Send size={14} className="text-blue-400" />
          <span className="max-w-[160px] truncate">{subject || 'New Message'}</span>
          <ChevronDown size={14} className="text-gray-500 ml-auto rotate-180" />
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="ml-1 text-gray-500 hover:text-gray-300"
          >
            <X size={14} />
          </button>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[480px] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80 border-b border-gray-700">
        <span className="text-sm font-medium text-gray-200">
          {replyTo ? 'Reply' : 'New Message'}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(true)} className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200">
            <ChevronDown size={16} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="flex flex-col divide-y divide-gray-800">
        <div className="flex items-center px-4 py-2">
          <span className="text-xs text-gray-500 w-12">To</span>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-600 focus:outline-none"
          />
        </div>
        <div className="flex items-center px-4 py-2">
          <span className="text-xs text-gray-500 w-12">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Body */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your message..."
        rows={8}
        className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-600 focus:outline-none px-4 py-3 resize-none"
      />

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 bg-gray-900/60">
        <button className="p-2 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors">
          <Paperclip size={16} />
        </button>
        <button
          onClick={handleSend}
          disabled={sending || !to.trim() || !body.trim()}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {sending ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending...
            </span>
          ) : (
            <>
              <Send size={14} />
              Send
            </>
          )}
        </button>
      </div>
    </div>
  );
}
