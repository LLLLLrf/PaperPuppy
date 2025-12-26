// 测试html2pdf功能的脚本
const axios = require('axios');

async function testHtml2Pdf() {
  try {
    // 首先，使用API获取分析结果
    console.log('正在调用API获取分析结果...');
    const response = await axios.post('http://localhost:3001/api/analyze', {
      papers: [
        {
          "id": "1",
          "title": "Artificial Intelligence in Healthcare: Current Trends and Future Directions",
          "authors": "John Doe, Jane Smith",
          "year": 2023,
          "abstract": "This paper provides an overview of artificial intelligence applications in healthcare, including diagnosis, treatment planning, and patient monitoring. We discuss current trends and future directions for AI in medicine.",
          "url": "https://example.com/paper1"
        },
        {
          "id": "2",
          "title": "Machine Learning for Medical Image Analysis",
          "authors": "Alice Johnson, Bob Brown",
          "year": 2022,
          "abstract": "Machine learning algorithms have shown promising results in medical image analysis, particularly for detecting diseases like cancer from radiological images. This paper reviews recent advances in this field.",
          "url": "https://example.com/paper2"
        }
      ],
      language: "zh",
      query: "artificial intelligence healthcare"
    });

    console.log('API调用成功，分析结果获取完成');
    console.log('\n下一步：请在浏览器中访问 http://localhost:5174/');
    console.log('并使用相同的查询词 "artificial intelligence healthcare" 进行搜索');
    console.log('然后点击 "导出PDF (html2pdf)" 按钮测试导出功能');
    console.log('\n如果导出的PDF包含内容而不是空白页，则说明html2pdf功能已修复');

  } catch (error) {
    console.error('测试失败:', error.message);
    if (error.response) {
      console.error('API错误:', error.response.data);
    }
  }
}

testHtml2Pdf();