<template>
  <div class="graph-container">
    <h2>主题结构图谱</h2>
    <div class="graph-visualization">
      <div 
        v-for="(topic, index) in topics" 
        :key="index" 
        class="topic-node"
        :style="getNodeStyle(index)"
      >
        <div class="topic-label">{{ topic.name }}</div>
        <div class="topic-count">{{ topic.count }}篇</div>
      </div>
      <!-- 连接线 -->
      <svg class="connections" width="100%" height="100%">
        <line 
          v-for="(connection, index) in connections" 
          :key="index"
          :x1="connection.x1" 
          :y1="connection.y1" 
          :x2="connection.x2" 
          :y2="connection.y2" 
          stroke="#4ca3ce" 
          stroke-width="2"
        />
      </svg>
    </div>
  </div>
</template>

<script setup>
import { computed, defineProps } from 'vue'

const props = defineProps({
  papers: {
    type: Array,
    required: true
  }
})

// 提取主题词（简化实现，实际应用中可以从标题和摘要中提取关键词）
const topics = computed(() => {
  if (!props.papers || props.papers.length === 0) return []
  
  // 简化的主题提取，实际应用中可以使用NLP技术
  const topicMap = new Map()
  
  props.papers.forEach(paper => {
    // 从标题中提取可能的主题词
    const titleWords = paper.title.toLowerCase().split(' ')
    const commonWords = ['the', 'and', 'for', 'with', 'on', 'in', 'of', 'to', 'a', 'an', 'is', 'are']
    
    titleWords.forEach(word => {
      // 过滤常见词汇和短词
      if (word.length > 3 && !commonWords.includes(word)) {
        const count = topicMap.get(word) || 0
        topicMap.set(word, count + 1)
      }
    })
  })
  
  // 转换为主题数组并排序
  const topics = Array.from(topicMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8) // 只取前8个主题
  
  return topics
})

// 计算节点样式（位置）
const getNodeStyle = (index) => {
  // 创建网格布局
  const gridSize = Math.ceil(Math.sqrt(topics.value.length))
  const row = Math.floor(index / gridSize)
  const col = index % gridSize
  
  // 计算位置百分比
  const left = (col / Math.max(gridSize - 1, 1)) * 80 + 10
  const top = (row / Math.max(gridSize - 1, 1)) * 80 + 10
  
  return {
    left: `${left}%`,
    top: `${top}%`
  }
}

// 计算连接线
const connections = computed(() => {
  if (topics.value.length < 2) return []
  
  const conns = []
  const gridSize = Math.ceil(Math.sqrt(topics.value.length))
  
  // 连接相邻的主题节点
  for (let i = 0; i < topics.value.length - 1; i++) {
    const row1 = Math.floor(i / gridSize)
    const col1 = i % gridSize
    const row2 = Math.floor((i + 1) / gridSize)
    const col2 = (i + 1) % gridSize
    
    // 计算相对坐标 (基于百分比)
    const x1 = (col1 / Math.max(gridSize - 1, 1)) * 80 + 10
    const y1 = (row1 / Math.max(gridSize - 1, 1)) * 80 + 10
    const x2 = (col2 / Math.max(gridSize - 1, 1)) * 80 + 10
    const y2 = (row2 / Math.max(gridSize - 1, 1)) * 80 + 10
    
    conns.push({
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2
    })
  }
  
  return conns
})
</script>

<style scoped>
.graph-container {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  margin: 30px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  height: 400px;
}

.graph-container h2 {
  margin-top: 0;
  color: #333;
}

.graph-visualization {
  position: relative;
  width: 100%;
  height: 350px;
  background: white;
  border-radius: 6px;
  margin-top: 15px;
}

.topic-node {
  position: absolute;
  transform: translate(-50%, -50%);
  background: #4ca3ce;
  color: white;
  border-radius: 50%;
  width: 80px;
  height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease;
  cursor: pointer;
}

.topic-node:hover {
  transform: translate(-50%, -50%) scale(1.1);
}

.topic-label {
  font-size: 12px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.topic-count {
  font-size: 10px;
  opacity: 0.9;
}

.connections {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>