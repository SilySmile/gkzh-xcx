<template>
	<scroll-view scroll-y class="page">
		<view class="page-surface">
			<zycck-header title="探职业" />
			<view class="content">
				<view class="hero">
					<text class="title">未来职业探索墙</text>
					<text class="subtitle">现在，自己去找找你感兴趣了解的职业。</text>
				</view>

				<view v-if="careers.length" class="grid">
					<view v-for="item in careers" :key="item.careerId" class="card" hover-class="card-hover"
						@click="open(item)">
						<view class="card-copy">
							<text class="name">{{ item.careerName }}</text>
							<text v-if="item.oneLineIntro" class="intro">{{ item.oneLineIntro }}</text>
							<text v-if="item.viewed" class="viewed">已查看</text>
						</view>
						<view class="decoration-circle decoration-circle-light" />
						<view class="decoration-circle decoration-circle-deep" />
						<image class="corner-icon" src="https://zhiye.sxgkzh.cn/imgs/zycck/xc.png" mode="aspectFit" />
					</view>
				</view>
				<view v-else class="empty-card">
					<text>该分类下暂无可探索职业</text>
				</view>

				<text class="tip">点击职业卡片进一步了解具体职业信息</text>
			</view>
		</view>
	</scroll-view>
</template>

<script>
	import {
		getCatalog,
		getRecord,
		userMessage
	} from '@/api/zycck'
	import ZycckHeader from '@/components/ZycckHeader.vue'

	export default {
		components: {
			ZycckHeader
		},
		data: () => ({
			recordId: '',
			instanceId: '',
			gameId: '',
			categoryId: '',
			careers: [],
			readOnly: false
		}),
		onLoad(o) {
			Object.assign(this, {
				recordId: o.recordId || '',
				instanceId: o.instanceId || '',
				gameId: o.gameId || '',
				categoryId: o.categoryId || '',
				readOnly: o.readOnly === '1'
			})
			this.load()
		},
		methods: {
			async load() {
				try {
					if (this.readOnly) return this.goReport()
					const r = await getCatalog({
						instanceId: this.instanceId,
						gameId: this.gameId
					})
					const d = r.data || {}
					const rows = d.careers || d.items || d.questions || []
					let viewed = []
					if (this.recordId) {
						try {
							const rr = await getRecord(this.recordId)
							const rd = rr.data || {}
							if (rd.status === 'finished' || (rd.record && rd.record.status === 'finished')) return this.goReport()
							const raw = (rd.record && rd.record.viewedCareerIds) || rd.viewedCareerIds
							viewed = Array.isArray(raw) ? raw : JSON.parse(raw || '[]')
						} catch (e) {}
					}
					this.careers = rows.filter(x => String(x.hasQuestion) !== '1' && (!this.categoryId || String(x.categoryId) === String(this.categoryId))).map(x => ({
						...x,
						careerId: x.careerId || x.careerQuestionId,
						careerName: x.careerName || x.name || x.title,
						viewed: viewed.some(id => String(id) === String(x.careerId || x.careerQuestionId))
					}))
				} catch (e) {
					uni.showToast({
						title: userMessage(e, '职业列表加载失败，请重试'),
						icon: 'none'
					})
				}
			},
			open(i) {
				uni.redirectTo({
					url: `/pages/zycck/career-detail?recordId=${this.recordId}&instanceId=${this.instanceId}&gameId=${this.gameId}&categoryId=${this.categoryId}&careerId=${i.careerId}&readOnly=0`
				})
			},
			goReport() {
				uni.redirectTo({
					url: `/pages/zycck/report?recordId=${this.recordId}&instanceId=${this.instanceId}&gameId=${this.gameId}`
				})
			}
		}
	}
</script>

<style scoped>
	.page {
		height: 100vh;
		background: #fff;
	}

	.page-surface {
		position: relative;
		overflow: hidden;
		box-sizing: border-box;
		min-height: 100vh;
		border-top: 4rpx solid #a66da4;
		border-radius: 56rpx 56rpx 0 0;
		background: linear-gradient(180deg, #d0b6d2 0%, #d0b6d2 25%, #d7c4dc 47%, #e4ddea 72%, #ebebf4 86%, #ebebf4 100%);
	}

	.content {
		box-sizing: border-box;
		min-height: calc(100vh - 108rpx);
		padding: 174rpx 34rpx 150rpx;
		animation: pageIn .35s ease-out;
	}

	.hero {
		text-align: center;
	}

	.title,
	.subtitle,
	.name,
	.intro,
	.viewed,
	.tip {
		display: block;
	}

	.title {
		font-size: 48rpx;
		font-weight: 800;
		line-height: 1.25;
		color: #07070a;
	}

	.subtitle {
		margin-top: 43rpx;
		font-size: 29rpx;
		line-height: 1.45;
		color: #77747c;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 22rpx 20rpx;
		margin-top: 119rpx;
	}

	.card {
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		box-sizing: border-box;
		min-width: 0;
		min-height: 225rpx;
		padding: 32rpx 14rpx 70rpx;
		border-radius: 20rpx;
		background: #fff;
		text-align: center;
	}

	.card-copy {
		position: relative;
		z-index: 3;
		width: 100%;
	}

	.name {
		font-size: 27rpx;
		font-weight: 800;
		line-height: 1.35;
		color: #19171c;
		word-break: break-all;
	}

	.intro {
		display: -webkit-box;
		overflow: hidden;
		margin-top: 10rpx;
		font-size: 20rpx;
		line-height: 1.45;
		color: #77747d;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
	}

	.viewed {
		margin-top: 10rpx;
		font-size: 19rpx;
		color: #28b28b;
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
		right: 0;
		bottom: -8rpx;
		z-index: 2;
		width: 112rpx;
		height: 112rpx;
	}

	.empty-card {
		box-sizing: border-box;
		width: 100%;
		margin-top: 119rpx;
		padding: 80rpx 30rpx;
		border-radius: 22rpx;
		background: #fff;
		text-align: center;
		font-size: 26rpx;
		color: #77747d;
	}

	.tip {
		margin-top: 43rpx;
		text-align: center;
		font-size: 25rpx;
		line-height: 1.5;
		color: #8b8c98;
	}

	.card-hover {
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
