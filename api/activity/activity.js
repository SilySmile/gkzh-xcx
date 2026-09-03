import request from '@/utils/request'

// 获取活动进度
export function getActivityProgress(activityId) {
  return request({
    url: '/api/activity/' + activityId,
    method: 'get',
  })
}

// 完成环节
export function finishStep(activityId, userId, stepType) {
  return request({
    url: '/api/activity/finishStep',
    method: 'post',
    data: { activityId, userId, stepType }
  })
}
export function getActivitySurveyStatus(activityId,surveyId) {
  return request({
    url: '/api/activity/getActivitySurveyStatus',
    method: 'get',
    data: { activityId,surveyId }
  })
}