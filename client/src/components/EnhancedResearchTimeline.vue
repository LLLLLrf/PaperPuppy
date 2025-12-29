<template>
  <div class="enhanced-timeline-container">
    <div class="timeline-header">
      <h2>研究时间轴</h2>
      <div class="timeline-controls">
        <button @click="toggleLayout" class="control-btn">
          {{ layout === 'horizontal' ? '垂直视图' : '水平视图' }}
        </button>
        <button @click="toggleAnimation" class="control-btn">
          {{ animate ? '关闭动画' : '开启动画' }}
        </button>
        <input 
          type="range" 
          v-model="timeRange.start" 
          :min="minYear" 
          :max="maxYear" 
          @input="filterByTime"
          class="time-slider"
        >
        <span class="time-label">{{ timeRange.start }} - {{ timeRange.end }}</span>
        <input 
          type="range" 
          v-model="timeRange.end" 
          :min="minYear" 
          :max="maxYear" 
          @input="filterByTime"
          class="time-slider"
        >
      </div>
    </div>
    
    <div 
      ref="timelineContainer" 
      class="timeline-wrapper"
      :class="[layout, { animate: animate }]"
      @wheel="handleScroll"
    >
      <!-- 时间轴主轴 -->
      <div class="main-axis" :style="axisStyle"></div>
      
      <!-- 时间标记 -->
      <div class="time-markers">
        <div 
          v-for="year in yearMarkers" 
          :key="year"
          class="time-marker"
          :style="{ left: calculatePosition(year) + '%' }"
        >
          <div class="marker-line"></div>
          <div class="marker-label">{{ year }}</div>
        </div>
      </div>
      
      <!-- 论文节点 -->
      <div 
        v-for="(group, index) in groupedPapers" 
        :key="index"
        class="paper-group"
        :style="getGroupStyle(group)"
      >
        <div 
          class="group-marker"
          @click="selectGroup(group)"
          :class="{ selected: selectedGroup === group }"
        ></div>
        
        <div class="papers-stack" v-if="selectedGroup === group || layout === 'vertical'">
          <div 
            v-for="(paper, paperIndex) in group.papers" 
            :key="paperIndex"
            class="paper-card"
            :class="{ highlighted: highlightedPaper === paper }"
            @mouseenter="highlightPaper(paper)"
            @mouseleave="highlightPaper(null)"
            @click="showPaperDetail(paper)"
          >
            <div class="paper-title">{{ paper.title }}</div>
            <div class="paper-authors">{{ paper.authors }}</div>
            <div class="paper-year">{{ paper.year }}</div>
            <div class="paper-metrics">
              <span class="metric">相关度: {{ paper.relevanceScore || 'N/A' }}</span>
              <span class="metric">一致性: {{ paper.consistencyScore || 'N/A' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 论文详情弹窗 -->
    <div v-if="detailPaper" class="paper-detail-modal" @click="closeDetail">
      <div class="modal-content" @click.stop>
        <h3>{{ detailPaper.title }}</h3>
        <p class="authors">{{ detailPaper.authors }}</p>
        <p class="abstract">{{ detailPaper.abstract }}</p>
        <div class="metrics">
          <div class="metric-item">
            <label>相关度评分:</label>
            <span>{{ detailPaper.relevanceScore || 'N/A' }}</span>
          </div>
          <div class="metric-item">
            <label>一致性评分:</label>
            <span>{{ detailPaper.consistencyScore || 'N/A' }}</span>
          </div>
          <div class="metric-item">
            <label>关键词:</label>
            <span>{{ detailPaper.keywords?.join(', ') || 'N/A' }}</span>
          </div>
        </div>
        <button class="close-btn" @click="closeDetail">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineProps, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  papers: {
    type: Array,
    required: true
  }
})

// 响应式数据
const layout = ref('horizontal')
const animate = ref(true)
const selectedGroup = ref(null)
const highlightedPaper = ref(null)
const detailPaper = ref(null)
const timeRange = ref({ start: 0, end: 0 })
const scrollPosition = ref(0)

// 计算属性
const sortedPapers = computed(() => {
  return [...props.papers]
    .filter(paper => paper.year && paper.year !== 'Unknown' && !isNaN(parseInt(paper.year)))
    .sort((a, b) => parseInt(a.year) - parseInt(b.year))
})

const minYear = computed(() => {
  const years = sortedPapers.value.map(p => parseInt(p.year))
  return years.length ? Math.min(...years) : new Date().getFullYear()
})

const maxYear = computed(() => {
  const years = sortedPapers.value.map(p => parseInt(p.year))
  return years.length ? Math.max(...years) : new Date().getFullYear()
})

const filteredPapers = computed(() => {
  return sortedPapers.value.filter(paper => {
    const year = parseInt(paper.year)
    return year >= timeRange.value.start && year <= timeRange.value.end
  })
})

const groupedPapers = computed(() => {
  // 按年份分组论文
  const groups = {}
  filteredPapers.value.forEach(paper => {
    const year = paper.year
    if (!groups[year]) {
      groups[year] = {
        year: year,
        papers: []
      }
    }
    groups[year].papers.push(paper)
  })
  
  // 转换为数组并排序
  return Object.values(groups).sort((a, b) => parseInt(a.year) - parseInt(b.year))
})

const yearMarkers = computed(() => {
  const markers = []
  const start = minYear.value
  const end = maxYear.value
  const interval = Math.max(1, Math.floor((end - start) / 10))
  
  for (let year = start; year <= end; year += interval) {
    markers.push(year)
  }
  
  // 确保包含结束年份
  if (!markers.includes(end)) {
    markers.push(end)
  }
  
  return markers
})

// 样式计算
const axisStyle = computed(() => {
  if (layout.value === 'horizontal') {
    return {
      top: '50%',
      left: '0',
      right: '0',
      height: '4px'
    }
  } else {
    return {
      top: '0',
      bottom: '0',
      left: '50%',
      width: '4px'
    }
  }
})

// 方法
const toggleLayout = () => {
  layout.value = layout.value === 'horizontal' ? 'vertical' : 'horizontal'
}

const toggleAnimation = () => {
  animate.value = !animate.value
}

const calculatePosition = (year) => {
  const min = minYear.value
  const max = maxYear.value
  
  if (min === max) return 50
  return ((parseInt(year) - min) / (max - min)) * 100
}

const getGroupStyle = (group) => {
  const pos = calculatePosition(group.year)
  
  if (layout.value === 'horizontal') {
    return {
      left: `${pos}%`,
      top: '50%'
    }
  } else {
    return {
      top: `${pos}%`,
      left: '50%'
    }
  }
}

const selectGroup = (group) => {
  selectedGroup.value = selectedGroup.value === group ? null : group
}

const highlightPaper = (paper) => {
  highlightedPaper.value = paper
}

const showPaperDetail = (paper) => {
  detailPaper.value = paper
}

const closeDetail = () => {
  detailPaper.value = null
}

const filterByTime = () => {
  // 时间过滤由计算属性自动处理
}

const handleScroll = (event) => {
  if (layout.value === 'horizontal') {
    scrollPosition.value += event.deltaY * 0.5
  } else {
    scrollPosition.value += event.deltaX * 0.5
  }
}

// 生命周期钩子
onMounted(() => {
  // 初始化时间范围
  timeRange.value = {
    start: minYear.value,
    end: maxYear.value
  }
})

onUnmounted(() => {
  // 清理工作
})
</script>

<style scoped>
.enhanced-timeline-container {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin: 30px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.timeline-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 24px;
}

.timeline-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.control-btn {
  background: #3498db;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.control-btn:hover {
  background: #2980b9;
}

.time-slider {
  width: 100px;
}

.time-label {
  font-size: 14px;
  color: #7f8c8d;
  min-width: 100px;
  text-align: center;
}

.timeline-wrapper {
  position: relative;
  height: 400px;
  overflow: hidden;
  border: 1px solid #ecf0f1;
  border-radius: 8px;
  background: #f8f9fa;
}

.timeline-wrapper.horizontal {
  cursor: ew-resize;
}

.timeline-wrapper.vertical {
  cursor: ns-resize;
}

.main-axis {
  position: absolute;
  background: #3498db;
  transform: translate(-50%, -50%);
  z-index: 1;
}

.time-markers {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.time-marker {
  position: absolute;
  transform: translateX(-50%);
  top: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.marker-line {
  width: 2px;
  height: 20px;
  background: #95a5a6;
}

.marker-label {
  margin-top: auto;
  padding: 4px 8px;
  background: #ecf0f1;
  border-radius: 4px;
  font-size: 12px;
  color: #7f8c8d;
  transform: translateX(-50%);
  white-space: nowrap;
}

.paper-group {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.group-marker {
  width: 24px;
  height: 24px;
  background: #e74c3c;
  border-radius: 50%;
  border: 4px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 3;
}

.group-marker:hover {
  transform: scale(1.2);
  background: #c0392b;
}

.group-marker.selected {
  transform: scale(1.3);
  background: #2ecc71;
}

.papers-stack {
  position: absolute;
  top: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
  padding: 10px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 4;
}

.paper-card {
  background: white;
  border-radius: 8px;
  padding: 12px;
  width: 250px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #eee;
}

.paper-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.paper-card.highlighted {
  border-color: #3498db;
  background: #f0f8ff;
}

.paper-title {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 6px;
  color: #2c3e50;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.paper-authors {
  font-size: 12px;
  color: #7f8c8d;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.paper-year {
  font-size: 12px;
  color: #3498db;
  font-weight: bold;
  margin-bottom: 8px;
}

.paper-metrics {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #95a5a6;
}

.metric {
  background: #ecf0f1;
  padding: 2px 6px;
  border-radius: 4px;
}

.paper-detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-content h3 {
  margin-top: 0;
  color: #2c3e50;
}

.authors {
  color: #7f8c8d;
  font-size: 14px;
  margin-bottom: 15px;
}

.abstract {
  font-size: 14px;
  line-height: 1.6;
  color: #34495e;
  margin-bottom: 20px;
}

.metrics {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.metric-item:last-child {
  margin-bottom: 0;
}

.metric-item label {
  font-weight: bold;
  color: #2c3e50;
}

.close-btn {
  background: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  float: right;
}

.close-btn:hover {
  background: #2980b9;
}

/* 垂直布局特殊样式 */
.timeline-wrapper.vertical .main-axis {
  transform: translate(-50%, 0);
}

.timeline-wrapper.vertical .time-marker {
  flex-direction: row;
  height: auto;
  width: 100%;
  top: auto;
  left: 0;
  transform: translateY(-50%);
}

.timeline-wrapper.vertical .marker-line {
  width: 20px;
  height: 2px;
}

.timeline-wrapper.vertical .marker-label {
  transform: translateY(-50%);
  margin: 0 0 0 auto;
}

.timeline-wrapper.vertical .paper-group {
  flex-direction: row;
}

.timeline-wrapper.vertical .papers-stack {
  top: 0;
  left: 30px;
  flex-direction: row;
  max-height: none;
  max-width: 600px;
  overflow-x: auto;
  overflow-y: hidden;
}

/* 动画效果 */
.timeline-wrapper.animate .paper-card {
  animation: fadeInUp 0.5s ease forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .timeline-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .timeline-controls {
    justify-content: center;
  }
  
  .paper-card {
    width: 200px;
  }
  
  .modal-content {
    width: 95%;
    padding: 15px;
  }
}
</style>