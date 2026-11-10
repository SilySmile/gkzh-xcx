<template>
	<view class="page">
		<ZdypHeader title="职得一拼" @back="back" />

		<scroll-view class="scroll" scroll-y>
			<view class="inner">
				<view class="banner" :class="passed ? 'banner-pass' : 'banner-fail'">
					<text class="banner-title">{{ passed ? '恭喜通关' : (result.timeout ? '本局超时' : '本局未通过') }}</text>
					<text class="banner-sub">{{ bannerSub }}</text>
				</view>

				<view class="metrics">
					<view class="metric">
						<text class="metric-value">{{ durationText }}</text>
						<text class="metric-label">本局用时</text>
					</view>
					<view class="metric">
						<text class="metric-value">{{ result.correctCount || 0 }}/4</text>
						<text class="metric-label">放对卡槽</text>
					</view>
					<view class="metric">
						<text class="metric-value">{{ result.wrongCount || 0 }}</text>
						<text class="metric-label">放错卡槽</text>
					</view>
					<view class="metric">
						<text class="metric-value">{{ totalAttempts }}</text>
						<text class="metric-label">闯关次数</text>
					</view>
				</view>

				<view class="section-title">拼图结果</view>
				<view v-for="slot in result.slots || []" :key="slot.slotCode" class="slot-card"
					:class="slot.correct ? 'slot-pass' : 'slot-fail'">
					<view class="slot-head">
						<text class="slot-name">{{ slot.slotName }}</text>
						<text class="slot-status">{{ slot.correct ? '放置正确' : (slot.filled ? '放置错误' : '未填写') }}</text>
					</view>
					<text class="slot-correct">{{ slot.correctCardText }}</text>
					<text v-if="!slot.correct && slot.filled" class="slot-wrong">你放入的是：{{ slot.cardText }}</text>
				</view>

				<view class="section-title">职业解说</view>
				<view class="card">
					<text class="card-label">岗位定义</text>
					<text class="card-body">{{ detail.intro || '暂无岗位定义' }}</text>
				</view>
				<view class="card">
					<text class="card-label">行业价值</text>
					<text class="card-body">{{ detail.industryValue || '暂无行业价值说明' }}</text>
				</view>
				<view class="card">
					<text class="card-label">新生入门建议</text>
					<text class="card-body">{{ detail.newcomerAdvice || '暂无入门建议' }}</text>
				</view>

				<template v-if="passed && result.behaviorName">
					<view class="section-title">职业认知分型</view>
					<view class="behavior">
						<text class="behavior-name">{{ result.behaviorName }}</text>
						<text class="behavior-text">{{ result.conclusion }}</text>
						<text class="behavior-label">提升建议</text>
						<text class="behavior-text">{{ result.suggestion }}</text>
					</view>
				</template>

				<view class="bottom-space"></view>
			</view>
		</scroll-view>

		<view class="actions">
			<view v-if="!passed" class="btn btn-ghost" @click="retry">
				<text class="btn-text">再试一次</text>
			</view>
			<view class="btn btn-main" @click="backToActivity">
				<text class="btn-text">返回活动</text>
			</view>
		</view>
	</view>
</template>

<script>
	import ZdypHeader from '@/components/ZdypHeader.vue'
	import { getRecord, userMessage } from '@/api/zdyp'

	/**
	 * 职得一拼结果页：展示本局判定、四维正确答案与职业解说。
	 * 未通关可再试一次，通关后展示职业认知分型、个人结论与提升建议。
	 */
	export default {
		components: { ZdypHeader },
		data: () => ({
			recordId: '',
			instanceId: '',
			gameId: '',
			bizType: 'career_week',
			record: {},
			result: {},
			detail: {},
			timeLimit: 45
		}),
		computed: {
			passed() {
				return this.result.pass === true
			},
			totalAttempts() {
				return this.record.attemptNo || this.result.attemptNo || 0
			},
			durationText() {
				if (!this.result.durationMs && this.result.durationMs !== 0) return '-'
				return (this.result.durationMs / 1000).toFixed(1) + ' 秒'
			},
			bannerSub() {
				if (this.passed) {
					return '你已完整还原「' + ((this.result.career && this.result.career.careerName) || '该岗位') + '」的职业信息'
				}
				if (this.result.timeout) {
					return '时间到，未填满的卡槽按错误计算，可再来一次'
				}
				return '对照下面的正确答案再看一遍，然后重新挑战'
			}
		},
		async onLoad(options) {
			this.recordId = options.recordId || ''
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			await this.load()
		},
		methods: {
			async load() {
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = res.data || {}
					this.record = data
					this.bizType = data.bizType || 'career_week'
					this.timeLimit = (data.setting && data.setting.timeLimit) || 45
					this.result = data.lastResult || {}
					this.detail = this.result.detail || {}
				} catch (e) {
					uni.showToast({ title: userMessage(e, '结果加载失败，请稍后重试'), icon: 'none' })
				}
			},
			retry() {
				const base = `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
				uni.redirectTo({ url: `/pages/zdyp/index?${base}` })
			},
			backToActivity() {
				uni.reLaunch({
					url: `/pages/mp/sub-pages/career-week/index?bizType=${encodeURIComponent(this.bizType || 'career_week')}`
				})
			},
			back() {
				const pages = getCurrentPages()
				if (pages.length > 1) {
					uni.navigateBack({ delta: 1 })
					return
				}
				this.backToActivity()
			}
		}
	}
</script>

<style scoped>
	.page {
		width: 100%;
		height: 100vh;
		background: #FCF3D8;
		display: flex;
		flex-direction: column;
	}

	.scroll {
		flex: 1;
		height: 0;
	}

	.inner {
		padding: 110rpx 32rpx 0;
		box-sizing: border-box;
	}

	.banner {
		padding: 34rpx 30rpx;
		border-radius: 30rpx;
		display: flex;
		flex-direction: column;
	}

	.banner-pass {
		background: linear-gradient(180deg, #7FC98A 0%, #5FAF6C 100%);
	}

	.banner-fail {
		background: linear-gradient(180deg, #EE9A86 0%, #DE6D57 100%);
	}

	.banner-title {
		font-size: 42rpx;
		font-weight: 700;
		color: #FFFFFF;
	}

	.banner-sub {
		margin-top: 10rpx;
		font-size: 24rpx;
		line-height: 1.5;
		color: rgba(255, 255, 255, 0.92);
	}

	.metrics {
		margin-top: 20rpx;
		display: flex;
		justify-content: space-between;
	}

	.metric {
		flex: 1;
		margin: 0 6rpx;
		padding: 20rpx 8rpx;
		background: #FFFFFF;
		border-radius: 20rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.metric-value {
		font-size: 30rpx;
		font-weight: 700;
		color: #EE8B3E;
	}

	.metric-label {
		margin-top: 6rpx;
		font-size: 21rpx;
		color: #8A6D3B;
	}

	.section-title {
		margin: 28rpx 0 14rpx;
		font-size: 30rpx;
		font-weight: 700;
		color: #3D3428;
	}

	.slot-card {
		margin-bottom: 16rpx;
		padding: 22rpx 24rpx;
		border-radius: 22rpx;
		background: #FFFFFF;
		border-left: 8rpx solid #E7DCC2;
		display: flex;
		flex-direction: column;
	}

	.slot-pass {
		border-left-color: #5FAF6C;
	}

	.slot-fail {
		border-left-color: #DE6D57;
	}

	.slot-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.slot-name {
		font-size: 27rpx;
		font-weight: 700;
		color: #3D3428;
	}

	.slot-status {
		font-size: 22rpx;
		color: #8A6D3B;
	}

	.slot-correct {
		margin-top: 10rpx;
		font-size: 23rpx;
		line-height: 1.6;
		color: #4A3B2A;
	}

	.slot-wrong {
		margin-top: 8rpx;
		font-size: 22rpx;
		line-height: 1.55;
		color: #C2553F;
	}

	.card {
		margin-bottom: 16rpx;
		padding: 24rpx;
		border-radius: 22rpx;
		background: #FFFFFF;
		display: flex;
		flex-direction: column;
	}

	.card-label {
		font-size: 25rpx;
		font-weight: 700;
		color: #EE8B3E;
	}

	.card-body {
		margin-top: 10rpx;
		font-size: 23rpx;
		line-height: 1.7;
		color: #4A3B2A;
	}

	.behavior {
		padding: 28rpx 26rpx;
		border-radius: 24rpx;
		background: #FFF6EC;
		border: 3rpx solid #F3D9B4;
		display: flex;
		flex-direction: column;
	}

	.behavior-name {
		font-size: 32rpx;
		font-weight: 700;
		color: #EE8B3E;
	}

	.behavior-label {
		margin-top: 18rpx;
		font-size: 25rpx;
		font-weight: 700;
		color: #8A6D3B;
	}

	.behavior-text {
		margin-top: 10rpx;
		font-size: 23rpx;
		line-height: 1.75;
		color: #4A3B2A;
	}

	.bottom-space {
		height: 180rpx;
	}

	.actions {
		flex-shrink: 0;
		display: flex;
		padding: 18rpx 32rpx;
		padding-bottom: calc(18rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(18rpx + env(safe-area-inset-bottom));
		background: rgba(252, 243, 216, 0.96);
	}

	.btn {
		flex: 1;
		height: 96rpx;
		margin: 0 8rpx;
		border-radius: 48rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-main {
		background: linear-gradient(180deg, #F6A34B 0%, #EE8B3E 100%);
		box-shadow: 0 8rpx 20rpx rgba(214, 126, 40, 0.24);
	}

	.btn-ghost {
		background: #FFFFFF;
		border: 3rpx solid #E7DCC2;
	}

	.btn-text {
		font-size: 32rpx;
		font-weight: 700;
		color: #FFFFFF;
		letter-spacing: 2rpx;
	}

	.btn-ghost .btn-text {
		color: #8A6D3B;
	}
</style>
