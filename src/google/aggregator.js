class DataAggregator {
  constructor(sheets, spreadsheetId) {
    this.sheets = sheets;
    this.spreadsheetId = spreadsheetId;
  }

  /**
   * Get aggregated data for a user
   */
  async getUserAggregatedData(userName, month) {
    try {
      // Get current usage data
      const currentData = await this.getCurrentUsageData();
      
      // Filter by user and month
      const userMachines = currentData.filter(row => 
        row.user === userName && row.month === month
      );

      // Calculate total cost
      const totalCost = userMachines.reduce((sum, machine) => 
        sum + parseFloat(machine.cost), 0
      );

      // Get ranking if enabled
      const ranking = await this.getUserRanking(userName, month);

      return {
        totalCost,
        machines: userMachines.length,
        machineList: userMachines.map(m => m.machine),
        ranking,
        details: userMachines
      };
    } catch (error) {
      console.error('Error aggregating user data:', error.message);
      return null;
    }
  }

  /**
   * Get current usage data from sheet
   */
  async getCurrentUsageData() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Current Usage!A:H'
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) return []; // No data besides headers

      const headers = rows[0];
      const data = rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header.toLowerCase().replace(/\s+/g, '')] = row[index] || '';
        });
        return obj;
      });

      return data;
    } catch (error) {
      console.error('Error getting current usage data:', error.message);
      return [];
    }
  }

  /**
   * Get user ranking
   */
  async getUserRanking(userName, month) {
    try {
      // Get all users' total costs for the month
      const currentData = await this.getCurrentUsageData();
      
      // Group by user and calculate totals
      const userTotals = {};
      currentData.filter(row => row.month === month).forEach(row => {
        if (!userTotals[row.user]) {
          userTotals[row.user] = 0;
        }
        userTotals[row.user] += parseFloat(row.localcost || row.cost || 0);
      });

      // Sort users by total cost (descending)
      const sortedUsers = Object.entries(userTotals)
        .sort(([, a], [, b]) => b - a);

      // Find user's rank
      const userRank = sortedUsers.findIndex(([user]) => user === userName) + 1;
      const totalUsers = sortedUsers.length;

      return {
        rank: userRank || null,
        totalUsers,
        topUsers: sortedUsers.slice(0, 5).map(([user, cost], index) => ({
          rank: index + 1,
          user,
          cost: cost.toFixed(2)
        }))
      };
    } catch (error) {
      console.error('Error calculating ranking:', error.message);
      return null;
    }
  }

  /**
   * Update user summary sheet
   */
  async updateUserSummary() {
    try {
      const currentMonth = new Date().toISOString().substring(0, 7);
      const currentData = await this.getCurrentUsageData();
      
      // Group by user
      const userSummaries = {};
      currentData.filter(row => row.month === currentMonth).forEach(row => {
        if (!userSummaries[row.user]) {
          userSummaries[row.user] = {
            machines: new Set(),
            totalCost: 0,
            lastUpdate: row.lastupdate
          };
        }
        userSummaries[row.user].machines.add(row.machine);
        userSummaries[row.user].totalCost += parseFloat(row.localcost || row.cost || 0);
        
        // Keep latest update time
        if (row.lastupdate > userSummaries[row.user].lastUpdate) {
          userSummaries[row.user].lastUpdate = row.lastupdate;
        }
      });

      // Convert to array and sort by cost
      const summaryData = Object.entries(userSummaries)
        .map(([user, data]) => ({
          user,
          totalCost: data.totalCost,
          machines: data.machines.size,
          savings: Math.max(0, data.totalCost - 200), // Claude Max = $200
          lastUpdate: data.lastUpdate
        }))
        .sort((a, b) => b.totalCost - a.totalCost);

      // Prepare rows for sheet
      const rows = summaryData.map((data, index) => {
        const trophy = this.getTrophy(index + 1);
        return [
          index + 1,                    // Rank
          data.user,                    // User
          `$${data.totalCost.toFixed(2)}`, // CurrentMonth
          data.machines,                // TotalMachines
          `$${data.savings.toFixed(2)}`,   // Savings
          trophy,                       // Trophy
          data.lastUpdate              // LastUpdate
        ];
      });

      // Clear existing data (except headers)
      await this.clearSheetData('User Summary');

      // Write new data
      if (rows.length > 0) {
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: 'User Summary!A2:G',
          valueInputOption: 'RAW',
          resource: {
            values: rows
          }
        });
      }

      console.log('✅ Updated user summary');
    } catch (error) {
      console.error('Error updating user summary:', error.message);
    }
  }

  /**
   * Get trophy emoji based on rank
   */
  getTrophy(rank) {
    switch (rank) {
      case 1: return '🏆';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '📊';
    }
  }

  /**
   * Clear sheet data (except headers)
   */
  async clearSheetData(sheetName) {
    try {
      // Get sheet dimensions
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
        ranges: [`${sheetName}!A1:Z1000`]
      });

      const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const lastRow = sheet.properties.gridProperties.rowCount;
      
      // Clear from row 2 to last row
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A2:Z${lastRow}`
      });
    } catch (error) {
      console.error(`Error clearing ${sheetName}:`, error.message);
    }
  }

  /**
   * Get monthly history for a user
   */
  async getUserMonthlyHistory(userName, monthCount = 12) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Monthly History!A:H'
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) return [];

      const headers = rows[0];
      const data = rows.slice(1)
        .map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header.toLowerCase().replace(/\s+/g, '')] = row[index] || '';
          });
          return obj;
        })
        .filter(row => row.user === userName)
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, monthCount);

      return data;
    } catch (error) {
      console.error('Error getting monthly history:', error.message);
      return [];
    }
  }

  /**
   * Calculate growth rate
   */
  async calculateGrowthRate(userName) {
    const history = await this.getUserMonthlyHistory(userName, 2);
    
    if (history.length < 2) {
      return { rate: 0, previousMonth: null, currentMonth: null };
    }

    const current = parseFloat(history[0].totalcost || 0);
    const previous = parseFloat(history[1].totalcost || 0);
    
    const rate = previous > 0 ? ((current - previous) / previous * 100) : 0;
    
    return {
      rate: rate.toFixed(1),
      previousMonth: { month: history[1].month, cost: previous },
      currentMonth: { month: history[0].month, cost: current }
    };
  }
}

module.exports = DataAggregator;