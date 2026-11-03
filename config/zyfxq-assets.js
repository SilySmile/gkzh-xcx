/**
 * 职业飞行棋素材地址。
 *
 * 当前版本棋盘、骰子、按钮均用 CSS 还原设计稿，不依赖图片，因此这里默认为空。
 * 素材上传到服务器后，把地址填到对应字段即可自动替换，页面会按“有地址用图片、无地址用 CSS”渲染：
 *   bg         整页背景（750×1624 或同比例）
 *   logo       标题 logo「职业飞行棋」
 *   rollButton 「摇骰子」按钮底图
 *   dice       1-6 点骰子图，数组下标 0 对应 1 点
 * 素材目录建议：https://zhiye.sxgkzh.cn/imgs/zyfxq/<内容哈希>/
 */
const BASE = ''

export const ZYFXQ_ASSETS = {
	bg: '',
	logo: '',
	rollButton: '',
	dice: []
}
