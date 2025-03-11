import { Twilio } from 'twilio';

// Initialize the Twilio client with environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID || 'VA792e2b8967bcdb86b4580ef0544352e1';

// For testing: Use Twilio's test credentials if in development
const isTestMode = process.env.NODE_ENV === 'development';

// Check if required environment variables are set
if (!isTestMode && (!accountSid || !authToken)) {
  console.warn('Twilio environment variables are missing. SMS functionality will not work properly.');
}

// Create the Twilio client
let twilioClient: Twilio | null = null;

// Initialize with production credentials
try {
  if (accountSid && authToken) {
    twilioClient = new Twilio(accountSid, authToken);
    console.log('Initialized Twilio client');
  }
} catch (error) {
  console.error('Failed to initialize Twilio client:', error);
}

/**
 * Sends an SMS verification code using Twilio Verify
 * @param to Recipient phone number (E.164 format)
 * @returns Promise resolving to success boolean
 */
export async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!twilioClient) {
    console.log(`[TWILIO NOT CONFIGURED] Would send to ${to}: ${message}`);
    return false;
  }

  try {
    // Format the phone number to E.164
    const formattedNumber = formatToE164(to);
    
    console.log('Sending verification code to:', formattedNumber);

    // Send verification code using Twilio Verify
    const verification = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verifications
      .create({ to: formattedNumber, channel: 'sms' });

    console.log(`Verification status: ${verification.status}`);
    return true;
  } catch (error) {
    console.error('Error sending verification:', error);
    
    // Log detailed error for debugging
    if (error && typeof error === 'object' && 'code' in error) {
      const twilioError = error as any;
      console.error(`Twilio Error Code: ${twilioError.code}, Status: ${twilioError.status}`);
      
      switch(twilioError.code) {
        case 60200:
          console.error('Invalid parameter. Check phone number format.');
          break;
        case 60203:
          console.error('Max send attempts reached. Try again later.');
          break;
        case 60212:
          console.error('Invalid phone number.');
          break;
        default:
          console.error('Verification error:', twilioError.message);
      }
    }
    
    return false;
  }
}

/**
 * Verify the code sent to a phone number
 * @param to Phone number that received the code
 * @param code The verification code to check
 * @returns Promise resolving to success boolean
 */
export async function verifyCode(to: string, code: string): Promise<boolean> {
  if (!twilioClient) {
    console.log(`[TWILIO NOT CONFIGURED] Would verify code for ${to}`);
    return false;
  }

  try {
    const formattedNumber = formatToE164(to);
    
    const verificationCheck = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verificationChecks
      .create({ to: formattedNumber, code });

    return verificationCheck.status === 'approved';
  } catch (error) {
    console.error('Error verifying code:', error);
    return false;
  }
}

/**
 * Formats a phone number to E.164 format required by Twilio
 * @param phoneNumber Phone number to format
 * @returns E.164 formatted phone number
 */
function formatToE164(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters except plus
  let digitsOnly = phoneNumber.replace(/[^\d+]/g, '');
  
  // If there's no plus, assume it's a US number
  if (!digitsOnly.startsWith('+')) {
    // If it's a 10-digit US number, add +1
    if (digitsOnly.length === 10) {
      digitsOnly = '+1' + digitsOnly;
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      // If it's an 11-digit number starting with 1, add +
      digitsOnly = '+' + digitsOnly;
    } else {
      // For any other number, just add +
      digitsOnly = '+' + digitsOnly;
    }
  }
  
  return digitsOnly;
} 