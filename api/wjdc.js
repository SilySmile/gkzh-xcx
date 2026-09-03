import request from '../utils/request.js'

// 获取问卷列表
export function getWjdcList() {
  return request({
    url: '/api/wjdc/list',
    method: 'GET'
  })
}

// 获取问卷详情
export function getWjdcDetail(id) {
  return request({
    url: `/api/wjdc/detail/${id}`,
    method: 'GET'
  })
}

// 提交答卷
export function submitWjdc(data) {
  return request({
    url: '/api/wjdc/submit',
    method: 'POST',
    data
  })
}

// 查询答卷记录
export function getWjdcRecord(id) {
  return request({
    url: `/api/wjdc/record/${id}`,
    method: 'GET'
  })
}
