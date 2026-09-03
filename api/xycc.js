import request from '../utils/request.js';

// 获取选项数据
export function getXyccOptions(id) {
  return request({
    url: `/api/xycc/${id}`,
    method: 'GET'
  });
}

// 提交选择
export function submitXyccSelected(data) {
  return request({
    url: '/api/xycc/selected',
    method: 'POST',
    data
  });
}

// 获取测评结果
export function getXyccResult(data) {
  return request({
    url: '/api/xycc/result',
    method: 'POST',
    data
  });
} 

// 获取霍兰德编码解释列表
export function getHollandCodes() {
  return request({
    url: '/api/xycc/codes',
    method: 'GET'
  })
}

export function createReportCache(activityId) {
  return request({ url: '/api/xycc/report/cache', method: 'POST', data: { activityId } })
}
// 全部报告由服务端按当前活动实例重新查询，禁止把前端页面列表作为跨活动数据来源。
export function createAllReportCache(activityId) {
  return request({ url: '/api/xycc/report/cache/all', method: 'POST', data: { activityId } })
}
