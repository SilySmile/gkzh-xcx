<template>
	<view class="page">
		<view class="stage">
			<image class="stage-bg" :src="assets.bgResult" mode="scaleToFill"></image>

			<ZmwlHeader @back="back" />

			<image class="bubble" :src="assets.bubble" mode="widthFix"></image>

			<view class="card">
				<image class="card-bg" :src="assets.resultCard" mode="scaleToFill"></image>

				<view class="pill">
					<image class="pill-bg" :src="assets.pillBlue" mode="scaleToFill"></image>
					<text class="pill-text">未来发展方向</text>
				</view>

				<text class="direction-name">{{ result.directionName || '' }}</text>

				<view class="badge">
					<image class="badge-bg" :src="assets.pillYellow" mode="scaleToFill"></image>
					<image class="badge-icon" :src="assets.trophy" mode="heightFix"></image>
					<text class="badge-text">{{ result.tagName || '' }}</text>
				</view>

				<scroll-view class="card-scroll" scroll-y>
					<view class="section">
						<image class="section-icon" :src="assets.star" mode="heightFix"></image>
						<text class="section-title">方向解读</text>
					</view>
					<text class="paragraph">{{ result.interpretation || '暂无方向解读' }}</text>

					<view class="section">
						<image class="section-icon" :src="assets.heart" mode="heightFix"></image>
						<text class="section-title">寄语</text>
					</view>
					<text class="paragraph">{{ result.message || '暂无寄语' }}</text>
					<view class="scroll-space"></view>
				</scroll-view>
			</view>

			<view class="save-btn" :class="{ pressed: pressing }" @touchstart="pressing = true"
				@touchend="pressing = false" @touchcancel="pressing = false" @click="savePoster">
				<image class="save-bg" :src="assets.btnSave" mode="scaleToFill"></image>
				<text class="save-text">⤓ 保存截图</text>
			</view>
		</view>

		<canvas canvas-id="zmwlPoster" class="poster-canvas"></canvas>
	</view>
</template>

<script>
	import ZmwlHeader from '@/components/ZmwlHeader.vue'
	import assets from '@/config/zmwl-assets.js'
	import { getRecord, userMessage } from '@/api/zmwl'

	/**
	 * 职面未来第三页：个人未来选择卡。
	 * 展示方向、标签、方向解读与寄语；支持生成 750×1624 海报并保存到相册。
	 */
	export default {
		components: { ZmwlHeader },
		data: () => ({
			assets,
			instanceId: '',
			gameId: '',
			recordId: '',
			bizType: '',
			record: {},
			result: {},
			loading: false,
			saving: false,
			pressing: false,
			posterTempPath: ''
		}),
		async onLoad(options) {
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			this.recordId = options.recordId || ''
			if (!this.recordId) {
				uni.showToast({ title: '缺少参与记录，请重新扫码进入', icon: 'none' })
				return
			}
			await this.load()
		},
		methods: {
			async load() {
				this.loading = true
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = res.data || {}
					this.record = data
					this.bizType = data.bizType || ''
					if (data.status !== 'finished' || !data.result) {
						uni.redirectTo({
							url: `/pages/zmwl/index?recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
						})
						return
					}
					this.result = data.result || {}
				} catch (e) {
					uni.showToast({ title: userMessage(e, '选择卡加载失败，请稍后重试'), icon: 'none' })
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
			/** 中文按整字宽度换行，英文和数字按 0.55 字宽估算，与 nlld 报告保持一致。 */
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
				const [bg, bubble, card, pill, trophy, star, heart] = await Promise.all([
					this.imageInfo(assets.bgResult),
					this.imageInfo(assets.bubble),
					this.imageInfo(assets.resultCard),
					this.imageInfo(assets.pillBlue),
					this.imageInfo(assets.trophy),
					this.imageInfo(assets.star),
					this.imageInfo(assets.heart)
				])
				const ctx = uni.createCanvasContext('zmwlPoster', this)
				ctx.drawImage(bg.path, 0, 0, 750, 1624)
				ctx.drawImage(bubble.path, 65, 100, 620, 261)
				ctx.drawImage(card.path, 40, 455, 670, 920)
				ctx.drawImage(pill.path, 170, 462, 410, 86)

				ctx.setTextAlign('center')
				ctx.setFontSize(34)
				ctx.setFillStyle('#ffffff')
				ctx.fillText('未来发展方向', 375, 517)

				ctx.setFontSize(62)
				ctx.setFillStyle('#17376b')
				ctx.fillText(String(this.result.directionName || ''), 375, 655)

				if (this.result.tagName) {
					ctx.drawImage(trophy.path, 232, 700, 44, 58)
					ctx.setFontSize(30)
					ctx.setFillStyle('#7a4b10')
					ctx.fillText(String(this.result.tagName), 405, 740)
				}

				ctx.setTextAlign('left')
				ctx.drawImage(star.path, 95, 795, 44, 44)
				ctx.setFontSize(36)
				ctx.setFillStyle('#17376b')
				ctx.fillText('方向解读', 152, 830)
				let y = this.drawParagraph(ctx, this.result.interpretation || '暂无方向解读',
					92, 880, 566, 26, 47, '#2b3a55')

				ctx.drawImage(heart.path, 95, y + 40, 44, 40)
				ctx.setFontSize(36)
				ctx.setFillStyle('#17376b')
				ctx.fillText('寄语', 152, y + 72)
				this.drawParagraph(ctx, this.result.message || '暂无寄语', 92, y + 120, 566, 26, 47, '#2b3a55')

				ctx.setFontSize(20)
				ctx.setFillStyle('rgba(255,255,255,0.9)')
				ctx.setTextAlign('center')
				ctx.fillText('职面未来 · 我的未来，我来选择', 375, 1425)

				// draw 是异步渲染，必须等回调后再导出，否则拿到空画布。
				await new Promise((resolve, reject) => {
					try {
						ctx.draw(false, () => setTimeout(resolve, 120))
					} catch (e) {
						reject(e)
					}
				})
			},
			exportPoster() {
				const exportOnce = () => new Promise((resolve, reject) => {
					uni.canvasToTempFilePath({
						canvasId: 'zmwlPoster',
						x: 0,
						y: 0,
						width: 750,
						height: 1624,
						destWidth: 750,
						destHeight: 1624,
						fileType: 'jpg',
						quality: 0.92,
						success: resolve,
						fail: reject
					}, this)
				})
				return exportOnce().catch(() => new Promise(resolve => setTimeout(resolve, 300)).then(exportOnce))
			},
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
					content: '当前小程序未声明相册写入权限，已生成海报。点“查看图片”后长按图片选择“保存图片”即可保存到相册。',
					showCancel: true,
					cancelText: '取消',
					confirmText: '查看图片',
					success: res => {
						if (!res.confirm) return
						uni.previewImage({
							urls: [this.posterTempPath],
							current: this.posterTempPath,
							fail: () => uni.showToast({ title: '图片预览失败，请稍后重试', icon: 'none' })
						})
					}
				})
			},
			savePoster() {
				if (this.saving || !this.result || !this.result.directionName) return
				this.saving = true
				this.pressing = false
				uni.showLoading({ title: '正在生成…', mask: true })
				this.ensureAlbumAuth()
					.then(() => this.drawPoster())
					.then(() => this.exportPoster())
					.then(res => {
						this.posterTempPath = res.tempFilePath
						return new Promise((resolve, reject) => {
							uni.saveImageToPhotosAlbum({ filePath: res.tempFilePath, success: resolve, fail: reject })
						})
					})
					.then(() => {
						uni.hideLoading()
						uni.showToast({ title: '已保存到相册', icon: 'success' })
					})
					.catch(error => {
						uni.hideLoading()
						const message = (error && (error.errMsg || error.message)) || ''
						console.error('[zmwl] 保存截图失败', message, error)
						if (/cancel/i.test(message)) return
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
		width: 100%;
		min-height: 100vh;
		background: #58b4ee;
		overflow-x: hidden;
	}

	.stage {
		position: relative;
		width: 750rpx;
		height: 1624rpx;
		margin: 0 auto;
		overflow: hidden;
	}

	.stage-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 750rpx;
		height: 1624rpx;
	}

	.bubble {
		position: absolute;
		left: 65rpx;
		top: 100rpx;
		width: 620rpx;
	}

	.card {
		position: absolute;
		left: 40rpx;
		top: 455rpx;
		width: 670rpx;
		height: 920rpx;
	}

	.card-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 670rpx;
		height: 920rpx;
		border-radius: 30rpx;
	}

	.pill {
		position: absolute;
		left: 130rpx;
		top: 8rpx;
		width: 410rpx;
		height: 88rpx;
	}

	.pill-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 410rpx;
		height: 88rpx;
	}

	.pill-text {
		position: absolute;
		left: 0;
		top: 0;
		width: 410rpx;
		height: 88rpx;
		line-height: 88rpx;
		text-align: center;
		font-size: 34rpx;
		font-weight: 600;
		color: #ffffff;
		letter-spacing: 3rpx;
	}

	.direction-name {
		position: absolute;
		left: 0;
		top: 112rpx;
		width: 670rpx;
		text-align: center;
		font-size: 74rpx;
		font-weight: 700;
		line-height: 1.2;
		color: #17376b;
		letter-spacing: 4rpx;
	}

	.badge {
		position: absolute;
		left: 50%;
		top: 242rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 300rpx;
		height: 62rpx;
		margin-left: -150rpx;
	}

	.badge-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 300rpx;
		height: 62rpx;
	}

	.badge-icon {
		position: relative;
		z-index: 1;
		height: 44rpx;
		margin-right: 4rpx;
	}

	.badge-text {
		position: relative;
		z-index: 1;
		font-size: 29rpx;
		font-weight: 600;
		color: #6f4610;
	}

	.card-scroll {
		position: absolute;
		left: 45rpx;
		top: 330rpx;
		width: 580rpx;
		height: 560rpx;
	}

	.section {
		display: flex;
		align-items: center;
		margin-top: 14rpx;
		margin-bottom: 10rpx;
	}

	.section-icon {
		height: 44rpx;
		margin-right: 12rpx;
	}

	.section-title {
		font-size: 40rpx;
		font-weight: 700;
		color: #17376b;
		letter-spacing: 2rpx;
	}

	.paragraph {
		display: block;
		font-size: 27rpx;
		line-height: 1.85;
		color: #2b3a55;
		text-align: justify;
	}

	.scroll-space {
		height: 20rpx;
	}

	.save-btn {
		position: absolute;
		left: 158rpx;
		top: 1490rpx;
		z-index: 20;
		width: 434rpx;
		height: 90rpx;
		transition: transform 0.12s ease;
	}

	.save-btn.pressed {
		transform: scale(0.97);
	}

	.save-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 434rpx;
		height: 90rpx;
	}

	.save-text {
		position: absolute;
		left: 0;
		top: 0;
		width: 434rpx;
		height: 90rpx;
		line-height: 90rpx;
		text-align: center;
		font-size: 33rpx;
		font-weight: 600;
		color: #ffffff;
		letter-spacing: 3rpx;
	}

	.poster-canvas {
		position: fixed;
		left: -2000rpx;
		top: 0;
		width: 750px;
		height: 1624px;
	}
</style>
