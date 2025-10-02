/**
 * Test Sending Invitation Email via Brevo
 */

import 'dotenv/config';
import { sendInvitationEmail } from '../lib/services/brevo/email-sender';

async function testSendInvitation() {
  console.log('🧪 Testing Brevo Invitation Email Sending...\n');

  // Test parameters
  const testEmail = 'test@example.com'; // Change this to your actual email to receive the test
  const testParams = {
    to: testEmail,
    toName: 'Test User',
    organizationName: 'Stratix Demo Organization',
    organizationSlug: 'stratix-demo',
    role: 'empleado' as const,
    inviterName: 'Admin User',
    inviterEmail: 'admin@ai-innovation.site',
    invitationToken: 'test-token-' + Date.now(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  };

  console.log('📋 Test Parameters:');
  console.log(`  Recipient: ${testParams.to}`);
  console.log(`  Organization: ${testParams.organizationName}`);
  console.log(`  Role: ${testParams.role}`);
  console.log(`  Inviter: ${testParams.inviterName}`);
  console.log(`  Expires: ${testParams.expiresAt.toISOString()}\n`);

  try {
    console.log('📧 Sending invitation email...');
    const result = await sendInvitationEmail(testParams);

    console.log('\n✅ Email sent successfully!');
    console.log(`📬 Message ID: ${result.messageId}`);
    console.log(`\n🎯 Check your inbox at: ${testEmail}`);
    console.log('📝 Note: Check spam folder if not in inbox\n');
  } catch (error) {
    console.error('\n❌ Failed to send email:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      console.error('\n Stack trace:');
      console.error(error.stack);
    } else {
      console.error('   Unknown error occurred');
    }
    process.exit(1);
  }
}

// Run the test
testSendInvitation();
