<template>
	<view class="guest-page">
		<!-- 顶部说明 -->
		<view class="hero">
			<text class="hero-badge">游客体验</text>
			<text class="hero-title">校园职业发展平台</text>
			<text class="hero-desc">职业与就业活动一站式参与：查看活动、扫码签到、完成职业探索、查看个人报告。</text>
		</view>

		<view class="notice">
			<text class="notice-icon">i</text>
			<text class="notice-text">当前为游客浏览模式，仅展示平台介绍，不会收集姓名、学号、学校等个人信息。</text>
		</view>

		<!-- 平台简介 -->
		<view class="section">
			<view class="section-head">
				<text class="section-bar"></text>
				<text class="section-title">平台简介</text>
			</view>
			<view class="intro-card">
				<text class="intro-text">本小程序面向高校学生，为学校发布的职业活动和就业活动提供统一的参与入口。学生登录后可以查看活动、扫码签到、完成职业探索互动和活动问卷，并在活动结束后查看个人报告。</text>
				<text class="intro-text">平台同时为活动工作人员提供活动统计、奖品核销等管理功能，帮助学生和学校更高效地组织职业发展活动。</text>
			</view>
		</view>

		<!-- 主要功能 -->
		<view class="section">
			<view class="section-head">
				<text class="section-bar"></text>
				<text class="section-title">主要功能</text>
			</view>
			<view class="feature-grid">
				<view v-for="item in features" :key="item.name" class="feature-card">
					<text class="feature-icon">{{ item.icon }}</text>
					<text class="feature-name">{{ item.name }}</text>
					<text class="feature-desc">{{ item.desc }}</text>
				</view>
			</view>
		</view>

		<!-- 参与流程 -->
		<view class="section">
			<view class="section-head">
				<text class="section-bar"></text>
				<text class="section-title">参与流程</text>
			</view>
			<view class="flow-card">
				<view v-for="(step, index) in flow" :key="step.title" class="flow-item">
					<view class="flow-index">{{ index + 1 }}</view>
					<view class="flow-body">
						<text class="flow-title">{{ step.title }}</text>
						<text class="flow-desc">{{ step.desc }}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 个人报告 -->
		<view class="section">
			<view class="section-head">
				<text class="section-bar"></text>
				<text class="section-title">个人报告</text>
			</view>
			<view class="report-card">
				<text class="report-desc">活动结束后，学生可以在个人报告中查看本次活动的参与结果，回顾自己的职业探索过程。</text>
				<view v-for="item in reportPoints" :key="item" class="report-item">
					<text class="list-dot">·</text>
					<text class="report-text">{{ item }}</text>
				</view>
			</view>
		</view>

		<!-- 游客说明 -->
		<view class="section">
			<view class="section-head">
				<text class="section-bar"></text>
				<text class="section-title">游客说明</text>
			</view>
			<view class="list-card">
				<view v-for="item in guestNotes" :key="item" class="list-item">
					<text class="list-dot">·</text>
					<text class="list-text">{{ item }}</text>
				</view>
			</view>
		</view>

		<!-- 操作 -->
		<view class="actions">
			<button class="btn primary" @click="backToLogin">返回登录</button>
			<button class="btn ghost" @click="goRegister">注册账号</button>
		</view>

		<view class="footer">
			<text class="footer-text">本页面用于平台功能介绍与游客体验</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				activeModule: 0,
				features: [
					{ icon: '📅', name: '活动参与', desc: '查看学校发布的职业活动和就业活动，了解活动时间与环节。' },
					{ icon: '📷', name: '扫码签到', desc: '扫描活动或游戏二维码，完成签到并进入对应活动环节。' },
					{ icon: '🧭', name: '职业探索', desc: '通过多种互动环节了解职业方向，记录感兴趣的职业。' },
					{ icon: '📝', name: '活动问卷', desc: '填写活动反馈问卷，帮助学校了解活动效果。' },
					{ icon: '📄', name: '个人报告', desc: '汇总活动参与、答题和探索记录，形成个人成长报告。' },
					{ icon: '🖨', name: '现场打印', desc: '在支持打印的活动现场，将探索报告打印留存。' }
				],
				flow: [
					{ title: '登录账号', desc: '使用学校提供的学号和密码登录，完善个人身份信息。' },
					{ title: '进入活动', desc: '从活动列表或扫描活动二维码进入当前活动。' },
					{ title: '完成环节', desc: '按活动安排完成签到、职业互动和活动问卷。' },
					{ title: '查看报告', desc: '活动结束后在个人报告中查看参与结果。' }
				],
				reportPoints: [
					'参与的活动和环节完成情况',
					'各活动环节的答题和选择记录',
					'职业探索清单和浏览记录',
					'可打印或留存的探索报告'
				],
				guestNotes: [
					'游客可以浏览本介绍，了解平台功能和活动环节。',
					'游客不能参与活动、保存答题记录或生成个人报告。',
					'游客模式不会收集姓名、学号、学校等个人信息。',
					'正式参与活动请使用学校提供的账号登录；没有账号可返回登录页注册。',
					'活动工作人员可以通过登录页的“工作人员入口”登录管理端。'
				]
			}
		},
		computed: {
			currentModule() {
				return this.modules[this.activeModule] || this.modules[0]
			}
		},
		methods: {
			backToLogin() {
				const pages = getCurrentPages()
				if (pages.length > 1) {
					uni.navigateBack()
					return
				}
				uni.reLaunch({ url: '/pages/mp/login/index' })
			},
			goRegister() {
				uni.navigateTo({ url: '/pages/mp/register/index' })
			}
		}
	}
</script>

<style scoped>
	.guest-page {
		min-height: 100vh;
		box-sizing: border-box;
		padding: 28rpx 32rpx 48rpx;
		background: linear-gradient(170deg, #eaf3fc 0%, #f6f9fd 42%, #ffffff 100%);
	}

	/* 顶部 */
	.hero {
		padding: 44rpx 40rpx 40rpx;
		border-radius: 36rpx;
		background: linear-gradient(135deg, #3f7fd4 0%, #5b9ae8 55%, #7db6f2 100%);
		box-shadow: 0 16rpx 40rpx rgba(63, 127, 212, 0.28);
	}

	.hero-badge {
		display: inline-block;
		padding: 6rpx 20rpx;
		border-radius: 999rpx;
		background: rgba(255, 255, 255, 0.22);
		color: #ffffff;
		font-size: 22rpx;
		letter-spacing: 2rpx;
	}

	.hero-title {
		display: block;
		margin-top: 20rpx;
		color: #ffffff;
		font-size: 46rpx;
		font-weight: 800;
		letter-spacing: 2rpx;
	}

	.hero-desc {
		display: block;
		margin-top: 16rpx;
		color: rgba(255, 255, 255, 0.9);
		font-size: 26rpx;
		line-height: 1.7;
	}

	/* 提示 */
	.notice {
		display: flex;
		align-items: flex-start;
		margin-top: 24rpx;
		padding: 22rpx 26rpx;
		border-radius: 20rpx;
		background: #fff8e8;
		border: 1rpx solid #f5e2b8;
	}

	.notice-icon {
		flex: 0 0 38rpx;
		width: 38rpx;
		height: 38rpx;
		margin-right: 14rpx;
		border-radius: 50%;
		background: #e8a13a;
		color: #ffffff;
		font-size: 24rpx;
		font-weight: 700;
		line-height: 38rpx;
		text-align: center;
		font-style: italic;
	}

	.notice-text {
		flex: 1;
		color: #8a6215;
		font-size: 24rpx;
		line-height: 1.65;
	}

	/* 区块 */
	.section {
		margin-top: 40rpx;
	}

	.section-head {
		display: flex;
		align-items: center;
		margin-bottom: 20rpx;
	}

	.section-bar {
		width: 8rpx;
		height: 30rpx;
		margin-right: 14rpx;
		border-radius: 6rpx;
		background: linear-gradient(180deg, #4a90e2, #7db6f2);
	}

	.section-title {
		color: #1a2c4a;
		font-size: 32rpx;
		font-weight: 800;
	}

	/* 简介 */
	.intro-card {
		padding: 28rpx;
		border-radius: 24rpx;
		background: #ffffff;
		box-shadow: 0 6rpx 22rpx rgba(26, 60, 110, 0.06);
	}

	.intro-text {
		display: block;
		color: #5c708a;
		font-size: 25rpx;
		line-height: 1.85;
	}

	.intro-text + .intro-text {
		margin-top: 16rpx;
	}

	/* 功能卡片 */
	.feature-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
	}

	.feature-card {
		box-sizing: border-box;
		width: 48.6%;
		margin-bottom: 20rpx;
		padding: 26rpx 24rpx;
		border-radius: 24rpx;
		background: #ffffff;
		box-shadow: 0 6rpx 22rpx rgba(26, 60, 110, 0.06);
	}

	.feature-icon {
		display: block;
		font-size: 40rpx;
	}

	.feature-name {
		display: block;
		margin-top: 12rpx;
		color: #1a2c4a;
		font-size: 28rpx;
		font-weight: 700;
	}

	.feature-desc {
		display: block;
		margin-top: 8rpx;
		color: #6b7f96;
		font-size: 22rpx;
		line-height: 1.6;
	}

	/* 活动环节切换 */
	.module-tabs {
		white-space: nowrap;
	}

	.module-tab {
		display: inline-block;
		margin-right: 14rpx;
		padding: 14rpx 26rpx;
		border-radius: 999rpx;
		background: #ffffff;
		border: 2rpx solid #e2ecf9;
		color: #5c708a;
		font-size: 24rpx;
	}

	.module-tab.active {
		background: #eaf2fb;
		border-color: #9cc4ee;
		color: #3570c0;
		font-weight: 700;
	}

	.module-detail {
		margin-top: 20rpx;
		padding: 28rpx;
		border-radius: 24rpx;
		background: #ffffff;
		box-shadow: 0 6rpx 22rpx rgba(26, 60, 110, 0.06);
	}

	.module-head {
		display: flex;
		align-items: center;
	}

	.module-icon {
		margin-right: 14rpx;
		font-size: 34rpx;
	}

	.module-name {
		color: #1a2c4a;
		font-size: 30rpx;
		font-weight: 800;
	}

	.module-desc {
		display: block;
		margin-top: 16rpx;
		color: #40556f;
		font-size: 25rpx;
		line-height: 1.75;
	}

	.module-tip {
		display: block;
		margin-top: 12rpx;
		color: #71839a;
		font-size: 23rpx;
		line-height: 1.65;
	}

	.module-note {
		display: block;
		margin-top: 14rpx;
		color: #9aabbe;
		font-size: 21rpx;
		line-height: 1.6;
	}

	/* 流程 */
	.flow-card {
		padding: 12rpx 28rpx;
		border-radius: 24rpx;
		background: #ffffff;
		box-shadow: 0 6rpx 22rpx rgba(26, 60, 110, 0.06);
	}

	.flow-item {
		display: flex;
		align-items: flex-start;
		padding: 22rpx 0;
		border-bottom: 1rpx solid #eef3f9;
	}

	.flow-item:last-child {
		border-bottom: none;
	}

	.flow-index {
		flex: 0 0 44rpx;
		width: 44rpx;
		height: 44rpx;
		margin-right: 18rpx;
		border-radius: 50%;
		background: #e8f1fd;
		color: #3f7fd4;
		font-size: 24rpx;
		font-weight: 700;
		line-height: 44rpx;
		text-align: center;
	}

	.flow-body {
		flex: 1;
	}

	.flow-title {
		display: block;
		color: #23364f;
		font-size: 27rpx;
		font-weight: 700;
	}

	.flow-desc {
		display: block;
		margin-top: 6rpx;
		color: #71839a;
		font-size: 23rpx;
		line-height: 1.6;
	}

	/* 个人报告 */
	.report-card {
		padding: 26rpx 28rpx;
		border-radius: 24rpx;
		background: #ffffff;
		box-shadow: 0 6rpx 22rpx rgba(26, 60, 110, 0.06);
	}

	.report-desc {
		display: block;
		margin-bottom: 8rpx;
		color: #40556f;
		font-size: 25rpx;
		line-height: 1.75;
	}

	.report-item {
		display: flex;
		align-items: flex-start;
		padding: 8rpx 0;
	}

	.report-text {
		flex: 1;
		color: #5c708a;
		font-size: 24rpx;
		line-height: 1.7;
	}

	/* 列表 */
	.list-card {
		padding: 22rpx 28rpx;
		border-radius: 24rpx;
		background: #ffffff;
		box-shadow: 0 6rpx 22rpx rgba(26, 60, 110, 0.06);
	}

	.list-item {
		display: flex;
		align-items: flex-start;
		padding: 10rpx 0;
	}

	.list-dot {
		flex: 0 0 24rpx;
		color: #4a90e2;
		font-size: 30rpx;
		font-weight: 700;
		line-height: 1.4;
	}

	.list-text {
		flex: 1;
		color: #40556f;
		font-size: 25rpx;
		line-height: 1.7;
	}

	/* 操作 */
	.actions {
		margin-top: 44rpx;
	}

	.btn {
		width: 100%;
		height: 96rpx;
		margin-bottom: 20rpx;
		border: none;
		border-radius: 48rpx;
		font-size: 30rpx;
		font-weight: 700;
		line-height: 96rpx;
	}

	.btn::after {
		border: none;
	}

	.btn.primary {
		background: linear-gradient(135deg, #4a90e2, #3570c0);
		color: #ffffff;
		box-shadow: 0 10rpx 26rpx rgba(74, 144, 226, 0.32);
	}

	.btn.ghost {
		background: #ffffff;
		color: #3f7fd4;
		border: 2rpx solid #b9d4f2;
		line-height: 92rpx;
	}

	.footer {
		padding: 12rpx 0 8rpx;
		text-align: center;
	}

	.footer-text {
		color: #9aabbe;
		font-size: 21rpx;
	}
</style>
