<template>
	<view class="header" :class="'theme-' + theme" :style="{ paddingTop: statusBarHeight + 'px' }">
		<view class="back" @click="back">‹</view>
		<text class="title">{{ title }}</text>
		<view class="placeholder"></view>
	</view>
</template>

<script>
	/**
	 * 骰子局统一顶部栏：根据手机状态栏高度增加安全距离，避免标题被前置摄像头或刘海遮挡。
	 */
	export default {
		name: 'ZcyltzjHeader',
		props: {
			title: {
				type: String,
				default: ''
			},
			// light：深色页面白字；dark：浅色天空背景用深色字/半透明白底返回键。
			theme: {
				type: String,
				default: 'light'
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
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-left: 24rpx;
		padding-right: 24rpx;
		padding-bottom: 12rpx;
		color: #ffffff;
	}

	.back,
	.placeholder {
		width: 72rpx;
		height: 72rpx;
		line-height: 64rpx;
		font-size: 56rpx;
		text-align: center;
	}

	.title {
		font-size: 30rpx;
		letter-spacing: 4rpx;
		color: rgba(255, 255, 255, 0.9);
	}

	.header.theme-dark {
		color: #6b4a1e;
	}

	.header.theme-dark .back {
		width: 56rpx;
		height: 56rpx;
		line-height: 50rpx;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.55);
		font-size: 44rpx;
	}

	.header.theme-dark .placeholder {
		width: 56rpx;
		height: 56rpx;
	}

	.header.theme-dark .title {
		color: #6b4a1e;
	}
</style>
