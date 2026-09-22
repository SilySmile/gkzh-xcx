<template>
	<view class="page">
		<zycck-header title="探职业" />

		<view class="hero">
			<image class="hero-background" src="https://zhiye.sxgkzh.cn/imgs/zycck/JTRSZYBanner.png" mode="aspectFill" />
			<view class="hero-copy">
				<image class="hello-image" src="https://zhiye.sxgkzh.cn/imgs/zycck/hello.png" mode="widthFix" />
				<text class="hero-title">今天认识的未来职业</text>
				<text class="hero-subtitle">我们为你整理了本次游戏中认识的职业</text>
			</view>
		</view>

		<view class="content">
			<view v-if="careers.length" class="career-list">
				<view v-for="(career, index) in careers" :key="index" class="career-card">
					<view class="career-content">
						<text class="career-name">{{ career.name }}</text>
						<text class="career-intro">{{ career.intro || '了解职业内容，发现未来的更多可能' }}</text>
					</view>
					<view class="decoration-circle decoration-circle-light"></view>
					<view class="decoration-circle decoration-circle-deep"></view>
					<image class="corner-icon" src="https://zhiye.sxgkzh.cn/imgs/zycck/xc.png" mode="aspectFit" />
				</view>
			</view>
			<view v-else class="empty-card">
				<text class="empty-tip">暂时没有可展示的职业</text>
			</view>

			<button class="action-button" hover-class="button-hover" @click="goExplore">请继续探索职业世界</button>
		</view>
	</view>
</template>

<script>
	import {
		getRecord,
		getCatalog,
		userMessage
	} from '@/api/zycck'
	import ZycckHeader from '@/components/ZycckHeader.vue'
	import config from '@/config/api.js'

	export default {
		components: {
			ZycckHeader
		},
		data: () => ({
			recordId: '',
			instanceId: '',
			gameId: '',
			careers: []
		}),
		onLoad(o) {
			Object.assign(this, {
				recordId: o.recordId || '',
				instanceId: o.instanceId || '',
				gameId: o.gameId || ''
			});
			this.load()
		},
		methods: {
			imageUrl(value) {
				return value && (/^\/(profile|upload)\//.test(value) ? config.BASE_URL + value : value)
			},
			async load() {
				try {
					const [recordRes, catalogRes] = await Promise.all([getRecord(this.recordId), getCatalog({
						instanceId: this.instanceId,
						gameId: this.gameId
					})])
					const recordData = recordRes.data || {}
					const record = recordData.record || recordData
					let ids = record.careerIds || []
					if (!Array.isArray(ids)) {
						try {
							ids = JSON.parse(ids || '[]')
						} catch (e) {
							ids = []
						}
					}
					const catalog = catalogRes.data || {}
					const careers = catalog.careers || catalog.items || catalog.questions || []
					const byId = {};
					careers.forEach(item => {
						byId[String(item.careerId || item.careerQuestionId)] = item
					})
					this.careers = ids.map(id => byId[String(id)]).filter(Boolean).slice(0, 5).map(item => ({
						name: item.careerName || item.name,
						intro: item.oneLineIntro || item.intro,
						image: item.careerImageUrl,
						categoryId: item.categoryId
					}))
				} catch (e) {
					uni.showToast({
						title: userMessage(e, '总结内容加载失败，请重试'),
						icon: 'none'
					})
				}
			},
			goExplore() {
				uni.redirectTo({
					url: `/pages/zycck/categories?recordId=${this.recordId}&instanceId=${this.instanceId}&gameId=${this.gameId}&readOnly=0`
				})
			}
		}
	}
</script>

<style scoped>
	.page {
		min-height: 100vh;
		box-sizing: border-box;
		background: #f8f8f8;
		animation: pageIn .35s ease-out;
	}

	.hero {
		position: relative;
		height: 412rpx;
		overflow: hidden;
		background: #b994c7;
	}

	.hero-background {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.hero-copy {
		position: relative;
		z-index: 1;
		box-sizing: border-box;
		width: 58%;
		padding: 45rpx 0 0 52rpx;
	}

	.hello-image {
		display: block;
		width: 222rpx;
		height: auto;
	}

	.hero-title,
	.hero-subtitle {
		display: block;
	}

	.hero-title {
		margin-top: 15rpx;
		font-size: 35rpx;
		line-height: 1.3;
		font-weight: 800;
		color: #202025;
	}

	.hero-subtitle {
		margin-top: 14rpx;
		font-size: 20rpx;
		line-height: 1.5;
		white-space: nowrap;
		color: #615a67;
	}

	.content {
		position: relative;
		z-index: 1;
		box-sizing: border-box;
		width: 100%;
		padding: 0 12rpx 58rpx;
		margin-top: -128rpx;
	}

	.career-list {
		width: 100%;
	}

	.career-card,
	.empty-card {
		position: relative;
		overflow: hidden;
		box-sizing: border-box;
		width: 100%;
		min-height: 160rpx;
		padding: 31rpx 42rpx;
		margin-bottom: 38rpx;
		border: 1rpx solid rgba(24, 34, 48, .06);
		border-radius: 28rpx;
		background: #fff;
		box-shadow: 0 5rpx 14rpx rgba(41, 34, 47, .12);
	}

	.career-content {
		position: relative;
		z-index: 2;
		box-sizing: border-box;
		width: calc(100% - 70rpx);
	}

	.career-name,
	.career-intro {
		display: block;
	}

	.career-name {
		font-size: 34rpx;
		font-weight: 800;
		line-height: 1.25;
		color: #111215;
	}

	.career-intro {
		margin-top: 12rpx;
		font-size: 25rpx;
		line-height: 1.4;
		color: #99999e;
	}

	.decoration-circle {
		position: absolute;
		z-index: 0;
		border-radius: 50%;
	}

	.decoration-circle-light {
		right: 59rpx;
		bottom: -75rpx;
		width: 132rpx;
		height: 132rpx;
		background: #f5f1f7;
	}

	.decoration-circle-deep {
		right: -58rpx;
		bottom: -65rpx;
		width: 144rpx;
		height: 144rpx;
		background: #f2e9f3;
	}

	.corner-icon {
		position: absolute;
		z-index: 2;
		right: 0;
		bottom: -8rpx;
		width: 112rpx;
		height: 112rpx;
	}

	.empty-card {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.empty-tip {
		color: #99999e;
		font-size: 26rpx;
	}

	.action-button {
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		width: 370rpx;
		height: 70rpx;
		padding: 0;
		margin: 28rpx auto 0;
		border: 0;
		border-radius: 999rpx;
		background: #25b58e;
		box-shadow: 0 8rpx 18rpx rgba(37, 181, 142, .16);
		color: #fff;
		font-size: 28rpx;
		font-weight: 500;
		line-height: 70rpx;
	}

	.action-button::after {
		border: 0;
	}

	.button-hover {
		opacity: .86;
	}

	@keyframes pageIn {
		from {
			opacity: 0;
			transform: translateY(18rpx);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
