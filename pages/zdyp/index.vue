<template>
	<view class="page">
		<image class="stage-bg" :src="assets.gameEmpty" mode="scaleToFill"></image>

		<!-- 进度条：底图已抹掉原进度，这里按剩余时间重绘 -->
		<view class="track" style="left:40rpx;top:243rpx;width:670rpx;height:9rpx"></view>
		<view class="track-fill" :style="'left:40rpx;top:243rpx;height:9rpx;width:' + progressWidth + 'rpx'"></view>

		<!-- 四个卡槽：命中区域与设计稿象限一致 -->
		<view v-for="slot in slots" :key="slot.slotCode" class="quad" :style="quadStyle(slot.slotCode)"
			@click="tapSlot(slot)"></view>

		<!-- 已放入卡片的编号，位置与设计稿数字一致 -->
		<view v-for="slot in slots" :key="'no-' + slot.slotCode" v-if="placed[slot.slotCode]"
			class="quad-no" :style="numberStyle(slot.slotCode)">{{ placed[slot.slotCode].cardNo }}</view>

		<!-- 底部主按钮：底图已抹掉“开始游戏”，这里放提交按钮 -->
		<view class="submit" :class="{ disabled: filledCount < 4 }" @click="submit(false)">
			{{ submitting ? '提交中…' : (filledCount < 4 ? '还差 ' + (4 - filledCount) + ' 张' : '提交答案') }}
		</view>

		<!-- 选岗位面板：与选卡面板同一套白卡样式 -->
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

		<!-- 选卡面板：还原设计稿拼图4 的白色上浮面板 -->
		<view v-if="trayVisible" class="tray-mask" @click="closeTray">
			<view class="tray" @click.stop>
				<view class="tray-head">
					<text class="tray-title">点击卡片放入「{{ activeSlotName }}」</text>
					<text class="tray-close" @click="closeTray">×</text>
				</view>
				<view class="tray-grid">
					<view v-for="card in remainingCards" :key="card.cardId" class="card-cell" @click="placeCard(card)">
						<view class="card-art">
							<image class="piece" :src="assets.pieces[(card.cardNo - 1) % 4]" mode="widthFix"></image>
							<image class="badge" :src="assets.badges[(card.cardNo - 1) % 4]" mode="widthFix"></image>
						</view>
						<text class="card-text">{{ card.cardText }}</text>
					</view>
					<view v-if="!remainingCards.length" class="card-empty">四张卡片都已放入卡槽</view>
				</view>
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
	 * 职得一拼闯关页：按设计稿拼图3 还原四色拼图板，点击象限弹出拼图4 的白卡面板选卡。
	 * 倒计时与判定以服务端为准，到点自动提交已放入的卡片。
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
			trayVisible: false,
			careerTrayVisible: false,
			activeSlot: '',
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
			},
			activeSlotName() {
				const slot = this.slots.find((item) => item.slotCode === this.activeSlot)
				return slot ? slot.slotName : ''
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
				this.cards = (data.cards || []).slice()
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
			quadStyle(code) {
				const rects = {
					content: 'left:72rpx;top:507rpx;width:302rpx;height:297rpx',
					skill: 'left:374rpx;top:507rpx;width:302rpx;height:297rpx',
					weakness: 'left:72rpx;top:804rpx;width:302rpx;height:298rpx',
					prospect: 'left:374rpx;top:804rpx;width:302rpx;height:298rpx'
				}
				return rects[code] || ''
			},
			numberStyle(code) {
				const centers = {
					content: [162, 577],
					skill: [449, 577],
					weakness: [167, 891],
					prospect: [468, 890]
				}
				const point = centers[code] || [0, 0]
				return `left:${point[0]}rpx;top:${point[1]}rpx;width:120rpx;height:140rpx`
			},
			tapSlot(slot) {
				if (this.placed[slot.slotCode]) {
					// 再次点击已放入的象限可取出卡片，回到待选列表。
					this.$delete(this.placed, slot.slotCode)
					this.$delete(this.placeTimes, slot.slotCode)
					uni.showToast({ title: '已取出卡片', icon: 'none' })
					return
				}
				if (!this.cards.length) {
					// 还没选岗位：先选一套岗位再开始本局。
					this.careerTrayVisible = true
					return
				}
				this.activeSlot = slot.slotCode
				this.trayVisible = true
			},
			closeTray() {
				this.trayVisible = false
				this.activeSlot = ''
			},
			placeCard(card) {
				if (!this.activeSlot) return
				this.$set(this.placed, this.activeSlot, card)
				this.$set(this.placeTimes, this.activeSlot, Date.now())
				this.closeTray()
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

	.quad {
		position: absolute;
		z-index: 4;
	}

	.quad-no {
		position: absolute;
		z-index: 5;
		line-height: 140rpx;
		text-align: center;
		font-size: 128rpx;
		font-weight: 600;
		color: #1A1A1A;
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
		height: 1024rpx;
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

	.card-cell {
		width: 330rpx;
		height: 430rpx;
		margin-bottom: 16rpx;
		padding: 16rpx 18rpx;
		box-sizing: border-box;
		border-radius: 24rpx;
		border: 3rpx solid #F3E7CC;
		background: #FFFDF8;
		display: flex;
		flex-direction: column;
	}

	.card-art {
		position: relative;
		height: 150rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.piece {
		width: 140rpx;
	}

	.badge {
		position: absolute;
		left: 0;
		top: 0;
		width: 56rpx;
		height: 56rpx;
	}

	.card-text {
		margin-top: 10rpx;
		font-size: 20rpx;
		line-height: 1.55;
		color: #4A3B2A;
		overflow: hidden;
	}

	.card-empty {
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
