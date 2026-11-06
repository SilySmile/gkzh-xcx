// 谁是职场TOP 页面素材：全部由服务器静态目录提供，小程序包内不放大图。
// 目录按内容哈希版本发布（4e6204c2c4d2），素材更新后需同步修改版本号和数据库图片地址。
const BASE = 'https://zhiye.sxgkzh.cn/imgs/sszctop/4e6204c2c4d2'

export const SSZCTOP_ASSETS = Object.freeze({
  // 三页背景：自带页面大标题，页面只叠加交互元素。
  page1Bg: BASE + '/page1-bg.jpg',
  page2Bg: BASE + '/page2-bg.jpg',
  page3Bg: BASE + '/page3-bg.jpg',
  // 第 4 页（个人报告）成功和失败共用同一张干净背景，标题由页面文字渲染。
  page4Bg: BASE + '/page4-bg.jpg',
  logo: BASE + '/logo.png',
  back: BASE + '/back.png',

  // 模式按钮：on 为蓝底白字选中态，off 为白底蓝字未选中态。
  soloOn: BASE + '/btn-solo-on.png',
  soloOff: BASE + '/btn-solo-off.png',
  teamOn: BASE + '/btn-team-on.png',
  teamOff: BASE + '/btn-team-off.png',
  start: BASE + '/btn-start.png',
  confirm: BASE + '/btn-confirm.png',
  know: BASE + '/btn-know.png',
  hintTap: BASE + '/hint-tap.png',

  iconUp: BASE + '/icon-up.png',
  iconDown: BASE + '/icon-down.png',
  iconMinus: BASE + '/icon-minus.png',
  iconCheck: BASE + '/icon-check.png'
})

// 后台未配置图片时的兜底：维度按 code、职业按名称匹配数据库当前数据。
export const SSZCTOP_DIMENSION_IMAGES = Object.freeze({
  steps: BASE + '/dimension-steps.png',
  hours: BASE + '/dimension-hours.png',
  pressure: BASE + '/dimension-pressure.png',
  skill: BASE + '/dimension-skill.png',
  prospect: BASE + '/dimension-prospect.png',
  social: BASE + '/dimension-social.png',
  travel: BASE + '/dimension-travel.png'
})

export const SSZCTOP_CAREER_IMAGES = Object.freeze({
  '人工智能工程师': BASE + '/career-ai-engineer.png',
  '数据分析师': BASE + '/career-data-analyst.png',
  '临床医生': BASE + '/career-clinician.png',
  '企业经理': BASE + '/career-manager.png',
  '新闻记者': BASE + '/career-journalist.png',
  '律师': BASE + '/career-lawyer.png',
  '金融分析师': BASE + '/career-financial-analyst.png',
  '中小学教师': BASE + '/career-teacher.png',
  '农业技术推广员': BASE + '/career-agri-extension.png',
  '视觉设计师': BASE + '/career-designer.png',
  '博物馆讲解员': BASE + '/career-museum-guide.png',
  '综合管理类公务员': BASE + '/career-civil-servant.png'
})
