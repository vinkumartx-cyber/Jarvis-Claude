# Vinesh AI Assistant - Deployment Checklist

## Pre-Deployment Setup

### Environment Configuration
- [ ] Copy `.env.example` to `.env.local`
- [ ] Generate NEXTAUTH_SECRET: `openssl rand -base64 32`
- [ ] Set NEXTAUTH_URL (e.g., http://localhost:3000 for dev)
- [ ] Verify all 30+ environment variables are set

### Google OAuth Setup
- [ ] Create Google Cloud project
- [ ] Enable Google+ API
- [ ] Create OAuth 2.0 credentials (Web application)
- [ ] Set authorized JavaScript origins
- [ ] Set authorized redirect URIs
  - Development: `http://localhost:3000/api/auth/callback/google`
  - Production: `https://yourdomain.com/api/auth/callback/google`
- [ ] Copy GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

### Supabase Setup
- [ ] Create Supabase project
- [ ] Create database
- [ ] Copy NEXT_PUBLIC_SUPABASE_URL and keys to .env
- [ ] Run database migrations (create tables)
- [ ] Enable RLS (Row Level Security) on all tables
- [ ] Create necessary database functions
- [ ] Set up storage buckets if needed

### Anthropic Setup
- [ ] Sign up for Anthropic API
- [ ] Create API key
- [ ] Set ANTHROPIC_API_KEY in .env
- [ ] Verify API quota and rate limits

### ElevenLabs Setup (Voice)
- [ ] Sign up for ElevenLabs
- [ ] Create or select a voice
- [ ] Copy ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID

### Twilio Setup (Optional)
- [ ] Sign up for Twilio
- [ ] Verify phone number or buy Twilio number
- [ ] Copy TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
- [ ] Set up webhook URLs in Twilio console

### QuickBooks Setup (Optional)
- [ ] Register application in QuickBooks App Center
- [ ] Get client ID and secret
- [ ] Set redirect URI: `https://yourdomain.com/api/oauth/quickbooks/callback`
- [ ] Copy QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET

### Additional Configuration
- [ ] Generate CRON_SECRET for scheduled jobs
- [ ] Configure GOOGLE_CALENDAR_API_KEY if using calendar sync
- [ ] Set up SMTP credentials if using email features

## Local Development

### Installation
- [ ] Run `npm install`
- [ ] Verify all dependencies installed successfully
- [ ] Check Node version is 18+

### Database
- [ ] Create Supabase project
- [ ] Copy database URL and keys
- [ ] Run any required migrations
- [ ] Seed initial data if needed

### Testing
- [ ] Run `npm run type-check` - no TypeScript errors
- [ ] Run `npm run lint` - no linting errors
- [ ] Run `npm run dev` - server starts on port 3000
- [ ] Test login flow with Google OAuth
- [ ] Test message sending and AI response
- [ ] Test voice input (if microphone available)

## Vercel Deployment

### GitHub Setup
- [ ] Initialize git repository
- [ ] Create GitHub repository
- [ ] Push code to main branch
- [ ] Create .env.local from .env.example (locally only)

### Vercel Configuration
- [ ] Create Vercel account
- [ ] Connect GitHub repository
- [ ] Select project settings
- [ ] Add environment variables in Vercel dashboard:
  - All variables from .env.example
  - Use production values
  - Do NOT include NEXTAUTH_URL (Vercel sets automatically)

### Vercel Environment Variables
- [ ] NEXTAUTH_SECRET (use new secure value)
- [ ] NEXTAUTH_URL (production domain, no trailing slash)
- [ ] GOOGLE_CLIENT_ID
- [ ] GOOGLE_CLIENT_SECRET
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] ANTHROPIC_API_KEY
- [ ] ELEVENLABS_API_KEY
- [ ] ELEVENLABS_VOICE_ID
- [ ] TWILIO_* (if using)
- [ ] QUICKBOOKS_* (if using)
- [ ] CRON_SECRET
- [ ] All other required variables

### Vercel Deployment
- [ ] Set production domain in Vercel
- [ ] Configure custom domain if applicable
- [ ] Set up Preview Deployments for branches
- [ ] Verify cron jobs configured in vercel.json
- [ ] Test automatic deployment on push to main

### Post-Deployment Verification
- [ ] Visit production URL
- [ ] Test Google OAuth sign-in
- [ ] Verify /api/health returns OK
- [ ] Test message sending
- [ ] Check browser console for errors
- [ ] Verify cron jobs appear in Vercel dashboard

## Production Setup

### Google OAuth
- [ ] Update callback URL to production domain
- [ ] Update JavaScript origins to production domain
- [ ] Disable "Verify unverified apps" warning after testing

### Supabase
- [ ] Enable all security features
- [ ] Configure RLS policies for each table
- [ ] Set up automated backups
- [ ] Enable activity logging
- [ ] Configure connection pooling if needed

### Monitoring & Logging
- [ ] Set up error monitoring (Sentry, DataDog, etc.)
- [ ] Configure log aggregation
- [ ] Set up alerting for errors
- [ ] Monitor API usage and costs
- [ ] Set up performance monitoring

### Security Hardening
- [ ] Review all environment variables are private
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS if needed
- [ ] Set up rate limiting on API endpoints
- [ ] Enable security headers in next.config.js
- [ ] Review and enable all Supabase security features

### Backup & Recovery
- [ ] Set up database backups
- [ ] Test backup restoration
- [ ] Document disaster recovery procedures
- [ ] Set up monitoring for backup completion

### Domain & SSL
- [ ] Register domain
- [ ] Configure DNS records
- [ ] Set up SSL certificate (automatic with Vercel)
- [ ] Configure subdomain if needed
- [ ] Update OAuth redirect URLs
- [ ] Update email sender domain if applicable

## Ongoing Maintenance

### Regular Tasks
- [ ] Monitor API usage and costs
- [ ] Review error logs daily
- [ ] Update dependencies monthly
- [ ] Review security advisories
- [ ] Test backup restoration monthly
- [ ] Monitor database performance
- [ ] Review user feedback

### Weekly
- [ ] Check Vercel deployment status
- [ ] Review cron job execution logs
- [ ] Check error monitoring dashboard

### Monthly
- [ ] Update npm packages (test in staging)
- [ ] Review security updates
- [ ] Analyze usage metrics
- [ ] Optimize database queries if needed
- [ ] Review cost projections

### Quarterly
- [ ] Full security audit
- [ ] Performance optimization review
- [ ] Capacity planning
- [ ] Feature planning based on usage

## Troubleshooting Checklist

### OAuth Not Working
- [ ] Verify NEXTAUTH_SECRET is set and consistent
- [ ] Check NEXTAUTH_URL matches exactly
- [ ] Verify Google OAuth credentials
- [ ] Check redirect URLs in Google Cloud Console
- [ ] Review NextAuth logs for errors
- [ ] Clear browser cookies and retry

### Database Connection Issues
- [ ] Verify Supabase credentials
- [ ] Check firewall rules
- [ ] Verify connection string format
- [ ] Test connection from local machine
- [ ] Check Supabase status page

### Cron Jobs Not Running
- [ ] Verify CRON_SECRET matches
- [ ] Check Vercel crons dashboard
- [ ] Review cron job logs in Vercel
- [ ] Verify function timeout settings
- [ ] Check function memory allocation

### API Errors
- [ ] Check function logs in Vercel
- [ ] Verify environment variables set
- [ ] Check API quotas (Anthropic, Google, etc.)
- [ ] Review input validation
- [ ] Check error monitoring service

## Success Criteria

- [ ] Application loads without errors
- [ ] Google OAuth login works
- [ ] Message API responds with AI responses
- [ ] Cron jobs execute on schedule
- [ ] Database operations work correctly
- [ ] No sensitive data in logs or console
- [ ] Performance meets requirements
- [ ] All integrations functional

## Documentation

- [ ] Update README with production details
- [ ] Document API endpoints
- [ ] Create runbook for common tasks
- [ ] Document cron job schedules
- [ ] Create incident response procedures

---

**Status**: Ready for deployment
**Last Updated**: April 7, 2026
**Next Review**: After first production deployment
