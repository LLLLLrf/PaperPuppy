const axios = require('axios');
require('dotenv').config();

/**
 * 从Semantic Scholar搜索论文
 * @param {string} query - 搜索词
 * @param {number} limit - 最大结果数
 * @returns {Promise<Array>} 论文数组
 */
async function searchPapers(query, limit = 12) {
  try {
    const url = 'https://api.semanticscholar.org/graph/v1/paper/search';
    const params = {
      query: query,
      limit: limit,
      fields: 'title,authors,year,venue,abstract,citationCount,url'
    };
    
    const headers = {
      'x-api-key': process.env.SEMANTIC_API_KEY
    };
    const response = await axios.get(url, { params, headers });
    // response.raiseForStatus();
    const data = response.data.data;
    
    // 转换格式以匹配现有系统
    return data.map(paper => {
      // 转换作者格式
      const authors = paper.authors ? paper.authors.map(author => author.name).join(', ') : '';
      
      return {
        id: paper.id || '',
        title: paper.title || '',
        authors: authors || '',
        abstract: paper.abstract || '',
        year: paper.year ? paper.year.toString() : '',
        source: 'Semantic Scholar',
        url: paper.url || '',
        citationCount: paper.citationCount || 0,
        publication: paper.venue || ''
      };
    });
  } catch (error) {
    console.error('Error searching Semantic Scholar:', error.message);
    if (error.response) {
      console.error('Semantic Scholar API error:', error.response.status, error.response.data);
    }
    // 返回空数组而不是抛出错误，以便系统可以处理
    return [];
  }
}

module.exports = {
  searchPapers
};
