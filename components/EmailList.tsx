'use client';

import { useEffect, useState } from 'react';
import { Mail, Flag, ChevronDown, ExternalLink } from 'lucide-react';
import Badge from './ui/Badge';
import { cn } from '@/lib/utils';

interface Email {
  id: string;
  from: {
    name: string;
    email: string;
    avatar?: string;
  };
  subject: string;
  snippet: string;
  timestamp: Date;
  unread: boolean;
  flagged: boolean;
  flagReason?: string;
  body?: string;
}

export function EmailList() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const response = await fetch('/api/email?flagged=true&limit=10');
        const data = await response.json();
        setEmails((data.emails || []).slice(0, 5));
      } catch (error) {
        console.error('Error fetching emails:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmails();
  }, []);

  const formatTime = (date: Date) => {
    const now = new Date();
    const emailDate = new Date(date);
    const diffMs = now.getTime() - emailDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return emailDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getAvatarColor = (email: string) => {
    const colors = [
      'bg-blue-600',
      'bg-purple-600',
      'bg-pink-600',
      'bg-green-600',
      'bg-yellow-600',
    ];
    return colors[email.charCodeAt(0) % colors.length];
  };

  const flagReasonToVariant = (reason?: string) => {
    switch (reason) {
      case 'Action needed':
        return 'danger';
      case 'Key contact':
        return 'info';
      case 'Deadline':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return <div className="text-gray-400 text-sm">Loading emails...</div>;
  }

  if (emails.length === 0) {
    return (
      <div className="py-8 text-center">
        <Mail className="mx-auto mb-2 h-8 w-8 text-gray-600" />
        <p className="text-sm text-gray-400">No flagged emails</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {emails.map((email) => (
        <div key={email.id}>
          <button
            onClick={() => setExpandedId(expandedId === email.id ? null : email.id)}
            className={cn(
              'w-full rounded-lg border p-3 text-left transition-all duration-300',
              email.unread
                ? 'border-blue-500/30 bg-blue-500/10'
                : 'border-white/10 bg-white/[0.05] hover:border-white/20'
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white',
                  getAvatarColor(email.from.email)
                )}
              >
                {email.from.name.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-white truncate">
                    {email.from.name}
                  </span>
                  {email.unread && (
                    <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                  )}
                </div>

                <p className="text-xs text-gray-400 truncate mb-1">{email.subject}</p>

                <p className="text-xs text-gray-500 line-clamp-1">{email.snippet}</p>

                <div className="flex items-center gap-2 mt-2">
                  {email.flagged && email.flagReason && (
                    <Badge
                      variant={flagReasonToVariant(email.flagReason)}
                      size="sm"
                      icon={Flag}
                    >
                      {email.flagReason}
                    </Badge>
                  )}
                  <span className="text-xs text-gray-600">{formatTime(email.timestamp)}</span>
                </div>
              </div>

              <ChevronDown
                className={cn(
                  'h-4 w-4 text-gray-400 flex-shrink-0 transition-transform',
                  expandedId === email.id && 'rotate-180'
                )}
              />
            </div>
          </button>

          {expandedId === email.id && email.body && (
            <div className="mt-2 rounded-lg bg-white/[0.02] border border-white/10 p-3 text-xs text-gray-300">
              <p className="line-clamp-4">{email.body}</p>
              <a
                href={`mailto:${email.from.email}`}
                className="mt-2 inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
              >
                Reply <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      ))}

      <a
        href="/emails"
        className="block mt-4 text-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        View all emails
      </a>
    </div>
  );
}

export default EmailList;
