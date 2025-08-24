# The Bromantics Campaign Tools

Email campaign generation and sending tools using Brevo API.

## Setup

1. Get your Brevo API key from your account settings
2. Copy `.env.example` to `.env` and add your API key:
   ```bash
   cp .env.example .env
   # Edit .env and add your API key
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Generate Campaign

Create an HTML email campaign based on upcoming shows:

```bash
npm run generate-campaign
# or
node generate-campaign.js
```

This will:
- Read show data from `data/shows.json`
- Prompt for optional featured content (title, message, image)
- Generate themed HTML email using website styles
- Save to `campaigns/` directory with timestamp

### Send Campaign

Send the generated campaign via Brevo:

```bash
npm run send-campaign
# or
node send-campaign.js
```

This will:
- List available campaign files
- Prompt for campaign details (name, subject, sender info)
- Offer test send or full list send options
- Create and optionally send via Brevo API

## Features

- **Responsive email templates** matching website design
- **Automatic upcoming show filtering** (today and future)
- **Featured content sections** for announcements
- **Test sending** to specific emails before full send
- **Website color scheme** (neon pink/blue new-wave aesthetic)
- **Mobile-optimized** HTML email structure
- **Email best practices** for deliverability and client compatibility:
  - XHTML 1.0 Transitional DOCTYPE for Outlook compatibility
  - Inline CSS with fallbacks for email clients
  - Table-based layout for consistent rendering
  - MSO conditional comments for Outlook
  - Preheader text for better inbox preview
  - Alt text on all images
  - Proper email headers and unsubscribe links
  - Dark mode support
  - Anti-spam optimizations

## File Structure

```
campaigns/               # Generated campaign files
generate-campaign.js     # Campaign generator script  
send-campaign.js        # Campaign sender script
data/shows.json         # Show data source
```

## Brevo Integration

The tools integrate with Brevo's email API for:
- Creating email campaigns
- Managing contact lists 
- Sending immediately or scheduling
- Test sends to specific addresses

## Email Template

The generated emails include:
- Header with band logo
- Optional featured section (image, title, message)
- Upcoming shows with dates, venues, and details
- Social media links footer
- Unsubscribe handling