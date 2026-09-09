<template>
	<scroll-view scroll-y class="page">
		<view class="content">
			<view class="report-actions">
				<button class="back-button" hover-class="button-hover" @click="back">返回</button>
			</view>
			<view class="report-header">
				<text class="title">我的未来职业探索报告</text>
				<text class="subtitle">以下是你想进一步了解的职业</text>
				<text class="count">共 {{ careers.length }} 个职业</text>
			</view>

			<view class="chart-card">
				<text class="chart-title">进一步了解职业的大类比例</text>
				<canvas id="reportPieFinal" canvas-id="reportPieFinal" class="pie" width="320" height="320" style="width:320px;height:320px;display:block;border:0;outline:0;"></canvas>
				<view v-if="categoryStats.length" class="legend">
					<view v-for="item in categoryStats" :key="item.name" class="legend-item">
						<text class="dot" :style="{background:item.color}"></text>
						<text>{{ item.name }} {{ item.percent }}%</text>
					</view>
				</view>
				<text v-else class="chart-empty">暂未加入进一步了解的职业</text>
			</view>
			<text class="career-list-title">进一步了解的职业</text>
			<view v-for="career in careers" :key="career.careerId" class="career-card">
				<view class="career-header">
					<view class="career-heading">
						<text class="career-name">{{ career.careerName }}</text>
						<text class="career-intro">{{ career.oneLineIntro || '暂无一句话介绍' }}</text>
					</view>
				</view>
				<view v-if="false" class="info-block">
					<text class="info-title">这个职业主要做什么？</text>
					<text class="info-body">{{ career.mainWork || '暂无介绍' }}</text>
				</view>
				<view v-if="false" class="info-block">
					<text class="info-title">一天可能做什么？</text>
					<view v-if="dayItems(career).length" class="day-grid">
						<view v-for="(item, index) in dayItems(career)" :key="index" class="day-item">
							<view class="day-icon">{{ index + 1 }}</view>
							<text class="day-title">{{ item.title }}</text>
							<text v-if="item.description" class="day-description">{{ item.description }}</text>
						</view>
					</view>
					<text v-else class="info-body">暂无介绍</text>
				</view>
				<view v-if="false" class="info-block">
					<text class="info-title">为什么会有这样的职业？</text>
					<text class="info-body">{{ career.whyExists || '暂无介绍' }}</text>
				</view>
			</view>

			<view v-if="!loading && !careers.length" class="empty-card">
				<text class="empty-title">本次没有加入进一步了解的职业</text>
				<text class="empty-text">你已经完成了未来职业探索，本次参与记录已保存。</text>
			</view>

			<button type="primary" :loading="downloading" hover-class="button-hover" @click="download">下载探索报告
				PDF</button>
		</view>
	</scroll-view>
</template>

<script>
	import {
		getExploration,
		getCatalog,
		downloadReportPdf,
		userMessage
	} from '@/api/zycck'
	import config from '@/config/api.js'

	export default {
		data: () => ({
			recordId: '',
			instanceId: '',
			gameId: '',
			careers: [],
			categoryStats: [],
			loading: false,
			downloading: false,
			backing: false
		}),
		onLoad(o) {
			Object.assign(this, {
				recordId: o.recordId || '',
				instanceId: o.instanceId || '',
				gameId: o.gameId || ''
			})
			this.load()
		},
		methods: {
			imageUrl(v) {
				return v && (/^\/(profile|upload)\//.test(v) ? config.BASE_URL + v : v)
			},
			back() {
				if (this.backing) return
				this.backing = true
				const pages = getCurrentPages()
				const fallback = () => {
					const activityId = encodeURIComponent(this.instanceId || uni.getStorageSync('activityId') || '')
					uni.redirectTo({
						url: `/pages/mp/sub-pages/personal-report/index?activityId=${activityId}`
					})
				}
				if (pages.length > 1) {
					uni.navigateBack({
						delta: 1,
						complete: () => {
							this.backing = false
						},
						fail: () => {
							this.backing = false;
							fallback()
						}
					})
				} else {
					this.backing = false
					fallback()
				}
			},
			dayItems(career) {
				return String((career && career.dayExample) || '').split(/\r?\n/).filter(Boolean).map(item => {
					const parts = item.split('｜')
					return {
						title: parts.shift() || '',
						description: parts.join('｜')
					}
				})
			},
			async load() {
				this.loading = true
				try {
					const [explorationRes, catalogRes] = await Promise.all([
						getExploration(this.recordId),
						getCatalog({
							instanceId: this.instanceId,
							gameId: this.gameId
						})
					])
					const exploration = explorationRes.data || {};
					const selected = exploration.items || exploration.explorationItems || []
					const catalog = (catalogRes.data || {}).careers || []
					const cats = (catalogRes.data || {}).categories || [];
					const catNames = {};
					cats.forEach(c => {
						catNames[String(c.categoryId)] = c.name
					})
					const byId = {}
					catalog.forEach(item => {
						byId[String(item.careerId || item.careerQuestionId)] = item
					})
					// 报告只展示用户主动加入“进一步了解”的职业。
					// 题目职业和浏览记录属于探索过程，不应混入报告数量或职业清单。
					this.careers = selected.map(item => {
						const id = item.careerId || item.careerQuestionId
						return {
							...item,
							...(byId[String(id)] || {}),
							careerId: id,
							careerName: item.careerName || (byId[String(id)] && byId[String(id)].careerName) ||
								'职业信息'
						}
					})
					const counts = {};
					this.careers.forEach(c => {
						const n = catNames[String(c.categoryId)];
						if (n) counts[n] = (counts[n] || 0) + 1
					});
					const colors = ['#4e8df7', '#52b788', '#f6ad55', '#e76f51', '#9b87f5'];
					const total = Object.keys(counts).reduce((sum, name) => sum + counts[name], 0) || 1;
					this.categoryStats = Object.keys(counts).filter(name => counts[name] > 0).map((name, i) => ({
						name,
						count: counts[name],
						percent: Math.round(counts[name] * 100 / total),
						color: colors[i % colors.length]
					}));
					this.$nextTick(() => setTimeout(() => this.drawPie(), 300))
				} catch (e) {
					uni.showToast({
						title: userMessage(e, '探索报告加载失败，请重试'),
						icon: 'none'
					})
				} finally {
					this.loading = false
				}
			},
			drawPie() {
				const ctx = uni.createCanvasContext('reportPieFinal', this);
				const cx = 160,
					cy = 160,
					r = 148;
				ctx.clearRect(0, 0, 320, 320);
				const total = this.categoryStats.reduce((sum, item) => sum + item.count, 0) || 1;
				let start = -Math.PI / 2;
				this.categoryStats.forEach((item, index) => {
					// 每个类别只绘制一个完整扇形，避免分段绘制产生的虚线/接缝。
					const end = index === this.categoryStats.length - 1
						? -Math.PI / 2 + Math.PI * 2
						: start + Math.PI * 2 * item.count / total;
					ctx.beginPath();
					ctx.moveTo(cx, cy);
					ctx.arc(cx, cy, r, start, end, false);
					ctx.lineTo(cx, cy);
					ctx.closePath();
					ctx.setFillStyle(item.color);
					ctx.fill();
					start = end;
				});
				ctx.draw(false)
			},
			async download() {
				if (this.downloading) return
				this.downloading = true
				try {
					uni.showLoading({
						title: '生成 PDF'
					})
					const result = await downloadReportPdf({
						recordId: this.recordId
					})
					const path = result.tempFilePath || result.filePath
					if (!path) throw new Error('PDF 下载失败')
					uni.openDocument({
						filePath: path,
						showMenu: true,
						fileType: 'pdf'
					})
				} catch (e) {
					uni.showToast({
						title: userMessage(e, 'PDF 下载失败，请稍后重试'),
						icon: 'none'
					})
				} finally {
					uni.hideLoading()
					this.downloading = false
				}
			}
		}
	}
</script>

<style scoped>
	.page {
		height: 100vh;
		background: #f7f5f1
	}

	.content {
		min-height: 100vh;
		width: 100%;
		padding: 34rpx 28rpx 64rpx;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center
	}

	.report-actions,
	.report-header,
	.chart-card,
	.career-card,
	.empty-card,
	button {
		width: 100%;
		box-sizing: border-box
	}

	.report-actions {
		display: flex;
		justify-content: flex-start;
		margin-bottom: 12rpx
	}

	.back-button {
		width: auto;
		margin: 0;
		padding: 0 28rpx;
		height: 64rpx;
		line-height: 64rpx;
		background: #fff;
		color: #526173;
		border: 1rpx solid #dfe5ec;
		border-radius: 32rpx;
		font-size: 26rpx
	}

	.back-button::after {
		border: 0
	}

	.report-header {
		text-align: center;
		margin-bottom: 30rpx
	}

	.chart-card {
		width: 100%;
		box-sizing: border-box;
		margin-bottom: 24rpx;
		padding: 26rpx;
		border-radius: 24rpx;
		background: #fff;
		text-align: center;
		box-shadow: 0 8rpx 28rpx rgba(77, 65, 46, .06)
	}

	.chart-title {
		display: block;
		font-size: 30rpx;
		font-weight: 700;
		color: #263548
	}

	.pie {
		display: block;
		width: 320rpx;
		height: 320rpx;
		margin: 18rpx auto;
	}

	.career-list-title {
		display: block;
		width: 100%;
		margin: 0 0 14rpx;
		color: #263548;
		font-size: 30rpx;
		font-weight: 700;
	}

	.chart-empty {
		display: block;
		padding: 90rpx 0;
		color: #8a94a6;
		font-size: 24rpx
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 14rpx 22rpx
	}

	.legend-item {
		display: flex;
		align-items: center;
		color: #64748b;
		font-size: 23rpx
	}

	.dot {
		width: 18rpx;
		height: 18rpx;
		border-radius: 50%;
		margin-right: 7rpx
	}

	.title {
		display: block;
		font-size: 48rpx;
		font-weight: 800;
		color: #1a2c4a
	}

	.subtitle {
		display: block;
		margin-top: 16rpx;
		color: #64748b;
		font-size: 27rpx
	}

	.count {
		display: inline-block;
		margin-top: 16rpx;
		padding: 8rpx 18rpx;
		border-radius: 20rpx;
		background: #e8f1ff;
		color: #1b76fe;
		font-size: 24rpx
	}

	.career-card,
	.empty-card {
		background: #fff;
		border-radius: 24rpx;
		padding: 30rpx;
		margin-bottom: 24rpx;
		box-shadow: 0 8rpx 28rpx rgba(77, 65, 46, .06)
	}

	.career-header {
		display: flex;
		align-items: center;
		padding-bottom: 24rpx;
		border-bottom: 1rpx solid #f0ede8
	}

	.career-image {
		width: 150rpx;
		height: 130rpx;
		border-radius: 18rpx;
		margin-right: 22rpx
	}

	.career-heading {
		flex: 1;
		min-width: 0
	}

	.career-name {
		display: block;
		font-size: 38rpx;
		font-weight: 800;
		color: #222
	}

	.career-intro {
		display: block;
		margin-top: 12rpx;
		font-size: 26rpx;
		line-height: 1.6;
		color: #665f55
	}

	.info-block {
		padding-top: 24rpx
	}

	.info-title {
		display: block;
		font-size: 30rpx;
		font-weight: 700;
		color: #20252b;
		margin-bottom: 12rpx
	}

	.info-body {
		display: block;
		font-size: 26rpx;
		line-height: 1.75;
		color: #4b5563;
		white-space: pre-line
	}

	.day-grid {
		display: flex;
		flex-wrap: wrap;
		margin: 0 -8rpx
	}

	.day-item {
		width: 25%;
		padding: 0 8rpx 18rpx;
		box-sizing: border-box;
		text-align: center
	}

	.day-icon {
		width: 60rpx;
		height: 60rpx;
		line-height: 60rpx;
		margin: 0 auto 12rpx;
		border-radius: 16rpx;
		background: #fff4e8;
		color: #c56d1b;
		font-size: 26rpx;
		font-weight: 700
	}

	.day-title {
		display: block;
		color: #30343b;
		font-size: 25rpx;
		font-weight: 700;
		line-height: 1.35
	}

	.day-description {
		display: block;
		margin-top: 8rpx;
		color: #7a7f87;
		font-size: 22rpx;
		line-height: 1.4
	}

	.empty-card {
		text-align: center;
		padding: 54rpx 32rpx
	}

	.empty-title {
		display: block;
		font-size: 31rpx;
		font-weight: 700;
		color: #334155
	}

	.empty-text {
		display: block;
		margin-top: 18rpx;
		font-size: 25rpx;
		line-height: 1.7;
		color: #8a94a6
	}

	button {
		margin-top: 14rpx
	}

	.button-hover {
		opacity: .82
	}

	.content {
		animation: pageIn .35s ease-out;
		margin-top: 36rpx;
	}

	@keyframes pageIn {
		from {
			opacity: 0;
			transform: translateY(18rpx)
		}

		to {
			opacity: 1;
			transform: translateY(0)
		}
	}
</style>
