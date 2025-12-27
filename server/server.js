const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { searchPapers: searchArxivPapers } = require('./arxivClient');
const { searchPapers: searchGoogleScholarPapers } = require('./googleScholarClient');
const { analyzePapers, evaluateConsistency, calculateKeywordFrequency, validateKeyTerms } = require('./chatAnywhereClient');
const { getRecentPapers: getRecentOpenAlexPapers } = require('./openAlexClient'); // 保留用于热点文章

const app = express();
const PORT = process.env.PORT || 3001; // 修改端口为3001

// 中间件
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
}));
app.use(express.json());

// API路由
app.get('/api/search', async (req, res) => {
  const { query, maxResults = 10 } = req.query;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Query parameter is required'
    });
  }
  
  try {
    // 固定分配论文数量：4篇arXiv和12篇Google Scholar
    const arxivCount = 4;
    const googleScholarCount = 12;
    
    // 并行从arXiv和Google Scholar获取论文
    const [arxivPapers, googleScholarPapers] = await Promise.all([
      searchArxivPapers(query, arxivCount),
      searchGoogleScholarPapers(query, googleScholarCount)
    ]);
    
    // 合并结果
    const papers = [...arxivPapers, ...googleScholarPapers];
    
    // 按年份降序排序（如果有年份的话）
    papers.sort((a, b) => {
      if (!a.year) return 1;
      if (!b.year) return -1;
      return parseInt(b.year) - parseInt(a.year);
    });
    
    // 即使没有找到论文也返回成功，但data为空数组
    res.json({
      success: true,
      data: papers,
      total: papers.length,
      sources: {
        arxiv: arxivPapers.length,
        googleScholar: googleScholarPapers.length
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/analyze', async (req, res) => {
  console.log('=== /api/analyze ENDPOINT REQUEST RECEIVED ===');
  
  // 创建日志数组，用于收集处理过程中的关键信息
  const logs = [];
  const addLog = (message) => {
    console.log(message);
    logs.push(message);
  };
  
  addLog('Request body: { papersCount: ' + (req.body.papers?.length || 0) + ', query: \'' + (req.body.query?.substring(0, 50) + (req.body.query?.length > 50 ? '...' : '')) + '\', language: \'' + (req.body.language || 'en') + '\' }');
  
  const { papers, query, language = 'en' } = req.body;
  
  if (!papers || !Array.isArray(papers)) {
    addLog('✗ Bad request: Papers array is required');
    return res.status(400).json({
      success: false,
      error: 'Papers array is required'
    });
  }
  
  // 不再硬性限制论文数量，而是依赖analyzePapers函数内部的分批处理机制
  // 但为了性能考虑，仍然设置一个合理的上限
  const limitedPapers = papers.slice(0, 30);
  addLog(`Processing ${limitedPapers.length} papers (out of ${papers.length} total)`);
  
  try {
    addLog('1. 开始调用 analyzePapers...');
    // 使用ChatAnywhere API分析论文（现在支持分批处理）
    let summary;
    try {
      summary = await analyzePapers(limitedPapers, language);
      addLog('✓ analyzePapers completed!');
      addLog('   综述长度: ' + summary.length);
    } catch (error) {
      console.error('✗ analyzePapers failed:', error.message);
      addLog('✗ analyzePapers failed: ' + error.message);
      // 如果analyzePapers抛出异常，仍然继续执行并返回错误信息
      summary = language === 'zh' ? 
        `综述生成失败：${error.message}` : 
        `Survey generation failed: ${error.message}`;
    }
    addLog('   内存使用情况: ' + JSON.stringify(process.memoryUsage()));
    
    addLog('2. 开始调用 evaluateConsistency...');
    // 评估论文一致性和相关性
    const evaluatedPapers = await evaluateConsistency(limitedPapers, query || '');
    addLog('✓ evaluateConsistency completed!');
    addLog('   评估后论文数量: ' + evaluatedPapers.length);
    
    // 计算关键词频率（引用统计）
    addLog('3. 开始调用 calculateKeywordFrequency...');
    const keywordFrequency = calculateKeywordFrequency(limitedPapers);
    addLog('✓ calculateKeywordFrequency completed!');
    addLog('   关键词数量: ' + keywordFrequency.length);
    
    // 验证关键术语匹配
    addLog('4. 开始调用 validateKeyTerms...');
    const keyTermValidation = validateKeyTerms(limitedPapers, query || '');
    addLog('✓ validateKeyTerms completed!');
    addLog('   匹配率: ' + keyTermValidation.matchRate);
    
    // 生成词云数据 - 增加词的数量以减少稀疏感
    addLog('5. 开始生成词云数据...');
    const wordCloudData = keywordFrequency.slice(0, 40).map(item => [item.keyword, item.count]);
    addLog('✓ 词云数据生成完成！');
    addLog('   词云数据点数量: ' + wordCloudData.length);
    
    // 生成置信度评分（基于多个因子）
    addLog('6. 开始生成置信度评分...');
    // 综合考虑一致性、相关性、关键词匹配率等因素
    const avgConsistency = evaluatedPapers.reduce((sum, paper) => sum + paper.consistency, 0) / evaluatedPapers.length;
    const avgRelevance = evaluatedPapers.reduce((sum, paper) => sum + paper.relevance, 0) / evaluatedPapers.length;
    const termMatchRate = keyTermValidation.matchRate;
    
    // 动态调整权重，基于不同因素的可靠性
    // 当关键词匹配率较高时，增加其权重
    const keywordWeight = Math.min(0.5, termMatchRate / 100 * 0.6);
    const consistencyWeight = 0.3 + (avgConsistency > 90 ? 0.1 : avgConsistency > 80 ? 0.05 : 0);
    const relevanceWeight = 0.4 + (avgRelevance > 90 ? 0.1 : avgRelevance > 80 ? 0.05 : 0);
    
    // 确保权重总和为1
    const totalWeight = keywordWeight + consistencyWeight + relevanceWeight;
    const normalizedKeywordWeight = keywordWeight / totalWeight;
    const normalizedConsistencyWeight = consistencyWeight / totalWeight;
    const normalizedRelevanceWeight = relevanceWeight / totalWeight;
    
    // 加权计算置信度评分
    let confidenceScore = 0;
    // 确保所有计算值都是有效的数字
    if (!isNaN(avgConsistency) && !isNaN(avgRelevance) && !isNaN(termMatchRate)) {
      confidenceScore = Math.round(
        (avgConsistency * normalizedConsistencyWeight) + 
        (avgRelevance * normalizedRelevanceWeight) + 
        (termMatchRate * normalizedKeywordWeight)
      );
    } else {
      // 如果任何计算值无效，使用默认置信度
      confidenceScore = 50;
    }
    
    // 应用幻觉抑制因子
    // 当关键词匹配率较低时，降低整体置信度
    const hallucinationSuppressionFactor = !isNaN(termMatchRate) ? 
      (termMatchRate < 30 ? 0.8 : termMatchRate < 50 ? 0.9 : 1.0) : 1.0;
    
    const adjustedConfidenceScore = Math.max(0, Math.min(100, 
      Math.round(confidenceScore * hallucinationSuppressionFactor)));
    
    addLog('✓ 置信度评分生成完成！');
    addLog('   置信度评分: ' + adjustedConfidenceScore);
    
    addLog('7. 准备发送响应...');
    
    const responseData = {
      success: true,
      data: {
        summary,
        confidenceScore: adjustedConfidenceScore,
        papers: evaluatedPapers,
        keywordFrequency,
        keyTermValidation,
        wordCloudData
      },
      logs: logs // 将处理日志添加到响应中
    };
    
    addLog('✓ Response data prepared successfully');
    addLog('   Response structure: [summary, confidenceScore, papers, keywordFrequency, keyTermValidation, wordCloudData]');
    
    // 发送响应
    res.json(responseData);
    console.log('=== /api/analyze RESPONSE SENT SUCCESSFULLY ===');
  } catch (error) {
    console.error('=== ERROR IN /api/analyze ENDPOINT ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('=== /api/analyze ERROR END ===');
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 基本路由
app.get('/', (req, res) => {
  res.json({ 
    message: 'Research Analyzer Backend Server',
    version: '1.0.0'
  });
});

// 翻译API路由
app.post('/api/translate', async (req, res) => {
  const { text, targetLang = 'zh' } = req.body;
  
  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'Text parameter is required'
    });
  }
  
  try {
    const { translateText } = require('./chatAnywhereClient');
    const translatedText = await translateText(text, targetLang);
    
    res.json({
      success: true,
      translatedText
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取近一周热点文章的API路由
app.get('/api/arxiv/recent', async (req, res) => {
  try {
    // 使用arxivClient获取最近的论文，按提交日期排序
    const recentPapers = await searchArxivPapers('', 30);
    
    // 暂时不进行日期过滤，先查看是否能获取到论文数据
    res.json({
      success: true,
      papers: recentPapers
    });
  } catch (error) {
    console.error('Error fetching recent arXiv papers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取近一周OpenAlex热点文章的API路由（按引用量排序）
app.get('/api/openalex/recent', async (req, res) => {
  try {
    console.log('=== OpenAlex Recent API Request ===');
    
    // 使用OpenAlex API获取近一周计算机领域被引用最多的论文
    const recentPapers = await getRecentOpenAlexPapers(30);
    
    console.log(`Returning ${recentPapers.length} top papers`);
    
    res.json({
      success: true,
      papers: recentPapers
    });
  } catch (error) {
    console.error('Error fetching recent OpenAlex papers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API文档路由
app.get('/api/docs', (req, res) => {
  res.json({
    message: 'Research Analyzer API Documentation',
    endpoints: {
      'GET /api/search': '搜索论文',
      'POST /api/analyze': '分析论文',
      'POST /api/translate': '翻译文本',
      'GET /api/arxiv/recent': '获取近一周arXiv热点文章',
      'GET /api/openalex/recent': '获取近一周OpenAlex热点文章（按引用量排序）'
    }
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Documentation: http://localhost:${PORT}/api/docs`);
});

module.exports = app;