<template>
	<view class="page">
		<view class="stage">
			<image class="stage-bg" :src="assets.bgResult" mode="scaleToFill"></image>

			<ZytjHeader />

			<!-- 人格类型卡 -->
			<view class="type-card">
				<image class="type-caption" :src="assets.captionType" mode="widthFix"></image>
				<view class="letters">
					<image v-for="(letter, index) in letters" :key="index" class="letter"
						:src="assets.letters[letter]" mode="aspectFit"></image>
				</view>
			</view>

			<!-- 三段解读 -->
			<view class="content-card">
				<view class="section">
					<image class="section-label" :src="assets.labelFeature" mode="widthFix"></image>
					<text class="section-text">{{ result.feature || '暂无性格特点' }}</text>
				</view>
				<view class="section">
					<image class="section-label" :src="assets.labelField" mode="widthFix"></image>
					<text class="section-text">{{ result.careerField || '暂无适合职业领域' }}</text>
				</view>
				<view class="section">
					<image class="section-label" :src="assets.labelCareer" mode="widthFix"></image>
					<text class="section-text">{{ result.typicalCareers || '暂无典型职业' }}</text>
				</view>
				<view v-if="result.isTimeout" class="timeout-tip">本局到点自动提交，未选满的列已按该列第一个物品补全。</view>
			</view>

			<!-- 保存职业探索卡 -->
			<view class="save-btn" :class="{ pressed: pressing }" @touchstart="pressing = true"
				@touchend="pressing = false" @touchcancel="pressing = false" @click="savePoster">
				<image class="save-img" :src="assets.btnSave" mode="scaleToFill"></image>
			</view>

			<view class="retry" v-if="allowReselect" @click="retry">重新探究</view>

			<canvas canvas-id="zytjPoster" class="poster-canvas"></canvas>
		</view>
	</view>
</template>

<script>
	import ZytjHeader from '@/components/ZytjHeader.vue'
	import assets from '@/config/zytj-assets.js'
	import { getRecord, userMessage } from '@/api/zytj'

	/**
	 * 职愿探究第三页：职业探索卡。
	 * 展示四位人格类型代码与性格特点/适合职业领域/典型职业，并支持保存为图片。
	 */
	export default {
		components: { ZytjHeader },
		data: () => ({
			assets,
			instanceId: '',
			gameId: '',
			recordId: '',
			record: {},
			result: {},
			saving: false,
			pressing: false,
			posterTempPath: ''
		}),
		computed: {
			letters() {
				const code = String(this.result.typeCode || '')
				return code.split('').filter(letter => !!letter)
			},
			allowReselect() {
				return this.result.allowReselect === true
			}
		},
		async onLoad(options) {
			this.instanceId = options.instanceId || ''
			this.gameId = options.gameId || ''
			this.recordId = options.recordId || ''
			if (!this.recordId) {
				uni.showToast({ title: '二维码缺少活动信息，请重新扫码', icon: 'none' })
				return
			}
			await this.load()
		},
		methods: {
			async load() {
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					this.record = res.data || {}
					this.result = this.record.result || {}
				} catch (e) {
					uni.showToast({ title: userMessage(e, '职业探索卡加载失败，请重试'), icon: 'none' })
				}
			},
			retry() {
				const base = `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
				uni.redirectTo({ url: `/pages/zytj/index?${base}` })
			},
			imageInfo(src) {
				return new Promise((resolve, reject) => {
					uni.getImageInfo({ src, success: resolve, fail: reject })
				})
			},
			/** 按画布宽度折行，返回末尾 y 坐标。 */
			drawParagraph(ctx, text, x, y, maxWidth, fontSize, lineHeight, color) {
				ctx.setFontSize(fontSize)
				ctx.setFillStyle(color)
				const chars = String(text || '').split('')
				const lines = []
				let line = ''
				for (const char of chars) {
					const next = line + char
					if (ctx.measureText(next).width > maxWidth && line) {
						lines.push(line)
						line = char
					} else {
						line = next
					}
				}
				if (line) lines.push(line)
				lines.forEach((item, index) => {
					ctx.fillText(item, x, y + index * lineHeight)
				})
				return y + lines.length * lineHeight
			},
			async drawPoster() {
				const [bg, caption, labelFeature, labelField, labelCareer] = await Promise.all([
					this.imageInfo(assets.bgResult),
					this.imageInfo(assets.captionType),
					this.imageInfo(assets.labelFeature),
					this.imageInfo(assets.labelField),
					this.imageInfo(assets.labelCareer)
				])
				const letterImages = await Promise.all(this.letters.map(letter => this.imageInfo(assets.letters[letter])))
				const ctx = uni.createCanvasContext('zytjPoster', this)
				ctx.drawImage(bg.path, 0, 0, 750, 1624)

				// 类型卡
				ctx.setFillStyle('#ffffff')
				ctx.fillRect(72, 360, 606, 300)
				ctx.setFillStyle('#7f8ff0')
				ctx.fillRect(72, 360, 606, 8)
				ctx.drawImage(caption.path, 195, 392, 360, 44)
				const letterWidth = 96
				const gap = 22
				const totalWidth = this.letters.length * letterWidth + (this.letters.length - 1) * gap
				let left = (750 - totalWidth) / 2
				for (let index = 0; index < letterImages.length; index++) {
					ctx.drawImage(letterImages[index].path, left, 460, letterWidth, 110)
					left += letterWidth + gap
				}

				// 解读卡
				ctx.setFillStyle('#ffffff')
				ctx.fillRect(55, 700, 640, 660)
				let y = 740
				const sections = [
					{ image: labelFeature, text: this.result.feature },
					{ image: labelField, text: this.result.careerField },
					{ image: labelCareer, text: this.result.typicalCareers }
				]
				for (const section of sections) {
					ctx.drawImage(section.image.path, 92, y, 260, 72)
					y = this.drawParagraph(ctx, section.text || '暂无内容', 92, y + 116, 566, 28, 44, '#2b3550')
					y += 46
				}

				ctx.setTextAlign('center')
				ctx.setFontSize(22)
				ctx.setFillStyle('rgba(255,255,255,0.92)')
				ctx.fillText('职愿探究 · 我的职业探索卡', 375, 1420)
				ctx.setTextAlign('left')

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
						canvasId: 'zytjPoster',
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
					content: '当前小程序未声明相册写入权限，已生成探索卡。点“查看图片”后长按图片选择“保存图片”即可保存到相册。',
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
				if (this.saving || !this.result.typeCode) return
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
						console.error('[zytj] 保存探索卡失败', message, error)
						if (/cancel/i.test(message)) return
						// 隐私协议未声明相册写入时，直接保存会被微信拒绝；改为预览后长按保存。
						if (/privacy agreement|api scope is not declared|errno.*112/i.test(message)) {
							this.previewPoster()
							return
						}
						if (/auth deny|authorize|permission|privacy/i.test(message)) {
							uni.showModal({
								title: '需要相册权限',
								content: '保存职业探索卡需要相册权限，请在设置中开启后重试。',
								confirmText: '去设置',
								success: res => {
									if (res.confirm) uni.openSetting()
								}
							})
							return
						}
						uni.showToast({ title: '保存失败，请稍后重试', icon: 'none' })
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
		background: #dfeafb;
		overflow-x: hidden;
	}

	.stage {
		position: relative;
		width: 750rpx;
		min-height: 1623rpx;
		margin: 0 auto;
		padding-bottom: 40rpx;
		box-sizing: border-box;
	}

	.stage-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 750rpx;
		height: 1623rpx;
	}

	.type-card {
		position: relative;
		z-index: 10;
		width: 606rpx;
		margin: 0 auto;
		padding: 30rpx 0 26rpx;
		box-sizing: border-box;
		border-top: 8rpx solid #7f8ff0;
		border-radius: 28rpx;
		background: #ffffff;
		box-shadow: 0 8rpx 22rpx rgba(90, 110, 180, 0.14);
		margin-top: calc(var(--status-bar-height) + 300rpx);
	}

	.type-caption {
		display: block;
		width: 360rpx;
		margin: 0 auto;
	}

	.letters {
		display: flex;
		justify-content: center;
		margin-top: 20rpx;
	}

	.letter {
		width: 96rpx;
		height: 110rpx;
		margin: 0 11rpx;
	}

	.content-card {
		position: relative;
		z-index: 10;
		width: 640rpx;
		margin: 34rpx auto 0;
		padding: 34rpx 30rpx 24rpx;
		box-sizing: border-box;
		border-radius: 28rpx;
		background: #ffffff;
		box-shadow: 0 8rpx 22rpx rgba(90, 110, 180, 0.12);
	}

	.section {
		margin-bottom: 26rpx;
	}

	.section-label {
		width: 260rpx;
	}

	.section-text {
		display: block;
		margin-top: 14rpx;
		font-size: 28rpx;
		line-height: 1.75;
		color: #2b3550;
	}

	.timeout-tip {
		margin-top: 6rpx;
		padding: 12rpx 16rpx;
		border-radius: 12rpx;
		background: #fff7e6;
		color: #b8860b;
		font-size: 22rpx;
		line-height: 1.6;
	}

	.save-btn {
		position: relative;
		z-index: 10;
		width: 520rpx;
		height: 120rpx;
		margin: 36rpx auto 0;
		transition: transform 0.12s ease;
	}

	.save-btn.pressed {
		transform: scale(0.97);
	}

	.save-img {
		width: 520rpx;
		height: 120rpx;
	}

	.retry {
		position: relative;
		z-index: 10;
		margin: 22rpx auto 0;
		width: 240rpx;
		text-align: center;
		font-size: 26rpx;
		color: #4a5b8c;
		text-decoration: underline;
	}

	.poster-canvas {
		position: fixed;
		left: -2000rpx;
		top: 0;
		width: 750px;
		height: 1624px;
	}
</style>
