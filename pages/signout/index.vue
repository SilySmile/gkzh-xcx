<template>
  <view class="container">
    <uni-nav-bar
      dark
      :fixed="true"
      shadow
      background-color="#007AFF"
      status-bar
      title="活动签退"
      left-icon="left"
      @clickLeft="back"
      :border="false"
    />
    <view class="signout-content">
      <view class="signout-btn-container">
        <button class="signout-btn" @click="showConfirm">签退</button>
      </view>
    </view>
  </view>
</template>

<script>
import { signout } from '@/api/checkin'
import { completeActivityWeekGame } from '@/utils/activity'
export default {
  data() {
    return {
      msg: '',
      activityId: '',
      gameId: null
    }
  },
  onLoad(options) {
    this.activityId = options.activityId || uni.getStorageSync('activityId')
    this.gameId = options.gameId || null
    // 禁止下拉刷新
    uni.stopPullDownRefresh()
  },
  // 页面配置
  onPageScroll() {
    // 禁止页面滚动
    return false
  },
  methods: {
    back() {
      uni.navigateBack()
    },
    showConfirm() {
      uni.showModal({
        title: '确认签退',
        content: '确定要签退当前活动吗？',
        confirmText: '确认',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.handleSignout()
          }
        }
      })
    },
      async handleSignout() {
          const studentId = uni.getStorageSync('studentId')
          const activityId = uni.getStorageSync('activityId')
          console.log(studentId, activityId)

          try {
              const res = await signout({activityId})
              await completeActivityWeekGame(this.gameId, { result: res.data }).catch(() => {})
              this.msg = res.msg || '签退成功'
              uni.showToast({title: res.msg || '签退成功', icon: 'success'});
              // 延迟跳转到首页
              setTimeout(() => {
                  uni.redirectTo({
                      url: '/pages/index/index'
                  })
              }, 1500)
          } catch (err) {
              uni.showToast({title: err.message || '签退失败', icon: 'none'});
          }
      }
  }
}
</script>

<style scoped>
.container {
  height: calc(100vh - 44px);
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.signout-content {
  text-align: center;
  width: 100%;
  padding: 0 40rpx;
  box-sizing: border-box;
}

.signout-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 20rpx;
}

.signout-desc {
  font-size: 28rpx;
  color: #7f8c8d;
  margin-bottom: 60rpx;
}

.signout-btn-container {
  display: flex;
  justify-content: center;
}

.signout-btn {
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: #fff;
  border: none;
  font-size: 32rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(52, 152, 219, 0.3);
  transition: all 0.3s ease;
}

.signout-btn:active {
  transform: scale(0.95);
  box-shadow: 0 4rpx 12rpx rgba(52, 152, 219, 0.4);
}
</style> 
