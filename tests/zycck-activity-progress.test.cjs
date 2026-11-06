const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

function component(file) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
  const body = source.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/import[\s\S]*?from\s+['"][^'"]+['"]\s*/g, '')
    .replace('export default', 'return')
  return new Function(body)()
}

// 页面每次展示都读取新进度，避免从反馈页返回仍沿用旧水印。
for (const [file, method, context] of [
  ['pages/mp/sub-pages/career-week/index.vue', 'fetchTaskData', {}],
  ['pages/mp/sub-pages/personal-report/index.vue', 'loadGames', { activityId: '3' }],
  ['pages/activity/week.vue', 'loadFlow', { instanceId: '3' }]
]) {
  const page = component(file)
  let calls = 0
  const model = { ...context, [method]: () => calls++ }
  page.onShow.call(model)
  page.onShow.call(model)
  assert.equal(calls, 2, `${file} 返回后必须刷新进度`)
}

// 未反馈时不出现完成水印；重新查询反馈完成后的响应才改变状态。
const page = component('pages/mp/sub-pages/career-week/index.vue')
const model = { leftGroups: [], rightGroups: [] }
const flow = isFinish => [{ areaId: 7, title: '探索区', games: [{ gameId: 4, gameType: 'zycck', title: '职业猜猜看', isFinish }] }]
page.methods.applyFlowData.call(model, flow(false))
assert.equal(model.leftGroups[0].tasks[0].isFinish, false)
page.methods.applyFlowData.call(model, flow(true))
assert.equal(model.leftGroups[0].tasks[0].isFinish, true)
page.methods.applyFlowData.call(model, flow(false))
assert.equal(model.leftGroups[0].tasks[0].isFinish, false, '旧完成水印必须可被新进度清除')
console.log('活动进度：每次展示刷新、待反馈不显示完成、提交后刷新完成回归通过')
