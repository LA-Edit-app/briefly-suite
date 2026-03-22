# Deployment Guide

This guide covers deploying Creator Connect to various hosting platforms with production-ready configurations.

## 🚀 Quick Deploy (Recommended)

### Vercel (Fastest Setup)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FLA-Edit-app%2Fcreator-connect-decfcd47)

**One-Click Deployment:**
1. Click the deploy button above
2. Connect your GitHub account
3. Configure environment variables (see below)
4. Deploy automatically

**Manual Vercel Deployment:**
```bash
# Install Vercel CLI
npm install -g vercel

# Build and deploy
npm run build
vercel --prod

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

## 🔧 Environment Configuration

### Required Environment Variables

Create a `.env.production` file or configure in your hosting platform:

```bash
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional - Analytics
VITE_ANALYTICS_ID=your-analytics-id

# Optional - Error Tracking  
VITE_SENTRY_DSN=your-sentry-dsn
```

### Getting Supabase Credentials

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Wait for setup completion

2. **Get Credentials**
   - Go to Settings → API
   - Copy Project URL and anon public key
   - Add to environment variables

3. **Database Setup**
   - Run migrations (see Database Setup section)
   - Configure Row Level Security
   - Set up authentication

## 🗄️ Database Setup

### Supabase Migration Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase (if needed)
supabase init

# Link to your project
supabase link --project-ref your-project-id

# Push database schema
supabase db push

# Or apply individual migrations
supabase migration up
```

### Manual Migration (Production)

If you can't use Supabase CLI, manually run these migrations in order:

1. **001_initial_schema.sql** - Basic tables
2. **002_seed_data.sql** - Initial data  
3. **003_local_schema.sql** - Local development schema
4. **004_tasks.sql** - Task management
5. **005_seed_tasks.sql** - Task seed data
6. **006_tasks_ordering.sql** - Task ordering
7. **007_campaign_completion_status.sql** - Campaign status
8. **008_campaign_status.sql** - Enhanced campaign status
9. **009_tasks_relations.sql** - Task relationships
10. **010_creators_is_active.sql** - Creator status
11. **011_agencies.sql** - Multi-tenancy
12. **012_multitenancy.sql** - Multi-tenant setup
13. **013_backfill_agencies.sql** - Agency data migration
14. **014_backfill_records_demo_agency.sql** - Demo data
15. **015_link_demo_user.sql** - Demo user setup
16. **016_agency_members.sql** - Agency membership
17. **017_fix_agency_members_fk.sql** - Foreign key fixes
18. **018_tasks_assignee.sql** - Task assignment
19. **019_fix_agency_members_fk_deferrable.sql** - FK improvements
20. **020_demo_member_user.sql** - Demo member setup
21. **021_agency_invitations.sql** - Invitation system
22. **022_agency_column_schemas.sql** - Schema management
23. **024_notification_preferences.sql** - Notification settings
24. **025_notifications_table.sql** - Notification system
25. **026_fix_notifications_delete_policy.sql** - Permission fixes

### Row Level Security Setup

Ensure RLS is enabled on all tables:
```sql
-- Enable RLS on all tables
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;  
ALTER TABLE agency_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

## 🌐 Alternative Hosting Platforms

### Netlify

```bash
# Build command
npm run build

# Publish directory 
dist

# Environment variables (in Netlify dashboard)
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key
```

**Netlify Configuration** (`netlify.toml`):
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### AWS S3 + CloudFront

```bash
# Build the application
npm run build

# Install AWS CLI
aws configure

# Create S3 bucket
aws s3 mb s3://your-app-bucket

# Upload files
aws s3 sync dist/ s3://your-app-bucket --delete

# Set up CloudFront distribution
# Configure custom domain and SSL
```

### DigitalOcean App Platform

```yaml
# .do/app.yaml
name: creator-connect
services:
- name: web
  source_dir: /
  github:
    repo: LA-Edit-app/creator-connect-decfcd47
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: VITE_SUPABASE_URL
    value: your-supabase-url
  - key: VITE_SUPABASE_ANON_KEY  
    value: your-anon-key
  build_command: npm run build
  source_dir: /
```

## 🔒 Production Security Checklist

### Database Security

- [ ] **RLS Policies** - All tables have proper RLS policies
- [ ] **API Keys** - Use environment-specific keys
- [ ] **User Authentication** - Auth flows are working
- [ ] **Data Validation** - Input sanitization in place
- [ ] **Backup Strategy** - Regular database backups configured

### Application Security

- [ ] **HTTPS Only** - SSL certificate configured
- [ ] **Environment Variables** - Sensitive data not in code
- [ ] **Error Handling** - No sensitive data in error messages
- [ ] **Rate Limiting** - API rate limits configured
- [ ] **Content Security Policy** - CSP headers configured

### Monitoring Setup

- [ ] **Error Tracking** - Sentry or similar configured
- [ ] **Analytics** - Google Analytics or alternative
- [ ] **Performance Monitoring** - Core Web Vitals tracking
- [ ] **Uptime Monitoring** - Health checks in place
- [ ] **Log Aggregation** - Centralized logging setup

## 📊 Performance Optimization

### Build Optimization

```bash
# Optimize bundle size
npm run build -- --analyze

# Enable compression
npm install --save-dev vite-plugin-compression
```

**Vite Configuration** (`vite.config.ts`):
```typescript
import compression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    compression() // Enable gzip compression
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dropdown-menu', '@radix-ui/react-dialog'],
          charts: ['recharts']
        }
      }
    }
  }
});
```

### CDN Configuration

- **Static Assets**: Serve from CDN (images, fonts)
- **Cache Headers**: Configure proper cache headers
- **Compression**: Enable gzip/brotli compression
- **Minification**: Ensure CSS/JS minification

## 🔧 Health Checks and Monitoring

### Application Health Check

Create a health endpoint for monitoring:

```typescript
// Add to your routing
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});
```

### Database Health Check  

```sql
-- Simple health check query
SELECT 1 as healthy, NOW() as timestamp;
```

### Monitoring Checklist

- [ ] **Application Health** - /health endpoint responding
- [ ] **Database Connectivity** - Database queries working  
- [ ] **Authentication** - Login/logout flows working
- [ ] **Core Features** - Task creation, notifications working
- [ ] **Performance** - Page load times under 3s
- [ ] **Error Rates** - Error rates under 1%

## 🚨 Troubleshooting

### Common Issues

**Build Fails:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Environment Variables Not Loading:**
- Check variable names start with `VITE_`
- Verify variables are set in hosting platform
- Restart application after changes

**Database Connection Issues:**
- Verify Supabase URL and key are correct
- Check database is accessible from hosting platform
- Ensure RLS policies allow access

**Performance Issues:**
- Enable compression in hosting platform
- Optimize images and assets
- Configure CDN for static assets
- Check database query performance

### Support Resources

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)  
- **React Query Docs**: [tanstack.com/query](https://tanstack.com/query)
- **Tailwind Docs**: [tailwindcss.com/docs](https://tailwindcss.com/docs)

---

## 📞 Production Support

For production deployment support:
1. Check this documentation first
2. Review error logs and monitoring
3. Create detailed issue report
4. Contact development team if needed

**Emergency Contacts:**
- Technical Lead: [contact information]
- DevOps Team: [contact information]  
- Database Admin: [contact information]