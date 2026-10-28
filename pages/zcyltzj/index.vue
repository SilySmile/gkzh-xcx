<template>
	<view class="page">
		<image class="game-bg" :src="assets['board-bg']" mode="scaleToFill" />
		<image class="brand-logo" :src="assets.logo" mode="aspectFit" />
		<zcyltzj-header theme="dark" @back="back" />

		<view class="grid" :class="{ spinning: rolling, settled: rolled }">
			<view v-for="cell in cells" :key="cell.index" class="cell"
				:class="cellClass(cell)" :style="cellStyle(cell)" @click="onCellTap(cell)">
				<template v-if="!cell.center && (cell.pointNo || cell.ruleCell)">
					<image class="cell-bg" :src="cellImage(cell)" mode="scaleToFill" />
					<view class="cell-content">
						<template v-if="cell.pointNo">
							<text class="cell-no">{{ cell.pointNo }}</text>
							<text class="cell-name">{{ pointName(cell.pointNo) }}</text>
						</template>
						<template v-else-if="cell.ruleCell">
							<text class="rule-badge">规则</text>
							<text class="rule-text">{{ cell.ruleCell.content || cell.ruleCell.title }}</text>
						</template>
					</view>
				</template>
			</view>
		</view>

		<view class="dice-hit" @click="roll">
			<view class="dice-face" :class="{ rolling: rolling, settled: rolled }">
				<image class="dice-img" :src="diceFace" mode="aspectFit" />
			</view>
		</view>
		<view v-if="loading || loadError" class="load-status">
			<text>{{ loading ? '场景加载中…' : loadError }}</text>
			<text v-if="loadError && recordId" class="retry" @click="load">重新加载</text>
		</view>
		<view v-if="rolled" class="action">
			<view class="primary-button" @click="goQuestion">
				<image class="primary-button-bg" :src="assets.button" mode="scaleToFill" />
				<text class="primary-button-text">{{ finished ? '查看结果' : '开始答题' }}</text>
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
	import ZcyltzjHeader from '@/components/ZcyltzjHeader.vue'
	import { ZCYLTZJ_ASSETS } from '@/config/zcyltzj-assets'

	// 与效果图一致：上排 1-3、中排左 6 和右 4、下排中 5；
	// 中间为空，下左（第 7 格）、下右（第 9 格）用于展示后台配置的规则。
	const POINT_CELL = { 1: 0, 2: 1, 3: 2, 4: 5, 5: 7, 6: 3 }
	// 高亮按顺时针环绕，与九宫格位置一致。
	const RING = [0, 1, 2, 5, 8, 7, 6, 3]
	// 以 875×1937 参考图为坐标系，所有卡片与空白背景使用相同的缩放。
	const CELL_RECT = [
		{ left: '14.51%', top: '40.0%', width: '23.32%', height: '10.58%' },
		{ left: '39.09%', top: '40.0%', width: '23.32%', height: '10.58%' },
		{ left: '63.66%', top: '40.0%', width: '23.32%', height: '10.58%' },
		{ left: '14.51%', top: '51.25%', width: '23.32%', height: '10.58%' },
		{ left: '39.09%', top: '51.25%', width: '23.32%', height: '10.58%' },
		{ left: '63.66%', top: '51.25%', width: '23.32%', height: '10.58%' },
		{ left: '14.51%', top: '62.5%', width: '23.32%', height: '10.58%' },
		{ left: '39.09%', top: '62.5%', width: '23.32%', height: '10.58%' },
		{ left: '63.66%', top: '62.5%', width: '23.32%', height: '10.58%' }
	]

	export default {
		components: { ZcyltzjHeader },
		data: () => ({
			assets: ZCYLTZJ_ASSETS,
			recordId: '',
			instanceId: '',
			gameId: '',
			record: {},
			points: [],
			ruleCells: [],
			loading: true,
			loadError: '',
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
				Object.keys(POINT_CELL).forEach(pointNo => {
					pointValues[POINT_CELL[pointNo]] = Number(pointNo)
				})
				const ruleValues = {}
				this.ruleCells.forEach(item => {
					ruleValues[item.cellNo] = item
				})
				const list = []
				for (let index = 0; index < 9; index++) {
					const cellNo = index + 1
					const defaultRule = cellNo === 7
						? { cellNo, title: '规则', content: '点击亮起橱窗，进入该点数对应的职场压力问卷。' }
						: { cellNo, title: '规则', content: '答完6题生成职场压力判定值。' }
					list.push({
						index,
						center: index === 4,
						pointNo: index === 4 ? null : (pointValues[index] || null),
						// 第 7 格（下左）、第 9 格（下右）展示规则格配置。
						ruleCell: (cellNo === 7 || cellNo === 9) ? (ruleValues[cellNo] || defaultRule) : null
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
			diceFace() {
				const value = Math.min(6, Math.max(1, Number(this.diceValue) || 1))
				return this.assets[`dice-${value}`]
			}
		},
		async onLoad(options) {
			this.recordId = options.recordId || ''
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			if (!this.recordId) {
				this.loading = false
				this.loadError = '缺少游戏记录，请重新扫码进入'
				uni.showToast({ title: this.loadError, icon: 'none' })
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
				this.loadError = ''
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
					this.loadError = userMessage(e, '游戏加载失败，请重新扫码进入')
					uni.showToast({ title: this.loadError, icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			// 返回类名字符串：小程序对方法返回的对象不会自动转成 class，
			// 会导致 active/trail/selected 等动态样式完全不生效。
			cellClass(cell) {
				const classes = []
				if (cell.center) classes.push('center')
				if (cell.ruleCell) classes.push('rule-cell')
				if (cell.index === 8) classes.push('rule-right')
				if (this.cellActive(cell)) classes.push('on')
				if (this.highlightIndex === cell.index) classes.push('active')
				if (this.trailIndex === cell.index) classes.push('trail')
				if (this.rolled && cell.pointNo && Number(cell.pointNo) === Number(this.record.pointNo)) {
					classes.push('selected')
				}
				return classes.join(' ')
			},
			cellActive(cell) {
				if (this.highlightIndex === cell.index) return true
				return this.rolled && cell.pointNo && Number(cell.pointNo) === Number(this.record.pointNo)
			},
			cellImage(cell) {
				return this.cellActive(cell) ? this.assets['card-selected'] : this.assets['card-normal']
			},
			cellStyle(cell) {
				// 微信不会把方法返回的样式对象序列化，必须返回 CSS 字符串。
				const rect = CELL_RECT[cell.index]
				return rect ? `left:${rect.left};top:${rect.top};width:${rect.width};height:${rect.height};` : ''
			},
			pointName(pointNo) {
				const point = this.points.find(item => Number(item.pointNo) === Number(pointNo))
				const defaults = { 1: '早八生存压力', 2: '小组作业压力', 3: 'DDL冲刺压力', 4: '期末连考压力', 5: '毕业去向压力', 6: '公开表达压力' }
				return (point && point.pointName) || defaults[pointNo] || ''
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
				if (this.loading || this.loadError || !this.recordId || this.rolled || this.rolling) return
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

.page { position: relative; width: 100%; height: 100vh; overflow: hidden; background: #fff8e8; }
.game-bg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 0; }
.brand-logo { position: absolute; z-index: 1; left: 2.85%; top: 9.45%; width: 92%; height: 16.55%; }
.grid { position: absolute; z-index: 1; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; }
.cell { position: absolute; box-sizing: border-box; border-radius: 34rpx; pointer-events: auto; }
.cell.center { pointer-events: none; }
.cell-bg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
.cell-content { position: absolute; z-index: 1; left: 0; top: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; padding: 18rpx 16rpx; }
.cell-no { font-family: 'Times New Roman', serif; font-size: 46rpx; font-weight: 700; line-height: 1; color: #d69a32; }
.cell-name { margin-top: 12rpx; font-size: 20rpx; line-height: 1.3; color: #fff; text-align: center; width: 100%; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.rule-cell .cell-content { justify-content: flex-start; padding: 24rpx 22rpx 14rpx; }
.rule-badge { flex-shrink: 0; padding: 0 14rpx; border-radius: 999rpx; font-size: 19rpx; line-height: 1.2; color: #efa933; background: rgba(255, 224, 135, .8); border: 1rpx solid #ffb13c; }
.rule-text { width: 100%; margin-top: 14rpx; font-size: 19rpx; line-height: 1.2; color: #fff; text-align: left; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; }
.rule-right .rule-text { margin-top: auto; margin-bottom: 18rpx; }
.cell.on .cell-no { color: #fff7bc; }
.cell.on .cell-bg { filter: drop-shadow(0 0 8rpx #ffc64b); }
.dice-hit { position: absolute; z-index: 2; left: 38.63%; top: 77.08%; width: 25.95%; height: 11.9%; }
.dice-face, .dice-img { width: 100%; height: 100%; }
.dice-face.rolling { animation: dice-tumble .55s linear infinite; }
.dice-face.settled { animation: dice-settle .46s ease-out; }
@keyframes dice-tumble { 0%, 100% { transform: rotate(-12deg); } 25% { transform: rotate(10deg) translateY(-16rpx); } 50% { transform: rotate(-8deg) translateY(3rpx); } 75% { transform: rotate(12deg) translateY(-8rpx); } }
@keyframes dice-settle { 0% { transform: scale(1.12); } 55% { transform: scale(.96); } 100% { transform: scale(1); } }
.load-status { position: absolute; z-index: 3; left: 10%; right: 10%; bottom: 4%; color: #765324; font-size: 24rpx; text-align: center; }
.retry { display: block; margin-top: 12rpx; text-decoration: underline; }
.action { position: absolute; z-index: 2; left: 18%; right: 18%; top: 91.4%; height: 4%; }
.primary-button { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #684719; font-size: 28rpx; font-weight: 600; letter-spacing: 5rpx; }
.primary-button-bg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
.primary-button-text { position: relative; z-index: 1; }
.rule-mask { position: fixed; z-index: 99; left: 0; top: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; background: rgba(61, 43, 18, .45); }
.rule-dialog { width: 560rpx; max-height: 65vh; overflow-y: auto; padding: 40rpx; box-sizing: border-box; border-radius: 32rpx; background: #fff9e9; border: 2rpx solid #f1c76a; box-shadow: 0 24rpx 60rpx rgba(83, 56, 14, .25); }
.rule-dialog-title { display: block; font-size: 32rpx; font-weight: 700; color: #8b6126; text-align: center; }
.rule-dialog-content { display: block; margin-top: 24rpx; font-size: 28rpx; line-height: 1.7; color: #765324; white-space: pre-wrap; }
.rule-dialog-button { margin-top: 32rpx; height: 76rpx; line-height: 76rpx; text-align: center; border-radius: 999rpx; font-size: 28rpx; color: #684719; background: linear-gradient(135deg, #ffe59b, #efb758); }
</style>
