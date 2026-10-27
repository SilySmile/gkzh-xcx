<template>
	<view class="page">
		<zyjdc-header title="职业角斗场" @back="confirmBack" />

		<view class="top-info">
			<view class="timer" :class="{ urgent: remainingSeconds <= 30 }">
				<text class="timer-label">剩余时间</text>
				<text class="timer-value">{{ timeText }}</text>
			</view>
			<view class="role-tag">
				<text class="role-tag-label">你的角色</text>
				<text class="role-tag-value">{{ roleName || '—' }} · {{ jobTitle || '' }}</text>
			</view>
			<view class="rule-button" @click="rulesVisible = true">?</view>
		</view>

		<view class="status-bar">
			<view class="side ai-side">
				<text class="side-name">电脑</text>
				<text class="side-count">{{ aiCount }} 枚</text>
			</view>
			<view class="turn-hint">{{ turnHint }}</view>
			<view class="side player-side">
				<text class="side-name">你</text>
				<text class="side-count">{{ playerCount }} 枚</text>
			</view>
		</view>

		<view class="board-wrap">
			<view class="board">
				<view v-for="cell in cells" :key="cell.key" class="cell" :class="cellClass(cell)" @click="tapCell(cell)">
					<view v-if="cell.token" class="piece" :class="{ selected: isSelected(cell), ai: cell.side === 'ai' }">
						<image v-if="cell.imageUrl" class="piece-img" :src="imageUrl(cell.imageUrl)" mode="aspectFit" />
						<view v-else class="piece-fallback">{{ cell.name }}</view>
						<view class="rank">{{ cell.rank }}</view>
					</view>
					<view v-if="isTarget(cell)" class="target-dot" :class="{ capture: !!cell.token }"></view>
				</view>
			</view>
		</view>

		<view class="bottom-panel">
			<view class="hint">{{ moving ? '电脑正在思考…' : actionHint }}</view>
			<view class="legend">
				<text class="legend-item">老鼠吃大象</text>
				<text class="legend-item">同级可吃</text>
				<text class="legend-item">3 分钟</text>
			</view>
		</view>

		<view v-if="rulesVisible" class="modal-mask" @click.self="rulesVisible = false">
			<view class="modal">
				<view class="modal-title">对弈规则</view>
				<scroll-view scroll-y class="modal-body">
					<view class="modal-rule">1. 8 种动物等级：大象 &gt; 狮子 &gt; 老虎 &gt; 豹子 &gt; 狼 &gt; 狐 &gt; 猫 &gt; 老鼠；老鼠可以吃大象，大象不能吃老鼠。</view>
					<view class="modal-rule">2. 每次只能上下左右移动一格；目标为空地可移动，目标为敌方棋子时，攻击方等级不低于对方即可吃掉，同级可吃。</view>
					<view class="modal-rule">3. 3 分钟内吃光对方即获胜；时间到时比较双方剩余最高等级棋子，等级高者胜；等级相同再比剩余数量，仍相同为平局。</view>
					<view class="modal-rule">4. 轮到一方时若没有任何合法走法，该方判负。失败或平局可以重新挑战，通关后结果只读。</view>
					<view class="modal-note">对局中查看规则不会暂停计时，请合理分配时间。</view>
				</scroll-view>
				<view class="modal-close" @click="rulesVisible = false">知道了</view>
			</view>
		</view>

		<view v-if="settling" class="settle-mask">
			<text>时间到，正在结算…</text>
		</view>
	</view>
</template>

<script>
	import { getRecord, movePiece, userMessage } from '@/api/zyjdc'
	import ZyjdcHeader from '@/components/ZyjdcHeader.vue'
	import config from '@/config/api.js'

	export default {
		components: { ZyjdcHeader },
		data: () => ({
			instanceId: '',
			gameId: '',
			recordId: '',
			board: [],
			pieceMeta: {},
			turn: 'player',
			remainingSeconds: 180,
			legalMoves: [],
			roleName: '',
			jobTitle: '',
			selected: null,
			moving: false,
			settling: false,
			rulesVisible: false,
			lastMove: null,
			hasLoaded: false,
			timer: null,
			redirecting: false
		}),
		computed: {
			cells() {
				const rows = []
				for (let r = 0; r < 4; r++) {
					for (let c = 0; c < 4; c++) {
						const token = (this.board[r] && this.board[r][c]) || null
						const code = token ? token.split(':')[1] : ''
						const side = token ? token.split(':')[0] : ''
						const meta = code ? (this.pieceMeta[code] || {}) : {}
						rows.push({
							key: r + '-' + c,
							row: r,
							col: c,
							token,
							code,
							side,
							name: meta.roleName || code || '',
							imageUrl: meta.imageUrl || '',
							rank: meta.rankLevel || 0
						})
					}
				}
				return rows
			},
			playerCount() {
				return this.cells.filter(cell => cell.side === 'player').length
			},
			aiCount() {
				return this.cells.filter(cell => cell.side === 'ai').length
			},
			timeText() {
				const value = Math.max(0, this.remainingSeconds || 0)
				const m = Math.floor(value / 60)
				const s = value % 60
				return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s)
			},
			turnHint() {
				if (this.moving) return '电脑思考中'
				return this.turn === 'player' ? '轮到你走子' : '电脑走子中'
			},
			actionHint() {
				if (!this.selected) return '点击你的棋子，再点击空位或敌方棋子落子'
				return '已选中棋子，点击发光的位置落子'
			},
			selectedTargets() {
				if (!this.selected) return []
				return this.legalMoves.filter(move => move.fromRow === this.selected.row && move.fromCol === this.selected.col)
			}
		},
		async onLoad(options) {
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			this.recordId = options.recordId || ''
			if (!this.recordId) {
				uni.showToast({ title: '游戏记录不存在，请重新扫码', icon: 'none' })
				return
			}
			await this.load()
		},
		onShow() {
			if (this.hasLoaded) this.load(false)
		},
		onUnload() {
			this.clearTimer()
			try { uni.setKeepScreenOn({ keepScreenOn: false }) } catch (e) {}
		},
		methods: {
			imageUrl(value) {
				if (!value) return ''
				if (/^https?:\/\//i.test(value)) return value
				return config.BASE_URL + (value.charAt(0) === '/' ? value : '/' + value)
			},
			baseUrl(path) {
				return `${path}?recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
			},
			clearTimer() {
				if (this.timer) {
					clearInterval(this.timer)
					this.timer = null
				}
			},
			startTimer() {
				this.clearTimer()
				this.timer = setInterval(() => {
					if (this.remainingSeconds > 0) {
						this.remainingSeconds -= 1
					}
					if (this.remainingSeconds <= 0) {
						this.clearTimer()
						this.settleTimeout()
					}
				}, 1000)
			},
			async load(showError = true) {
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = res.data || {}
					if (data.status === 'finished' || (data.result && data.stage === 'finished')) {
						this.goResult()
						return
					}
					if (data.stage === 'role_selected') {
						uni.redirectTo({ url: this.baseUrl('/pages/zyjdc/role') })
						return
					}
					if (data.stage === 'entered') {
						uni.redirectTo({ url: this.baseUrl('/pages/zyjdc/select') })
						return
					}
					this.board = data.board || []
					this.pieceMeta = data.pieceMeta || {}
					this.turn = data.turn || 'player'
					this.remainingSeconds = Number(data.remainingSeconds || 0)
					this.legalMoves = data.legalMoves || []
					this.roleName = data.roleName || ''
					this.jobTitle = data.jobTitle || ''
					this.hasLoaded = true
					if (this.remainingSeconds <= 0) {
						this.settleTimeout()
						return
					}
					this.startTimer()
					try { uni.setKeepScreenOn({ keepScreenOn: true }) } catch (e) {}
				} catch (e) {
					if (showError) uni.showToast({ title: userMessage(e, '对局加载失败，请重新进入'), icon: 'none' })
				}
			},
			isSelected(cell) {
				return this.selected && this.selected.row === cell.row && this.selected.col === cell.col
			},
			isTarget(cell) {
				return this.selectedTargets.some(move => move.toRow === cell.row && move.toCol === cell.col)
			},
			cellClass(cell) {
				const classes = [(cell.row + cell.col) % 2 === 0 ? 'light' : 'dark']
				if (this.isSelected(cell)) classes.push('selected-cell')
				if (this.isTarget(cell)) classes.push('target-cell')
				if (this.lastMove) {
					if (this.lastMove.toRow === cell.row && this.lastMove.toCol === cell.col) classes.push('last-to')
					if (this.lastMove.fromRow === cell.row && this.lastMove.fromCol === cell.col) classes.push('last-from')
				}
				return classes.join(' ')
			},
			tapCell(cell) {
				if (this.moving || this.settling || this.turn !== 'player') return
				if (cell.side === 'player') {
					if (cell.token) {
						this.selected = { row: cell.row, col: cell.col }
					}
					return
				}
				if (!this.selected) return
				const target = this.selectedTargets.find(move => move.toRow === cell.row && move.toCol === cell.col)
				if (!target) {
					this.selected = null
					return
				}
				this.doMove(target)
			},
			async doMove(move) {
				if (this.moving) return
				this.moving = true
				this.lastMove = null
				try {
					const res = await movePiece(this.recordId, {
						fromRow: move.fromRow,
						fromCol: move.fromCol,
						toRow: move.toRow,
						toCol: move.toCol
					})
					const data = res.data || {}
					this.board = data.board || this.board
					this.pieceMeta = data.pieceMeta || this.pieceMeta
					this.turn = data.turn || 'ai'
					this.remainingSeconds = Number(data.remainingSeconds != null ? data.remainingSeconds : this.remainingSeconds)
					this.legalMoves = data.legalMoves || []
					this.selected = null
					this.lastMove = data.aiMove || data.playerMove || null
					if (data.playerMove && data.playerMove.captured) {
						this.showCapture(data.playerMove.captured)
					}
					if (data.aiMove && data.aiMove.captured) {
						setTimeout(() => this.showCapture(data.aiMove.captured), 180)
					}
					if (data.result) {
						this.clearTimer()
						setTimeout(() => this.goResult(), 900)
						return
					}
					if (data.stage === 'finished') {
						this.clearTimer()
						setTimeout(() => this.goResult(), 900)
						return
					}
					this.startTimer()
				} catch (e) {
					uni.showToast({ title: userMessage(e, '落子失败，请重试'), icon: 'none' })
					await this.load(false)
				} finally {
					this.moving = false
				}
			},
			showCapture(code) {
				const meta = this.pieceMeta[code] || {}
				uni.showToast({ title: '吃掉' + (meta.roleName || '对方棋子'), icon: 'none', duration: 900 })
			},
			async settleTimeout() {
				if (this.settling) return
				this.settling = true
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = res.data || {}
					if (data.status === 'finished' || data.result) {
						this.goResult()
						return
					}
					this.remainingSeconds = Number(data.remainingSeconds || 0)
					if (this.remainingSeconds > 0) this.startTimer()
				} catch (e) {
					uni.showToast({ title: userMessage(e, '结算失败，请返回活动页重试'), icon: 'none' })
				} finally {
					this.settling = false
				}
			},
			goResult() {
				if (this.redirecting) return
				this.redirecting = true
				this.clearTimer()
				uni.redirectTo({ url: this.baseUrl('/pages/zyjdc/result') })
			},
			confirmBack() {
				if (this.settling) return
				uni.showModal({
					title: '离开对局',
					content: '离开后 3 分钟计时仍会继续，可从活动页重新进入本局。确定离开吗？',
					success: res => {
						if (!res.confirm) return
						this.clearTimer()
						const pages = getCurrentPages()
						if (pages.length > 1) {
							uni.navigateBack({ delta: 1 })
						} else {
							uni.reLaunch({ url: '/pages/mp/home/index' })
						}
					}
				})
			}
		}
	}
</script>

<style scoped>
	.page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: linear-gradient(165deg, #07172a 0%, #0b2540 58%, #0f3552 100%);
	}

	.top-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8rpx 28rpx 0;
	}

	.timer {
		display: flex;
		flex-direction: column;
		min-width: 150rpx;
		padding: 10rpx 18rpx;
		border-radius: 18rpx;
		background: rgba(255, 255, 255, 0.08);
		border: 1rpx solid rgba(255, 255, 255, 0.12);
	}

	.timer.urgent {
		background: rgba(230, 80, 80, 0.18);
		border-color: rgba(230, 80, 80, 0.5);
	}

	.timer-label {
		font-size: 20rpx;
		color: rgba(255, 255, 255, 0.55);
	}

	.timer-value {
		margin-top: 2rpx;
		font-size: 40rpx;
		font-weight: 700;
		letter-spacing: 2rpx;
		color: #ffffff;
	}

	.role-tag {
		flex: 1;
		margin: 0 16rpx;
		text-align: center;
	}

	.role-tag-label {
		display: block;
		font-size: 20rpx;
		color: rgba(255, 255, 255, 0.5);
	}

	.role-tag-value {
		display: block;
		margin-top: 4rpx;
		font-size: 24rpx;
		color: #f3c96b;
	}

	.rule-button {
		width: 56rpx;
		height: 56rpx;
		line-height: 52rpx;
		text-align: center;
		font-size: 30rpx;
		font-weight: 600;
		color: #0a2038;
		background: #f3c96b;
		border-radius: 50%;
	}

	.status-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 18rpx 36rpx 10rpx;
	}

	.side {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 100rpx;
	}

	.side-name {
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.72);
	}

	.side-count {
		margin-top: 2rpx;
		font-size: 21rpx;
		color: rgba(255, 255, 255, 0.45);
	}

	.ai-side .side-name {
		color: #ff9d9d;
	}

	.player-side .side-name {
		color: #8fd3ff;
	}

	.turn-hint {
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.6);
	}

	.board-wrap {
		display: flex;
		justify-content: center;
		margin-top: 10rpx;
	}

	.board {
		display: flex;
		flex-wrap: wrap;
		width: 648rpx;
		padding: 10rpx;
		border-radius: 24rpx;
		background: #071426;
		box-shadow: 0 18rpx 44rpx rgba(0, 0, 0, 0.35), inset 0 0 0 2rpx rgba(243, 201, 107, 0.18);
	}

	.cell {
		position: relative;
		width: 150rpx;
		height: 150rpx;
		margin: 3rpx;
		border-radius: 14rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		transition: background 0.15s ease, box-shadow 0.15s ease;
	}

	.cell.light {
		background: #e9eef2;
	}

	.cell.dark {
		background: #163f66;
	}

	.cell.selected-cell {
		box-shadow: inset 0 0 0 5rpx #f3c96b;
	}

	.cell.target-cell {
		box-shadow: inset 0 0 0 4rpx rgba(243, 201, 107, 0.75);
	}

	.cell.last-to {
		box-shadow: inset 0 0 0 5rpx #ffd985;
	}

	.cell.last-from {
		box-shadow: inset 0 0 0 3rpx rgba(255, 217, 133, 0.45);
	}

	.piece {
		position: relative;
		width: 118rpx;
		height: 118rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.82);
		border: 5rpx solid #2f7fd0;
		box-shadow: 0 6rpx 14rpx rgba(0, 0, 0, 0.24);
		transition: transform 0.12s ease, border-color 0.12s ease;
	}

	.piece.ai {
		border-color: #d94a4a;
		background: rgba(255, 245, 245, 0.9);
	}

	.piece.selected {
		transform: scale(1.08);
		border-color: #f3c96b;
	}

	.piece-img {
		width: 94rpx;
		height: 94rpx;
	}

	.piece-fallback {
		font-size: 22rpx;
		color: #0a2038;
		font-weight: 600;
	}

	.rank {
		position: absolute;
		right: -6rpx;
		bottom: -6rpx;
		width: 34rpx;
		height: 34rpx;
		line-height: 34rpx;
		text-align: center;
		font-size: 19rpx;
		font-weight: 700;
		color: #0a2038;
		background: #f3c96b;
		border-radius: 50%;
		border: 2rpx solid #071426;
	}

	.target-dot {
		position: absolute;
		width: 34rpx;
		height: 34rpx;
		border-radius: 50%;
		background: rgba(243, 201, 107, 0.85);
		box-shadow: 0 0 16rpx rgba(243, 201, 107, 0.65);
	}

	.target-dot.capture {
		width: 54rpx;
		height: 54rpx;
		background: transparent;
		border: 5rpx solid #ff7b7b;
		box-shadow: 0 0 16rpx rgba(255, 123, 123, 0.7);
	}

	.bottom-panel {
		margin-top: 26rpx;
		padding: 0 36rpx;
		text-align: center;
	}

	.hint {
		font-size: 25rpx;
		color: rgba(255, 255, 255, 0.72);
	}

	.legend {
		display: flex;
		justify-content: center;
		margin-top: 16rpx;
	}

	.legend-item {
		margin: 0 12rpx;
		padding: 6rpx 16rpx;
		border-radius: 20rpx;
		font-size: 21rpx;
		color: rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.06);
	}

	.modal-mask,
	.settle-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(3, 12, 22, 0.72);
	}

	.modal {
		width: 620rpx;
		max-height: 76vh;
		padding: 30rpx 28rpx 24rpx;
		border-radius: 26rpx;
		background: #12324f;
		border: 1rpx solid rgba(243, 201, 107, 0.3);
	}

	.modal-title {
		text-align: center;
		font-size: 32rpx;
		font-weight: 600;
		color: #f3c96b;
	}

	.modal-body {
		max-height: 52vh;
		margin-top: 18rpx;
	}

	.modal-rule {
		margin-bottom: 16rpx;
		font-size: 25rpx;
		line-height: 1.8;
		color: rgba(255, 255, 255, 0.82);
	}

	.modal-note {
		margin-top: 8rpx;
		font-size: 22rpx;
		color: #ffb4b4;
	}

	.modal-close {
		margin-top: 22rpx;
		height: 78rpx;
		line-height: 78rpx;
		text-align: center;
		border-radius: 39rpx;
		font-size: 28rpx;
		font-weight: 600;
		color: #0a2038;
		background: #f3c96b;
	}

	.settle-mask {
		font-size: 28rpx;
		color: #ffffff;
	}
</style>
