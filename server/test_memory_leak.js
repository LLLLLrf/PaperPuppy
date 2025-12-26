// 测试内存泄漏问题
const { chatCompletion, calculateTokenCount } = require('./chatApi');
const { analyzePapers } = require('./chatAnywhereClient');

// 模拟论文数据
const mockPapers = [
  {
    title: "Machine Learning Basics",
    abstract: "This paper introduces the basics of machine learning, including supervised and unsupervised learning techniques.",
    authors: "John Doe, Jane Smith",
    year: "2020",
    url: "http://example.com/paper1"
  },
  {
    title: "Deep Learning Applications",
    abstract: "This paper discusses various applications of deep learning in computer vision and natural language processing.",
    authors: "Bob Johnson, Alice Williams",
    year: "2021",
    url: "http://example.com/paper2"
  }
];

// 测试函数
async function runTest() {
  console.log('Starting memory leak test...');
  
  for (let i = 0; i < 5; i++) {
    console.log(`\n=== Test iteration ${i+1} ===`);
    console.log('Memory before:', JSON.stringify(process.memoryUsage()));
    
    try {
      await analyzePapers(mockPapers, 'en');
      console.log('Analysis completed successfully');
    } catch (error) {
      console.error('Analysis failed:', error.message);
    }
    
    console.log('Memory after:', JSON.stringify(process.memoryUsage()));
    
    // 等待一下让垃圾回收器有机会工作
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n=== Test completed ===');
}

runTest();
