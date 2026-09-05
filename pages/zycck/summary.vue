<template>
  <view class="page">
    <text class="title">阶段性总结</text>
    <view class="summary-card">
      <text class="headline">你刚刚看见了5种未来职业</text>
      <text class="sub">这5种职业分别来自不同的职业大类：</text>
      <view v-for="(name, index) in careerNames" :key="index" class="career-row">
        <text class="career-index">{{ index + 1 }}</text><text class="career-name">{{ name }}</text>
      </view>
      <text class="ending">但职业世界远不止这5种</text>
    </view>
    <button type="primary" hover-class="button-hover" @click="goExplore">请继续探索职业世界</button>
  </view>
</template>

<script>
import { getRecord, getCatalog, userMessage } from '@/api/zycck'

export default {
  data: () => ({ recordId: '', instanceId: '', gameId: '', careerNames: [] }),
  onLoad(o) { Object.assign(this, { recordId: o.recordId || '', instanceId: o.instanceId || '', gameId: o.gameId || '' }); this.load() },
  methods: {
    async load() {
      try {
        const [recordRes, catalogRes] = await Promise.all([getRecord(this.recordId), getCatalog({ instanceId: this.instanceId, gameId: this.gameId })])
        const recordData = recordRes.data || {}
        const record = recordData.record || recordData
        let ids = record.careerIds || []
        if (!Array.isArray(ids)) { try { ids = JSON.parse(ids || '[]') } catch (e) { ids = [] } }
        const catalog = catalogRes.data || {}
        const careers = catalog.careers || catalog.items || catalog.questions || []
        const byId = {}
        careers.forEach(item => { byId[String(item.careerId || item.careerQuestionId)] = item.careerName || item.name || item.title })
        this.careerNames = ids.map(id => byId[String(id)]).filter(Boolean).slice(0, 5)
        while (this.careerNames.length < 5) this.careerNames.push('职业信息加载中')
      } catch (e) { uni.showToast({ title: userMessage(e, '总结内容加载失败，请重试'), icon: 'none' }) }
    },
    goExplore() { uni.redirectTo({ url: `/pages/zycck/categories?recordId=${this.recordId}&instanceId=${this.instanceId}&gameId=${this.gameId}` }) }
  }
}
</script>

<style scoped>
.page{min-height:100vh;padding:48rpx 34rpx;box-sizing:border-box;background:#f5f7fb;display:flex;flex-direction:column;justify-content:center}.title{display:block;text-align:center;font-size:48rpx;font-weight:700;color:#1a2c4a;margin-bottom:28rpx}.summary-card{background:#fff;border-radius:24rpx;padding:36rpx 30rpx;box-shadow:0 8rpx 28rpx rgba(31,41,55,.06)}.headline{display:block;text-align:center;font-size:36rpx;font-weight:700;color:#1f2937}.sub{display:block;margin:28rpx 0 18rpx;color:#64748b;font-size:27rpx}.career-row{display:flex;align-items:center;padding:18rpx 0;border-bottom:1rpx solid #eef1f5}.career-index{width:42rpx;height:42rpx;line-height:42rpx;text-align:center;border-radius:50%;background:#e8f1ff;color:#1b76fe;font-size:24rpx;margin-right:18rpx}.career-name{font-size:30rpx;color:#334155}.ending{display:block;margin-top:32rpx;text-align:center;font-size:30rpx;font-weight:700;color:#d97745}button{margin-top:38rpx}.button-hover{opacity:.8;transform:scale(.98)}
</style>
