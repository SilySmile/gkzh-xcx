<template>
	<view class="page">
		<view class="stage">
			<image class="stage-bg" :src="assets.bgStart" mode="scaleToFill"></image>

			<ZytjHeader />

			<view v-if="hint" class="hint">
				<text class="hint-text">{{ hint }}</text>
			</view>

			<view class="start-btn" :class="{ pressed: pressing }" @touchstart="pressing = true"
				@touchend="pressing = false" @touchcancel="pressing = false" @click="start">
				<image class="btn-img" :src="assets.btnStart" mode="scaleToFill"></image>
			</view>
		</view>
	</view>
</template>

<script>
	import ZytjHeader from '@/components/ZytjHeader.vue'
	import assets from '@/config/zytj-assets.js'
	import { enterRecord, getRecord, startRecord, userMessage } from '@/api/zytj'

	/**
	 * 职愿探究第一页：开始探索。
	 * 扫码进入即创建参与记录；已生成探索卡的学生直接查看职业探索卡。
	 */
	export default {
		components: { ZytjHeader },
		data: () => ({
			assets,
			instanceId: '',
			gameId: '',
			recordId: '',
			record: {},
			loading: false,
			pressing: false,
			hint: ''
		}),
		async onLoad(options) {
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			this.recordId = options.recordId || ''
			if (!this.recordId && this.instanceId && this.gameId) {
				await this.ensureRecord()
			}
			if (this.recordId) {
				await this.refresh()
			}
		},
		methods: {
			async ensureRecord() {
				try {
					const entered = await enterRecord({
						instanceId: this.instanceId,
						gameId: this.gameId,
						gameType: 'zytj',
						schoolId: uni.getStorageSync('schoolId')
					})
					const data = (entered && entered.data) || {}
					this.recordId = data.recordId || ''
					if (!this.recordId) throw new Error('记录创建失败')
				} catch (e) {
					uni.showToast({ title: userMessage(e, '游戏入口校验失败，请重新扫码'), icon: 'none' })
				}
			},
			async refresh() {
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					this.record = res.data || {}
					const result = this.record.result || null
					if (this.record.status === 'finished' && result) {
						this.hint = '你的人格类型是 ' + (result.typeCode || '') + '，可查看职业探索卡'
					} else {
						this.hint = ''
					}
				} catch (e) {
					uni.showToast({ title: userMessage(e, '探究信息加载失败，请重新扫码'), icon: 'none' })
				}
			},
			async start() {
				if (this.loading) return
				if (!this.instanceId || !this.gameId) {
					uni.showToast({ title: '二维码缺少活动信息，请重新扫码', icon: 'none' })
					return
				}
				if (!this.recordId) {
					await this.ensureRecord()
					if (!this.recordId) return
				}
				this.loading = true
				const base = `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = res.data || {}
					const setting = data.setting || {}
					if (data.status === 'finished' && setting.allowReselect !== '1') {
						uni.redirectTo({ url: `/pages/zytj/result?${base}` })
						return
					}
					await startRecord(this.recordId)
					uni.redirectTo({ url: `/pages/zytj/index?${base}` })
				} catch (e) {
					uni.showToast({ title: userMessage(e, '开始探究失败，请稍后重试'), icon: 'none' })
				} finally {
					this.loading = false
				}
			}
		}
	}
</script>

<style scoped>
	.page {
		width: 100%;
		min-height: 100vh;
		background: #eaf3fb;
		overflow-x: hidden;
	}

	.stage {
		position: relative;
		width: 750rpx;
		height: 1623rpx;
		margin: 0 auto;
		overflow: hidden;
	}

	.stage-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 750rpx;
		height: 1623rpx;
	}

	.hint {
		position: absolute;
		left: 75rpx;
		right: 75rpx;
		top: 1370rpx;
		padding: 12rpx 20rpx;
		border-radius: 16rpx;
		background: rgba(255, 255, 255, 0.78);
	}

	.hint-text {
		display: block;
		text-align: center;
		font-size: 22rpx;
		line-height: 1.5;
		color: #3a4a7a;
	}

	.start-btn {
		position: absolute;
		left: 201rpx;
		top: 1457rpx;
		z-index: 20;
		width: 347rpx;
		height: 91rpx;
		transition: transform 0.12s ease;
	}

	.start-btn.pressed {
		transform: scale(0.97);
	}

	.btn-img {
		width: 347rpx;
		height: 91rpx;
	}
</style>
