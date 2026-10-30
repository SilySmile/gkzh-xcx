<template>
	<view class="page">
		<image class="page-bg" :src="assets.reportBg" mode="scaleToFill" />
		<view class="page-header"><nlld-header theme="dark" @back="back" /></view>

		<image class="report-title" :src="assets.reportTitle" mode="widthFix" />
		<image class="report-card" :src="assets.reportCard" mode="scaleToFill" />

		<scroll-view scroll-y class="card-scroll">
			<view class="card-inner">
				<block v-if="result.resultType === 'top2'">
					<view v-for="(dim, index) in tops" :key="index" class="dim-block">
						<view class="dim-head">
							<image class="dim-plate" :src="assets.dimPlate" mode="scaleToFill" />
							<text class="dim-name">{{ dim.name }}</text>
						</view>
						<text class="dim-summary">{{ dim.summary }}</text>
						<text class="dim-career">{{ dim.careerReference }}</text>
					</view>
				</block>
				<block v-else>
					<view class="dim-head open-head">
						<image class="dim-plate" :src="assets.dimPlate" mode="scaleToFill" />
						<text class="dim-name">多元开放型</text>
					</view>
					<text class="open-text">{{ result.openText }}</text>
				</block>
			</view>
		</scroll-view>

		<view class="save-wrap" :class="{ disabled: saving, pressed: buttonPressed }"
			@touchstart="buttonPressed = true" @touchend="buttonPressed = false"
			@touchcancel="buttonPressed = false" @click="savePoster">
			<image class="btn-bg" :src="assets.btnBlue" mode="scaleToFill" />
			<text class="btn-text">{{ saving ? '正在生成…' : '保存截图' }}</text>
		</view>

		<view class="back-activity" @click="backToActivity">
			<text class="back-text">返回活动</text>
		</view>

		<canvas canvas-id="nlldPoster" class="poster-canvas"></canvas>
	</view>
</template>

<script>
	import { getRecord, userMessage } from '@/api/nlld'
	import NlldHeader from '@/components/NlldHeader.vue'
	import { NLLD_ASSETS } from '@/config/nlld-assets'

	export default {
		components: { NlldHeader },
		data: () => ({
			assets: NLLD_ASSETS,
			recordId: '',
			instanceId: '',
			gameId: '',
			record: {},
			result: {},
			tops: [],
			bizType: '',
			loading: true,
			saving: false,
			buttonPressed: false,
			posterTempPath: ''
		}),
		async onLoad(options) {
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			this.recordId = options.recordId || ''
			if (!this.recordId) {
				uni.showToast({ title: '缺少游戏记录，请重新扫码', icon: 'none' })
				this.loading = false
				return
			}
			await this.loadRecord()
		},
		methods: {
			async loadRecord() {
				this.loading = true
				try {
					const res = await getRecord(this.recordId, {
						instanceId: this.instanceId || undefined,
						gameId: this.gameId || undefined
					})
					const data = res.data || {}
					if (data.status !== 'finished') {
						const base = `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
						uni.redirectTo({ url: `/pages/nlld/index?${base}` })
						return
					}
					this.record = data
					this.result = data.result || {}
					this.bizType = data.bizType || ''
					this.tops = [this.result.top1, this.result.top2].filter(Boolean)
				} catch (e) {
					uni.showToast({ title: userMessage(e, '测评结果加载失败，请稍后重试'), icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			back() {
				const pages = getCurrentPages()
				if (pages.length > 1) {
					uni.navigateBack({ delta: 1 })
					return
				}
				this.backToActivity()
			},
			backToActivity() {
				const biz = this.bizType === 'job_week' ? 'job_week' : 'career_week'
				uni.reLaunch({ url: `/pages/mp/sub-pages/career-week/index?bizType=${biz}` })
			},
			imageInfo(path) {
				return new Promise((resolve, reject) => {
					uni.getImageInfo({ src: path, success: resolve, fail: reject })
				})
			},
			wrap(text, fontSize, maxWidth) {
				const lines = []
				let line = ''
				let width = 0
				const content = String(text || '')
				for (let i = 0; i < content.length; i++) {
					const ch = content.charAt(i)
					const charWidth = /[\x00-\xff]/.test(ch) ? fontSize * 0.55 : fontSize
					if (width + charWidth > maxWidth && line) {
						lines.push(line)
						line = ch
						width = charWidth
					} else {
						line += ch
						width += charWidth
					}
				}
				if (line) lines.push(line)
				return lines
			},
			drawParagraph(ctx, text, x, y, maxWidth, fontSize, lineHeight, color) {
				ctx.setFontSize(fontSize)
				ctx.setFillStyle(color)
				const lines = this.wrap(text, fontSize, maxWidth)
				lines.forEach((line, index) => {
					ctx.fillText(line, x, y + index * lineHeight)
				})
				return y + lines.length * lineHeight
			},
			async drawPoster() {
				const [bg, title, card, plate] = await Promise.all([
					this.imageInfo(this.assets.reportBg),
					this.imageInfo(this.assets.reportTitle),
					this.imageInfo(this.assets.reportCard),
					this.imageInfo(this.assets.dimPlate)
				])
				const ctx = uni.createCanvasContext('nlldPoster', this)
				ctx.drawImage(bg.path, 0, 0, 750, 1334)
				const titleWidth = 560
				const titleHeight = titleWidth * title.height / title.width
				ctx.drawImage(title.path, (750 - titleWidth) / 2, 34, titleWidth, titleHeight)
				const cardWidth = 700
				const cardHeight = cardWidth * card.height / card.width
				const cardTop = 150
				ctx.drawImage(card.path, (750 - cardWidth) / 2, cardTop, cardWidth, cardHeight)

				const left = 80
				const contentWidth = 590
				let y = cardTop + 190
				if (this.result.resultType === 'top2') {
					for (let index = 0; index < this.tops.length; index++) {
						const dim = this.tops[index]
						const plateWidth = 150
						const plateHeight = plateWidth * plate.height / plate.width
						ctx.drawImage(plate.path, left, y, plateWidth, plateHeight)
						ctx.setFontSize(26)
						ctx.setFillStyle('#5a3a10')
						ctx.setTextAlign('center')
						ctx.fillText(dim.name || '', left + plateWidth / 2, y + plateHeight * 0.63)
						ctx.setTextAlign('left')
						y += plateHeight + 18
						y = this.drawParagraph(ctx, dim.summary, left, y + 22, contentWidth, 22, 32, '#33475c')
						y = this.drawParagraph(ctx, dim.careerReference, left, y + 10, contentWidth, 20, 28, '#5a6b7d')
						y += 30
					}
				} else {
					const plateWidth = 190
					const plateHeight = plateWidth * plate.height / plate.width
					ctx.drawImage(plate.path, left, y, plateWidth, plateHeight)
					ctx.setFontSize(26)
					ctx.setFillStyle('#5a3a10')
					ctx.setTextAlign('center')
					ctx.fillText('多元开放型', left + plateWidth / 2, y + plateHeight * 0.63)
					ctx.setTextAlign('left')
					y += plateHeight + 30
					this.drawParagraph(ctx, this.result.openText, left, y, contentWidth, 22, 34, '#33475c')
				}

				ctx.setFontSize(22)
				ctx.setFillStyle('rgba(255,255,255,0.92)')
				ctx.setTextAlign('center')
				ctx.fillText('能量雷达 · 我的职业能量雷达', 375, 1300)
				// draw 是异步渲染，必须等回调后再导出，否则拿到空画布。
				await new Promise((resolve, reject) => {
					try {
						ctx.draw(false, () => setTimeout(resolve, 120))
					} catch (e) {
						reject(e)
					}
				})
			},
			/** 导出画布；首次失败时等一帧重试，兼容部分基础库绘制延迟。 */
			exportPoster() {
				const exportOnce = () => new Promise((resolve, reject) => {
					uni.canvasToTempFilePath({
						canvasId: 'nlldPoster',
						x: 0,
						y: 0,
						width: 750,
						height: 1334,
						destWidth: 750,
						destHeight: 1334,
						fileType: 'jpg',
						quality: 0.92,
						success: resolve,
						fail: reject
					}, this)
				})
				return exportOnce().catch(() => new Promise(resolve => setTimeout(resolve, 300)).then(exportOnce))
			},
			/** 相册权限被明确拒绝时先引导去设置，避免反复保存失败。 */
			ensureAlbumAuth() {
				return new Promise((resolve, reject) => {
					uni.getSetting({
						success: res => {
							const setting = res.authSetting || {}
							if (setting['scope.writePhotosAlbum'] === false) {
								reject({ errMsg: 'saveImageToPhotosAlbum:fail auth deny' })
								return
							}
							resolve()
						},
						fail: () => resolve()
					})
				})
			},
			/** 隐私协议不支持直接写入相册时，改为预览图片让用户长按保存。 */
			previewPoster() {
				if (!this.posterTempPath) {
					uni.showToast({ title: '图片生成失败，请重新保存', icon: 'none' })
					return
				}
				uni.showModal({
					title: '保存截图',
					content: '当前小程序未声明相册写入权限，已为你打开图片预览，长按图片选择“保存图片”即可保存到相册。',
					showCancel: false,
					confirmText: '查看图片',
					success: () => {
						uni.previewImage({
							urls: [this.posterTempPath],
							current: this.posterTempPath,
							fail: () => uni.showToast({ title: '图片预览失败，请稍后重试', icon: 'none' })
						})
					}
				})
			},
			savePoster() {
				if (this.saving || !this.result || !this.result.resultType) return
				this.saving = true
				this.buttonPressed = false
				uni.showLoading({ title: '正在生成…', mask: true })
				this.ensureAlbumAuth()
					.then(() => this.drawPoster())
					.then(() => this.exportPoster())
					.then(res => {
						this.posterTempPath = res.tempFilePath
						return new Promise((resolve, reject) => {
							uni.saveImageToPhotosAlbum({
								filePath: res.tempFilePath,
								success: resolve,
								fail: reject
							})
						})
					})
					.then(() => {
						uni.hideLoading()
						uni.showToast({ title: '已保存到相册', icon: 'success' })
					})
					.catch(error => {
						uni.hideLoading()
						const message = (error && (error.errMsg || error.message)) || ''
						console.error('[nlld] 保存截图失败', message, error)
						if (/cancel/i.test(message)) {
							return
						}
						// 隐私协议未声明相册写入时，直接保存会被微信拒绝；改为预览后长按保存。
						if (/privacy agreement|api scope is not declared|errno.*112/i.test(message)) {
							this.previewPoster()
							return
						}
						if (/auth deny|authorize|permission|privacy/i.test(message)) {
							uni.showModal({
								title: '需要相册权限',
								content: '保存截图需要访问相册，请在设置中开启后重试。',
								confirmText: '去设置',
								success: res => {
									if (res.confirm) uni.openSetting()
								}
							})
							return
						}
						// 保留具体原因，便于现场判断是画布还是相册环节失败。
						uni.showToast({ title: '保存失败：' + message.replace(/^.*?fail:?/i, '').slice(0, 24), icon: 'none' })
					})
					.finally(() => {
						this.saving = false
					})
			}
		}
	}
</script>

<style scoped>
	.page {
		position: relative;
		width: 100%;
		height: 100vh;
		min-height: 1334rpx;
		overflow: hidden;
		background: #0f5c9a;
	}

	.page-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
	}

	.page-header {
		position: absolute;
		z-index: 3;
		left: 0;
		top: 0;
		width: 100%;
	}

	.report-title {
		position: absolute;
		z-index: 1;
		left: 8%;
		top: 5.4%;
		width: 84%;
	}

	.report-card {
		position: absolute;
		z-index: 1;
		left: 3.3%;
		top: 14%;
		width: 93.4%;
		height: 67%;
	}

	.card-scroll {
		position: absolute;
		z-index: 2;
		left: 11%;
		top: 21%;
		width: 78%;
		height: 55.5%;
		box-sizing: border-box;
	}

	.card-inner {
		min-height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		box-sizing: border-box;
	}

	.dim-block {
		margin-bottom: 24rpx;
	}

	.dim-head {
		position: relative;
		width: 210rpx;
		height: 96rpx;
		margin-bottom: 12rpx;
	}

	.open-head {
		width: 260rpx;
	}

	.dim-plate {
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 100%;
		height: 100%;
	}

	.dim-name {
		position: absolute;
		left: 0;
		top: 50%;
		width: 100%;
		transform: translateY(-50%);
		text-align: center;
		color: #5a3a10;
		font-size: 27rpx;
		font-weight: 600;
	}

	.dim-summary {
		display: block;
		color: #33475c;
		font-size: 24rpx;
		line-height: 1.7;
		text-align: justify;
		margin-bottom: 8rpx;
	}

	.dim-career {
		display: block;
		color: #5a6b7d;
		font-size: 22rpx;
		line-height: 1.65;
		text-align: justify;
	}

	.open-text {
		display: block;
		color: #33475c;
		font-size: 24rpx;
		line-height: 1.9;
		text-align: justify;
	}

	.save-wrap {
		position: absolute;
		z-index: 2;
		left: 28%;
		top: 85.5%;
		width: 44%;
		height: 6.2%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
	}

	.btn-text {
		position: relative;
		z-index: 1;
		color: #ffffff;
		font-size: 32rpx;
		letter-spacing: 2rpx;
		text-shadow: 0 2rpx 4rpx rgba(20, 60, 110, 0.45);
	}

	.save-wrap.disabled {
		opacity: 0.7;
	}

	.save-wrap.pressed {
		transform: scale(0.98);
	}

	.back-activity {
		position: absolute;
		z-index: 2;
		left: 0;
		top: 93.5%;
		width: 100%;
		text-align: center;
	}

	.back-text {
		color: rgba(255, 255, 255, 0.92);
		font-size: 26rpx;
		text-decoration: underline;
	}

	.poster-canvas {
		position: fixed;
		left: 0;
		top: 0;
		width: 750px;
		height: 1334px;
		opacity: 0.01;
		z-index: -1;
		pointer-events: none;
	}
</style>
