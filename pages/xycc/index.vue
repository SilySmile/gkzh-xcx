<template>
    <view>
        <uni-nav-bar
            dark
            :fixed="true"
            shadow
			
			color="#000"

            background-color="#FFF"
            status-bar
            title="心愿橱窗"
            left-icon="left"
            @clickLeft="back"
            :border="false"
        />

        <view class="rule-button" @click="showRules">
            <text class="rule-button-text">?</text>
        </view>

        <!-- 首次进入必须通过右上角叉号关闭规则，避免点遮罩跳过倒计时启动。 -->
        <uni-popup ref="rulesPopup" type="center" :is-mask-click="false">
            <view class="rules-popup">
                <!-- 规则统一使用设计稿图片，避免文字版与实际玩法说明不一致。 -->
                <image class="rules-image" src="https://zhiye.sxgkzh.cn/imgs/xycc/bg/guize.png" mode="widthFix" />
				<!-- <view class="rules-image"></view> -->
                <!-- 关闭按钮覆盖在规则图右上角，避免额外占用图片下方空间。 -->
                <view class="rules-close" @click="closeRules">×</view>
            </view>
        </uni-popup>
        <view class="pattern-container">
            <view class="countdown">剩余时间：{{ countdown }} 秒</view>
            <view class="option-area">
                <view v-for="(row, rowIdx) in optionRows" :key="rowIdx" class="option-row">
                    <view
                        v-for="item in row"
                        :key="item.pattern_id"
                        :class="{selected: isSelected(item)}"
                        class="option-item"
                        @click="selectOption(item)"
                    >
                        <image :src="item.img_url" class="option-img" mode="aspectFit"/>
                        <view class="option-desc">{{ item.description }}</view>
                    </view>
                </view>
            </view>
            <view class="selected-area">
                <view class="selected-title">已选（最多3项）：</view>
                <view class="selected-list-box">
                    <view v-for="(slot, index) in slotItems" :key="index" class="selected-box">
                        <view v-if="slot" class="selected-item">
                            <image :src="slot.img_url" class="selected-img" mode="aspectFit"/>
                            <view class="selected-desc">{{ slot.description }}</view>
                            <view class="delete-btn" @click="removeSelected(index)">×</view>
                        </view>
                        <view v-else class="empty-slot">待选择</view>
                    </view>
                </view>
            </view>
            <button
                    class="submit-btn"
                    @click="onSubmit"
                    :disabled="isSubmitting"
                    :loading="isSubmitting"
            >
                {{ isSubmitting ? '提交中...' : '提交' }}
            </button>
        </view>
    </view>

</template>

<script>
import {getXyccOptions, submitXyccSelected} from '../../api/xycc.js';
import config from '../../config/api.js';
import { getWeekFlow, completeWeekGame } from '@/api/activity/week'
import { getActivityWeekUrl, redirectToActivityWeek } from '@/utils/activity'
export default {
    data() {
        return {
            options: [], // 接口数据
            selectedOptions: [],
            activityId: null,
            gameId: null,
            isSubmitting: false, // 添加提交状态控制
            countdown: 60,
            timer: null,
            timeUp: false,

            // 规则弹窗关闭后才允许开始或恢复倒计时。
            gameReady: false
        };
    },
    computed: {
        slotItems() {
            return [0, 1, 2].map(i => this.selectedOptions[i] || null)
        },
        optionRows() {
            const sorted = [...this.options].sort((a, b) => {
                const rowDiff = (a.rowIndex || 0) - (b.rowIndex || 0)
                if (rowDiff !== 0) return rowDiff
                return (a.colIndex || 0) - (b.colIndex || 0)
            })
            // 按row_index分组
            const rows = [];
            sorted.forEach(item => {
                if (!rows[item.rowIndex]) rows[item.rowIndex] = [];
                let img_url = item.imgUrl;
                // 如果是本地静态资源，直接使用
                if (img_url && img_url.startsWith('/static/')) {
                    // keep as is
                } else if (img_url && !/^https?:\/\//.test(img_url)) {
                    img_url = config.BASE_URL + img_url;
                }
                rows[item.rowIndex].push({
                    ...item,
                    pattern_id: item.patternId,
                    row_index: item.rowIndex,
                    col_index: item.colIndex,
                    row_code: item.rowCode,
                    description: item.description,
                    img_url
                });
            });
            return rows;
        }
    },
    methods: {
        startTimer() {
            if (this.timer) {
                clearInterval(this.timer);
            }
            // 倒计时从当前剩余秒数继续，避免再次查看规则时重置时间。
            this.timer = setInterval(() => {
                this.countdown -= 1;
                if (this.countdown <= 0) {
                    clearInterval(this.timer);
                    this.timer = null;
                    if (this.selectedOptions.length === 3 && !this.isSubmitting) {
                        this.onSubmit();
                    } else if (!this.isSubmitting) {
                        this.timeUp = true;
                        uni.showToast({ title: '时间到', icon: 'none' });
                        setTimeout(() => {
                            redirectToActivityWeek()
                        }, 500)
                    }
                }
            }, 1000);
        },
        isSelected(item) {
            return this.selectedOptions.some(sel => sel.pattern_id === item.pattern_id);
        },
        selectOption(item) {
            if (this.timeUp) {
                return
            }
            // 每行只能选一个
            const rowSelected = this.selectedOptions.find(sel => sel.row_index === item.row_index);
            if (rowSelected) {
                const idx = this.selectedOptions.findIndex(sel => sel.row_index === item.row_index);
                this.selectedOptions.splice(idx, 1, {
                    ...item,
                    x: idx * 130,
                    y: 0,
                    originX: idx * 130,
                    originY: 0
                });
            } else {
                if (this.selectedOptions.length >= 3) {
                    uni.showToast({title: '最多只能选3项', icon: 'none'});
                    return;
                }
                const idx = this.selectedOptions.length;
                this.selectedOptions.push({
                    ...item,
                    x: idx * 130,
                    y: 0,
                    originX: idx * 130,
                    originY: 0
                });
            }
        },
        removeSelected(idx) {
            this.selectedOptions.splice(idx, 1);
        },
        onSubmit() {
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
            // 防止重复提交
            if (this.isSubmitting) {
                return;
            }
            if (this.selectedOptions.length < 3) {
                uni.showToast({title: '请选满3项', icon: 'none'});
                return;
            }
            // 设置提交状态
            this.isSubmitting = true;
            const codeGroup = this.selectedOptions.map(item => item.row_code).join('');
            const patternIds = this.selectedOptions.map(item => item.pattern_id).join(',');
            const activityId = this.activityId;
            submitXyccSelected({activityId, gameId: this.gameId, codeGroup, patternIds}).then(() => {
                const completeTask = this.gameId
                    ? completeWeekGame(this.gameId, {}, this.activityId).catch(() => {})
                    : Promise.resolve()
                completeTask.then(() => {
                    uni.redirectTo({
                        url: `/pages/xycc/result?activityId=${activityId}`
                    });
                })
            }).catch(err => {
                // 处理提交失败情况，允许重新提交
                this.isSubmitting = false;
                uni.showToast({title: '提交失败，请重试', icon: 'none'})
            });
        },
        fetchOptions() {
            getXyccOptions(this.activityId).then(res => {
                this.options = res.data || [];
                this.gameReady = true;
                // 选项加载完成后先展示规则；关闭规则时才启动倒计时。
                this.$nextTick(() => this.showRules());
            });
        },
        back() {
            redirectToActivityWeek()
        },
        showRules() {
            // 打开规则时暂停，用户阅读规则不会消耗游戏时间。
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
            this.$refs.rulesPopup.open()
        },

        closeRules() {
            this.$refs.rulesPopup.close()
            // 首次关闭规则开始倒计时；游戏中再次查看规则则从剩余时间恢复。
            if (this.gameReady && !this.timeUp && !this.isSubmitting) {
                this.startTimer();
            }
        },

        getReturnUrl() {
            const bizType = uni.getStorageSync('weekBizType')
            if (bizType) {
                return '/pages/mp/sub-pages/career-week/index?bizType=' + bizType
            }
            return getActivityWeekUrl()
        },
    },
    onUnload() {
        if (this.timer) {
            clearInterval(this.timer)
            this.timer = null
        }
    },
    onLoad(options) {
        this.selectedOptions = []
        this.timeUp = false
        this.countdown = 60
        this.activityId = options.activityId || uni.getStorageSync("activityId");
        this.gameId = options.gameId || null;
        if(!this.activityId){
            uni.showToast({title: '参数错误', icon: 'none'})
            return;
        }
		console.log("活动ID：", this.activityId)
		uni.setStorageSync('activityId', this.activityId)
        // 按当前活动周中的 gameId 判断完成状态，避免生涯活动完成记录拦截就业活动。
        getWeekFlow(this.activityId).then(res => {
            if (res.code !== 200 || !res.data) {
                uni.showToast({title: '活动信息获取失败', icon: 'none'})
                return
            }
            let currentGame = null;
            (res.data.areas || []).forEach(area => {
                const game = (area.games || []).find(item => String(item.gameId) === String(this.gameId));
                if (game) currentGame = game;
            });
            if (!currentGame || currentGame.gameType !== 'mind-window') {
                uni.showToast({title: '心愿橱窗不属于当前活动', icon: 'none'});
                return;
            }
            const finished = !!currentGame.isFinish;
            const url = getActivityWeekUrl();
            if( finished ){
                uni.showModal({
                    title: '提示',
                    content: '您已参加过本关卡，请勿重复参加',
                    showCancel: false,
                    confirmText: '确定',
                    success: function (res) {
                        if (res.confirm) {
                            redirectToActivityWeek()
                        }
                    }
                });
                return;
            }
            this.fetchOptions();
        })
    }
};
</script>

<style scoped>
.pattern-container {
	margin-top: 36rpx;
    padding: 20rpx;
}

.rule-button {
    position: fixed;
    top: calc(var(--status-bar-height) + 145rpx);
    right: 24rpx;
    z-index: 1001;
    width: 50rpx;
    height: 50rpx;
    box-sizing: border-box;
    border: 3rpx solid #000;
    border-radius: 50%;
    background: transparent;
    box-shadow: 0 6rpx 18rpx rgba(22, 119, 255, .28);
    color: #fff;
    font-size: 32rpx;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
}

.rule-button-text {
    color: #000;
    font-size: 26rpx;
    font-weight: 700;
    line-height: 1;
}

.rules-popup {
    position: relative;
    width: 650rpx;
    box-sizing: border-box;
    padding: 0;
    border-radius: 24rpx;
    /* background: #fff; */
    overflow: hidden;
}

.rules-image {
    display: block;
    width: 100%;
    max-height: 900rpx;
}

.rules-title {
    color: #1c3f72;
    font-size: 36rpx;
    font-weight: 700;
    text-align: center;
}

.rules-content {
    margin-top: 28rpx;
    color: #49637f;
    font-size: 28rpx;
    line-height: 1.85;
    text-align: justify;
}

.rules-close {
    position: absolute;
    top: 16rpx;
    right: 16rpx;
    width: 56rpx;
    height: 56rpx;
    line-height: 50rpx;
    border-radius: 50%;
    color: #fff;
    background: rgba(0, 0, 0, .55);
    font-size: 44rpx;
    font-weight: 700;
    text-align: center;
    z-index: 2;
}

.countdown {
    text-align: center;
    font-size: 28rpx;
    color: #f56c6c;
    margin-bottom: 20rpx;
}

.option-area {
    margin-bottom: 40rpx;
}

.option-row {
    display: flex;
    flex-direction: row;
    margin-bottom: 20rpx;
}

.option-item {
    flex: 1;
    display: flex; /* 添加 */
    flex-direction: column; /* 添加 */
    align-items: center;
    justify-content: center;
    padding: 10rpx;
    border: 2rpx solid #eee;
    border-radius: 12rpx;
    margin-right: 10rpx;
    background: #fff;
    transition: border 0.2s;
}

.option-item.selected {
    border: 2rpx solid #007aff;
    background: #e6f7ff;
}

.option-img {
    width: 60rpx;
    height: 60rpx;
}

.option-desc {
    font-size: 16rpx;
    text-align: center;
    margin-top: 8rpx;
}

.selected-area {
    margin-top: 40rpx;
}

.selected-title {
    font-size: 28rpx;
    margin-bottom: 10rpx;
}

.selected-list {
    display: flex;
    flex-direction: row;
    align-items: center;
}

.selected-list-box {
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-around;
}

.selected-box {
    width: 120rpx;
    height: 120rpx;
    background: #fff;
    border: 2rpx solid #eee;
    border-radius: 12rpx;
    margin-right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
}

.selected-item {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
}

.selected-img {
    width: 60rpx;
    height: 60rpx;
}

.selected-desc {
    font-size: 22rpx;
    text-align: center;
    margin-top: 6rpx;
}

.empty-slot {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #b0b8c4;
    font-size: 24rpx;
}

.delete-btn {
    position: absolute;
    top: 4rpx;
    right: 8rpx;
    width: 32rpx;
    height: 32rpx;
    line-height: 32rpx;
    text-align: center;
    background: #e43;
    color: #fff;
    border-radius: 50%;
    font-size: 28rpx;
    z-index: 2;
    cursor: pointer;
}

.submit-btn {
    width: 100%;
    margin-top: 40rpx;
    background: #fff;
    color: #000;
    border: none;
    border-radius: 8rpx;
    padding: 12rpx 0;
    font-size: 32rpx;
}
</style> 
