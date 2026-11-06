<template>
	<view class="header" :style="{ paddingTop: statusBarHeight + 'px' }">
		<view class="back" @click="$emit('back')">‹</view>
		<view class="title">{{ title }}</view>
		<view class="placeholder"></view>
	</view>
</template>

<script>
	/**
	 * 简历称重统一顶部栏：返回键 + 标题，按状态栏高度增加安全区。
	 */
	export default {
		name: 'JlczHeader',
		props: {
			title: {
				type: String,
				default: '简历称重'
			}
		},
		data: () => ({
			statusBarHeight: 30
		}),
		mounted() {
			try {
				const info = uni.getSystemInfoSync()
				this.statusBarHeight = (info.statusBarHeight || 20) + 8
			} catch (e) {
				this.statusBarHeight = 30
			}
		}
	}
</script>

<style scoped>
	.header {
		position: relative;
		z-index: 5;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 24rpx 12rpx;
		box-sizing: border-box;
	}

	.back,
	.placeholder {
		width: 60rpx;
		height: 60rpx;
		line-height: 54rpx;
		border-radius: 50%;
		text-align: center;
		font-size: 46rpx;
	}

	.back {
		color: #5b3d16;
		background: rgba(255, 255, 255, 0.6);
	}

	.title {
		flex: 1;
		text-align: center;
		font-size: 32rpx;
		font-weight: 600;
		color: #4a3315;
		letter-spacing: 2rpx;
	}
</style>
