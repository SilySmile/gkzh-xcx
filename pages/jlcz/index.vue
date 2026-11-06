<template>
	<view class="page">
		<JlczHeader @back="back" />

		<view class="top">
			<view class="timer" :class="{ urgent: remainingSeconds > 0 && remainingSeconds <= 30 }">
				<text v-if="timeLimit > 0">{{ countdownText }}</text>
				<text v-else>不限时</text>
			</view>
			<view class="scale">
				<view class="scale-pillar"></view>
				<view class="scale-beam" :style="{ transform: 'rotate(' + angle + 'deg)' }">
					<view class="pan left" :style="{ transform: 'rotate(' + -angle + 'deg)' }">
						<text class="pan-num">{{ leftWeight }}</text>
						<text class="pan-unit">g 标准</text>
					</view>
					<view class="pan right" :class="{ pass: totalWeight >= passWeight }"
						:style="{ transform: 'rotate(' + -angle + 'deg)' }">
						<text class="pan-num">{{ totalWeight }}</text>
						<text class="pan-unit">g 我的简历</text>
					</view>
				</view>
				<view class="scale-base"></view>
			</view>
			<view class="scale-tip">
				<text v-if="totalWeight >= passWeight" class="pass-text">已达到通关标准</text>
				<text v-else class="gap-text">距通关还差 {{ passWeight - totalWeight }}g</text>
			</view>
		</view>

		<scroll-view class="list" scroll-y>
			<view v-for="group in groups" :key="group.code" class="group">
				<view class="group-head">
					<text class="group-name">{{ group.name }}</text>
					<text class="group-count">已选 {{ group.selectedCount }} / {{ group.items.length }}</text>
				</view>
				<view class="card-grid">
					<view v-for="item in group.items" :key="item.weightNo" class="card"
						:class="{ active: isSelected(item.weightNo) }" @click="toggle(item.weightNo)">
						<view class="card-top">
							<text class="card-icon">{{ item.icon || '⚖️' }}</text>
							<text class="card-no">#{{ item.weightNo }}</text>
						</view>
						<text class="card-label">{{ item.label }}</text>
						<text class="card-cond">{{ item.conditionText }}</text>
						<view class="card-bottom">
							<text class="card-gram">{{ item.weightG }}g</text>
							<view class="card-check">{{ isSelected(item.weightNo) ? '✓' : '+' }}</view>
						</view>
					</view>
				</view>
			</view>
			<view class="list-bottom"></view>
		</scroll-view>

		<view class="footer">
			<view class="sum">
				<text class="sum-label">已选 {{ selectedNos.length }} 项</text>
				<text class="sum-value">{{ totalWeight }}g</text>
			</view>
			<button class="submit-btn" :disabled="submitting || recordFinished" @click="submit">
				{{ submitting ? '正在称重…' : '完成称重' }}
			</button>
		</view>
	</view>
</template>

<script>
	import JlczHeader from '@/components/JlczHeader.vue'
	import { getRecord, startRecord, submitWeights, userMessage } from '@/api/jlcz'

	export default {
		components: { JlczHeader },
		data: () => ({
			recordId: '',
			instanceId: '',
			gameId: '',
			record: null,
			weights: [],
			selectedNos: [],
			setting: { leftWeightG: 80, passWeightG: 80, timeLimitSeconds: 0, allowRetry: '1' },
			submitting: false,
			recordFinished: false,
			timeLimit: 0,
			remainingSeconds: 0,
			timer: null,
			autoSubmitted: false
		}),
		computed: {
			leftWeight() {
				return this.setting.leftWeightG || 80
			},
			passWeight() {
				return this.setting.passWeightG || 80
			},
			totalWeight() {
				let total = 0
				for (const item of this.weights) {
					if (this.selectedNos.indexOf(item.weightNo) > -1) {
						total += Number(item.weightG) || 0
					}
				}
				return total
			},
			angle() {
				const diff = this.totalWeight - this.leftWeight
				return Math.max(-20, Math.min(20, (diff / 125) * 40))
			},
			groups() {
				const order = ['core', 'soft', 'basic', 'bonus']
				return order.map(code => {
					const items = this.weights.filter(item => item.categoryCode === code)
					return {
						code,
						name: items.length ? items[0].categoryName : code,
						items,
						selectedCount: items.filter(item => this.isSelected(item.weightNo)).length
					}
				}).filter(group => group.items.length)
			},
			countdownText() {
				const total = Math.max(0, this.remainingSeconds)
				const minutes = Math.floor(total / 60)
				const seconds = total % 60
				return `剩余 ${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`
			}
		},
		onLoad(options) {
			this.recordId = options.recordId || ''
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			this.load()
		},
		onUnload() {
			this.clearTimer()
		},
		onHide() {
			this.clearTimer()
		},
		onShow() {
			if (this.timeLimit > 0 && !this.recordFinished) {
				this.remainingSeconds = this.remainingFromStart(this.record && this.record.startTime)
				if (this.remainingSeconds <= 0) {
					this.onTimeout()
					return
				}
				if (!this.timer) this.startTimer()
			}
		},
		methods: {
			async load() {
				if (!this.recordId) {
					uni.showToast({ title: '缺少称重记录，请重新扫码', icon: 'none' })
					return
				}
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = res.data || {}
					if (data.status === 'finished') {
						this.gotoResult()
						return
					}
					this.record = data
					this.setting = data.setting || this.setting
					this.weights = (data.weights || []).map(item => ({ ...item }))
					this.selectedNos = this.weights.filter(item => item.selected).map(item => item.weightNo)
					const started = await startRecord(this.recordId)
					const startedData = (started && started.data) || data
					this.record = startedData
					this.timeLimit = Number(this.setting.timeLimitSeconds) || 0
					if (this.timeLimit > 0) {
						this.remainingSeconds = this.remainingFromStart(startedData.startTime)
						if (this.remainingSeconds <= 0) {
							this.remainingSeconds = 0
							this.onTimeout()
							return
						}
						this.startTimer()
					}
				} catch (e) {
					uni.showToast({ title: userMessage(e, '称重信息加载失败，请重新扫码'), icon: 'none' })
				}
			},
			startTimer() {
				this.clearTimer()
				this.timer = setInterval(() => {
					if (this.remainingSeconds > 0) {
						this.remainingSeconds -= 1
					}
					if (this.remainingSeconds <= 0) {
						this.clearTimer()
						this.onTimeout()
					}
				}, 1000)
			},
			/** 按服务端开始时间计算剩余秒数，离开页面后重新进入不会重置限时。 */
			remainingFromStart(value) {
				if (!value) return this.timeLimit
				const start = new Date(value).getTime()
				if (Number.isNaN(start)) return this.timeLimit
				const elapsed = Math.max(0, Date.now() - start)
				return Math.max(0, Math.ceil(this.timeLimit - elapsed / 1000))
			},
			clearTimer() {
				if (this.timer) {
					clearInterval(this.timer)
					this.timer = null
				}
			},
			onTimeout() {
				if (this.autoSubmitted || this.submitting || this.recordFinished) return
				this.autoSubmitted = true
				uni.showToast({ title: '时间到，正在结算当前勾选', icon: 'none' })
				this.submit(true)
			},
			isSelected(weightNo) {
				return this.selectedNos.indexOf(weightNo) > -1
			},
			toggle(weightNo) {
				if (this.submitting || this.recordFinished) return
				const index = this.selectedNos.indexOf(weightNo)
				if (index > -1) {
					this.selectedNos.splice(index, 1)
				} else {
					this.selectedNos.push(weightNo)
				}
			},
			async submit(timeoutMode) {
				if (this.submitting || this.recordFinished) return
				this.submitting = true
				this.clearTimer()
				try {
					const res = await submitWeights(this.recordId, this.selectedNos.slice())
					const data = res.data || {}
					if (timeoutMode && data.result && data.result.timedOut) {
						uni.showToast({ title: '已超时，本次未通关', icon: 'none' })
					}
					this.gotoResult()
				} catch (e) {
					uni.showToast({ title: userMessage(e, '称重提交失败，请稍后重试'), icon: 'none' })
					this.submitting = false
					if (this.timeLimit > 0 && this.remainingSeconds > 0 && !this.timer) {
						this.startTimer()
					}
				}
			},
			gotoResult() {
				this.recordFinished = true
				const url = `/pages/jlcz/result?recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
				uni.redirectTo({ url })
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
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: linear-gradient(180deg, #fdf6e8 0%, #f3e3c3 100%);
		overflow: hidden;
	}

	.top {
		flex-shrink: 0;
		padding: 4rpx 30rpx 14rpx;
	}

	.timer {
		margin: 0 auto;
		width: 240rpx;
		height: 54rpx;
		line-height: 54rpx;
		border-radius: 27rpx;
		text-align: center;
		font-size: 24rpx;
		font-weight: 600;
		color: #6b4a1e;
		background: rgba(255, 255, 255, 0.75);
		box-shadow: 0 6rpx 14rpx rgba(139, 94, 52, 0.12);
	}

	.timer.urgent {
		color: #ffffff;
		background: #c62828;
	}

	.scale {
		position: relative;
		height: 210rpx;
		margin-top: 8rpx;
	}

	.scale-pillar {
		position: absolute;
		left: 50%;
		bottom: 42rpx;
		width: 14rpx;
		height: 110rpx;
		margin-left: -7rpx;
		border-radius: 8rpx;
		background: linear-gradient(180deg, #d9b46a, #a97b2c);
	}

	.scale-beam {
		position: absolute;
		left: 50%;
		top: 48rpx;
		width: 520rpx;
		height: 10rpx;
		margin-left: -260rpx;
		border-radius: 10rpx;
		background: linear-gradient(90deg, #c9a227, #8b5e34, #c9a227);
		transform-origin: 50% 50%;
		transition: transform 0.35s ease;
	}

	.pan {
		position: absolute;
		top: 14rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 190rpx;
		height: 118rpx;
		border-radius: 0 0 24rpx 24rpx;
		background: #fffaf0;
		border: 3rpx solid #d9b46a;
		box-sizing: border-box;
		transition: transform 0.35s ease, background 0.3s ease;
	}

	.pan.left {
		left: -70rpx;
	}

	.pan.right {
		right: -70rpx;
	}

	.pan.right.pass {
		background: #eaf6e8;
		border-color: #4c9a45;
	}

	.pan-num {
		font-size: 44rpx;
		font-weight: 700;
		color: #4a3315;
	}

	.pan-unit {
		margin-top: 2rpx;
		font-size: 20rpx;
		color: #8a6b3f;
	}

	.scale-base {
		position: absolute;
		left: 50%;
		bottom: 26rpx;
		width: 240rpx;
		height: 22rpx;
		margin-left: -120rpx;
		border-radius: 11rpx;
		background: linear-gradient(180deg, #c9a227, #8b5e34);
	}

	.scale-tip {
		text-align: center;
		font-size: 24rpx;
	}

	.pass-text {
		color: #2e7d32;
		font-weight: 600;
	}

	.gap-text {
		color: #a05a2c;
	}

	.list {
		flex: 1;
		height: 0;
		padding: 0 26rpx;
		box-sizing: border-box;
	}

	.group {
		margin-bottom: 22rpx;
	}

	.group-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 10rpx 6rpx;
	}

	.group-name {
		font-size: 28rpx;
		font-weight: 600;
		color: #4a3315;
	}

	.group-count {
		font-size: 21rpx;
		color: #9a7d52;
	}

	.card-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
	}

	.card {
		width: 48.5%;
		margin-bottom: 16rpx;
		padding: 16rpx 18rpx;
		border-radius: 20rpx;
		background: rgba(255, 255, 255, 0.82);
		border: 3rpx solid transparent;
		box-sizing: border-box;
		transition: border-color 0.2s ease, background 0.2s ease;
	}

	.card.active {
		border-color: #c9a227;
		background: #fff6df;
	}

	.card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.card-icon {
		font-size: 34rpx;
	}

	.card-no {
		font-size: 20rpx;
		color: #b0a186;
	}

	.card-label {
		display: block;
		margin-top: 6rpx;
		font-size: 27rpx;
		font-weight: 600;
		color: #3f2f18;
	}

	.card-cond {
		display: -webkit-box;
		margin-top: 6rpx;
		overflow: hidden;
		font-size: 20rpx;
		line-height: 1.5;
		color: #8a7455;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.card-bottom {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 10rpx;
	}

	.card-gram {
		font-size: 24rpx;
		font-weight: 600;
		color: #a05a2c;
	}

	.card-check {
		width: 38rpx;
		height: 38rpx;
		line-height: 36rpx;
		border-radius: 50%;
		text-align: center;
		font-size: 26rpx;
		color: #ffffff;
		background: #cbb790;
	}

	.card.active .card-check {
		background: #c9a227;
	}

	.list-bottom {
		height: 20rpx;
	}

	.footer {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		padding: 16rpx 30rpx calc(18rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(18rpx + env(safe-area-inset-bottom));
		background: rgba(253, 246, 232, 0.97);
	}

	.sum {
		display: flex;
		flex-direction: column;
		margin-right: 22rpx;
	}

	.sum-label {
		font-size: 21rpx;
		color: #8a7455;
	}

	.sum-value {
		font-size: 34rpx;
		font-weight: 700;
		color: #4a3315;
	}

	.submit-btn {
		flex: 1;
		height: 88rpx;
		line-height: 88rpx;
		border-radius: 44rpx;
		border: none;
		font-size: 32rpx;
		font-weight: 600;
		color: #ffffff;
		background: linear-gradient(180deg, #d9a441 0%, #b8862b 100%);
		box-shadow: 0 8rpx 18rpx rgba(184, 134, 43, 0.26);
	}

	.submit-btn::after {
		border: none;
	}

	.submit-btn[disabled] {
		opacity: 0.7;
	}
</style>
