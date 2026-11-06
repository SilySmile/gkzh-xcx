// 未来职业猜猜看（zycck）学生端接口。
// 所有接口均显式携带活动实例和游戏编号，避免跨活动恢复记录。
import request from '@/utils/request'
import config from '@/config/api.js'

const TEXT = [{
		test: /只能成功打印一次|已成功打印/i,
		text: '每位用户只能成功打印一次'
	},
	// 服务端校验失败时按原因提示，不能把“距离过远”等错误都说成蓝牙未开启。
	{ test: /打印点蓝牙信标未配置/i, text: '打印点尚未配置信标，请联系管理员' },
	{ test: /信标检测结果已过期/i, text: '信标检测结果已过期，请重新检测' },
	{ test: /距离打印点较远|进入打印点蓝牙范围|未检测到指定打印点/i, text: '请靠近打印点后重试' },
	{ test: /请开启蓝牙并靠近打印点/i, text: '请确认蓝牙和定位已开启，并靠近打印点' },
	{
		test: /取消原打印|原打印任务|暂不能重试/i,
		text: '正在核对上次打印任务，请稍后重试'
	},
	{
		test: /结束|只读|finished|read.?only/i,
		text: '本次游戏已完成，结果仅可查看'
	},
	{
		test: /已提交|重复|duplicate|submitted/i,
		text: '这道题已经提交过了'
	},
	{
		test: /清单|上限|满|limit/i,
		text: '探索清单最多添加 6 个职业'
	},
	{
		test: /查看|浏览|未查看|browse/i,
		text: '请先查看至少一个职业详情'
	},
	{
		test: /活动|实例|学校|归属|跨|instance|school/i,
		text: '该二维码不属于当前活动'
	},
	{
		test: /停用|无效|不存在|not.?found|invalid/i,
		text: '游戏入口已失效，请重新扫码进入'
	},
	{
		test: /登录|token|unauthori[sz]ed|401/i,
		text: '登录状态已失效，请重新登录'
	}
]

/** 将后端错误转换为可直接展示给用户的提示，禁止页面展示状态码或错误码。 */
export function userMessage(error, fallback = '操作失败，请稍后重试') {
	const raw = error && (error.message || error.msg || error.data && error.data.msg)
	if (!raw) return fallback
	// 页面自身构造的提示已经过人工检查；再次匹配通用规则会掩盖真实故障原因。
	if (error.userFacing === true) return String(raw)
	// 活动反馈的明确校验提示可直接展示，避免被“清单/活动”等通用规则覆盖。
	if (/^(第[123]题|请填写第[123]题|请选择第2题|未加入过探索清单，无需填写第2题|请先确认探索清单，再填写反馈|探索清单已确认，请完成活动反馈|活动反馈已提交，不可再次修改)/.test(String(raw))) return String(raw)
	const found = TEXT.find(item => item.test.test(String(raw)))
	return found ? found.text : fallback
}

function call(options, fallback) {
	return request(options).catch(error => {
		const wrapped = new Error(userMessage(error, fallback))
		wrapped.userFacing = true
		wrapped.cause = error
		throw wrapped
	})
}

export const enterRecord = data => call({
	url: '/api/zycck/records/enter',
	method: 'POST',
	data
}, '游戏入口校验失败，请重新扫码').then(response => {
	// 通用 request 会把业务码 500 也 resolve；入口校验必须按业务码拦截，
	// 保证跨校扫码、活动失效等提示能直接展示，并且不会继续创建本地流程。
	if (!response || Number(response.code) !== 200) {
		const error = new Error((response && response.msg) || '游戏入口校验失败，请重新扫码')
		error.userFacing = true
		throw error
	}
	return response
})
export const getCatalog = params => call({
	url: '/api/zycck/catalog',
	method: 'GET',
	params
}, '职业内容加载失败，请稍后重试')
export const startRecord = recordId => call({
	url: `/api/zycck/records/${recordId}/start`,
	method: 'POST'
}, '游戏启动失败，请稍后重试')
export const startQuestionTimer = recordId => call({
	url: `/api/zycck/records/${recordId}/question-start`,
	method: 'POST'
}, '题目加载失败，请重试')
export const getRecord = (recordId, params) => call({
	url: `/api/zycck/records/${recordId}`,
	method: 'GET',
	params
}, '游戏进度加载失败，请重试')
export const submitAnswer = (recordId, data) => call({
	url: `/api/zycck/records/${recordId}/answers`,
	method: 'POST',
	data
}, '答案提交失败，请重试')
export const submitAwareness = (recordId, data) => call({
	url: `/api/zycck/records/${recordId}/awareness`,
	method: 'POST',
	data
}, '了解程度提交失败，请重试')
export const browseCareer = (recordId, careerId) => call({
	url: `/api/zycck/records/${recordId}/browse`,
	method: 'POST',
	data: {
		careerId
	}
}, '职业浏览记录保存失败，请重试')
export const getExploration = recordId => call({
	url: `/api/zycck/records/${recordId}/exploration`,
	method: 'GET'
}, '探索清单加载失败，请重试')
export const addExplorationItem = (recordId, careerId) => call({
	url: `/api/zycck/records/${recordId}/exploration-items`,
	method: 'POST',
	data: {
		careerId
	}
}, '加入清单失败，请重试')
export const removeExplorationItem = (recordId, careerId) => call({
	url: `/api/zycck/records/${recordId}/exploration-items/${careerId}`,
	method: 'DELETE'
}, '移除清单失败，请重试')
export const finishRecord = recordId => call({
	url: `/api/zycck/records/${recordId}/finish`,
	method: 'POST'
}, '确认探索清单失败，请重试')
export const getReport = params => call({
	url: '/api/zycck/report',
	method: 'GET',
	params
}, '结果加载失败，请稍后重试')

// 活动反馈始终携带本次活动、游戏上下文，不能跨活动读取或填写。
// 通用 request 会 resolve code=500；本功能必须显式拒绝业务失败，防止显示“已保存”。
function feedbackCall(options, fallback) {
	return request(options).then(response => {
		if (!response || Number(response.code) !== 200) throw new Error(response && response.msg || fallback)
		return response
	}).catch(error => {
		const wrapped = new Error(userMessage(error, fallback))
		wrapped.userFacing = true
		throw wrapped
	})
}
export const getActivityFeedback = (recordId, params) => feedbackCall({
	url: `/api/zycck/records/${recordId}/activity-feedback`, method: 'GET', params
}, '活动反馈加载失败，请稍后重试')
export const saveActivityFeedback = (recordId, params, data) => feedbackCall({
	url: `/api/zycck/records/${recordId}/activity-feedback`, method: 'POST', params, data
}, '活动反馈保存失败，请稍后重试')

// 汉印云打印：报告页选择可用打印机并提交当前报告。
export const listPrinters = () => call({
	url: '/api/zycck/printers',
	method: 'GET'
}, '打印机列表加载失败，请稍后重试')
// 打开打印面板前查询“是否已打印”以及服务端下发的信标参数。
export const getPrintEligibility = recordId => call({
	url: `/api/zycck/records/${recordId}/print-eligibility`,
	method: 'GET'
}, '打印条件校验失败，请稍后重试')
// beacon 是手机当前扫描结果；信标限制关闭时传 null。
export const printReport = (recordId, printerId, beacon) => call({
	url: `/api/zycck/records/${recordId}/print`,
	method: 'POST',
	data: { printerId, beacon }
}, '打印任务提交失败，请稍后重试')
export const getPrintTask = taskId => call({
	url: `/api/zycck/print-tasks/${taskId}`,
	method: 'GET'
}, '打印状态查询失败，请稍后重试')
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
			header: {
				'X-Front-Token': token ? `Bearer ${token}` : ''
			},
			success: response => {
				if (response.statusCode === 200 && response.tempFilePath) return resolve(response)
				reject(new Error('PDF 下载失败，请稍后重试'))
			},
			fail: () => reject(new Error('PDF 下载失败，请检查网络后重试'))
		})
	}).catch(error => {
		throw new Error(userMessage(error, 'PDF 下载失败，请稍后重试'))
	})
}
