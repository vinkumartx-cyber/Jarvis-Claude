import {
  BriefingData,
  CalendarEvent,
  Email,
  Task,
  TextMessage,
  SchoolEvent,
  FinancialData,
  NewsItem,
  PodcastRecommendation,
  Briefing,
} from '@/types';
import {
  getRecentCalendarEvents,
  getRecentEmails,
  getActiveTasks,
  getRecentTextMessages,
  getUpcomingSchoolEvents,
  getLatestFinancialData,
  getTopNewsItems,
  getUnlistenedPodcasts,
  storeBriefing,
  getUserPreferences,
} from './supabase';
import { generateBriefing, flagImportantEmails, generateTaskPriorities } from './anthropic';
import { generateAndUploadBriefingAudio } from './elevenlabs';

export async function aggregateUserData(userId: string): Promise<BriefingData> {
  try {
    const [
      calendarEvents,
      emails,
      tasks,
      textMessages,
      schoolEvents,
      financialData,
      newsItems,
      podcastRecommendations,
    ] = await Promise.all([
      getRecentCalendarEvents(userId, 7),
      getRecentEmails(userId, 24),
      getActiveTasks(userId),
      getRecentTextMessages(userId, 24),
      getUpcomingSchoolEvents(userId, 7),
      getLatestFinancialData(userId),
      getTopNewsItems(userId, 10),
      getUnlistenedPodcasts(userId),
    ]);

    // Filter and enhance emails with importance flagging
    let importantEmails = emails.filter((e) => e.isImportant);

    // If we have too few important emails, use Claude to identify more
    if (importantEmails.length < 3 && emails.length > 0) {
      const flaggedEmails = await flagImportantEmails(emails);
      importantEmails = flaggedEmails;
    }

    // Enhance tasks with priority analysis
    let enhancedTasks = tasks;
    if (tasks.length > 0) {
      enhancedTasks = await generateTaskPriorities(tasks);
    }

    return {
      calendarEvents: calendarEvents as CalendarEvent[],
      importantEmails: importantEmails as Email[],
      activeTasks: enhancedTasks as Task[],
      textMessages: textMessages as TextMessage[],
      schoolEvents: schoolEvents as SchoolEvent[],
      financialData: financialData as FinancialData[],
      newsItems: newsItems as NewsItem[],
      podcastRecommendations: podcastRecommendations as PodcastRecommendation[],
    };
  } catch (error) {
    console.error('Error aggregating user data:', error);
    return {
      calendarEvents: [],
      importantEmails: [],
      activeTasks: [],
      textMessages: [],
      schoolEvents: [],
      financialData: [],
      newsItems: [],
      podcastRecommendations: [],
    };
  }
}

export async function generateAndStoreBriefing(userId: string): Promise<Briefing | null> {
  try {
    // Step 1: Aggregate all user data
    const data = await aggregateUserData(userId);

    // Step 2: Generate briefing with Claude
    const briefingContent = await generateBriefing(data);

    if (!briefingContent) {
      throw new Error('Failed to generate briefing content');
    }

    // Step 3: Generate audio from briefing text
    let audioUrl: string | undefined;
    let duration: number | undefined;

    const audioResult = await generateAndUploadBriefingAudio(briefingContent, userId);
    if (audioResult) {
      audioUrl = audioResult.url;
      duration = audioResult.duration;
    }

    // Step 4: Store briefing in database
    const briefing = await storeBriefing(userId, briefingContent, audioUrl, duration);

    return briefing as Briefing;
  } catch (error) {
    console.error('Error generating and storing briefing:', error);
    return null;
  }
}

export async function generateBriefingWithPreferences(userId: string): Promise<Briefing | null> {
  try {
    const preferences = await getUserPreferences(userId);

    // Check if it's the right time for briefing
    if (preferences) {
      const now = new Date();
      const [briefingHour, briefingMinute] = preferences.briefingTime.split(':').map(Number);
      const briefingDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), briefingHour, briefingMinute);

      // Only generate if within 5 minutes of scheduled time (allows for cron job variability)
      const timeDiff = Math.abs(now.getTime() - briefingDate.getTime());
      if (timeDiff > 5 * 60 * 1000) {
        console.log('Not yet time for briefing generation');
        return null;
      }
    }

    return generateAndStoreBriefing(userId);
  } catch (error) {
    console.error('Error generating briefing with preferences:', error);
    return null;
  }
}

export async function getBriefingInsights(briefingContent: string): Promise<{ insights: string[]; actions: string[] }> {
  const insights: string[] = [];
  const actions: string[] = [];

  // Parse briefing for key insights and actions
  const lines = briefingContent.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Identify action items (lines with checkboxes or action keywords)
    if (
      trimmedLine.match(/^\s*[\-\*]\s+\[?\s?\]/i) ||
      trimmedLine.match(/\b(action|task|need to|must|should|important)\b/i)
    ) {
      actions.push(trimmedLine.replace(/^\s*[\-\*\[\]•]\s*/g, ''));
    }

    // Identify insights (lines with keywords)
    if (
      trimmedLine.match(/\b(note|important|highlight|alert|warning|critical|urgent)\b/i) ||
      trimmedLine.match(/^\s*[\▪▸▹►]/i)
    ) {
      insights.push(trimmedLine.replace(/^\s*[\-\*\[\]•▪▸▹►]\s*/g, ''));
    }
  }

  return { insights, actions };
}
