import request from '../utils/request.js'

// 提交职业信息渠道选择
export function submitChannelChoice(data) {
  return request({
    url: '/api/zyxxz/submit',
    method: 'POST',
    data
  })
}

// 查询我的选择结果
export function getMyResult(activityId) {
  return request({
    url: '/api/zyxxz/result/' + activityId,
    method: 'GET'
  })
}
