<template>

  <view class="page">
    <image class="page-bg" :src="assets['result-bg']" mode="scaleToFill" />
    <view class="page-header"><zcyltzj-header theme="dark" @back="backToActivity" /></view>
    <scroll-view scroll-y class="result-panel result-value">
      <view class="panel-inner">
        <view v-if="!loading && !loadError" class="result-copy">
          <text class="result-title">我的压力接受度</text>
          <text class="value-label">我的压力值是</text>
          <text class="value-number" :class="'color-' + resultColor">{{ pressureValue }}<text class="percent">%</text></text>
          <view class="pressure-bar"><view class="pressure-fill" :style="{ width: pressureValue + '%' }" /><view class="bar-marker" :style="{ left: pressureValue + '%' }" /></view>
          <view class="bar-scale"><text>0%</text><text>100%</text></view>
        </view>
        <text v-else class="result-message">{{ loading ? '结果加载中…' : loadError }}</text>
      </view>
    </scroll-view>
    <scroll-view v-if="!loading && !loadError" scroll-y class="result-panel result-details">
      <view class="panel-inner">
        <view class="detail-copy">
          <view class="scene-heading"><text class="scene-name">{{ record.pointName }}</text><text class="level-tag" :class="'color-' + resultColor">{{ levelText }}</text></view>
          <text v-if="record.theme" class="scene-description">压力主题：{{ record.theme }}</text>
          <text v-if="record.projection" class="scene-description">职场投射：{{ record.projection }}</text>
        </view>
      </view>
    </scroll-view>
    <view v-if="!loading && !loadError" class="result-panel result-counts"><text>红色答案 {{ result.redCount || 0 }}</text><text>绿色答案 {{ result.greenCount || 0 }}</text><text>共 {{ result.total || 0 }} 题</text></view>
    <view v-if="loadError && recordId" class="load-message"><text class="retry" @click="load">重新加载</text></view>
    <view class="gold-action" @click="backToActivity"><text class="action-label">{{ backing ? '正在返回…' : '返回活动' }}</text></view>
  </view>
</template>

<script>
	import { getRecord, userMessage } from '@/api/zcyltzj'
	import { getWeekFlow } from '@/api/activity/week'
	import ZcyltzjHeader from '@/components/ZcyltzjHeader.vue'
	import { ZCYLTZJ_ASSETS } from '@/config/zcyltzj-assets'

	export default {
		components: { ZcyltzjHeader },
		data: () => ({
			assets: ZCYLTZJ_ASSETS,
			recordId: '',
			instanceId: '',
			gameId: '',
			record: {},
			result: {},
			loading: true,
			loadError: '',
			backing: false
		}),
		computed: {
			pressureValue() {
				const value = Number(this.result.pressureValue || 0)
				return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0
			},
			resultColor() {
				if (this.result.color) return this.result.color
				if (this.pressureValue > 50) return 'red'
				if (this.pressureValue < 50) return 'green'
				return 'yellow'
			},
			levelText() {
				if (this.resultColor === 'red') return '红色区间'
				if (this.resultColor === 'yellow') return '临界区间'
				return '绿色区间'
			}
		},
		async onLoad(options) {
			this.recordId = options.recordId || ''
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			if (!this.recordId) {
				this.loading = false
				this.loadError = '缺少游戏记录，请重新扫码进入'
				uni.showToast({ title: '缺少游戏记录，请重新扫码进入', icon: 'none' })
				return
			}
			await this.load()
		},
		methods: {
			async load() {
				this.loading = true
				this.loadError = ''
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = res.data || {}
					if (data.status !== 'finished') {
						uni.showToast({ title: '本局尚未完成', icon: 'none' })
						const target = data.pointNo ? '/pages/zcyltzj/question' : '/pages/zcyltzj/index'
						setTimeout(() => uni.redirectTo({ url: `${target}?${this.query()}` }), 600)
						return
					}
					this.record = data
					this.result = data.result || {}
				} catch (e) {
					this.loadError = userMessage(e, '结果加载失败，请稍后重试')
					uni.showToast({ title: this.loadError, icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			query() {
				return `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
			},
			/** 返回到当前活动所属的“生涯活动”或“就业活动”页面。 */
			async backToActivity() {
				if (this.backing) return
				this.backing = true
				let bizType = this.record && this.record.bizType ? this.record.bizType : ''
				if (!bizType && this.instanceId) {
					try {
						const res = await getWeekFlow(this.instanceId)
						const instance = res && res.data && res.data.instance
						if (instance && instance.bizType) bizType = instance.bizType
					} catch (e) {
						// 读取失败时按生涯活动处理，保证仍能回到活动页。
					}
				}
				const target = bizType === 'job_week' ? 'job_week' : 'career_week'
				uni.reLaunch({ url: `/pages/mp/sub-pages/career-week/index?bizType=${target}` })
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

.result-panel { position: absolute; left: 9%; width: 82%; box-sizing: border-box; }
.result-value { top: 22.5%; height: 21.7%; overflow-y: auto; }
.result-details { top: 48.5%; height: 14.5%; overflow-y: auto; }
.panel-inner { min-height: 100%; display: flex; flex-direction: column; justify-content: center; }
.result-copy { flex-shrink: 0; width: 100%; padding: 12rpx 8rpx; box-sizing: border-box; text-align: center; }
.result-title { display: block; font-size: 30rpx; font-weight: 700; }
.scene-heading { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 12rpx; }
.scene-name { font-size: 25rpx; font-weight: 600; }
.value-label { display: block; margin-top: 10rpx; font-size: 23rpx; }
.value-number { display: block; font-family: Georgia,serif; font-size: 76rpx; line-height: 1.15; font-weight: 700; margin-top: 4rpx; }
.percent { font-size: 36rpx; margin-left: 4rpx; }
.pressure-bar { position: relative; height: 18rpx; border-radius: 24rpx; margin-top: 12rpx; background: rgba(255,255,255,.7); border: 2rpx solid rgba(255,255,255,.9); }
.pressure-fill { height: 100%; border-radius: 24rpx; background: linear-gradient(90deg,#72b984,#e5c35a,#d47a52); }
.bar-marker { position: absolute; top: -6rpx; bottom: -6rpx; width: 4rpx; background: #8d541d; transform: translateX(-50%); }
.bar-scale { display: flex; justify-content: space-between; margin-top: 6rpx; font-size: 20rpx; }
.level-tag { display: inline-block; padding: 4rpx 18rpx; font-size: 22rpx; border-radius: 24rpx; background: rgba(255,255,255,.5); }
.color-red { color: #aa4730; }.color-green { color: #487c47; }.color-yellow { color: #94651d; }
.detail-copy { flex-shrink: 0; width: 100%; box-sizing: border-box; padding: 12rpx 8rpx; }
.scene-description { display: block; text-align: left; margin-top: 12rpx; font-size: 22rpx; line-height: 1.5; }
.result-counts { top: 67%; height: 7%; display: flex; align-items: center; justify-content: space-around; gap: 12rpx; padding: 0 8rpx; font-size: 22rpx; }
.result-message { display: block; padding: 12rpx; text-align: center; font-size: 28rpx; line-height: 1.5; }

</style>
