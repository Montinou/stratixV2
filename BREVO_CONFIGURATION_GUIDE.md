# Brevo Configuration Guide

## 🚨 Current Issue

**IP Authorization Required:** ⚠️ IP NOT WHITELISTED

Your current IP address `2803:9800:b897:7db8:acd0:f868:97ab:6de2` is not authorized in Brevo.

**Quick Fix:** Add this IP to authorized IPs at https://app.brevo.com/security/authorised_ips

The **whitelist system still works** - users can still join if they register independently.

---

## ✅ Brevo MCP Server Configured

The Brevo MCP server has been successfully added to Claude Code using `@richardbaxterseo/brevo-mcp-server`.

You can verify it with:
```bash
claude mcp list
```

---

## ✅ Fix: Authorize IP Address

### Step 0: Add Your IP to Brevo (REQUIRED)

1. Go to https://app.brevo.com/security/authorised_ips
2. Click **Add IP Address**
3. Add: `2803:9800:b897:7db8:acd0:f868:97ab:6de2`
4. Optional: Add name like "Development Machine"
5. Click **Save**

---

## ✅ Fix: Verify Sender Email

### Step 1: Log into Brevo

1. Go to https://app.brevo.com/
2. Sign in with your account credentials

### Step 2: Create New API Key

1. Click on your name (top right) → **SMTP & API**
2. Go to **API Keys** tab
3. Click **Generate a new API key**
4. Give it a name: `StratixV2 Production`
5. **IMPORTANT:** Select permissions:
   - ✅ **Transactional emails** (required for sending invitations)
   - Optional: Email campaigns, Contacts, etc.
6. Click **Generate**
7. **Copy the key immediately** (you won't be able to see it again)

### Step 3: Update .env File

Replace the current API key in `.env`:

```bash
# Example format
BREVO_API_KEY="xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxx"
```

### Step 1: Verify Sender Email

1. In Brevo dashboard, go to **Settings** → **Senders & IP**
2. Check if `noreply@ai-innovation.site` is listed
3. If NOT listed:
   - Click **Add a Sender**
   - Enter email: `noreply@ai-innovation.site`
   - Enter name: `AI Innovation Platform`
   - Click **Save**
4. **Verify the email:**
   - Brevo will send a verification email to the domain admin
   - Click the link in that email
   - Status should change to ✅ **Verified**

### Step 5: Test Configuration

Run the test script:

```bash
npx tsx scripts/test-brevo.ts
```

Expected output:
```
✅ Account Information:
  Company Name: Your Company
  Email: your@email.com
  Plan: Free/Pro/etc
  Credits: Available

✅ Configured Senders:
  - consultant@ai-innovation.cloud (AI Innovation Platform)
    Active: ✅ Yes
    Verified: ✅ Yes

✅ Brevo API is properly configured and working!
```

### Step 6: Test Sending Invitation

1. Go to https://ai-innovation.site/tools/admin
2. Enter an email address to invite
3. Select role (Employee, Manager, etc.)
4. Click **Send Invitations**
5. Should see: "✅ 1 invitation(s) sent successfully"

---

## Environment Variables Reference

Your `.env` file should have these Brevo variables:

```bash
# Required
BREVO_API_KEY="xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxx"  # Current API key
BREVO_SENDER_EMAIL="noreply@ai-innovation.site"         # Must be verified in Brevo
BREVO_SENDER_NAME="AI Innovation Platform"              # Display name for emails

# Optional (for SMTP, not used by current implementation)
BREVO_SMTP_LOGIN="943e42001@smtp-brevo.com"
BREVO_SERVER_URL="smtp-relay.brevo.com"
BREVO_PORT="587"
BREVO_SECRET_KEY="YmhJV3qzKZPx9SsG"
```

**Note:** The application uses Brevo's REST API, not SMTP. Only the first 3 variables are needed.

---

## Common Issues & Solutions

### Issue 1: "API Key is not enabled"

**Cause:** API key is invalid, expired, or disabled

**Solution:**
1. Generate new API key in Brevo dashboard
2. Update `.env` file
3. Restart development server

### Issue 2: "Sender email not verified"

**Cause:** Email address not verified in Brevo

**Solution:**
1. Go to Brevo → Senders & IP
2. Add sender email if not listed
3. Click verification link sent to that email
4. Wait for status to show "Verified"

### Issue 3: "400 Bad Request" when sending

**Causes:**
- API key doesn't have "Transactional emails" permission
- Sender email not verified
- Daily sending limit reached (Free plan: 300/day)

**Solution:**
1. Check API key permissions
2. Verify sender email
3. Check account limits in Brevo dashboard

### Issue 4: Emails not arriving

**Causes:**
- Recipient's spam filter
- Sender email not verified
- Domain not authenticated

**Solution:**
1. Check spam folder
2. Verify sender email
3. Set up SPF/DKIM records (optional, improves deliverability)

---

## Brevo Account Plans

| Plan | Daily Limit | Features |
|------|-------------|----------|
| **Free** | 300 emails/day | Basic transactional emails |
| **Lite** | 10,000/day | No daily limit, better support |
| **Premium** | Unlimited | Advanced features, dedicated IP |

**Current Usage:** Check in Brevo dashboard → Account → Plan

---

## Alternative: Use Different Email Service

If Brevo doesn't work for you, the application can be adapted to use:

- **SendGrid**
- **Amazon SES**
- **Mailgun**
- **Postmark**
- **Resend**

The Brevo client (`lib/services/brevo/client.ts`) would need to be replaced with the alternative service's SDK.

---

## Remember: Whitelist Still Works!

Even if email sending fails, the **whitelist/invitation system still functions**:

1. Admin creates invitation (whitelist entry saved to database)
2. Email may fail ❌
3. User signs up independently ✅
4. System detects whitelist entry ✅
5. User automatically joins with assigned role ✅

So email delivery is a **nice-to-have**, not a requirement for the invitation/whitelist system.

---

## Next Steps

1. **Get new Brevo API key** (top priority)
2. **Verify sender email** in Brevo
3. **Test with script:** `npx tsx scripts/test-brevo.ts`
4. **Send test invitation** from admin panel
5. **Check Brevo logs** if issues persist

---

## Support

If you continue having issues:

1. Check Brevo status: https://status.brevo.com/
2. Brevo documentation: https://developers.brevo.com/
3. Brevo support: https://help.brevo.com/

---

**Last Updated:** 2025-10-01
**Status:** ⚠️ API Key Not Working - Needs Replacement
