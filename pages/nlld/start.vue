<template>
	<view class="page">
		<image class="page-bg" :src="assets.startBg" mode="scaleToFill" />
		<view class="page-header"><nlld-header theme="dark" @back="back" /></view>

		<image class="logo" :src="assets.logo" mode="widthFix" />
		<image class="slogan" :src="assets.slogan" mode="widthFix" />

		<view class="note">
			<image class="note-bg" :src="assets.notePanel" mode="scaleToFill" />
			<scroll-view scroll-y class="note-scroll">
				<text class="note-text">你来到了一座神秘的职业小岛。探索途中，你会遇到不同的任务，也会发现各种各样的物品。跟随自己的直觉，挑选最吸引你的物品，一步步发现什么能为你充电，什么又会消耗你的能量。准备好了吗？开启探索，绘制属于你的职业能量画像吧！</text>
			</scroll-view>
		</view>

		<view class="start-wrap" :class="{ disabled: loading, pressed: buttonPressed }"
			@touchstart="buttonPressed = true" @touchend="buttonPressed = false"
			@touchcancel="buttonPressed = false" @click="start">
			<image class="btn-bg" :src="assets.btnBlue" mode="scaleToFill" />
			<text class="btn-text">{{ loading ? '正在进入…' : '开始探险' }}</text>
		</view>
	</view>
</template>

<script>
	import { enterRecord, getRecord, userMessage } from '@/api/nlld'
	import NlldHeader from '@/components/NlldHeader.vue'
	import { NLLD_ASSETS } from '@/config/nlld-assets'

	export default {
		components: { NlldHeader },
		data: () => ({
			assets: NLLD_ASSETS,
			instanceId: '',
			gameId: '',
			recordId: '',
			loading: false,
			buttonPressed: false
		}),
		async onLoad(options) {
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			this.recordId = options.recordId || ''
			// 扫码直达时已在扫码处理函数中完成进入校验，这里只恢复已有进度。
			if (this.recordId) {
				await this.resume()
			}
		},
		methods: {
			async ensureRecord() {
				const entered = await enterRecord({
					instanceId: this.instanceId,
					gameId: this.gameId,
					gameType: 'nlld',
					schoolId: uni.getStorageSync('schoolId')
				})
				this.recordId = entered && entered.data && (entered.data.recordId || entered.data.id)
				if (!this.recordId) throw new Error('记录创建失败')
			},
			async resume() {
				try {
					const current = await getRecord(this.recordId, {
						instanceId: this.instanceId || undefined,
						gameId: this.gameId || undefined
					})
					this.routeByRecord(current.data || {})
				} catch (e) {
					uni.showToast({ title: userMessage(e, '测评进度加载失败，请重新扫码'), icon: 'none' })
				}
			},
			routeByRecord(data) {
				if (!this.recordId) return
				const base = `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
				if (data.status === 'finished') {
					uni.redirectTo({ url: `/pages/nlld/report?${base}` })
					return
				}
				if (Number(data.answeredRounds || 0) > 0) {
					uni.redirectTo({ url: `/pages/nlld/index?${base}` })
				}
			},
			async start() {
				if (this.loading) return
				if (!this.instanceId || !this.gameId) {
					uni.showToast({ title: '二维码缺少活动信息，请重新扫码', icon: 'none' })
					return
				}
				this.loading = true
				this.buttonPressed = false
				try {
					if (!this.recordId) {
						await this.ensureRecord()
					}
					const current = await getRecord(this.recordId, {
						instanceId: this.instanceId,
						gameId: this.gameId
					})
					const data = current.data || {}
					if (data.status === 'finished') {
						this.routeByRecord(data)
					} else {
						this.routeByRecord({ status: 'participating', answeredRounds: data.answeredRounds || 0 })
					}
				} catch (e) {
					uni.showToast({ title: userMessage(e, '游戏入口校验失败，请稍后重试'), icon: 'none' })
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
				uni.reLaunch({ url: '/pages/mp/home/index' })
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
		background: #dff1fb;
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

	.logo {
		position: absolute;
		z-index: 1;
		left: 9%;
		top: 7.5%;
		width: 82%;
	}

	.slogan {
		position: absolute;
		z-index: 1;
		left: 12%;
		top: 28%;
		width: 76%;
	}

	.note {
		position: absolute;
		z-index: 1;
		left: 6%;
		top: 34%;
		width: 88%;
		height: 40%;
	}

	.note-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
	}

	.note-scroll {
		position: absolute;
		left: 10%;
		right: 10%;
		top: 13%;
		bottom: 10%;
	}

	.note-text {
		display: block;
		color: #3b3226;
		font-size: 26rpx;
		line-height: 1.95;
		text-align: justify;
	}

	.start-wrap {
		position: absolute;
		z-index: 2;
		left: 28%;
		top: 80.5%;
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

	.start-wrap.pressed {
		transform: scale(0.98);
	}

	.start-wrap.disabled {
		opacity: 0.7;
	}
</style>
