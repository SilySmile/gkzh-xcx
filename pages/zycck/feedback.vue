<template>
  <scroll-view scroll-y class="page">
    <view class="content">
      <view class="answer-card">
        <text class="feedback-title">本题反馈</text>
        <view class="answer-line">
          <text class="answer-label">你猜的是：</text>
          <text :class="answerCorrect ? 'answer-correct' : 'answer-wrong'">{{ guessedCareer }}</text>
        </view>
        <view class="answer-line">
          <text class="answer-label">正确答案是：</text>
          <text class="answer-correct">{{ correctCareer }}</text>
        </view>
      </view>

      <view class="career-header">
        <image v-if="careerImageUrl" class="career-image" :src="imageUrl(careerImageUrl)" mode="aspectFill" />
        <view class="career-heading">
          <text class="career-name">{{ correctCareer }}</text>
          <text v-if="feedback.oneLineIntro" class="career-intro">{{ feedback.oneLineIntro }}</text>
        </view>
      </view>

      <view v-if="feedback.mainWork" class="info-card">
        <text class="info-title">这个职业主要做什么？</text>
        <text class="info-body">{{ feedback.mainWork }}</text>
      </view>
      <view v-if="feedback.dayExample" class="info-card">
        <text class="info-title">一天可能做什么？</text>
        <view class="day-grid">
          <view v-for="(item, index) in dayItems" :key="index" class="day-item">
            <view class="day-icon">{{ index + 1 }}</view>
            <text class="day-title">{{ item.title }}</text>
            <text v-if="item.description" class="day-description">{{ item.description }}</text>
          </view>
        </view>
      </view>
      <view v-if="feedback.whyExists" class="info-card">
        <text class="info-title">为什么会有这样的职业？</text>
        <text class="info-body">{{ feedback.whyExists }}</text>
      </view>
      <view v-if="feedback.explanation" class="info-card">
        <text class="info-title">本题说明</text>
        <text class="info-body">{{ feedback.explanation }}</text>
      </view>

      <view class="awareness-card">
        <text class="awareness-title">这类职业对你来说？</text>
        <button v-for="choice in awarenessChoices" :key="choice.value" class="awareness-choice" hover-class="awareness-hover" :class="{ 'awareness-pressed': pressedAwareness === choice.value }" @click="submit(choice.value)">
          <text class="choice-key">{{ choice.value }}.</text>
          <text>{{ choice.label }}</text>
        </button>
      </view>

      <text class="progress">== 第{{ questionNo }}个职业 / 共5个职业 ==</text>
    </view>
  </scroll-view>
</template>

<script>
import { getRecord, submitAwareness, userMessage } from '@/api/zycck'
import config from '@/config/api.js'

export default {
  data: () => ({
    recordId: '', instanceId: '', gameId: '', data: {}, busy: false, pressedAwareness: '',
    awarenessChoices: [
      { value: 'A', label: '以前就知道' },
      { value: 'B', label: '听说过但不了解' },
      { value: 'C', label: '第一次知道' }
    ]
  }),
  computed: {
    feedback() { return this.data.feedback || this.data || {} },
    guessedCareer() { return this.feedback.guessedCareer || this.data.guessedCareer || '未作答' },
    correctCareer() { return this.feedback.correctCareerName || this.data.correctCareer || '—' },
    answerCorrect() { return this.feedback.correct === true || this.feedback.correct === 'true' },
    questionNo() { return this.feedback.questionNo || this.data.questionNo || 1 },
    careerImageUrl() { return this.feedback.careerImageUrl || '' },
    dayItems() {
      return String(this.feedback.dayExample || '').split(/\r?\n/).filter(Boolean).map(item => {
        const parts = item.split('｜')
        return { title: parts.shift() || '', description: parts.join('｜') }
      })
    }
  },
  onLoad(o) {
    this.recordId = o.recordId || ''
    this.instanceId = o.instanceId || ''
    this.gameId = o.gameId || ''
    try {
      this.data = o.payload
        ? JSON.parse(decodeURIComponent(o.payload))
        : (uni.getStorageSync(`zycck_feedback_${this.recordId}`) || {})
    } catch (e) { this.data = {} }
    if (!this.data.feedback) this.loadFeedback()
  },
  methods: {
    imageUrl(v) { return v && (/^\/(profile|upload)\//.test(v) ? config.BASE_URL + v : v) },
    async loadFeedback() {
      try {
        const r = await getRecord(this.recordId)
        const d = r.data || {}
        if (d.feedback) this.data = d
      } catch (e) {
        uni.showToast({ title: userMessage(e, '反馈内容加载失败，请重试'), icon: 'none' })
      }
    },
    async submit(level) {
      if (this.busy) return
      this.busy = true
      this.pressedAwareness = level
      try {
        const r = await submitAwareness(this.recordId, { awareness: level })
        const d = r.data || {}
        uni.removeStorageSync(`zycck_feedback_${this.recordId}`)
        if (d.nextQuestion) {
          uni.redirectTo({ url: `/pages/zycck/question?recordId=${this.recordId}&instanceId=${this.instanceId}&gameId=${this.gameId}&skipRules=1` })
        } else {
          uni.redirectTo({ url: `/pages/zycck/summary?recordId=${this.recordId}&instanceId=${this.instanceId}&gameId=${this.gameId}` })
        }
      } catch (e) {
        this.pressedAwareness = ''
        uni.showToast({ title: userMessage(e, '提交失败，请重试'), icon: 'none' })
      } finally { this.busy = false }
    }
  }
}
</script>

<style scoped>
.page{height:100vh;background:#f7f5f1}.content{padding:34rpx 28rpx 52rpx;box-sizing:border-box}.answer-card,.career-header,.info-card,.awareness-card{background:#fff;border-radius:24rpx;box-shadow:0 8rpx 28rpx rgba(77,65,46,.06)}.answer-card{padding:30rpx;margin-bottom:24rpx}.feedback-title{display:block;font-size:34rpx;font-weight:700;color:#1f2937;margin-bottom:20rpx}.answer-line{display:flex;align-items:center;margin-top:12rpx;font-size:30rpx}.answer-label{color:#475569}.answer-correct{color:#2f9d57;font-weight:700}.answer-wrong{color:#d94b4b;font-weight:700}.career-header{display:flex;align-items:center;padding:28rpx;margin-bottom:22rpx;background:linear-gradient(135deg,#fffaf1,#fff)}.career-heading{flex:1;min-width:0}.career-name{display:block;font-size:42rpx;line-height:1.25;font-weight:800;color:#222}.career-intro{display:block;margin-top:14rpx;font-size:27rpx;line-height:1.6;color:#665f55}.career-image{width:176rpx;height:150rpx;border-radius:20rpx;margin-right:24rpx}.info-card{padding:28rpx;margin-bottom:20rpx}.info-title{display:block;font-size:32rpx;font-weight:700;color:#20252b;margin-bottom:18rpx}.info-body{display:block;font-size:27rpx;line-height:1.8;color:#4b5563}.day-grid{display:flex;margin:0 -8rpx}.day-item{width:25%;padding:0 8rpx;box-sizing:border-box;text-align:center}.day-icon{width:60rpx;height:60rpx;line-height:60rpx;margin:0 auto 12rpx;border-radius:16rpx;background:#fff4e8;color:#c56d1b;font-size:26rpx;font-weight:700}.day-title{display:block;color:#30343b;font-size:25rpx;font-weight:700;line-height:1.35}.day-description{display:block;margin-top:8rpx;color:#7a7f87;font-size:22rpx;line-height:1.4}.awareness-card{padding:30rpx;margin-top:26rpx}.awareness-title{display:block;font-size:34rpx;font-weight:700;color:#20252b;margin-bottom:22rpx}.awareness-choice{height:auto;min-height:88rpx;margin:16rpx 0;padding:22rpx 28rpx;border:2rpx solid #e6e9ee;border-radius:18rpx;background:#fff;color:#334155;font-size:28rpx;text-align:left;line-height:1.5}.awareness-choice::after{border:0}.choice-key{display:inline-block;width:50rpx;color:#c56d1b;font-weight:700}.progress{display:block;text-align:center;margin-top:34rpx;color:#8a8176;font-size:26rpx}
.content{animation:pageIn .35s ease-out}.awareness-hover{background:#edf4ff!important;transform:scale(.985)}
@keyframes pageIn{from{opacity:0;transform:translateY(18rpx)}to{opacity:1;transform:translateY(0)}}
.button-hover{transform:none!important}.card-hover{transform:none!important}.awareness-hover{transform:none!important}.awareness-pressed{background:#edf4ff!important;border-color:#75aaf7!important;color:#174f98!important}</style>
