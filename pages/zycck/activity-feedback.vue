<template>
	<scroll-view scroll-y class="page">
		<zycck-header title="回顾探索" @back="back" />
		<view class="content">
			<text class="title">回顾探索</text>
			<text class="subtitle">回顾探索，解锁惊喜⭐</text>
			<view v-if="loading" class="state-tip">正在加载活动反馈…</view>
			<view v-else-if="loadError" class="state-tip">
				<text>{{ loadError }}</text>
				<button class="retry-button" @click="load">重新加载</button>
			</view>
			<view v-else>
				<text v-if="submitted" class="saved-tip">活动反馈已提交，不可再次修改。</text>
				<view v-for="question in questions" :key="question.questionNo" class="question-card">
					<text class="question-title">第{{ question.questionNo }}题：{{ question.title }}</text>
					<text class="question-hint">{{ question.type === 'single' ? '单选' : '多选，最多选3项，可少选' }}</text>
					<view v-for="option in question.options" :key="option.code" class="option-wrap">
						<view class="option" :class="{ selected: isSelected(question, option.code) }"
							@click="choose(question, option.code)">
							<text class="check"
								:class="{ radio: question.type === 'single' }">{{ isSelected(question, option.code) ? '✓' : '' }}</text>
							<text class="option-label">{{ option.label }}</text>
						</view>
						<textarea v-if="option.requiresText && isSelected(question, option.code)"
							v-model="answers['question' + question.questionNo + 'Other']" class="other-input"
							maxlength="500" :disabled="submitting || submitted" placeholder="请输入其他内容（最多500字）" />
					</view>
				</view>
				<button v-if="!submitted" class="submit-button" :loading="submitting" :disabled="submitting"
					@click="submit">提交反馈并完成游戏</button>
				<button v-else class="submit-button" @click="goReport">返回探索报告</button>
			</view>
		</view>
	</scroll-view>
</template>

<script>
	import ZycckHeader from '@/components/ZycckHeader.vue'
	import {
		getActivityFeedback,
		saveActivityFeedback,
		userMessage
	} from '@/api/zycck'
	import {
		toggleFeedbackOption,
		validateFeedbackAnswers
	} from '@/utils/zycck-activity-feedback'

	export default {
		components: {
			ZycckHeader
		},
		data: () => ({
			recordId: '',
			instanceId: '',
			gameId: '',
			loading: true,
			loadError: '',
			submitting: false,
			submitted: false,
			questions: [],
			answers: {
				question1Answers: [],
				question1Other: '',
				question2Answer: '',
				question2Other: '',
				question3Answers: [],
				question3Other: ''
			}
		}),
		onLoad(options) {
			this.recordId = options.recordId || ''
			this.instanceId = options.instanceId || ''
			this.gameId = options.gameId || ''
			this.load()
		},
		methods: {
			context() {
				return {
					instanceId: this.instanceId,
					gameId: this.gameId
				}
			},
			async load() {
				this.loading = true
				this.loadError = ''
				try {
					const response = await getActivityFeedback(this.recordId, this.context())
					this.applyView(response.data || {})
				} catch (error) {
					this.loadError = userMessage(error, '活动反馈加载失败，请重试')
				} finally {
					this.loading = false
				}
			},
			// 第2题是否显示以服务端为准，不用当前清单数量在手机上推测。
			applyView(view) {
				// 接口返回空内容时展示重试，不能留下空白问卷或允许提交空答案。
				if (!Array.isArray(view.questions) || view.questions.length < 2 || view.questions.some(question => !Array
						.isArray(question.options) || !question.options.length)) {
					const error = new Error('活动反馈内容未加载完整，请重试')
					error.userFacing = true
					throw error
				}
				this.questions = view.questions
				this.submitted = view.submitted === true
				this.answers = {
					...this.answers,
					...(view.answers || {})
				}
			},
			isSelected(question, code) {
				return question.type === 'single' ? this.answers[`question${question.questionNo}Answer`] === code :
					(this.answers[`question${question.questionNo}Answers`] || []).includes(code)
			},
			choose(question, code) {
				if (this.submitting || this.submitted) return
				const prefix = `question${question.questionNo}`
				if (question.type === 'single') this.answers[prefix + 'Answer'] = code
				else {
					const result = toggleFeedbackOption(question, this.answers[prefix + 'Answers'] || [], code)
					if (result.error) return uni.showToast({
						title: result.error,
						icon: 'none'
					})
					this.answers[prefix + 'Answers'] = result.selected
				}
				if (!this.isSelected(question, 'OTHER')) this.answers[prefix + 'Other'] = ''
			},
			async submit() {
				if (this.loading || this.loadError || this.submitting || this.submitted) return
				const errorText = validateFeedbackAnswers(this.questions, this.answers)
				if (errorText) return uni.showToast({
					title: errorText,
					icon: 'none'
				})
				this.submitting = true
				try {
					// 请求模块已校验业务 code=200，服务端在同一事务保存答案并结束游戏。
					// 提交接口无需再次返回完整问卷或 gameFinished，不能将成功响应误判为保存失败。
					await saveActivityFeedback(this.recordId, this.context(), this.answers)
				} catch (error) {
					uni.showToast({
						title: userMessage(error, '活动反馈保存失败，请重试'),
						icon: 'none'
					})
					return
				} finally {
					this.submitting = false
				}
				// 成功即锁定本页；返回动作独立于保存异常处理，避免跳转问题被提示为保存失败。
				this.submitted = true
				uni.showToast({
					title: '活动反馈已提交',
					icon: 'success'
				})
				this.goReport()
			},
			back() {
				if (this.submitting) return
				if (getCurrentPages().length > 1) return uni.navigateBack({
					delta: 1
				})
				this.goReport()
			},
			// 首次提交结束游戏后回报告；从报告进入时退一页，避免堆叠多个报告页面。
			goReport() {
				const pages = getCurrentPages()
				if (pages.length > 1 && pages[pages.length - 2].route === 'pages/zycck/report') return uni.navigateBack({
					delta: 1
				})
				const query = ['recordId', 'instanceId', 'gameId'].map(key => `${key}=${encodeURIComponent(this[key])}`)
					.join('&')
				uni.redirectTo({
					url: `/pages/zycck/report?${query}`
				})
			}
		}
	}
</script>

<style scoped>
	.page {
		height: 100vh;
		background: linear-gradient(180deg, #e2d2e6, #f5f0f7 40%, #fff);
	}

	.content {
		padding: 40rpx 28rpx 80rpx;
	}

	.title {
		display: block;
		color: #17151a;
		font-size: 40rpx;
		font-weight: 700;
		text-align: center;
	}

	.subtitle {
		display: block;
		margin: 20rpx 0 32rpx;
		color: #676369;
		font-size: 26rpx;
		line-height: 1.7;
		text-align: center;
	}

	.state-tip {
		padding: 50rpx 0;
		text-align: center;
		color: #777;
		font-size: 28rpx;
	}

	.saved-tip {
		display: block;
		margin-bottom: 24rpx;
		color: #218367;
		font-size: 26rpx;
		line-height: 1.6;
	}

	.question-card {
		padding: 30rpx 24rpx;
		margin-bottom: 24rpx;
		border-radius: 20rpx;
		background: #fff;
		border: 1rpx solid #e8dfe9;
	}

	.question-title {
		display: block;
		color: #242127;
		font-size: 30rpx;
		font-weight: 600;
		line-height: 1.65;
	}

	.question-hint {
		display: block;
		color: #8a818d;
		font-size: 24rpx;
		margin: 12rpx 0 22rpx;
	}

	.option-wrap {
		margin-top: 16rpx;
	}

	.option {
		display: flex;
		align-items: flex-start;
		padding: 22rpx 18rpx;
		border: 1rpx solid #e6e0e8;
		border-radius: 12rpx;
	}

	.option.selected {
		background: #effaf5;
		border-color: #28b28b;
	}

	.check {
		flex: 0 0 32rpx;
		width: 32rpx;
		height: 32rpx;
		margin: 5rpx 16rpx 0 0;
		border: 2rpx solid #afa6b3;
		border-radius: 6rpx;
		text-align: center;
		line-height: 32rpx;
		font-size: 24rpx;
		color: #fff;
	}

	.selected .check {
		background: #28b28b;
		border-color: #28b28b;
	}

	.check.radio {
		border-radius: 50%;
	}

	.option-label {
		flex: 1;
		color: #38313c;
		font-size: 27rpx;
		line-height: 1.65;
	}

	.other-input {
		box-sizing: border-box;
		width: 100%;
		height: 180rpx;
		margin-top: 16rpx;
		padding: 20rpx;
		border: 1rpx solid #ddd3e0;
		border-radius: 12rpx;
		font-size: 26rpx;
		background: #faf7fb;
	}

	.submit-button,
	.retry-button {
		background: #28b28b;
		color: #fff;
		border-radius: 14rpx;
		font-size: 30rpx;
		margin-top: 28rpx;
	}

	.submit-button[disabled] {
		opacity: .6;
		background: #28b28b;
		color: #fff;
	}

	.submit-button::after,
	.retry-button::after {
		border: 0;
	}
</style>