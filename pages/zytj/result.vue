<template>
	<view class="container">
		<uni-nav-bar
			dark
			:fixed="true"
			shadow
			background-color="#007AFF"
			status-bar
			title="MBTI性格类型"
			left-icon="left"
			@clickLeft="back"
			:border="false"
		/>
		
		<view class="result-container">
			<!-- 页面标题 -->
			<view class="page-header">
				<text class="page-title">你的 MBTI 性格类型</text>
				

			</view>
			
			<!-- MBTI 类型列表 -->
			<view class="mbti-list">
				<view 
					<!-- v-for="(item, index) in mbtiList" 
					:key="index" -->
					<!-- class="mbti-card"
				> -->
					<!-- 六边形字母框 -->
					<view class="hex-container">
						<view class="hex-item" v-for="(letter, idx) in currentMbti.letters" :key="idx">
							<view class="hexagon">
								<text class="hex-letter">{{ letter }}</text>
							</view>
						</view>
					</view>
					
					<!-- 特点解释 -->
					<view class="characteristic-text">
						{{ currentMbti.characteristic }}
					</view>
				</view>
			</view>
			
			<!-- 操作按钮 -->
			<view class="action-section">
				<button class="next-btn" @click="goToDetail">查看详细解释</button>
			</view>
		</view>
	</view>
</template>

<script>
import { redirectToActivityWeek } from '@/utils/activity'

export default {
	data() {
		return {
			activityId: '',
			mbtiCode: '',
			mbtiList: [
				{ code: 'ISTJ', letters: ['I', 'S', 'T', 'J'], characteristic: '实际、有条理、注重细节、坚守传统' },
				{ code: 'ISFJ', letters: ['I', 'S', 'F', 'J'], characteristic: '忠诚、体贴、善于照顾他人、注重秩序' },
				{ code: 'INFJ', letters: ['I', 'N', 'F', 'J'], characteristic: '富有洞察力、创造力、理想主义、善于规划' },
				{ code: 'INTJ', letters: ['I', 'N', 'T', 'J'], characteristic: '理性、独立、目标导向、擅长逻辑分析' },
				{ code: 'ISTP', letters: ['I', 'S', 'T', 'P'], characteristic: '冷静、灵活、擅长实操、喜欢探索' },
				{ code: 'ISFP', letters: ['I', 'S', 'F', 'P'], characteristic: '敏感、艺术感强、注重当下体验' },
				{ code: 'INFP', letters: ['I', 'N', 'F', 'P'], characteristic: '富有同情心、追求自我价值、充满创意' },
				{ code: 'INTP', letters: ['I', 'N', 'T', 'P'], characteristic: '好奇、逻辑思维卓越、喜欢理论研究' },
				{ code: 'ESTP', letters: ['E', 'S', 'T', 'P'], characteristic: '外向、勇敢、适应力强、喜欢挑战' },
				{ code: 'ESFP', letters: ['E', 'S', 'F', 'P'], characteristic: '热情、友善、善于社交、热爱生活' },
				{ code: 'ENFP', letters: ['E', 'N', 'F', 'P'], characteristic: '乐观、富有想象力、善于激励他人' },
				{ code: 'ENTP', letters: ['E', 'N', 'T', 'P'], characteristic: '机智、善于辩论、思维敏捷、敢于创新' },
				{ code: 'ESTJ', letters: ['E', 'S', 'T', 'J'], characteristic: '果断、组织能力强、注重效率、遵守规则' },
				{ code: 'ESFJ', letters: ['E', 'S', 'F', 'J'], characteristic: '乐于助人、责任心强、擅长协调、注重人际关系' },
				{ code: 'ENFJ', letters: ['E', 'N', 'F', 'J'], characteristic: '领导力强、善于沟通、富有感染力、目标明确' },
				{ code: 'ENTJ', letters: ['E', 'N', 'T', 'J'], characteristic: '自信、有远见、决策力强、善于战略规划' }
			]
		}
	},
	onLoad(options) {
		this.activityId = options.activityId || ''
		this.mbtiCode = options.code || ''
	},
	computed: {
	        currentMbti() {
	            return this.mbtiList.find(item => item.code === this.mbtiCode) || this.mbtiList[0]
	        }
	    },
	methods: {
		goToDetail() {
			uni.navigateTo({
				url: '/pages/zytj/detail?code=' + this.mbtiCode + '&activityId=' + this.activityId
			})
		},
		
		back() {
			redirectToActivityWeek()
		}
	}
}
</script>

<style scoped>
.container {
	min-height: 100vh;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.result-container {
	padding: 30rpx;
	padding-top: 120rpx;
}

.page-header {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 30rpx;
	text-align: center;
	margin-bottom: 30rpx;
	box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.1);
}

.page-title {
	font-size: 36rpx;
	font-weight: bold;
	color: #667eea;
	display: block;
	margin-bottom: 10rpx;
}

.page-subtitle {
	font-size: 24rpx;
	color: #666;
	display: block;
}

.mbti-list {
	display: flex;
	flex-direction: column;
	gap: 25rpx;
}

.mbti-card {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 35rpx 30rpx 30rpx;
	box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.1);
}

/* 六边形容器 */
.hex-container {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 15rpx;
	margin-bottom: 25rpx;
}

.hex-item {
	width: 90rpx;
	height: 100rpx;
	display: flex;
	justify-content: center;
	align-items: center;
}

/* 六边形样式 */
.hexagon {
		width: 90rpx;
		height: 90rpx;
		background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
		position: relative;
	display: flex;
	justify-content: center;
	align-items: center;
	clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
		box-shadow: 0 4rpx 12rpx rgba(255, 107, 107, 0.4);

}

.hex-letter {
	font-size: 40rpx;
	font-weight: bold;
	color: #fff;
	letter-spacing: 2rpx;
}

/* 特点文字 */
.characteristic-text {
	font-size: 28rpx;
	color: #333;
	line-height: 1.8;
	text-align: center;
	padding: 0 10rpx;
}

.action-section {
	padding: 0 20rpx;
	margin-top: 30rpx;
}

.next-btn {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
	border: none;
	border-radius: 50rpx;
	font-size: 32rpx;
	font-weight: bold;
	padding: 25rpx 0;
	box-shadow: 0 8rpx 20rpx rgba(102, 126, 234, 0.4);
}
</style>
