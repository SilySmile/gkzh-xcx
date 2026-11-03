<template>
	<view class="page">
		<view class="page-header">
			<zyfxq-header title="本局结果" @back="backToActivity" />
		</view>

		<view class="tabs">
			<view :class="tabClass(0)" @click="switchTab(0)">
				<text class="tab-text">第一页 · 本局数据</text>
			</view>
			<view :class="tabClass(1)" @click="switchTab(1)">
				<text class="tab-text">第二页 · 答题明细</text>
			</view>
		</view>

		<scroll-view scroll-y class="scroll">
			<view class="inner">
				<view :class="bannerClass">
					<text class="banner-title">{{ resultTitle }}</text>
					<text class="banner-sub">{{ resultSub }}</text>
				</view>

				<template v-if="activeTab === 0">
					<view class="metric-grid">
						<view class="metric-card">
							<text class="metric-label">本局总时长</text>
							<text class="metric-value">{{ durationText }}</text>
						</view>
						<view class="metric-card">
							<text class="metric-label">掷骰总次数</text>
							<text class="metric-value">{{ record.rollCount || 0 }}<text class="metric-unit">次</text></text>
						</view>
						<view class="metric-card">
							<text class="metric-label">累计行进总步数</text>
							<text class="metric-value">{{ record.stepTotal || 0 }}<text class="metric-unit">步</text></text>
						</view>
						<view class="metric-card">
							<text class="metric-label">抵达格号</text>
							<text class="metric-value">{{ record.position || 0 }}<text class="metric-unit">/ 19</text></text>
						</view>
					</view>

					<view class="info-card">
						<view class="info-row">
							<text class="info-label">作答题数</text>
							<text class="info-value">{{ record.answerCount || 0 }} 题</text>
						</view>
						<view class="info-row">
							<text class="info-label">答对题数</text>
							<text class="info-value">{{ record.correctCount || 0 }} 题</text>
						</view>
						<view class="info-row">
							<text class="info-label">超时题数</text>
							<text class="info-value">{{ record.timeoutCount || 0 }} 题</text>
						</view>
						<view class="info-row">
							<text class="info-label">第几局</text>
							<text class="info-value">第 {{ record.attemptNo || 1 }} 局</text>
						</view>
						<view class="info-row">
							<text class="info-label">本局开始</text>
							<text class="info-value">{{ formatTime(record.startTime) }}</text>
						</view>
						<view class="info-row last">
							<text class="info-label">本局结束</text>
							<text class="info-value">{{ formatTime(record.endTime) }}</text>
						</view>
					</view>

					<view class="tip-card">
						<text class="tip-text">答对题目原地继续摇骰，答错或超时后退 2 格；3 分钟内抵达第 19 格即通关。</text>
					</view>
				</template>

				<template v-else>
					<view v-if="!answers.length" class="empty-card">
						<text class="empty-text">本局还没有触发过题目，下次落点停在答题格就会弹出题目。</text>
					</view>
					<view v-for="item in answers" :key="item.serialNo" class="answer-card">
						<view class="answer-head">
							<text class="answer-cell">第 {{ item.cellNo }} 格</text>
							<text class="answer-type">{{ item.questionTypeName }}</text>
							<text :class="answerResultClass(item)">{{ item.result }}</text>
						</view>
						<text class="answer-title">{{ item.title }}</text>
						<view class="answer-meta">
							<text class="meta-item">题目限时 {{ item.limitSeconds }} 秒</text>
							<text class="meta-item">实际答题 {{ costText(item.costMs) }}</text>
							<text :class="item.timeout ? 'meta-item warn' : 'meta-item'">是否超时：{{ item.timeout ? '是' : '否' }}</text>
						</view>
						<view class="answer-line">
							<text class="line-label">我的选择</text>
							<text class="line-value">{{ item.optionContent ? item.optionLabel + '. ' + item.optionContent : '超时未作答' }}</text>
						</view>
						<view class="answer-line">
							<text class="line-label">正确答案</text>
							<text class="line-value correct">{{ item.correctLabel }}. {{ item.correctContent }}</text>
						</view>
					</view>
				</template>

				<view class="actions">
					<view v-if="canRestart" class="action ghost" @click="restart">
						<text class="action-text">{{ retrying ? '正在重开…' : '重新开始一局' }}</text>
					</view>
					<view class="action primary" @click="backToActivity">
						<text class="action-text light">返回活动</text>
					</view>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
	import { getRecord, restartRecord, userMessage } from '@/api/zyfxq'
	import { getWeekFlow } from '@/api/activity/week'
	import ZyfxqHeader from '@/components/ZyfxqHeader.vue'

	export default {
		components: { ZyfxqHeader },
		data: () => ({
			instanceId: '',
			gameId: '',
			recordId: '',
			record: {},
			answers: [],
			activeTab: 0,
			loading: false,
			retrying: false,
			backing: false
		}),
		computed: {
			canRestart() {
				return this.record.status === 'finished' && this.record.result !== 'win'
			},
			bannerClass() {
				return this.record.result === 'win' ? 'banner win' : 'banner lose'
			},
			resultTitle() {
				if (this.record.result === 'win') return '抵达终点，通关成功'
				if (this.record.result === 'lose') return '时间到，本局未通关'
				return '本局进行中'
			},
			resultSub() {
				if (this.record.result === 'win') {
					return `你在 ${this.durationText} 内抵达终点，本局成绩已计入活动统计。`
				}
				if (this.record.result === 'lose') {
					return '3 分钟内没有抵达终点，可以重新开始一局，成绩以最新一局为准。'
				}
				return '返回棋盘继续对局。'
			},
			durationText() {
				const ms = this.record.durationMs
				if (ms == null) return '-'
				const seconds = Math.round(ms / 100) / 10
				return seconds + ' 秒'
			}
		},
		async onLoad(options) {
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			this.recordId = options.recordId || ''
			await this.load()
		},
		methods: {
			query() {
				return `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
			},
			async load() {
				if (!this.recordId) {
					uni.showToast({ title: '缺少对局记录，请重新扫码进入', icon: 'none' })
					return
				}
				this.loading = true
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = res.data || {}
					if (data.status !== 'finished') {
						// 记录还在进行中时回到棋盘，避免停留在半截结果页。
						uni.redirectTo({ url: `/pages/zyfxq/index?${this.query()}` })
						return
					}
					this.record = data
					this.answers = data.answers || []
				} catch (e) {
					uni.showToast({ title: userMessage(e, '结果加载失败，请稍后重试'), icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			async restart() {
				if (this.retrying) return
				this.retrying = true
				try {
					await restartRecord(this.recordId)
					uni.redirectTo({ url: `/pages/zyfxq/index?${this.query()}` })
				} catch (e) {
					uni.showToast({ title: userMessage(e, '重新开始失败，请稍后重试'), icon: 'none' })
				} finally {
					this.retrying = false
				}
			},
			switchTab(index) {
				this.activeTab = index
			},
			tabClass(index) {
				return this.activeTab === index ? 'tab active' : 'tab'
			},
			answerResultClass(item) {
				if (item.correct) return 'answer-result ok'
				return item.timeout ? 'answer-result warn' : 'answer-result bad'
			},
			costText(costMs) {
				if (costMs == null) return '-'
				return (Math.round(costMs / 100) / 10).toFixed(1) + ' 秒'
			},
			formatTime(value) {
				if (!value) return '-'
				const date = new Date(value)
				if (Number.isNaN(date.getTime())) return String(value)
				const pad = n => (n < 10 ? '0' + n : '' + n)
				return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
			},
			/** 返回到当前活动所属的“生涯活动”或“就业活动”页面。 */
			async backToActivity() {
				if (this.backing) return
				this.backing = true
				let bizType = this.record && this.record.bizType ? this.record.bizType : ''
				if (!bizType && this.instanceId) {
					try {
						const res = await getWeekFlow(this.instanceId)
						const instance = res && res.data && res.data.instance
						if (instance && instance.bizType) bizType = instance.bizType
					} catch (e) {
						// 读取失败时按生涯活动处理，保证仍能回到活动页。
					}
				}
				const target = bizType === 'job_week' ? 'job_week' : 'career_week'
				uni.reLaunch({ url: `/pages/mp/sub-pages/career-week/index?bizType=${target}` })
			}
		}
	}
</script>

<style scoped>
	.page {
		height: 100vh;
		display: flex;
		flex-direction: column;
		background: #0b62c4;
		background-image: radial-gradient(circle at 50% 10%, #67cdff 0%, #2b8fe0 30%, #0f63c6 64%, #063f7c 100%);
	}

	.page-header {
		position: relative;
		z-index: 3;
	}

	.tabs {
		position: relative;
		z-index: 2;
		display: flex;
		margin: 6rpx 30rpx 16rpx;
		padding: 6rpx;
		border-radius: 22rpx;
		background: rgba(4, 40, 84, 0.4);
	}

	.tab {
		flex: 1;
		height: 68rpx;
		border-radius: 18rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.tab.active {
		background: rgba(255, 255, 255, 0.92);
	}

	.tab-text {
		font-size: 24rpx;
		color: #d9ecff;
	}

	.tab.active .tab-text {
		color: #0f63c6;
		font-weight: 600;
	}

	.scroll {
		flex: 1;
		height: 0;
		min-height: 0;
	}

	.inner {
		padding: 0 30rpx 260rpx;
		box-sizing: border-box;
	}

	.banner {
		padding: 28rpx 26rpx;
		border-radius: 24rpx;
		margin-bottom: 20rpx;
	}

	.banner.win {
		background: linear-gradient(135deg, rgba(255, 214, 102, 0.95), rgba(255, 168, 26, 0.92));
	}

	.banner.lose {
		background: linear-gradient(135deg, rgba(90, 130, 170, 0.9), rgba(52, 86, 124, 0.9));
	}

	.banner-title {
		display: block;
		font-size: 36rpx;
		font-weight: 700;
		color: #4a2a00;
	}

	.banner.lose .banner-title {
		color: #ffffff;
	}

	.banner-sub {
		display: block;
		margin-top: 10rpx;
		font-size: 24rpx;
		line-height: 1.6;
		color: #6b4000;
	}

	.banner.lose .banner-sub {
		color: #e6f0fa;
	}

	.metric-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
	}

	.metric-card {
		width: 48.5%;
		margin-bottom: 18rpx;
		padding: 24rpx 22rpx;
		box-sizing: border-box;
		border-radius: 22rpx;
		background: rgba(255, 255, 255, 0.94);
	}

	.metric-label {
		display: block;
		font-size: 22rpx;
		color: #7a8fa6;
	}

	.metric-value {
		display: block;
		margin-top: 8rpx;
		font-size: 40rpx;
		font-weight: 700;
		color: #17324f;
	}

	.metric-unit {
		margin-left: 6rpx;
		font-size: 22rpx;
		font-weight: 400;
		color: #7a8fa6;
	}

	.info-card {
		padding: 8rpx 22rpx;
		border-radius: 22rpx;
		background: rgba(255, 255, 255, 0.94);
	}

	.info-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 18rpx 0;
		border-bottom: 2rpx solid #eef3f8;
	}

	.info-row.last {
		border-bottom: none;
	}

	.info-label {
		font-size: 24rpx;
		color: #7a8fa6;
	}

	.info-value {
		font-size: 24rpx;
		color: #17324f;
	}

	.tip-card {
		margin-top: 18rpx;
		padding: 20rpx 22rpx;
		border-radius: 20rpx;
		background: rgba(4, 40, 84, 0.35);
	}

	.tip-text {
		font-size: 22rpx;
		line-height: 1.6;
		color: #d9ecff;
		text-align: justify;
	}

	.empty-card {
		padding: 40rpx 24rpx;
		border-radius: 22rpx;
		background: rgba(255, 255, 255, 0.94);
	}

	.empty-text {
		font-size: 24rpx;
		line-height: 1.7;
		color: #7a8fa6;
		text-align: center;
	}

	.answer-card {
		margin-bottom: 18rpx;
		padding: 22rpx;
		border-radius: 22rpx;
		background: rgba(255, 255, 255, 0.94);
	}

	.answer-head {
		display: flex;
		align-items: center;
	}

	.answer-cell {
		font-size: 21rpx;
		color: #7a8fa6;
	}

	.answer-type {
		margin-left: 12rpx;
		padding: 2rpx 14rpx;
		border-radius: 14rpx;
		font-size: 20rpx;
		color: #ffffff;
		background: #2b8fe0;
	}

	.answer-result {
		margin-left: auto;
		font-size: 22rpx;
		font-weight: 600;
	}

	.answer-result.ok {
		color: #2f9e5f;
	}

	.answer-result.bad {
		color: #e8402c;
	}

	.answer-result.warn {
		color: #d98700;
	}

	.answer-title {
		display: block;
		margin-top: 12rpx;
		font-size: 26rpx;
		line-height: 1.6;
		font-weight: 600;
		color: #17324f;
		text-align: justify;
	}

	.answer-meta {
		display: flex;
		flex-wrap: wrap;
		margin-top: 12rpx;
	}

	.meta-item {
		margin-right: 20rpx;
		font-size: 21rpx;
		color: #7a8fa6;
	}

	.meta-item.warn {
		color: #e8402c;
	}

	.answer-line {
		display: flex;
		margin-top: 10rpx;
	}

	.line-label {
		width: 130rpx;
		font-size: 21rpx;
		color: #9bb0c6;
		flex-shrink: 0;
	}

	.line-value {
		flex: 1;
		font-size: 23rpx;
		line-height: 1.5;
		color: #3f5b76;
	}

	.line-value.correct {
		color: #2f8f5b;
	}

	.actions {
		margin-top: 26rpx;
	}

	.action {
		height: 88rpx;
		border-radius: 44rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 20rpx;
	}

	.action.ghost {
		background: rgba(255, 255, 255, 0.2);
		border: 2rpx solid rgba(255, 255, 255, 0.6);
	}

	.action.primary {
		background: linear-gradient(180deg, #ffd76a 0%, #ff9f1a 55%, #f2800a 100%);
		box-shadow: 0 8rpx 0 #c96a06;
	}

	.action-text {
		font-size: 30rpx;
		font-weight: 600;
		color: #ffffff;
	}

	.action-text.light {
		color: #6b3500;
	}
</style>
