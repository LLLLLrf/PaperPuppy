const { getRecentPapers } = require('./server/openAlexClient');

console.log('Test file started...');
console.log('Imported getRecentPapers:', typeof getRecentPapers);

// 测试函数是否正确导入
if (typeof getRecentPapers === 'function') {
  console.log('✅ getRecentPapers is a function');
  
  // 测试是否能创建axios实例
  const axios = require('axios');
  console.log('✅ axios imported successfully');
  
} else {
  console.log('❌ getRecentPapers is not a function');
}

console.log('Test file completed...');