# Stack Auth Configuration Guide

## Problem
Users are getting "REDIRECT_URL_NOT_WHITELISTED" error when trying to sign in.

## Solution

### 1. Access Stack Auth Dashboard
Go to your Stack Auth dashboard at: https://app.stack-auth.com/

### 2. Add Trusted Domains
In your Stack Auth project settings, add the following domains to the trusted/whitelisted domains list:

**Development:**
- `http://localhost:3000`
- `http://localhost:3001`

**Production:**
- `https://www.ai-innovation.site`
- `https://ai-innovation.site`
- `https://*.vercel.app` (for preview deployments)

### 3. OAuth Provider Configuration
For each OAuth provider (Google, GitHub, etc.), ensure the redirect URLs include:
- `http://localhost:3000/handler/[...stack]`
- `https://www.ai-innovation.site/handler/[...stack]`

### 4. Environment Variables
Ensure these are set in your `.env.local`:
```
NEXT_PUBLIC_STACK_PROJECT_ID=your-project-id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your-publishable-key
STACK_SECRET_SERVER_KEY=your-secret-key
```

### 5. Open Registration Settings
In Stack Auth dashboard:
1. Go to Project Settings
2. Under "Authentication", ensure:
   - "Allow new user registration" is enabled
   - "Email verification" is optional (if you want immediate access)
   - "Allow users to create organizations" is enabled

### 6. Organization Creation
The app is already configured to allow users to create their own organizations through the onboarding flow at `/onboarding/create`.

## Testing
After configuration:
1. Clear browser cookies
2. Navigate to http://localhost:3000/tools/okr
3. Click "Sign In"
4. Register a new account
5. Complete the organization creation flow

## Notes
- The redirect URL error is a security feature of Stack Auth
- Each deployment environment needs to be whitelisted
- Users can self-register and create organizations once domains are whitelisted