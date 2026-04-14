'use client';

import { useEffect, useState } from 'react';
import { Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import Badge from './ui/Badge';

interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  calendarName: string;
  color: string;
  isConflicting?: boolean;
}

export function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime] = useState(new Date());

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/calendar/events?range=today');
        const data = await response.json();

        const sortedEvents = (data.events || []).sort(
          (a: CalendarEvent, b: CalendarEvent) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );

        const eventsWithConflicts = sortedEvents.map((event: CalendarEvent, index: number) => {
          const isConflicting = sortedEvents.some(
            (other: CalendarEvent, otherIndex: number) =>
              otherIndex !== index &&
              new Date(other.startTime).getTime() < new Date(event.endTime).getTime() &&
              new Date(other.endTime).getTime() > new Date(event.startTime).getTime()
          );
          return { ...event, isConflicting };
        });

        setEvents(eventsWithConflicts);
      } catch (error) {
        console.error('Error fetching calendar events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const groupEventsByDay = () => {
    const grouped: { [key: string]: CalendarEvent[] } = {};

    events.forEach((event) => {
      const dateKey = new Date(event.startTime).toLocaleDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    return grouped;
  };

  const isEventNow = (event: CalendarEvent) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    return currentTime >= start && currentTime <= end;
  };

  const isEventUpcoming = (event: CalendarEvent) => {
    const start = new Date(event.startTime);
    return start > currentTime && start.getTime() - currentTime.getTime() < 60 * 60 * 1000;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return <div className="text-gray-400 text-sm">Loading events...</div>;
  }

  if (events.length === 0) {
    return (
      <div className="py-8 text-center">
        <Clock className="mx-auto mb-2 h-8 w-8 text-gray-600" />
        <p className="text-sm text-gray-400">No events scheduled today</p>
      </div>
    );
  }

  const groupedEvents = groupEventsByDay();

  return (
    <div className="space-y-6">
      {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
        <div key={dateKey}>
          <h3 className="mb-3 text-sm font-semibold text-gray-400 uppercase tracking-wider">
            {new Date(dateKey).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </h3>

          <div className="relative space-y-3 border-l-2 border-white/10 pl-4">
            {dayEvents.map((event) => {
              const isNow = isEventNow(event);
              const isUpcoming = isEventUpcoming(event);

              return (
                <div
                  key={event.id}
                  className={cn(
                    'relative rounded-lg border p-3 transition-all duration-300',
                    isNow
                      ? 'border-green-500/50 bg-green-500/10 shadow-lg shadow-green-500/20'
                      : isUpcoming
                        ? 'border-yellow-500/50 bg-yellow-500/10'
                        : event.isConflicting
                          ? 'border-red-500/50 bg-red-500/10'
                          : 'border-white/10 bg-white/[0.05] hover:border-white/20 hover:bg-white/[0.08]'
                  )}
                >
                  <div
                    className={cn(
                      'absolute -left-[15px] top-4 h-4 w-4 rounded-full border-2 border-slate-800',
                      isNow
                        ? 'bg-green-500 shadow-lg shadow-green-500/50'
                        : isUpcoming
                          ? 'bg-yellow-500'
                          : event.isConflicting
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                    )}
                  />

                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">{event.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-400">
                          {formatTime(event.startTime)} - {formatTime(event.endTime)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {isNow && <Badge variant="success" size="sm">Now</Badge>}
                      {isUpcoming && <Badge variant="warning" size="sm">Soon</Badge>}
                      {event.isConflicting && <Badge variant="danger" size="sm">Conflict</Badge>}
                    </div>
                  </div>

                  {event.location && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs rounded-full px-2 py-1 text-white/70"
                      style={{ backgroundColor: `${event.color}20`, color: event.color }}>
                      {event.calendarName}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default CalendarView;
