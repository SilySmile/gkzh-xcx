<template>
	<view class="page">
		<JlczHeader title="称重结果" @back="back" />

		<scroll-view class="body" scroll-y>
			<view v-if="!result" class="empty">
				<text class="empty-text">还没有称重结果，请先完成一次称重。</text>
				<button class="ghost-btn" @click="back">返回</button>
			</view>

			<template v-else>
				<view class="verdict" :class="verdictClass">
					<view class="verdict-icon">{{ verdictIcon }}</view>
					<view class="verdict-main">
						<text class="verdict-title">{{ verdictTitle }}</text>
						<text class="verdict-sub">{{ verdictSub }}</text>
					</view>
				</view>

				<view class="scale-card">
					<JlczScale
						:left-weight="Number(setting.leftWeightG) || 80"
						:right="result.totalWeight"
						:pass-weight="result.passWeight"
						:left-text="'标准砝码'"
						:right-text="'我的简历'"
					/>
				</view>

				<view class="meta-row">
					<view class="meta-item">
						<text class="meta-value">{{ result.totalWeight }}g</text>
						<text class="meta-label">简历总重</text>
					</view>
					<view class="meta-divider"></view>
					<view class="meta-item">
						<text class="meta-value">{{ result.selectedCount || 0 }} 项</text>
						<text class="meta-label">勾选砝码</text>
					</view>
					<view class="meta-divider"></view>
					<view class="meta-item">
						<text class="meta-value">{{ durationText }}</text>
						<text class="meta-label">称重用时</text>
					</view>
				</view>

				<view class="card">
					<view class="card-head">
						<text class="card-title">四大类获得情况</text>
						<text class="card-note">第 {{ result.attemptNo || 1 }} 次称重</text>
					</view>
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
					<view class="card-head">
						<text class="card-title">本次勾选的砝码</text>
						<text class="card-note">{{ selected.length }} 项</text>
					</view>
					<view v-if="selected.length" class="pick-grid">
						<view v-for="item in selected" :key="item.weightNo" class="pick">
							<text class="pick-no">{{ item.weightNo }}</text>
							<text class="pick-label">{{ item.label }}</text>
							<text class="pick-gram">{{ item.weightG }}g</text>
						</view>
					</view>
					<text v-else class="card-empty">本次没有勾选任何砝码。</text>
				</view>

				<view v-if="!result.pass && suggestions.length" class="card">
					<view class="card-head">
						<text class="card-title">优先补充建议</text>
						<text class="card-note">按分量排序</text>
					</view>
					<view v-for="item in suggestions" :key="item.weightNo" class="suggest">
						<view class="suggest-badge">{{ item.weightNo }}</view>
						<view class="suggest-main">
							<view class="suggest-head">
								<text class="suggest-label">{{ item.label }}</text>
								<text class="suggest-gram">{{ item.weightG }}g</text>
							</view>
							<text class="suggest-cond">{{ item.conditionText }}</text>
						</view>
					</view>
				</view>

				<view class="note">
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
	import JlczScale from '@/components/JlczScale.vue'
	import { getRecord, restartRecord, userMessage } from '@/api/jlcz'

	export default {
		components: { JlczHeader, JlczScale },
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
			verdictIcon() {
				if (!this.result) return ''
				if (this.result.pass) return '✓'
				return this.result.timedOut ? '!' : '×'
			},
			verdictTitle() {
				if (!this.result) return ''
				if (this.result.pass) return '简历分量达标'
				return this.result.timedOut ? '时间到，本次未通关' : '还差一点，简历可以更重'
			},
			verdictSub() {
				if (!this.result) return ''
				if (this.result.pass) {
					return this.result.balanced
						? `总重 ${this.result.totalWeight}g，刚好达到 ${this.result.passWeight}g 标准`
						: `总重 ${this.result.totalWeight}g，超过 ${this.result.passWeight}g 通关标准`
				}
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
		background: linear-gradient(180deg, #f7f1e6 0%, #efe2ce 100%);
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
		margin-bottom: 36rpx;
		font-size: 25rpx;
		color: #8b7c66;
	}

	.ghost-btn {
		width: 300rpx;
		height: 84rpx;
		line-height: 84rpx;
		border-radius: 42rpx;
		border: 2rpx solid #c9a25e;
		font-size: 27rpx;
		color: #8a6122;
		background: transparent;
	}

	.ghost-btn::after {
		border: none;
	}

	.verdict {
		display: flex;
		align-items: center;
		margin-top: 8rpx;
		padding: 24rpx 24rpx;
		border-radius: 24rpx;
		border: 2rpx solid rgba(217, 196, 160, 0.6);
		background: rgba(255, 253, 247, 0.9);
	}

	.verdict.pass {
		border-color: #b5d4bc;
		background: #eef7f0;
	}

	.verdict.fail,
	.verdict.timeout {
		border-color: #e3b9aa;
		background: #fcf0ea;
	}

	.verdict-icon {
		flex-shrink: 0;
		width: 76rpx;
		height: 76rpx;
		margin-right: 18rpx;
		border-radius: 50%;
		line-height: 76rpx;
		text-align: center;
		font-size: 40rpx;
		font-weight: 700;
		color: #fffdf7;
		background: #b98a3c;
	}

	.verdict.pass .verdict-icon {
		background: #2f7d4f;
	}

	.verdict.fail .verdict-icon,
	.verdict.timeout .verdict-icon {
		background: #b04a32;
	}

	.verdict-main {
		flex: 1;
		min-width: 0;
	}

	.verdict-title {
		display: block;
		font-size: 32rpx;
		font-weight: 700;
		color: #2f2a22;
	}

	.verdict.pass .verdict-title {
		color: #2f7d4f;
	}

	.verdict.fail .verdict-title,
	.verdict.timeout .verdict-title {
		color: #a8462f;
	}

	.verdict-sub {
		display: block;
		margin-top: 6rpx;
		font-size: 21rpx;
		line-height: 1.55;
		color: #7c6a52;
	}

	.scale-card {
		margin-top: 18rpx;
		padding: 6rpx 10rpx 2rpx;
		border-radius: 26rpx;
		border: 2rpx solid rgba(217, 196, 160, 0.65);
		background: rgba(255, 253, 247, 0.86);
		box-shadow: 0 12rpx 28rpx rgba(120, 84, 34, 0.08);
	}

	.meta-row {
		display: flex;
		align-items: center;
		margin-top: 18rpx;
		padding: 18rpx 6rpx;
		border-radius: 20rpx;
		background: rgba(255, 253, 247, 0.8);
		border: 2rpx solid rgba(217, 196, 160, 0.45);
	}

	.meta-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.meta-value {
		font-size: 30rpx;
		font-weight: 700;
		color: #2f2a22;
	}

	.meta-label {
		margin-top: 4rpx;
		font-size: 19rpx;
		color: #9a8a70;
	}

	.meta-divider {
		width: 2rpx;
		height: 44rpx;
		background: rgba(217, 196, 160, 0.6);
	}

	.card {
		margin-top: 18rpx;
		padding: 22rpx 24rpx;
		border-radius: 22rpx;
		border: 2rpx solid rgba(217, 196, 160, 0.5);
		background: rgba(255, 253, 247, 0.9);
	}

	.card-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 6rpx;
	}

	.card-title {
		font-size: 27rpx;
		font-weight: 600;
		color: #2f2a22;
	}

	.card-note {
		font-size: 19rpx;
		color: #9a8a70;
	}

	.card-empty {
		display: block;
		margin-top: 10rpx;
		font-size: 21rpx;
		color: #9a8464;
	}

	.category-row {
		margin-top: 16rpx;
	}

	.category-head {
		display: flex;
		justify-content: space-between;
		font-size: 21rpx;
		color: #6b5a40;
	}

	.category-value {
		font-weight: 600;
		color: #a3742a;
	}

	.bar {
		margin-top: 8rpx;
		height: 10rpx;
		border-radius: 5rpx;
		background: #efe3cc;
		overflow: hidden;
	}

	.bar-inner {
		height: 100%;
		border-radius: 5rpx;
		background: linear-gradient(90deg, #d9b26b, #a3742a);
	}

	.pick-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		margin-top: 10rpx;
	}

	.pick {
		display: flex;
		align-items: center;
		width: 48.5%;
		margin-top: 10rpx;
		padding: 10rpx 12rpx;
		border-radius: 14rpx;
		background: #f7eeda;
		box-sizing: border-box;
	}

	.pick-no {
		flex-shrink: 0;
		width: 34rpx;
		height: 34rpx;
		margin-right: 8rpx;
		border-radius: 50%;
		line-height: 34rpx;
		text-align: center;
		font-size: 18rpx;
		color: #8a6122;
		background: #ecdcbc;
	}

	.pick-label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		font-size: 21rpx;
		color: #4a3a22;
	}

	.pick-gram {
		margin-left: 6rpx;
		font-size: 19rpx;
		color: #a3742a;
	}

	.suggest {
		display: flex;
		align-items: flex-start;
		margin-top: 14rpx;
	}

	.suggest-badge {
		flex-shrink: 0;
		width: 40rpx;
		height: 40rpx;
		margin-right: 12rpx;
		border-radius: 12rpx;
		line-height: 40rpx;
		text-align: center;
		font-size: 20rpx;
		font-weight: 600;
		color: #8a6122;
		background: #f3e5c8;
	}

	.suggest-main {
		flex: 1;
		min-width: 0;
	}

	.suggest-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.suggest-label {
		font-size: 24rpx;
		font-weight: 600;
		color: #2f2a22;
	}

	.suggest-gram {
		font-size: 21rpx;
		font-weight: 600;
		color: #a3742a;
	}

	.suggest-cond {
		display: block;
		margin-top: 4rpx;
		font-size: 19rpx;
		line-height: 1.5;
		color: #8b7c66;
	}

	.note {
		margin: 20rpx 4rpx 0;
		font-size: 19rpx;
		line-height: 1.7;
		color: #9a8a70;
	}

	.scroll-space {
		height: 28rpx;
	}

	.footer {
		flex-shrink: 0;
		display: flex;
		padding: 14rpx 30rpx 18rpx;
		padding-bottom: calc(18rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(18rpx + env(safe-area-inset-bottom));
		background: rgba(247, 241, 230, 0.97);
		border-top: 2rpx solid rgba(217, 196, 160, 0.45);
	}

	.retry-btn,
	.back-btn {
		height: 90rpx;
		line-height: 90rpx;
		border: none;
		border-radius: 45rpx;
		font-size: 29rpx;
		font-weight: 600;
	}

	.retry-btn {
		flex: 1;
		margin-right: 16rpx;
		color: #8a6122;
		background: #f2e3c4;
	}

	.back-btn {
		flex: 1;
		color: #fffdf7;
		background: linear-gradient(135deg, #c99a4a 0%, #a3742a 100%);
		box-shadow: 0 10rpx 20rpx rgba(150, 108, 45, 0.24);
	}

	.retry-btn::after,
	.back-btn::after {
		border: none;
	}
</style>
