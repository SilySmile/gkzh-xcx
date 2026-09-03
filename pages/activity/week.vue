<template>
	<view class="week-container">
		<view class="top-bar">
			<text class="back" @click="back">‹</text>
			<text class="title">{{ currentTitle || (instance ? instance.title : '活动') }}</text>
			<view class="placeholder"></view>
		</view>

		<scroll-view scroll-y class="scroll-body">
			<view v-if="loading" class="loading">加载中...</view>

			<view v-else>
				<view v-for="area in areas" :key="area.areaId" class="area-block">
					<view class="area-title">{{ area.title }}</view>
					<view class="game-grid">
						<view
							v-for="game in area.games"
							:key="game.gameId"
							class="game-card"
							@click="playGame(game)"
						>
							<view class="game-name">
								{{ game.title }}
							</view>
							<view class="game-type">{{ game.gameType }}</view>
							<view class="game-tip">请扫描游戏二维码进入</view>
						</view>
					</view>
				</view>

				<view v-if="!areas.length" class="empty">暂无活动区域</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { getWeekFlow, enterWeekGame, getActiveWeek, getWeekGame } from '@/api/activity/week'

export default {
	data() {
		return {
			loading: true,
			instance: null,
			areas: [],
			instanceId: null,
			areaId: null,
			gameId: null,
			schoolId: null,
			bizType: null,
			currentTitle: ''
		}
	},
	onLoad(options) {
		this.instanceId = options.instanceId || null
		this.areaId = options.areaId || null
		this.gameId = options.gameId || null
		this.schoolId = options.schoolId || null
		this.bizType = options.bizType || null

		if (this.instanceId) {
			uni.setStorageSync('activityId', this.instanceId)
			this.loadFlow()
		} else if (this.bizType) {
			this.loadActiveWeek()
		} else {
			this.loading = false
		}

		if (this.gameId) {
			this.enterGame()
		}
	},
	methods: {
		back() {
			uni.navigateBack()
		},
		loadActiveWeek() {
			getActiveWeek(this.bizType).then(res => {
				if (res.code !== 200 || !res.data) {
					this.loading = false
					return
				}
				this.instanceId = res.data.instanceId
				uni.setStorageSync('activityId', this.instanceId)
				this.loadFlow()
				if (this.gameId) {
					this.enterGame()
				}
			}).catch(() => {
				this.loading = false
			})
		},
		loadFlow() {
			getWeekFlow(this.instanceId).then(res => {
				if (res.code !== 200 || !res.data) {
					this.loading = false
					return
				}
				this.instance = res.data.instance
				this.areas = res.data.areas || []
				this.loading = false
			}).catch(() => {
				this.loading = false
			})
		},
		enterGame() {
			getWeekGame(this.gameId, this.instanceId).then(res => {
				if (res.code === 200 && res.data) {
					const game = res.data
					getWeekFlow(this.instanceId).then(flowRes => {
						let finished = false
						let failed = false
						let belongsToActivity = false
						if (flowRes.code === 200 && flowRes.data) {
							const areas = flowRes.data.areas || []
							for (const area of areas) {
								const target = (area.games || []).find(item => String(item.gameId) === String(game.gameId))
								if (target) belongsToActivity = true
								if (target && target.isFinish) {
									finished = true
								}
								if (target && target.isFail) failed = true
								if (finished || failed) break
							}
						}
						if (!belongsToActivity) {
							uni.showToast({ title: '该游戏不属于当前活动', icon: 'none' })
							return
						}
						// 职场TOP失败即终局，扫码时与成功一样直接打开最终报告，不能重新挑战。
						if (game.gameType === 'sszctop' && (finished || failed)) {
							uni.navigateTo({ url: '/pages/sszctop/report?gameId=' + this.gameId })
							return
						}
						if (finished && game.gameType === 'mind-window') {
							uni.navigateTo({ url: '/pages/xycc/result?activityId=' + this.instanceId })
							return
						}
						if (game.gameType === 'mind-window') {
							uni.navigateTo({ url: '/pages/xycc/start?activityId=' + this.instanceId + '&gameId=' + this.gameId })
							return
						}
						if (game.gameType === 'zycck') {
							this.playGame(game)
							return
						}
						enterWeekGame(this.gameId, this.instanceId).then(() => this.playGame(game)).catch(() => {
							uni.showToast({ title: '游戏入口已失效，请重新扫码进入', icon: 'none' })
						})
					})
				}
			})
		},
		playGame(game) {
			this.currentTitle = game.title
			const activityId = this.instanceId || uni.getStorageSync('activityId')
			let url = ''
			switch (game.gameType) {
				case 'check-in': url = '/pages/checkin/index'; break
				case 'check-out': url = '/pages/signout/index'; break
				case 'lottery': url = '/pages/lottery/index'; break
				case 'survey': url = '/pages/wjdc/index'; break
				case 'mind-window': url = '/pages/xycc/index'; break
				case 'wjyd': url = '/pages/wjyd/index'; break
				case 'cyzs': url = '/pages/cyzs/index'; break
				case 'zytj': url = '/pages/zytj/index'; break
				case 'sszctop': url = '/pages/sszctop/index'; break
				case 'zyxxz': url = '/pages/zyxxz/channel'; break
				case 'zycck': url = '/pages/zycck/start'; break
				default: url = ''
			}
			if (!url) {
				uni.showToast({ title: '该游戏暂未开放', icon: 'none' })
				return
			}
			url += (url.indexOf('?') > -1 ? '&' : '?') + 'activityId=' + activityId
			url += '&title=' + encodeURIComponent(game.title)
			if (game.gameId) url += '&gameId=' + game.gameId
			uni.navigateTo({ url })
		}
	}
}
</script>

<style scoped>
.week-container {
	min-height: 100vh;
	background: #f5f7fb;
}

.top-bar {
	padding: 32rpx 32rpx 24rpx;
	background: #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
}

.back {
	width: 64rpx;
	font-size: 52rpx;
	color: #333;
}

.title {
	position: absolute;
	left: 96rpx;
	right: 96rpx;
	text-align: center;
	font-size: 38rpx;
	font-weight: 700;
	color: #1a2c4a;
}

.placeholder {
	width: 64rpx;
}

.scroll-body {
	height: calc(100vh - 120rpx);
}

.loading,
.empty {
	padding: 80rpx 0;
	text-align: center;
	color: #909399;
}

.area-block {
	margin: 24rpx;
}

.area-title {
	font-size: 30rpx;
	font-weight: 700;
	color: #1a2c4a;
	margin-bottom: 16rpx;
}

.game-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 20rpx;
}

.game-card {
	width: calc(50% - 10rpx);
	box-sizing: border-box;
	background: #ffffff;
	border-radius: 20rpx;
	padding: 24rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.game-name {
	font-size: 28rpx;
	font-weight: 600;
	color: #1a2c4a;
}

.game-type {
	margin-top: 12rpx;
	font-size: 22rpx;
	color: #4a90e2;
}

.game-tip {
	margin-top: 16rpx;
	font-size: 22rpx;
	color: #999999;
}
</style>
