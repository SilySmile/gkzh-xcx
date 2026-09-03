<template>
	<view class="container">
		<uni-nav-bar
			dark
			:fixed="true"
			shadow
			background-color="#007AFF"
			status-bar
			title="职业推荐"
			left-icon="left"
			@clickLeft="back"
			:border="false"
		/>
		        
		<view class="career-container">
			<!-- MBTI类型标题 -->
			<!-- <view class="type-header">
				<text class="type-code">{{ mbtiCode }}</text>
				<text class="type-name">{{ personalityData.typeName }}</text>
			</view> -->
			
			<!-- 适合领域 -->
			<view class="fields-section">
				<text class="section-title">适合领域</text>
				<view class="field-list">
					<view 
						v-for="(field, idx) in personalityData.fields" 
						:key="idx"
						class="field-item"
					>
						<text class="field-icon">💼</text>
						<text class="field-name">{{ field }}</text>
					</view>
				</view>
			</view>
			
			<!-- 典型职业 -->
			<view class="careers-section">
				<text class="section-title">典型职业</text>
				<view class="career-grid">
					<view 
						v-for="(career, idx) in personalityData.careers" 
						:key="idx"
						class="career-card"
					>
						<text class="career-icon">⭐</text>
						<text class="career-name">{{ career }}</text>
					</view>
				</view>
			</view>
			
			<!-- 职业建议 -->
			<!-- <view class="advice-section">
				<text class="section-title">职业建议</text>
				<text class="advice-text">{{ personalityData.advice }}</text>
			</view> -->
			
			<!-- 操作按钮 -->
			<view class="action-section">
				<button class="home-btn" @click="goHome">返回首页</button>
			</view>
		</view>
	</view>
</template>

<script>
import { mbtiPersonalityData } from '@/data/mbti-data.js'
import { redirectToActivityWeek } from '@/utils/activity'

export default {
	data() {
		return {
			mbtiCode: '',
			activityId: '',
			personalityData: {}
		}
	},
	onLoad(options) {
		this.mbtiCode = options.code || 'ESTJ'
		this.activityId = options.activityId || ''
		
		// 加载对应MBTI类型的数据
		this.loadPersonalityData()
	},
	methods: {
		loadPersonalityData() {
			const data = mbtiPersonalityData[this.mbtiCode]
			if (data) {
				this.personalityData = data
			} else {
				this.personalityData = {
					typeName: '未知类型',
					fields: ['探索中'],
					careers: ['数据加载中'],
					advice: '暂无建议'
				}
			}
		},
		
		goHome() {
			redirectToActivityWeek()
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

.career-container {
	padding: 30rpx;
}

.type-header {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 40rpx;
	text-align: center;
	margin-bottom: 30rpx;
	box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.1);
}

.type-code {
	font-size: 64rpx;
	font-weight: bold;
	color: #667eea;
	display: block;
	letter-spacing: 10rpx;
}

.type-name {
	font-size: 32rpx;
	color: #333;
	margin-top: 15rpx;
	display: block;
}

.section-title {
	font-size: 30rpx;
	font-weight: bold;
	color: #fff;
	margin-bottom: 20rpx;
	display: block;
}

.fields-section {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 30rpx;
	margin-bottom: 30rpx;
}

.fields-section .section-title {
	color: #333;
}

.field-list {
	display: flex;
	flex-direction: column;
	gap: 15rpx;
}

.field-item {
	display: flex;
	align-items: center;
	padding: 15rpx;
	background: #f5f5f5;
	border-radius: 15rpx;
}

.field-icon {
	font-size: 32rpx;
	margin-right: 15rpx;
}

.field-name {
	font-size: 26rpx;
	color: #333;
}

.careers-section {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 30rpx;
	margin-bottom: 30rpx;
}

.careers-section .section-title {
	color: #333;
}

.career-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 15rpx;
}

.career-card {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 15rpx;
	padding: 20rpx;
	text-align: center;
}

.career-icon {
	font-size: 40rpx;
	display: block;
	margin-bottom: 10rpx;
}

.career-name {
	font-size: 24rpx;
	color: #fff;
}

.advice-section {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 30rpx;
	margin-bottom: 30rpx;
}

.advice-text {
	font-size: 26rpx;
	color: #333;
	line-height: 1.8;
}

.action-section {
	padding: 0 20rpx;
}

.home-btn {
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
