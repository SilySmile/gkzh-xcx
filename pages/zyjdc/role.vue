<template>
	<view class="page">
		<zyjdc-header title="角色档案" @back="back" />

		<scroll-view scroll-y class="content">
			<view v-if="loading" class="state-box">正在加载角色档案…</view>
			<view v-else-if="!role" class="state-box">
				<text>角色信息加载失败，请返回重新选择。</text>
			</view>

			<template v-else>
				<view class="hero-card">
					<view class="rank-badge">等级 {{ role.rankLevel }}</view>
					<image v-if="role.imageUrl" class="hero-img" :src="imageUrl(role.imageUrl)" mode="aspectFit" />
					<view class="hero-name">{{ role.roleName }}</view>
					<view class="hero-job">{{ role.jobTitle }}</view>
					<view class="hero-interpret">{{ role.roleInterpretation || '你就是这个角色，准备进入职场博弈。' }}</view>
				</view>

				<view class="section">
					<view class="section-title"><text class="bar"></text>生存法则</view>
					<text class="section-text">{{ role.survivalRule || '暂无内容' }}</text>
				</view>

				<view class="section">
					<view class="section-title"><text class="bar"></text>职场定位</view>
					<text class="section-text">{{ role.positioning || role.jobTitle }}</text>
				</view>

				<view class="section">
					<view class="section-title"><text class="bar"></text>能力优势</view>
					<text class="section-text">{{ role.advantage || role.careerAbility || '暂无内容' }}</text>
				</view>

				<view class="section">
					<view class="section-title"><text class="bar"></text>职场能力</view>
					<text class="section-text">{{ role.careerAbility || '暂无内容' }}</text>
				</view>
			</template>
		</scroll-view>

		<view v-if="role" class="footer">
			<view class="submit" :class="{ disabled: starting }" @click="start">
				{{ starting ? '正在开局…' : '开始对弈' }}
			</view>
			<text class="footer-tip">对局开始后 3 分钟内不能更换角色</text>
		</view>
	</view>
</template>

<script>
	import { getRecord, startGame, userMessage } from '@/api/zyjdc'
	import ZyjdcHeader from '@/components/ZyjdcHeader.vue'
	import config from '@/config/api.js'

	export default {
		components: { ZyjdcHeader },
		data: () => ({
			instanceId: '',
			gameId: '',
			recordId: '',
			role: null,
			loading: false,
			starting: false
		}),
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
			baseUrl(path) {
				return `${path}?recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
			},
			async load() {
				if (!this.recordId) {
					uni.showToast({ title: '游戏记录不存在，请重新扫码', icon: 'none' })
					return
				}
				this.loading = true
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = res.data || {}
					if (data.result || data.status === 'finished') {
						uni.redirectTo({ url: this.baseUrl('/pages/zyjdc/result') })
						return
					}
					if (data.stage === 'playing') {
						uni.redirectTo({ url: this.baseUrl('/pages/zyjdc/index') })
						return
					}
					if (data.stage === 'entered') {
						uni.redirectTo({ url: this.baseUrl('/pages/zyjdc/select') })
						return
					}
					this.role = data.role || null
				} catch (e) {
					uni.showToast({ title: userMessage(e, '角色档案加载失败，请稍后重试'), icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			async start() {
				if (this.starting) return
				this.starting = true
				try {
					await startGame(this.recordId)
					uni.redirectTo({ url: this.baseUrl('/pages/zyjdc/index') })
				} catch (e) {
					uni.showToast({ title: userMessage(e, '开局失败，请稍后重试'), icon: 'none' })
				} finally {
					this.starting = false
				}
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
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: linear-gradient(160deg, #081a30 0%, #0c2b4a 52%, #123f63 100%);
	}

	.content {
		flex: 1;
		padding: 0 28rpx 200rpx;
		box-sizing: border-box;
	}

	.state-box {
		margin-top: 100rpx;
		text-align: center;
		font-size: 26rpx;
		color: rgba(255, 255, 255, 0.66);
	}

	.hero-card {
		position: relative;
		margin-top: 12rpx;
		padding: 34rpx 26rpx 30rpx;
		border-radius: 26rpx;
		text-align: center;
		background: radial-gradient(circle at 50% 0%, rgba(243, 201, 107, 0.18), rgba(255, 255, 255, 0.06) 56%, rgba(255, 255, 255, 0.04));
		border: 1rpx solid rgba(243, 201, 107, 0.28);
	}

	.rank-badge {
		position: absolute;
		top: 18rpx;
		right: 20rpx;
		padding: 6rpx 16rpx;
		border-radius: 22rpx;
		font-size: 21rpx;
		color: #0a2038;
		background: #f3c96b;
	}

	.hero-img {
		width: 190rpx;
		height: 190rpx;
	}

	.hero-name {
		margin-top: 10rpx;
		font-size: 48rpx;
		font-weight: 700;
		letter-spacing: 4rpx;
		color: #ffffff;
	}

	.hero-job {
		margin-top: 6rpx;
		font-size: 27rpx;
		color: #f3c96b;
	}

	.hero-interpret {
		margin-top: 20rpx;
		padding-top: 20rpx;
		border-top: 1rpx solid rgba(255, 255, 255, 0.1);
		font-size: 25rpx;
		line-height: 1.85;
		text-align: left;
		color: rgba(255, 255, 255, 0.8);
	}

	.section {
		margin-top: 22rpx;
		padding: 24rpx 24rpx 22rpx;
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

	.footer {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 18rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
		text-align: center;
		background: rgba(8, 26, 48, 0.94);
		border-top: 1rpx solid rgba(255, 255, 255, 0.08);
	}

	.submit {
		height: 92rpx;
		line-height: 92rpx;
		border-radius: 46rpx;
		font-size: 32rpx;
		font-weight: 600;
		letter-spacing: 3rpx;
		color: #0a2038;
		background: linear-gradient(135deg, #ffd985 0%, #f3c96b 55%, #e2a93d 100%);
	}

	.submit.disabled {
		opacity: 0.6;
	}

	.footer-tip {
		display: block;
		margin-top: 10rpx;
		font-size: 21rpx;
		color: rgba(255, 255, 255, 0.42);
	}
</style>
