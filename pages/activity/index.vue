<template>
	<view class="container">
		<uni-nav-bar
		      dark
		      :fixed="true"
		      shadow
		      background-color="#007AFF"
		      status-bar
		      title="活动列表"
              :border="false"
		    />
		<view class="activity-progress-container">
            <view class="top-buttons">
                <!-- 添加签退按钮 -->
                <view v-if="activityModulesFinished" class="record-btn" @click="showRecord">
                    参与记录
                </view>


                <view v-if="activityModulesFinished" class="logout-btn" @click="handleLogout">
                    退出
                </view>
            </view>

            <!-- 修改为网格布局 -->
            <view class="activity-grid">
                <view
                    v-for="(node, idx) in modules"
                    :key="idx"
                    class="activity-card"
                    @click="onCardClick(node)"
                >
                    <view class="card-content">
                        <!-- 添加已完成标记 -->
                        <view v-if="node.status == 1" class="completed-badge">✓</view>
                        <view v-if="node.status == 2" class="uncomplete-badge">×</view>
                        <text class="card-name">{{ node.name }}</text>
                    </view>
                </view>
				
            </view>

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
import { signout,logout } from "../../api/checkin";

export default {
    data() {
        return {
            activityId:'',
            modules: [], // {name, finished, type}
            isCheckOutFinished: false, // 添加check-out完成状态
            activityModulesFinished: false, //除签到、签退以外的其它活动完成状态
            activityRecords: [] // 存储活动记录
        }
    },
    methods: {
        onCardClick(node) {
             if (node.status === 1) {
                    uni.showToast({ title: '已完成', icon: 'none' })
                } else {
                    uni.showToast({ title: '请扫描关卡二维码进入', icon: 'none' })
                }
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

                        // 执行退出逻辑，例如清除本地存储并返回首页

                        logout();
                        uni.removeStorageSync('token');
                        uni.redirectTo({
                            url: '/pages/checkin/index?activityId=' + this.activityId
                        });
                    }
                }
            })
        }
    },
    onLoad(options) {
		console.log("options",options);
        this.activityId = options.activityId
        if (!this.activityId) {
            uni.showToast({title: '参数错误', icon: 'none'})
            return
        }
        uni.setStorageSync('activityId', this.activityId)
        getActivityProgress(this.activityId).then(res => {
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
                        name: m.title,
                        finished: m.finished,
                        type: m.type,
                        status: m.status
                    }));
            this.activityModulesFinished = activityModules.every(m => m.finished);
            console.log("状态：",this.activityModulesFinished);
            this.modules = activityModules
        })
    }
}
</script>

<style scoped>
.activity-progress-container {
    width: 100vw;
    min-height: calc(100vh - 44px);
    position: relative;
    background-size: 100% 100%;
    background-position: center;
    background-repeat: no-repeat;
    padding: 20px;
    box-sizing: border-box;
}

.top-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-bottom: 20px;
}

.record-btn, .logout-btn, .sign-out-btn {
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

/* 网格布局样式 */
.activity-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    padding: 10px;
}

.activity-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 15px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}



.card-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200rpx;
    position: relative;
    padding: 15px;
}

.card-icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(45deg, #ffffff, #f0f0f0);
    border: 3px solid #ffffff;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
    color: #667eea;
    margin-bottom: 15px;
    transition: all 0.3s ease;
}

.card-icon.finished {
    background: linear-gradient(45deg, #4caf50, #81c784);
    border-color: #4caf50;
    color: #ffffff;
    box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
}

.completed-badge ,.uncomplete-badge{
    position: absolute;
    top: 10px;
    right: 10px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(45deg, #4caf50, #2e7d32);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.4);
    z-index: 2;
}
.uncomplete-badge{
    background: linear-gradient(45deg, #f44336, #d32f2f);
}

.card-name {
    font-size: 18px;
    color: #ffffff;
    font-weight: 600;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    margin-top: 10px;
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
