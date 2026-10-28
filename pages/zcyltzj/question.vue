<template>

  <view class="page">
    <image class="page-bg" :src="assets['question-bg']" mode="scaleToFill" />
    <view class="page-header"><zcyltzj-header theme="dark" @back="back" /></view>
    <view class="question-heading" v-if="current">
      <view class="question-meta"><text>{{ record.pointName || '场景答题' }}</text><text>{{ currentIndex + 1 }} / {{ questions.length }}</text></view>
      <view class="progress-track"><view class="progress-fill" :style="{ width: progressPercent + '%' }" /></view>
      <text class="question-theme">{{ record.theme || '请按真实感受作答' }}</text>
    </view>
    <scroll-view scroll-y class="question-area" :scroll-top="panelScrollTop" @scroll="onPanelScroll">
      <view class="question-inner">
      <view class="question-copy" v-if="current">
        <text class="question-number">第 {{ currentIndex + 1 }} 题</text>
        <text class="question-content">{{ current.content }}</text>
        <view class="options">
          <view v-for="key in optionKeys" :key="key" class="option" :class="{ selected: answers[current.questionNo] === key }" @click="choose(key)">
            <text class="option-key">{{ key }}</text><text class="option-text">{{ current['option' + key] }}</text>
          </view>
        </view>
      </view>
      <text v-else class="empty-text">{{ loading ? '题目加载中…' : loadError || '暂无题目，请重新进入游戏' }}</text>
      </view>
    </scroll-view>
    <view class="answer-summary"><text>已完成 {{ answeredCount }} / {{ questions.length }} 题</text><text v-if="currentIndex > 0" class="previous" @click="prev">上一题</text></view>
    <view v-if="loadError" class="load-message"><text>{{ loadError }}</text><text v-if="recordId" class="retry" @click="load">重新加载</text></view>
    <view v-if="current" class="gold-action" :class="{ disabled: submitting || (isLast ? answeredCount < questions.length : !currentAnswer) }" @click="isLast ? submit() : next()">
      <text class="action-label">{{ submitting ? '提交中…' : isLast ? '提交并生成压力值' : '下一题' }}</text>
    </view>
  </view>
</template>

<script>
	import { getRecord, submitAnswers, userMessage } from '@/api/zcyltzj'
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
			questions: [],
			answers: {},
			optionKeys: ['A', 'B', 'C', 'D'],
			currentIndex: 0,
			submitting: false,
			loading: true,
			loadError: '',
			advanceTimer: null,
			panelScrollTop: 0
		}),
		watch: {
			currentIndex() {
				this.$nextTick(() => { this.panelScrollTop = 0 })
			}
		},
		computed: {
			current() {
				return this.questions[this.currentIndex] || null
			},
			isLast() {
				return this.currentIndex >= this.questions.length - 1
			},
			answeredCount() {
				return Object.keys(this.answers).length
			},
			currentAnswer() {
				return this.current ? this.answers[this.current.questionNo] : ''
			},
			progressPercent() {
				if (!this.questions.length) return 0
				return Math.round(((this.currentIndex + 1) * 100) / this.questions.length)
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
		onUnload() {
			if (this.advanceTimer) clearTimeout(this.advanceTimer)
		},
		methods: {
			onPanelScroll(event) {
				this.panelScrollTop = event.detail.scrollTop
			},
			async load() {
				this.loading = true
				this.loadError = ''
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = res.data || {}
					if (data.status === 'finished') {
						uni.redirectTo({ url: `/pages/zcyltzj/result?${this.query()}` })
						return
					}
					if (!data.pointNo) {
						uni.showToast({ title: '请先掷骰子抽取题目', icon: 'none' })
						setTimeout(() => uni.redirectTo({ url: `/pages/zcyltzj/index?${this.query()}` }), 600)
						return
					}
					this.record = data
					this.questions = data.questions || []
					// 恢复已保存的答案：服务端返回 { 题号: 选项 }。
					const saved = {}
					Object.keys(data.answers || {}).forEach(key => {
						if (data.answers[key]) saved[key] = data.answers[key]
					})
					this.answers = saved
				} catch (e) {
					this.loadError = userMessage(e, '题目加载失败，请稍后重试')
					uni.showToast({ title: this.loadError, icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			choose(key) {
				if (this.submitting || !this.current) return
				this.$set(this.answers, this.current.questionNo, key)
				if (this.advanceTimer) clearTimeout(this.advanceTimer)
				// 选择后短暂停留，再自动跳到下一题；最后一题停留在本页等待提交。
				if (!this.isLast) {
					this.advanceTimer = setTimeout(() => this.next(), 350)
				}
			},
			next() {
				if (this.advanceTimer) {
					clearTimeout(this.advanceTimer)
					this.advanceTimer = null
				}
				if (!this.currentAnswer) {
					uni.showToast({ title: '请选择一项后继续', icon: 'none' })
					return
				}
				if (this.currentIndex < this.questions.length - 1) {
					this.currentIndex += 1
				}
			},
			prev() {
				if (this.advanceTimer) {
					clearTimeout(this.advanceTimer)
					this.advanceTimer = null
				}
				if (this.currentIndex > 0) {
					this.currentIndex -= 1
				}
			},
			async submit() {
				if (this.submitting) return
				if (this.answeredCount < this.questions.length) {
					const missing = this.questions.findIndex(item => !this.answers[item.questionNo])
					if (missing > -1) this.currentIndex = missing
					uni.showToast({ title: '请完成全部题目后提交', icon: 'none' })
					return
				}
				this.submitting = true
				try {
					const list = this.questions.map(item => ({
						questionNo: item.questionNo,
						option: this.answers[item.questionNo]
					}))
					await submitAnswers(this.recordId, list)
					uni.redirectTo({ url: `/pages/zcyltzj/result?${this.query()}` })
				} catch (e) {
					uni.showToast({ title: userMessage(e, '答案提交失败，请稍后重试'), icon: 'none' })
				} finally {
					this.submitting = false
				}
			},
			query() {
				return `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
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

.question-heading { position: absolute; left: 11%; top: 23%; width: 78%; }
.question-area { position: absolute; left: 11%; top: 35%; width: 78%; height: 33.5%; overflow-y: auto; }
.question-inner { min-height: 100%; display: flex; flex-direction: column; justify-content: center; }
.question-copy { flex-shrink: 0; width: 100%; padding: 20rpx 12rpx; box-sizing: border-box; }
.question-meta { display: flex; align-items: center; justify-content: space-between; font-size: 24rpx; font-weight: 600; gap: 20rpx; }
.progress-track { margin: 18rpx 0; height: 8rpx; background: rgba(255,255,255,.6); border-radius: 20rpx; overflow: hidden; }
.progress-fill { height: 100%; background: #bc7c27; border-radius: 20rpx; transition: width .2s; }
.question-theme { display: block; font-size: 23rpx; line-height: 1.5; opacity: .8; }
.question-number { display: block; font-size: 25rpx; margin-bottom: 12rpx; }
.question-content { display: block; font-size: 30rpx; line-height: 1.5; font-weight: 600; white-space: pre-wrap; }
.options { padding: 16rpx 0 0; }
.option { display: flex; align-items: flex-start; padding: 9rpx 16rpx; margin-bottom: 4rpx; border: 2rpx solid transparent; border-radius: 16rpx; font-size: 24rpx; line-height: 1.35; }
.option.selected { border-color: #be7d24; background: rgba(255,255,255,.5); }
.option-key { flex-shrink: 0; width: 32rpx; margin-right: 12rpx; font-weight: 700; }
.option-text { flex: 1; white-space: pre-wrap; }
.answer-summary { position: absolute; left: 11%; top: 74%; width: 78%; height: 6%; display: flex; align-items: center; justify-content: space-between; font-size: 26rpx; }
.previous { padding: 18rpx 0 18rpx 24rpx; text-decoration: underline; }
.empty-text { display: block; padding: 36rpx 12rpx; font-size: 28rpx; line-height: 1.6; }

</style>
