<template>
	<view class="page">
		<image class="page-sky" src="/static/zyfxq/board/sky.jpg" mode="scaleToFill" />
		<view class="scene-header">
			<view class="topbar" :style="{ paddingTop: statusBarHeight + 'px' }">
				<view class="back" :style="{ top: statusBarHeight + 'px' }" @click="back">‹</view>
				<view class="timer">
					<image class="pill" :src="assets.pillTimer" mode="scaleToFill" />
					<image class="timer-icon" :src="assets.iconClock" mode="aspectFit" />
					<text :class="timerTextClass">{{ remainText }}</text>
				</view>
			</view>

			<view class="status-row">
				<view class="player">
					<image class="pill" src="/static/zyfxq/board/player-card.png" mode="scaleToFill" />
					<image class="player-icon" :src="assets.iconPawn" mode="aspectFit" />
					<text class="player-text">当前玩家</text>
				</view>
				<view class="step">
					<image class="step-art" :src="assets.badgeStep" mode="scaleToFill" />
					<view class="step-inner">
						<text class="step-label">步数</text>
						<text class="step-value">{{ diceValue > 0 ? diceValue : '-' }}</text>
					</view>
				</view>
			</view>
		</view>

		<view class="board">
			<image class="board-art" :src="assets.boardBg" mode="scaleToFill" />

			<view class="cell-slot" :style="slotStyle(startSlot)">
				<image class="start-mask" :src="assets.cellStart" mode="scaleToFill" />
				<view v-if="position === 0" class="token">
					<image class="token-art" :src="assets.pawnToken" mode="aspectFit" />
				</view>
			</view>

			<view v-for="cell in cells" :key="cell.cellNo" class="cell-slot" :style="slotStyle(cell)">
				<view :class="cellClass(cell)" :style="'background-color:' + cell.cellColor">
					<image v-if="cellArtwork(cell)" class="cell-art" :src="cellArtwork(cell)" mode="scaleToFill" />
					<view v-else class="cell-content">
						<view class="cell-badge"><text class="cell-no">{{ cell.cellNo }}</text></view>
						<text v-if="cell.cellLabel" class="cell-label">{{ cell.cellLabel }}</text>
					</view>
					<view v-if="position === cell.cellNo" class="token">
						<image class="token-art" :src="assets.pawnToken" mode="aspectFit" />
					</view>
				</view>
			</view>

			<image class="sticker-go" :src="assets.stickerGo" mode="aspectFit" />
			<image class="deco-party" :src="assets.decoParty" mode="aspectFit" />
			<image class="deco-toy" src="/static/zyfxq/board/toy.png" mode="aspectFit" />
			<image class="start-arrow" src="/static/zyfxq/board/arrow.png" mode="aspectFit" />

			<view class="center">
				<image class="center-logo" :src="assets.boardLogo" mode="aspectFit" />
				<view class="center-rule">
					<image class="center-title" :src="assets.rulesTitle" mode="aspectFit" />
					<!-- <text class="center-rule-text">摇骰前进，落在答题格弹出题目；答对继续摇骰，答错或超时后退 {{ backSteps }} 格；3 分钟内抵达终点即通关。</text> -->
					<text class="center-rule-text">游戏开始，掷骰决定前进步数，棋子按点数移动；抵达格子需完成指定任务，未完成任务则需后退两格，3分钟内抵达终点即可通关。</text>
				</view>
			</view>
		</view>

		<view class="play">
			<view class="dice-hit" @click="roll">
				<view :class="diceClass">
					<view class="dice-face dice-front">
						<view v-for="slot in pipSlots" :key="slot" class="pip-slot">
							<view :class="'pip ' + (pipOn(slot) ? 'pip-on' : '')"></view>
						</view>
					</view>
				</view>
			</view>
			<text class="roll-result">{{ rolling ? '骰子投掷中…' : (diceValue > 0 ? `本次掷出 ${diceValue} 点` : rollHint) }}</text>
		</view>

		<view v-if="questionVisible" class="mask">
			<view class="dialog">
				<image class="dialog-art" src="/static/zyfxq/board/question-frame.png" mode="scaleToFill" />
				<view class="dialog-inner">
					<view class="dialog-head">
						<text class="dialog-type">{{ question.questionTypeName }}</text>
						<text :class="questionTimerClass">限时 {{ questionRemain > 0 ? questionRemain : 0 }} 秒</text>
					</view>
					<view class="question-card"><text class="dialog-title">{{ question.title }}</text></view>
					<view class="options">
						<view v-for="(opt, index) in question.options" :key="opt.label" :class="optionClass(index, opt)"
							@click="choose(opt)">
							<text class="opt-text">{{ opt.label }}、{{ opt.content }}</text>
						</view>
					</view>
					<view v-if="feedback.show" :class="feedbackClass">
						<text class="feedback-title">{{ feedbackTitle }}</text>
						<text class="feedback-answer">正确答案：{{ feedback.correctLabel }}. {{ feedback.correctContent }}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { getRecord, rollDice, submitAnswer, startRecord, userMessage } from '@/api/zyfxq'
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
			diceValue: 0,
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
			rollSettleTimerId: null,
			resultHoldTimerId: null,
			statusBarHeight: 30,
			leaving: false
		}),
		computed: {
			remainText() {
				const total = Math.max(0, Number(this.remaining) || 0)
				const minute = String(Math.floor(total / 60)).padStart(2, '0')
				const second = String(total % 60).padStart(2, '0')
				return `${minute}:${second}`
			},
			timerTextClass() {
				return this.remaining <= 30 ? 'timer-text urgent' : 'timer-text'
			},
			diceClass() {
				return this.rolling ? 'dice rolling' : 'dice'
			},
			rollHint() {
				if (this.questionVisible) return '请先完成答题'
				if (this.busy) return '请稍候…'
				return '点击骰子掷出点数'
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
				if (data.diceValue) {
					this.diceValue = Number(data.diceValue)
					this.diceFace = this.diceValue
				}
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
				const size = cell === this.startSlot || Number(cell.cellNo) === 19 ? 122 : 98
				return `left:${35 + col * 109}rpx;top:${27 + row * 109}rpx;width:${size}rpx;height:${size}rpx;`
			},
			/** 默认格子使用设计素材；后台修改配色或文案后继续展示实际配置。 */
			cellArtwork(cell) {
				const colors = ['FD9452', 'A174D1', '4CC89A', 'F7B11E', 'F84D2D', 'FD9452', 'A174D1', '4CC89A', 'F7B11E', 'FD9452', 'F84D2D', 'F7B11E', 'FD9452', 'A174D1', '4CC89A', 'F7B11E', 'F84D2D', 'FD9452', 'F8B62D']
				const no = Number(cell.cellNo)
				const label = [3, 9, 15].includes(no) ? '情景任务卡' : ([6, 10, 12, 16, 18].includes(no) ? '职业问答' : (no === 19 ? '终点' : ''))
				return String(cell.cellColor).toUpperCase() === '#' + colors[no - 1] && (cell.cellLabel || '') === label
					? `/static/zyfxq/board/cell-${no}.png` : ''
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
				const rollStartedAt = Date.now()
				// 转动动画与网络请求并行；最终点数以服务端返回为准。
				this.rollTimerId = setInterval(() => {
					this.diceFace = 1 + Math.floor(Math.random() * 6)
				}, 180)
				rollDice(this.recordId).then(res => {
					const data = res.data || {}
					const result = data.rollResult || {}
					const settle = () => {
						this.rollSettleTimerId = null
						this.stopRollAnimation()
						if (result.dice) {
							this.diceValue = Number(result.dice)
							this.diceFace = this.diceValue
						}
						if (data.status === 'finished' || result.reachedEnd) {
							this.position = Number(data.position) || 19
							this.rollCount = Number(data.rollCount) || this.rollCount + 1
							this.stepTotal = Number(data.stepTotal) || this.stepTotal
							this.finished = true
							this.clearTimers()
							uni.showToast({ title: '抵达终点，通关成功', icon: 'none' })
							this.resultHoldTimerId = setTimeout(() => this.goResult('win'), 1000)
							return
						}
						this.resultHoldTimerId = setTimeout(() => {
							this.resultHoldTimerId = null
							this.syncState(data, false)
							if (data.currentQuestion) this.openQuestion(data.currentQuestion)
							else this.busy = false
						}, 1000)
					}
					this.rollSettleTimerId = setTimeout(settle, Math.max(0, 1200 - (Date.now() - rollStartedAt)))
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
				if (this.rollSettleTimerId) {
					clearTimeout(this.rollSettleTimerId)
					this.rollSettleTimerId = null
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
				if (this.resultHoldTimerId) {
					clearTimeout(this.resultHoldTimerId)
					this.resultHoldTimerId = null
				}
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
		background: #4ab3ee;
	}

	.page-sky {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
	}

	.scene-header {
		position: relative;
		width: 750rpx;
		height: 444rpx;
		flex-shrink: 0;
	}

	.topbar {
		position: relative;
		z-index: 3;
		width: 100%;
		box-sizing: border-box;
		display: flex;
		justify-content: center;
	}

	.back {
		position: absolute;
		left: 24rpx;
		width: 56rpx;
		height: 56rpx;
		line-height: 48rpx;
		border-radius: 50%;
		text-align: center;
		font-size: 46rpx;
		color: #fff;
		background: rgba(255, 255, 255, .28);
	}

	.timer {
		position: relative;
		width: 378rpx;
		height: 74rpx;
		margin-top: 48rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.pill {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
	}

	.timer-icon {
		position: relative;
		width: 52rpx;
		height: 62rpx;
		margin-right: 38rpx;
	}

	.timer-text {
		position: relative;
		font-size: 56rpx;
		font-weight: 700;
		letter-spacing: 2rpx;
		line-height: 1;
		color: #fff;
	}

	.timer-text.urgent {
		color: #fff0b3;
	}

	.status-row {
		position: relative;
		z-index: 2;
		margin: 60rpx 23rpx 0 29rpx;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}

	.player {
		position: relative;
		width: 210rpx;
		height: 110rpx;
		display: flex;
		align-items: center;
		padding: 0 12rpx;
		box-sizing: border-box;
	}

	.player-icon {
		position: relative;
		width: 48rpx;
		height: 64rpx;
		margin-right: 10rpx;
		flex-shrink: 0;
	}

	.player-text {
		position: relative;
		font-size: 28rpx;
		font-weight: 700;
		color: #064570;
		white-space: nowrap;
	}

	.step {
		position: relative;
		width: 258rpx;
		height: 169rpx;
		margin-top: -60rpx;
	}

	.step-art {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
	}

	.step-inner {
		position: absolute;
		left: 0;
		bottom: 0;
		width: 210rpx;
		height: 110rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.step-label {
		font-size: 31rpx;
		font-weight: 700;
		color: #a75a14;
	}

	.step-value {
		margin-left: 6rpx;
		font-size: 80rpx;
		line-height: 1;
		font-weight: 800;
		color: #f68b20;
	}

	.board {
		position: relative;
		width: 750rpx;
		height: 810rpx;
		flex-shrink: 0;
	}

	.board-art {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
	}

	.cell-slot {
		position: absolute;
		box-sizing: border-box;
	}

	.cell {
		position: relative;
		width: 100%;
		height: 100%;
		box-sizing: border-box;
	}

	.cell-art,
	.cell-content {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
	}

	.cell-content {
		border: 2rpx solid #fff;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.cell.active {
		box-shadow: 0 0 0 3rpx #ffe066, 0 0 16rpx rgba(255, 224, 102, .6);
	}

	.cell-badge {
		width: 32rpx;
		height: 32rpx;
		border-radius: 50%;
		background: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.cell-no {
		font-size: 29rpx;
		line-height: 32rpx;
		font-weight: 700;
		color: #ef803d;
	}

	.cell-label {
		margin-top: 9rpx;
		font-size: 18rpx;
		line-height: 1.2;
		color: #fff;
		text-align: center;
		font-weight: 700;
	}

	.start-mask {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
	}

	.token {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 58rpx;
		height: 78rpx;
		margin-left: -29rpx;
		margin-top: -39rpx;
		z-index: 3;
	}

	.token-art {
		width: 100%;
		height: 100%;
	}

	.sticker-go {
		position: absolute;
		left: 4rpx;
		top: 365rpx;
		width: 82rpx;
		height: 48rpx;
	}

	.deco-party {
		position: absolute;
		right: 5rpx;
		top: 320rpx;
		width: 78rpx;
		height: 88rpx;
	}

	.deco-toy {
		position: absolute;
		left: 400rpx;
		top: 4rpx;
		width: 66rpx;
		height: 55rpx;
	}

	.start-arrow {
		position: absolute;
		left: 487rpx;
		top: 650rpx;
		width: 91rpx;
		height: 75rpx;
	}

	.center {
		position: absolute;
		left: 157rpx;
		top: 178rpx;
		width: 430rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.center-logo {
		width: 375rpx;
		height: 300rpx;
	}

	.center-rule {
		position: relative;
		width: 430rpx;
		margin-top: 78rpx;
		padding: 12rpx 5rpx 10rpx;
		border: 1rpx solid #fff;
		box-sizing: border-box;
	}

	.center-title {
		position: absolute;
		left: 50%;
		top: -66rpx;
		width: 206rpx;
		height: 57rpx;
		margin-left: -103rpx;
	}

	.center-rule-text {
		display: block;
		font-size: 19rpx;
		line-height: 1.65;
		letter-spacing: 1rpx;
		color: #fff;
		font-weight: 600;
		text-align: center;
	}

	.play {
		position: relative;
		flex: 1;
		min-height: 368rpx;
		width: 100%;
		box-sizing: border-box;
		padding-top: 50rpx;
		padding-bottom: calc(28rpx + env(safe-area-inset-bottom));
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.dice-hit {
		width: 290rpx;
		height: 220rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.dice {
		position: relative;
		width: 190rpx;
		height: 190rpx;
	}

	.dice-face {
		position: absolute;
		left: 0;
		top: 0;
		width: 190rpx;
		height: 190rpx;
		border-radius: 30rpx;
		padding: 20rpx;
		border: 2rpx solid #e3bca8;
		box-sizing: border-box;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-content: space-between;
	}

	.dice-front {
		background: #fffaf5;
		box-shadow: 0 12rpx 0 #d99472, 0 18rpx 24rpx rgba(30, 64, 88, .24), inset 0 0 0 4rpx #fff;
	}

	.dice.rolling {
		animation: dice-shake .55s ease-in-out infinite;
	}

	@keyframes dice-shake {

		0%,
		100% {
			transform: translateY(0) rotate(-5deg) scale(1);
		}

		50% {
			transform: translateY(-12rpx) rotate(5deg) scale(1.04);
		}
	}

	.pip-slot {
		width: 32%;
		height: 32%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.pip {
		width: 36rpx;
		height: 36rpx;
		border-radius: 50%;
		background: transparent;
	}

	.pip-on {
		background: radial-gradient(circle at 35% 30%, #3d2419, #684936 75%);
		box-shadow: inset 1rpx 2rpx 3rpx #21160f, 0 1rpx 1rpx #fff;
	}

	.pip-red {
		background: radial-gradient(circle at 35% 30%, #ff6688, #d70f40 75%);
		box-shadow: inset 1rpx 2rpx 3rpx #b61035, 0 1rpx 1rpx #fff;
	}

	.roll-result {
		min-height: 48rpx;
		margin-top: 12rpx;
		font-size: 32rpx;
		font-weight: 700;
		color: #064570;
		text-shadow: 0 1rpx 2rpx rgba(255, 255, 255, .9);
	}

	.mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 30;
		background: rgba(0, 0, 0, .48);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24rpx 35rpx;
		box-sizing: border-box;
	}

	.dialog {
		position: relative;
		width: 680rpx;
		max-height: calc(100vh - 48rpx);
		box-sizing: border-box;
	}

	.dialog-art {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
	}

	.dialog-inner {
		position: relative;
		padding: 66rpx 55rpx 74rpx;
		max-height: calc(100vh - 48rpx);
		box-sizing: border-box;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.dialog-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16rpx;
	}

	.dialog-type,
	.dialog-timer {
		font-size: 22rpx;
		line-height: 30rpx;
		font-weight: 600;
		color: #387da3;
	}

	.dialog-timer.urgent {
		color: #db4327;
	}

	.question-card {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 120rpx;
		padding: 22rpx 24rpx;
		border: 2rpx solid #ffb333;
		border-radius: 22rpx;
		background: #ffedd1;
		box-sizing: border-box;
	}

	.dialog-title {
		font-size: 32rpx;
		line-height: 1.6;
		font-weight: 700;
		color: #593100;
		text-align: center;
		overflow-wrap: break-word;
	}

	.options {
		margin-top: 26rpx;
		padding: 0 14rpx;
	}

	.option {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100rpx;
		margin-top: 16rpx;
		padding: 18rpx 24rpx;
		border-radius: 42rpx;
		border: 2rpx solid transparent;
		background: #fff5e5;
		box-shadow: 0 3rpx 0 #f8dbac;
		box-sizing: border-box;
	}

	.option:first-child {
		margin-top: 0;
	}

	.option.selected {
		border-color: #eaa72b;
		background: #ffedc6;
	}

	.option.right {
		border-color: #38b06a;
		background: #e9fbef;
		box-shadow: 0 3rpx 0 #a5dfba;
	}

	.option.wrong {
		border-color: #e8402c;
		background: #fdecea;
		box-shadow: 0 3rpx 0 #f3b9b1;
	}

	.option.locked {
		opacity: .95;
	}

	.opt-text {
		flex: 1;
		font-size: 27rpx;
		line-height: 1.5;
		color: #593100;
		text-align: center;
		overflow-wrap: break-word;
	}

	.feedback {
		margin-top: 22rpx;
		padding: 16rpx 20rpx;
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
		font-size: 25rpx;
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
