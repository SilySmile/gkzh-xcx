const assert = require('assert')
const fs = require('fs')
const path = require('path')

// 直接执行页面方法，验证信标检测与打印机请求的真实先后顺序。
const source = fs.readFileSync(path.join(__dirname, '../pages/zycck/report.vue'), 'utf8')
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
const body = script
  .replace(/import[\s\S]*?from\s+['"][^'"]+['"]\s*/g, '')
  .replace('export default', 'return')

function makePage(eligibility, scanFails = false) {
  const calls = []
  const component = new Function(
    'ZycckHeader', 'getPrintEligibility', 'listPrinters', 'printReport', 'uni', 'userMessage', body
  )(
    {},
    async () => { calls.push('资格'); return { data: eligibility } },
    async () => { calls.push('打印机'); return { data: [{ printerId: 1, status: 1, enabled: '0', boundStatus: '0' }] } },
    async () => { calls.push('提交'); return { data: { taskId: 1, status: 'submitted' } } },
    { showToast: () => {} },
    error => error.message
  )
  const page = { ...component.data(), ...component.methods }
  page.detectPrintBeacon = async () => {
    calls.push('信标')
    if (scanFails) throw new Error('未进入信标范围')
    return { observedAt: Date.now() }
  }
  page.pollPrintTask = async () => {}
  page.recordId = 1
  return { page, calls }
}

async function main() {
  let result = makePage({ allowed: true, beaconEnabled: true })
  assert.strictEqual(
    result.page.normalizeBeaconUuid('000102030405060708090A0B0C0D0E0F'),
    '00010203-0405-0607-0809-0A0B0C0D0E0F'
  )
  await result.page.openPrint()
  assert.deepStrictEqual(result.calls, ['资格', '信标', '打印机'])
  assert.strictEqual(result.page.printPanelVisible, true)

  result = makePage({ allowed: true, beaconEnabled: true }, true)
  await result.page.openPrint()
  assert.deepStrictEqual(result.calls, ['资格', '信标'])
  assert.strictEqual(result.page.printPanelVisible, false)

  result = makePage({ allowed: true, beaconEnabled: false })
  await result.page.openPrint()
  assert.deepStrictEqual(result.calls, ['资格', '打印机'])
  assert.strictEqual(result.page.printPanelVisible, true)

  result = makePage({ allowed: true, beaconEnabled: true, beaconMaxAgeSeconds: 15 })
  result.page.selectedPrinterId = 1
  result.page.printEligibility = { beaconEnabled: true, beaconMaxAgeSeconds: 15 }
  result.page.beaconEvidence = { observedAt: Date.now() - 20000 }
  await result.page.submitPrint()
  assert.deepStrictEqual(result.calls, ['信标', '提交'])

  // 正式打印直接用普通 BLE 广播；先看到错误 Major，再收到匹配广播才允许选打印机。
  const compact = '000102030405060708090A0B0C0D0E0F'
  const canonical = '00010203-0405-0607-0809-0A0B0C0D0E0F'
  const manufacturerData = Buffer.from('4C000215' + compact + '00010002C5', 'hex')
  const wrongData = Buffer.from('4C000215' + compact + '00090002C5', 'hex')
  const asArrayBuffer = bytes => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  let foundPrintHandler
  let printScanStopped = false
  const uni = {
    openBluetoothAdapter: ({ success }) => success({}),
    onBluetoothDeviceFound: handler => { foundPrintHandler = handler },
    offBluetoothDeviceFound: () => {},
    stopBluetoothDevicesDiscovery: () => { printScanStopped = true },
    startBluetoothDevicesDiscovery: ({ success }) => {
      success({})
      setImmediate(() => {
        foundPrintHandler({ devices: [{ deviceId: 'wrong', RSSI: -70, advertisData: asArrayBuffer(wrongData) }] })
        foundPrintHandler({ devices: [{ deviceId: 'right', RSSI: -90, advertisData: asArrayBuffer(manufacturerData) }] })
        foundPrintHandler({ devices: [{ deviceId: 'right', RSSI: -70, advertisData: asArrayBuffer(manufacturerData) }] })
      })
    }
  }
  const component = new Function(
    'ZycckHeader', 'getPrintEligibility', 'listPrinters', 'printReport', 'uni', 'userMessage', body
  )({}, null, null, null, uni, null)
  const page = { ...component.data(), ...component.methods }
  const evidence = await page.detectPrintBeacon({
    beacons: [{ uuid: compact, major: 1, minor: 2, maxDistance: 4, referenceRssi: 60, pathLossExponent: 2 }],
    beaconScanTimeoutSeconds: 3
  })
  assert.strictEqual(evidence.uuid, canonical)
  assert.strictEqual(evidence.source, 'ble')
  assert(Math.abs(evidence.accuracy - Math.sqrt(10)) < 0.001)
  assert(Math.abs(page.estimateBeaconDistance(-70, { referenceRssi: 60, pathLossExponent: 4 }) - Math.pow(10, 0.25)) < 0.001)
  assert.strictEqual(evidence.advertisData, manufacturerData.toString('hex').toUpperCase())
  assert.strictEqual(printScanStopped, true)

  // 现场 EWD104-BT58 广播：UUID 与配置相同，但 iBeacon 段后还有 16 字节厂商附加数据。
  const fieldHex = '4C000215000102030405060708090A0B0C0D0E0F3412CDAB0016184587CAED700F1234ABCD0603E862'
  const fieldBeacon = page.parseIBeaconAdvertisement(fieldHex)
  assert.strictEqual(fieldBeacon.uuid, canonical)
  assert.strictEqual(fieldBeacon.major, 13330)
  assert.strictEqual(fieldBeacon.minor, 52651)

  // 蓝牙已开而定位关闭时应提示定位；不能再一律要求用户打开蓝牙。
  let shownModal
  const locationOff = {
    getSystemSetting: () => ({ bluetoothEnabled: true, locationEnabled: false }),
    getAppAuthorizeSetting: () => ({ locationAuthorized: 'authorized' }),
    showModal: options => { shownModal = options }
  }
  const locationComponent = new Function(
    'ZycckHeader', 'getPrintEligibility', 'listPrinters', 'printReport', 'uni', 'userMessage', body
  )({}, null, null, null, locationOff, error => error.message)
  const locationPage = { ...locationComponent.data(), ...locationComponent.methods }
  const locationError = locationPage.beaconScanError({ errCode: 11002, errMsg: 'location service unavailable' })
  assert.match(locationError.message, /定位/)
  assert.doesNotMatch(locationError.message, /打开手机蓝牙/)
  assert.strictEqual(locationError.userFacing, true)
  locationPage.showPrintError(locationError, '打印失败')
  assert.match(shownModal.content, /定位/)

  // 蓝牙确实开启而微信返回服务错误时，提示检查微信权限。
  locationOff.getSystemSetting = () => ({ bluetoothEnabled: true, locationEnabled: true })
  const bluetoothServiceError = locationPage.beaconScanError({ errCode: 11001, errMsg: 'bluetooth service unavailable' })
  assert.match(bluetoothServiceError.message, /微信蓝牙服务不可用/)
  assert.match(bluetoothServiceError.message, /11001/)

  // BLE 适配器启动失败时保留给用户的中文提示，不展示诊断面板。
  const failedUni = {
    openBluetoothAdapter: ({ fail }) => fail({ errCode: 10001, errMsg: 'not available' }),
    startBluetoothDevicesDiscovery: () => {},
    onBluetoothDeviceFound: () => {},
    getSystemSetting: () => ({ bluetoothEnabled: true, locationEnabled: true })
  }
  const failedComponent = new Function(
    'ZycckHeader', 'getPrintEligibility', 'listPrinters', 'printReport', 'uni', 'userMessage', body
  )({}, null, null, null, failedUni, null)
  const failedPage = { ...failedComponent.data(), ...failedComponent.methods }
  await assert.rejects(failedPage.detectPrintBeacon({
    beacons: [{ uuid: compact, major: 1, minor: 2, maxDistance: 3 }],
    beaconScanTimeoutSeconds: 3
  }), /蓝牙适配器不可用/)
  console.log('职业探索报告打印流程验证通过')
}

main().catch(error => { console.error(error); process.exitCode = 1 })
