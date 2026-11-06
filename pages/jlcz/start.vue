<template>
	<view class="page">
		<JlczHeader @back="back" />
		<scroll-view class="body" scroll-y>
			<view class="hero">
				<text class="hero-title">简历称重</text>
				<text class="hero-sub">20 个砝码，称一称你的简历分量</text>
			</view>

			<view class="balance">
				<view class="balance-side left">
					<text class="balance-num">80</text>
					<text class="balance-unit">g 标准</text>
				</view>
				<view class="balance-beam"></view>
				<view class="balance-side right">
					<text class="balance-num">?</text>
					<text class="balance-unit">你的简历</text>
				</view>
			</view>

			<view class="rule-card">
				<view class="rule-title">怎么玩</view>
				<view class="rule-line">1. 对照自己的简历，勾选已经具备的砝码。</view>
				<view class="rule-line">2. 点击“完成称重”，系统把砝码挂到天平右侧。</view>
				<view class="rule-line">3. 右侧总重达到左侧 80g 即通关；未通关可以重新称一次。</view>
			</view>

			<view class="cat-grid">
				<view v-for="item in categories" :key="item.code" class="cat-item">
					<text class="cat-name">{{ item.name }}</text>
					<text class="cat-desc">{{ item.desc }}</text>
				</view>
			</view>

			<view class="tip">共 20 个砝码、合计 125g，其中硬通货 5×10g，其余三类各 5×5g。</view>
		</scroll-view>

		<view class="footer">
			<view v-if="statusText" class="status">{{ statusText }}</view>
			<button class="start-btn" :disabled="loading" @click="start">
				{{ loading ? '正在进入…' : '开始称重' }}
			</button>
		</view>
	</view>
</template>

<script>
	import JlczHeader from '@/components/JlczHeader.vue'
	import { enterRecord, getRecord, startRecord, userMessage } from '@/api/jlcz'

	export default {
		components: { JlczHeader },
		data: () => ({
			instanceId: '',
			gameId: '',
			recordId: '',
			record: null,
			loading: false,
			statusText: '',
			categories: [
				{ code: 'core', name: '硬通货', desc: '核心竞争力 · 5×10g' },
				{ code: 'soft', name: '软实力', desc: '发展潜力 · 5×5g' },
				{ code: 'basic', name: '基本功', desc: '职业素养 · 5×5g' },
				{ code: 'bonus', name: '加分项', desc: '额外亮点 · 5×5g' }
			]
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
						gameType: 'jlcz',
						schoolId: uni.getStorageSync('schoolId')
					})
					const data = (entered && entered.data) || {}
					this.recordId = data.recordId || ''
					this.record = data
					if (!this.recordId) throw new Error('记录创建失败')
				} catch (e) {
					uni.showToast({ title: userMessage(e, '游戏入口校验失败，请重新扫码'), icon: 'none' })
				}
			},
			async refresh() {
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					this.record = res.data || {}
					if (this.record.status === 'finished') {
						this.statusText = this.record.result && this.record.result.pass
							? '本次称重已通关，可查看结果。'
							: '本次称重已完成，可查看结果或重新称一次。'
					} else {
						this.statusText = ''
					}
				} catch (e) {
					uni.showToast({ title: userMessage(e, '称重信息加载失败，请重新扫码'), icon: 'none' })
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
					if (data.status === 'finished') {
						uni.redirectTo({ url: `/pages/jlcz/result?${base}` })
						return
					}
					await startRecord(this.recordId)
					uni.redirectTo({ url: `/pages/jlcz/index?${base}` })
				} catch (e) {
					uni.showToast({ title: userMessage(e, '开始称重失败，请稍后重试'), icon: 'none' })
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
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: linear-gradient(180deg, #fdf6e8 0%, #f5e6c8 100%);
		overflow: hidden;
	}

	.body {
		flex: 1;
		height: 0;
		padding: 0 36rpx;
		box-sizing: border-box;
	}

	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 20rpx 0 26rpx;
	}

	.hero-title {
		font-size: 56rpx;
		font-weight: 700;
		color: #4a3315;
		letter-spacing: 6rpx;
	}

	.hero-sub {
		margin-top: 10rpx;
		font-size: 24rpx;
		color: #8a6b3f;
	}

	.balance {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 18rpx 26rpx;
		border-radius: 24rpx;
		background: rgba(255, 255, 255, 0.72);
		box-shadow: 0 10rpx 26rpx rgba(139, 94, 52, 0.12);
	}

	.balance-side {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 190rpx;
		padding: 14rpx 0;
		border-radius: 18rpx;
	}

	.balance-side.left {
		background: #f3ead8;
	}

	.balance-side.right {
		background: #eaf4e6;
	}

	.balance-num {
		font-size: 52rpx;
		font-weight: 700;
		color: #4a3315;
	}

	.balance-unit {
		margin-top: 2rpx;
		font-size: 22rpx;
		color: #8a6b3f;
	}

	.balance-beam {
		flex: 1;
		height: 6rpx;
		margin: 0 16rpx;
		border-radius: 6rpx;
		background: linear-gradient(90deg, #d9b46a, #b8862b, #d9b46a);
	}

	.rule-card {
		margin-top: 24rpx;
		padding: 24rpx 28rpx;
		border-radius: 22rpx;
		background: #fffdf8;
		border: 2rpx solid #eddfc2;
	}

	.rule-title {
		font-size: 28rpx;
		font-weight: 600;
		color: #4a3315;
	}

	.rule-line {
		margin-top: 12rpx;
		font-size: 24rpx;
		line-height: 1.7;
		color: #6b5533;
	}

	.cat-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		margin-top: 22rpx;
	}

	.cat-item {
		width: 48%;
		margin-bottom: 14rpx;
		padding: 18rpx 16rpx;
		border-radius: 18rpx;
		background: rgba(255, 255, 255, 0.68);
		box-sizing: border-box;
	}

	.cat-name {
		display: block;
		font-size: 26rpx;
		font-weight: 600;
		color: #4a3315;
	}

	.cat-desc {
		display: block;
		margin-top: 6rpx;
		font-size: 21rpx;
		color: #8a6b3f;
	}

	.tip {
		margin: 8rpx 0 40rpx;
		font-size: 21rpx;
		line-height: 1.7;
		color: #9a7d52;
	}

	.footer {
		flex-shrink: 0;
		padding: 16rpx 36rpx calc(24rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
		background: rgba(253, 246, 232, 0.96);
	}

	.status {
		margin-bottom: 12rpx;
		font-size: 23rpx;
		line-height: 1.6;
		color: #7a5a2c;
		text-align: center;
	}

	.start-btn {
		height: 92rpx;
		line-height: 92rpx;
		border-radius: 46rpx;
		border: none;
		font-size: 34rpx;
		font-weight: 600;
		color: #ffffff;
		background: linear-gradient(180deg, #d9a441 0%, #b8862b 100%);
		box-shadow: 0 10rpx 20rpx rgba(184, 134, 43, 0.28);
	}

	.start-btn::after {
		border: none;
	}

	.start-btn[disabled] {
		opacity: 0.7;
	}
</style>
