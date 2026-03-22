# Contributing Guidelines

Thank you for your interest in contributing to Creator Connect! This document provides guidelines and best practices for contributing to the project.

## 🚀 Getting Started

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/creator-connect-decfcd47.git
   cd creator-connect-decfcd47
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write code following our standards
   - Add tests where applicable
   - Update documentation if needed

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create pull request on GitHub
   ```

## 📋 Code Standards

### TypeScript Guidelines

- **Use TypeScript** for all new code
- **Define proper types** instead of using `any`
- **Import types explicitly** when needed
- **Use interface over type** for object shapes

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

// ❌ Avoid
const user: any = { ... };
```

### React Patterns

- **Use functional components** with hooks
- **Custom hooks** for reusable logic
- **Proper dependency arrays** in useEffect
- **Error boundaries** for error handling

```typescript
// ✅ Good - Custom hook
export const useUserData = (userId: string) => {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetchUser(userId),
    enabled: !!userId,
  });
};

// ✅ Good - Component
export function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading } = useUserData(userId);
  
  if (isLoading) return <Skeleton />;
  return <div>{user?.name}</div>;
}
```

### State Management

- **React Query** for server state
- **localStorage** for client-side persistence
- **React state** for local component state
- **Context** sparingly for shared state

### Styling Guidelines

- **Tailwind CSS** for all styling
- **Shadcn/UI components** for consistency
- **Responsive design** mobile-first approach
- **Dark mode support** using CSS variables

```typescript
// ✅ Good
<div className="flex items-center gap-4 p-6 bg-card rounded-lg border">
  <Button variant="outline" size="sm">Action</Button>
</div>
```

### Database Patterns

- **Row Level Security** for all tables
- **Proper foreign keys** and constraints
- **Indexes** for performance-critical queries
- **Migration files** for schema changes

```sql
-- ✅ Good migration pattern
-- 001_add_feature.sql
CREATE TABLE IF NOT EXISTS feature_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE feature_table ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Agency members can view" ON feature_table
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_members 
      WHERE agency_id = feature_table.agency_id 
      AND user_id = auth.uid()
    )
  );
```

## 🧪 Testing Guidelines

### Component Testing

- **Test user interactions** not implementation details
- **Mock external dependencies** appropriately
- **Use React Testing Library** patterns

```typescript
// ✅ Good test
test("should display user name when loaded", async () => {
  render(<UserProfile userId="123" />);
  
  expect(screen.getByTestId("loading")).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });
});
```

### Integration Testing

- **Test complete user workflows**
- **Database interactions** with test data
- **API endpoints** and error states

## 📝 Commit Message Guidelines

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope?): description

[optional body]

[optional footer(s)]
```

### Types
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Build process or auxiliary tool changes

### Examples
```
feat(notifications): add real-time notification system

- Implement notification center UI component
- Add database schema for notifications
- Create notification preference settings
- Add real-time updates with React Query

Closes #123
```

## 🔍 Code Review Guidelines

### For Authors

- **Small, focused PRs** are easier to review
- **Clear descriptions** of what and why
- **Self-review** before requesting review
- **Update documentation** if needed

### For Reviewers

- **Be constructive** and helpful
- **Focus on code quality** and standards
- **Consider performance** and security
- **Test the changes** locally when possible

### Review Checklist

- [ ] Code follows project standards
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No console errors or warnings
- [ ] Responsive design works
- [ ] Database migrations are proper
- [ ] Security considerations addressed

## 🐛 Bug Reports and Feature Requests

### Bug Reports

Include:
- **Clear description** of the issue
- **Steps to reproduce** the bug
- **Expected vs actual** behavior
- **Screenshots** if applicable
- **Environment details** (browser, OS, etc.)

### Feature Requests

Include:
- **Clear use case** and user story
- **Expected behavior** and designs
- **Technical considerations** if known
- **Priority and impact** assessment

## 🔒 Security Guidelines

### Data Handling

- **Never expose** sensitive data in logs
- **Validate all inputs** on client and server
- **Use parameterized queries** to prevent injection
- **Implement proper authentication** checks

### Row Level Security

- **Every table** must have RLS enabled
- **Policies must be tested** thoroughly  
- **Agency isolation** must be maintained
- **User permissions** must be validated

## 📚 Documentation Standards

### Code Comments

- **Explain why** not what the code does
- **Document complex logic** and algorithms
- **Use JSDoc** for functions and components
- **Keep comments up-to-date** with code changes

### README Updates

- **Feature additions** need documentation
- **API changes** require documentation updates
- **Setup instructions** must be current
- **Examples should be working** and tested

## 🚀 Release Process

### Version Numbering

Following [Semantic Versioning](https://semver.org/):
- **Major**: Breaking API changes
- **Minor**: New features, backwards compatible
- **Patch**: Bug fixes, backwards compatible

### Release Checklist

1. Update version numbers
2. Update CHANGELOG.md
3. Test all features thoroughly
4. Deploy to staging environment
5. Get stakeholder approval
6. Deploy to production
7. Tag release in Git
8. Update documentation

## 🤝 Community Guidelines

### Communication

- **Be respectful** and professional
- **Help others** learn and grow
- **Ask questions** when unclear
- **Share knowledge** and best practices

### Collaboration

- **Credit contributors** appropriately
- **Review PRs promptly** 
- **Provide constructive feedback**
- **Celebrate achievements** and milestones

---

Thank you for contributing to Creator Connect! 🎉