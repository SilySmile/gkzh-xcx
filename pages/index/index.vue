<template>

	<view class="home-container">

		<!-- 顶部栏 -->

		<view class="top-bar">

			<image class="logo" src="/static/school.png" />

			<view class="school-name">山河大学</view>

			<view class="top-actions">

				<image class="icon-btn" src="/static/scan.png" @click="onScan" />

				<image class="icon-btn" src="/static/msg.png" @click="onMsg" />

			</view>

		</view>

		<!-- Banner轮播 -->

		<swiper class="banner-swiper" :indicator-dots="true" :autoplay="true" interval="4000">

			<swiper-item v-for="(item, idx) in banners" :key="idx">

				<image :src="item.img" class="banner-img" mode="aspectFill" />

			</swiper-item>

		</swiper>

		<!-- 宫格功能区 -->

		<view class="func-grid">

			<view v-for="(item, idx) in funcList" :key="idx" class="func-item" @click="onFunc(item)">

				<image :src="item.icon" class="func-icon" />

				<view class="func-label">{{ item.label }}</view>

			</view>

		</view>

		<!-- 公告/政策解读区 -->

		<view class="section-title">

			政策解读

			<text class="more-btn" @click="onMoreNotice">查看更多</text>

		</view>

		<view class="notice-list">

			<view v-for="(item, idx) in noticeList" :key="idx" class="notice-item">

				<view class="notice-title">{{ item.title }}</view>

				<view class="notice-meta">

					<text>{{ item.source }}</text>

					<text>{{ item.date }}</text>

				</view>

			</view>

		</view>

		<!-- 页面内容 -->

    	<custom-tabbar :active="'home'" />

	</view>

</template>



<script>

	import CustomTabbar from '@/components/CustomTabbar.vue';

	import { getJsSdkConfig } from '@/api/index';
	import { getProfile } from '@/api/checkin';
	import { getWeekFlow, enterWeekGame } from '@/api/activity/week';
	import { enterRecord, userMessage } from '@/api/zycck';

	// 微信SDK导入 - 仅在H5环境下使用

	let jWeixin = null;

	let wxLoaded = false;

	export default {

		components: {

			CustomTabbar

		},

		data() {

			return {

				banners: [

					{ img: 'https://zhiye.sxgkzh.cn/imgs/xcx/banner1.png' },

					{ img: 'https://zhiye.sxgkzh.cn/imgs/xcx/banner2.png' }

				],

				funcList: [

					{ label: '比赛中心', icon: '/static/func/contest.png', page: '/pages/contest/index' },

					{ label: '名师咨询', icon: '/static/func/teacher.png', page: '/pages/teacher/index' },

					{ label: 'AI面试', icon: '/static/func/ai.png', page: '/pages/ai/resume.vue' },

					{ label: '视频空间', icon: '/static/func/video.png', page: '/pages/video/index' },

					{ label: '全部功能', icon: '/static/func/all.png', page: '/pages/func/all' }

				],

				noticeList: [

					{ title: '常建忠在省职业技能鉴定中心调研', source: '山西省人力资源和社会保障厅', date: '2025-06-04' },

					{ title: '关于举办2025年大学生创新创业大赛的通知', source: '教务处', date: '2025-05-28' }

				],

				activeTab: 'home'

			}

		},

		onLoad() {
			const token = uni.getStorageSync('token');
			if (!token) {
				uni.reLaunch({ url: '/pages/mp/login/index' });
				return;
			}
			getProfile().then(res => {
				if (res.code !== 200 || !res.data) throw new Error('登录状态已失效');
				this.saveProfile(res.data);

			// #ifdef H5

			// 仅在H5环境下加载微信SDK

				this.initWechatSDK();

			// #endif

			}).catch(() => {
				uni.removeStorageSync('token');
				uni.reLaunch({ url: '/pages/mp/login/index' });
			});

		},
		methods: {
			saveProfile(data) {
				uni.setStorageSync('studentName', data.studentName || '');
				uni.setStorageSync('studentNo', data.studentNo || '');
				if (data.schoolId !== undefined && data.schoolId !== null) uni.setStorageSync('schoolId', data.schoolId);
				if (data.schoolName) uni.setStorageSync('schoolName', data.schoolName);
				if (data.departmentName || data.majorName) uni.setStorageSync('majorName', data.departmentName || data.majorName);
				if (data.gender !== undefined && data.gender !== null) uni.setStorageSync('gender', data.gender);
			},


			initWechatSDK() {

				// 检查是否在微信环境中

				if (!this.isWechat()) {

					console.warn('非微信环境，跳过微信SDK初始化');

					return;

				}

				

				// 使用官方推荐的方式加载微信SDK

				try {

					jWeixin = require('jweixin-module');

					wxLoaded = true;

					console.log('微信SDK加载成功');

					this.configWechatSDK();

				} catch (e) {

					console.warn('微信SDK加载失败:', e);

					// uni.showToast({title:'微信SDK加载失败',icon: 'loading',duration: 5000});

					wxLoaded = false;

				}

				

			},

			isWechat() {

				// 检测是否在微信浏览器中

				const ua = navigator.userAgent.toLowerCase();

				return ua.indexOf('micromessenger') > -1;

			},

			configWechatSDK() {

				// 首先从服务器获取配置信息

				const url = window.location.href.split('#')[0];

				getJsSdkConfig(url).then(res=>{

					const config = res.data

					uni.showToast({

						title: res.msg,

						icon: 'loading',

						duration: 5000

					});

					console.log(config)

					jWeixin.config({

						debug: false , // 开启调试模式

						appId: config.appId, // 必填，公众号的唯一标识

						timestamp: config.timestamp, // 必填，生成签名的时间戳

						nonceStr: config.nonceStr, // 必填，生成签名的随机串

						signature: config.signature, // 必填，签名

						jsApiList: [

							'scanQRCode', // 微信扫码API

							'chooseImage', // 拍照或从手机相册中选图

							'previewImage', // 预览图片

							'uploadImage', // 上传图片

							'downloadImage' // 下载图片

						]

					})

		

					jWeixin.ready(() => {

						// uni.showToast({title:'初始化成功',icon: 'loading',duration: 5000});

						console.log('微信JS-SDK 初始化成功')

					})

			

					jWeixin.error((err) => {

						// uni.showToast({title:'初始化失败',icon: 'loading',duration: 5000});

						console.error('微信JS-SDK 初始化失败', err)

					})

			})

			},

		onScan() {
			// #ifdef MP-WEIXIN
			uni.scanCode({
				success: (res) => {
					this.handleScanResult(res.result)
				}
			})
			return
			// #endif
			// #ifndef MP-WEIXIN

				// 检查微信SDK是否可用

				if (!jWeixin || !wxLoaded) {

					uni.showToast({

						title: '微信SDK未加载完成，请稍后重试',

						icon: 'none'

					});

					return;

				}

				

				// 检查是否在微信环境中

				if (!this.isWechat()) {

					uni.showToast({

						title: '请在微信中打开',

						icon: 'none'

					});

					return;

				}

				

				// 使用微信SDK的扫码功能

				jWeixin.scanQRCode({

					needResult: 1, // 默认为0，扫描结果由微信处理，1则直接返回扫描结果

					scanType: ["qrCode","barCode"], // 可以指定扫二维码还是一维码，默认二者都有

					success: (res) => {

						console.log('微信扫码结果:', res.resultStr);

						uni.showToast({

							title: '扫码成功',

							icon: 'success'

						});

						// 处理扫码结果

						this.handleScanResult(res.resultStr);

					},

					fail: (err) => {

						console.error('微信扫码失败:', err);

						uni.showToast({

							title: '扫码失败',

							icon: 'none'

						});

					}

				});

			},

			// #endif
		},
      onSign() {

				uni.showToast({ title: '签到成功', icon: 'success' });

			},

			onMsg() {

				uni.showToast({ title: '消息中心', icon: 'none' });

			},

			onFunc(item) {

				if (item.page) {

					uni.navigateTo({ url: item.page });

				}

			},

			onMoreNotice() {

				uni.showToast({ title: '查看更多公告', icon: 'none' });

			},

			async handleScanResult(result) {
				// 新活动二维码：直接按 URL 跳转
				// 游戏二维码以 GKZH_MP: 小程序文本码保存，微信相机不会把它当成网页 URL 打开。
				if (result && (result.indexOf('/pages/activity/week') > -1 || result.indexOf('/pages/xycc/start') > -1 || result.indexOf('/pages/sszctop/index') > -1 || result.indexOf('/pages/zycck/start') > -1)) {
					const query = this.parseScanQuery(result)
					const params = Object.keys(query).map(k => k + '=' + encodeURIComponent(query[k])).join('&')
					const isXyccStart = result.indexOf('/pages/xycc/start') > -1
					const isSszctop = result.indexOf('/pages/sszctop/index') > -1 || query.gameType === 'sszctop'
					const isZycck = result.indexOf('/pages/zycck/start') > -1 || query.gameType === 'zycck'
					if (isZycck) {
						if (!query.instanceId || !query.gameId) {
							uni.showToast({ title: '二维码缺少活动信息，请重新扫码', icon: 'none' })
							return
						}
						try {
							const entered = await enterRecord({ instanceId: query.instanceId, gameId: query.gameId, gameType: 'zycck', schoolId: uni.getStorageSync('schoolId') })
							const recordId = entered && entered.data && (entered.data.recordId || entered.data.id)
							if (!recordId) throw new Error('记录创建失败')
							uni.redirectTo({ url: `/pages/zycck/start?instanceId=${encodeURIComponent(query.instanceId)}&gameId=${encodeURIComponent(query.gameId)}&recordId=${encodeURIComponent(recordId)}` })
						} catch (e) {
							uni.showToast({ title: userMessage(e, '游戏入口校验失败，请重新扫码'), icon: 'none' })
						}
						return
					}
					if (isXyccStart) {
						// 直达心愿橱窗开始页也要先核验活动和游戏，不能只信二维码中的 gameId。
						if (!query.instanceId || !query.gameId) {
							uni.showToast({ title: '二维码缺少活动信息，请重新生成', icon: 'none' })
							return
						}
						getWeekFlow(query.instanceId).then(flowRes => {
							let valid = false
							if (flowRes.code === 200 && flowRes.data) (flowRes.data.areas || []).forEach(area => (area.games || []).forEach(game => {
								if (String(game.gameId) === String(query.gameId) && game.gameType === 'mind-window') valid = true
							}))
							if (!valid) {
								uni.showToast({ title: '心愿橱窗不属于当前活动', icon: 'none' })
								return
							}
							uni.navigateTo({ url: '/pages/xycc/start?' + params })
						})
						return
					}
					if (isSszctop) {
						if (!query.instanceId || !query.gameId) {
							uni.showToast({ title: '二维码缺少活动信息，请重新生成', icon: 'none' })
							return
						}
						getWeekFlow(query.instanceId).then(flowRes => {
							let valid = false
							let terminal = false
							if (flowRes.code === 200 && flowRes.data) (flowRes.data.areas || []).forEach(area => (area.games || []).forEach(game => {
								if (String(game.gameId) === String(query.gameId) && game.gameType === 'sszctop') {
									valid = true
									terminal = !!(game.isFinish || game.isFail)
								}
							}))
							if (!valid) {
								uni.showToast({ title: '谁是职场TOP不属于当前活动', icon: 'none' })
								return
							}
							if (terminal) {
								uni.navigateTo({ url: '/pages/sszctop/report?gameId=' + query.gameId })
								return
							}
							enterWeekGame(query.gameId, query.instanceId).then(() => {
								uni.navigateTo({ url: '/pages/sszctop/index?' + params })
							}).catch(() => uni.showToast({ title: '游戏入口已失效，请重新扫码进入', icon: 'none' }))
						})
						return
					}
					uni.navigateTo({ url: '/pages/activity/week' + (params ? '?' + params : '') })
					return
				}

				try {
					// 尝试解析扫码结果为JSON

					const scanData = JSON.parse(result);

					

					// 根据扫码类型进行不同处理

					switch(scanData.type) {

						case 'activity':
							uni.showToast({ title: '暂不支持该活动二维码', icon: 'none' })
							break;

						case 'checkin':

							// 签到二维码

							uni.navigateTo({

								url: `/pages/checkin/index?activityId=${scanData.activityId}`

							});

							break;

						case 'lottery':

							// 抽奖二维码

							uni.navigateTo({

								url: `/pages/lottery/index?activityId=${scanData.activityId}`

							});

							break;

						default:

							// 默认处理

							uni.showModal({

								title: '扫码结果',

								content: result,

								showCancel: false

							});

					}

				} catch (e) {

					// 如果不是JSON格式，直接显示结果

					uni.showModal({

						title: '扫码结果',

						content: result,

						showCancel: false

					});

				}
			},
			parseScanQuery(url) {
				const query = {}
				const hashIndex = url.indexOf('#')
				const queryStart = url.indexOf('?', hashIndex >= 0 ? hashIndex : 0)
				const idx = queryStart
				if (idx < 0) return query
				const search = url.substring(idx + 1)
				search.split('&').forEach(pair => {
					if (!pair) return
					const [key, value] = pair.split('=')
					query[decodeURIComponent(key)] = decodeURIComponent(value || '')
				})
				return query
			}
		}

	}

</script>



<style scoped>

	.home-container {

		background: #f7f8fa;

		min-height: calc(100vh - 44px);

		width: 100vw;

		overflow-x: hidden;

		padding-bottom: 40px;

	}



	.top-bar {

		display: flex;

		align-items: center;

		height: 100rpx;

		padding: 0 20rpx;

		background: #fff;

	}



	.logo {

		width: 60rpx;

		height: 60rpx;

		border-radius: 50%;

		margin-right: 18rpx;

	}



	.school-name {

		font-size: 32rpx;

		font-weight: bold;

		color: #222;

		flex: 1;

	}



	.top-actions {

		display: flex;

		align-items: center;

	}



	.icon-btn {

		width: 38rpx;

		height: 38rpx;

		margin-left: 10rpx;

	}



	.banner-swiper {

		width: 100vw;

		height: 320rpx;

		margin: 28rpx 0 0 0;

		border-radius: 18rpx;

		overflow: hidden;

		box-shadow: 0 4rpx 16rpx #e0e0e0;

		background: #fff;

	}



	.banner-img {

		width: 100%;

		height: 320rpx;

		display: block;

		border-radius: 16rpx;

	}



	.func-grid {

		display: flex;

		flex-wrap: wrap;

		background: #fff;

		margin: 24rpx 0 0 0;

		border-radius: 18rpx;

		box-shadow: 0 2rpx 8rpx #f0f0f0;

		padding: 18rpx 0 8rpx 0;

		width: 100vw;

	}



	.func-item {

		width: 20%;

		display: flex;

		flex-direction: column;

		align-items: center;

		margin-bottom: 18rpx;

	}



	.func-icon {

		width: 60rpx;

		height: 60rpx;

		margin-bottom: 8rpx;

	}



	.func-label {

		font-size: 24rpx;

		color: #333;

	}



	.section-title {

		font-size: 28rpx;

		font-weight: bold;

		color: #222;

		margin: 32rpx 20rpx 12rpx 20rpx;

		display: flex;

		align-items: center;

		justify-content: space-between;

	}



	.more-btn {

		font-size: 24rpx;

		color: #007aff;

		margin-left: 12rpx;

	}



	.notice-list {

		background: #fff;

		margin: 0;

		border-radius: 14rpx;

		box-shadow: 0 2rpx 8rpx #f0f0f0;

		padding: 10rpx 0 10rpx 0;

		width: 100vw;

	}



	.notice-item {

		padding: 18rpx 20rpx 10rpx 20rpx;

		border-bottom: 1px solid #f2f2f2;

	}



	.notice-item:last-child {

		border-bottom: none;

	}



	.notice-title {

		font-size: 26rpx;

		color: #222;

		margin-bottom: 6rpx;

	}



	.notice-meta {

		font-size: 22rpx;

		color: #888;

		display: flex;

		justify-content: space-between;

	}



</style>



/* H5端彻底隐藏滚动条 */

html, body, #app, .uni-app--show, .uni-page, .uni-body {

	width: 100vw;

	height: 100vh;

	overflow-x: hidden;

	overflow-y: hidden !important;

}

