// 从 chatApi.js 导入共享的 API 功能
const { chatCompletion, calculateTokenCount } = require('./chatApi');

// 导入新的综述引擎模块
const { distillPaper } = require('./paperDistill');
const { synthesizeThemes } = require('./themeSynthesis');
const { writeSurvey } = require('./surveyWriter');

// 定义共享的停用词集合，避免在每个函数中重复创建
const stopWords = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 
  'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs'
]);


/**
 * 从摘要中提取Method部分
 * @param {string} abstract - 论文摘要
 * @returns {string} 提取的简洁方法信息
 */
function extractMethodFromAbstract(abstract) {
  if (!abstract) return '';
  
  let methodInfo = '';
  
  // 第一个模式：Method: ... Result: 格式
  const methodPattern = /(?:Method|method|methodology|Methodology).*?:([\s\S]*?)(?:Result|result|Finding|finding|Conclusion|conclusion)/i;
  const methodMatch = abstract.match(methodPattern);
  if (methodMatch && methodMatch[1]) {
    methodInfo = methodMatch[1].trim();
  } 
  // 第二个模式：We use ... Result: 格式
  else {
    const weUsePattern = /(?:We|we)\s+(?:used|use|employed|employ|applied|apply).*?([\s\S]*?)(?:Result|result|Finding|finding|Conclusion|conclusion)/i;
    const weUseMatch = abstract.match(weUsePattern);
    if (weUseMatch && weUseMatch[1]) {
      methodInfo = weUseMatch[1].trim();
    } 
    // 第三个模式：This study used ... Result: 格式
    else {
      const thisStudyPattern = /(?:This|this)\s+(?:study|paper|research|work)\s+(?:used|use|employed|employ|applied|apply).*?([\s\S]*?)(?:Result|result|Finding|finding|Conclusion|conclusion)/i;
      const thisStudyMatch = abstract.match(thisStudyPattern);
      if (thisStudyMatch && thisStudyMatch[1]) {
        methodInfo = thisStudyMatch[1].trim();
      }
    }
  }
  
  // 进一步清理和缩短方法信息，减少token数量
  if (methodInfo) {
    // 移除多余的标点符号和空格
    methodInfo = methodInfo.replace(/\s+/g, ' ').trim();
    // 限制最大长度为100字符
    if (methodInfo.length > 100) {
      // 尝试在合适的位置截断
      const lastPeriod = methodInfo.lastIndexOf('.', 100);
      if (lastPeriod > 50) {
        methodInfo = methodInfo.substring(0, lastPeriod + 1) + '...';
      } else {
        methodInfo = methodInfo.substring(0, 100) + '...';
      }
    }
  }
  
  return methodInfo;
}

/**
 * 分析论文并生成综述（使用递归蒸馏引擎）
 * @param {Array} papers - 论文数组
 * @param {string} language - 输出语言 ('en' 或 'zh')
 * @returns {Promise<string>} 生成的综述
 */
async function analyzePapers(papers, language = 'en') {
  try {
    console.log('=== analyzePapers START ===');
    console.log('Starting recursive distillation process with', papers.length, 'papers...');
    console.log('Initial memory usage:', JSON.stringify(process.memoryUsage()));
    
    // 第一步：将每篇论文转换为结构化的 Knowledge Card
    console.log(`Step 1: Distilling ${papers.length} papers into knowledge cards...`);
    // 使用 Promise.all 并行处理所有论文
    const promises = papers.map(async (paper, i) => {
      try {
        console.log(`Processing paper ${i+1}/${papers.length}: ${paper.title.substring(0, 30)}...`);
        const card = await distillPaper(paper);
        // 为每个卡片添加论文标题和索引，便于后续引用
        card.title = paper.title;
        card.url = paper.url;
        console.log(`✓ Paper ${i+1}/${papers.length} distilled successfully`);
        return card;
      } catch (error) {
        console.error(`✗ Error distilling paper ${i+1}/${papers.length}: ${paper.title}`, error.message);
        // 如果一篇论文处理失败，返回 null，后续过滤
        return null;
      }
    });

    // 等待所有并行处理完成
    const results = await Promise.all(promises);
    // 过滤掉处理失败的论文（返回 null 的项）
    const cards = results.filter(card => card !== null);
    
    console.log(`Step 1 completed: ${cards.length} knowledge cards created`);
    
    if (cards.length === 0) {
      throw new Error('No papers were successfully distilled into knowledge cards');
    }
    
    // 第二步：将 Knowledge Cards 聚类为研究主题
    console.log('Step 2: Synthesizing themes from knowledge cards...');
    const themes = await synthesizeThemes(cards);
    console.log('✓ Step 2 completed: Themes synthesized successfully');
    console.log('After theme synthesis memory usage:', JSON.stringify(process.memoryUsage()));
    
    // 第三步：根据主题生成正式的学术综述
    console.log('Step 3: Writing academic survey based on themes...');
    const surveyResult = await writeSurvey(themes, language);
    console.log('✓ Step 3 completed: Academic survey written successfully');
    console.log('After survey writing memory usage:', JSON.stringify(process.memoryUsage()));
    console.log('✓ Confidence evaluation result:', JSON.stringify(surveyResult.confidence, null, 2));
    
    console.log('=== analyzePapers END ===');
    // 返回包含综述和置信度评价的对象
    return surveyResult;
  } catch (error) {
    console.error('=== ERROR in analyzePapers ===', error);
    console.error('Error stack:', error.stack);
    // 如果递归蒸馏过程失败，返回错误信息
    return language === 'zh' ? 
      `综述生成失败：${error.message}` : 
      `Survey generation failed: ${error.message}`;
  }
}

/**
 * 评估论文一致性和相关性
 * @param {Array} papers - 论文数组
 * @param {string} query - 搜索查询（可选）
 * @returns {Promise<Array>} 带一致性和相关性评分的论文数组
 */
function evaluateConsistency(papers, query = '') {
  // 如果有查询词，进行相关性分析
  let queryKeywords = [];
  if (query) {
    // 提取查询中的关键词（去除常见停用词）
    queryKeywords = query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .map(word => word.replace(/[^\w]/g, ''));
  }
  
  // 基于真实数据分析的一致性评估算法
  const results = papers.map((paper, index) => {
    // 1. 基于摘要长度的初步质量评估（较长的摘要通常包含更多信息）
    const abstractLengthScore = Math.min(100, paper.abstract.length / 5);
    
    // 2. 基于年份的新颖性评估（较新的论文可能更有价值）
    const currentYear = new Date().getFullYear();
    // 确保paper.year是有效的数字，且不大于当前年份
    let yearScore = 50; // 默认值
    let processedYear = paper.year;
    
    if (processedYear) {
      const paperYear = parseInt(processedYear, 10);
      if (!isNaN(paperYear)) {
        if (paperYear > currentYear) {
          // 如果年份大于当前年份，设置为Unknown
          processedYear = "Unknown";
        } else if (paperYear > 1900 && paperYear <= currentYear) {
          yearScore = Math.max(0, Math.min(100, 100 - (currentYear - paperYear) * 5));
        } else {
          // 如果年份无效（如小于1900），也设置为Unknown
          processedYear = "Unknown";
        }
      } else {
        // 如果无法解析为数字，设置为Unknown
        processedYear = "Unknown";
      }
    } else {
      // 如果没有年份信息，设置为Unknown
      processedYear = "Unknown";
    }
    
    // 3. 基于作者数量的合作质量评估（适中的作者数量通常表示较好的合作）
    const authorsCount = paper.authors ? paper.authors.split(',').length : 1;
    const authorScore = Math.max(0, Math.min(100, 100 - Math.abs(authorsCount - 4) * 10));
    
    // 4. 基于标题和摘要的关键词密度评估
    const text = `${paper.title} ${paper.abstract}`.toLowerCase();
    const wordCount = text.split(/\s+/).length;
    const uniqueWords = new Set(text.split(/\s+/)).size;
    const diversityScore = Math.max(0, Math.min(100, (uniqueWords / wordCount) * 100));
    
    // 5. 基于查询词的相关性评估
    let relevance = 50; // 默认相关性
    if (queryKeywords.length > 0) {
      // 计算查询词在论文中的出现次数和频率
      let totalMatches = 0;
      let titleMatchBonus = 0;
      const lowerTitle = paper.title.toLowerCase();
      const lowerAbstract = paper.abstract.toLowerCase();
      
      try {
        // 合并所有关键词为一个正则表达式，提高匹配效率
        const keywordRegex = new RegExp(`\\b(${queryKeywords.join('|')})\\b`, 'gi');
        
        // 匹配标题中的关键词
        const titleMatches = lowerTitle.match(keywordRegex) || [];
        titleMatchBonus = titleMatches.length * 5; // 标题中的匹配给予更高奖励
        
        // 匹配摘要中的关键词
        const abstractMatches = lowerAbstract.match(keywordRegex) || [];
        
        // 计算总匹配数
        totalMatches = titleMatches.length + abstractMatches.length;
        
        // 计算匹配频率（考虑论文长度）
        const textLength = (lowerTitle + ' ' + lowerAbstract).split(/\s+/).length;
        const matchFrequency = textLength > 0 ? (totalMatches / textLength) * 1000 : 0;
        
        // 综合计算相关性评分
        relevance = Math.min(100, 
          Math.max(0, 
            matchFrequency * 2 + titleMatchBonus + 
            // 基础分数和归一化调整
            Math.min(30, totalMatches * 3)
          )
        );
        
        // 确保非常相关的论文能获得高分
        if (totalMatches >= queryKeywords.length * 2) {
          relevance = Math.min(100, relevance + 10);
        }
      } catch (error) {
        console.error('Error in relevance calculation:', error);
        // 如果出现错误，使用默认相关性
        relevance = 50;
      }
    }
    
    // 综合计算一致性评分
    const consistency = Math.round(
      (abstractLengthScore * 0.25) + 
      (yearScore * 0.2) + 
      (authorScore * 0.2) + 
      (diversityScore * 0.25) +
      (relevance * 0.1) // 相关性也影响一致性评估
    );
    
    return {
      ...paper,
      year: processedYear, // 使用处理后的年份（可能是"Unknown"）
      consistency: Math.max(0, Math.min(100, consistency)), // 确保在0-100范围内
      relevance: Math.max(0, Math.min(100, relevance)) // 确保在0-100范围内
    };
  });
  
  // 返回一个已解决的Promise
  return Promise.resolve(results);
}

/**
 * 计算关键词频率（用于引用统计）
 * @param {Array} papers - 论文数组
 * @returns {Object} 关键词频率统计
 */
function calculateKeywordFrequency(papers) {
  const keywordCount = {};
  
  papers.forEach(paper => {
    // 合并标题和摘要作为文本源
    const text = `${paper.title} ${paper.abstract}`.toLowerCase();
    
    // 使用更复杂的分词方法
    // 移除标点符号并分割单词
    const words = text.replace(/[^\w\s]/g, '').split(/\s+/);
    
    words.forEach(word => {
      // 过滤常见词、短词和数字
      if (word.length > 3 && !stopWords.has(word) && isNaN(word)) {
        keywordCount[word] = (keywordCount[word] || 0) + 1;
      }
    });
  });
  
  // 转换为数组并排序
  const sortedKeywords = Object.entries(keywordCount)
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30); // 取前30个高频词以提供更多数据
  
  return sortedKeywords;
}

/**
 * 验证关键术语匹配
 * @param {Array} papers - 论文数组
 * @param {string} query - 搜索查询
 * @returns {Object} 包含匹配率和详细信息的对象
 */
function validateKeyTerms(papers, query) {
  if (!query || !papers || papers.length === 0) {
    return {
      matchRate: 0,
      details: []
    };
  }
  
  // 提取查询中的关键词（去除常见停用词）
  const queryKeywords = query.toLowerCase()
    .replace(/[^\w\s]/g, '') // 移除标点符号
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .map(word => word.replace(/[^\w]/g, ''));
  
  if (queryKeywords.length === 0) {
    return {
      matchRate: 0,
      details: []
    };
  }
  
  // 收集所有论文中的文本内容用于匹配
  const paperTexts = papers.map(paper => 
    `${paper.title} ${paper.abstract} ${paper.authors || ''}`.toLowerCase()
  );
  
  // 计算每个关键词的匹配情况
  // 为所有关键词创建一个正则表达式，提高匹配效率
  const keywordRegex = new RegExp(`\\b(${queryKeywords.join('|')})\\b`, 'gi');
  
  // 预先计算每篇论文文本中的关键词匹配情况
  const paperKeywordMatches = paperTexts.map(text => {
    const matches = text.match(keywordRegex) || [];
    const matchCount = {};
    
    // 统计每个关键词的出现次数
    matches.forEach(match => {
      const keyword = match.toLowerCase();
      matchCount[keyword] = (matchCount[keyword] || 0) + 1;
    });
    
    return matchCount;
  });
  
  // 计算每个关键词的匹配详情
  const matchDetails = queryKeywords.map(keyword => {
    let matchCount = 0;
    let totalOccurrences = 0;
    
    // 统计该关键词在所有论文中的匹配情况
    for (const paperMatches of paperKeywordMatches) {
      const occurrences = paperMatches[keyword] || 0;
      
      if (occurrences > 0) {
        matchCount++;
      }
      totalOccurrences += occurrences;
    }
    
    // 计算匹配率（包含该关键词的论文比例）
    const paperMatchRate = (matchCount / papers.length) * 100;
    
    // 计算平均出现频率
    const avgFrequency = totalOccurrences / papers.length;
    
    return {
      keyword,
      matchCount,
      totalOccurrences,
      paperMatchRate: Math.round(paperMatchRate),
      avgFrequency: Math.round(avgFrequency * 100) / 100,
      isWellMatched: paperMatchRate >= 70 // 至少70%的论文包含该关键词才认为是良好匹配
    };
  });
  
  // 计算总体匹配率（良好匹配的关键词比例）
  const wellMatchedKeywords = matchDetails.filter(detail => detail.isWellMatched).length;
  const matchRate = (wellMatchedKeywords / queryKeywords.length) * 100;
  
  // 幻觉风险评估
  const hallucinationRisk = matchRate < 30 ? 'high' : matchRate < 60 ? 'medium' : 'low';
  
  return {
    matchRate: Math.round(matchRate),
    details: matchDetails,
    hallucinationRisk,
    recommendations: getHallucinationRecommendations(hallucinationRisk, matchDetails)
  };
}

/**
 * 根据幻觉风险等级提供建议
 * @param {string} riskLevel - 风险等级 ('high', 'medium', 'low')
 * @param {Array} matchDetails - 关键词匹配详情
 * @returns {Array} 建议列表
 */
function getHallucinationRecommendations(riskLevel, matchDetails) {
  const recommendations = [];
  
  switch (riskLevel) {
    case 'high':
      recommendations.push('检测到高幻觉风险：搜索关键词与论文内容匹配度较低');
      recommendations.push('建议：尝试使用更精确的搜索词或增加限定条件，如年份、作者等');
      break;
    case 'medium':
      recommendations.push('检测到中等幻觉风险：部分关键词匹配度不足');
      recommendations.push('建议：检查搜索结果的相关性，谨慎对待分析结论，可尝试调整搜索词');
      break;
    case 'low':
      recommendations.push('幻觉风险较低：关键词匹配度良好');
      recommendations.push('建议：当前搜索结果具有较高的可信度，可放心参考分析结论');
      break;
  }
  
  // 添加具体的关键词匹配建议
  const poorlyMatched = matchDetails.filter(detail => !detail.isWellMatched);
  if (poorlyMatched.length > 0) {
    const poorKeywords = poorlyMatched.map(d => d.keyword).join(', ');
    recommendations.push(`注意：以下关键词匹配度较低: ${poorKeywords}`);
    recommendations.push('建议：考虑替换或补充这些关键词以提高搜索准确性');
  }
  
  // 如果有良好匹配的关键词，也给出正面反馈
  const wellMatched = matchDetails.filter(detail => detail.isWellMatched);
  if (wellMatched.length > 0) {
    const wellMatchedKeywords = wellMatched.map(d => d.keyword).join(', ');
    recommendations.push(`良好匹配的关键词: ${wellMatchedKeywords}`);
  }
  
  // 根据匹配详情提供额外建议
  if (matchDetails.length > 0) {
    const avgMatchRate = matchDetails.reduce((sum, detail) => sum + detail.paperMatchRate, 0) / matchDetails.length;
    if (avgMatchRate < 40) {
      recommendations.push('建议：考虑扩展搜索范围或使用更通用的术语');
    } else if (avgMatchRate > 80) {
      recommendations.push('提示：当前搜索结果高度集中，可能需要扩大搜索范围以获得更全面的视角');
    }
  }
  
  return recommendations;
}

/**
 * 翻译文本
 * @param {string} text - 要翻译的文本
 * @param {string} targetLang - 目标语言代码
 * @returns {Promise<string>} 翻译后的文本
 */
async function translateText(text, targetLang = 'zh') {
  // 构建翻译提示
  let prompt;
  if (targetLang === 'zh') {
    prompt = `请将以下英文文本翻译成中文，保持原意准确且自然流畅:\n\n${text}`;
  } else {
    prompt = `Please translate the following text to ${targetLang}:\n\n${text}`;
  }

  const messages = [
    {
      role: 'system',
      content: 'You are a professional translator. Your task is to accurately translate text while preserving the original meaning and tone. Provide only the translated text without any additional explanations.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  try {
    const response = await chatCompletion(messages, {
      temperature: 0.3,
      max_tokens: 2000
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error translating text:', error);
    throw error;
  }
}

module.exports = {
  chatCompletion,
  extractMethodFromAbstract,
  analyzePapers,
  evaluateConsistency,
  calculateKeywordFrequency,
  validateKeyTerms,
  translateText
};