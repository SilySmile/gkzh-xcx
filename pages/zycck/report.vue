<template>
  <scroll-view scroll-y class="page">
    <view class="content">
      <view class="report-header">
        <text class="title">我的未来职业探索报告</text>
        <text class="subtitle">以下是你想进一步了解的职业</text>
        <text class="count">共 {{ careers.length }} 个职业</text>
      </view>

      <view v-for="career in careers" :key="career.careerId" class="career-card">
        <view class="career-header">
          <image v-if="career.careerImageUrl" class="career-image" :src="imageUrl(career.careerImageUrl)" mode="aspectFill" />
          <view class="career-heading">
            <text class="career-name">{{ career.careerName }}</text>
            <text class="career-intro">{{ career.oneLineIntro || '暂无一句话介绍' }}</text>
          </view>
        </view>
        <view class="info-block">
          <text class="info-title">这个职业主要做什么？</text>
          <text class="info-body">{{ career.mainWork || '暂无介绍' }}</text>
        </view>
        <view class="info-block">
          <text class="info-title">一天可能做什么？</text>
          <text class="info-body">{{ career.dayExample || '暂无介绍' }}</text>
        </view>
        <view class="info-block">
          <text class="info-title">为什么会有这样的职业？</text>
          <text class="info-body">{{ career.whyExists || '暂无介绍' }}</text>
        </view>
      </view>

      <view v-if="!loading && !careers.length" class="empty-card">
        <text class="empty-title">本次没有加入进一步了解的职业</text>
        <text class="empty-text">你已经完成了未来职业探索，本次参与记录已保存。</text>
      </view>

      <button type="primary" :loading="downloading" hover-class="button-hover" @click="download">下载探索报告 PDF</button>
    </view>
  </scroll-view>
</template>

<script>
import { getExploration, getCatalog, downloadReportPdf, userMessage } from '@/api/zycck'
import config from '@/config/api.js'

export default {
  data: () => ({ recordId: '', instanceId: '', gameId: '', careers: [], loading: false, downloading: false }),
  onLoad(o) {
    Object.assign(this, { recordId: o.recordId || '', instanceId: o.instanceId || '', gameId: o.gameId || '' })
    this.load()
  },
  methods: {
    imageUrl(v) { return v && (/^\/(profile|upload)\//.test(v) ? config.BASE_URL + v : v) },
    async load() {
      this.loading = true
      try {
        const [explorationRes, catalogRes] = await Promise.all([
          getExploration(this.recordId),
          getCatalog({ instanceId: this.instanceId, gameId: this.gameId })
        ])
        const exploration = explorationRes.data || {}
        const selected = exploration.items || exploration.explorationItems || []
        const catalog = (catalogRes.data || {}).careers || []
        const byId = {}
        catalog.forEach(item => { byId[String(item.careerId || item.careerQuestionId)] = item })
        this.careers = selected.map(item => {
          const id = item.careerId || item.careerQuestionId
          return { ...item, ...(byId[String(id)] || {}), careerId: id, careerName: item.careerName || (byId[String(id)] && byId[String(id)].careerName) || '职业信息' }
        })
      } catch (e) {
        uni.showToast({ title: userMessage(e, '探索报告加载失败，请重试'), icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async download() {
      if (this.downloading) return
      this.downloading = true
      try {
        uni.showLoading({ title: '生成 PDF' })
        const result = await downloadReportPdf({ recordId: this.recordId })
        const path = result.tempFilePath || result.filePath
        if (!path) throw new Error('PDF 下载失败')
        uni.openDocument({ filePath: path, showMenu: true, fileType: 'pdf' })
      } catch (e) {
        uni.showToast({ title: userMessage(e, 'PDF 下载失败，请稍后重试'), icon: 'none' })
      } finally {
        uni.hideLoading()
        this.downloading = false
      }
    }
  }
}
</script>

<style scoped>
.page{height:100vh;background:#f7f5f1}.content{min-height:100vh;padding:52rpx 28rpx 64rpx;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center}.report-header{text-align:center;margin-bottom:30rpx}.title{display:block;font-size:48rpx;font-weight:800;color:#1a2c4a}.subtitle{display:block;margin-top:16rpx;color:#64748b;font-size:27rpx}.count{display:inline-block;margin-top:16rpx;padding:8rpx 18rpx;border-radius:20rpx;background:#e8f1ff;color:#1b76fe;font-size:24rpx}.career-card,.empty-card{background:#fff;border-radius:24rpx;padding:30rpx;margin-bottom:24rpx;box-shadow:0 8rpx 28rpx rgba(77,65,46,.06)}.career-header{display:flex;align-items:center;padding-bottom:24rpx;border-bottom:1rpx solid #f0ede8}.career-image{width:150rpx;height:130rpx;border-radius:18rpx;margin-right:22rpx}.career-heading{flex:1;min-width:0}.career-name{display:block;font-size:38rpx;font-weight:800;color:#222}.career-intro{display:block;margin-top:12rpx;font-size:26rpx;line-height:1.6;color:#665f55}.info-block{padding-top:24rpx}.info-title{display:block;font-size:30rpx;font-weight:700;color:#20252b;margin-bottom:12rpx}.info-body{display:block;font-size:26rpx;line-height:1.75;color:#4b5563;white-space:pre-line}.empty-card{text-align:center;padding:54rpx 32rpx}.empty-title{display:block;font-size:31rpx;font-weight:700;color:#334155}.empty-text{display:block;margin-top:18rpx;font-size:25rpx;line-height:1.7;color:#8a94a6}button{margin-top:14rpx}.button-hover{opacity:.82}.content{animation:pageIn .35s ease-out}@keyframes pageIn{from{opacity:0;transform:translateY(18rpx)}to{opacity:1;transform:translateY(0)}}
</style>
