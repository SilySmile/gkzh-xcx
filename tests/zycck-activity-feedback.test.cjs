const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const root = path.join(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const plain = value => JSON.parse(JSON.stringify(value))

// 直接执行正式页面使用的规则和请求模块，覆盖互斥、数量限制及业务失败处理。
const helper = vm.runInNewContext(read('utils/zycck-activity-feedback.js').replace(/export /g, '') + '\n({ toggleFeedbackOption, validateFeedbackAnswers })')
const multiple = no => ({ questionNo: no, type: 'multiple', maxSelections: 3, exclusiveOption: 'NONE',
  options: ['A', 'B', 'C', 'D', 'NONE', 'OTHER'].map(code => ({ code, label: code })) })
const first = multiple(1), third = multiple(3)
assert.deepEqual(plain(helper.toggleFeedbackOption(first, ['A', 'B'], 'NONE').selected), ['NONE'])
assert.deepEqual(plain(helper.toggleFeedbackOption(first, ['NONE'], 'A').selected), ['A'])
assert.deepEqual(plain(helper.toggleFeedbackOption(first, ['A', 'B', 'C'], 'A').selected), ['B', 'C'])
assert.match(helper.toggleFeedbackOption(first, ['A', 'B', 'C'], 'D').error, /最多选择3项/)
const answers = { question1Answers: ['A'], question3Answers: ['NONE'], question2Answer: '', question1Other: '' }
assert.equal(helper.validateFeedbackAnswers([first, third], answers), '')
const second = { questionNo: 2, type: 'single', maxSelections: 1, options: [{ code: 'A' }] }
assert.equal(helper.validateFeedbackAnswers([first, second, third], answers), '请回答第2题')
assert.match(helper.validateFeedbackAnswers([first, third], { ...answers, question1Answers: ['OTHER'] }), /请填写第1题/)
assert.match(helper.validateFeedbackAnswers([first, third], { ...answers, question3Answers: ['NONE', 'A'] }), /不能与其他/)

let response, captured, requestCount = 0, navigationError = false
const apiCode = read('api/zycck.js').replace(/^import .*$/gm, '').replace(/export /g, '')
const api = vm.runInNewContext(apiCode + '\n({ getActivityFeedback, saveActivityFeedback })', {
  request: async options => { requestCount++; captured = options; return response }, config: {}
})

async function main() {
  response = { code: 500, msg: '第1题请选择1至3项' }
  await assert.rejects(api.saveActivityFeedback('11', { instanceId: '22', gameId: '33' }, answers), /第1题请选择1至3项/)
  assert.equal(captured.url, '/api/zycck/records/11/activity-feedback')
  assert.equal(captured.method, 'POST')
  assert.deepEqual(plain(captured.params), { instanceId: '22', gameId: '33' })
  response = { code: 500, msg: '活动反馈已提交，不可再次修改' }
  await assert.rejects(api.saveActivityFeedback('11', { instanceId: '22', gameId: '33' }, answers), /活动反馈已提交，不可再次修改/)
  response = { code: 200, data: { submitted: true, gameFinished: true, questions: [first, third], answers } }
  assert.equal((await api.getActivityFeedback('11', { instanceId: '22', gameId: '33' })).data.submitted, true)

  const pageScript = read('pages/zycck/activity-feedback.vue').match(/<script>([\s\S]*?)<\/script>/)[1]
  // 页面脚本可能使用带缩进和换行的 import 语句，整体移除后再注入桩依赖。
  const page = vm.runInNewContext(pageScript.replace(/^[ \t]*import\s+(?:[\s\S]*?\s+from\s+)?['"][^'"]+['"];?[ \t]*$/gm, '').replace('export default', 'module.exports ='), {
    module: {}, ZycckHeader: {}, ...helper,
    getActivityFeedback: api.getActivityFeedback, saveActivityFeedback: api.saveActivityFeedback,
    userMessage: (error, fallback) => error.message || fallback,
    getCurrentPages: () => [{ route: 'pages/zycck/report' }, { route: 'pages/zycck/activity-feedback' }],
    uni: { showToast: value => notices.push(value), navigateBack: value => {
      if (navigationError) throw new Error('navigateBack failed')
      navigations.push(value)
    } }
  })
  // runInNewContext 返回赋值表达式得到页面对象。
  const model = page.data()
  for (const [name, method] of Object.entries(page.methods)) model[name] = method.bind(model)
  model.recordId = '11'; model.instanceId = '22'; model.gameId = '33'
  await model.load()
  assert.equal(model.questions.length, 2)
  assert.equal(model.submitted, true)
  assert.equal(model.loading, false)
  const readOnlyAnswers = plain(model.answers), readOnlyRequests = requestCount
  model.choose(first, 'B')
  await model.submit()
  assert.deepEqual(plain(model.answers), readOnlyAnswers, '已提交反馈不能修改选项')
  assert.equal(requestCount, readOnlyRequests, '已提交反馈不能再次请求提交接口')
  response = { code: 200, data: { submitted: false, questions: [first, third], answers } }
  await model.load()
  response = { code: 500, msg: '第3题请选择1至3项' }
  const noticeCount = notices.length
  await model.submit()
  assert.equal(notices.length, noticeCount + 1)
  assert.match(notices.at(-1).title, /第3题/)
  assert.equal(notices.at(-1).icon, 'none')
  assert.equal(model.submitting, false)
  assert.equal(navigations.length, 0)
  response = { code: 200, data: {} }
  await model.load()
  assert.match(model.loadError, /未加载完整/)
  assert.equal(model.loading, false)
  response = { code: 200, data: { submitted: false, gameFinished: false, questions: [first, third], answers } }
  await model.load()
  assert.equal(model.loadError, '')
  assert.equal(model.submitted, false)
  assert.equal(model.questions.length, 2)
  // 保存成功不依赖返回完整问卷或严格布尔值，兼容精简响应及旧服务返回。
  for (const data of [undefined, {}, { submitted: true, gameFinished: 'true' }, { gameFinished: false }]) {
    model.submitted = false
    response = { code: 200, data }
    const before = navigations.length
    await model.submit()
    assert.equal(navigations.length, before + 1)
    assert.equal(navigations.at(-1).delta, 1)
    assert.equal(model.submitted, true)
    assert.equal(notices.at(-1).icon, 'success')
    assert.equal(notices.at(-1).title, '活动反馈已提交')
  }
  model.submitted = false
  navigationError = true
  await assert.rejects(model.submit(), /navigateBack failed/)
  assert.equal(model.submitted, true, '返回失败不影响已经提交的只读状态')
  assert.equal(notices.at(-1).icon, 'success', '返回异常不能误报保存失败')
  console.log('活动反馈：问卷规则、失败提示、成功响应兼容、返回异常与保存分离、提交后只读回归通过')
}
const notices = []
const navigations = []
main().catch(error => { console.error(error); process.exitCode = 1 })
