<template>
	<view class="page">
		<view v-if="activity" class="activity-card">
			<view class="activity-kind">{{ bizType === 'job_week' ? '就业活动' : '生涯活动' }}</view>
			<text class="activity-title">{{ activity.title }}</text>
			<text class="activity-time">{{ activity.startTime || '-' }} 至 {{ activity.endTime || '-' }}</text>
		</view>
		<view v-if="activity" class="section-title">当前活动游戏</view>
		<view v-for="game in games" :key="game.gameId" class="game-card" @click="openGame(game)">
			<view class="game-main">
				<view class="game-icon">游</view>
				<view class="game-info">
					<text class="game-title">{{ game.title || game.gameType }}</text>
					<text class="area-name">{{ game.areaTitle || '未设置区域' }}</text>
				</view>
				<text class="arrow">›</text>
			</view>
			<view class="game-counts">
				<view><text class="count">{{ game.participantCount || 0 }}</text><text>参与人数</text></view>
				<view><text class="count success">{{ game.completedCount || 0 }}</text><text>已完成</text></view>
				<view><text class="count warning">{{ game.inProgressCount || 0 }}</text><text>进行中</text></view>
			</view>
		</view>
		<view v-if="!loading && !activity" class="empty">
			<text class="empty-title">暂无当前活动</text>
			<text>本校当前没有进行中的{{ bizType === 'job_week' ? '就业活动' : '生涯活动' }}</text>
		</view>
		<view v-else-if="!loading && activity && !games.length" class="empty">当前活动暂未配置游戏</view>
	</view>
</template>

<script>
	import { getActivityStatistics } from '@/api/staff.js'
	export default {
		data: () => ({ bizType: 'career_week', activity: null, games: [], loading: false }),
		onLoad(options) {
			this.bizType = options.bizType === 'job_week' ? 'job_week' : 'career_week'
			uni.setNavigationBarTitle({ title: this.bizType === 'job_week' ? '就业活动统计' : '生涯活动统计' })
		},
		onShow() { this.load() },
		methods: {
			async load() {
				this.loading = true
				try {
					const res = await getActivityStatistics(this.bizType)
					this.activity = res.data ? res.data.activity : null
					this.games = res.data ? (res.data.games || []) : []
				} catch (e) {
					uni.showToast({ title: e.message || '活动统计加载失败', icon: 'none' })
				} finally { this.loading = false }
			},
			openGame(game) { uni.navigateTo({ url: `/pages/staff/game-statistics?gameId=${game.gameId}` }) }
		}
	}
</script>

<style scoped>
	.page { min-height: 100vh; box-sizing: border-box; padding: 28rpx 24rpx 50rpx; background: #f4f7fb; color: #1a2c4a }
	.activity-card { padding: 34rpx; border-radius: 24rpx; color: #fff; background: linear-gradient(135deg, #2878ed, #55b7f5); box-shadow: 0 12rpx 28rpx rgba(47,128,237,.2) }
	.activity-kind { display: inline-block; padding: 7rpx 18rpx; border-radius: 20rpx; background: rgba(255,255,255,.2); font-size: 22rpx }
	.activity-title { display: block; margin-top: 22rpx; font-size: 36rpx; font-weight: 700 }
	.activity-time { display: block; margin-top: 12rpx; color: rgba(255,255,255,.86); font-size: 23rpx }
	.section-title { margin: 34rpx 6rpx 18rpx; font-size: 30rpx; font-weight: 700 }
	.game-card { margin-bottom: 22rpx; padding: 28rpx; border-radius: 22rpx; background: #fff; box-shadow: 0 6rpx 18rpx rgba(31,65,112,.06) }
	.game-main { display: flex; align-items: center }
	.game-icon { width: 68rpx; height: 68rpx; line-height: 68rpx; border-radius: 18rpx; text-align: center; color: #2f80ed; background: #eaf2ff; font-weight: 700 }
	.game-info { flex: 1; min-width: 0; margin-left: 20rpx }
	.game-title { display: block; font-size: 29rpx; font-weight: 700 }
	.area-name { display: block; margin-top: 7rpx; color: #8a9aae; font-size: 22rpx }
	.arrow { color: #9bacc0; font-size: 42rpx }
	.game-counts { display: flex; margin-top: 24rpx; padding-top: 22rpx; border-top: 1rpx solid #edf1f6 }
	.game-counts view { flex: 1; text-align: center; color: #8a9aae; font-size: 21rpx }
	.game-counts view + view { border-left: 1rpx solid #edf1f6 }.game-counts text { display: block }
	.count { margin-bottom: 6rpx; color: #1a2c4a; font-size: 32rpx; font-weight: 700 }.success { color: #25ad70 }.warning { color: #f29a38 }
	.empty { padding: 180rpx 30rpx; text-align: center; color: #9aaabd; font-size: 25rpx }.empty-title { display: block; margin-bottom: 14rpx; color: #52657c; font-size: 30rpx; font-weight: 700 }
</style>
