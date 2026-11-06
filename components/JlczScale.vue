<template>
	<view class="scale" :class="size">
		<view class="beam" :style="beamStyle">
			<view class="beam-bar"></view>
			<view class="hang left" :style="hangStyle">
				<view class="wire"></view>
				<view class="pan left">
					<text class="pan-cap">{{ leftText }}</text>
					<text class="pan-val">{{ leftWeight }}g</text>
				</view>
			</view>
			<view class="hang right" :style="hangStyle">
				<view class="wire"></view>
				<view class="pan right" :class="{ pass: isPass }">
					<text class="pan-cap">{{ rightText }}</text>
					<text class="pan-val">{{ rightDisplay }}</text>
				</view>
			</view>
		</view>
		<view class="pillar"></view>
		<view class="base"></view>
		<view class="pivot"></view>
		<view class="needle" :style="needleStyle"></view>
	</view>
</template>

<script>
	/**
	 * 简历称重天平：纯 CSS 绘制的黄铜天平。
	 * 左盘为标准砝码，右盘为本次勾选总重；右侧越重横梁顺时针倾斜，托盘始终保持水平。
	 * right 为空时表示尚未称重，天平保持水平并显示问号。
	 */
	export default {
		name: 'JlczScale',
		props: {
			// 左盘标准重量（克）。
			leftWeight: {
				type: Number,
				default: 80
			},
			// 右盘当前重量（克）；null 表示尚未称重。
			right: {
				type: Number,
				default: null
			},
			// 通关阈值（克），达到后右盘变为绿色。
			passWeight: {
				type: Number,
				default: 80
			},
			// 左盘说明文字。
			leftText: {
				type: String,
				default: '标准砝码'
			},
			// 右盘说明文字。
			rightText: {
				type: String,
				default: '我的简历'
			},
			// normal 用于游戏/结果页，compact 用于开始页预览。
			size: {
				type: String,
				default: 'normal'
			}
		},
		computed: {
			angle() {
				if (this.right === null || this.right === undefined || Number.isNaN(Number(this.right))) {
					return 0
				}
				// 总重与标准相差 125g 时约为 18 度，最大不超过 18 度，避免托盘跑出卡片。
				const diff = Number(this.right) - Number(this.leftWeight)
				return Math.max(-18, Math.min(18, (diff / 125) * 36))
			},
			beamStyle() {
				return `transform: rotate(${this.angle}deg);`
			},
			hangStyle() {
				// 托盘随横梁移动，但反向旋转保持水平。
				return `transform: rotate(${-this.angle}deg);`
			},
			needleStyle() {
				return `transform: translateX(-50%) rotate(${this.angle}deg);`
			},
			isPass() {
				return this.right !== null && this.right !== undefined && Number(this.right) >= Number(this.passWeight)
			},
			rightDisplay() {
				if (this.right === null || this.right === undefined) {
					return '?'
				}
				return `${this.right}g`
			}
		}
	}
</script>

<style scoped>
	.scale {
		position: relative;
		width: 100%;
	}

	.scale.normal {
		height: 320rpx;
	}

	.scale.compact {
		height: 250rpx;
	}

	.beam {
		position: absolute;
		left: 50%;
		top: 48rpx;
		width: 500rpx;
		height: 12rpx;
		margin-left: -250rpx;
		transform-origin: 50% 50%;
		transition: transform 0.5s cubic-bezier(0.22, 0.9, 0.3, 1);
		z-index: 3;
	}

	.beam-bar {
		width: 100%;
		height: 100%;
		border-radius: 8rpx;
		background: linear-gradient(90deg, #8a6122 0%, #d9b26b 22%, #f0d9a6 50%, #d9b26b 78%, #8a6122 100%);
		box-shadow: 0 4rpx 8rpx rgba(108, 74, 26, 0.22);
	}

	.hang {
		position: absolute;
		top: 6rpx;
		width: 0;
		height: 0;
		transform-origin: 0 0;
		transition: transform 0.5s cubic-bezier(0.22, 0.9, 0.3, 1);
	}

	.hang.left {
		left: 2rpx;
	}

	.hang.right {
		right: 2rpx;
	}

	.wire {
		position: absolute;
		left: -1rpx;
		top: 0;
		width: 3rpx;
		height: 78rpx;
		border-radius: 3rpx;
		background: linear-gradient(180deg, #b99a67, #8a6122);
	}

	.pan {
		position: absolute;
		top: 74rpx;
		left: 0;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 170rpx;
		height: 78rpx;
		border-radius: 14rpx;
		border: 2rpx solid #dcc59c;
		background: linear-gradient(180deg, #fffdf8 0%, #f4e9d4 100%);
		box-shadow: 0 8rpx 16rpx rgba(120, 84, 34, 0.14);
		box-sizing: border-box;
	}

	.pan.right.pass {
		border-color: #9ac4a5;
		background: linear-gradient(180deg, #f4fbf5 0%, #e4f3e8 100%);
	}

	.pan-cap {
		font-size: 19rpx;
		line-height: 1.2;
		color: #9a8a70;
	}

	.pan-val {
		margin-top: 2rpx;
		font-size: 34rpx;
		line-height: 1.1;
		font-weight: 700;
		color: #3b3327;
	}

	.pan.right.pass .pan-val {
		color: #2f7d4f;
	}

	.pillar {
		position: absolute;
		left: 50%;
		top: 54rpx;
		width: 18rpx;
		height: 214rpx;
		margin-left: -9rpx;
		border-radius: 9rpx;
		background: linear-gradient(90deg, #8a6122 0%, #d9b26b 35%, #f0d9a6 50%, #d9b26b 65%, #8a6122 100%);
		z-index: 1;
	}

	.base {
		position: absolute;
		left: 50%;
		bottom: 10rpx;
		width: 300rpx;
		height: 36rpx;
		margin-left: -150rpx;
		border-radius: 50%;
		background: linear-gradient(180deg, #d9b26b 0%, #a97c31 55%, #7d551e 100%);
		box-shadow: 0 10rpx 20rpx rgba(111, 76, 28, 0.2);
		z-index: 1;
	}

	.pivot {
		position: absolute;
		left: 50%;
		top: 40rpx;
		width: 36rpx;
		height: 36rpx;
		margin-left: -18rpx;
		border-radius: 50%;
		border: 2rpx solid #8a6122;
		background: radial-gradient(circle at 35% 30%, #f7e6bd 0%, #d9b26b 55%, #a97c31 100%);
		box-shadow: 0 3rpx 6rpx rgba(90, 60, 20, 0.22);
		z-index: 4;
	}

	.needle {
		position: absolute;
		left: 50%;
		top: 58rpx;
		width: 4rpx;
		height: 58rpx;
		border-radius: 4rpx;
		background: #8a6122;
		transform-origin: 50% 0;
		transition: transform 0.5s cubic-bezier(0.22, 0.9, 0.3, 1);
		z-index: 2;
	}

	/* 开始页预览尺寸更紧凑，避免挤占规则说明空间。 */
	.scale.compact .beam {
		top: 38rpx;
		width: 440rpx;
		margin-left: -220rpx;
	}

	.scale.compact .wire {
		height: 58rpx;
	}

	.scale.compact .pan {
		top: 56rpx;
		width: 150rpx;
		height: 64rpx;
		border-radius: 12rpx;
	}

	.scale.compact .pan-cap {
		font-size: 17rpx;
	}

	.scale.compact .pan-val {
		font-size: 28rpx;
	}

	.scale.compact .pillar {
		top: 44rpx;
		height: 160rpx;
		width: 14rpx;
		margin-left: -7rpx;
	}

	.scale.compact .base {
		width: 230rpx;
		height: 28rpx;
		margin-left: -115rpx;
		bottom: 8rpx;
	}

	.scale.compact .pivot {
		top: 31rpx;
		width: 28rpx;
		height: 28rpx;
		margin-left: -14rpx;
	}

	.scale.compact .needle {
		top: 46rpx;
		height: 44rpx;
	}
</style>
