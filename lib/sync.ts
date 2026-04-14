import { Account, SyncStatus, CalendarEvent, Email, Task, TextMessage } from '@/types';
import { fetchCalendarEvents, fetchEmails, fetchTasks } from './google';
import { sendSMS } from './twilio';
import { logSyncEvent, getUserAccounts, getLatestBriefing } from './supabase';
import { createServerClient } from './supabase';

export async function syncGmailAccount(
  account: Account,
  userId: string
): Promise<{ status: SyncStatus; itemsSynced: number; error?: string }> {
  try {
    const emails = await fetchEmails(account, 'is:important', 50);

    if (emails.length === 0) {
      await logSyncEvent(userId, account.id, 'gmail', 'success', 0);
      return { status: 'completed', itemsSynced: 0 };
    }

    // Store emails in database
    const serverClient = createServerClient();

    const emailsToStore = emails.map((email) => ({
      ...email,
      userId,
    }));

    const { error } = await serverClient.from('emails').upsert(emailsToStore, {
      onConflict: 'externalId,accountId',
    });

    if (error) {
      throw new Error(`Failed to store emails: ${error.message}`);
    }

    await logSyncEvent(userId, account.id, 'gmail', 'success', emails.length);
    return { status: 'completed', itemsSynced: emails.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logSyncEvent(userId, account.id, 'gmail', 'failed', 0, errorMessage);
    return { status: 'failed', itemsSynced: 0, error: errorMessage };
  }
}

export async function syncCalendarAccount(
  account: Account,
  userId: string
): Promise<{ status: SyncStatus; itemsSynced: number; error?: string }> {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const events = await fetchCalendarEvents(account, now, sevenDaysFromNow);

    if (events.length === 0) {
      await logSyncEvent(userId, account.id, 'calendar', 'success', 0);
      return { status: 'completed', itemsSynced: 0 };
    }

    // Store calendar events in database
    const serverClient = createServerClient();

    const eventsToStore = events.map((event) => ({
      ...event,
      userId,
    }));

    const { error } = await serverClient.from('calendar_events').upsert(eventsToStore, {
      onConflict: 'externalId,accountId',
    });

    if (error) {
      throw new Error(`Failed to store calendar events: ${error.message}`);
    }

    await logSyncEvent(userId, account.id, 'calendar', 'success', events.length);
    return { status: 'completed', itemsSynced: events.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logSyncEvent(userId, account.id, 'calendar', 'failed', 0, errorMessage);
    return { status: 'failed', itemsSynced: 0, error: errorMessage };
  }
}

export async function syncTasksAccount(
  account: Account,
  userId: string
): Promise<{ status: SyncStatus; itemsSynced: number; error?: string }> {
  try {
    const tasks = await fetchTasks(account);

    if (tasks.length === 0) {
      await logSyncEvent(userId, account.id, 'tasks', 'success', 0);
      return { status: 'completed', itemsSynced: 0 };
    }

    // Store tasks in database
    const serverClient = createServerClient();

    const tasksToStore = tasks.map((task) => ({
      ...task,
      userId,
    }));

    const { error } = await serverClient.from('tasks').upsert(tasksToStore, {
      onConflict: 'externalId,accountId',
    });

    if (error) {
      throw new Error(`Failed to store tasks: ${error.message}`);
    }

    await logSyncEvent(userId, account.id, 'tasks', 'success', tasks.length);
    return { status: 'completed', itemsSynced: tasks.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logSyncEvent(userId, account.id, 'tasks', 'failed', 0, errorMessage);
    return { status: 'failed', itemsSynced: 0, error: errorMessage };
  }
}

export async function syncAllAccounts(userId: string): Promise<{
  status: SyncStatus;
  results: Array<{ service: string; status: SyncStatus; itemsSynced: number; error?: string }>;
}> {
  try {
    const accounts = await getUserAccounts(userId);

    if (accounts.length === 0) {
      return {
        status: 'completed',
        results: [],
      };
    }

    const results = [];

    for (const account of accounts) {
      if (account.type === 'google') {
        // Sync all three Google services for this account
        const gmailResult = await syncGmailAccount(account, userId);
        results.push({ service: 'gmail', ...gmailResult });

        const calendarResult = await syncCalendarAccount(account, userId);
        results.push({ service: 'calendar', ...calendarResult });

        const tasksResult = await syncTasksAccount(account, userId);
        results.push({ service: 'tasks', ...tasksResult });
      }
      // Add handlers for other account types (Apple, Outlook) as needed
    }

    const overallStatus = results.some((r) => r.status === 'failed') ? 'failed' : 'completed';

    return {
      status: overallStatus,
      results,
    };
  } catch (error) {
    console.error('Error syncing all accounts:', error);
    return {
      status: 'failed',
      results: [
        {
          service: 'all',
          status: 'failed',
          itemsSynced: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    };
  }
}

export async function logSync(
  accountId: string,
  service: 'gmail' | 'calendar' | 'tasks' | 'sms' | 'news' | 'financial',
  status: 'success' | 'failed' | 'partial',
  itemsSynced: number,
  error?: string
): Promise<void> {
  try {
    const serverClient = createServerClient();

    // Get the user ID from the account
    const { data: account } = await serverClient.from('accounts').select('userId').eq('id', accountId).single();

    if (account) {
      await logSyncEvent(account.userId, accountId, service, status, itemsSynced, error);
    }
  } catch (error) {
    console.error('Error logging sync:', error);
  }
}

export async function syncBriefing(userId: string): Promise<{ status: SyncStatus; message: string }> {
  try {
    // First sync all data
    const syncResult = await syncAllAccounts(userId);

    if (syncResult.status === 'failed') {
      return {
        status: 'failed',
        message: 'Failed to sync accounts before briefing generation',
      };
    }

    // Then check if a briefing was recently generated
    const briefing = await getLatestBriefing(userId);

    if (briefing) {
      return {
        status: 'completed',
        message: `Data synced successfully. Latest briefing: ${briefing.generatedAt}`,
      };
    }

    return {
      status: 'completed',
      message: 'Data synced successfully',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      status: 'failed',
      message: `Sync failed: ${errorMessage}`,
    };
  }
}

export async function syncNewsAndPodcasts(userId: string): Promise<{ status: SyncStatus; message: string }> {
  try {
    // This would connect to news/podcast APIs based on user preferences
    // For now, just log the sync event
    const accounts = await getUserAccounts(userId);

    if (accounts.length === 0) {
      return {
        status: 'failed',
        message: 'No accounts found for user',
      };
    }

    await logSyncEvent(accounts[0].id, 'news', 'success', 0);

    return {
      status: 'completed',
      message: 'News and podcasts sync initiated',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      status: 'failed',
      message: `News/podcast sync failed: ${errorMessage}`,
    };
  }
}

export async function performFullSync(userId: string): Promise<{
  timestamp: Date;
  accountSync: { status: SyncStatus; results: Array<{ service: string; status: SyncStatus; itemsSynced: number; error?: string }> };
  newsSync: { status: SyncStatus; message: string };
}> {
  const timestamp = new Date();

  const [accountSync, newsSync] = await Promise.all([syncAllAccounts(userId), syncNewsAndPodcasts(userId)]);

  return {
    timestamp,
    accountSync,
    newsSync: {
      status: newsSync.status,
      message: newsSync.message,
    },
  };
}
