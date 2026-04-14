'use client';

import { useEffect, useState } from 'react';
import { Newspaper, Radio, ExternalLink, Check } from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { cn } from '@/lib/utils';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  category: string;
  timestamp: Date;
  url: string;
  relevanceScore: number;
  read: boolean;
}

interface PodcastItem {
  id: string;
  title: string;
  podcastName: string;
  duration: number;
  url: string;
  reason: string;
  listened: boolean;
}

export function NewsRecommendations() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [podcasts, setPodcasts] = useState<PodcastItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const [newsRes, podcastRes] = await Promise.all([
          fetch('/api/news?limit=5'),
          fetch('/api/podcasts/recommendations?limit=3'),
        ]);

        const newsData = await newsRes.json();
        const podcastData = await podcastRes.json();

        setNews(newsData.news || []);
        setPodcasts(podcastData.podcasts || []);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const markAsRead = async (newsId: string) => {
    try {
      await fetch(`/api/news/${newsId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });

      setNews((prev) =>
        prev.map((item) =>
          item.id === newsId ? { ...item, read: true } : item
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAsListened = async (podcastId: string) => {
    try {
      await fetch(`/api/podcasts/${podcastId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listened: true }),
      });

      setPodcasts((prev) =>
        prev.map((item) =>
          item.id === podcastId ? { ...item, listened: true } : item
        )
      );
    } catch (error) {
      console.error('Error marking as listened:', error);
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const newsDate = new Date(date);
    const diffMs = now.getTime() - newsDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return newsDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const RelevanceScore = ({ score }: { score: number }) => {
    const dots = Math.round((score / 100) * 5);
    return (
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              i < dots ? 'bg-blue-400' : 'bg-white/10'
            )}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card header={<h2 className="text-lg font-semibold text-white">News & Podcasts</h2>}>
        <div className="text-gray-400 text-sm">Loading...</div>
      </Card>
    );
  }

  return (
    <Card header={<h2 className="text-lg font-semibold text-white">News & Podcasts</h2>}>
      <div className="space-y-6">
        {news.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 mb-3 text-sm font-semibold text-white">
              <Newspaper className="h-4 w-4" />
              Top News
            </h3>
            <div className="space-y-2">
              {news.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'group rounded-lg border p-3 transition-all duration-300',
                    item.read
                      ? 'border-white/5 bg-white/[0.02] opacity-60'
                      : 'border-white/10 bg-white/[0.05] hover:border-white/20'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/link block"
                      >
                        <h4 className="text-sm font-medium text-white group-hover/link:text-blue-400 line-clamp-2 transition-colors">
                          {item.title}
                        </h4>
                      </a>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="info" size="sm">
                          {item.category}
                        </Badge>
                        <span className="text-xs text-gray-500">{item.source}</span>
                        <span className="text-xs text-gray-600">{formatTime(item.timestamp)}</span>
                      </div>

                      <div className="mt-2">
                        <RelevanceScore score={item.relevanceScore} />
                      </div>
                    </div>

                    <button
                      onClick={() => markAsRead(item.id)}
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 transition-all"
                    >
                      {item.read ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <ExternalLink className="h-4 w-4 text-gray-400 hover:text-blue-400" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {podcasts.length > 0 && (
          <div className="pt-4 border-t border-white/10">
            <h3 className="flex items-center gap-2 mb-3 text-sm font-semibold text-white">
              <Radio className="h-4 w-4" />
              Recommended Podcasts
            </h3>
            <div className="space-y-2">
              {podcasts.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'group rounded-lg border p-3 transition-all duration-300',
                    item.listened
                      ? 'border-white/5 bg-white/[0.02] opacity-60'
                      : 'border-white/10 bg-white/[0.05] hover:border-white/20'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/link block"
                      >
                        <h4 className="text-sm font-medium text-white group-hover/link:text-blue-400 line-clamp-2 transition-colors">
                          {item.title}
                        </h4>
                      </a>

                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{item.podcastName}</span>
                        <span className="text-xs text-gray-600">•</span>
                        <span className="text-xs text-gray-600">{formatDuration(item.duration)}</span>
                      </div>

                      <p className="text-xs text-gray-500 mt-2">{item.reason}</p>
                    </div>

                    <button
                      onClick={() => markAsListened(item.id)}
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 transition-all"
                    >
                      {item.listened ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <ExternalLink className="h-4 w-4 text-gray-400 hover:text-blue-400" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {news.length === 0 && podcasts.length === 0 && (
          <div className="py-8 text-center">
            <Newspaper className="mx-auto mb-2 h-8 w-8 text-gray-600" />
            <p className="text-sm text-gray-400">No recommendations at this time</p>
          </div>
        )}
      </div>
    </Card>
  );
}

export default NewsRecommendations;
