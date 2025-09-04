#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Function to load last campaign settings
function loadLastSettings() {
  const settingsPath = path.join(__dirname, '.last-campaign-settings.json');
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('Could not load last settings:', error.message);
  }
  return null;
}

// Function to save campaign settings
function saveSettings(settings) {
  const settingsPath = path.join(__dirname, '.last-campaign-settings.json');
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.warn('Could not save settings:', error.message);
  }
}

// Enhanced question function with default from last settings
async function questionWithDefault(prompt, defaultValue) {
  const fullPrompt = defaultValue ? `${prompt} (default: ${defaultValue}): ` : `${prompt}: `;
  const answer = await question(fullPrompt);
  return answer || defaultValue || '';
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'America/New_York'
  };
  return date.toLocaleDateString('en-US', options);
}

function isUpcoming(dateString) {
  const showDate = new Date(dateString + 'T00:00:00-05:00'); // ET timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return showDate >= today;
}

function generateICSFile(show) {
  // Handle TBD or missing time
  if (!show.time || show.time === 'TBD') {
    // For TBD times, return null (no calendar file)
    return null;
  }
  
  const [startTime, endTime] = show.time.split(' - ');
  
  // Check if the full time string has PM/AM to determine period
  const timeString = show.time.toUpperCase();
  const hasPM = timeString.includes('PM');
  const hasAM = timeString.includes('AM');
  
  const parseTime = (timeStr, isEndTime = false) => {
    const [hour, minutePart] = timeStr.trim().split(':');
    const cleanMinute = parseInt((minutePart || '0').replace(/[AP]M/i, '').trim()) || 0;
    let parsedHour = parseInt(hour);
    
    // If this specific time has AM/PM, use it
    const localPM = timeStr.toUpperCase().includes('PM');
    const localAM = timeStr.toUpperCase().includes('AM');
    
    if (localPM || (hasPM && !localAM)) {
      // Use PM if this time has PM, or if the overall time range is PM and this doesn't explicitly say AM
      if (parsedHour !== 12) parsedHour += 12;
    } else if (localAM) {
      if (parsedHour === 12) parsedHour = 0;
    } else if (hasAM) {
      // Default to AM if the time range specifies AM
      if (parsedHour === 12) parsedHour = 0;
    } else {
      // Default assumption: if no AM/PM specified anywhere, assume PM for evening shows
      if (parsedHour < 12) parsedHour += 12;
    }
    
    return { hour: parsedHour, minute: cleanMinute };
  };
  
  const startParsed = parseTime(startTime, false);
  const endParsed = parseTime(endTime || startTime, true);
  
  // Create start date/time in Eastern timezone
  const startDate = new Date(show.date + 'T00:00:00-05:00');
  startDate.setHours(startParsed.hour, startParsed.minute, 0, 0);
  
  // Create end date/time in Eastern timezone  
  const endDate = new Date(show.date + 'T00:00:00-05:00');
  endDate.setHours(endParsed.hour, endParsed.minute, 0, 0);
  
  // Format for ICS (UTC format)
  const formatICSDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  
  // Use full venue name and location for calendar, properly escaped
  // Format: "Venue Name, Street Address, City, State" for best map integration
  // Add MA if no state is specified (assume Massachusetts for local shows)
  let locationWithState = show.location;
  if (!locationWithState.match(/,\s*[A-Z]{2}(\s|$)/)) {
    locationWithState += ', MA';
  }
  const fullLocation = `${show.venue}, ${locationWithState}`.replace(/([,\\])/g, '\\$1');
  
  const icsData = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Bromantics//Show Calendar//EN',
    'BEGIN:VEVENT',
    `UID:${show.date}-${show.venue.replace(/\s+/g, '-')}@bromantics.band`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:The Bromantics at ${show.venue}`,
    `DESCRIPTION:${show.support ? show.support.replace(/<[^>]*>/g, '').replace(/([,\\;])/g, '\\$1') : 'The Bromantics live show'}`,
    `LOCATION:${fullLocation}`,
    `URL:https://bromantics.band`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  
  return {
    filename: `${show.venue.replace(/[\s\/\\]/g, '-')}-${show.date}.ics`,
    content: icsData
  };
}

function generateICSLink(show) {
  const icsFile = generateICSFile(show);
  if (!icsFile) return '';
  
  // Return hosted URL instead of data URI for better email client compatibility
  return `https://bromantics.band/calendar/${icsFile.filename}`;
}

// Function to get file size in bytes
function getFileSizeInBytes(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    console.warn(`Could not get size for ${filePath}:`, error.message);
    return 0;
  }
}

// Function to convert image to base64 data URI
function imageToDataURI(imagePath) {
  try {
    const fullPath = path.join(__dirname, imagePath);
    const imageBuffer = fs.readFileSync(fullPath);
    const extension = path.extname(imagePath).substring(1).toLowerCase();
    const mimeType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 
                     extension === 'png' ? 'image/png' : 
                     extension === 'gif' ? 'image/gif' : 'image/jpeg';
    return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
  } catch (error) {
    console.warn(`Could not embed image ${imagePath}:`, error.message);
    return null;
  }
}

// Function to decide which images to embed (optimized for email clients)
function prepareImagesForEmail(shows, featuredImage) {
  const MAX_EMBED_SIZE = 150 * 1024; // 150KB limit for better email client compatibility
  let totalSize = 0;
  const imagesToEmbed = {};
  
  // Don't embed any images for maximum email client compatibility
  // All images will be hosted on the website
  console.log(`   📧 Using hosted images for maximum email client compatibility`);
  
  console.log(`\n📊 Image embedding summary (email-optimized):`);
  console.log(`   Total size: ${(totalSize / 1024).toFixed(2)}KB`);
  console.log(`   Images embedded: ${Object.keys(imagesToEmbed).length}`);
  console.log(`   📧 All other images will be hosted for better email client compatibility`);
  Object.keys(imagesToEmbed).forEach(img => {
    console.log(`   ✓ ${img}`);
  });
  
  return imagesToEmbed;
}

function generateEmailHTML(shows, featuredTitle, featuredMessage, featuredImage) {
  const upcomingShows = shows.filter(show => isUpcoming(show.date))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Create calendar directory if it doesn't exist
  const calendarDir = path.join(__dirname, 'calendar');
  if (!fs.existsSync(calendarDir)) {
    fs.mkdirSync(calendarDir, { recursive: true });
  }

  // Generate ICS files for all shows
  const icsFiles = [];
  upcomingShows.forEach(show => {
    const icsFile = generateICSFile(show);
    if (icsFile) {
      const icsPath = path.join(calendarDir, icsFile.filename);
      fs.writeFileSync(icsPath, icsFile.content, 'utf8');
      icsFiles.push(icsFile.filename);
      console.log(`   📅 Generated calendar file: ${icsFile.filename}`);
    }
  });

  // Prepare images for embedding
  const embeddedImages = prepareImagesForEmail(shows, featuredImage);
  
  // Helper function to get image source (embedded or URL)
  const getImageSrc = (imagePath) => {
    if (embeddedImages[imagePath]) {
      return embeddedImages[imagePath];
    }
    // For external URLs or non-embedded images, return the original path
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    return `https://bromantics.band/${imagePath}`;
  };

  const featuredSection = featuredTitle || featuredMessage || featuredImage ? `
    <!-- Featured Section -->
    <div style="padding: 40px 20px; background-color: #0a0a0a; text-align: center;">
      ${featuredImage ? `<img src="${getImageSrc(featuredImage)}" alt="Featured Content" style="width: 100%; max-width: 500px; height: auto; border-radius: 8px; margin-bottom: 25px; display: block; margin-left: auto; margin-right: auto; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);">` : ''}
      ${featuredTitle ? `<h1 style="color: #ff0080; font-family: Arial, sans-serif; font-size: 32px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 20px 0; line-height: 1.2; text-shadow: 2px 2px 0 #00b8ff;">${featuredTitle}</h1>` : ''}
      ${featuredMessage ? `<p style="color: #adb5bd; font-size: 18px; line-height: 1.6; margin: 0; text-align: center; max-width: 600px; margin: 0 auto;">${featuredMessage}</p>` : ''}
    </div>
    
    <!-- Section Divider -->
    <div style="margin: 0; padding: 0;">
      <div style="height: 2px; background-color: #ff0080; margin: 0; line-height: 0; font-size: 0;"></div>
      <div style="height: 2px; background-color: #00b8ff; margin: 0; line-height: 0; font-size: 0;"></div>
    </div>` : '';

  const showsSection = upcomingShows.length > 0 ? `
    <!-- Shows Section -->
    <div style="padding: 40px 20px; background-color: transparent;">
      <h2 style="color: #ff0080; font-family: Arial, sans-serif; font-size: 28px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 30px 0; line-height: 1.2; text-align: center; text-shadow: 2px 2px 0 #00b8ff;">Upcoming Shows</h2>
      
      ${upcomingShows.map(show => `
      <!-- Show Item -->
      <div class="show-item" style="background-color: #1a1a1a; background-color: rgba(0, 0, 0, 0.6); border-radius: 10px; border: 2px solid #8f00ff; border: 2px solid rgba(143, 0, 255, 0.3); margin: 0 0 25px 0; overflow: hidden;">
        
        <!-- Poster Section -->
        <div style="width: 100%;">
          <!-- Date Header -->
          <div style="background-color: #0a0a0a; padding: 12px; text-align: center; border-bottom: 2px solid #ff0080;">
            <span style="color: #ffffff !important; font-size: 32px; font-weight: bold; line-height: 1; font-family: Arial, sans-serif; text-decoration: none !important;">${show.day}</span>
            <span style="color: #ff0080 !important; font-size: 32px; font-weight: bold; line-height: 1; font-family: Arial, sans-serif; margin-left: 8px; text-transform: uppercase; letter-spacing: 2px; text-decoration: none !important;">${show.month}</span>
          </div>
          <!-- Poster Image -->
          <img src="${getImageSrc(show.poster || 'img/default-show-poster.jpg')}" alt="Show poster for ${show.venue}" style="width: 100%; height: auto; display: block;">
        </div>
        
        <!-- Info Section -->
        <div style="padding: 24px;">
          <!-- Venue and Age Restriction Row -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 10px;">
            <tr>
              <td>
                <h3 style="color: #00b8ff; font-size: 24px; margin: 0; font-weight: 600; font-family: Arial, sans-serif; line-height: 1.2; text-shadow: 0 0 10px rgba(0, 184, 255, 0.3);">${show.venue}</h3>
              </td>
              ${show.ageRestriction ? `
              <td align="right" style="padding-left: 10px;">
                <span style="display: inline-block; background-color: #ff0080; color: #ffffff !important; font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #ff0080; white-space: nowrap; text-decoration: none !important;">${show.ageRestriction}</span>
              </td>
              ` : ''}
            </tr>
          </table>
          
          <!-- Location -->
          <p style="color: #adb5bd; margin: 0 0 6px 0; font-size: 16px; line-height: 1.4;">${show.location}</p>
          
          <!-- Time -->
          <p style="color: #adb5bd; margin: 0 0 16px 0; font-size: 16px; line-height: 1.4;">${show.time}</p>
          
          <!-- Support Text -->
          ${show.support ? `<div style="color: #f8f9fa; margin: 0 0 20px 0; font-size: 15px; line-height: 1.5;">${show.support}</div>` : ''}
          
          <!-- Action Buttons -->
          <div style="text-align: center;">
            ${show.mapQuery ? `
            <a href="https://maps.google.com/maps?q=${show.mapQuery}" style="display: inline-block; background-color: #0a1a2e; background-color: rgba(0, 184, 255, 0.15); color: #f8f9fa !important; padding: 8px 16px; border-radius: 0; text-transform: uppercase; letter-spacing: 2px; font-family: Arial, sans-serif; font-weight: 600; font-size: 12px; border: 2px solid #ff0080; text-decoration: none !important; white-space: nowrap; margin: 4px;" target="_blank">📍 Map</a>
            ` : ''}
            ${generateICSLink(show) ? `
            <a href="${generateICSLink(show)}" download="${show.venue.replace(/\s+/g, '-')}-${show.date}.ics" style="display: inline-block; background-color: #0a1a2e; background-color: rgba(0, 184, 255, 0.15); color: #f8f9fa !important; padding: 8px 16px; border-radius: 0; text-transform: uppercase; letter-spacing: 2px; font-family: Arial, sans-serif; font-weight: 600; font-size: 12px; border: 2px solid #ff0080; text-decoration: none !important; white-space: nowrap; margin: 4px;">📅 Calendar</a>
            ` : ''}
          </div>
        </div>
        
      </div>
      `).join('')}
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <title>The Bromantics - Show Updates</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      line-height: 1.4;
      width: 100%;
      background-color: #121212 !important;
      color-scheme: light only;
    }
    
    /* Dark mode override styles for email clients */
    @media (prefers-color-scheme: dark) {
      .email-wrapper,
      .email-container,
      body {
        background-color: #121212 !important;
        color: #ffffff !important;
      }
    }
    
    /* Force link colors for Outlook */
    a { color: #00b8ff !important; text-decoration: none !important; }
    a:visited { color: #00b8ff !important; }
    a:hover { color: #ff0080 !important; }
    
    /* Ensure spans are not treated as links */
    span { color: inherit !important; text-decoration: none !important; }
    
    .email-wrapper {
      width: 100%;
      background-color: #121212;
    }
    
    .email-container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      background-color: transparent;
    }
    
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        padding: 0 !important;
      }
      
      /* Header adjustments */
      h1 { 
        font-size: 24px !important; 
        letter-spacing: 1px !important;
        text-shadow: 1px 1px 0 #00b8ff !important;
      }
      h2 { 
        font-size: 20px !important; 
        letter-spacing: 1px !important;
        text-shadow: 1px 1px 0 #00b8ff !important;
      }
      h3 { 
        font-size: 22px !important; 
        text-shadow: 0 0 8px rgba(0, 184, 255, 0.3) !important;
      }
      
      /* Show items mobile adjustments */
      .show-item {
        margin: 0 0 20px 0 !important;
      }
      
      /* Social links mobile */
      .social-link {
        display: block !important;
        width: 85% !important;
        margin: 10px auto !important;
        text-align: center !important;
        padding: 12px 16px !important;
        font-size: 14px !important;
      }
      
      /* Featured section mobile */
      .featured-title {
        font-size: 26px !important;
        letter-spacing: 1px !important;
      }
      
      .featured-message {
        font-size: 16px !important;
        line-height: 1.5 !important;
        max-width: 100% !important;
      }
      
      .featured-image {
        max-width: 100% !important;
        margin-bottom: 20px !important;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
    
    <!-- Preheader -->
    <div style="display: none; font-size: 1px; color: #121212; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
      The Bromantics upcoming shows and updates - New Wave/Post-Punk band from Western Massachusetts
    </div>
    
    <!-- Header -->
    <div style="padding: 30px 20px; background-color: #0a0a0a; text-align: center;">
      <img src="${getImageSrc('img/Bromantics-horizontal-white.png')}" alt="The Bromantics - New Wave Post-Punk Band" style="width: 100%; max-width: 350px; height: auto; display: block; margin: 0 auto;">
    </div>
    
    <!-- Section Divider -->
    <div style="margin: 0; padding: 0;">
      <div style="height: 2px; background-color: #ff0080; margin: 0; line-height: 0; font-size: 0;"></div>
      <div style="height: 2px; background-color: #00b8ff; margin: 0; line-height: 0; font-size: 0;"></div>
    </div>
    
    ${featuredSection}
    
    ${showsSection}
    
    <!-- Section Divider -->
    <div style="margin: 0; padding: 0;">
      <div style="height: 2px; background-color: #ff0080; margin: 0; line-height: 0; font-size: 0;"></div>
      <div style="height: 2px; background-color: #00b8ff; margin: 0; line-height: 0; font-size: 0;"></div>
    </div>
    
    <!-- Share Section -->
    <div style="padding: 40px 20px; background-color: transparent; text-align: center;">
      <div style="background-color: #1a1a1a; background-color: rgba(0, 0, 0, 0.6); border-radius: 10px; border: 2px solid #8f00ff; border: 2px solid rgba(143, 0, 255, 0.3); padding: 30px; margin: 0 auto; max-width: 500px;">
        <h2 style="color: #ff0080; font-family: Arial, sans-serif; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 20px 0; line-height: 1.2; text-shadow: 2px 2px 0 #00b8ff;">Love New Wave Music?</h2>
        <p style="color: #adb5bd; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
          Know someone who would dig The Bromantics' sound? Share this email with friends who love new wave and post-punk music! They can join our mailing list to stay updated on all our shows and music.
        </p>
        <a href="https://bromantics.band/#connect" style="display: inline-block; background-color: #0a1a2e; background-color: rgba(0, 184, 255, 0.15); color: #f8f9fa !important; padding: 12px 24px; border-radius: 0; text-transform: uppercase; letter-spacing: 2px; font-family: Arial, sans-serif; font-weight: 600; border: 2px solid #ff0080; text-decoration: none !important; margin: 8px;" target="_blank">Join Our Mailing List</a>
      </div>
    </div>
    
    <!-- Section Divider -->
    <div style="margin: 0; padding: 0;">
      <div style="height: 2px; background-color: #ff0080; margin: 0; line-height: 0; font-size: 0;"></div>
      <div style="height: 2px; background-color: #00b8ff; margin: 0; line-height: 0; font-size: 0;"></div>
    </div>
    
    <!-- Footer -->
    <div style="padding: 40px 20px; background-color: #0a0a0a; text-align: center;">
      <h2 style="color: #ff0080; font-family: Arial, sans-serif; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 25px 0; line-height: 1.2; text-shadow: 2px 2px 0 #00b8ff;">Stay Connected</h2>
      
      <!-- Action Buttons -->
      <div style="margin-bottom: 30px; text-align: center;">
        <a href="https://bromantics.band" style="display: inline-block; background-color: #0a1a2e; background-color: rgba(0, 184, 255, 0.15); color: #f8f9fa !important; padding: 12px 24px; border-radius: 0; text-transform: uppercase; letter-spacing: 2px; font-family: Arial, sans-serif; font-weight: 600; border: 2px solid #ff0080; text-decoration: none !important; margin: 8px;">Visit Website</a>
        <a href="mailto:hello@bromantics.band" style="display: inline-block; background-color: #0a1a2e; background-color: rgba(0, 184, 255, 0.15); color: #f8f9fa !important; padding: 12px 24px; border-radius: 0; text-transform: uppercase; letter-spacing: 2px; font-family: Arial, sans-serif; font-weight: 600; border: 2px solid #ff0080; text-decoration: none !important; margin: 8px;">Email Us</a>
      </div>
      
      <!-- Social Links -->
      <div style="margin-bottom: 30px; text-align: center;">
        <a href="https://youtube.com/@thebromantics" class="social-link" style="display: inline-block; padding: 10px 20px; background-color: transparent; color: #f8f9fa !important; text-decoration: none !important; border: 2px solid #00b8ff; font-size: 14px; font-weight: 600; margin: 6px; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, sans-serif;">YouTube</a>
        <a href="https://facebook.com/thebromantics" class="social-link" style="display: inline-block; padding: 10px 20px; background-color: transparent; color: #f8f9fa !important; text-decoration: none !important; border: 2px solid #00b8ff; font-size: 14px; font-weight: 600; margin: 6px; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, sans-serif;">Facebook</a>
        <a href="https://instagram.com/thebromantics" class="social-link" style="display: inline-block; padding: 10px 20px; background-color: transparent; color: #f8f9fa !important; text-decoration: none !important; border: 2px solid #00b8ff; font-size: 14px; font-weight: 600; margin: 6px; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, sans-serif;">Instagram</a>
      </div>
      
      <!-- Legal -->
      <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 20px;">
        <p style="color: #6c757d; font-size: 12px; margin: 0 0 10px 0; line-height: 1.4;">
          © 2025 The Bromantics. All rights reserved.
        </p>
        <p style="color: #6c757d; font-size: 12px; margin: 0; line-height: 1.4;">
          You received this email because you subscribed to our mailing list.<br>
          <a href="{unsubscribe_url}" style="color: #6c757d; text-decoration: underline;">Unsubscribe</a> | 
          <a href="{update_profile_url}" style="color: #6c757d; text-decoration: underline;">Update Preferences</a>
        </p>
      </div>
      
    </div>
    
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  try {
    console.log('🎸 The Bromantics Campaign Generator 🎸\n');

    // Read shows data
    const showsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'shows.json'), 'utf8'));

    // Load last settings
    const lastSettings = loadLastSettings();
    
    // Get user input
    console.log('Campaign customization options:\n');
    
    if (lastSettings) {
      console.log('📋 Found previous settings. Press Enter to use defaults or type new values.\n');
    }
    
    const featuredTitle = await questionWithDefault('Featured title (optional)', lastSettings?.featuredTitle);
    const featuredMessage = await questionWithDefault('Featured message (optional)', lastSettings?.featuredMessage);
    const featuredImage = await questionWithDefault('Featured image path or URL (e.g., img/banner.jpg or https://...)', lastSettings?.featuredImage);

    // Save current settings for next time
    const currentSettings = {
      featuredTitle: featuredTitle || undefined,
      featuredMessage: featuredMessage || undefined,
      featuredImage: featuredImage || undefined,
      timestamp: new Date().toISOString()
    };
    saveSettings(currentSettings);

    // Generate timestamp for filename
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '_');
    const filename = `campaign_${timestamp}.html`;
    const filepath = path.join(__dirname, 'campaigns', filename);

    // Generate HTML
    const html = generateEmailHTML(
      showsData.shows, 
      featuredTitle || null, 
      featuredMessage || null, 
      featuredImage || null
    );

    // Save to file
    fs.writeFileSync(filepath, html);

    console.log(`\n✅ Campaign generated successfully!`);
    console.log(`📄 File saved: ${filepath}`);
    
    // Open in browser for preview
    const openBrowser = await question('\nOpen in browser for preview? (Y/n): ');
    if (openBrowser.toLowerCase() !== 'n' && openBrowser.toLowerCase() !== 'no') {
      console.log('🌐 Opening in browser...');
      
      // Cross-platform browser opening
      const command = process.platform === 'darwin' ? 'open' : 
                     process.platform === 'win32' ? 'start' : 'xdg-open';
      
      exec(`${command} "${filepath}"`, (error) => {
        if (error) {
          console.log(`⚠️  Could not open browser automatically. Open this file manually: ${filepath}`);
        }
      });
    }

    console.log(`\nNext steps:`);
    console.log(`1. Review the generated HTML file`);
    console.log(`2. Make any manual adjustments if needed`);
    console.log(`3. Use send-campaign.js to send via Brevo`);

  } catch (error) {
    console.error('❌ Error generating campaign:', error.message);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateEmailHTML, formatDate, isUpcoming };