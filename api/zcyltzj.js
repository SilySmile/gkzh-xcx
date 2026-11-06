// 职场压力·骰子局（zcyltzj）学生端接口。
// 所有接口都携带参与记录编号；进入接口另行校验活动实例、游戏和学校归属。
import request from '@/utils/request'

/** 把后端错误转换为可直接展示的中文提示，页面不得展示状态码或错误码。 */
const TEXT = [
	{ test: /已完成|已结束|只读|finished/i, text: '本局已完成，结果仅可查看' },
	{ test: /先掷骰子|掷骰子/i, text: '请先掷骰子抽取题目' },
	{ test: /未作答|全部题目/i, text: '请完成全部题目后提交' },
	{ test: /重复题号|题号无效/i, text: '答案提交失败，请重新作答' },
	{ test: /不属于当前|归属|学校/i, text: '该游戏不属于当前学校或活动' },
	{ test: /记录不存在/i, text: '游戏记录不存在，请重新扫码进入' },
	{ test: /暂未配置|请联系管理员/i, text: '该点数暂未配置试题，请联系管理员' },
	{ test: /缺少活动/i, text: '二维码缺少活动信息，请重新扫码' },
	{ test: /登录|token|unauthori[sz]ed|401/i, text: '登录状态已失效，请重新登录' }
]

export function userMessage(error, fallback = '操作失败，请稍后重试') {
	const raw = error && (error.message || error.msg || (error.data && error.data.msg))
	if (!raw) return fallback
	if (error.userFacing === true) return String(raw)
	// 活动反馈类明确提示直接展示，避免被通用规则覆盖。
	if (/^(请先完成|请选择|请填写)/.test(String(raw))) return String(raw)
	const found = TEXT.find(item => item.test.test(String(raw)))
	return found ? found.text : fallback
}

/**
 * 通用业务请求：微信小程序 request 会把业务码 500 也 resolve，
 * 因此入口校验、掷骰子和提交答案都必须显式判断 code。
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

export const enterRecord = data => call({
	url: '/api/zcyltzj/records/enter',
	method: 'POST',
	data
}, '游戏入口校验失败，请重新扫码')

export const getPoints = () => call({
	url: '/api/zcyltzj/points',
	method: 'GET'
}, '点数配置加载失败，请稍后重试')

export const getRuleCells = () => call({
	url: '/api/zcyltzj/rule-cells',
	method: 'GET'
}, '规则内容加载失败，请稍后重试')

export const getRecord = (recordId, params) => call({
	url: `/api/zcyltzj/records/${recordId}`,
	method: 'GET',
	params
}, '游戏进度加载失败，请稍后重试')

export const rollDice = recordId => call({
	url: `/api/zcyltzj/records/${recordId}/roll`,
	method: 'POST'
}, '骰子点数获取失败，请重试')

export const submitAnswers = (recordId, answers) => call({
	url: `/api/zcyltzj/records/${recordId}/submit`,
	method: 'POST',
	data: { answers }
}, '答案提交失败，请稍后重试')
