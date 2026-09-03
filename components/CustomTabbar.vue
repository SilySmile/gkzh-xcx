<template>
  <view class="custom-tabbar">
    <view class="tabbar-item" @click="onTab('home')">
      <image class="tabbar-icon" :src="activeTab === 'home' ? '/static/tabbar/home_selected.png' : '/static/tabbar/home.png'" />
      <view :class="['tabbar-label', { 'active-label': activeTab === 'home' }]">首页</view>
    </view>
    <view class="tabbar-item" @click="onTab('study')">
      <image class="tabbar-icon" :src="activeTab === 'study' ? '/static/tabbar/study_selected.png' : '/static/tabbar/study.png'" />
      <view :class="['tabbar-label', { 'active-label': activeTab === 'study' }]">学习</view>
    </view>
    <view class="tabbar-item" style="flex:0.5"></view>
    <view class="tabbar-item" @click="onTab('practice')">
      <image class="tabbar-icon" :src="activeTab === 'practice' ? '/static/tabbar/practice_selected.png' : '/static/tabbar/practice.png'" />
      <view :class="['tabbar-label', { 'active-label': activeTab === 'practice' }]">实践</view>
    </view>
    <view class="tabbar-item" @click="onTab('mine')">
      <image class="tabbar-icon" :src="activeTab === 'mine' ? '/static/tabbar/mine_selected.png' : '/static/tabbar/mine.png'" />
      <view :class="['tabbar-label', { 'active-label': activeTab === 'mine' }]">我的</view>
    </view>
    <view class="tabbar-center-abs" @click="onTab('ai')">
      <view class="center-btn" :class="{ 'center-btn-active': activeTab === 'ai' }">
        <image class="center-icon" :src="activeTab === 'ai' ? '/static/tabbar/ai_selected.png' : '/static/tabbar/ai.png'" />
      </view>
      <view :class="['tabbar-label', 'center-label', { 'active-label': activeTab === 'ai' }]">AI就业</view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'CustomTabbar',
  props: {
    active: {
      type: String,
      default: 'home'
    }
  },
  data() {
    return {
      activeTab: this.active
    }
  },
  watch: {
    active(val) {
      this.activeTab = val
    }
  },
  methods: {
    onTab(tab) {
      this.activeTab = tab;
      this.$emit('update:active', tab); // 支持v-model
      // 路由跳转
      const map = {
        home: '/pages/index/index',
        study: '/pages/checkin/index',
        practice: '/pages/lottery/index',
        mine: '/pages/mine/index',
        ai: '/pages/ai/index'
      };
      if (map[tab]) {
        // uni.switchTab({
        //   url: map[tab]
        // });
		uni.reLaunch({ url: map[tab] });
      }
    }
  }
}
</script>

<style scoped>
.custom-tabbar {
  position: fixed;
  left: 0;
  bottom: 0rpx;
  width: 100vw;
  height: 110rpx;
  background: #fff;
  box-shadow: 0 -2rpx 12rpx #e0e0e0;
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  z-index: 99;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
.tabbar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-bottom: 10rpx;
}
.tabbar-icon {
  width: 44rpx;
  height: 44rpx;
  margin-bottom: 2rpx;
}
.tabbar-label {
  font-size: 22rpx;
  color: #888;
}
.active-label {
  color: #007aff;
  font-weight: bold;
}
.tabbar-center-abs {
  position: absolute;
  left: 50%;
  bottom: -40rpx;
  transform: translateX(-50%) translateY(-50rpx);
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.center-btn {
  width: 90rpx;
  height: 90rpx;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2rpx 12rpx #ffd700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: box-shadow 0.2s;
  position:relative;
  bottom:-5rpx;
}
.center-btn-active {
  box-shadow: 0 2rpx 18rpx #007aff;
}
.center-icon {
  width: 60rpx;
  height: 60rpx;
}
.center-label {
  margin-top: 20rpx;
  font-size: 22rpx;
}
</style> 