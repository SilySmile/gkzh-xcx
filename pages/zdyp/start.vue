<template>
	<view class="page">
		<image class="stage-bg" :src="bgImage" mode="scaleToFill"></image>

		<!-- 拼图1：落地页按钮热区（按钮已在底图内） -->
		<block v-if="mode === 'splash'">
			<view class="hot" style="left:136rpx;top:1125rpx;width:470rpx;height:85rpx" @click="onStart"></view>
			<view v-if="finished" class="hot" style="left:136rpx;top:1284rpx;width:470rpx;height:85rpx" @click="onReport"></view>
		</block>

		<!-- 拼图2：规则页“开始游戏”热区 -->
		<block v-else>
			<view class="hot" style="left:42rpx;top:1413rpx;width:664rpx;height:97rpx" @click="onRulesStart"></view>
		</block>

		<ZdypHeader @back="back" />
	</view>
</template>

<script>
	import ZdypHeader from '@/components/ZdypHeader.vue'
	import assets from '@/config/zdyp-assets.js'
	import { enterRecord, getRecord, userMessage } from '@/api/zdyp'

	/**
	 * 职得一拼首页：完全按设计稿还原。
	 * 首次进入展示拼图1（logo + 职得一拼 + 开始游戏/查看报告）；点击开始游戏后展示拼图2 规则页，
	 * 再次点击开始游戏进入闯关。已通关时拼图1 的“查看报告”可用。
	 */
	export default {
		components: { ZdypHeader },
		data: () => ({
			mode: 'splash',
			instanceId: '',
			gameId: '',
			recordId: '',
			finished: false,
			hasProgress: false
		}),
		computed: {
			bgImage() {
				return this.mode === 'rules' ? assets.startRules : assets.startSplash
			}
		},
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
			// 扫码页若已进入过游戏，直接展示规则页，避免学生多点一次。
			if (this.hasProgress && !this.finished) {
				this.mode = 'rules'
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
					this.hasProgress = (data.attemptNo || 0) > 0
				} catch (e) {
					uni.showToast({ title: userMessage(e, '闯关信息加载失败，请重新扫码'), icon: 'none' })
				}
			},
			onStart() {
				if (!this.recordId) {
					uni.showToast({ title: '二维码缺少活动信息，请重新扫码', icon: 'none' })
					return
				}
				if (this.finished) {
					uni.showToast({ title: '本局已通关，可查看职业探索报告', icon: 'none' })
					return
				}
				if (this.mode === 'splash' && !this.hasProgress) {
					this.mode = 'rules'
					return
				}
				this.goGame()
			},
			onRulesStart() {
				this.goGame()
			},
			goGame() {
				const base = `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
				uni.redirectTo({ url: `/pages/zdyp/index?${base}` })
			},
			onReport() {
				const base = `recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
				uni.redirectTo({ url: `/pages/zdyp/result?${base}` })
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
		position: relative;
		width: 750rpx;
		height: 1624rpx;
		min-height: 100vh;
		background: #FEF2CA;
		overflow: hidden;
	}

	.stage-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 750rpx;
		height: 1624rpx;
	}

	.hot {
		position: absolute;
		z-index: 5;
	}
</style>
