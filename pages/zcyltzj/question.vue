<template>
	<view class="page">
		<view class="top-bar" :style="{ paddingTop: 'var(--status-bar-height)' }">
			<view class="back" @click="back">‹</view>
			<text class="top-title">{{ record.pointName || '场景答题' }}</text>
			<view class="back-placeholder"></view>
		</view>

		<scroll-view scroll-y class="scroll">
			<view class="banner">
				<text class="banner-no">点数 {{ record.pointNo }}</text>
				<text class="banner-name">{{ record.pointName }}</text>
				<text v-if="record.theme" class="banner-theme">主题：{{ record.theme }}</text>
				<text class="banner-tip">共 {{ questions.length }} 道题，请按真实感受选择</text>
			</view>

			<view v-for="(question, index) in questions" :key="question.questionNo" class="question-card">
				<view class="question-head">
					<text class="question-index">{{ index + 1 }}</text>
					<text class="question-content">{{ question.content }}</text>
				</view>
				<view class="options">
					<view
						v-for="key in optionKeys"
						:key="key"
						class="option"
						:class="{ selected: answers[question.questionNo] === key }"
						@click="choose(question.questionNo, key)"
					>
						<text class="option-key">{{ key }}</text>
						<text class="option-text">{{ question['option' + key] }}</text>
					</view>
				</view>
			</view>

			<view class="scroll-bottom"></view>
		</scroll-view>

		<view class="footer">
			<text class="progress">已作答 {{ answeredCount }} / {{ questions.length }}</text>
			<view
				class="submit-button"
				:class="{ disabled: answeredCount < questions.length || submitting }"
				@click="submit"
			>
				{{ submitting ? '提交中…' : '提交并生成压力值' }}
			</view>
		</view>
	</view>
</template>

<script>
	import { getRecord, submitAnswers, userMessage } from '@/api/zcyltzj'

	export default {
		data: () => ({
			recordId: '',
			instanceId: '',
			gameId: '',
			record: {},
			questions: [],
			answers: {},
			optionKeys: ['A', 'B', 'C', 'D'],
			submitting: false,
			loading: true
		}),
		computed: {
			answeredCount() {
				return Object.keys(this.answers).length
			}
		},
		async onLoad(options) {
			this.recordId = options.recordId || ''
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			if (!this.recordId) {
				uni.showToast({ title: '缺少游戏记录，请重新扫码进入', icon: 'none' })
				return
			}
			await this.load()
		},
		methods: {
			async load() {
				this.loading = true
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = res.data || {}
					if (data.status === 'finished') {
						uni.redirectTo({ url: `/pages/zcyltzj/result?${this.query()}` })
						return
					}
					if (!data.pointNo) {
						uni.showToast({ title: '请先掷骰子抽取题目', icon: 'none' })
						setTimeout(() => uni.redirectTo({ url: `/pages/zcyltzj/index?${this.query()}` }), 600)
						return
					}
					this.record = data
					this.questions = data.questions || []
					// 恢复已保存的答案：服务端返回 { 题号: 选项 }。
					const saved = {}
					Object.keys(data.answers || {}).forEach(key => {
						if (data.answers[key]) saved[key] = data.answers[key]
					})
					this.answers = saved
				} catch (e) {
					uni.showToast({ title: userMessage(e, '题目加载失败，请稍后重试'), icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			choose(questionNo, key) {
				if (this.submitting) return
				this.$set(this.answers, questionNo, key)
			},
			async submit() {
				if (this.submitting) return
				if (this.answeredCount < this.questions.length) {
					uni.showToast({ title: '请完成全部题目后提交', icon: 'none' })
					return
				}
				this.submitting = true
				try {
					const list = this.questions.map(item => ({
						questionNo: item.questionNo,
						option: this.answers[item.questionNo]
					}))
					await submitAnswers(this.recordId, list)
					uni.redirectTo({ url: `/pages/zcyltzj/result?${this.query()}` })
				} catch (e) {
					uni.showToast({ title: userMessage(e, '答案提交失败，请稍后重试'), icon: 'none' })
				} finally {
					this.submitting = false
				}
			},
			query() {
				return `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
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
		height: 100vh;
		display: flex;
		flex-direction: column;
		background: linear-gradient(170deg, #171a34 0%, #251c46 60%, #35215a 100%);
	}

	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-left: 24rpx;
		padding-right: 24rpx;
		padding-bottom: 12rpx;
		color: #ffffff;
	}

	.back,
	.back-placeholder {
		width: 72rpx;
		height: 72rpx;
		line-height: 64rpx;
		font-size: 56rpx;
		text-align: center;
	}

	.top-title {
		font-size: 30rpx;
		letter-spacing: 2rpx;
		color: rgba(255, 255, 255, 0.9);
	}

	.scroll {
		flex: 1;
		padding: 0 32rpx;
		box-sizing: border-box;
	}

	.banner {
		padding: 28rpx 30rpx;
		margin-bottom: 24rpx;
		border-radius: 28rpx;
		background: linear-gradient(135deg, rgba(255, 209, 102, 0.16), rgba(255, 255, 255, 0.05));
		border: 1rpx solid rgba(255, 209, 102, 0.22);
		display: flex;
		flex-direction: column;
	}

	.banner-no {
		font-size: 22rpx;
		letter-spacing: 4rpx;
		color: #ffd166;
	}

	.banner-name {
		margin-top: 8rpx;
		font-size: 38rpx;
		font-weight: 700;
		color: #ffffff;
	}

	.banner-theme {
		margin-top: 10rpx;
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.7);
	}

	.banner-tip {
		margin-top: 14rpx;
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.45);
	}

	.question-card {
		padding: 28rpx 28rpx 18rpx;
		margin-bottom: 22rpx;
		border-radius: 26rpx;
		background: rgba(255, 255, 255, 0.06);
		border: 1rpx solid rgba(255, 255, 255, 0.08);
	}

	.question-head {
		display: flex;
		align-items: flex-start;
		margin-bottom: 18rpx;
	}

	.question-index {
		width: 42rpx;
		height: 42rpx;
		line-height: 42rpx;
		margin-right: 16rpx;
		flex-shrink: 0;
		border-radius: 50%;
		text-align: center;
		font-size: 22rpx;
		color: #2b2150;
		background: #ffd166;
	}

	.question-content {
		flex: 1;
		font-size: 28rpx;
		line-height: 1.6;
		color: #ffffff;
	}

	.options {
		display: flex;
		flex-direction: column;
	}

	.option {
		display: flex;
		align-items: center;
		padding: 18rpx 20rpx;
		margin-bottom: 12rpx;
		border-radius: 18rpx;
		background: rgba(255, 255, 255, 0.05);
		border: 1rpx solid rgba(255, 255, 255, 0.08);
	}

	.option.selected {
		background: rgba(255, 209, 102, 0.18);
		border-color: rgba(255, 209, 102, 0.8);
	}

	.option-key {
		width: 42rpx;
		height: 42rpx;
		line-height: 42rpx;
		margin-right: 16rpx;
		flex-shrink: 0;
		border-radius: 50%;
		text-align: center;
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.7);
		background: rgba(255, 255, 255, 0.1);
	}

	.option.selected .option-key {
		color: #2b2150;
		background: #ffd166;
		font-weight: 600;
	}

	.option-text {
		flex: 1;
		font-size: 26rpx;
		line-height: 1.5;
		color: rgba(255, 255, 255, 0.86);
	}

	.option.selected .option-text {
		color: #ffffff;
	}

	.scroll-bottom {
		height: 200rpx;
	}

	.footer {
		padding: 18rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
		background: rgba(23, 26, 52, 0.92);
		border-top: 1rpx solid rgba(255, 255, 255, 0.08);
	}

	.progress {
		display: block;
		margin-bottom: 12rpx;
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.55);
		text-align: center;
	}

	.submit-button {
		height: 96rpx;
		line-height: 96rpx;
		text-align: center;
		border-radius: 999rpx;
		font-size: 32rpx;
		font-weight: 600;
		letter-spacing: 4rpx;
		color: #2a1d12;
		background: linear-gradient(135deg, #ffe08a 0%, #ffc23d 100%);
		box-shadow: 0 14rpx 28rpx rgba(255, 190, 61, 0.25);
	}

	.submit-button.disabled {
		opacity: 0.45;
		box-shadow: none;
	}
</style>
