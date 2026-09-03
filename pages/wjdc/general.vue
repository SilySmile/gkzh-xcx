<template>
    <view class="container">
        <uni-nav-bar
            dark
            :fixed="true"
            shadow
            background-color="#007AFF"
            status-bar
            title="问卷调查"
            left-icon="left"
            @clickLeft="back"
            :border="false"
        />
        <view class="survey-container">
            <view v-if="loading" class="loading">加载中...</view>
            <view v-else>
                <view class="survey-title">{{ survey.title }}</view>
                <view class="survey-desc" v-if="survey.description">
                    {{ survey.description }}
                </view>
                <view>
                    <view v-for="(q, idx) in questions" :key="q.id"
                          class="question-block">
                        <view class="question-title">
                            {{ idx + 1 }}. {{ q.questionTitle }}
                            <text v-if="q.questionType === '4'" class="question-type-tag">(打分)</text>
                            <text v-if="q.required === '1'" class="required">*</text>

                        </view>

                        <!-- 单选题 -->
                        <view v-if="q.questionType === '1'">
                            <radio-group :value="answers[q.id]"
                                         @change="onRadioChange(q.id, $event)">
                                <label v-for="opt in q.options" :key="opt.id"
                                       class="option-label">
                                    <radio :value="String(opt.id)"/>
                                    {{ opt.optionText }}
                                </label>
                            </radio-group>
                        </view>
                        <!-- 多选题 -->
                        <view v-else-if="q.questionType === '2'">
                            <checkbox-group :value="answers[q.id]"
                                            @change="onCheckboxChange(q.id, $event)">
                                <label v-for="opt in q.options" :key="opt.id"
                                       class="option-label">
                                    <checkbox :value="String(opt.id)"/>
                                    {{ opt.optionText }}
                                </label>
                            </checkbox-group>
                        </view>
                        <!-- 填空题 -->
                        <view v-else-if="q.questionType === '3'">
                            <input v-model="answers[q.id]" class="input-blank"
                                   placeholder="请输入答案"/>
                        </view>
                        <!-- 打分题 -->
                        <view v-else-if="q.questionType === '4'">
                            <input
                                    type="number"
                                    v-model.number="answers[q.id]"
                                    :min="getScoreRange(q.scoreRange)[0]"
                                    :max="getScoreRange(q.scoreRange)[getScoreRange(q.scoreRange).length - 1]"
                                    @blur="validateScore(q.id, q.scoreRange)"
                                    class="score-input"
                                    placeholder="请输入分数"
                            />
                            <view class="score-range-tip">
                                有效分数范围: {{ getScoreRange(q.scoreRange)[0] }} - {{ getScoreRange(q.scoreRange)[getScoreRange(q.scoreRange).length - 1] }}
                            </view>
                        </view>
                        <!-- 选项打分题 -->
                        <view v-else-if="q.questionType === '5'">
                            <view class="option-group">
                                <view v-for="opt in q.options" :key="opt.id" class="option-item">
                                    <text class="option-text">{{ opt.optionText }}</text>
                                    <input
                                        type="number"
                                        :min="getScoreRange(q.scoreRange)[0]"
                                        :max="getScoreRange(q.scoreRange)[getScoreRange(q.scoreRange).length - 1]"
                                        @blur="onScoreChange(q.id, opt.id, $event)"
                                        :value="getOptionScore(q.id, opt.id)"
                                        @input="onScoreChange(q.id, opt.id, $event)"
                                        class="score-input"
                                        :placeholder="`请输入分数，分值范围 ${q.scoreRange}`"
                                        :key="`${q.id}-${opt.id}`"
                                    />
                                </view>
                            </view>
                        </view>
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
import {getWjdcDetail, submitWjdc} from '@/api/wjdc.js'
import {getActivitySurveyStatus} from '@/api/activity/activity'
import { getActivityWeekUrl, redirectToActivityWeek, completeActivityWeekGame } from '@/utils/activity'

export default {
    data() {
        return {
            loading: true,
            survey: {},
            questions: [],
            answers: {}, // {question_id: value}
            activityId: null,
            gameId: null,
            isSubmitting: false, // 添加提交状态控制
            surveyId: null
        }
    },
    onLoad(options) {
        this.activityId = uni.getStorageSync('activityId') || options.activityId;
        this.gameId = options.gameId || null;
        this.surveyId = options.surveyId;
        if(!this.activityId || !this.surveyId){
            uni.showToast({title: '参数错误', icon: 'none'})
            return;
        }
        //根据活动ID获取问卷详情
        console.log("活动ID：", this.activityId)
        uni.setStorageSync('activityId', this.activityId)
        getActivitySurveyStatus(this.activityId,this.surveyId).then(res => {
            const url = getActivityWeekUrl();
            if( res.data > 0 ){
                uni.showModal({
                    title: '提示',
                    content: '您已填写过本问卷，请勿重复填写',
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
            this.fetchSurvey(this.surveyId);
        })

    },
    methods: {
        fetchSurvey(survey_id) {
            this.loading = true;
            getWjdcDetail(survey_id).then(res => {
                if (res.code === 200) {
                    this.survey = res.data;
                    this.questions = res.data.questions || [];
                    // 初始化answers
                    this.questions.forEach(q => {
                        if (q.questionType === '2') {
                            this.$set(this.answers, q.id, []);
                        } else if (q.questionType === '5') {
                            // 为选项打分题初始化对象，键为期项ID，值为分数
                            const optionScores = {};
                            q.options.forEach(opt => {
                                optionScores[opt.id] = '';
                            });
                            this.$set(this.answers, q.id, optionScores);
                        } else {
                            this.$set(this.answers, q.id, '');
                        }
                    });
                }
                this.loading = false;
            }).catch(() => {
                this.loading = false;
                uni.showToast({title: '问卷加载失败', icon: 'none'});
            });
        },
        handleSubmit() {
            // 防止重复提交
            if (this.isSubmitting) {
                return;
            }
            // 校验必填
            for (let q of this.questions) {
                if (q.required === '1') {
                    const val = this.answers[q.id];
                    // 特殊处理选项打分题
                    if (q.questionType === '5') {
                        if (!this.validateOptionScoreQuestion(q)) {
                            const questionIndex = this.questions.findIndex(item => item.id === q.id) + 1;
                            uni.showToast({ title: `请为第${questionIndex}题的所有选项打分`, icon: 'none' });
                            return;
                        }
                    }
                    else if (!val || val.length === 0) {
                        const questionIndex = this.questions.findIndex(item => item.id === q.id) + 1;
                        uni.showToast({ title: `请填写第${questionIndex}题`, icon: 'none' });
                        return;
                    }
                }
            }
            // 组装提交数据
            const answerArr = this.questions.map(q => {
                let answerText = this.answers[q.id];
                // 多选题答案格式转换：数组转逗号分隔字符串
                if (Array.isArray(answerText)) {
                    answerText = answerText.join(',');
                } 
                // 只对对象类型的答案进行序列化，字符串和数组类型直接使用
                else if (typeof answerText === 'object' && answerText !== null) {
                    answerText = JSON.stringify(answerText);
                } else {
                    // 对于字符串类型，确保是字符串格式
                    answerText = String(answerText);
                }
                return {
                    questionId: q.id,
                    answerText: answerText
                };
            });

            console.log("提交数据：", answerArr)

            // 测试代码：验证格式转换是否正确
            const testCases = [
                { input: ["121", "233"], expected: "121,233" },
                { input: "176", expected: "176" },
                { input: [], expected: "" }
            ];
            // 设置提交状态
            this.isSubmitting = true;
            submitWjdc({
                activityId: this.activityId,
                surveyId: this.survey.id,
                answers: answerArr
            }).then(async res => {
                if (res.code === 200) {
                    await completeActivityWeekGame(this.gameId, { result: res.data }).catch(() => {})
                    uni.showToast({title: '提交成功', icon: 'success'});
                    setTimeout(() => {
                        redirectToActivityWeek()
                    }, 1200);
                } else if (res.msg && res.msg.indexOf('您已提交过本问卷') !== -1) {
                    uni.showToast({
                        title: '您已提交，进入下一环节',
                        icon: 'none',
                        duration: 1200
                    });
                    setTimeout(() => {
                        redirectToActivityWeek()
                    }, 1200);
                } else {
                    this.isSubmitting = false;
                    uni.showToast({title: res.msg || '提交失败', icon: 'none'});
                }
            }).catch(err => {
                if (err.message.indexOf('您已提交过本问卷') !== -1) {
                    uni.showToast({
                        title: '您已提交，进入下一环节',
                        icon: 'none',
                        duration: 1200
                    });
                    setTimeout(() => {
                        redirectToActivityWeek()
                    }, 1200);
                }
                this.isSubmitting = false;
                uni.showToast({title: err.message || '提交异常', icon: 'none'});
            });
        },
        onRadioChange(qid, e) {
            this.$set(this.answers, qid, e.detail.value);
        },
        onCheckboxChange(qid, e) {
            this.$set(this.answers, qid, e.detail.value);
        },
        back() {
            redirectToActivityWeek()
        },
        getScoreRange(scoreRange) {
            if (!scoreRange) return [];
            const [min, max] = scoreRange.split('-').map(Number);
            const range = [];
            for (let i = min; i <= max; i++) {
                range.push(i);
            }
            return range;
        },
        validateScore(questionId, scoreRange) {
            const score = this.answers[questionId];
            if (score === '' || score === undefined) return;

            const range = this.getScoreRange(scoreRange);
            const min = range[0];
            const max = range[range.length - 1];

            if (score < min || score > max) {
                uni.showToast({
                    title: `请输入${min}-${max}之间的分数`,
                    icon: 'none'
                });
                this.$set(this.answers, questionId, '');
            }
        },

        // 选择分数
        selectScore(questionId, score) {
            this.$set(this.answers, questionId, score);
        },
        getAnswerForOption(questionId, optionId) {
            const questionAnswers = this.answers[questionId] || [];
            // 查找该选项的分数
            const answer = questionAnswers.find(a => a.optionId === optionId);
            return answer ? answer.score : '';
        },
        onScoreChange(questionId, optionId, e) {
            let value = e.detail.value;
            // 如果输入为空，直接返回
            if (value === '' || value === undefined) {
                if (this.answers[questionId]) {
                    this.$set(this.answers[questionId], optionId, '');
                }
                return;
            }

            // 转换为数字
            value = parseInt(value);
            console.log("here...",value)
            if (value < 1 || value > 9) {
                uni.showToast({ title: '请输入1-9之间的整数', icon: 'none' });
                // 清空输入框的值
                console.log(this.answers,questionId,optionId)
                if (this.answers[questionId]) {
                    this.$set(this.answers[questionId], optionId, '');
                }
                return;
            }

            // 设置有效值
            if (this.answers[questionId]) {
                this.$set(this.answers[questionId], optionId, value);
            }
        },
        getOptionScore(questionId, optionId) {
            if (this.answers[questionId] && this.answers[questionId][optionId] !== undefined) {
                return this.answers[questionId][optionId];
            }
            return '';
        },
        /**
         * 验证选项打分题是否所有选项都已打分
         * @param {Object} question - 问题对象
         * @returns {boolean} 是否已完成打分
         */
        validateOptionScoreQuestion(question) {
            const answer = this.answers[question.id];
            if (!answer) return false;

            // 检查每个选项是否都有分数
            for (const option of question.options) {
                const score = answer[option.id];
                if (score === '' || score === undefined || score === null) {
                    return false;
                }
            }
            return true;
        },


    }
}
</script>

<style scoped>
.survey-container {
    padding: 30rpx;
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

.question-block {
    margin-bottom: 38rpx;
    padding: 24rpx 18rpx 18rpx 18rpx;
    /*background: #f8f8f8;*/
    border-radius: 12rpx;
}

.question-title {
    font-size: 30rpx;
    font-weight: 500;
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
}

.input-blank {
    border: 1px solid #eee;
    border-radius: 8rpx;
    padding: 16rpx;
    font-size: 28rpx;
    margin-top: 8rpx;
}

.submit-btn {
    width: 100%;
    background: #007aff;
    color: #fff;
    border: none;
    border-radius: 8rpx;
    font-size: 32rpx;
    margin-top: 30rpx;
}

.loading {
    text-align: center;
    font-size: 32rpx;
    color: #888;
    margin-top: 100rpx;
}
/* 打分题样式 */
.score-options {
    display: flex;
    flex-wrap: wrap;
    margin: -10rpx; /* 负边距抵消第一个元素的边距 */
    margin-top: 10rpx;
}

.score-item {
    width: 50rpx; /* 减小宽度 */
    height: 50rpx; /* 减小高度 */
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2rpx solid #007aff;
    border-radius: 8rpx;
    font-size: 26rpx; /* 稍微减小字体 */
    color: #007aff;
    background-color: #ffffff;
    transition: all 0.2s ease; /* 添加过渡效果 */
    margin:10rpx;
}

.score-item.selected {
    background-color: #007aff;
    color: white;
    border-color: #007aff;
}

.score-input {
    border: 1px solid #eee;
    border-radius: 8rpx;
    padding: 16rpx;
    font-size: 28rpx;
    margin-top: 8rpx;
}

.score-range-tip {
    font-size: 24rpx;
    color: #999;
    margin-top: 10rpx;
}
.option-group {
    margin-top: 16rpx;
}

.option-item {
    flex-direction: column; /* 垂垂直排列 */
    align-items: flex-start;
    margin-bottom: 16rpx;
}

.option-text {
    font-size: 28rpx;
    color: #333;
    margin-bottom: 8rpx; /* 添加间距 */
}

.option-group .score-input {
    height: 40rpx;
    border: 1px solid #eee;
    border-radius: 4rpx;
    font-size: 24rpx;
}
</style>
