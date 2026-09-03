<template>
	<view class="page">
		<view class="header"><text class="school">{{ staff.schoolName || '所属学校' }}</text><text
				class="name">{{ staff.staffName }}</text><text class="logout" @click="logout">退出登录</text></view>
		<view v-if="canRedeem" class="summary">
			<view><text>{{ pending }}</text><text>待核销</text></view>
			<view><text>{{ redeemed }}</text><text>已核销</text></view>
			<view><text>{{ prizes.length }}</text><text>中奖记录</text></view>
		</view>
		<view class="menu" :style="{marginTop: canRedeem? '0' : '24rpx'}">
			<view v-if="canRedeem" @click="goScan"><text>扫码核销</text><text>›</text></view>
			<view v-if="canRedeem" class="code-entry"><input v-model="code" placeholder="输入文本核销码" /><button
					@click="goCodeRedeem">核销</button></view>
			<view v-if="canRedeem" @click="go('/pages/staff/prizes')"><text>用户奖品与核销记录</text><text>›</text></view>
			<view @click="go('/pages/staff/activity-statistics?bizType=career_week')"><text>生涯活动统计</text><text>›</text></view>
			<view @click="go('/pages/staff/activity-statistics?bizType=job_week')"><text>就业活动统计</text><text>›</text></view>
			<!-- <view @click="go('/pages/staff/statistics')"><text>本校霍兰德代码统计</text><text>›</text></view> -->
		</view>
	</view>
</template>
<script>
	import {
		getStaffProfile,
		getPrizeRecords,
		resolvePrize
	} from '@/api/staff.js'
	export default {
		data: () => ({
			staff: {},
			prizes: [],
			code: ''
		}),
		computed: {
			canRedeem() {
				return Number(this.staff.canRedeem) === 1
			},
			pending() {
				return this.prizes.filter(x => x.status === '0').length
			},
			redeemed() {
				return this.prizes.filter(x => x.status === '1').length
			}
		},
		onShow() {
			this.load()
		},
		methods: {
			logout() {
				uni.removeStorageSync('staffToken');
				uni.removeStorageSync('staffProfile');
				uni.reLaunch({
					url: '/pages/mp/login/index'
				})
			},
			async load() {
				if (!uni.getStorageSync('staffToken')) return uni.reLaunch({
					url: '/pages/mp/login/index'
				});
				try {
					const p = await getStaffProfile();
					this.staff = p.data || {};
					this.prizes = this.canRedeem ? ((await getPrizeRecords()).data || []) : []
				} catch (e) {
					uni.showToast({
						title: e.message,
						icon: 'none'
					})
				}
			},
			go(url) {
				uni.navigateTo({
					url
				})
			},
			goCodeRedeem() {
				if (!this.canRedeem) return;
				const value = (this.code || '').trim();
				if (!value) return uni.showToast({
					title: '请输入正确的文本核销码',
					icon: 'none'
				});
				resolvePrize(null, value).then(res => {
					uni.navigateTo({ url: '/pages/staff/redeem?recordId=' + res.data.lotteryRecordId })
					this.code = ''
				}).catch(e => uni.showToast({ title: e.message || '核销码无效', icon: 'none' }))
			},
			goScan() {
				if (!this.canRedeem) return;
				uni.scanCode({
					success: r => {
						const id = (r.result || '').match(/\d+/);
						if (!id) return uni.showToast({
							title: '未识别到中奖记录号',
							icon: 'none'
						});
					resolvePrize(id[0], null).then(() => {
						uni.navigateTo({ url: '/pages/staff/redeem?recordId=' + id[0] })
					}).catch(e => uni.showToast({ title: e.message || '核销码无效', icon: 'none' }))
					},
					fail: () => {}
				})
			}
		}
	}
</script>
<style scoped>
	.page {
		min-height: 100vh;
		background: #f4f7fb;
		padding: 36rpx 24rpx
	}

	.header {
		background: linear-gradient(135deg, #2f80ed, #56ccf2);
		padding: 42rpx 34rpx;
		border-radius: 24rpx;
		color: #fff;
		position: relative
	}

	.school {
		display: block;
		font-size: 36rpx;
		font-weight: 700
	}

	.name {
		display: block;
		margin-top: 12rpx;
		font-size: 26rpx
	}

	.logout {
		position: absolute;
		right: 28rpx;
		top: 28rpx;
		font-size: 24rpx;
		padding: 10rpx 16rpx;
		border: 1rpx solid rgba(255, 255, 255, .7);
		border-radius: 22rpx
	}

	.summary {
		display: flex;
		background: #fff;
		border-radius: 20rpx;
		margin: 24rpx 0;
		padding: 28rpx 0
	}

	.summary view {
		flex: 1;
		text-align: center;
		border-right: 1rpx solid #edf1f6
	}

	.summary view:last-child {
		border: 0
	}

	.summary text:first-child {
		display: block;
		font-size: 38rpx;
		font-weight: 700;
		color: #1a2c4a
	}

	.summary text:last-child {
		font-size: 22rpx;
		color: #8190a5
	}

	.menu {
		background: #fff;
		border-radius: 20rpx;
		padding: 0 26rpx
	}

	.menu view {
		height: 106rpx;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1rpx solid #edf1f6;
		color: #1a2c4a;
		font-size: 29rpx
	}

	.menu view:last-child {
		border: 0
	}

	.code-entry {
		height: 110rpx !important;
		gap: 12rpx
	}

	.code-entry input {
		flex: 1;
		background: #f4f7fb;
		border-radius: 12rpx;
		padding: 0 18rpx;
		font-size: 25rpx
	}

	.code-entry button {
		margin: 0;
		background: #2f80ed;
		color: #fff;
		font-size: 24rpx;
		border-radius: 12rpx;
		padding: 0 20rpx
	}
</style>
