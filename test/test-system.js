const axios = require('axios');

// 测试系统各项功能
async function testSystem() {
  console.log('开始测试研究分析系统...\n');
  
  // 1. 测试论文搜索功能
  console.log('1. 测试论文搜索功能...');
  try {
    const searchResponse = await axios.get('http://localhost:3000/api/search', {
      params: {
        query: 'machine learning',
        maxResults: 5
      }
    });
    
    if (searchResponse.data.success) {
      console.log('   ✓ 论文搜索功能正常');
      console.log(`   ✓ 找到 ${searchResponse.data.data.length} 篇论文`);
    } else {
      console.log('   ✗ 论文搜索功能异常:', searchResponse.data.error);
    }
  } catch (error) {
    console.log('   ✗ 论文搜索功能异常:', error.message);
  }
  
  // 2. 测试论文分析功能
  console.log('\n2. 测试论文分析功能...');
  try {
    // 先获取一些论文用于分析
    const searchResponse = await axios.get('http://localhost:3000/api/search', {
      params: {
        query: 'deep learning',
        maxResults: 3
      }
    });
    
    if (searchResponse.data.success) {
      const papers = searchResponse.data.data;
      console.log(`   找到 ${papers.length} 篇论文用于分析`);
      
      // 分析这些论文
      const analyzeResponse = await axios.post('http://localhost:3000/api/analyze', {
        papers: papers,
        query: 'deep learning'
      }, {
        timeout: 60000 // 增加超时时间到60秒
      });
      
      if (analyzeResponse.data.success) {
        console.log('   ✓ 论文分析功能正常');
        console.log(`   ✓ 生成研究综述: ${analyzeResponse.data.data.summary.substring(0, 50)}...`);
        console.log(`   ✓ 置信度评分: ${analyzeResponse.data.data.confidenceScore}%`);
        console.log(`   ✓ 分析了 ${analyzeResponse.data.data.papers.length} 篇论文`);
        
        // 检查幻觉控制机制数据
        if (analyzeResponse.data.data.keywordFrequency) {
          console.log('   ✓ 关键词频率统计功能正常');
        }
        
        if (analyzeResponse.data.data.keyTermValidation) {
          console.log('   ✓ 关键术语验证功能正常');
        }
        
        if (analyzeResponse.data.data.wordCloudData) {
          console.log('   ✓ 词云数据生成功能正常');
        }
      } else {
        console.log('   ✗ 论文分析功能异常:', analyzeResponse.data.error);
      }
    }
  } catch (error) {
    console.log('   ✗ 论文分析功能异常:', error.message);
    console.log('   可能的原因: API超时或网络连接问题');
  }
  
  // 3. 测试API文档
  console.log('\n3. 测试API文档...');
  try {
    const docsResponse = await axios.get('http://localhost:3000/api/docs');
    if (docsResponse.status === 200) {
      console.log('   ✓ API文档可访问');
    } else {
      console.log('   ✗ API文档无法访问');
    }
  } catch (error) {
    console.log('   ✗ API文档无法访问:', error.message);
  }
  
  console.log('\n测试完成！');
}

// 测试1: 搜索功能测试
async function testSearch() {
  console.log('--- 测试1: 搜索功能 ---');
  try {
    const searchResponse = await axios.get('http://localhost:3001/api/search', {  // 更新端口为3001
      params: {
        query: 'machine learning',
        maxResults: 5
      }
    });
    
    console.log('搜索响应:', searchResponse.data);
    console.log('搜索到的论文数量:', searchResponse.data.data.length);
    return searchResponse.data.data;
  } catch (error) {
    console.error('搜索测试失败:', error.message);
    return [];
  }
}

// 测试2: 分析功能测试（使用搜索结果）
async function testAnalysis(papers) {
  console.log('\n--- 测试2: 分析功能 ---');
  if (papers.length === 0) {
    console.log('没有论文可供分析');
    return;
  }
  
  try {
    const analyzeResponse = await axios.post('http://localhost:3001/api/analyze', {  // 更新端口为3001
      papers: papers,
      query: 'machine learning'
    });
    
    console.log('分析响应:', analyzeResponse.data);
    console.log('置信度评分:', analyzeResponse.data.data.confidenceScore);
    console.log('关键词验证:', analyzeResponse.data.data.keyTermValidation);
    return analyzeResponse.data.data;
  } catch (error) {
    console.error('分析测试失败:', error.message);
  }
}

// 测试3: 文档API测试
async function testDocumentation() {
  console.log('\n--- 测试3: 文档API ---');
  try {
    const docsResponse = await axios.get('http://localhost:3001/api/docs');  // 更新端口为3001
    console.log('文档响应:', docsResponse.data);
  } catch (error) {
    console.error('文档API测试失败:', error.message);
  }
}

// 运行测试
testSystem();