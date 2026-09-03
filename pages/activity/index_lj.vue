<template>
	<view class="container">
		<uni-nav-bar
		      dark
		      :fixed="true"
		      shadow
		      background-color="#007AFF"
		      status-bar
		      title="活动"
              :border="false"
		    />
		<view class="activity-progress-container" style="position:relative;">
            <view class="top-buttons">
                <!-- 添加签退按钮 -->
                <view v-if="activityModulesFinished && !isCheckOutFinished" class="sign-out-btn" @click="handleSignOut">
                    签退
                </view>
                <view v-if="isCheckOutFinished" class="record-btn" @click="showRecord">
                    参与记录
                </view>
                <view v-if="isCheckOutFinished" class="logout-btn" @click="handleLogout">
                    退出
                </view>
            </view>
		    <div class="activity-bg-img">
		        <svg :width="svgWidth" :height="svgHeight"
		             style="display:block;margin:0 auto;position:relative;z-index:2;">
		            <g v-for="(node, idx) in modules" :key="idx">
		                <circle
		                    :cx="getNodePos(idx).x"
		                    :cy="getNodePos(idx).y"
		                    r="22"
		                    :fill="node.finished ? '#4caf50' : '#fff'"
		                    stroke="#2196f3"
		                    stroke-width="3"
		                    style="cursor:pointer;"
		                />
		            </g>
		        </svg>
		        <view
		            v-for="(node, idx) in modules"
		            :key="'html-text-' + idx"
		            class="html-text"
		            @click="onCircleClick(node)"
		            :style="{
		                left: `${getNodePos(idx).x - 20}px`,
		                top: `${getNodePos(idx).y - 20}px`,
		                color: node.finished ? '#fff' : '#2196f3',
		                'font-size':`10px`
		            }"
		        >
		            {{ node.finished ? '✓' : '活动' + (idx + 1) }}
		        </view>
		        <view
		            v-for="(node, idx) in modules"
		            :key="'label'+idx"
		            class="node-label"
		            :style="getLabelStyle(idx)"
		        >{{ node.name }}
		        </view>
		    </div>
		    <!-- 添加参与记录弹窗 -->
		    <uni-popup ref="recordPopup" type="dialog">
		        <view class="record-popup">
		            <view class="popup-header">
		                <text class="popup-title">参与记录</text>
		                <view class="close-btn" @click="closeRecord">×</view>
		            </view>
		            <view class="record-content">
		                <view v-for="(item, index) in activityRecords" :key="index" class="record-item">
		                    <text class="record-name">{{ item.name }}</text>
		                    <text class="record-time">{{ item.finishedTime || '未完成' }}</text>
		                </view>
		            </view>
		        </view>
		    </uni-popup>
		</view>
	</view>
    
</template>

<script>
import { getActivityProgress } from '@/api/activity/activity'
import { anchorMap } from "@/api/activity/anchorMap";
import { signout,logout } from "../../api/checkin";

export default {
    data() {
        return {
            svgWidth: window.innerWidth,
            svgHeight: window.innerHeight,
            modules: [], // {name, finished, type}
            anchorList: [],
            isCheckOutFinished: false, // 添加check-out完成状态
            activityModulesFinished: false, //除签到、签退以外的其它活动完成状态
            activityRecords: [] // 存储活动记录
        }
    },
    methods: {
        getNodePos(idx) {
            const anchor = this.anchorList[idx];
            return {
                x: anchor.x * this.svgWidth,
                y: anchor.y * this.svgHeight
            }
        },
        getLabelStyle(idx) {
            const pos = this.getNodePos(idx);
            return {
                position: 'absolute',
                left: `${pos.x - 40}px`,
                top: `${pos.y + 30}px`,
                width: '80px',
                textAlign: 'center',
                color: '#fff',
                fontSize: '14px',
                zIndex: 2
            }
        },
        onCircleClick(node) {
            // 跳转到对应活动页，假设页面路径为/pages/{type}/index
            const type = node.type;
            console.log(node)
            if (node.finished) {
                uni.showToast({title: '已完成', icon: 'none'})
                return
            }
            let url = '';
            switch (type) {
                case 'check-in':
                    url = '/pages/checkin/index'
                    break;
                case 'check-out':
                    url = '/pages/signout/index'
                    break;
                case 'survey':
                    url = '/pages/wjdc/index'
                    break;
                case 'lottery':
                    url = '/pages/lottery/index'
                    break;
                case 'mind-window':
                    url = '/pages/xycc/index'
                    break;
            }
            uni.navigateTo({
                url: url
            });
        },
        // 添加签退处理方法
        handleSignOut() {
            uni.showModal({
                title: '确认签退',
                content: '确定要签退当前活动吗？',
                confirmText: '确认',
                cancelText: '取消',
                success: (res) => {
                    if (res.confirm) {
                        this.handleSignoutApi()
                    }
                }
            })
        },
        // 添加显示记录方法
        showRecord() {
            this.$refs.recordPopup.open()
        },

        // 添加关闭记录方法
        closeRecord() {
            this.$refs.recordPopup.close()
        },
        async handleSignoutApi() {
            const studentId = uni.getStorageSync('studentId')
            const activityId = uni.getStorageSync('activityId')
            console.log(studentId, activityId)
            try {
                const res = await signout({activityId})
                this.msg = res.msg || '签退成功'
                uni.showToast({title: res.msg || '签退成功', icon: 'success'});

                // 延迟跳转到首页
                setTimeout(() => {
                    uni.navigateTo({
                        url: '/pages/activity/index?activityId=' + uni.getStorageSync('activityId') + '&refresh=' + Date.now()
                    });
                }, 1500)
            } catch (err) {
                uni.showToast({title: err.message || '签退失败', icon: 'none'});
            }
        },
        handleLogout() {
            uni.showModal({
                title: '确认退出',
                content: '确定要退出当前活动吗？',
                confirmText: '确认',
                cancelText: '取消',
                success: (res) => {
                    if (res.confirm) {
                        logout();
                        // 执行退出逻辑，例如清除本地存储并返回首页
                        uni.removeStorageSync('token');
                        uni.redirectTo({
                            url: '/pages/checkin/index'
                        });
                    }
                }
            })
        }
    },
    onLoad(options) {
        const activityId = options.activityId
        const token = uni.getStorageSync('token')
        if (!activityId) {
            uni.showToast({title: '参数错误', icon: 'none'})
            return
        }
        uni.setStorageSync('activityId', activityId)
        getActivityProgress(activityId).then(res => {
            if (res.code !== 200 || !res.data) {
                uni.showToast({title: '活动信息获取失败', icon: 'none'})
                return
            }
            console.log("进度：",res.data);
            // 查找check-out类型的完成状态
            const checkOutModule = res.data.find(m => m.type === 'check-out');
            this.isCheckOutFinished = checkOutModule ? checkOutModule.finished : false;
            // 保存活动记录用于显示
            this.activityRecords = res.data.map(m => ({
                name: m.name,
                finishedTime: m.finishedTime
            }));
            const unwantedNames = ['check-in', 'check-out'];
            const activityModules = res.data
                    .filter(m => !unwantedNames.includes(m.type))
                    .map(m => ({
                        name: m.name,
                        finished: m.finished,
                        type: m.type
                    }));
            this.activityModulesFinished = activityModules.every(m => m.finished);
            console.log("状态：",this.activityModulesFinished);
            this.modules = activityModules
            // 根据节点数量选用锚点
            const n = activityModules.length;
            this.anchorList = anchorMap[n] || anchorMap[10]; // 超出范围默认10节点
        })
    }
}
</script>

<style scoped>
.activity-progress-container {
    width: 100vw;
    height: calc(100vh - 44px);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    background-image: url('https://zhiye.sxgkzh.cn/imgs/xcx/activity_backgroun.jpg');
    background-size: 100% 100%;
    background-position: center;
    background-repeat: no-repeat;
}

.activity-bg-img {
    position: absolute;
    left: 0;
    top: 0;
    width: 100vw;
    height: 100%;
    z-index: 1;
}

.node-label {
    pointer-events: none;
    user-select: none;
    color: #fff;
}

body {
    overscroll-behavior: none;
}

.html-text {
    position: absolute;
    text-align: center;
    z-index: 10;
    display: block;
    width: 80rpx;
    height: 80rpx;
    line-height: 80rpx;
    border-radius: 40px;
}
.top-buttons {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 100;
    display: flex;
    gap: 10px;
}
.record-btn, .logout-btn ,.sign-out-btn{
    background-color: #1aad19;
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.logout-btn {
    background-color: #e54d42; /* 红色背景表示退出操作 */
}
.sign-out-btn {
    background-color: #ff5500;
}
/* 参与记录弹窗样式 */
.record-popup {
    background: white;
    border-radius: 10px;
    width: 300px;
    max-height: 400px;
    overflow: hidden;
}

.popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    border-bottom: 1px solid #eee;
}

.popup-title {
    font-size: 18px;
    font-weight: bold;
    color: #333;
}

.close-btn {
    font-size: 24px;
    color: #999;
    cursor: pointer;
    padding: 5px;
}

.record-content {
    padding: 15px;
    max-height: 300px;
    overflow-y: auto;
}

.record-item {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #f5f5f5;
}

.record-name {
    color: #333;
}

.record-time {
    color: #999;
    font-size: 12px;
}
</style>