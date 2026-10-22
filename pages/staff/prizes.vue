<template>
	<view class="page">
		<view class="title">用户奖品核销记录</view>
		<view class="search-bar">
			<input
				v-model="studentNo"
				class="search-input"
				placeholder="输入学号筛选"
				confirm-type="search"
				@confirm="load"
			/>
			<button class="search-btn" size="mini" @click="load">筛选</button>
			<button v-if="studentNo" class="reset-btn" size="mini" @click="reset">重置</button>
		</view>
		<view v-if="loading" class="empty">加载中...</view>
		<view v-else-if="!prizes.length" class="empty">暂无核销记录</view>
		<view v-for="item in prizes" :key="item.lotteryRecordId" class="item" @click="logs(item)">
			<view class="record-main">
				<text class="prize">{{ item.prizeTitle }}</text>
				<text class="user">{{ item.studentName || item.userId }} {{ item.studentNo || '' }}</text>
			</view>
			<view class="right">
				<text :class="item.status==='1'?'done':'wait'">{{ item.status==='1'?'已核销':'待核销' }}</text>
				<text class="time">{{ formatDate(item.redeemTime || item.drawTime) }}</text>
			</view>
		</view>
	</view>
</template>
<script>
	import {
		getPrizeRecords,
		getPrizeLogs
	} from '@/api/staff.js';
	export default {
		data: () => ({
			prizes: [],
			studentNo: '',
			loading: false
		}),
		onShow() {
			this.load()
		},
		methods: {
			load() {
				if (this.loading) return
				this.loading = true
				getPrizeRecords({ studentNo: this.studentNo.trim() }).then(r => {
					this.prizes = r.data || []
				}).catch(e => uni.showToast({
					title: e.message,
					icon: 'none'
				})).finally(() => {
					this.loading = false
				})
			},
			reset() {
				this.studentNo = ''
				this.load()
			},
			formatDate(v) {
				if (!v) return '';
				const d = new Date(String(v).replace(/-/g, '/'));
				if (isNaN(d.getTime())) return String(v);
				const p = n => String(n).padStart(2, '0');
				return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
			},
			logs(item) {
				if (item.status === '0') return uni.navigateTo({
					url: '/pages/staff/redeem?recordId=' + item.lotteryRecordId
				});
				getPrizeLogs(item.lotteryRecordId).then(r => uni.showModal({
					title: '核销操作流水',
					content: (r.data || []).map(x => `${x.action} ${this.formatDate(x.createTime)}`).join(
						'\n') || '暂无流水',
					showCancel: false
				})).catch(e => uni.showToast({
					title: e.message,
					icon: 'none'
				}))
			}
		}
	}
</script>
<style scoped>
	.page {
		min-height: 100vh;
		background: #f4f7fb;
		padding: 28rpx 24rpx
	}

	.title {
		font-size: 36rpx;
		font-weight: 700;
		color: #1a2c4a;
		margin: 10rpx 0 24rpx
	}

	.search-bar {
		display: flex;
		align-items: center;
		gap: 12rpx;
		margin-bottom: 22rpx;
	}

	.search-input {
		flex: 1;
		height: 76rpx;
		padding: 0 24rpx;
		background: #fff;
		border-radius: 16rpx;
		font-size: 26rpx;
		color: #1a2c4a;
	}

	.search-btn,
	.reset-btn {
		margin: 0;
		height: 76rpx;
		line-height: 76rpx;
		border-radius: 16rpx;
		font-size: 26rpx;
	}

	.search-btn {
		background: #2f80ed;
		color: #fff;
	}

	.reset-btn {
		background: #fff;
		color: #52657c;
	}

	.item {
		background: #fff;
		border-radius: 18rpx;
		margin-bottom: 18rpx;
		padding: 26rpx;
		display: flex;
		justify-content: space-between
	}

	.record-main {
		flex: 1;
		min-width: 0;
	}

	.prize {
		display: block;
		font-size: 29rpx;
		font-weight: 700;
		color: #1a2c4a
	}

	.user {
		display: block;
		color: #8190a5;
		font-size: 23rpx;
		margin-top: 12rpx
	}

	.right {
		text-align: right
	}

	.done,
	.wait {
		display: block;
		font-size: 24rpx
	}

	.done {
		color: #27ae60
	}

	.wait {
		color: #f2994a
	}

	.time {
		display: block;
		color: #9cadc0;
		font-size: 20rpx;
		margin-top: 12rpx
	}

	.empty {
		text-align: center;
		color: #9cadc0;
		padding: 100rpx 0
	}
</style>
