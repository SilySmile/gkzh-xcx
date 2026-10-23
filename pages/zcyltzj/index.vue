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

			<view class="grid" :class="{ spinning: rolling, settled: rolled }">
				<view
					v-for="cell in cells"
					:key="cell.index"
					class="cell"
					:class="cellClass(cell)"
					@click="onCellTap(cell)"
				>
					<template v-if="cell.pointNo">
						<text class="cell-no">{{ cell.pointNo }}</text>
						<text class="cell-name">{{ pointName(cell.pointNo) }}</text>
					</template>
					<template v-else-if="cell.ruleCell">
						<text class="cell-rule-badge">规则</text>
						<text class="cell-rule-title">{{ cell.ruleCell.title }}</text>
					</template>
					<text v-else-if="!cell.center" class="cell-dot">·</text>
				</view>
			</view>

			<view class="dice-area">
				<view class="dice-glow" :class="{ visible: rolled }"></view>
				<view
					class="dice-face"
					:class="{ rolling: rolling, settled: rolled }"
					@click="roll"
				>
					<view v-for="n in 9" :key="n" class="pip-cell">
						<view v-if="pipOn(n)" class="pip"></view>
					</view>
				</view>
				<view class="dice-shadow" :class="{ rolling: rolling }"></view>
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

		<view v-if="ruleVisible" class="rule-mask" @click="closeRule">
			<view class="rule-dialog" @click.stop>
				<text class="rule-dialog-title">{{ activeRule.title }}</text>
				<text class="rule-dialog-content">{{ activeRule.content || '暂无规则说明' }}</text>
				<view class="rule-dialog-button" @click="closeRule">知道了</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { getPoints, getRuleCells, getRecord, rollDice, userMessage } from '@/api/zcyltzj'

	// 九宫格按“从左到右、从上到下”的顺序放置六个点数：上排 1-3、中排左 4 和右 5、下排左 6；
	// 中间为空，剩余的下中（第 8 格）、下右（第 9 格）用于展示后台配置的规则。
	const POINT_CELL = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 5, 6: 6 }
	// 高亮按顺时针环绕，与九宫格位置一致。
	const RING = [0, 1, 2, 5, 8, 7, 6, 3]

	export default {
		data: () => ({
			recordId: '',
			instanceId: '',
			gameId: '',
			record: {},
			points: [],
			ruleCells: [],
			loading: true,
			rolling: false,
			rolled: false,
			diceValue: 1,
			highlightIndex: -1,
			ruleVisible: false,
			activeRule: {}
		}),
		computed: {
			cells() {
				const pointValues = {}
				this.points.forEach(item => {
					if (POINT_CELL[item.pointNo] != null) pointValues[POINT_CELL[item.pointNo]] = item.pointNo
				})
				const ruleValues = {}
				this.ruleCells.forEach(item => {
					ruleValues[item.cellNo] = item
				})
				const list = []
				for (let index = 0; index < 9; index++) {
					const cellNo = index + 1
					list.push({
						index,
						center: index === 4,
						pointNo: index === 4 ? null : (pointValues[index] || null),
						// 第 8 格（下中）、第 9 格（下右）展示规则格配置。
						ruleCell: (cellNo === 8 || cellNo === 9) ? (ruleValues[cellNo] || null) : null
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
				if (this.rolled) return '点数 ' + this.record.pointNo + ' · ' + (this.record.pointName || '')
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
					const [recordRes, pointRes, ruleRes] = await Promise.all([
						getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId }),
						getPoints(),
						// 规则格尚未迁移时不影响掷骰子，失败按空数组处理。
						getRuleCells().catch(() => ({ data: [] }))
					])
					this.record = recordRes.data || {}
					this.points = pointRes.data || []
					this.ruleCells = ruleRes.data || []
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
			// 骰子点数对应的点位：1/2/3/4/5/6 使用九宫格中的固定位置。
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
					reserved: cell.index === 7 || cell.index === 8,
					active: this.highlightIndex === cell.index,
					selected: this.rolled && cell.pointNo && Number(cell.pointNo) === Number(this.record.pointNo)
				}
			},
			pointName(pointNo) {
				const point = this.points.find(item => Number(item.pointNo) === Number(pointNo))
				return point ? point.pointName : ''
			},
			onCellTap(cell) {
				if (cell.ruleCell) {
					this.activeRule = cell.ruleCell
					this.ruleVisible = true
				}
			},
			closeRule() {
				this.ruleVisible = false
			},
			async roll() {
				if (this.rolled || this.rolling) return
				this.rolling = true
				const startedAt = Date.now()
				let ringIndex = 0
				// 骰子面快速跳动，九宫格高亮沿外圈顺时针转动；两者同步营造投掷效果。
				const timer = setInterval(() => {
					this.diceValue = 1 + Math.floor(Math.random() * 6)
					this.highlightIndex = RING[ringIndex % RING.length]
					ringIndex++
				}, 85)
				const stop = () => {
					clearInterval(timer)
					this.rolling = false
				}
				try {
					const res = await rollDice(this.recordId)
					// 网络过快时也保证至少转动约 1.3 秒，避免一闪而过。
					const remain = 1300 - (Date.now() - startedAt)
					if (remain > 0) await new Promise(resolve => setTimeout(resolve, remain))
					this.record = res.data || this.record
					if (this.record.status === 'finished') {
						stop()
						uni.redirectTo({ url: `/pages/zcyltzj/result?${this.query()}` })
						return
					}
					stop()
					this.rolled = true
					this.diceValue = this.record.pointNo
					this.highlightIndex = POINT_CELL[this.record.pointNo]
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
		margin-bottom: 30rpx;
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
		grid-template-rows: repeat(3, 186rpx);
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
		overflow: hidden;
		transition: opacity 0.14s ease, transform 0.14s ease, background 0.14s ease,
			border-color 0.14s ease, box-shadow 0.14s ease;
	}

	.cell.center {
		background: transparent;
		border: 2rpx dashed rgba(255, 255, 255, 0.14);
	}

	.cell.dim {
		background: rgba(255, 255, 255, 0.03);
		border-color: rgba(255, 255, 255, 0.06);
	}

	.cell.reserved {
		border-style: dashed;
		border-color: rgba(255, 255, 255, 0.14);
	}

	/* 投掷过程中：只有当前格保持明亮，其余格子压暗。 */
	.grid.spinning .cell {
		opacity: 0.22;
		transform: scale(0.97);
		transition: none;
	}

	.grid.spinning .cell.active {
		opacity: 1;
		transform: scale(1.03);
		background: rgba(255, 209, 102, 0.35);
		border-color: #ffd166;
		box-shadow: 0 0 28rpx rgba(255, 209, 102, 0.55);
	}

	/* 停止后：最终点数所在格保持高亮，其余格子保持较暗。 */
	.grid.settled .cell {
		opacity: 0.35;
	}

	.grid.settled .cell.selected {
		opacity: 1;
		transform: scale(1.02);
		background: linear-gradient(150deg, rgba(255, 209, 102, 0.96), rgba(255, 170, 51, 0.96));
		border-color: #ffe08a;
		box-shadow: 0 14rpx 32rpx rgba(255, 170, 51, 0.32);
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

	.cell-rule-badge {
		padding: 2rpx 12rpx;
		border-radius: 999rpx;
		font-size: 18rpx;
		color: #ffd166;
		background: rgba(255, 209, 102, 0.14);
		border: 1rpx solid rgba(255, 209, 102, 0.3);
	}

	.cell-rule-title {
		margin-top: 10rpx;
		padding: 0 10rpx;
		font-size: 22rpx;
		line-height: 1.35;
		color: rgba(255, 255, 255, 0.82);
		text-align: center;
	}

	.cell-dot {
		font-size: 40rpx;
		color: rgba(255, 255, 255, 0.22);
	}

	.dice-area {
		position: relative;
		margin-top: 44rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.dice-glow {
		position: absolute;
		top: -20rpx;
		width: 300rpx;
		height: 300rpx;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 209, 102, 0.35) 0%, rgba(255, 209, 102, 0) 65%);
		opacity: 0;
		transition: opacity 0.5s ease;
		pointer-events: none;
	}

	.dice-glow.visible {
		opacity: 1;
	}

	.dice-face {
		position: relative;
		z-index: 2;
		width: 192rpx;
		height: 192rpx;
		padding: 18rpx;
		box-sizing: border-box;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: repeat(3, 1fr);
		border-radius: 38rpx;
		background: radial-gradient(circle at 32% 24%, #ffffff 0%, #f5f2fb 55%, #ddd7ec 100%);
		box-shadow: 0 20rpx 44rpx rgba(0, 0, 0, 0.42), inset 0 -10rpx 18rpx rgba(90, 70, 160, 0.18),
			inset 0 6rpx 10rpx rgba(255, 255, 255, 0.9);
	}

	.dice-face.rolling {
		animation: dice-tumble 0.55s linear infinite;
	}

	.dice-face.settled {
		animation: dice-settle 0.46s cubic-bezier(0.2, 1.35, 0.5, 1);
	}

	@keyframes dice-tumble {
		0% { transform: rotate(-14deg) translateY(0) scale(1); }
		25% { transform: rotate(10deg) translateY(-26rpx) scale(1.05); }
		50% { transform: rotate(-8deg) translateY(4rpx) scale(0.98); }
		75% { transform: rotate(12deg) translateY(-14rpx) scale(1.03); }
		100% { transform: rotate(-14deg) translateY(0) scale(1); }
	}

	@keyframes dice-settle {
		0% { transform: scale(1.16) rotate(0deg); }
		55% { transform: scale(0.94) rotate(-3deg); }
		100% { transform: scale(1) rotate(0deg); }
	}

	.pip-cell {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.pip {
		width: 30rpx;
		height: 30rpx;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #4b4077 0%, #241d3f 65%, #151025 100%);
		box-shadow: inset 0 3rpx 5rpx rgba(0, 0, 0, 0.55), 0 1rpx 1rpx rgba(255, 255, 255, 0.7);
	}

	.dice-shadow {
		margin-top: -8rpx;
		width: 168rpx;
		height: 30rpx;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.38);
		filter: blur(8rpx);
		transition: transform 0.2s ease, opacity 0.2s ease;
	}

	.dice-shadow.rolling {
		animation: shadow-pulse 0.55s linear infinite;
	}

	@keyframes shadow-pulse {
		0% { transform: scaleX(1); opacity: 0.42; }
		25% { transform: scaleX(0.82); opacity: 0.24; }
		50% { transform: scaleX(1.04); opacity: 0.46; }
		75% { transform: scaleX(0.88); opacity: 0.3; }
		100% { transform: scaleX(1); opacity: 0.42; }
	}

	.dice-tip {
		margin-top: 20rpx;
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
		margin-top: 40rpx;
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

	.rule-mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 99;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(8, 6, 20, 0.72);
	}

	.rule-dialog {
		width: 560rpx;
		padding: 44rpx 40rpx 36rpx;
		border-radius: 32rpx;
		background: linear-gradient(160deg, #2b2150 0%, #3a2a63 100%);
		border: 1rpx solid rgba(255, 209, 102, 0.25);
		display: flex;
		flex-direction: column;
		align-items: center;
		box-shadow: 0 24rpx 60rpx rgba(0, 0, 0, 0.45);
	}

	.rule-dialog-title {
		font-size: 34rpx;
		font-weight: 700;
		color: #ffd166;
		text-align: center;
	}

	.rule-dialog-content {
		margin-top: 24rpx;
		font-size: 26rpx;
		line-height: 1.75;
		color: rgba(255, 255, 255, 0.82);
		text-align: left;
		width: 100%;
	}

	.rule-dialog-button {
		margin-top: 36rpx;
		width: 100%;
		height: 84rpx;
		line-height: 84rpx;
		text-align: center;
		border-radius: 999rpx;
		font-size: 28rpx;
		font-weight: 600;
		color: #2a1d12;
		background: linear-gradient(135deg, #ffe08a 0%, #ffc23d 100%);
	}
</style>
