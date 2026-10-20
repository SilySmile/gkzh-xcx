<template>
	<view class="guest-page">
		<!-- 顶部说明 -->
		<view class="hero">
			<text class="hero-badge">游客体验</text>
			<text class="hero-title">校园职业发展平台</text>
			<text class="hero-desc">无需登录，先了解平台功能，并体验一道职业探索示例题。</text>
		</view>

		<view class="notice">
			<text class="notice-icon">i</text>
			<text class="notice-text">当前为游客浏览模式，仅展示平台介绍和示例内容，不会收集姓名、学号等个人信息。</text>
		</view>

		<!-- 平台功能 -->
		<view class="section">
			<view class="section-head">
				<text class="section-bar"></text>
				<text class="section-title">平台能做什么</text>
			</view>
			<view class="feature-grid">
				<view v-for="item in features" :key="item.name" class="feature-card">
					<text class="feature-icon">{{ item.icon }}</text>
					<text class="feature-name">{{ item.name }}</text>
					<text class="feature-desc">{{ item.desc }}</text>
				</view>
			</view>
		</view>

		<!-- 活动流程 -->
		<view class="section">
			<view class="section-head">
				<text class="section-bar"></text>
				<text class="section-title">活动参与流程</text>
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

		<!-- 示例体验 -->
		<view class="section">
			<view class="section-head">
				<text class="section-bar"></text>
				<text class="section-title">职业猜猜看 · 示例体验</text>
			</view>
			<view class="demo-card">
				<text class="demo-tag">示例题</text>
				<text class="demo-scene">每天的工作是：了解用户需求，规划产品功能，和研发、设计讨论方案，再分析产品使用情况，把想法逐步变成真正可用的产品。</text>
				<text class="demo-question">猜猜以上内容最可能是下面哪个职业的工作场景？</text>
				<view class="demo-options">
					<view
						v-for="option in demoOptions"
						:key="option.key"
						class="demo-option"
						:class="optionClass(option.key)"
						@click="chooseDemo(option.key)"
					>
						<text class="option-key">{{ option.key }}</text>
						<text class="option-text">{{ option.label }}</text>
						<text v-if="showMark(option.key)" class="option-mark">{{ markText(option.key) }}</text>
					</view>
				</view>

				<view v-if="demoAnswered" class="demo-feedback">
					<text class="feedback-title" :class="demoCorrect ? 'success' : 'warn'">
						{{ demoCorrect ? '回答正确' : '这一次没有选对' }}
					</text>
					<text class="feedback-career">正确答案：B 产品经理</text>
					<text class="feedback-intro">把用户想法变成真正好用的产品</text>
					<text class="feedback-detail">产品经理需要了解用户需求，思考产品应该解决什么问题，并协调设计、技术等人员，把想法逐步变成真正可使用的产品。</text>
					<text class="feedback-tip">登录后可参与完整 5 道题，并获得职业探索报告。</text>
					<text class="feedback-reset" @click="resetDemo">再试一次</text>
				</view>
			</view>
		</view>

		<!-- 职业卡片示例 -->
		<view class="section">
			<view class="section-head">
				<text class="section-bar"></text>
				<text class="section-title">职业卡片示例</text>
			</view>
			<view class="career-list">
				<view v-for="career in careers" :key="career.name" class="career-card">
					<text class="career-icon">{{ career.icon }}</text>
					<view class="career-body">
						<text class="career-name">{{ career.name }}</text>
						<text class="career-intro">{{ career.intro }}</text>
					</view>
				</view>
			</view>
			<text class="career-tip">登录后可在职业探索墙查看全部职业资料和详情。</text>
		</view>

		<!-- 登录后可用 -->
		<view class="section">
			<view class="section-head">
				<text class="section-bar"></text>
				<text class="section-title">登录后可以使用</text>
			</view>
			<view class="list-card">
				<view v-for="item in benefits" :key="item" class="list-item">
					<text class="list-dot">·</text>
					<text class="list-text">{{ item }}</text>
				</view>
			</view>
		</view>

		<!-- 使用说明 -->
		<view class="section">
			<view class="section-head">
				<text class="section-bar"></text>
				<text class="section-title">使用说明</text>
			</view>
			<view class="list-card">
				<text class="paragraph">平台面向合作院校在校学生开放。活动参与、答题记录、个人报告和报告打印需要登录后使用。</text>
				<text class="paragraph">如果还没有账号，可以返回登录页点击“没有账号？去注册”，或联系学校就业指导中心、活动现场工作人员。</text>
				<text class="paragraph">游客体验中的答题不会保存，也不会计入活动参与统计；正式参与活动请使用学校提供的账号登录。</text>
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
				demoChoice: '',
				demoAnswered: false,
				demoOptions: [
					{ key: 'A', label: '用户研究员' },
					{ key: 'B', label: '产品经理' },
					{ key: 'C', label: '产品运营' },
					{ key: 'D', label: '用户体验专员' }
				],
				features: [
					{ icon: '🏫', name: '活动参与', desc: '扫码进入学校发布的职业或就业活动周，完成签到和互动环节。' },
					{ icon: '🧭', name: '职业探索', desc: '通过猜职业、心愿橱窗、职愿探究等互动，了解不同职业方向。' },
					{ icon: '📄', name: '探索报告', desc: '汇总答题、浏览和探索清单记录，形成个人职业探索报告。' },
					{ icon: '🖨', name: '现场打印', desc: '在活动打印点将探索报告打印留存，方便带走查看。' }
				],
				careers: [
					{ icon: '🎧', name: '用户体验专员', intro: '让产品用起来更简单、更舒服' },
					{ icon: '🏷', name: '数据标注师', intro: '为 AI 学习准备高质量的数据素材' },
					{ icon: '🤖', name: 'AI 训练师', intro: '教 AI 学会理解和处理各种信息' },
					{ icon: '📈', name: '产品运营', intro: '让产品被更多用户发现和使用' }
				],
				flow: [
					{ title: '扫码进入', desc: '使用小程序扫描活动二维码，进入当前活动。' },
					{ title: '完成环节', desc: '按活动流程完成签到、答题或职业探索。' },
					{ title: '查看报告', desc: '在个人报告中查看本次活动的参与结果。' },
					{ title: '打印留存', desc: '需要纸质版时，可在现场打印点打印报告。' }
				],
				benefits: [
					'参与学校发布的职业/就业活动周',
					'保存答题记录和职业探索清单',
					'查看并下载个人探索报告',
					'使用活动现场的报告打印服务',
					'提交活动反馈，帮助学校改进活动'
				]
			}
		},
		computed: {
			demoCorrect() {
				return this.demoChoice === 'B'
			}
		},
		methods: {
			chooseDemo(key) {
				if (this.demoAnswered) return
				this.demoChoice = key
				this.demoAnswered = true
			},
			optionClass(key) {
				if (!this.demoAnswered) return ''
				if (key === 'B') return 'is-correct'
				if (key === this.demoChoice) return 'is-wrong'
				return 'is-muted'
			},
			showMark(key) {
				if (!this.demoAnswered) return false
				return key === 'B' || key === this.demoChoice
			},
			markText(key) {
				if (key === 'B') return '正确答案'
				return '你的选择'
			},
			resetDemo() {
				this.demoAnswered = false
				this.demoChoice = ''
			},
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

	/* 示例题 */
	.demo-card {
		padding: 30rpx 28rpx 32rpx;
		border-radius: 24rpx;
		background: #ffffff;
		box-shadow: 0 6rpx 22rpx rgba(26, 60, 110, 0.06);
	}

	.demo-tag {
		display: inline-block;
		padding: 4rpx 16rpx;
		border-radius: 8rpx;
		background: #eef5ff;
		color: #3f7fd4;
		font-size: 22rpx;
	}

	.demo-scene {
		display: block;
		margin-top: 18rpx;
		padding: 22rpx 24rpx;
		border-radius: 16rpx;
		background: #f6f9fd;
		color: #40556f;
		font-size: 25rpx;
		line-height: 1.75;
	}

	.demo-question {
		display: block;
		margin-top: 22rpx;
		color: #1a2c4a;
		font-size: 27rpx;
		font-weight: 700;
		line-height: 1.6;
	}

	.demo-options {
		margin-top: 18rpx;
	}

	.demo-option {
		display: flex;
		align-items: center;
		margin-bottom: 14rpx;
		padding: 20rpx 22rpx;
		border-radius: 16rpx;
		border: 2rpx solid #e6edf6;
		background: #ffffff;
	}

	.option-key {
		flex: 0 0 40rpx;
		width: 40rpx;
		height: 40rpx;
		margin-right: 16rpx;
		border-radius: 50%;
		background: #eef3f9;
		color: #5a7089;
		font-size: 22rpx;
		font-weight: 700;
		line-height: 40rpx;
		text-align: center;
	}

	.option-text {
		flex: 1;
		color: #2b3f58;
		font-size: 26rpx;
	}

	.option-mark {
		margin-left: 12rpx;
		font-size: 20rpx;
		color: #6b7f96;
	}

	.demo-option.is-correct {
		border-color: #4caf7d;
		background: #f1fbf5;
	}

	.demo-option.is-correct .option-key {
		background: #4caf7d;
		color: #ffffff;
	}

	.demo-option.is-correct .option-mark {
		color: #2f8a5c;
	}

	.demo-option.is-wrong {
		border-color: #e08a8a;
		background: #fff6f6;
	}

	.demo-option.is-wrong .option-key {
		background: #d96b6b;
		color: #ffffff;
	}

	.demo-option.is-wrong .option-mark {
		color: #b24d4d;
	}

	.demo-option.is-muted {
		opacity: 0.55;
	}

	.demo-feedback {
		margin-top: 20rpx;
		padding: 24rpx;
		border-radius: 18rpx;
		background: #f7faff;
		border: 1rpx solid #e2ecf9;
	}

	.feedback-title {
		display: block;
		font-size: 28rpx;
		font-weight: 800;
	}

	.feedback-title.success {
		color: #2f8a5c;
	}

	.feedback-title.warn {
		color: #b24d4d;
	}

	.feedback-career {
		display: block;
		margin-top: 12rpx;
		color: #1a2c4a;
		font-size: 27rpx;
		font-weight: 700;
	}

	.feedback-intro {
		display: block;
		margin-top: 6rpx;
		color: #3f7fd4;
		font-size: 24rpx;
	}

	.feedback-detail {
		display: block;
		margin-top: 12rpx;
		color: #5c708a;
		font-size: 24rpx;
		line-height: 1.7;
	}

	.feedback-tip {
		display: block;
		margin-top: 14rpx;
		color: #8a9bb0;
		font-size: 22rpx;
	}

	.feedback-reset {
		display: inline-block;
		margin-top: 18rpx;
		padding: 10rpx 26rpx;
		border-radius: 999rpx;
		background: #e8f1fd;
		color: #3f7fd4;
		font-size: 23rpx;
	}

	/* 职业卡片示例 */
	.career-list {
		border-radius: 24rpx;
		background: #ffffff;
		box-shadow: 0 6rpx 22rpx rgba(26, 60, 110, 0.06);
		overflow: hidden;
	}

	.career-card {
		display: flex;
		align-items: center;
		padding: 24rpx 28rpx;
		border-bottom: 1rpx solid #eef3f9;
	}

	.career-card:last-child {
		border-bottom: none;
	}

	.career-icon {
		flex: 0 0 64rpx;
		width: 64rpx;
		height: 64rpx;
		margin-right: 20rpx;
		border-radius: 18rpx;
		background: #eef5ff;
		font-size: 32rpx;
		line-height: 64rpx;
		text-align: center;
	}

	.career-body {
		flex: 1;
	}

	.career-name {
		display: block;
		color: #23364f;
		font-size: 27rpx;
		font-weight: 700;
	}

	.career-intro {
		display: block;
		margin-top: 6rpx;
		color: #71839a;
		font-size: 23rpx;
		line-height: 1.55;
	}

	.career-tip {
		display: block;
		margin-top: 14rpx;
		color: #9aabbe;
		font-size: 21rpx;
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

	.paragraph {
		display: block;
		padding: 10rpx 0;
		color: #5c708a;
		font-size: 24rpx;
		line-height: 1.8;
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
