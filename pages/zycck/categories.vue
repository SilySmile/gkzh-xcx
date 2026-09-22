<template>
	<view class="page">
		<zycck-header title="探职业" />

		<view class="exploration-body">
			<image class="page-background" src="https://zhiye.sxgkzh.cn/imgs/zycck/TSQbackground.png" mode="widthFix" />
			<view class="background-wash" />

			<view class="content">
				<view class="hero-copy">
					<text class="title">未来职业探索墙</text>
					<view class="get-line">
						<text class="now-text">现在，</text>
						<image class="get-image" src="https://zhiye.sxgkzh.cn/imgs/zycck/get.png" mode="widthFix" />
					</view>
					<text class="subtitle">自己去找找你感兴趣了解的职业</text>
				</view>

				<view class="category-list">
					<view v-for="item in categories" :key="item.categoryId" class="category-card"
						:class="{ selected: selectedCategoryId === item.categoryId }" hover-class="card-hover"
						@click="selectCategory(item)">
						<view class="card-content">
							<text class="category-name">{{ item.name }}</text>
							<text class="category-count">{{ item.explorableCount }}个职业</text>
						</view>
						<view class="decoration-circle decoration-circle-light"></view>
						<view class="decoration-circle decoration-circle-deep"></view>
						<image class="corner-icon" src="https://zhiye.sxgkzh.cn/imgs/zycck/xc.png" mode="aspectFit" />
					</view>
				</view>

				<text v-if="!categories.length" class="empty-tip">暂时没有可探索的职业分类</text>
				<button class="confirm-button" hover-class="button-hover" @click="confirmSelection">我选好了</button>
			</view>
		</view>
	</view>
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
			categories: [],
			selectedCategoryId: '',
			readOnly: false
		}),
		onLoad(o) {
			Object.assign(this, {
				recordId: o.recordId || '',
				instanceId: o.instanceId || '',
				gameId: o.gameId || '',
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
					const rows = d.careers || []
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
					this.categories = (d.categories || []).map(c => {
						const inCategory = rows.filter(q => String(q.categoryId) === String(c.categoryId) && String(q.hasQuestion) !== '1')
						return {
							...c,
							explorableCount: inCategory.length,
							viewed: inCategory.some(q => viewed.some(id => String(id) === String(q.careerQuestionId || q.careerId)))
						}
					})
					if (this.categories.length && this.selectedCategoryId === '') {
						const firstAvailable = this.categories.find(item => item.explorableCount > 0) || this.categories[0]
						this.selectedCategoryId = firstAvailable.categoryId
					}
				} catch (e) {
					uni.showToast({
						title: userMessage(e, '职业分类加载失败，请重试'),
						icon: 'none'
					})
				}
			},
			selectCategory(item) {
				this.selectedCategoryId = item.categoryId
			},
			confirmSelection() {
				const selected = this.categories.find(item => item.categoryId === this.selectedCategoryId)
				if (!selected) {
					uni.showToast({
						title: '请先选择一个职业分类',
						icon: 'none'
					})
					return
				}
				this.open(selected)
			},
			open(item) {
				uni.redirectTo({
					url: `/pages/zycck/careers?recordId=${this.recordId}&instanceId=${this.instanceId}&gameId=${this.gameId}&categoryId=${item.categoryId}&readOnly=0`
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
		min-height: 100vh;
		box-sizing: border-box;
		background: #fff;
		animation: pageIn .35s ease-out;
	}

	.exploration-body {
		position: relative;
		overflow: hidden;
		min-height: calc(100vh - 88rpx - var(--status-bar-height, 20rpx));
		background: #fff;
	}

	.page-background {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 0;
		display: block;
		width: 100%;
		height: auto;
	}

	.background-wash {
		position: absolute;
		top: 310rpx;
		left: 0;
		z-index: 0;
		width: 100%;
		height: 1320rpx;
		background: linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, .12) 18%, rgba(255, 255, 255, .72) 62%, #fff 100%);
	}

	.content {
		position: relative;
		z-index: 1;
		box-sizing: border-box;
		width: 100%;
		padding: 58rpx 13rpx 76rpx;
	}

	.hero-copy {
		box-sizing: border-box;
		padding-left: 43rpx;
	}

	.title,
	.now-text,
	.subtitle {
		display: block;
	}

	.title {
		font-size: 42rpx;
		font-weight: 800;
		line-height: 1.3;
		color: #151319;
	}

	.get-line {
		display: flex;
		align-items: center;
		height: 77rpx;
		margin-top: 20rpx;
	}

	.now-text {
		color: #68636c;
		font-size: 31rpx;
		line-height: 1;
	}

	.get-image {
		width: 124rpx;
		height: auto;
		margin-left: 13rpx;
	}

	.subtitle {
		margin-top: 5rpx;
		font-size: 29rpx;
		line-height: 1.45;
		color: #68636c;
	}

	.category-list {
		margin-top: 85rpx;
	}

	.category-card {
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: center;
		box-sizing: border-box;
		width: 100%;
		min-height: 160rpx;
		padding: 34rpx 44rpx;
		margin-bottom: 62rpx;
		border: 4rpx solid transparent;
		border-radius: 32rpx;
		background: #fff;
		box-shadow: 0 4rpx 14rpx rgba(61, 49, 67, .11);
	}

	.category-card.selected {
		border-color: #25b58e;
		box-shadow: 0 6rpx 18rpx rgba(37, 181, 142, .12);
	}

	.card-content {
		position: relative;
		z-index: 2;
		box-sizing: border-box;
		width: calc(100% - 80rpx);
	}

	.category-name,
	.category-count {
		display: block;
	}

	.category-name {
		font-size: 35rpx;
		font-weight: 800;
		line-height: 1.3;
		color: #111215;
	}

	.category-count {
		margin-top: 15rpx;
		font-size: 27rpx;
		line-height: 1.3;
		color: #a2a2a6;
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

	.empty-tip {
		display: block;
		margin: 90rpx auto;
		text-align: center;
		font-size: 27rpx;
		color: #7f7983;
	}

	.confirm-button {
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		width: 375rpx;
		height: 82rpx;
		padding: 0;
		margin: 18rpx auto 0;
		border: 0;
		border-radius: 999rpx;
		background: #25b58e;
		box-shadow: 0 8rpx 18rpx rgba(37, 181, 142, .16);
		color: #fff;
		font-size: 38rpx;
		font-weight: 400;
		line-height: 82rpx;
	}

	.confirm-button::after {
		border: 0;
	}

	.card-hover,
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
