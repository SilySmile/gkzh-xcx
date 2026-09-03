<template>
	<view class="app-container">
		<uni-nav-bar
		      dark
		      :fixed="true"
		      shadow
		      background-color="#007AFF"
		      status-bar
		      title="活动签到登记"
		      left-icon="left"
		      @clickLeft="back"
		      :border="false"
		    />
		<view class="checkin-container">
		    <view v-if="loading" class="loading">加载中...</view>
		    <view v-else>
		        <view v-if="!signedIn">
		            <form @submit.prevent="onSubmit">
		                <view class="form-item">
		                    <text>学校</text>
		                    <picker :range="schoolOptions" range-key="title"
		                            @change="onSchoolChange">
		                        <view class="picker-view">
		                            {{
		                                form.schoolId ? getSchoolName(form.schoolId) : '请选择学校'
		                            }}
		                        </view>
		                    </picker>
		                </view>
		                <view class="form-item" v-if="hasCollege">
		                    <text>院系</text>
		                    <picker :range="collegeOptions" range-key="title"
		                            @change="onCollegeChange">
		                        <view class="picker-view">
		                            {{
		                                form.collegeId ? getCollegeName(form.collegeId) : '请选择院系'
		                            }}
		                        </view>
		                    </picker>
		                </view>
		                <view class="form-item" v-if="majorOptions.length">
		                    <text>专业</text>
		                    <picker :range="majorOptions" range-key="title"
		                            @change="onMajorChange">
		                        <view class="picker-view">
		                            {{
		                                form.majorId ? getMajorName(form.majorId) : '请选择专业'
		                            }}
		                        </view>
		                    </picker>
		                </view>
		                <view class="form-item">
		                    <text>姓名</text>
		                    <input v-model="form.name" placeholder="请输入姓名"/>
		                </view>
		                <view class="form-item">
		                    <text>学号</text>
		                    <input v-model="form.studentId"
		                           placeholder="请输入学号"/>
		                </view>
		
		                 <view class="form-item">
		                  <text>年级</text>
                             <picker :range="gradeOptions" range-key="dictLabel" @change="onGradeChange">
                                 <view class="picker-view">
                                     {{ form.grade ? getGradeLabel(form.grade) : '请选择年级' }}
                                 </view>
                             </picker>
		                </view>
                        <view class="form-item">
		                    <text>性别</text>
                            <view class="radio-group">
                                <radio-group @change="radioChange">
                                    <label class="radio"><radio value="0" style="transform:scale(0.7)" />男</label>
                                    <label class="radio"><radio value="1" style="transform:scale(0.7)" />女</label>
                                </radio-group>
                            </view>
		                </view>
                        <view class="form-item">
                            <text>录取方式</text>
                            <picker :range="lqfsOptions" range-key="dictLabel" @change="onLqfsChange">
                                <view class="picker-view">
                                    {{ form.lqfs ? getLqfsLabel(form.lqfs) : '请选择录取方式' }}
                                </view>
                            </picker>
                        </view>
                        <view class="form-item">
                            <text>生源地</text>
                            <picker :range="sydOptions" range-key="dictLabel" @change="onSydChange">
                                <view class="picker-view">
                                    {{ form.syd ? getSydLabel(form.syd) : '请选择生源地' }}
                                </view>
                            </picker>
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
import { redirectToActivityWeek, completeActivityWeekGame } from '@/utils/activity'
export default {
    data() {
        return {
            loading: true,
            signedIn: false,
            errorMsg: '',
            activityId: '',
            gameId: null,
            schoolOptions: [],
            // mock 院系/专业树
            departmentTreeMap: {
                1: [
                    {
                        departmentId: 17,
                        title: '财经学院',
                        parentId: 0,
                        children: [
                            {
                                departmentId: 18,
                                title: '会计专业',
                                parentId: 17,
                                children: []
                            },
                            {
                                departmentId: 19,
                                title: '财务管理',
                                parentId: 17,
                                children: []
                            }
                        ]
                    },
                    {
                        departmentId: 20,
                        title: '土木工程',
                        parentId: 0,
                        children: []
                    }
                ],
                2: [
                    {
                        departmentId: 21,
                        title: '建筑学',
                        parentId: 0,
                        children: []
                    },
                    {
                        departmentId: 22,
                        title: '机械工程',
                        parentId: 0,
                        children: []
                    }
                ],
                3: []
            },
            hasCollege: false,
            collegeOptions: [],
            majorOptions: [],
            gradeOptions: [],
            lqfsOptions:[],
            sydOptions:[],
            form: {
                schoolId: '',
                collegeId: '',
                majorId: '',
                studentId: '',
                name: '',
                grade: '',
                lqfs: '',
                syd: '',
                gender: ''
            }
        }
    },
    onLoad(options) {
        this.activityId = options.activityId || uni.getStorageSync("activityId");
        this.gameId = options.gameId || null;
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
            } else {
                uni.showToast({title: res.msg, icon: 'none'});
            }
        }).catch((err) => {
            uni.showToast({title: err, icon: 'none'});
        });
        getDicts('grade_type').then(res => {
            this.gradeOptions = res;
        });
        getDicts('lqfs').then(res => {
            this.lqfsOptions = res;
        });
        getDicts('syd').then(res => {
            this.sydOptions = res;
        });

        this.loading = false;
    },
    methods: {
        back() {
            uni.navigateBack()
        },
        // 获取学校名称
        getSchoolName(id) {
            const s = this.schoolOptions.find(item => item.schoolId === id);
            return s ? s.title : '';
        },
        // 获取院系名称
        getCollegeName(id) {
            const c = this.collegeOptions.find(item => item.departmentId === id);
            return c ? c.title : '';
        },
        // 获取专业名称
        getMajorName(id) {
            const m = this.majorOptions.find(item => item.departmentId === id);
            return m ? m.title : '';
        },
        // 选择学校
        onSchoolChange(e) {
            const idx = e.detail.value;
            const school = this.schoolOptions[idx];
            this.form.schoolId = school.schoolId;
            this.form.collegeId = '';
            this.form.majorId = '';
            // 获取院系/专业树（真实接口）
            getDepartmentTreeBySchoolId(school.schoolId).then(res => {
                if (res.code === 200 && Array.isArray(res.data)) {
                    const tree = res.data;
                    // 判断是否有院系（有children的为学院，无children的为专业）
                    this.hasCollege = tree.some(item => item.children && item.children.length > 0);
                    if (this.hasCollege) {
                        this.collegeOptions = tree.filter(item => item.children && item.children.length > 0);
                        this.majorOptions = [];
                    } else {
                        this.collegeOptions = [];
                        this.majorOptions = tree;
                    }
                } else {
                    this.collegeOptions = [];
                    this.majorOptions = [];
                    this.hasCollege = false;
                    uni.showToast({title: '学院信息获取失败', icon: 'none'});
                }
            }).catch(() => {
                this.collegeOptions = [];
                this.majorOptions = [];
                this.hasCollege = false;
                uni.showToast({title: '学院信息获取失败', icon: 'none'});
            });
        },
        // 选择院系
        onCollegeChange(e) {
            const idx = e.detail.value;
            const college = this.collegeOptions[idx];
            this.form.collegeId = college.departmentId;
            this.form.majorId = '';
            this.majorOptions = college.children || [];
        },
        // 选择专业
        onMajorChange(e) {
            const idx = e.detail.value;
            this.form.majorId = this.majorOptions[idx].departmentId;
        },
        // 选择年级
        onGradeChange(e) {
            const idx = e.detail.value;
            this.form.grade = this.gradeOptions[idx].dictValue;
        },
        // 获取年级标签显示值
        getGradeLabel(value) {
            const grade = this.gradeOptions.find(item => item.dictValue === value);
            return grade ? grade.dictLabel : value;
        },
        // 选择录取方式
        onLqfsChange(e) {
            const idx = e.detail.value;
            this.form.lqfs = this.lqfsOptions[idx].dictValue;
        },
        // 选择生源地
        onSydChange(e) {
            const idx = e.detail.value;
            this.form.syd = this.sydOptions[idx].dictValue;
        },
        // 获取录取方式标签显示值
        getLqfsLabel(value) {
            const item = this.lqfsOptions.find(item => item.dictValue === value);
            return item ? item.dictLabel : value;
        },
        // 获取生源地标签显示值
        getSydLabel(value) {
            const item = this.sydOptions.find(item => item.dictValue === value);
            return item ? item.dictLabel : value;
        },
        radioChange(e) {
            this.form.gender = e.detail.value;
        },
        onSubmit() {
            console.log("submit")
            this.errorMsg = '';
            // 校验必填
            if (!this.form.schoolId || !this.form.collegeId || !this.form.majorId ||
                    !this.form.studentId || !this.form.name || !this.form.grade ||
                    !this.form.lqfs || !this.form.syd) {
                uni.showToast({title: '请完整填写所有信息', icon: 'none'});
                return;
            }
            // 提交签到信息
            const postData = {
                activityId: this.activityId,
                schoolId: this.form.schoolId,
                deptId: this.form.majorId,
                name: this.form.name,
                no: this.form.studentId,
                grade: this.form.grade,
                lqfs: this.form.lqfs,
                syd: this.form.syd,
                gender: this.form.gender
            };
            checkinStudent(postData).then(async res => {
                if (res.code === 200 && res.data && res.data.token) {
                    uni.setStorageSync('token', res.data.token);
                    await completeActivityWeekGame(this.gameId, { result: res.data }).catch(() => {});
                    uni.showLoading({title: '正在进入活动...'});
                    // 可在此处跳转到活动主流程页
                    setTimeout(() => {
                        redirectToActivityWeek()
                    }, 1000);
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
