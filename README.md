# Creator Connect - Agency Management Platform

A comprehensive platform for managing creator relationships, campaigns, and tasks across multiple agencies with real-time notifications and analytics.

## 🚀 Features

### 🏢 **Multi-Tenant Agency Management**
- Agency-based user organization and permissions
- Invitation system for team members
- Role-based access control (Admin/Member)

### 👥 **Creator Management**
- Creator profiles with contact information and social links
- Activity tracking and status management
- Creator discovery and relationship management

### 📋 **Task Management**
- Simplified task creation and assignment
- Real-time task updates and completion tracking
- Task prioritization with drag-and-drop reordering

### 📅 **Campaign & Event Tracking**
- Campaign lifecycle management with status tracking
- Custom calendar events for ad-hoc activities
- Email sharing integration with Google Calendar
- Campaign analytics and performance metrics

### 🔔 **Real-Time Notifications**
- Task assignment and completion alerts
- Campaign milestone notifications
- Customizable notification preferences
- In-app notification center with unread counts

### 📊 **Analytics & Reporting**
- Revenue and performance charts
- Campaign success metrics
- Activity dashboards and insights
- Data visualization with interactive charts

### ⚙️ **User Experience**
- Responsive design for all devices
- Dark/light theme support
- Global search functionality
- Intuitive navigation and workflows

## 🛠️ Tech Stack

### **Frontend**
- **React 18** with TypeScript for type-safe development
- **Vite** for fast development and optimized builds
- **TanStack Query** for state management and caching
- **Shadcn/UI** for consistent, accessible components
- **Tailwind CSS** for responsive styling
- **Recharts** for data visualization

### **Backend & Database**
- **Supabase** for backend-as-a-service
- **PostgreSQL** with Row Level Security (RLS)
- **Real-time subscriptions** for live updates
- **Email integration** for notifications and sharing

### **Development Tools**
- **TypeScript** for type safety
- **ESLint** for code quality
- **PostCSS** for CSS processing
- **Git** for version control

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Git for version control

### Local Development

```bash
# Clone the repository
git clone https://github.com/LA-Edit-app/creator-connect-decfcd47.git
cd creator-connect-decfcd47

# Install dependencies
npm install

# Start development server
npm run dev

# Open your browser to http://localhost:5173
```

### Environment Configuration

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🗄️ Database Schema

### Core Tables
- **agencies** - Multi-tenant organization management
- **profiles** - User profiles with notification preferences  
- **agency_members** - User-agency relationships and roles
- **campaigns** - Campaign management and tracking
- **creators** - Creator/influencer profiles and data
- **tasks** - Task management with assignments
- **custom_events** - Calendar events and scheduling
- **notifications** - Real-time notification system

### Key Features
- **Row Level Security** for data isolation
- **Real-time subscriptions** for live updates
- **Automated triggers** for notification creation
- **JSONB fields** for flexible data storage

## 🚢 Deployment

### Vercel (Recommended)
```bash
# Build the project
npm run build

# Deploy to Vercel
npx vercel --prod
```

### Manual Deployment
```bash
# Create production build
npm run build

# Serve the dist/ folder using your preferred static hosting
```

## 📖 User Guide

### Getting Started
1. **Sign up** for an account or accept an agency invitation
2. **Complete your profile** in Settings
3. **Explore the dashboard** to see overview metrics
4. **Create tasks** and assign them to team members
5. **Add campaigns** to track your marketing efforts
6. **Set up notifications** to stay informed

### Key Workflows
- **Task Management**: Create, assign, and track task completion
- **Campaign Tracking**: Monitor campaign progress and performance
- **Team Collaboration**: Invite members and manage permissions
- **Analytics**: Review performance metrics and insights

## 🔧 Development Guide

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Shadcn)
│   ├── layout/         # Layout components
│   └── debug/          # Development utilities
├── hooks/              # Custom React hooks
├── pages/              # Page components and routing
├── lib/                # Utility functions
├── context/            # React context providers
└── integrations/       # External service integrations
    └── supabase/       # Database types and client
```

### Code Standards
- **TypeScript** for all new code
- **React Query** for data fetching and caching
- **Shadcn/UI** components for consistency
- **Tailwind CSS** for styling
- **ESLint** configuration for code quality

### Database Migrations
```bash
# Add new migration
supabase migration new migration_name

# Apply migrations locally
supabase db reset

# Push to production
# (Handled automatically via Supabase dashboard)
```

## 🤝 Contributing

### Development Process
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

### Commit Guidelines
- Use conventional commit messages
- Include descriptive summaries
- Reference issue numbers when applicable

## 📄 License

This project is proprietary software owned by LA-Edit-app.

## 🆘 Support

For technical support or questions:
- Create an issue in the GitHub repository
- Contact the development team
- Review the documentation and user guides

---

**Built with ❤️ using React, TypeScript, and Supabase**
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
