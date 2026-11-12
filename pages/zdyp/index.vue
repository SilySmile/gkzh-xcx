<template>
	<view class="page">
		<image class="stage-bg" :src="assets.gameEmpty" mode="scaleToFill"></image>

		<!-- 进度条：底图已抹掉原进度，这里按剩余时间重绘 -->
		<view class="track" style="left:40rpx;top:243rpx;width:670rpx;height:9rpx"></view>
		<view class="track-fill" :style="'left:40rpx;top:243rpx;height:9rpx;width:' + progressWidth + 'rpx'"></view>

		<!-- 下方四个格子：点击后弹出拼图碎片面板，选一块填入 -->
		<view v-for="(slot, index) in slots" :key="slot.slotCode" class="slot"
			:class="{ filled: !!placed[slot.slotCode] }" :style="slotStyle(index)" @click="tapSlot(slot)">
			<text v-if="placed[slot.slotCode]" class="slot-no">{{ placed[slot.slotCode].cardNo }}</text>
			<text v-else class="slot-plus">+</text>
		</view>

		<!-- 拼图碎片面板：还原设计稿拼图4 的白色上浮面板 -->
		<view v-if="trayVisible" class="tray-mask" @click="closeTray">
			<view class="tray" @click.stop>
				<view class="tray-head">
					<text class="tray-title">选择一块拼图放入第 {{ activeIndex + 1 }} 格</text>
					<text class="tray-close" @click="closeTray">×</text>
				</view>
				<view class="tray-grid">
					<view v-for="card in remainingCards" :key="card.cardId" class="piece-cell" @click="placeCard(card)">
						<view class="piece-art">
							<image class="piece" :src="assets.pieces[(card.cardNo - 1) % 4]" mode="widthFix"></image>
							<image class="badge" :src="assets.badges[(card.cardNo - 1) % 4]" mode="widthFix"></image>
						</view>
						<text class="piece-text">{{ card.cardText }}</text>
					</view>
					<view v-if="!remainingCards.length" class="piece-empty">四块拼图都已放入格子</view>
				</view>
			</view>
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
	 * 职得一拼闯关页：按设计稿拼图4 的交互实现。
	 * 点击下方四个格子中的任意一个，弹出白色面板展示剩余拼图碎片（带编号与卡片正文），
	 * 选一块填入该格子；四格填满后自动提交，判定与用时以服务端为准。
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
			attemptNo: null,
			deadlineAt: null,
			timeLimit: 45,
			remain: 45,
			timer: null,
			submitting: false,
			careerTrayVisible: false,
			trayVisible: false,
			activeIndex: 0,
			placeTimes: {}
		}),
		computed: {
			remainingCards() {
				const used = Object.keys(this.placed).map((key) => this.placed[key].cardId)
				return this.cards.filter((card) => used.indexOf(card.cardId) < 0)
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
				// 旧版服务端未返回编号时按返回顺序补 1-4，避免碎片编号取不到。
				this.cards = (data.cards || []).map((card, index) => ({
					cardId: card.cardId,
					cardText: card.cardText,
					cardNo: card.cardNo || index + 1
				}))
				this.placed = {}
				this.placeTimes = {}
				this.trayVisible = false
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
			/** 下方四个格子的位置，与设计稿底部一排方格一致 */
			slotStyle(index) {
				const lefts = [48, 218, 388, 558]
				return `left:${lefts[index] || 48}rpx;top:1340rpx`
			},
			tapSlot(slot) {
				const index = this.slots.findIndex((item) => item.slotCode === slot.slotCode)
				this.activeIndex = index < 0 ? 0 : index
				if (this.placed[slot.slotCode]) {
					// 已填入的格子再次点击 = 取出这块拼图，重新选
					this.$delete(this.placed, slot.slotCode)
					this.$delete(this.placeTimes, slot.slotCode)
				}
				if (!this.cards.length) {
					this.careerTrayVisible = true
					return
				}
				this.trayVisible = true
			},
			closeTray() {
				this.trayVisible = false
			},
			placeCard(card) {
				const slot = this.slots[this.activeIndex]
				if (!slot) return
				this.$set(this.placed, slot.slotCode, card)
				this.$set(this.placeTimes, slot.slotCode, Date.now())
				this.trayVisible = false
				// 四格填满后自动提交，符合设计稿“填完即校验”的流程
				if (this.filledCount === 4) {
					setTimeout(() => this.submit(false), 300)
				}
			},
			async submit(force) {
				if (this.submitting) return
				if (!force && this.filledCount < 4) {
					uni.showToast({ title: '四块拼图都放入后才能提交', icon: 'none' })
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

	.slot {
		position: absolute;
		z-index: 4;
		width: 145rpx;
		height: 145rpx;
		background: #FFE986;
		border-radius: 16rpx;
		border: 4rpx dashed #E0BE71;
		box-sizing: border-box;
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
		height: 1004rpx;
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

	.tray-close {
		font-size: 44rpx;
		color: #A99878;
		padding: 0 10rpx;
	}

	.tray-grid {
		margin-top: 12rpx;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
	}

	.piece-cell {
		width: 330rpx;
		height: 410rpx;
		margin-bottom: 16rpx;
		padding: 12rpx 16rpx;
		box-sizing: border-box;
		border-radius: 24rpx;
		border: 3rpx solid #F3E7CC;
		background: #FFFDF8;
		display: flex;
		flex-direction: column;
	}

	.piece-art {
		position: relative;
		height: 150rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.piece {
		width: 130rpx;
	}

	.badge {
		position: absolute;
		left: 4rpx;
		top: 0;
		width: 52rpx;
		height: 52rpx;
	}

	.piece-text {
		margin-top: 8rpx;
		font-size: 20rpx;
		line-height: 1.5;
		color: #4A3B2A;
		overflow: hidden;
	}

	.piece-empty {
		width: 100%;
		padding: 60rpx 0;
		text-align: center;
		font-size: 26rpx;
		color: #A99878;
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
