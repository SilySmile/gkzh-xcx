<!-- 谁是职场TOP个人报告：纵向单页展示，只读取个人报告快照，避免后续配置变更影响历史结果。 -->
<template>
  <scroll-view scroll-y class="page">
    <view v-if="loading" class="empty">加载中…</view>
    <view v-else-if="!report" class="empty">未找到报告</view>
    <view v-else class="report-wrap">
      <view class="report-head">
        <text class="title">谁是职场TOP</text>
        <text :class="['result', isPassed ? 'passed' : 'failed']">{{ isPassed ? '挑战成功' : '本局未通过' }}</text>
      </view>

      <!-- 先展示维度说明，再向上滑动查看职业排序与解释。 -->
      <view class="dimension-card">
        <text class="section-title">本次选择的维度</text>
        <text class="dimension-name">{{ dimension.name || '未记录维度' }}</text>
        <view class="divider"></view>
        <text class="explain-title">维度解释</text>
        <text class="description">{{ dimension.description || '暂无维度说明' }}</text>
      </view>

      <view class="career-section">
        <text class="section-title">你选择的职业与个人排序</text>
        <view v-for="(career, index) in selectedCareers" :key="career.careerId" :class="['career-card', { correct: isCorrectAt(index, career.careerId) }]">
          <view class="career-top">
            <text class="rank">{{ index + 1 }}</text>
            <view class="career-name-wrap"><text class="career-name">{{ career.name }}</text><text v-if="career.major" class="major">{{ career.major }}</text></view>
            <text v-if="isCorrectAt(index, career.careerId)" class="correct-text">排序正确</text>
          </view>
          <text class="career-description">{{ rankExplanation(career.careerId) }}</text>
        </view>
        <text v-if="!selectedCareers.length" class="empty-list">未记录本次选择的职业</text>
      </view>

      <!-- 仅失败时展示正确排序；成功时上方绿色框已说明个人排序与标准一致。 -->
      <view v-if="!isPassed" class="standard-section">
        <text class="section-title">正确排序</text>
        <text class="section-tip">以下为本次选取职业的正确排序：</text>
        <view v-for="(career, index) in standardCareers" :key="career.careerId" class="standard-card">
          <text class="rank standard-rank">{{ index + 1 }}</text>
          <text class="career-name">{{ career.name }}</text>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script>
import { getReport } from '@/api/sszctop'

export default {
  data() {
    return { loading: true, report: null, dimension: {}, careers: [], rankDetails: [], orderIds: [], standardIds: [] }
  },
  computed: {
    // 只有排序框中实际选择的三个职业进入个人报告，职业池内其余职业不会展示。
    selectedCareers() { return this.orderIds.map(id => this.career(id)).filter(career => career.careerId) },
    standardCareers() { return this.standardIds.map(id => this.career(id)).filter(career => career.careerId) },
    isPassed() { return this.report && this.report.result === 'passed' }
  },
  onLoad(options) {
    getReport(options.gameId).then(response => {
      if (response.code !== 200 || !response.data) return
      this.report = response.data
      this.dimension = this.parseSnapshot(response.data.dimensionSnapshot, {})
      this.careers = this.parseSnapshot(response.data.careersSnapshot, [])
      // 说明来自“维度排序及文案”，由服务端按本局维度和职业返回。
      this.rankDetails = response.data.rankDetails || []
      this.orderIds = this.parseIds(response.data.sharedOrderSnapshot)
      this.standardIds = this.parseIds(response.data.standardOrderSnapshot)
    }).finally(() => { this.loading = false })
  },
  methods: {
    // 历史报告需兼容空快照或异常快照，避免页面因一条旧数据无法打开。
    parseSnapshot(value, fallback) { try { return JSON.parse(value || '') } catch (error) { return fallback } },
    parseIds(value) { return String(value || '').split(',').filter(Boolean) },
    career(id) { return this.careers.find(item => String(item.careerId) === String(id)) || {} },
    // 使用维度排序中该职业对应的排序说明，而非职业配置中的通用说明。
    rankExplanation(careerId) {
      const rank = this.rankDetails.find(item => String(item.careerId) === String(careerId))
      return (rank && rank.description) || '暂无该维度下的职业说明'
    },
    // 个人排序在同一名次与标准排序相同即标记绿色框；挑战成功时三项均为绿色。
    isCorrectAt(index, careerId) { return String(this.standardIds[index] || '') === String(careerId) }
  }
}
</script>

<style scoped>
.page { height: 100vh; background: #f5f7fb; }
.empty { padding-top: 160rpx; text-align: center; color: #8b97aa; }
.report-wrap { padding: 28rpx 28rpx 56rpx; box-sizing: border-box; }
.report-head { padding: 20rpx 0 26rpx; text-align: center; }
.title { display: block; color: #2456a6; font-size: 42rpx; font-weight: bold; }
.result { display: block; margin-top: 12rpx; font-size: 30rpx; font-weight: bold; }
.passed { color: #20a66a; }.failed { color: #d9534f; }
.dimension-card, .career-section, .standard-section { padding: 32rpx 28rpx; border-radius: 20rpx; background: #fff; box-shadow: 0 6rpx 20rpx rgba(44, 76, 130, .07); }
.career-section { margin-top: 24rpx; }.section-title { display: block; color: #253858; font-size: 32rpx; font-weight: bold; }
.dimension-name { display: block; margin-top: 30rpx; color: #2456a6; font-size: 42rpx; font-weight: bold; }
.divider { height: 1rpx; margin: 30rpx 0; background: #e8edf5; }.explain-title { display: block; margin-bottom: 12rpx; color: #53657e; font-size: 28rpx; font-weight: bold; }
.description, .career-description { color: #66758b; font-size: 28rpx; line-height: 1.8; white-space: pre-wrap; }
.career-card { margin-top: 20rpx; padding: 24rpx; border: 2rpx solid #e3e9f2; border-radius: 16rpx; background: #fff; }
/* 绿色边框明确表示该职业在个人排序中的名次与标准排序相符。 */
.career-card.correct { border-color: #35b77a; background: #f1fbf6; box-shadow: inset 0 0 0 2rpx rgba(53, 183, 122, .10); }
.career-top { display: flex; align-items: center; min-height: 54rpx; }.rank { display: flex; width: 48rpx; height: 48rpx; margin-right: 18rpx; border-radius: 50%; align-items: center; justify-content: center; color: #fff; background: #2456a6; font-size: 27rpx; font-weight: bold; }
.career-name-wrap { flex: 1; min-width: 0; }.career-name { color: #2b3a52; font-size: 31rpx; font-weight: bold; }.major { display: block; margin-top: 5rpx; color: #8491a4; font-size: 24rpx; }
.correct-text { color: #20a66a; font-size: 24rpx; font-weight: bold; }.career-description { display: block; margin-top: 18rpx; padding-top: 18rpx; border-top: 1rpx solid rgba(159, 174, 194, .25); }
.empty-list { display: block; margin-top: 30rpx; color: #8b97aa; text-align: center; }
.standard-section { margin-top: 24rpx; border-top: 8rpx solid #f2a23a; }.section-tip { display: block; margin: 14rpx 0 4rpx; color: #7d899b; font-size: 26rpx; }
.standard-card { display: flex; align-items: center; margin-top: 16rpx; padding: 20rpx; border-radius: 14rpx; background: #fff8ec; }.standard-rank { background: #e99a28; }
</style>
