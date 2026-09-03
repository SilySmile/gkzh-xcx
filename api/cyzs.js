import request from '../utils/request.js'

// 获取问卷列表
export function getQuestions() {
  return request({
    url: '/api/cyzs/questions',
    method: 'GET'
  })
}

// 提交答卷
export function submitAnswers(activityId,data) {
  return request({
    url: '/api/cyzs/submit/' + activityId,
    method: 'POST',
    data
  })
}

