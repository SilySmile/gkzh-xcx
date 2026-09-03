<template>
	<view class="all-container">

		<!-- 顶部导航栏 -->
		<view class="nav-bar">
			<view class="nav-back" @click="onBack">
				<text class="back-arrow">‹</text>
			</view>
			<text class="nav-title">全部功能</text>
			<view class="nav-placeholder"></view>
		</view>

		<!-- 页面主体 -->
		<scroll-view scroll-y class="scroll-body">

			<!-- ========== 板块1：学习 ========== -->
			<view class="section">
				<text class="section-title">学习</text>
				<view class="btn-grid">
					<view
						v-for="item in studyItems" :key="item.key"
						class="func-btn"
						@click="onFuncClick(item)"
					>
						<view class="func-icon" :style="{ background: item.bg }">{{ item.icon }}</view>
						<text class="func-label">{{ item.name }}</text>
					</view>
				</view>
			</view>

			<!-- ========== 板块2：实践 ========== -->
			<view class="section">
				<text class="section-title">实践</text>
				<view class="btn-grid">
					<view
						v-for="item in practiceItems" :key="item.key"
						class="func-btn"
						@click="onFuncClick(item)"
					>
						<view class="func-icon" :style="{ background: item.bg }">{{ item.icon }}</view>
						<text class="func-label">{{ item.name }}</text>
					</view>
				</view>
			</view>

			<view style="height:40rpx"></view>
		</scroll-view>
	</view>
</template>

<script>
import { getActiveWeek } from '@/api/activity/week'

export default {
	data() {
		return {
			// 学习板块按钮
			studyItems: [
				{ key: 'policy',      icon: '📜', name: '政策解读',   bg: '#e3f2fd' },
				{ key: 'course',      icon: '📚', name: '课程中心',   bg: '#e8f5e9' },
				{ key: 'exam',        icon: '📝', name: '考核测试',   bg: '#fff3e0' },
				{ key: 'mentor',      icon: '👨‍🏫', name: '名师咨询',   bg: '#ede7f6' },
				{ key: 'survey',      icon: '📋', name: '问卷调查',   bg: '#fce4ec' },
				{ key: 'guide',       icon: '📖', name: '专业导读',   bg: '#e0f2f1' },
				{ key: 'jobExplore',  icon: '🔍', name: '岗位探索',   bg: '#fff8e1' },
				{ key: 'knowledge',   icon: '💡', name: '小识堂',    bg: '#e8eaf6' },
				{ key: 'contestHelp', icon: '🏆', name: '比赛帮手',   bg: '#f3e5f5' },
				{ key: 'circle',      icon: '💬', name: '圈子',      bg: '#e0f7fa' }
			],
			// 实践板块按钮
			practiceItems: [
				{ key: 'aiResume',    icon: '🤖', name: 'AI简历诊断',      bg: '#e3f2fd' },
				{ key: 'mockInterview',icon: '📱', name: '手机模拟面试',    bg: '#e8f5e9' },
				{ key: 'careerExp',   icon: '🎯', name: '职业体验',        bg: '#fff3e0' },
				{ key: 'contest',     icon: '🏅', name: '比赛中心',        bg: '#ede7f6' },
				// { key: 'activity',    icon: '🎪', name: '活动中心',        bg: '#fce4ec' },
				{ key: 'careerWeek',  icon: '📅', name: '生涯活动',      bg: '#e0f2f1' },
				{ key: 'jobWeek',     icon: '💼', name: '就业活动',      bg: '#fff8e1' },
				{ key: 'videoSpace',  icon: '🎬', name: '视聘空间',        bg: '#e8eaf6' },
				{ key: 'roomBook',    icon: '🏢', name: '面试仓预约',      bg: '#f3e5f5' },
				{ key: 'room3dBook',  icon: '🥽', name: '3D面试间预约',    bg: '#e0f7fa' },
				{ key: 'alumni',      icon: '👥', name: '校友互联',        bg: '#fce4ec' },
				{ key: 'jobFair',     icon: '🏛️', name: '线下招聘会',      bg: '#fff3e0' }
			]
		}
	},
	methods: {
		onBack() {
			uni.navigateBack()
		},

		// 功能按钮点击（占位）
		onFuncClick(item) {
			if (item.key === 'careerWeek') {
        				getActiveWeek('career_week').then(res => {
        					if (res.code === 200 && res.data) {
        						uni.navigateTo({ url: '/pages/mp/sub-pages/career-week/index?bizType=career_week' })
        					} else {
        						uni.showToast({ title: '暂无进行中的活动', icon: 'none' })
        					}
        				})
        				return
        			}
        			if (item.key === 'jobWeek') {
        				getActiveWeek('job_week').then(res => {
        					if (res.code === 200 && res.data) {
        						uni.navigateTo({ url: '/pages/mp/sub-pages/career-week/index?bizType=job_week' })
        					} else {
        						uni.showToast({ title: '暂无进行中的活动', icon: 'none' })
        					}
        				})
        				return
        			}
        			// if (item.key === 'activity') {
        			// 	uni.navigateTo({ url: '/pages/activity/index?activityId=' + (uni.getStorageSync('activityId') || '') })
        			// 	return
        			// }
			uni.showToast({ title: item.name + '开发中', icon: 'none' })
			// TODO: 根据 item.key 跳转到对应功能页面
		}
	}
}
</script>

<style scoped>
.all-container {
	background: #f5f7fb;
	min-height: 100vh;
	display: flex;
	flex-direction: column;
}

/* ── 顶部导航栏 ── */
.nav-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: white;
	padding: 12rpx 24rpx;
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
	font-size: 52rpx;
	color: #333;
	font-weight: 300;
	line-height: 1;
}
.nav-title {
	font-size: 34rpx;
	font-weight: 700;
	color: #1a1a1a;
}
.nav-placeholder {
	width: 64rpx;
}

/* ── 滚动区域 ── */
.scroll-body {
	flex: 1;
	padding: 0;
}

/* ── 板块 ── */
.section {
	margin-top: 32rpx;
	padding: 0 24rpx;
	box-sizing: border-box;
}
.section-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #94a3b8;
	display: block;
	margin-bottom: 20rpx;
	padding-left: 8rpx;
}

/* ── 按钮网格 ── */
.btn-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 18rpx;
}

/* ── 功能按钮 ── */
.func-btn {
	background: white;
	border-radius: 24rpx;
	padding: 24rpx 12rpx 20rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 14rpx;
	box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);
}
.func-btn:active {
	background: #f8fafd;
	transform: scale(0.96);
}
.func-icon {
	width: 76rpx;
	height: 76rpx;
	border-radius: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 38rpx;
}
.func-label {
	font-size: 22rpx;
	font-weight: 600;
	color: #1a2c4a;
	text-align: center;
	line-height: 1.3;
}
</style>
