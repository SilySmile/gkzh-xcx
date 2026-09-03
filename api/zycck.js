// 未来职业猜猜看（zycck）学生端接口。
// 所有接口均显式携带活动实例和游戏编号，避免跨活动恢复记录。
import request from '@/utils/request'
import config from '@/config/api.js'

const TEXT = [
  { test: /结束|只读|finished|read.?only/i, text: '本次游戏已完成，结果仅可查看' },
  { test: /已提交|重复|duplicate|submitted/i, text: '这道题已经提交过了' },
  { test: /清单|上限|满|limit/i, text: '探索清单最多添加 6 个职业' },
  { test: /查看|浏览|未查看|browse/i, text: '请先查看至少一个职业详情' },
  { test: /活动|实例|学校|归属|跨|instance|school/i, text: '该二维码不属于当前活动' },
  { test: /停用|无效|不存在|not.?found|invalid/i, text: '游戏入口已失效，请重新扫码进入' },
  { test: /登录|token|unauthori[sz]ed|401/i, text: '登录状态已失效，请重新登录' }
]

/** 将后端错误转换为可直接展示给用户的提示，禁止页面展示状态码或错误码。 */
export function userMessage(error, fallback = '操作失败，请稍后重试') {
  const raw = error && (error.message || error.msg || error.data && error.data.msg)
  if (!raw) return fallback
  const found = TEXT.find(item => item.test.test(String(raw)))
  return found ? found.text : fallback
}

function call(options, fallback) {
  return request(options).catch(error => {
    const wrapped = new Error(userMessage(error, fallback))
    wrapped.cause = error
    throw wrapped
  })
}

export const enterRecord = data => call({ url: '/api/zycck/records/enter', method: 'POST', data }, '游戏入口校验失败，请重新扫码')
export const getCatalog = params => call({ url: '/api/zycck/catalog', method: 'GET', params }, '职业内容加载失败，请稍后重试')
export const startRecord = recordId => call({ url: `/api/zycck/records/${recordId}/start`, method: 'POST' }, '游戏启动失败，请稍后重试')
export const getRecord = (recordId, params) => call({ url: `/api/zycck/records/${recordId}`, method: 'GET', params }, '游戏进度加载失败，请重试')
export const submitAnswer = (recordId, data) => call({ url: `/api/zycck/records/${recordId}/answers`, method: 'POST', data }, '答案提交失败，请重试')
export const submitAwareness = (recordId, data) => call({ url: `/api/zycck/records/${recordId}/awareness`, method: 'POST', data }, '了解程度提交失败，请重试')
export const browseCareer = (recordId, careerId) => call({ url: `/api/zycck/records/${recordId}/browse`, method: 'POST', data: { careerId } }, '职业浏览记录保存失败，请重试')
export const getExploration = recordId => call({ url: `/api/zycck/records/${recordId}/exploration`, method: 'GET' }, '探索清单加载失败，请重试')
export const addExplorationItem = (recordId, careerId) => call({ url: `/api/zycck/records/${recordId}/exploration-items`, method: 'POST', data: { careerId } }, '加入清单失败，请重试')
export const removeExplorationItem = (recordId, careerId) => call({ url: `/api/zycck/records/${recordId}/exploration-items/${careerId}`, method: 'DELETE' }, '移除清单失败，请重试')
export const finishRecord = recordId => call({ url: `/api/zycck/records/${recordId}/finish`, method: 'POST' }, '完成探索失败，请重试')
export const getReport = params => call({ url: '/api/zycck/report', method: 'GET', params }, '结果加载失败，请稍后重试')

// PDF 接口返回文件流，不能通过通用 JSON request 解析。
export function downloadReportPdf(params = {}) {
  const query = Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')
  const token = uni.getStorageSync('token')
  return new Promise((resolve, reject) => {
    // downloadFile 将文件流落到临时文件，便于小程序 openDocument 预览。
    uni.downloadFile({
      url: `${config.BASE_URL}/api/zycck/report/pdf${query ? '?' + query : ''}`,
      timeout: config.TIMEOUT,
      header: { 'X-Front-Token': token ? `Bearer ${token}` : '' },
      success: response => {
        if (response.statusCode === 200 && response.tempFilePath) return resolve(response)
        reject(new Error('PDF 下载失败，请稍后重试'))
      },
      fail: () => reject(new Error('PDF 下载失败，请检查网络后重试'))
    })
  }).catch(error => { throw new Error(userMessage(error, 'PDF 下载失败，请稍后重试')) })
}
