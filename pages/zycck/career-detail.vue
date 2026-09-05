<template>
  <scroll-view scroll-y class="page">
    <view class="content">
      <view class="career-header">
        <image v-if="careerImageUrl" class="career-image" :src="imageUrl(careerImageUrl)" mode="aspectFill" />
        <view class="career-heading">
          <text class="title">{{ career.careerName || '职业详情' }}</text>
          <text v-if="career.oneLineIntro" class="intro">{{ career.oneLineIntro }}</text>
        </view>
      </view>
      <view class="info-card">
        <text class="section-title">这个职业主要做什么？</text>
        <text class="body">{{ career.mainWork || '暂无介绍' }}</text>
      </view>
      <view class="info-card">
        <text class="section-title">一天可能做什么？</text>
        <view v-if="dayItems.length" class="day-grid">
          <view v-for="(item, index) in dayItems" :key="index" class="day-item">
            <view class="day-icon">{{ index + 1 }}</view>
            <text class="day-title">{{ item.title }}</text>
            <text v-if="item.description" class="day-description">{{ item.description }}</text>
          </view>
        </view>
        <text v-else class="body">暂无介绍</text>
      </view>
      <view class="info-card">
        <text class="section-title">为什么会有这样的职业？</text>
        <text class="body">{{ career.whyExists || '暂无介绍' }}</text>
      </view>
    </view>
  </scroll-view>
</template>

<script>
import { getRecord, browseCareer, userMessage } from '@/api/zycck'
import config from '@/config/api.js'

export default {
  data: () => ({ recordId: '', careerId: '', career: {}, readOnly: false }),
  computed: {
    careerImageUrl() { return this.career.careerImageUrl || '' },
    dayItems() {
      return String(this.career.dayExample || '').split(/\r?\n/).filter(Boolean).map(item => {
        const parts = item.split('｜')
        return { title: parts.shift() || '', description: parts.join('｜') }
      })
    }
  },
  onLoad(o) {
    Object.assign(this, { recordId: o.recordId || '', careerId: o.careerId || '', readOnly: o.readOnly === '1' })
    this.load()
  },
  methods: {
    imageUrl(v) { return v && (/^\/(profile|upload)\//.test(v) ? config.BASE_URL + v : v) },
    async load() {
      try {
        const r = await getRecord(this.recordId, { careerId: this.careerId })
        const d = r.data || {}
        this.career = d.career || d.currentCareer || { careerId: this.careerId, careerName: '职业详情' }
        this.readOnly = this.readOnly || d.status === 'finished' || (d.record && d.record.status === 'finished')
        if (!this.readOnly) await browseCareer(this.recordId, this.careerId)
      } catch (e) {
        uni.showToast({ title: userMessage(e, '职业详情加载失败，请重试'), icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.page{height:100vh;background:#f7f5f1}.content{padding:34rpx 28rpx 52rpx;box-sizing:border-box}.career-header,.info-card{background:#fff;border-radius:24rpx;box-shadow:0 8rpx 28rpx rgba(77,65,46,.06)}.career-header{display:flex;align-items:center;padding:28rpx;margin-bottom:22rpx;background:linear-gradient(135deg,#fffaf1,#fff)}.career-heading{flex:1;min-width:0}.title{display:block;font-size:42rpx;line-height:1.25;font-weight:800;color:#222}.intro{display:block;margin-top:14rpx;font-size:27rpx;line-height:1.6;color:#665f55}.career-image{width:176rpx;height:150rpx;border-radius:20rpx;margin-right:24rpx}.info-card{padding:28rpx;margin-bottom:20rpx}.section-title{display:block;font-size:32rpx;font-weight:700;color:#20252b;margin-bottom:18rpx}.body{display:block;font-size:27rpx;line-height:1.8;color:#4b5563}.day-grid{display:flex;flex-wrap:wrap;margin:0 -8rpx}.day-item{width:25%;padding:0 8rpx 18rpx;box-sizing:border-box;text-align:center}.day-icon{width:60rpx;height:60rpx;line-height:60rpx;margin:0 auto 12rpx;border-radius:16rpx;background:#fff4e8;color:#c56d1b;font-size:26rpx;font-weight:700}.day-title{display:block;color:#30343b;font-size:25rpx;font-weight:700;line-height:1.35}.day-description{display:block;margin-top:8rpx;color:#7a7f87;font-size:22rpx;line-height:1.4}.content{animation:pageIn .35s ease-out}@keyframes pageIn{from{opacity:0;transform:translateY(18rpx)}to{opacity:1;transform:translateY(0)}}
</style>
