<template>
	<view class="header" :style="{ paddingTop: statusBarHeight + 'px' }">
		<view class="back" @click="$emit('back')">‹</view>
		<view class="title">{{ title }}</view>
		<view class="placeholder"></view>
	</view>
</template>

<script>
	/**
	 * 职得一拼统一顶部栏：半透明白色返回键 + 可选标题，按状态栏高度增加安全区。
	 * 页面背景为米色，所以文字与图标使用深棕色。
	 */
	export default {
		name: 'ZdypHeader',
		props: {
			title: {
				type: String,
				default: ''
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
		position: absolute;
		top: 0;
		left: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0 28rpx 10rpx;
		box-sizing: border-box;
	}

	.back,
	.placeholder {
		width: 62rpx;
		height: 62rpx;
		line-height: 56rpx;
		border-radius: 50%;
		text-align: center;
		font-size: 46rpx;
		font-weight: 600;
	}

	.back {
		color: #3D3428;
		background: rgba(255, 255, 255, 0.82);
		border: 2rpx solid rgba(255, 255, 255, 0.9);
		box-shadow: 0 6rpx 14rpx rgba(160, 120, 40, 0.16);
	}

	.title {
		flex: 1;
		text-align: center;
		font-size: 30rpx;
		font-weight: 600;
		color: #3D3428;
		letter-spacing: 2rpx;
	}
</style>
