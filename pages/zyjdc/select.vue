<template>
	<view class="page">
		<zyjdc-header title="选择动物角色" @back="back" />

		<scroll-view scroll-y class="content">
			<view class="intro">
				<text class="intro-title">你更像哪一种职场动物？</text>
				<text class="intro-desc">选择不代表固定标签，只代表你此刻更认同的职场姿态。选定后会先看到角色档案，再进入 7×9 斗兽棋对弈。</text>
			</view>

			<view v-if="loading" class="state-box">正在加载角色…</view>
			<view v-else-if="!roles.length" class="state-box">
				<text>角色配置暂无数据，请联系活动老师。</text>
				<view class="retry" @click="loadRoles">重新加载</view>
			</view>

			<view v-else class="role-grid">
				<view v-for="role in roles" :key="role.roleId" class="role-card"
					:class="{ active: selectedId === role.roleId }" @click="select(role)">
					<view class="rank-badge">{{ role.rankLevel }}</view>
					<image v-if="role.imageUrl" class="role-img" :src="imageUrl(role.imageUrl)" mode="aspectFit" />
					<view class="role-name">{{ role.roleName }}</view>
					<view class="role-job">{{ role.jobTitle }}</view>
					<view class="role-rule">{{ shortRule(role.survivalRule) }}</view>
					<view v-if="selectedId === role.roleId" class="check-mark">✓</view>
				</view>
			</view>
		</scroll-view>

		<view class="footer">
			<view class="submit" :class="{ disabled: !selectedId || submitting }" @click="submit">
				{{ submitting ? '正在保存…' : '查看角色档案' }}
			</view>
		</view>
	</view>
</template>

<script>
	import { getRoles, getRecord, selectRole, userMessage } from '@/api/zyjdc'
	import ZyjdcHeader from '@/components/ZyjdcHeader.vue'
	import config from '@/config/api.js'

	export default {
		components: { ZyjdcHeader },
		data: () => ({
			instanceId: '',
			gameId: '',
			recordId: '',
			roles: [],
			selectedId: null,
			loading: false,
			submitting: false
		}),
		async onLoad(options) {
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			this.recordId = options.recordId || ''
			await this.loadRoles()
			await this.restore()
		},
		methods: {
			imageUrl(value) {
				if (!value) return ''
				if (/^https?:\/\//i.test(value)) return value
				return config.BASE_URL + (value.charAt(0) === '/' ? value : '/' + value)
			},
			shortRule(value) {
				if (!value) return ''
				return value.length > 24 ? value.substring(0, 24) + '…' : value
			},
			async loadRoles() {
				this.loading = true
				try {
					const res = await getRoles()
					this.roles = res.data || []
				} catch (e) {
					uni.showToast({ title: userMessage(e, '角色加载失败，请稍后重试'), icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			async restore() {
				if (!this.recordId) return
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = res.data || {}
					if (data.result || data.status === 'finished') {
						this.goResult()
						return
					}
					if (data.stage === 'playing') {
						uni.redirectTo({ url: this.baseUrl('/pages/zyjdc/index') })
						return
					}
					if (data.stage === 'role_selected') {
						uni.redirectTo({ url: this.baseUrl('/pages/zyjdc/role') })
						return
					}
					if (data.roleId) this.selectedId = data.roleId
				} catch (e) {
					uni.showToast({ title: userMessage(e, '对局信息加载失败，请重新扫码'), icon: 'none' })
				}
			},
			select(role) {
				if (this.submitting) return
				this.selectedId = role.roleId
			},
			baseUrl(path) {
				return `${path}?recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
			},
			async submit() {
				if (!this.selectedId || this.submitting) return
				if (!this.recordId) {
					uni.showToast({ title: '游戏记录不存在，请重新扫码', icon: 'none' })
					return
				}
				this.submitting = true
				try {
					await selectRole(this.recordId, this.selectedId)
					uni.redirectTo({ url: this.baseUrl('/pages/zyjdc/role') })
				} catch (e) {
					uni.showToast({ title: userMessage(e, '角色保存失败，请稍后重试'), icon: 'none' })
				} finally {
					this.submitting = false
				}
			},
			goResult() {
				uni.redirectTo({ url: this.baseUrl('/pages/zyjdc/result') })
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
		padding: 0 28rpx 180rpx;
		box-sizing: border-box;
	}

	.intro {
		padding: 18rpx 4rpx 10rpx;
	}

	.intro-title {
		display: block;
		font-size: 38rpx;
		font-weight: 600;
		color: #ffffff;
	}

	.intro-desc {
		display: block;
		margin-top: 12rpx;
		font-size: 24rpx;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.62);
	}

	.state-box {
		margin-top: 80rpx;
		text-align: center;
		font-size: 26rpx;
		color: rgba(255, 255, 255, 0.66);
	}

	.retry {
		display: inline-block;
		margin-top: 24rpx;
		padding: 12rpx 36rpx;
		border-radius: 30rpx;
		color: #0a2038;
		background: #f3c96b;
	}

	.role-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		margin-top: 10rpx;
	}

	.role-card {
		position: relative;
		width: 48.4%;
		margin-bottom: 22rpx;
		padding: 22rpx 16rpx 20rpx;
		box-sizing: border-box;
		border-radius: 22rpx;
		text-align: center;
		background: rgba(255, 255, 255, 0.07);
		border: 2rpx solid rgba(255, 255, 255, 0.1);
		transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
	}

	.role-card.active {
		background: rgba(243, 201, 107, 0.14);
		border-color: #f3c96b;
		transform: translateY(-2rpx);
	}

	.rank-badge {
		position: absolute;
		top: 12rpx;
		left: 14rpx;
		width: 38rpx;
		height: 38rpx;
		line-height: 38rpx;
		text-align: center;
		font-size: 20rpx;
		color: #0a2038;
		background: rgba(243, 201, 107, 0.86);
		border-radius: 50%;
	}

	.role-img {
		width: 130rpx;
		height: 130rpx;
	}

	.role-name {
		margin-top: 8rpx;
		font-size: 34rpx;
		font-weight: 600;
		color: #ffffff;
	}

	.role-job {
		margin-top: 4rpx;
		font-size: 23rpx;
		color: #f3c96b;
	}

	.role-rule {
		margin-top: 10rpx;
		font-size: 21rpx;
		line-height: 1.55;
		color: rgba(255, 255, 255, 0.55);
	}

	.check-mark {
		position: absolute;
		top: 12rpx;
		right: 14rpx;
		width: 36rpx;
		height: 36rpx;
		line-height: 36rpx;
		text-align: center;
		font-size: 22rpx;
		color: #0a2038;
		background: #f3c96b;
		border-radius: 50%;
	}

	.footer {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 18rpx 32rpx calc(18rpx + env(safe-area-inset-bottom));
		background: rgba(8, 26, 48, 0.94);
		border-top: 1rpx solid rgba(255, 255, 255, 0.08);
	}

	.submit {
		height: 92rpx;
		line-height: 92rpx;
		text-align: center;
		border-radius: 46rpx;
		font-size: 32rpx;
		font-weight: 600;
		letter-spacing: 3rpx;
		color: #0a2038;
		background: linear-gradient(135deg, #ffd985 0%, #f3c96b 55%, #e2a93d 100%);
	}

	.submit.disabled {
		opacity: 0.45;
	}
</style>
