<template>
	<view class="page">
		<view class="top-bar" :style="{ paddingTop: 'var(--status-bar-height)' }">
			<view class="back" @click="back">‹</view>
			<text class="top-title">职场压力·骰子局</text>
			<view class="back-placeholder"></view>
		</view>

		<view class="content">
			<view class="headline">
				<text class="headline-main">{{ rolled ? '本次压力场景' : '掷出你的职场压力场景' }}</text>
				<text class="headline-sub">{{ rolled ? (record.pointName || '') : '点击下方骰子，1-6 点对应九宫格中的一格' }}</text>
			</view>

			<view class="grid">
				<view
					v-for="cell in cells"
					:key="cell.index"
					class="cell"
					:class="cellClass(cell)"
				>
					<template v-if="cell.pointNo">
						<text class="cell-no">{{ cell.pointNo }}</text>
						<text class="cell-name">{{ pointName(cell.pointNo) }}</text>
					</template>
					<text v-else-if="!cell.center" class="cell-dot">·</text>
				</view>
			</view>

			<view class="dice-area">
				<view
					class="dice-face"
					:class="{ rolling: rolling, locked: rolled }"
					@click="roll"
				>
					<view
						v-for="n in 9"
						:key="n"
						class="pip"
						:class="{ on: pipOn(n) }"
					></view>
				</view>
				<text class="dice-tip">{{ diceTip }}</text>
				<text v-if="rolled && record.theme" class="dice-theme">主题：{{ record.theme }}</text>
			</view>

			<view v-if="rolled" class="action">
				<view class="primary-button" @click="goQuestion">
					{{ finished ? '查看结果' : '开始答题' }}
				</view>
				<text class="action-tip">{{ finished ? '本局已完成' : '共 ' + questionCount + ' 道题，答完即可查看压力值' }}</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { getPoints, getRecord, rollDice, userMessage } from '@/api/zcyltzj'

	// 九宫格按“从左到右、从上到下”的顺序放置六个点数：上排 1-3、中排左 4 和右 5、下排左 6；
	// 中间为空，剩余的下中、下右两格预留给后续规则玩法。
	const POINT_CELL = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 5, 6: 6 }
	const RING = [0, 1, 2, 5, 8, 7, 6, 3]

	export default {
		data: () => ({
			recordId: '',
			instanceId: '',
			gameId: '',
			record: {},
			points: [],
			loading: true,
			rolling: false,
			rolled: false,
			diceValue: 1,
			highlightIndex: -1
		}),
		computed: {
			cells() {
				const values = {}
				this.points.forEach(item => {
					if (POINT_CELL[item.pointNo] != null) values[POINT_CELL[item.pointNo]] = item.pointNo
				})
				const list = []
				for (let index = 0; index < 9; index++) {
					list.push({
						index,
						center: index === 4,
						pointNo: index === 4 ? null : (values[index] || null)
					})
				}
				return list
			},
			finished() {
				return this.record.status === 'finished'
			},
			questionCount() {
				return (this.record.questions || []).length
			},
			diceTip() {
				if (this.rolling) return '骰子转动中…'
				if (this.rolled) return '点数 ' + this.record.pointNo + ' · ' + (this.record.pointName || '') + '，点击骰子不会改变点数'
				return '点击骰子掷出点数'
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
					const [recordRes, pointRes] = await Promise.all([
						getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId }),
						getPoints()
					])
					this.record = recordRes.data || {}
					this.points = pointRes.data || []
					if (this.record.status === 'finished') {
						uni.redirectTo({ url: `/pages/zcyltzj/result?${this.query()}` })
						return
					}
					if (this.record.pointNo) {
						this.rolled = true
						this.diceValue = this.record.pointNo
						this.highlightIndex = POINT_CELL[this.record.pointNo]
					} else {
						this.diceValue = 1
					}
				} catch (e) {
					uni.showToast({ title: userMessage(e, '游戏加载失败，请重新扫码进入'), icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			pipOn(position) {
				const map = {
					1: [5],
					2: [1, 9],
					3: [1, 5, 9],
					4: [1, 3, 7, 9],
					5: [1, 3, 5, 7, 9],
					6: [1, 3, 4, 6, 7, 9]
				}
				return (map[this.diceValue] || []).indexOf(position) > -1
			},
			cellClass(cell) {
				return {
					center: cell.center,
					dim: !cell.pointNo && !cell.center,
					// 下中和下右两格预留给后续规则玩法，暂不放置点数。
					reserved: cell.index === 7 || cell.index === 8,
					active: this.highlightIndex === cell.index,
					selected: this.rolled && cell.pointNo && Number(cell.pointNo) === Number(this.record.pointNo)
				}
			},
			pointName(pointNo) {
				const point = this.points.find(item => Number(item.pointNo) === Number(pointNo))
				return point ? point.pointName : ''
			},
			async roll() {
				if (this.rolled || this.rolling) return
				this.rolling = true
				let ticks = 0
				let ringIndex = 0
				// 先本地转动骰子和高亮，再以服务端返回的点数定格，避免客户端决定点数。
				const timer = setInterval(() => {
					this.diceValue = 1 + Math.floor(Math.random() * 6)
					this.highlightIndex = RING[ringIndex % RING.length]
					ringIndex++
					ticks++
				}, 90)
				const stop = () => {
					clearInterval(timer)
					this.rolling = false
				}
				try {
					// 至少转动约 1 秒再请求，保证现场能看到转动效果。
					await new Promise(resolve => setTimeout(resolve, 1000))
					const res = await rollDice(this.recordId)
					this.record = res.data || this.record
					if (this.record.status === 'finished') {
						stop()
						uni.redirectTo({ url: `/pages/zcyltzj/result?${this.query()}` })
						return
					}
					this.rolled = true
					this.diceValue = this.record.pointNo
					this.highlightIndex = POINT_CELL[this.record.pointNo]
					stop()
				} catch (e) {
					stop()
					uni.showToast({ title: userMessage(e, '骰子点数获取失败，请重试'), icon: 'none' })
				}
			},
			goQuestion() {
				if (this.finished) {
					uni.redirectTo({ url: `/pages/zcyltzj/result?${this.query()}` })
					return
				}
				uni.navigateTo({ url: `/pages/zcyltzj/question?${this.query()}` })
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
		min-height: 100vh;
		background: linear-gradient(165deg, #171a34 0%, #2a1f4d 55%, #3d2560 100%);
		display: flex;
		flex-direction: column;
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
		letter-spacing: 4rpx;
		color: rgba(255, 255, 255, 0.9);
	}

	.content {
		flex: 1;
		padding: 16rpx 40rpx 60rpx;
		box-sizing: border-box;
	}

	.headline {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 34rpx;
	}

	.headline-main {
		font-size: 38rpx;
		font-weight: 700;
		color: #ffffff;
	}

	.headline-sub {
		margin-top: 14rpx;
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.62);
		text-align: center;
		line-height: 1.6;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: repeat(3, 190rpx);
		gap: 16rpx;
	}

	.cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		border-radius: 24rpx;
		background: rgba(255, 255, 255, 0.07);
		border: 2rpx solid rgba(255, 255, 255, 0.1);
		transition: all 0.12s ease;
		overflow: hidden;
	}

	.cell.center {
		background: transparent;
		border: 2rpx dashed rgba(255, 255, 255, 0.18);
	}

	.cell.dim {
		background: rgba(255, 255, 255, 0.03);
		border-color: rgba(255, 255, 255, 0.05);
	}

	.cell.reserved {
		border-style: dashed;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.cell.active {
		transform: scale(0.96);
		background: rgba(255, 209, 102, 0.28);
		border-color: rgba(255, 209, 102, 0.85);
	}

	.cell.selected {
		background: linear-gradient(150deg, rgba(255, 209, 102, 0.95), rgba(255, 170, 51, 0.95));
		border-color: #ffe08a;
		box-shadow: 0 14rpx 30rpx rgba(255, 170, 51, 0.3);
	}

	.cell-no {
		font-size: 26rpx;
		color: #ffd166;
		font-weight: 700;
	}

	.cell.selected .cell-no {
		color: rgba(43, 33, 80, 0.7);
	}

	.cell-name {
		margin-top: 8rpx;
		padding: 0 12rpx;
		font-size: 24rpx;
		line-height: 1.35;
		color: #ffffff;
		text-align: center;
	}

	.cell.selected .cell-name {
		color: #2b2150;
		font-weight: 600;
	}

	.cell-dot {
		font-size: 40rpx;
		color: rgba(255, 255, 255, 0.22);
	}

	.dice-area {
		margin-top: 56rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.dice-face {
		width: 170rpx;
		height: 170rpx;
		padding: 20rpx;
		box-sizing: border-box;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: repeat(3, 1fr);
		border-radius: 36rpx;
		background: linear-gradient(155deg, #ffffff 0%, #e9e4f7 100%);
		box-shadow: 0 20rpx 42rpx rgba(0, 0, 0, 0.38);
		transition: transform 0.12s ease;
	}

	.dice-face.rolling {
		animation: dice-shake 0.36s linear infinite;
	}

	.dice-face.locked {
		box-shadow: 0 0 0 6rpx rgba(255, 209, 102, 0.35), 0 20rpx 42rpx rgba(0, 0, 0, 0.38);
	}

	@keyframes dice-shake {
		0% { transform: rotate(-10deg) translateY(0); }
		50% { transform: rotate(10deg) translateY(-8rpx); }
		100% { transform: rotate(-10deg) translateY(0); }
	}

	.pip {
		width: 24rpx;
		height: 24rpx;
		align-self: center;
		justify-self: center;
		border-radius: 50%;
		background: transparent;
	}

	.pip.on {
		background: #2b2150;
	}

	.dice-tip {
		margin-top: 22rpx;
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.62);
		text-align: center;
	}

	.dice-theme {
		margin-top: 10rpx;
		font-size: 24rpx;
		color: #ffd166;
	}

	.action {
		margin-top: 44rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.primary-button {
		width: 100%;
		height: 100rpx;
		line-height: 100rpx;
		text-align: center;
		border-radius: 999rpx;
		font-size: 32rpx;
		font-weight: 600;
		letter-spacing: 6rpx;
		color: #2a1d12;
		background: linear-gradient(135deg, #ffe08a 0%, #ffc23d 100%);
		box-shadow: 0 16rpx 32rpx rgba(255, 190, 61, 0.26);
	}

	.action-tip {
		margin-top: 16rpx;
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.5);
	}
</style>
