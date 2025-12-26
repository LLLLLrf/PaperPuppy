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
 * 获取近7天计算机领域被引用最多的论文
 * @param {number} maxResults - 最大结果数
 * @returns {Promise<Array>} 论文数组
 */
async function getRecentPapers(maxResults = 30) {
  try {
    // 计算最近7天的日期
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const fromDate = sevenDaysAgo.toISOString().split('T')[0];
    
    const params = {
      'filter': `from_publication_date:${fromDate},concepts.id:C41008148`,
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
    console.error('Error fetching recent OpenAlex papers:', error.message);
    throw new Error(`Failed to fetch recent OpenAlex papers: ${error.message}`);
  }
}

/**
 * 从OpenAlex搜索论文
 * @param {string} searchTerm - 搜索词
 * @param {number} maxResults - 最大结果数
 * @returns {Promise<Array>} 论文数组
 */
async function searchPapers(searchTerm, maxResults = 10) {
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
