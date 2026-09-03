import request from '../utils/request.js'

// 获取职愿探究商品列表（按列分组）
export function getProducts(activityId) {
  return request({
    url: '/api/zytj/products/' + activityId,
    method: 'GET'
  })
}

// 提交职愿探究选择
export function submitChoice(data) {
  return request({
    url: '/api/zytj/submit',
    method: 'POST',
    data
  })
}

// 查询我的选择结果
export function getMyResult(activityId) {
  return request({
    url: '/api/zytj/result/' + activityId,
    method: 'GET'
  })
}
