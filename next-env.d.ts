/// <reference types="next" />
/// <reference types="next/image-types/global" />

declare namespace NodeJS {
  interface ProcessEnv {
    NEXTAUTH_SECRET: string
    NEXTAUTH_URL: string
    GOOGLE_CLIENT_ID: string
    GOOGLE_CLIENT_SECRET: string
    NEXT_PUBLIC_SUPABASE_URL: string
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string
    SUPABASE_SERVICE_ROLE_KEY: string
    ANTHROPIC_API_KEY: string
    ELEVENLABS_API_KEY: string
    ELEVENLABS_VOICE_ID: string
    TWILIO_ACCOUNT_SID: string
    TWILIO_AUTH_TOKEN: string
    TWILIO_PHONE_NUMBER: string
    QUICKBOOKS_CLIENT_ID: string
    QUICKBOOKS_CLIENT_SECRET: string
    CRON_SECRET: string
  }
}

export {}
