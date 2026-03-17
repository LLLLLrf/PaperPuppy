const { chatCompletion } = require('./chatApi');

/**
 * 根据主题聚类结果生成正式的学术综述
 * @param {string} themeSkeleton - 主题聚类结果
 * @param {string} language - 输出语言 ('en' 或 'zh')
 * @returns {Promise<Object>} 包含生成的学术综述和置信度评分的对象
 */
async function writeSurvey(themeSkeleton, language = 'en') {
  console.log('Entering writeSurvey function, skeleton length:', themeSkeleton.length);
  console.log('writeSurvey start memory usage:', process.memoryUsage());
  
  // 检查主题聚类结果是否有效
  let validThemeSkeleton = themeSkeleton;
  
  // 如果主题骨架为空或不完整，使用默认主题
  if (!validThemeSkeleton || validThemeSkeleton.length < 10) {
    console.log('Invalid theme skeleton provided, using default themes');
    validThemeSkeleton = JSON.stringify([
      {
        "theme_name": "主题1：基础研究",
        "shared_method": "基础研究方法",
        "representative_papers": "论文1, 论文2",
        "differences": "研究侧重点不同",
        "limitations": "研究范围有限"
      },
      {
        "theme_name": "主题2：应用研究",
        "shared_method": "应用研究方法",
        "representative_papers": "论文3, 论文4",
        "differences": "应用场景不同",
        "limitations": "实际应用挑战"
      }
    ]);
  }
  
  // 根据语言设置系统消息
  const systemMessage = {
    role: 'system',
    content: language === 'zh' ?
      '你是一位学术综述专家，擅长撰写结构化的研究综述论文。' :
      'You are an academic survey expert, skilled in writing structured research survey papers.'
  };

  // 根据语言设置用户消息
  const userMessageContent = language === 'zh' ?
    `
基于以下研究主题，撰写一篇正式的学术综述论文，包含以下章节：
1. 引言
2. 相关工作
3. 方法分类
4. 挑战
5. 未来工作

研究主题：
${validThemeSkeleton}

重要要求：
- 必须在综述中明确引用每个主题的代表性论文(representative_papers)，特别是在"相关工作"和"方法分类"章节中
- 请保留代表性论文的完整标题和链接格式 [Paper Title](URL)
- 综述内容必须紧密围绕提供的研究主题展开，确保涵盖所有主要主题和研究方向
- 结构清晰，逻辑连贯，语言学术化
` :
    `
Based on the following research themes, write a formal academic survey paper with the following sections:
1. Introduction
2. Related Work
3. Method Taxonomy
4. Challenges
5. Future Work

Research Themes:
${validThemeSkeleton}

Important Requirements:
- Must explicitly reference the representative papers of each theme in the survey, especially in the "Related Work" and "Method Taxonomy" sections
- Please preserve the complete title and link format [Paper Title](URL) for representative papers
- The survey content must be closely focused on the provided research themes, ensuring coverage of all major themes and research directions
- Clear structure, logical flow, and academic language
`;

  const messages = [
    systemMessage,
    { role: 'user', content: userMessageContent }
  ];

  const res = await chatCompletion(messages, { temperature: 0.3, max_tokens: 2000 });
  const survey = res.choices[0].message.content;
  console.log('writeSurvey completed, survey length:', survey.length);
  
  // 第四步：评估综述的置信度和相关度
  console.log('Evaluating survey confidence and relevance...');
  
  // 根据语言设置置信度评价的系统消息
  const confidenceSystemMessage = {
    role: 'system',
    content: language === 'zh' ?
      '你是一位学术评价专家，擅长评估综述论文的置信度和相关度。请基于原始的主题聚类结果，对生成的综述进行客观评价。' :
      'You are an academic evaluation expert, skilled in assessing the confidence and relevance of survey papers. Please objectively evaluate the generated survey based on the original theme clustering results.'
  };
  
  // 根据语言设置置信度评价的用户消息
  const confidenceUserMessageContent = language === 'zh' ?
    `
请基于以下原始主题聚类结果，评估生成的综述论文的置信度和相关度：

原始主题聚类结果：
${validThemeSkeleton}

生成的综述论文：
${survey}

请从以下几个方面进行评价：
1. 综述内容与原始主题聚类结果的相关度（0-10分）
2. 综述内容的完整性和全面性（0-10分）
3. 综述内容的逻辑连贯性（0-10分）
4. 综述内容的学术严谨性（0-10分）

请以JSON格式输出评价结果，包含以下字段：
- relevance_score: 相关度评分（0-10）
- completeness_score: 完整性评分（0-10）
- coherence_score: 逻辑连贯性评分（0-10）
- rigor_score: 学术严谨性评分（0-10）
- overall_confidence: 综合置信度评分（0-10，取上述四项的平均值）
- evaluation_comment: 简要评价意见（200字以内）
` :
    `
Please evaluate the confidence and relevance of the generated survey paper based on the following original theme clustering results:

Original theme clustering results:
${validThemeSkeleton}

Generated survey paper:
${survey}

Please evaluate from the following aspects:
1. Relevance between survey content and original theme clustering results (0-10 points)
2. Completeness and comprehensiveness of survey content (0-10 points)
3. Logical coherence of survey content (0-10 points)
4. Academic rigor of survey content (0-10 points)

Please output the evaluation results in JSON format, including the following fields:
- relevance_score: Relevance score (0-10)
- completeness_score: Completeness score (0-10)
- coherence_score: Coherence score (0-10)
- rigor_score: Rigor score (0-10)
- overall_confidence: Overall confidence score (0-10, average of the above four items)
- evaluation_comment: Brief evaluation comments (within 200 words)
`;
  
  const confidenceMessages = [
    confidenceSystemMessage,
    { role: 'user', content: confidenceUserMessageContent }
  ];
  
  const confidenceRes = await chatCompletion(confidenceMessages, { temperature: 0, max_tokens: 500 });
  let evaluation;
  
  try {
    // 解析置信度评价结果
    let evaluationContent = confidenceRes.choices[0].message.content;
    // 移除Markdown代码块标记
    if (evaluationContent.startsWith('```json')) {
      evaluationContent = evaluationContent.replace(/^```json\n/, '').replace(/```$/, '').trim();
    }
    evaluation = JSON.parse(evaluationContent);
    console.log('✓ Confidence evaluation completed successfully');
  } catch (error) {
    console.error('Error parsing confidence evaluation JSON:', error);
    console.error('Evaluation response:', confidenceRes.choices[0].message.content);
    // 如果解析失败，使用默认的评价结果
    evaluation = {
      relevance_score: 7,
      completeness_score: 7,
      coherence_score: 7,
      rigor_score: 7,
      overall_confidence: 7,
      evaluation_comment: language === 'zh' ? '评价结果解析失败，使用默认评分' : 'Failed to parse evaluation result, using default score'
    };
  }
  
  console.log('Confidence evaluation result:', JSON.stringify(evaluation, null, 2));
  console.log('writeSurvey end memory usage:', process.memoryUsage());
  
  // 返回包含综述和置信度评价的对象
  return {
    survey: survey,
    confidence: evaluation
  };
}

module.exports = { writeSurvey };
