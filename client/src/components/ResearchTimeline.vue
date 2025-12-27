<template>
  <div class="timeline-container">
    <h2>研究时间轴</h2>
    <div class="timeline-chart">
      <!-- 图表容器 -->
      <div class="chart-wrapper">
        <!-- Y轴（一致性评分） -->
        <div class="y-axis">
          <div v-for="score in yAxisLabels" :key="score" class="y-axis-label" :style="{ bottom: calculateYPosition(score) + '%' }">
            {{ score }}%
          </div>
          <div class="y-axis-line"></div>
        </div>
        
        <!-- X轴（年份） -->
        <div class="x-axis">
          <div v-for="year in xAxisLabels" :key="year" class="x-axis-label" :style="{ left: calculateXPosition(year) + '%' }">
            {{ year }}
          </div>
          <div class="x-axis-line"></div>
        </div>
        
        <!-- 网格线 -->
        <div class="grid">
          <div v-for="year in xAxisLabels" :key="`year-${year}`" class="grid-line vertical" :style="{ left: calculateXPosition(year) + '%' }"></div>
          <div v-for="score in yAxisLabels" :key="`score-${score}`" class="grid-line horizontal" :style="{ bottom: calculateYPosition(score) + '%' }"></div>
        </div>
        
        <!-- 论文点 -->
        <div class="data-points">
          <div 
            v-for="(paper, index) in papers" 
            :key="index" 
            class="data-point"
            :style="{
              left: calculateXPosition(paper.year) + '%',
              bottom: calculateYPosition(paper.consistency) + '%'
            }"
            @click="togglePaperInfo(paper)"
            @mouseenter="showPaperInfo(paper)"
            @mouseleave="hidePaperInfo"
          >
            <div class="point-marker" :class="{ active: selectedPaper?.id === paper.id || hoveredPaper?.id === paper.id }"></div>
          </div>
        </div>
        
        <!-- 论文信息卡片 -->
        <div 
          v-if="hoveredPaper || selectedPaper" 
          class="paper-info-card"
          :class="{ active: selectedPaper }"
          :style="{
            left: calculateXPosition((hoveredPaper || selectedPaper).year) + '%',
            bottom: (calculateYPosition((hoveredPaper || selectedPaper).consistency) + 5) + '%'
          }"
        >
          <div class="card-header">
            <h3>{{ (hoveredPaper || selectedPaper).title }}</h3>
            <button class="close-btn" v-if="selectedPaper" @click="selectedPaper = null">×</button>
          </div>
          <div class="card-content">
            <p class="authors">{{ (hoveredPaper || selectedPaper).authors }}</p>
            <div class="meta-info">
              <span class="year">{{ (hoveredPaper || selectedPaper).year }}</span>
              <span class="consistency">一致性: {{ (hoveredPaper || selectedPaper).consistency.toFixed(2) }}%</span>
<span class="relevance">相关性: {{ (hoveredPaper || selectedPaper).relevance.toFixed(2) }}%</span>
            </div>
            <a 
              v-if="(hoveredPaper || selectedPaper).url" 
              :href="(hoveredPaper || selectedPaper).url" 
              target="_blank" 
              rel="noopener noreferrer"
              class="paper-link"
            >
              查看原文
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineProps } from 'vue'

const props = defineProps({
  papers: {
    type: Array,
    required: true
  }
})

// 状态管理
const selectedPaper = ref(null)
const hoveredPaper = ref(null)

// 获取年份范围
const getYearRange = () => {
  const years = props.papers
    .map(p => p.year)
    .filter(y => y)
    .map(y => parseInt(y))
  
  if (years.length === 0) return { min: 2000, max: 2023 }
  
  return {
    min: Math.min(...years),
    max: Math.max(...years)
  }
}

// X轴标签（年份）
const xAxisLabels = computed(() => {
  const { min, max } = getYearRange()
  const labels = []
  
  // 当所有年份相同时，直接返回单个年份
  if (min === max) {
    return [min]
  }
  
  // 生成年份标签，最多显示10个
  const interval = Math.max(1, Math.ceil((max - min) / 9)) // 确保interval至少为1
  for (let year = min; year <= max; year += interval) {
    labels.push(year)
  }
  
  // 确保包含最大年份
  if (labels[labels.length - 1] < max) {
    labels.push(max)
  }
  
  return labels
})

// 获取一致性评分范围
const getConsistencyRange = () => {
  const scores = props.papers
    .map(p => p.consistency)
    .filter(s => s !== undefined && s !== null)
    .map(s => parseInt(s))
  
  if (scores.length === 0) return { min: 0, max: 100 }
  
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  
  // 为了美观，添加一些边距（约10%的范围）
  const padding = Math.max(5, Math.abs(max - min) * 0.1)
  return { 
    min: Math.max(0, min - padding), 
    max: Math.min(100, max + padding) 
  }
}

// Y轴标签（一致性评分）
const yAxisLabels = computed(() => {
  const { min, max } = getConsistencyRange()
  const labels = []
  
  // 当所有分数相同时，直接返回单个分数
  if (min === max) {
    return [min]
  }
  
  // 如果范围太小，设置固定的间隔
  const range = max - min
  let interval = 20 // 默认间隔
  
  if (range <= 40) {
    interval = 10
  } else if (range <= 60) {
    interval = 15
  } else if (range <= 80) {
    interval = 20
  } else {
    interval = 25
  }
  
  // 确保间隔是一个易于阅读的数字
  const roundedInterval = Math.round(interval / 5) * 5
  
  // 生成标签
  const start = Math.floor(min / roundedInterval) * roundedInterval
  const end = Math.ceil(max / roundedInterval) * roundedInterval
  
  for (let score = start; score <= end; score += roundedInterval) {
    labels.push(score)
  }
  
  // 如果生成的标签太少，增加一些
  if (labels.length < 4) {
    const newInterval = roundedInterval / 2
    const newStart = Math.floor(min / newInterval) * newInterval
    const newEnd = Math.ceil(max / newInterval) * newInterval
    
    labels.length = 0
    for (let score = newStart; score <= newEnd; score += newInterval) {
      labels.push(score)
    }
  }
  
  // 确保标签不超过0和100
  return labels.filter(score => score >= 0 && score <= 100)
})

// 计算X轴位置
const calculateXPosition = (year) => {
  if (!year) return 5
  
  const { min, max } = getYearRange()
  const range = max - min
  
  if (range === 0) return 50
  
  // 添加边距
  const margin = 5
  return ((parseInt(year) - min) / range) * (100 - 2 * margin) + margin
}

// 计算Y轴位置
const calculateYPosition = (score) => {
  if (!score && score !== 0) return 0
  
  const { min, max } = getConsistencyRange()
  const range = max - min
  
  if (range === 0) return 50
  
  // 添加边距
  const margin = 5
  return ((parseInt(score) - min) / range) * (100 - 2 * margin) + margin
}

// 显示论文信息
const showPaperInfo = (paper) => {
  if (!selectedPaper.value) {
    hoveredPaper.value = paper
  }
}

// 隐藏论文信息
const hidePaperInfo = () => {
  if (!selectedPaper.value) {
    hoveredPaper.value = null
  }
}

// 切换论文信息显示
const togglePaperInfo = (paper) => {
  if (selectedPaper.value?.id === paper.id) {
    selectedPaper.value = null
    hoveredPaper.value = null
  } else {
    selectedPaper.value = paper
    hoveredPaper.value = null
  }
}
</script>

<style scoped>
.timeline-container {
  background: #f9f9f9;
  border-radius: 12px;
  padding: 30px;
  margin: 30px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.timeline-container h2 {
  margin-top: 0;
  margin-bottom: 30px;
  color: #2c3e50;
  font-size: 24px;
  text-align: center;
}

.timeline-chart {
  width: 100%;
  min-height: 500px;
  position: relative;
}

.chart-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 500px;
  background: white;
  border-radius: 8px;
  padding: 20px 40px 40px 60px;
  box-sizing: border-box;
}

/* Y轴样式 */
.y-axis {
  position: absolute;
  left: 0;
  top: 20px;
  bottom: 40px;
  width: 60px;
  display: flex;
  flex-direction: column-reverse;
  justify-content: space-between;
  align-items: center;
}

.y-axis-label {
  position: absolute;
  left: 0;
  width: 40px;
  text-align: right;
  font-size: 12px;
  color: #7f8c8d;
  transform: translateY(50%);
}

.y-axis-line {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 1px;
  background: #e0e0e0;
}

/* X轴样式 */
.x-axis {
  position: absolute;
  right: 40px;
  bottom: 0;
  left: 60px;
  height: 40px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.x-axis-label {
  position: absolute;
  top: 0;
  font-size: 12px;
  color: #7f8c8d;
  transform: translateX(-50%);
  white-space: nowrap;
}

.x-axis-line {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 1px;
  background: #e0e0e0;
}

/* 网格线样式 */
.grid {
  position: absolute;
  top: 20px;
  right: 40px;
  bottom: 40px;
  left: 60px;
  pointer-events: none;
}

.grid-line {
  position: absolute;
  background: #f0f0f0;
}

.grid-line.vertical {
  width: 1px;
  top: 0;
  bottom: 0;
}

.grid-line.horizontal {
  height: 1px;
  left: 0;
  right: 0;
}

/* 数据点样式 */
.data-points {
  position: absolute;
  top: 20px;
  right: 40px;
  bottom: 40px;
  left: 60px;
}

.data-point {
  position: absolute;
  transform: translate(-50%, 50%);
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
}

.point-marker {
  width: 12px;
  height: 12px;
  background: #4ca3ce;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.point-marker:hover, .point-marker.active {
  transform: scale(1.5);
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.4);
  background: #359c6d;
}

/* 论文信息卡片 */
.paper-info-card {
  position: absolute;
  background: white;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  padding: 15px;
  width: 280px;
  z-index: 20;
  transform: translate(-50%, -100%);
  transition: all 0.3s ease;
  opacity: 0;
  pointer-events: none;
}

.paper-info-card:hover,
.paper-info-card.active,
.data-point:hover .paper-info-card {
  opacity: 1;
  pointer-events: auto;
  transform: translate(-50%, -110%);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.card-header h3 {
  margin: 0;
  font-size: 14px;
  color: #2c3e50;
  font-weight: 600;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #7f8c8d;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #2c3e50;
}

.authors {
  font-size: 12px;
  color: #7f8c8d;
  margin: 0 0 10px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.meta-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.meta-info span {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 12px;
  background: #f0f0f0;
  color: #7f8c8d;
}

.meta-info .year {
  background: rgba(66, 185, 131, 0.1);
  color: #4ca3ce;
}

.meta-info .consistency {
  background: rgba(66, 185, 131, 0.1);
  color: #42b983;
}

.meta-info .relevance {
  background: rgba(52, 152, 219, 0.1);
  color: #3498db;
}

.paper-link {
  display: inline-block;
  font-size: 12px;
  color: #3498db;
  text-decoration: none;
  padding: 5px 10px;
  background: rgba(52, 152, 219, 0.1);
  border-radius: 4px;
  transition: all 0.3s ease;
}

.paper-link:hover {
  background: rgba(52, 152, 219, 0.2);
  text-decoration: underline;
}
</style>