<template>
	<view class="mine-container">

		<!-- 标题栏 -->
		<view class="title-bar">
			<text class="title">个人中心</text>
		</view>

		<!-- 滚动区域 -->
		<scroll-view scroll-y class="scroll-body">

			<!-- ① 个人信息卡片 -->
			<view class="profile-card">
				<view class="profile-left">
					<view class="avatar">{{ avatarEmoji }}</view>
					<view class="profile-info">
						<text class="nickname">{{ studentName }}</text>
						<text class="major">{{ majorName }}</text>
					</view>
				</view>
				<!-- 原二维码入口已停用，当前位置改为扫一扫 -->
				<view class="profile-right" @click="goScan">
					<text class="qrcode-icon">📷</text>
					<text class="qrcode-label">扫一扫</text>
				</view>
			</view>

			<!-- ② 统计栏：足迹 / 收藏 / 发布 / 消息 -->
			<view class="stats-card">
				<view class="stat-item" @click="onStat('footprint')">
					<text class="stat-num">{{ stats.footprint }}</text>
					<text class="stat-label">足迹</text>
				</view>
				<view class="stat-item" @click="onStat('favorite')">
					<text class="stat-num">{{ stats.favorite }}</text>
					<text class="stat-label">收藏</text>
				</view>
				<view class="stat-item" @click="onStat('publish')">
					<text class="stat-num">{{ stats.publish }}</text>
					<text class="stat-label">发布</text>
				</view>
				<view class="stat-item" @click="onStat('message')">
					<text class="stat-num">{{ stats.message }}</text>
					<text class="stat-label">消息</text>
				</view>
			</view>

			<!-- ③ 我的成长档案 -->
			<view class="archive-card" @click="onArchive">
				<view class="archive-left">
					<text class="archive-icon">📋</text>
					<text class="archive-title">我的成长档案</text>
				</view>
				<view class="archive-right">
					<text class="archive-link">点击查看</text>
					<text class="archive-arrow">›</text>
				</view>
			</view>

			<!-- ④ 功能入口：八个按钮 -->
			<view class="menu-grid">
				<view
					v-for="item in menuItems" :key="item.key"
					class="menu-item"
					@click="onMenuItem(item)"
				>
					<view class="menu-icon" :style="{ background: item.bg }">{{ item.icon }}</view>
					<text class="menu-label">{{ item.name }}</text>
				</view>
			</view>

			<view class="logout-wrap">
				<button class="logout-btn" @click="onLogout">退出登录</button>
			</view>
			<view style="height:220rpx"></view>
		</scroll-view>

		<!-- 底部导航 -->
		<view class="bottom-nav">
			<view
				v-for="item in navItems" :key="item.label"
				:class="item.center ? 'nav-center' : ['nav-item', activeNav === item.label ? 'active' : '']"
				@click="onNav(item)"
			>
				<template v-if="item.center">
					<view class="nav-center-icon">{{ item.icon }}</view>
					<text class="nav-label">{{ item.label }}</text>
				</template>
				<template v-else>
					<text class="nav-icon">{{ item.icon }}</text>
					<text class="nav-label">{{ item.label }}</text>
				</template>
			</view>
		</view>
	</view>
</template>

<script>
import { getWeekFlow, enterWeekGame } from '@/api/activity/week'

export default {
	data() {
		return {
			activeNav: '我的',
			studentName: '',
			majorName: '',
			avatarEmoji: '👤',
			stats: {
				footprint: 0,
				favorite: 0,
				publish: 0,
				message: 0
			},
			// ... existing code ...
						menuItems: [
							{ key: 'study',    icon: '📖', name: '我的学习',   bg: '#e3f2fd' },
							{ key: 'practice', icon: '🧭', name: '我的实践',   bg: '#e8f5e9' },
							{ key: 'class',    icon: '🏫', name: '我的班级',   bg: '#fff3e0' },
							{ key: 'circle',   icon: '💬', name: '我的圈子',   bg: '#ede7f6' },
							{ key: 'interview',icon: '🤖', name: '我的面试',   bg: '#fce4ec' },
							{ key: 'resume',   icon: '📄', name: '我的简历',   bg: '#e0f2f1' },
							{ key: 'job',      icon: '💼', name: '我的就业',   bg: '#f3e5f5' },
							{ key: 'service',  icon: '🎧', name: '客服入口',   bg: '#fff8e1' },
							{ key: 'about',    icon: 'ℹ️', name: '关于我们',   bg: '#e8eaf6' },
							{ key: 'feedback', icon: '✍️', name: '反馈建议',   bg: '#fce4ec' }
						],
			// ... existing code ...

			navItems: [
				{ label: '首页', icon: '🏠', route: '/pages/mp/home/index' },
				{ label: '学习', icon: '📖', route: '/pages/mp/study/index' },
				{ label: 'AI就业', icon: '🤖', center: true, route: '/pages/mp/ai-job/index' },
				{ label: '实践', icon: '🧭', route: '/pages/mp/practice/index' },
				{ label: '我的', icon: '👤', route: '/pages/mp/mine/index' }
			]
		}
	},
	onLoad() {
		this.initPage()
	},
	methods: {
		initPage() {
			// 从 storage 读取学生姓名和专业
			// 后续接入真实 API 时替换为从后端获取完整用户信息
			this.studentName = uni.getStorageSync('studentName') || '同学'
			this.majorName = uni.getStorageSync('majorName') || uni.getStorageSync('departmentName') || '未知专业'
			
			// 根据性别设置头像
			const gender = uni.getStorageSync('gender')
			if (gender === '1') this.avatarEmoji = '👩'
			else if (gender === '0') this.avatarEmoji = '👨'

			// TODO: 接入真实接口获取统计数据
			// fetchUserStats().then(res => { this.stats = res.data })
		},

		/*
		 * 原“二维码”入口已停用：
		 * onQrcode() {
		 *   uni.showToast({ title: '二维码功能开发中', icon: 'none' })
		 * }
		 */
		goScan() {
			uni.scanCode({
				success: (res) => this.handleScanResult(res.result),
				fail: () => {}
			})
		},

		async handleScanResult(result) {
			if (result && (result.indexOf('/pages/activity/week') > -1 || result.indexOf('/pages/xycc/start') > -1 || result.indexOf('/pages/sszctop/index') > -1)) {
				uni.setStorageSync('scanEntry', '1')
				const hashIndex = result.indexOf('#')
				const idx = result.indexOf('?', hashIndex >= 0 ? hashIndex : 0)
				const query = idx > -1 ? result.substring(idx + 1) : ''
				const params = {}
				query.split('&').forEach(pair => {
					if (!pair) return
					const [key, value] = pair.split('=')
					params[decodeURIComponent(key)] = decodeURIComponent(value || '')
				})
				const isXyccStartCode = result.indexOf('/pages/xycc/start') > -1
				const isSszctopDirectCode = result.indexOf('/pages/sszctop/index') > -1
				const map = {
					'mind-window': '/pages/xycc/index',
					'lottery': '/pages/lottery/index',
					'check-in': '/pages/checkin/index',
					'check-out': '/pages/signout/index',
					'survey': '/pages/wjdc/index',
					'wjyd': '/pages/wjyd/index',
					'cyzs': '/pages/cyzs/index',
					'zytj': '/pages/zytj/index',
					// 职场TOP二维码使用统一活动入口，扫码后进入职场TOP房间页。
					'sszctop': '/pages/sszctop/index',
					'zyxxz': '/pages/zyxxz/channel'
				}
				const gameUrl = isXyccStartCode ? '/pages/xycc/index' : (isSszctopDirectCode ? '/pages/sszctop/index' : (map[params.gameType] || ''))
				if (!gameUrl) {
					uni.showModal({ title: '提示', content: '二维码缺少游戏类型，请到Web后台重新生成游戏二维码', showCancel: false })
					return
				}
				const suffix = (gameUrl.indexOf('?') > -1 ? '&' : '?') + 'activityId=' + (params.instanceId || '') + '&gameId=' + (params.gameId || '') + (params.roomCode ? '&roomCode=' + params.roomCode : '')
				if ((params.gameType === 'mind-window' || isXyccStartCode) && params.instanceId) {
					getWeekFlow(params.instanceId).then(flowRes => {
						let finished = false
						let belongsToActivity = false
						if (flowRes.code === 200 && flowRes.data) {
							(flowRes.data.areas || []).forEach(area => {
								const target = (area.games || []).find(item => String(item.gameId) === String(params.gameId))
								if (target && target.gameType === 'mind-window') belongsToActivity = true
								if (target && target.isFinish) finished = true
							})
						}
						if (!belongsToActivity) {
							uni.showToast({ title: '心愿橱窗不属于当前活动', icon: 'none' })
							return
						}
						if (finished) {
							uni.navigateTo({ url: '/pages/xycc/result?activityId=' + params.instanceId })
						} else {
							uni.navigateTo({ url: '/pages/xycc/start' + suffix })
						}
					})
					return
				}
				// 职场TOP无论成功或失败都不能重新挑战；扫码后统一进入该用户的最终报告。
				if ((params.gameType === 'sszctop' || isSszctopDirectCode) && params.instanceId && params.gameId) {
					getWeekFlow(params.instanceId).then(flowRes => {
						let terminal = false
						let belongsToActivity = false
						if (flowRes.code === 200 && flowRes.data) {
							(flowRes.data.areas || []).forEach(area => {
								const target = (area.games || []).find(item => String(item.gameId) === String(params.gameId))
								if (target) belongsToActivity = true
								if (target && (target.isFinish || target.isFail)) terminal = true
							})
						}
						if (!belongsToActivity) {
							uni.showToast({ title: '该游戏不属于当前活动', icon: 'none' })
							return
						}
						if (terminal) {
							uni.navigateTo({ url: '/pages/sszctop/report?gameId=' + params.gameId })
							return
						}
						enterWeekGame(params.gameId, params.instanceId).then(() => uni.navigateTo({ url: gameUrl + suffix })).catch(() => {
							uni.showToast({ title: '游戏入口已失效，请重新扫码进入', icon: 'none' })
						})
					})
					return
				}
				if (params.gameId) {
					if (!params.instanceId) {
						uni.showToast({ title: '二维码缺少活动信息，请重新生成', icon: 'none' })
						return
					}
					try {
						await enterWeekGame(params.gameId, params.instanceId)
					} catch (e) {
						uni.showToast({ title: '游戏入口已失效，请重新扫码进入', icon: 'none' })
						return
					}
				}
				uni.navigateTo({ url: gameUrl + suffix })
				return
			}
			try {
				const data = JSON.parse(result)
				if (data.type === 'lottery') {
					uni.navigateTo({ url: '/pages/lottery/index?activityId=' + data.activityId })
				} else if (data.type === 'checkin') {
					uni.navigateTo({ url: '/pages/checkin/index?activityId=' + data.activityId })
				} else {
					uni.showModal({ title: '扫码结果', content: result, showCancel: false })
				}
			} catch (e) {
				uni.showModal({ title: '扫码结果', content: result, showCancel: false })
			}
		},

		// 统计栏点击
		onStat(type) {
			const titles = {
				footprint: '我的足迹',
				favorite: '我的收藏',
				publish: '我的发布',
				message: '我的消息'
			}
			uni.showToast({ title: (titles[type] || type) + '开发中', icon: 'none' })
			// TODO: 跳转到对应页面
		},

		// 成长档案
		onArchive() {
			uni.showToast({ title: '成长档案开发中', icon: 'none' })
			// TODO: 跳转到成长档案页面
		},

		// 八个功能按钮
		onMenuItem(item) {
			uni.showToast({ title: item.name + '开发中', icon: 'none' })
			// TODO: 根据 item.key 跳转到对应页面
		},

		// 底部导航
		onLogout() {
			uni.showModal({
				title: '提示',
				content: '确定退出登录吗？',
				success: (res) => {
					if (res.confirm) {
						uni.removeStorageSync('token')
						uni.removeStorageSync('studentName')
						uni.removeStorageSync('studentNo')
						uni.removeStorageSync('majorName')
						uni.removeStorageSync('departmentName')
						uni.removeStorageSync('gender')
						uni.reLaunch({ url: '/pages/mp/login/index' })
					}
				}
			})
		},

		onNav(item) {
			if (item.label === '学习') {
				uni.showToast({ title: '学习开发中', icon: 'none' })
				return
			}
			if (item.label === '实践') {
				uni.showToast({ title: '实践开发中', icon: 'none' })
				return
			}
			if (item.route && item.route !== '/pages/mp/mine/index') {
				this.activeNav = item.label
				uni.redirectTo({ url: item.route })
			}
		}
	}
}
</script>

<style scoped>
.mine-container {
	background: linear-gradient(160deg, #b8d8f0 0%, #dce8f6 50%, #eaf2fb 100%);
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	position: relative;
}

/* ── 标题栏 ── */
/* .title-bar {
	background: linear-gradient(180deg, #d8e9f8 0%, #e4f0fa 100%);
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 8rpx 40rpx 32rpx;
	flex-shrink: 0;
} */
.title-bar {
	display: flex;
	align-items: center;
	justify-content: center;
	background: white;
	padding: 12rpx 24rpx;
	height: 96rpx;
	flex-shrink: 0;
	border-bottom: 1rpx solid #eef2f7;
}
.title { font-size: 36rpx; font-weight: 700; color: #1a1a1a; }

/* ── 滚动区域 ── */
.scroll-body {
	flex: 1;
	background: #eef4fb;
}

/* ── 个人信息卡片 ── */
.profile-card {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: white;
	margin: 20rpx 24rpx;
	border-radius: 36rpx;
	padding: 32rpx 32rpx;
	box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
}
.profile-left {
	display: flex;
	align-items: center;
	gap: 24rpx;
	flex: 1;
}
.avatar {
	width: 112rpx;
	height: 112rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #4a90e2, #3570c0);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 56rpx;
	flex-shrink: 0;
	box-shadow: 0 6rpx 20rpx rgba(74,144,226,0.3);
}
.profile-info {
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}
.nickname {
	font-size: 36rpx;
	font-weight: 700;
	color: #1a1a1a;
}
.major {
	font-size: 24rpx;
	color: #94a3b8;
}
.profile-right {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6rpx;
	padding: 16rpx 20rpx;
	border-radius: 24rpx;
	background: #f5f8fc;
	flex-shrink: 0;
}
.profile-right:active {
	background: #e8eff8;
}
.qrcode-icon {
	font-size: 44rpx;
}
.qrcode-label {
	font-size: 20rpx;
	color: #607d9b;
}

/* ── 统计栏 ── */
.stats-card {
	display: flex;
	justify-content: space-around;
	background: white;
	margin: 0 24rpx 20rpx;
	border-radius: 36rpx;
	padding: 28rpx 16rpx;
	box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
}
.stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
	flex: 1;
}
.stat-item:active {
	opacity: 0.7;
}
.stat-num {
	font-size: 40rpx;
	font-weight: 800;
	color: #1a2c4a;
}
.stat-label {
	font-size: 22rpx;
	color: #94a3b8;
}

/* ── 成长档案 ── */
.archive-card {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: linear-gradient(135deg, #e8f0fe, #dce8ff);
	margin: 0 24rpx 20rpx;
	border-radius: 36rpx;
	padding: 32rpx 32rpx;
	border: 2rpx solid #c8d8f0;
}
.archive-card:active {
	opacity: 0.85;
}
.archive-left {
	display: flex;
	align-items: center;
	gap: 18rpx;
}
.archive-icon {
	font-size: 44rpx;
}
.archive-title {
	font-size: 30rpx;
	font-weight: 700;
	color: #1a2c4a;
}
.archive-right {
	display: flex;
	align-items: center;
	gap: 8rpx;
}
.archive-link {
	font-size: 26rpx;
	color: #4a90e2;
	font-weight: 600;
}
.archive-arrow {
	font-size: 32rpx;
	color: #4a90e2;
	font-weight: 700;
}

/* ── 功能网格（八宫格） ── */
.menu-grid {
	margin: 0 24rpx 20rpx;
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 18rpx;
}
.menu-item {
	background: white;
	border-radius: 28rpx;
	padding: 28rpx 24rpx;
	display: flex;
	align-items: center;
	gap: 20rpx;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.03);
}
.menu-item:active {
	background: #f8fafd;
}
.menu-icon {
	width: 80rpx;
	height: 80rpx;
	border-radius: 22rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 40rpx;
	flex-shrink: 0;
}
.menu-label {
	font-size: 28rpx;
	font-weight: 600;
	color: #1a2c4a;
}

/* ── 底部导航 ── */
.logout-wrap {
	padding: 20rpx 24rpx 0;
}
.logout-btn {
	width: 100%;
	background: #ffffff;
	color: #e52020;
	border: 2rpx solid #f3c2c2;
	border-radius: 50rpx;
	font-size: 30rpx;
	font-weight: 600;
}
.bottom-nav {
	position: fixed;
	bottom: 0; left: 0; right: 0;
	height: 148rpx;
	background: white;
	border-top: 1rpx solid #e8eef5;
	display: flex; align-items: center; justify-content: space-around;
	padding: 0 8rpx 24rpx;
	z-index: 99;
	padding-bottom: constant(safe-area-inset-bottom);
	padding-bottom: env(safe-area-inset-bottom);
}
.nav-item {
	display: flex; flex-direction: column; align-items: center; gap: 6rpx;
	flex: 1; padding-top: 16rpx;
}
.nav-icon { font-size: 44rpx; line-height: 1; }
.nav-label { font-size: 22rpx; font-weight: 500; color: #aab4c4; }
.nav-item.active .nav-label { color: #2a85e8; }
.nav-center {
	display: flex; flex-direction: column; align-items: center;
	flex: 1; margin-top: -44rpx;
}
.nav-center-icon {
	width: 104rpx; height: 104rpx;
	background: linear-gradient(145deg, #2a85e8, #1a5cc0);
	border-radius: 50%;
	display: flex; align-items: center; justify-content: center;
	font-size: 52rpx;
	box-shadow: 0 8rpx 32rpx rgba(42,133,232,0.45);
	border: 6rpx solid white;
}
.nav-center .nav-label { font-size: 22rpx; font-weight: 600; color: #2a85e8; margin-top: 2rpx; }
</style>
