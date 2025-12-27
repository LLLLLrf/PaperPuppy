const axios = require('axios');

// 创建axios实例
const createAxiosInstance = () => {
  return axios.create({
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.5'
    }
  });
};

/**
 * 获取近半年计算机领域被引用最多的论文
 * @param {number} maxResults - 最大结果数
 * @returns {Promise<Array>} 论文数组
 */
async function getRecentPapers(maxResults = 30) {
  try {
    // 计算近半年的日期范围
    const today = new Date();
    console.log('OpenAlex: Today date:', today);
    
    // 计算6个月前的日期
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    
    // 格式化为YYYY-MM-DD
    const fromDate = sixMonthsAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];
    
    console.log('OpenAlex: Date range - from:', fromDate, 'to:', toDate);
    
    // 恢复日期过滤，使用正确的格式
    // 使用AND连接多个过滤条件（OpenAlex API要求）
    const params = {
      'filter': `from_publication_date:${fromDate}`,
      'sort': 'cited_by_count:desc',
      'per-page': maxResults * 2, // 请求更多数据，以便过滤后仍有足够结果
      'select': 'display_name,authorships,cited_by_count,primary_location,publication_date,publication_year'
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
    
    // 转换响应数据为前端兼容格式
    return filteredResults.map(paper => {
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

module.exports = {
  getRecentPapers,
  searchPapers
};
