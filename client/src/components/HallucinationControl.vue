<template>
  <div class="hallucination-control">
    <!-- 置信度评分显示 -->
    <div class="confidence-section">
      <h3>AI置信度评分</h3>
      <div class="score-display" :style="{ color: getScoreColor(confidenceScore) }">
        {{ confidenceScore }}/100
      </div>
      <div class="score-bar">
        <div 
          class="score-fill" 
          :style="{ width: confidenceScore + '%', backgroundColor: getScoreColor(confidenceScore) }"
        ></div>
      </div>
    </div>

    <!-- 幻觉风险评估 -->
    <div class="hallucination-risk" v-if="keyTermValidation && keyTermValidation.hallucinationRisk">
      <h3>幻觉风险评估</h3>
      <div class="risk-indicator" :class="keyTermValidation.hallucinationRisk">
        风险等级: {{ getRiskLabel(keyTermValidation.hallucinationRisk) }}
      </div>
      <ul class="recommendations" v-if="keyTermValidation.recommendations && keyTermValidation.recommendations.length > 0">
        <li v-for="(rec, index) in keyTermValidation.recommendations" :key="index">
          {{ rec }}
        </li>
      </ul>
    </div>

    <!-- 词云可视化 -->
    <div class="wordcloud-section" v-show="wordCloudData && wordCloudData.length > 0">
      <h3>关键词分布</h3>
      <div ref="wordCloudContainer" class="wordcloud-container"></div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue';
// 引入WordCloud库
import WordCloud from 'wordcloud';

export default {
  name: 'HallucinationControl',
  props: {
    confidenceScore: {
      type: Number,
      default: 0
    },
    wordCloudData: {
      type: Array,
      default: () => []
    },
    keyTermValidation: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props) {
    const wordCloudContainer = ref(null);

    // 获取评分颜色
    const getScoreColor = (score) => {
      if (score >= 80) return '#4CAF50';  // 绿色
      if (score >= 60) return '#FF9800';  // 橙色
      return '#F44336';                   // 红色
    };

    // 获取风险标签
    const getRiskLabel = (risk) => {
      switch (risk) {
        case 'low': return '低';
        case 'medium': return '中';
        case 'high': return '高';
        default: return '未知';
      }
    };

    // 绘制词云
    const drawWordCloud = () => {
      if (!wordCloudContainer.value || !props.wordCloudData || props.wordCloudData.length === 0) return;

      // 清空容器
      wordCloudContainer.value.innerHTML = '';

      // 定义固定的颜色序列，确保视觉一致性
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FF9F68', '#A8E6CF', '#FF8B94'];
      
      // 绘制词云 - 优化配置参数以增大字体和减少稀疏感
      WordCloud(wordCloudContainer.value, {
        list: props.wordCloudData,
        gridSize: 8,  // 减小网格大小以减少稀疏感
        weightFactor: (size) => {
          // 动态权重因子，增大字体大小
          return Math.min(Math.max(size * 3, 12), 52);  // 最小12px，最大48px
        },
        fontFamily: 'Arial, sans-serif',
        color: (word, weight, fontSize, distance, theta) => {
          // 基于权重或位置的确定性颜色选择
          const index = Math.abs(word.charCodeAt(0) + weight) % colors.length;
          return colors[index];
        },
        backgroundColor: '#ffffff',
        rotateRatio: 0.5,
        rotationSteps: 2,
        shuffle: false, // 保持顺序一致性
        shape: 'circle',
        ellipticity: 0.68,
        minSize: 12,  // 设置最小字体大小
        drawOutOfBound: false
      });
    };

    // 监听数据变化并重新绘制词云
    watch(() => props.wordCloudData, () => {
      setTimeout(drawWordCloud, 100);  // 稍微延迟以确保DOM更新
    });

    onMounted(() => {
      drawWordCloud();
    });

    return {
      wordCloudContainer,
      getScoreColor,
      getRiskLabel
    };
  }
};
</script>

<style scoped>
.hallucination-control {
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-family: 'Arial', sans-serif;
}

.confidence-section h3,
.wordcloud-section h3,
.hallucination-risk h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.score-display {
  font-size: 36px;
  font-weight: bold;
  text-align: center;
  margin: 10px 0;
}

.score-bar {
  width: 100%;
  height: 10px;
  background-color: #e0e0e0;
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 20px;
}

.score-fill {
  height: 100%;
  transition: width 0.5s ease;
}

.wordcloud-container {
  width: 100%;
  height: 300px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
}

.hallucination-risk {
  margin-bottom: 20px;
  padding: 15px;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.risk-indicator {
  padding: 10px;
  border-radius: 4px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 10px;
}

.risk-indicator.low {
  background-color: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

.risk-indicator.medium {
  background-color: #fff8e1;
  color: #f57f17;
  border: 1px solid #ffecb3;
}

.risk-indicator.high {
  background-color: #ffebee;
  color: #c62828;
  border: 1px solid #ffcdd2;
}

.recommendations {
  padding-left: 20px;
  margin: 0;
}

.recommendations li {
  margin-bottom: 8px;
  color: #555;
}
</style>