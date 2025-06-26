const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { exec } = require('child_process');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');

const CLAUDE_MAX_COST = 200; // $200 Claude Max subscription
const SLACK_TOKEN = process.env.SLACK_TOKEN;

// Load Slack configuration
let slackConfig = {};
try {
  const slackConfigPath = path.join(__dirname, '../../config/slack.json');
  slackConfig = JSON.parse(fs.readFileSync(slackConfigPath, 'utf8'));
  console.log('✅ Loaded Slack configuration');
} catch (error) {
  console.log('⚠️  Using default configuration');
  slackConfig = { messageFile: 'default' };
}

// Load messages configuration
const messageFile = slackConfig.messageFile || 'default';
const messagesPath = path.join(__dirname, '../../messages/', messageFile + '.json');
let messagesConfig = {};

// Function to load and validate messages
function loadMessages() {
  try {
    // Reload Slack config to check for message file changes
    const slackConfigPath = path.join(__dirname, '../../config/slack.json');
    const currentSlackConfig = JSON.parse(fs.readFileSync(slackConfigPath, 'utf8'));
    const currentMessageFile = currentSlackConfig.messageFile || 'default';
    const currentMessagesPath = path.join(__dirname, '../../messages/', currentMessageFile + '.json');
    
    const newMessagesConfig = JSON.parse(fs.readFileSync(currentMessagesPath, 'utf8'));
    console.log(`✅ Loaded messages configuration from: ${currentMessageFile}.json`);
    
    // Validate required fields
    if (!newMessagesConfig.comparisons || !Array.isArray(newMessagesConfig.comparisons) || newMessagesConfig.comparisons.length === 0) {
      throw new Error('messages.json must contain a non-empty "comparisons" array');
    }
    if (!newMessagesConfig.lowUsageMessages || !Array.isArray(newMessagesConfig.lowUsageMessages) || newMessagesConfig.lowUsageMessages.length === 0) {
      throw new Error('messages.json must contain a non-empty "lowUsageMessages" array');
    }
    if (!newMessagesConfig.templates || typeof newMessagesConfig.templates !== 'object') {
      throw new Error('messages.json must contain a "templates" object');
    }
    if (!newMessagesConfig.templates.savingsComparison || !newMessagesConfig.templates.buffetMode || !newMessagesConfig.templates.lowUsage) {
      throw new Error('messages.json templates must contain "savingsComparison", "buffetMode", and "lowUsage" fields');
    }
    if (!newMessagesConfig.thresholds || typeof newMessagesConfig.thresholds !== 'object') {
      throw new Error('messages.json must contain a "thresholds" object');
    }
    if (typeof newMessagesConfig.thresholds.savingsComparisonMin !== 'number' || typeof newMessagesConfig.thresholds.buffetModeMin !== 'number') {
      throw new Error('messages.json thresholds must contain numeric "savingsComparisonMin" and "buffetModeMin" fields');
    }
    
    messagesConfig = newMessagesConfig;
    return true;
  } catch (error) {
    console.error('❌ Failed to load or validate messages:', error.message);
    return false;
  }
}

// Initial load
if (!loadMessages()) {
  process.exit(1);
}

function getSavingsComparison(savings) {
  const comparisons = messagesConfig.comparisons;

  for (const comparison of comparisons) {
    if (savings <= comparison.usd) {
      return comparison.item;
    }
  }
  
  // Use highUsageDefault from messages.json
  return messagesConfig.templates.highUsageDefault || "もはやスタートアップのサーバー代レベル";
}

if (!SLACK_TOKEN) {
  console.error('SLACK_TOKEN environment variable is required');
  process.exit(1);
}

async function getCCUsage() {
  return new Promise((resolve, reject) => {
    exec('npx ccusage@latest monthly --json', (error, stdout, stderr) => {
      if (error) {
        console.error('Error executing ccusage:', error);
        reject(error);
        return;
      }
      
      try {
        const data = JSON.parse(stdout);
        resolve(data);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        reject(parseError);
      }
    });
  });
}

function getLatestMonthCost(data) {
  if (!data.monthly || data.monthly.length === 0) {
    throw new Error('No monthly data available');
  }
  
  // Get the latest month (should be the first item if sorted by date)
  const latestMonth = data.monthly[0];
  return {
    totalCost: latestMonth.totalCost,
    month: latestMonth.month
  };
}

function getLowUsageMessage(totalCost, savings) {
  const messages = messagesConfig.lowUsageMessages;
  return messages[Math.floor(Math.random() * messages.length)];
}

function getClaudeEmoji(totalCost) {
  // Select emoji based on totalCost thresholds
  if (totalCost < 50) return ':claude-0:';
  if (totalCost < 100) return ':claude-50:';
  if (totalCost < 150) return ':claude-100:';
  if (totalCost < 200) return ':claude-150:';
  if (totalCost < 250) return ':claude-200:';
  if (totalCost < 300) return ':claude-250:';
  if (totalCost < 350) return ':claude-300:';
  if (totalCost < 400) return ':claude-350:';
  if (totalCost < 450) return ':claude-400:';
  if (totalCost < 500) return ':claude-450:';
  if (totalCost < 1000) return ':claude-500:';
  return ':claude-rainbow:'; // $1000以上
}

function replaceTemplate(template, replacements) {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

async function updateSlackProfile(totalCost, month) {
  const savings = totalCost - CLAUDE_MAX_COST;
  
  // Get thresholds from config
  const thresholds = messagesConfig.thresholds;
  
  // Get templates from config
  const templates = messagesConfig.templates;
  
  let title;
  if (savings > thresholds.savingsComparisonMin) {
    // 節約額が閾値超過の時は比較表示
    title = replaceTemplate(templates.savingsComparison, {
      item: getSavingsComparison(savings),
      totalCost: `$${totalCost.toFixed(2)}`,
      savings: `$${savings.toFixed(2)}`
    });
  } else if (savings > thresholds.buffetModeMin) {
    // 節約額が閾値以下の時は食べ放題中
    title = replaceTemplate(templates.buffetMode, {
      totalCost: `$${totalCost.toFixed(2)}`
    });
  } else {
    // $200未満の時はランダムメッセージ
    title = replaceTemplate(templates.lowUsage, {
      message: getLowUsageMessage(totalCost, savings),
      totalCost: `$${totalCost.toFixed(2)}`
    });
  }
  
  try {
    const response = await axios.post('https://slack.com/api/users.profile.set', {
      profile: {
        status_text: title,
        status_emoji: getClaudeEmoji(totalCost)
      }
    }, {
      headers: {
        'Authorization': `Bearer ${SLACK_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.ok) {
      console.log(`✅ Slack profile updated: ${title}`);
    } else {
      console.error('❌ Failed to update Slack profile:', response.data.error);
    }
  } catch (error) {
    console.error('❌ Error updating Slack profile:', error.message);
  }
}

async function updateCostInfo() {
  try {
    // Check if we should reload messages
    if (slackConfig.autoReload) {
      const reloaded = loadMessages();
      if (reloaded) {
        // Reload the Slack config too
        try {
          const slackConfigPath = path.join(__dirname, '../../config/slack.json');
          slackConfig = JSON.parse(fs.readFileSync(slackConfigPath, 'utf8'));
        } catch (e) {
          // Keep existing config if reload fails
        }
      }
    }
    
    console.log('🔄 Fetching Claude usage data...');
    const data = await getCCUsage();
    const { totalCost, month } = getLatestMonthCost(data);
    
    console.log(`📊 Latest month (${month}): $${totalCost.toFixed(2)}`);
    
    await updateSlackProfile(totalCost, month);
  } catch (error) {
    console.error('❌ Error updating cost info:', error.message);
  }
}

// Run immediately on startup
console.log('🚀 Starting ccusage-slack application...');
updateCostInfo();

// Schedule to run every minute
cron.schedule('* * * * *', () => {
  console.log(`⏰ Running scheduled update at ${new Date().toLocaleString()}`);
  updateCostInfo();
});

console.log('⏳ Scheduled to run every minute. Press Ctrl+C to stop.');