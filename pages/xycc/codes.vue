<template>
	<view class="codes-page">
		<view class="top-bar">
			<text class="back" @click="goBack">‹</text>
			<text class="title">职业兴趣编码解释</text>
			<view class="placeholder"></view>
		</view>

		<scroll-view scroll-y class="scroll-body">
			<view class="code-grid">
				<view
					v-for="item in hollandCodes"
					:key="item.code"
					class="code-card"
					:style="{ borderColor: item.color }"
					@click="selectCode(item)"
				>
					<text class="code-icon">{{ item.icon }}</text>
					<text class="code-name">{{ item.code }} · {{ item.name }}</text>
					<text class="code-full">{{ item.fullName }}</text>
				</view>
			</view>

			<view v-if="active" class="detail-card">
				<view class="detail-title" :style="{ color: active.color }">
					{{ active.code }} · {{ active.name }}
				</view>
				<view class="detail-line">
					<text class="label">核心特点</text>
					<text class="value">{{ active.traits }}</text>
				</view>
				<view class="detail-line">
					<text class="label">典型工作</text>
					<text class="value">{{ active.work }}</text>
				</view>
				<view class="detail-line">
					<text class="label">生活事例</text>
					<text class="value">{{ active.life }}</text>
				</view>
				<view class="detail-summary">{{ active.summary }}</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { hollandCodes as fallbackHollandCodes } from '@/data/holland-codes.js'
import { getHollandCodes } from '@/api/xycc.js'

export default {
	data() {
		return {
			hollandCodes: [],
			active: null
		}
	},
	onLoad(options) {
		const code = options.code
		this.fetchCodes(code)
	},
	methods: {
		fetchCodes(initialCode) {
			getHollandCodes().then(res => {
				if (res.code === 200 && res.data && res.data.length) {
					this.hollandCodes = res.data
				} else {
					this.hollandCodes = fallbackHollandCodes
				}
				if (initialCode) {
					this.active = this.hollandCodes.find(item => item.code === initialCode) || null
				}
			}).catch(() => {
				this.hollandCodes = fallbackHollandCodes
				if (initialCode) {
					this.active = this.hollandCodes.find(item => item.code === initialCode) || null
				}
			})
		},
		selectCode(item) {
			this.active = item
		},
		goBack() {
			uni.navigateBack()
		}
	}
}
</script>

<style scoped>
.codes-page {
	min-height: 100vh;
	background: #f5f7fb;
}

.top-bar {
	height: 96rpx;
	display: flex;
	align-items: center;
	padding: 0 24rpx;
	background: #ffffff;
	border-bottom: 1rpx solid #eef2f7;
}

.back {
	width: 64rpx;
	font-size: 52rpx;
	color: #333;
}

.title {
	flex: 1;
	text-align: center;
	font-size: 34rpx;
	font-weight: 700;
	color: #1a2c4a;
}

.placeholder {
	width: 64rpx;
}

.scroll-body {
	padding: 24rpx;
	height: calc(100vh - 96rpx);
	box-sizing: border-box;
}

.code-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 20rpx;
}

.code-card {
	background: #ffffff;
	border: 3rpx solid #eeeeee;
	border-radius: 24rpx;
	padding: 28rpx 20rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.code-icon {
	font-size: 60rpx;
}

.code-name {
	margin-top: 12rpx;
	font-size: 30rpx;
	font-weight: 700;
	color: #1a2c4a;
}

.code-full {
	margin-top: 4rpx;
	font-size: 22rpx;
	color: #999999;
}

.detail-card {
	margin-top: 24rpx;
	background: #ffffff;
	border-radius: 24rpx;
	padding: 30rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.detail-title {
	font-size: 38rpx;
	font-weight: 800;
	margin-bottom: 22rpx;
}

.detail-line {
	margin-bottom: 18rpx;
}

.label {
	display: block;
	font-size: 24rpx;
	color: #909399;
	margin-bottom: 8rpx;
}

.value {
	font-size: 28rpx;
	color: #34495e;
	line-height: 1.5;
}

.detail-summary {
	font-size: 28rpx;
	color: #2c3e50;
	line-height: 1.7;
	background: #f8fafc;
	border-radius: 16rpx;
	padding: 20rpx;
}
</style>
