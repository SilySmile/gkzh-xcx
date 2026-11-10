<template>
	<view class="page">
		<scroll-view class="scroll" scroll-y>
			<view class="canvas">
				<image class="stage-bg" :src="assets.report" mode="scaleToFill"></image>

				<!-- 正确排序：设计稿底部四个浅黄方块，按岗位四维顺序填正确答案编号 -->
				<view v-for="(slot, index) in result.slots || []" :key="slot.slotCode" class="answer-slot"
					:style="slotStyle(index)">
					<text class="answer-no">{{ answerNo(slot, index) }}</text>
				</view>

				<!-- 职业解说白卡：从设计稿白卡位置开始，随内容自然向下延伸，整页滚动 -->
				<view class="card">
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
			</view>
		</scroll-view>

		<!-- 操作栏沉底：内容整体滚动，按钮不再浮在文字上 -->
		<view class="actions">
			<view v-if="!passed" class="btn btn-ghost" @click="retry">再试一次</view>
			<view class="btn btn-main" :class="{ 'btn-single': passed }" @click="backToActivity">返回活动</view>
		</view>

		<ZdypHeader title="职业拼图结果" @back="back" />
	</view>
</template>

<script>
	import ZdypHeader from '@/components/ZdypHeader.vue'
	import assets from '@/config/zdyp-assets.js'
	import { getRecord, userMessage } from '@/api/zdyp'

	/**
	 * 职得一拼解析页：按设计稿 5.6 还原整页结构。
	 * 整页可下拉滚动，白卡从设计稿位置开始随内容向下延伸，底部“返回活动”固定在屏幕底部。
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
			/** 通关时放入的卡片就是正确答案，服务端未返回编号时用学生看到的编号兜底。 */
			answerNo(slot, index) {
				if (slot.correctCardNo) return slot.correctCardNo
				if (this.passed && slot.cardNo) return slot.cardNo
				// 旧版服务端未返回编号时按四维默认顺序展示，避免出现空白或“-”。
				return index + 1
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
		width: 750rpx;
		height: 100vh;
		background: #FEF2CA;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.scroll {
		flex: 1;
		height: 0;
	}

	.canvas {
		position: relative;
		width: 750rpx;
		padding-bottom: 20rpx;
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
		position: relative;
		z-index: 4;
		width: 600rpx;
		margin: 1180rpx 75rpx 0;
		padding: 28rpx 28rpx 36rpx;
		box-sizing: border-box;
		background: #FFFFFF;
		border-radius: 36rpx 36rpx 0 0;
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

	.actions {
		flex-shrink: 0;
		display: flex;
		padding: 18rpx 42rpx;
		padding-bottom: calc(18rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(18rpx + env(safe-area-inset-bottom));
		background: #FEF2CA;
	}

	.btn {
		flex: 1;
		height: 96rpx;
		line-height: 96rpx;
		text-align: center;
		border-radius: 48rpx;
		font-size: 34rpx;
		font-weight: 600;
		letter-spacing: 2rpx;
	}

	.btn-main {
		background: #F4AB4F;
		color: #684822;
	}

	.btn-single {
		margin: 0;
	}

	.btn-ghost {
		margin-right: 12rpx;
		background: #FFFDF8;
		border: 3rpx solid #F4AB4F;
		color: #B0752B;
		box-sizing: border-box;
	}
</style>
