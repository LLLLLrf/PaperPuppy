const axios = require('axios');
require('dotenv').config();

// 添加必要的调试信息
console.log('=== OpenAlex Client Loading ===');

// 保留sleep函数（可能在其他地方使用）
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 创建axios实例，只添加必要的User-Agent头
const createAxiosInstance = () => {
  // 构建符合OpenAlex文档要求的User-Agent头
  const userAgent = `PaperPuppyBot/1.0 (mailto:${process.env.OPENALEX_EMAIL || 'liaoruofan@yourdomain.com'})`;
  
  const instance = axios.create({
    timeout: 60000, // 增加超时时间以适应可能的延迟
    headers: {
      'User-Agent': userAgent
      // 只保留必要的User-Agent头，移除其他不必要的头信息
    }
  });
  
  // 添加简化的请求拦截器，只输出关键信息
  instance.interceptors.request.use(config => {
    console.log('=== OpenAlex API Request ===');
    console.log('URL:', config.url);
    console.log('Params:', config.params);
    return config;
  }, error => {
    console.error('OpenAlex API Request Error:', error.message);
    return Promise.reject(error);
  });
  
  // 添加简化的响应拦截器，只输出关键信息
  instance.interceptors.response.use(response => {
    console.log('=== OpenAlex API Response ===');
    console.log('Status:', response.status);
    console.log('Results count:', response.data.results ? response.data.results.length : 0);
    return response;
  }, error => {
    console.error('OpenAlex API Response Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      if (error.response.data) {
        console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      }
    }
    return Promise.reject(error);
  });
  
  return instance;
};

/**
 * 获取近1年特定学科领域被引用最多的论文
 * @param {number} maxResults - 最大结果数
 * @param {string} conceptId - 学科概念ID，默认是计算机科学
 * @returns {Promise<Array>} 论文数组
 */
async function getRecentPapers(maxResults = 30, conceptId = 'C41008148') {
  try {
    const today = new Date();
    console.log('OpenAlex: Today date:', today);
    
    // 计算1年前的日期
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const fromDate = oneYearAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];
    
    console.log('OpenAlex: Time range - from:', fromDate, 'to:', toDate);
    
    // 应用正确的过滤器：
    // 1. 只包含真论文：journal-article|proceedings-article|preprint
    // 2. 限制特定学科概念
    // 3. 时间范围
    const filter = [
      'type:journal-article|proceedings-article|preprint',
      `concepts.id:${conceptId}`,
      'primary_location.source.type:journal|conference',
      'has_doi:true',
      'primary_location.source.id:!null',
      'primary_location.source.host_organization:!null',
      `from_publication_date:${fromDate}`,
      `to_publication_date:${toDate}`
    ].join(',');
    
    // 使用稳定的查询参数模板
    const params = {
      'filter': filter,
      'sort': 'cited_by_count:desc',
      'per-page': maxResults, // 直接请求所需数量的结果
      'select': 'id,display_name,authorships,cited_by_count,primary_location,publication_date'
    };
    
    console.log('OpenAlex API params:', params);

    const response = await createAxiosInstance().get('https://api.openalex.org/works', { params });
    
    console.log('OpenAlex API response status:', response.status);
    console.log('OpenAlex API response data count:', response.data.results.length);
    
    // 过滤掉未来日期的论文（额外保险）
    const filteredResults = response.data.results.filter(paper => {
      const paperDate = new Date(paper.publication_date);
      const isFutureDate = paperDate > today;
      if (isFutureDate) {
        console.log('OpenAlex: Filtering out future date paper:', paper.display_name, 'published:', paper.publication_date);
      }
      return !isFutureDate;
    });
    
    console.log('OpenAlex: Filtered results count:', filteredResults.length);
    
    // 只返回前maxResults个结果
    const topResults = filteredResults.slice(0, maxResults);
    
    console.log('OpenAlex: Returning top', topResults.length, 'results');
    
    // 转换响应数据为前端兼容格式
    return topResults.map(paper => {
      // 提取venue信息
      let venue = '';
      if (paper.primary_location?.source?.display_name) {
        venue = paper.primary_location.source.display_name;
        // 提取会议或期刊信息
        if (paper.primary_location.source.type === 'journal') {
          venue = `Journal of ${venue}`;
        } else if (paper.primary_location.source.type === 'conference') {
          venue = `Proceedings of ${venue}`;
        }
      }
      
      const result = {
        title: paper.display_name,
        authors: paper.authorships?.map(auth => auth.author?.display_name || 'Unknown').join(', ') || 'Unknown Authors',
        citations: paper.cited_by_count,
        url: paper.primary_location?.landing_page_url || paper.id,
        published: paper.publication_date,
        venue: venue,
        pdf: paper.primary_location?.pdf_url || '',
        source: 'OpenAlex'
      };
      
      console.log('OpenAlex: Returning paper:', result.title, 'citations:', result.citations, 'published:', result.published);
      return result;
    });
  } catch (error) {
    console.error('Error fetching recent OpenAlex papers:', error.message);
    if (error.response) {
      console.error('OpenAlex API error response:', error.response.data);
      console.error('OpenAlex API error status:', error.response.status);
    }
    throw new Error(`Failed to fetch recent OpenAlex papers: ${error.message}`);
  }
}

/**
 * 从OpenAlex搜索论文
 * @param {string} searchTerm - 搜索词
 * @param {number} maxResults - 最大结果数
 * @returns {Promise<Array>} 论文数组
 */
async function searchPapers(searchTerm, maxResults = 30) {
  try {
    // 计算最近7天的日期
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const fromDate = sevenDaysAgo.toISOString().split('T')[0];
    
    const params = {
      'filter': `from_publication_date:${fromDate},concepts.id:C41008148`,
      'search': searchTerm,
      'sort': 'cited_by_count:desc',
      'per-page': maxResults
    };

    const response = await createAxiosInstance().get('https://api.openalex.org/works', { params });
    
    // 转换响应数据为前端兼容格式
    return response.data.results.map(paper => {
      const result = {
        title: paper.display_name,
        authors: paper.authorships?.map(auth => auth.author?.display_name || 'Unknown').join(', ') || 'Unknown Authors',
        citations: paper.cited_by_count,
        url: paper.primary_location?.landing_page_url || paper.id,
        published: paper.publication_date,
        source: 'OpenAlex'
      };
      
      // 只添加非unknown的字段
      if (paper.publication_year) result.year = paper.publication_year;
      if (paper.host_venue?.display_name) result.publication = paper.host_venue.display_name;
      
      return result;
    });
  } catch (error) {
    console.error('Error searching OpenAlex papers:', error.message);
    throw new Error(`Failed to search OpenAlex papers: ${error.message}`);
  }
}

// 直接执行测试（仅在直接运行此文件时执行）
if (require.main === module) {
  console.log('=== Running OpenAlex Client Test ===');
  
  // 测试创建axios实例
  const instance = createAxiosInstance();
  console.log('✅ axios instance created successfully');
  
  // 测试getRecentPapers函数
  getRecentPapers(5, 'C41008148')
    .then(papers => {
      console.log('✅ getRecentPapers returned', papers.length, 'papers');
      papers.forEach((paper, index) => {
        console.log(`${index + 1}. ${paper.title} (${paper.citations} citations)`);
      });
    })
    .catch(error => {
      console.error('❌ getRecentPapers failed:', error.message);
    })
    .finally(() => {
      console.log('=== Test Completed ===');
    });
}

module.exports = {
  getRecentPapers,
  searchPapers
};
