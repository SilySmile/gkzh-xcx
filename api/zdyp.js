// 职得一拼（zdyp）学生端接口。
// 所有接口都校验当前登录学生、活动实例和游戏编号；卡片维度、判定与用时均以服务端为准。
import request from '@/utils/request'

/** 把后端错误转换为可直接展示的中文提示，页面不得展示状态码或错误码。 */
const TEXT = [
	{ test: /已通关|已完成/i, text: '本局已通关，可直接查看报告' },
	{ test: /暂未开放|已停用/i, text: '该游戏暂未开放，请联系现场工作人员' },
	{ test: /记录不存在|已失效/i, text: '参与记录不存在，请重新扫码进入' },
	{ test: /不属于当前|归属|学校/i, text: '该游戏不属于当前学校或活动' },
	{ test: /缺少活动|活动参数/i, text: '二维码缺少活动信息，请重新扫码' },
	{ test: /岗位.*(暂不可选|不完整)/i, text: '该岗位暂不可选，请刷新后重新选择' },
	{ test: /卡片.*(失效|不完整)/i, text: '卡片已失效，请重新开始本局' },
	{ test: /不能重复|同一个卡槽/i, text: '卡片放置有误，请重新选择' },
	{ test: /登录|token|unauthori[sz]ed|401/i, text: '登录状态已失效，请重新登录' }
]

export function userMessage(error, fallback = '操作失败，请稍后重试') {
	const raw = error && (error.message || error.msg || (error.data && error.data.msg))
	if (!raw) return fallback
	if (error.userFacing === true) return String(raw)
	if (/^(请先|请选择|请完成|请等待)/.test(String(raw))) return String(raw)
	const found = TEXT.find(item => item.test.test(String(raw)))
	return found ? found.text : fallback
}

/**
 * 通用业务请求：微信小程序 request 会把业务码 500 也 resolve，
 * 因此所有接口都必须显式判断 code。
 */
function call(options, fallback) {
	return request(options).then(response => {
		if (!response || Number(response.code) !== 200) {
			const error = new Error((response && response.msg) || fallback)
			error.userFacing = true
			throw error
		}
		return response
	}).catch(error => {
		if (error && error.userFacing === true) throw error
		const wrapped = new Error(userMessage(error, fallback))
		wrapped.userFacing = true
		wrapped.cause = error
		throw wrapped
	})
}

/** 扫码进入：服务端校验学校、活动实例和游戏归属，幂等创建参与记录。 */
export const enterRecord = data => call({
	url: '/api/zdyp/records/enter',
	method: 'POST',
	data
}, '游戏入口校验失败，请重新扫码')

/** 查询本人参与进度、岗位目录、进行中的尝试与最近一次结果。 */
export const getRecord = (recordId, params) => call({
	url: `/api/zdyp/records/${recordId}`,
	method: 'GET',
	params
}, '闯关信息加载失败，请稍后重试')

/** 选择岗位并开始一次闯关，返回四张卡片与服务端截止时间。 */
export const startRecord = (recordId, careerCode) => call({
	url: `/api/zdyp/records/${recordId}/start`,
	method: 'POST',
	data: { careerCode }
}, '开始闯关失败，请稍后重试')

/** 提交四个卡槽的放置，服务端判定并返回解析。 */
export const submitRecord = (recordId, attemptNo, placements) => call({
	url: `/api/zdyp/records/${recordId}/submit`,
	method: 'POST',
	data: { attemptNo, placements }
}, '提交答案失败，请稍后重试')
