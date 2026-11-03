<template>
	<view class="page">
		<image class="page-bg" :src="assets.bgResultSky" mode="aspectFill" />
		<view class="topbar" :style="{ paddingTop: statusBarHeight + 'px' }">
			<view class="back" @click="backToActivity">‹</view>
		</view>

		<scroll-view scroll-y class="scroll">
			<view class="inner">
				<!-- 「游戏结束」头图随内容一起滚动，滚上去后露出天空背景 -->
				<image class="head"
					:src="record.result === 'lose' ? assets.headLose : assets.headWin" mode="widthFix" />
				<text class="result-sub">{{ resultSub }}</text>

				<!-- 本局数据 -->
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

				<!-- 答题明细：原第二页内容，已合并到同一页展示 -->
				<view class="section-head">
					<text class="section-head-title">答题明细</text>
					<text class="section-head-sub">{{ answers.length }} 题</text>
				</view>
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

			</view>
		</scroll-view>

		<!-- 底部操作栏固定在页面底部，内容在其上方滚动 -->
		<view class="actions">
			<view v-if="canRestart" class="action ghost" @click="restart">
				<text class="action-text">{{ retrying ? '正在重开…' : '重新开始一局' }}</text>
			</view>
			<view class="action primary" @click="backToActivity">
				<text class="action-text light">返回活动</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { getRecord, restartRecord, userMessage } from '@/api/zyfxq'
	import { getWeekFlow } from '@/api/activity/week'
	import { ZYFXQ_ASSETS } from '@/config/zyfxq-assets'

	export default {
		data: () => ({
			assets: ZYFXQ_ASSETS,
			instanceId: '',
			gameId: '',
			recordId: '',
			record: {},
			answers: [],
			loading: false,
			retrying: false,
			backing: false,
			statusBarHeight: 30
		}),
		computed: {
			canRestart() {
				return this.record.status === 'finished' && this.record.result !== 'win'
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
		position: relative;
		height: 100vh;
		display: flex;
		flex-direction: column;
		background: #4ab3ee;
		background-image: linear-gradient(180deg, #8bdcff 0%, #4cb4ef 45%, #59bdf3 100%);
	}

	/* 结果页背景图（浅蓝天空 + 云朵），铺满整页 */
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
		padding-bottom: 4rpx;
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

	.scroll {
		position: relative;
		z-index: 1;
		flex: 1;
		height: 0;
		min-height: 0;
	}

	.inner {
		padding: 0 30rpx 40rpx;
		box-sizing: border-box;
	}

	/* 头图铺满整宽（抵消 .inner 的左右内边距），高度按图片比例自适应 */
	.head {
		display: block;
		width: 750rpx;
		margin-left: -30rpx;
		margin-bottom: 6rpx;
	}

	/* 合并后的答题明细分区标题，用于区分“本局数据”与“逐题明细” */
	.section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 26rpx 0 14rpx;
	}

	.section-head-title {
		font-size: 28rpx;
		font-weight: 700;
		color: #0f4c81;
	}

	.section-head-sub {
		font-size: 22rpx;
		color: #2b6f9e;
	}

	.result-sub {
		display: block;
		margin: 0 10rpx 20rpx;
		font-size: 23rpx;
		line-height: 1.6;
		color: #12507f;
		text-align: center;
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
		background: rgba(255, 255, 255, 0.78);
	}

	.tip-text {
		font-size: 22rpx;
		line-height: 1.6;
		color: #12507f;
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
		/* 固定在页面底部、背景透明：按钮直接浮在天空背景上，避免整条白底显得突兀 */
		position: relative;
		z-index: 1;
		display: flex;
		gap: 20rpx;
		padding: 20rpx 30rpx;
		padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
		background: transparent;
		flex-shrink: 0;
	}

	.action {
		flex: 1;
		height: 88rpx;
		border-radius: 44rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.action.ghost {
		background: #eaf5ff;
		border: 2rpx solid #7ec4ea;
	}

	.action.primary {
		background: linear-gradient(180deg, #ffd76a 0%, #ff9f1a 55%, #f2800a 100%);
		box-shadow: 0 8rpx 0 #c96a06;
	}

	.action-text {
		font-size: 30rpx;
		font-weight: 600;
		color: #0f4c81;
	}

	.action-text.light {
		color: #6b3500;
	}
</style>
