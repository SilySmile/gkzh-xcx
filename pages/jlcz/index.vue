<template>
	<view class="page">
		<JlczHeader title="称重台" @back="back" />

		<view class="top">
			<view class="top-head">
				<view class="top-summary">
					<text class="summary-num" :class="{ pass: totalWeight >= passWeight }">{{ totalWeight }}g</text>
					<text class="summary-cap">已选 {{ selectedNos.length }} 项</text>
				</view>
				<view class="timer" :class="{ urgent: remainingSeconds > 0 && remainingSeconds <= 30 }">
					<text v-if="timeLimit > 0">{{ countdownText }}</text>
					<text v-else>不限时</text>
				</view>
			</view>

			<view class="scale-card">
				<JlczScale
					:left-weight="leftWeight"
					:right="totalWeight"
					:pass-weight="passWeight"
					:left-text="'标准砝码'"
					:right-text="'我的简历'"
				/>
			</view>

			<view class="target-row">
				<text class="target-text">
					{{ totalWeight >= passWeight ? '已达到通关标准' : '距通关还差 ' + (passWeight - totalWeight) + 'g' }}
				</text>
				<text class="target-value">{{ totalWeight }} / {{ passWeight }}g</text>
			</view>
			<view class="progress">
				<view class="progress-inner" :class="{ pass: totalWeight >= passWeight }"
					:style="{ width: progressPercent + '%' }"></view>
			</view>
		</view>

		<view class="tabs">
			<view v-for="group in groups" :key="group.code" class="tab"
				:class="{ active: group.code === activeCategory }" @click="activeCategory = group.code">
				<text class="tab-name">{{ group.short }}</text>
				<text class="tab-count">{{ group.selectedCount }}/{{ group.items.length }}</text>
			</view>
		</view>

		<scroll-view class="list" scroll-y>
			<view class="list-hint">
				<text>对照简历勾选已经具备的项，可随时切换分类。</text>
			</view>
			<view v-for="item in activeGroup.items" :key="item.weightNo" class="weight-row"
				:class="{ on: isSelected(item.weightNo) }" @click="toggle(item.weightNo)">
				<view class="weight-badge">
					<image v-if="item.imageUrl" class="weight-img" :src="resolveImage(item.imageUrl)" mode="aspectFit" />
					<text v-else class="weight-no">{{ item.displayNo }}</text>
				</view>
				<view class="weight-main">
					<view class="weight-head">
						<text class="weight-label">{{ item.label }}</text>
						<text class="weight-gram">{{ item.weightG }}g</text>
					</view>
					<text class="weight-cond">{{ item.conditionText }}</text>
				</view>
				<view class="weight-check">{{ isSelected(item.weightNo) ? '✓' : '+' }}</view>
			</view>
			<view class="list-space"></view>
		</scroll-view>

		<view class="footer">
			<view class="footer-sum">
				<text class="footer-num" :class="{ pass: totalWeight >= passWeight }">{{ totalWeight }}g</text>
				<text class="footer-cap">{{ totalWeight >= passWeight ? '已达标' : '目标 ' + passWeight + 'g' }}</text>
			</view>
			<button class="submit-btn" :disabled="submitting || recordFinished" @click="submit">
				{{ submitting ? '正在称重…' : '完成称重' }}
			</button>
		</view>
	</view>
</template>

<script>
	import JlczHeader from '@/components/JlczHeader.vue'
	import JlczScale from '@/components/JlczScale.vue'
	import { getRecord, startRecord, submitWeights, userMessage } from '@/api/jlcz'
	import config from '@/config/api.js'

	export default {
		components: { JlczHeader, JlczScale },
		data: () => ({
			recordId: '',
			instanceId: '',
			gameId: '',
			record: null,
			weights: [],
			selectedNos: [],
			activeCategory: 'core',
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
				return Number(this.setting.leftWeightG) || 80
			},
			passWeight() {
				return Number(this.setting.passWeightG) || 80
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
			progressPercent() {
				if (!this.passWeight) return 0
				return Math.min(100, Math.round((this.totalWeight * 100) / this.passWeight))
			},
			groups() {
				const order = ['core', 'soft', 'basic', 'bonus']
				return order.map(code => {
					const items = this.weights
						.filter(item => item.categoryCode === code)
						.sort((left, right) => left.weightNo - right.weightNo)
						.map((item, index) => ({ ...item, displayNo: index + 1 }))
					const name = items.length ? items[0].categoryName : code
					return {
						code,
						name,
						short: String(name).split('（')[0],
						items,
						selectedCount: items.filter(item => this.isSelected(item.weightNo)).length
					}
				}).filter(group => group.items.length)
			},
			activeGroup() {
				return this.groups.find(group => group.code === this.activeCategory) || this.groups[0] || { items: [] }
			},
			countdownText() {
				const total = Math.max(0, this.remainingSeconds)
				const minutes = Math.floor(total / 60)
				const seconds = total % 60
				return `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`
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
			resolveImage(url) {
				if (!url) return ''
				if (/^https?:\/\//.test(url)) return url
				return `${config.BASE_URL}${url}`
			},
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
					this.syncActiveCategory()
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
			syncActiveCategory() {
				if (!this.weights.length) return
				const exists = this.weights.some(item => item.categoryCode === this.activeCategory)
				if (!exists) {
					this.activeCategory = this.weights[0].categoryCode
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
			remainingFromStart(value) {
				if (!value) return this.timeLimit
				const start = new Date(value).getTime()
				if (Number.isNaN(start)) return this.timeLimit
				const elapsed = Math.max(0, Date.now() - start)
				return Math.max(0, Math.ceil(this.timeLimit - elapsed / 1000))
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
		background: linear-gradient(180deg, #f7f1e6 0%, #efe2ce 100%);
		overflow: hidden;
	}

	.top {
		flex-shrink: 0;
		padding: 4rpx 30rpx 0;
	}

	.top-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4rpx 4rpx 10rpx;
	}

	.top-summary {
		display: flex;
		align-items: baseline;
	}

	.summary-num {
		font-size: 44rpx;
		font-weight: 700;
		color: #2f2a22;
	}

	.summary-num.pass {
		color: #2f7d4f;
	}

	.summary-cap {
		margin-left: 10rpx;
		font-size: 21rpx;
		color: #9a8a70;
	}

	.timer {
		padding: 8rpx 20rpx;
		border-radius: 24rpx;
		font-size: 23rpx;
		font-weight: 600;
		color: #7c6437;
		background: rgba(255, 253, 247, 0.85);
		border: 2rpx solid rgba(217, 196, 160, 0.7);
	}

	.timer.urgent {
		color: #fffaf2;
		background: #b04a32;
		border-color: #b04a32;
	}

	.scale-card {
		padding: 6rpx 10rpx 2rpx;
		border-radius: 26rpx;
		border: 2rpx solid rgba(217, 196, 160, 0.65);
		background: rgba(255, 253, 247, 0.86);
		box-shadow: 0 12rpx 28rpx rgba(120, 84, 34, 0.08);
	}

	.target-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14rpx 6rpx 8rpx;
	}

	.target-text {
		font-size: 22rpx;
		color: #8b7c66;
	}

	.target-value {
		font-size: 22rpx;
		font-weight: 600;
		color: #a3814f;
	}

	.progress {
		height: 10rpx;
		margin: 0 4rpx 12rpx;
		border-radius: 6rpx;
		background: rgba(217, 196, 160, 0.35);
		overflow: hidden;
	}

	.progress-inner {
		height: 100%;
		border-radius: 6rpx;
		background: linear-gradient(90deg, #d9b26b, #a3742a);
		transition: width 0.3s ease;
	}

	.progress-inner.pass {
		background: linear-gradient(90deg, #8fbf9b, #2f7d4f);
	}

	.tabs {
		flex-shrink: 0;
		display: flex;
		margin: 4rpx 30rpx 10rpx;
		padding: 6rpx;
		border-radius: 18rpx;
		background: rgba(255, 253, 247, 0.72);
		border: 2rpx solid rgba(217, 196, 160, 0.5);
	}

	.tab {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 10rpx 0;
		border-radius: 14rpx;
		transition: background 0.2s ease;
	}

	.tab.active {
		background: #f0dfbe;
	}

	.tab-name {
		font-size: 23rpx;
		font-weight: 600;
		color: #6b5a40;
	}

	.tab.active .tab-name {
		color: #4a3a22;
	}

	.tab-count {
		margin-top: 2rpx;
		font-size: 18rpx;
		color: #a08c6c;
	}

	.list {
		flex: 1;
		height: 0;
		padding: 0 30rpx;
		box-sizing: border-box;
	}

	.list-hint {
		padding: 4rpx 4rpx 12rpx;
		font-size: 20rpx;
		color: #9a8a70;
	}

	.weight-row {
		display: flex;
		align-items: flex-start;
		margin-bottom: 14rpx;
		padding: 18rpx 18rpx;
		border-radius: 20rpx;
		border: 2rpx solid rgba(217, 196, 160, 0.55);
		background: rgba(255, 253, 247, 0.88);
		transition: border-color 0.2s ease, background 0.2s ease;
	}

	.weight-row.on {
		border-color: #b98a3c;
		background: #fff7e6;
	}

	.weight-badge {
		flex-shrink: 0;
		width: 54rpx;
		height: 54rpx;
		margin-right: 16rpx;
		border-radius: 14rpx;
		line-height: 54rpx;
		text-align: center;
		background: #f3e5c8;
		overflow: hidden;
	}

	.weight-row.on .weight-badge {
		background: #e8cf9d;
	}

	.weight-no {
		font-size: 24rpx;
		font-weight: 700;
		color: #8a6122;
	}

	.weight-img {
		width: 54rpx;
		height: 54rpx;
	}

	.weight-main {
		flex: 1;
		min-width: 0;
	}

	.weight-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.weight-label {
		font-size: 26rpx;
		font-weight: 600;
		color: #2f2a22;
	}

	.weight-gram {
		font-size: 22rpx;
		font-weight: 600;
		color: #a3742a;
	}

	.weight-cond {
		display: block;
		margin-top: 5rpx;
		font-size: 20rpx;
		line-height: 1.5;
		color: #8b7c66;
	}

	.weight-check {
		flex-shrink: 0;
		width: 40rpx;
		height: 40rpx;
		margin-left: 12rpx;
		margin-top: 4rpx;
		border-radius: 50%;
		line-height: 38rpx;
		text-align: center;
		font-size: 24rpx;
		color: #fffdf7;
		background: #d8c8ab;
	}

	.weight-row.on .weight-check {
		background: #b98a3c;
	}

	.list-space {
		height: 24rpx;
	}

	.footer {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		padding: 14rpx 30rpx 18rpx;
		padding-bottom: calc(18rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(18rpx + env(safe-area-inset-bottom));
		background: rgba(247, 241, 230, 0.97);
		border-top: 2rpx solid rgba(217, 196, 160, 0.45);
	}

	.footer-sum {
		display: flex;
		flex-direction: column;
		width: 180rpx;
		margin-right: 18rpx;
	}

	.footer-num {
		font-size: 38rpx;
		font-weight: 700;
		color: #2f2a22;
	}

	.footer-num.pass {
		color: #2f7d4f;
	}

	.footer-cap {
		margin-top: 2rpx;
		font-size: 19rpx;
		color: #9a8a70;
	}

	.submit-btn {
		flex: 1;
		height: 92rpx;
		line-height: 92rpx;
		border: none;
		border-radius: 46rpx;
		font-size: 31rpx;
		font-weight: 600;
		letter-spacing: 2rpx;
		color: #fffdf7;
		background: linear-gradient(135deg, #c99a4a 0%, #a3742a 100%);
		box-shadow: 0 10rpx 22rpx rgba(150, 108, 45, 0.26);
	}

	.submit-btn::after {
		border: none;
	}

	.submit-btn[disabled] {
		opacity: 0.7;
	}
</style>
