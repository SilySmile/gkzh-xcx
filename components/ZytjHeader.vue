<template>
	<view class="zytj-header">
		<view class="back" @click="back">
			<text class="back-arrow">‹</text>
		</view>
	</view>
</template>

<script>
	/**
	 * 职愿探究页头：三页都使用 custom 导航，这里只保留返回键，
	 * 标题文字由各页背景图承担，避免与设计稿重复。
	 */
	export default {
		name: 'ZytjHeader',
		methods: {
			back() {
				const pages = getCurrentPages()
				if (pages.length > 1) {
					uni.navigateBack({ delta: 1 })
					return
				}
				uni.reLaunch({ url: '/pages/mp/home/index' })
			}
		}
	}
</script>

<style scoped>
	.zytj-header {
		position: absolute;
		left: 24rpx;
		top: 0;
		z-index: 30;
		padding-top: calc(var(--status-bar-height) + 12rpx);
	}

	.back {
		width: 64rpx;
		height: 64rpx;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.72);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4rpx 12rpx rgba(90, 110, 180, 0.16);
	}

	.back-arrow {
		font-size: 44rpx;
		line-height: 44rpx;
		color: #4a5b8c;
		margin-top: -6rpx;
	}
</style>
