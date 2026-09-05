<template>
  <view class="page">
    <view class="head">
      <text class="game-title">未来职业猜猜看</text>
      <view class="timer" :class="{ warning: remaining <= 10 }">
        <text class="timer-label">剩余时间</text>
        <text class="timer-value">{{ remaining }}<text class="timer-unit">秒</text></text>
      </view>
      <text class="rule" @click="openRules">?</text>
    </view>

    <image v-if="question.questionImageUrl" class="picture" :src="imageUrl(question.questionImageUrl)" mode="aspectFill" />
    <text class="prompt">猜猜以上内容是下面哪个职业的工作场景？</text>
    <view v-for="(label, key) in options" :key="key" class="option" :class="optionClass(key)" :style="optionStyle(key)" @click="answer(key)">
      <text>{{ key }}. {{ label }}</text>
      <text v-if="showResult && key === correctKey" class="result-mark">正确答案</text>
      <text v-else-if="showResult && key === selectedKey" class="result-mark">你的选择</text>
    </view>
    <view v-if="showResult" class="result-tip" :class="answerCorrect ? 'result-correct' : 'result-wrong'">
      {{ answerCorrect ? '回答正确' : '回答错误，正确答案已标出' }}
    </view>
    <text class="progress">==第{{ question.questionNo || currentNo || 1 }}个职业/共5个职业==</text>

    <view v-if="rulesVisible" class="mask">
      <view class="modal">
        <text class="modal-title">游戏规则</text>
        <text class="modal-body">每题限时 60 秒，选择一个答案。完成五题后继续探索职业世界。</text>
        <button type="primary" hover-class="button-hover" @click="closeRules">我知道了</button>
      </view>
    </view>
  </view>
</template>

<script>
import { getRecord, submitAnswer, startQuestionTimer, userMessage } from '@/api/zycck'
import config from '@/config/api.js'

export default {
  data: () => ({
    instanceId: '', gameId: '', recordId: '', question: {}, currentNo: 1, remaining: 60,
    timer: null, redirectTimer: null, timerStarted: false, rulesVisible: false,
    rulesClosed: false, submitting: false, showResult: false, selectedKey: '',
    correctKey: '', answerCorrect: false, pressedKey: ''
  }),
  onLoad(o) {
    Object.assign(this, { instanceId: o.instanceId || '', gameId: o.gameId || '', recordId: o.recordId || '' })
    this.rulesVisible = o.skipRules !== '1'
    this.load()
  },
  onUnload() {
    this.stopTimer()
    if (this.redirectTimer) clearTimeout(this.redirectTimer)
  },
  computed: {
    options() {
      const q = this.question || {}
      return {
        A: q.optionA || (q.options && q.options.A) || '',
        B: q.optionB || (q.options && q.options.B) || '',
        C: q.optionC || (q.options && q.options.C) || '',
        D: q.optionD || (q.options && q.options.D) || ''
      }
    }
  },
  methods: {
    imageUrl(v) { return v && (/^\/(profile|upload)\//.test(v) ? config.BASE_URL + v : v) },
    optionClass(key) {
      return {
        pressed: !this.showResult && key === this.pressedKey,
        correct: this.showResult && key === this.correctKey,
        wrong: this.showResult && key === this.selectedKey && key !== this.correctKey
      }
    },
    optionStyle(key) {
      if (this.showResult && key === this.correctKey) return 'background-color:#bdecc9;border-color:#34a853;color:#146b32;'
      if (this.showResult && key === this.selectedKey && key !== this.correctKey) return 'background-color:#ffd0d0;border-color:#e34d59;color:#a61d2a;'
      if (!this.showResult && key === this.pressedKey) return 'background-color:#dceaff;border-color:#75aaf7;color:#174f98;'
      return ''
    },
    async load() {
      if (!this.recordId) return
      try {
        const r = await getRecord(this.recordId)
        if (r.code && r.code !== 200) throw new Error(r.msg || '游戏进度加载失败')
        const d = r.data || {}
        if (d.stage === 'feedback') {
          if (d.feedback) uni.setStorageSync(`zycck_feedback_${this.recordId}`, d)
          return uni.redirectTo({ url: `/pages/zycck/feedback?recordId=${this.recordId}&instanceId=${this.instanceId}&gameId=${this.gameId}` })
        }
        if (d.stage === 'summary') return uni.redirectTo({ url: `/pages/zycck/summary?recordId=${this.recordId}&instanceId=${this.instanceId}&gameId=${this.gameId}` })
        this.question = d.question || d.currentQuestion || {}
        this.currentNo = d.currentQuestionNo || this.question.questionNo || 1
        this.remaining = Number(d.remainingSeconds == null ? 60 : d.remainingSeconds)
        if (this.currentNo > 1) this.rulesVisible = false
        if (d.finished || d.status === 'finished') return uni.redirectTo({ url: `/pages/zycck/exploration-list?recordId=${this.recordId}&instanceId=${this.instanceId}&gameId=${this.gameId}&readOnly=1` })
        if (!this.rulesVisible) { await this.ensureQuestionTimer(); this.startTimer() }
      } catch (e) {
        uni.showToast({ title: userMessage(e, '游戏进度加载失败，请重试'), icon: 'none' })
      }
    },
    openRules() { if (this.showResult) return; this.stopTimer(); this.rulesVisible = true },
    async closeRules() { this.rulesVisible = false; this.rulesClosed = true; await this.ensureQuestionTimer(); this.startTimer() },
    async ensureQuestionTimer() {
      if (this.timerStarted || !this.recordId) return
      this.timerStarted = true
      try { await startQuestionTimer(this.recordId) } catch (e) { this.timerStarted = false }
    },
    startTimer() {
      this.stopTimer()
      if (this.rulesVisible || this.showResult) return
      if (this.remaining <= 0) return this.timeout()
      this.timer = setInterval(() => { if (this.rulesVisible) return; this.remaining--; if (this.remaining <= 0) this.timeout() }, 1000)
    },
    stopTimer() { if (this.timer) { clearInterval(this.timer); this.timer = null } },
    async timeout() {
      this.stopTimer()
      if (this.submitting) return
      this.submitting = true
      try {
        const r = await submitAnswer(this.recordId, { questionId: this.question.questionId, questionNo: this.currentNo, timeoutFlag: true })
        this.advance(r.data || {})
      } catch (e) {
        uni.showToast({ title: userMessage(e, '答题超时，正在进入下一题'), icon: 'none' })
        this.load()
      } finally { this.submitting = false }
    },
    async answer(key) {
      if (this.submitting || this.rulesVisible || this.showResult) return
      this.pressedKey = key
      this.submitting = true
      this.stopTimer()
      try {
        const r = await submitAnswer(this.recordId, { questionId: this.question.questionId, questionNo: this.currentNo, optionKey: key, timeoutFlag: false })
        if (r.code && r.code !== 200) throw new Error(r.msg || '答案提交失败')
        const d = r.data || {}
        const feedback = d.feedback || d
        if (d.feedback || d.correctCareer) {
          this.selectedKey = feedback.selectedOptionKey || key
          this.correctKey = feedback.correctOptionKey || ''
          this.answerCorrect = feedback.correct === true || feedback.correct === 'true'
          this.showResult = true
          uni.setStorageSync(`zycck_feedback_${this.recordId}`, d)
          this.redirectTimer = setTimeout(() => {
            uni.redirectTo({ url: `/pages/zycck/feedback?recordId=${this.recordId}&instanceId=${this.instanceId}&gameId=${this.gameId}` })
          }, 2200)
        } else {
          this.advance(d)
          this.submitting = false
        }
      } catch (e) {
        this.submitting = false; this.pressedKey = ''
        const message = userMessage(e, '答案提交失败，请重试')
        if (message === '这道题已经提交过了') {
          uni.showLoading({ title: '正在恢复进度' })
          try { await this.load() } finally { uni.hideLoading() }
        } else {
          this.pressedKey = ''
          uni.showToast({ title: message, icon: 'none' })
          this.startTimer()
        }
      }
    },
    advance(d) {
      const next = d.nextQuestion && Object.keys(d.nextQuestion).length ? d.nextQuestion : (d.question && Object.keys(d.question).length ? d.question : null)
      this.showResult = false; this.selectedKey = ''; this.correctKey = ''; this.pressedKey = ''
      if (next) {
        this.question = next; this.currentNo = d.currentQuestionNo || this.currentNo + 1
        this.remaining = Number(d.remainingSeconds == null ? 60 : d.remainingSeconds); this.timerStarted = false
        this.ensureQuestionTimer(); this.startTimer()
      } else if (d.stage === 'summary' || d.finishedFive) {
        uni.redirectTo({ url: `/pages/zycck/summary?recordId=${this.recordId}&instanceId=${this.instanceId}&gameId=${this.gameId}` })
      } else { this.currentNo = d.currentQuestionNo || this.currentNo + 1; this.load() }
    }
  }
}
</script>

<style scoped>
.page{min-height:100vh;padding:48rpx 28rpx 34rpx;box-sizing:border-box;background:#f5f7fb;display:flex;flex-direction:column;justify-content:center;animation:pageIn .35s ease-out}.head{display:flex;justify-content:space-between;align-items:center;color:#334155;font-size:28rpx;margin-bottom:18rpx}.game-title{font-size:38rpx;font-weight:800;color:#1f2937}.timer{min-width:170rpx;padding:12rpx 22rpx;text-align:center;border-radius:18rpx;background:#e8f1ff;color:#1b76fe;box-shadow:0 6rpx 18rpx rgba(27,118,254,.12)}.timer-label{display:block;font-size:22rpx}.timer-value{display:block;font-size:44rpx;font-weight:700;line-height:1.1}.timer-unit{font-size:22rpx;font-weight:400;margin-left:4rpx}.timer.warning{background:#fff0f0;color:#e34d59}.rule{width:52rpx;height:52rpx;line-height:52rpx;text-align:center;border-radius:50%;background:#1b76fe;color:#fff;font-weight:700}.picture{width:100%;height:380rpx;margin:26rpx 0;border-radius:18rpx}.prompt{display:block;font-size:32rpx;color:#1f2937;margin-bottom:20rpx}.option{padding:28rpx;margin:14rpx 0;background:#fff;border:3rpx solid transparent;border-radius:14rpx;color:#243b53;box-shadow:0 4rpx 14rpx rgba(31,41,55,.04);display:flex;justify-content:space-between;align-items:center;transition:background .18s,transform .18s,border-color .18s}.option-hover{background:#edf4ff;transform:scale(.985)}.option.pressed{background:#dceaff;border-color:#75aaf7;transform:scale(.985)}.option.correct{background:#bdecc9;border-color:#34a853;color:#146b32}.option.wrong{background:#ffd0d0;border-color:#e34d59;color:#a61d2a}.result-mark{font-size:24rpx;font-weight:600}.result-tip{text-align:center;margin-top:18rpx;font-size:28rpx;font-weight:600}.result-correct{color:#23954c}.result-wrong{color:#d14343}.progress{display:block;margin-top:28rpx;text-align:center;color:#8a8176;font-size:26rpx}.button-hover{opacity:.8;transform:scale(.98)}.mask{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:10}.modal{width:640rpx;padding:44rpx;background:#fff;border-radius:20rpx}.modal-title{display:block;font-size:38rpx;font-weight:700;text-align:center}.modal-body{display:block;margin:34rpx 0;line-height:1.8;color:#475569}@keyframes pageIn{from{opacity:0;transform:translateY(18rpx)}to{opacity:1;transform:translateY(0)}}
.button-hover{opacity:.8!important;transform:none!important}.option-hover{transform:none!important}.option.pressed{transform:none!important}
</style>
