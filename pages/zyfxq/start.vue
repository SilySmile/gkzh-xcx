<template>
	<view class="page">
		<image v-if="assets.bg" class="page-bg" :src="assets.bg" mode="scaleToFill" />
		<view class="page-header">
			<zyfxq-header title="职业飞行棋" @back="back" />
		</view>
		<view class="content">
			<image v-if="assets.logo" class="logo-art" :src="assets.logo" mode="aspectFit" />
			<view v-else class="logo-text-wrap">
				<text class="logo-text">职业飞行棋</text>
				<text class="logo-sub">掷出骰子 · 答对前进 · 三分钟抵达终点</text>
			</view>

			<view class="rule-card">
				<view class="rule-title-wrap">
					<text class="rule-title">游戏规则</text>
				</view>
				<view class="rule-body">
					<text class="rule-line">① 点击开始游戏，进入 19 格职业飞行棋棋盘。</text>
					<text class="rule-line">② 点击棋盘中间的骰子，摇出 1-6 点，棋子按点数前进。</text>
					<text class="rule-line">③ 停在答题格会弹出职业问答或情景任务卡，每题限时 20 秒。</text>
					<text class="rule-line">④ 答对继续摇骰子；答错或超时后退 2 格，然后继续摇骰。</text>
					<text class="rule-line">⑤ 3 分钟内抵达第 19 格即为通关，时间用完则本局未通关。</text>
				</view>
			</view>

			<view class="status-tip" v-if="statusText">
				<text class="status-text">{{ statusText }}</text>
			</view>

			<view
				class="start-btn"
				:class="{ pressed: pressed, disabled: loading }"
				@touchstart="pressed = true"
				@touchend="pressed = false"
				@touchcancel="pressed = false"
				@click="start"
			>
				<text class="start-text">{{ loading ? '正在进入…' : startLabel }}</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { enterRecord, getRecord, startRecord, userMessage } from '@/api/zyfxq'
	import ZyfxqHeader from '@/components/ZyfxqHeader.vue'
	import { ZYFXQ_ASSETS } from '@/config/zyfxq-assets'

	export default {
		components: { ZyfxqHeader },
		data: () => ({
			assets: ZYFXQ_ASSETS,
			instanceId: '',
			gameId: '',
			recordId: '',
			record: null,
			loading: false,
			pressed: false,
			statusText: ''
		}),
		computed: {
			/** 已结束的记录按钮改为“查看结果”，避免学生误以为需要重玩。 */
			startLabel() {
				const status = this.record && this.record.status
				return status === 'finished' ? '查看本局结果' : '开始游戏'
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
					if (this.record.status === 'playing' && this.record.currentQuestion) {
						this.statusText = '你有一道题尚未作答，点击按钮继续。'
					} else if (this.record.status === 'finished') {
						this.statusText = this.record.result === 'win' ? '本局已通关，可查看结果。' : '本局未通关，可在结果页重新开始。'
					} else if (this.record.status === 'playing') {
						this.statusText = '本局正在进行中，点击按钮继续对局。'
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
		background: #0b62c4;
		background-image: radial-gradient(circle at 50% 28%, #6fd2ff 0%, #2a8fe0 34%, #0f63c6 68%, #06417f 100%);
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

	.page-header {
		position: relative;
		z-index: 3;
	}

	.content {
		position: relative;
		z-index: 2;
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 24rpx 40rpx 40rpx;
		box-sizing: border-box;
	}

	.logo-text-wrap {
		/* 作为内容区第一个元素吸收上方剩余空间，与底部按钮的 auto 一起让整页内容垂直居中 */
		margin-top: auto;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.logo-text {
		font-size: 76rpx;
		font-weight: 800;
		letter-spacing: 8rpx;
		color: #fff6c9;
		text-shadow: 0 8rpx 0 #f0a21c, 0 12rpx 20rpx rgba(0, 40, 90, 0.5);
	}

	.logo-sub {
		margin-top: 18rpx;
		font-size: 24rpx;
		letter-spacing: 2rpx;
		color: #dff0ff;
	}

	.logo-art {
		margin-top: auto;
		width: 620rpx;
		height: 260rpx;
	}

	.rule-card {
		margin-top: 34rpx;
		width: 100%;
		border-radius: 28rpx;
		padding: 8rpx;
		box-sizing: border-box;
		background: rgba(255, 255, 255, 0.16);
		border: 2rpx solid rgba(255, 255, 255, 0.35);
	}

	.rule-title-wrap {
		display: flex;
		justify-content: center;
	}

	.rule-title {
		padding: 8rpx 40rpx;
		border-radius: 30rpx;
		font-size: 30rpx;
		font-weight: 700;
		color: #fff7d6;
		background: rgba(255, 168, 26, 0.9);
		box-shadow: 0 6rpx 12rpx rgba(6, 40, 80, 0.3);
	}

	.rule-body {
		margin-top: 22rpx;
		padding: 26rpx 28rpx;
		border-radius: 24rpx;
		background: rgba(6, 46, 96, 0.42);
	}

	.rule-line {
		display: block;
		font-size: 25rpx;
		line-height: 1.85;
		color: #eaf6ff;
		text-align: justify;
	}

	.status-tip {
		margin-top: 24rpx;
		width: 100%;
	}

	.status-text {
		display: block;
		font-size: 24rpx;
		line-height: 1.6;
		color: #ffe9a8;
		text-align: center;
	}

	.start-btn {
		margin-top: 36rpx;
		/* 吸收下方剩余空间，与顶部 auto 平分后内容整体居中；空间不足时自动为 0，不裁切内容 */
		margin-bottom: auto;
		width: 460rpx;
		height: 96rpx;
		border-radius: 48rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(180deg, #ffd76a 0%, #ff9f1a 55%, #f2800a 100%);
		box-shadow: 0 10rpx 0 #c96a06, 0 16rpx 24rpx rgba(0, 30, 70, 0.35);
	}

	.start-btn.pressed {
		transform: translateY(4rpx);
		box-shadow: 0 6rpx 0 #c96a06, 0 10rpx 16rpx rgba(0, 30, 70, 0.3);
	}

	.start-btn.disabled {
		opacity: 0.75;
	}

	.start-text {
		font-size: 36rpx;
		font-weight: 700;
		letter-spacing: 4rpx;
		color: #6b3500;
	}
</style>
