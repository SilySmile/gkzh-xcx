<template>
  <view class="page">
    <view class="header">
      <text class="title">我的未来职业探索清单</text>
      <text class="limit">清单上限 6/6</text>
      <text class="hint">这些是你主动关注的职业</text>
    </view>

    <view class="section">
      <text class="section-title">我想进一步了解（{{ items.length }}/6）</text>
      <view v-for="item in items" :key="item.careerId" class="item">
        <view class="item-content"><text class="item-name">{{ item.careerName }}</text><text class="item-intro">{{ item.oneLineIntro || '暂无一句话介绍' }}</text></view>
        <button v-if="!readOnly" class="trash-button" hover-class="button-hover" size="mini" @click="remove(item)">🗑</button>
      </view>
      <text v-if="!items.length" class="empty-tip">没关系，今天不一定要找到“最想探索的职业”。\n你刚刚已经认识了一个职业，未来还可以继续探索更多可能。</text>

      <button v-if="!readOnly" class="add-other" hover-class="button-hover" :disabled="items.length >= 6" @click="showOther = !showOther">{{ items.length >= 6 ? '清单已满，请先删除后再添加' : (showOther ? '收起其他职业' : '添加其他职业') }}</button>
      <view v-if="showOther && !readOnly" class="other-panel">
        <picker mode="selector" :range="categories" range-key="name" @change="categoryChanged">
          <view class="category-picker">{{ selectedCategoryName || '请选择职业大类' }}<text class="picker-arrow">⌄</text></view>
        </picker>
        <input v-model="keyword" class="search" placeholder="搜索职业名称" />
        <text v-if="!selectedCategoryId" class="category-tip">请先选择职业大类，再选择要添加的职业</text>
        <view v-for="item in filteredCareers" :key="item.careerId" class="other-row">
          <view class="item-content"><text class="item-name">{{ item.careerName }}</text><text class="item-intro">{{ item.oneLineIntro || '暂无一句话介绍' }}</text></view>
          <button v-if="!isAdded(item) && items.length < 6" class="plus-button" type="primary" hover-class="button-hover" size="mini" :disabled="addingCareerId === item.careerId" @click="add(item)">＋</button>
          <text v-else-if="isAdded(item)" class="added">已加入</text>
          <text v-else class="added limit-reached">已达上限</text>
        </view>
        <text class="limit-tip">最多可加入6个职业，达到上限后需删除再添加。</text>
      </view>
    </view>

    <view class="section today">
      <view class="today-head"><text class="section-title">今日认识</text><text class="today-count">{{ todayViewed.length }} 个</text></view>
      <text class="today-sub">已查看但未加入的职业</text>
      <text v-for="item in todayViewed" :key="item.careerId" class="today-item">{{ item.careerName }}</text>
      <text v-if="!todayViewed.length" class="empty-line">暂无已查看但未加入的职业</text>
    </view>

    <view class="footer-actions">
      <button v-if="!readOnly" type="primary" hover-class="button-hover" @click="finish">确认我的探索清单</button>
      <button v-else type="primary" hover-class="button-hover" @click="download">下载探索清单 PDF</button>
      <button hover-class="button-hover" @click="continueExplore">继续探索更多职业</button>
    </view>
  </view>
</template>

<script>
import { getExploration, getCatalog, removeExplorationItem, addExplorationItem, finishRecord, downloadReportPdf, userMessage } from '@/api/zycck'

export default {
  data: () => ({ recordId: '', instanceId: '', gameId: '', items: [], allCareers: [], categories: [], viewedIds: [], readOnly: false, showOther: false, keyword: '', selectedCategoryId: '', addingCareerId: '' }),
  computed: {
    selectedCategoryName() { const item = this.categories.find(x => String(x.categoryId || x.id) === String(this.selectedCategoryId)); return item ? (item.name || item.categoryName || '') : '' },
    filteredCareers() { if (!this.selectedCategoryId) return []; const key = this.keyword.trim(); return this.allCareers.filter(x => String(x.categoryId) === String(this.selectedCategoryId) && (!key || String(x.careerName).includes(key))) },
    todayViewed() { const added = this.items.map(x => String(x.careerId)); return this.allCareers.filter(x => this.viewedIds.some(id => String(id) === String(x.careerId)) && !added.includes(String(x.careerId))) }
  },
  onLoad(o) { Object.assign(this, { recordId: o.recordId || '', instanceId: o.instanceId || '', gameId: o.gameId || '', readOnly: o.readOnly === '1' }); this.load() },
  methods: {
    async load() { try { const [r, c] = await Promise.all([getExploration(this.recordId), getCatalog({ instanceId: this.instanceId, gameId: this.gameId })]); const d = r.data || {}; this.items = d.items || d.explorationItems || []; this.readOnly = this.readOnly || d.readOnly === true; const raw = d.viewedCareerIds || []; this.viewedIds = Array.isArray(raw) ? raw : JSON.parse(raw || '[]'); const catalog = c.data || {}; this.categories = catalog.categories || []; const rows = catalog.careers || []; this.allCareers = rows.filter(x => String(x.hasQuestion) !== '1').map(x => ({ ...x, careerId: x.careerId || x.careerQuestionId, careerName: x.careerName || x.name || x.title })) } catch (e) { uni.showToast({ title: userMessage(e, '探索清单加载失败，请重试'), icon: 'none' }) } },
    categoryChanged(e) { const index = Number(e.detail && e.detail.value); const item = this.categories[index]; this.selectedCategoryId = item ? (item.categoryId || item.id) : ''; this.keyword = '' },
    isAdded(i) { return this.items.some(x => String(x.careerId) === String(i.careerId)) },
    async add(i) { if (this.isAdded(i)) return uni.showToast({ title: '该职业已在探索清单中', icon: 'none' }); if (this.items.length >= 6) return uni.showToast({ title: '探索清单最多添加6个职业', icon: 'none' }); if (this.addingCareerId) return; this.addingCareerId = i.careerId; try { const result = await addExplorationItem(this.recordId, i.careerId); if (result && result.code && Number(result.code) !== 200) throw new Error(result.msg || '探索清单最多添加6个职业'); await this.load() } catch (e) { uni.showToast({ title: userMessage(e, '加入清单失败，请重试'), icon: 'none' }) } finally { this.addingCareerId = '' } },
    async remove(i) { try { await removeExplorationItem(this.recordId, i.careerId); await this.load() } catch (e) { uni.showToast({ title: userMessage(e, '移除清单失败，请重试'), icon: 'none' }) } },
    async finish() { try { await finishRecord(this.recordId); this.readOnly = true; this.showOther = false; uni.showToast({ title: '探索清单已确认', icon: 'success' }) } catch (e) { uni.showToast({ title: userMessage(e, '请先查看至少一个职业'), icon: 'none' }) } },
    async download() { try { uni.showLoading({ title: '生成 PDF' }); const r = await downloadReportPdf({ recordId: this.recordId }); const path = r.tempFilePath || r.filePath; if (path) uni.openDocument({ filePath: path, showMenu: true, fileType: 'pdf' }); else throw new Error('PDF 下载失败') } catch (e) { uni.showToast({ title: userMessage(e, 'PDF 下载失败，请稍后重试'), icon: 'none' }) } finally { uni.hideLoading() } },
    continueExplore() { uni.redirectTo({ url: `/pages/zycck/categories?recordId=${this.recordId}&instanceId=${this.instanceId}&gameId=${this.gameId}&readOnly=${this.readOnly ? '1' : '0'}` }) }
  }
}
</script>

<style scoped>
.page{padding:48rpx 32rpx 60rpx;background:#f5f7fb;min-height:100vh;box-sizing:border-box;animation:pageIn .35s ease-out}.header{text-align:center;margin-bottom:30rpx}.title{display:block;font-size:50rpx;font-weight:800;color:#1a2c4a}.limit{display:inline-block;margin-top:16rpx;padding:8rpx 18rpx;border-radius:20rpx;background:#e8f1ff;color:#1b76fe;font-size:24rpx}.hint{display:block;color:#64748b;font-size:24rpx;margin-top:12rpx}.section{background:#fff;border-radius:20rpx;padding:28rpx 24rpx;margin-bottom:24rpx;box-shadow:0 6rpx 20rpx rgba(31,41,55,.05)}.section-title{font-size:32rpx;font-weight:700;color:#27364a}.item,.other-row{display:flex;align-items:center;justify-content:space-between;padding:24rpx 0;border-bottom:1rpx solid #edf0f4}.item-content{flex:1;min-width:0;padding-right:18rpx}.item-name{display:block;font-size:30rpx;color:#263548}.item-intro{display:block;color:#8a94a6;font-size:23rpx;line-height:1.5;margin-top:8rpx}.trash-button,.plus-button{width:76rpx;min-width:76rpx;margin:0;padding:0}.trash-button{color:#e34d59;background:#fff0f0}.add-other{margin-top:26rpx}.other-panel{margin-top:20rpx}.search{background:#f5f7fb;border-radius:12rpx;padding:20rpx 24rpx}.added{color:#42a868;font-size:25rpx}.limit-tip,.empty-tip{display:block;color:#8a94a6;font-size:24rpx;line-height:1.7;margin:22rpx 0;text-align:center;white-space:pre-line}.today-head{display:flex;align-items:center;justify-content:space-between}.today-count{color:#d97745;font-weight:700}.today-sub{display:block;color:#8a94a6;font-size:23rpx;margin:8rpx 0 14rpx}.today-item{display:block;color:#4b5563;font-size:27rpx;padding:10rpx 0}.empty-line{display:block;color:#a1a8b2;font-size:24rpx;padding:18rpx 0}.footer-actions button{margin-top:16rpx}.button-hover{opacity:.78;transform:scale(.98)}@keyframes pageIn{from{opacity:0;transform:translateY(18rpx)}to{opacity:1;transform:translateY(0)}}
.button-hover{transform:none!important}.card-hover{transform:none!important}.awareness-hover{transform:none!important}.category-picker{display:flex;align-items:center;justify-content:space-between;background:#f5f7fb;border:1rpx solid #e5eaf1;border-radius:12rpx;padding:20rpx 24rpx;color:#34445a;font-size:27rpx;margin-bottom:16rpx}.picker-arrow{color:#8a94a6;font-size:28rpx}.category-tip{display:block;padding:28rpx 0;color:#8a94a6;font-size:25rpx;text-align:center}.limit-reached{color:#a1a8b2}</style>
