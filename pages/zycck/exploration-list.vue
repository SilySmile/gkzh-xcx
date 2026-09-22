<template>
	<view class="page" :class="{ 'is-readonly': readOnly }">
		<zycck-header title="探职业" />

		<view class="content">
			<view class="hero">
				<text class="page-title">我的未来职业探索清单</text>
				<text class="limit">清单上限{{ items.length }}/6</text>
				<text class="hint">这些都是你主动关注的职业</text>
			</view>

			<view class="list-wrap">
				<image class="baby-image" src="https://zhiye.sxgkzh.cn/imgs/zycck/sjbaby.png" mode="aspectFit" />
				<view class="section list-section decorated-card">
					<view class="section-content">
						<text class="section-title">我想进一步了解（{{ items.length }}/6）</text>

						<view class="selected-list">
							<view v-for="item in items" :key="item.careerId" class="item">
								<view class="item-content">
									<text class="item-name">{{ item.careerName }}</text>
									<text class="item-intro">{{ item.oneLineIntro || '暂无一句话介绍' }}</text>
								</view>
								<button v-if="!readOnly" class="trash-button" hover-class="button-hover"
									@click="remove(item)">
									<image src="/static/delete.png" mode="aspectFit" style="height: 32rpx;"></image>
								</button>
							</view>
						</view>

						<text v-if="!items.length"
							class="empty-tip">没关系，今天不一定要找到“最想探索的职业”。\n你刚刚已经认识了一个职业，未来还可以继续探索更多可能。</text>

						<button v-if="!readOnly" class="add-other" hover-class="button-hover" :disabled="listFull"
							@click="toggleOther">
							<text>{{ listFull ? '清单已满，请先删除' : (showOther ? '收起其他职业' : '添加其他职业') }}</text>
							<text v-if="!listFull" class="add-symbol">{{ showOther ? '−' : '＋' }}</text>
						</button>

						<view v-if="showOther && !readOnly && !listFull" class="other-panel">
							<picker mode="selector" :range="categories" range-key="name" @change="categoryChanged">
								<view class="category-picker">{{ selectedCategoryName || '请选择职业大类' }}<text
										class="picker-arrow">⌄</text></view>
							</picker>
							<input v-model="keyword" class="search" placeholder="搜索职业名称" />
							<text v-if="!selectedCategoryId" class="category-tip">请先选择职业大类，再选择要添加的职业</text>
							<view v-for="item in filteredCareers" :key="item.careerId" class="other-row">
								<view class="item-content">
									<text class="item-name">{{ item.careerName }}</text>
									<text class="item-intro">{{ item.oneLineIntro || '暂无一句话介绍' }}</text>
								</view>
								<button v-if="!isAdded(item) && !listFull" class="plus-button"
									hover-class="button-hover" :disabled="addingCareerId === item.careerId"
									@click="add(item)">＋</button>
								<text v-else-if="isAdded(item)" class="added">已加入</text>
								<text v-else class="added limit-reached">已达上限</text>
							</view>
							<text class="limit-tip">最多可加入6个职业，达到上限后需删除再添加。</text>
						</view>
					</view>
					<view class="decoration-circle decoration-circle-light" />
					<view class="decoration-circle decoration-circle-deep" />
					<image class="corner-icon" src="https://zhiye.sxgkzh.cn/imgs/zycck/xc.png" mode="aspectFit" />
				</view>
			</view>

			<view class="section today decorated-card">
				<view class="section-content today-content">
					<view class="today-head">
						<text class="section-title">今日认识</text>
						<text class="today-count">{{ todayViewed.length }}个</text>
					</view>
					<text class="today-sub">已查看但未加入的职业</text>
					<text v-for="item in todayViewed" :key="item.careerId"
						class="today-item">{{ item.careerName }}</text>
					<text v-if="!todayViewed.length" class="empty-line">暂无已查看但未加入的职业</text>
				</view>
				<view class="decoration-circle decoration-circle-light" />
				<view class="decoration-circle decoration-circle-deep" />
				<image class="corner-icon" src="https://zhiye.sxgkzh.cn/imgs/zycck/xc.png" mode="aspectFit" />
			</view>

			<view class="footer-actions">
				<button v-if="!readOnly" class="confirm-button" hover-class="button-hover"
					@click="finish">确认我的探索清单</button>
				<button v-else class="confirm-button" hover-class="button-hover" @click="download">下载探索清单 PDF</button>
				<button v-if="!readOnly" class="continue-button" hover-class="button-hover"
					@click="continueExplore">继续探索更多职业</button>
			</view>
		</view>
	</view>
</template>

<script>
	import {
		getExploration,
		getCatalog,
		removeExplorationItem,
		addExplorationItem,
		finishRecord,
		downloadReportPdf,
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
			items: [],
			allCareers: [],
			categories: [],
			viewedIds: [],
			readOnly: false,
			showOther: false,
			keyword: '',
			selectedCategoryId: '',
			addingCareerId: ''
		}),
		computed: {
			listFull() {
				return this.items.length >= 6
			},
			selectedCategoryName() {
				const item = this.categories.find(x => String(x.categoryId || x.id) === String(this.selectedCategoryId));
				return item ? (item.name || item.categoryName || '') : ''
			},
			filteredCareers() {
				if (!this.selectedCategoryId) return [];
				const key = this.keyword.trim();
				return this.allCareers.filter(x => String(x.categoryId) === String(this.selectedCategoryId) && (!key ||
					String(x.careerName).includes(key)))
			},
			todayViewed() {
				const added = this.items.map(x => String(x.careerId));
				return this.allCareers.filter(x => this.viewedIds.some(id => String(id) === String(x.careerId)) && !added
					.includes(String(x.careerId)))
			}
		},
		onLoad(o) {
			Object.assign(this, {
				recordId: o.recordId || '',
				instanceId: o.instanceId || '',
				gameId: o.gameId || '',
				readOnly: o.readOnly === '1'
			});
			this.load()
		},
		methods: {
			imageUrl(value) {
				return value && (/^\/(profile|upload)\//.test(value) ? config.BASE_URL + value : value)
			},
			toggleOther() {
				if (this.listFull) {
					this.showOther = false;
					return uni.showToast({
						title: '探索清单最多添加6个职业',
						icon: 'none'
					})
				}
				this.showOther = !this.showOther
			},
			async load() {
				try {
					const [r, c] = await Promise.all([getExploration(this.recordId), getCatalog({
						instanceId: this.instanceId,
						gameId: this.gameId
					})]);
					const d = r.data || {};
					if (this.readOnly || d.readOnly === true) return this.goReport();
					this.items = d.items || d.explorationItems || [];
					const raw = d.viewedCareerIds || [];
					this.viewedIds = Array.isArray(raw) ? raw : JSON.parse(raw || '[]');
					const catalog = c.data || {};
					this.categories = catalog.categories || [];
					const rows = catalog.careers || [];
					this.allCareers = rows.filter(x => String(x.hasQuestion) !== '1').map(x => ({
						...x,
						careerId: x.careerId || x.careerQuestionId,
						careerName: x.careerName || x.name || x.title
					}))
				} catch (e) {
					uni.showToast({
						title: userMessage(e, '探索清单加载失败，请重试'),
						icon: 'none'
					})
				}
			},
			categoryChanged(e) {
				const index = Number(e.detail && e.detail.value);
				const item = this.categories[index];
				this.selectedCategoryId = item ? (item.categoryId || item.id) : '';
				this.keyword = ''
			},
			isAdded(i) {
				return this.items.some(x => String(x.careerId) === String(i.careerId))
			},
			async add(i) {
				if (this.listFull) {
					this.showOther = false;
					return uni.showToast({
						title: '探索清单最多添加6个职业',
						icon: 'none'
					})
				}
				if (this.isAdded(i)) return uni.showToast({
					title: '该职业已在探索清单中',
					icon: 'none'
				});
				if (this.items.length >= 6) return uni.showToast({
					title: '探索清单最多添加6个职业',
					icon: 'none'
				});
				if (this.addingCareerId) return;
				this.addingCareerId = i.careerId;
				try {
					const result = await addExplorationItem(this.recordId, i.careerId);
					if (result && result.code && Number(result.code) !== 200) throw new Error(result.msg ||
						'探索清单最多添加6个职业');
					if (!this.isAdded(i)) this.items = this.items.concat([i]);
					if (this.items.length >= 6) this.showOther = false;
					await this.load()
				} catch (e) {
					uni.showToast({
						title: userMessage(e, '加入清单失败，请重试'),
						icon: 'none'
					})
				} finally {
					this.addingCareerId = ''
				}
			},
			async remove(i) {
				try {
					await removeExplorationItem(this.recordId, i.careerId);
					await this.load()
				} catch (e) {
					uni.showToast({
						title: userMessage(e, '移除清单失败，请重试'),
						icon: 'none'
					})
				}
			},
			async finish() {
				try {
					const result = await finishRecord(this.recordId);
					if (result && result.code && Number(result.code) !== 200) throw new Error(result.msg ||
						'确认探索清单失败');
					this.goReport()
				} catch (e) {
					uni.showToast({
						title: userMessage(e, '请先查看至少一个职业'),
						icon: 'none'
					})
				}
			},
			async download() {
				try {
					uni.showLoading({
						title: '生成 PDF'
					});
					const r = await downloadReportPdf({
						recordId: this.recordId
					});
					const path = r.tempFilePath || r.filePath;
					if (path) uni.openDocument({
						filePath: path,
						showMenu: true,
						fileType: 'pdf'
					});
					else throw new Error('PDF 下载失败')
				} catch (e) {
					uni.showToast({
						title: userMessage(e, 'PDF 下载失败，请稍后重试'),
						icon: 'none'
					})
				} finally {
					uni.hideLoading()
				}
			},
			continueExplore() {
				if (!this.readOnly) uni.redirectTo({
					url: `/pages/zycck/categories?recordId=${this.recordId}&instanceId=${this.instanceId}&gameId=${this.gameId}&readOnly=0`
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
		border-top: 4rpx solid #a66da4;
		background: linear-gradient(180deg, #d0b1d5 0%, #d7bddb 25%, #e2d2e6 43%, #f5f0f7 67%, #ffffff 86%, #ffffff 100%);
	}

	.content {
		box-sizing: border-box;
		min-height: calc(100vh - 108rpx);
		padding: 64rpx 24rpx 94rpx;
		animation: pageIn .35s ease-out;
	}

	.hero {
		position: relative;
		z-index: 4;
		text-align: center;
	}

	.page-title,
	.limit,
	.hint,
	.section-title,
	.item-name,
	.item-intro,
	.today-sub,
	.today-item,
	.empty-line,
	.empty-tip,
	.limit-tip,
	.category-tip {
		display: block;
	}

	.page-title {
		font-size: 42rpx;
		font-weight: 800;
		line-height: 1.35;
		color: #17151a;
	}

	.limit {
		display: inline-block;
		padding: 7rpx 24rpx;
		margin: 12rpx auto 0;
		border-radius: 34rpx;
		background: #9ee5f6;
		color: #ff6e78;
		font-size: 27rpx;
		font-weight: 500;
		line-height: 42rpx;
	}

	.hint {
		margin-top: 20rpx;
		font-size: 28rpx;
		line-height: 1.5;
		color: #676369;
	}

	.decorated-card {
		position: relative;
		overflow: hidden;
		box-sizing: border-box;
		width: 100%;
		border: 1rpx solid rgba(171, 160, 177, .48);
		border-radius: 20rpx;
		background: #fff;
		box-shadow: 0 3rpx 9rpx rgba(63, 43, 68, .05);
	}

	.list-wrap {
		position: relative;
		margin-top: 64rpx;
	}

	.list-section {
		min-height: 438rpx;
	}

	.section-content {
		position: relative;
		z-index: 3;
		padding: 34rpx 30rpx 38rpx;
	}

	.list-section .section-content {
		padding-bottom: 39rpx;
	}

	.section-title {
		font-size: 34rpx;
		font-weight: 800;
		line-height: 1.4;
		color: #111014;
	}

	.baby-image {
		position: absolute;
		top: -99rpx;
		right: 24rpx;
		z-index: 5;
		width: 184rpx;
		height: 184rpx;
	}

	.selected-list {
		margin-top: 28rpx;
	}

	.item,
	.other-row {
		display: flex;
		align-items: center;
		box-sizing: border-box;
		width: 100%;
		min-height: 78rpx;
		padding: 10rpx 13rpx 10rpx 38rpx;
		margin-bottom: 20rpx;
		border: 1rpx solid #eeeaf0;
		border-radius: 38rpx;
		background: #fff;
		box-shadow: 0 3rpx 10rpx rgba(51, 43, 54, .055);
	}

	.item-content {
		flex: 1;
		min-width: 0;
		padding-right: 16rpx;
	}

	.item-name {
		overflow: hidden;
		font-size: 29rpx;
		line-height: 1.35;
		color: #19171b;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-intro {
		overflow: hidden;
		margin-top: 1rpx;
		font-size: 20rpx;
		line-height: 1.4;
		color: #858087;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.trash-button {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 62rpx;
		width: 62rpx;
		height: 58rpx;
		padding: 0;
		margin: 0;
		border: 0;
		border-radius: 50%;
		background: transparent;
		line-height: 1;
	}

	.trash-button::after,
	.add-other::after,
	.plus-button::after,
	.footer-actions button::after {
		border: 0;
	}

	.trash-icon {
		position: relative;
		width: 28rpx;
		height: 34rpx;
	}

	.trash-lid {
		position: absolute;
		top: 3rpx;
		left: 1rpx;
		box-sizing: border-box;
		width: 27rpx;
		height: 5rpx;
		border-top: 4rpx solid #151318;
	}

	.trash-lid::before {
		position: absolute;
		top: -10rpx;
		left: 8rpx;
		box-sizing: border-box;
		width: 12rpx;
		height: 8rpx;
		border: 3rpx solid #151318;
		border-bottom: 0;
		border-radius: 3rpx 3rpx 0 0;
		content: '';
	}

	.trash-bin {
		position: absolute;
		top: 11rpx;
		left: 4rpx;
		display: flex;
		justify-content: space-evenly;
		box-sizing: border-box;
		width: 21rpx;
		height: 23rpx;
		padding-top: 5rpx;
		border: 3rpx solid #151318;
		border-top-width: 2rpx;
		border-radius: 0 0 4rpx 4rpx;
	}

	.trash-bin view {
		width: 2rpx;
		height: 12rpx;
		background: #151318;
	}

	.add-other {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 354rpx;
		height: 76rpx;
		padding: 0 28rpx;
		margin: 38rpx auto 0;
		border: 0;
		border-radius: 38rpx;
		background: #dbc0e3;
		color: #111014;
		font-size: 29rpx;
		font-weight: 500;
		line-height: 76rpx;
	}

	.add-symbol {
		margin-left: 18rpx;
		font-size: 36rpx;
		font-weight: 300;
	}

	.add-other[disabled] {
		color: #777278;
		background: #e8dce9;
	}

	.other-panel {
		position: relative;
		z-index: 3;
		padding-top: 24rpx;
	}

	.category-picker,
	.search {
		box-sizing: border-box;
		width: 100%;
		height: 72rpx;
		border: 1rpx solid #e2d9e5;
		border-radius: 16rpx;
		background: #faf7fb;
		color: #474148;
		font-size: 25rpx;
	}

	.category-picker {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 24rpx;
		margin-bottom: 16rpx;
		line-height: 72rpx;
	}

	.search {
		padding: 0 24rpx;
		margin-bottom: 18rpx;
	}

	.picker-arrow {
		color: #918795;
		font-size: 30rpx;
	}

	.other-row {
		padding-left: 26rpx;
		margin-bottom: 14rpx;
	}

	.plus-button {
		flex: 0 0 54rpx;
		width: 54rpx;
		height: 54rpx;
		padding: 0;
		margin: 0;
		border: 0;
		border-radius: 50%;
		background: #28b28b;
		color: #fff;
		font-size: 30rpx;
		line-height: 54rpx;
	}

	.added {
		flex: 0 0 auto;
		color: #29ae89;
		font-size: 22rpx;
	}

	.limit-reached {
		color: #99939a;
	}

	.empty-tip,
	.limit-tip,
	.category-tip {
		margin: 24rpx 0;
		color: #8c858e;
		font-size: 22rpx;
		line-height: 1.7;
		text-align: center;
		white-space: pre-line;
	}

	.today {
		min-height: 366rpx;
		margin-top: 50rpx;
	}

	.today-content {
		padding: 43rpx 32rpx 48rpx;
	}

	.today-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.today-count {
		color: #ee9200;
		font-size: 36rpx;
		font-weight: 700;
		line-height: 1.3;
	}

	.today-sub {
		margin-top: 17rpx;
		font-size: 27rpx;
		line-height: 1.45;
		color: #969096;
	}

	.today-item {
		margin-top: 18rpx;
		font-size: 27rpx;
		line-height: 1.35;
		color: #5f5a61;
	}

	.empty-line {
		padding-top: 31rpx;
		font-size: 24rpx;
		color: #99939a;
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

	.footer-actions {
		width: 390rpx;
		margin: 63rpx auto 0;
	}

	.footer-actions button {
		box-sizing: border-box;
		width: 100%;
		height: 76rpx;
		padding: 0 18rpx;
		margin: 0;
		border-radius: 38rpx;
		font-size: 29rpx;
		font-weight: 400;
		line-height: 76rpx;
	}

	.confirm-button {
		border: 0;
		background: #28b28b;
		color: #fff;
	}

	.continue-button {
		margin-top: 16rpx !important;
		border: 1rpx solid #ddd9de;
		background: #fff;
		color: #18161a;
		box-shadow: 0 3rpx 8rpx rgba(55, 47, 58, .08);
	}

	.button-hover {
		opacity: .78;
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