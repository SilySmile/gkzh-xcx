<template>
	<view class="page">
		<view class="stage">
			<image class="stage-bg" :src="assets.bgStart" mode="scaleToFill"></image>

			<ZmwlHeader @back="back" />

			<image class="logo" :src="assets.logo" mode="widthFix"></image>
			<image class="ribbon" :src="assets.ribbon" mode="widthFix"></image>
			<image class="intro" :src="assets.intro" mode="widthFix"></image>

			<view v-if="hint" class="hint">
				<text class="hint-text">{{ hint }}</text>
			</view>

			<view class="start-btn" :class="{ pressed: pressing }" @touchstart="pressing = true"
				@touchend="pressing = false" @touchcancel="pressing = false" @click="start">
				<image class="btn-bg" :src="assets.btnYellow" mode="scaleToFill"></image>
				<image class="btn-text" :src="assets.btnStartText" mode="widthFix"></image>
			</view>
		</view>
	</view>
</template>

<script>
	import ZmwlHeader from '@/components/ZmwlHeader.vue'
	import assets from '@/config/zmwl-assets.js'
	import { enterRecord, getRecord, startRecord, userMessage } from '@/api/zmwl'

	/**
	 * 职面未来第一页：开启未来探索。
	 * 扫码进入即创建参与记录；已确认方向的学生直接查看个人未来选择卡。
	 */
	export default {
		components: { ZmwlHeader },
		data: () => ({
			assets,
			instanceId: '',
			gameId: '',
			recordId: '',
			record: {},
			loading: false,
			pressing: false,
			hint: ''
		}),
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
						gameType: 'zmwl',
						schoolId: uni.getStorageSync('schoolId')
					})
					const data = (entered && entered.data) || {}
					this.recordId = data.recordId || ''
					if (!this.recordId) throw new Error('记录创建失败')
				} catch (e) {
					uni.showToast({ title: userMessage(e, '游戏入口校验失败，请重新扫码'), icon: 'none' })
				}
			},
			async refresh() {
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					this.record = res.data || {}
					const result = this.record.result || null
					if (this.record.status === 'finished' && result) {
						this.hint = '你已选择「' + (result.directionName || '') + '」，可查看专属未来选择卡'
					} else {
						this.hint = ''
					}
				} catch (e) {
					uni.showToast({ title: userMessage(e, '选择信息加载失败，请重新扫码'), icon: 'none' })
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
						uni.redirectTo({ url: `/pages/zmwl/result?${base}` })
						return
					}
					await startRecord(this.recordId)
					uni.redirectTo({ url: `/pages/zmwl/index?${base}` })
				} catch (e) {
					uni.showToast({ title: userMessage(e, '开始探索失败，请稍后重试'), icon: 'none' })
				} finally {
					this.loading = false
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
		width: 100%;
		min-height: 100vh;
		background: #bfe4f6;
		overflow-x: hidden;
	}

	.stage {
		position: relative;
		width: 750rpx;
		height: 1624rpx;
		margin: 0 auto;
		overflow: hidden;
	}

	.stage-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 750rpx;
		height: 1624rpx;
	}

	.logo {
		position: absolute;
		left: 78rpx;
		top: 150rpx;
		width: 594rpx;
	}

	.ribbon {
		position: absolute;
		left: 160rpx;
		top: 300rpx;
		width: 440rpx;
	}

	.intro {
		position: absolute;
		left: 95rpx;
		top: 565rpx;
		width: 560rpx;
	}

	.hint {
		position: absolute;
		left: 75rpx;
		right: 75rpx;
		top: 1360rpx;
		padding: 12rpx 20rpx;
		border-radius: 16rpx;
		background: rgba(255, 255, 255, 0.72);
	}

	.hint-text {
		display: block;
		text-align: center;
		font-size: 22rpx;
		line-height: 1.5;
		color: #2a4a7a;
	}

	.start-btn {
		position: absolute;
		left: 152rpx;
		top: 1462rpx;
		z-index: 20;
		width: 446rpx;
		height: 98rpx;
		transition: transform 0.12s ease;
	}

	.start-btn.pressed {
		transform: scale(0.97);
	}

	.btn-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 446rpx;
		height: 98rpx;
	}

	.btn-text {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 290rpx;
		transform: translate(-50%, -50%);
	}
</style>
