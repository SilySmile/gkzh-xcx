<template>
	<view class="login-container">
		<!-- 标题区 -->
		<view class="header" :class="{ 'fade-in': pageReady }">
			<text class="title">登录</text>
			<text class="subtitle">欢迎回来</text>
		</view>

		<!-- 表单区 -->
		<view class="form-card" :class="{ 'fade-in': pageReady }">
			<!-- 学校选择 -->
			<view class="form-item">
				<text class="label">学校</text>
				<view
					class="picker-wrap"
					:class="{ 'focused': pickerFocused, 'shake': errors.schoolId }"
					@click="toggleSchoolPicker"
				>
					<text :class="{ placeholder: !form.schoolName }">
						{{ form.schoolName || '请选择学校' }}
					</text>
					<text class="picker-arrow">▾</text>
				</view>
				<text v-if="errors.schoolId" class="error-tip">{{ errors.schoolId }}</text>
			</view>

			<!-- 学号 -->
			<view class="form-item">
				<text class="label">学号</text>
				<view class="input-wrap" :class="{ 'focused': focusFields.studentNo, 'shake': errors.studentNo }">
					<text class="input-icon">👤</text>
					<input
						v-model="form.studentNo"
						class="form-input"
						placeholder="请输入学号"
						placeholder-style="color:#b0bec5"
						@focus="focusFields.studentNo = true"
						@blur="focusFields.studentNo = false; validateField('studentNo')"
					/>
				</view>
				<text v-if="errors.studentNo" class="error-tip">{{ errors.studentNo }}</text>
			</view>

			<!-- 密码 -->
			<view class="form-item">
				<text class="label">密码</text>
				<view class="input-wrap" :class="{ 'focused': focusFields.password, 'shake': errors.password }">
					<text class="input-icon">🔒</text>
					<input
						v-model="form.password"
						class="form-input"
						:password="!showPassword"
						placeholder="请输入密码"
						placeholder-style="color:#b0bec5"
						@focus="focusFields.password = true"
						@blur="focusFields.password = false; validateField('password')"
					/>
					<text class="toggle-pwd" @click="showPassword = !showPassword">
						{{ showPassword ? '🙈' : '👁' }}
					</text>
				</view>
				<text v-if="errors.password" class="error-tip">{{ errors.password }}</text>
			</view>

			<!-- 登录按钮 -->
			<button
				class="login-btn"
				:class="{ loading: submitting }"
				:disabled="submitting"
				@click="onLogin"
			>
				<view v-if="submitting" class="btn-loading">
					<view class="spinner"></view>
					<text>登录中...</text>
				</view>
				<text v-else>登录</text>
			</button>
		</view>

		
				<!-- 底部链接 -->
        		<view class="bottom-links" :class="{ 'fade-in': pageReady }">
        			<text class="link" @click="onGuest">暂不登录，跳转游客模式</text>
        			<text class="link" @click="onForgot">忘记密码？</text>
        			<text class="link" @click="onStaff">工作人员入口</text>
        			<text class="link highlight" @click="onRegister">没有账号？去注册</text>
        		</view>


		<!-- 学校选择遮罩 + 下拉 -->
		<view v-if="pickerFocused" class="picker-overlay" @click="toggleSchoolPicker">
			<view class="picker-dropdown" @click.stop>
				<scroll-view scroll-y class="picker-scroll">
					<view
						v-for="school in schoolList"
						:key="school.schoolId"
						class="picker-option"
						:class="{ selected: form.schoolId === school.schoolId }"
						@click="onSelectSchool(school)"
					>
						<text>{{ school.title }}</text>
						<text v-if="form.schoolId === school.schoolId" class="check">✓</text>
					</view>
					<view v-if="schoolList.length === 0" class="picker-empty">暂无学校数据</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script>

import { getAllSchools, loginStudent, getProfile } from '@/api/checkin'

export default {
	data() {
		return {
			pageReady: false,
			activityId: '',
			schoolList: [],
			pickerFocused: false,
			showPassword: false,
			submitting: false,
			focusFields: { studentNo: false, password: false },
			form: {
				schoolId: '',
				schoolName: '',
				studentNo: '',
				password: ''
			},
			errors: {
				schoolId: '',
				studentNo: '',
				password: ''
			}
		}
	},
	onLoad(options) {
		this.activityId = options.activityId || uni.getStorageSync('activityId') || '0'
		const token = uni.getStorageSync('token')
		if (token) {
			getProfile().then(res => {
				if (res.code === 200 && res.data) {
					this.saveProfile(res.data)
					uni.redirectTo({ url: '/pages/mp/home/index' })
				} else {
					uni.removeStorageSync('token')
					uni.reLaunch({ url: '/pages/mp/login/index' })
				}
			}).catch(() => {})
			return
		}

		getAllSchools().then(res => {
			if (res.code === 200) {
				this.schoolList = res.data || []
			}
		}).catch(() => {
			uni.showToast({ title: '学校列表加载失败', icon: 'none' })
		})

		this.$nextTick(() => {
			setTimeout(() => { this.pageReady = true }, 100)
		})
	},
	methods: {
		saveProfile(data) {
			uni.setStorageSync('studentName', data.studentName || '')
			uni.setStorageSync('studentNo', data.studentNo || '')
			if (data.schoolId !== undefined && data.schoolId !== null) {
				uni.setStorageSync('schoolId', data.schoolId)
			}
			if (data.schoolName) {
				uni.setStorageSync('schoolName', data.schoolName)
			}
			if (data.departmentName) {
				uni.setStorageSync('majorName', data.departmentName)
			}
			if (data.gender !== undefined && data.gender !== null) {
				uni.setStorageSync('gender', data.gender)
			}
		},
		toggleSchoolPicker() {
			this.pickerFocused = !this.pickerFocused
		},
		onSelectSchool(school) {
			this.form.schoolId = school.schoolId
			this.form.schoolName = school.title
			this.pickerFocused = false
			this.errors.schoolId = ''
		},
		validateField(field) {
			if (field === 'studentNo' && !this.form.studentNo.trim()) {
				this.errors.studentNo = '请输入学号'
			} else {
				this.errors.studentNo = ''
			}
			if (field === 'password' && !this.form.password) {
				this.errors.password = '请输入密码'
			} else {
				this.errors.password = ''
			}
		},
		validate() {
			let valid = true
			if (!this.form.schoolId) {
				this.errors.schoolId = '请选择学校'
				valid = false
			}
			if (!this.form.studentNo.trim()) {
				this.errors.studentNo = '请输入学号'
				valid = false
			}
			if (!this.form.password) {
				this.errors.password = '请输入密码'
				valid = false
			}
			return valid
		},
		onLogin() {
			if (!this.validate()) return
			if (this.submitting) return
			this.submitting = true

			loginStudent({
				schoolId: this.form.schoolId,
				studentNo: this.form.studentNo,
				password: this.form.password
			}).then(res => {
				if (res.code === 200 && res.data && res.data.token) {
				    uni.setStorageSync('schoolName', this.form.schoolName)
                    uni.setStorageSync('schoolId', this.form.schoolId)
                    uni.setStorageSync('studentName', res.data.studentName)
                    uni.setStorageSync('studentNo', this.form.studentNo)
					uni.setStorageSync('token', res.data.token)
					uni.showToast({ title: '登录成功', icon: 'success' })
					// 优先取后端返回的专业名，没有则暂不存
                    if (res.data.departmentName || res.data.majorName) {
                    	uni.setStorageSync('majorName', res.data.departmentName || res.data.majorName)
                    }
                    // 性别
                    					if (res.data.gender !== undefined) {
                    						uni.setStorageSync('gender', res.data.gender)
                    					}
					setTimeout(() => {
						uni.redirectTo({ url: '/pages/mp/home/index' })
					}, 800)
				} else {
					uni.showToast({ title: res.msg || '登录失败', icon: 'none' })
				}
			}).catch(err => {
				uni.showToast({ title: err.message || '网络错误', icon: 'none' })
			}).finally(() => {
				this.submitting = false
			})
		},
		onGuest() {
			uni.showToast({ title: '游客模式开发中', icon: 'none' })
		},
		onForgot() {
			uni.showToast({ title: '请联系工作人员', icon: 'none' })
		},
		onStaff() {
			uni.navigateTo({ url: '/pages/staff/login' })
		},
		onRegister() {
			const params = this.activityId ? '?activityId=' + this.activityId : ''
			uni.navigateTo({ url: '/pages/mp/register/index' + params })
		}
	}
}
</script>

<style scoped>
.login-container {
	min-height: 100vh;
	background: linear-gradient(160deg, #b8d8f0 0%, #dce8f6 45%, #eaf2fb 100%);
	padding: 0 48rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
}

/* ── 标题 ── */
.header {
	margin-top: 160rpx;
	text-align: center;
	opacity: 0;
	transform: translateY(-30rpx);
	transition: all 0.6s ease;
}
.header.fade-in {
	opacity: 1;
	transform: translateY(0);
}
.title {
	font-size: 56rpx;
	font-weight: 800;
	color: #1a2c4a;
	display: block;
	letter-spacing: 6rpx;
}
.subtitle {
	font-size: 28rpx;
	color: #607d9b;
	margin-top: 12rpx;
	display: block;
}

/* ── 表单卡片 ── */
.form-card {
	width: 100%;
	margin-top: 64rpx;
	opacity: 0;
	transform: translateY(20rpx);
	transition: all 0.6s ease 0.2s;
}
.form-card.fade-in {
	opacity: 1;
	transform: translateY(0);
}

/* ── 表单项 ── */
.form-item {
	margin-bottom: 36rpx;
}
.label {
	font-size: 26rpx;
	font-weight: 600;
	color: #3a5068;
	margin-bottom: 14rpx;
	display: block;
}

/* ── 输入框 ── */
.input-wrap {
	display: flex;
	align-items: center;
	background: white;
	border-radius: 24rpx;
	padding: 0 28rpx;
	height: 100rpx;
	border: 3rpx solid transparent;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
	transition: border-color 0.25s, box-shadow 0.25s;
}
.input-wrap.focused {
	border-color: #4a90e2;
	box-shadow: 0 4rpx 20rpx rgba(74,144,226,0.18);
}
.input-icon {
	font-size: 36rpx;
	margin-right: 18rpx;
}
.form-input {
	flex: 1;
	font-size: 30rpx;
	color: #1a2c4a;
	height: 100rpx;
}
.toggle-pwd {
	font-size: 36rpx;
	padding: 10rpx;
}

/* ── 选择器 ── */
.picker-wrap {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: white;
	border-radius: 24rpx;
	padding: 0 28rpx;
	height: 100rpx;
	border: 3rpx solid transparent;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
	transition: border-color 0.25s;
}
.picker-wrap.focused {
	border-color: #4a90e2;
}
.picker-wrap .placeholder {
	color: #b0bec5;
	font-size: 30rpx;
}
.picker-arrow {
	font-size: 28rpx;
	color: #94a3b8;
	transition: transform 0.25s;
}
.picker-wrap.focused .picker-arrow {
	transform: rotate(180deg);
}

/* ── 错误提示 ── */
.error-tip {
	font-size: 22rpx;
	color: #e74c3c;
	margin-top: 10rpx;
	padding-left: 28rpx;
	display: block;
	animation: fadeInDown 0.25s ease;
}

/* ── 晃动动画 ── */
@keyframes shake {
	0%, 100% { transform: translateX(0); }
	20% { transform: translateX(-12rpx); }
	40% { transform: translateX(12rpx); }
	60% { transform: translateX(-8rpx); }
	80% { transform: translateX(8rpx); }
}
.shake {
	animation: shake 0.45s ease;
	border-color: #e74c3c !important;
}

@keyframes fadeInDown {
	from { opacity: 0; transform: translateY(-10rpx); }
	to   { opacity: 1; transform: translateY(0); }
}

/* ── 登录按钮 ── */
.login-btn {
	width: 100%;
	height: 100rpx;
	background: linear-gradient(135deg, #4a90e2, #3570c0);
	border-radius: 50rpx;
	border: none;
	color: white;
	font-size: 34rpx;
	font-weight: 700;
	margin-top: 30rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 8rpx 28rpx rgba(74,144,226,0.35);
	transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
}
.login-btn:active {
	transform: scale(0.97);
	box-shadow: 0 4rpx 16rpx rgba(74,144,226,0.25);
}
.login-btn.loading {
	opacity: 0.75;
	pointer-events: none;
}
.btn-loading {
	display: flex;
	align-items: center;
	gap: 16rpx;
}
.spinner {
	width: 32rpx;
	height: 32rpx;
	border: 4rpx solid rgba(255,255,255,0.4);
	border-top-color: white;
	border-radius: 50%;
	animation: spin 0.7s linear infinite;
}
@keyframes spin {
	to { transform: rotate(360deg); }
}

/* ── 底部链接 ── */
.bottom-links {
	width: 100%;
	margin-top: 44rpx;
	opacity: 0;
	transition: all 0.6s ease 0.4s;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 28rpx;
}
.bottom-links.fade-in {
	opacity: 1;
}

.link {
	font-size: 24rpx;
	color: #607d9b;
	position: relative;
	padding-bottom: 4rpx;
}
.link::after {
	content: '';
	position: absolute;
	bottom: 0;
	left: 50%;
	transform: translateX(-50%);
	width: 0;
	height: 2rpx;
	background: #4a90e2;
	transition: width 0.25s;
}
.link:active::after {
	width: 100%;
}
.link.highlight {
	color: #4a90e2;
	font-weight: 600;
}

/* ── 学校下拉遮罩 ── */
.picker-overlay {
	position: fixed;
	inset: 0;
	background: rgba(0,0,0,0.35);
	z-index: 999;
	display: flex;
	justify-content: center;
	align-items: flex-start;
	padding-top: 30vh;
	animation: fadeIn 0.2s ease;
}
@keyframes fadeIn {
	from { opacity: 0; }
	to   { opacity: 1; }
}
.picker-dropdown {
	width: 620rpx;
	max-height: 520rpx;
	background: white;
	border-radius: 28rpx;
	overflow: hidden;
	box-shadow: 0 16rpx 48rpx rgba(0,0,0,0.15);
	animation: slideDown 0.25s ease;
}
@keyframes slideDown {
	from { opacity: 0; transform: translateY(-30rpx); }
	to   { opacity: 1; transform: translateY(0); }
}
.picker-scroll {
	max-height: 520rpx;
}
.picker-option {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 30rpx 36rpx;
	font-size: 30rpx;
	color: #1a2c4a;
	border-bottom: 1rpx solid #f0f3f8;
	transition: background 0.15s;
}
.picker-option:active {
	background: #f5f8fc;
}
.picker-option.selected {
	color: #4a90e2;
	font-weight: 600;
	background: #f0f6ff;
}
.check {
	color: #4a90e2;
	font-weight: 700;
	font-size: 32rpx;
}
.picker-empty {
	text-align: center;
	padding: 60rpx;
	color: #94a3b8;
	font-size: 28rpx;
}
</style>
