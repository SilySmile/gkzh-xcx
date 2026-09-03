<template>
	<view class="app-container">
		<uni-nav-bar
		      dark
		      :fixed="true"
		      shadow
		      background-color="#007AFF"
		      status-bar
		      title="活动签到登记"
		      :border="false"
		    />
		<view class="checkin-container">
		    <view v-if="loading" class="loading">加载中...</view>
		    <view v-else>
		        <view v-if="!signedIn">
		            <form @submit.prevent="onSubmit">
		                <view class="form-item">
		                    <text>姓名</text>
		                    <input v-model="form.name" placeholder="请输入姓名"/>
		                </view>
		                <view class="form-item">
		                    <text>学号</text>
		                    <input v-model="form.studentNo"
		                           placeholder="请输入学号"/>
		                </view>
		
		                <button @click="onSubmit">提交</button>
		            </form>
		            <view v-if="errorMsg" class="error">{{ errorMsg }}</view>
		        </view>
		        <view v-else>
		            <view class="success">已签到，正在跳转...</view>
		        </view>
		    </view>
		</view>
	</view>
    
</template>

<script>
import {
    getSchoolList,
    getDepartmentTreeBySchoolId,
    checkinStudent
} from '@/api/checkin'
import { getDicts } from '@/api/common'
import { redirectToActivityWeek } from '@/utils/activity'
export default {
    data() {
        return {
            loading: true,
            signedIn: false,
            errorMsg: '',
            activityId: '',
            schoolOptions: [],
            // mock 院系/专业树
            form: {
                studentNo: '',
                name: '',
            }
        }
    },
    onLoad(options) {
        this.activityId = options.activityId || uni.getStorageSync("activityId");
        if(!this.activityId){
            uni.showToast({title: '参数错误', icon: 'none'})
            return;
        }
        uni.setStorageSync("activityId", this.activityId);
        //根据活动ID获取活动信息
        // 获取学校列表
        getSchoolList(this.activityId).then(res => {
            if (res.code === 200) {
                this.schoolOptions = res.data || [];
				this.form.schoolId = this.schoolOptions[0].schoolId;
            } else {
                uni.showToast({title: res.msg, icon: 'none'});
            }
        }).catch((err) => {
            uni.showToast({title: err, icon: 'none'});
        });

        this.loading = false;
    },
    methods: {
        // 获取学校名称
        getSchoolName(id) {
            const s = this.schoolOptions.find(item => item.schoolId === id);
            return s ? s.title : '';
        },
       
        
        onSubmit() {
            console.log("submit")
            this.errorMsg = '';
            // 校验必填
			console.log(this.form)
            if (!this.form.name || !this.form.studentNo) {
                uni.showToast({title: '请完整填写所有信息', icon: 'none'});
                return;
            }
            // 提交签到信息
            const postData = {
                activityId: this.activityId,
                name: this.form.name,
                no: this.form.studentNo,
                schoolId: this.form.schoolId
            };
            checkinStudent(postData).then(res => {
                if (res.code === 200 && res.data && res.data.token) {
                    uni.setStorageSync('token', res.data.token);
                    uni.showLoading({title: '正在进入活动...'});
                    // 检查是否存在登录后需要跳转的特殊页面
                    const redirectUrl = uni.getStorageSync('loginRedirectUrl');
                    if (redirectUrl && redirectUrl.includes('/pages/wjdc/general')) {
                        // 清除重定向标记
                        uni.removeStorageSync('loginRedirectUrl');
                        // 跳转到指定页面
                        setTimeout(() => {
                            uni.redirectTo({url: redirectUrl});
                        }, 1000);
                    } else {
                        // 默认跳转到活动主页
                        setTimeout(() => {
                            redirectToActivityWeek()
                        }, 1000);
                    }
                } else {
                    uni.showToast({title: res.msg || '签到失败', icon: 'none'});
                }
            }).catch(err => {
                uni.showToast({title: err, icon: 'none'});
            });
        }
    }
}
</script>

<style scoped>
.checkin-container {
    padding: 40rpx;
}

.form-item {
    margin-bottom: 30rpx;
}

.picker-view {
    border: 1px solid #eee;
    border-radius: 8rpx;
    padding: 16rpx;
    margin-top: 8rpx;
    background: #fafbfc;
}

input {
    border: 1px solid #eee;
    border-radius: 8rpx;
    padding: 16rpx;
    margin-top: 8rpx;
}

button {
    width: 100%;
    background: #007aff;
    color: #fff;
    border: none;
    border-radius: 8rpx;
    padding: 20rpx 0;
    font-size: 32rpx;
}

.error {
    color: #e43;
    margin-top: 20rpx;
}

.success {
    color: #07c160;
    font-size: 36rpx;
    text-align: center;
    margin-top: 60rpx;
}

.loading {
    text-align: center;
    font-size: 32rpx;
    color: #888;
    margin-top: 100rpx;
}
.radio {
    margin-right: 30rpx;
    display: inline-flex;
    align-items: center;
}
.radio-group{
    //margin-top:10rpx;
}
</style> 
