import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateTwilioWebhook, parseIncomingMessage } from '@/lib/twilio';
import crypto from 'crypto';

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
}

function validateTwilioSignature(req: NextRequest, signature: string): boolean {
  try {
    if (!TWILIO_AUTH_TOKEN) {
      throw new Error('Missing TWILIO_AUTH_TOKEN');
    }

    // Get the URL without the protocol
    const url = new URL(req.url);
    const pathAndQuery = url.pathname + url.search;

    // For Twilio webhooks, we need to reconstruct the body in the same way Twilio signs it
    // The body comes after the URL in the signing process
    const hash = crypto
      .createHmac('sha1', TWILIO_AUTH_TOKEN)
      .update(pathAndQuery)
      .digest('base64');

    return hash === signature;
  } catch (error) {
    console.error('Error validating Twilio signature:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate Twilio request signature
    const twilioSignature = request.headers.get('X-Twilio-Signature');
    if (!twilioSignature) {
      console.warn('Missing Twilio signature');
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          status: 403,
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    // Note: Signature validation is optional in development but recommended in production
    // Uncomment the line below to enforce signature validation
    // if (!validateTwilioSignature(request, twilioSignature)) {
    //   return new NextResponse(
    //     '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    //     { status: 403, headers: { 'Content-Type': 'text/xml' } }
    //   );
    // }

    // Parse form data
    const formData = await request.formData();
    const body = formData.get('Body') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const messageSid = formData.get('MessageSid') as string;

    if (!body || !from || !to || !messageSid) {
      console.error('Missing required message fields');
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          status: 400,
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    const supabase = createServerClient();

    // Find user by phone number (to)
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('user_id, key_contacts')
      .eq('phone_number', to)
      .single();

    if (!userPrefs) {
      console.warn(`No user found for phone number: ${to}`);
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    const userId = userPrefs.user_id;
    const keyContacts = (userPrefs.key_contacts as string[]) || [];
    const isFlagged = keyContacts.includes(from);

    // Store message in database
    const { error: storeError } = await supabase
      .from('text_messages')
      .insert({
        user_id: userId,
        from,
        to,
        body,
        external_id: messageSid,
        is_flagged: isFlagged,
        received_at: new Date().toISOString(),
      });

    if (storeError) {
      console.error('Error storing message:', storeError);
    }

    // Return TwiML response
    const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Error processing Twilio webhook:', error);
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 500,
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  }
}
