// 职业角斗场（zyjdc）学生端接口。
// 所有接口都校验当前登录学生、活动实例和游戏编号；棋盘与计时以服务端为准。
import request from '@/utils/request'

/** 把后端错误转换为可直接展示的中文提示，页面不得展示状态码或错误码。 */
const TEXT = [
	{ test: /已通关|已完成|只读|finished/i, text: '本局已通关，结果仅可查看' },
	{ test: /对局进行中|不能更换角色/i, text: '对局进行中，不能更换角色' },
	{ test: /请先选择角色/i, text: '请先选择角色' },
	{ test: /请先开始对局|尚未开始/i, text: '对局尚未开始，请重新进入' },
	{ test: /不是你的回合|等待电脑/i, text: '请等待电脑走子' },
	{ test: /不合法|重新选择/i, text: '这一步不能走，请重新选择棋子或落点' },
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
	url: '/api/zyjdc/records/enter',
	method: 'POST',
	data
}, '游戏入口校验失败，请重新扫码')

/** 8 个动物角色。 */
export const getRoles = () => call({
	url: '/api/zyjdc/roles',
	method: 'GET'
}, '角色配置加载失败，请稍后重试')

/** 查询本局进度、棋盘和结果。 */
export const getRecord = (recordId, params) => call({
	url: `/api/zyjdc/records/${recordId}`,
	method: 'GET',
	params
}, '对局进度加载失败，请稍后重试')

/** 选择角色。 */
export const selectRole = (recordId, roleId) => call({
	url: `/api/zyjdc/records/${recordId}/role`,
	method: 'POST',
	data: { roleId }
}, '角色选择失败，请稍后重试')

/** 开始对局。 */
export const startGame = recordId => call({
	url: `/api/zyjdc/records/${recordId}/start`,
	method: 'POST'
}, '对局启动失败，请稍后重试')

/** 学生落子，服务端同时执行电脑一步。 */
export const movePiece = (recordId, move) => call({
	url: `/api/zyjdc/records/${recordId}/move`,
	method: 'POST',
	data: move
}, '落子失败，请稍后重试')

/** 失败或平局后重开一局。 */
export const retryGame = recordId => call({
	url: `/api/zyjdc/records/${recordId}/retry`,
	method: 'POST'
}, '重新挑战失败，请稍后重试')
