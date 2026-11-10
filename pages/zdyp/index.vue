<template>
	<view class="page">
		<ZdypHeader title="职得一拼" @back="back" />

		<!-- 岗位选择：进入闯关前先选一套岗位 -->
		<view v-if="!career" class="selector">
			<view class="selector-tip">选择你感兴趣的岗位，开启拼图挑战</view>
			<scroll-view class="career-list" scroll-y>
				<view v-for="item in careers" :key="item.careerCode" class="career-item" @click="chooseCareer(item)">
					<text class="career-name">{{ item.careerName }}</text>
				</view>
			</scroll-view>
		</view>

		<!-- 闯关页 -->
		<view v-else class="game">
			<view class="topbar">
				<view class="career-tag">{{ career.careerName }}</view>
				<view class="timer" :class="{ urgent: remain <= 10 }">{{ remain }}s</view>
			</view>
			<view class="progress">
				<view class="progress-inner" :style="'width:' + progressPercent + '%'"></view>
			</view>

			<view class="board">
				<view v-for="slot in slots" :key="slot.slotCode" class="slot" :class="slotClass(slot)" @click="tapSlot(slot)">
					<text class="slot-label">{{ slot.slotName }}</text>
					<text v-if="placed[slot.slotCode]" class="slot-text">{{ placed[slot.slotCode].cardText }}</text>
					<text v-else class="slot-placeholder">点击放入卡片</text>
				</view>
			</view>

			<view class="hint">{{ hintText }}</view>

			<scroll-view class="card-tray" scroll-y>
				<view v-for="card in remainingCards" :key="card.cardId" class="card"
					:class="{ selected: selectedCardId === card.cardId }" @click="selectCard(card)">
					<text class="card-text">{{ card.cardText }}</text>
				</view>
				<view v-if="!remainingCards.length" class="card-empty">四张卡片都已放入卡槽</view>
			</scroll-view>

			<view class="submit-btn" :class="{ disabled: filledCount < 4 || submitting }" @click="submit(filledCount < 4)">
				<text class="submit-text">提交答案</text>
			</view>
		</view>
	</view>
</template>

<script>
	import ZdypHeader from '@/components/ZdypHeader.vue'
	import { getRecord, startRecord, submitRecord, userMessage } from '@/api/zdyp'

	/**
	 * 职得一拼闯关页：先选岗位，再把四张卡片放进对应维度卡槽。
	 * 倒计时以服务端 deadlineAt 为准，到点自动提交已放内容；判定与用时全部由服务端计算。
	 */
	export default {
		components: { ZdypHeader },
		data: () => ({
			recordId: '',
			instanceId: '',
			gameId: '',
			careers: [],
			career: null,
			slots: [],
			cards: [],
			placed: {},
			selectedCardId: null,
			attemptNo: null,
			deadlineAt: null,
			timeLimit: 45,
			remain: 45,
			timer: null,
			submitting: false,
			placeTimes: {},
			hintText: '先在下方选择一张卡片，再点击上方对应卡槽放入'
		}),
		computed: {
			remainingCards() {
				const used = Object.keys(this.placed).map((slot) => this.placed[slot].cardId)
				return this.cards.filter((card) => used.indexOf(card.cardId) < 0)
			},
			filledCount() {
				return Object.keys(this.placed).length
			},
			progressPercent() {
				if (!this.timeLimit) return 100
				return Math.max(0, Math.min(100, Math.round(this.remain * 100 / this.timeLimit)))
			}
		},
		async onLoad(options) {
			this.recordId = options.recordId || ''
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			if (!this.recordId) {
				uni.showToast({ title: '缺少参与记录，请重新扫码', icon: 'none' })
				return
			}
			await this.load()
		},
		onUnload() {
			this.stopTimer()
		},
		methods: {
			async load() {
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = res.data || {}
					this.careers = data.careers || []
					this.timeLimit = (data.setting && data.setting.timeLimit) || 45
					if (data.status === 'finished') {
						this.goResult()
						return
					}
					if (data.pendingAttempt) {
						this.applyAttempt(data.pendingAttempt)
						return
					}
					if (data.lastResult && data.lastResult.pass === false) {
						this.hintText = '上一次挑战未通过，换个岗位再试一次吧'
					}
				} catch (e) {
					uni.showToast({ title: userMessage(e, '闯关信息加载失败，请稍后重试'), icon: 'none' })
				}
			},
			async chooseCareer(item) {
				try {
					const res = await startRecord(this.recordId, item.careerCode)
					this.applyAttempt(res.data || {})
				} catch (e) {
					uni.showToast({ title: userMessage(e, '开始闯关失败，请稍后重试'), icon: 'none' })
				}
			},
			applyAttempt(data) {
				this.career = data.career || null
				this.attemptNo = data.attemptNo
				this.slots = data.slots || []
				this.cards = data.cards || []
				this.placed = {}
				this.placeTimes = {}
				this.selectedCardId = null
				this.deadlineAt = data.deadlineAt || null
				this.timeLimit = data.timeLimit || this.timeLimit
				this.hintText = '先在下方选择一张卡片，再点击上方对应卡槽放入'
				this.startTimer()
			},
			startTimer() {
				this.stopTimer()
				this.tick()
				this.timer = setInterval(() => this.tick(), 1000)
			},
			tick() {
				if (!this.deadlineAt) {
					this.remain = this.timeLimit || 45
					return
				}
				const left = Math.ceil((this.deadlineAt - Date.now()) / 1000)
				this.remain = left > 0 ? left : 0
				if (this.remain <= 0) {
					this.stopTimer()
					// 到点自动提交已放内容；服务端会按开始时间独立判定超时。
					this.submit(true)
				}
			},
			stopTimer() {
				if (this.timer) {
					clearInterval(this.timer)
					this.timer = null
				}
			},
			selectCard(card) {
				this.selectedCardId = this.selectedCardId === card.cardId ? null : card.cardId
				this.hintText = this.selectedCardId
					? '已选中卡片，请点击上方对应卡槽放入'
					: '先在下方选择一张卡片，再点击上方对应卡槽放入'
			},
			tapSlot(slot) {
				if (this.placed[slot.slotCode]) {
					// 再次点击已放卡片可取出，放回下方卡片区。
					const card = this.placed[slot.slotCode]
					this.$delete(this.placed, slot.slotCode)
					this.$delete(this.placeTimes, slot.slotCode)
					this.selectedCardId = card.cardId
					this.hintText = '已取出卡片，可重新选择卡槽'
					return
				}
				if (!this.selectedCardId) {
					uni.showToast({ title: '请先在下方选择一张卡片', icon: 'none' })
					return
				}
				const card = this.cards.find((item) => item.cardId === this.selectedCardId)
				if (!card) return
				this.$set(this.placed, slot.slotCode, card)
				this.$set(this.placeTimes, slot.slotCode, Date.now())
				this.selectedCardId = null
				this.hintText = this.filledCount === 4 ? '四张卡片已就位，点击下方提交答案' : '继续选择下一张卡片'
			},
			slotClass(slot) {
				return [
					'slot-' + slot.slotCode,
					this.placed[slot.slotCode] ? 'filled' : ''
				]
			},
			async submit(force) {
				if (this.submitting) return
				if (!force && this.filledCount < 4) {
					uni.showToast({ title: '四张卡片都放入后才能提交', icon: 'none' })
					return
				}
				this.submitting = true
				const startedAt = this.deadlineAt ? this.deadlineAt - (this.timeLimit || 45) * 1000 : Date.now()
				const placements = Object.keys(this.placed).map((slotCode) => {
					const placedAt = this.placeTimes[slotCode] || Date.now()
					return {
						slotCode,
						cardId: this.placed[slotCode].cardId,
						elapsedMs: Math.max(0, placedAt - startedAt)
					}
				})
				try {
					await submitRecord(this.recordId, this.attemptNo, placements)
					this.stopTimer()
					this.goResult()
				} catch (e) {
					uni.showToast({ title: userMessage(e, '提交答案失败，请稍后重试'), icon: 'none' })
					// 提交失败时恢复倒计时，避免页面停在 0 秒无法继续。
					if (this.deadlineAt && this.deadlineAt > Date.now()) {
						this.startTimer()
					}
				} finally {
					this.submitting = false
				}
			},
			goResult() {
				const base = `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
				uni.redirectTo({ url: `/pages/zdyp/result?${base}` })
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
		width: 100%;
		min-height: 100vh;
		background: #FCF3D8;
		display: flex;
		flex-direction: column;
	}

	.selector {
		flex: 1;
		padding: 120rpx 40rpx 40rpx;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
	}

	.selector-tip {
		font-size: 28rpx;
		color: #7A6A55;
		text-align: center;
		margin-bottom: 24rpx;
	}

	.career-list {
		flex: 1;
		height: 0;
	}

	.career-item {
		margin-bottom: 18rpx;
		padding: 28rpx 30rpx;
		background: #FFFFFF;
		border-radius: 24rpx;
		box-shadow: 0 6rpx 18rpx rgba(160, 120, 40, 0.08);
		border: 3rpx solid transparent;
	}

	.career-name {
		font-size: 30rpx;
		font-weight: 600;
		color: #3D3428;
	}

	.game {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 110rpx 32rpx 32rpx;
		box-sizing: border-box;
	}

	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.career-tag {
		max-width: 480rpx;
		padding: 10rpx 22rpx;
		border-radius: 22rpx;
		background: #FFFFFF;
		font-size: 24rpx;
		color: #8A6D3B;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.timer {
		min-width: 110rpx;
		padding: 10rpx 20rpx;
		border-radius: 22rpx;
		background: #FFFFFF;
		font-size: 30rpx;
		font-weight: 700;
		color: #EE8B3E;
		text-align: center;
	}

	.timer.urgent {
		color: #FFFFFF;
		background: #E45B4A;
	}

	.progress {
		margin-top: 18rpx;
		height: 12rpx;
		border-radius: 6rpx;
		background: #E7DCC2;
		overflow: hidden;
	}

	.progress-inner {
		height: 12rpx;
		border-radius: 6rpx;
		background: linear-gradient(90deg, #F5C443, #EE8B3E);
		transition: width 0.3s linear;
	}

	.board {
		margin-top: 28rpx;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
	}

	.slot {
		width: 330rpx;
		height: 300rpx;
		margin-bottom: 18rpx;
		padding: 20rpx 22rpx;
		box-sizing: border-box;
		border-radius: 28rpx;
		display: flex;
		flex-direction: column;
	}

	.slot-content {
		background: #F6C6A6;
		border: 4rpx solid #EE8B3E;
	}

	.slot-skill {
		background: #FBE3A6;
		border: 4rpx solid #F5C443;
	}

	.slot-weakness {
		background: #D8CBE8;
		border: 4rpx solid #9B7BC4;
	}

	.slot-prospect {
		background: #FBD3E2;
		border: 4rpx solid #F3A7C6;
	}

	.slot.filled {
		box-shadow: 0 8rpx 20rpx rgba(160, 120, 40, 0.18);
	}

	.slot-label {
		font-size: 28rpx;
		font-weight: 700;
		color: #4A3B2A;
	}

	.slot-text {
		margin-top: 12rpx;
		flex: 1;
		font-size: 22rpx;
		line-height: 1.55;
		color: #4A3B2A;
		overflow: hidden;
	}

	.slot-placeholder {
		margin-top: 12rpx;
		flex: 1;
		font-size: 22rpx;
		color: rgba(74, 59, 42, 0.5);
	}

	.hint {
		margin-top: 4rpx;
		font-size: 23rpx;
		color: #8A6D3B;
		text-align: center;
	}

	.card-tray {
		flex: 1;
		height: 0;
		margin-top: 16rpx;
		padding: 6rpx 2rpx;
		box-sizing: border-box;
	}

	.card {
		margin-bottom: 16rpx;
		padding: 22rpx 26rpx;
		background: #FFFFFF;
		border-radius: 22rpx;
		border: 4rpx solid #F1E3C4;
		box-shadow: 0 6rpx 16rpx rgba(160, 120, 40, 0.07);
	}

	.card.selected {
		border-color: #EE8B3E;
		background: #FFF6EC;
	}

	.card-text {
		font-size: 23rpx;
		line-height: 1.6;
		color: #4A3B2A;
	}

	.card-empty {
		padding: 30rpx 0;
		text-align: center;
		font-size: 24rpx;
		color: #A99878;
	}

	.submit-btn {
		margin-top: 12rpx;
		height: 100rpx;
		border-radius: 50rpx;
		background: linear-gradient(180deg, #F6A34B 0%, #EE8B3E 100%);
		box-shadow: 0 10rpx 24rpx rgba(214, 126, 40, 0.26);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.submit-btn.disabled {
		opacity: 0.55;
	}

	.submit-text {
		font-size: 34rpx;
		font-weight: 700;
		color: #FFFFFF;
		letter-spacing: 4rpx;
	}
</style>
