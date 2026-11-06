<template>
	<view class="header" :class="'theme-' + theme" :style="{ paddingTop: statusBarHeight + 'px' }">
		<view class="back" @click="back">‹</view>
		<view class="placeholder"></view>
	</view>
</template>

<script>
	/**
	 * 能量雷达统一顶部栏：只保留返回键，按状态栏高度增加安全区。
	 * 三个页面都是整页效果图，标题由页面内的图片承担。
	 */
	export default {
		name: 'NlldHeader',
		props: {
			// light：深色背景白字；dark：浅色天空背景用深色返回键。
			theme: {
				type: String,
				default: 'dark'
			}
		},
		data: () => ({
			// 兜底 20px，实际以系统状态栏高度为准，再额外留 10px 间距。
			statusBarHeight: 30
		}),
		mounted() {
			try {
				const info = uni.getSystemInfoSync()
				this.statusBarHeight = (info.statusBarHeight || 20) + 10
			} catch (e) {
				this.statusBarHeight = 30
			}
		},
		methods: {
			back() {
				this.$emit('back')
			}
		}
	}
</script>

<style scoped>
	.header {
		position: relative;
		z-index: 3;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-left: 24rpx;
		padding-right: 24rpx;
		padding-bottom: 12rpx;
		color: #6b4a1e;
	}

	.back,
	.placeholder {
		width: 56rpx;
		height: 56rpx;
		line-height: 50rpx;
		font-size: 44rpx;
		text-align: center;
	}

	.back {
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.55);
	}

	.header.theme-light {
		color: #ffffff;
	}

	.header.theme-light .back {
		background: rgba(0, 0, 0, 0.18);
	}
</style>
