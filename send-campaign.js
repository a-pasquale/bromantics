#!/usr/bin/env node

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Function to load last send settings
function loadLastSendSettings() {
  const settingsPath = path.join(__dirname, '.last-send-settings.json');
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('Could not load last send settings:', error.message);
  }
  return null;
}

// Function to save send settings
function saveSendSettings(settings) {
  const settingsPath = path.join(__dirname, '.last-send-settings.json');
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.warn('Could not save send settings:', error.message);
  }
}

// Enhanced question function with default from last settings
async function questionWithDefault(prompt, defaultValue) {
  const fullPrompt = defaultValue ? `${prompt} (default: ${defaultValue}): ` : `${prompt}: `;
  const answer = await question(fullPrompt);
  return answer || defaultValue || '';
}

async function sendCampaign(apiKey, campaignName, subject, htmlContent, listId, senderName, senderEmail) {
  const url = 'https://api.brevo.com/v3/emailCampaigns';
  
  const campaignData = {
    name: campaignName,
    subject: subject,
    type: 'classic',
    htmlContent: htmlContent,
    sender: {
      name: senderName,
      email: senderEmail
    },
    recipients: {
      listIds: [parseInt(listId)]
    },
    inlineImageActivation: false,
    mirrorActive: false,
    recurring: false,
    footer: 'This email was sent to {EMAIL}. If you no longer wish to receive these emails, you can unsubscribe at any time.',
    utmCampaign: campaignName.toLowerCase().replace(/\s+/g, '-'),
    replyTo: senderEmail,
    toField: '{% if contact.FIRSTNAME %}{{ contact.FIRSTNAME }} {{ contact.LASTNAME }}{% else %}Fellow Bromaniac{% endif %}',
    abTesting: false
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(campaignData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Brevo API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw new Error(`Failed to create campaign: ${error.message}`);
  }
}

async function sendCampaignNow(apiKey, campaignId) {
  const url = `https://api.brevo.com/v3/emailCampaigns/${campaignId}/sendNow`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Brevo API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    return true;
  } catch (error) {
    throw new Error(`Failed to send campaign: ${error.message}`);
  }
}

async function testSendCampaign(apiKey, campaignName, subject, htmlContent, testEmails, senderName, senderEmail) {
  // Use transactional email API for test sends
  const url = 'https://api.brevo.com/v3/smtp/email';
  
  try {
    // Send test email to each recipient
    for (const email of testEmails) {
      const emailData = {
        sender: {
          name: senderName,
          email: senderEmail
        },
        to: [{
          email: email,
          name: email.split('@')[0]
        }],
        subject: `[TEST] ${subject}`,
        htmlContent: htmlContent
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Brevo API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }
    }
    
    return { 
      id: 'test-' + Date.now(), 
      message: `Test emails sent to ${testEmails.length} recipient(s)` 
    };
  } catch (error) {
    throw new Error(`Failed to send test campaign: ${error.message}`);
  }
}

async function listCampaigns() {
  const campaignsDir = path.join(__dirname, 'campaigns');
  
  if (!fs.existsSync(campaignsDir)) {
    throw new Error('No campaigns directory found. Run generate-campaign.js first.');
  }

  const files = fs.readdirSync(campaignsDir)
    .filter(file => file.endsWith('.html'))
    .sort(); // Most recent last (easiest to choose)

  if (files.length === 0) {
    throw new Error('No campaign files found. Run generate-campaign.js first.');
  }

  return files;
}

async function main() {
  try {
    console.log('📧 The Bromantics Campaign Sender 📧\n');

    // Check for API key
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.error('❌ BREVO_API_KEY environment variable not set.');
      console.log('Set it with: export BREVO_API_KEY="your-api-key-here"');
      process.exit(1);
    }

    // List available campaigns
    const campaigns = await listCampaigns();
    console.log('Available campaigns:');
    campaigns.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });

    const campaignChoice = await question('\nSelect campaign number: ');
    const campaignIndex = parseInt(campaignChoice) - 1;
    
    if (campaignIndex < 0 || campaignIndex >= campaigns.length) {
      throw new Error('Invalid campaign selection');
    }

    const selectedFile = campaigns[campaignIndex];
    const campaignPath = path.join(__dirname, 'campaigns', selectedFile);
    const htmlContent = fs.readFileSync(campaignPath, 'utf8');

    console.log(`\nSelected: ${selectedFile}\n`);

    // Load last settings
    const lastSettings = loadLastSendSettings();
    
    console.log('\nCampaign details:\n');
    
    if (lastSettings) {
      console.log('📋 Found previous settings. Press Enter to use defaults or type new values.\n');
    }
    
    // Get campaign details with defaults
    const campaignName = await questionWithDefault('Campaign name', lastSettings?.campaignName);
    const subject = await questionWithDefault('Email subject', lastSettings?.subject);
    const defaultSenderName = process.env.BREVO_SENDER_NAME || 'The Bromantics';
    const defaultSenderEmail = process.env.BREVO_SENDER_EMAIL || 'hello@bromantics.band';
    const senderName = await questionWithDefault('Sender name', lastSettings?.senderName || defaultSenderName);
    const senderEmail = await questionWithDefault('Sender email', lastSettings?.senderEmail || defaultSenderEmail);

    // Ask for send type
    console.log('\nSend options:');
    console.log('1. Test send (to specific emails)');
    console.log('2. Send to mailing list');
    
    const sendType = await question('Choose option (1 or 2): ');

    if (sendType === '1') {
      // Test send
      const testEmailsInput = await questionWithDefault('Test email addresses (comma-separated)', lastSettings?.testEmails);
      const testEmails = testEmailsInput.split(',').map(email => email.trim());
      
      // Save current settings for next time
      const currentSettings = {
        campaignName: campaignName || undefined,
        subject: subject || undefined,
        senderName: senderName !== defaultSenderName ? senderName : undefined,
        senderEmail: senderEmail !== defaultSenderEmail ? senderEmail : undefined,
        testEmails: testEmailsInput || undefined,
        sendType: '1',
        timestamp: new Date().toISOString()
      };
      saveSendSettings(currentSettings);

      console.log('\n🧪 Sending test campaign...');
      const result = await testSendCampaign(
        apiKey, 
        campaignName, 
        subject, 
        htmlContent, 
        testEmails, 
        senderName, 
        senderEmail
      );

      console.log(`✅ Test campaign sent successfully!`);
      console.log(`Campaign ID: ${result.id}`);
      console.log(`Recipients: ${testEmails.join(', ')}`);

    } else if (sendType === '2') {
      // Send to list
      const defaultListId = process.env.BREVO_LIST_ID || '2';
      const listId = await questionWithDefault('Brevo list ID', lastSettings?.listId || defaultListId);
      
      // Save current settings for next time
      const currentSettings = {
        campaignName: campaignName || undefined,
        subject: subject || undefined,
        senderName: senderName !== defaultSenderName ? senderName : undefined,
        senderEmail: senderEmail !== defaultSenderEmail ? senderEmail : undefined,
        listId: listId !== defaultListId ? listId : undefined,
        sendType: '2',
        timestamp: new Date().toISOString()
      };
      saveSendSettings(currentSettings);
      
      const confirmSend = await question(`⚠️  Send to entire mailing list? Type 'YES' to confirm: `);

      if (confirmSend !== 'YES') {
        console.log('❌ Send cancelled');
        return;
      }

      console.log('\n📤 Creating campaign...');
      const result = await sendCampaign(
        apiKey, 
        campaignName, 
        subject, 
        htmlContent, 
        listId, 
        senderName, 
        senderEmail
      );

      console.log(`✅ Campaign created successfully!`);
      console.log(`Campaign ID: ${result.id}`);

      const sendNow = await question('Send campaign now? (y/N): ');
      
      if (sendNow.toLowerCase() === 'y' || sendNow.toLowerCase() === 'yes') {
        console.log('\n📧 Sending campaign...');
        await sendCampaignNow(apiKey, result.id);
        console.log('✅ Campaign sent successfully!');
      } else {
        console.log('📄 Campaign created but not sent. You can send it later from your Brevo dashboard.');
      }

    } else {
      throw new Error('Invalid option selected');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { sendCampaign, sendCampaignNow, testSendCampaign };