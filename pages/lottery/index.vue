<template>
    <view class="container">
        <uni-nav-bar
                dark
                :fixed="true"
                shadow
                background-color="#007AFF"
                status-bar
                title="抽奖"
                left-icon="left"
                @clickLeft="back"
                :border="false"
        />
        <view class="lottery-container">
			<view v-if="myRecord" class="my-lottery-info" @click="showMyRecord">
				<text class="entry-gift">🎁</text>
				<view class="entry-copy">
					<text class="entry-title">中奖记录</text>
					<text class="entry-sub">已抽 {{ drawCount }}/{{ maxDrawCount }}</text>
				</view>
				<text class="entry-arrow">›</text>
            </view>

			<view v-if="recordVisible" class="record-mask" @click="closeRecords">
				<view class="record-dialog" @click.stop>
					<view class="record-title">我的中奖记录（{{ myRecords.length }}）</view>
					<view v-if="!myRecords.length" class="record-empty">暂无中奖记录</view>
					<view v-for="(record, idx) in myRecords" :key="idx" class="record-line">
						<view class="record-main" :class="{ 'record-disabled': isNoPrize(record) }" @tap="openRecordQr(record)">
						<view class="record-count">第{{ idx + 1 }}次</view>
						<view class="record-prize">{{ record.prizeTitle || '未记录' }}</view>
						<view class="record-time">{{ formatRecordTime(record.createTime || record.drawTime) }}</view>
						</view>
						<view v-if="isNoPrize(record)" class="record-status">谢谢参与</view>
						<view v-else-if="!needsRedemption(record)" class="record-status">无需核销</view>
						<view v-else-if="isRedeemed(record)" class="record-status redeemed">已核销</view>
						<text v-else class="record-qr-tip" @tap.stop="openRecordQr(record)">点击展示核销码</text>
					</view>
					<button class="record-close" @click="closeRecords">关闭</button>
				</view>
			</view>

			<view v-if="prizeQrVisible" class="record-mask" @click="closePrizeQr">
				<view class="qr-dialog" @click.stop>
					<view class="record-title">奖品核销码</view>
					<text v-if="qrPrizeTitle" class="qr-prize-title">{{ qrPrizeTitle }}</text>
					<image v-if="prizeQrImage" :src="prizeQrImage" mode="widthFix" class="prize-qr" />
					<text class="record-time">请将此二维码出示给工作人员</text>
					<text class="redemption-code">文本核销码：{{ qrCode }}</text>
					<button class="record-close" @click="closePrizeQr">关闭</button>
				</view>
			</view>

            <!-- 加载状态 -->
            <view v-if="loading" class="loading-container">
                <text class="loading-text">加载中...</text>
            </view>

            <!-- 错误状态 -->
            <view v-else-if="error" class="error-container">
                <text class="error-text">{{ error }}</text>
                <button class="retry-btn" @click="loadPrizes">重试</button>
            </view>

            <!-- 中奖记录打开前把转盘截图作为背景，原生 canvas 同时隐藏，避免画布盖住弹层 -->
            <view v-else>
                <canvas v-show="!recordVisible" canvas-id="lotteryWheel" class="lottery-canvas"
                        width="300" height="300"></canvas>
                <image v-if="recordVisible && wheelSnapshot" :src="wheelSnapshot" mode="aspectFit"
                       class="lottery-canvas wheel-snapshot" />
                <button class="lottery-btn" @click="startLottery"
                        :disabled="spinning || !lotteryEnabled">
                    {{ spinning ? '抽奖中...' : '开始抽奖' }}
                </button>
            </view>
        </view>
    </view>

</template>

<script>
import {getPrizeList, drawPrize, checkLottery, getPrizesByLotteryId, drawPrizeByLotteryId, getMyLottery, getMyLotteryList} from '../../api/lottery.js'
import {getActivityProgress} from "../../api/activity/activity";
import { getActivityWeekUrl, redirectToActivityWeek, completeActivityWeekGame } from '@/utils/activity'
import config from '@/config/api.js'

export default {
    data() {
        return {
            prizes: [],
            loading: true,
            error: null,
            spinning: false,
            activeIndex: 0,
            timer: null,
            loadedPrizeImages: [], // 预加载后的本地图片路径
            preloadingImages: false,
            loadedImagesKey: '',
            activityId: null, // 活动ID,
            gameId: null,
            lotteryId: null,
            myRecord: null,
            myRecords: [],
            maxDrawCount: 1,
            drawCount: 0,
			recordVisible: false,
			wheelSnapshot: '',
			prizeQrVisible: false,
			prizeQrImage: '',
			qrRecordId: '',
			qrCode: '',
			qrPrizeTitle: '',
			resultRefreshPending: false,
			winningPrize: null,
            lotteryEnabled: false,
            minFinishCount: 0,
            finishedCount: 0
        }
    },
		onLoad(options) {
			this.activityId = options.activityId || uni.getStorageSync("activityId");
			this.gameId = options.gameId || null;
			this.lotteryId = options.lotteryId || uni.getStorageSync("lotteryId") || null;
			if (!this.activityId) {
				uni.showToast({ title: '参数错误', icon: 'none' })
				return;
			}
			uni.setStorageSync('activityId', this.activityId)
			this.checkLotteryAccess()
		},

    methods: {
		async checkLotteryAccess() {
			try {
				const res = await checkLottery(this.activityId)
				if (res.code !== 200 || !res.data || !res.data.assigned) {
					this.loading = false
					uni.showToast({ title: '暂无抽奖活动', icon: 'none' })
					return
				}
				this.lotteryEnabled = true
				this.lotteryId = res.data.lotteryId
				this.minFinishCount = res.data.minFinishCount || 0
				this.finishedCount = res.data.finishedCount || 0
				this.maxDrawCount = res.data.maxDrawCount || 1
				this.drawCount = res.data.drawCount || 0
				if (this.drawCount >= this.maxDrawCount) {
					this.lotteryEnabled = false
				}
				getMyLottery(this.lotteryId, this.activityId).then(myRes => {
					if (myRes.code === 200) {
						this.myRecord = myRes.data
					}
				})
				if (this.finishedCount < this.minFinishCount) {
					this.loading = false
					uni.showToast({ title: `需完成至少 ${this.minFinishCount} 个游戏才可抽奖`, icon: 'none' })
					return
				}
				this.loadPrizes()
			} catch (e) {
				this.loading = false
				uni.showToast({ title: '抽奖资格校验失败', icon: 'none' })
			}
		},
        // 加载奖品数据
        async loadPrizes() {
            this.loading = true;
            this.error = null;

            try {
                const response = await getPrizesByLotteryId(this.lotteryId);
                console.log('奖品列表:', response);
                if (response.code === 200) {
                    this.prizes = response.data || [];
                    this.loadedPrizeImages = [];
                    this.loadedImagesKey = '';
                    if (this.prizes.length === 0) {
                        this.error = '暂无奖品数据';
                    } else {
                        // 先把转盘画出来，图片在后台异步补画，避免首屏一直空白等待。
                        this.loading = false;
                        this.$nextTick(() => this.preloadImages());
                    }
                } else {
                    this.error = '获取奖品失败';
                }
            } catch (err) {
                this.error = '网络错误，请检查网络连接';
            } finally {
                this.loading = false;
            }
        },

        preloadImages() {
            if (this.prizes.length === 0 || this.preloadingImages) return;
            const key = this.prizes.map(prize => prize.imageUrl || '').join('|');
            // 先用文字和扇形立即绘制，图片下载完成后再补画一次，首屏不再等全部图片。
            this.drawWheel(this.activeIndex);
            if (key && key === this.loadedImagesKey) return;
            if (!this.prizes.some(prize => prize.imageUrl)) {
                this.loadedImagesKey = key;
                return;
            }

            this.preloadingImages = true;
            const promises = this.prizes.map(prize => {
                return new Promise(resolve => {
                    if (!prize.imageUrl) {
                        resolve('');
                        return;
                    }
                    uni.getImageInfo({
                        src: prize.imageUrl,
                        success: res => resolve(res.path),
                        fail: () => resolve(prize.imageUrl) // 失败用原路径
                    });
                });
            });

            Promise.all(promises).then(paths => {
                this.loadedPrizeImages = paths;
                this.loadedImagesKey = key;
                this.drawWheel(this.activeIndex);
            }).finally(() => {
                this.preloadingImages = false;
            });
        },

        drawWheel(activeIdx = -1) {
            if (this.prizes.length === 0) return;

            const ctx = uni.createCanvasContext('lotteryWheel', this);
            const size = 300;
            const center = size / 2;
            const radius = center - 18;
            const prizeCount = this.prizes.length;
            const anglePerPrize = 2 * Math.PI / prizeCount;

            ctx.clearRect(0, 0, size, size);

            // 扇形底色
            const colors = ['#fffbe6', '#e6f7ff', '#f0f5ff', '#f9f0ff', '#e6fffb', '#f6ffed'];
            for (let i = 0; i < prizeCount; i++) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(center, center);
                ctx.arc(center, center, radius, i * anglePerPrize, (i + 1) * anglePerPrize);
                if (i === activeIdx) {
                    ctx.setFillStyle('#FFD700'); // 高亮色
                } else {
                    ctx.setFillStyle(colors[i % colors.length]);
                }
                ctx.fill();
                ctx.restore();
            }

            // 奖品图片和文字
            for (let i = 0; i < prizeCount; i++) {
                // 先绘制图片（如果有有效路径）
                const imgPath = this.loadedPrizeImages[i];
                if (imgPath && typeof imgPath === 'string' && imgPath.trim() !== '') {
                    ctx.save();
                    ctx.translate(center, center);
                    ctx.rotate(i * anglePerPrize + anglePerPrize / 2);
                    let scale = (i === activeIdx) ? 1.25 : 1.0;
                    let imgW = 56 * scale;
                    let imgH = 56 * scale;
                    try {
                        ctx.drawImage(imgPath, radius * 0.65 - imgW / 2, -imgH / 2, imgW, imgH);
                    } catch (e) {
                        console.warn('图片绘制失败:', imgPath, e);
                    }
                    ctx.restore();
                }

                // 独立绘制奖品文字
                ctx.save();
                ctx.translate(center, center);
                ctx.rotate(i * anglePerPrize + anglePerPrize / 2);
                ctx.setFillStyle('#333');
                ctx.setFontSize(12);
                ctx.setFontWeight && ctx.setFontWeight('bold');
                ctx.setTextAlign('center');
                ctx.fillText(this.prizes[i].title, radius * 0.65, 10);
                ctx.restore();
            }

            // 中心装饰圆
            ctx.save();
            ctx.beginPath();
            ctx.arc(center, center, 48, 0, 2 * Math.PI);
            ctx.setFillStyle('#fff');
            ctx.shadowColor = '#ff9800';
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.restore();

            // 中心文字
            ctx.save();
            ctx.setFillStyle('#ff9800');
            ctx.setFontSize(22);
            ctx.setFontWeight && ctx.setFontWeight('bold');
            ctx.setTextAlign('center');
            ctx.setTextBaseline('middle');
            ctx.fillText('抽奖', center, center);
            ctx.restore();

            ctx.draw();
        },


		async showMyRecord() {
			const res = await getMyLotteryList(this.lotteryId, this.activityId)
			if (!res || res.code !== 200) return
			this.myRecords = res.data || []
			// 先截取当前转盘作为背景，再打开弹层；旧版原生 canvas 不能压在弹层下面。
			this.wheelSnapshot = await this.captureWheelSnapshot()
			this.recordVisible = true
		},

		captureWheelSnapshot() {
			return new Promise(resolve => {
				if (typeof uni.canvasToTempFilePath !== 'function') {
					resolve('')
					return
				}
				uni.canvasToTempFilePath({
					canvasId: 'lotteryWheel',
					success: result => resolve(result.tempFilePath || ''),
					fail: () => resolve('')
				}, this)
			})
		},

		closeRecords() {
			this.recordVisible = false
			// 关闭后恢复原 canvas；截图只用于弹层打开期间的背景展示。
			this.$nextTick(() => { this.wheelSnapshot = '' })
		},

        async startLottery() {
            if (!this.lotteryEnabled) return;
            if (this.spinning || this.prizes.length === 0) return;

            this.spinning = true;

            try {
                // 调用后端抽奖接口
                const response = await drawPrizeByLotteryId(this.lotteryId, this.activityId);
                if (response.code === 200) {
                    // 活动进度同步不阻塞转盘动画，避免接口慢时点了抽奖迟迟不转。
                    completeActivityWeekGame(this.gameId, { result: response.data }).catch(() => {})
                    this.winningPrize = response.data;
                    // 找到中奖奖品在列表中的索引
                    const winIndex = this.prizes.findIndex(prize => prize.prizeId === this.winningPrize.prizeId);
                    const finalIndex = winIndex >= 0 ? winIndex : 0;
                    // 执行转盘动画
                    console.log('中奖奖品索引:', finalIndex)
                    this.executeLotteryAnimation(finalIndex);
                } else if (
                        response.msg &&
                        response.msg.indexOf('您已经参与过抽奖环节') !== -1
                ) {
                    // 如果是重复参与，自动跳转到下一个环节
                    uni.showToast({
                        title: '您已参与，自动进入下一环节',
                        icon: 'none',
                        duration: 1500
                    });
                    setTimeout(() => {
                        // 这里替换为你的下一个环节页面路径
                        redirectToActivityWeek()
                    }, 1500);
                    this.spinning = false;
                } else {
                    uni.showToast({
                        title: response.msg || '抽奖失败',
                        icon: 'none'
                    });
                    this.spinning = false;
                }
            } catch (err) {
                let msg = '抽奖失败，请重试';
                if (err && err.message) {
                    msg = err.message;
                } else if (err && err.msg) {
                    msg = err.msg;
                }
                // 判断是否为重复参与
                if (msg.indexOf('您已经参与过抽奖环节') !== -1) {
                    uni.showToast({
                        title: '您已参与，自动返回活动页',
                        icon: 'none',
                        duration: 1500
                    });
                    setTimeout(() => {
                        redirectToActivityWeek()
                    }, 1500);
                } else {
                    uni.showToast({
                        title: msg,
                        icon: 'none'
                    });
                }
                this.spinning = false;
            }
        },

        executeLotteryAnimation(winIndex) {
            let current = this.activeIndex;
            let rounds = 3; // 至少转3圈
            // 确保总步数能准确停在winIndex位置
            let totalSteps = rounds * this.prizes.length + (winIndex - current);
            console.log('开始动画: current=', current, 'winIndex=', winIndex, 'totalSteps=', totalSteps);
            // 处理负数情况
            if (totalSteps < 0) {
                totalSteps += this.prizes.length * Math.ceil(Math.abs(totalSteps) / this.prizes.length);
            }

            let step = 0;
            let speed = 80;

            const jump = () => {
                this.activeIndex = (current + step) % this.prizes.length;
                this.drawWheel(this.activeIndex);
                step++;
                if (step <= totalSteps) {
                    // 后期减速
                    if (totalSteps - step < 8) speed += 40;
                    this.timer = setTimeout(jump, speed);
                } else {
                    // 确保最后一帧是准确的中奖位置
                    this.activeIndex = winIndex;
                    this.drawWheel(winIndex);
                    this.spinning = false;
                    // 延迟800ms后显示结果
                    setTimeout(() => {
                        this.showLotteryResult();
                    }, 800);
                }
            };

            jump();
        },

		showLotteryResult() {
			const prize = this.winningPrize || {}
			// 谢谢参与只提示结果，不进入核销流程。
			if (this.isNoPrize({ prizeTitle: prize.title, prizeType: prize.prizeType })) {
				uni.showModal({
					title: '抽奖结果',
					content: '很遗憾，没有中奖',
					showCancel: false,
					confirmText: '确定',
					success: () => this.refreshAfterDraw()
				})
				return
			}
			// 无需核销的奖品只弹出名称。
			if (String(prize.needRedemption) === '0') {
				uni.showModal({
					title: '抽奖结果',
					content: `恭喜你获得：${prize.title}`,
					showCancel: false,
					confirmText: '知道了',
					success: () => this.refreshAfterDraw()
				})
				return
			}
			// 需核销的奖品直接打开核销码弹层；关闭后再刷新抽奖次数和记录。
			if (prize.recordId) {
				this.resultRefreshPending = true
				this.showPrizeQr({
					recordId: prize.recordId,
					redemptionCode: prize.redemptionCode,
					prizeTitle: prize.title,
					prizeType: prize.prizeType,
					needRedemption: prize.needRedemption
				})
				return
			}
			// 兼容没有返回记录编号的旧服务端。
			uni.showModal({
				title: '抽奖结果',
				content: `恭喜你获得：${prize.title}`,
				showCancel: false,
				confirmText: '确定',
				success: () => this.refreshAfterDraw()
			})
		},
		formatRecordTime(value) {
			if (!value) return ''
			const date = new Date(String(value).replace(/-/g, '/'))
			if (isNaN(date.getTime())) return String(value)
			const p = n => String(n).padStart(2, '0')
			return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}`
		},
		needsRedemption(record) {
			if (!record || this.isNoPrize(record)) return false
			const value = record.needRedemption === undefined || record.needRedemption === null
				? '1'
				: String(record.needRedemption)
			return value !== '0'
		},
		openRecordQr(record) {
			if (!record || this.isNoPrize(record)) return
			if (this.isRedeemed(record)) {
				uni.showToast({ title: '该奖品已核销', icon: 'none' })
				return
			}
			if (!this.needsRedemption(record)) {
				uni.showModal({
					title: '奖品信息',
					content: `${record.prizeTitle || '奖品'}（无需核销）`,
					showCancel: false,
					confirmText: '知道了'
				})
				return
			}
			this.showPrizeQr(record)
		},
		showPrizeQr(record) {
			record = record || {}
			if (this.isNoPrize(record)) return
			if (this.isRedeemed(record)) {
				uni.showToast({ title: '该奖品已核销', icon: 'none' })
				return
			}
			if (!this.needsRedemption(record)) {
				uni.showModal({
					title: '奖品信息',
					content: `${record.prizeTitle || '奖品'}（无需核销）`,
					showCancel: false,
					confirmText: '知道了'
				})
				return
			}
			const token = uni.getStorageSync('token')
			const recordId = record.recordId || record.record_id
			if (!recordId) return uni.showToast({ title: '缺少奖品记录编号', icon: 'none' })
			if (!token) return uni.showToast({ title: '请先登录', icon: 'none' })
			// 二维码由服务端缓存为 PNG，客户端直接加载线上图片，避免 Base64 转换兼容问题。
			this.prizeQrImage = this.getPrizeQrPublicUrl(recordId)
			this.qrRecordId = recordId
			this.qrCode = record.redemptionCode || ('GKZH-' + recordId)
			this.qrPrizeTitle = record.prizeTitle || record.title || ''
			this.prizeQrVisible = true
		},
		closePrizeQr() {
			this.prizeQrVisible = false
			// 抽奖后打开的核销码，关闭时再刷新，避免弹层打开期间转盘/次数提前变化。
			if (this.resultRefreshPending) {
				this.resultRefreshPending = false
				this.refreshAfterDraw()
			}
		},
		getPrizeQrPublicUrl(recordId) {
			// 线上 Nginx 将该路径代理到服务端动态二维码接口，避免被静态图片规则拦截。
			return config.BASE_URL + '/prod-api/profile/lottery/qr/' + recordId + '.png'
		},
		showQrImage(dataUri, recordId) {
			// 微信小程序的 image 组件不稳定支持 data URI，先写入临时文件再展示。
			// H5/App 则直接使用 data URI。
			if (typeof wx !== 'undefined' && wx.getFileSystemManager && wx.env && wx.env.USER_DATA_PATH && dataUri.indexOf('base64,') > -1) {
				const base64 = dataUri.split('base64,')[1]
				const filePath = wx.env.USER_DATA_PATH + '/prize-qr-' + recordId + '.png'
				wx.getFileSystemManager().writeFile({
					filePath, data: base64, encoding: 'base64',
					success: () => { this.prizeQrImage = filePath; this.prizeQrVisible = true },
					fail: () => { this.prizeQrImage = dataUri; this.prizeQrVisible = true }
				})
			} else {
				this.prizeQrImage = dataUri
				this.prizeQrVisible = true
			}
		},
		isNoPrize(record) {
			return !!record && (record.prizeTitle === '谢谢参与' || record.resultName === '谢谢参与' || String(record.prizeType) === '3')
		},
		isRedeemed(record) {
			return !!record && String(record.redemptionStatus) === '1'
		},
		getPrizeQrUrl(recordId) {
			return config.BASE_URL + '/api/lottery/my/qr/' + recordId
		},
        refreshAfterDraw() {
            this.drawCount += 1
            if (this.drawCount >= this.maxDrawCount) {
                this.lotteryEnabled = false
            }
			getMyLottery(this.lotteryId, this.activityId).then(res => {
                if (res.code === 200) {
                    this.myRecord = res.data
                }
            })
            // 抽奖只更新次数和中奖记录，不再重新拉取奖品/图片，避免转盘闪一下重建。
        },
        back() {
            redirectToActivityWeek()
        },
    },

    onUnload() {
        if (this.timer) clearTimeout(this.timer);
    }
}
</script>

<style scoped>
.lottery-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: calc(100vh - 88px);
    padding-top: 44px;
    position: relative;
}
.my-lottery-info {
    position: absolute;
    top: 12rpx;
    right: 20rpx;
    display: flex;
    align-items: center;
    padding: 12rpx 20rpx 12rpx 16rpx;
    background: rgba(0, 0, 0, 0.55);
    border-radius: 999rpx;
    z-index: 5;
}
.entry-gift {
    font-size: 28rpx;
    margin-right: 10rpx;
}
.entry-copy {
    display: flex;
    flex-direction: column;
}
.entry-title {
    color: #ffffff;
    font-size: 24rpx;
    font-weight: 600;
    line-height: 1.2;
}
.entry-sub {
    color: rgba(255, 255, 255, 0.72);
    font-size: 19rpx;
    line-height: 1.3;
    margin-top: 2rpx;
}
.entry-arrow {
    color: rgba(255, 255, 255, 0.8);
    font-size: 30rpx;
    margin-left: 10rpx;
}
.record-mask {
    position: fixed;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: center;
}
.record-dialog {
    width: 640rpx;
    max-height: 72vh;
    background: #ffffff;
    border-radius: 24rpx;
    padding: 36rpx;
    box-sizing: border-box;
    overflow-y: auto;
}
.record-title {
    font-size: 34rpx;
    font-weight: 700;
    color: #1a2c4a;
    margin-bottom: 24rpx;
    text-align: center;
}
.record-line {
    background: #f5f7fa;
    border-radius: 16rpx;
    padding: 16rpx 18rpx;
    font-size: 26rpx;
    color: #34495e;
    margin-bottom: 12rpx;
    line-height: 1.5;
    display: flex;
    justify-content: space-around;
    align-items: center;
}
.record-main { flex: 1; }
.record-disabled { color: #909399; }
.record-qr-tip { color: #2f80ed; font-size: 20rpx; white-space: nowrap; margin-left: 12rpx; }
.record-status { color: #909399; font-size: 22rpx; white-space: nowrap; margin-left: 12rpx; }
.record-status.redeemed { color: #19be6b; font-weight: 600; }
.record-empty { text-align: center; color: #9cadc0; font-size: 24rpx; padding: 30rpx 0; }
.qr-dialog { width: 620rpx; background: #fff; border-radius: 24rpx; padding: 36rpx; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; gap: 18rpx; }
.qr-prize-title { font-size: 30rpx; font-weight: 700; color: #1a2c4a; text-align: center; }
.prize-qr { width: 460rpx; height: 460rpx; }
.redemption-code { font-size: 30rpx; color: #1a2c4a; font-weight: 700; letter-spacing: 2rpx; }
.record-count {
    flex: 1;
    text-align: center;
}
.record-prize,
.record-time {
    flex: 3;
    text-align: center;
}
.record-count {
    flex: 1;
    text-align: center;
}
.record-time {
    font-size: 24rpx;
    color: #909399;
    white-space: nowrap;
}
.record-close {
    margin-top: 20rpx;
    background: #007AFF;
    color: #ffffff;
    border-radius: 50rpx;
    font-size: 28rpx;
}

.loading-container,
.error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 400rpx;
}

.loading-text {
    font-size: 32rpx;
    color: #666;
}

.error-text {
    font-size: 28rpx;
    color: #ff4444;
    text-align: center;
    margin-bottom: 40rpx;
}

.retry-btn {
    background: #ff9800;
    color: #fff;
    border: none;
    border-radius: 40rpx;
    padding: 20rpx 40rpx;
    font-size: 28rpx;
}

.lottery-canvas {
    width: 300px;
    height: 300px;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 4rpx 24rpx #eee;
    margin-bottom: 40rpx;
}

/* 中奖记录打开期间用截图替代原生 canvas 作为背景，尺寸与位置保持一致 */
.wheel-snapshot {
    display: block;
}

.lottery-btn {
    width: 220rpx;
    background: #ff9800;
    color: #fff;
    border: none;
    border-radius: 40rpx;
    font-size: 32rpx;
}

.lottery-btn:disabled {
    background: #ccc;
}
</style>
