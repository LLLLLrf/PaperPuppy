const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

// 测试代理设置
async function testProxy() {
  console.log('Testing proxy configuration...');
  
  // 直接使用指定的代理设置
  const proxyUrl = 'http://127.0.0.1:7890';
  console.log('Using proxy:', proxyUrl);
  
  // 创建带代理的axios实例
  const config = {
    httpsAgent: new HttpsProxyAgent(proxyUrl),
    httpAgent: new HttpsProxyAgent(proxyUrl)
  };
  
  const client = axios.create(config);
  
  try {
    console.log('Attempting to access arXiv API through proxy...');
    const response = await client.get('http://export.arxiv.org/api/query?search_query=all:test&max_results=1', {
      timeout: 10000
    });
    
    if (response.status === 200) {
      console.log('✅ Successfully connected to arXiv API through proxy!');
      console.log('Response length:', response.data.length, 'characters');
    } else {
      console.log('❌ Unexpected response status:', response.status);
    }
  } catch (error) {
    console.log('❌ Failed to connect through proxy:', error.message);
  }
}

testProxy();