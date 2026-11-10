<template>
	<view class="page">
		<image class="stage-bg" :src="assets.report" mode="scaleToFill"></image>

		<!-- 正确排序：设计稿底部四个浅黄方块，这里按岗位四维顺序填正确答案编号 -->
		<view v-for="(slot, index) in result.slots || []" :key="slot.slotCode" class="answer-slot"
			:style="slotStyle(index)">
			<text class="answer-no">{{ slot.correctCardNo || '-' }}</text>
		</view>

		<!-- 职业解说白卡：设计稿留有整块白卡，这里放可滚动的解析内容 -->
		<view class="card">
			<scroll-view class="card-scroll" scroll-y>
				<view class="card-inner">
					<view class="card-head">
						<text class="career-name">{{ (result.career && result.career.careerName) || '职业拼图' }}</text>
						<text class="result-tag" :class="passed ? 'tag-pass' : 'tag-fail'">{{ resultTag }}</text>
					</view>
					<view class="metric-line">
						用时 {{ durationText }}　放对 {{ result.correctCount || 0 }}/4　放错 {{ result.wrongCount || 0 }}　第 {{ result.attemptNo || 1 }} 次
					</view>

					<view class="block">
						<text class="block-label">岗位定义</text>
						<text class="block-text">{{ detail.intro || '暂无岗位定义' }}</text>
					</view>
					<view class="block">
						<text class="block-label">行业价值</text>
						<text class="block-text">{{ detail.industryValue || '暂无行业价值说明' }}</text>
					</view>
					<view class="block">
						<text class="block-label">新生入门建议</text>
						<text class="block-text">{{ detail.newcomerAdvice || '暂无入门建议' }}</text>
					</view>

					<view v-if="passed && result.behaviorName" class="block">
						<text class="block-label">职业认知分型：{{ result.behaviorName }}</text>
						<text class="block-text">{{ result.conclusion }}</text>
						<text class="block-label">提升建议</text>
						<text class="block-text">{{ result.suggestion }}</text>
					</view>
				</view>
			</scroll-view>
		</view>

		<!-- 失败时可再来一次；两个按钮并排，风格与设计稿底部按钮一致 -->
		<view v-if="!passed" class="btn btn-half-left" @click="retry">再试一次</view>
		<view class="btn" :class="passed ? 'btn-full' : 'btn-half-right'" @click="backToActivity">返回活动</view>

		<ZdypHeader title="职业拼图结果" @back="back" />
	</view>
</template>

<script>
	import ZdypHeader from '@/components/ZdypHeader.vue'
	import assets from '@/config/zdyp-assets.js'
	import { getRecord, userMessage } from '@/api/zdyp'

	/**
	 * 职得一拼解析页：按设计稿 5.6 还原整页结构。
	 * 顶部拼图与“正确排序”来自设计稿底图，四个方块按四维顺序显示正确卡片编号；
	 * 下半部白卡内展示三段职业解说与（通关后的）认知分型。
	 */
	export default {
		components: { ZdypHeader },
		data: () => ({
			assets,
			recordId: '',
			instanceId: '',
			gameId: '',
			bizType: 'career_week',
			record: {},
			result: {},
			detail: {}
		}),
		computed: {
			passed() {
				return this.result.pass === true
			},
			resultTag() {
				if (this.passed) return '通关'
				return this.result.timeout ? '超时' : '未通过'
			},
			durationText() {
				if (this.result.durationMs === undefined || this.result.durationMs === null) return '-'
				return (this.result.durationMs / 1000).toFixed(1) + ' 秒'
			}
		},
		async onLoad(options) {
			this.recordId = options.recordId || ''
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			await this.load()
		},
		methods: {
			async load() {
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = res.data || {}
					this.record = data
					this.bizType = data.bizType || 'career_week'
					this.result = data.lastResult || {}
					this.detail = this.result.detail || {}
				} catch (e) {
					uni.showToast({ title: userMessage(e, '结果加载失败，请稍后重试'), icon: 'none' })
				}
			},
			slotStyle(index) {
				const lefts = [46, 217, 387, 558]
				return `left:${lefts[index] || 46}rpx;top:904rpx`
			},
			retry() {
				const base = `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
				uni.redirectTo({ url: `/pages/zdyp/index?${base}` })
			},
			backToActivity() {
				uni.reLaunch({
					url: `/pages/mp/sub-pages/career-week/index?bizType=${encodeURIComponent(this.bizType || 'career_week')}`
				})
			},
			back() {
				const pages = getCurrentPages()
				if (pages.length > 1) {
					uni.navigateBack({ delta: 1 })
					return
				}
				this.backToActivity()
			}
		}
	}
</script>

<style scoped>
	.page {
		position: relative;
		width: 750rpx;
		height: 1624rpx;
		min-height: 100vh;
		background: #FEF2CA;
		overflow: hidden;
	}

	.stage-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 750rpx;
		height: 1624rpx;
	}

	.answer-slot {
		position: absolute;
		width: 146rpx;
		height: 146rpx;
		background: #FFE986;
		z-index: 3;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.answer-no {
		font-size: 84rpx;
		font-weight: 600;
		color: #1A1A1A;
	}

	.card {
		position: absolute;
		left: 75rpx;
		top: 1180rpx;
		width: 600rpx;
		height: 444rpx;
		background: #FFFFFF;
		border-radius: 36rpx 36rpx 0 0;
		z-index: 4;
		overflow: hidden;
	}

	.card-scroll {
		height: 444rpx;
	}

	.card-inner {
		padding: 28rpx 28rpx 220rpx;
	}

	.card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.career-name {
		font-size: 30rpx;
		font-weight: 700;
		color: #3D3428;
	}

	.result-tag {
		font-size: 22rpx;
		padding: 4rpx 16rpx;
		border-radius: 16rpx;
	}

	.tag-pass {
		background: #E4F4E5;
		color: #3E8E4B;
	}

	.tag-fail {
		background: #FBE7E2;
		color: #C2553F;
	}

	.metric-line {
		margin-top: 8rpx;
		font-size: 21rpx;
		color: #8A6D3B;
	}

	.block {
		margin-top: 18rpx;
	}

	.block-label {
		display: block;
		font-size: 24rpx;
		font-weight: 700;
		color: #EE8B3E;
	}

	.block-text {
		display: block;
		margin-top: 6rpx;
		font-size: 22rpx;
		line-height: 1.65;
		color: #4A3B2A;
	}

	.btn {
		position: absolute;
		top: 1417rpx;
		height: 96rpx;
		line-height: 96rpx;
		text-align: center;
		border-radius: 48rpx;
		background: #F4AB4F;
		color: #684822;
		font-size: 34rpx;
		font-weight: 600;
		letter-spacing: 2rpx;
		z-index: 6;
	}

	.btn-full {
		left: 42rpx;
		width: 665rpx;
	}

	.btn-half-left {
		left: 42rpx;
		width: 320rpx;
		background: #FFFDF8;
		border: 3rpx solid #F4AB4F;
		color: #B0752B;
		box-sizing: border-box;
	}

	.btn-half-right {
		left: 387rpx;
		width: 320rpx;
	}
</style>
