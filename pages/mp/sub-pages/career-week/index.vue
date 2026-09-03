<template>
	<view class="plaza-container">

		<!-- ========== 1. 顶部导航栏 ========== -->
		<view class="nav-bar">
			<view class="nav-back" @click="onBack">
				<text class="back-arrow">✕</text>
			</view>
			<text class="nav-title">{{ bizType === 'job_week' ? '就业活动' : '生涯活动' }}</text>
			<view class="nav-more" @click="onMore">
				<text class="more-icon">•••</text>
			</view>
		</view>

		<scroll-view scroll-y class="scroll-body">

			<!-- 宣传图片 -->
			<view class="promo-wrap" style="margin-top: 24rpx;">
				<image class="promo-banner" :src="bannerUrl || 'https://zhiye.sxgkzh.cn/imgs/xcx/banner1.png'" mode="widthFix" />
			</view>

			<!-- ========== 2. Banner 头部活动大图模块 ========== -->
			<!-- <view class="banner-section">
				<view class="banner-top">
					<view class="banner-logo-row">
						<view class="banner-logo">
							<text class="logo-icon">🏛</text>
							<text class="logo-text">仁能达教育</text>
						</view>
						<text class="banner-year">2022年</text>
					</view>
					<text class="banner-title">线上生涯体验周</text>
					<view class="banner-sub">
						<text class="banner-sub-line">主办单位：仁能达教育科技有限公司</text>
						<text class="banner-sub-line">承办单位：各高校就业指导中心</text>
						<text class="banner-sub-line">技术支持：北京仁能达教育科技有限公司</text>
					</view>
				</view>
				<view class="banner-illustration">
					<text class="illus-building">🏙️</text>
					<text class="illus-person">🏃</text>
				</view>
			</view> -->

			<!-- ========== 3. 用户信息栏 ========== -->
			<view class="user-bar">
				<text class="user-major">啊 {{ majorName || '未知专业' }}</text>
				<text class="user-profile" @click="onProfile">个人资料 ›</text>
			</view>

			<!-- ========== 4. 快捷功能按钮区（1×4 均分） ========== -->
			<view class="quick-section">
				<view class="quick-grid">
					<view
						v-for="item in quickList" :key="item.key"
						class="quick-card"
						@click="handleQuickClick(item)"
					>
						<view class="quick-icon" :style="{ background: item.bg }">{{ item.icon }}</view>
						<text class="quick-label">{{ item.name }}</text>
					</view>
				</view>
			</view>

			<!-- ========== 5. 核心测评任务模块（左右两栏） ========== -->
			<view class="task-wrapper">
				<!-- 左栏 -->
				<view class="task-column">
					<view v-for="group in leftGroups" :key="group.title">
						<text class="task-section-title">{{ group.title }}</text>
						<view
							v-for="task in group.tasks" :key="task.id"
							class="task-card"
						>
							<view class="task-body">
								<text class="task-icon">{{ task.icon }}</text>
								<view class="task-info">
									<text class="task-seq">{{ task.num }}.</text>
									<text class="task-name">{{ task.name }}</text>
								</view>
							</view>
							<view v-if="task.isFinish" class="watermark finish-watermark">完成</view>
							<view v-if="task.isFail" class="watermark fail-watermark">失败</view>
						</view>
					</view>
				</view>

				<!-- 右栏 -->
				<view class="task-column">
					<view v-for="group in rightGroups" :key="group.title">
						<text class="task-section-title">{{ group.title }}</text>
						<view
							v-for="task in group.tasks" :key="task.id"
							class="task-card"
						>
							<view class="task-body">
								<text class="task-icon">{{ task.icon }}</text>
								<view class="task-info">
									<text class="task-seq">{{ task.num }}.</text>
									<text class="task-name">{{ task.name }}</text>
								</view>
							</view>
							<view v-if="task.isFinish" class="watermark finish-watermark">完成</view>
							<view v-if="task.isFail" class="watermark fail-watermark">失败</view>
						</view>
					</view>
				</view>
			</view>

			<!-- ========== 6. 底部版权栏 ========== -->
			<view class="footer-bar">
				<view class="footer-left">
					<text class="footer-logo">🏛</text>
					<text class="footer-text">国科智汇  版权所有</text>
				</view>
			</view>

			<view style="height:40rpx"></view>
		</scroll-view>
	</view>
</template>

<script>
import { getActiveWeek, getWeekFlow, enterWeekGame } from '@/api/activity/week'
import config from '@/config/api.js'
import { checkLottery } from '@/api/lottery.js'
// ============================================================
// 接口说明（后续接入真实 API 时替换模拟数据）：
//   /api/careerWeek/taskList   → 获取所有任务 isFinish / isFail / finishNum
//   /api/careerWeek/finishTask → 完成任务后更新状态
// ============================================================

export default {
	data() {
		return {
			majorName: '',
			bizType: 'career_week',
			instanceId: null,
			bannerUrl: '',

			// 快捷功能按钮
			quickList: [
				{ key: 'consult', icon: '👨‍💼', name: '专家咨询', bg: '#ede7f6' },
				{ key: 'support', icon: '💬', name: '在线支持', bg: '#dce8ff' },
				{ key: 'lottery', icon: '🎉', name: '抽奖',     bg: '#dce8ff' },
				{ key: 'report',  icon: '📋', name: '个人报告', bg: '#dce8ff' }
			],

			// 左栏：生涯成熟度 → 职业胜任力 → 生涯困难诊断
			leftGroups: [],
			rightGroups: []
		}
	},

	onLoad(options) {
		if (options && options.bizType) {
			this.bizType = options.bizType
		}
		// 从 storage 读取专业名称
		const stored = uni.getStorageSync('majorName') || uni.getStorageSync('departmentName')
		if (stored) this.majorName = stored

		// 请求后端任务状态接口，动态渲染完成人数与水印

		this.fetchTaskData()
	},

	methods: {
		normalizeImageUrl(url) {
			if (!url) return ''
			if (url.startsWith('/profile/') || url.startsWith('/upload/')) {
				return config.BASE_URL + url
			}
			return url
		},
		// ── 返回 ──
		onBack() {
			uni.navigateBack()
		},

		// ── 右上角更多 ──
		onMore() {
			uni.showActionSheet({
				itemList: ['刷新数据', '活动规则', '联系客服'],
				success: (res) => {
					if (res.tapIndex === 0) {
						this.fetchTaskData()
					} else if (res.tapIndex === 1) {
						uni.showToast({ title: '活动规则开发中', icon: 'none' })
					} else if (res.tapIndex === 2) {
						uni.showToast({ title: '客服功能开发中', icon: 'none' })
					}
				}
			})
		},

		// ── 个人资料 ──
		onProfile() {
			uni.showToast({ title: '个人资料开发中', icon: 'none' })
			// TODO: uni.navigateTo({ url: '/pages/mp/profile/index' })
		},

		// ── 快捷按钮点击 ──
		async handleQuickClick(item) {
			if (item.key === 'lottery') {
				try {
					const activityId = this.instanceId || uni.getStorageSync('activityId')
					const res = await checkLottery(activityId)
					if (!res.data || !res.data.assigned) {
						uni.showToast({ title: '暂无抽奖活动', icon: 'none' })
						return
					}
					const min = res.data.minFinishCount || 0
					const finished = res.data.finishedCount || 0
					if (finished < min) {
						uni.showToast({ title: `需完成至少 ${min} 个游戏才可抽奖`, icon: 'none' })
						return
					}
					uni.setStorageSync('lotteryId', res.data.lotteryId)
					uni.navigateTo({ url: '/pages/lottery/index' })
				} catch (e) {
					uni.showToast({ title: '抽奖资格校验失败', icon: 'none' })
				}
				return
			}
			if (item.key === 'report') {
				const activityId = this.instanceId || uni.getStorageSync('activityId')
				uni.navigateTo({ url: '/pages/mp/sub-pages/personal-report/index?activityId=' + activityId })
				return
			}
			uni.showToast({ title: item.name + '开发中', icon: 'none' })
		},

		// ── 任务卡片点击 ──
				// ── 任务卡片点击 ──
        		async handleTaskClick(task) {
        			uni.setStorageSync('weekBizType', this.bizType)
        			const activityId = this.instanceId || uni.getStorageSync('activityId')
        			if (task.type === 'lottery') {
        				try {
        					const res = await checkLottery(activityId)
        					if (!res.data || !res.data.assigned) {
        						uni.showToast({ title: '暂无抽奖活动', icon: 'none' })
        						return
        					}
        					const min = res.data.minFinishCount || 0
        					const finished = res.data.finishedCount || 0
        					if (finished < min) {
        						uni.showToast({ title: `需完成至少 ${min} 个游戏才可抽奖`, icon: 'none' })
        						return
        					}
        					uni.setStorageSync('lotteryId', res.data.lotteryId)
        				} catch (e) {
        					uni.showToast({ title: '抽奖资格校验失败', icon: 'none' })
        					return
        				}
        			}
        			if (task.isFinish && task.type === 'mind-window') {
        				uni.navigateTo({
        					url: '/pages/xycc/result?activityId=' + activityId
        				})
        				return
        			}
							if (task.id && task.type !== 'zycck') {
						try {
							// 活动周内进入心愿橱窗也必须携带当前活动实例，防止跨活动进入。
							await enterWeekGame(task.id, this.instanceId)
						} catch (e) {
							uni.showToast({ title: '游戏入口已失效，请重新扫码进入', icon: 'none' })
							return
						}
					}
        			let url = ''
        			switch (task.type) {
        				case 'check-in':
        					url = '/pages/checkin/index'
        					break
        				case 'check-out':
        					url = '/pages/signout/index'
        					break
        				case 'lottery':
        					url = '/pages/lottery/index'
        					break
        				case 'survey':
        					url = '/pages/wjdc/index'
        					break
        				case 'mind-window':
        					url = '/pages/xycc/index'
        					break
        				case 'wjyd':
        					url = '/pages/wjyd/index'
        					break
        				case 'cyzs':
        					url = '/pages/cyzs/index'
        					break
        				case 'zytj':
        					url = '/pages/zytj/index'
        					break
					case 'zyxxz':
        					url = '/pages/zyxxz/channel'
							break

					case 'zycck':
							url = '/pages/zycck/start'
							break
        				default:
        					url = '/pages/activity/week'
        			}
        			if (activityId && url !== '/pages/activity/week') {
        				url += (url.indexOf('?') > -1 ? '&' : '?') + 'activityId=' + activityId
        			}
        			if (task.id && url !== '/pages/activity/week') {
        				url += (url.indexOf('?') > -1 ? '&' : '?') + 'gameId=' + task.id
        			}
        			uni.navigateTo({ url })
        		},


		// ── 获取任务数据（接口） ──
		fetchTaskData() {
			getActiveWeek(this.bizType).then(res => {
				if (res.code !== 200 || !res.data) {
					uni.showModal({
						title: '提示',
						content: '暂无进行中的活动',
						showCancel: false,
						confirmText: '知道了'
					})
					return
				}
				const instanceId = res.data.instanceId
				this.bannerUrl = this.normalizeImageUrl(res.data.bannerUrl)
				this.instanceId = instanceId
				uni.setStorageSync('activityId', instanceId)
				return getWeekFlow(instanceId)
			}).then(flowRes => {
				if (!flowRes || flowRes.code !== 200 || !flowRes.data) {
					return
				}
				this.applyFlowData(flowRes.data.areas || [])
			}).catch(() => {
				uni.showToast({ title: '活动数据加载失败', icon: 'none' })
			})
		},

		// ── 将接口返回数据注入数组 ──
		applyTaskData(groups, dataMap) {
			groups.forEach(group => {
				group.tasks.forEach(task => {
					const d = dataMap[task.id]
					if (d) {
						task.finishNum = d.finishNum
						task.isFinish = d.isFinish
						task.isFail = d.isFail
					}
				})
			})
		},

		applyFlowData(areas) {
			const leftGroups = []
			const rightGroups = []
			let num = 1
			areas.forEach((area, areaIndex) => {
				const tasks = (area.games || []).map(game => {
					const task = {
						id: game.gameId,
						type: game.gameType,
						num: num++,
						name: game.title,
						icon: '🎮',
						finishNum: 0,
						isFinish: !!game.isFinish,
						isFail: !!game.isFail,
						hasNum: true
					}
					return task
				})
				const group = {
					title: area.title,
					tasks
				}
				if (areaIndex % 2 === 0) {
					leftGroups.push(group)
				} else {
					rightGroups.push(group)
				}
			})
			this.leftGroups = leftGroups
			this.rightGroups = rightGroups
		},

		// ── 模拟数据 ──
	}
}
</script>

<style scoped>
.promo-wrap {
	margin: 0 20rpx 20rpx;
	border-radius: 24rpx;
	overflow: hidden;
}

.promo-banner {
	width: 100%;
	display: block;
}

.plaza-container {
	background: #f7f7f7;
	min-height: 100vh;
	display: flex;
	flex-direction: column;
}

/* ================================================================
   1. 顶部导航栏
   ================================================================ */
.nav-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: white;
	padding: 12rpx 28rpx;
	height: 96rpx;
	flex-shrink: 0;
	border-bottom: 1rpx solid #eef2f7;
}
.nav-back {
	width: 64rpx;
	height: 64rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}
.back-arrow {
	font-size: 36rpx;
	color: #333;
	font-weight: 500;
}
.nav-title {
	font-size: 34rpx;
	font-weight: 700;
	color: #1a1a1a;
}
.nav-more {
	width: 64rpx;
	height: 64rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}
.more-icon {
	font-size: 36rpx;
	color: #333;
	font-weight: 700;
	letter-spacing: 4rpx;
}

/* ================================================================
   2. Banner 头部
   ================================================================ */
.banner-section {
	background: linear-gradient(160deg, #fce4ec 0%, #ede7f6 100%);
	margin: 20rpx 20rpx 0;
	border-radius: 24rpx;
	padding: 32rpx 32rpx 16rpx;
	position: relative;
	overflow: hidden;
}
.banner-top {
	position: relative;
	z-index: 1;
}
.banner-logo-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
}
.banner-logo {
	display: flex;
	align-items: center;
	gap: 10rpx;
	background: #e52020;
	padding: 8rpx 20rpx;
	border-radius: 24rpx;
}
.logo-icon {
	font-size: 28rpx;
	color: white;
}
.logo-text {
	font-size: 22rpx;
	color: white;
	font-weight: 600;
}
.banner-year {
	font-size: 24rpx;
	color: #b0b0b0;
}
.banner-title {
	display: block;
	font-size: 44rpx;
	font-weight: 800;
	color: #1856d1;
	margin-bottom: 16rpx;
	line-height: 1.3;
}
.banner-sub {
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}
.banner-sub-line {
	font-size: 20rpx;
	color: #888;
}
.banner-illustration {
	position: absolute;
	bottom: 0;
	right: 0;
	display: flex;
	align-items: flex-end;
	gap: 8rpx;
	z-index: 0;
}
.illus-building {
	font-size: 80rpx;
	opacity: 0.5;
}
.illus-person {
	font-size: 60rpx;
	opacity: 0.6;
}

/* ================================================================
   3. 用户信息栏
   ================================================================ */
.user-bar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin: 16rpx 20rpx;
	background: #f0f2f5;
	border-radius: 16rpx;
	padding: 20rpx 28rpx;
}
.user-major {
	font-size: 26rpx;
	color: #555;
	font-weight: 500;
}
.user-profile {
	font-size: 24rpx;
	color: #4a90e2;
	font-weight: 500;
}
.user-profile:active {
	opacity: 0.7;
}

/* ================================================================
   4. 快捷功能按钮区
   ================================================================ */
.quick-section {
	margin: 0 20rpx 20rpx;
}
.quick-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 14rpx;
}
.quick-card {
	background: white;
	border-radius: 16rpx;
	padding: 22rpx 8rpx 18rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12rpx;
	box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);
}
.quick-card:active {
	background: #f8fafd;
	transform: scale(0.96);
}
.quick-icon {
	width: 72rpx;
	height: 72rpx;
	border-radius: 18rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 36rpx;
}
.quick-label {
	font-size: 22rpx;
	font-weight: 600;
	color: #1a2c4a;
	text-align: center;
}

/* ================================================================
   5. 核心测评任务模块（左右两栏栅格）
   ================================================================ */
.task-wrapper {
	display: flex;
	margin: 0 20rpx;
	gap: 16rpx;
}
.task-column {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}
.task-section-title {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
	color: #1a2c4a;
	padding: 8rpx 0 4rpx 6rpx;
	margin-top: 8rpx;
}
.task-card {
	background: #cce4ff;
	border-radius: 12rpx;
	padding: 18rpx 14rpx;

	margin-bottom: 16rpx;
	position: relative;
}
.task-card:active {
	background: #bdd8f8;
}
.task-body {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}
.task-icon {
	font-size: 34rpx;
}
.task-info {
	display: flex;
	align-items: center;
	gap: 6rpx;
}
.task-seq {
	font-size: 26rpx;
	font-weight: 700;
	color: #1856d1;
}
.task-name {
	font-size: 26rpx;
	font-weight: 600;
	color: #1a2c4a;
}
.task-count {
	font-size: 22rpx;
	color: #6b8299;
}

/* ── 卡片水印：绝对定位 + 旋转 25° ── */
.watermark {
	position: absolute;
	top: 16rpx;
	right: 12rpx;
	font-size: 32rpx;
	font-weight: 800;
	transform: rotate(25deg);
	pointer-events: none;
	z-index: 2;
	white-space: nowrap;
	letter-spacing: 4rpx;
}
.finish-watermark {
	color: rgba(229, 32, 32, 0.45);
}
.fail-watermark {
	color: rgba(0, 120, 231, 0.45);
}

/* ================================================================
   6. 底部版权栏
   ================================================================ */
.footer-bar {
	margin: 28rpx 20rpx 0;
	padding: 24rpx 0;
	border-top: 1rpx solid #e8ecf0;
}
.footer-left {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
}
.footer-logo {
	font-size: 28rpx;
}
.footer-text {
	font-size: 22rpx;
	color: #999;
}
</style>
