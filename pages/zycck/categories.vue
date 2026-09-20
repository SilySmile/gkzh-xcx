<template>
	<view class="page">
		<zycck-header title="探职业" />
		<view class="head">
			<text class="rule" @click="openRules">?</text>
		</view>
		<text class="title">未来职业探索墙</text><text class="subtitle">现在，自己去找找你感兴趣了解的职业。</text>
		<view class="grid">
			<view v-for="item in categories" :key="item.categoryId" class="card" hover-class="card-hover"
				@click="open(item)"><text class="category-name">{{item.name}}</text><text
					class="category-count">{{item.explorableCount}} 个职业</text><text v-if="item.viewed"
					class="viewed">已查看</text><image class="corner-icon"
					src="https://zhiye.sxgkzh.cn/imgs/zycck/xc.png" mode="aspectFit" /></view>
		</view><text class="tip">点击职业大类进一步了解具体职业卡片信息</text><text v-if="readOnly"
			class="readonly-tip">本次探索已完成，当前内容仅可查看</text>
		<view v-if="rulesVisible" class="mask">
			<view class="modal">
				<image class="rule-image" src="https://zhiye.sxgkzh.cn/imgs/zycck/gz2.png" mode="widthFix" />
				<view class="modal-close" @click="closeRules">×</view>
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
		components: { ZycckHeader },
		data: () => ({
			recordId: '',
			instanceId: '',
			gameId: '',
			categories: [],
			readOnly: false,
			rulesVisible: false
		}),
		onLoad(o) {
			Object.assign(this, {
				recordId: o.recordId || '',
				instanceId: o.instanceId || '',
				gameId: o.gameId || '',
				readOnly: o.readOnly === '1'
			});
			this.rulesVisible = !this.readOnly
			this.load()
		},
		methods: {
			openRules() {
				this.rulesVisible = true
			},
			closeRules() {
				this.rulesVisible = false
			},
			async load() {
				try {
					if (this.readOnly) return this.goReport();
					const r = await getCatalog({
						instanceId: this.instanceId,
						gameId: this.gameId
					});
					const d = r.data || {};
					const rows = d.careers || [];
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
					this.categories = (d.categories || []).map(c => {
						const inCategory = rows.filter(q => String(q.categoryId) === String(c.categoryId) &&
							String(q.hasQuestion) !== '1');
						return {
							...c,
							explorableCount: inCategory.length,
							viewed: inCategory.some(q => viewed.some(id => String(id) === String(q
								.careerQuestionId || q.careerId)))
						}
					})
				} catch (e) {
					uni.showToast({
						title: userMessage(e, '职业分类加载失败，请重试'),
						icon: 'none'
					})
				}
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
		padding: 48rpx 28rpx;
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

	.head {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		font-size: 28rpx;
		margin-bottom: 18rpx
	}

	.rule {
		width: 52rpx;
		height: 52rpx;
		line-height: 52rpx;
		text-align: center;
		border-radius: 50%;
		background: #1b76fe;
		color: #fff;
		font-weight: 700
	}

	.mask {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, .5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10
	}

	.modal {
		position: relative;
		width: 680rpx;
		max-width: calc(100vw - 64rpx);
		background: transparent;
		border-radius: 20rpx
	}

	.rule-image {
		display: block;
		width: 100%;
		border-radius: 20rpx
	}

	.modal-close {
		position: absolute;
		top: 16rpx;
		right: 16rpx;
		width: 52rpx;
		height: 52rpx;
		line-height: 48rpx;
		border-radius: 50%;
		background: rgba(0, 0, 0, .45);
		color: #fff;
		font-size: 44rpx;
		font-weight: 300;
		text-align: center;
		z-index: 1
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

	.category-name,
	.category-count,
	.viewed {
		display: block
	}

	.category-name {
		font-size: 29rpx;
		font-weight: 700;
		line-height: 1.35
	}

	.category-count {
		margin-top: 10rpx;
		color: #8a94a6;
		font-size: 23rpx
	}

	.viewed {
		margin-top: 12rpx;
		color: #42a868;
		font-size: 22rpx
	}

	.tip,
	.readonly-tip {
		display: block;
		text-align: center;
		color: #8a94a6;
		font-size: 24rpx;
		margin-top: 26rpx
	}

	.readonly-tip {
		color: #d97745;
		margin-top: 12rpx
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
