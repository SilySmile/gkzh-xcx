<template>
	<view class="report-container">
		<uni-nav-bar
			dark
			:fixed="true"
			shadow
			background-color="#007AFF"
			status-bar
			title="个人报告"
			left-icon="left"
			@clickLeft="back"
			:border="false"
		/>

		<scroll-view scroll-y class="scroll-body">
			<view v-if="loading" class="empty">加载中...</view>
			<view v-else-if="!sections.length" class="empty">暂无游戏报告</view>
			<view v-else class="report-list">
				<view v-for="section in sections" :key="section.areaId" class="area-section">
					<view class="area-title">{{ section.title }}</view>
					<view
						v-for="game in section.games"
						:key="game.gameId"
						class="game-card"
						@click="openReport(game)"
					>
						<view class="game-info">
							<text class="game-title">{{ game.title }}</text>
							<text class="game-type">{{ typeName(game.gameType) }}</text>
						</view>
						<view class="game-status" :class="game.isFinish ? 'finish' : (game.isFail ? 'fail' : '')">
							{{ game.isFinish ? '已完成' : (game.isFail ? '未通过' : '未完成') }}
						</view>
					</view>
				</view>
			</view>

		</scroll-view>

		<view class="footer-bar">
			<button class="download-all-btn" @click="downloadAllPdf">下载全部报告PDF</button>
		</view>
	</view>
</template>

<script>
import { getWeekFlow } from '@/api/activity/week'
import { getMyResult as getZytjResult } from '@/api/zytj.js'
import { getReport as getSszctopReport } from '@/api/sszctop.js'
import { createAllReportCache } from '@/api/xycc.js'
import config from '@/config/api.js'

export default {
	data() {
		return {
			loading: true,
			activityId: null,
			sections: []
		}
	},
	onLoad(options) {
		this.activityId = options.activityId || uni.getStorageSync('activityId')
		if (!this.activityId) {
			uni.showToast({ title: '参数错误', icon: 'none' })
			this.loading = false
			return
		}
		this.loadGames()
	},
	methods: {
		back() {
			uni.navigateBack()
		},
		typeName(type) {
			const map = {
				'mind-window': '心愿橱窗',
				'zytj': '职愿探究',
				'sszctop': '谁是职场TOP',
				'zyxxz': '职业信息站',
				'wjyd': '职场危机应对',
				'cyzs': '创业知识',
				'lottery': '抽奖',
				'check-in': '签到',
				'check-out': '签退',
				'survey': '问卷调查'
			}
			return map[type] || type
		},
		async loadGames() {
			try {
				const flowRes = await getWeekFlow(this.activityId)
				if (flowRes.code !== 200 || !flowRes.data) {
					return
				}
				this.sections = (flowRes.data.areas || []).map(area => ({
					areaId: area.areaId,
					title: area.title,
					games: area.games || []
				}))
			} finally {
				this.loading = false
			}
		},
		async openReport(game) {
			// 职场TOP“未通过”同样为最终状态，允许查看失败后的正确排序与职业解释。
			const sszctopTerminal = game.gameType === 'sszctop' && (game.isFinish || game.isFail)
			if (!game.isFinish && !sszctopTerminal) {
				uni.showToast({ title: '请先完成该游戏', icon: 'none' })
				return
			}
			if (game.gameType === 'mind-window') {
				uni.navigateTo({ url: '/pages/xycc/result?activityId=' + this.activityId })
				return
			}
			if (game.gameType === 'zytj') {
				try {
					const res = await getZytjResult(this.activityId)
					if (res.code === 200 && res.data) {
						uni.navigateTo({
							url: '/pages/zytj/result?code=' + res.data.choiceCode + '&activityId=' + this.activityId
						})
					} else {
						uni.showToast({ title: '报告加载失败', icon: 'none' })
					}
				} catch (e) {
					uni.showToast({ title: '报告加载失败', icon: 'none' })
				}
				return
			}
			if (game.gameType === 'sszctop') {
				try {
					const res = await getSszctopReport(game.gameId)
					if (res.code === 200 && res.data) uni.navigateTo({ url: '/pages/sszctop/report?gameId=' + game.gameId })
					else uni.showToast({ title: '报告加载失败', icon: 'none' })
				} catch (e) { uni.showToast({ title: '报告加载失败', icon: 'none' }) }
				return
			}
			uni.showToast({ title: '该游戏暂无独立报告页', icon: 'none' })
		},
		downloadAllPdf() {
			if (!this.activityId) return uni.showToast({ title: '缺少活动信息，请返回重新进入', icon: 'none' })
			uni.showLoading({ title: '生成全部游戏报告' })
			createAllReportCache(this.activityId).then(res => {
				const path = res.data
				if (!path || path.indexOf('/profile/report-cache/') !== 0 || !path.endsWith('.zip')) {
					throw new Error('报告压缩包生成失败，请重试')
				}
				const reportUrl = config.BASE_URL + path
				uni.setClipboardData({
					data: reportUrl,
					success: () => uni.showModal({
						title: '全部游戏报告已生成',
						content: '压缩包已按区域和游戏分类，链接已复制，请粘贴到浏览器下载。',
						showCancel: false,
						confirmText: '知道了'
					})
				})
			}).catch(error => uni.showToast({
				title: error.message || '报告压缩包生成失败，请重试',
				icon: 'none'
			})).finally(() => uni.hideLoading())
		}
	}
}
</script>

<style scoped>
.report-container {
	min-height: 100vh;
	background: #f5f7fa;
}
.scroll-body {
	height: calc(100vh - 216rpx);
}
.empty {
	padding: 80rpx 0;
	text-align: center;
	color: #909399;
}
.report-list {
	padding: 24rpx;
}
.area-section {
	margin-bottom: 30rpx;
}
.area-title {
	font-size: 30rpx;
	font-weight: 700;
	color: #1a2c4a;
	margin-bottom: 16rpx;
}
.game-card {
	background: #ffffff;
	border-radius: 18rpx;
	padding: 26rpx;
	margin-bottom: 18rpx;
	display: flex;
	justify-content: space-between;
	align-items: center;
	box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.05);
}
.game-info {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}
.game-title {
	font-size: 30rpx;
	font-weight: 700;
	color: #1a2c4a;
}
.game-type {
	font-size: 24rpx;
	color: #7f8c9b;
}
.game-status {
	font-size: 24rpx;
	color: #909399;
}
.game-status.finish {
	color: #27ae60;
}
.game-status.fail {
    color: #e52020;
}
.footer-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    background: #ffffff;
    padding: 16rpx 24rpx 24rpx;
    box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
}
.download-all-btn {
    width: 100%;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: #ffffff;
    border: none;
    border-radius: 50rpx;
    font-size: 32rpx;
    font-weight: 600;
}
</style>
