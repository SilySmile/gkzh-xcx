// 职业飞行棋（zyfxq）学生端接口。
// 所有接口都校验当前登录学生、活动实例和游戏编号；点数、移动和判定均以服务端为准。
import request from '@/utils/request'

/** 把后端错误转换为可直接展示的中文提示，页面不得展示状态码或错误码。 */
const TEXT = [
	{ test: /已结束|结果仅可查看|finished/i, text: '本局已结束，可查看结果或重新开始一局' },
	{ test: /先点击开始|请先开始/i, text: '请先点击开始游戏' },
	{ test: /当前题目|待作答|重新掷骰/i, text: '请先完成当前题目' },
	{ test: /暂无可用题目|题库/i, text: '该知识点暂无可用题目，请联系现场工作人员' },
	{ test: /已通关|无需重新开始/i, text: '本局已通关，无需重新开始' },
	{ test: /未开放|已停用/i, text: '该游戏暂未开放，请联系现场工作人员' },
	{ test: /记录不存在|已不存在/i, text: '游戏记录不存在，请重新扫码进入' },
	{ test: /不属于当前|归属|学校/i, text: '该游戏不属于当前学校或活动' },
	{ test: /缺少活动|活动参数/i, text: '二维码缺少活动信息，请重新扫码' },
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
	url: '/api/zyfxq/records/enter',
	method: 'POST',
	data
}, '游戏入口校验失败，请重新扫码')

/** 查询本人对局进度、棋盘与当前题目。 */
export const getRecord = (recordId, params) => call({
	url: `/api/zyfxq/records/${recordId}`,
	method: 'GET',
	params
}, '对局进度加载失败，请稍后重试')

/** 点击开始游戏：服务端固化规则参数并开始计时。 */
export const startRecord = recordId => call({
	url: `/api/zyfxq/records/${recordId}/start`,
	method: 'POST'
}, '开始游戏失败，请稍后重试')

/** 掷骰子：服务端生成点数并前进，可能同时下发一道题。 */
export const rollDice = recordId => call({
	url: `/api/zyfxq/records/${recordId}/roll`,
	method: 'POST'
}, '掷骰子失败，请稍后重试')

/** 提交答案；optionLabel 为空或 timeout 为 true 表示超时未作答。 */
export const submitAnswer = (recordId, payload) => call({
	url: `/api/zyfxq/records/${recordId}/answer`,
	method: 'POST',
	data: payload
}, '答案提交失败，请稍后重试')

/** 未通关后重新开始一局；参与记录仍复用同一条。 */
export const restartRecord = recordId => call({
	url: `/api/zyfxq/records/${recordId}/restart`,
	method: 'POST'
}, '重新开始失败，请稍后重试')
