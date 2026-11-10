// 职愿探究（zytj）远程素材地址。
// 素材按内容哈希发布到版本目录，更新素材后重新生成目录并替换 BASE 即可，页面无需改动。
const BASE = 'https://zhiye.sxgkzh.cn/imgs/zytj/5331b0a2e482'

export default {
	base: BASE,
	// 第一页：开始探索（标题已烘进背景图）
	bgStart: BASE + '/p1-bg.jpg',
	btnStart: BASE + '/p1-start.png',
	// 第二页：橱窗选择
	bgChoose: BASE + '/p2-bg.jpg',
	clock: BASE + '/p2-clock.png',
	radio: BASE + '/p2-radio.png',
	radioOn: BASE + '/p2-radio-on.png',
	progressLabel: BASE + '/p2-progress-label.png',
	btnConfirm: BASE + '/p2-confirm.png',
	// 第三页：职业探索卡（标题已烘进背景图）
	bgResult: BASE + '/p3-bg.jpg',
	captionType: BASE + '/p3-type-caption.png',
	labelFeature: BASE + '/p3-label-feature.png',
	labelField: BASE + '/p3-label-field.png',
	labelCareer: BASE + '/p3-label-career.png',
	btnSave: BASE + '/p3-save.png',
	// 物品图片按编码取，编码即维度字母
	items: {
		E: BASE + '/p2-item-party-balloon.png',
		I: BASE + '/p2-item-tent.png',
		N: BASE + '/p2-item-crystal-ball.png',
		S: BASE + '/p2-item-geologist-hammer.png',
		T: BASE + '/p2-item-logic-puzzle.png',
		F: BASE + '/p2-item-knit-scarf.png',
		P: BASE + '/p2-item-beach-chair.png',
		J: BASE + '/p2-item-calendar.png'
	},
	letters: {
		E: BASE + '/p3-letter-E.png',
		I: BASE + '/p3-letter-I.png',
		N: BASE + '/p3-letter-N.png',
		S: BASE + '/p3-letter-S.png',
		T: BASE + '/p3-letter-T.png',
		F: BASE + '/p3-letter-F.png',
		J: BASE + '/p3-letter-J.png',
		P: BASE + '/p3-letter-P.png'
	}
}
