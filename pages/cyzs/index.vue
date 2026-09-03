<template>
    <view class="container">
        <uni-nav-bar
                dark
                :fixed="true"
                shadow
                background-color="#007AFF"
                status-bar
                title="创业知识答答答"
                left-icon="left"
                @clickLeft="back"
                :border="false"
        />
        <view class="wjyd-container">
            <view v-if="loading" class="loading">加载中...</view>
            <view v-else>
                <!-- 显示当前题目 -->
                <view v-if="questions.length > 0 && currentQuestionIndex < questions.length">
                    <view class="question-block">
                        <view class="question-title">
                            <text class="question-type" v-if="questionType && currentQuestion.type">
                                （{{ questionType[currentQuestion.type] || '' }}）
                            </text>
                           {{ currentQuestion.questionText }}
                        </view>
                        <!-- 替换原来的单选题部分 -->
                        <view v-if="currentQuestion.type === '1'">
                            <radio-group
                                :key="currentQuestion.id"
                                :value="answers[currentQuestion.id] || ''"
                                @change="onRadioChange(currentQuestion.id, $event)"
                            >
                                <label class="option-label" v-if="currentQuestion.optionA">
                                    <radio value="A"/>
                                    A. {{ currentQuestion.optionA }}
                                </label>
                                <label class="option-label" v-if="currentQuestion.optionB">
                                    <radio value="B"/>
                                    B. {{ currentQuestion.optionB }}
                                </label>
                                <label class="option-label" v-if="currentQuestion.optionC">
                                    <radio value="C"/>
                                    C. {{ currentQuestion.optionC }}
                                </label>
                                <label class="option-label" v-if="currentQuestion.optionD">
                                    <radio value="D"/>
                                    D. {{ currentQuestion.optionD }}
                                </label>
                            </radio-group>
                        </view>

                        <view v-else-if="currentQuestion.type === '2'">
                            <checkbox-group
                                :key="currentQuestion.id"
                                :value="multiSelectAnswers[currentQuestion.id] || []"
                                @change="onCheckboxChange(currentQuestion.id, $event)"
                            >
                                <label class="option-label" v-if="currentQuestion.optionA">
                                    <checkbox value="A"/>
                                    A. {{ currentQuestion.optionA }}
                                </label>
                                <label class="option-label" v-if="currentQuestion.optionB">
                                    <checkbox value="B"/>
                                    B. {{ currentQuestion.optionB }}
                                </label>
                                <label class="option-label" v-if="currentQuestion.optionC">
                                    <checkbox value="C"/>
                                    C. {{ currentQuestion.optionC }}
                                </label>
                                <label class="option-label" v-if="currentQuestion.optionD">
                                    <checkbox value="D"/>
                                    D. {{ currentQuestion.optionD }}
                                </label>
                            </checkbox-group>
                        </view>


                        <view class="navigation-buttons">
                            <button
                                    v-if="currentQuestionIndex < questions.length - 1"
                                    class="nav-btn next-btn"
                                    @click="goToNextQuestion"
                                    :disabled="!isCurrentQuestionAnswered"
                            >
                                {{
                                    isCurrentQuestionAnswered ? '下一题' : '请先答题'
                                }}
                            </button>
                            <button
                                    v-if="currentQuestionIndex === questions.length - 1"
                                    class="submit-btn"
                                    @click="handleSubmit"
                                    :disabled="!isCurrentQuestionAnswered"
                            >
                                {{
                                    isCurrentQuestionAnswered ? '提交' : '请先答题'
                                }}
                            </button>
                        </view>
                    </view>
                </view>
                <!-- 题目完成提示 -->
                <view v-else-if="questions.length > 0 && currentQuestionIndex >= questions.length">
                    <view class="completion-message">
                        所有题目已完成，请提交答案
                    </view>
                    <button
                            class="submit-btn"
                            @click="handleSubmit"
                            :disabled="isSubmitting"
                            :loading="isSubmitting"
                    >
                        {{ isSubmitting ? '提交中...' : '提交' }}
                    </button>
                </view>
            </view>
        </view>
    </view>
</template>


<script>
import {getQuestions, submitAnswers} from '@/api/cyzs.js'
import config from "../../config/api";
import {getActivityProgress} from '@/api/activity/activity'
import { getDicts } from '@/api/common'
import { getActivityWeekUrl, redirectToActivityWeek, completeActivityWeekGame } from '@/utils/activity'
export default {
    data() {
        return {
            loading: true,
            survey: {
                title: '1111',
            },
            questions: [],
            questionType:{},
            answers: {}, // {question_id: value}
            multiSelectAnswers: {},
            activityId: null,
            gameId: null,
            currentQuestionIndex: 0, // 当前题目索引
            isSubmitting: false, // 添加提交状态控制
        }
    },
    computed: {
        // 计算当前题目
        currentQuestion() {
            return this.questions[this.currentQuestionIndex] || {}
        },
        isCurrentQuestionAnswered() {
            const currentQId = this.currentQuestion.id;
            if (!currentQId) return false;

            // 多选题检查
            if (this.currentQuestion.type === '2') {
                return this.multiSelectAnswers[currentQId] &&
                        this.multiSelectAnswers[currentQId].length > 0;
            }

            // 单选题检查
            return this.answers[currentQId] && this.answers[currentQId].length > 0;
        },
    },
    onLoad(options) {
        this.activityId = options.activityId || uni.getStorageSync("activityId");
        this.gameId = options.gameId || null;
        if (!this.activityId) {
            uni.showToast({title: '参数错误', icon: 'none'})
            return;
        }
        //根据活动ID获取问卷详情
        console.log("活动ID：", this.activityId)
        uni.setStorageSync('activityId', this.activityId)
        getActivityProgress(this.activityId).then(res => {
            if (res.code !== 200 || !res.data) {
                uni.showToast({title: '活动信息获取失败', icon: 'none'})
                return
            }
            const wantedNames = ['cyzs'];
            console.log(res.data)

            const finished = res.data
                    .filter(m => wantedNames.includes(m.type))
                    .map(m => m.finished)[0];
            const url = getActivityWeekUrl();
            if (finished) {
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
        })
        this.getQuestionType();
        this.fetchQuestions();
    },
    methods: {
        getQuestionType() {
            getDicts('cyzs_question_type').then(res => {

                    res.forEach(item => {
                        this.questionType[item.dictValue] = item.dictLabel;
                    })
            });
        },
        fetchQuestions() {
            this.loading = true;
            getQuestions().then(res => {
                if (res.code === 200) {
                    this.questions = res.data || [];
                    this.loading = false;
                }else{
                    uni.showToast({title: res.msg, icon: 'none'});
                }
            }).catch(() => {
                this.loading = false;
                uni.showToast({title: '加载失败', icon: 'none'});
            });
        },
        // 滚动到页面顶部
        scrollToTop() {
            // 使用 uni.pageScrollTo 滚动到顶部
            uni.pageScrollTo({
                scrollTop: 0,
                duration: 300 // 滚动动画持续时间，单位毫秒
            });
        },

        // 如果需要，也可以在上一题方法中添加（虽然当前需求不需要上一题按钮）
        goToPrevQuestion() {
            if (this.currentQuestionIndex > 0) {
                this.currentQuestionIndex--;
                this.scrollToTop();
            }
        },
        // 下一题
        goToNextQuestion() {
            if (this.currentQuestionIndex < this.questions.length - 1) {
                this.currentQuestionIndex++;
                this.scrollToTop();
            }
        },
        handleSubmit() {
            // 防止重复提交
            if (this.isSubmitting) {
                return;
            }

            // 校验必填 - 修改为同时支持单选题和多选题
            for (let q of this.questions) {
                let isAnswered = false;

                if (q.type === '2') {
                    // 多选题检查
                    isAnswered = this.multiSelectAnswers[q.id] &&
                                 this.multiSelectAnswers[q.id].length > 0;
                } else {
                    // 单选题检查
                    isAnswered = this.answers[q.id] &&
                                 this.answers[q.id].length > 0;
                }

                if (!isAnswered) {
                    // 找到未答题目的索引并跳转
                    const unansweredIndex = this.questions.findIndex(question => {
                        if (question.type === '2') {
                            // 多选题检查
                            return !this.multiSelectAnswers[question.id] ||
                                   this.multiSelectAnswers[question.id].length === 0;
                        } else {
                            // 单选题检查
                            return !this.answers[question.id] ||
                                   this.answers[question.id].length === 0;
                        }
                    });

                    if (unansweredIndex !== -1) {
                        this.currentQuestionIndex = unansweredIndex;
                        uni.showToast({
                            title: `第${unansweredIndex + 1}题未作答`,
                            icon: 'none'
                        });
                        return;
                    }
                }
            }

            // 组装提交数据
            const answerArr = this.questions.map(q => {
                let userAnswer = '';
                if (q.type === '2') {  // 多选题
                    // 多选题答案用逗号连接
                    userAnswer = (this.multiSelectAnswers[q.id] || []).join(',');
                } else {  // 单选题
                    // 单选题答案
                    userAnswer = this.answers[q.id] || '';
                }
                return {
                    questionId: q.id,
                    userAnswer: userAnswer
                };
            });

            // 设置提交状态
            this.isSubmitting = true;

            submitAnswers(this.activityId, {
                answers: answerArr
            }).then(async res => {
                if (res.code === 200) {
                    await completeActivityWeekGame(this.gameId, { score: res.data && res.data.correctCount, result: res.data }).catch(() => {})
                    uni.showModal({
                        title: '提交结果',
                        content: res.data.message,
                        showCancel: false,
                        confirmText: '确定',
                        success: () => {
                            // 跳转到奖品详情页
                            this.back();
                        }
                    });
                } else {
                    // 设置提交状态
                    this.isSubmitting = false;
                    uni.showToast({title: res.msg || '提交失败', icon: 'none'});
                }
            }).catch(err => {
                // 提交失败，设置提交状态
                this.isSubmitting = false;
                uni.showToast({title: err.message || '提交异常', icon: 'none'});
            });
        },

        onRadioChange(qid, e) {
            const value = e.detail.value || '';
            this.$set(this.answers, qid, value);
        },
        onCheckboxChange(qid, e) {
            const values = e.detail.value || [];
            this.$set(this.multiSelectAnswers, qid, values);
        },

        back() {
            redirectToActivityWeek()
        },
    }
}
</script>


<style scoped>
.container {
    margin-bottom: 20px;
}

.wjyd-container {
    padding: 30rpx;
}

.progress-bar {
    text-align: center;
    font-size: 28rpx;
    color: #666;
    margin-bottom: 20rpx;
}

.survey-title {
    font-size: 36rpx;
    font-weight: bold;
    margin-bottom: 18rpx;
    color: #222;
}

.survey-desc {
    font-size: 28rpx;
    color: #666;
    margin-bottom: 30rpx;
}

.image-container {
    text-align: center;
    margin: 20rpx 0;
    width: 100%;
}

.question-block {
    margin-bottom: 38rpx;
    padding: 24rpx 18rpx 18rpx 18rpx;
    border-radius: 12rpx;
    background-color: #f8f8f8;
    overflow: hidden; /* 防止图片溢出 */
}

.question-title {
    font-size: 30rpx;
    font-weight: bold;
    margin-bottom: 18rpx;
    color: #333;
}

.required {
    color: #e43;
    margin-left: 8rpx;
}

.option-label {
    display: flex;
    align-items: center;
    font-size: 28rpx;
    margin-bottom: 12rpx;
    padding: 10rpx;
    border-radius: 8rpx;
}

.option-label:hover {
    background-color: #e6f2ff;
}

.input-blank {
    border: 1px solid #eee;
    border-radius: 8rpx;
    padding: 16rpx;
    font-size: 28rpx;
    margin-top: 8rpx;
}

.navigation-buttons {
    display: flex;
    justify-content: center;
    margin-top: 40rpx;
}

.nav-btn {
    width: 60%;
    border: none;
    border-radius: 8rpx;
    font-size: 32rpx;
}

.next-btn {
    background: #007aff;
    color: #fff;
}

.next-btn[disabled] {
    background: #cccccc;
    color: #666666;
}

.submit-btn {
    width: 60%;
    background: #007aff;
    color: #fff;
    border: none;
    border-radius: 8rpx;
    font-size: 32rpx;
    margin-top: 30rpx;
}

.submit-btn[disabled] {
    background: #cccccc;
    color: #666666;
}

.completion-message {
    text-align: center;
    font-size: 32rpx;
    color: #666;
    margin: 50rpx 0;
}

.loading {
    text-align: center;
    font-size: 32rpx;
    color: #888;
    margin-top: 100rpx;
}

.option-img {
    max-width: 100%;
    width: 100%;
    height: auto;
    margin: 20rpx 0;
    display: block;
    border-radius: 8rpx;
    box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
}
</style>

