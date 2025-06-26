const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const crypto = require('crypto');
const GoogleAuth = require('./auth');
const DataAggregator = require('./aggregator');

class GoogleSheetsSync {
  constructor() {
    this.auth = new GoogleAuth();
    this.sheets = null;
    this.config = null;
    this.spreadsheetId = null;
    this.userName = null;
    this.machineId = null;
    this.aggregator = null;
  }

  /**
   * Initialize Google Sheets sync
   */
  async initialize() {
    console.log('🚀 Initializing Google Sheets sync...');
    
    // Load configuration
    await this.loadConfig();
    
    if (!this.config.enabled) {
      console.log('⚠️  Google Sheets sync is disabled');
      return false;
    }

    // Authenticate
    await this.auth.authenticate();
    this.sheets = await this.auth.getSheetsClient();
    
    // Extract spreadsheet ID from URL
    this.spreadsheetId = this.extractSpreadsheetId(this.config.spreadsheetUrl);
    if (!this.spreadsheetId) {
      throw new Error('Invalid Google Sheets URL');
    }

    // Get user info
    await this.initializeUserInfo();
    
    // Initialize sheets structure
    await this.initializeSheets();
    
    // Initialize aggregator
    this.aggregator = new DataAggregator(this.sheets, this.spreadsheetId);
    
    console.log('✅ Google Sheets sync initialized');
    return true;
  }

  /**
   * Load configuration
   */
  async loadConfig() {
    const configPath = path.join(__dirname, '../../config/google.json');
    
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      this.config = JSON.parse(configData);
    } catch (error) {
      // Default configuration if file doesn't exist
      this.config = {
        enabled: false,
        spreadsheetUrl: process.env.GOOGLE_SHEETS_URL || '',
        displayRanking: true,
        syncInterval: 60000,
        features: {
          monthlyHistory: true,
          teamRanking: true,
          autoSetup: true
        }
      };
    }
  }

  /**
   * Extract spreadsheet ID from URL
   */
  extractSpreadsheetId(url) {
    if (!url) return null;
    
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }

  /**
   * Initialize user and machine information
   */
  async initializeUserInfo() {
    // Get user name from environment or Slack
    this.userName = process.env.DISPLAY_NAME || '';
    
    if (!this.userName && process.env.SLACK_TOKEN) {
      // Try to get from Slack API
      try {
        const axios = require('axios');
        const response = await axios.get('https://slack.com/api/users.identity', {
          headers: { 'Authorization': `Bearer ${process.env.SLACK_TOKEN}` }
        });
        
        if (response.data.ok) {
          this.userName = response.data.user.name || response.data.user.real_name;
        }
      } catch (error) {
        console.log('⚠️  Could not get user name from Slack');
      }
    }

    // If still no user name, try Google account
    if (!this.userName) {
      try {
        const userInfo = await this.auth.getUserInfo();
        this.userName = userInfo.name || userInfo.email;
      } catch (error) {
        console.log('⚠️  Could not get user name from Google');
        this.userName = 'Unknown User';
      }
    }

    // Generate machine ID
    this.machineId = this.generateMachineId();
    
    console.log(`👤 User: ${this.userName}`);
    console.log(`💻 Machine: ${this.machineId}`);
  }

  /**
   * Generate unique machine ID
   */
  generateMachineId() {
    const hostname = os.hostname();
    const hash = crypto.createHash('sha256')
      .update(hostname + process.env.USER)
      .digest('hex')
      .substring(0, 6);
    return `${hostname}-${hash}`;
  }

  /**
   * Initialize sheets structure
   */
  async initializeSheets() {
    try {
      // Get spreadsheet info
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      const existingSheets = response.data.sheets.map(s => s.properties.title);
      
      // Create required sheets if they don't exist
      const requiredSheets = ['Current Usage', 'Monthly History', 'User Summary'];
      const sheetsToCreate = requiredSheets.filter(name => !existingSheets.includes(name));
      
      if (sheetsToCreate.length > 0) {
        await this.createSheets(sheetsToCreate);
      }

      // Initialize headers
      await this.initializeHeaders();
      
    } catch (error) {
      console.error('Error initializing sheets:', error.message);
      throw error;
    }
  }

  /**
   * Create new sheets
   */
  async createSheets(sheetNames) {
    const requests = sheetNames.map(name => ({
      addSheet: {
        properties: {
          title: name,
          gridProperties: {
            rowCount: 1000,
            columnCount: 20
          }
        }
      }
    }));

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      resource: { requests }
    });

    console.log(`✅ Created sheets: ${sheetNames.join(', ')}`);
  }

  /**
   * Initialize sheet headers
   */
  async initializeHeaders() {
    const headerDefinitions = {
      'Current Usage': ['User', 'Machine', 'Month', 'LocalCost', 'InputTokens', 'OutputTokens', 'CacheTokens', 'LastUpdate'],
      'Monthly History': ['User', 'Machine', 'Month', 'TotalCost', 'InputTokens', 'OutputTokens', 'CacheTokens', 'UpdatedAt'],
      'User Summary': ['Rank', 'User', 'CurrentMonth', 'TotalMachines', 'Savings', 'Trophy', 'LastUpdate']
    };

    for (const [sheetName, headers] of Object.entries(headerDefinitions)) {
      try {
        // Check if headers already exist
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A1:${String.fromCharCode(65 + headers.length - 1)}1`
        });

        if (!response.data.values || response.data.values[0].length === 0) {
          // Write headers
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `${sheetName}!A1:${String.fromCharCode(65 + headers.length - 1)}1`,
            valueInputOption: 'RAW',
            resource: {
              values: [headers]
            }
          });
          console.log(`✅ Initialized headers for ${sheetName}`);
        }
      } catch (error) {
        console.error(`Error initializing headers for ${sheetName}:`, error.message);
      }
    }
  }

  /**
   * Sync usage data to Google Sheets
   */
  async syncUsageData(ccusageData) {
    if (!this.config.enabled || !this.sheets) {
      return;
    }

    try {
      const latestMonth = ccusageData.monthly[0];
      const timestamp = new Date().toISOString();
      
      // Prepare row data
      const rowData = [
        this.userName,
        this.machineId,
        latestMonth.month,
        latestMonth.totalCost.toFixed(2),
        latestMonth.inputTokens || 0,
        latestMonth.outputTokens || 0,
        (latestMonth.cacheCreationTokens || 0) + (latestMonth.cacheReadTokens || 0),
        timestamp
      ];

      // Update current usage (upsert)
      await this.updateCurrentUsage(rowData);
      
      // Update monthly history if month changed
      if (this.config.features.monthlyHistory) {
        await this.updateMonthlyHistory(rowData);
      }

      console.log('✅ Synced data to Google Sheets');
    } catch (error) {
      console.error('❌ Error syncing to Google Sheets:', error.message);
    }
  }

  /**
   * Update current usage sheet (upsert)
   */
  async updateCurrentUsage(rowData) {
    const sheetName = 'Current Usage';
    const key = `${rowData[0]}-${rowData[1]}-${rowData[2]}`; // User-Machine-Month
    
    try {
      // Get all rows
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:H`
      });

      const rows = response.data.values || [];
      let rowIndex = -1;
      
      // Find existing row
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === rowData[0] && rows[i][1] === rowData[1] && rows[i][2] === rowData[2]) {
          rowIndex = i;
          break;
        }
      }

      if (rowIndex > -1) {
        // Update existing row
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A${rowIndex + 1}:H${rowIndex + 1}`,
          valueInputOption: 'RAW',
          resource: {
            values: [rowData]
          }
        });
      } else {
        // Append new row
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A:H`,
          valueInputOption: 'RAW',
          resource: {
            values: [rowData]
          }
        });
      }
    } catch (error) {
      console.error('Error updating current usage:', error.message);
    }
  }

  /**
   * Update monthly history
   */
  async updateMonthlyHistory(rowData) {
    // Check if we need to archive (month changed)
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    // This is a simplified version - in production you'd check if month actually changed
    // For now, we'll just ensure the data is in history
    
    const historyRow = [...rowData];
    historyRow[7] = historyRow[7]; // UpdatedAt = LastUpdate
    
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: 'Monthly History!A:H',
      valueInputOption: 'RAW',
      resource: {
        values: [historyRow]
      }
    });
  }

  /**
   * Get aggregated usage for current user
   */
  async getAggregatedUsage() {
    if (!this.aggregator) {
      return null;
    }

    const currentMonth = new Date().toISOString().substring(0, 7);
    return await this.aggregator.getUserAggregatedData(this.userName, currentMonth);
  }

  /**
   * Update user summary
   */
  async updateUserSummary() {
    if (!this.config.features.teamRanking) {
      return;
    }

    await this.aggregator.updateUserSummary();
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new GoogleSheetsSync();
    }
    return instance;
  },
  GoogleSheetsSync
};