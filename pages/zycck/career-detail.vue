<template>
	<scroll-view scroll-y class="page">
		<zycck-header title="探职业" />
		<view class="content">
			<view class="career-header decorated-card">
				<image v-if="careerImageUrl" class="career-image" :src="imageUrl(careerImageUrl)" mode="aspectFill" />
				<view class="career-heading">
					<text class="title">{{ career.careerName || '职业详情' }}</text>
					<text v-if="career.oneLineIntro" class="intro">{{ career.oneLineIntro }}</text>
				</view>
				<view class="decoration-circle decoration-circle-light" />
				<view class="decoration-circle decoration-circle-deep" />
				<image class="corner-icon" src="https://zhiye.sxgkzh.cn/imgs/zycck/xc.png" mode="aspectFit" />
			</view>

			<view class="info-card main-work-card decorated-card">
				<view class="card-copy">
					<text class="section-title">这个职业主要做什么？</text>
					<text class="body">{{ career.mainWork || '暂无介绍' }}</text>
				</view>
				<view class="decoration-circle decoration-circle-light" />
				<view class="decoration-circle decoration-circle-deep" />
				<image class="corner-icon" src="https://zhiye.sxgkzh.cn/imgs/zycck/xc.png" mode="aspectFit" />
			</view>

			<view class="info-card day-card decorated-card">
				<view class="card-copy">
					<text class="section-title">一天可能做什么？</text>
					<view v-if="dayItems.length" class="day-grid">
						<view v-for="(item, index) in dayItems" :key="index" class="day-item">
							<view class="day-icon">{{ index + 1 }}</view>
							<view class="day-copy">
								<text class="day-title">{{ item.title }}</text>
								<text v-if="item.description" class="day-description">{{ item.description }}</text>
							</view>
						</view>
					</view>
					<text v-else class="body">暂无介绍</text>
				</view>
				<view class="decoration-circle decoration-circle-light" />
				<view class="decoration-circle decoration-circle-deep" />
				<image class="corner-icon" src="https://zhiye.sxgkzh.cn/imgs/zycck/xc.png" mode="aspectFit" />
			</view>

			<view class="info-card why-card decorated-card">
				<view class="card-copy">
					<text class="section-title">为什么会有这样的职业？</text>
					<text class="body">{{ career.whyExists || '暂无介绍' }}</text>
				</view>
				<view class="decoration-circle decoration-circle-light" />
				<view class="decoration-circle decoration-circle-deep" />
				<image class="corner-icon" src="https://zhiye.sxgkzh.cn/imgs/zycck/xc.png" mode="aspectFit" />
			</view>

			<view class="actions">
				<button class="primary-button" hover-class="button-hover" :disabled="readOnly || added" @click="add">
					{{ added ? '已加入探索清单' : '加入探索清单' }}
				</button>
				<button class="secondary-button" hover-class="button-hover" :disabled="readOnly" @click="finish">完成探索</button>
			</view>

			<view class="nav-actions">
				<text hover-class="link-hover" @click="moreInCategory">换一个职业继续了解</text>
				<view class="link-divider" />
				<text hover-class="link-hover" @click="moreCategories">换一个职业大类继续了解</text>
			</view>
		</view>
	</scroll-view>
</template>

<script>
	import {
		getRecord,
		browseCareer,
		addExplorationItem,
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
			categoryId: '',
			careerId: '',
			career: {},
			readOnly: false,
			added: false
		}),
		computed: {
			careerImageUrl() {
				return this.career.careerImageUrl || ''
			},
			dayItems() {
				return String(this.career.dayExample || '').split(/\r?\n/).filter(Boolean).map(item => {
					const parts = item.split('｜')
					return {
						title: parts.shift() || '',
						description: parts.join('｜')
					}
				})
			}
		},
		onLoad(o) {
			Object.assign(this, {
				recordId: o.recordId || '',
				instanceId: o.instanceId || '',
				gameId: o.gameId || '',
				categoryId: o.categoryId || '',
				careerId: o.careerId || '',
				readOnly: o.readOnly === '1'
			})
			this.load()
		},
		methods: {
			imageUrl(v) {
				return v && (/^\/(profile|upload)\//.test(v) ? config.BASE_URL + v : v)
			},
			async load() {
				try {
					const r = await getRecord(this.recordId, {
						careerId: this.careerId
					})
					const d = r.data || {}
					if (this.readOnly || d.status === 'finished' || (d.record && d.record.status === 'finished')) return this.goReport()
					this.career = d.career || d.currentCareer || {
						careerId: this.careerId,
						careerName: '职业详情'
					}
					let addedIds = d.explorationCareerIds || (d.record && d.record.explorationCareerIds) || []
					if (!Array.isArray(addedIds)) {
						try {
							addedIds = JSON.parse(addedIds || '[]')
						} catch (e) {
							addedIds = []
						}
					}
					this.added = addedIds.some(id => String(id) === String(this.careerId))
					if (!this.readOnly) await browseCareer(this.recordId, this.careerId)
				} catch (e) {
					uni.showToast({
						title: userMessage(e, '职业详情加载失败，请重试'),
						icon: 'none'
					})
				}
			},
			async add() {
				if (this.readOnly) return
				try {
					await addExplorationItem(this.recordId, this.careerId)
					this.added = true
					uni.showToast({
						title: '已加入探索清单',
						icon: 'success'
					})
				} catch (e) {
					uni.showToast({
						title: userMessage(e, '加入清单失败，请重试'),
						icon: 'none'
					})
				}
			},
			finish() {
				if (this.readOnly) return
				uni.redirectTo({
					url: `/pages/zycck/exploration-list?recordId=${this.recordId}&instanceId=${this.instanceId}&gameId=${this.gameId}&readOnly=0`
				})
			},
			moreInCategory() {
				uni.redirectTo({
					url: `/pages/zycck/careers?recordId=${this.recordId}&instanceId=${this.instanceId}&gameId=${this.gameId}&categoryId=${this.categoryId}&readOnly=${this.readOnly ? '1' : '0'}`
				})
			},
			moreCategories() {
				uni.redirectTo({
					url: `/pages/zycck/categories?recordId=${this.recordId}&instanceId=${this.instanceId}&gameId=${this.gameId}&readOnly=${this.readOnly ? '1' : '0'}`
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
		border-top: 4rpx solid #a66da4;
		background: linear-gradient(180deg, #d0b6d2 0%, #d0b6d2 25%, #d7c4dc 47%, #e4ddea 72%, #ebebf4 86%, #ebebf4 100%);
	}

	.content {
		box-sizing: border-box;
		min-height: calc(100vh - 108rpx);
		padding: 120rpx 26rpx 90rpx;
		animation: pageIn .35s ease-out;
	}

	.decorated-card {
		position: relative;
		overflow: hidden;
		box-sizing: border-box;
		width: 100%;
		border-radius: 24rpx;
		background: #fff;
	}

	.career-header {
		display: flex;
		align-items: center;
		min-height: 178rpx;
		padding: 28rpx 150rpx 28rpx 30rpx;
		margin-bottom: 22rpx;
	}

	.career-heading,
	.card-copy {
		position: relative;
		z-index: 3;
		min-width: 0;
	}

	.career-heading {
		flex: 1;
	}

	.career-image {
		position: relative;
		z-index: 3;
		flex: 0 0 auto;
		width: 132rpx;
		height: 112rpx;
		margin-right: 24rpx;
		border-radius: 18rpx;
		background: #f3f1f5;
	}

	.title,
	.intro,
	.section-title,
	.body,
	.day-title,
	.day-description {
		display: block;
	}

	.title {
		font-size: 39rpx;
		font-weight: 800;
		line-height: 1.3;
		color: #111014;
	}

	.intro {
		display: -webkit-box;
		overflow: hidden;
		margin-top: 12rpx;
		font-size: 25rpx;
		line-height: 1.55;
		color: #6f6b73;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.info-card {
		padding: 31rpx 150rpx 34rpx 31rpx;
		margin-bottom: 22rpx;
	}

	.main-work-card,
	.why-card {
		min-height: 258rpx;
	}

	.day-card {
		min-height: 300rpx;
	}

	.section-title {
		margin-bottom: 19rpx;
		font-size: 31rpx;
		font-weight: 800;
		line-height: 1.4;
		color: #1b1920;
	}

	.body {
		font-size: 25rpx;
		line-height: 1.78;
		color: #55515a;
		white-space: pre-line;
	}

	.day-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18rpx 24rpx;
	}

	.day-item {
		display: flex;
		align-items: flex-start;
		min-width: 0;
	}

	.day-icon {
		flex: 0 0 auto;
		width: 44rpx;
		height: 44rpx;
		margin-right: 12rpx;
		border-radius: 50%;
		background: #eee5f0;
		color: #986b98;
		font-size: 22rpx;
		font-weight: 700;
		line-height: 44rpx;
		text-align: center;
	}

	.day-copy {
		min-width: 0;
	}

	.day-title {
		font-size: 24rpx;
		font-weight: 700;
		line-height: 1.45;
		color: #39353d;
	}

	.day-description {
		margin-top: 5rpx;
		font-size: 21rpx;
		line-height: 1.5;
		color: #7b7780;
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

	.actions {
		display: flex;
		gap: 24rpx;
		margin-top: 28rpx;
	}

	.actions button {
		flex: 1;
		height: 80rpx;
		padding: 0 12rpx;
		margin: 0;
		border: 0;
		border-radius: 12rpx;
		font-size: 27rpx;
		font-weight: 500;
		line-height: 80rpx;
	}

	.actions button::after {
		border: 0;
	}

	.primary-button {
		color: #fff;
		background: #28b28b;
	}

	.secondary-button {
		color: #58535d;
		background: #fff;
	}

	.actions button[disabled] {
		opacity: .72;
		color: #fff;
		background: #28b28b;
	}

	.actions .secondary-button[disabled] {
		color: #8d8991;
		background: #fff;
	}

	.nav-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 28rpx;
		font-size: 23rpx;
		line-height: 1.5;
		color: #777681;
	}

	.link-divider {
		width: 1rpx;
		height: 24rpx;
		margin: 0 18rpx;
		background: rgba(119, 118, 129, .45);
	}

	.button-hover,
	.link-hover {
		opacity: .76;
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
