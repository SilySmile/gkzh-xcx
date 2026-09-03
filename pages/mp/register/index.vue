<template>
	<view class="register-container">
		<!-- 标题 -->
		<view class="header" :class="{ 'fade-in': pageReady }">
			<text class="title">注册</text>
			<text class="subtitle">创建你的账号</text>
		</view>

		<!-- 表单 -->
		<scroll-view scroll-y class="form-scroll" :class="{ 'fade-in': pageReady }">
			<!-- 学校 -->
			<view class="form-item">
				<text class="label">学校</text>
				<view
					class="picker-wrap"
					:class="{ 'focused': pickerType === 'school', 'shake': errors.schoolId }"
					@click="openPicker('school')"
				>
					<text :class="{ placeholder: !form.schoolName }">{{ form.schoolName || '请选择学校' }}</text>
					<text class="picker-arrow">▾</text>
				</view>
				<text v-if="errors.schoolId" class="error-tip">{{ errors.schoolId }}</text>
			</view>

			<!-- 院系 -->
			<view class="form-item">
				<text class="label">院系</text>
				<view
					class="picker-wrap"
					:class="{ 'focused': pickerType === 'college', 'shake': errors.collegeId }"
					@click="openPicker('college')"
				>
					<text :class="{ placeholder: !form.collegeName }">{{ form.collegeName || '请选择院系' }}</text>
					<text class="picker-arrow">▾</text>
				</view>
				<text v-if="errors.collegeId" class="error-tip">{{ errors.collegeId }}</text>
			</view>

			<!-- 专业（二级） -->
			<view class="form-item">
				<text class="label">专业</text>
				<view
					class="picker-wrap"
					:class="{ 'focused': pickerType === 'major', 'shake': errors.departmentId }"
					@click="openPicker('major')"
				>
					<text :class="{ placeholder: !form.departmentName }">{{ form.departmentName || '请选择专业' }}</text>
					<text class="picker-arrow">▾</text>
				</view>
				<text v-if="errors.departmentId" class="error-tip">{{ errors.departmentId }}</text>
			</view>

			<!-- 学号 -->
			<view class="form-item">
				<text class="label">学号</text>
				<view class="input-wrap" :class="{ 'focused': focusFields.studentNo, 'shake': errors.studentNo }">
					<input v-model="form.studentNo" class="form-input" placeholder="请输入学号"
						placeholder-style="color:#b0bec5"
						@focus="focusFields.studentNo = true"
						@blur="focusFields.studentNo = false" />
				</view>
				<text v-if="errors.studentNo" class="error-tip">{{ errors.studentNo }}</text>
			</view>

			<!-- 确认学号 -->
			<view class="form-item">
				<text class="label">确认学号</text>
				<view class="input-wrap" :class="{ 'focused': focusFields.confirmNo, 'shake': errors.confirmNo }">
					<input v-model="form.confirmNo" class="form-input" placeholder="请再次输入学号"
						placeholder-style="color:#b0bec5"
						@focus="focusFields.confirmNo = true"
						@blur="focusFields.confirmNo = false" />
				</view>
				<text v-if="errors.confirmNo" class="error-tip">{{ errors.confirmNo }}</text>
			</view>

			<!-- 密码 -->
			<view class="form-item">
				<text class="label">密码</text>
				<view class="input-wrap" :class="{ 'focused': focusFields.password, 'shake': errors.password }">
					<input v-model="form.password" class="form-input" :password="!showPwd" placeholder="请输入密码"
						placeholder-style="color:#b0bec5"
						@focus="focusFields.password = true"
						@blur="focusFields.password = false" />
					<text class="toggle-pwd" @click="showPwd = !showPwd">{{ showPwd ? '🙈' : '👁' }}</text>
				</view>
				<text v-if="errors.password" class="error-tip">{{ errors.password }}</text>
			</view>

			<!-- 确认密码 -->
			<view class="form-item">
				<text class="label">确认密码</text>
				<view class="input-wrap" :class="{ 'focused': focusFields.confirmPwd, 'shake': errors.confirmPwd }">
					<input v-model="form.confirmPwd" class="form-input" :password="!showConfirmPwd" placeholder="请再次输入密码"
						placeholder-style="color:#b0bec5"
						@focus="focusFields.confirmPwd = true"
						@blur="focusFields.confirmPwd = false" />
					<text class="toggle-pwd" @click="showConfirmPwd = !showConfirmPwd">{{ showConfirmPwd ? '🙈' : '👁' }}</text>
				</view>
				<text v-if="errors.confirmPwd" class="error-tip">{{ errors.confirmPwd }}</text>
			</view>

			<!-- 姓名 -->
			<view class="form-item">
				<text class="label">姓名</text>
				<view class="input-wrap" :class="{ 'focused': focusFields.name, 'shake': errors.name }">
					<input v-model="form.name" class="form-input" placeholder="请输入姓名"
						placeholder-style="color:#b0bec5"
						@focus="focusFields.name = true"
						@blur="focusFields.name = false" />
				</view>
				<text v-if="errors.name" class="error-tip">{{ errors.name }}</text>
			</view>

			<!-- 性别 -->
			<view class="form-item">
				<text class="label">性别</text>
				<view class="radio-row">
					<view class="radio-item" :class="{ active: form.gender === '0' }" @click="form.gender = '0'">
						<view class="radio-dot"></view>
						<text>男</text>
					</view>
					<view class="radio-item" :class="{ active: form.gender === '1' }" @click="form.gender = '1'">
						<view class="radio-dot"></view>
						<text>女</text>
					</view>
				</view>
				<text v-if="errors.gender" class="error-tip">{{ errors.gender }}</text>
			</view>

			<!-- 手机号 -->
			<view class="form-item">
				<text class="label">手机号</text>
				<view class="input-wrap" :class="{ 'focused': focusFields.phone, 'shake': errors.phone }">
					<input v-model="form.phone" class="form-input" type="number" maxlength="11" placeholder="请输入手机号"
						placeholder-style="color:#b0bec5"
						@focus="focusFields.phone = true"
						@blur="focusFields.phone = false" />
				</view>
				<text v-if="errors.phone" class="error-tip">{{ errors.phone }}</text>
			</view>

			<!-- 注册按钮 -->
			<button class="register-btn" :class="{ loading: submitting }" :disabled="submitting" @click="onRegister">
				<view v-if="submitting" class="btn-loading">
					<view class="spinner"></view>
					<text>注册中...</text>
				</view>
				<text v-else>注册</text>
			</button>

			<!-- 底部 -->
			<view class="bottom-text">
				<text>已有账号？</text>
				<text class="link" @click="onGoLogin">去登录</text>
			</view>

			<view style="height:60rpx"></view>
		</scroll-view>

		<!-- 下拉遮罩 -->
		<view v-if="pickerType" class="picker-overlay" @click="pickerType = ''">
			<view class="picker-dropdown" @click.stop>
				<scroll-view scroll-y class="picker-scroll">
					<view v-if="pickerType === 'school'">
						<view v-for="school in schoolList" :key="school.schoolId"
							class="picker-option" :class="{ selected: form.schoolId === school.schoolId }"
							@click="onSelectSchool(school)">
							<text>{{ school.title }}</text>
							<text v-if="form.schoolId === school.schoolId" class="check">✓</text>
						</view>
						<view v-if="schoolList.length === 0" class="picker-empty">暂无学校</view>
					</view>
					<view v-if="pickerType === 'college'">
						<view v-for="college in collegeList" :key="college.departmentId"
							class="picker-option" :class="{ selected: form.collegeId === college.departmentId }"
							@click="onSelectCollege(college)">
							<text>{{ college.title }}</text>
							<text v-if="form.collegeId === college.departmentId" class="check">✓</text>
						</view>
						<view v-if="collegeList.length === 0" class="picker-empty">该学校暂无院系</view>
					</view>
					<view v-if="pickerType === 'major'">
						<view v-for="major in majorList" :key="major.departmentId"
							class="picker-option" :class="{ selected: form.departmentId === major.departmentId }"
							@click="onSelectMajor(major)">
							<text>{{ major.title }}</text>
							<text v-if="form.departmentId === major.departmentId" class="check">✓</text>
						</view>
						<view v-if="majorList.length === 0" class="picker-empty">该院系暂无二级专业</view>
					</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script>
import { getAllSchools, registerStudent } from '@/api/checkin'
import { getDepartmentTreeBySchoolId } from '@/api/checkin'

export default {
	data() {
		return {
			pageReady: false,
			submitting: false,
			pickerType: '',
			showPwd: false,
			showConfirmPwd: false,
			schoolList: [],
			deptTree: [],
			collegeList: [],
			majorList: [],
			focusFields: {},
			form: {
				schoolId: '',
				schoolName: '',
				collegeId: '',
				collegeName: '',
				departmentId: '',
				departmentName: '',
				studentNo: '',
				confirmNo: '',
				password: '',
				confirmPwd: '',
				name: '',
				gender: '0',
				phone: ''
			},
			errors: {}
		}
	},
	onLoad(options) {
		getAllSchools().then(res => {
			if (res.code === 200) this.schoolList = res.data || []
		}).catch(() => {
			uni.showToast({ title: '学校列表加载失败', icon: 'none' })
		})
		this.$nextTick(() => {
			setTimeout(() => { this.pageReady = true }, 100)
		})
	},
	methods: {
		openPicker(type) {
			if (type === 'college' && !this.form.schoolId) {
				uni.showToast({ title: '请先选择学校', icon: 'none' })
				return
			}
			if (type === 'major' && !this.form.collegeId) {
				uni.showToast({ title: '请先选择院系', icon: 'none' })
				return
			}
			this.pickerType = type
		},
		onSelectSchool(school) {
			this.form.schoolId = school.schoolId
			this.form.schoolName = school.title
			this.form.collegeId = ''
			this.form.collegeName = ''
			this.form.departmentId = ''
			this.form.departmentName = ''
			this.deptTree = []
			this.collegeList = []
			this.majorList = []
			this.pickerType = ''
			this.errors.schoolId = ''
			this.errors.collegeId = ''
			this.errors.departmentId = ''

			getDepartmentTreeBySchoolId(school.schoolId).then(res => {
				if (res.code === 200 && res.data) {
					this.deptTree = res.data
					this.collegeList = res.data.filter(item => item && item.departmentId)
				}
			}).catch(() => {
				uni.showToast({ title: '院系专业加载失败', icon: 'none' })
			})
		},
		onSelectCollege(college) {
			this.form.collegeId = college.departmentId
			this.form.collegeName = college.title
			this.form.departmentId = ''
			this.form.departmentName = ''
			this.majorList = Array.isArray(college.children) ? college.children : []
			this.pickerType = ''
			this.errors.collegeId = ''
			this.errors.departmentId = ''
		},
		onSelectMajor(major) {
			this.form.departmentId = major.departmentId
			this.form.departmentName = major.title
			this.pickerType = ''
			this.errors.departmentId = ''
		},
		validate() {
			const e = {}
			if (!this.form.schoolId) e.schoolId = '请选择学校'
			if (!this.form.collegeId) e.collegeId = '请选择院系'
			if (!this.form.departmentId) e.departmentId = '请选择二级专业'
			if (!this.form.studentNo.trim()) e.studentNo = '请输入学号'
			if (this.form.studentNo !== this.form.confirmNo) e.confirmNo = '两次学号不一致'
			if (!this.form.password) e.password = '请输入密码'
			if (this.form.password.length < 6) e.password = '密码至少6位'
			if (this.form.password !== this.form.confirmPwd) e.confirmPwd = '两次密码不一致'
			if (!this.form.name.trim()) e.name = '请输入姓名'
			if (!this.form.gender) e.gender = '请选择性别'
			if (!this.form.phone.trim()) e.phone = '请输入手机号'
			if (!/^1\d{10}$/.test(this.form.phone)) e.phone = '手机号格式不正确'
			this.errors = e
			return Object.keys(e).length === 0
		},
		onRegister() {
			if (!this.validate()) return
			if (this.submitting) return
			this.submitting = true

			registerStudent({
				schoolId: this.form.schoolId,
				collegeId: this.form.collegeId,
				departmentId: this.form.departmentId,
				studentNo: this.form.studentNo,
				className: this.form.className || '',
				enrollmentYear: this.form.enrollmentYear || '',
				password: this.form.password,
				studentName: this.form.name,
				gender: this.form.gender,
				phone: this.form.phone
			}).then(res => {
				if (res.code === 200 && res.data && res.data.token) {
					uni.setStorageSync('schoolName', this.form.schoolName)
                    uni.setStorageSync('schoolId', this.form.schoolId)
					uni.setStorageSync('token', res.data.token)
					uni.showToast({ title: '注册成功', icon: 'success' })
					setTimeout(() => {
						uni.redirectTo({ url: '/pages/mp/home/index' })
					}, 800)
				} else {
					uni.showToast({ title: res.msg || '注册失败', icon: 'none' })
				}
			}).catch(err => {
				uni.showToast({ title: err.message || '网络错误', icon: 'none' })
			}).finally(() => {
				this.submitting = false
			})
		},
		onGoLogin() {
			uni.navigateBack()
		}
	}
}
</script>

<style scoped>
.register-container {
	min-height: 100vh;
	background: linear-gradient(160deg, #b8d8f0 0%, #dce8f6 45%, #eaf2fb 100%);
	padding: 0 48rpx;
	display: flex;
	flex-direction: column;
}

/* 标题 */
.header { margin-top: 120rpx; text-align: center; opacity: 0; transform: translateY(-30rpx); transition: all 0.6s ease; }
.header.fade-in { opacity: 1; transform: translateY(0); }
.title { font-size: 52rpx; font-weight: 800; color: #1a2c4a; display: block; letter-spacing: 6rpx; }
.subtitle { font-size: 26rpx; color: #607d9b; margin-top: 8rpx; display: block; }

/* 表单滚动区 */
.form-scroll { flex: 1; margin-top: 48rpx; opacity: 0; transition: all 0.6s ease 0.2s; }
.form-scroll.fade-in { opacity: 1; }

/* 表单项 */
.form-item { margin-bottom: 30rpx; }
.label { font-size: 26rpx; font-weight: 600; color: #3a5068; margin-bottom: 12rpx; display: block; }

/* 输入框 */
.input-wrap {
	display: flex; align-items: center; background: white; border-radius: 24rpx;
	padding: 0 28rpx; height: 96rpx; border: 3rpx solid transparent;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04); transition: border-color 0.25s;
}
.input-wrap.focused { border-color: #4a90e2; }
.form-input { flex: 1; font-size: 28rpx; color: #1a2c4a; height: 96rpx; }
.toggle-pwd { font-size: 34rpx; padding: 10rpx; }

/* 选择器 */
.picker-wrap {
	display: flex; align-items: center; justify-content: space-between;
	background: white; border-radius: 24rpx; padding: 0 28rpx; height: 96rpx;
	border: 3rpx solid transparent; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04); transition: border-color 0.25s;
}
.picker-wrap.focused { border-color: #4a90e2; }
.picker-wrap .placeholder { color: #b0bec5; font-size: 28rpx; }
.picker-arrow { font-size: 26rpx; color: #94a3b8; }

/* 性别 */
.radio-row { display: flex; gap: 48rpx; }
.radio-item {
	display: flex; align-items: center; gap: 14rpx;
	padding: 18rpx 36rpx; border-radius: 24rpx; background: white;
	border: 3rpx solid transparent; font-size: 28rpx; color: #607d9b;
	transition: all 0.2s;
}
.radio-item.active { border-color: #4a90e2; color: #4a90e2; font-weight: 600; }
.radio-dot {
	width: 28rpx; height: 28rpx; border-radius: 50%; border: 3rpx solid #c0ccda;
	display: flex; align-items: center; justify-content: center; transition: all 0.2s;
}
.radio-item.active .radio-dot { border-color: #4a90e2; background: #4a90e2; }

/* 错误 */
.error-tip { font-size: 22rpx; color: #e74c3c; margin-top: 8rpx; padding-left: 28rpx; display: block; }
@keyframes shake {
	0%,100%{transform:translateX(0)} 20%{transform:translateX(-12rpx)} 40%{transform:translateX(12rpx)} 60%{transform:translateX(-8rpx)} 80%{transform:translateX(8rpx)}
}
.shake { animation: shake 0.45s ease; border-color: #e74c3c !important; }

/* 按钮 */
.register-btn {
	width: 100%; height: 96rpx; background: linear-gradient(135deg, #4a90e2, #3570c0);
	border-radius: 48rpx; border: none; color: white; font-size: 32rpx; font-weight: 700;
	margin-top: 40rpx; display: flex; align-items: center; justify-content: center;
	box-shadow: 0 8rpx 28rpx rgba(74,144,226,0.35);
}
.register-btn:active { transform: scale(0.97); }
.register-btn.loading { opacity: 0.75; pointer-events: none; }
.btn-loading { display: flex; align-items: center; gap: 16rpx; }
.spinner {
	width: 30rpx; height: 30rpx; border: 4rpx solid rgba(255,255,255,0.4);
	border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* 底部 */
.bottom-text { text-align: center; margin-top: 36rpx; font-size: 26rpx; color: #607d9b; }
.bottom-text .link { color: #4a90e2; font-weight: 600; margin-left: 8rpx; }

/* 下拉遮罩 */
.picker-overlay {
	position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 999;
	display: flex; justify-content: center; align-items: flex-start; padding-top: 30vh;
	animation: fadeIn 0.2s ease;
}
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
.picker-dropdown {
	width: 620rpx; max-height: 520rpx; background: white; border-radius: 28rpx;
	overflow: hidden; box-shadow: 0 16rpx 48rpx rgba(0,0,0,0.15);
	animation: slideDown 0.25s ease;
}
@keyframes slideDown { from{opacity:0;transform:translateY(-30rpx)} to{opacity:1;transform:translateY(0)} }
.picker-scroll { max-height: 520rpx; }
.picker-option {
	display: flex; align-items: center; justify-content: space-between;
	padding: 28rpx 36rpx; font-size: 28rpx; color: #1a2c4a; border-bottom: 1rpx solid #f0f3f8;
}
.picker-option:active { background: #f5f8fc; }
.picker-option.selected { color: #4a90e2; font-weight: 600; background: #f0f6ff; }
.check { color: #4a90e2; font-weight: 700; font-size: 30rpx; }
.picker-empty { text-align: center; padding: 60rpx; color: #94a3b8; font-size: 26rpx; }
</style>
