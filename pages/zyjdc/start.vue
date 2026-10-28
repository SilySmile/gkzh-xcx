<template>
	<view class="page">
		<zyjdc-header title="职业角斗场" @back="back" />

		<scroll-view scroll-y class="content">
			<view class="hero">
				<text class="hero-tag">职业认知 · 动物角色</text>
				<text class="title">职业角斗场</text>
				<text class="subtitle">选一个动物角色，进入 7×9 职场斗兽棋</text>

				<view class="animal-row">
					<view v-for="role in heroRoles" :key="role.roleCode" class="animal-chip">
						<image v-if="role.imageUrl" class="animal-img" :src="imageUrl(role.imageUrl)" mode="aspectFit" />
						<text class="animal-name">{{ role.roleName }}</text>
					</view>
				</view>
			</view>

			<view class="rules-card">
				<view class="rules-title">对弈规则</view>
				<view class="rule-item">
					<text class="rule-index">1</text>
					<text class="rule-text">8 种动物按等级对弈：大象 &gt; 狮子 &gt; 老虎 &gt; 豹子 &gt; 狼 &gt; 狐 &gt; 猫 &gt; 老鼠，老鼠可以吃大象。</text>
				</view>
				<view class="rule-item">
					<text class="rule-index">2</text>
					<text class="rule-text">7×9 棋盘，双方各 8 枚棋子（象、狮、虎、豹、狼、狐、猫、鼠各 1 枚），只能上下左右走一格；攻击方等级不低于对方即可吃掉，同级也能吃。</text>
				</view>
				<view class="rule-item">
					<text class="rule-index">3</text>
					<text class="rule-text">3 分钟内吃光对方，或时间到时剩余最高等级棋子更大者获胜；等级相同再比剩余棋子数量。胜利获得通关印戳。</text>
				</view>
				<view class="rule-item">
					<text class="rule-index">4</text>
					<text class="rule-text">失败或平局可以无限次重新挑战，每次都会重置棋盘和 3 分钟计时；通关后结果只读。</text>
				</view>
			</view>

			<view class="flow-card">
				<view class="flow-step"><text class="flow-no">1</text><text>选择动物角色</text></view>
				<text class="flow-arrow">›</text>
				<view class="flow-step"><text class="flow-no">2</text><text>查看角色档案</text></view>
				<text class="flow-arrow">›</text>
				<view class="flow-step"><text class="flow-no">3</text><text>开始对弈</text></view>
			</view>

			<view class="start-wrap">
				<view class="start-button" :class="{ pressed: buttonPressed, disabled: loading }"
					@touchstart="buttonPressed = true" @touchend="buttonPressed = false"
					@touchcancel="buttonPressed = false" @click="start">
					{{ loading ? '正在进入…' : '选择角色' }}
				</view>
				<text class="start-tip">对局结果会生成你的动物角色解读</text>
			</view>
		</scroll-view>
	</view>
</template>

<script>
	import { enterRecord, getRoles, getRecord, userMessage } from '@/api/zyjdc'
	import ZyjdcHeader from '@/components/ZyjdcHeader.vue'
	import config from '@/config/api.js'

	export default {
		components: { ZyjdcHeader },
		data: () => ({
			instanceId: '',
			gameId: '',
			recordId: '',
			loading: false,
			buttonPressed: false,
			roles: [],
			// 首屏只展示 4 个代表角色，避免小屏拥挤。
			heroCodes: ['elephant', 'lion', 'tiger', 'fox']
		}),
		computed: {
			heroRoles() {
				return this.heroCodes.map(code => this.roles.find(item => item.roleCode === code)).filter(Boolean)
			}
		},
		async onLoad(options) {
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			this.recordId = options.recordId || ''
			this.loadRoles()
			if (!this.recordId && this.instanceId && this.gameId) {
				await this.ensureRecord()
			}
			// 从活动页或“我的报告”再次进入时，已有角色/对局/结果的记录直接恢复到对应页面。
			if (this.recordId) {
				await this.routeExisting()
			}
		},
		methods: {
			imageUrl(value) {
				if (!value) return ''
				if (/^https?:\/\//i.test(value)) return value
				return config.BASE_URL + (value.charAt(0) === '/' ? value : '/' + value)
			},
			loadRoles() {
				getRoles().then(res => {
					this.roles = res.data || []
				}).catch(() => {
					// 角色图加载失败不影响进入游戏，选择页会再次请求并提示。
				})
			},
			async ensureRecord() {
				try {
					const entered = await enterRecord({
						instanceId: this.instanceId,
						gameId: this.gameId,
						gameType: 'zyjdc',
						schoolId: uni.getStorageSync('schoolId')
					})
					this.recordId = entered && entered.data && (entered.data.recordId || entered.data.id)
					if (!this.recordId) throw new Error('记录创建失败')
				} catch (e) {
					uni.showModal({
						title: '无法进入活动',
						content: userMessage(e, '游戏入口校验失败，请重新扫码'),
						showCancel: false
					})
				}
			},
			async routeExisting() {
				try {
					const current = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = current.data || {}
					const base = `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
					if (data.result || data.status === 'finished') {
						uni.redirectTo({ url: `/pages/zyjdc/result?${base}` })
						return
					}
					if (data.stage === 'playing') {
						uni.redirectTo({ url: `/pages/zyjdc/index?${base}` })
						return
					}
					if (data.stage === 'role_selected') {
						uni.redirectTo({ url: `/pages/zyjdc/role?${base}` })
					}
				} catch (e) {
					// 记录尚未创建或参数不足时停留在开始页，由用户点击按钮重新校验。
				}
			},
			async start() {
				if (this.loading) return
				if (!this.instanceId || !this.gameId) {
					uni.showToast({ title: '二维码缺少活动信息，请重新扫码', icon: 'none' })
					return
				}
				if (!this.recordId) {
					await this.ensureRecord()
					if (!this.recordId) return
				}
				this.loading = true
				const base = `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
				try {
					const current = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = current.data || {}
					if (data.result || data.status === 'finished') {
						uni.redirectTo({ url: `/pages/zyjdc/result?${base}` })
						return
					}
					if (data.stage === 'playing') {
						uni.redirectTo({ url: `/pages/zyjdc/index?${base}` })
						return
					}
					if (data.stage === 'role_selected') {
						uni.redirectTo({ url: `/pages/zyjdc/role?${base}` })
						return
					}
					uni.redirectTo({ url: `/pages/zyjdc/select?${base}` })
				} catch (e) {
					uni.showToast({ title: userMessage(e, '游戏启动失败，请稍后重试'), icon: 'none' })
				} finally {
					this.loading = false
					this.buttonPressed = false
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
		background: linear-gradient(160deg, #081a30 0%, #0c2b4a 46%, #123f63 100%);
	}

	.content {
		flex: 1;
		padding: 0 32rpx 48rpx;
		box-sizing: border-box;
	}

	.hero {
		padding: 24rpx 0 8rpx;
		text-align: center;
	}

	.hero-tag {
		display: inline-block;
		padding: 8rpx 20rpx;
		border-radius: 24rpx;
		font-size: 22rpx;
		letter-spacing: 2rpx;
		color: #f3c96b;
		background: rgba(243, 201, 107, 0.14);
		border: 1rpx solid rgba(243, 201, 107, 0.32);
	}

	.title {
		display: block;
		margin-top: 22rpx;
		font-size: 64rpx;
		font-weight: 700;
		letter-spacing: 8rpx;
		color: #ffffff;
	}

	.subtitle {
		display: block;
		margin-top: 14rpx;
		font-size: 26rpx;
		color: rgba(255, 255, 255, 0.66);
	}

	.animal-row {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		margin-top: 32rpx;
	}

	.animal-chip {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 120rpx;
		margin: 0 10rpx 16rpx;
		padding: 12rpx 0 10rpx;
		border-radius: 20rpx;
		background: rgba(255, 255, 255, 0.08);
		border: 1rpx solid rgba(255, 255, 255, 0.12);
	}

	.animal-img {
		width: 76rpx;
		height: 76rpx;
	}

	.animal-name {
		margin-top: 6rpx;
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.82);
	}

	.rules-card,
	.flow-card {
		margin-top: 26rpx;
		padding: 26rpx 24rpx;
		border-radius: 24rpx;
		background: rgba(255, 255, 255, 0.07);
		border: 1rpx solid rgba(255, 255, 255, 0.1);
	}

	.rules-title {
		margin-bottom: 16rpx;
		font-size: 30rpx;
		font-weight: 600;
		color: #f3c96b;
		letter-spacing: 2rpx;
	}

	.rule-item {
		display: flex;
		margin-bottom: 16rpx;
	}

	.rule-item:last-child {
		margin-bottom: 0;
	}

	.rule-index {
		flex-shrink: 0;
		width: 40rpx;
		height: 40rpx;
		margin-right: 14rpx;
		line-height: 40rpx;
		text-align: center;
		font-size: 22rpx;
		color: #0a2038;
		background: #f3c96b;
		border-radius: 50%;
	}

	.rule-text {
		flex: 1;
		font-size: 25rpx;
		line-height: 1.75;
		color: rgba(255, 255, 255, 0.82);
	}

	.flow-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 22rpx 20rpx;
	}

	.flow-step {
		display: flex;
		align-items: center;
		font-size: 23rpx;
		color: rgba(255, 255, 255, 0.8);
	}

	.flow-no {
		width: 34rpx;
		height: 34rpx;
		margin-right: 8rpx;
		line-height: 34rpx;
		text-align: center;
		font-size: 20rpx;
		color: #0a2038;
		background: rgba(243, 201, 107, 0.9);
		border-radius: 50%;
	}

	.flow-arrow {
		font-size: 34rpx;
		color: rgba(255, 255, 255, 0.4);
	}

	.start-wrap {
		margin-top: 40rpx;
		text-align: center;
	}

	.start-button {
		display: inline-block;
		width: 560rpx;
		height: 96rpx;
		line-height: 96rpx;
		border-radius: 48rpx;
		font-size: 34rpx;
		font-weight: 600;
		letter-spacing: 4rpx;
		color: #0a2038;
		background: linear-gradient(135deg, #ffd985 0%, #f3c96b 52%, #e2a93d 100%);
		box-shadow: 0 14rpx 32rpx rgba(0, 0, 0, 0.28);
		transition: transform 0.12s ease, opacity 0.12s ease;
	}

	.start-button.pressed {
		transform: scale(0.97);
		opacity: 0.92;
	}

	.start-button.disabled {
		opacity: 0.65;
	}

	.start-tip {
		display: block;
		margin-top: 16rpx;
		font-size: 23rpx;
		color: rgba(255, 255, 255, 0.5);
	}
</style>
