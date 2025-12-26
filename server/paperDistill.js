const { chatCompletion } = require('./chatApi');

/**
 * 将论文摘要转换为结构化的 Knowledge Card
 * @param {Object} paper - 论文对象，包含 title, abstract 等字段
 * @returns {Promise<Object>} 结构化的 Knowledge Card
 */
async function distillPaper(paper) {
  const messages = [
    { role: 'system', content: 'You are a scientific knowledge extractor. Output ONLY JSON.' },
    { role: 'user', content: `
From the paper abstract below extract a structured research card in JSON:

{
 "task": "",
 "problem": "",
 "method": "",
 "architecture": "",
 "privacy_mechanism": "",
 "training_setting": "",
 "dataset": "",
 "metric": "",
 "result": "",
 "limitation": "",
 "contribution": ""
}

Abstract:
${paper.abstract}
`}]

  const res = await chatCompletion(messages, { temperature: 0, max_tokens: 600 });
  // 确保返回的是 JSON 对象，而不是字符串
  try {
    let content = res.choices[0].message.content;
    // 移除Markdown代码块标记
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\n/, '').replace(/```$/, '').trim();
    }
    return JSON.parse(content);
  } catch (error) {
    console.error('Error parsing Knowledge Card JSON:', error);
    console.error('Response content:', res.choices[0].message.content);
    // 返回一个默认的空 Knowledge Card
    return {
      task: "",
      problem: "",
      method: "",
      architecture: "",
      privacy_mechanism: "",
      training_setting: "",
      dataset: "",
      metric: "",
      result: "",
      limitation: "",
      contribution: ""
    };
  }
}

module.exports = { distillPaper };
