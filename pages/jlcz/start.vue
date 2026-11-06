<template>
	<view class="page">
		<view class="bg-circle one"></view>
		<view class="bg-circle two"></view>

		<JlczHeader title="简历称重" @back="back" />

		<scroll-view class="body" scroll-y>
			<view class="hero">
				<text class="eyebrow">简历分量自查</text>
				<text class="hero-title">称一称你的简历</text>
				<text class="hero-sub">20 个砝码 · 4 个维度 · {{ passWeight }}g 达标</text>
			</view>

			<view class="preview-card">
				<JlczScale
					:left-weight="leftWeight"
					:pass-weight="passWeight"
					:left-text="'标准砝码'"
					:right-text="'你的简历'"
					size="compact"
				/>
				<view class="preview-legend">
					<view class="legend-item">
						<text class="legend-dot left"></text>
						<text>左盘固定 {{ leftWeight }}g</text>
					</view>
					<view class="legend-item">
						<text class="legend-dot right"></text>
						<text>右盘为你勾选的重量</text>
					</view>
				</view>
			</view>

			<view class="card">
				<view class="card-head">
					<text class="card-title">怎么玩</text>
					<text class="card-tag">约 1 分钟</text>
				</view>
				<view v-for="(step, index) in steps" :key="index" class="step-row">
					<view class="step-no">{{ index + 1 }}</view>
					<view class="step-body">
						<text class="step-title">{{ step.title }}</text>
						<text class="step-desc">{{ step.desc }}</text>
					</view>
				</view>
			</view>

			<view class="section-head">
				<text class="section-title">四大类砝码</text>
				<text class="section-note">合计 125g</text>
			</view>
			<view class="cat-grid">
				<view v-for="item in categories" :key="item.code" class="cat-card">
					<view class="cat-top">
						<text class="cat-name">{{ item.name }}</text>
						<text class="cat-weight">{{ item.weight }}g</text>
					</view>
					<text class="cat-meta">{{ item.meta }}</text>
					<view class="cat-bar" :class="item.code"></view>
				</view>
			</view>

			<view class="note">
				对照自己的简历勾选已具备的砝码；右侧总重达到 {{ passWeight }}g 即通关，未通关可以重新称一次。
			</view>
			<view class="scroll-space"></view>
		</scroll-view>

		<view class="footer">
			<view v-if="statusText" class="status-tip">
				<text class="status-text">{{ statusText }}</text>
			</view>
			<button class="primary-btn" :disabled="loading" @click="start">
				{{ loading ? '正在进入…' : '开始称重' }}
			</button>
		</view>
	</view>
</template>

<script>
	import JlczHeader from '@/components/JlczHeader.vue'
	import JlczScale from '@/components/JlczScale.vue'
	import { enterRecord, getRecord, startRecord, userMessage } from '@/api/jlcz'

	export default {
		components: { JlczHeader, JlczScale },
		data: () => ({
			instanceId: '',
			gameId: '',
			recordId: '',
			record: null,
			loading: false,
			statusText: '',
			leftWeight: 80,
			passWeight: 80,
			steps: [
				{ title: '对照简历勾选', desc: '从四大类共 20 个砝码中，勾选自己已经具备的项。' },
				{ title: '挂上右侧托盘', desc: '系统把勾选的砝码挂到天平右侧，实时显示总重量。' },
				{ title: '达到 80g 通关', desc: '右侧达到左侧标准即通关；未通关可以重新称一次。' }
			],
			categories: [
				{ code: 'core', name: '硬通货', meta: '核心竞争力 · 5 项', weight: 50 },
				{ code: 'soft', name: '软实力', meta: '发展潜力 · 5 项', weight: 25 },
				{ code: 'basic', name: '基本功', meta: '职业素养 · 5 项', weight: 25 },
				{ code: 'bonus', name: '加分项', meta: '额外亮点 · 5 项', weight: 25 }
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
					const setting = this.record.setting || {}
					this.leftWeight = Number(setting.leftWeightG) || 80
					this.passWeight = Number(setting.passWeightG) || 80
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
		position: relative;
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: linear-gradient(180deg, #f7f1e6 0%, #efe2ce 100%);
		overflow: hidden;
	}

	.bg-circle {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
	}

	.bg-circle.one {
		top: -160rpx;
		right: -120rpx;
		width: 460rpx;
		height: 460rpx;
		background: rgba(217, 178, 107, 0.16);
	}

	.bg-circle.two {
		bottom: 120rpx;
		left: -180rpx;
		width: 420rpx;
		height: 420rpx;
		background: rgba(255, 255, 255, 0.42);
	}

	.body {
		position: relative;
		z-index: 1;
		flex: 1;
		height: 0;
		padding: 0 32rpx;
		box-sizing: border-box;
	}

	.hero {
		padding: 12rpx 4rpx 22rpx;
	}

	.eyebrow {
		display: block;
		font-size: 21rpx;
		letter-spacing: 4rpx;
		color: #a3814f;
	}

	.hero-title {
		display: block;
		margin-top: 8rpx;
		font-size: 52rpx;
		line-height: 1.25;
		font-weight: 700;
		color: #2f2a22;
		letter-spacing: 2rpx;
	}

	.hero-sub {
		display: block;
		margin-top: 10rpx;
		font-size: 23rpx;
		color: #8b7c66;
	}

	.preview-card {
		padding: 16rpx 12rpx 14rpx;
		border-radius: 26rpx;
		border: 2rpx solid rgba(217, 196, 160, 0.7);
		background: rgba(255, 253, 247, 0.86);
		box-shadow: 0 12rpx 28rpx rgba(120, 84, 34, 0.08);
	}

	.preview-legend {
		display: flex;
		justify-content: center;
		margin-top: 2rpx;
	}

	.legend-item {
		display: flex;
		align-items: center;
		margin: 0 18rpx;
		font-size: 20rpx;
		color: #8b7c66;
	}

	.legend-dot {
		width: 14rpx;
		height: 14rpx;
		margin-right: 8rpx;
		border-radius: 50%;
	}

	.legend-dot.left {
		background: #d9b26b;
	}

	.legend-dot.right {
		background: #8fa9a0;
	}

	.card {
		margin-top: 22rpx;
		padding: 24rpx 26rpx 10rpx;
		border-radius: 24rpx;
		background: rgba(255, 253, 247, 0.9);
		border: 2rpx solid rgba(217, 196, 160, 0.55);
	}

	.card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8rpx;
	}

	.card-title {
		font-size: 29rpx;
		font-weight: 600;
		color: #2f2a22;
	}

	.card-tag {
		padding: 4rpx 14rpx;
		border-radius: 20rpx;
		font-size: 19rpx;
		color: #9a7c45;
		background: #f5ead6;
	}

	.step-row {
		display: flex;
		align-items: flex-start;
		padding: 14rpx 0;
	}

	.step-no {
		flex-shrink: 0;
		width: 38rpx;
		height: 38rpx;
		margin-right: 16rpx;
		border-radius: 50%;
		line-height: 38rpx;
		text-align: center;
		font-size: 21rpx;
		font-weight: 600;
		color: #8a6122;
		background: #f3e5c8;
	}

	.step-body {
		flex: 1;
		min-width: 0;
	}

	.step-title {
		display: block;
		font-size: 25rpx;
		font-weight: 600;
		color: #3b3327;
	}

	.step-desc {
		display: block;
		margin-top: 4rpx;
		font-size: 21rpx;
		line-height: 1.6;
		color: #8b7c66;
	}

	.section-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin: 26rpx 6rpx 14rpx;
	}

	.section-title {
		font-size: 29rpx;
		font-weight: 600;
		color: #2f2a22;
	}

	.section-note {
		font-size: 21rpx;
		color: #9a8a70;
	}

	.cat-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
	}

	.cat-card {
		position: relative;
		width: 48.5%;
		margin-bottom: 16rpx;
		padding: 20rpx 20rpx 24rpx;
		border-radius: 20rpx;
		background: rgba(255, 253, 247, 0.9);
		border: 2rpx solid rgba(217, 196, 160, 0.5);
		box-sizing: border-box;
		overflow: hidden;
	}

	.cat-top {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.cat-name {
		font-size: 26rpx;
		font-weight: 600;
		color: #2f2a22;
	}

	.cat-weight {
		font-size: 22rpx;
		font-weight: 600;
		color: #a3814f;
	}

	.cat-meta {
		display: block;
		margin-top: 6rpx;
		font-size: 19rpx;
		color: #9a8a70;
	}

	.cat-bar {
		position: absolute;
		left: 0;
		bottom: 0;
		width: 100%;
		height: 6rpx;
	}

	.cat-bar.core {
		background: #b98a3c;
	}

	.cat-bar.soft {
		background: #7f9f93;
	}

	.cat-bar.basic {
		background: #8d8aa6;
	}

	.cat-bar.bonus {
		background: #c08a72;
	}

	.note {
		margin: 10rpx 6rpx 0;
		font-size: 20rpx;
		line-height: 1.7;
		color: #9a8a70;
	}

	.scroll-space {
		height: 36rpx;
	}

	.footer {
		position: relative;
		z-index: 2;
		flex-shrink: 0;
		padding: 14rpx 32rpx 20rpx;
		padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
		background: rgba(247, 241, 230, 0.96);
	}

	.status-tip {
		margin-bottom: 12rpx;
		padding: 10rpx 16rpx;
		border-radius: 14rpx;
		background: rgba(217, 178, 107, 0.16);
	}

	.status-text {
		font-size: 21rpx;
		line-height: 1.5;
		color: #7c6437;
	}

	.primary-btn {
		display: block;
		width: 100%;
		height: 96rpx;
		line-height: 96rpx;
		border: none;
		border-radius: 48rpx;
		font-size: 33rpx;
		font-weight: 600;
		letter-spacing: 2rpx;
		color: #fffdf7;
		background: linear-gradient(135deg, #c99a4a 0%, #a3742a 100%);
		box-shadow: 0 12rpx 24rpx rgba(150, 108, 45, 0.28);
	}

	.primary-btn::after {
		border: none;
	}

	.primary-btn[disabled] {
		opacity: 0.72;
	}
</style>
