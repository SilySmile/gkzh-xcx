<template>
	<scroll-view scroll-y class="page">
		<zycck-header title="探职业" @back="back" />
		<view class="content">
			<view class="report-header">
				<text class="title">我的未来职业探索报告</text>
				<text class="subtitle">以下是你想进一步了解的职业</text>
			</view>

			<view class="chart-card decorated-card">
				<view class="chart-content">
					<text class="chart-title">进一步了解职业的大类比例</text>
					<canvas v-if="categoryStats.length" id="reportPieFinal" canvas-id="reportPieFinal" class="pie" />
					<view v-if="categoryStats.length" class="legend">
						<view v-for="item in categoryStats" :key="item.name" class="legend-item">
							<text class="dot" :style="{ background: item.color }" />
							<text>{{ item.name }} {{ item.percent }}%</text>
						</view>
					</view>
					<text v-else class="chart-empty">暂未加入进一步了解的职业</text>
				</view>
				<view class="decoration-circle decoration-circle-light" />
				<view class="decoration-circle decoration-circle-deep" />
				<image class="corner-icon" src="https://zhiye.sxgkzh.cn/imgs/zycck/xc.png" mode="aspectFit" />
			</view>

			<view class="career-card decorated-card">
				<view class="career-content">
					<view class="career-card-heading">
						<text class="career-list-title">进一步了解的职业</text>
						<text class="count">共 {{ careers.length }} 个</text>
					</view>
					<view v-if="careers.length" class="career-list">
						<view v-for="career in careers" :key="career.careerId" class="career-item">
							<text class="career-name">{{ career.careerName }}</text>
							<text class="career-intro">{{ career.oneLineIntro || '暂无一句话介绍' }}</text>
						</view>
					</view>
					<view v-else-if="!loading" class="empty-copy">
						<text class="empty-title">本次没有加入进一步了解的职业</text>
						<text class="empty-text">本次参与记录已保存。</text>
					</view>
				</view>
				<view class="decoration-circle decoration-circle-light" />
				<view class="decoration-circle decoration-circle-deep" />
				<image class="corner-icon" src="https://zhiye.sxgkzh.cn/imgs/zycck/xc.png" mode="aspectFit" />
			</view>

			<button class="download-button" :loading="downloading" hover-class="button-hover" @click="download">
				下载探索报告PDF
			</button>
			<button class="print-button" :loading="printing" hover-class="button-hover" @click="openPrint">
				打印探索报告
			</button>
			<view v-if="printPanelVisible" class="print-mask" @click="closePrint">
				<view class="print-panel" @click.stop>
					<view class="print-panel-title">选择打印机</view>
					<view v-if="!printers.length && !printerLoading" class="print-empty">暂无可用打印机</view>
					<view v-for="printer in printers" :key="printer.printerId" class="printer-option" :class="{ selected: selectedPrinterId === printer.printerId }" @click="selectedPrinterId = printer.printerId">
						<view>
							<text class="printer-name">{{ printer.printerName || printer.cloudName || printer.equipmentSn }}</text>
							<text class="printer-meta">{{ printer.modelName || 'TSPL 标签打印机' }} · {{ printer.statusText || '在线' }}</text>
						</view>
						<text v-if="selectedPrinterId === printer.printerId" class="printer-check">✓</text>
					</view>
					<button class="print-confirm" :loading="printing" :disabled="!selectedPrinterId || printing" @click="submitPrint">开始打印</button>
					<button class="print-cancel" :disabled="printing" @click="closePrint">取消</button>
				</view>
			</view>
		</view>
	</scroll-view>
</template>

<script>
	import {
		getExploration,
		getCatalog,
		listPrinters,
		printReport,
		getPrintTask,
		downloadReportPdf,
		userMessage
	} from '@/api/zycck'
	import ZycckHeader from '@/components/ZycckHeader.vue'
	import config from '@/config/api.js'

	export default {
		components: { ZycckHeader },
		data: () => ({
			recordId: '',
			instanceId: '',
			gameId: '',
			careers: [],
			categoryStats: [],
			loading: false,
			downloading: false,
			backing: false,
			printers: [],
			selectedPrinterId: null,
			printPanelVisible: false,
			printerLoading: false,
			printing: false,
			printPolling: false
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
							this.backing = false
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
					const exploration = explorationRes.data || {}
					const selected = exploration.items || exploration.explorationItems || []
					const catalog = (catalogRes.data || {}).careers || []
					const cats = (catalogRes.data || {}).categories || []
					const catNames = {}
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
							careerName: item.careerName || (byId[String(id)] && byId[String(id)].careerName) || '职业信息'
						}
					})
					const counts = {}
					this.careers.forEach(c => {
						const n = catNames[String(c.categoryId)]
						if (n) counts[n] = (counts[n] || 0) + 1
					})
					const colors = ['#ffadbb', '#fdc7cd', '#fed7da', '#c9d4f7', '#acbfeb']
					const total = Object.keys(counts).reduce((sum, name) => sum + counts[name], 0) || 1
					this.categoryStats = Object.keys(counts).filter(name => counts[name] > 0).map((name, i) => ({
						name,
						count: counts[name],
						percent: Math.round(counts[name] * 100 / total),
						color: colors[i % colors.length]
					}))
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
				// 按 canvas 在页面上的真实尺寸计算圆心和半径，避免 rpx 与固定 px 坐标不一致造成裁切。
				uni.createSelectorQuery().in(this).select('#reportPieFinal').boundingClientRect(rect => {
					if (!rect || !rect.width || !rect.height || !this.categoryStats.length) return
					const width = Number(rect.width)
					const height = Number(rect.height)
					const size = Math.min(width, height)
					const cx = width / 2
					const cy = height / 2
					const r = size * .425
					const ctx = uni.createCanvasContext('reportPieFinal', this)
					ctx.clearRect(0, 0, width, height)

					const total = this.categoryStats.reduce((sum, item) => sum + item.count, 0) || 1
					let start = -Math.PI / 2
					this.categoryStats.forEach((item, index) => {
						const end = index === this.categoryStats.length - 1
							? -Math.PI / 2 + Math.PI * 2
							: start + Math.PI * 2 * item.count / total
						ctx.beginPath()
						if (this.categoryStats.length > 1) ctx.moveTo(cx, cy)
						ctx.arc(cx, cy, r, start, end, false)
						if (this.categoryStats.length > 1) ctx.lineTo(cx, cy)
						ctx.closePath()
						ctx.setFillStyle(item.color)
						ctx.fill()
						start = end
					})
					ctx.draw(false)
				}).exec()
			},
			async openPrint() {
				if (this.printing || this.printerLoading) return
				this.printPanelVisible = true
				this.printerLoading = true
				try {
					const result = await listPrinters()
					this.printers = (result.data || result || []).filter(item => item.canPrint !== false && Number(item.status) === 1 && String(item.enabled) === '0' && String(item.boundStatus) === '0')
					if (this.printers.length) this.selectedPrinterId = this.printers[0].printerId
				} catch (e) {
					this.printPanelVisible = false
					uni.showToast({ title: userMessage(e, '打印机列表加载失败，请稍后重试'), icon: 'none' })
				} finally {
					this.printerLoading = false
				}
			},
			closePrint() {
				if (!this.printing) this.printPanelVisible = false
			},
			async submitPrint() {
				if (!this.selectedPrinterId || this.printing) return
				this.printing = true
				try {
					const result = await printReport(this.recordId, this.selectedPrinterId)
					const task = result.data || result || {}
					await this.pollPrintTask(task.taskId)
				} catch (e) {
					uni.showToast({ title: userMessage(e, '打印任务提交失败，请稍后重试'), icon: 'none' })
				} finally {
					this.printing = false
				}
			},
			async pollPrintTask(taskId) {
				if (!taskId) throw new Error('打印任务提交失败')
				this.printPolling = true
				try {
					for (let i = 0; i < 12; i++) {
						const result = await getPrintTask(taskId)
						const task = result.data || result || {}
						if (task.status === 'success') {
							this.printPanelVisible = false
							uni.showToast({ title: '打印任务已完成', icon: 'success' })
							return
						}
						if (task.status === 'failed') throw new Error(task.errorMessage || '打印失败，请检查打印机状态')
						await new Promise(resolve => setTimeout(resolve, 1500))
					}
					uni.showToast({ title: '打印任务已提交，请稍后查看', icon: 'none' })
				} finally {
					this.printPolling = false
				}
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
		border-top: 4rpx solid #a66da4;
		background: linear-gradient(180deg, #d0b6d2 0%, #d0b6d2 25%, #d7c4dc 47%, #e4ddea 72%, #ebebf4 86%, #ebebf4 100%);
	}

	.content {
		box-sizing: border-box;
		min-height: calc(100vh - 108rpx);
		padding: 137rpx 30rpx 68rpx;
		animation: pageIn .35s ease-out;
	}

	.report-header {
		transform: translateY(-8rpx);
		text-align: center;
		margin-bottom: 90rpx;
	}

	.title,
	.subtitle,
	.chart-title,
	.chart-empty,
	.career-list-title,
	.count,
	.career-name,
	.career-intro,
	.empty-title,
	.empty-text {
		display: block;
	}

	.title {
		font-size: 48rpx;
		font-weight: 800;
		line-height: 1.3;
		color: #07070a;
	}

	.subtitle {
		margin-top: 43rpx;
		font-size: 29rpx;
		line-height: 1.45;
		color: #77747c;
	}

	.decorated-card {
		position: relative;
		overflow: hidden;
		box-sizing: border-box;
		width: 100%;
		border-radius: 24rpx;
		background: #fff;
	}

	.chart-card {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 668rpx;
		padding: 42rpx 105rpx 98rpx;
		margin-bottom: 82rpx;
		text-align: center;
	}

	.chart-content,
	.career-content {
		position: relative;
		z-index: 3;
		width: 100%;
	}

	.chart-title {
		font-size: 30rpx;
		font-weight: 800;
		line-height: 1.4;
		color: #29252d;
	}

	.pie {
		display: block;
		width: 300rpx;
		height: 300rpx;
		margin: 24rpx auto 20rpx;
		border: 0;
		outline: 0;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 14rpx 22rpx;
	}

	.legend-item {
		display: flex;
		align-items: center;
		font-size: 23rpx;
		line-height: 1.4;
		color: #6f6a74;
	}

	.dot {
		width: 18rpx;
		height: 18rpx;
		margin-right: 7rpx;
		border-radius: 50%;
	}

	.chart-empty {
		padding: 150rpx 0;
		font-size: 25rpx;
		color: #8a8690;
	}

	.career-card {
		min-height: 195rpx;
		padding: 28rpx 150rpx 38rpx 31rpx;
		margin-bottom: 30rpx;
	}

	.career-card-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 18rpx;
	}

	.career-list-title {
		font-size: 29rpx;
		font-weight: 800;
		color: #252229;
	}

	.count {
		font-size: 22rpx;
		color: #8a8690;
	}

	.career-list {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 15rpx 24rpx;
	}

	.career-item {
		min-width: 0;
		padding-left: 16rpx;
		border-left: 5rpx solid #d0b6d2;
	}

	.career-name {
		overflow: hidden;
		font-size: 24rpx;
		font-weight: 700;
		line-height: 1.4;
		color: #3b3740;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.career-intro {
		display: -webkit-box;
		overflow: hidden;
		margin-top: 5rpx;
		font-size: 20rpx;
		line-height: 1.4;
		color: #89848e;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
	}

	.empty-title {
		font-size: 25rpx;
		font-weight: 700;
		color: #4c4751;
	}

	.empty-text {
		margin-top: 8rpx;
		font-size: 22rpx;
		color: #8a8690;
	}

	.decoration-circle {
		position: absolute;
		z-index: 0;
		border-radius: 50%;
	}

	.decoration-circle-light {
		right: 59rpx;
		bottom: -75rpx;
		width: 132rpx;
		height: 132rpx;
		background: #f5f1f7;
	}

	.decoration-circle-deep {
		right: -58rpx;
		bottom: -65rpx;
		width: 144rpx;
		height: 144rpx;
		background: #f2e9f3;
	}

	.corner-icon {
		position: absolute;
		right: 0;
		bottom: -8rpx;
		z-index: 2;
		width: 112rpx;
		height: 112rpx;
	}

	.download-button {
		width: 100%;
		height: 80rpx;
		padding: 0;
		margin: 0;
		border: 0;
		border-radius: 12rpx;
		background: #28b28b;
		color: #fff;
		font-size: 33rpx;
		font-weight: 400;
		line-height: 80rpx;
	}

	.download-button::after {
		border: 0;
	}

		.print-button {
		box-sizing: border-box;
		width: 100%;
		height: 76rpx;
		padding: 0;
		margin-top: 18rpx;
		border: 1rpx solid #28b28b;
		border-radius: 38rpx;
		background: #fff;
		color: #28a77f;
		font-size: 29rpx;
		line-height: 76rpx;
	}

	.print-mask {
		position: fixed;
		z-index: 20;
		inset: 0;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		background: rgba(26, 20, 31, .38);
	}

	.print-panel {
		box-sizing: border-box;
		width: 100%;
		padding: 36rpx 30rpx calc(28rpx + env(safe-area-inset-bottom));
		border-radius: 32rpx 32rpx 0 0;
		background: #fff;
	}

	.print-panel-title {
		margin-bottom: 24rpx;
		color: #1c1920;
		font-size: 34rpx;
		font-weight: 700;
		text-align: center;
	}

	.printer-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		box-sizing: border-box;
		min-height: 86rpx;
		padding: 16rpx 22rpx;
		margin-bottom: 14rpx;
		border: 1rpx solid #e8e1e9;
		border-radius: 16rpx;
		background: #fff;
	}

	.printer-option.selected { border-color: #28b28b; background: #effaf5; }
	.printer-name, .printer-meta { display: block; }
	.printer-name { color: #211c23; font-size: 28rpx; }
	.printer-meta { margin-top: 6rpx; color: #8d858f; font-size: 22rpx; }
	.printer-check { color: #28b28b; font-size: 34rpx; font-weight: 700; }
	.print-empty { padding: 38rpx 0; color: #938b94; font-size: 25rpx; text-align: center; }

	.print-confirm, .print-cancel {
		width: 100%; height: 72rpx; padding: 0; margin: 16rpx 0 0;
		border-radius: 36rpx; font-size: 28rpx; line-height: 72rpx;
	}
	.print-confirm { border: 0; background: #28b28b; color: #fff; }
	.print-cancel { border: 1rpx solid #dfd9e0; background: #fff; color: #5d565f; }
.button-hover {
		opacity: .82;
	}

	@keyframes pageIn {
		from {
			opacity: 0;
			transform: translateY(18rpx);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
