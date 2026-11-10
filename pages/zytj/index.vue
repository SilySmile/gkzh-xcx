<template>
	<view class="page">
		<view class="stage">
			<image class="stage-bg" :src="assets.bgChoose" mode="scaleToFill"></image>

			<ZytjHeader />

			<!-- 倒计时 -->
			<view class="timer" :class="{ urgent: remaining <= 10 }">
				<image class="timer-clock" :src="assets.clock" mode="aspectFit"></image>
				<text class="timer-text">{{ timerText }}</text>
			</view>

			<view class="title">挑选你的心愿物品</view>
			<view class="subtitle">每列选择一件</view>

			<!-- 2 行 4 列橱窗 -->
			<view class="card">
				<view v-for="(row, rowIndex) in grid" :key="rowIndex" class="grid-row">
					<view v-for="cell in row" :key="cell.columnIndex" class="cell" @click="select(cell)">
						<view class="cell-image-box" :class="{ checked: isChecked(cell) }">
							<image v-if="cell.item" class="cell-image" :src="cell.image" mode="aspectFill"></image>
							<view v-else class="cell-empty"></view>
						</view>
						<text class="cell-name">{{ cell.item ? cell.item.itemName : '' }}</text>
						<image class="cell-radio" :src="isChecked(cell) ? assets.radioOn : assets.radio"
							mode="aspectFit"></image>
					</view>
				</view>
			</view>

			<!-- 探索进度 -->
			<view class="progress-line">
				<image class="progress-label" :src="assets.progressLabel" mode="widthFix"></image>
				<view class="progress-track">
					<view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
					<view class="progress-knob" :style="{ left: progressPercent + '%' }"></view>
				</view>
				<text class="progress-percent">{{ progressPercent }}%</text>
			</view>

			<!-- 确认选择 -->
			<view class="confirm-btn" :class="{ pressed: pressing }" @touchstart="pressing = true"
				@touchend="pressing = false" @touchcancel="pressing = false" @click="confirm">
				<image class="confirm-img" :src="assets.btnConfirm" mode="scaleToFill"></image>
			</view>
		</view>
	</view>
</template>

<script>
	import ZytjHeader from '@/components/ZytjHeader.vue'
	import assets from '@/config/zytj-assets.js'
	import { getRecord, startRecord, submitChoice, userMessage } from '@/api/zytj'

	/**
	 * 职愿探究第二页：橱窗选择。
	 * 2 行 4 列，每列对应一个 MBTI 维度，每列只能选一件；30 秒到点自动补全并提交。
	 */
	export default {
		components: { ZytjHeader },
		data: () => ({
			assets,
			instanceId: '',
			gameId: '',
			recordId: '',
			columns: [],
			selected: [null, null, null, null],
			timeLimit: 30,
			remaining: 30,
			deadline: 0,
			timer: null,
			submitting: false,
			submitted: false,
			pressing: false
		}),
		computed: {
			/** 服务端按列返回物品，这里重排为“行优先”的两行四列以便渲染。 */
			grid() {
				const rows = [[], []]
				for (const column of this.columns) {
					for (let rowIndex = 0; rowIndex < 2; rowIndex++) {
						const item = (column.items || []).find(node => Number(node.rowIndex) === rowIndex + 1) ||
							(column.items || [])[rowIndex] || null
						rows[rowIndex].push({
							columnIndex: Number(column.columnIndex),
							item,
							image: item ? (assets.items[item.itemCode] || item.imageUrl) : ''
						})
					}
				}
				return rows
			},
			selectedCount() {
				return this.selected.filter(code => !!code).length
			},
			progressPercent() {
				return Math.round((this.selectedCount / 4) * 100)
			},
			timerText() {
				const value = Math.max(0, this.remaining)
				const mm = String(Math.floor(value / 60)).padStart(2, '0')
				const ss = String(value % 60).padStart(2, '0')
				return mm + ':' + ss
			}
		},
		async onLoad(options) {
			this.instanceId = options.instanceId || ''
			this.gameId = options.gameId || ''
			this.recordId = options.recordId || ''
			if (!this.recordId || !this.instanceId || !this.gameId) {
				uni.showToast({ title: '二维码缺少活动信息，请重新扫码', icon: 'none' })
				return
			}
			await this.loadRecord()
		},
		onUnload() {
			this.stopTimer()
		},
		methods: {
			isChecked(cell) {
				if (!cell.item) return false
				return this.selected[cell.columnIndex - 1] === cell.item.itemCode
			},
			async loadRecord() {
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = res.data || {}
					const setting = data.setting || {}
					this.timeLimit = Number(setting.timeLimit == null ? 30 : setting.timeLimit)
					if (data.status === 'finished' && setting.allowReselect !== '1') {
						uni.redirectTo({ url: `/pages/zytj/result?${this.params()}` })
						return
					}
					this.columns = data.columns || []
					const started = await startRecord(this.recordId)
					const startedData = (started && started.data) || {}
					if (startedData.columns && startedData.columns.length) {
						this.columns = startedData.columns
					}
					this.beginCountdown()
				} catch (e) {
					uni.showToast({ title: userMessage(e, '橱窗加载失败，请重新扫码'), icon: 'none' })
				}
			},
			beginCountdown() {
				this.stopTimer()
				if (!this.timeLimit || this.timeLimit <= 0) {
					this.remaining = 0
					return
				}
				this.remaining = this.timeLimit
				this.deadline = Date.now() + this.timeLimit * 1000
				this.timer = setInterval(() => {
					const left = Math.round((this.deadline - Date.now()) / 1000)
					this.remaining = left > 0 ? left : 0
					if (left <= 0) {
						this.stopTimer()
						this.autoSubmit()
					}
				}, 250)
			},
			stopTimer() {
				if (this.timer) {
					clearInterval(this.timer)
					this.timer = null
				}
			},
			select(cell) {
				if (this.submitting || this.submitted) return
				if (!cell.item) return
				this.$set(this.selected, cell.columnIndex - 1, cell.item.itemCode)
			},
			/** 到点未选满：按列序提交已选项，未选的传 null，由服务端补全并标记超时。 */
			autoSubmit() {
				if (this.submitting || this.submitted) return
				uni.showToast({ title: '时间到，正在生成职业探索卡', icon: 'none', duration: 1200 })
				this.doSubmit(true)
			},
			confirm() {
				if (this.submitting || this.submitted) return
				if (this.selectedCount < 4) {
					uni.showToast({ title: '请为每一列选择一件物品', icon: 'none' })
					return
				}
				this.doSubmit(false)
			},
			async doSubmit(timeout) {
				if (this.submitting || this.submitted) return
				this.submitting = true
				this.stopTimer()
				try {
					await submitChoice(this.recordId, this.selected.slice(), timeout)
					this.submitted = true
					uni.redirectTo({ url: `/pages/zytj/result?${this.params()}` })
				} catch (e) {
					this.submitting = false
					uni.showToast({ title: userMessage(e, '提交选择失败，请稍后重试'), icon: 'none' })
					// 提交失败后允许继续选择；已超时则重新计时以避免立刻再次触发。
					this.beginCountdown()
				}
			},
			params() {
				return `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
			}
		}
	}
</script>

<style scoped>
	.page {
		width: 100%;
		min-height: 100vh;
		background: #eef4fb;
		overflow-x: hidden;
	}

	.stage {
		position: relative;
		width: 750rpx;
		min-height: 1623rpx;
		margin: 0 auto;
		padding-bottom: 30rpx;
		box-sizing: border-box;
	}

	.stage-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 750rpx;
		height: 1623rpx;
	}

	.timer {
		position: relative;
		z-index: 10;
		width: 380rpx;
		margin: 0 auto;
		padding-top: calc(var(--status-bar-height) + 90rpx);
		height: 64rpx;
		border-radius: 34rpx;
		background: linear-gradient(180deg, #8f8cf0 0%, #7a76ea 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 6rpx 16rpx rgba(122, 118, 234, 0.35);
	}

	.timer.urgent {
		background: linear-gradient(180deg, #ff8a7a 0%, #f2655a 100%);
	}

	.timer-clock {
		width: 44rpx;
		height: 52rpx;
		margin-right: 14rpx;
	}

	.timer-text {
		font-size: 40rpx;
		font-weight: 700;
		letter-spacing: 3rpx;
		color: #ffffff;
	}

	.title {
		position: relative;
		z-index: 10;
		margin-top: 46rpx;
		text-align: center;
		font-size: 44rpx;
		font-weight: 700;
		color: #2f3f6d;
		letter-spacing: 2rpx;
	}

	.subtitle {
		position: relative;
		z-index: 10;
		margin-top: 12rpx;
		text-align: center;
		font-size: 28rpx;
		color: #5a6a94;
	}

	.card {
		position: relative;
		z-index: 10;
		margin: 46rpx auto 0;
		width: 700rpx;
		padding: 30rpx 20rpx 24rpx;
		box-sizing: border-box;
		background: #ffffff;
		border-radius: 36rpx;
		box-shadow: 0 8rpx 24rpx rgba(90, 110, 180, 0.12);
	}

	.grid-row {
		display: flex;
		justify-content: space-between;
		margin-bottom: 18rpx;
	}

	.cell {
		width: 158rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.cell-image-box {
		width: 148rpx;
		height: 126rpx;
		border-radius: 20rpx;
		overflow: hidden;
		box-sizing: border-box;
		border: 4rpx solid transparent;
	}

	.cell-image-box.checked {
		border-color: #6d7cf5;
		box-shadow: 0 4rpx 12rpx rgba(109, 124, 245, 0.35);
	}

	.cell-image {
		width: 140rpx;
		height: 118rpx;
		border-radius: 18rpx;
	}

	.cell-empty {
		width: 140rpx;
		height: 118rpx;
		border-radius: 18rpx;
		background: #f2f4f9;
	}

	.cell-name {
		margin-top: 10rpx;
		height: 62rpx;
		line-height: 31rpx;
		font-size: 24rpx;
		color: #33406b;
		text-align: center;
		overflow: hidden;
	}

	.cell-radio {
		margin-top: 6rpx;
		width: 40rpx;
		height: 40rpx;
	}

	.progress-line {
		position: relative;
		z-index: 10;
		display: flex;
		align-items: center;
		width: 700rpx;
		margin: 30rpx auto 0;
	}

	.progress-label {
		width: 150rpx;
	}

	.progress-track {
		position: relative;
		flex: 1;
		height: 14rpx;
		margin: 0 16rpx;
		border-radius: 7rpx;
		background: #e3e6f5;
	}

	.progress-fill {
		height: 14rpx;
		border-radius: 7rpx;
		background: linear-gradient(90deg, #a7a3f5 0%, #7a76ea 100%);
		transition: width 0.2s ease;
	}

	.progress-knob {
		position: absolute;
		top: 50%;
		width: 30rpx;
		height: 30rpx;
		margin-left: -15rpx;
		margin-top: -15rpx;
		border-radius: 50%;
		background: #ffffff;
		border: 4rpx solid #7a76ea;
		box-sizing: border-box;
		transition: left 0.2s ease;
	}

	.progress-percent {
		width: 76rpx;
		text-align: right;
		font-size: 26rpx;
		color: #3d4c7c;
	}

	.confirm-btn {
		position: relative;
		z-index: 10;
		width: 460rpx;
		height: 120rpx;
		margin: 34rpx auto 0;
		transition: transform 0.12s ease;
	}

	.confirm-btn.pressed {
		transform: scale(0.97);
	}

	.confirm-img {
		width: 460rpx;
		height: 120rpx;
	}
</style>
