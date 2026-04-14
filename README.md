# Vinesh AI Assistant

A voice-first AI personal assistant app built with Next.js 14, TypeScript, and cutting-edge AI technologies. Designed for busy executives to manage calendars, emails, financial data, and more through natural conversation.

## Features

- **Voice-First Interface**: Natural voice input and output using ElevenLabs
- **Multi-Channel Communication**: Support for email, SMS, voice calls via Twilio
- **AI-Powered Assistance**: Claude 3.5 Sonnet for intelligent responses
- **Calendar Integration**: Google Calendar sync and management
- **Financial Management**: QuickBooks Online integration for real-time financial data
- **Executive Briefings**: Daily automated briefings with key metrics and priorities
- **Authentication**: Secure OAuth with Google via NextAuth
- **Responsive Design**: Beautiful dark-themed UI with Tailwind CSS
- **Real-Time Sync**: Automatic synchronization of emails, calendars, and data

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + PostCSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js with Supabase adapter
- **AI**: Anthropic Claude API
- **Text-to-Speech**: ElevenLabs
- **Telephony**: Twilio
- **APIs**: Google (Calendar, Contacts), QuickBooks
- **State Management**: Zustand
- **UI Components**: Lucide React (icons)
- **Utilities**: date-fns, React Hot Toast

## Prerequisites

- Node.js 18+ and npm/pnpm
- Supabase account and project
- Google OAuth credentials
- Anthropic API key
- ElevenLabs API key
- Twilio account (optional)
- QuickBooks integration credentials (optional)

## Installation

1. **Clone the repository**
   ```bash
   cd vinesh-ai-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in all required environment variables from:
   - Supabase dashboard
   - Google Cloud Console
   - Anthropic API
   - ElevenLabs
   - Twilio (if using)
   - QuickBooks (if using)

4. **Generate NextAuth secret**
   ```bash
   openssl rand -base64 32
   ```
   Add the output to `NEXTAUTH_SECRET`

5. **Database setup** (Supabase)
   ```sql
   -- Create tables based on schema in /supabase directory
   ```

6. **Run development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/
│   ├── (auth)/                 # Authentication routes
│   ├── api/
│   │   ├── cron/              # Scheduled jobs
│   │   ├── oauth/             # OAuth callbacks
│   │   ├── messages/          # Message processing
│   │   └── health/            # Health checks
│   ├── components/            # UI components
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Home page
├── components/                # Reusable components
├── hooks/                     # Custom React hooks
├── lib/
│   ├── anthropic.ts           # Anthropic API client
│   ├── auth.ts                # NextAuth configuration
│   ├── supabase.ts            # Supabase client
│   ├── store/                 # Zustand stores
│   ├── utils/                 # Utility functions
│   └── services/              # API services
├── types/                     # TypeScript type definitions
├── public/                    # Static assets
├── .env.example               # Environment variables template
├── package.json               # Dependencies
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
└── vercel.json                # Vercel deployment config

```

## API Routes

### Core Routes
- `POST /api/messages` - Process user messages with AI
- `GET /api/health` - Health check

### Cron Jobs
- `GET /api/cron/sync` - Sync calendar, emails, contacts (every 5 minutes)
- `GET /api/cron/briefing` - Generate daily executive briefing (7 AM UTC)
- `GET /api/cron/calendar-sync` - Sync Google Calendar (every 4 hours)
- `GET /api/cron/quickbooks-sync` - Sync financial data (daily at midnight)

### OAuth Callbacks
- `/api/oauth/google/callback` - Google OAuth redirect
- `/api/oauth/quickbooks/callback` - QuickBooks OAuth redirect

## Environment Variables

See `.env.example` for complete list. Key variables:

```
# Authentication
NEXTAUTH_SECRET=<generated-secret>
NEXTAUTH_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# AI
ANTHROPIC_API_KEY=sk-ant-xxx

# Google
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# ElevenLabs
ELEVENLABS_API_KEY=xxx
ELEVENLABS_VOICE_ID=xxx

# Twilio
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx

# QuickBooks
QUICKBOOKS_CLIENT_ID=xxx
QUICKBOOKS_CLIENT_SECRET=xxx
```

## Development

### Run development server
```bash
npm run dev
```

### Build for production
```bash
npm run build
npm start
```

### Type checking
```bash
npm run type-check
```

### Format code
```bash
npm run format
```

### Lint code
```bash
npm run lint
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Vercel automatically builds and deploys
5. Cron jobs configured in `vercel.json` run automatically

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Database Schema

Key Supabase tables:

- `users` - User profiles and authentication
- `conversations` - Chat conversations
- `messages` - Individual messages
- `user_preferences` - User settings
- `integrations` - OAuth token storage
- `briefings` - Generated daily briefings
- `sync_logs` - Sync operation history

## API Documentation

### Send Message
```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"message": "What are my meetings today?"}'
```

### Check Health
```bash
curl http://localhost:3000/api/health
```

## Security

- ✅ Environment variables for sensitive data
- ✅ NextAuth with OAuth 2.0
- ✅ Supabase RLS (Row Level Security)
- ✅ CSRF protection via NextAuth
- ✅ Secure token storage
- ✅ API rate limiting (recommended)
- ✅ Input validation

## Performance

- Next.js 14 with App Router for faster builds
- TypeScript for type safety
- Zustand for lightweight state management
- Tailwind CSS for optimized styling
- CDN-ready with Vercel

## Monitoring

- Health check endpoint: `/api/health`
- Error logging via console
- Integration logs in Supabase
- Cron job execution logs

## Troubleshooting

### OAuth errors
- Verify callback URLs match exactly in OAuth provider settings
- Check environment variables are loaded correctly

### Supabase connection issues
- Verify project URL and keys
- Check network connectivity
- Review Supabase logs

### Claude API errors
- Verify API key is valid
- Check rate limits
- Review model name (claude-3-5-sonnet-20241022)

## Future Enhancements

- [ ] Advanced voice interactions with real-time streaming
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Custom integrations API
- [ ] Team collaboration features
- [ ] Advanced scheduling and optimization

## Contributing

Contributions are welcome! Please follow these steps:

1. Create a feature branch
2. Make your changes
3. Add tests if applicable
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, please open an issue in the GitHub repository or contact the development team.

## Changelog

### v1.0.0 (Initial Release)
- Initial project setup with Next.js 14
- Core AI assistant functionality
- Authentication with Google OAuth
- Integration framework for services
- Daily briefing generation
- Voice-ready infrastructure

<!-- Trigger deployment -->
<!-- v2 -->
