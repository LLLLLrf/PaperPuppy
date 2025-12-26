const axios = require('axios');

async function testAnalyzeAPI() {
  // 准备测试数据
  const testPapers = [
    {
      id: '1',
      title: 'Artificial Intelligence Applications',
      authors: 'John Doe',
      abstract: 'This paper discusses AI applications.',
      year: '2023',
      url: 'https://example.com/paper1',
      source: 'arxiv'
    }
  ];
  
  const testQuery = 'artificial intelligence';
  
  try {
    console.log('测试分析API...');
    // 调用分析API
    const response = await axios.post('http://localhost:3001/api/analyze', {
      papers: testPapers,
      query: testQuery,
      language: 'en'
    });
    
    console.log('API调用成功:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('测试失败:', error.message);
    if (error.response) {
      console.error('错误响应:', error.response.data);
    } else if (error.request) {
      console.error('请求错误:', error.request);
    }
  }
}

testAnalyzeAPI();