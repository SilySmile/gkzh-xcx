<template>
	<view class="page">
		<view class="top"><text class="title">学校游戏统计</text></view>
		<swiper class="swiper" :current="page" @change="page = $event.detail.current">
			<swiper-item><scroll-view scroll-y class="slide"><text class="page-title">职业兴趣类型</text>
					<view v-for="item in types" :key="item.code" class="type-card">
						<view class="type-code">{{item.code}}</view>
						<view><text class="type-name">{{item.name}}</text><text
								class="type-desc">{{item.summary || item.traits || '暂无编码解释'}}</text></view>
					</view>
					<view v-if="!types.length" class="empty">暂无后台编码配置</view>
				</scroll-view></swiper-item>
			<swiper-item><scroll-view scroll-y class="slide"><text class="page-title">复合代码统计</text>
					<view class="table head"><text>序号</text><text>代码</text><text>代码简称</text><text>概率</text></view>
					<view v-for="(item,index) in rows" :key="item.code" class="table">
						<text>{{index+1}}</text><text>{{item.code}}</text><text>{{item.codeSummary||'-'}}</text><text>{{item.probability||0}}%</text>
					</view>
					<view v-if="!rows.length" class="empty">暂无统计数据</view>
				</scroll-view></swiper-item>
			<swiper-item><scroll-view scroll-y class="slide"><text class="page-title">统计分析</text>
					<view class="ai-card"><text class="ai-label">分析摘要</text><text class="ai-text">{{analysis}}</text>
					</view>
				</scroll-view></swiper-item>
		</swiper>
		<view class="dots">
			<text v-for="i in 3" :key="i" :class="i===page?'active':''">●</text>
		</view>
	</view>
</template>
<script>
	import {
		getCodeStatistics,
		getInterestTypes
	} from '@/api/staff.js'
	export default {
		data: () => ({
			page: 0,
			rows: [],
			types: [],
			analysis: '正在根据本校复合代码分布生成分析……'
		}),
		onShow() {
			Promise.all([getInterestTypes(), getCodeStatistics()]).then(([t, r]) => {
				this.types = t.data || [];
				this.rows = r.data || [];
				this.makeAnalysis()
			}).catch(e => uni.showToast({
				title: e.message,
				icon: 'none'
			}))
		},
		methods: {
			back() {
				uni.navigateBack()
			},
			makeAnalysis() {
				if (!this.rows.length) {
					this.analysis = '当前暂无足够的心愿橱窗数据，完成更多游戏后可生成更可靠的分析。';
					return
				}
				const top = this.rows.slice(0, 3).map(x => x.code).join('、');
				const total = this.rows.reduce((n, x) => n + Number(x.userCount || 0), 0);
				this.analysis =
					`基于本校已完成心愿橱窗的 ${total} 条有效记录，当前排名靠前的复合代码为 ${top}。这表明学生的兴趣呈现一定的组合倾向，建议学校结合优势类型开展分层生涯辅导，并针对低频类型增加体验式游戏和职业探索活动。该结果为统计性参考，不代表对个体学生的结论。`
			}
		}
	}
</script>
<style scoped>
	.page {
		height: 100vh;
		background: #f4f7fb;
		padding: 28rpx 24rpx;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		overflow: hidden
	}

	.top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex: none
	}

	.title {
		font-size: 36rpx;
		font-weight: 700;
		color: #1a2c4a
	}

	.back {
		color: #2f80ed;
		font-size: 25rpx
	}

	.swiper {
		flex: 1;
		height: 0;
		min-height: 0;
		margin-top: 20rpx;
		overflow: hidden
	}

	.swiper-item {
		height: 100%
	}

	.slide {
		height: 100%;
		background: #fff;
		border-radius: 20rpx;
		padding: 28rpx;
		box-sizing: border-box
	}

	.page-title {
		display: block;
		font-size: 30rpx;
		font-weight: 700;
		color: #1a2c4a;
		margin-bottom: 20rpx
	}

	.type-card {
		display: flex;
		gap: 20rpx;
		padding: 24rpx 0;
		border-bottom: 1rpx solid #edf1f6
	}

	.type-code {
		width: 68rpx;
		height: 68rpx;
		line-height: 68rpx;
		text-align: center;
		border-radius: 18rpx;
		background: #eaf2ff;
		color: #2f80ed;
		font-size: 32rpx;
		font-weight: 700
	}

	.type-name {
		display: block;
		font-size: 28rpx;
		font-weight: 700;
		color: #1a2c4a
	}

	.type-desc {
		display: block;
		color: #8190a5;
		font-size: 23rpx;
		margin-top: 8rpx
	}

	.table {
		display: grid;
		grid-template-columns: 65rpx 90rpx 1fr 90rpx;
		gap: 6rpx;
		padding: 24rpx 4rpx;
		border-bottom: 1rpx solid #edf1f6;
		font-size: 23rpx;
		color: #52657c
	}

	.head {
		background: #eaf2ff;
		color: #1a2c4a;
		font-weight: 700
	}

	.ai-card {
		background: #f5f9ff;
		border-radius: 18rpx;
		padding: 30rpx
	}

	.ai-label {
		display: block;
		color: #2f80ed;
		font-size: 28rpx;
		font-weight: 700;
		margin-bottom: 18rpx
	}

	.ai-text {
		font-size: 27rpx;
		line-height: 1.8;
		color: #52657c
	}

	.empty {
		text-align: center;
		color: #9cadc0;
		padding: 90rpx 0
	}

	.dots {
		text-align: center;
		padding: 18rpx;
		color: #c6d4e5;
		flex: none
	}

	.dots text {
		margin: 0 8rpx;
		font-size: 18rpx
	}

	.dots .active {
		color: #2f80ed
	}
</style>