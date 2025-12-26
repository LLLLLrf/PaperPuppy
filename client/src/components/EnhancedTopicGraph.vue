<template>
  <div class="enhanced-topic-graph-container">
    <div class="graph-header">
      <h2>主题结构图谱</h2>
      <div class="graph-controls">
        <select v-model="layoutType" @change="changeLayout" class="control-select">
          <option value="force">力导向图</option>
          <option value="circular">圆形布局</option>
          <option value="hierarchical">层级布局</option>
        </select>
        <button @click="toggleClustering" class="control-btn">
          {{ showClusters ? '隐藏聚类' : '显示聚类' }}
        </button>
        <button @click="toggleLabels" class="control-btn">
          {{ showLabels ? '隐藏标签' : '显示标签' }}
        </button>
        <button @click="resetView" class="control-btn">重置视图</button>
      </div>
    </div>
    
    <div class="graph-wrapper">
      <svg ref="graphSvg" class="graph-svg"></svg>
    </div>
    
    <div class="graph-info">
      <div class="info-item">
        <span class="info-label">节点数:</span>
        <span class="info-value">{{ nodes.length }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">连接数:</span>
        <span class="info-value">{{ links.length }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">聚类数:</span>
        <span class="info-value">{{ clusterCount }}</span>
      </div>
    </div>
    
    <!-- 节点详情弹窗 -->
    <div v-if="selectedNode" class="node-detail-modal" @click="closeNodeDetail">
      <div class="modal-content" @click.stop>
        <h3>{{ selectedNode.name }}</h3>
        <div class="node-details">
          <div class="detail-item">
            <label>出现频次:</label>
            <span>{{ selectedNode.count }}</span>
          </div>
          <div class="detail-item">
            <label>重要性得分:</label>
            <span>{{ selectedNode.importance.toFixed(2) }}</span>
          </div>
          <div class="detail-item">
            <label>所属聚类:</label>
            <span :style="{ color: getColor(selectedNode.cluster) }">集群 {{ selectedNode.cluster }}</span>
          </div>
          <div class="detail-item">
            <label>关联主题:</label>
            <div class="related-topics">
              <span 
                v-for="related in selectedNode.related" 
                :key="related"
                class="related-topic"
              >
                {{ related }}
              </span>
            </div>
          </div>
        </div>
        <button class="close-btn" @click="closeNodeDetail">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineProps, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'

const props = defineProps({
  papers: {
    type: Array,
    required: true
  }
})

// 响应式数据
const layoutType = ref('force')
const showClusters = ref(true)
const showLabels = ref(true)
const selectedNode = ref(null)
const graphSvg = ref(null)
const simulation = ref(null)

// 图谱数据
const nodes = ref([])
const links = ref([])
const clusters = ref([])

// 计算属性
const clusterCount = computed(() => {
  return new Set(nodes.value.map(n => n.cluster)).size
})

// 方法
const extractTopics = () => {
  if (!props.papers || props.papers.length === 0) return
  
  // 主题词提取和统计
  const topicMap = new Map()
  const cooccurrence = new Map() // 共现矩阵
  
  props.papers.forEach(paper => {
    // 从标题和摘要中提取关键词
    const text = `${paper.title} ${paper.abstract || ''}`.toLowerCase()
    const words = text.match(/\b\w{4,}\b/g) || []
    const commonWords = new Set(['the', 'and', 'for', 'with', 'on', 'in', 'of', 'to', 'a', 'an', 'is', 'are', 'as', 'by', 'it', 'that', 'this', 'from', 'or', 'at'])
    
    // 过滤常见词并统计
    const keywords = words.filter(word => !commonWords.has(word))
    
    // 统计单个主题词频次
    keywords.forEach(word => {
      const count = topicMap.get(word) || { count: 0, papers: [] }
      count.count += 1
      if (!count.papers.includes(paper.title)) {
        count.papers.push(paper.title)
      }
      topicMap.set(word, count)
    })
    
    // 构建共现关系
    for (let i = 0; i < keywords.length; i++) {
      for (let j = i + 1; j < keywords.length; j++) {
        const key1 = keywords[i]
        const key2 = keywords[j]
        const pair = [key1, key2].sort().join('|')
        const count = cooccurrence.get(pair) || 0
        cooccurrence.set(pair, count + 1)
      }
    }
  })
  
  // 转换为主题节点数组
  const topicNodes = Array.from(topicMap.entries())
    .map(([name, data]) => ({
      id: name,
      name: name,
      count: data.count,
      papers: data.papers,
      importance: Math.log(data.count + 1), // 重要性得分
      cluster: 0 // 初始聚类
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30) // 限制节点数量以提高性能
  
  // 创建连接关系
  const topicLinks = []
  const topicIds = new Set(topicNodes.map(n => n.id))
  
  Array.from(cooccurrence.entries()).forEach(([pair, weight]) => {
    const [source, target] = pair.split('|')
    // 只保留存在于节点中的连接
    if (topicIds.has(source) && topicIds.has(target) && weight > 1) {
      topicLinks.push({
        source: source,
        target: target,
        weight: weight
      })
    }
  })
  
  // 简单聚类算法（Louvain算法的简化版）
  const nodeClusters = {}
  topicNodes.forEach((node, index) => {
    // 基于首字母或其他特征进行初始聚类
    nodeClusters[node.id] = node.name.charCodeAt(0) % 5
  })
  
  // 更新节点聚类信息
  topicNodes.forEach(node => {
    node.cluster = nodeClusters[node.id]
  })
  
  // 设置响应式数据
  nodes.value = topicNodes
  links.value = topicLinks
  
  // 初始化聚类信息
  const uniqueClusters = [...new Set(topicNodes.map(n => n.cluster))]
  clusters.value = uniqueClusters.map((clusterId, index) => ({
    id: clusterId,
    color: d3.schemeCategory10[index % 10]
  }))
}

const getColor = (clusterId) => {
  const cluster = clusters.value.find(c => c.id === clusterId)
  return cluster ? cluster.color : '#ccc'
}

const initializeGraph = () => {
  if (!graphSvg.value || nodes.value.length === 0) return
  
  // 清空SVG
  d3.select(graphSvg.value).selectAll("*").remove()
  
  // 设置SVG尺寸
  const width = graphSvg.value.clientWidth || 800
  const height = graphSvg.value.clientHeight || 500
  
  // 创建SVG选择器
  const svg = d3.select(graphSvg.value)
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto;")
  
  // 创建容器组
  const g = svg.append("g")
  
  // 创建力导向模拟
  simulation.value = d3.forceSimulation(nodes.value)
    .force("link", d3.forceLink(links.value).id(d => d.id).distance(100))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(d => Math.sqrt(d.count) * 5 + 10))
  
  // 创建连接线
  const link = g.append("g")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6)
    .selectAll("line")
    .data(links.value)
    .join("line")
    .attr("stroke-width", d => Math.sqrt(d.weight))
    .attr("class", "link")
  
  // 创建聚类区域
  const clusterGroups = g.append("g")
    .attr("class", "clusters")
    .selectAll("g")
    .data(clusters.value)
    .join("g")
  
  if (showClusters.value) {
    clusterGroups.append("circle")
      .attr("class", "cluster-circle")
      .attr("fill", d => d.color)
      .attr("fill-opacity", 0.1)
      .attr("stroke", d => d.color)
      .attr("stroke-opacity", 0.3)
  }
  
  // 创建节点
  const node = g.append("g")
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .selectAll("circle")
    .data(nodes.value)
    .join("circle")
    .attr("r", d => Math.sqrt(d.count) * 3 + 5)
    .attr("fill", d => getColor(d.cluster))
    .attr("class", "node")
    .call(drag(simulation.value))
    .on("click", (event, d) => {
      selectedNode.value = d
      // 高亮选中节点
      node.attr("stroke", n => n === d ? "#000" : "#fff")
      // 高亮相关连接
      link.attr("stroke", l => 
        (l.source === d || l.target === d) ? "#e74c3c" : "#999"
      ).attr("stroke-width", l => 
        (l.source === d || l.target === d) ? Math.sqrt(l.weight) * 2 : Math.sqrt(l.weight)
      )
    })
  
  // 创建标签
  const labels = g.append("g")
    .attr("class", "labels")
    .selectAll("text")
    .data(nodes.value)
    .join("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("class", "label")
    .text(d => d.name)
    .attr("font-size", d => Math.max(10, Math.min(16, d.count)))
    .attr("display", showLabels.value ? "block" : "none")
  
  // 更新模拟tick函数
  simulation.value.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y)
    
    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
    
    labels
      .attr("x", d => d.x)
      .attr("y", d => d.y)
    
    // 更新聚类区域位置
    if (showClusters.value) {
      updateClusterPositions()
    }
  })
  
  // 缩放功能
  const zoom = d3.zoom()
    .scaleExtent([0.1, 8])
    .on("zoom", (event) => {
      g.attr("transform", event.transform)
    })
  
  svg.call(zoom)
  
  // 双击重置缩放
  svg.on("dblclick.zoom", null)
  
  // 工具提示
  const tooltip = d3.select(graphSvg.value.parentNode)
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.8)")
    .style("color", "white")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("font-size", "12px")
  
  node
    .on("mouseover", (event, d) => {
      tooltip.transition()
        .duration(200)
        .style("opacity", .9)
      tooltip.html(`
        <strong>${d.name}</strong><br/>
        频次: ${d.count}<br/>
        重要性: ${d.importance.toFixed(2)}<br/>
        聚类: ${d.cluster}
      `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px")
    })
    .on("mouseout", () => {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0)
    })
}

const drag = (simulation) => {
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart()
    d.fx = d.x
    d.fy = d.y
  }
  
  function dragged(event, d) {
    d.fx = event.x
    d.fy = event.y
  }
  
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0)
    d.fx = null
    d.fy = null
  }
  
  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended)
}

const updateClusterPositions = () => {
  // 简化实现：根据节点位置更新聚类区域
  // 在实际应用中，这里会计算聚类的中心点和半径
}

const changeLayout = () => {
  if (!simulation.value) return
  
  switch (layoutType.value) {
    case 'force':
      simulation.value
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(
          graphSvg.value.clientWidth / 2, 
          graphSvg.value.clientHeight / 2
        ))
      break
    case 'circular':
      // 圆形布局
      const angleStep = (2 * Math.PI) / nodes.value.length
      nodes.value.forEach((node, i) => {
        const radius = Math.min(
          graphSvg.value.clientWidth, 
          graphSvg.value.clientHeight
        ) / 3
        node.fx = graphSvg.value.clientWidth / 2 + radius * Math.cos(i * angleStep)
        node.fy = graphSvg.value.clientHeight / 2 + radius * Math.sin(i * angleStep)
      })
      break
    case 'hierarchical':
      // 层级布局（简化实现）
      const levels = {}
      nodes.value.forEach(node => {
        const level = node.cluster
        if (!levels[level]) levels[level] = []
        levels[level].push(node)
      })
      
      const levelKeys = Object.keys(levels)
      const levelHeight = graphSvg.value.clientHeight / (levelKeys.length + 1)
      
      levelKeys.forEach((level, levelIndex) => {
        const nodesInLevel = levels[level]
        const nodeSpacing = graphSvg.value.clientWidth / (nodesInLevel.length + 1)
        
        nodesInLevel.forEach((node, nodeIndex) => {
          node.fx = (nodeIndex + 1) * nodeSpacing
          node.fy = (levelIndex + 1) * levelHeight
        })
      })
      break
  }
  
  simulation.value.alpha(1).restart()
}

const toggleClustering = () => {
  showClusters.value = !showClusters.value
  nextTick(() => {
    initializeGraph()
  })
}

const toggleLabels = () => {
  showLabels.value = !showLabels.value
  d3.select(graphSvg.value)
    .selectAll(".label")
    .attr("display", showLabels.value ? "block" : "none")
}

const resetView = () => {
  layoutType.value = 'force'
  showClusters.value = true
  showLabels.value = true
  
  // 释放固定位置
  nodes.value.forEach(node => {
    node.fx = null
    node.fy = null
  })
  
  if (simulation.value) {
    simulation.value.alpha(1).restart()
  }
}

const closeNodeDetail = () => {
  selectedNode.value = null
  // 重置节点和连接样式
  d3.select(graphSvg.value)
    .selectAll(".node")
    .attr("stroke", "#fff")
  
  d3.select(graphSvg.value)
    .selectAll(".link")
    .attr("stroke", "#999")
    .attr("stroke-width", d => Math.sqrt(d.weight))
}

// 监听器
watch(() => props.papers, () => {
  extractTopics()
  nextTick(() => {
    initializeGraph()
  })
})

// 生命周期钩子
onMounted(() => {
  extractTopics()
  nextTick(() => {
    initializeGraph()
  })
  
  // 窗口大小变化时重新初始化
  window.addEventListener('resize', initializeGraph)
})

onUnmounted(() => {
  if (simulation.value) {
    simulation.value.stop()
  }
  window.removeEventListener('resize', initializeGraph)
})
</script>

<style scoped>
.enhanced-topic-graph-container {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin: 30px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
}

.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.graph-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 24px;
}

.graph-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.control-select {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #ddd;
  background: white;
  font-size: 14px;
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

.graph-wrapper {
  border: 1px solid #ecf0f1;
  border-radius: 8px;
  height: 500px;
  overflow: hidden;
  background: #f8f9fa;
  position: relative;
}

.graph-svg {
  width: 100%;
  height: 100%;
}

.graph-info {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-top: 15px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.info-label {
  font-size: 14px;
  color: #7f8c8d;
}

.info-value {
  font-size: 18px;
  font-weight: bold;
  color: #2c3e50;
}

.node-detail-modal {
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
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-content h3 {
  margin-top: 0;
  color: #2c3e50;
}

.node-details {
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.detail-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.detail-item label {
  font-weight: bold;
  color: #2c3e50;
}

.related-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 5px;
}

.related-topic {
  background: #ecf0f1;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
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

/* D3样式 */
.link {
  stroke: #999;
  stroke-opacity: 0.6;
}

.node {
  cursor: pointer;
}

.label {
  pointer-events: none;
  font-family: sans-serif;
  font-size: 10px;
}

.cluster-circle {
  pointer-events: none;
}

.tooltip {
  position: absolute;
  text-align: center;
  padding: 8px;
  font: 12px sans-serif;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 4px;
  pointer-events: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .graph-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .graph-controls {
    justify-content: center;
  }
  
  .graph-wrapper {
    height: 400px;
  }
  
  .graph-info {
    gap: 15px;
  }
  
  .modal-content {
    width: 95%;
    padding: 15px;
  }
}
</style>