# Stack Auth Configuration Guide

## Fixing "REDIRECT_URL_NOT_WHITELISTED" Error

This error occurs when Stack Auth's security feature blocks redirects to domains not in its whitelist. Here's how to fix it:

### Option 1: Add Domain to Stack Auth Dashboard (Recommended)

1. Go to your Stack Auth dashboard: https://app.stack-auth.com
2. Navigate to your project settings
3. Find the "Trusted Domains" or "Allowed Redirect URLs" section
4. Add your domains:
   - `http://localhost:3001` (for local development)
   - `https://your-production-domain.com` (for production)
   - Any other domains you're using

### Option 2: Use Environment Variable (Quick Fix)

Set the `NEXT_PUBLIC_APP_URL` in your `.env.local` file:

```bash
# For local development
NEXT_PUBLIC_APP_URL=http://localhost:3001

# For production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Option 3: Dynamic URL Detection (Already Implemented)

The code has been updated to dynamically detect the current domain:

- `stack/client.tsx` - Uses `window.location.origin` for dynamic detection
- `stack/server.tsx` - Uses environment variables or defaults
- `lib/stack-auth-utils.ts` - Helper functions for dynamic URL handling

### How It Works Now

1. **Client-side**: Automatically detects the current browser's origin
2. **Server-side**: Uses `NEXT_PUBLIC_APP_URL` or defaults
3. **Fallback**: Uses predefined URLs if detection fails

### Testing the Fix

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Clear your browser cookies for the domain

3. Try signing in/up again

### Common Issues

- **Still getting the error?** Make sure to:
  - Clear browser cache and cookies
  - Restart the development server
  - Check that Stack Auth project ID and keys are correct
  - Verify the domain is added to Stack Auth dashboard

- **Different port?** Update the URLs accordingly:
  ```bash
  NEXT_PUBLIC_APP_URL=http://localhost:YOUR_PORT
  ```

### Production Deployment

For production, always:
1. Add your production domain to Stack Auth dashboard
2. Set `NEXT_PUBLIC_APP_URL` in your production environment variables
3. Ensure SSL/HTTPS is properly configured