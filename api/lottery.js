// 学生端抽奖相关API
import request from '../utils/request.js'

/**
 * 获取转盘奖品列表
 * @param {number} activityId - 活动ID
 * @returns {Promise} 奖品列表
 */
export function getPrizeList(activityId) {
  return request({
    url: `/api/lottery/prizes/${activityId}`,
    method: 'GET'
  });
}

/**
 * 执行抽奖
 * @param {number} activityId - 活动ID
 * @returns {Promise} 中奖结果
 */
export function drawPrize(activityId) {
  return request({
    url: `/api/lottery/draw/${activityId}`,
    method: 'POST'
  });
} 

// 检查学校是否分配抽奖以及完成数量
export function checkLottery(activityId) {
  return request({
    url: `/api/lottery/check/${activityId}`,
    method: 'GET'
  });
}

export function getPrizesByLotteryId(lotteryId) {
  return request({
    url: `/api/lottery/prizes/by/${lotteryId}`,
    method: 'GET'
  });
}

export function drawPrizeByLotteryId(lotteryId, activityId) {
  return request({
    url: `/api/lottery/draw/by/${lotteryId}`,
    method: 'POST',
    params: activityId ? { activityId } : {}
  });
}

export function getMyLottery(lotteryId, activityId) {
  return request({
    url: `/api/lottery/my/${lotteryId}`,
    method: 'GET',
    params: activityId ? { activityId } : {}
  });
}

export function getMyLotteryList(lotteryId, activityId) {
  return request({
    url: `/api/lottery/my/list/${lotteryId}`,
    method: 'GET',
    params: activityId ? { activityId } : {}
  });
}
