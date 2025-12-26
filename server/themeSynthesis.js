const { chatCompletion } = require('./chatApi');

/**
 * 将多个 Knowledge Cards 聚类为研究主题
 * @param {Array} cards - Knowledge Cards 数组
 * @returns {Promise<string>} 主题聚类结果
 */
async function synthesizeThemes(cards) {
  console.log('Entering synthesizeThemes function, cards count:', cards.length);
  console.log('synthesizeThemes start memory usage:', process.memoryUsage());
  
  // 检查是否有有效的卡片
  const validCards = cards.filter(card => card && Object.values(card).some(value => value && value.trim()));
  
  if (validCards.length === 0) {
    console.log('No valid knowledge cards provided, returning default themes');
    // 返回默认主题
    return JSON.stringify([
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
  
  const messages = [
    { role: 'system', content: 'You are a survey methodologist.' },
    { role: 'user', content: `
Below are research cards of multiple papers.
Cluster them into 3–6 research themes.

For each theme give:
- theme_name
- shared_method
- representative_papers
- differences
- limitations

Cards:
${JSON.stringify(validCards)}
`}]

  const res = await chatCompletion(messages, { temperature: 0.2, max_tokens: 1200 });
  console.log('synthesizeThemes completed, response length:', res.choices[0].message.content.length);
  console.log('synthesizeThemes end memory usage:', process.memoryUsage());
  return res.choices[0].message.content;
}

module.exports = { synthesizeThemes };
