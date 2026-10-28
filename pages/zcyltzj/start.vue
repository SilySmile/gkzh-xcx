<template>

  <view class="page">
    <image class="page-bg" :src="assets['page-bg']" mode="scaleToFill" />
    <view class="page-header"><zcyltzj-header theme="dark" @back="back" /></view>
    <image class="intro-logo" :src="assets.logo" mode="aspectFit" />
    <view class="intro-panel">
      <scroll-view scroll-y class="intro-scroll">
        <view class="intro-copy">
          <text class="intro-heading">欢迎来到压力探索小世界！</text>
          <text class="intro-paragraph">在这里，早八、DDL、期末考、毕业选择……各种压力场景等你解锁。掷出骰子，看看你会遇到哪一种压力挑战吧！</text>
          <text class="intro-heading">游戏玩法</text>
          <text class="intro-paragraph">①点击开始游戏
进入压力探索界面，准备开启你的挑战。</text>
          <text class="intro-paragraph">②掷出幸运骰子
点击骰子，随机触发一个数字，点亮对应的压力场景。</text>
          <text class="intro-paragraph">③解锁压力场景
点击被点亮的场景，进入对应的趣味问答，选择最符合自己真实想法的答案。</text>
          <text class="intro-paragraph">④完成问答挑战
根据自己的实际感受作答，探索自己面对不同压力时的反应。</text>
          <text class="intro-paragraph last">⑤查看探索结果
完成挑战后，查看属于自己的压力探索结果，发现自己的压力应对特点。</text>
        </view>
      </scroll-view>
    </view>
    <view class="intro-start" :class="{ disabled: loading, pressed: buttonPressed }" @touchstart="buttonPressed = true" @touchend="buttonPressed = false" @touchcancel="buttonPressed = false" @click="start">
      <image class="action-art" :src="assets['intro-button']" mode="scaleToFill" />
      <view v-if="loading" class="starting-label">正在进入…</view>
    </view>
  </view>
</template>

<script>
	import { enterRecord, getRecord, userMessage } from '@/api/zcyltzj'
	import ZcyltzjHeader from '@/components/ZcyltzjHeader.vue'
	import { ZCYLTZJ_ASSETS } from '@/config/zcyltzj-assets'

	export default {
		components: { ZcyltzjHeader },
		data: () => ({
			assets: ZCYLTZJ_ASSETS,
			instanceId: '',
			gameId: '',
			recordId: '',
			loading: false,
			buttonPressed: false,
			// 开始页展示骰子 5 点，仅作装饰。
			heroValue: 5
		}),
		async onLoad(options) {
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			this.recordId = options.recordId || ''
			if (!this.recordId && this.instanceId && this.gameId) {
				await this.ensureRecord()
			}
		},
		methods: {
			async ensureRecord() {
				try {
					const entered = await enterRecord({
						instanceId: this.instanceId,
						gameId: this.gameId,
						gameType: 'zcyltzj',
						schoolId: uni.getStorageSync('schoolId')
					})
					this.recordId = entered && entered.data && (entered.data.recordId || entered.data.id)
					if (!this.recordId) throw new Error('记录创建失败')
				} catch (e) {
					uni.showToast({ title: userMessage(e, '游戏入口校验失败，请重新扫码'), icon: 'none' })
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
					const current = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = current.data || {}
					if (data.status === 'finished') {
						uni.redirectTo({ url: `/pages/zcyltzj/result?${base}` })
						return
					}
					uni.navigateTo({ url: `/pages/zcyltzj/index?${base}` })
				} catch (e) {
					uni.showToast({ title: userMessage(e, '游戏启动失败，请稍后重试'), icon: 'none' })
				} finally {
					this.loading = false
					this.buttonPressed = false
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

.page { position: relative; height: 100vh; min-height: 1440rpx; width: 100%; background: #fff4d8; color: #8e541c; }
.page-bg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
.page-header { position: absolute; z-index: 3; left: 0; top: 0; width: 100%; }
.gold-action { position: absolute; z-index: 2; left: 5.2%; width: 91.5%; top: 89.5%; height: 6%; display: flex; align-items: center; justify-content: center; color: #8b4e14; font-size: 30rpx; font-weight: 600; }
.gold-action.disabled { opacity: .65; }
.action-art { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
.action-label { position: relative; z-index: 1; }
.load-message { position: absolute; z-index: 2; left: 10%; right: 10%; top: 82%; font-size: 24rpx; line-height: 1.5; text-align: center; }
.retry { margin-left: 16rpx; text-decoration: underline; }

.intro-logo { position: absolute; left: 1.8%; top: 14%; width: 96.4%; height: 17%; }
.intro-panel { position: absolute; left: 4.5%; top: 31.3%; width: 91%; height: 48.3%; padding: 26rpx; box-sizing: border-box; border: 2rpx solid rgba(255,255,255,.9); border-radius: 66rpx; background: linear-gradient(135deg,rgba(223,223,233,.78),rgba(255,244,218,.75)); box-shadow: inset 0 0 22rpx #fff9d9, 0 0 12rpx rgba(255,255,255,.9); }
.intro-scroll { height: 100%; width: 100%; overflow-y: auto; border: 2rpx solid #fff9d0; border-radius: 48rpx; box-sizing: border-box; }
.intro-copy { padding: 26rpx 32rpx; font-family: 'Songti SC','SimSun',serif; font-size: 23rpx; line-height: 1.3; }
.intro-heading { display: block; font-size: 24rpx; font-weight: 700; margin-bottom: 24rpx; }
.intro-paragraph { display: block; white-space: pre-wrap; margin-bottom: 24rpx; }
.intro-paragraph.last { margin-bottom: 0; }
.intro-start { position: absolute; left: 11%; top: 82.5%; width: 77%; height: 10%; }
.intro-start.pressed { transform: scale(.98); }
.intro-start.disabled { opacity: .8; }
.starting-label { position: absolute; left: 25%; right: 15%; top: 24%; bottom: 24%; display: flex; align-items: center; justify-content: center; color: #8b4e14; background: #ffe89c; font-size: 36rpx; }

</style>
