<template>
	<view class="page">
		<zycck-header title="探职业" />
		<text class="title">未来职业探索墙</text>
		<text class="subtitle">现在，自己去找找你感兴趣了解的职业。</text>
		<view class="grid">
			<view v-for="item in careers" :key="item.careerId" class="card" hover-class="card-hover"
				@click="open(item)">
				<image v-if="item.careerImageUrl" class="career-image" :src="imageUrl(item.careerImageUrl)"
					mode="aspectFill" />
				<text class="name">{{item.careerName}}</text>
				<text v-if="item.oneLineIntro" class="intro">{{item.oneLineIntro}}</text>
				<text v-if="item.viewed" class="viewed">已查看</text>
				<image class="corner-icon" src="https://zhiye.sxgkzh.cn/imgs/zycck/xc.png" mode="aspectFit" />
			</view>
		</view>
		<text class="tip">点击职业卡片进一步了解具体职业信息</text>
	</view>
</template>
<script>
	import {
		getCatalog,
		getRecord,
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
			});
			this.load()
		},
		methods: {
			imageUrl(value) {
				return value && (/^\/(profile|upload)\//.test(value) ? config.BASE_URL + value : value)
			},
			async load() {
				try {
					if (this.readOnly) return this.goReport();
					const r = await getCatalog({
						instanceId: this.instanceId,
						gameId: this.gameId
					});
					const d = r.data || {};
					const rows = d.careers || d.items || d.questions || [];
					let viewed = [];
					if (this.recordId) {
						try {
							const rr = await getRecord(this.recordId);
							const rd = rr.data || {};
							if (rd.status === 'finished' || (rd.record && rd.record.status === 'finished')) return this
								.goReport();
							const raw = (rd.record && rd.record.viewedCareerIds) || rd.viewedCareerIds;
							viewed = Array.isArray(raw) ? raw : JSON.parse(raw || '[]')
						} catch (e) {}
					}
					this.careers = rows.filter(x => String(x.hasQuestion) !== '1' && (!this.categoryId || String(x
						.categoryId) === String(this.categoryId))).map(x => ({
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
		padding: 48rpx 30rpx;
		background: #f5f7fb;
		min-height: 100vh;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		justify-content: center;
		animation: pageIn .35s ease-out;
/* 		background-image: url("https://zhiye.sxgkzh.cn/imgs/zycck/bg.png");
		background-size: 120%; */
	}

	.title {
		display: block;
		font-size: 50rpx;
		font-weight: 800;
		text-align: center;
		color: #1a2c4a
	}

	.subtitle {
		display: block;
		text-align: center;
		color: #64748b;
		margin: 16rpx 0 30rpx
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 18rpx
	}

	.card {
		position: relative;
		min-height: 190rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255);
		padding: 22rpx 12rpx;
		border-radius: 20rpx;
		color: #243b53;
		box-shadow: 0 6rpx 18rpx rgba(31, 41, 55, .04);
		text-align: center
	}

	.corner-icon {
		position: absolute;
		right: 14rpx;
		bottom: 12rpx;
		width: 38rpx;
		height: 38rpx
	}

	.card-hover {
		background: #edf4ff;
		transform: scale(.985)
	}

	.career-image {
		width: calc(100% + 24rpx);
		height: 150rpx;
		margin: -22rpx -12rpx 18rpx;
		border-radius: 20rpx 20rpx 0 0;
		background: #eef1f5
	}

	.name {
		font-size: 29rpx;
		font-weight: 700;
		line-height: 1.35
	}

	.intro {
		display: -webkit-box;
		margin-top: 8rpx;
		color: #8a94a6;
		font-size: 21rpx;
		line-height: 1.4;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden
	}

	.viewed {
		margin-top: 10rpx;
		color: #42a868;
		font-size: 22rpx
	}

	.tip {
		display: block;
		text-align: center;
		color: #8a94a6;
		font-size: 24rpx;
		margin-top: 26rpx
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