const { getRecentPapers } = require('./server/openAlexClient');

async function testOpenAlex() {
  console.log('Testing OpenAlex API with the new implementation...');
  
  try {
    // 测试获取计算机科学领域的论文
    console.log('\n=== Testing Computer Science papers (C41008148) ===');
    const csPapers = await getRecentPapers(10, 'C41008148');
    console.log(`Found ${csPapers.length} computer science papers:`);
    csPapers.forEach((paper, index) => {
      console.log(`${index + 1}. ${paper.title} (${paper.citations} citations)`);
    });
    
    // 测试获取医学领域的论文
    console.log('\n=== Testing Medicine papers (C71924100) ===');
    const medicinePapers = await getRecentPapers(5, 'C71924100');
    console.log(`Found ${medicinePapers.length} medicine papers:`);
    medicinePapers.forEach((paper, index) => {
      console.log(`${index + 1}. ${paper.title} (${paper.citations} citations)`);
    });
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('API response:', error.response.data);
    }
  }
}

testOpenAlex();