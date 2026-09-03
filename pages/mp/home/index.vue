<template>
	<view class="home-container">


		<!-- 标题栏 -->
		<view class="title-bar">
			<text class="title">首页</text>
		</view>

		<!-- 滚动内容区 -->
		<scroll-view scroll-y class="scroll-body">

			<!-- ① 学校信息 + 签到 -->
			<view class="school-row">
				<template v-if="loading.school">
					<view class="skel" style="width:92rpx;height:92rpx;border-radius:20rpx;flex-shrink:0"></view>
					<view class="skel skel-pill" style="height:32rpx;width:240rpx;flex:1"></view>
				</template>
				<template v-else>
					<view class="school-logo">{{ school.logoEmoji }}</view>
					<text class="school-name">{{ school.name }}</text>
					<!-- 扫一扫入口已迁移至“我的”页面原二维码位置 -->
				</template>
			</view>

			<!-- ② Banner 轮播 -->
			<view class="banner-wrap">
				<template v-if="loading.banners">
					<view class="skel" style="height:320rpx;border-radius:36rpx"></view>
				</template>
				<template v-else>
					<swiper
						class="banner-swiper"
						:indicator-dots="true"
						:autoplay="true"
						:interval="3200"
						:duration="500"
						circular
					>
						<swiper-item v-for="(slide, idx) in banners" :key="idx">
							<view class="slide-bg" :style="{ background: slide.bg }">
								<view class="slide-body">
									<text class="slide-tag">{{ slide.tag }}</text>
									<view class="slide-title">
										<rich-text :nodes="slide.titleNodes"></rich-text>
									</view>
									<view class="slide-sub">
										<rich-text :nodes="slide.subNodes"></rich-text>
									</view>
								</view>
							</view>
						</swiper-item>
					</swiper>
				</template>
			</view>

			<!-- ③ 快捷入口 -->
			<view class="quick-card">
				<template v-if="loading.actions">
					<view v-for="i in 5" :key="i" class="q-item-skel">
						<view class="skel" style="width:104rpx;height:104rpx;border-radius:32rpx"></view>
						<view class="skel skel-pill" style="height:22rpx;width:72rpx"></view>
					</view>
				</template>
				<template v-else>
					<view
						v-for="action in actions" :key="action.key"
						class="q-item"
						@click="onAction(action)"
					>
						<view class="q-icon" :style="{ background: action.bg }">{{ action.icon }}</view>
						<text class="q-label">{{ action.name }}</text>
					</view>
				</template>
			</view>

			<!-- ④ 政策解读 -->
			<view class="section-card">
				<view class="sec-header">
					<text class="sec-title">政策解读</text>
					<text class="sec-more" @click="showToast('查看更多政策')">查看更多</text>
				</view>
				<template v-if="loading.policies">
					<view v-for="i in 2" :key="i" class="policy-skel">
						<view class="skel" style="height:26rpx;width:90%;margin-bottom:12rpx"></view>
						<view class="skel" style="height:22rpx;width:60%"></view>
					</view>
				</template>
				<template v-else>
					<view
						v-for="item in policies" :key="item.id"
						class="policy-item"
						@click="showToast(item.title)"
					>
						<view class="policy-dot"></view>
						<view class="policy-info">
							<text class="policy-title">{{ item.title }}</text>
							<view class="policy-meta">
								<text>{{ item.source }}</text>
								<text>{{ item.date }}</text>
							</view>
						</view>
					</view>
				</template>
			</view>

			<!-- ⑤ 资源包卡片 -->
			<template v-if="loading.resources">
				<view class="res-grid-skel">
					<view v-for="i in 4" :key="i" class="skel" style="height:228rpx;border-radius:36rpx"></view>
				</view>
			</template>
			<view v-else class="res-grid">
				<view
					v-for="card in resources" :key="card.key"
					class="res-card"
					:style="{ background: card.bg, color: card.color }"
					@click="showToast('进入' + card.name)"
				>
					<text class="res-name">{{ card.name }}</text>
					<view class="res-arrow">›</view>
					<text class="res-deco">{{ card.emoji }}</text>
				</view>
			</view>

			<view style="height:100rpx"></view>
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
import { getProfile } from '@/api/checkin'
// ============================================================
// 模拟接口说明（后续接入真实 API 时替换即可）：
//   /api/school/info   → getSchoolList(activityId) 见 @/api/checkin.js
//   /api/home/banners  → 待后端提供接口
//   /api/menu/home     → 待后端提供接口
//   /api/policy/list   → 待后端提供接口
//   /api/resources/list → 待后端提供接口
//   /api/user/checkin  → checkinStudent(data) 见 @/api/checkin.js
// ============================================================

export default {
	data() {
		
		return {
			activeNav: '首页',
			loading: {
				school: true,
				banners: true,
				actions: true,
				policies: true,
				resources: true
			},
			school: {},
			checkin: { done: false },
			banners: [],
			actions: [],
			policies: [],
			resources: [],
			authChecking: false,
			navItems: [
				{ label: '首页', icon: '🏠', route: '/pages/mp/home/index' },
				{ label: '学习', icon: '📖', route: '/pages/mp/study/index' },
				{ label: 'AI就业', icon: '🤖', center: true, route: '/pages/mp/ai-job/index' },
				{ label: '实践', icon: '🧭', route: '/pages/mp/practice/index' },
				{ label: '我的', icon: '👤', route: '/pages/mp/mine/index' }
			],	
		}
	},
	onLoad() {
		this.ensureAuthenticated()
	},
	onShow() {
		if (!this.authChecking) this.ensureAuthenticated()
	},

	methods: {
		ensureAuthenticated() {
			const token = uni.getStorageSync('token')
			if (!token) {
				uni.reLaunch({ url: '/pages/mp/login/index' })
				return
			}
			this.authChecking = true
			getProfile().then(res => {
				if (res.code !== 200 || !res.data) throw new Error(res.msg || '登录状态已失效')
				this.saveProfile(res.data)
				this.fetchHomeData()
			}).catch(() => {
				uni.removeStorageSync('token')
				uni.reLaunch({ url: '/pages/mp/login/index' })
			}).finally(() => {
				this.authChecking = false
			})
		},

		saveProfile(data) {
			uni.setStorageSync('studentName', data.studentName || '')
			uni.setStorageSync('studentNo', data.studentNo || '')
			if (data.schoolId !== undefined && data.schoolId !== null) uni.setStorageSync('schoolId', data.schoolId)
			if (data.schoolName) uni.setStorageSync('schoolName', data.schoolName)
			if (data.departmentName || data.majorName) uni.setStorageSync('majorName', data.departmentName || data.majorName)
			if (data.gender !== undefined && data.gender !== null) uni.setStorageSync('gender', data.gender)
		},

		fetchHomeData() {
		// TODO: 添加前置关卡校验，检查该模块之前所有关卡是否已完成
		// 未完成则弹窗提示并返回活动列表页
		
		this.fetchSchool()
		this.fetchBanners()
		this.fetchActions()
		this.fetchPolicies()
		this.fetchResources()
	},
		// ---------- 模拟接口：学校信息 + 签到状态 ----------
		fetchSchool() {
			// 真实接入示例：
			// import { getSchoolList } from '@/api/checkin'
			// const activityId = uni.getStorageSync('activityId')
			// getSchoolList(activityId).then(res => {
			//   this.school = { name: res.data[0].schoolName, logoEmoji: '🏛' }
			//   this.loading.school = false
			// })
			setTimeout(() => {
			    const schoolName = uni.getStorageSync('schoolName') || '未知学校'
                this.school = { name: schoolName, logoEmoji: '🏛' }
				this.checkin.done = false
				this.loading.school = false
			}, 600)
		},

		// ---------- 模拟接口：Banner 轮播 ----------
		fetchBanners() {
			setTimeout(() => {
				this.banners = [
					{ tag: '职业发展', bg: 'linear-gradient(130deg,#2860d0,#3a80e8)',
					  titleNodes: '如何在<span style="color:#ffe066">求职中</span><br>脱颖而出？',
					  subNodes: '职业测评 <strong style="color:#ffe066">认知更好的自己</strong>' },
					{ tag: '校园活动', bg: 'linear-gradient(130deg,#1d7a6e,#2aab96)',
					  titleNodes: '<span style="color:#b8ffee">2025届</span>春季<br>双选会火热报名',
					  subNodes: '超过 <strong style="color:#b8ffee">500+</strong> 家优质企业参与' },
					{ tag: 'AI 能力', bg: 'linear-gradient(130deg,#6b3fce,#9b6ee8)',
					  titleNodes: '模拟面试<br><span style="color:#ffe0ff">AI 实战训练营</span>',
					  subNodes: '智能点评 · 即时反馈 · 快速提升' },
					{ tag: '资源上新', bg: 'linear-gradient(130deg,#b85a1a,#e87c34)',
					  titleNodes: '比赛资源包<br><span style="color:#ffe8c0">全新上线</span>',
					  subNodes: '覆盖国赛省赛 <strong style="color:#ffe8c0">200+</strong> 套真题' }
				]
				this.loading.banners = false
			}, 800)
		},

		// ---------- 模拟接口：快捷入口（可按角色/权限过滤） ----------
		fetchActions() {
			setTimeout(() => {
				this.actions = [
					{ key: 'contest', icon: '🏆', name: '比赛中心', bg: '#fff3e0' },
					{ key: 'mentor', icon: '👥', name: '名师咨询', bg: '#e8f5e9' },
					{ key: 'interview', icon: '🤖', name: '模拟面试', bg: '#e3f2fd' },
					{ key: 'video', icon: '🎬', name: '视聘空间', bg: '#ede7f6' },
					{ key: 'all', icon: '🔲', name: '全部功能', bg: '#fce4ec' }
				]
				this.loading.actions = false
			}, 700)
		},

		// ---------- 模拟接口：政策解读 ----------
		fetchPolicies() {
			setTimeout(() => {
				this.policies = [
					{ id: 1, title: '常建忠在省职业技能鉴定中心调研', source: '山西省人力资源和社会保障厅', date: '2025-06-04' },
					{ id: 2, title: '2025年度大学生创业扶持政策正式发布', source: '教育部就业指导中心', date: '2025-05-28' },
					{ id: 3, title: '山西省高校毕业生就业补贴申请通道开放', source: '山西省教育厅', date: '2025-05-20' }
				]
				this.loading.policies = false
			}, 1000)
		},

		// ---------- 模拟接口：资源包 ----------
		fetchResources() {
			setTimeout(() => {
				this.resources = [
					{ key: 'contest', name: '比赛资源包', emoji: '🏆', bg: 'linear-gradient(135deg,#fff0d6,#fde4b0)', color: '#7a4f00' },
					{ key: 'skill', name: '技能学习资源包', emoji: '🤖', bg: 'linear-gradient(135deg,#d8efff,#b8deff)', color: '#0a4070' },
					{ key: 'extend', name: '拓展课程资源包', emoji: '📚', bg: 'linear-gradient(135deg,#dce8ff,#c4d8ff)', color: '#1a3470' },
					{ key: 'guide', name: '专业导读资源包', emoji: '📖', bg: 'linear-gradient(135deg,#e0f5ec,#c0ebd8)', color: '#0a4430' }
				]
				this.loading.resources = false
			}, 1200)
		},

		// ---------- 签到 ----------
		doCheckin() {
			if (this.checkin.done) {
				uni.showToast({ title: '今日已签到 ✅', icon: 'none' })
				return
			}
			// 真实接入示例：
			// import { checkinStudent } from '@/api/checkin'
			// checkinStudent({ activityId: uni.getStorageSync('activityId') }).then(res => { ... })
			this.checkin.done = true
			uni.showToast({ title: '签到成功！+10 积分 🎉', icon: 'none' })
		},

		// ---------- 快捷入口点击 ----------
		onAction(action) {
        			if (action.key === 'all') {
        				uni.navigateTo({ url: '/pages/mp/sub-pages/all-features/index' })
        				return
        			}
        			uni.showToast({ title: '进入' + action.name, icon: 'none' })
        		},

		// ---------- 底部导航 ----------
		onNav(item) {
			this.activeNav = item.label
			if (item.route && item.route !== '/pages/mp/home/index') {
				uni.redirectTo({ url: item.route })
			}
		},

		// ---------- Toast ----------
		showToast(msg) {
			uni.showToast({ title: msg, icon: 'none', duration: 1800 })
		}
	}
}
</script>

<style scoped>
.home-container {
	background: linear-gradient(160deg, #b8d8f0 0%, #dce8f6 50%, #eaf2fb 100%);
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	position: relative;
}

/* ── 骨架屏 ── */
@keyframes shimmer {
	0%   { background-position: -800rpx 0; }
	100% { background-position: 800rpx 0; }
}
.skel {
	background: linear-gradient(90deg, #e2eaf4 25%, #f0f6fc 50%, #e2eaf4 75%);
	background-size: 1600rpx 100%;
	animation: shimmer 1.4s infinite;
	border-radius: 16rpx;
}
.skel-pill { border-radius: 40rpx; }




/* ── 标题栏 ── */
/* .title-bar {
	background: linear-gradient(180deg, #d8e9f8 0%, #e4f0fa 100%);
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 8rpx 40rpx 32rpx;
	flex-shrink: 0;
	display: flex;
	justify-content: space-between;
	align-items: center;
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

/* ── 学校信息行 ── */
.school-row {
	display: flex;
	align-items: center;
	gap: 20rpx;
	padding: 24rpx 32rpx 20rpx;
	background: linear-gradient(180deg, #e4f0fa 0%, #eef4fb 100%);
}
.school-logo {
	width: 92rpx; height: 92rpx;
	border-radius: 20rpx;
	background: linear-gradient(135deg, #c0392b, #e74c3c);
	display: flex; align-items: center; justify-content: center;
	font-size: 44rpx;
	flex-shrink: 0;
	box-shadow: 0 4rpx 16rpx rgba(199,57,44,0.3);
}
.school-name { font-size: 32rpx; font-weight: 700; color: #1a1a1a; flex: 1; }
/* ── Banner ── */
.banner-wrap { margin: 16rpx 24rpx 20rpx; }
.banner-swiper {
	height: 320rpx;
	border-radius: 36rpx;
	overflow: hidden;
}
.slide-bg {
	width: 100%; height: 100%;
	display: flex; align-items: flex-end;
	padding: 40rpx 40rpx 56rpx;
}
.slide-body { position: relative; z-index: 1; }
.slide-tag {
	font-size: 20rpx; color: rgba(255,255,255,0.8);
	background: rgba(255,255,255,0.18);
	padding: 4rpx 16rpx; border-radius: 16rpx;
	display: inline-block; margin-bottom: 16rpx;
}
.slide-title {
	font-size: 44rpx; font-weight: 800; color: white; line-height: 1.3;
}
.slide-sub { margin-top: 10rpx; font-size: 24rpx; color: rgba(255,255,255,0.8); }

/* ── 快捷入口 ── */
.quick-card {
	background: white;
	margin: 0 24rpx 20rpx;
	border-radius: 36rpx;
	padding: 28rpx 16rpx;
	display: flex;
	justify-content: space-around;
}
.q-item { display: flex; flex-direction: column; align-items: center; gap: 10rpx; flex: 1; }
.q-item-skel { display: flex; flex-direction: column; align-items: center; gap: 12rpx; flex: 1; }
.q-icon {
	width: 104rpx; height: 104rpx;
	border-radius: 32rpx;
	display: flex; align-items: center; justify-content: center;
	font-size: 52rpx;
}
.q-label { font-size: 22rpx; font-weight: 500; color: #3a3a3a; text-align: center; }

/* ── 政策解读 ── */
.section-card {
	background: white;
	margin: 0 24rpx 20rpx;
	border-radius: 36rpx;
	padding: 28rpx 32rpx;
}
.sec-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.sec-title { font-size: 32rpx; font-weight: 700; color: #1a1a1a; }
.sec-more { font-size: 24rpx; color: #94a3b8; }
.policy-item {
	display: flex; align-items: flex-start; gap: 16rpx;
	padding: 14rpx 0;
	border-bottom: 1rpx solid #f2f5f9;
}
.policy-item:last-child { border-bottom: none; padding-bottom: 0; }
.policy-skel {
	padding: 14rpx 0;
	border-bottom: 1rpx solid #f2f5f9;
}
.policy-dot {
	width: 12rpx; height: 12rpx; border-radius: 50%;
	background: #2a85e8; flex-shrink: 0; margin-top: 14rpx;
}
.policy-info { flex: 1; }
.policy-title { font-size: 26rpx; font-weight: 500; color: #1a1a1a; line-height: 1.5; }
.policy-meta { display: flex; justify-content: space-between; font-size: 22rpx; color: #94a3b8; margin-top: 6rpx; }

/* ── 资源包 ── */
.res-grid { margin: 0 24rpx 20rpx; display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; }
.res-grid-skel { margin: 0 24rpx 20rpx; display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; }
.res-card {
	border-radius: 36rpx;
	padding: 32rpx 28rpx;
	min-height: 228rpx;
	position: relative;
	overflow: hidden;
	display: flex; flex-direction: column;
}
.res-name {
	font-size: 28rpx; font-weight: 700; margin-bottom: 16rpx; line-height: 1.3;
}
.res-arrow {
	width: 44rpx; height: 44rpx;
	background: rgba(255,255,255,0.38);
	border-radius: 14rpx;
	display: flex; align-items: center; justify-content: center;
	font-size: 26rpx; font-weight: 700;
}
.res-deco {
	position: absolute; bottom: -12rpx; right: -12rpx;
	font-size: 116rpx; opacity: 0.88; line-height: 1;
}

/* ── 底部导航 ── */
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
