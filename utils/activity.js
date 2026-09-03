// 用户端活动返回逻辑
import { completeWeekGame } from '@/api/activity/week'

/**
 * 活动周游戏统一完成回写。非活动周入口没有 gameId 时保持兼容。
 */
export function completeActivityWeekGame(gameId, result = {}) {
  return gameId ? completeWeekGame(gameId, result) : Promise.resolve()
}

/**
 * 获取当前活动页面地址。
 * 优先使用进入游戏前写入的 weekBizType，避免跳回旧的活动列表页。
 */
export function getActivityWeekUrl() {
  const bizType = uni.getStorageSync('weekBizType') || 'career_week'
  return `/pages/mp/sub-pages/career-week/index?bizType=${bizType}`
}

/**
 * 统一返回当前活动页面。
 */
export function redirectToActivityWeek() {
  if (uni.getStorageSync('scanEntry') === '1') {
    uni.removeStorageSync('scanEntry')
    uni.redirectTo({ url: '/pages/mp/home/index' })
    return
  }
  const pages = getCurrentPages()
  let targetIndex = -1
  for (let i = pages.length - 2; i >= 0; i--) {
    const page = pages[i]
    const route = page && (page.route || (page.$page && page.$page.route) || '')
    if (route.indexOf('career-week/index') > -1 || route === 'pages/activity/week') {
      targetIndex = i
      break
    }
  }

  if (targetIndex >= 0) {
    uni.navigateBack({ delta: pages.length - 1 - targetIndex })
  } else {
    uni.redirectTo({ url: getActivityWeekUrl() })
  }
}
