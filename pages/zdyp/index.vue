<template>
	<view class="page">
		<image class="stage-bg" :src="assets.gameEmpty" mode="scaleToFill"></image>

		<!-- 进度条：底图已抹掉原进度，这里按剩余时间重绘 -->
		<view class="track" style="left:40rpx;top:243rpx;width:670rpx;height:9rpx"></view>
		<view class="track-fill" :style="'left:40rpx;top:243rpx;height:9rpx;width:' + progressWidth + 'rpx'"></view>

		<!-- 上方拼图内是四张卡片内容（每局随机排序），点击选中 -->
		<view v-for="(card, index) in cards" :key="card.cardId" class="card-cell"
			:class="{ selected: selectedCardId === card.cardId, used: usedIds.indexOf(card.cardId) > -1 }"
			:style="cardStyle(index)" @click="selectCard(card)">
			<image class="badge" :src="assets.badges[(card.cardNo - 1) % 4]" mode="widthFix"></image>
			<text class="card-text">{{ card.cardText }}</text>
			<text v-if="usedIds.indexOf(card.cardId) > -1" class="used-tag">已放入</text>
		</view>

		<!-- 下方四个维度方格：选中卡片后点击方格放入 -->
		<view v-for="(slot, index) in slots" :key="slot.slotCode" class="slot-wrap" :style="slotWrapStyle(index)">
			<text class="slot-label">{{ slot.slotName }}</text>
			<view class="slot" :class="{ filled: !!placed[slot.slotCode] }" @click="tapSlot(slot)">
				<text v-if="placed[slot.slotCode]" class="slot-no">{{ placed[slot.slotCode].cardNo }}</text>
				<text v-else class="slot-plus">+</text>
			</view>
		</view>

		<view class="submit" :class="{ disabled: filledCount < 4 }" @click="submit(false)">
			{{ submitting ? '提交中…' : (filledCount < 4 ? '还差 ' + (4 - filledCount) + ' 张' : '提交答案') }}
		</view>

		<!-- 选岗位面板 -->
		<view v-if="careerTrayVisible" class="tray-mask">
			<view class="tray tray-career" @click.stop>
				<view class="tray-head">
					<text class="tray-title">选择一套岗位，开始拼图挑战</text>
				</view>
				<scroll-view class="career-scroll" scroll-y>
					<view v-for="item in careers" :key="item.careerCode" class="career-row" @click="chooseCareer(item.careerCode)">
						<text class="career-name">{{ item.careerName }}</text>
						<text class="career-arrow">›</text>
					</view>
				</scroll-view>
			</view>
		</view>

		<ZdypHeader title="职得一拼" @back="back" />
	</view>
</template>

<script>
	import ZdypHeader from '@/components/ZdypHeader.vue'
	import assets from '@/config/zdyp-assets.js'
	import { getRecord, startRecord, submitRecord, userMessage } from '@/api/zdyp'

	/**
	 * 职得一拼闯关页。
	 * 上方拼图里是四张卡片内容（每局由服务端随机排序），点击卡片选中，再点击下方四个维度方格放入；
	 * 四格填满后提交，倒计时与判定以服务端为准，到点自动提交已放入的卡片。
	 */
	export default {
		components: { ZdypHeader },
		data: () => ({
			assets,
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
			careerTrayVisible: false,
			placeTimes: {}
		}),
		computed: {
			usedIds() {
				return Object.keys(this.placed).map((key) => this.placed[key].cardId)
			},
			filledCount() {
				return Object.keys(this.placed).length
			},
			progressWidth() {
				if (!this.timeLimit) return 670
				return Math.max(0, Math.min(670, Math.round(this.remain * 670 / this.timeLimit)))
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
					this.slots = data.slots || []
					if (data.status === 'finished') {
						this.goResult()
						return
					}
					if (data.pendingAttempt) {
						this.applyAttempt(data.pendingAttempt)
					} else {
						this.careerTrayVisible = true
					}
				} catch (e) {
					uni.showToast({ title: userMessage(e, '闯关信息加载失败，请稍后重试'), icon: 'none' })
				}
			},
			async chooseCareer(code) {
				try {
					const res = await startRecord(this.recordId, code)
					this.careerTrayVisible = false
					this.applyAttempt(res.data || {})
				} catch (e) {
					uni.showToast({ title: userMessage(e, '开始闯关失败，请稍后重试'), icon: 'none' })
				}
			},
			applyAttempt(data) {
				this.career = data.career || null
				this.attemptNo = data.attemptNo
				this.slots = data.slots || this.slots
				// 旧版服务端未返回编号时按返回顺序补 1-4，避免编号徽章取不到。
				this.cards = (data.cards || []).map((card, index) => ({
					cardId: card.cardId,
					cardText: card.cardText,
					cardNo: card.cardNo || index + 1
				}))
				this.placed = {}
				this.placeTimes = {}
				this.selectedCardId = null
				this.deadlineAt = data.deadlineAt || null
				this.timeLimit = data.timeLimit || this.timeLimit
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
					this.submit(true)
				}
			},
			stopTimer() {
				if (this.timer) {
					clearInterval(this.timer)
					this.timer = null
				}
			},
			/** 四张卡片在拼图区的位置：左上、右上、左下、右下 */
			cardStyle(index) {
				const rects = [
					'left:72rpx;top:507rpx;width:302rpx;height:297rpx',
					'left:374rpx;top:507rpx;width:302rpx;height:297rpx',
					'left:72rpx;top:804rpx;width:302rpx;height:298rpx',
					'left:374rpx;top:804rpx;width:302rpx;height:298rpx'
				]
				return rects[index] || ''
			},
			/** 下方四个维度方格位置，与设计稿底部一排方格一致 */
			slotWrapStyle(index) {
				const lefts = [48, 218, 388, 558]
				return `left:${lefts[index] || 48}rpx;top:1105rpx`
			},
			selectCard(card) {
				if (this.usedIds.indexOf(card.cardId) > -1) {
					uni.showToast({ title: '这张卡片已经放入了方格', icon: 'none' })
					return
				}
				this.selectedCardId = this.selectedCardId === card.cardId ? null : card.cardId
			},
			tapSlot(slot) {
				if (this.placed[slot.slotCode]) {
					this.$delete(this.placed, slot.slotCode)
					this.$delete(this.placeTimes, slot.slotCode)
					this.selectedCardId = null
					return
				}
				if (!this.selectedCardId) {
					uni.showToast({ title: '请先在上方选择一张卡片', icon: 'none' })
					return
				}
				const card = this.cards.find((item) => item.cardId === this.selectedCardId)
				if (!card) return
				this.$set(this.placed, slot.slotCode, card)
				this.$set(this.placeTimes, slot.slotCode, Date.now())
				this.selectedCardId = null
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
		position: relative;
		width: 750rpx;
		height: 1624rpx;
		min-height: 100vh;
		background: #FEF2CA;
		overflow: hidden;
	}

	.stage-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 750rpx;
		height: 1624rpx;
	}

	.track {
		position: absolute;
		background: #B3B3B3;
		border-radius: 6rpx;
		z-index: 2;
	}

	.track-fill {
		position: absolute;
		background: #F0A250;
		border-radius: 6rpx;
		z-index: 3;
		transition: width 0.3s linear;
	}

	.card-cell {
		position: absolute;
		z-index: 4;
		padding: 42rpx 16rpx 16rpx;
		box-sizing: border-box;
		border-radius: 22rpx;
		background: rgba(255, 255, 255, 0.82);
		border: 4rpx solid rgba(255, 255, 255, 0.9);
		overflow: hidden;
	}

	.card-cell.selected {
		border-color: #EE8B3E;
		background: rgba(255, 246, 236, 0.96);
		box-shadow: 0 8rpx 20rpx rgba(214, 126, 40, 0.24);
	}

	.card-cell.used {
		opacity: 0.45;
	}

	.badge {
		position: absolute;
		left: 8rpx;
		top: 8rpx;
		width: 46rpx;
		height: 46rpx;
	}

	.card-text {
		font-size: 21rpx;
		line-height: 1.45;
		color: #3D3428;
	}

	.used-tag {
		position: absolute;
		right: 12rpx;
		bottom: 10rpx;
		font-size: 18rpx;
		color: #B0752B;
	}

	.slot-wrap {
		position: absolute;
		z-index: 5;
		width: 145rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.slot-label {
		font-size: 20rpx;
		color: #6B5B45;
		height: 30rpx;
		line-height: 30rpx;
	}

	.slot {
		width: 145rpx;
		height: 145rpx;
		margin-top: 8rpx;
		border-radius: 16rpx;
		background: #FFE986;
		border: 4rpx dashed #E0BE71;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.slot.filled {
		background: #FFF3C4;
		border-style: solid;
		border-color: #EE8B3E;
	}

	.slot-plus {
		font-size: 44rpx;
		color: #C9A85E;
	}

	.slot-no {
		font-size: 64rpx;
		font-weight: 600;
		color: #4A3B2A;
	}

	.submit {
		position: absolute;
		left: 42rpx;
		top: 1420rpx;
		width: 665rpx;
		height: 96rpx;
		line-height: 96rpx;
		text-align: center;
		border-radius: 48rpx;
		background: #F4AB4F;
		color: #684822;
		font-size: 36rpx;
		font-weight: 600;
		letter-spacing: 4rpx;
		z-index: 6;
	}

	.submit.disabled {
		background: #EBC98F;
	}

	.tray-mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 20;
		background: rgba(0, 0, 0, 0.18);
	}

	.tray {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		background: #FFFFFF;
		border-radius: 40rpx 40rpx 0 0;
		padding: 28rpx 30rpx 40rpx;
		box-sizing: border-box;
	}

	.tray-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 60rpx;
	}

	.tray-title {
		font-size: 28rpx;
		font-weight: 600;
		color: #3D3428;
	}

	.tray-career {
		height: 1080rpx;
	}

	.career-scroll {
		margin-top: 16rpx;
		height: 940rpx;
	}

	.career-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 30rpx 24rpx;
		margin-bottom: 14rpx;
		border-radius: 20rpx;
		background: #FFFDF8;
		border: 3rpx solid #F3E7CC;
	}

	.career-name {
		font-size: 28rpx;
		font-weight: 600;
		color: #3D3428;
	}

	.career-arrow {
		font-size: 34rpx;
		color: #C9B58D;
	}
</style>
