<template>
	<view class="page">
		<image class="game-bg" src="/static/zcyltzj/game-bg.jpg" mode="scaleToFill" />
		<zcyltzj-header theme="dark" @back="back" />
		<image class="brand-logo" src="/static/zcyltzj/logo.png" mode="widthFix" />

		<view class="grid" :class="{ spinning: rolling, settled: rolled }">
			<view
				v-for="cell in cells"
				:key="cell.index"
				class="cell"
				:class="cellClass(cell)"
				:style="cellStyle(cell)"
				@click="onCellTap(cell)"
			>
				<image
					v-if="cell.pointNo"
					class="cell-art"
					:src="pointTile(cell.pointNo)"
					mode="scaleToFill"
				/>
				<view v-else-if="cell.ruleCell" class="rule-card">
					<text class="rule-badge">规则</text>
					<text class="rule-text">{{ cell.ruleCell.title }}</text>
				</view>
				<view v-if="!cell.center" class="cell-tint"></view>
			</view>
		</view>

		<view class="dice-hit" @click="roll">
			<view class="dice-face" :class="{ rolling: rolling, settled: rolled }">
				<image class="dice-img" :src="diceFace" mode="aspectFit" />
			</view>
		</view>
		<text class="dice-tip">{{ diceTip }}</text>
		<text v-if="rolled && record.theme" class="dice-theme">主题：{{ record.theme }}</text>

		<view v-if="rolled" class="action">
			<view class="primary-button" @click="goQuestion">
				<image class="primary-button-bg" src="/static/zcyltzj/button.png" mode="scaleToFill" />
				<text class="primary-button-text">{{ finished ? '查看结果' : '开始答题' }}</text>
			</view>
			<text class="action-tip">{{ finished ? '本局已完成' : '共 ' + questionCount + ' 道题，答完即可查看压力值' }}</text>
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
	import ZcyltzjHeader from '@/components/ZcyltzjHeader.vue'

	// 与效果图一致：上排 1-3、中排左 6 和右 4、下排中 5；
	// 中间为空，下左（第 7 格）、下右（第 9 格）用于展示后台配置的规则。
	const POINT_CELL = { 1: 0, 2: 1, 3: 2, 4: 5, 5: 7, 6: 3 }
	// 高亮按顺时针环绕，与九宫格位置一致。
	const RING = [0, 1, 2, 5, 8, 7, 6, 3]
	// 效果图 21 上 3x3 卡片在整页中的位置（百分比），用于透明点击/高亮热区。
	const CELL_RECT = [
		{ left: '15%', top: '40%', width: '20%', height: '10%' },
		{ left: '38%', top: '40%', width: '22%', height: '10%' },
		{ left: '62%', top: '40%', width: '21%', height: '10%' },
		{ left: '15%', top: '50%', width: '20%', height: '10%' },
		{ left: '38%', top: '50%', width: '22%', height: '10%' },
		{ left: '62%', top: '50%', width: '21%', height: '10%' },
		{ left: '15%', top: '60%', width: '20%', height: '15%' },
		{ left: '38%', top: '60%', width: '22%', height: '10%' },
		{ left: '62%', top: '60%', width: '21%', height: '15%' }
	]

	export default {
		components: { ZcyltzjHeader },
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
			trailIndex: -1,
			fastSpinTimer: null,
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
						// 第 7 格（下左）、第 9 格（下右）展示规则格配置。
						ruleCell: (cellNo === 7 || cellNo === 9) ? (ruleValues[cellNo] || null) : null
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
			},
			diceFace() {
				const value = Math.min(6, Math.max(1, Number(this.diceValue) || 1))
				return `/static/zcyltzj/dice-${value}.png`
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
		onUnload() {
			this.stopFastSpin()
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
			// 返回类名字符串：小程序对方法返回的对象不会自动转成 class，
			// 会导致 active/trail/selected 等动态样式完全不生效。
			cellClass(cell) {
				const classes = []
				if (cell.center) classes.push('center')
				if (this.highlightIndex === cell.index) classes.push('active')
				if (this.trailIndex === cell.index) classes.push('trail')
				if (this.rolled && cell.pointNo && Number(cell.pointNo) === Number(this.record.pointNo)) {
					classes.push('selected')
				}
				return classes.join(' ')
			},
			cellStyle(cell) {
				return CELL_RECT[cell.index] || {}
			},
			pointTile(pointNo) {
				const value = Math.min(6, Math.max(1, Number(pointNo) || 1))
				return `/static/zcyltzj/tile-${value}.png`
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
				// 请求期间先快速顺时针转动，响应回来后再减速停在目标格，形成转盘效果。
				this.startFastSpin()
				let res
				try {
					res = await rollDice(this.recordId)
				} catch (e) {
					this.stopFastSpin()
					this.rolling = false
					uni.showToast({ title: userMessage(e, '骰子点数获取失败，请重试'), icon: 'none' })
					return
				}
				const record = res.data || this.record
				if (record.status === 'finished') {
					this.stopFastSpin()
					this.rolling = false
					uni.redirectTo({ url: `/pages/zcyltzj/result?${this.query()}` })
					return
				}
				const target = POINT_CELL[record.pointNo]
				await this.slowSpinTo(target, record.pointNo)
				this.record = record
				this.rolled = true
				this.rolling = false
				this.diceValue = record.pointNo
				this.highlightIndex = target
			},
			startFastSpin() {
				this.stopFastSpin()
				this.fastSpinTimer = setInterval(() => this.advanceSpin(), 70)
			},
			stopFastSpin() {
				if (this.fastSpinTimer) {
					clearInterval(this.fastSpinTimer)
					this.fastSpinTimer = null
				}
			},
			advanceSpin() {
				const current = this.highlightIndex
				const position = current < 0 ? -1 : RING.indexOf(current)
				const next = RING[(position + 1) % RING.length]
				this.trailIndex = current
				this.highlightIndex = next
				this.diceValue = 1 + Math.floor(Math.random() * 6)
			},
			/** 从当前格继续顺时针转动至少一圈，逐步减速并停在目标格。 */
			async slowSpinTo(target, finalPoint) {
				this.stopFastSpin()
				const targetPos = RING.indexOf(target)
				if (targetPos < 0) {
					this.highlightIndex = target
					this.diceValue = finalPoint
					this.trailIndex = -1
					return
				}
				const currentPos = RING.indexOf(this.highlightIndex)
				const distance = (targetPos - currentPos + RING.length) % RING.length
				const steps = RING.length + distance
				let delay = 70
				for (let i = 1; i <= steps; i++) {
					await new Promise(resolve => setTimeout(resolve, delay))
					this.trailIndex = this.highlightIndex
					this.highlightIndex = RING[(currentPos + i + RING.length) % RING.length]
					this.diceValue = 1 + Math.floor(Math.random() * 6)
					delay = Math.min(190, delay + 14)
				}
				this.highlightIndex = target
				this.diceValue = finalPoint
				this.trailIndex = -1
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
		position: relative;
		width: 100%;
		height: 100vh;
		min-height: 100vh;
		overflow: hidden;
		background: #fff8e8;
	}

	.game-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		z-index: 0;
	}

	.brand-logo {
		position: absolute;
		z-index: 1;
		top: 10%;
		left: 50%;
		width: 480rpx;
		transform: translateX(-50%);
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
		display: flex;
		flex-direction: column;
		justify-content: center;
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
		position: absolute;
		z-index: 1;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
	}

	.cell {
		position: absolute;
		box-sizing: border-box;
		border-radius: 24rpx;
		overflow: hidden;
		background: transparent;
		border: none;
	}

	.cell.center {
		background: transparent;
	}

	.cell-art {
		position: absolute;
		left: 0;
		top: 0;
		z-index: 1;
		width: 100%;
		height: 100%;
	}

	.rule-card {
		position: absolute;
		left: 0;
		top: 0;
		z-index: 1;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 12rpx 10rpx;
		box-sizing: border-box;
		border-radius: 24rpx;
		background: linear-gradient(150deg, #ffe6a3 0%, #f2b64b 100%);
		border: 3rpx solid rgba(255, 255, 255, 0.7);
		box-shadow: 0 10rpx 22rpx rgba(150, 95, 10, 0.22);
	}

	.rule-badge {
		padding: 2rpx 12rpx;
		border-radius: 999rpx;
		font-size: 19rpx;
		color: #7a4b10;
		background: rgba(255, 255, 255, 0.5);
		border: 1rpx solid rgba(122, 75, 16, 0.25);
	}

	.rule-text {
		margin-top: 10rpx;
		font-size: 21rpx;
		line-height: 1.35;
		color: #ffffff;
		text-align: center;
		text-shadow: 0 1rpx 2rpx rgba(120, 70, 10, 0.35);
	}

	.cell-tint {
		position: absolute;
		left: 0;
		top: 0;
		z-index: 2;
		width: 100%;
		height: 100%;
		border-radius: 24rpx;
		background: transparent;
		pointer-events: none;
		transition: background 0.14s ease, box-shadow 0.14s ease;
	}

	.grid.spinning .cell .cell-tint {
		background: rgba(255, 255, 255, 0.55);
	}

	.grid.spinning .cell.trail .cell-tint {
		background: rgba(255, 220, 120, 0.35);
	}

	.grid.spinning .cell.active .cell-tint {
		background: rgba(255, 235, 170, 0.12);
		box-shadow: inset 0 0 0 4rpx #ffd166;
	}

	.grid.settled .cell .cell-tint {
		background: rgba(255, 255, 255, 0.45);
	}

	.grid.settled .cell.selected .cell-tint {
		background: rgba(255, 200, 80, 0.12);
		box-shadow: inset 0 0 0 5rpx #ffe08a;
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
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
	}

	.cell-dot {
		font-size: 40rpx;
		color: rgba(255, 255, 255, 0.22);
	}

	.dice-area {
		position: absolute;
		z-index: 1;
		left: 0;
		right: 0;
		bottom: 11%;
		margin-top: 0;
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
		width: 160rpx;
		height: 160rpx;
		box-sizing: border-box;
		border-radius: 38rpx;
		background: transparent;
		box-shadow: none;
	}

	.dice-img {
		width: 100%;
		height: 100%;
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

	/* 用绝对定位固定九个点位，避免部分微信版本不支持 CSS Grid 导致点位错位。 */
	.pip-slot {
		position: absolute;
		width: 30rpx;
		height: 30rpx;
		transform: translate(-50%, -50%);
	}

	.pip {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #4b4077 0%, #241d3f 65%, #151025 100%);
		box-shadow: inset 0 3rpx 5rpx rgba(0, 0, 0, 0.55), 0 1rpx 1rpx rgba(255, 255, 255, 0.7);
	}

	.slot-1 { left: 22%; top: 22%; }
	.slot-2 { left: 50%; top: 22%; }
	.slot-3 { left: 78%; top: 22%; }
	.slot-4 { left: 22%; top: 50%; }
	.slot-5 { left: 50%; top: 50%; }
	.slot-6 { left: 78%; top: 50%; }
	.slot-7 { left: 22%; top: 78%; }
	.slot-8 { left: 50%; top: 78%; }
	.slot-9 { left: 78%; top: 78%; }

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
		color: #6b4a1e;
		text-align: center;
	}

	.dice-theme {
		margin-top: 10rpx;
		font-size: 24rpx;
		color: #6b4a1e;
	}

	.dice-hit {
		position: absolute;
		left: 38%;
		top: 76%;
		width: 23%;
		height: 11.5%;
		z-index: 2;
	}

	.dice-hit .dice-face {
		width: 100%;
		height: 100%;
	}

	.dice-tip {
		position: absolute;
		left: 0;
		right: 0;
		top: 88.5%;
		margin-top: 0;
		font-size: 24rpx;
		color: #6b4a1e;
		text-align: center;
	}

	.dice-theme {
		position: absolute;
		left: 0;
		right: 0;
		top: 91.5%;
		margin-top: 0;
		font-size: 24rpx;
		color: #6b4a1e;
		text-align: center;
	}

	.action {
		position: absolute;
		z-index: 1;
		left: 10%;
		right: 10%;
		bottom: 4%;
		margin-top: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.primary-button {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100rpx;
		line-height: 100rpx;
		text-align: center;
		border-radius: 999rpx;
		font-size: 32rpx;
		font-weight: 600;
		letter-spacing: 6rpx;
		color: #2a1d12;
		overflow: hidden;
		box-shadow: 0 16rpx 32rpx rgba(255, 190, 61, 0.26);
	}

	.primary-button-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
	}

	.primary-button-text {
		position: relative;
		z-index: 1;
	}

	.action-tip {
		margin-top: 16rpx;
		font-size: 22rpx;
		color: #6b4a1e;
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
