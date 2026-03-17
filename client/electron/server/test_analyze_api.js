const axios = require('axios');

async function testAnalyzeAPI() {
  console.log('Testing analyze API...');
  
  try {
    // 首先调用搜索API获取一些测试数据
    const searchResponse = await axios.get('http://localhost:3001/api/search', {
      params: {
        query: 'machine learning',
        maxResults: 5
      }
    });
    
    const papers = searchResponse.data.data;
    console.log(`Got ${papers.length} papers from search API`);
    
    // 然后调用分析API
    console.log('Calling analyze API...');
    const startTime = Date.now();
    
    const analyzeResponse = await axios.post('http://localhost:3001/api/analyze', {
      papers: papers.slice(0, 3), // 只使用前3篇论文以加快测试
      language: 'en',
      query: 'machine learning'
    }, {
      timeout: 300000, // 5分钟超时，确保有足够时间完成分析
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const endTime = Date.now();
    console.log(`Analyze API completed in ${(endTime - startTime) / 1000} seconds`);
    console.log('Response status:', analyzeResponse.status);
    console.log('Response data:', {
      success: analyzeResponse.data.success,
      hasSummary: !!analyzeResponse.data.data.summary,
      summaryLength: analyzeResponse.data.data.summary.length,
      papersCount: analyzeResponse.data.data.papers.length,
      confidenceScore: analyzeResponse.data.data.confidenceScore
    });
    
  } catch (error) {
    console.error('Error testing analyze API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    }
  }
}

testAnalyzeAPI();
