/**
 * MCP Delivery Orchestrator
 * Coordinates Gmail and Google Docs delivery channels for GrowwPulse.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const { createEmailDraft, appendToDoc } = require('./apiClient');

dotenv.config();

/**
 * Delivers the generated pulse note to configured targets.
 * @param {Object} pulseMeta Metadata from the pulse generator
 * @param {string} markdownContent The markdown content of the pulse note
 * @param {Object} [options] Configuration overrides
 * @returns {Promise<Object>} Delivery status report
 */
async function deliverPulse(pulseMeta, markdownContent, options = {}) {
  const settingsPath = options.settingsPath || path.join(__dirname, '../../config/settings.json');
  
  // 1. Load Settings
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {
      console.warn(`⚠️ Warning: Failed to parse settings at ${settingsPath}. Using defaults.`);
    }
  }

  const deliveryGmail = options.gmail !== undefined ? options.gmail : (settings.delivery?.gmail !== false);
  const deliveryDocs = options.googleDocs !== undefined ? options.googleDocs : (settings.delivery?.googleDocs || false);

  const report = {
    timestamp: new Date().toISOString(),
    week_iso: pulseMeta.week_iso,
    channels: {}
  };

  console.log('📬 Initializing delivery channels...');

  // 2. Channel 1: Gmail Draft Delivery
  if (deliveryGmail) {
    // Resolve recipient
    let recipient = process.env.GMAIL_DRAFT_TO || process.env.TARGET_EMAIL;
    if (settings.email?.recipients && settings.email.recipients.length > 0) {
      const configRecipient = settings.email.recipients[0];
      if (configRecipient && configRecipient !== 'your-email@gmail.com') {
        recipient = configRecipient;
      }
    }

    if (!recipient) {
      console.warn('⚠️ Warning: No recipient email configured. Skipping Gmail draft creation.');
      report.channels.gmail = {
        status: 'SKIPPED',
        reason: 'No recipient email configured in settings or .env'
      };
    } else {
      const prefix = settings.email?.subjectPrefix || '📊 GrowwPulse';
      const subject = `${prefix} — Weekly Review Digest (Week of ${pulseMeta.week})`;
      
      try {
        console.log(`✉️ Attempting to create Gmail draft for ${recipient}...`);
        const result = await createEmailDraft(recipient, subject, markdownContent, options);
        console.log('✅ Gmail draft created successfully.');
        report.channels.gmail = {
          status: 'SUCCESS',
          recipient,
          subject,
          result
        };
      } catch (err) {
        console.error(`❌ Gmail draft creation failed: ${err.message}`);
        report.channels.gmail = {
          status: 'FAILED',
          error: err.message,
          fallback_path: 'data/outputs/pulse_current.md'
        };
      }
    }
  } else {
    console.log('Gmail delivery is disabled in configuration.');
    report.channels.gmail = { status: 'DISABLED' };
  }

  // 3. Channel 2: Google Docs Archive
  if (deliveryDocs) {
    const docId = options.googleDocId !== undefined ? options.googleDocId : (process.env.GOOGLE_DOC_ID || settings.delivery?.googleDocId);
    
    if (!docId) {
      console.warn('⚠️ Warning: Google Docs archive is enabled but no GOOGLE_DOC_ID is set in environment or settings. Skipping Docs archive.');
      report.channels.googleDocs = {
        status: 'SKIPPED',
        reason: 'No Google Doc ID provided'
      };
    } else {
      try {
        console.log(`📝 Attempting to append to Google Doc: ${docId}...`);
        // Format append content with a divider
        const appendContent = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📅 ARCHIVE ENTRY: ${pulseMeta.week}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${markdownContent}\n`;
        const result = await appendToDoc(docId, appendContent, options);
        console.log('✅ Google Doc updated successfully.');
        report.channels.googleDocs = {
          status: 'SUCCESS',
          docId,
          result
        };
      } catch (err) {
        console.error(`❌ Google Doc archive failed: ${err.message}`);
        report.channels.googleDocs = {
          status: 'FAILED',
          error: err.message
        };
      }
    }
  } else {
    report.channels.googleDocs = { status: 'DISABLED' };
  }

  // 4. Log summary and return report
  console.log('\n🏁 Delivery Summary:');
  console.log(`  - Gmail Draft: ${report.channels.gmail?.status || 'DISABLED'}`);
  console.log(`  - Google Doc: ${report.channels.googleDocs?.status || 'DISABLED'}`);
  
  if (report.channels.gmail?.status === 'FAILED') {
    console.log(`\n⚠️ Notice: Email delivery failed. You can locate your generated pulse files locally at:`);
    console.log(`  - Markdown: data/outputs/pulse_current.md`);
    console.log(`  - HTML: data/outputs/pulse_current.html`);
  }

  return report;
}

module.exports = {
  deliverPulse
};
