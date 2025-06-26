#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { GoogleSheetsSync } = require('../src/google');

async function showRanking() {
  console.log('\n📊 Claude Usage Ranking\n');
  
  try {
    const googleSync = new GoogleSheetsSync();
    const initialized = await googleSync.initialize();
    
    if (!initialized) {
      console.log('❌ Google Sheets連携が設定されていません');
      console.log('先に npm run setup:google を実行してください\n');
      process.exit(1);
    }

    // Get current month
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthYear = new Date().toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'long' 
    });
    
    console.log(`📅 ${monthYear}の利用状況\n`);
    console.log('━'.repeat(50));
    
    // Get aggregated data for current user
    const myData = await googleSync.getAggregatedUsage();
    
    if (myData && myData.ranking && myData.ranking.topUsers) {
      // Display top users
      myData.ranking.topUsers.forEach(user => {
        const trophy = user.rank === 1 ? '🏆' :
                      user.rank === 2 ? '🥈' :
                      user.rank === 3 ? '🥉' : '  ';
        
        const isMe = user.user === googleSync.userName;
        const marker = isMe ? ' ← あなた' : '';
        
        console.log(`${trophy} ${user.rank}位: ${user.user} - $${user.cost}${marker}`);
      });
      
      // If current user is not in top 5, show their position
      if (myData.ranking.rank > 5) {
        console.log('...');
        console.log(`📊 ${myData.ranking.rank}位: ${googleSync.userName} - $${myData.totalCost.toFixed(2)} ← あなた`);
      }
      
      console.log('━'.repeat(50));
      console.log(`\n合計 ${myData.ranking.totalUsers} 人が利用中\n`);
      
      // Show personal stats
      console.log('📈 あなたの統計:');
      console.log(`  • 現在の順位: ${myData.ranking.rank}位 / ${myData.ranking.totalUsers}人`);
      console.log(`  • 今月の利用額: $${myData.totalCost.toFixed(2)}`);
      console.log(`  • 利用マシン数: ${myData.machines}台`);
      
      if (myData.totalCost > 200) {
        const savings = myData.totalCost - 200;
        console.log(`  • Claude Maxからの節約額: $${savings.toFixed(2)}`);
      }
      
      console.log('');
      
    } else {
      console.log('データを取得できませんでした\n');
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

// Run the ranking display
showRanking();