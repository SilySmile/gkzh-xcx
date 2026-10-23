<template>
	<view class="page">
		<view class="top-bar" :style="{ paddingTop: 'var(--status-bar-height)' }">
			<view class="back" @click="back">‹</view>
			<text class="top-title">{{ record.pointName || '场景答题' }}</text>
			<view class="back-placeholder"></view>
		</view>

		<view class="progress-wrap">
			<view class="progress-head">
				<text class="progress-theme">{{ record.theme || '请按真实感受作答' }}</text>
				<text class="progress-count">{{ currentIndex + 1 }} / {{ questions.length }}</text>
			</view>
			<view class="progress-track">
				<view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
			</view>
		</view>

		<scroll-view scroll-y class="body">
			<view class="body-inner">
				<view v-if="current" :key="currentIndex" class="question-card">
					<view class="question-head">
						<text class="question-no">第 {{ currentIndex + 1 }} 题</text>
						<text v-if="answers[current.questionNo]" class="answered-badge">已答</text>
					</view>
					<text class="question-content">{{ current.content }}</text>
					<view class="options">
						<view
							v-for="key in optionKeys"
							:key="key"
							class="option"
							:class="{ selected: answers[current.questionNo] === key }"
							@click="choose(key)"
						>
							<text class="option-key">{{ key }}</text>
							<text class="option-text">{{ current['option' + key] }}</text>
						</view>
					</view>
				</view>
			</view>
		</scroll-view>

		<view class="footer">
			<view v-if="currentIndex > 0" class="ghost-button" @click="prev">上一题</view>
			<view
				v-if="!isLast"
				class="primary-button"
				:class="{ disabled: !currentAnswer }"
				@click="next"
				>下一题</view
			>
			<view
				v-else
				class="primary-button"
				:class="{ disabled: answeredCount < questions.length || submitting }"
				@click="submit"
				>{{ submitting ? '提交中…' : '提交并生成压力值' }}</view
			>
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
			currentIndex: 0,
			submitting: false,
			loading: true,
			advanceTimer: null
		}),
		computed: {
			current() {
				return this.questions[this.currentIndex] || null
			},
			isLast() {
				return this.currentIndex >= this.questions.length - 1
			},
			answeredCount() {
				return Object.keys(this.answers).length
			},
			currentAnswer() {
				return this.current ? this.answers[this.current.questionNo] : ''
			},
			progressPercent() {
				if (!this.questions.length) return 0
				return Math.round(((this.currentIndex + 1) * 100) / this.questions.length)
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
		onUnload() {
			if (this.advanceTimer) clearTimeout(this.advanceTimer)
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
			choose(key) {
				if (this.submitting || !this.current) return
				this.$set(this.answers, this.current.questionNo, key)
				if (this.advanceTimer) clearTimeout(this.advanceTimer)
				// 选择后短暂停留，再自动跳到下一题；最后一题停留在本页等待提交。
				if (!this.isLast) {
					this.advanceTimer = setTimeout(() => this.next(), 350)
				}
			},
			next() {
				if (this.advanceTimer) {
					clearTimeout(this.advanceTimer)
					this.advanceTimer = null
				}
				if (!this.currentAnswer) {
					uni.showToast({ title: '请选择一项后继续', icon: 'none' })
					return
				}
				if (this.currentIndex < this.questions.length - 1) {
					this.currentIndex += 1
				}
			},
			prev() {
				if (this.advanceTimer) {
					clearTimeout(this.advanceTimer)
					this.advanceTimer = null
				}
				if (this.currentIndex > 0) {
					this.currentIndex -= 1
				}
			},
			async submit() {
				if (this.submitting) return
				if (this.answeredCount < this.questions.length) {
					const missing = this.questions.findIndex(item => !this.answers[item.questionNo])
					if (missing > -1) this.currentIndex = missing
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

	.progress-wrap {
		padding: 8rpx 40rpx 0;
	}

	.progress-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12rpx;
	}

	.progress-theme {
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.5);
	}

	.progress-count {
		font-size: 24rpx;
		color: #ffd166;
		font-weight: 600;
	}

	.progress-track {
		height: 10rpx;
		border-radius: 999rpx;
		background: rgba(255, 255, 255, 0.12);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		border-radius: 999rpx;
		background: linear-gradient(90deg, #ffd166, #ffb020);
		transition: width 0.28s ease;
	}

	.body {
		flex: 1;
		padding: 0 40rpx;
		box-sizing: border-box;
	}

	.body-inner {
		min-height: 100%;
		padding: 32rpx 0;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.question-card {
		width: 100%;
		padding: 40rpx 36rpx 32rpx;
		border-radius: 32rpx;
		background: rgba(255, 255, 255, 0.07);
		border: 1rpx solid rgba(255, 255, 255, 0.09);
		box-shadow: 0 18rpx 44rpx rgba(0, 0, 0, 0.22);
		animation: question-in 0.26s ease;
	}

	@keyframes question-in {
		0% { opacity: 0; transform: translateX(36rpx); }
		100% { opacity: 1; transform: translateX(0); }
	}

	.question-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.question-no {
		font-size: 22rpx;
		letter-spacing: 4rpx;
		color: #ffd166;
	}

	.answered-badge {
		padding: 2rpx 14rpx;
		border-radius: 999rpx;
		font-size: 18rpx;
		color: #7ee89a;
		background: rgba(76, 217, 100, 0.12);
		border: 1rpx solid rgba(76, 217, 100, 0.3);
	}

	.question-content {
		display: block;
		margin-top: 18rpx;
		font-size: 34rpx;
		line-height: 1.55;
		font-weight: 600;
		color: #ffffff;
	}

	.options {
		margin-top: 32rpx;
		display: flex;
		flex-direction: column;
	}

	.option {
		display: flex;
		align-items: center;
		padding: 22rpx 24rpx;
		margin-bottom: 16rpx;
		border-radius: 20rpx;
		background: rgba(255, 255, 255, 0.05);
		border: 1rpx solid rgba(255, 255, 255, 0.09);
		transition: background 0.14s ease, border-color 0.14s ease, transform 0.1s ease;
	}

	.option.selected {
		background: rgba(255, 209, 102, 0.18);
		border-color: rgba(255, 209, 102, 0.85);
		transform: scale(1.01);
	}

	.option-key {
		width: 46rpx;
		height: 46rpx;
		line-height: 46rpx;
		margin-right: 18rpx;
		flex-shrink: 0;
		border-radius: 50%;
		text-align: center;
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.7);
		background: rgba(255, 255, 255, 0.1);
	}

	.option.selected .option-key {
		color: #2b2150;
		background: #ffd166;
		font-weight: 700;
	}

	.option-text {
		flex: 1;
		font-size: 28rpx;
		line-height: 1.5;
		color: rgba(255, 255, 255, 0.86);
	}

	.option.selected .option-text {
		color: #ffffff;
	}

	.footer {
		display: flex;
		padding: 18rpx 40rpx calc(26rpx + env(safe-area-inset-bottom));
	}

	.ghost-button {
		width: 200rpx;
		height: 96rpx;
		line-height: 96rpx;
		margin-right: 20rpx;
		text-align: center;
		border-radius: 999rpx;
		font-size: 28rpx;
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.08);
		border: 1rpx solid rgba(255, 255, 255, 0.16);
	}

	.primary-button {
		flex: 1;
		height: 96rpx;
		line-height: 96rpx;
		text-align: center;
		border-radius: 999rpx;
		font-size: 30rpx;
		font-weight: 600;
		letter-spacing: 4rpx;
		color: #2a1d12;
		background: linear-gradient(135deg, #ffe08a 0%, #ffc23d 100%);
		box-shadow: 0 14rpx 28rpx rgba(255, 190, 61, 0.25);
		transition: opacity 0.15s ease;
	}

	.primary-button.disabled {
		opacity: 0.45;
		box-shadow: none;
	}
</style>
