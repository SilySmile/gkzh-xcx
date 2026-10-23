<template>
	<view class="page">
		<zcyltzj-header title="压力结果" @back="backToActivity" />

		<scroll-view scroll-y class="scroll">
			<view class="hero">
				<text class="hero-title">我的压力接受度</text>
				<view class="bar">
					<view class="bar-gradient"></view>
					<view
						class="bar-mask"
						:style="{ width: Math.max(0, 100 - pressureValue) + '%' }"
					></view>
					<view class="bar-marker" :style="{ left: pressureValue + '%' }"></view>
				</view>
				<view class="bar-scale">
					<text class="scale-text">0%</text>
					<text class="scale-text">100%</text>
				</view>

				<view class="value-block">
					<text class="value-label">我的压力值是</text>
					<text class="value-number" :class="'color-' + resultColor">{{ pressureValue }}%</text>
				</view>
				<view class="level-tag" :class="'level-' + resultColor">{{ levelText }}</view>
			</view>

			<view class="scene-card">
				<view class="scene-head">
					<text class="scene-badge">{{ record.pointNo }}</text>
					<text class="scene-name">{{ record.pointName }}</text>
				</view>
				<view v-if="record.theme" class="scene-row">
					<text class="scene-label">压力主题</text>
					<text class="scene-value">{{ record.theme }}</text>
				</view>
				<view v-if="record.projection" class="scene-row">
					<text class="scene-label">职场投射</text>
					<text class="scene-value">{{ record.projection }}</text>
				</view>
			</view>

			<view class="count-card">
				<view class="count-item">
					<text class="count-number">{{ result.redCount || 0 }}</text>
					<text class="count-label">红色答案</text>
				</view>
				<view class="count-divider"></view>
				<view class="count-item">
					<text class="count-number">{{ result.greenCount || 0 }}</text>
					<text class="count-label">绿色答案</text>
				</view>
				<view class="count-divider"></view>
				<view class="count-item">
					<text class="count-number">{{ result.total || 0 }}</text>
					<text class="count-label">题目总数</text>
				</view>
			</view>

<!-- 			<view class="note">
				<text class="note-title">说明</text>
				<text class="note-text">本结果根据 A、B 选项计入红色、C、D 选项计入绿色的规则计算，红色答案占比即压力值。结果仅用于自我探索参考。</text>
			</view> -->

			<view class="scroll-bottom"></view>
		</scroll-view>

		<view class="footer">
			<view class="back-button" @click="backToActivity">返回活动</view>
		</view>
	</view>
</template>

<script>
	import { getRecord, userMessage } from '@/api/zcyltzj'
	import { getWeekFlow } from '@/api/activity/week'
	import ZcyltzjHeader from '@/components/ZcyltzjHeader.vue'

	export default {
		components: { ZcyltzjHeader },
		data: () => ({
			recordId: '',
			instanceId: '',
			gameId: '',
			record: {},
			result: {},
			loading: true,
			backing: false
		}),
		computed: {
			pressureValue() {
				return Number(this.result.pressureValue || 0)
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
				uni.showToast({ title: '缺少游戏记录，请重新扫码进入', icon: 'none' })
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
					if (data.status !== 'finished') {
						uni.showToast({ title: '本局尚未完成', icon: 'none' })
						const target = data.pointNo ? '/pages/zcyltzj/question' : '/pages/zcyltzj/index'
						setTimeout(() => uni.redirectTo({ url: `${target}?${this.query()}` }), 600)
						return
					}
					this.record = data
					this.result = data.result || {}
				} catch (e) {
					uni.showToast({ title: userMessage(e, '结果加载失败，请稍后重试'), icon: 'none' })
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
	.page {
		height: 100vh;
		display: flex;
		flex-direction: column;
		background: linear-gradient(170deg, #171a34 0%, #251c46 60%, #35215a 100%);
	}

	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-left: 24rpx;
		padding-right: 24rpx;
		padding-bottom: 12rpx;
		color: #ffffff;
	}

	.back,
	.back-placeholder {
		width: 72rpx;
		height: 72rpx;
		line-height: 64rpx;
		font-size: 56rpx;
		text-align: center;
	}

	.top-title {
		font-size: 30rpx;
		letter-spacing: 2rpx;
		color: rgba(255, 255, 255, 0.9);
	}

	.scroll {
		flex: 1;
		padding: 0 36rpx;
		box-sizing: border-box;
	}

	.hero {
		margin-top: 26rpx;
		padding: 36rpx 32rpx 32rpx;
		border-radius: 32rpx;
		background: rgba(255, 255, 255, 0.06);
		border: 1rpx solid rgba(255, 255, 255, 0.08);
		display: flex;
		flex-direction: column;
	}

	.hero-title {
		font-size: 34rpx;
		font-weight: 700;
		color: #ffffff;
		text-align: center;
		letter-spacing: 2rpx;
	}

	.bar {
		position: relative;
		margin-top: 44rpx;
		height: 28rpx;
		border-radius: 999rpx;
		overflow: visible;
	}

	.bar-gradient {
		position: absolute;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		border-radius: 999rpx;
		background: linear-gradient(90deg, #4cd964 0%, #ffd166 50%, #ff3b30 100%);
	}

	.bar-mask {
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		border-radius: 0 999rpx 999rpx 0;
		background: rgba(23, 26, 52, 0.72);
	}

	.bar-marker {
		position: absolute;
		top: 50%;
		width: 34rpx;
		height: 34rpx;
		margin-left: -17rpx;
		border-radius: 50%;
		background: #ffffff;
		border: 6rpx solid rgba(255, 255, 255, 0.55);
		box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.35);
		transform: translateY(-50%);
		transition: left 0.6s ease;
		box-sizing: border-box;
	}

	.bar-scale {
		display: flex;
		justify-content: space-between;
		margin-top: 16rpx;
	}

	.scale-text {
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.4);
	}

	.value-block {
		margin-top: 30rpx;
		display: flex;
		align-items: baseline;
		justify-content: center;
	}

	.value-label {
		font-size: 28rpx;
		color: rgba(255, 255, 255, 0.72);
	}

	.value-number {
		margin-left: 14rpx;
		font-size: 64rpx;
		font-weight: 700;
		line-height: 1;
	}

	.color-red {
		color: #ff5b52;
	}

	.color-green {
		color: #4cd964;
	}

	.color-yellow {
		color: #ffd166;
	}

	.level-tag {
		align-self: center;
		margin-top: 20rpx;
		padding: 8rpx 24rpx;
		border-radius: 999rpx;
		font-size: 22rpx;
		letter-spacing: 2rpx;
	}

	.level-red {
		color: #ff8a84;
		background: rgba(255, 59, 48, 0.16);
		border: 1rpx solid rgba(255, 59, 48, 0.35);
	}

	.level-green {
		color: #7ee89a;
		background: rgba(76, 217, 100, 0.14);
		border: 1rpx solid rgba(76, 217, 100, 0.3);
	}

	.level-yellow {
		color: #ffd166;
		background: rgba(255, 209, 102, 0.14);
		border: 1rpx solid rgba(255, 209, 102, 0.32);
	}

	.scene-card {
		margin-top: 24rpx;
		padding: 28rpx 30rpx;
		border-radius: 28rpx;
		background: rgba(255, 255, 255, 0.06);
		border: 1rpx solid rgba(255, 255, 255, 0.08);
	}

	.scene-head {
		display: flex;
		align-items: center;
		margin-bottom: 18rpx;
	}

	.scene-badge {
		width: 48rpx;
		height: 48rpx;
		line-height: 48rpx;
		margin-right: 16rpx;
		border-radius: 12rpx;
		text-align: center;
		font-weight: 700;
		color: #2b2150;
		background: #ffd166;
	}

	.scene-name {
		font-size: 32rpx;
		font-weight: 600;
		color: #ffffff;
	}

	.scene-row {
		display: flex;
		align-items: flex-start;
		padding: 10rpx 0;
	}

	.scene-label {
		width: 140rpx;
		flex-shrink: 0;
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.45);
	}

	.scene-value {
		flex: 1;
		font-size: 24rpx;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.82);
	}

	.count-card {
		margin-top: 24rpx;
		padding: 24rpx 0;
		border-radius: 28rpx;
		background: rgba(255, 255, 255, 0.06);
		border: 1rpx solid rgba(255, 255, 255, 0.08);
		display: flex;
		align-items: center;
	}

	.count-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.count-number {
		font-size: 40rpx;
		font-weight: 700;
		color: #ffffff;
	}

	.count-label {
		margin-top: 8rpx;
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.45);
	}

	.count-divider {
		width: 1rpx;
		height: 56rpx;
		background: rgba(255, 255, 255, 0.12);
	}

	.note {
		margin-top: 24rpx;
		padding: 24rpx 28rpx;
		border-radius: 24rpx;
		background: rgba(255, 255, 255, 0.04);
	}

	.note-title {
		font-size: 24rpx;
		color: #ffd166;
	}

	.note-text {
		display: block;
		margin-top: 10rpx;
		font-size: 22rpx;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.5);
	}

	.scroll-bottom {
		height: 60rpx;
	}

	.footer {
		padding: 18rpx 36rpx calc(24rpx + env(safe-area-inset-bottom));
	}

	.back-button {
		height: 92rpx;
		line-height: 92rpx;
		text-align: center;
		border-radius: 999rpx;
		font-size: 30rpx;
		letter-spacing: 4rpx;
		color: rgba(255, 255, 255, 0.85);
		background: rgba(255, 255, 255, 0.08);
		border: 1rpx solid rgba(255, 255, 255, 0.14);
	}
</style>
