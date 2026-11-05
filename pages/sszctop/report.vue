<!-- 谁是职场TOP个人报告：按设计稿第 4 页展示维度、个人排序、排序说明与正确排序。 -->
<template>
	<view class="page">
		<image class="page-bg" mode="scaleToFill" :style="{ height: bgHeight }" :src="assets.page4Bg" />
		<view class="header" :style="{ paddingTop: statusBarHeight + 'px' }">
			<image class="back-icon" :src="assets.back" mode="aspectFit" @click="back" />
			<image class="logo" :src="assets.logo" mode="aspectFit" />
			<view class="header-placeholder"></view>
		</view>

		<view v-if="loading" class="empty">加载中…</view>
		<view v-else-if="!report" class="empty">未找到本次挑战记录</view>

		<view v-else class="content">
			<text class="result-title" :class="isPassed ? 'passed' : 'failed'">{{ isPassed ? '本局挑战成功' : '本局未通过' }}</text>

			<!-- 本局维度及维度解释 -->
			<view class="dimension-card">
				<text class="card-caption">本局选择的维度</text>
				<text class="dimension-name">{{ dimension.name || '未记录维度' }}</text>
				<text class="dimension-desc">{{ dimension.description || '暂无维度说明' }}</text>
			</view>

			<!-- 个人排序与每个职业在本维度下的说明 -->
			<view class="career-panel">
				<text class="panel-title">你选择的职业与个人排序。</text>
				<view v-for="(career, index) in selectedCareers" :key="career.careerId" class="career-card"
					:class="{ correct: isCorrectAt(index, career.careerId) }">
					<view class="career-head">
						<text class="rank">{{ index + 1 }}</text>
						<text class="career-name">{{ career.name }}</text>
						<text v-if="isCorrectAt(index, career.careerId)" class="correct-tag">排序正确</text>
					</view>
					<text class="career-desc">{{ rankExplanation(career.careerId) }}</text>
				</view>
				<text v-if="!selectedCareers.length" class="empty-list">未记录本次选择的职业</text>
			</view>

			<!-- 仅未通过时展示正确排序 -->
			<view v-if="!isPassed" class="standard-panel">
				<text class="panel-title standard-title">正确排序</text>
				<text class="standard-tip">以下为本次选取职业的正确排序：</text>
				<view v-for="(career, index) in standardCareers" :key="career.careerId" class="standard-row">
					<text class="standard-rank">{{ index + 1 }}</text>
					<text class="standard-name">{{ career.name }}</text>
				</view>
			</view>

			<!-- 底部入口：返回本次报告所属的生涯活动或就业活动页面 -->
			<view class="back-activity" @click="backToActivity">返回活动</view>
		</view>
	</view>
</template>

<script>
	import { getReport } from '@/api/sszctop'
	import { getWeekFlow } from '@/api/activity/week'
	import { SSZCTOP_ASSETS } from '@/config/sszctop-assets.js'
	import { redirectToActivityWeek } from '@/utils/activity'

	export default {
		data() {
			return {
				assets: SSZCTOP_ASSETS,
				// 背景按设计稿 750 宽度等比换算，显式高度避免部分基础库计算为 0。
				bgHeight: '1991rpx',
				statusBarHeight: 20,
				loading: true,
				report: null,
				bizType: '',
				dimension: {},
				careers: [],
				rankDetails: [],
				orderIds: [],
				standardIds: []
			}
		},
		computed: {
			// 只有排序框中实际选择的三个职业进入个人报告，职业池内其余职业不会展示。
			selectedCareers() {
				return this.orderIds.map(id => this.career(id)).filter(career => career.careerId)
			},
			standardCareers() {
				return this.standardIds.map(id => this.career(id)).filter(career => career.careerId)
			},
			isPassed() {
				return this.report && this.report.result === 'passed'
			}
		},
		onLoad(options) {
			try {
				this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20
			} catch (e) {
				this.statusBarHeight = 20
			}
			getReport(options.gameId).then(response => {
				if (response.code !== 200 || !response.data) return
				this.report = response.data
				this.bizType = response.data.bizType || ''
				this.dimension = this.parseSnapshot(response.data.dimensionSnapshot, {})
				this.careers = this.parseSnapshot(response.data.careersSnapshot, [])
				// 说明来自“维度排序及文案”，由服务端按本局维度和职业返回。
				this.rankDetails = response.data.rankDetails || []
				this.orderIds = this.parseIds(response.data.sharedOrderSnapshot)
				this.standardIds = this.parseIds(response.data.standardOrderSnapshot)
				// 旧版服务端不返回 bizType 时，通过活动流程接口取活动类型兜底。
				if (!this.bizType && response.data.instanceId) this.loadBizType(response.data.instanceId)
			}).finally(() => {
				this.loading = false
			})
		},
		methods: {
			// 历史报告需兼容空快照或异常快照，避免页面因一条旧数据无法打开。
			parseSnapshot(value, fallback) {
				try {
					return JSON.parse(value || '')
				} catch (error) {
					return fallback
				}
			},
			parseIds(value) {
				return String(value || '').split(',').filter(Boolean)
			},
			career(id) {
				return this.careers.find(item => String(item.careerId) === String(id)) || {}
			},
			// 使用维度排序中该职业对应的排序说明，而非职业配置中的通用说明。
			rankExplanation(careerId) {
				const rank = this.rankDetails.find(item => String(item.careerId) === String(careerId))
				return (rank && rank.description) || '暂无该维度下的职业说明'
			},
			// 个人排序在同一名次与标准排序相同即标记绿色；挑战成功时三项均为绿色。
			isCorrectAt(index, careerId) {
				return String(this.standardIds[index] || '') === String(careerId)
			},
			// 报告页属于正常浏览页面，返回上一页；没有上一页时才回到当前活动。
			back() {
				const pages = getCurrentPages()
				if (pages.length > 1) return uni.navigateBack()
				redirectToActivityWeek()
			},
			// 通过活动流程接口读取当前活动所属类型，失败时保留页面存储的兜底值。
			loadBizType(instanceId) {
				getWeekFlow(instanceId).then(res => {
					const instance = res && res.data && res.data.instance
					if (instance && instance.bizType) this.bizType = instance.bizType
				}).catch(() => {})
			},
			// 底部入口按报告所属活动类型回到对应的生涯活动或就业活动页面。
			backToActivity() {
				const bizType = this.bizType || (this.report && this.report.bizType) || uni.getStorageSync('weekBizType') || 'career_week'
				uni.reLaunch({
					url: '/pages/mp/sub-pages/career-week/index?bizType=' + encodeURIComponent(bizType)
				})
			}
		}
	}
</script>

<style scoped>
	.page {
		position: relative;
		min-height: 100vh;
		background: #f4f5fc;
		overflow-x: hidden;
	}

	.page-bg {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		z-index: 0;
		display: block;
	}

	.header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 88rpx;
		padding-left: 24rpx;
		padding-right: 24rpx;
		box-sizing: content-box;
	}

	.back-icon {
		width: 40rpx;
		height: 64rpx;
	}

	.logo {
		width: 270rpx;
		height: 42rpx;
	}

	.header-placeholder {
		width: 40rpx;
		height: 1rpx;
	}

	.empty {
		position: relative;
		z-index: 1;
		padding-top: 55vh;
		text-align: center;
		color: #7b8aa3;
		font-size: 28rpx;
	}

	.content {
		position: relative;
		z-index: 1;
		padding: 250rpx 34rpx 80rpx;
	}

	.result-title {
		display: block;
		text-align: center;
		font-size: 56rpx;
		font-weight: bold;
		letter-spacing: 2rpx;
	}

	.result-title.passed {
		color: #1aa06d;
	}

	.result-title.failed {
		color: #e03636;
	}

	.dimension-card,
	.career-panel,
	.standard-panel {
		margin-top: 26rpx;
		padding: 34rpx 32rpx;
		border-radius: 26rpx;
		background: #ffffff;
		box-shadow: 0 14rpx 36rpx rgba(58, 94, 158, .10);
	}

	.card-caption {
		display: block;
		text-align: center;
		color: #1d3557;
		font-size: 32rpx;
		font-weight: bold;
	}

	.dimension-name {
		display: block;
		margin-top: 18rpx;
		text-align: center;
		color: #1666b8;
		font-size: 46rpx;
		font-weight: bold;
	}

	.dimension-desc {
		display: block;
		margin-top: 22rpx;
		color: #5b6b82;
		font-size: 26rpx;
		line-height: 1.9;
	}

	.panel-title {
		display: block;
		text-align: center;
		color: #1d3557;
		font-size: 34rpx;
		font-weight: bold;
	}

	.career-card {
		margin-top: 22rpx;
		padding: 24rpx 22rpx 26rpx;
		border: 3rpx solid #edf1f7;
		border-radius: 22rpx;
		background: #ffffff;
	}

	.career-card.correct {
		border-color: #35c08a;
		background: #eefaf4;
	}

	.career-head {
		display: flex;
		align-items: center;
	}

	.rank {
		width: 56rpx;
		height: 56rpx;
		border-radius: 50%;
		background: #1666b8;
		color: #ffffff;
		font-size: 30rpx;
		font-weight: bold;
		text-align: center;
		line-height: 56rpx;
		flex: none;
	}

	.career-name {
		flex: 1;
		text-align: center;
		color: #1d3557;
		font-size: 34rpx;
		font-weight: bold;
	}

	.correct-tag {
		flex: none;
		width: 110rpx;
		text-align: right;
		color: #1aa06d;
		font-size: 24rpx;
		font-weight: bold;
	}

	.career-desc {
		display: block;
		margin-top: 18rpx;
		color: #4f6079;
		font-size: 26rpx;
		line-height: 1.9;
	}

	.empty-list {
		display: block;
		padding: 40rpx 0;
		text-align: center;
		color: #9aabc2;
		font-size: 26rpx;
	}

	/* 正确排序面板沿用设计稿的橙色顶部边条 */
	.standard-panel {
		border-top: 10rpx solid #f5a623;
	}

	.standard-tip {
		display: block;
		margin-top: 8rpx;
		text-align: center;
		color: #5b6b82;
		font-size: 24rpx;
	}

	.standard-row {
		display: flex;
		align-items: center;
		height: 92rpx;
		margin-top: 16rpx;
		padding: 0 20rpx;
		border-radius: 16rpx;
		background: #fff8ec;
	}

	.standard-rank {
		width: 52rpx;
		height: 52rpx;
		border-radius: 50%;
		background: #f5a623;
		color: #ffffff;
		font-size: 28rpx;
		font-weight: bold;
		text-align: center;
		line-height: 52rpx;
		flex: none;
	}

	.standard-name {
		flex: 1;
		text-align: center;
		color: #1d3557;
		font-size: 32rpx;
		font-weight: bold;
	}

	/* 报告页底部返回活动入口 */
	.back-activity {
		width: 380rpx;
		height: 88rpx;
		line-height: 88rpx;
		margin: 40rpx auto 0;
		border-radius: 44rpx;
		background: #2c71da;
		color: #ffffff;
		font-size: 30rpx;
		font-weight: bold;
		text-align: center;
		box-shadow: 0 10rpx 24rpx rgba(44, 113, 218, .25);
	}
</style>
