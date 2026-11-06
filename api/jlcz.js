// 简历称重（jlcz）学生端接口。
// 所有接口都校验当前登录学生、活动实例和游戏编号；重量与通关判定均以服务端为准。
import request from '@/utils/request'

/** 把后端错误转换为可直接展示的中文提示，页面不得展示状态码或错误码。 */
const TEXT = [
	{ test: /已完成|结果仅可查看|finished/i, text: '本次称重已完成，可查看结果' },
	{ test: /已通关|不可修改|无需重新/i, text: '本次称重已通关，结果不可修改' },
	{ test: /没有完成一次称重|未完成一次称重/i, text: '请先完成一次称重' },
	{ test: /超时/i, text: '本次称重已超时，可在结果页重新称重' },
	{ test: /未开放|已停用/i, text: '该游戏暂未开放，请联系现场工作人员' },
	{ test: /记录不存在|已不存在/i, text: '称重记录不存在，请重新扫码进入' },
	{ test: /不属于当前|归属|学校/i, text: '该游戏不属于当前学校或活动' },
	{ test: /缺少活动|活动参数/i, text: '二维码缺少活动信息，请重新扫码' },
	{ test: /砝码编号|重复项/i, text: '称重数据已变化，请刷新后重新勾选' },
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
	url: '/api/jlcz/records/enter',
	method: 'POST',
	data
}, '游戏入口校验失败，请重新扫码')

/** 查询本人称重进度、砝码目录与结果。 */
export const getRecord = (recordId, params) => call({
	url: `/api/jlcz/records/${recordId}`,
	method: 'GET',
	params
}, '称重信息加载失败，请稍后重试')

/** 开始称重：服务端记录开始时间，用于计算用时和限时。 */
export const startRecord = recordId => call({
	url: `/api/jlcz/records/${recordId}/start`,
	method: 'POST'
}, '开始称重失败，请稍后重试')

/** 提交本次勾选的砝码编号，由服务端计算总重与通关判定。 */
export const submitWeights = (recordId, weightNos) => call({
	url: `/api/jlcz/records/${recordId}/submit`,
	method: 'POST',
	data: { weightNos }
}, '称重提交失败，请稍后重试')

/** 未通关重新称重：同一参与记录累加称重次数。 */
export const restartRecord = recordId => call({
	url: `/api/jlcz/records/${recordId}/restart`,
	method: 'POST'
}, '重新称重失败，请稍后重试')
