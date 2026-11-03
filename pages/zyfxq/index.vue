<template>
	<view class="page">
		<image v-if="assets.bg" class="page-bg" :src="assets.bg" mode="scaleToFill" />
		<view class="page-header">
			<zyfxq-header title="职业飞行棋" @back="back" />
		</view>

		<view class="topbar">
			<view class="timer" :class="timerClass">
				<text class="timer-label">剩余时间</text>
				<text class="timer-value">{{ remainText }}</text>
			</view>
			<view class="stat">
				<text class="stat-item">掷骰 {{ rollCount }} 次</text>
				<text class="stat-item">前进 {{ stepTotal }} 步</text>
				<text class="stat-item">第 {{ position }} 格</text>
			</view>
		</view>

		<view class="board">
			<view class="cell-slot" :style="slotStyle(startSlot)">
				<view class="cell start-cell">
					<text class="start-label">起点</text>
					<text class="start-go">GO</text>
					<view v-if="position === 0" class="token"><text class="token-icon">✈</text></view>
				</view>
			</view>

			<view v-for="cell in cells" :key="cell.cellNo" class="cell-slot" :style="slotStyle(cell)">
				<view :class="cellClass(cell)" :style="'background-color:' + cell.cellColor">
					<view class="cell-badge"><text class="cell-no">{{ cell.cellNo }}</text></view>
					<text v-if="cell.cellLabel" class="cell-label">{{ cell.cellLabel }}</text>
					<view v-if="position === cell.cellNo" class="token"><text class="token-icon">✈</text></view>
				</view>
			</view>

			<view class="center">
				<text class="center-title">掷出骰子，向终点前进</text>
				<view class="dice" :class="diceClass" @click="roll">
					<view v-for="slot in pipSlots" :key="slot" class="pip-slot">
						<view :class="'pip ' + (pipOn(slot) ? 'pip-on' : '')"></view>
					</view>
				</view>
				<view class="roll-btn" :class="rollButtonClass" @click="roll">
					<text class="roll-text">{{ rollButtonText }}</text>
				</view>
				<text class="center-hint">答对继续摇骰 · 答错后退 {{ backSteps }} 格</text>
			</view>
		</view>

		<view v-if="questionVisible" class="mask">
			<view class="dialog">
				<view class="dialog-head">
					<text class="dialog-type">{{ question.questionTypeName }}</text>
					<text :class="questionTimerClass">限时 {{ questionRemain > 0 ? questionRemain : 0 }} 秒</text>
				</view>
				<text class="dialog-title">{{ question.title }}</text>
				<view class="options">
					<view
						v-for="(opt, index) in question.options"
						:key="opt.label"
						:class="optionClass(index, opt)"
						@click="choose(opt)"
					>
						<text class="opt-label">{{ opt.label }}</text>
						<text class="opt-text">{{ opt.content }}</text>
					</view>
				</view>
				<view v-if="feedback.show" :class="feedbackClass">
					<text class="feedback-title">{{ feedbackTitle }}</text>
					<text class="feedback-answer">正确答案：{{ feedback.correctLabel }}. {{ feedback.correctContent }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { getRecord, rollDice, submitAnswer, startRecord, userMessage } from '@/api/zyfxq'
	import ZyfxqHeader from '@/components/ZyfxqHeader.vue'
	import { ZYFXQ_ASSETS } from '@/config/zyfxq-assets'

	/** 骰子 9 个点位（1-3 上排、4-6 中排、7-9 下排），按点数点亮。 */
	const FACE_PIPS = {
		1: [5],
		2: [1, 9],
		3: [1, 5, 9],
		4: [1, 3, 7, 9],
		5: [1, 3, 5, 7, 9],
		6: [1, 3, 4, 6, 7, 9]
	}

	export default {
		components: { ZyfxqHeader },
		data: () => ({
			assets: ZYFXQ_ASSETS,
			instanceId: '',
			gameId: '',
			recordId: '',
			cells: [],
			startSlot: { row: 6, col: 5 },
			position: 0,
			rollCount: 0,
			stepTotal: 0,
			answerCount: 0,
			backSteps: 2,
			totalSeconds: 180,
			remaining: 180,
			diceFace: 1,
			pipSlots: [1, 2, 3, 4, 5, 6, 7, 8, 9],
			busy: false,
			rolling: false,
			finished: false,
			questionVisible: false,
			question: { options: [] },
			questionRemain: 0,
			submitting: false,
			selectedLabel: '',
			feedback: { show: false, correct: false, timeout: false, correctLabel: '', correctContent: '' },
			feedbackTimer: null,
			timerId: null,
			questionTimerId: null,
			rollTimerId: null,
			leaving: false
		}),
		computed: {
			remainText() {
				const total = Math.max(0, Number(this.remaining) || 0)
				const minute = String(Math.floor(total / 60)).padStart(2, '0')
				const second = String(total % 60).padStart(2, '0')
				return `${minute}:${second}`
			},
			timerClass() {
				return this.remaining <= 30 ? 'timer urgent' : 'timer'
			},
			timerText() {
				return this.remainText
			},
			diceClass() {
				return this.rolling ? 'dice rolling' : 'dice'
			},
			rollButtonClass() {
				return this.busy || this.questionVisible ? 'roll-btn disabled' : 'roll-btn'
			},
			rollButtonText() {
				if (this.rolling) return '骰子转动中…'
				if (this.questionVisible) return '请先完成答题'
				return '摇骰子'
			},
			questionTimerClass() {
				return this.questionRemain <= 5 ? 'dialog-timer urgent' : 'dialog-timer'
			},
			feedbackClass() {
				return this.feedback.correct ? 'feedback ok' : 'feedback bad'
			},
			feedbackTitle() {
				if (this.feedback.correct) return '回答正确，继续摇骰子'
				const back = this.backSteps
				return this.feedback.timeout ? `答题超时，后退 ${back} 格` : `回答错误，后退 ${back} 格`
			}
		},
		async onLoad(options) {
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			this.recordId = options.recordId || ''
			if (!this.recordId) {
				uni.showToast({ title: '缺少对局信息，请重新扫码', icon: 'none' })
				return
			}
			await this.load()
		},
		onHide() {
			this.clearTimers()
		},
		onShow() {
			// 从后台返回时恢复倒计时显示，实际剩余时间仍以服务端为准。
			if (!this.leaving && this.recordId && !this.finished && !this.timerId) {
				this.startTimer()
			}
		},
		onUnload() {
			this.clearTimers()
		},
		methods: {
			async load() {
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					let data = res.data || {}
					// 直接打开对局页时若还没开始，先开始本局再同步状态。
					if (data.status === 'ready') {
						const started = await startRecord(this.recordId)
						data = (started && started.data) || data
					}
					this.syncState(data, true)
				} catch (e) {
					uni.showToast({ title: userMessage(e, '对局加载失败，请重新扫码'), icon: 'none' })
				}
			},
			/** 同步服务端状态；needQuestion 为 false 时不自动弹出题目（用于答题反馈阶段）。 */
			syncState(data, needQuestion) {
				if (!data) return
				this.cells = (data.board && data.board.cells) || []
				this.startSlot = (data.board && data.board.startSlot) || this.startSlot
				this.position = Number(data.position) || 0
				this.rollCount = Number(data.rollCount) || 0
				this.stepTotal = Number(data.stepTotal) || 0
				this.answerCount = Number(data.answerCount) || 0
				this.backSteps = Number(data.backSteps) || 2
				this.totalSeconds = Number(data.totalSeconds) || 180
				this.remaining = Number(data.remainingSeconds) || 0
				if (data.diceValue) this.diceFace = Number(data.diceValue)
				if (data.status === 'finished') {
					this.finished = true
					this.clearTimers()
					this.questionVisible = false
					this.goResult(data.result)
					return
				}
				if (!this.timerId) this.startTimer()
				if (needQuestion) {
					if (data.currentQuestion) {
						this.openQuestion(data.currentQuestion)
					} else {
						this.questionVisible = false
					}
				}
			},
			startTimer() {
				this.clearMainTimer()
				this.timerId = setInterval(() => {
					if (this.finished) return
					if (this.remaining > 0) {
						this.remaining -= 1
					}
					if (this.remaining <= 0) {
						this.clearMainTimer()
						this.refreshAfterTimeout()
					}
				}, 1000)
			},
			async refreshAfterTimeout() {
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = res.data || {}
					if (data.status === 'finished') {
						this.finished = true
						this.questionVisible = false
						this.clearTimers()
						uni.showToast({ title: '时间到，本局未通关', icon: 'none' })
						setTimeout(() => this.goResult(data.result), 800)
						return
					}
					this.syncState(data, true)
				} catch (e) {
					/* 网络异常时保持页面可操作，下次操作会再次同步。 */
				}
			},
			slotStyle(cell) {
				const row = Number(cell && cell.row) || 0
				const col = Number(cell && cell.col) || 0
				return `left:${(col * 100) / 6}%;top:${(row * 100) / 7}%;width:${100 / 6}%;height:${100 / 7}%;`
			},
			cellClass(cell) {
				// 小程序不支持对象形式的 :class，这里统一返回空格分隔的类名字符串。
				const list = ['cell']
				if (cell.cellType === 'question') list.push('question-cell')
				if (cell.cellType === 'end') list.push('end-cell')
				if (this.position === cell.cellNo) list.push('active')
				return list.join(' ')
			},
			optionClass(index, opt) {
				const list = ['option']
				if (this.selectedLabel && this.selectedLabel === opt.label) list.push('selected')
				if (this.feedback.show) {
					if (opt.label === this.feedback.correctLabel) list.push('right')
					else if (this.selectedLabel === opt.label && !this.feedback.correct) list.push('wrong')
					list.push('locked')
				}
				return list.join(' ')
			},
			pipOn(slot) {
				const list = FACE_PIPS[this.diceFace] || FACE_PIPS[1]
				return list.indexOf(slot) > -1
			},
			roll() {
				if (this.busy || this.rolling || this.questionVisible || this.finished || this.submitting) return
				this.busy = true
				this.rolling = true
				// 转动动画与网络请求并行；最终点数以服务端返回为准。
				this.rollTimerId = setInterval(() => {
					this.diceFace = 1 + Math.floor(Math.random() * 6)
				}, 80)
				rollDice(this.recordId).then(res => {
					const data = res.data || {}
					const result = data.rollResult || {}
					this.stopRollAnimation()
					if (result.dice) this.diceFace = Number(result.dice)
					if (data.status === 'finished' || result.reachedEnd) {
						this.position = Number(data.position) || 19
						this.rollCount = Number(data.rollCount) || this.rollCount + 1
						this.stepTotal = Number(data.stepTotal) || this.stepTotal
						this.finished = true
						this.clearTimers()
						uni.showToast({ title: '抵达终点，通关成功', icon: 'none' })
						setTimeout(() => this.goResult('win'), 1000)
						return
					}
					this.syncState(data, false)
					if (data.currentQuestion) {
						setTimeout(() => this.openQuestion(data.currentQuestion), 320)
					} else {
						this.busy = false
					}
				}).catch(e => {
					this.stopRollAnimation()
					this.busy = false
					uni.showToast({ title: userMessage(e, '掷骰子失败，请稍后重试'), icon: 'none' })
				})
			},
			stopRollAnimation() {
				if (this.rollTimerId) {
					clearInterval(this.rollTimerId)
					this.rollTimerId = null
				}
				this.rolling = false
			},
			openQuestion(question) {
				if (!question || !question.questionId) return
				this.question = question
				this.selectedLabel = ''
				this.feedback = { show: false, correct: false, timeout: false, correctLabel: '', correctContent: '' }
				const remain = question.remainSeconds != null ? Number(question.remainSeconds) : Number(question.limitSeconds)
				this.questionRemain = Number.isFinite(remain) && remain > 0 ? remain : Number(question.limitSeconds) || 20
				this.questionVisible = true
				this.busy = true
				this.startQuestionTimer()
			},
			startQuestionTimer() {
				this.clearQuestionTimer()
				this.questionTimerId = setInterval(() => {
					if (!this.questionVisible || this.feedback.show) return
					if (this.questionRemain > 0) this.questionRemain -= 1
					if (this.questionRemain <= 0) {
						this.clearQuestionTimer()
						this.submit(null, true)
					}
				}, 1000)
			},
			choose(opt) {
				if (this.feedback.show || this.submitting) return
				this.selectedLabel = opt.label
				this.submit(opt.label, false)
			},
			submit(optionLabel, timeout) {
				if (this.submitting) return
				this.submitting = true
				this.clearQuestionTimer()
				submitAnswer(this.recordId, {
					questionId: this.question.questionId,
					optionLabel: optionLabel,
					timeout: timeout
				}).then(res => {
					const data = res.data || {}
					const result = data.answerResult || {}
					this.feedback = {
						show: true,
						correct: !!result.correct,
						timeout: !!result.timeout,
						correctLabel: result.correctLabel || '',
						correctContent: result.correctContent || ''
					}
					this.position = Number(data.position)
					this.rollCount = Number(data.rollCount) || this.rollCount
					this.stepTotal = Number(data.stepTotal) || this.stepTotal
					this.remaining = Number(data.remainingSeconds)
					this.answerCount = Number(data.answerCount) || this.answerCount + 1
					this.feedbackTimer = setTimeout(() => this.closeQuestion(data), 1700)
				}).catch(e => {
					uni.showToast({ title: userMessage(e, '答案提交失败，请稍后重试'), icon: 'none' })
					this.submitting = false
					// 重新同步，避免客户端与服务端题目状态不一致。
					this.load()
				})
			},
			closeQuestion(data) {
				if (this.feedbackTimer) {
					clearTimeout(this.feedbackTimer)
					this.feedbackTimer = null
				}
				this.questionVisible = false
				this.feedback = { show: false, correct: false, timeout: false, correctLabel: '', correctContent: '' }
				this.selectedLabel = ''
				this.submitting = false
				if (data && data.status === 'finished') {
					this.finished = true
					this.clearTimers()
					setTimeout(() => this.goResult(data.result), 300)
					return
				}
				this.busy = false
			},
			goResult(result) {
				if (this.leaving) return
				this.leaving = true
				const base = `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}&result=${encodeURIComponent(result || '')}`
				uni.redirectTo({ url: `/pages/zyfxq/result?${base}` })
			},
			back() {
				if (this.finished) {
					this.goResult('')
					return
				}
				uni.showModal({
					title: '离开对局',
					content: '离开后本局仍在计时，确定要离开吗？',
					success: res => {
						if (!res.confirm) return
						this.clearTimers()
						const pages = getCurrentPages()
						if (pages.length > 1) {
							uni.navigateBack({ delta: 1 })
						} else {
							uni.reLaunch({ url: '/pages/mp/home/index' })
						}
					}
				})
			},
			clearMainTimer() {
				if (this.timerId) {
					clearInterval(this.timerId)
					this.timerId = null
				}
			},
			clearQuestionTimer() {
				if (this.questionTimerId) {
					clearInterval(this.questionTimerId)
					this.questionTimerId = null
				}
			},
			clearTimers() {
				this.clearMainTimer()
				this.clearQuestionTimer()
				this.stopRollAnimation()
				if (this.feedbackTimer) {
					clearTimeout(this.feedbackTimer)
					this.feedbackTimer = null
				}
			}
		}
	}
</script>

<style scoped>
	.page {
		position: relative;
		min-height: 100vh;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		background: #0b62c4;
		background-image: radial-gradient(circle at 50% 26%, #67cdff 0%, #2b8fe0 32%, #0f63c6 66%, #063f7c 100%);
		overflow: hidden;
	}

	.page-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		z-index: 0;
	}

	.page-header {
		position: relative;
		z-index: 4;
		width: 100%;
	}

	.topbar {
		position: relative;
		z-index: 3;
		width: 100%;
		padding: 4rpx 30rpx 12rpx;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.timer {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 6rpx 26rpx;
		border-radius: 20rpx;
		background: rgba(4, 40, 84, 0.45);
		border: 2rpx solid rgba(255, 255, 255, 0.3);
	}

	.timer.urgent {
		background: rgba(160, 30, 30, 0.55);
		border-color: rgba(255, 210, 120, 0.7);
	}

	.timer-label {
		font-size: 20rpx;
		color: #cfe7ff;
	}

	.timer-value {
		font-size: 38rpx;
		font-weight: 700;
		color: #ffffff;
		letter-spacing: 2rpx;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	.stat-item {
		font-size: 22rpx;
		line-height: 1.6;
		color: #d9ecff;
	}

	.board {
		position: relative;
		z-index: 2;
		width: 750rpx;
		height: 875rpx;
	}

	.cell-slot {
		position: absolute;
		padding: 4rpx;
		box-sizing: border-box;
	}

	.cell {
		position: relative;
		width: 100%;
		height: 100%;
		border-radius: 14rpx;
		border: 3rpx solid rgba(255, 255, 255, 0.85);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4rpx 10rpx rgba(2, 26, 60, 0.35);
	}

	.cell.active {
		border-color: #ffe066;
		box-shadow: 0 0 0 6rpx rgba(255, 224, 102, 0.45), 0 0 20rpx rgba(255, 224, 102, 0.7);
	}

	.cell-badge {
		width: 46rpx;
		height: 46rpx;
		border-radius: 50%;
		background: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.cell-no {
		font-size: 26rpx;
		font-weight: 700;
		color: #e8621f;
	}

	.cell-label {
		margin-top: 4rpx;
		font-size: 17rpx;
		line-height: 1.2;
		color: #ffffff;
		text-align: center;
		text-align-last: center;
	}

	.start-cell {
		background: #f8b62e;
		justify-content: center;
	}

	.start-label {
		font-size: 24rpx;
		font-weight: 700;
		color: #ffffff;
	}

	.start-go {
		font-size: 20rpx;
		font-weight: 700;
		color: #fff3c4;
	}

	.token {
		position: absolute;
		right: -6rpx;
		bottom: -6rpx;
		width: 44rpx;
		height: 44rpx;
		border-radius: 50%;
		background: #ffffff;
		border: 4rpx solid #1677ff;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4rpx 8rpx rgba(0, 20, 50, 0.4);
	}

	.token-icon {
		font-size: 24rpx;
		color: #1677ff;
		line-height: 1;
	}

	.center {
		position: absolute;
		left: 16.6667%;
		top: 14.2857%;
		width: 66.6666%;
		height: 71.4285%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.center-title {
		font-size: 24rpx;
		color: #e8f5ff;
		letter-spacing: 2rpx;
		margin-bottom: 10rpx;
	}

	.dice {
		width: 150rpx;
		height: 150rpx;
		border-radius: 26rpx;
		background: #ffffff;
		border: 4rpx solid #d8e6f5;
		box-shadow: 0 10rpx 0 #b9cde0, 0 16rpx 22rpx rgba(0, 30, 70, 0.35);
		padding: 16rpx;
		box-sizing: border-box;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-content: space-between;
	}

	.dice.rolling {
		animation: dice-shake 0.28s linear infinite;
	}

	@keyframes dice-shake {
		0% { transform: translateY(0) rotate(-6deg); }
		50% { transform: translateY(-10rpx) rotate(6deg); }
		100% { transform: translateY(0) rotate(-6deg); }
	}

	.pip-slot {
		width: 32%;
		height: 32%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.pip {
		width: 24rpx;
		height: 24rpx;
		border-radius: 50%;
		background: transparent;
	}

	.pip-on {
		background: radial-gradient(circle at 35% 30%, #6a6a6a 0%, #2a2a2a 70%);
	}

	.roll-btn {
		margin-top: 16rpx;
		width: 300rpx;
		height: 80rpx;
		border-radius: 40rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(180deg, #ffd76a 0%, #ff9f1a 55%, #f2800a 100%);
		box-shadow: 0 8rpx 0 #c96a06, 0 12rpx 18rpx rgba(0, 30, 70, 0.32);
	}

	.roll-btn.disabled {
		opacity: 0.7;
	}

	.roll-text {
		font-size: 32rpx;
		font-weight: 700;
		letter-spacing: 4rpx;
		color: #6b3500;
	}

	.center-hint {
		margin-top: 14rpx;
		font-size: 20rpx;
		color: #d5ebff;
	}

	.mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 30;
		background: rgba(3, 24, 52, 0.72);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 40rpx;
		box-sizing: border-box;
	}

	.dialog {
		width: 100%;
		max-height: 88vh;
		padding: 30rpx 28rpx 34rpx;
		border-radius: 28rpx;
		background: #f7fbff;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
	}

	.dialog-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.dialog-type {
		padding: 6rpx 20rpx;
		border-radius: 18rpx;
		font-size: 22rpx;
		font-weight: 600;
		color: #ffffff;
		background: #2b8fe0;
	}

	.dialog-timer {
		font-size: 24rpx;
		font-weight: 600;
		color: #2b8fe0;
	}

	.dialog-timer.urgent {
		color: #e8402c;
	}

	.dialog-title {
		margin-top: 22rpx;
		font-size: 30rpx;
		line-height: 1.6;
		font-weight: 600;
		color: #17324f;
		text-align: justify;
	}

	.options {
		margin-top: 22rpx;
	}

	.option {
		display: flex;
		align-items: center;
		margin-bottom: 16rpx;
		padding: 20rpx 22rpx;
		border-radius: 18rpx;
		border: 2rpx solid #cfe3f7;
		background: #ffffff;
	}

	.option.selected {
		border-color: #2b8fe0;
		background: #eaf5ff;
	}

	.option.right {
		border-color: #38b06a;
		background: #e9fbef;
	}

	.option.wrong {
		border-color: #e8402c;
		background: #fdecea;
	}

	.option.locked {
		opacity: 0.95;
	}

	.opt-label {
		width: 48rpx;
		height: 48rpx;
		line-height: 48rpx;
		border-radius: 50%;
		text-align: center;
		font-size: 24rpx;
		font-weight: 700;
		color: #ffffff;
		background: #2b8fe0;
		margin-right: 18rpx;
		flex-shrink: 0;
	}

	.opt-text {
		flex: 1;
		font-size: 26rpx;
		line-height: 1.55;
		color: #24425f;
		text-align: justify;
	}

	.feedback {
		margin-top: 18rpx;
		padding: 18rpx 22rpx;
		border-radius: 18rpx;
	}

	.feedback.ok {
		background: #e9fbef;
	}

	.feedback.bad {
		background: #fdecea;
	}

	.feedback-title {
		display: block;
		font-size: 26rpx;
		font-weight: 600;
		color: #17324f;
	}

	.feedback-answer {
		display: block;
		margin-top: 8rpx;
		font-size: 23rpx;
		line-height: 1.5;
		color: #3f5b76;
	}
</style>
