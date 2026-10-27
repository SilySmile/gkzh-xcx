<template>
	<view class="page">
		<zyjdc-header title="对局结果" @back="backToActivity" />

		<scroll-view scroll-y class="scroll">
			<view v-if="loading" class="state-box">正在加载结果…</view>

			<template v-else>
				<view class="result-hero" :class="resultClass">
					<view v-if="isWin" class="stamp">
						<text class="stamp-main">通关</text>
						<text class="stamp-sub">职业角斗场</text>
					</view>
					<image v-if="roleImage" class="hero-role-img" :src="imageUrl(roleImage)" mode="aspectFit" />
					<text class="result-title">{{ resultTitle }}</text>
					<text class="result-sub">{{ resultSub }}</text>
					<view class="result-meta">
						<text class="meta-item">角色：{{ roleName || '—' }}</text>
						<text class="meta-item">尝试：{{ attemptNo || 1 }} 次</text>
						<text class="meta-item">步数：{{ moveCount || 0 }}</text>
					</view>
				</view>

				<view class="role-card">
					<view class="role-head">
						<text class="role-name">{{ roleName }}</text>
						<text class="role-job">{{ jobTitle }}</text>
					</view>
					<text class="role-interpret">{{ role.roleInterpretation || '这是你在本局选择的角色。' }}</text>
				</view>

				<view class="section">
					<view class="section-title"><text class="bar"></text>职场定位</view>
					<text class="section-text">{{ role.positioning || role.jobTitle || '暂无内容' }}</text>
				</view>

				<view class="section">
					<view class="section-title"><text class="bar"></text>能力优势</view>
					<text class="section-text">{{ role.advantage || role.careerAbility || '暂无内容' }}</text>
				</view>

				<view class="section">
					<view class="section-title"><text class="bar"></text>生存法则</view>
					<text class="section-text">{{ role.survivalRule || '暂无内容' }}</text>
				</view>

				<view class="section">
					<view class="section-title"><text class="bar"></text>职场能力</view>
					<text class="section-text">{{ role.careerAbility || '暂无内容' }}</text>
				</view>

				<view class="footer-space"></view>
			</template>
		</scroll-view>

		<view v-if="!loading" class="footer">
			<view v-if="!isWin" class="retry" :class="{ disabled: retrying }" @click="retry">
				{{ retrying ? '正在重开…' : '再试一次' }}
			</view>
			<view class="back" :class="{ primary: isWin }" @click="backToActivity">{{ isWin ? '返回活动' : '返回活动' }}</view>
			<text v-if="!isWin" class="footer-tip">失败或平局不扣次数，可无限次重新挑战</text>
		</view>
	</view>
</template>

<script>
	import { getRecord, retryGame, userMessage } from '@/api/zyjdc'
	import { getWeekFlow } from '@/api/activity/week'
	import ZyjdcHeader from '@/components/ZyjdcHeader.vue'
	import config from '@/config/api.js'

	export default {
		components: { ZyjdcHeader },
		data: () => ({
			instanceId: '',
			gameId: '',
			recordId: '',
			record: {},
			role: {},
			loading: false,
			retrying: false,
			backing: false
		}),
		computed: {
			roleName() {
				return this.role.roleName || this.record.roleName || ''
			},
			jobTitle() {
				return this.role.jobTitle || this.record.jobTitle || ''
			},
			roleImage() {
				return this.role.imageUrl || ''
			},
			attemptNo() {
				return this.record.attemptNo || 1
			},
			moveCount() {
				return this.record.moveCount || 0
			},
			isWin() {
				return this.record.result === 'win'
			},
			resultClass() {
				if (this.record.result === 'win') return 'win'
				if (this.record.result === 'lose') return 'lose'
				return 'draw'
			},
			resultTitle() {
				if (this.record.result === 'win') return '你赢下了这一局'
				if (this.record.result === 'lose') return '这一局没有获胜'
				return '这一局打成平局'
			},
			resultSub() {
				const reason = this.record.resultReason
				if (reason === 'capture_all') return this.isWin ? '你吃光了对方全部棋子，获得通关印戳。' : '你的棋子被对方全部吃掉，可以重新挑战。'
				if (reason === 'no_move') return this.isWin ? '对方无子可动，你获得胜利。' : '我方无子可动，本局判负。'
				if (reason === 'timeout') return this.isWin ? '时间到，你剩余棋子的最高等级占优，获得胜利。' : '时间到，按剩余棋子等级与数量结算。'
				return this.isWin ? '恭喜完成本局对弈。' : '调整策略后再试一次。'
			}
		},
		async onLoad(options) {
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			this.recordId = options.recordId || ''
			await this.load()
		},
		methods: {
			imageUrl(value) {
				if (!value) return ''
				if (/^https?:\/\//i.test(value)) return value
				return config.BASE_URL + (value.charAt(0) === '/' ? value : '/' + value)
			},
			query() {
				return `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
			},
			async load() {
				if (!this.recordId) {
					uni.showToast({ title: '缺少游戏记录，请重新扫码进入', icon: 'none' })
					return
				}
				this.loading = true
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = res.data || {}
					if (!data.result) {
						if (data.stage === 'playing') {
							uni.redirectTo({ url: `/pages/zyjdc/index?${this.query()}` })
						} else if (data.stage === 'role_selected') {
							uni.redirectTo({ url: `/pages/zyjdc/role?${this.query()}` })
						} else {
							uni.redirectTo({ url: `/pages/zyjdc/select?${this.query()}` })
						}
						return
					}
					this.record = data
					this.role = data.role || {}
				} catch (e) {
					uni.showToast({ title: userMessage(e, '结果加载失败，请稍后重试'), icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			async retry() {
				if (this.retrying) return
				this.retrying = true
				try {
					await retryGame(this.recordId)
					uni.redirectTo({ url: `/pages/zyjdc/index?${this.query()}` })
				} catch (e) {
					uni.showToast({ title: userMessage(e, '重新挑战失败，请稍后重试'), icon: 'none' })
				} finally {
					this.retrying = false
				}
			},
			/** 返回到当前活动所属的“生涯活动”或“就业活动”页面。 */
			async backToActivity() {
				if (this.backing) return
				this.backing = true
				let bizType = this.record && this.record.bizType ? this.record.bizType : ''
				if (!bizType && this.instanceId) {
					try {
						const res = await getWeekFlow(this.instanceId)
						const instance = res && res.data && res.data.instance
						if (instance && instance.bizType) bizType = instance.bizType
					} catch (e) {
						// 读取失败时按生涯活动处理，保证仍能回到活动页。
					}
				}
				const target = bizType === 'job_week' ? 'job_week' : 'career_week'
				uni.reLaunch({ url: `/pages/mp/sub-pages/career-week/index?bizType=${target}` })
			}
		}
	}
</script>

<style scoped>
	.page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: linear-gradient(160deg, #081a30 0%, #0c2b4a 52%, #123f63 100%);
	}

	.scroll {
		flex: 1;
		padding: 0 28rpx;
		box-sizing: border-box;
	}

	.state-box {
		margin-top: 100rpx;
		text-align: center;
		font-size: 26rpx;
		color: rgba(255, 255, 255, 0.66);
	}

	.result-hero {
		position: relative;
		margin-top: 14rpx;
		padding: 36rpx 26rpx 30rpx;
		border-radius: 28rpx;
		text-align: center;
		overflow: hidden;
		border: 1rpx solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.06);
	}

	.result-hero.win {
		background: radial-gradient(circle at 50% 0%, rgba(243, 201, 107, 0.28), rgba(255, 255, 255, 0.05) 62%);
		border-color: rgba(243, 201, 107, 0.42);
	}

	.result-hero.lose {
		background: radial-gradient(circle at 50% 0%, rgba(217, 74, 74, 0.24), rgba(255, 255, 255, 0.05) 62%);
		border-color: rgba(217, 74, 74, 0.38);
	}

	.result-hero.draw {
		background: radial-gradient(circle at 50% 0%, rgba(120, 160, 200, 0.2), rgba(255, 255, 255, 0.05) 62%);
	}

	.stamp {
		position: absolute;
		top: 18rpx;
		right: 22rpx;
		width: 128rpx;
		height: 128rpx;
		border: 6rpx solid #e8b64c;
		border-radius: 50%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		transform: rotate(-12deg);
		box-shadow: 0 0 0 4rpx rgba(232, 182, 76, 0.18);
	}

	.stamp-main {
		font-size: 40rpx;
		font-weight: 700;
		letter-spacing: 4rpx;
		color: #e8b64c;
	}

	.stamp-sub {
		margin-top: 2rpx;
		font-size: 17rpx;
		color: #e8b64c;
	}

	.hero-role-img {
		width: 170rpx;
		height: 170rpx;
	}

	.result-title {
		display: block;
		margin-top: 8rpx;
		font-size: 40rpx;
		font-weight: 700;
		color: #ffffff;
	}

	.result-sub {
		display: block;
		margin-top: 12rpx;
		font-size: 24rpx;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.66);
	}

	.result-meta {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		margin-top: 18rpx;
	}

	.meta-item {
		margin: 6rpx 12rpx;
		padding: 6rpx 16rpx;
		border-radius: 20rpx;
		font-size: 21rpx;
		color: rgba(255, 255, 255, 0.62);
		background: rgba(255, 255, 255, 0.07);
	}

	.role-card {
		margin-top: 22rpx;
		padding: 26rpx 24rpx;
		border-radius: 24rpx;
		background: rgba(243, 201, 107, 0.1);
		border: 1rpx solid rgba(243, 201, 107, 0.26);
	}

	.role-head {
		display: flex;
		align-items: baseline;
	}

	.role-name {
		font-size: 38rpx;
		font-weight: 700;
		letter-spacing: 2rpx;
		color: #ffffff;
	}

	.role-job {
		margin-left: 14rpx;
		font-size: 24rpx;
		color: #f3c96b;
	}

	.role-interpret {
		display: block;
		margin-top: 12rpx;
		font-size: 25rpx;
		line-height: 1.9;
		color: rgba(255, 255, 255, 0.82);
	}

	.section {
		margin-top: 20rpx;
		padding: 24rpx;
		border-radius: 22rpx;
		background: rgba(255, 255, 255, 0.06);
		border: 1rpx solid rgba(255, 255, 255, 0.08);
	}

	.section-title {
		display: flex;
		align-items: center;
		font-size: 28rpx;
		font-weight: 600;
		color: #f3c96b;
	}

	.bar {
		width: 6rpx;
		height: 28rpx;
		margin-right: 12rpx;
		border-radius: 4rpx;
		background: #f3c96b;
	}

	.section-text {
		display: block;
		margin-top: 14rpx;
		font-size: 25rpx;
		line-height: 1.9;
		color: rgba(255, 255, 255, 0.8);
	}

	.footer-space {
		height: 220rpx;
	}

	.footer {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 18rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
		text-align: center;
		background: rgba(8, 26, 48, 0.95);
		border-top: 1rpx solid rgba(255, 255, 255, 0.08);
	}

	.retry {
		height: 92rpx;
		line-height: 92rpx;
		border-radius: 46rpx;
		font-size: 32rpx;
		font-weight: 600;
		letter-spacing: 3rpx;
		color: #0a2038;
		background: linear-gradient(135deg, #ffd985 0%, #f3c96b 55%, #e2a93d 100%);
	}

	.retry.disabled {
		opacity: 0.6;
	}

	.back {
		margin-top: 14rpx;
		height: 82rpx;
		line-height: 82rpx;
		border-radius: 41rpx;
		font-size: 28rpx;
		color: rgba(255, 255, 255, 0.78);
		border: 1rpx solid rgba(255, 255, 255, 0.22);
	}

	.back.primary {
		color: #0a2038;
		border: none;
		background: linear-gradient(135deg, #ffd985 0%, #f3c96b 55%, #e2a93d 100%);
	}

	.footer-tip {
		display: block;
		margin-top: 10rpx;
		font-size: 21rpx;
		color: rgba(255, 255, 255, 0.42);
	}
</style>
