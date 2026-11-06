// 能量雷达（nlld）学生端接口。
// 所有接口都校验当前登录学生、活动实例和游戏编号；关卡与计分以服务端为准。
import request from '@/utils/request'

/** 把后端错误转换为可直接展示的中文提示，页面不得展示状态码或错误码。 */
const TEXT = [
	{ test: /已完成|只读|finished/i, text: '本次测评已完成，结果仅可查看' },
	{ test: /按顺序|关卡参数|关卡已停用/i, text: '请按顺序完成关卡' },
	{ test: /2 件|两件|不同的物品/i, text: '每关必须选择 2 件不同的物品' },
	{ test: /不属于当前关卡|重新选择/i, text: '所选物品不属于当前关卡，请重新选择' },
	{ test: /已不存在|记录不存在/i, text: '游戏记录不存在，请重新扫码进入' },
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

/** 扫码进入：服务端校验学校、活动实例和游戏归属，幂等创建记录。 */
export const enterRecord = data => call({
	url: '/api/nlld/records/enter',
	method: 'POST',
	data
}, '游戏入口校验失败，请重新扫码')

/** 查询本人测评进度、关卡配置和结果。 */
export const getRecord = (recordId, params) => call({
	url: `/api/nlld/records/${recordId}`,
	method: 'GET',
	params
}, '测评进度加载失败，请稍后重试')

/** 提交一关的 2 件物品；第 6 关提交后返回结果。 */
export const answerRound = (recordId, roundNo, optionIds) => call({
	url: `/api/nlld/records/${recordId}/answer`,
	method: 'POST',
	data: { roundNo, optionIds }
}, '关卡提交失败，请稍后重试')

/** 记录首次点击保存截图；重复调用由服务端幂等处理，每场活动游戏只记一次。 */
export const markPosterSaved = recordId => call({
	url: `/api/nlld/records/${recordId}/poster`,
	method: 'POST'
}, '保存记录上报失败')
