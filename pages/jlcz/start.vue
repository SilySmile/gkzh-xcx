<template>
	<view class="page">
		<view class="blob blob-one"></view>
		<view class="blob blob-two"></view>
		<view class="blob blob-three"></view>
		<view class="bottom-wave"></view>
		<view class="deco-card">
			<view class="deco-avatar"></view>
			<view class="deco-line deco-line-one"></view>
			<view class="deco-line deco-line-two"></view>
			<view class="deco-line deco-line-three"></view>
		</view>

		<view class="topbar" :style="{ paddingTop: statusBarHeight + 'px' }">
			<view class="back" @click="back">‹</view>
		</view>

		<view class="body">
			<image class="logo" src="/static/jlcz/start-logo.png" mode="widthFix" />
			<image class="scale-art" src="/static/jlcz/start-scale.png" mode="widthFix" />

			<view class="bottom">
				<view v-if="statusText" class="status-tip">
					<text class="status-text">{{ statusText }}</text>
				</view>
				<view class="start-wrap" :class="{ pressed: pressed, loading: loading }"
					@touchstart="pressed = true" @touchend="pressed = false" @touchcancel="pressed = false"
					@click="start">
					<image class="start-art" src="/static/jlcz/start-button.png" mode="widthFix" />
					<text v-if="loading" class="loading-text">正在进入…</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { enterRecord, getRecord, startRecord, userMessage } from '@/api/jlcz'

	export default {
		data: () => ({
			instanceId: '',
			gameId: '',
			recordId: '',
			record: null,
			loading: false,
			pressed: false,
			statusText: '',
			statusBarHeight: 30,
			leftWeight: 80,
			passWeight: 80
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
						gameType: 'jlcz',
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
					const setting = this.record.setting || {}
					this.leftWeight = Number(setting.leftWeightG) || 80
					this.passWeight = Number(setting.passWeightG) || 80
					if (this.record.status === 'finished') {
						this.statusText = this.record.result && this.record.result.pass
							? '本次称重已通关，可查看结果。'
							: '本次称重已完成，可查看结果或重新称一次。'
					} else {
						this.statusText = ''
					}
				} catch (e) {
					uni.showToast({ title: userMessage(e, '称重信息加载失败，请重新扫码'), icon: 'none' })
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
						uni.redirectTo({ url: `/pages/jlcz/result?${base}` })
						return
					}
					await startRecord(this.recordId)
					uni.redirectTo({ url: `/pages/jlcz/index?${base}` })
				} catch (e) {
					uni.showToast({ title: userMessage(e, '开始称重失败，请稍后重试'), icon: 'none' })
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
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: linear-gradient(180deg, #fdf5e7 0%, #fcebcf 100%);
		overflow: hidden;
	}

	.blob {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
	}

	.blob-one {
		top: -220rpx;
		right: -200rpx;
		width: 720rpx;
		height: 720rpx;
		background: radial-gradient(circle at 50% 50%, rgba(251, 227, 182, 0.95) 0%, rgba(251, 227, 182, 0) 68%);
	}

	.blob-two {
		bottom: -280rpx;
		left: -260rpx;
		width: 820rpx;
		height: 820rpx;
		background: radial-gradient(circle at 50% 50%, rgba(250, 224, 180, 0.9) 0%, rgba(250, 224, 180, 0) 70%);
	}

	.blob-three {
		top: 46%;
		left: -240rpx;
		width: 460rpx;
		height: 460rpx;
		background: radial-gradient(circle at 50% 50%, rgba(255, 252, 244, 0.9) 0%, rgba(255, 252, 244, 0) 70%);
	}

	/* 底部米色波浪和简历卡片，呼应效果图底部装饰。 */
	.bottom-wave {
		position: absolute;
		left: -20%;
		bottom: -220rpx;
		width: 140%;
		height: 420rpx;
		border-radius: 50%;
		background: rgba(251, 232, 199, 0.55);
	}

	.deco-card {
		position: absolute;
		right: 46rpx;
		bottom: 34rpx;
		width: 180rpx;
		height: 224rpx;
		padding: 22rpx 20rpx;
		border-radius: 18rpx;
		background: rgba(255, 253, 248, 0.62);
		box-sizing: border-box;
		transform: rotate(-8deg);
		z-index: 1;
	}

	.deco-avatar {
		width: 52rpx;
		height: 52rpx;
		border-radius: 50%;
		background: rgba(232, 211, 175, 0.75);
	}

	.deco-line {
		height: 10rpx;
		margin-top: 14rpx;
		border-radius: 6rpx;
		background: rgba(232, 211, 175, 0.6);
	}

	.deco-line-one {
		width: 96rpx;
	}

	.deco-line-two {
		width: 138rpx;
	}

	.deco-line-three {
		width: 120rpx;
	}

	.topbar {
		position: relative;
		z-index: 3;
		padding-left: 28rpx;
		padding-bottom: 6rpx;
	}

	.back {
		width: 62rpx;
		height: 62rpx;
		line-height: 56rpx;
		border-radius: 50%;
		text-align: center;
		font-size: 46rpx;
		color: #8a6a32;
		background: rgba(255, 255, 255, 0.62);
		border: 2rpx solid rgba(232, 201, 146, 0.7);
		box-sizing: border-box;
	}

	.body {
		position: relative;
		z-index: 2;
		display: flex;
		flex: 1;
		height: 0;
		flex-direction: column;
		align-items: center;
		padding: 0 30rpx;
		box-sizing: border-box;
	}

	.logo {
		width: 560rpx;
		margin-top: 10rpx;
	}

	.scale-art {
		width: 700rpx;
		margin-top: 60rpx;
	}

	.bottom {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-top: auto;
		padding-bottom: calc(280rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(280rpx + env(safe-area-inset-bottom));
	}

	.status-tip {
		max-width: 620rpx;
		margin-bottom: 20rpx;
		padding: 10rpx 24rpx;
		border-radius: 26rpx;
		background: rgba(255, 250, 238, 0.88);
		border: 2rpx solid rgba(232, 201, 146, 0.6);
	}

	.status-text {
		font-size: 22rpx;
		line-height: 1.55;
		color: #8a6a32;
		text-align: center;
	}

	.start-wrap {
		position: relative;
		width: 480rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.15s ease;
	}

	.start-wrap.pressed {
		transform: scale(0.96);
	}

	.start-wrap.loading {
		opacity: 0.86;
	}

	.start-art {
		width: 480rpx;
	}

	.loading-text {
		position: absolute;
		left: 60rpx;
		right: 0;
		text-align: center;
		font-size: 30rpx;
		font-weight: 600;
		color: #fffdf6;
		letter-spacing: 2rpx;
		text-shadow: 0 2rpx 4rpx rgba(120, 78, 20, 0.35);
	}
</style>
