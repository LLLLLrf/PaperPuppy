const axios = require('axios');

async function testRelevanceScore() {
  // 准备测试数据
  const testPapers = [
    {
      title: 'Artificial Intelligence and Machine Learning Applications in Healthcare',
      authors: 'John Doe, Jane Smith',
      abstract: 'This paper discusses various applications of artificial intelligence and machine learning in healthcare, including diagnosis, treatment planning, and patient monitoring. The research shows promising results in improving medical outcomes and reducing costs.',
      year: '2023',
      url: 'https://example.com/paper1',
      source: 'arxiv'
    },
    {
      title: 'The Future of Renewable Energy',
      authors: 'Mike Johnson',
      abstract: 'This study explores the potential of renewable energy sources such as solar, wind, and hydro power to replace fossil fuels. It analyzes the economic and environmental benefits of transitioning to a sustainable energy system.',
      year: '2022',
      url: 'https://example.com/paper2',
      source: 'googleScholar'
    }
  ];
  
  const testQuery = 'artificial intelligence healthcare';
  
  try {
    // 调用分析API
    const response = await axios.post('http://localhost:3001/api/analyze', {
      papers: testPapers,
      query: testQuery,
      language: 'en'
    });
    
    console.log('测试结果:');
    console.log('API调用成功:', response.status);
    
    // 检查相关性评分
    if (response.data.data && response.data.data.papers) {
      response.data.data.papers.forEach((paper, index) => {
        console.log(`\n论文 ${index + 1}:`);
        console.log(`标题: ${paper.title}`);
        console.log(`相关性评分: ${paper.relevance}`);
        console.log(`一致性评分: ${paper.consistency}`);
      });
    }
    
    // 检查是否有相关性评分不是50
    const hasNon50Relevance = response.data.data.papers.some(paper => paper.relevance !== 50);
    console.log(`\n是否有非50分的相关性评分: ${hasNon50Relevance ? '是' : '否'}`);
    
  } catch (error) {
    console.error('测试失败:', error.message);
    if (error.response) {
      console.error('错误响应:', error.response.data);
    }
  }
}

testRelevanceScore();