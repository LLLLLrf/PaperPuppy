const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const cheerio = require('cheerio');

// 创建带有代理的axios实例
const createAxiosInstance = () => {
  const config = {
    timeout: 30000, // 设置为30秒超时
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': 'https://scholar.google.com/',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
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
 * 构建Google Scholar搜索查询
 * @param {string} searchTerm - 搜索词
 * @param {number} maxResults - 最大结果数
 * @returns {string} 构造的查询URL
 */
function buildScholarQuery(searchTerm, maxResults = 5) {
  // Google Scholar每页约10个结果，我们需要计算需要多少页
  const pages = Math.ceil(maxResults / 10);
  const queries = [];
  
  for (let i = 0; i < pages; i++) {
    const start = i * 10;
    const params = new URLSearchParams({
      hl: 'en',
      as_sdt: '0,5',
      q: searchTerm,
      num: Math.min(10, maxResults - start),
      start: start
    });
    
    queries.push(`https://scholar.google.com/scholar?${params.toString()}`);
  }
  
  return queries;
}

/**
 * 解析Google Scholar HTML响应
 * @param {string} htmlData - HTML格式的页面内容
 * @returns {Array} 解析后的论文数组
 */
function parseScholarResponse(htmlData) {
  const papers = [];
  const $ = cheerio.load(htmlData);
  
  // 查找所有文章容器
  $('.gs_r.gs_or.gs_scl').each((index, element) => {
    const paper = {
      source: 'Google Scholar'
    };
    
    // 提取标题和链接
    const titleElement = $(element).find('.gs_rt');
    if (titleElement.length) {
      paper.title = titleElement.text().trim();
      const linkElement = titleElement.find('a');
      if (linkElement.length) {
        paper.url = linkElement.attr('href');
      }
    }
    
    // 提取作者信息
    const authorElement = $(element).find('.gs_a');
    if (authorElement.length) {
      const authorText = authorElement.text();
      const parts = authorText.split('-');
      if (parts.length >= 2) {
        paper.authors = parts[0].trim();
        const pubInfo = parts[1].trim();
        
        // 查找年份
        const yearMatch = pubInfo.match(/(\d{4})/);
        if (yearMatch) {
          paper.year = yearMatch[0];
        }
        
        paper.publication = pubInfo;
      }
    }
    
    // 提取摘要
    const abstractElement = $(element).find('.gs_rs');
    if (abstractElement.length) {
      paper.abstract = abstractElement.text().trim();
      // 去除可能的省略号和截断标记
      paper.abstract = paper.abstract.replace(/\.\.\.\s*$/, '');
      paper.abstract = paper.abstract.replace(/\[\.\.\.\]/g, '');
    }
    
    // 提取引用信息
    const citationElement = $(element).find('.gs_fl a[href*="cites="]');
    if (citationElement.length) {
      const citationText = citationElement.text();
      const citationMatch = citationText.match(/(\d+)/);
      if (citationMatch) {
        paper.citations = parseInt(citationMatch[0]);
      }
    }
    
    // 提取PDF链接
    const pdfElement = $(element).find('.gs_ggs a');
    if (pdfElement.length) {
      paper.pdf_url = pdfElement.attr('href');
    }
    
    // 添加发布日期
    if (paper.year) {
      paper.published = `${paper.year}-01-01T00:00:00Z`;
    }
    
    // 只有当至少有标题时才添加到结果
    if (paper.title) {
      papers.push(paper);
    }
  });
  
  return papers;
}

/**
 * 从Google Scholar搜索论文
 * @param {string} searchTerm - 搜索词
 * @param {number} maxResults - 最大结果数
 * @param {number} retryCount - 重试次数
 * @returns {Promise<Array>} 论文数组
 */
async function searchPapers(searchTerm, maxResults = 5, retryCount = 3) {
  try {
    const queries = buildScholarQuery(searchTerm, maxResults);
    const axiosInstance = createAxiosInstance();
    let allPapers = [];
    
    // 依次访问每个页面
    for (const url of queries) {
      console.log(`Searching Google Scholar with URL: ${url}`);
      
      const response = await axiosInstance.get(url);
      
      if (response.status === 200) {
        const papers = parseScholarResponse(response.data);
        allPapers = [...allPapers, ...papers];
        
        // 如果已经获取了足够的结果，提前结束
        if (allPapers.length >= maxResults) {
          allPapers = allPapers.slice(0, maxResults);
          break;
        }
      } else {
        throw new Error(`Google Scholar returned status ${response.status}`);
      }
      
      // 添加短暂延迟，避免被封禁
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return allPapers;
  } catch (error) {
    // 处理速率限制、封禁或网关错误
    if ((error.response && (error.response.status === 429 || error.response.status === 503 || error.response.status === 502)) && retryCount > 0) {
      const statusCode = error.response.status;
      const errorType = statusCode === 429 ? 'Rate limited' : statusCode === 503 ? 'Service unavailable' : 'Gateway error';
      console.log(`${errorType}. Retrying in 10 seconds... (${retryCount} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 10000));
      return searchPapers(searchTerm, maxResults, retryCount - 1);
    }
    
    // 处理超时错误
    if ((error.code === 'ECONNABORTED' || error.message.includes('timeout')) && retryCount > 0) {
      console.log(`Request timeout. Retrying in 5 seconds... (${retryCount} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return searchPapers(searchTerm, maxResults, retryCount - 1);
    }
    
    // 处理网络错误
    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      throw new Error('Network connection error. Please check your internet connection.');
    }
    
    // 如果重试次数已用完，返回空数组而不是抛出错误
    if (retryCount <= 0) {
      console.error('Max retries reached. Returning empty array.');
      return [];
    }
    
    console.error('Error searching Google Scholar:', error.message);
    throw new Error(`Failed to search Google Scholar: ${error.message}`);
  }
}

module.exports = {
  searchPapers
};
