<template>
	<view class="page">
		<JlczHeader title="称重结果" @back="back" />

		<scroll-view class="body" scroll-y>
			<view v-if="!result" class="empty">
				<text class="empty-text">还没有称重结果，请先完成一次称重。</text>
				<button class="primary-btn" @click="back">返回</button>
			</view>

			<template v-else>
				<view class="verdict" :class="verdictClass">
					<text class="verdict-title">{{ verdictTitle }}</text>
					<text class="verdict-sub">{{ verdictSub }}</text>
				</view>

				<view class="scale-card">
					<view class="scale-row">
						<view class="scale-side">
							<text class="scale-num">{{ setting.leftWeightG || 80 }}</text>
							<text class="scale-unit">g 标准</text>
						</view>
						<view class="scale-line"></view>
						<view class="scale-side mine" :class="{ pass: result.pass }">
							<text class="scale-num">{{ result.totalWeight }}</text>
							<text class="scale-unit">g 我的简历</text>
						</view>
					</view>
					<view class="gap-line">
						<text v-if="result.pass">已达到 {{ result.passWeight }}g 通关标准<span v-if="result.balanced">（刚好达标）</span></text>
						<text v-else>距 {{ result.passWeight }}g 通关标准还差 {{ result.gap }}g</text>
					</view>
				</view>

				<view class="meta-row">
					<view class="meta-item">
						<text class="meta-value">{{ result.selectedCount || 0 }}</text>
						<text class="meta-label">勾选砝码</text>
					</view>
					<view class="meta-item">
						<text class="meta-value">{{ durationText }}</text>
						<text class="meta-label">称重用时</text>
					</view>
					<view class="meta-item">
						<text class="meta-value">第 {{ result.attemptNo || 1 }} 次</text>
						<text class="meta-label">称重次数</text>
					</view>
				</view>

				<view class="card">
					<view class="card-title">四大类获得情况</view>
					<view v-for="item in categoryRows" :key="item.categoryCode" class="category-row">
						<view class="category-head">
							<text class="category-name">{{ item.categoryName }}</text>
							<text class="category-value">{{ item.totalWeight }} / {{ item.available }}g</text>
						</view>
						<view class="bar">
							<view class="bar-inner" :style="{ width: item.percent + '%' }"></view>
						</view>
					</view>
				</view>

				<view class="card">
					<view class="card-title">本次勾选的砝码（{{ selected.length }} 项）</view>
					<view v-if="selected.length" class="chips">
						<view v-for="item in selected" :key="item.weightNo" class="chip">
							<text class="chip-no">#{{ item.weightNo }}</text>
							<text class="chip-label">{{ item.label }}</text>
							<text class="chip-gram">{{ item.weightG }}g</text>
						</view>
					</view>
					<text v-else class="card-empty">本次没有勾选任何砝码。</text>
				</view>

				<view v-if="!result.pass && suggestions.length" class="card">
					<view class="card-title">优先补充建议</view>
					<view v-for="item in suggestions" :key="item.weightNo" class="suggest-row">
						<text class="suggest-icon">{{ item.icon || '⚖️' }}</text>
						<view class="suggest-body">
							<text class="suggest-label">#{{ item.weightNo }} {{ item.label }}</text>
							<text class="suggest-cond">{{ item.conditionText }}</text>
						</view>
						<text class="suggest-gram">{{ item.weightG }}g</text>
					</view>
				</view>

				<view class="foot-note">
					本结果为简历自查，仅用于活动体验和简历改进参考；如对某项判断不确定，可请现场老师帮助核对。
				</view>
				<view class="scroll-space"></view>
			</template>
		</scroll-view>

		<view v-if="result" class="footer">
			<button v-if="!result.pass && canRetry" class="retry-btn" :disabled="loading" @click="retry">
				{{ loading ? '正在重置…' : '重新称重' }}
			</button>
			<button class="back-btn" @click="back">返回活动</button>
		</view>
	</view>
</template>

<script>
	import JlczHeader from '@/components/JlczHeader.vue'
	import { getRecord, restartRecord, userMessage } from '@/api/jlcz'

	export default {
		components: { JlczHeader },
		data: () => ({
			recordId: '',
			instanceId: '',
			gameId: '',
			record: null,
			loading: false
		}),
		computed: {
			result() {
				return (this.record && this.record.result) || null
			},
			setting() {
				return (this.record && this.record.setting) || { leftWeightG: 80, passWeightG: 80, allowRetry: '1' }
			},
			selected() {
				return (this.record && this.record.selected) || []
			},
			suggestions() {
				return (this.result && this.result.suggestions) || []
			},
			canRetry() {
				return this.setting.allowRetry !== '0'
			},
			verdictClass() {
				if (!this.result) return ''
				if (this.result.pass) return 'pass'
				return this.result.timedOut ? 'timeout' : 'fail'
			},
			verdictTitle() {
				if (!this.result) return ''
				if (this.result.pass) return '恭喜，简历分量达标'
				return this.result.timedOut ? '时间到，本次未通关' : '还差一点，简历可以更重'
			},
			verdictSub() {
				if (!this.result) return ''
				if (this.result.pass) return `总重 ${this.result.totalWeight}g，达到 ${this.result.passWeight}g 通关标准`
				if (this.result.timedOut) return '本次称重超时，结果按未通关计'
				return `总重 ${this.result.totalWeight}g，再补充 ${this.result.gap}g 即可通关`
			},
			durationText() {
				const value = this.result && this.result.durationMs
				if (value == null) return '-'
				return (Number(value) / 1000).toFixed(1) + 's'
			},
			categoryRows() {
				const totals = (this.result && this.result.categoryTotals) || []
				const catalog = (this.record && this.record.weights) || []
				const available = {}
				for (const item of catalog) {
					available[item.categoryCode] = (available[item.categoryCode] || 0) + (Number(item.weightG) || 0)
				}
				return totals.map(item => {
					const max = available[item.categoryCode] || 0
					const value = Number(item.totalWeight) || 0
					return {
						...item,
						available: max,
						percent: max > 0 ? Math.min(100, Math.round((value * 100) / max)) : 0
					}
				})
			}
		},
		onLoad(options) {
			this.recordId = options.recordId || ''
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			this.load()
		},
		methods: {
			async load() {
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					this.record = res.data || {}
					if (this.record.status !== 'finished') {
						uni.redirectTo({
							url: `/pages/jlcz/index?recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
						})
					}
				} catch (e) {
					uni.showToast({ title: userMessage(e, '称重结果加载失败，请重新扫码'), icon: 'none' })
				}
			},
			async retry() {
				if (this.loading) return
				this.loading = true
				try {
					await restartRecord(this.recordId)
					uni.redirectTo({
						url: `/pages/jlcz/index?recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
					})
				} catch (e) {
					uni.showToast({ title: userMessage(e, '重新称重失败，请稍后重试'), icon: 'none' })
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
				const bizType = (this.record && this.record.bizType) || 'career_week'
				uni.reLaunch({ url: `/pages/mp/sub-pages/career-week/index?bizType=${bizType}` })
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

	.body {
		flex: 1;
		height: 0;
		padding: 0 30rpx;
		box-sizing: border-box;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 220rpx;
	}

	.empty-text {
		margin-bottom: 40rpx;
		font-size: 26rpx;
		color: #8a7455;
	}

	.verdict {
		margin-top: 10rpx;
		padding: 26rpx 28rpx;
		border-radius: 22rpx;
		background: #fffaf0;
		border: 2rpx solid #eddfc2;
	}

	.verdict.pass {
		background: #eef8ec;
		border-color: #bfe0b8;
	}

	.verdict.fail,
	.verdict.timeout {
		background: #fdf0ec;
		border-color: #f0c9bd;
	}

	.verdict-title {
		display: block;
		font-size: 34rpx;
		font-weight: 700;
		color: #3f2f18;
	}

	.verdict.pass .verdict-title {
		color: #2e7d32;
	}

	.verdict.fail .verdict-title,
	.verdict.timeout .verdict-title {
		color: #b3452c;
	}

	.verdict-sub {
		display: block;
		margin-top: 8rpx;
		font-size: 24rpx;
		line-height: 1.6;
		color: #7a6444;
	}

	.scale-card {
		margin-top: 20rpx;
		padding: 22rpx 24rpx;
		border-radius: 22rpx;
		background: rgba(255, 255, 255, 0.82);
		box-shadow: 0 8rpx 20rpx rgba(139, 94, 52, 0.1);
	}

	.scale-row {
		display: flex;
		align-items: center;
	}

	.scale-side {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 14rpx 0;
		border-radius: 16rpx;
		background: #f5ebd7;
	}

	.scale-side.mine.pass {
		background: #e6f4e2;
	}

	.scale-num {
		font-size: 56rpx;
		font-weight: 700;
		color: #4a3315;
	}

	.scale-side.mine.pass .scale-num {
		color: #2e7d32;
	}

	.scale-unit {
		font-size: 21rpx;
		color: #8a6b3f;
	}

	.scale-line {
		width: 80rpx;
		height: 6rpx;
		margin: 0 14rpx;
		border-radius: 6rpx;
		background: linear-gradient(90deg, #d9b46a, #8b5e34);
	}

	.gap-line {
		margin-top: 16rpx;
		text-align: center;
		font-size: 23rpx;
		color: #7a5a2c;
	}

	.meta-row {
		display: flex;
		margin-top: 18rpx;
	}

	.meta-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 16rpx 0;
		margin-right: 12rpx;
		border-radius: 18rpx;
		background: rgba(255, 255, 255, 0.72);
	}

	.meta-item:last-child {
		margin-right: 0;
	}

	.meta-value {
		font-size: 30rpx;
		font-weight: 700;
		color: #4a3315;
	}

	.meta-label {
		margin-top: 4rpx;
		font-size: 20rpx;
		color: #8a7455;
	}

	.card {
		margin-top: 20rpx;
		padding: 22rpx 24rpx;
		border-radius: 22rpx;
		background: rgba(255, 255, 255, 0.82);
	}

	.card-title {
		font-size: 27rpx;
		font-weight: 600;
		color: #4a3315;
	}

	.category-row {
		margin-top: 18rpx;
	}

	.category-head {
		display: flex;
		justify-content: space-between;
		font-size: 22rpx;
		color: #6b5533;
	}

	.category-value {
		font-weight: 600;
		color: #a05a2c;
	}

	.bar {
		margin-top: 8rpx;
		height: 12rpx;
		border-radius: 6rpx;
		background: #efe2c8;
		overflow: hidden;
	}

	.bar-inner {
		height: 100%;
		border-radius: 6rpx;
		background: linear-gradient(90deg, #d9b46a, #b8862b);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		margin-top: 14rpx;
	}

	.chip {
		display: flex;
		align-items: center;
		margin: 0 12rpx 12rpx 0;
		padding: 8rpx 16rpx;
		border-radius: 30rpx;
		background: #f6ecd6;
	}

	.chip-no {
		font-size: 19rpx;
		color: #a08a64;
	}

	.chip-label {
		margin: 0 8rpx;
		font-size: 23rpx;
		color: #4a3315;
	}

	.chip-gram {
		font-size: 21rpx;
		color: #a05a2c;
	}

	.card-empty {
		display: block;
		margin-top: 12rpx;
		font-size: 22rpx;
		color: #9a8464;
	}

	.suggest-row {
		display: flex;
		align-items: flex-start;
		margin-top: 16rpx;
	}

	.suggest-icon {
		margin-right: 12rpx;
		font-size: 32rpx;
	}

	.suggest-body {
		flex: 1;
	}

	.suggest-label {
		display: block;
		font-size: 25rpx;
		font-weight: 600;
		color: #4a3315;
	}

	.suggest-cond {
		display: block;
		margin-top: 4rpx;
		font-size: 20rpx;
		line-height: 1.5;
		color: #8a7455;
	}

	.suggest-gram {
		margin-left: 12rpx;
		font-size: 24rpx;
		font-weight: 600;
		color: #a05a2c;
	}

	.foot-note {
		margin-top: 22rpx;
		font-size: 20rpx;
		line-height: 1.7;
		color: #9a8464;
	}

	.scroll-space {
		height: 30rpx;
	}

	.footer {
		flex-shrink: 0;
		display: flex;
		padding: 16rpx 30rpx calc(18rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(18rpx + env(safe-area-inset-bottom));
		background: rgba(253, 246, 232, 0.97);
	}

	.retry-btn,
	.back-btn {
		height: 88rpx;
		line-height: 88rpx;
		border-radius: 44rpx;
		border: none;
		font-size: 30rpx;
		font-weight: 600;
	}

	.retry-btn {
		flex: 1;
		margin-right: 16rpx;
		color: #8a5a12;
		background: #f6e3b8;
	}

	.back-btn {
		flex: 1;
		color: #ffffff;
		background: linear-gradient(180deg, #d9a441 0%, #b8862b 100%);
	}

	.retry-btn::after,
	.back-btn::after {
		border: none;
	}

	.primary-btn {
		width: 320rpx;
		height: 88rpx;
		line-height: 88rpx;
		border-radius: 44rpx;
		border: none;
		font-size: 28rpx;
		color: #ffffff;
		background: linear-gradient(180deg, #d9a441 0%, #b8862b 100%);
	}

	.primary-btn::after {
		border: none;
	}
</style>
