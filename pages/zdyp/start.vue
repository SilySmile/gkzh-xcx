<template>
	<view class="page">
		<ZdypHeader @back="back" />

		<view class="content">
			<view class="puzzle">
				<view class="piece piece-orange"></view>
				<view class="piece piece-yellow"></view>
				<view class="piece piece-purple"></view>
				<view class="piece piece-pink"></view>
			</view>

			<view class="title">职得一拼</view>
			<view class="tag">职业认知 · 知彼 ｜ 新就业形态启蒙</view>

			<view class="rule-card">
				<view class="rule-title">游戏规则</view>
				<view class="rule-item" v-for="item in rules" :key="item.no">
					<text class="rule-no">{{ item.no }}</text>
					<view class="rule-body">
						<text class="rule-name">{{ item.name }}</text>
						<text class="rule-desc">{{ item.desc }}</text>
					</view>
				</view>
			</view>

			<view v-if="hint" class="hint">{{ hint }}</view>

			<view class="start-btn" :class="{ pressed: pressing }" @touchstart="pressing = true"
				@touchend="pressing = false" @touchcancel="pressing = false" @click="start">
				<text class="start-text">{{ finished ? '查看报告' : '开始游戏' }}</text>
			</view>
		</view>
	</view>
</template>

<script>
	import ZdypHeader from '@/components/ZdypHeader.vue'
	import { enterRecord, getRecord, userMessage } from '@/api/zdyp'

	/**
	 * 职得一拼首页：扫码即创建参与记录，已通关的学生直接查看报告。
	 * 规则与设计稿“页面2（规则页）”一致，背景与配色按设计稿用 CSS 还原。
	 */
	export default {
		components: { ZdypHeader },
		data: () => ({
			instanceId: '',
			gameId: '',
			recordId: '',
			finished: false,
			hint: '',
			pressing: false,
			rules: [
				{ no: 1, name: '选择职业', desc: '选择你感兴趣的岗位，开启拼图挑战。' },
				{ no: 2, name: '限时速拼', desc: '在 45 秒内把四张职业卡片放回对应维度。' },
				{ no: 3, name: '提交答案', desc: '核对拼图结果，查看完整职业解析。' },
				{ no: 4, name: '解锁通关', desc: '四张全部放对即通关，未通过可再次挑战。' }
			]
		}),
		async onLoad(options) {
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			this.recordId = options.recordId || ''
			if (!this.recordId && this.instanceId && this.gameId) {
				await this.ensureRecord()
			}
			if (this.recordId) {
				await this.refresh()
			}
		},
		methods: {
			async ensureRecord() {
				try {
					const entered = await enterRecord({
						instanceId: this.instanceId,
						gameId: this.gameId,
						gameType: 'zdyp',
						schoolId: uni.getStorageSync('schoolId')
					})
					const data = (entered && entered.data) || {}
					this.recordId = data.recordId || ''
					if (!this.recordId) throw new Error('记录创建失败')
				} catch (e) {
					uni.showToast({ title: userMessage(e, '游戏入口校验失败，请重新扫码'), icon: 'none' })
				}
			},
			async refresh() {
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = res.data || {}
					this.finished = data.status === 'finished'
					const careerName = (data.selectedCareer && data.selectedCareer.careerName) || ''
					this.hint = this.finished
						? '你已完成「' + careerName + '」岗位拼图，可查看职业认知报告'
						: ''
				} catch (e) {
					uni.showToast({ title: userMessage(e, '闯关信息加载失败，请重新扫码'), icon: 'none' })
				}
			},
			async start() {
				if (!this.instanceId || !this.gameId) {
					uni.showToast({ title: '二维码缺少活动信息，请重新扫码', icon: 'none' })
					return
				}
				if (!this.recordId) {
					await this.ensureRecord()
					if (!this.recordId) return
				}
				const base = `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
				if (this.finished) {
					uni.redirectTo({ url: `/pages/zdyp/result?${base}` })
					return
				}
				uni.redirectTo({ url: `/pages/zdyp/index?${base}` })
			},
			back() {
				const pages = getCurrentPages()
				if (pages.length > 1) {
					uni.navigateBack({ delta: 1 })
					return
				}
				uni.reLaunch({ url: '/pages/mp/home/index' })
			}
		}
	}
</script>

<style scoped>
	.page {
		width: 100%;
		min-height: 100vh;
		background: #FCF3D8;
	}

	.content {
		padding: 120rpx 56rpx 60rpx;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.puzzle {
		width: 260rpx;
		height: 260rpx;
		display: flex;
		flex-wrap: wrap;
		margin-top: 20rpx;
	}

	.piece {
		width: 130rpx;
		height: 130rpx;
	}

	.piece-orange {
		background: #EE8B3E;
		border-top-left-radius: 34rpx;
		border-bottom-right-radius: 22rpx;
	}

	.piece-yellow {
		background: #F5C443;
		border-top-right-radius: 34rpx;
		border-bottom-left-radius: 22rpx;
	}

	.piece-purple {
		background: #9B7BC4;
		border-top-right-radius: 22rpx;
		border-bottom-left-radius: 34rpx;
	}

	.piece-pink {
		background: #F3A7C6;
		border-bottom-right-radius: 34rpx;
		border-top-left-radius: 22rpx;
	}

	.title {
		margin-top: 36rpx;
		font-size: 72rpx;
		font-weight: 700;
		letter-spacing: 8rpx;
		color: #1F1B16;
	}

	.tag {
		margin-top: 16rpx;
		font-size: 24rpx;
		color: #8A6D3B;
		letter-spacing: 2rpx;
	}

	.rule-card {
		width: 100%;
		margin-top: 48rpx;
		padding: 36rpx 32rpx;
		box-sizing: border-box;
		background: #FFFFFF;
		border-radius: 36rpx;
		box-shadow: 0 10rpx 30rpx rgba(160, 120, 40, 0.08);
	}

	.rule-title {
		font-size: 34rpx;
		font-weight: 700;
		color: #1F1B16;
		margin-bottom: 20rpx;
	}

	.rule-item {
		display: flex;
		align-items: flex-start;
		margin-top: 18rpx;
	}

	.rule-no {
		width: 40rpx;
		line-height: 40rpx;
		font-size: 26rpx;
		font-weight: 700;
		color: #EE8B3E;
	}

	.rule-body {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.rule-name {
		font-size: 28rpx;
		font-weight: 600;
		color: #3D3428;
	}

	.rule-desc {
		margin-top: 6rpx;
		font-size: 25rpx;
		line-height: 1.6;
		color: #7A6A55;
	}

	.hint {
		margin-top: 24rpx;
		padding: 14rpx 22rpx;
		border-radius: 16rpx;
		background: rgba(255, 255, 255, 0.78);
		font-size: 23rpx;
		color: #8A6D3B;
		text-align: center;
	}

	.start-btn {
		width: 560rpx;
		height: 104rpx;
		margin-top: 44rpx;
		border-radius: 52rpx;
		background: linear-gradient(180deg, #F6A34B 0%, #EE8B3E 100%);
		box-shadow: 0 12rpx 26rpx rgba(214, 126, 40, 0.28);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.12s ease;
	}

	.start-btn.pressed {
		transform: scale(0.97);
	}

	.start-text {
		font-size: 36rpx;
		font-weight: 700;
		color: #FFFFFF;
		letter-spacing: 4rpx;
	}
</style>
