# API Documentation

This document describes the database schema and API patterns used in Creator Connect.

## Database Schema

### Core Tables

#### `agencies`
Multi-tenant organization management
```sql
- id (UUID, Primary Key)
- name (TEXT, NOT NULL)
- description (TEXT)
- settings (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `profiles`
User profiles with notification preferences
```sql  
- id (UUID, Primary Key, References auth.users)
- first_name (TEXT)
- last_name (TEXT)
- email (TEXT)
- avatar_url (TEXT)
- email_notifications (BOOLEAN, DEFAULT true)
- campaign_alerts (BOOLEAN, DEFAULT true)
- weekly_reports (BOOLEAN, DEFAULT false)
- creator_updates (BOOLEAN, DEFAULT true)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `agency_members`
User-agency relationships and roles
```sql
- id (UUID, Primary Key)
- agency_id (UUID, References agencies)
- user_id (UUID, References profiles)
- role (TEXT, CHECK: 'admin' | 'member')
- invited_by (UUID, References profiles)
- created_at (TIMESTAMP)
```

#### `campaigns`
Campaign management and tracking
```sql
- id (UUID, Primary Key)
- agency_id (UUID, References agencies)
- name (TEXT, NOT NULL)
- description (TEXT)
- start_date (DATE)
- end_date (DATE)
- budget (DECIMAL)
- status (TEXT, CHECK: 'draft' | 'active' | 'paused' | 'completed')
- created_by (UUID, References profiles)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `creators`
Creator/influencer profiles
```sql
- id (UUID, Primary Key)
- agency_id (UUID, References agencies)
- name (TEXT, NOT NULL)
- email (TEXT)
- instagram_handle (TEXT)
- tiktok_handle (TEXT)
- youtube_handle (TEXT)
- phone (TEXT)
- location (TEXT)
- notes (TEXT)
- is_active (BOOLEAN, DEFAULT true)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `tasks`
Task management with assignments
```sql
- id (UUID, Primary Key)
- agency_id (UUID, References agencies)
- title (TEXT, NOT NULL)
- description (TEXT)
- completed (BOOLEAN, DEFAULT false)
- sort_order (INTEGER, DEFAULT 0)
- assigned_to (UUID, References profiles)
- due_date (DATE)
- created_by (UUID, References profiles)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `custom_events`
Calendar events and scheduling
```sql
- id (UUID, Primary Key)
- agency_id (UUID, References agencies)
- title (TEXT, NOT NULL)
- description (TEXT)
- start_date (TIMESTAMP, NOT NULL)
- end_date (TIMESTAMP, NOT NULL)
- location (TEXT)
- created_by (UUID, References profiles)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `notifications`
Real-time notification system
```sql
- id (UUID, Primary Key)
- user_id (UUID, References auth.users)
- agency_id (UUID, References agencies)
- type (TEXT, CHECK: notification types)
- title (TEXT, NOT NULL)
- message (TEXT, NOT NULL)
- data (JSONB)
- read (BOOLEAN, DEFAULT false)
- email_sent (BOOLEAN, DEFAULT false)
- email_sent_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Row Level Security (RLS)

All tables implement RLS policies to ensure data isolation:

- **Agency Scoping**: Users can only access data from their agencies
- **User Permissions**: Read/write permissions based on agency membership
- **Role-based Access**: Admin vs member permissions where applicable

### Notification Types

- `campaign_alert` - Campaign milestone notifications
- `creator_update` - Creator profile or status changes  
- `weekly_report` - Automated weekly summaries
- `email_notification` - General email alerts
- `task_assignment` - Task assignments and completions
- `custom_event` - Calendar event notifications

## API Patterns

### Data Fetching with React Query

```typescript
// Standard query pattern
const { data, isLoading, error } = useQuery({
  queryKey: ["resource", ...dependencies],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("table")
      .select("*")
      .eq("agency_id", agencyId);
    
    if (error) throw error;
    return data;
  },
  enabled: !!agencyId,
});
```

### Mutations with Optimistic Updates

```typescript
const updateMutation = useMutation({
  mutationFn: async (updates) => {
    const { data, error } = await supabase
      .from("table")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["resource"] });
  },
});
```

### Real-time Subscriptions

```typescript
useEffect(() => {
  const subscription = supabase
    .channel("table-changes")
    .on("postgres_changes", 
        { event: "*", schema: "public", table: "table" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["resource"] });
        }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}, []);
```

## Error Handling

### Standard Error Patterns

1. **Database Errors**: Handled by React Query error boundaries
2. **Validation Errors**: Client-side validation with toast notifications
3. **Permission Errors**: RLS policies return empty results or errors
4. **Network Errors**: Automatic retry with exponential backoff

### Toast Notification Standards

```typescript
// Success
toast.success("Action completed successfully");

// Error  
toast.error(`Failed to perform action: ${error.message}`);

// Info
toast.info("Informational message");

// Loading states handled by mutation pending states
```

## Performance Considerations

- **Pagination**: Implement for large datasets
- **Caching**: React Query handles automatic caching
- **Optimistic Updates**: For immediate UI feedback
- **Real-time**: Use judiciously to avoid excessive updates
- **Indexes**: Database indexes on frequently queried columns