const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

// arXiv API base URL
const ARXIV_API_BASE = 'https://export.arxiv.org/api/query';

// 创建带有代理的axios实例
const createAxiosInstance = () => {
  const config = {
    timeout: 30000, // 设置为30秒超时
    headers: {
      'User-Agent': 'ResearchAnalyzer/1.0 (research.analyzer@example.com)'
    }
  };

  // 检查环境变量中的代理设置
  const httpProxy = process.env.http_proxy || process.env.HTTP_PROXY;
  const httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY;

  if (httpsProxy) {
    config.httpsAgent = new HttpsProxyAgent(httpsProxy);
  }

  if (httpProxy && !httpsProxy) {
    config.httpAgent = new HttpsProxyAgent(httpProxy);
  }

  return axios.create(config);
};

/**
 * 构建arXiv搜索查询
 * @param {string} searchTerm - 搜索词
 * @param {number} maxResults - 最大结果数
 * @returns {string} 构造的查询URL
 */
function buildArxivQuery(searchTerm, maxResults = 10) {
  // 构造查询参数
  const params = new URLSearchParams({
    search_query: `all:${searchTerm}`,
    start: 0,
    max_results: maxResults,
    sortBy: 'submittedDate',
    sortOrder: 'descending'
  });
  
  return `${ARXIV_API_BASE}?${params.toString()}`;
}

/**
 * 解析arXiv API响应
 * @param {string} xmlData - XML格式的API响应
 * @returns {Array} 解析后的论文数组
 */
function parseArxivResponse(xmlData) {
  const papers = [];
  
  // 使用正则表达式提取论文信息
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  
  while ((match = entryRegex.exec(xmlData)) !== null) {
    const entry = match[1];
    
    // 提取标题
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : '';
    
    // 提取作者
    const authors = [];
    const authorRegex = /<author>\s*<name>(.*?)<\/name>\s*<\/author>/g;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entry)) !== null) {
      authors.push(authorMatch[1]);
    }
    
    // 提取摘要
    const abstractMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
    const abstract = abstractMatch ? abstractMatch[1].trim().replace(/\s+/g, ' ') : '';
    
    // 提取发布日期
    const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
    const published = publishedMatch ? publishedMatch[1] : '';
    
    // 提取ID
    const idMatch = entry.match(/<id>(.*?)<\/id>/);
    const id = idMatch ? idMatch[1] : '';
    
    // 提取分类
    const categories = [];
    const categoryRegex = /<category term="(.*?)"\/>/g;
    let categoryMatch;
    while ((categoryMatch = categoryRegex.exec(entry)) !== null) {
      categories.push(categoryMatch[1]);
    }
    
    if (title && abstract) {
      papers.push({
        id: id,
        url: id, // 保留原始ID格式，如http://arxiv.org/abs/1234.56789
        title: title,
        authors: authors.join(', '),
        abstract: abstract,
        published: published,
        year: published ? new Date(published).getFullYear() : '',
        categories: categories,
        source: 'arXiv'
      });
    }
  }
  
  return papers;
}

/**
 * 从arXiv搜索论文
 * @param {string} searchTerm - 搜索词
 * @param {number} maxResults - 最大结果数
 * @param {number} retryCount - 重试次数
 * @returns {Promise<Array>} 论文数组
 */
async function searchPapers(searchTerm, maxResults = 10, retryCount = 3) {
  try {
    const queryUrl = buildArxivQuery(searchTerm, maxResults);
    console.log(`Searching arXiv with URL: ${queryUrl}`);
    
    // 使用带有代理配置的axios实例
    const axiosInstance = createAxiosInstance();
    const response = await axiosInstance.get(queryUrl);
    
    if (response.status === 200) {
      return parseArxivResponse(response.data);
    } else {
      throw new Error(`arXiv API returned status ${response.status}`);
    }
  } catch (error) {
    // 处理速率限制错误 (429) 和网关错误 (502)
    if (error.response && (error.response.status === 429 || error.response.status === 502) && retryCount > 0) {
      const errorType = error.response.status === 429 ? 'rate limit' : 'gateway';
      console.log(`Hit ${errorType} error. Retrying in 5 seconds... (${retryCount} retries left)`);
      // 等待5秒后重试
      await new Promise(resolve => setTimeout(resolve, 5000));
      return searchPapers(searchTerm, maxResults, retryCount - 1);
    }
    
    // 处理超时错误
    if ((error.code === 'ECONNABORTED' || error.message.includes('timeout')) && retryCount > 0) {
      console.log(`Request timeout. Retrying in 3 seconds... (${retryCount} retries left)`);
      // 等待3秒后重试
      await new Promise(resolve => setTimeout(resolve, 3000));
      return searchPapers(searchTerm, maxResults, retryCount - 1);
    }
    
    // 处理网络错误
    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      throw new Error('Network connection error. Please check your internet connection.');
    }
    
    // 如果重试次数已用完，返回空数组而不是抛出错误
    if (retryCount <= 0) {
      console.error('Max retries reached. Returning empty array.');
      return []; // 返回空数组而不是抛出错误
    }
    
    console.error('Error searching arXiv:', error.message);
    throw new Error(`Failed to search arXiv: ${error.message}`);
  }
}

module.exports = {
  searchPapers
};