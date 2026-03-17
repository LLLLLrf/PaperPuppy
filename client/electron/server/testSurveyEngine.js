// 测试脚本：验证 Recursive Distillation Survey Engine
const { analyzePapers } = require('./chatAnywhereClient');

// 模拟论文数据
const mockPapers = [
  {
    title: 'Large Language Models for Scientific Research',
    abstract: 'Large language models (LLMs) have shown promising results in various natural language processing tasks. This paper explores the application of LLMs in scientific research, particularly in literature review, hypothesis generation, and data analysis. We evaluate several state-of-the-art LLMs on a dataset of scientific papers and demonstrate their effectiveness in assisting researchers.',
    authors: 'John Smith, Jane Doe',
    year: 2023,
    url: 'https://example.com/paper1',
    source: 'arXiv'
  },
  {
    title: 'Evaluating the Performance of Transformer-based Models in Scientific Text Classification',
    abstract: 'Transformer-based models have revolutionized natural language processing. This study evaluates the performance of various transformer architectures in scientific text classification tasks. We compare BERT, RoBERTa, and GPT-2 on a dataset of scientific abstracts and discuss their strengths and limitations in handling specialized scientific terminology.',
    authors: 'Alice Johnson, Bob Brown',
    year: 2022,
    url: 'https://example.com/paper2',
    source: 'ACL'
  },
  {
    title: 'A Novel Framework for Automated Literature Review',
    abstract: 'Conducting a comprehensive literature review is a time-consuming task. This paper presents a novel framework for automated literature review that combines natural language processing techniques with machine learning algorithms. The framework can identify relevant papers, extract key information, and organize findings into coherent summaries, significantly reducing the time required for literature review.',
    authors: 'Charlie Wilson, Diana Lee',
    year: 2023,
    url: 'https://example.com/paper3',
    source: 'IEEE Transactions'
  }
];

// 测试函数
async function testSurveyEngine() {
  console.log('=== Testing Recursive Distillation Survey Engine ===\n');
  
  try {
    // 调用分析函数
    const survey = await analyzePapers(mockPapers, 'en');
    
    console.log('✓ Survey generation completed successfully!\n');
    console.log('Generated Survey:');
    console.log('=' .repeat(60));
    console.log(survey);
    console.log('=' .repeat(60));
    
    return true;
  } catch (error) {
    console.error('✗ Error during survey generation:', error);
    return false;
  }
}

// 执行测试
testSurveyEngine().then(success => {
  if (success) {
    console.log('\n=== Test completed successfully! ===');
  } else {
    console.log('\n=== Test failed! ===');
    process.exit(1);
  }
});
