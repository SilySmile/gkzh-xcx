<template>
  <view class="page">
    <view class="card">
      <text class="title" style="margin-bottom: 24rpx;">工作人员登录</text>
      <input v-model.trim="form.username" placeholder="账号" class="input" />
      <input v-model="form.password" password placeholder="密码" class="input" @confirm="login" />
      <button class="button" :loading="loading" @click="login">登录</button>
    </view>
  </view>
</template>
<script>
import { staffLogin } from '@/api/staff.js'
export default {
  data: () => ({ form: { username: '', password: '' }, loading: false }),
  methods: {
    back() {
      const pages = getCurrentPages()
      if (pages.length > 1) return uni.navigateBack()
      uni.reLaunch({ url: '/pages/mp/login/index' })
    },
    async login() {
      if (!this.form.username || !this.form.password) return uni.showToast({ title: '请输入账号和密码', icon: 'none' })
      this.loading = true
      try {
        const res = await staffLogin(this.form)
        uni.setStorageSync('staffToken', res.data.token)
        uni.setStorageSync('staffProfile', res.data.staff)
        uni.reLaunch({ url: '/pages/staff/index' })
      } catch (e) { uni.showToast({ title: e.message, icon: 'none' }) } finally { this.loading = false }
    }
  }
}
</script>
<style scoped>
.page{min-height:100vh;background:#f4f7fb;padding:180rpx 48rpx 0;box-sizing:border-box;position:relative}.back-button{position:absolute;right:32rpx;top:36rpx;color:#2f80ed;font-size:34rpx;z-index:2}.back-button text{font-size:24rpx;margin-left:6rpx}.card{background:#fff;border-radius:24rpx;padding:52rpx 36rpx;box-shadow:0 8rpx 28rpx rgba(26,44,74,.08)}.title{display:block;font-size:40rpx;font-weight:700;color:#1a2c4a}.hint{display:block;font-size:24rpx;color:#8190a5;margin:16rpx 0 42rpx}.input{height:88rpx;border:1rpx solid #dbe3ef;border-radius:12rpx;margin-bottom:22rpx;padding:0 24rpx;font-size:28rpx}.button{background:#2f80ed;color:#fff;border-radius:44rpx;margin-top:20rpx}
</style>
