<template>
  <div class="research-analyzer">
    <div class="header">
      <div class="logo-container">
        <img src="../assets/logo.png" alt="PaperPuppy Logo" class="logo">
        <img src="../assets/paperpuppy.png" alt="PaperPuppy" class="brand-name">
      </div>
      <h2>自动化研究现状收集与去幻觉系统</h2>
    </div>
    
    <div class="search-section">
      <div class="language-toggle">
        <button 
          @click="setLanguage('en')" 
          :class="{ active: currentLanguage === 'en' }"
          class="lang-btn"
        >
          EN
        </button>
        <button 
          @click="setLanguage('zh')" 
          :class="{ active: currentLanguage === 'zh' }"
          class="lang-btn"
        >
          CN
        </button>
      </div>
      <input 
        v-model="searchQuery" 
        placeholder="请输入研究主题关键词" 
        class="search-input"
        @keyup.enter="analyzeResearch"
      />
      <button @click="analyzeResearch" :disabled="isLoading" class="search-button">
        {{ isLoading ? '分析中...' : '开始分析' }}
      </button>
    </div>

    <div v-if="isLoading" class="loading">
      <h3>{{ currentMainStep || '正在分析研究主题...' }}</h3>
      <p class="loading-time">{{ loadingTime.toFixed(1) }}s</p>
      <div class="spinner"></div>
      <p class="loading-status">{{ loadingStatus || '正在准备...' }}</p>
    </div>

    <div v-else>
      <!-- 调试信息 -->
      <div class="debug-info" v-if="false">
        <p>analysisResult: {{ analysisResult }}</p>
        <p>error: {{ error }}</p>
        <p>recentOpenAlexPapers.length: {{ recentOpenAlexPapers.length }}</p>
        <p>recentArxivPapers.length: {{ recentArxivPapers.length }}</p>
        <p>isLoadingRecentPapers: {{ isLoadingRecentPapers }}</p>
        <p>recentPapersError: {{ recentPapersError }}</p>
        <p>currentPaperSource: {{ currentPaperSource }}</p>
      </div>
      <!-- 研究综述结果 - 只在有分析结果时显示 -->
      <div v-if="analysisResult" class="results-section">
        <div class="summary-card">
          <h2>研究综述</h2>
          <div class="summary-content" v-html="formattedSummary"></div>
          
          <div class="confidence-score">
            <h3>置信度评分: {{ confidenceScore }}%</h3>
            <div class="score-bar">
              <div class="score-fill" :style="{ width: confidenceScore + '%' }"></div>
            </div>
          </div>
        </div>

        <div class="literature-section">
          <h2>相关文献</h2>
          <div class="literature-controls">
            <select v-model="sortOption" class="sort-select">
              <option value="relevance">按相关性排序</option>
              <option value="year">按年份排序</option>
              <option value="consistency">按一致性排序</option>
            </select>
          </div>
          <div class="literature-list">
            <div 
              v-for="(paper, index) in sortedPapers" 
              :key="index" 
              class="paper-card"
            >
              <h3>
                <a :href="paper.url" target="_blank" rel="noopener noreferrer" class="paper-link">
                  {{ paper.title }}
                </a>
              </h3>
              <p class="authors">{{ paper.authors }}</p>
              <p class="abstract">{{ paper.abstract }}</p>
              <div class="paper-meta">
                <span class="year">{{ paper.year }}</span>
                <span class="source">来源: {{ paper.source }}</span>
                <span v-if="paper.citationCount || paper.citations" class="citations">
                  引用量: {{ paper.citationCount || paper.citations }}
                </span>
                <span class="consistency">一致性: {{ paper.consistency.toFixed(2) }}%</span>
                <span class="relevance">相关性: {{ paper.relevance.toFixed(2) }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 研究时间轴 -->
        <ResearchTimeline :papers="papers" />

        <!-- 主题结构图谱 -->
        <TopicGraph :papers="papers" />
        
        <!-- 幻觉控制机制 -->
        <HallucinationControl 
          :confidence-score="confidenceScore" 
          :key-term-validation="analysisResult.keyTermValidation" 
          :word-cloud-data="analysisResult.wordCloudData"
        />

        <div class="export-section">
          <button @click="exportMarkdown" class="export-btn" :disabled="isExporting">
            {{ isExporting ? '导出中...' : '导出Markdown' }}
          </button>
          <button @click="exportPDF" class="export-btn" :disabled="isExporting">
            {{ isExporting ? '导出中...' : '导出PDF (jsPDF)' }}
          </button>
          <button @click="exportPDFWithHtml2Canvas" class="export-btn" :disabled="isExporting">
            {{ isExporting ? '导出中...' : '导出PDF (html2pdf)' }}
          </button>
          <button @click="exportMarkdownAsPDF" class="export-btn" :disabled="isExporting">
            {{ isExporting ? '导出中...' : '导出Markdown为PDF' }}
          </button>
        </div>
      </div>

      <!-- 错误信息 -->
      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
      </div>
      
      <!-- 热点文章展示 - 只在没有分析结果和错误时显示 -->
      <div v-else class="recent-papers-section">
        <div class="papers-header">
          <h2>
            <span @click="togglePaperSource" class="source-toggle">
              {{ currentPaperSource === 'openalex' ? 'OpenAlex' : 'arXiv' }}
              <span class="toggle-arrow">▼</span>
            </span>
            {{ currentPaperSource === 'openalex' ? '近一年热点文章' : '近一周热点文章' }}
          </h2>
        </div>
        
        <div v-if="isLoadingRecentPapers" class="loading">
          <p>正在加载热点文章...</p>
          <div class="spinner"></div>
        </div>
        
        <div v-else-if="recentPapersError" class="error">
          <p>{{ recentPapersError }}</p>
        </div>
        
        <div v-else-if="(currentPaperSource === 'openalex' && recentOpenAlexPapers.length === 0) || (currentPaperSource === 'arxiv' && recentArxivPapers.length === 0)" class="no-data">
          <p>暂无热点文章数据</p>
        </div>
        
        <div v-else class="papers-grid">
          <div 
            v-for="(paper, index) in (currentPaperSource === 'openalex' ? recentOpenAlexPapers : recentArxivPapers)" 
            :key="index" 
            class="paper-card"
          >
            <h3>
              <a :href="paper.url" target="_blank" rel="noopener noreferrer" class="paper-link">
                {{ paper.title }}
              </a>
            </h3>
            <p class="authors">{{ paper.authors }}</p>
            <div class="paper-meta">
              <span v-if="paper.published || paper.date" class="date">{{ paper.published || paper.date }}</span>
              <span v-if="paper.publication || paper.category" class="category">{{ paper.publication || paper.category }}</span>
              <span v-if="currentPaperSource === 'openalex' && paper.citations" class="citations">引用量: {{ paper.citations }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2pdf from 'html2pdf.js'
import ResearchTimeline from './ResearchTimeline.vue'
import TopicGraph from './EnhancedTopicGraph.vue'
import HallucinationControl from './HallucinationControl.vue'
import { marked } from 'marked'

// 响应式数据
const searchQuery = ref('')
const isLoading = ref(false)
const isTranslating = ref(false)
const isExporting = ref(false)
const analysisResult = ref(null)
const papers = ref([])
const confidenceScore = ref(0)
const error = ref('')
const sortOption = ref('relevance')
const isTranslated = ref(false) // 跟踪是否已翻译
const originalSummary = ref('') // 存储原文
const translatedSummary = ref('') // 存储翻译后的文本
const currentLanguage = ref('en') // 当前显示的语言

// 加载计时相关
const loadingTime = ref(0) // 加载时间（秒）
const loadingStatus = ref('') // 当前加载状态
const processingLogs = ref([]) // 处理过程日志
const currentMainStep = ref('') // 当前主要步骤（显示在h3标签中）
let loadingTimer = null // 计时器引用

// 热点文章相关数据
const recentArxivPapers = ref([])
const recentOpenAlexPapers = ref([])
const isLoadingRecentPapers = ref(false)
const recentPapersError = ref('')
const currentPaperSource = ref('openalex') // 默认显示OpenAlex

// 计算属性
const formattedSummary = computed(() => {
  if (!analysisResult.value) return ''
  
  // 根据当前语言显示对应的综述内容
  const summaryToShow = isTranslated.value && translatedSummary.value 
    ? translatedSummary.value 
    : analysisResult.value.summary
  
  // 使用marked渲染Markdown格式
  return marked(summaryToShow)
})

const sortedPapers = computed(() => {
  if (!papers.value || papers.value.length === 0) return []
  
  // 根据选择的排序选项对文献进行排序
  switch (sortOption.value) {
    case 'year':
      return [...papers.value].sort((a, b) => b.year - a.year)
    case 'consistency':
      return [...papers.value].sort((a, b) => b.consistency - a.consistency)
    case 'relevance':
    default:
      return [...papers.value].sort((a, b) => b.relevance - a.relevance)
  }
})

// 日志解析函数（模拟实时更新）
const parseProcessingLogs = (logs) => {
    console.log('parseProcessingLogs called with logs:', logs);
    
    // 如果没有日志，直接结束
    if (!logs || logs.length === 0) {
      console.log('No logs to process');
      setTimeout(() => {
        currentMainStep.value = '';
        loadingStatus.value = '';
        isLoading.value = false;
      }, 1000);
      return;
    }
    
    // 定义大步骤的模式
    const mainStepPatterns = [
      /^Request body:/, // 请求体信息
      /^Processing \d+ papers/, // 处理论文
      /^\d+\. 开始调用/, // 开始调用函数
      /^✓ .* completed/, // 函数完成
      /^\d+\. 开始生成/, // 开始生成
      /^✓ .* 生成完成/, // 生成完成
      /^7\. 准备发送响应/, // 准备响应
      /^✓ Response data prepared successfully/ // 响应准备完成
    ];

    // 使用定时器逐行显示日志，模拟实时更新
    let logIndex = 0;
    const logInterval = setInterval(() => {
      if (logIndex < logs.length) {
        const log = logs[logIndex];
        console.log(`Processing log ${logIndex + 1}/${logs.length}:`, log);
        
        // 检查是否是大步骤
        const isMainStep = mainStepPatterns.some(pattern => pattern.test(log));
        
        if (isMainStep) {
          // 更新主要步骤
          currentMainStep.value = log;
          // 清空细节步骤，因为大步骤已经说明了当前正在做什么
          loadingStatus.value = '';
          console.log('Updated currentMainStep:', currentMainStep.value);
        } else {
          // 更新细节步骤
          loadingStatus.value = log;
          console.log('Updated loadingStatus:', loadingStatus.value);
        }
        logIndex++;
      } else {
        // 所有日志显示完毕，清除定时器并延迟隐藏loading组件
        clearInterval(logInterval);
        console.log('All logs processed');
        // 延迟1秒后重置加载状态并隐藏loading组件，让用户有足够时间看到完整日志
        setTimeout(() => {
          currentMainStep.value = '';
          loadingStatus.value = '';
          isLoading.value = false;
          console.log('Reset loading state');
        }, 1000);
      }
    }, 200); // 每200毫秒显示一条日志
  }

// 方法
const analyzeResearch = async () => {
  if (!searchQuery.value.trim()) {
    error.value = '请输入研究主题关键词'
    return
  }

  isLoading.value = true
  error.value = ''
  
  // 初始化加载计时
  loadingTime.value = 0
  currentMainStep.value = 'Searching from arXiv and Google Scholar…'
  loadingStatus.value = ''
  
  // 清除之前的定时器
  if (loadingTimer) {
    clearInterval(loadingTimer)
  }
  
  // 启动定时器，每100毫秒更新一次加载时间
  loadingTimer = setInterval(() => {
    loadingTime.value += 0.1
  }, 100)
  
  // 用于取消请求的控制器
  let searchController, analyzeController;
  let searchTimeout, analyzeTimeout;
  
  try {
    // 创建 AbortController 用于手动控制超时
    searchController = new AbortController();
    // 增加超时时间到45秒，确保足够时间让服务器端通过代理完成arXiv请求
    console.log('start searching from arxiv...');
    searchTimeout = setTimeout(() => {
      searchController.abort();
      console.log('Search request timed out after 45 seconds');
    }, 45000); // 45秒超时
    
    // 调用后端搜索API，增加论文数量以提取更多关键词
    currentMainStep.value = 'Searching from arXiv and Google Scholar…'
    loadingStatus.value = '正在搜索相关论文...'
    const searchResponse = await fetch(`${API_BASE_URL}/search?query=${encodeURIComponent(searchQuery.value)}&maxResults=16`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: searchController.signal
    });
    loadingStatus.value = '搜索完成，正在准备分析...'
    console.log('search finished');
    
    clearTimeout(searchTimeout); // 清除超时定时器
    
    // 检查响应状态
    if (!searchResponse.ok) {
      throw new Error(`搜索请求失败: ${searchResponse.status} ${searchResponse.statusText}`);
    }
    
    const searchData = await searchResponse.json()
    
    // 更新加载状态
    const requestBody = { 
      papersCount: searchData.data.length, 
      query: searchQuery.value, 
      language: currentLanguage.value 
    };
    currentMainStep.value = `Analyze by request body: ${JSON.stringify(requestBody)}`
    loadingStatus.value = ''
    
    if (!searchData.success) {
      throw new Error('搜索失败: ' + searchData.error);
    }
    
    // 格式化从arXiv获取的论文数据
    const formattedPapers = searchData.data.map(paper => ({
      id: paper.id || '',
      url: paper.url || '', // 保留论文URL
      title: paper.title || '无标题',
      authors: paper.authors || '未知作者',
      abstract: paper.abstract || '无摘要',
      year: paper.year || '未知年份',
      source: paper.source || '未知来源'
      // 移除模拟的一致性和相关性评分，这些将由后端计算
    }))
    
    // 创建 AbortController 用于手动控制超时
    analyzeController = new AbortController();
    // 增加超时时间到300秒（5分钟），确保有足够时间完成分析（AI处理可能需要较长时间）
    analyzeTimeout = setTimeout(() => {
      analyzeController.abort();
      console.log('Analysis request timed out after 300 seconds');
      error.value = '分析请求超时，请稍后重试';
      isLoading.value = false;
      currentMainStep.value = '';
      loadingStatus.value = '';
    }, 300000); // 300秒超时
    
    // 更新加载状态
    currentMainStep.value = `Processing ${formattedPapers.length} papers (out of ${formattedPapers.length} total)…`
    loadingStatus.value = '正在准备分析请求...'
    
    // 调用后端分析API，传递当前选择的语言
    console.log("start analysing");
    loadingStatus.value = '正在发送分析请求...'
    const analyzeResponse = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        papers: formattedPapers,
        language: currentLanguage.value,
        query: searchQuery.value
      }),
      signal: analyzeController.signal
    });
    loadingStatus.value = '正在接收分析结果...'
    
    clearTimeout(analyzeTimeout); // 清除超时定时器
    
    // 检查响应状态
    if (!analyzeResponse.ok) {
      throw new Error(`分析请求失败: ${analyzeResponse.status} ${analyzeResponse.statusText}`);
    }
    
    const analyzeData = await analyzeResponse.json()
    
    // 只有当分析成功时才更新analysisResult
    if (analyzeData.success) {
      // 更新数据
      analysisResult.value = {
        summary: analyzeData.data.summary || '暂无综述信息',
        keywordFrequency: analyzeData.data.keywordFrequency || [],
        keyTermValidation: analyzeData.data.keyTermValidation || {},
        wordCloudData: analyzeData.data.wordCloudData || []
      }
      
      // 确保重置翻译状态和语言设置
      isTranslated.value = false
      originalSummary.value = ''
      currentLanguage.value = 'en'
      
      papers.value = analyzeData.data.papers || []
      
      confidenceScore.value = analyzeData.data.confidenceScore || 0
      
      // 接收后端返回的处理日志
      console.log('Received analyzeData:', analyzeData);
      if (analyzeData.logs && Array.isArray(analyzeData.logs)) {
        console.log('Received logs from server:', analyzeData.logs);
        processingLogs.value = analyzeData.logs
        
        // 立即开始处理日志，显示服务器返回的步骤
        parseProcessingLogs(analyzeData.logs)
      } else {
        console.log('No logs received from server or logs is not an array');
        // 如果没有日志，仍然执行parseProcessingLogs以确保加载状态被正确重置
        parseProcessingLogs([])
      }
      
      error.value = '' // 清除任何之前的错误信息
    } else {
      // 分析失败时，设置error并清除analysisResult
      error.value = '分析失败: ' + (analyzeData.error || '未知错误')
      analysisResult.value = null
      papers.value = []
      confidenceScore.value = 0
      console.error('Analysis failed:', analyzeData.error)
      
      // 分析失败时，重置加载状态
      isLoading.value = false
      currentMainStep.value = ''
      loadingStatus.value = ''
    }
  } catch (err) {
    console.error('Analysis error:', err);
    
    // 更详细的错误处理
    let errorMessage;
    if (err.name === 'AbortError') {
      errorMessage = '请求超时，请检查网络连接或稍后重试。如果您正在使用代理，请确保代理设置正确。';
    } else if (err.message.includes('Failed to fetch')) {
      errorMessage = '网络连接失败，请检查您的网络设置或代理配置。';
    } else {
      // 显示具体的错误信息
      errorMessage = err.message || '分析过程中发生未知错误';
    }
    
    error.value = errorMessage;
    
    // 在错误情况下，清除analysisResult以确保显示错误信息或热点文章
    analysisResult.value = null;
    papers.value = [];
    confidenceScore.value = 0;
    
    // 确保在错误情况下隐藏加载状态
    isLoading.value = false;
    currentMainStep.value = '';
    loadingStatus.value = '';
    isTranslating.value = false;
    isExporting.value = false;
  } finally {
    // 确保清除所有超时和加载状态
    if (searchTimeout) clearTimeout(searchTimeout);
    if (analyzeTimeout) clearTimeout(analyzeTimeout);
    if (loadingTimer) {
      clearInterval(loadingTimer);
      loadingTimer = null;
    }
  }
}

// 多文献交叉比对功能
const comparePapers = (papers) => {
  // 这里可以实现更复杂的交叉比对逻辑
  // 例如：找出共同主题、不同观点、研究趋势等
  return papers.slice(0, 3); // 简化示例，只返回前3篇
}

// 综合总结功能
const generateComprehensiveSummary = (papers) => {
  // 可以根据不同的维度生成综合总结
  // 例如：按时间排序、按相关性排序、按引用次数排序等
  const sortedByYear = [...papers].sort((a, b) => b.year - a.year);
  const sortedByRelevance = [...papers].sort((a, b) => b.relevance - a.relevance);
  
  return {
    chronological: sortedByYear,
    relevanceBased: sortedByRelevance
  }
}

const exportMarkdown = () => {
  if (!analysisResult.value || !papers.value) {
    alert('No data to export')
    return
  }

  try {
    // 显示导出进度
    isExporting.value = true
    
    // 生成Markdown内容 (Generate Markdown content)
    let markdown = `# Research Analysis Report\n\n`
    markdown += `## Search Query: ${searchQuery.value}\n\n`
    markdown += `## Research Summary\n\n${analysisResult.value.summary}\n\n`
    markdown += `## Confidence Score: ${confidenceScore.value}%\n\n`
    markdown += `## Related Literature\n\n`

    papers.value.forEach((paper, index) => {
      markdown += `### ${index + 1}. ${paper.title}\n\n`
      markdown += `**Authors**: ${paper.authors}\n\n`
      markdown += `**Year**: ${paper.year}\n\n`
      markdown += `**Abstract**: ${paper.abstract}\n\n`
      markdown += `**Consistency**: ${paper.consistency.toFixed(2)}%\n\n`
markdown += `**Relevance**: ${paper.relevance.toFixed(2)}%\n\n`
      markdown += `---\n\n`
    })

    // 添加参考文献部分
    markdown += `## References\n\n`
    papers.value.forEach((paper, index) => {
      markdown += `${index + 1}. [${paper.title}](${paper.url || '#'}). ${paper.authors}. ${paper.year}. ${paper.source || 'Unknown Source'}\n\n`
    })

    // 创建下载链接
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `research-analysis-${searchQuery.value}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    // 隐藏导出进度
    isExporting.value = false
    
    alert('Markdown报告已成功生成并下载！')
  } catch (error) {
    console.error('Markdown导出错误:', error)
    alert('导出Markdown时发生错误: ' + error.message)
    isExporting.value = false
  }
}

// 使用html2pdf导出PDF的方法
const exportPDFWithHtml2Canvas = async () => {
  if (!analysisResult.value || !papers.value) {
    error.value = '没有可导出的数据'
    return
  }

  try {
    // 显示导出进度
    isExporting.value = true
    error.value = ''
    
    // 获取整个研究分析器元素
    const element = document.querySelector('.research-analyzer')
    
    if (!element) {
      throw new Error('无法找到要导出的内容')
    }

    // 配置html2pdf选项
    const options = {
      margin: 10,
      filename: `research-analysis-${searchQuery.value.replace(/\s+/g, '-')}.pdf`,
      image: { type: 'png', quality: 1.0 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        dpi: 300,
        letterRendering: true,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: '#ffffff'
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: {
        mode: ['css', 'legacy'],
        avoid: ['h1', 'h2', 'h3', '.paper-card', '.summary-card', '.score-bar']
      }
    }

    // 直接从原始元素生成PDF
    await html2pdf().set(options).from(element).save()
    
    // 隐藏导出进度
    isExporting.value = false
    
    // 显示成功消息
    error.value = 'PDF报告已成功生成并下载！'
    
    // 3秒后清除成功消息
    setTimeout(() => {
      error.value = ''
    }, 3000)
  } catch (err) {
    console.error('PDF导出错误:', err)
    error.value = `导出PDF时发生错误: ${err.message}`
    isExporting.value = false
  }
}

const hslToRgb = (h, s, l) => {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

const exportPDF = async () => {
  if (!analysisResult.value || !papers.value) {
    alert('没有可导出的数据')
    return
  }

  try {
    // 显示导出进度
    isExporting.value = true
    
    // 创建PDF文档，使用A4纸张大小
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // 添加中文字体支持
    // 注册字体（如果使用了中文字体库）
    // doc.addFont('fonts/NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal')
    // doc.setFont('NotoSansSC')
    
    // 使用默认字体但优化样式
    doc.setFont("helvetica")
    
    // 设置基础颜色方案
    const primaryColor = [76, 163, 206] // #4ca3ce
    const secondaryColor = [100, 100, 100]
    const textColor = [40, 40, 40]
    const lightTextColor = [150, 150, 150]
    
    // 添加页眉
    const addHeader = (pageNum) => {
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...primaryColor)
      doc.text('Research Analysis Report', 105, 15, { align: 'center' })
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...secondaryColor)
      doc.text(`Search Query: ${searchQuery.value}`, 20, 25)
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US')}`, 150, 25)
    }
    
    // 添加页脚
    const addFooter = (pageNum, totalPages) => {
      doc.setFontSize(8)
      doc.setTextColor(...lightTextColor)
      doc.text(`Page ${pageNum} of ${totalPages}`, 105, 290, { align: 'center' })
      doc.text('Automated Research Analysis System', 105, 295, { align: 'center' })
    }
    
    // 添加封面
    addHeader(1)
    
    // 添加标题
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...textColor)
    doc.text('Research Analysis Report', 105, 50, { align: 'center' })
    
    // 添加查询关键词
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text(`Topic: ${searchQuery.value}`, 105, 70, { align: 'center' })
    
    // 添加置信度评分
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(`Confidence Score: ${confidenceScore.value}%`, 105, 90, { align: 'center' })
    
    // 绘制美观的评分条
    const scoreBarX = 50
    const scoreBarY = 100
    const scoreBarWidth = 110
    const scoreBarHeight = 8
    
    // 背景条
    doc.setFillColor(240, 240, 240)
    doc.roundedRect(scoreBarX, scoreBarY, scoreBarWidth, scoreBarHeight, 2, 2, 'F')
    
    // 进度条
    const scoreWidth = (confidenceScore.value / 100) * scoreBarWidth
    const hue = (confidenceScore.value / 100) * 120 // 绿色到红色的渐变
    const rgb = hslToRgb(hue / 360, 1, 0.5)
    doc.setFillColor(rgb[0], rgb[1], rgb[2])
    doc.roundedRect(scoreBarX, scoreBarY, scoreWidth, scoreBarHeight, 2, 2, 'F')
    
    // 添加研究综述标题
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...textColor)
    doc.text('Research Summary', 20, 130)
    
    // 添加研究综述内容
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    const summaryToExport = originalSummary.value && isTranslated.value ? originalSummary.value : analysisResult.value.summary
    
    // 简单的Markdown渲染函数
    const renderMarkdown = (markdown) => {
      let text = markdown;
      // 移除标题符号
      text = text.replace(/#{1,6}\s/g, '');
      // 移除粗体符号
      text = text.replace(/\*\*(.*?)\*\*/g, '$1');
      // 移除斜体符号
      text = text.replace(/\*(.*?)\*/g, '$1');
      // 移除下划线
      text = text.replace(/__(.*?)__/g, '$1');
      // 移除代码块
      text = text.replace(/```[\s\S]*?```/g, '');
      // 移除行内代码
      text = text.replace(/`(.*?)`/g, '$1');
      // 移除链接
      text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
      // 移除列表符号
      text = text.replace(/^[\s]*[-*+]\s/gm, '');
      text = text.replace(/^[\s]*\d+\.\s/gm, '');
      // 移除水平线
      text = text.replace(/^---\s*$/gm, '');
      return text;
    };
    
    const renderedSummary = renderMarkdown(summaryToExport);
    const summaryLines = doc.splitTextToSize(renderedSummary, 170)
    
    // 计算摘要内容的位置和分页
    let summaryStartY = 150
    const lineHeight = 7
    const maxY = 250 // 页面最大Y坐标
    
    // 如果研究综述内容会超出页面，则分页显示
    if (summaryStartY + (summaryLines.length * lineHeight) > maxY) {
      // 先在第一页显示部分内容
      let linesOnFirstPage = Math.floor((maxY - summaryStartY) / lineHeight)
      if (linesOnFirstPage <= 0) linesOnFirstPage = 1
      
      // 显示第一页的内容
      doc.text(summaryLines.slice(0, linesOnFirstPage), 20, summaryStartY)
      
      // 添加页脚并换页
      addFooter(1, 3)
      doc.addPage()
      addHeader(2)
      
      // 在后续页面显示剩余内容
      let remainingLines = summaryLines.slice(linesOnFirstPage)
      let currentPage = 2
      const linesPerPage = Math.floor((maxY - 35) / lineHeight)
      
      while (remainingLines.length > 0) {
        // 如果不是第二页（即中间页），需要添加页眉页脚
        if (currentPage > 2) {
          addFooter(currentPage - 1, 3)
          doc.addPage()
          addHeader(currentPage)
        }
        
        // 计算当前页能显示的行数
        const linesToShow = Math.min(linesPerPage, remainingLines.length)
        doc.text(remainingLines.slice(0, linesToShow), 20, 35)
        remainingLines = remainingLines.slice(linesToShow)
        currentPage++
      }
      
      // 更新最后一页的页脚
      addFooter(currentPage - 1, currentPage - 1)
      doc.addPage()
      addHeader(currentPage)
      summaryStartY = 35
    } else {
      // 内容不会超出页面，正常显示
      doc.text(summaryLines, 20, summaryStartY)
      summaryStartY += summaryLines.length * lineHeight + 10
    }
    
    // 添加文献统计表标题
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...textColor)
    doc.text('Literature Statistics', 20, summaryStartY)
    
    // 准备表格数据
    const tableData = papers.value.map((paper, index) => [
      index + 1,
      paper.title.substring(0, 30) + (paper.title.length > 30 ? '...' : ''), // 截断标题
      paper.authors.substring(0, 20) + (paper.authors.length > 20 ? '...' : ''), // 截断作者
      paper.year,
      `${paper.consistency}%`,
      `${paper.relevance.toFixed(2)}%`
    ])
    
    // 添加文献统计表
    autoTable(doc, {
      startY: summaryStartY + 10,
      head: [['No.', 'Title', 'Authors', 'Year', 'Consistency', 'Relevance']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 11,
        font: "helvetica"
      },
      bodyStyles: {
        fontSize: 10,
        cellPadding: 3,
        font: "helvetica"
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 40 }, // Title column
        2: { cellWidth: 30 }, // Authors column
        3: { cellWidth: 15 }, // Year column
        4: { cellWidth: 20 }, // Consistency column
        5: { cellWidth: 20 }, // Relevance column
      },
      tableWidth: 'wrap',
      styles: {
        cellPadding: 3,
        fontSize: 10,
        overflow: 'linebreak',
        font: "helvetica"
      },
      margin: { top: 20, right: 15, bottom: 30, left: 15 },
    })
    
    // 获取表格结束位置
    const finalY = (doc.lastAutoTable.finalY || summaryStartY + 50) + 15
    
    // 添加页脚
    addFooter(1, 2)
    
    // 添加第二页（详细文献信息）
    doc.addPage()
    addHeader(2)
    
    // 添加详细文献信息标题
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...textColor)
    doc.text('Detailed Literature Information', 20, 35)
    
    let currentY = 45
    let currentPage = 2
    
    papers.value.forEach((paper, index) => {
      // 检查是否需要换页，提前换页以留出足够空间
      if (currentY > 250) {
        addFooter(currentPage, 2)
        doc.addPage()
        currentPage++
        addHeader(currentPage)
        currentY = 35
        
        // 重新绘制标题行
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...textColor)
        doc.text('Detailed Literature Information (continued)', 20, 35)
        currentY = 45
      }
      
      // 文献编号和标题
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColor)
      const titleLines = doc.splitTextToSize(`${index + 1}. ${paper.title}`, 170)
      doc.text(titleLines, 20, currentY)
      currentY += titleLines.length * 7 + 2
      
      // 检查换页
      if (currentY > 250) {
        addFooter(currentPage, 2)
        doc.addPage()
        currentPage++
        addHeader(currentPage)
        currentY = 35
        
        // 重新绘制文献信息
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...textColor)
        const titleLines = doc.splitTextToSize(`${index + 1}. ${paper.title}`, 170)
        doc.text(titleLines, 20, currentY)
        currentY += titleLines.length * 7 + 2
      }
      
      // 作者和年份
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...secondaryColor)
      doc.text(`Authors: ${paper.authors}`, 20, currentY)
      doc.text(`Year: ${paper.year}`, 160, currentY)
      currentY += 9
      
      // 摘要
      doc.setFontSize(11)
      doc.setTextColor(60, 60, 60)
      const abstractLines = doc.splitTextToSize(`Abstract: ${paper.abstract}`, 170)
      doc.text(abstractLines, 20, currentY)
      currentY += abstractLines.length * 6 + 6
      
      // 检查换页
      if (currentY > 250) {
        addFooter(currentPage, 2)
        doc.addPage()
        currentPage++
        addHeader(currentPage)
        currentY = 35
      }
      
      // 评分信息
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Consistency: ${paper.consistency.toFixed(2)}%`, 20, currentY)
doc.text(`Relevance: ${paper.relevance.toFixed(2)}%`, 80, currentY)
      currentY += 12
      
      // 分隔线
      doc.setDrawColor(230, 230, 230)
      doc.line(20, currentY, 190, currentY)
      currentY += 10
      
      // 最后检查换页
      if (currentY > 250) {
        addFooter(currentPage, 2)
        doc.addPage()
        currentPage++
        addHeader(currentPage)
        currentY = 35
      }
    })
    
    // 添加参考文献页面
    doc.addPage()
    currentPage++
    addHeader(currentPage)
    
    // 添加参考文献标题
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...textColor)
    doc.text('References', 20, 35)
    
    let refY = 45
    
    // 添加参考文献列表
    papers.value.forEach((paper, index) => {
      // 检查是否需要换页
      if (refY > 250) {
        addFooter(currentPage, currentPage)
        doc.addPage()
        currentPage++
        addHeader(currentPage)
        
        // 重新绘制标题
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...textColor)
        doc.text('References (continued)', 20, 35)
        refY = 45
      }
      
      // 添加参考文献条目
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...textColor)
      const refText = `${index + 1}. ${paper.title} - ${paper.authors}, ${paper.year}, ${paper.source || 'Unknown Source'}`
      const refLines = doc.splitTextToSize(refText, 170)
      doc.text(refLines, 20, refY)
      refY += refLines.length * 6 + 5
    })
    
    addFooter(currentPage, currentPage)
    
    // 保存PDF
    doc.save(`research-analysis-${searchQuery.value.replace(/\s+/g, '-')}.pdf`)
    
    // 隐藏导出进度
    isExporting.value = false
    
    alert('PDF报告已成功生成并下载！')
  } catch (error) {
    console.error('PDF导出错误:', error)
    alert('导出PDF时发生错误: ' + error.message)
    isExporting.value = false
  }
}

// 将Markdown内容导出为PDF
const exportMarkdownAsPDF = async () => {
  if (!analysisResult.value || !papers.value) {
    alert('No data to export')
    return
  }

  try {
    // 显示导出进度
    isExporting.value = true
    
    // 生成与exportMarkdown相同的Markdown内容
    let markdown = `# Research Analysis Report\n\n`
    markdown += `## Search Query: ${searchQuery.value}\n\n`
    markdown += `## Research Summary\n\n${analysisResult.value.summary}\n\n`
    markdown += `## Confidence Score: ${confidenceScore.value}%\n\n`
    markdown += `## Related Literature\n\n`

    papers.value.forEach((paper, index) => {
      markdown += `### ${index + 1}. ${paper.title}\n\n`
      markdown += `**Authors**: ${paper.authors}\n\n`
      markdown += `**Year**: ${paper.year}\n\n`
      markdown += `**Abstract**: ${paper.abstract}\n\n`
      markdown += `**Consistency**: ${paper.consistency.toFixed(2)}%\n\n`
      markdown += `**Relevance**: ${paper.relevance.toFixed(2)}%\n\n`
      markdown += `---\n\n`
    })

    // 添加参考文献部分
    markdown += `## References\n\n`
    papers.value.forEach((paper, index) => {
      markdown += `${index + 1}. [${paper.title}](${paper.url || '#'}). ${paper.authors}. ${paper.year}. ${paper.source || 'Unknown Source'}\n\n`
    })
    
    // 创建临时DOM元素来显示Markdown内容
    const tempElement = document.createElement('div')
    tempElement.className = 'markdown-pdf-container'
    tempElement.innerHTML = marked(markdown) // 使用marked将Markdown转换为HTML
    
    // 添加CSS样式使PDF内容更美观
    tempElement.style.maxWidth = '800px'
    tempElement.style.margin = '0 auto'
    tempElement.style.padding = '20px'
    tempElement.style.fontFamily = 'Arial, sans-serif'
    tempElement.style.lineHeight = '1.6'
    
    // 将临时元素添加到文档中
    document.body.appendChild(tempElement)
    
    // 配置html2pdf选项
    const options = {
      margin: 10,
      filename: `research-analysis-markdown-${searchQuery.value.replace(/\s+/g, '-')}.pdf`,
      image: { type: 'png', quality: 1.0 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        dpi: 300,
        backgroundColor: '#ffffff'
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: {
        mode: ['css', 'legacy'],
        avoid: ['h1', 'h2', 'h3']
      }
    }
    
    // 生成PDF
    await html2pdf().set(options).from(tempElement).save()
    
    // 清理临时创建的DOM元素
    document.body.removeChild(tempElement)
    
    // 隐藏导出进度
    isExporting.value = false
    
    alert('Markdown PDF报告已成功生成并下载！')
  } catch (error) {
    console.error('Markdown PDF导出错误:', error)
    alert('导出Markdown PDF时发生错误: ' + error.message)
    isExporting.value = false
    
    // 确保临时元素被清理
    const tempElement = document.querySelector('.markdown-pdf-container')
    if (tempElement) {
      document.body.removeChild(tempElement)
    }
  }
}

// 设置显示语言
const setLanguage = async (lang) => {
  // 更新当前语言
  currentLanguage.value = lang
  
  // 如果已有分析结果，重新分析以获得正确语言的综述
  if (analysisResult.value && analysisResult.value.summary && searchQuery.value) {
    // 重新分析以获取指定语言的综述
    await analyzeResearch()
  }
}

// 翻译研究综述功能（切换中英文）- 保留此函数以保持向后兼容
const translateSummary = async () => {
  if (!analysisResult.value || !analysisResult.value.summary) {
    alert('没有可翻译的内容')
    return
  }

  // 如果已经翻译，则切换回原文
  if (isTranslated.value) {
    analysisResult.value.summary = originalSummary.value
    isTranslated.value = false
    currentLanguage.value = 'en'
    return
  }

  // 如果还没有存储原文，先存储原文
  if (!originalSummary.value) {
    originalSummary.value = analysisResult.value.summary
  }

  isTranslating.value = true
  
  try {
    // 调用后端翻译API
    const targetLanguage = currentLanguage.value === 'en' ? 'zh' : 'en';
    const response = await fetch(`${API_BASE_URL}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: originalSummary.value, targetLang: targetLanguage })
    });
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || '翻译失败')
    }
    
    // 存储翻译结果
    translatedSummary.value = data.translatedText
    // 更新分析结果中的综述内容
    analysisResult.value.summary = data.translatedText
    isTranslated.value = true
    currentLanguage.value = 'zh'
  } catch (err) {
    console.error('Translation error:', err)
    if (err.message && err.message.includes('Failed to fetch')) {
      alert('网络连接错误，请检查服务器是否正常运行')
    } else if (err instanceof TypeError) {
      alert('网络请求错误: ' + err.message)
    } else {
      alert('翻译过程中出现错误: ' + (err.message || '未知错误'))
    }
  } finally {
    isTranslating.value = false
  }
}

// 导入API配置
import API_CONFIG from '../config/apiConfig.js';

// API基础URL配置
const API_BASE_URL = API_CONFIG[import.meta.env.MODE] ? API_CONFIG[import.meta.env.MODE].baseURL : API_CONFIG.development.baseURL;
console.log('API_BASE_URL:', API_BASE_URL);

// 获取近一年OpenAlex热点文章
const fetchRecentOpenAlexPapers = async () => {
  console.log('Starting to fetch OpenAlex papers...')
  isLoadingRecentPapers.value = true
  recentPapersError.value = ''
  
  try {
    // 调用后端API获取OpenAlex热点文章
    const response = await fetch(`${API_BASE_URL}/openalex/recent`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log('OpenAlex API response status:', response.status)
    const data = await response.json()
    console.log('OpenAlex API response data:', data)
    
    if (!data.success) {
      throw new Error(data.error || '获取OpenAlex热点文章失败')
    }
    
    recentOpenAlexPapers.value = data.papers
    console.log('OpenAlex papers loaded:', recentOpenAlexPapers.value.length)
  } catch (err) {
    console.error('Error fetching OpenAlex papers:', err)
    recentPapersError.value = err.message || '获取OpenAlex热点文章失败'
    console.log('Recent papers error:', recentPapersError.value)
  } finally {
    isLoadingRecentPapers.value = false
    console.log('OpenAlex fetch completed, loading status:', isLoadingRecentPapers.value)
  }
}

// 切换论文源
const togglePaperSource = () => {
  if (currentPaperSource.value === 'openalex') {
    currentPaperSource.value = 'arxiv'
    if (recentArxivPapers.value.length === 0) {
      fetchRecentArxivPapers()
    }
  } else {
    currentPaperSource.value = 'openalex'
    if (recentOpenAlexPapers.value.length === 0) {
      fetchRecentOpenAlexPapers()
    }
  }
}

// 获取近一周arXiv热点文章
const fetchRecentArxivPapers = async () => {
  isLoadingRecentPapers.value = true
  recentPapersError.value = ''
  
  try {
    // 调用后端API获取近一周热点文章
    const response = await fetch(`${API_BASE_URL}/arxiv/recent`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || '获取arXiv热点文章失败')
    }
    
    recentArxivPapers.value = data.papers
  } catch (err) {
    console.error('Error fetching recent arXiv papers:', err)
    recentPapersError.value = err.message || '获取热点文章时发生未知错误'
  } finally {
    isLoadingRecentPapers.value = false
  }
}

// 组件挂载时获取默认源的论文
onMounted(() => {
  console.log('Component mounted, fetching recent papers...')
  console.log('Current paper source:', currentPaperSource.value)
  if (currentPaperSource.value === 'openalex') {
    fetchRecentOpenAlexPapers()
  } else {
    fetchRecentArxivPapers()
  }
})
</script>

<style scoped>
.research-analyzer {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 15px;
  /* width: 100%; */
  width: 300px;
  margin: 0 auto;
  /* background-color: #0066cc; */
  position: relative;
}

.logo {
  height: 80px;
  width: auto;
  object-fit: contain;
  position: absolute;
  right: 100%;
  margin-right: 50px;
  border-radius: 9999px;
}

.brand-name {
  height: 120px;
  width: auto;
  object-fit: contain;
}

.header h2 {
  font-size: 20px;
  color: #666;
  margin: 0;
  font-weight: normal;
}

/* 添加论文链接样式 */
.paper-link {
  color: #1a0dab;
  text-decoration: none;
  transition: color 0.3s;
}

.paper-link:hover {
  color: #0066cc;
  text-decoration: underline;
}

.search-section {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
  justify-content: center;
}

.search-input {
  padding: 12px 15px;
  font-size: 16px;
  border: 2px solid #ddd;
  border-radius: 4px;
  width: 400px;
  outline: none;
  transition: border-color 0.3s;
}

.search-input:focus {
  border-color: #4ca3ce;
}

.search-button {
  padding: 12px 20px;
  font-size: 16px;
  background-color: #4ca3ce;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.search-button:hover:not(:disabled) {
  background-color: #4a79ca;
}

.search-button:disabled {
  background-color: #a0a0a0;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 30px;
  max-width: 800px;
  margin: 0 auto;
}

.loading h3 {
  margin-bottom: 10px;
  color: #333;
}

.loading-time {
  margin-bottom: 20px;
  color: #666;
  font-size: 14px;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #4ca3ce;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 20px auto;
  margin-bottom: 30px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.processing-steps {
  margin-top: 30px;
  text-align: left;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
}

.step-item {
  display: flex;
  margin-bottom: 12px;
  align-items: flex-start;
}

.step-number {
  font-weight: bold;
  color: #4ca3ce;
  margin-right: 10px;
  min-width: 20px;
}

.step-content {
  flex: 1;
  color: #333;
  line-height: 1.5;
}

.results-section {
  margin-top: 50px;
}

.summary-card {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.summary-card h2 {
  margin-top: 0;
  color: #333;
}

.summary-content {
  text-align: left;
  line-height: 1.6;
  margin: 20px 0;
}

.confidence-score {
  border-top: 1px solid #eee;
  padding-top: 15px;
}

.confidence-score h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.score-bar {
  width: 100%;
  height: 10px;
  background-color: #e0e0e0;
  border-radius: 5px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  background-color: #4ca3ce;
  transition: width 0.5s ease;
}

.literature-section h2 {
  color: #333;
  margin: 30px 0 20px 0;
}

.literature-controls {
  margin-bottom: 20px;
  text-align: right;
}

.sort-select {
  padding: 8px 12px;
  font-size: 14px;
  border: 2px solid #ddd;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
}

.literature-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
  gap: 20px;
}

.paper-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.paper-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.paper-card h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 18px;
  color: #333;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.paper-card .authors {
  margin-bottom: 15px;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.paper-card .paper-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #999;
  border-top: 1px solid #eee;
  padding-top: 10px;
}

.paper-card .paper-meta .date {
  margin-right: 4px;
}

.recent-papers-section {
  margin-top: 40px;
}

.recent-papers-section h2 {
  color: #333;
  margin-bottom: 20px;
}

.papers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.no-data {
  text-align: center;
  padding: 30px;
  color: #666;
}

.papers-header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
}

.source-toggle {
  cursor: pointer;
  color: #4ca3ce;
  font-weight: bold;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: color 0.3s;
}

.source-toggle:hover {
  color: #359c6d;
  text-decoration: underline;
}

.toggle-arrow {
  font-size: 12px;
  transition: transform 0.3s;
}

.paper-meta .citations {
  color: #4696be;
  font-weight: bold;
  margin-left: auto;
}

.export-section {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
}

.export-btn {
  padding: 10px 20px;
  font-size: 16px;
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.export-btn:hover {
  background-color: #3367d6;
}

.translation-controls {
  text-align: right;
  margin-bottom: 15px;
}

.translate-btn {
  padding: 8px 15px;
  font-size: 14px;
  background-color: #ff9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.translate-btn:hover:not(:disabled) {
  background-color: #e68900;
}

.translate-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.language-toggle {
  display: inline-flex;
  border-radius: 4px;
  overflow: hidden;
  /* box-shadow: 0 2px 4px rgba(0,0,0,0.1); */
}

.lang-btn {
  padding: 8px 15px;
  font-size: 14px;
  background-color: #f5f5f5;
  color: #333;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 50px;
}

.lang-btn:hover:not(.active) {
  background-color: #e0e0e0;
}

.lang-btn.active {
  background-color: #4ca3ce;
  color: white;
  font-weight: bold;
}

.lang-btn:first-child {
  border-right: 1px solid #ddd;
}

.error {
  color: #e74c3c;
  text-align: center;
  padding: 20px;
  background: #fdf2f2;
  border-radius: 4px;
  margin: 20px 0;
}
</style>