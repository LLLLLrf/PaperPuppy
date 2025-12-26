const { chatCompletion } = require('./chatApi');

/**
 * 根据主题聚类结果生成正式的学术综述
 * @param {string} themeSkeleton - 主题聚类结果
 * @param {string} language - 输出语言 ('en' 或 'zh')
 * @returns {Promise<string>} 生成的学术综述
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

请确保综述结构清晰，逻辑连贯，涵盖所有主要主题和研究方向。` :
    `
Based on the following research themes, write a formal academic survey paper with the following sections:
1. Introduction
2. Related Work
3. Method Taxonomy
4. Challenges
5. Future Work

Research Themes:
${validThemeSkeleton}

Please ensure the survey has a clear structure, logical flow, and covers all major themes and research directions.`;

  const messages = [
    systemMessage,
    { role: 'user', content: userMessageContent }
  ];

  const res = await chatCompletion(messages, { temperature: 0.7, max_tokens: 2000 });
  console.log('writeSurvey completed, survey length:', res.choices[0].message.content.length);
  console.log('writeSurvey end memory usage:', process.memoryUsage());
  return res.choices[0].message.content;
}

module.exports = { writeSurvey };
