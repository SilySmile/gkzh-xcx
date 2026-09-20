<template>
	<view class="zycck-header-space">
		<view class="zycck-header">
			<view class="header-back" @click="handleBack">‹ 返回</view>
			<text class="header-title">{{ title }}</text>
			<view class="header-side" />
		</view>
	</view>
</template>

<script>
	export default {
		name: 'ZycckHeader',
		props: {
			title: {
				type: String,
				default: '猜职业'
			}
		},
		methods: {
			handleBack() {
				if (this.$listeners && this.$listeners.back) {
					this.$emit('back')
					return
				}
				const pages = getCurrentPages()
				const current = pages.length ? pages[pages.length - 1] : null
				const options = current && current.options ? current.options : {}
				const query = ['recordId', 'instanceId', 'gameId']
					.filter(key => options[key] !== undefined && options[key] !== null && options[key] !== '')
					.map(key => `${key}=${encodeURIComponent(options[key])}`)
					.join('&')
				uni.redirectTo({ url: `/pages/zycck/start${query ? '?' + query : ''}` })
			}
		}
	}
</script>

<style scoped>
	.zycck-header-space {
		width: 100%;
		height: calc(88rpx + var(--status-bar-height, 20rpx));
		flex: 0 0 calc(88rpx + var(--status-bar-height, 20rpx));
	}

	.zycck-header {
		position: fixed;
		top: 0;
		left: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: space-between;
		box-sizing: border-box;
		width: 100%;
		height: calc(88rpx + var(--status-bar-height, 20rpx));
		padding: var(--status-bar-height, 20rpx) 28rpx 0;
		color: #263548;
		background-color: #fff;
	}

	.header-back,
	.header-side {
		width: 140rpx;
		height: 64rpx;
		line-height: 64rpx;
		font-size: 27rpx;
	}

	.header-back {
		color: #526173;
	}

	.header-title {
		position: absolute;
		left: 50%;
		bottom: 18rpx;
		transform: translateX(-50%);
		font-size: 34rpx;
		font-weight: 800;
		color: #1a2c4a;
	}
</style>
