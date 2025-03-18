// Test script for Resend email
import { sendVerificationEmail } from '../lib/resend';

async function testEmail() {
  console.log('Starting email test...');
  
  // Print the environment variables (without sensitive data)
  console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
  console.log('RESEND_API_KEY configured:', process.env.RESEND_API_KEY ? 'Yes' : 'No');
  
  // Test address - replace with your test email
  const testEmail = 'your-test-email@example.com';
  
  // Send a test email
  console.log(`Attempting to send test email to ${testEmail}...`);
  
  try {
    const result = await sendVerificationEmail(testEmail, '123456');
    
    if (result) {
      console.log('Email sent successfully!');
    } else {
      console.error('Failed to send email');
    }
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Run the test
testEmail().catch(console.error); 