<template>
	<view class="page">
		<zycck-header title="探职业" />
		<text class="title">今天认识的未来职业</text>
		<view class="summary-card">
			<view v-for="(career, index) in careers" :key="index" class="career-row">
				<image v-if="career.image" class="career-image" :src="imageUrl(career.image)" mode="aspectFill" />
				<view class="career-content"><text class="career-name">{{ career.name }}</text><text
						class="career-intro">{{ career.intro || '暂无介绍' }}</text></view>
			</view>
			<image class="corner-icon" src="https://zhiye.sxgkzh.cn/imgs/zycck/xc.png" mode="aspectFit" />
		</view>
		<button type="primary" hover-class="button-hover" @click="goExplore">请继续探索职业世界</button>
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
		components: { ZycckHeader },
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
		padding: 44rpx 30rpx 60rpx;
		box-sizing: border-box;
		background: #f5f7fb;
		display: flex;
		flex-direction: column;
		justify-content: center;
		animation: pageIn .35s ease-out;
		/* background-image: url("https://zhiye.sxgkzh.cn/imgs/zycck/bg.png"); */
		/* background-size: 120%; */
	}

	.title {
		display: block;
		text-align: center;
		font-size: 48rpx;
		font-weight: 800;
		color: #1a2c4a;
		margin-bottom: 26rpx
	}

	.summary-card,
	.chart-card {
		position: relative;
		background: rgba(255, 255, 255);
		border-radius: 24rpx;
		padding: 28rpx 26rpx;
		box-shadow: 0 8rpx 28rpx rgba(31, 41, 55, .06)
	}

	.corner-icon {
		position: absolute;
		right: 16rpx;
		bottom: 14rpx;
		width: 38rpx;
		height: 38rpx
	}

	.career-row {
		display: flex;
		align-items: center;
		padding: 17rpx 0;
		/* border-bottom: 1rpx solid #eef1f5 */
	}

	.career-image {
		width: 118rpx;
		height: 96rpx;
		flex: 0 0 118rpx;
		margin-right: 20rpx;
		border-radius: 16rpx;
		background: #eef1f5
	}

	.career-content {
		flex: 1;
		min-width: 0
	}

	.career-name {
		display: block;
		font-size: 30rpx;
		font-weight: 700;
		color: #263548
	}

	.career-intro {
		display: block;
		margin-top: 7rpx;
		font-size: 24rpx;
		line-height: 1.5;
		color: #7a8798
	}

	.chart-card {
		margin-top: 22rpx;
		text-align: center
	}

	.chart-title {
		display: block;
		font-size: 30rpx;
		font-weight: 700;
		color: #263548
	}

	.pie {
		display: block;
		width: 320rpx;
		height: 320rpx;
		margin: 10rpx auto
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 14rpx 24rpx
	}

	.legend-item {
		display: flex;
		align-items: center;
		color: #64748b;
		font-size: 23rpx
	}

	.dot {
		width: 18rpx;
		height: 18rpx;
		border-radius: 50%;
		margin-right: 7rpx
	}

	button {
		margin-top: 28rpx
	}

	.button-hover {
		opacity: .8;
		transform: scale(.98)
	}

	@keyframes pageIn {
		from {
			opacity: 0;
			transform: translateY(18rpx)
		}

		to {
			opacity: 1;
			transform: translateY(0)
		}
	}

	.button-hover {
		transform: none !important
	}

	.card-hover {
		transform: none !important
	}

	.awareness-hover {
		transform: none !important
	}
</style>
