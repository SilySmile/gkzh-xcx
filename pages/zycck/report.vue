<template>
	<scroll-view scroll-y class="page">
		<zycck-header title="探职业" @back="back" />
		<view class="content">
			<view class="report-header">
				<text class="title">我的未来职业探索报告</text>
				<text class="subtitle">以下是你想进一步了解的职业</text>
			</view>

			<view class="chart-card decorated-card">
				<view class="chart-content">
					<text class="chart-title">进一步了解职业的大类比例</text>
					<canvas v-if="categoryStats.length" id="reportPieFinal" canvas-id="reportPieFinal" class="pie" />
					<view v-if="categoryStats.length" class="legend">
						<view v-for="item in categoryStats" :key="item.name" class="legend-item">
							<text class="dot" :style="{ background: item.color }" />
							<text>{{ item.name }} {{ item.percent }}%</text>
						</view>
					</view>
					<text v-else class="chart-empty">暂未加入进一步了解的职业</text>
				</view>
				<view class="decoration-circle decoration-circle-light" />
				<view class="decoration-circle decoration-circle-deep" />
				<image class="corner-icon" src="https://zhiye.sxgkzh.cn/imgs/zycck/xc.png" mode="aspectFit" />
			</view>

			<view class="career-card decorated-card">
				<view class="career-content">
					<view class="career-card-heading">
						<text class="career-list-title">进一步了解的职业</text>
						<text class="count">共 {{ careers.length }} 个</text>
					</view>
					<view v-if="careers.length" class="career-list">
						<view v-for="career in careers" :key="career.careerId" class="career-item">
							<text class="career-name">{{ career.careerName }}</text>
							<text class="career-intro">{{ career.oneLineIntro || '暂无一句话介绍' }}</text>
						</view>
					</view>
					<view v-else-if="!loading" class="empty-copy">
						<text class="empty-title">本次没有加入进一步了解的职业</text>
						<text class="empty-text">本次参与记录已保存。</text>
					</view>
				</view>
				<view class="decoration-circle decoration-circle-light" />
				<view class="decoration-circle decoration-circle-deep" />
				<image class="corner-icon" src="https://zhiye.sxgkzh.cn/imgs/zycck/xc.png" mode="aspectFit" />
			</view>

			<button class="download-button" :loading="downloading" hover-class="button-hover" @click="download">
				下载探索报告PDF
			</button>
			<button class="print-button" :loading="printPreparing || printing" :disabled="printPreparing || printing"
				hover-class="button-hover" @click="openPrint">
				{{ beaconChecking ? '正在检测打印点' : printPreparing ? '正在准备打印' : '打印探索报告' }}
			</button>
			<!-- <text v-if="feedbackPending" class="feedback-tip">探索清单已确认，完成活动反馈后本次游戏才会结束。</text> -->
			<!-- <button class="feedback-button" :disabled="loading" hover-class="button-hover" @click="openActivityFeedback">{{ feedbackPending ? '填写活动反馈并完成游戏' : '活动反馈' }}</button> -->
			<button class="feedback-button" :disabled="loading" hover-class="button-hover" @click="openActivityFeedback">回顾探索，解锁抽奖资格⭐</button>
			<view v-if="printPanelVisible" class="print-mask" @click="closePrint">
				<view class="print-panel" @click.stop>
					<view class="print-panel-title">选择打印机</view>
					<view v-if="printEligibility && printEligibility.beaconEnabled" class="beacon-tip">
						已检测到打印点，可选择打印机；停留过久时提交前会重新检测
					</view>
					<view v-if="!printers.length && !printerLoading" class="print-empty">暂无可用打印机</view>
					<view v-for="printer in printers" :key="printer.printerId" class="printer-option"
						:class="{ selected: selectedPrinterId === printer.printerId }"
						@click="selectedPrinterId = printer.printerId">
						<view>
							<text
								class="printer-name">{{ printer.printerName || printer.cloudName || printer.equipmentSn }}</text>
							<text class="printer-meta">{{ printer.modelName || 'TSPL 标签打印机' }} ·
								{{ printer.statusText || '在线' }}</text>
						</view>
						<text v-if="selectedPrinterId === printer.printerId" class="printer-check">✓</text>
					</view>
					<button class="print-confirm" :loading="printing || beaconChecking"
						:disabled="!selectedPrinterId || printing || beaconChecking"
						@click="submitPrint">{{ beaconChecking ? '正在重新检测打印点' : '开始打印' }}</button>
					<button class="print-cancel" :disabled="printing" @click="closePrint">取消</button>
				</view>
			</view>
		</view>
	</scroll-view>
</template>

<script>
	import {
		getExploration,
		getCatalog,
		listPrinters,
		getPrintEligibility,
		printReport,
		getPrintTask,
		downloadReportPdf,
		userMessage
	} from '@/api/zycck'
	import ZycckHeader from '@/components/ZycckHeader.vue'
	import config from '@/config/api.js'

	export default {
		components: {
			ZycckHeader
		},
		data: () => ({
			recordId: '',
			instanceId: '',
			gameId: '',
			careers: [],
			categoryStats: [],
			loading: false,
			feedbackPending: false,
			downloading: false,
			backing: false,
			printers: [],
			selectedPrinterId: null,
			printPanelVisible: false,
			printerLoading: false,
			printPreparing: false,
			printing: false,
			printPolling: false,
			printEligibility: null,
			beaconEvidence: null,
			beaconChecking: false,
			printBleHandler: null,
			printBleTimer: null,
			printBleFinish: null,
			bleAdapterOpened: false
		}),
		onLoad(o) {
			Object.assign(this, {
				recordId: o.recordId || '',
				instanceId: o.instanceId || '',
				gameId: o.gameId || ''
			})
		},
		// 从反馈页返回后重新读取完成状态，提示与报告始终对应当前记录。
		onShow() { this.load() },
		onUnload() {
			if (this.printBleFinish) this.printBleFinish(this.printBeaconError('页面已离开，打印点扫描已停止'))
			this.stopPrintBleScan()
			if (this.bleAdapterOpened && typeof uni.closeBluetoothAdapter === 'function')
				uni.closeBluetoothAdapter({ fail: () => {} })
			this.bleAdapterOpened = false
		},
		methods: {
			// 反馈属于当前完成报告，沿用记录、活动与游戏编号。
			openActivityFeedback() {
				const query = ['recordId', 'instanceId', 'gameId'].map(key => `${key}=${encodeURIComponent(this[key])}`).join('&')
				uni.navigateTo({ url: `/pages/zycck/activity-feedback?${query}` })
			},
			imageUrl(v) {
				return v && (/^\/(profile|upload)\//.test(v) ? config.BASE_URL + v : v)
			},
			back() {
				if (this.backing) return
				this.backing = true
				const pages = getCurrentPages()
				const fallback = () => {
					const activityId = encodeURIComponent(this.instanceId || uni.getStorageSync('activityId') || '')
					uni.redirectTo({
						url: `/pages/mp/sub-pages/personal-report/index?activityId=${activityId}`
					})
				}
				if (pages.length > 1) {
					uni.navigateBack({
						delta: 1,
						complete: () => {
							this.backing = false
						},
						fail: () => {
							this.backing = false
							fallback()
						}
					})
				} else {
					this.backing = false
					fallback()
				}
			},
			dayItems(career) {
				return String((career && career.dayExample) || '').split(/\r?\n/).filter(Boolean).map(item => {
					const parts = item.split('｜')
					return {
						title: parts.shift() || '',
						description: parts.join('｜')
					}
				})
			},
			async load() {
				this.loading = true
				try {
					const [explorationRes, catalogRes] = await Promise.all([
						getExploration(this.recordId),
						getCatalog({
							instanceId: this.instanceId,
							gameId: this.gameId
						})
					])
					const exploration = explorationRes.data || {}
					const record = exploration.record || {}
					this.feedbackPending = record.stage === 'activity_feedback' && record.status !== 'finished'
					const selected = exploration.items || exploration.explorationItems || []
					const catalog = (catalogRes.data || {}).careers || []
					const cats = (catalogRes.data || {}).categories || []
					const catNames = {}
					cats.forEach(c => {
						catNames[String(c.categoryId)] = c.name
					})
					const byId = {}
					catalog.forEach(item => {
						byId[String(item.careerId || item.careerQuestionId)] = item
					})
					// 报告只展示用户主动加入“进一步了解”的职业。
					// 题目职业和浏览记录属于探索过程，不应混入报告数量或职业清单。
					this.careers = selected.map(item => {
						const id = item.careerId || item.careerQuestionId
						return {
							...item,
							...(byId[String(id)] || {}),
							careerId: id,
							careerName: item.careerName || (byId[String(id)] && byId[String(id)].careerName) ||
								'职业信息'
						}
					})
					const counts = {}
					this.careers.forEach(c => {
						const n = catNames[String(c.categoryId)]
						if (n) counts[n] = (counts[n] || 0) + 1
					})
					const colors = ['#ffadbb', '#fdc7cd', '#fed7da', '#c9d4f7', '#acbfeb']
					const total = Object.keys(counts).reduce((sum, name) => sum + counts[name], 0) || 1
					this.categoryStats = Object.keys(counts).filter(name => counts[name] > 0).map((name, i) => ({
						name,
						count: counts[name],
						percent: Math.round(counts[name] * 100 / total),
						color: colors[i % colors.length]
					}))
					this.$nextTick(() => setTimeout(() => this.drawPie(), 300))
				} catch (e) {
					uni.showToast({
						title: userMessage(e, '探索报告加载失败，请重试'),
						icon: 'none'
					})
				} finally {
					this.loading = false
				}
			},
			drawPie() {
				// 按 canvas 在页面上的真实尺寸计算圆心和半径，避免 rpx 与固定 px 坐标不一致造成裁切。
				uni.createSelectorQuery().in(this).select('#reportPieFinal').boundingClientRect(rect => {
					if (!rect || !rect.width || !rect.height || !this.categoryStats.length) return
					const width = Number(rect.width)
					const height = Number(rect.height)
					const size = Math.min(width, height)
					const cx = width / 2
					const cy = height / 2
					const r = size * .425
					const ctx = uni.createCanvasContext('reportPieFinal', this)
					ctx.clearRect(0, 0, width, height)

					const total = this.categoryStats.reduce((sum, item) => sum + item.count, 0) || 1
					let start = -Math.PI / 2
					this.categoryStats.forEach((item, index) => {
						const end = index === this.categoryStats.length - 1 ?
							-Math.PI / 2 + Math.PI * 2 :
							start + Math.PI * 2 * item.count / total
						ctx.beginPath()
						if (this.categoryStats.length > 1) ctx.moveTo(cx, cy)
						ctx.arc(cx, cy, r, start, end, false)
						if (this.categoryStats.length > 1) ctx.lineTo(cx, cy)
						ctx.closePath()
						ctx.setFillStyle(item.color)
						ctx.fill()
						start = end
					})
					ctx.draw(false)
				}).exec()
			},
			// 先查打印资格，再按需确认处于信标范围内；通过后才加载打印机并展示选择面板。
			async openPrint() {
				if (this.printPreparing || this.printing || this.printerLoading || this.beaconChecking) return
				this.printPreparing = true
				this.printPanelVisible = false
				this.printers = []
				this.selectedPrinterId = null
				this.beaconEvidence = null
				try {
					const eligibilityResult = await getPrintEligibility(this.recordId)
					this.printEligibility = eligibilityResult.data || eligibilityResult || {}
					if (this.printEligibility.allowed === false) throw new Error(this.printEligibility.message ||
						'每位用户只能成功打印一次')
					if (this.printEligibility.beaconEnabled) {
						this.beaconEvidence = await this.detectPrintBeacon(this.printEligibility)
					}
					this.printerLoading = true
					const printerResult = await listPrinters()
					this.printers = (printerResult.data || printerResult || []).filter(item => item.canPrint !==
						false && Number(item.status) === 1 && String(item.enabled) === '0' && String(item
							.boundStatus) === '0')
					if (this.printers.length) this.selectedPrinterId = this.printers[0].printerId
					this.printPanelVisible = true
				} catch (e) {
					this.printPanelVisible = false
					this.beaconEvidence = null
					this.showPrintError(e, '打印准备失败，请稍后重试')
				} finally {
					this.printerLoading = false
					this.printPreparing = false
				}
			},
			closePrint() {
				if (!this.printing) {
					this.printPanelVisible = false
					this.beaconEvidence = null
				}
			},
			// 选择打印机后提交；先前的信标证据过期时重新检测，服务端仍会最终复核。
			async submitPrint() {
				if (!this.selectedPrinterId || this.printing) return
				this.printing = true
				try {
					let beacon = null
					if (this.printEligibility && this.printEligibility.beaconEnabled) {
						const maxAge = Math.max(1, Number(this.printEligibility.beaconMaxAgeSeconds) || 15) * 1000
						if (!this.beaconEvidence || Date.now() - this.beaconEvidence.observedAt >= Math.max(1000,
								maxAge - 2000)) {
							this.beaconEvidence = await this.detectPrintBeacon(this.printEligibility)
						}
						beacon = this.beaconEvidence
					}
					const result = await printReport(this.recordId, this.selectedPrinterId, beacon)
					const task = result.data || result || {}
					if (task.status === 'failed' || task.status === 'cancelled') throw new Error(task.errorMessage ||
						'打印任务提交失败')
					await this.pollPrintTask(task.taskId)
				} catch (e) {
					this.showPrintError(e, '打印任务提交失败，请稍后重试')
				} finally {
					this.printing = false
				}
			},
			// 部分设备提供连续 32 位 UUID；统一为微信信标扫描使用的带连字符格式。
			normalizeBeaconUuid(value) {
				const raw = String(value || '').trim()
				const compact = /^[0-9a-fA-F]{32}$/
				const canonical = /^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$/
				if (!compact.test(raw) && !canonical.test(raw)) return null
				const hex = raw.replace(/-/g, '').toUpperCase()
				return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-')
			},
			// 将 BLE 广播字节转为十六进制，用于和服务端配置的打印点身份比对。
			bluetoothAdvertisementHex(buffer) {
				if (!buffer || typeof buffer.byteLength !== 'number') return ''
				return Array.from(new Uint8Array(buffer)).map(byte => ('0' + byte.toString(16)).slice(-2)).join('').toUpperCase()
			},
			// 标准 iBeacon 厂商数据包含 4C 00 02 15，后面依次是 UUID、Major、Minor、发射功率。
			// 部分设备还附带厂商扩展字节；只解析前面的标准身份字段。
			parseIBeaconAdvertisement(hex) {
				const marker = '4C000215'
				const start = hex.indexOf(marker)
				if (start < 0 || start % 2 !== 0 || hex.length < start + 50) return null
				const data = hex.slice(start + marker.length)
				const id = data.slice(0, 32)
				return {
					uuid: this.normalizeBeaconUuid(id),
					major: parseInt(data.slice(32, 36), 16),
					minor: parseInt(data.slice(36, 40), 16)
				}
			},
			// 本页面生成的错误提示已经是给学生看的中文，避免再被接口的通用错误规则覆盖。
			printBeaconError(message) {
				const error = new Error(message)
				error.userFacing = true
				error.beaconFailure = true
				return error
			},
			// 打印点错误用弹窗显示，避免微信 Toast 截断提示。
			showPrintError(error, fallback) {
				const message = userMessage(error, fallback)
				if (error && error.beaconFailure) {
					uni.showModal({ title: '打印点检测失败', content: message, showCancel: false })
				} else {
					uni.showToast({ title: message, icon: 'none' })
				}
			},
			/**
			 * 微信蓝牙接口失败时按错误码和手机设置给出对应提示。
			 * 普通 BLE 常见 10000/10001；旧版 iBeacon 的 11001/11002 也保留兼容提示。
			 */
			beaconScanError(error) {
				const code = Number(error && error.errCode)
				const detail = String(error && (error.errMsg || error.message) || '')
				let system = {}
				let authorization = {}
				try {
					if (typeof uni.getSystemSetting === 'function') system = uni.getSystemSetting() || {}
				} catch (ignored) {
					// 老版本微信可能没有设置查询接口，继续按扫描错误码判断。
				}
				try {
					if (typeof uni.getAppAuthorizeSetting === 'function') authorization = uni.getAppAuthorizeSetting() || {}
				} catch (ignored) {
					// 权限查询失败不应覆盖真正的信标扫描错误。
				}
				// 仅输出真机控制台，不在学生页面显示诊断面板。
				console.error('打印点蓝牙扫描：接口失败', {
					errCode: error && error.errCode !== undefined ? error.errCode : '未返回',
					errMsg: detail, system, authorization
				})
				if (system.bluetoothEnabled === false) return this.printBeaconError('请打开手机蓝牙后重试')
				if (system.locationEnabled === false) return this.printBeaconError('请打开手机定位后重试，信标扫描需要定位服务')
				if (authorization.bluetoothAuthorized === 'denied') return this.printBeaconError('请在微信的手机权限设置中允许使用蓝牙')
				if (authorization.locationAuthorized === 'denied') return this.printBeaconError('请在微信小程序设置中允许位置信息后重试')
				if (code === 11000 || /\bunsupport\b/i.test(detail)) return this.printBeaconError('当前手机或微信版本不支持蓝牙信标扫描')
				if (code === 10000 || code === 10001) return this.printBeaconError('微信蓝牙适配器不可用，请检查手机蓝牙及微信蓝牙权限（' + code + '）')
				if (code === 11001 || /bluetooth service unavailable/i.test(detail)) return this.printBeaconError('蓝牙已开启但微信蓝牙服务不可用，请检查微信的蓝牙权限（11001）')
				if (code === 11002 || /location service unavailable/i.test(detail)) return this.printBeaconError('请开启手机定位并允许微信使用位置信息（11002）')
				if (code === 11003 || /already start/i.test(detail)) return this.printBeaconError('蓝牙扫描尚未结束，请稍后重试（11003）')
				return this.printBeaconError('打印点扫描启动失败，请检查微信蓝牙和定位权限' + (Number.isFinite(code) && code > 0 ? '（' + code + '）' : ''))
			},
			// A 是 1 米处 RSSI 的正数绝对值，例如实测 -60 dBm 时填 60；n 是环境衰减因子。
			estimateBeaconDistance(rssi, rule) {
				return Math.pow(10, (Math.abs(rssi) - rule.referenceRssi) / (10 * rule.pathLossExponent))
			},
			/**
			 * 使用普通 BLE 扫描取得设备实际广播，解析其中的 iBeacon 厂商数据。
			 * 微信 iBeacon 专用接口持续返回空；这里比对广播身份并根据 RSSI 估算距离。
			 * 普通 BLE 不直接提供米数，服务端还会用相同参数重新计算。
			 */
			async detectPrintBeacon(policy) {
				const rules = policy && Array.isArray(policy.beacons) && policy.beacons.length ? policy.beacons :
					(policy && policy.beaconUuid ? [{ uuid: policy.beaconUuid, major: policy.beaconMajor,
						minor: policy.beaconMinor, maxDistance: policy.beaconMaxDistance }] : [])
				const validRules = rules.filter(rule => rule && this.normalizeBeaconUuid(rule.uuid)).map(rule => ({
					...rule, uuid: this.normalizeBeaconUuid(rule.uuid),
					maxDistance: Number(rule.maxDistance) > 0 ? Number(rule.maxDistance) :
						(Number(policy.beaconMaxDistance) > 0 ? Number(policy.beaconMaxDistance) : 3),
					referenceRssi: Number(rule.referenceRssi) >= 20 && Number(rule.referenceRssi) <= 100 ?
						Number(rule.referenceRssi) : 60,
					pathLossExponent: Number(rule.pathLossExponent) >= 1 && Number(rule.pathLossExponent) <= 6 ?
						Number(rule.pathLossExponent) : 2
				}))
				if (!validRules.length) throw this.printBeaconError('打印点尚未配置信标，请联系管理员')
				if (typeof uni.openBluetoothAdapter !== 'function' ||
					typeof uni.startBluetoothDevicesDiscovery !== 'function' ||
					typeof uni.onBluetoothDeviceFound !== 'function') {
					throw this.printBeaconError('当前环境不支持 BLE 扫描，请使用手机微信小程序')
				}
				this.beaconChecking = true
				const timeout = Math.max(3, Number(policy.beaconScanTimeoutSeconds) || 10) * 1000
				console.log('打印点蓝牙扫描：开始', { rules: validRules, timeoutMs: timeout })
				const call = (name, options = {}) => new Promise((resolve, reject) =>
					uni[name]({ ...options, success: resolve, fail: reject }))
				try {
					if (!this.bleAdapterOpened) {
						await call('openBluetoothAdapter')
						this.bleAdapterOpened = true
					}
					return await new Promise((resolve, reject) => {
						let finished = false
						const done = (error, evidence) => {
							if (finished) return
							finished = true
							this.stopPrintBleScan()
							error ? reject(error) : resolve(evidence)
						}
						this.printBleFinish = done
						this.printBleHandler = result => {
							const devices = Array.isArray(result) ? result : result && Array.isArray(result.devices) ?
								result.devices : result && result.device ? [result.device] : result && result.deviceId ? [result] : []
							devices.filter(Boolean).forEach(device => {
								const hex = this.bluetoothAdvertisementHex(device.advertisData)
								const parsed = this.parseIBeaconAdvertisement(hex)
								const rssi = Number(device.RSSI === undefined ? device.rssi : device.RSSI)
								// 每台设备都记录原始广播和解析结果，方便现场查 UUID、编号及信号问题。
								const logDevice = (reason, extra = {}) => console.log('打印点蓝牙扫描：发现设备', {
									deviceId: device.deviceId || '', name: device.name || device.localName || '',
									rssi: device.RSSI === undefined ? device.rssi : device.RSSI,
									advertisData: hex || '未提供', iBeacon: parsed, reason, ...extra
								})
								if (!parsed) { logDevice('未解析到 iBeacon 厂商数据'); return }
								if (!Number.isInteger(rssi) || rssi > 0 || rssi < -127) { logDevice('RSSI 无效'); return }
								const identity = validRules.filter(rule => rule.uuid === parsed.uuid &&
									(rule.major === null || rule.major === undefined || rule.major === '' || Number(rule.major) === parsed.major) &&
									(rule.minor === null || rule.minor === undefined || rule.minor === '' || Number(rule.minor) === parsed.minor))
								if (!identity.length) { logDevice('UUID、Major 或 Minor 与配置不符'); return }
								const matched = identity.map(rule => ({ rule, distance: this.estimateBeaconDistance(rssi, rule) }))
									.find(item => item.distance <= item.rule.maxDistance)
								if (!matched) {
									logDevice('估算距离超出范围', { candidates: identity.map(rule => ({
										estimatedDistance: this.estimateBeaconDistance(rssi, rule), maxDistance: rule.maxDistance
									})) })
									return
								}
								logDevice('匹配成功', { estimatedDistance: matched.distance,
									maxDistance: matched.rule.maxDistance })
								done(null, { source: 'ble', uuid: parsed.uuid, major: parsed.major, minor: parsed.minor,
									rssi, accuracy: matched.distance, advertisData: hex, observedAt: Date.now() })
							})
						}
						uni.onBluetoothDeviceFound(this.printBleHandler)
						this.printBleTimer = setTimeout(() => {
							console.warn('打印点蓝牙扫描：超时', { timeoutMs: timeout })
							done(this.printBeaconError('未检测到范围内的打印点，请靠近打印点后重试'))
						}, timeout)
						call('startBluetoothDevicesDiscovery', { allowDuplicatesKey: true }).catch(error => done(this.beaconScanError(error)))
					})
				} catch (error) {
					throw error && error.beaconFailure ? error : this.beaconScanError(error)
				} finally {
					this.stopPrintBleScan()
					this.beaconChecking = false
				}
			},
			// 结束正式打印扫描并解除监听；适配器留给提交前复扫，页面退出时再关闭。
			stopPrintBleScan() {
				if (this.printBleTimer) clearTimeout(this.printBleTimer)
				this.printBleTimer = null
				if (this.printBleHandler && typeof uni.offBluetoothDeviceFound === 'function')
					uni.offBluetoothDeviceFound(this.printBleHandler)
				this.printBleHandler = null
				this.printBleFinish = null
				if (this.bleAdapterOpened && typeof uni.stopBluetoothDevicesDiscovery === 'function')
					uni.stopBluetoothDevicesDiscovery({ fail: () => {} })
			},
			// 短时轮询汉印云任务状态；超过等待时间后任务仍会由回调继续同步。
			async pollPrintTask(taskId) {
				if (!taskId) throw new Error('打印任务提交失败')
				this.printPolling = true
				try {
					for (let i = 0; i < 12; i++) {
						const result = await getPrintTask(taskId)
						const task = result.data || result || {}
						if (task.status === 'success') {
							this.printPanelVisible = false
							uni.showToast({
								title: '打印任务已完成',
								icon: 'success'
							})
							return
						}
						if (task.status === 'failed' || task.status === 'cancelled') throw new Error(task
							.errorMessage || '打印失败，请检查打印机状态')
						await new Promise(resolve => setTimeout(resolve, 1500))
					}
					uni.showToast({
						title: '打印任务已提交，请稍后查看',
						icon: 'none'
					})
				} finally {
					this.printPolling = false
				}
			},
			async download() {
				if (this.downloading) return
				this.downloading = true
				try {
					uni.showLoading({
						title: '生成 PDF'
					})
					const result = await downloadReportPdf({
						recordId: this.recordId
					})
					const path = result.tempFilePath || result.filePath
					if (!path) throw new Error('PDF 下载失败')
					uni.openDocument({
						filePath: path,
						showMenu: true,
						fileType: 'pdf'
					})
				} catch (e) {
					uni.showToast({
						title: userMessage(e, 'PDF 下载失败，请稍后重试'),
						icon: 'none'
					})
				} finally {
					uni.hideLoading()
					this.downloading = false
				}
			}
		}
	}
</script>

<style scoped>
	.page {
		height: 100vh;
		border-top: 4rpx solid #a66da4;
		background: linear-gradient(180deg, #d0b6d2 0%, #d0b6d2 25%, #d7c4dc 47%, #e4ddea 72%, #ebebf4 86%, #ebebf4 100%);
	}

	.content {
		box-sizing: border-box;
		min-height: calc(100vh - 108rpx);
		padding: 37rpx 30rpx 68rpx;
		animation: pageIn .35s ease-out;
	}

	.report-header {
		transform: translateY(-8rpx);
		text-align: center;
		margin-bottom: 48rpx;
	}

	.title,
	.subtitle,
	.chart-title,
	.chart-empty,
	.career-list-title,
	.count,
	.career-name,
	.career-intro,
	.empty-title,
	.empty-text {
		display: block;
	}

	.title {
		font-size: 48rpx;
		font-weight: 800;
		line-height: 1.3;
		color: #07070a;
	}

	.subtitle {
		margin-top: 36rpx;
		font-size: 29rpx;
		line-height: 1.45;
		color: #77747c;
	}

	.decorated-card {
		position: relative;
		overflow: hidden;
		box-sizing: border-box;
		width: 100%;
		border-radius: 24rpx;
		background: #fff;
	}

	.chart-card {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 668rpx;
		padding: 42rpx 60rpx 98rpx;
		margin-bottom: 48rpx;
		text-align: center;
	}

	.chart-content,
	.career-content {
		position: relative;
		z-index: 3;
		width: 100%;
	}

	.chart-title {
		font-size: 30rpx;
		font-weight: 800;
		line-height: 1.4;
		color: #29252d;
	}

	.pie {
		display: block;
		width: 300rpx;
		height: 300rpx;
		margin: 24rpx auto 20rpx;
		border: 0;
		outline: 0;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 14rpx 22rpx;
	}

	.legend-item {
		display: flex;
		align-items: center;
		font-size: 23rpx;
		line-height: 1.4;
		color: #6f6a74;
	}

	.dot {
		width: 18rpx;
		height: 18rpx;
		margin-right: 7rpx;
		border-radius: 50%;
	}

	.chart-empty {
		padding: 150rpx 0;
		font-size: 25rpx;
		color: #8a8690;
	}

	.career-card {
		min-height: 195rpx;
		padding: 28rpx 150rpx 38rpx 31rpx;
		margin-bottom: 30rpx;
	}

	.career-card-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 18rpx;
	}

	.career-list-title {
		font-size: 29rpx;
		font-weight: 800;
		color: #252229;
	}

	.count {
		font-size: 22rpx;
		color: #8a8690;
	}

	.career-list {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 15rpx 24rpx;
	}

	.career-item {
		min-width: 0;
		padding-left: 16rpx;
		border-left: 5rpx solid #d0b6d2;
	}

	.career-name {
		overflow: hidden;
		font-size: 24rpx;
		font-weight: 700;
		line-height: 1.4;
		color: #3b3740;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.career-intro {
		display: -webkit-box;
		overflow: hidden;
		margin-top: 5rpx;
		font-size: 20rpx;
		line-height: 1.4;
		color: #89848e;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
	}

	.empty-title {
		font-size: 25rpx;
		font-weight: 700;
		color: #4c4751;
	}

	.empty-text {
		margin-top: 8rpx;
		font-size: 22rpx;
		color: #8a8690;
	}

	.decoration-circle {
		position: absolute;
		z-index: 0;
		border-radius: 50%;
	}

	.decoration-circle-light {
		right: 59rpx;
		bottom: -75rpx;
		width: 132rpx;
		height: 132rpx;
		background: #f5f1f7;
	}

	.decoration-circle-deep {
		right: -58rpx;
		bottom: -65rpx;
		width: 144rpx;
		height: 144rpx;
		background: #f2e9f3;
	}

	.corner-icon {
		position: absolute;
		right: 0;
		bottom: -8rpx;
		z-index: 2;
		width: 112rpx;
		height: 112rpx;
	}

	.download-button {
		width: 100%;
		height: 80rpx;
		padding: 0;
		margin: 0;
		border: 0;
		border-radius: 12rpx;
		background: #28b28b;
		color: #fff;
		font-size: 33rpx;
		font-weight: 400;
		line-height: 80rpx;
	}

	.download-button::after {
		border: 0;
	}

	.print-button,
	.feedback-button {
		box-sizing: border-box;
		width: 100%;
		height: 76rpx;
		padding: 0;
		margin-top: 18rpx;
		border: 1rpx solid #28b28b;
		border-radius: 38rpx;
		background: #fff;
		color: #28a77f;
		font-size: 29rpx;
		line-height: 76rpx;
	}

	.feedback-tip {
		display: block;
		margin-top: 24rpx;
		color: #7d5885;
		font-size: 25rpx;
		line-height: 1.7;
		text-align: center;
	}

	.print-mask {
		position: fixed;
		z-index: 20;
		inset: 0;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		background: rgba(26, 20, 31, .38);
	}

	.print-panel {
		box-sizing: border-box;
		width: 100%;
		padding: 36rpx 30rpx calc(28rpx + env(safe-area-inset-bottom));
		border-radius: 32rpx 32rpx 0 0;
		background: #fff;
	}

	.print-panel-title {
		margin-bottom: 24rpx;
		color: #1c1920;
		font-size: 34rpx;
		font-weight: 700;
		text-align: center;
	}

	.beacon-tip {
		padding: 18rpx 22rpx;
		margin-bottom: 20rpx;
		border-radius: 14rpx;
		background: #fff7e8;
		color: #9a651d;
		font-size: 23rpx;
		line-height: 1.5;
	}

	.printer-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		box-sizing: border-box;
		min-height: 86rpx;
		padding: 16rpx 22rpx;
		margin-bottom: 14rpx;
		border: 1rpx solid #e8e1e9;
		border-radius: 16rpx;
		background: #fff;
	}

	.printer-option.selected {
		border-color: #28b28b;
		background: #effaf5;
	}

	.printer-name,
	.printer-meta {
		display: block;
	}

	.printer-name {
		color: #211c23;
		font-size: 28rpx;
	}

	.printer-meta {
		margin-top: 6rpx;
		color: #8d858f;
		font-size: 22rpx;
	}

	.printer-check {
		color: #28b28b;
		font-size: 34rpx;
		font-weight: 700;
	}

	.print-empty {
		padding: 38rpx 0;
		color: #938b94;
		font-size: 25rpx;
		text-align: center;
	}

	.print-confirm,
	.print-cancel {
		width: 100%;
		height: 72rpx;
		padding: 0;
		margin: 16rpx 0 0;
		border-radius: 36rpx;
		font-size: 28rpx;
		line-height: 72rpx;
	}

	.print-confirm {
		border: 0;
		background: #28b28b;
		color: #fff;
	}

	.print-cancel {
		border: 1rpx solid #dfd9e0;
		background: #fff;
		color: #5d565f;
	}

	.button-hover {
		opacity: .82;
	}

	@keyframes pageIn {
		from {
			opacity: 0;
			transform: translateY(18rpx);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
