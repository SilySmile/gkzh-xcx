// 职得一拼（zdyp）设计稿素材：整页背景 + 拼图碎片 + 编号徽章。
// 素材按内容哈希发布到远程目录，改动后重新上传并替换 BASE 即可。
const BASE = 'https://zhiye.sxgkzh.cn/imgs/zdyp/141c1b09b552'

export default {
	// 拼图1：落地页（logo + 职得一拼 + 开始游戏/查看报告）
	startSplash: BASE + '/start-splash.jpg',
	// 拼图2：规则页（logo + Hi! + 游戏规则白卡 + 开始游戏）
	startRules: BASE + '/start-rules.jpg',
	// 拼图3：闯关底图（已抹掉示例数字与底部按钮，进度条与卡槽数字由页面动态绘制）
	gameEmpty: BASE + '/game-empty.jpg',
	// 5.6：解析页（进度条、拼图、正确排序、职业解说）
	report: BASE + '/report.jpg',
	// 四块拼图碎片，按卡片编号 1-4 依次为紫、橙、粉、黄
	pieces: [
		BASE + '/piece-purple.png',
		BASE + '/piece-orange.png',
		BASE + '/piece-pink.png',
		BASE + '/piece-yellow.png'
	],
	// 绿色圆形编号徽章 1-4
	badges: [
		BASE + '/badge-1.png',
		BASE + '/badge-2.png',
		BASE + '/badge-3.png',
		BASE + '/badge-4.png'
	]
}
