<template>
	<view class="container">
		<uni-nav-bar
			dark
			:fixed="true"
			shadow
			background-color="#007AFF"
			status-bar
			title="职愿探究"
			left-icon="left"
			@clickLeft="back"
			:border="false"
		/>
		
		<view class="zytj-container">
			<!-- 倒计时 -->
			<!-- <view class="countdown-bar">
				<text class="countdown-label">⏱️ 剩余时间：</text>
				<text class="countdown-time" :class="{ 'time-warning': countdown <= 10 }">{{ countdown }}秒</text>
			</view> -->
			
			<!-- 进度 -->
			<view class="progress-display">
				<text class="progress-label">选择进度：</text>
				<text class="progress-value">{{ selectedCount }}/4</text>
			</view>
			<!-- 4列商品选择区域 -->
			<view class="products-grid">
				<!-- 第一列：E/I -->
				<view class="column-section">
					<!-- <text class="column-title">第一列：E/I 维度</text> -->
					<view class="products-row">
						<view 
							v-for="(product, idx) in columns[1]" 
							:key="product.productId"
							class="product-card"
							:class="{ 'selected': selectedProducts[0] === product.productId }"
							@click="selectProduct(0, product)"
						>
							<image :src="product.productImage" class="product-image" mode="aspectFit"></image>
							<text class="product-name">{{ product.productName }}</text>
							<!-- <text class="product-dimension">{{ product.mbtiDimension }}</text> -->
						</view>
					</view>
				</view>
				
				<!-- 第二列：S/N -->
				<view class="column-section">
					<!-- <text class="column-title">第二列：S/N 维度</text> -->
					<view class="products-row">
						<view 
							v-for="(product, idx) in columns[2]" 
							:key="product.productId"
							class="product-card"
							:class="{ 'selected': selectedProducts[1] === product.productId }"
							@click="selectProduct(1, product)"
						>
							<image :src="product.productImage" class="product-image" mode="aspectFit"></image>
							<text class="product-name">{{ product.productName }}</text>
							<!-- <text class="product-dimension">{{ product.mbtiDimension }}</text> -->
						</view>
					</view>
				</view>
				
				<!-- 第三列：T/F -->
				<view class="column-section">
					<!-- <text class="column-title">第三列：T/F 维度</text> -->
					<view class="products-row">
						<view 
							v-for="(product, idx) in columns[3]" 
							:key="product.productId"
							class="product-card"
							:class="{ 'selected': selectedProducts[2] === product.productId }"
							@click="selectProduct(2, product)"
						>
							<image :src="product.productImage" class="product-image" mode="aspectFit"></image>
							<text class="product-name">{{ product.productName }}</text>
							<!-- <text class="product-dimension">{{ product.mbtiDimension }}</text> -->
						</view>
					</view>
				</view>
				
				<!-- 第四列：J/P -->
				<view class="column-section">
					<!-- <text class="column-title">第四列：J/P 维度</text> -->
					<view class="products-row">
						<view 
							v-for="(product, idx) in columns[4]" 
							:key="product.productId"
							class="product-card"
							:class="{ 'selected': selectedProducts[3] === product.productId }"
							@click="selectProduct(3, product)"
						>
							<image :src="product.productImage" class="product-image" mode="aspectFit"></image>
							<text class="product-name">{{ product.productName }}</text>
							<!-- <text class="product-dimension">{{ product.mbtiDimension }}</text> -->
						</view>
					</view>
				</view>
			</view>
			
			<!-- 提交按钮 -->
			<view class="submit-section">
				<button 
					class="submit-btn" 
					@click="handleSubmit"
					:disabled="isSubmitting || !canSubmit"
					:loading="isSubmitting"
				>
					{{ isSubmitting ? '提交中...' : '确认提交' }}
				</button>
				<button 
				        v-if="hasSubmitted"
				        class="next-btn" 
				        @click="goToNext"
				    >
				        下一页
				    </button>
			</view>
		</view>
	</view>
</template>

<script>

import { getActivityProgress } from '@/api/activity/activity'

import config from '@/config/api.js'


import { getProducts, submitChoice, getMyResult } from '@/api/zytj.js'
import { redirectToActivityWeek, completeActivityWeekGame } from '@/utils/activity'


export default {
	data() {
		return {
			loading: true,
			activityId: null,
			gameId: null,
			hasSubmitted: false,

			columns: {
				1: [],
				2: [],
				3: [],
				4: []
			},
			selectedProducts: [null, null, null, null],
			selectedCount: 0, 
			countdown: 3000,
			timer: null,
			isSubmitting: false
		}
	},
	computed: {
		canSubmit() {
			return this.selectedProducts.every(p => p !== null)
		}
	},
	onLoad(options) {
		this.activityId = options.activityId || uni.getStorageSync("activityId")
		this.gameId = options.gameId || null
		if (!this.activityId) {
			uni.showToast({ title: '参数错误', icon: 'none' })
			return
		}
		// 检查是否已完成
		this.checkActivityProgress()
		// 加载商品列表
		this.loadProducts()
		// 启动倒计时
		this.startCountdown()
	},
	onUnload() {
		// 清理定时器
		if (this.timer) {
			clearInterval(this.timer)
		}
	},
	methods: {
		// 检查活动进度
		checkActivityProgress() {
			getActivityProgress(this.activityId).then(res => {
				if (res.code !== 200 || !res.data) {
					uni.showToast({ title: '活动信息获取失败', icon: 'none' })
					return
				}
				const finished = res.data
					.filter(m => m.type === 'zytj')
					.map(m => m.finished)[0]
				if (finished) {
					 this.hasSubmitted = true
					return
				}
			})
		},
		// 加载商品列表
		loadProducts() {
			this.loading = true
			getProducts(this.activityId).then(res => {
				if (res.code === 200) {
					const columns = res.data
					Object.values(columns).forEach(list => {
					    list.forEach(product => {
					        if (product.productImage && !/^https?:\/\//.test(product.productImage)) {
					            product.productImage = config.BASE_URL + product.productImage
					        }
					    })
					})
					this.columns = columns
					this.loading = false
				} else {
					uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
					this.loading = false
				}
			}).catch(() => {
				this.loading = false
				uni.showToast({ title: '加载失败', icon: 'none' })
			})
		},
		// 选择商品
		selectProduct(columnIndex, product) {
			// 更新选中的商品
			this.$set(this.selectedProducts, columnIndex, product.productId)
			// 更新已选数量
			this.selectedCount = this.selectedProducts.filter(p => p !== null).length
		},
		// 启动倒计时
		startCountdown() {
			this.countdown = 3000
			this.timer = setInterval(() => {
				this.countdown--
				if (this.countdown <= 0) {
					clearInterval(this.timer)
					// 时间到，自动补全未选择的
					this.autoComplete()
				}
			}, 1000)
		},
		// 自动补全未选择的商品
		autoComplete() {
			uni.showToast({ title: '时间到！自动补全选择', icon: 'none', duration: 1500 })
			// 为每一列未选择的商品随机选择第一个
			for (let i = 0; i < 4; i++) {
				if (this.selectedProducts[i] === null) {
					const column = this.columns[i + 1]
					if (column && column.length > 0) {
						this.$set(this.selectedProducts, i, column[0].productId)
					}
				}
			}
			// 延迟自动提交
			setTimeout(() => {
				this.handleSubmit()
			}, 1500)
		},
		// 提交选择
		handleSubmit() {
			if (this.isSubmitting) return
			// 检查是否所有商品都已选择
			if (!this.canSubmit) {
				uni.showToast({ title: '请完成所有选择', icon: 'none' })
				return
			}
			this.isSubmitting = true
			const productIds = this.selectedProducts.join(',')
			submitChoice({
				activityId: this.activityId,
				productIds: productIds
		}).then(async res => {
				if (res.code === 200) {
					await completeActivityWeekGame(this.gameId, { result: res.data }).catch(() => {})
					const choiceCode = res.data.choiceCode
					// 跳转到第二页：性格类型展示
					uni.navigateTo({
						url: '/pages/zytj/result?code='+ choiceCode + '&activityId=' + this.activityId
					})
				} else {
					uni.showToast({ title: res.msg || '提交失败', icon: 'none' })
				}
				this.isSubmitting = false
			}).catch(() => {
				uni.showToast({ title: '提交异常', icon: 'none' })
				this.isSubmitting = false
			})
		},
		// 返回
		back() {
			redirectToActivityWeek()
		},
		
		// 跳转到结果页（已提交过的学生使用）
		goToNext() {
		    getMyResult(this.activityId).then(res => {
		        if (res.code === 200 && res.data) {
		            const choiceCode = res.data.choiceCode
		            uni.navigateTo({
		                url: '/pages/zytj/result?code=' + choiceCode + '&activityId=' + this.activityId
		            })
		        } else {
		            uni.showToast({ title: '获取结果失败，请重新提交', icon: 'none' })
		            this.hasSubmitted = false
		        }
		    }).catch(() => {
		        uni.showToast({ title: '获取结果异常', icon: 'none' })
		    })
		}

	}
}
</script>

<style scoped>
.container {
	min-height: 100vh;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	padding-top: var(--window-top);
}

.zytj-container {
	padding: 20rpx 30rpx;
	padding-top: 120rpx;
}

/* 倒计时 */
.countdown-bar {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 20rpx 30rpx;
	margin-bottom: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

/* 选择进度显示 */
.progress-display {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 20rpx;
	margin-bottom: 30rpx;
	text-align: center;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}
.progress-label {
	font-size: 26rpx;
	color: #666;
}

.progress-value {
	font-size: 32rpx;
	font-weight: bold;
	color: #667eea;
	margin-left: 10rpx;
}

.countdown-label {
	font-size: 28rpx;
	color: #666;
}

.countdown-time {
	font-size: 36rpx;
	font-weight: bold;
	color: #4CAF50;
	margin-left: 10rpx;
}

.time-warning {
	color: #f44336 !important;
	animation: pulse 1s infinite;
}

@keyframes pulse {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.5; }
}

/* 商品网格 */
.products-grid {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.column-section {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 20rpx;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.column-title {
	font-size: 26rpx;
	color: #666;
	margin-bottom: 15rpx;
	display: block;
	text-align: center;
}

.products-row {
	display: flex;
	justify-content: space-around;
	gap: 20rpx;
}

.product-card {
	flex: 1;
	background: #f5f5f5;
	border-radius: 15rpx;
	padding: 15rpx;
	text-align: center;
	border: 4rpx solid transparent;
	transition: all 0.3s;
}

.product-card.selected {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-color: #fff;
	box-shadow: 0 8rpx 20rpx rgba(102, 126, 234, 0.4);
	transform: scale(1.05);
}

.product-image {
	width: 100%;
	height: 200rpx;
	border-radius: 10rpx;
	margin-bottom: 10rpx;
}

.product-name {
	font-size: 24rpx;
	color: #333;
	display: block;
	margin-bottom: 5rpx;
	font-weight: bold;
}

.selected .product-name {
	color: #fff;
}

.product-dimension {
	font-size: 22rpx;
	color: #999;
	display: block;
}

.selected .product-dimension {
	color: rgba(255, 255, 255, 0.8);
}

/* 提交按钮 */
.submit-section {
	margin-top: 30rpx;
	padding: 0 20rpx;
}

.next-btn {
    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    color: #fff;
    border: none;
    border-radius: 50rpx;
    font-size: 32rpx;
    font-weight: bold;
    padding: 25rpx 0;
    box-shadow: 0 8rpx 20rpx rgba(67, 233, 123, 0.4);
}


.submit-btn {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
	border: none;
	border-radius: 50rpx;
	font-size: 32rpx;
	font-weight: bold;
	padding: 25rpx 0;
	box-shadow: 0 8rpx 20rpx rgba(102, 126, 234, 0.4);
}

.submit-btn[disabled] {
	background: #ccc;
	box-shadow: none;
}
</style>
