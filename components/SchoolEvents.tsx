'use client';

import { useEffect, useState } from 'react';
import { BookOpen, AlertCircle, Calendar, CheckCircle } from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { cn } from '@/lib/utils';

interface SchoolEvent {
  id: string;
  title: string;
  type: 'Event' | 'Assignment' | 'Announcement' | 'Alert';
  dueDate?: Date;
  childName: string;
  actionRequired?: boolean;
  description?: string;
}

export function SchoolEvents() {
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchoolEvents = async () => {
      try {
        const response = await fetch('/api/school/events?limit=5');
        const data = await response.json();
        setEvents(data.events || []);
      } catch (error) {
        console.error('Error fetching school events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolEvents();
  }, []);

  const getTypeIcon = (type: SchoolEvent['type']) => {
    switch (type) {
      case 'Event':
        return Calendar;
      case 'Assignment':
        return CheckCircle;
      case 'Announcement':
        return AlertCircle;
      case 'Alert':
        return AlertCircle;
      default:
        return BookOpen;
    }
  };

  const getTypeColor = (type: SchoolEvent['type']) => {
    switch (type) {
      case 'Event':
        return 'info';
      case 'Assignment':
        return 'default';
      case 'Announcement':
        return 'warning';
      case 'Alert':
        return 'danger';
      default:
        return 'default';
    }
  };

  const isOverdue = (event: SchoolEvent) => {
    if (!event.dueDate) return false;
    return new Date(event.dueDate) < new Date();
  };

  const formatDueDate = (date?: Date) => {
    if (!date) return null;
    const dueDate = new Date(date);
    const today = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 0) return `${diffDays} days`;

    return 'Overdue';
  };

  if (loading) {
    return <Card header={<h2 className="text-lg font-semibold text-white">School Events</h2>}>
      <div className="text-gray-400 text-sm">Loading...</div>
    </Card>;
  }

  if (events.length === 0) {
    return <Card header={<h2 className="text-lg font-semibold text-white">School Events</h2>}>
      <div className="py-6 text-center">
        <BookOpen className="mx-auto mb-2 h-8 w-8 text-gray-600" />
        <p className="text-sm text-gray-400">No upcoming school events</p>
      </div>
    </Card>;
  }

  return (
    <Card header={<h2 className="text-lg font-semibold text-white">School Events</h2>}>
      <div className="space-y-3">
        {events.map((event) => {
          const TypeIcon = getTypeIcon(event.type);

          return (
            <div
              key={event.id}
              className={cn(
                'rounded-lg border p-3 transition-all duration-300',
                isOverdue(event)
                  ? 'border-red-500/30 bg-red-500/10'
                  : 'border-white/10 bg-white/[0.05] hover:border-white/20'
              )}
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="rounded-lg bg-blue-600/20 p-2 border border-blue-500/30 mt-0.5">
                  <TypeIcon className="h-4 w-4 text-blue-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate">{event.title}</h4>
                  <p className="text-xs text-gray-400">{event.childName}</p>
                </div>

                {event.actionRequired && (
                  <Badge variant="danger" size="sm">
                    Action Required
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={getTypeColor(event.type)} size="sm">
                  {event.type}
                </Badge>

                {event.dueDate && (
                  <span
                    className={cn(
                      'text-xs',
                      isOverdue(event) ? 'text-red-400 font-semibold' : 'text-gray-400'
                    )}
                  >
                    {formatDueDate(event.dueDate)}
                  </span>
                )}
              </div>

              {event.description && (
                <p className="mt-2 text-xs text-gray-400 line-clamp-2">{event.description}</p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default SchoolEvents;
