<template>
	<view class="container">
		<uni-nav-bar
			dark
			:fixed="true"
			shadow
			background-color="#007AFF"
			status-bar
			title="性格详解"
			left-icon="left"
			@clickLeft="back"
			:border="false"
		/>
		
		<view class="detail-container">
			<!-- MBTI代码展示 -->
			<view class="code-display">
				<text class="code-label">您的性格代码</text>
				<text class="code-value">{{ mbtiCode }}</text>
			</view>
			
			<!-- 四个维度详解 -->
			<view 
				v-for="(dimension, idx) in dimensions" 
				:key="idx"
				class="dimension-card"
			>
				<view class="dimension-header">
					<text class="dimension-letter">{{ dimension.letter }}</text>
					<text class="dimension-name">{{ dimension.name }}</text>
				</view>
				<view class="dimension-content">
					<text class="dimension-desc">{{ dimension.description }}</text>
				</view>
				<!-- <view class="dimension-comparison">
					<view class="comparison-item active">
						<text class="comparison-label">您偏向</text>
						<text class="comparison-value">{{ dimension.selected }}</text>
					</view>
					<view class="comparison-divider">VS</view>
					<view class="comparison-item">
						<text class="comparison-label">另一面</text>
						<text class="comparison-value">{{ dimension.alternative }}</text>
					</view>
				</view> -->
			</view>
			
			<!-- 操作按钮 -->
			<view class="action-section">
				<button class="next-btn" @click="goToCareer">查看职业推荐</button>
			</view>
		</view>
	</view>
</template>

<script>
import { mbtiDimensionsData } from '@/data/mbti-data.js'

export default {
	data() {
		return {
			mbtiCode: '',
			activityId: '',
			dimensions: []
		}
	},
	onLoad(options) {
		this.mbtiCode = options.code || 'ESTJ'
		this.activityId = options.activityId || ''
		
		// 加载维度数据
		this.loadDimensions()
	},
	methods: {
		loadDimensions() {
			// 根据MBTI代码提取4个维度
			const codes = this.mbtiCode.split('')
			const allDimensions = mbtiDimensionsData
			
			this.dimensions = [
				{
					letter: codes[0],
					name: codes[0] === 'E' ? '外向' : '内向',
					description: codes[0] === 'E' ? allDimensions.EI.E.description : allDimensions.EI.I.description,
					selected: codes[0] === 'E' ? allDimensions.EI.E.name : allDimensions.EI.I.name,
					alternative: codes[0] === 'E' ? allDimensions.EI.I.name : allDimensions.EI.E.name
				},
				{
					letter: codes[1],
					name: codes[1] === 'S' ? '实感' : '直觉',
					description: codes[1] === 'S' ? allDimensions.SN.S.description : allDimensions.SN.N.description,
					selected: codes[1] === 'S' ? allDimensions.SN.S.name : allDimensions.SN.N.name,
					alternative: codes[1] === 'S' ? allDimensions.SN.N.name : allDimensions.SN.S.name
				},
				{
					letter: codes[2],
					name: codes[2] === 'T' ? '思考' : '情感',
					description: codes[2] === 'T' ? allDimensions.TF.T.description : allDimensions.TF.F.description,
					selected: codes[2] === 'T' ? allDimensions.TF.T.name : allDimensions.TF.F.name,
					alternative: codes[2] === 'T' ? allDimensions.TF.F.name : allDimensions.TF.T.name
				},
				{
					letter: codes[3],
					name: codes[3] === 'J' ? '判断' : '感知',
					description: codes[3] === 'J' ? allDimensions.JP.J.description : allDimensions.JP.P.description,
					selected: codes[3] === 'J' ? allDimensions.JP.J.name : allDimensions.JP.P.name,
					alternative: codes[3] === 'J' ? allDimensions.JP.P.name : allDimensions.JP.J.name
				}
			]
		},
		
		goToCareer() {
			uni.navigateTo({
				url: '/pages/zytj/career?code=' + this.mbtiCode + '&activityId=' + this.activityId
			})
		},
		
		back() {
			uni.navigateBack()
		}
	}
}
</script>

<style scoped>
.container {
	min-height: 100vh;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.detail-container {
	padding: 30rpx;
}

.code-display {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 30rpx;
	text-align: center;
	margin-bottom: 30rpx;
	box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.1);
}

.code-label {
	font-size: 26rpx;
	color: #666;
	display: block;
	margin-bottom: 10rpx;
}

.code-value {
	font-size: 56rpx;
	font-weight: bold;
	color: #667eea;
	letter-spacing: 10rpx;
}

.dimension-card {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 30rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.dimension-header {
	display: flex;
	align-items: center;
	margin-bottom: 20rpx;
}

.dimension-letter {
	width: 60rpx;
	height: 60rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 32rpx;
	font-weight: bold;
	margin-right: 15rpx;
}

.dimension-name {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
}

.dimension-content {
	margin-bottom: 20rpx;
}

.dimension-desc {
	font-size: 26rpx;
	color: #666;
	line-height: 1.6;
}

.dimension-comparison {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: #f5f5f5;
	border-radius: 15rpx;
	padding: 20rpx;
}

.comparison-item {
	flex: 1;
	text-align: center;
}

.comparison-item.active {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 10rpx;
	padding: 15rpx;
}

.comparison-label {
	font-size: 22rpx;
	color: #999;
	display: block;
	margin-bottom: 8rpx;
}

.comparison-item.active .comparison-label {
	color: rgba(255, 255, 255, 0.8);
}

.comparison-value {
	font-size: 24rpx;
	font-weight: bold;
	color: #333;
}

.comparison-item.active .comparison-value {
	color: #fff;
}

.comparison-divider {
	font-size: 20rpx;
	color: #999;
	margin: 0 15rpx;
}

.action-section {
	margin-top: 30rpx;
	padding: 0 20rpx;
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
