<template>
	<view class="page">
		<!-- 返回当前活动周，避免用户只能通过系统返回键离开开始页。 -->
		<view class="back-button" @tap="back">‹</view>
<!-- 		<uni-nav-bar dark :fixed="true" shadow background-color="#007AFF" status-bar title="心愿橱窗" left-icon="left"
			:border="false" @clickLeft="back" /> -->
		<view class="content">
			<!-- 背景图内已包含标题和说明，避免重复叠加页面文字。 -->
			<view
				class="start-button"
				:class="{ pressed: buttonPressed, disabled: starting }"
				@touchstart="buttonPressed = true"
				@touchend="buttonPressed = false"
				@touchcancel="buttonPressed = false"
				@tap="startGame"
			></view>
		</view>
	</view>
</template>

<script>
	import {
		enterWeekGame
	} from '@/api/activity/week'
	import {
		redirectToActivityWeek
	} from '@/utils/activity'

	export default {
		data() {
			return {
				activityId: '',
				gameId: '',
				starting: false,
				buttonPressed: false
			}
		},
		onLoad(options) {
			this.activityId = options.activityId || uni.getStorageSync('activityId') || ''
			this.gameId = options.gameId || ''
			if (!this.activityId) uni.showToast({
				title: '活动参数错误，请重新扫码',
				icon: 'none'
			})
		},
		methods: {
			back() {
				redirectToActivityWeek()
			},
			async startGame() {
				if (!this.activityId || this.starting) return
				this.buttonPressed = false
				this.starting = true
				try {
					// 心愿橱窗进入时必须把活动实例传给后端，避免同一游戏被其他活动复用。
					if (this.gameId) await enterWeekGame(this.gameId, this.activityId)
					uni.redirectTo({
						url: '/pages/xycc/index?activityId=' + encodeURIComponent(this.activityId) + (this
							.gameId ? '&gameId=' + encodeURIComponent(this.gameId) : '')
					})
				} catch (e) {
					uni.showToast({
						title: '游戏入口已失效，请重新扫码进入',
						icon: 'none'
					})
					this.starting = false
				}
			}
		}
	}
</script>

<style scoped>
	.page {
		min-height: 100vh;
		background-color: #ffd296;
		background-image: url('https://zhiye.sxgkzh.cn/imgs/xycc/bg/startBg.png');
		background-repeat: no-repeat;
		background-position: center center;
		/* 完整保留背景图比例及内容：不拉伸、不裁切。 */
		background-size: contain;
	}

	.content {
		min-height: calc(100vh - 88px);
		display: flex;
		align-items: flex-end;
		justify-content: center;
		box-sizing: border-box;
		padding: 0 0 60rpx;
	}

	.start-button {
		/*
		 * 图片为 2835 × 2835 的透明画布，实际按钮仅为中间 803 × 261 区域。
		 * 这里裁取可见区域，使触摸范围与按钮图形完全一致。
		 */
		width: 480rpx;
		height: 156rpx;
		background-image: url('https://zhiye.sxgkzh.cn/imgs/xycc/bg/buttonOn.png');
		background-repeat: no-repeat;
		background-size: 1695rpx 1695rpx;
		background-position: -591rpx -757rpx;
		overflow: hidden;
	}

	.start-button.pressed {
		background-image: url('https://zhiye.sxgkzh.cn/imgs/xycc/bg/buttonDown.png');
		background-position: -573rpx -1060rpx;
	}

	.start-button.disabled {
		opacity: .65;
		pointer-events: none;
	}

	/* 左上角独立返回按钮，保证在自定义背景页上清晰且易点击。 */
	.back-button {
		position: fixed;
		top: calc(var(--status-bar-height) + 20rpx);
		left: 24rpx;
		z-index: 10;
		width: 64rpx;
		height: 64rpx;
		border-radius: 50%;
		background: rgba(255, 255, 255, .82);
		color: #8a5a25;
		font-size: 56rpx;
		line-height: 54rpx;
		text-align: center;
		box-shadow: 0 4rpx 12rpx rgba(102, 68, 30, .2);
	}
</style>
