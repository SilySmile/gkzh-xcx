<template>
	<view class="page">
		<view class="stage">
			<image class="stage-bg" :src="assets.bgChoose" mode="scaleToFill"></image>

			<ZmwlHeader @back="back" />

			<image class="title" :src="assets.title" mode="widthFix"></image>
			<image class="subtitle" :src="assets.subtitle" mode="widthFix"></image>

			<view v-for="(item, index) in directions" :key="item.directionCode" class="card"
				:class="['pos-' + index, { active: selected === item.directionCode }]" @click="select(item)">
				<image class="card-bg" :src="assets.optionCard" mode="scaleToFill"></image>
				<image v-if="iconOf(item)" class="card-icon" :src="iconOf(item)" mode="heightFix"></image>
				<text class="card-name">{{ item.name }}</text>
				<text class="card-intro">{{ item.shortIntro }}</text>
				<view v-if="selected === item.directionCode" class="card-check">✓</view>
			</view>

			<view class="confirm" :class="{ disabled: !selected, pressed: pressing }"
				@touchstart="pressing = true" @touchend="pressing = false" @touchcancel="pressing = false"
				@click="confirm">
				<image class="confirm-bg" :src="assets.btnBlue" mode="scaleToFill"></image>
				<image class="confirm-text" :src="assets.btnConfirmText" mode="widthFix"></image>
			</view>
		</view>
	</view>
</template>

<script>
	import ZmwlHeader from '@/components/ZmwlHeader.vue'
	import assets from '@/config/zmwl-assets.js'
	import { getRecord, chooseDirection, userMessage } from '@/api/zmwl'

	/**
	 * 职面未来第二页：选择未来发展方向。
	 * 8 个方向按后台配置顺序排成两列，选中后点击“确定我的选择”提交，确认后默认只读。
	 * 卡片位置使用固定类名（pos-0 ~ pos-7），不使用动态 :style，避免小程序端把样式对象渲染成 [object Object]。
	 */

	export default {
		components: { ZmwlHeader },
		data: () => ({
			assets,
			instanceId: '',
			gameId: '',
			recordId: '',
			directions: [],
			selected: '',
			submitting: false,
			pressing: false
		}),
		async onLoad(options) {
			this.instanceId = options.instanceId || options.activityId || ''
			this.gameId = options.gameId || ''
			this.recordId = options.recordId || ''
			if (!this.recordId) {
				uni.showToast({ title: '缺少参与记录，请重新扫码进入', icon: 'none' })
				return
			}
			await this.load()
		},
		methods: {
			async load() {
				try {
					const res = await getRecord(this.recordId, { instanceId: this.instanceId, gameId: this.gameId })
					const data = res.data || {}
					if (data.status === 'finished') {
						this.toResult()
						return
					}
					this.directions = (data.directions || []).slice(0, 8)
					const current = this.directions.find(item => item.selected)
					this.selected = current ? current.directionCode : ''
					// 服务端字段错误时仍允许学生重新选择，不弹无意义的拦截。
					if (!this.directions.length) {
						uni.showToast({ title: '方向加载失败，请返回重试', icon: 'none' })
					}
				} catch (e) {
					uni.showToast({ title: userMessage(e, '方向加载失败，请稍后重试'), icon: 'none' })
				}
			},
			iconOf(item) {
				return (assets.icons && assets.icons[item.directionCode]) || ''
			},
			select(item) {
				if (this.submitting) return
				this.selected = item.directionCode
			},
			async confirm() {
				if (this.submitting) return
				if (!this.selected) {
					uni.showToast({ title: '请先选择一个未来发展方向', icon: 'none' })
					return
				}
				this.submitting = true
				uni.showLoading({ title: '正在生成…', mask: true })
				try {
					await chooseDirection(this.recordId, this.selected)
					uni.hideLoading()
					this.toResult()
				} catch (e) {
					uni.hideLoading()
					uni.showToast({ title: userMessage(e, '确认选择失败，请稍后重试'), icon: 'none' })
					// “已确认”类错误说明服务端已有结果，直接进入选择卡。
					if (/已确认|不可修改/.test(String((e && e.message) || ''))) {
						this.toResult()
					}
				} finally {
					this.submitting = false
				}
			},
			toResult() {
				uni.redirectTo({
					url: `/pages/zmwl/result?recordId=${encodeURIComponent(this.recordId)}&instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}`
				})
			},
			back() {
				const pages = getCurrentPages()
				if (pages.length > 1) {
					uni.navigateBack({ delta: 1 })
					return
				}
				uni.redirectTo({
					url: `/pages/zmwl/start?instanceId=${encodeURIComponent(this.instanceId)}&gameId=${encodeURIComponent(this.gameId)}&recordId=${encodeURIComponent(this.recordId)}`
				})
			}
		}
	}
</script>

<style scoped>
	.page {
		width: 100%;
		min-height: 100vh;
		background: #a9d9f7;
		overflow-x: hidden;
	}

	.stage {
		position: relative;
		width: 750rpx;
		height: 1624rpx;
		margin: 0 auto;
		overflow: hidden;
	}

	.stage-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 750rpx;
		height: 1624rpx;
	}

	.title {
		position: absolute;
		left: 75rpx;
		top: 48rpx;
		width: 600rpx;
	}

	.subtitle {
		position: absolute;
		left: 115rpx;
		top: 336rpx;
		width: 520rpx;
	}

	.card {
		position: absolute;
		width: 280rpx;
		height: 196rpx;
		padding: 10rpx 14rpx 0;
		border-radius: 22rpx;
		box-sizing: border-box;
		text-align: center;
		overflow: hidden;
		transition: transform 0.12s ease;
	}

	/* 两列四行固定位置：行间距 66rpx、列间距 40rpx，底部与按钮留出空隙。 */
	.card.pos-0 { left: 82rpx; top: 474rpx; }
	.card.pos-1 { left: 402rpx; top: 474rpx; }
	.card.pos-2 { left: 82rpx; top: 736rpx; }
	.card.pos-3 { left: 402rpx; top: 736rpx; }
	.card.pos-4 { left: 82rpx; top: 998rpx; }
	.card.pos-5 { left: 402rpx; top: 998rpx; }
	.card.pos-6 { left: 82rpx; top: 1260rpx; }
	.card.pos-7 { left: 402rpx; top: 1260rpx; }

	.card-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		border-radius: 24rpx;
	}

	.card.active {
		transform: translateY(-4rpx);
		box-shadow: 0 10rpx 24rpx rgba(47, 122, 229, 0.28);
	}

	.card.active .card-bg {
		border: 5rpx solid #2f7ae5;
		box-sizing: border-box;
	}

	.card-icon {
		position: relative;
		z-index: 1;
		display: block;
		height: 74rpx;
		margin: 0 auto;
	}

	.card-name {
		position: relative;
		z-index: 1;
		display: block;
		margin-top: 2rpx;
		font-size: 28rpx;
		font-weight: 700;
		line-height: 1.2;
		color: #123a7a;
		letter-spacing: 1rpx;
	}

	.card-intro {
		position: relative;
		z-index: 1;
		display: block;
		margin-top: 2rpx;
		height: 52rpx;
		overflow: hidden;
		font-size: 20rpx;
		line-height: 1.3;
		color: #4a5f80;
	}

	.card-check {
		position: absolute;
		right: 12rpx;
		top: 10rpx;
		z-index: 2;
		width: 38rpx;
		height: 38rpx;
		border-radius: 50%;
		line-height: 38rpx;
		text-align: center;
		font-size: 24rpx;
		font-weight: 700;
		color: #ffffff;
		background: #2f7ae5;
	}

	.confirm {
		position: absolute;
		left: 158rpx;
		top: 1494rpx;
		z-index: 20;
		width: 434rpx;
		height: 92rpx;
		transition: transform 0.12s ease;
	}

	.confirm.pressed {
		transform: scale(0.97);
	}

	.confirm.disabled {
		opacity: 0.55;
	}

	.confirm-bg {
		position: absolute;
		left: 0;
		top: 0;
		width: 434rpx;
		height: 92rpx;
	}

	.confirm-text {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 330rpx;
		transform: translate(-50%, -50%);
	}
</style>
