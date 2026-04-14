import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Account, CalendarEvent, Email, Task } from '@/types';
import { getAccount, updateAccountTokens } from './supabase';

export function createOAuth2Client(account: Account): OAuth2Client {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
  );

  oauth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
  });

  return oauth2Client;
}

export async function refreshAccessToken(accountId: string): Promise<string | null> {
  try {
    const account = await getAccount(accountId);
    if (!account) {
      console.error('Account not found:', accountId);
      return null;
    }

    const oauth2Client = createOAuth2Client(account);

    const { credentials } = await oauth2Client.refreshAccessToken();

    const newAccessToken = credentials.access_token;
    const newRefreshToken = credentials.refresh_token || account.refreshToken;
    const expiresIn = credentials.expiry_date ? new Date(credentials.expiry_date) : undefined;

    await updateAccountTokens(accountId, newAccessToken, newRefreshToken, expiresIn);

    return newAccessToken;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
}

async function ensureValidToken(account: Account): Promise<OAuth2Client> {
  const oauth2Client = createOAuth2Client(account);

  // Check if token is expired
  if (account.expiresAt && new Date(account.expiresAt) < new Date()) {
    const refreshedToken = await refreshAccessToken(account.id);
    if (refreshedToken) {
      oauth2Client.setCredentials({
        access_token: refreshedToken,
        refresh_token: account.refreshToken,
      });
    }
  }

  return oauth2Client;
}

export async function fetchCalendarEvents(
  account: Account,
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEvent[]> {
  try {
    const oauth2Client = await ensureValidToken(account);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    });

    const events = response.data.items || [];

    return events.map((event) => ({
      id: `${account.id}-${event.id}`,
      userId: '', // Will be set by caller
      accountId: account.id,
      externalId: event.id || '',
      title: event.summary || '',
      description: event.description,
      startTime: new Date(event.start?.dateTime || event.start?.date || ''),
      endTime: new Date(event.end?.dateTime || event.end?.date || ''),
      location: event.location,
      isAllDay: !event.start?.dateTime,
      attendees: event.attendees?.map((a) => a.email || '').filter(Boolean),
      calendarName: 'primary',
      createdAt: new Date(event.created || ''),
      updatedAt: new Date(event.updated || ''),
      syncedAt: new Date(),
    }));
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
}

export async function fetchEmails(
  account: Account,
  query: string = 'is:important',
  maxResults: number = 20
): Promise<Email[]> {
  try {
    const oauth2Client = await ensureValidToken(account);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // First, get the list of message IDs
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });

    const messageIds = listResponse.data.messages || [];
    const emails: Email[] = [];

    // Fetch full details for each message
    for (const msg of messageIds) {
      if (!msg.id) continue;

      const message = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const headers = message.data.payload?.headers || [];
      const getHeader = (name: string) => headers.find((h) => h.name === name)?.value || '';

      const from = getHeader('From');
      const to = getHeader('To')?.split(',').map((e) => e.trim()) || [];
      const cc = getHeader('Cc')?.split(',').map((e) => e.trim()) || [];
      const subject = getHeader('Subject');

      let body = '';
      let htmlBody = '';

      // Extract body from payload
      if (message.data.payload?.body?.data) {
        body = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8');
      }

      if (message.data.payload?.parts) {
        const textPart = message.data.payload.parts.find((p) => p.mimeType === 'text/plain');
        const htmlPart = message.data.payload.parts.find((p) => p.mimeType === 'text/html');

        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        }
        if (htmlPart?.body?.data) {
          htmlBody = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
        }
      }

      const labels = message.data.labelIds || [];
      const isRead = !labels.includes('UNREAD');
      const isStarred = labels.includes('STARRED');
      const isImportant = labels.includes('IMPORTANT');

      emails.push({
        id: `${account.id}-${msg.id}`,
        userId: '', // Will be set by caller
        accountId: account.id,
        externalId: msg.id,
        from,
        to,
        cc,
        subject,
        body,
        htmlBody,
        isRead,
        isStarred,
        isImportant,
        labels: labels.map((l) => {
          // Map GMAIL_* labels to readable names
          return l
            .replace('CATEGORY_', '')
            .replace('GMAIL_', '')
            .toLowerCase();
        }),
        receivedAt: new Date(parseInt(message.data.internalDate || '0')),
        createdAt: new Date(),
        updatedAt: new Date(),
        syncedAt: new Date(),
      });
    }

    return emails;
  } catch (error) {
    console.error('Error fetching emails:', error);
    return [];
  }
}

export async function fetchTasks(account: Account): Promise<Task[]> {
  try {
    const oauth2Client = await ensureValidToken(account);
    const tasks = google.tasks({ version: 'v1', auth: oauth2Client });

    // Get task lists first
    const taskListsResponse = await tasks.tasklists.list({
      maxResults: 10,
    });

    const taskLists = taskListsResponse.data.items || [];
    const allTasks: Task[] = [];

    // Fetch tasks from each list
    for (const list of taskLists) {
      if (!list.id) continue;

      const tasksResponse = await tasks.tasks.list({
        tasklist: list.id,
        showCompleted: false,
        maxResults: 100,
      });

      const taskItems = tasksResponse.data.items || [];

      taskItems.forEach((task) => {
        let priority: 'low' | 'medium' | 'high' = 'medium';

        // Infer priority from notes or title
        if (task.notes?.toLowerCase().includes('urgent') || task.notes?.toLowerCase().includes('high')) {
          priority = 'high';
        } else if (task.notes?.toLowerCase().includes('low')) {
          priority = 'low';
        }

        allTasks.push({
          id: `${account.id}-${task.id}`,
          userId: '', // Will be set by caller
          accountId: account.id,
          externalId: task.id,
          title: task.title || '',
          description: task.notes,
          dueDate: task.due ? new Date(task.due) : undefined,
          isCompleted: task.status === 'completed',
          priority,
          createdAt: new Date(task.created || ''),
          updatedAt: new Date(task.updated || ''),
          completedAt: task.completed ? new Date(task.completed) : undefined,
          syncedAt: new Date(),
        });
      });
    }

    return allTasks;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

export async function getOAuthAuthorizationUrl(): Promise<string> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
  );

  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/tasks.readonly',
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });

  return url;
}

export async function exchangeCodeForTokens(code: string): Promise<{ accessToken: string; refreshToken?: string } | null> {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );

    const { tokens } = await oauth2Client.getToken(code);

    return {
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token,
    };
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return null;
  }
}
