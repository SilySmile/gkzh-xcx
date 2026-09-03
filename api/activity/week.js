import request from '@/utils/request'

// 获取活动完整流程
export function getWeekFlow(instanceId) {
  return request({
    url: '/api/activity/week/' + instanceId + '/flow',
    method: 'get'
  })
}

// 获取指定业务类型的进行中活动实例
export function getActiveWeek(bizType) {
  return request({
    url: '/api/activity/week/active/' + bizType,
    method: 'get'
  })
}

// 获取单个游戏信息
export function getWeekGame(gameId, instanceId) {
  return request({
    url: '/api/activity/week/game/' + gameId,
    method: 'get',
    params: instanceId ? { instanceId } : undefined
  })
}

// 进入游戏并记录扫码
export function enterWeekGame(gameId, instanceId) {
  return request({
    url: '/api/activity/week/game/' + gameId + '/enter',
    method: 'post',
    params: instanceId ? { instanceId } : undefined
  })
}

// 通用完成游戏
export function completeWeekGame(gameId, data, instanceId) {
  return request({
    url: '/api/activity/week/game/' + gameId + '/complete',
    method: 'post',
    data,
    params: instanceId ? { instanceId } : undefined
  })
}
