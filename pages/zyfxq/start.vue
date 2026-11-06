<template>
	<view class="page">
		<image class="page-bg" :src="assets.bgStart" mode="aspectFill" />

		<view class="topbar" :style="{ paddingTop: statusBarHeight + 'px' }">
			<view class="back" @click="back">‹</view>
		</view>

		<image class="logo" :src="assets.logo" mode="aspectFit" />
		<image class="ribbon" :src="assets.ribbon" mode="aspectFit" />

		<view class="bottom">
			<view v-if="statusText" class="status-tip">
				<text class="status-text">{{ statusText }}</text>
			</view>
			<view class="start-btn" :class="{ pressed: pressed, disabled: loading }"
				@touchstart="pressed = true" @touchend="pressed = false" @touchcancel="pressed = false" @click="start">
				<image class="start-art" :src="assets.btnStart" mode="aspectFit" />
				<text v-if="loading" class="start-loading">正在进入…</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { enterRecord, getRecord, startRecord, userMessage } from '@/api/zyfxq'
	import { ZYFXQ_ASSETS } from '@/config/zyfxq-assets'

	export default {
		data: () => ({
			assets: ZYFXQ_ASSETS,
			instanceId: '',
			gameId: '',
			recordId: '',
			record: null,
			loading: false,
			pressed: false,
			statusText: '',
			statusBarHeight: 30
		}),
		mounted() {
			try {
				const info = uni.getSystemInfoSync()
				this.statusBarHeight = (info.statusBarHeight || 20) + 8
			} catch (e) {
				this.statusBarHeight = 30
			}
		},
		async onLoad(options) {
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			this.recordId = options.recordId || ''
			if (!this.recordId && this.instanceId && this.gameId) {
				await this.ensureRecord()
			}
			if (this.recordId) {
				await this.refresh()
			}
		},
		methods: {
			async ensureRecord() {
				try {
					const entered = await enterRecord({
						instanceId: this.instanceId,
						gameId: this.gameId,
						gameType: 'zyfxq',
						schoolId: uni.getStorageSync('schoolId')
					})
					const data = (entered && entered.data) || {}
					this.recordId = data.recordId || ''
					this.record = data
					if (!this.recordId) throw new Error('记录创建失败')
				} catch (e) {
					uni.showToast({ title: userMessage(e, '游戏入口校验失败，请重新扫码'), icon: 'none' })
				}
			},
			async refresh() {
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					this.record = res.data || {}
					if (this.record.status === 'playing') {
						this.statusText = this.record.currentQuestion
							? '你有一道题尚未作答，点击“开始游戏”继续。'
							: '本局正在进行中，点击“开始游戏”继续对局。'
					} else if (this.record.status === 'finished') {
						this.statusText = this.record.result === 'win'
							? '本局已通关，可查看结果。'
							: '本局未通关，可在结果页重新开始。'
					} else {
						this.statusText = ''
					}
				} catch (e) {
					uni.showToast({ title: userMessage(e, '对局信息加载失败，请重新扫码'), icon: 'none' })
				}
			},
			async start() {
				if (this.loading) return
				if (!this.instanceId || !this.gameId) {
					uni.showToast({ title: '二维码缺少活动信息，请重新扫码', icon: 'none' })
					return
				}
				if (!this.recordId) {
					await this.ensureRecord()
					if (!this.recordId) return
				}
				this.loading = true
				const base = `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = res.data || {}
					if (data.status === 'finished') {
						uni.redirectTo({ url: `/pages/zyfxq/result?${base}` })
						return
					}
					if (data.status === 'ready') {
						await startRecord(this.recordId)
					}
					uni.redirectTo({ url: `/pages/zyfxq/index?${base}` })
				} catch (e) {
					uni.showToast({ title: userMessage(e, '游戏启动失败，请稍后重试'), icon: 'none' })
				} finally {
					this.loading = false
					this.pressed = false
				}
			},
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
	.page {
		position: relative;
		min-height: 100vh;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		background: #4ab3ee;
		overflow: hidden;
	}

	.page-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		z-index: 0;
	}

	.topbar {
		position: relative;
		z-index: 3;
		width: 100%;
		box-sizing: border-box;
		padding-left: 20rpx;
		padding-bottom: 6rpx;
	}

	.back {
		width: 64rpx;
		height: 64rpx;
		line-height: 56rpx;
		border-radius: 50%;
		text-align: center;
		font-size: 50rpx;
		color: #ffffff;
		background: rgba(255, 255, 255, 0.32);
	}

	.logo {
		position: relative;
		z-index: 2;
		margin-top: 24rpx;
		width: 620rpx;
		height: 240rpx;
	}

	.ribbon {
		position: relative;
		z-index: 2;
		margin-top: 10rpx;
		width: 600rpx;
		height: 125rpx;
	}

	.bottom {
		position: relative;
		z-index: 2;
		margin-top: auto;
		margin-bottom: 70rpx;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.status-tip {
		width: 620rpx;
		margin-bottom: 16rpx;
		padding: 10rpx 18rpx;
		border-radius: 16rpx;
		background: rgba(6, 63, 124, 0.45);
		box-sizing: border-box;
	}

	.status-text {
		display: block;
		font-size: 23rpx;
		line-height: 1.5;
		color: #eaf6ff;
		text-align: justify;
		text-align-last: left;
	}

	.start-btn {
		position: relative;
		width: 410rpx;
		height: 138rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.start-btn.pressed {
		transform: scale(0.96);
	}

	.start-btn.disabled {
		opacity: 0.75;
	}

	.start-art {
		width: 100%;
		height: 100%;
	}

	.start-loading {
		position: absolute;
		font-size: 28rpx;
		font-weight: 600;
		color: #6b3500;
	}
</style>
