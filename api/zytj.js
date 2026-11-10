// 职愿探究（zytj）学生端接口。
// 所有接口都校验当前登录学生、活动实例和游戏编号；人格类型与文案均以服务端为准。
import request from '@/utils/request'

/** 把后端错误转换为可直接展示的中文提示，页面不得展示状态码或错误码。 */
const TEXT = [
	{ test: /已生成|不可修改/i, text: '职业探索卡已生成，不可修改' },
	{ test: /暂未开放|已停用/i, text: '该游戏暂未开放，请联系现场工作人员' },
	{ test: /记录不存在|已不存在/i, text: '参与记录不存在，请重新扫码进入' },
	{ test: /不属于当前|归属|学校/i, text: '该游戏不属于当前学校或活动' },
	{ test: /缺少活动|活动参数/i, text: '二维码缺少活动信息，请重新扫码' },
	{ test: /尚未配置|配置完整/i, text: '橱窗物品尚未配置完整，请联系现场工作人员' },
	{ test: /请先在每列/i, text: '请为每一列选择一件物品' },
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
	url: '/api/zytj/records/enter',
	method: 'POST',
	data
}, '游戏入口校验失败，请重新扫码')

/** 查询本人选择进度、四列橱窗物品与职业探索卡。 */
export const getRecord = (recordId, params) => call({
	url: `/api/zytj/records/${recordId}`,
	method: 'GET',
	params
}, '选择信息加载失败，请稍后重试')

/** 进入选择页：服务端记录开始时间，30 秒限时按该时间计算。 */
export const startRecord = recordId => call({
	url: `/api/zytj/records/${recordId}/start`,
	method: 'POST'
}, '开始探究失败，请稍后重试')

/**
 * 提交橱窗选择。
 * @param {number|string} recordId 参与记录编号
 * @param {Array<string|null>} itemCodes 按列序的物品编码，长度 4，未选中的列传 null
 * @param {boolean} timeout 是否到点自动提交
 */
export const submitChoice = (recordId, itemCodes, timeout) => call({
	url: `/api/zytj/records/${recordId}/submit`,
	method: 'POST',
	data: { itemCodes, timeout: timeout === true }
}, '提交选择失败，请稍后重试')
