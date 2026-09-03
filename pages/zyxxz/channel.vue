<template>
	<view class="container">
		<uni-nav-bar
			dark
			:fixed="true"
			shadow
			background-color="#007AFF"
			status-bar
			title="职业信息站"
			left-icon="left"
			@clickLeft="back"
			:border="false"
		/>

		<view class="channel-container">
			<!-- 步骤指示器 -->
			<view class="step-indicator">
				<view class="step-dots">
					<view
						v-for="i in 3"
						:key="i"
						class="dot"
						:class="{ active: currentStep >= i - 1, done: currentStep > i - 1 }"
					></view>
					<view class="dot-line" v-for="i in 2" :key="'line'+i"
						:class="{ active: currentStep >= i }"></view>
				</view>
				<text class="step-label">{{ stepTitles[currentStep] }}</text>
			</view>

			<!-- ========== 第一页：10种渠道展示 ========== -->
			<view v-if="currentStep === 0" class="step-content">
				<view class="step-desc">以下是获取职业信息的<text class="highlight">10种</text>主要渠道，请仔细了解：</view>
				<view class="channel-grid">
					<view
						v-for="(ch, idx) in channels"
						:key="idx"
						class="channel-card"
					>
						<view class="channel-icon-wrap">
							<text class="channel-icon">{{ ch.icon }}</text>
						</view>
						<view class="channel-info">
							<text class="channel-index">{{ String(idx + 1).padStart(2, '0') }}</text>
							<text class="channel-name">{{ ch.name }}</text>
						</view>
						<text class="channel-desc">{{ ch.desc }}</text>
					</view>
				</view>
				<button class="next-btn" @click="nextStep">我已了解，下一步</button>
			</view>

			<!-- ========== 第二页：最常用 + 最信任渠道选择 ========== -->
			<view v-if="currentStep === 1" class="step-content">
				<view class="step-desc">请根据你的实际情况，选择对应的渠道：</view>

				<!-- 最常用渠道 -->
				<view class="select-group">
					<text class="select-label">
						<text class="required">*</text> 你最常使用的求职信息渠道
					</text>
					<picker
						mode="selector"
						:range="channelNames"
						:value="commonChannelIndex"
						@change="onCommonChannelChange"
					>
						<view class="picker-input" :class="{ placeholder: commonChannelIndex < 0 }">
							{{ commonChannelIndex >= 0 ? channelNames[commonChannelIndex] : '请选择最常用渠道' }}
						</view>
					</picker>
				</view>

				<!-- 最信任渠道 -->
				<view class="select-group">
					<text class="select-label">
						<text class="required">*</text> 你最信任的求职信息渠道
					</text>
					<picker
						mode="selector"
						:range="channelNames"
						:value="trustedChannelIndex"
						@change="onTrustedChannelChange"
					>
						<view class="picker-input" :class="{ placeholder: trustedChannelIndex < 0 }">
							{{ trustedChannelIndex >= 0 ? channelNames[trustedChannelIndex] : '请选择最信任渠道' }}
						</view>
					</picker>
				</view>

				<button
					class="next-btn"
					@click="nextStep"
					:disabled="commonChannelIndex < 0 || trustedChannelIndex < 0"
				>
					{{ commonChannelIndex >= 0 && trustedChannelIndex >= 0 ? '下一步' : '请完成选择' }}
				</button>
			</view>

			<!-- ========== 第三页：获取障碍 ========== -->
			<view v-if="currentStep === 2" class="step-content">
				<view class="step-desc">在获取职业信息渠道方面，你遇到过哪些障碍？（可多选）</view>
				<view class="obstacle-list">
					<label
						v-for="(ob, idx) in obstacles"
						:key="idx"
						class="obstacle-item"
						:class="{ checked: selectedObstacles.includes(idx) }"
						@click="toggleObstacle(idx)"
					>
						<view class="obstacle-checkbox">
							<text v-if="selectedObstacles.includes(idx)" class="check-icon">✓</text>
						</view>
						<text class="obstacle-text">{{ ob }}</text>
					</label>
				</view>

				<button
					class="submit-btn"
					@click="handleSubmit"
					:disabled="isSubmitting"
					:loading="isSubmitting"
				>
					{{ isSubmitting ? '提交中...' : '确认提交' }}
				</button>
			</view>
		</view>
	</view>
</template>

<script>
import { submitChannelChoice, getMyResult } from '@/api/zyxxz.js'
import { getActivityProgress } from '@/api/activity/activity'
import { getActivityWeekUrl, redirectToActivityWeek, completeActivityWeekGame } from '@/utils/activity'

export default {
	data() {
		return {
			activityId: null,
			gameId: null,
			hasSubmitted: false,
			currentStep: 0,
			isSubmitting: false,
			commonChannelIndex: -1,
			trustedChannelIndex: -1,
			selectedObstacles: [],
			channels: [
				{ icon: '🏫', name: '学校就业指导中心', desc: '学校官方提供的就业信息与指导服务' },
				{ icon: '💻', name: '招聘网站/APP', desc: '如智联招聘、前程无忧、BOSS直聘等' },
				{ icon: '🎪', name: '校园招聘会/双选会', desc: '企业进校举办的现场招聘活动' },
				{ icon: '📱', name: '社交媒体', desc: '微信、微博、小红书等社交平台信息' },
				{ icon: '🏢', name: '企业官方网站', desc: '目标企业官网的招聘板块' },
				{ icon: '💼', name: '实习/兼职经历', desc: '通过实习或兼职直接获取行业信息' },
				{ icon: '👨‍👩‍👧', name: '家人亲戚推荐', desc: '通过家人亲属介绍工作机会' },
				{ icon: '👨‍🎓', name: '老师/学长学姐推荐', desc: '学校老师或往届学长学姐的内推' },
				{ icon: '📚', name: '职业规划书籍/杂志', desc: '专业书籍、行业杂志获取职业资讯' },
				{ icon: '🏛️', name: '政府公共就业服务', desc: '人社局、人才市场等公共服务机构' }
			],
			obstacles: [
				'信息太多，难以筛选有效信息',
				'不了解有哪些获取渠道',
				'渠道信息不够权威可靠',
				'不知道如何有效利用渠道',
				'缺乏个性化职业指导',
				'信息更新不及时',
				'受地域或时间限制',
				'缺乏主动获取意识'
			]
		}
	},
	computed: {
		channelNames() {
			return this.channels.map(c => c.name)
		},
		stepTitles() {
			return ['了解渠道', '你的选择', '存在的障碍']
		}
	},
	onLoad(options) {
		this.activityId = options.activityId || uni.getStorageSync("activityId")
		this.gameId = options.gameId || null
		if (!this.activityId) {
			uni.showToast({ title: '参数错误', icon: 'none' })
			return
		}
		uni.setStorageSync('activityId', this.activityId)
		this.checkActivityProgress()
	},
	methods: {
		checkActivityProgress() {
			getActivityProgress(this.activityId).then(res => {
				if (res.code !== 200 || !res.data) {
					uni.showToast({ title: '活动信息获取失败', icon: 'none' })
					return
				}
				const url = getActivityWeekUrl()
				const finished = res.data
					.filter(m => m.type === 'zyxxz')
					.map(m => m.finished)[0]
				if (finished) {
					this.hasSubmitted = true
				}
			})
		},
		nextStep() {
			if (this.currentStep < 2) {
				this.currentStep++
				uni.pageScrollTo({ scrollTop: 0, duration: 300 })
			}
		},
		prevStep() {
			if (this.currentStep > 0) {
				this.currentStep--
				uni.pageScrollTo({ scrollTop: 0, duration: 300 })
			}
		},
		onCommonChannelChange(e) {
			this.commonChannelIndex = e.detail.value
		},
		onTrustedChannelChange(e) {
			this.trustedChannelIndex = e.detail.value
		},
		toggleObstacle(idx) {
			const pos = this.selectedObstacles.indexOf(idx)
			if (pos >= 0) {
				this.selectedObstacles.splice(pos, 1)
			} else {
				this.selectedObstacles.push(idx)
			}
		},
		handleSubmit() {
			if (this.isSubmitting) return
			this.isSubmitting = true

			const commonChannel = this.channelNames[this.commonChannelIndex]
			const trustedChannel = this.channelNames[this.trustedChannelIndex]
			const obstacleStr = this.selectedObstacles
				.map(i => this.obstacles[i])
				.join(',')

			submitChannelChoice({
				activityId: this.activityId,
				commonChannel,
				trustedChannel,
				obstacles: obstacleStr
			}).then(async res => {
				if (res.code === 200) {
					await completeActivityWeekGame(this.gameId, { result: res.data }).catch(() => {})
					uni.showModal({
						title: '提交成功',
						content: '感谢你的参与！',
						showCancel: false,
						confirmText: '确定',
						success: () => {
							this.back()
						}
					})
				} else {
					uni.showToast({ title: res.msg || '提交失败', icon: 'none' })
				}
				this.isSubmitting = false
			}).catch(() => {
				uni.showToast({ title: '提交异常', icon: 'none' })
				this.isSubmitting = false
			})
		},
		back() {
			redirectToActivityWeek()
		}
	}
}
</script>

<style scoped>
.container {
	min-height: 100vh;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.channel-container {
	padding: 20rpx 30rpx;
	padding-top: 120rpx;
	padding-bottom: 40rpx;
}

/* 步骤指示器 */
.step-indicator {
	text-align: center;
	margin-bottom: 30rpx;
}

.step-dots {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0;
}

.dot {
	width: 40rpx;
	height: 40rpx;
	border-radius: 50%;
	background: rgba(255,255,255,0.3);
	border: 4rpx solid rgba(255,255,255,0.5);
	transition: all 0.3s;
	flex-shrink: 0;
}

.dot.active {
	background: #fff;
	border-color: #fff;
	transform: scale(1.2);
}

.dot.done {
	background: #4caf50;
	border-color: #4caf50;
}

.dot-line {
	width: 80rpx;
	height: 4rpx;
	background: rgba(255,255,255,0.3);
	transition: all 0.3s;
}

.dot-line.active {
	background: #4caf50;
}

.step-label {
	display: block;
	font-size: 28rpx;
	color: #fff;
	margin-top: 12rpx;
	font-weight: bold;
}

/* 步骤内容 */
.step-content {
	animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
	from { opacity: 0; transform: translateY(20rpx); }
	to { opacity: 1; transform: translateY(0); }
}

.step-desc {
	font-size: 28rpx;
	color: #fff;
	text-align: center;
	margin-bottom: 30rpx;
	line-height: 1.6;
}

.highlight {
	color: #FFD700;
	font-weight: bold;
}

/* 渠道卡片网格 */
.channel-grid {
	display: flex;
	flex-direction: column;
	gap: 15rpx;
}

.channel-card {
	background: rgba(255,255,255,0.95);
	border-radius: 16rpx;
	padding: 22rpx 24rpx;
	display: flex;
	align-items: center;
	gap: 16rpx;
	box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);
	transition: transform 0.2s;
}

.channel-card:active {
	transform: scale(0.98);
}

.channel-icon-wrap {
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.channel-icon {
	font-size: 36rpx;
}

.channel-info {
	flex: 1;
	min-width: 0;
}

.channel-index {
	font-size: 22rpx;
	color: #999;
	margin-right: 10rpx;
}

.channel-name {
	font-size: 28rpx;
	color: #333;
	font-weight: bold;
}

.channel-desc {
	font-size: 22rpx;
	color: #888;
	display: block;
	margin-top: 6rpx;
}

/* 选择器 */
.select-group {
	margin-bottom: 30rpx;
}

.select-label {
	font-size: 28rpx;
	color: #fff;
	display: block;
	margin-bottom: 12rpx;
}

.required {
	color: #FF6B6B;
}

.picker-input {
	background: rgba(255,255,255,0.95);
	border-radius: 12rpx;
	padding: 24rpx 20rpx;
	font-size: 28rpx;
	color: #333;
}

.picker-input.placeholder {
	color: #aaa;
}

/* 障碍列表 */
.obstacle-list {
	display: flex;
	flex-direction: column;
	gap: 15rpx;
}

.obstacle-item {
	background: rgba(255,255,255,0.95);
	border-radius: 12rpx;
	padding: 20rpx 24rpx;
	display: flex;
	align-items: center;
	gap: 16rpx;
	border: 3rpx solid transparent;
	transition: all 0.2s;
}

.obstacle-item.checked {
	border-color: #667eea;
	background: rgba(255,255,255,1);
	box-shadow: 0 4rpx 15rpx rgba(102,126,234,0.3);
}

.obstacle-checkbox {
	width: 40rpx;
	height: 40rpx;
	border-radius: 8rpx;
	border: 3rpx solid #ccc;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	transition: all 0.2s;
}

.obstacle-item.checked .obstacle-checkbox {
	background: #667eea;
	border-color: #667eea;
}

.check-icon {
	color: #fff;
	font-size: 24rpx;
	font-weight: bold;
}

.obstacle-text {
	font-size: 28rpx;
	color: #333;
	flex: 1;
}

/* 按钮 */
.next-btn {
	background: #fff;
	color: #667eea;
	border: none;
	border-radius: 50rpx;
	font-size: 32rpx;
	font-weight: bold;
	padding: 25rpx 0;
	margin-top: 40rpx;
	box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.15);
}

.next-btn[disabled] {
	background: rgba(255,255,255,0.5);
	color: #aaa;
	box-shadow: none;
}

.submit-btn {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
	border: none;
	border-radius: 50rpx;
	font-size: 32rpx;
	font-weight: bold;
	padding: 25rpx 0;
	margin-top: 40rpx;
	box-shadow: 0 8rpx 20rpx rgba(102,126,234,0.4);
}

.submit-btn[disabled] {
	background: #ccc;
	box-shadow: none;
}
</style>
