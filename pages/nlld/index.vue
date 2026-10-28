<template>
	<view class="page">
		<image class="page-bg" :src="assets.roundBg" mode="scaleToFill" />
		<view class="page-header"><nlld-header theme="dark" @back="back" /></view>

		<image class="round-title" :src="assets.roundTitle" mode="widthFix" />

		<view v-if="currentRound" class="ribbon">
			<image class="ribbon-bg" :src="assets.ribbon" mode="scaleToFill" />
			<text class="ribbon-text">{{ currentRound.title }}</text>
		</view>

		<view v-if="currentRound" class="panel">
			<image class="panel-bg" :src="assets.panel" mode="scaleToFill" />
			<scroll-view scroll-y class="panel-scroll" :scroll-top="scrollTop">
				<text class="panel-label">任务情景</text>
				<text class="scene">{{ currentRound.scene }}</text>
				<text class="panel-label">可选物品</text>
				<view v-for="opt in currentRound.options" :key="opt.optionId" :class="optionClass(opt.optionId)" @click="toggle(opt.optionId)">
					<image class="option-bg" :src="assets.option" mode="scaleToFill" />
					<text class="option-text">{{ opt.label }}、{{ opt.name }}</text>
					<text v-if="isSelected(opt.optionId)" class="option-check">✓</text>
				</view>
			</scroll-view>
		</view>

		<view class="footer">
			<text class="progress">{{ currentRound ? '第 ' + currentRound.roundNo + '/6 关　已选择 ' + selected.length + '/2' : '正在加载关卡…' }}</text>
			<view class="confirm" :class="{ disabled: !canConfirm, pressed: buttonPressed }"
				@touchstart="buttonPressed = true" @touchend="buttonPressed = false"
				@touchcancel="buttonPressed = false" @click="confirm">
				<image class="btn-bg" :src="assets.btnBlue" mode="scaleToFill" />
				<text class="btn-text">{{ submitting ? '提交中…' : '确认选择' }}</text>
			</view>
		</view>

		<view v-if="!currentRound && !loading" class="blocked">
			<text class="blocked-text">关卡配置缺失，请退出后重新扫码进入。</text>
		</view>
	</view>
</template>

<script>
	import { answerRound, getRecord, userMessage } from '@/api/nlld'
	import NlldHeader from '@/components/NlldHeader.vue'
	import { NLLD_ASSETS } from '@/config/nlld-assets'

	export default {
		components: { NlldHeader },
		data: () => ({
			assets: NLLD_ASSETS,
			recordId: '',
			instanceId: '',
			gameId: '',
			record: {},
			rounds: [],
			currentRound: null,
			selected: [],
			loading: true,
			submitting: false,
			buttonPressed: false,
			scrollTop: 0
		}),
		computed: {
			canConfirm() {
				return !this.submitting && this.currentRound && this.selected.length === 2
			}
		},
		async onLoad(options) {
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			this.recordId = options.recordId || ''
			if (!this.recordId) {
				uni.showToast({ title: '缺少游戏记录，请重新扫码', icon: 'none' })
				this.loading = false
				return
			}
			await this.loadRecord()
		},
		methods: {
			async loadRecord() {
				this.loading = true
				try {
					const res = await getRecord(this.recordId, {
						instanceId: this.instanceId || undefined,
						gameId: this.gameId || undefined
					})
					this.applyRecord(res.data || {})
				} catch (e) {
					uni.showToast({ title: userMessage(e, '测评进度加载失败，请稍后重试'), icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			applyRecord(data) {
				if (data.status === 'finished') {
					this.goReport()
					return
				}
				this.record = data
				this.rounds = data.rounds || []
				const answered = Number(data.answeredRounds || 0)
				this.currentRound = this.rounds.find(item => Number(item.roundNo) === answered + 1) || null
				this.selected = []
				this.scrollTop = 0
			},
			goReport() {
				const base = `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
				uni.redirectTo({ url: `/pages/nlld/report?${base}` })
			},
			isSelected(optionId) {
				return this.selected.indexOf(optionId) > -1
			},
			optionClass(optionId) {
				// 小程序不会把对象归一化成 class，必须返回空格分隔的字符串。
				return this.isSelected(optionId) ? 'option selected' : 'option'
			},
			toggle(optionId) {
				if (this.submitting || !this.currentRound) return
				const index = this.selected.indexOf(optionId)
				if (index > -1) {
					this.selected.splice(index, 1)
					return
				}
				if (this.selected.length >= 2) {
					uni.showToast({ title: '每关只能选择 2 件物品', icon: 'none' })
					return
				}
				this.selected.push(optionId)
			},
			async confirm() {
				if (this.submitting) return
				if (!this.currentRound) {
					uni.showToast({ title: '关卡尚未加载完成，请稍后重试', icon: 'none' })
					return
				}
				if (this.selected.length !== 2) {
					uni.showToast({ title: '每关必须选择 2 件物品', icon: 'none' })
					return
				}
				this.submitting = true
				this.buttonPressed = false
				try {
					const res = await answerRound(this.recordId, this.currentRound.roundNo, this.selected.slice(0, 2))
					const data = res.data || {}
					if (data.status === 'finished') {
						this.goReport()
						return
					}
					this.applyRecord(data)
					uni.pageScrollTo({ scrollTop: 0, duration: 0 })
				} catch (e) {
					uni.showToast({ title: userMessage(e, '关卡提交失败，请稍后重试'), icon: 'none' })
				} finally {
					this.submitting = false
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
		width: 100%;
		height: 100vh;
		min-height: 1334rpx;
		overflow: hidden;
		background: #dff1fb;
	}

	.page-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
	}

	.page-header {
		position: absolute;
		z-index: 3;
		left: 0;
		top: 0;
		width: 100%;
	}

	.round-title {
		position: absolute;
		z-index: 1;
		left: 19%;
		top: 3.6%;
		width: 62%;
	}

	.ribbon {
		position: absolute;
		z-index: 1;
		left: 18%;
		top: 16.8%;
		width: 64%;
		height: 5.2%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.ribbon-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
	}

	.ribbon-text {
		position: relative;
		z-index: 1;
		color: #ffffff;
		font-size: 30rpx;
		font-weight: 600;
		letter-spacing: 1rpx;
		text-shadow: 0 2rpx 4rpx rgba(10, 40, 80, 0.4);
	}

	.panel {
		position: absolute;
		z-index: 1;
		left: 6%;
		top: 23.8%;
		width: 88%;
		height: 54%;
	}

	.panel-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
	}

	.panel-scroll {
		position: absolute;
		left: 7%;
		top: 5%;
		width: 86%;
		height: 90%;
		box-sizing: border-box;
	}

	.panel-label {
		display: block;
		margin: 6rpx 0 10rpx;
		color: #1e4e79;
		font-size: 30rpx;
		font-weight: 600;
	}

	.scene {
		display: block;
		margin-bottom: 16rpx;
		color: #33475c;
		font-size: 24rpx;
		line-height: 1.8;
		text-align: justify;
	}

	.option {
		position: relative;
		width: 100%;
		height: 86rpx;
		margin-bottom: 14rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 56rpx;
		box-sizing: border-box;
		border-radius: 16rpx;
	}

	.option-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
	}

	.option-text {
		position: relative;
		z-index: 1;
		color: #1f3d5c;
		font-size: 28rpx;
		text-align: center;
		line-height: 1.3;
	}

	.option.selected {
		border: 3rpx solid #f2b64a;
		box-shadow: 0 0 16rpx rgba(242, 182, 74, 0.55);
	}

	.option.selected .option-text {
		color: #8a5a12;
		font-weight: 600;
	}

	.option-check {
		position: absolute;
		z-index: 2;
		right: 18rpx;
		top: 50%;
		transform: translateY(-50%);
		width: 36rpx;
		height: 36rpx;
		line-height: 36rpx;
		text-align: center;
		border-radius: 50%;
		background: #f2b64a;
		color: #ffffff;
		font-size: 24rpx;
	}

	.footer {
		position: absolute;
		z-index: 2;
		left: 0;
		top: 78.4%;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.progress {
		color: #2a4a6a;
		font-size: 26rpx;
		font-weight: 600;
		margin-bottom: 18rpx;
	}

	.confirm {
		position: relative;
		width: 44%;
		height: 94rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
	}

	.btn-text {
		position: relative;
		z-index: 1;
		color: #ffffff;
		font-size: 32rpx;
		letter-spacing: 2rpx;
		text-shadow: 0 2rpx 4rpx rgba(20, 60, 110, 0.45);
	}

	.confirm.disabled {
		opacity: 0.6;
	}

	.confirm.pressed {
		transform: scale(0.98);
	}

	.blocked {
		position: absolute;
		z-index: 4;
		left: 10%;
		top: 45%;
		width: 80%;
		padding: 40rpx;
		border-radius: 20rpx;
		background: rgba(255, 255, 255, 0.92);
		text-align: center;
	}

	.blocked-text {
		color: #8a4b12;
		font-size: 28rpx;
		line-height: 1.8;
	}
</style>
