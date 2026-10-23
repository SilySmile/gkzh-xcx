<template>
	<view class="page">
		<view class="top-bar" :style="{ paddingTop: 'var(--status-bar-height)' }">
			<view class="back" @click="back">‹</view>
			<text class="top-title">职场压力·骰子局</text>
			<view class="back-placeholder"></view>
		</view>

		<scroll-view scroll-y class="content">
			<view class="hero">
				<text class="hero-tag">职场压力测试</text>
				<text class="title">掷一枚骰子</text>
				<text class="title title-small">看看你的职场压力落在哪一格</text>

				<view class="dice-hero">
					<view class="dice-face">
						<view
							v-for="n in 9"
							:key="n"
							class="pip"
							:class="{ on: pipOn(n) }"
						></view>
					</view>
					<view class="dice-shadow"></view>
				</view>
			</view>

			<view class="rules-card">
				<view class="rule-item">
					<text class="rule-index">1</text>
					<text class="rule-text">掷出骰子，选中九宫格中对应点数的职场压力场景</text>
				</view>
				<view class="rule-item">
					<text class="rule-index">2</text>
					<text class="rule-text">完成该场景的 6 道选择题，题目没有对错</text>
				</view>
				<view class="rule-item">
					<text class="rule-index">3</text>
					<text class="rule-text">生成你的压力接受度进度条和压力值</text>
				</view>
			</view>

			<view class="start-wrap">
				<view
					class="start-button"
					:class="{ pressed: buttonPressed, disabled: loading }"
					@touchstart="buttonPressed = true"
					@touchend="buttonPressed = false"
					@touchcancel="buttonPressed = false"
					@click="start"
				>
					{{ loading ? '正在进入…' : '开始游戏' }}
				</view>
				<text class="start-tip">完成答题后可查看本次压力结果</text>
			</view>
		</scroll-view>
	</view>
</template>

<script>
	import { enterRecord, getRecord, userMessage } from '@/api/zcyltzj'

	export default {
		data: () => ({
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
			// 骰子点数对应的点位：1/2/3/4/5/6 使用九宫格中的固定位置。
			pipOn(position) {
				const map = {
					1: [5],
					2: [1, 9],
					3: [1, 5, 9],
					4: [1, 3, 7, 9],
					5: [1, 3, 5, 7, 9],
					6: [1, 3, 4, 6, 7, 9]
				}
				return (map[this.heroValue] || []).indexOf(position) > -1
			},
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
	.page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: linear-gradient(160deg, #171a34 0%, #241a45 48%, #3a2258 100%);
	}

	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-left: 24rpx;
		padding-right: 24rpx;
		padding-bottom: 16rpx;
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
		letter-spacing: 4rpx;
		color: rgba(255, 255, 255, 0.9);
	}

	.content {
		flex: 1;
		padding: 0 48rpx 48rpx;
		box-sizing: border-box;
	}

	.hero {
		padding-top: 40rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.hero-tag {
		padding: 8rpx 22rpx;
		border-radius: 999rpx;
		background: rgba(255, 209, 102, 0.16);
		color: #ffd166;
		font-size: 22rpx;
		letter-spacing: 6rpx;
	}

	.title {
		margin-top: 26rpx;
		font-size: 52rpx;
		font-weight: 700;
		color: #ffffff;
		letter-spacing: 2rpx;
	}

	.title-small {
		margin-top: 12rpx;
		font-size: 30rpx;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.72);
	}

	.dice-hero {
		position: relative;
		margin-top: 64rpx;
		width: 240rpx;
		height: 260rpx;
	}

	.dice-face {
		position: relative;
		z-index: 2;
		width: 220rpx;
		height: 220rpx;
		margin: 0 auto;
		padding: 22rpx;
		box-sizing: border-box;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: repeat(3, 1fr);
		border-radius: 44rpx;
		background: linear-gradient(155deg, #ffffff 0%, #e9e4f7 100%);
		box-shadow: 0 22rpx 48rpx rgba(0, 0, 0, 0.38), inset 0 -8rpx 18rpx rgba(90, 70, 160, 0.16);
		transform: rotate(-8deg);
	}

	.pip {
		width: 30rpx;
		height: 30rpx;
		align-self: center;
		justify-self: center;
		border-radius: 50%;
		background: transparent;
	}

	.pip.on {
		background: #2b2150;
		box-shadow: inset 0 4rpx 6rpx rgba(0, 0, 0, 0.35);
	}

	.dice-shadow {
		position: absolute;
		left: 50%;
		bottom: 0;
		transform: translateX(-50%);
		width: 190rpx;
		height: 36rpx;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.35);
		filter: blur(10rpx);
	}

	.rules-card {
		margin-top: 72rpx;
		padding: 28rpx 30rpx;
		border-radius: 28rpx;
		background: rgba(255, 255, 255, 0.06);
		border: 1rpx solid rgba(255, 255, 255, 0.08);
	}

	.rule-item {
		display: flex;
		align-items: flex-start;
		padding: 14rpx 0;
	}

	.rule-index {
		width: 40rpx;
		height: 40rpx;
		line-height: 40rpx;
		margin-right: 18rpx;
		border-radius: 50%;
		text-align: center;
		font-size: 22rpx;
		color: #241a45;
		background: #ffd166;
	}

	.rule-text {
		flex: 1;
		font-size: 26rpx;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.82);
	}

	.start-wrap {
		margin-top: 64rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-bottom: 40rpx;
	}

	.start-button {
		width: 100%;
		height: 104rpx;
		line-height: 104rpx;
		text-align: center;
		border-radius: 999rpx;
		font-size: 34rpx;
		font-weight: 600;
		letter-spacing: 8rpx;
		color: #2a1d12;
		background: linear-gradient(135deg, #ffe08a 0%, #ffc23d 100%);
		box-shadow: 0 18rpx 36rpx rgba(255, 190, 61, 0.28);
		transition: transform 0.12s ease;
	}

	.start-button.pressed {
		transform: scale(0.98);
	}

	.start-button.disabled {
		opacity: 0.7;
	}

	.start-tip {
		margin-top: 18rpx;
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.55);
	}
</style>
