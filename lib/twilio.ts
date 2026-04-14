import crypto from 'crypto';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export interface IncomingMessage {
  from: string;
  to: string;
  body: string;
  messageId: string;
  timestamp: Date;
}

export function validateTwilioWebhook(req: Request, twilioSignature: string): boolean {
  try {
    if (!TWILIO_AUTH_TOKEN) {
      throw new Error('Missing TWILIO_AUTH_TOKEN environment variable');
    }

    // Get the URL of the webhook (normally req.url in Express)
    const url = new URL(req.url || '', 'http://localhost');
    const pathAndQuery = url.pathname + url.search;

    // Reconstruct the data that was signed
    const body = '';

    // Compute the hash
    const hash = crypto
      .createHmac('sha1', TWILIO_AUTH_TOKEN)
      .update(pathAndQuery + body)
      .digest('base64');

    // Compare with the signature from Twilio
    return hash === twilioSignature;
  } catch (error) {
    console.error('Error validating Twilio webhook:', error);
    return false;
  }
}

export function parseIncomingMessage(formData: Record<string, string>): IncomingMessage | null {
  try {
    const from = formData['From'];
    const to = formData['To'];
    const body = formData['Body'];
    const messageId = formData['MessageSid'];
    const timestamp = formData['DateSent'];

    if (!from || !to || !body || !messageId) {
      console.error('Missing required message fields');
      return null;
    }

    return {
      from,
      to,
      body,
      messageId,
      timestamp: new Date(timestamp || Date.now()),
    };
  } catch (error) {
    console.error('Error parsing incoming message:', error);
    return null;
  }
}

export async function sendSMS(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error('Missing Twilio configuration environment variables');
    }

    // Validate phone number format (basic validation)
    if (!to.match(/^\+?[1-9]\d{1,14}$/)) {
      throw new Error('Invalid phone number format');
    }

    // URL encode the parameters
    const params = new URLSearchParams();
    params.append('From', TWILIO_PHONE_NUMBER);
    params.append('To', to);
    params.append('Body', body);

    const authString = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Twilio API error: ${errorData.message || response.statusText}`);
    }

    const data = (await response.json()) as { sid?: string; error_message?: string };
    return {
      success: true,
      messageId: data.sid,
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendSMSBatch(recipients: Array<{ to: string; body: string }>): Promise<Array<{ to: string; success: boolean; messageId?: string; error?: string }>> {
  return Promise.all(recipients.map(async ({ to, body }) => {
    const result = await sendSMS(to, body);
    return {
      to,
      ...result,
    };
  }));
}

export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');

  // If it's a US number without country code, add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If it already has country code
  if (digits.length > 10) {
    return `+${digits}`;
  }

  // Return as-is if unable to format
  return phoneNumber;
}
