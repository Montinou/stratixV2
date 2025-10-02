/**
 * Test Brevo API Configuration
 *
 * This script tests the Brevo API connection and sender configuration
 */

import 'dotenv/config';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;

async function testBrevoAPI() {
  console.log('🧪 Testing Brevo API Configuration...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`  BREVO_API_KEY: ${BREVO_API_KEY ? '✅ Present' : '❌ Missing'}`);
  console.log(`  BREVO_SENDER_EMAIL: ${BREVO_SENDER_EMAIL || '❌ Missing'}`);
  console.log(`  BREVO_SENDER_NAME: ${process.env.BREVO_SENDER_NAME || '❌ Missing'}\n`);

  if (!BREVO_API_KEY) {
    console.error('❌ BREVO_API_KEY is not set');
    process.exit(1);
  }

  try {
    // Test 1: Get Account Information
    console.log('🔍 Test 1: Checking Account Information...');
    const accountResponse = await fetch('https://api.brevo.com/v3/account', {
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!accountResponse.ok) {
      const error = await accountResponse.json();
      throw new Error(`Account check failed (${accountResponse.status}): ${JSON.stringify(error)}`);
    }

    const accountData = await accountResponse.json();
    console.log('✅ Account Information:');
    console.log(`  Company Name: ${accountData.companyName || 'N/A'}`);
    console.log(`  Email: ${accountData.email || 'N/A'}`);
    console.log(`  Plan: ${accountData.plan?.type || 'N/A'}`);
    console.log(`  Credits: ${accountData.plan?.credits || 'N/A'}`);
    console.log(`  Credits Used: ${accountData.plan?.creditsUsed || 'N/A'}\n`);

    // Test 2: Get Senders
    console.log('🔍 Test 2: Checking Configured Senders...');
    const sendersResponse = await fetch('https://api.brevo.com/v3/senders', {
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!sendersResponse.ok) {
      const error = await sendersResponse.json();
      throw new Error(`Senders check failed (${sendersResponse.status}): ${JSON.stringify(error)}`);
    }

    const sendersData = await sendersResponse.json();
    console.log('✅ Configured Senders:');

    if (sendersData.senders && sendersData.senders.length > 0) {
      sendersData.senders.forEach((sender: any) => {
        console.log(`  - ${sender.email} (${sender.name})`);
        console.log(`    Active: ${sender.active ? '✅ Yes' : '❌ No'}`);
        console.log(`    Verified: ${sender.verified ? '✅ Yes' : '⚠️ No (verify to send emails)'}`);
      });

      // Check if configured sender exists
      if (BREVO_SENDER_EMAIL) {
        const senderExists = sendersData.senders.find((s: any) =>
          s.email.toLowerCase() === BREVO_SENDER_EMAIL.toLowerCase()
        );

        if (senderExists) {
          console.log(`\n✅ Configured sender (${BREVO_SENDER_EMAIL}) found and ${senderExists.verified ? 'verified' : 'NOT verified'}`);
          if (!senderExists.verified) {
            console.log('⚠️  WARNING: Sender email is not verified. Emails may not be delivered.');
            console.log('   Please verify your sender email in Brevo dashboard.');
          }
        } else {
          console.log(`\n⚠️  WARNING: Configured sender (${BREVO_SENDER_EMAIL}) not found in Brevo`);
          console.log('   You need to add and verify this sender in your Brevo account.');
        }
      }
    } else {
      console.log('  ⚠️ No senders configured');
    }

    console.log('\n✅ Brevo API is properly configured and working!');
    console.log('\n📝 Next Steps:');
    console.log('  1. Ensure your sender email is verified in Brevo');
    console.log('  2. Test sending an invitation from the admin panel');
    console.log('  3. Check Brevo logs if emails fail to send\n');

  } catch (error) {
    console.error('\n❌ Error testing Brevo API:');
    if (error instanceof Error) {
      console.error(`   ${error.message}\n`);

      if (error.message.includes('401')) {
        console.error('   🔑 API Key is invalid or unauthorized');
        console.error('   Please check your BREVO_API_KEY in .env file');
      } else if (error.message.includes('403')) {
        console.error('   🚫 API Key does not have required permissions');
        console.error('   Ensure your API key has "Transactional emails" permission');
      }
    } else {
      console.error('   Unknown error occurred');
    }
    process.exit(1);
  }
}

// Run the test
testBrevoAPI();
