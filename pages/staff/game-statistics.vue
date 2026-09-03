<template>
	<view class="page">
		<view v-if="game.gameId" class="game-head">
			<text class="game-title">{{ game.title || game.gameType }}</text>
			<text class="game-sub">{{ game.activityTitle }} · {{ game.areaTitle }}</text>
		</view>
		<view class="summary">
			<view><text class="number">{{ game.participantCount || 0 }}</text><text>参与人数</text></view>
			<view><text class="number green">{{ game.completedCount || 0 }}</text><text>已完成</text></view>
			<view><text class="number orange">{{ game.inProgressCount || 0 }}</text><text>进行中</text></view>
			<view><text class="number red">{{ game.failedCount || 0 }}</text><text>未通过</text></view>
		</view>
		<view class="filters">
			<picker :range="collegeOptions" range-key="name" :value="collegeIndex" @change="changeCollege">
				<view class="filter"><text>院系</text><text>{{ collegeOptions[collegeIndex].name }}⌄</text></view>
			</picker>
			<picker :range="majorOptions" range-key="name" :value="majorIndex" @change="changeMajor">
				<view class="filter"><text>专业</text><text>{{ majorOptions[majorIndex].name }}⌄</text></view>
			</picker>
			<picker :range="genderOptions" range-key="name" :value="genderIndex" @change="changeGender">
				<view class="filter"><text>性别</text><text>{{ genderOptions[genderIndex].name }}⌄</text></view>
			</picker>
		</view>
		<view class="view-tabs">
			<view :class="viewMode === 'chart' ? 'active' : ''" @click="changeViewMode('chart')">图表统计</view>
			<view :class="viewMode === 'table' ? 'active' : ''" @click="viewMode = 'table'">学生明细</view>
		</view>
		<view v-if="viewMode === 'chart'" class="chart-card">
			<view class="chart-head">
				<view class="chart-title">{{ chartDimensionName }}人数折线图</view>
				<view class="dimension-tabs">
					<text v-for="item in chartDimensions" :key="item.value" :class="chartDimension === item.value ? 'active' : ''" @click="changeChartDimension(item.value)">{{ item.name }}</text>
				</view>
			</view>
			<scroll-view v-if="lineItems.length" scroll-x class="line-scroll">
				<canvas canvas-id="dimensionLineChart" id="dimensionLineChart" class="line-canvas" :width="chartWidth" height="220" :style="{ width: chartWidth + 'px' }"></canvas>
			</scroll-view>
			<view v-else class="empty-chart">当前筛选条件下暂无图表数据</view>
		</view>
		<view v-else class="table-card">
			<view class="table-title">学生人数统计表</view>
			<scroll-view scroll-x class="table-scroll">
				<view class="table">
					<view class="tr th"><text>姓名</text><text>学号</text><text>院系</text><text>专业</text><text>性别</text><text>状态</text></view>
					<view v-for="student in students" :key="student.studentId" class="tr">
						<text class="student-name">{{ student.studentName || '未填写' }}</text><text>{{ student.studentNo || '未填写' }}</text>
						<text>{{ student.collegeName || '未填写' }}</text><text>{{ student.majorName || '未填写' }}</text>
						<text>{{ genderText(student.gender) }}</text><text :class="statusClass(student.status)">{{ statusText(student.status) }}</text>
					</view>
					<view v-if="!students.length" class="empty-row">当前筛选条件下暂无学生数据</view>
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script>
	import { getStaffGameStatistics } from '@/api/staff.js'
	export default {
		data: () => ({
			gameId: null, game: {}, rows: [], students: [], colleges: [], majors: [], viewMode: 'chart', chartDimension: 'collegeName', chartWidth: 320, collegeIndex: 0, majorIndex: 0, genderIndex: 0,
			chartDimensions: [{ name: '院系', value: 'collegeName' }, { name: '专业', value: 'majorName' }, { name: '性别', value: 'gender' }],
			genderOptions: [{ name: '全部性别', value: '' }, { name: '男', value: '0' }, { name: '女', value: '1' }, { name: '未知', value: '2' }]
		}),
		computed: {
			collegeOptions() { return [{ id: null, name: '全部院系' }].concat(this.colleges) },
			majorOptions() {
				const collegeId = this.collegeOptions[this.collegeIndex] && this.collegeOptions[this.collegeIndex].id
				const list = collegeId == null ? this.majors : this.majors.filter(item => String(item.parentId) === String(collegeId))
				return [{ id: null, name: '全部专业' }].concat(list)
			},
			chartDimensionName() {
				const current = this.chartDimensions.find(item => item.value === this.chartDimension)
				return current ? current.name : '院系'
			},
			lineItems() {
				const formatter = this.chartDimension === 'gender' ? value => this.genderText(value) : value => value || (this.chartDimension === 'collegeName' ? '未填写院系' : '未填写专业')
				return this.chartItems(this.chartDimension, formatter)
			}
		},
		onLoad(options) {
			this.gameId = options.gameId
			if (!this.gameId) return uni.showToast({ title: '缺少游戏编号', icon: 'none' })
			this.load()
		},
		methods: {
			async load() {
				try {
					const college = this.collegeOptions[this.collegeIndex] || {}
					const major = this.majorOptions[this.majorIndex] || {}
					const gender = this.genderOptions[this.genderIndex] || {}
					const filters = {}
					if (college.id != null) filters.collegeId = college.id
					if (major.id != null) filters.majorId = major.id
					if (gender.value !== '') filters.gender = gender.value
					const res = await getStaffGameStatistics(this.gameId, filters)
					this.game = res.data.game || {}; this.rows = res.data.rows || []; this.students = res.data.students || []; this.colleges = res.data.colleges || []; this.majors = res.data.majors || []
					if (this.game.title) uni.setNavigationBarTitle({ title: this.game.title + '统计' })
					this.drawLineChart()
				} catch (e) { uni.showToast({ title: e.message || '统计加载失败', icon: 'none' }) }
			},
			changeCollege(e) { this.collegeIndex = Number(e.detail.value); this.majorIndex = 0; this.load() },
			changeMajor(e) { this.majorIndex = Number(e.detail.value); this.load() },
			changeGender(e) { this.genderIndex = Number(e.detail.value); this.load() },
			genderText(value) { return ({ '0': '男', '1': '女', '2': '未知' })[String(value)] || '未知' },
			statusText(value) { return ({ '0': '进行中', '1': '已完成', '2': '未通过' })[String(value)] || '未知' },
			statusClass(value) { return ({ '0': 'status-progress', '1': 'status-complete', '2': 'status-failed' })[String(value)] || '' },
			changeViewMode(mode) { this.viewMode = mode; if (mode === 'chart') this.drawLineChart() },
			changeChartDimension(value) { this.chartDimension = value; this.drawLineChart() },
			chartItems(field, formatter) {
				const counts = {}
				this.students.forEach(student => {
					const name = formatter(student[field])
					counts[name] = (counts[name] || 0) + 1
				})
				return Object.keys(counts).map(name => ({ name, count: counts[name] })).sort((a, b) => b.count - a.count)
			},
			drawLineChart() {
				if (this.viewMode !== 'chart' || !this.lineItems.length) return
				const system = uni.getSystemInfoSync()
				this.chartWidth = Math.max((system.windowWidth || 375) - 50, this.lineItems.length * 82 + 60)
				this.$nextTick(() => {
					const width = this.chartWidth
					const height = 220
					const left = 38, right = 18, top = 22, bottom = 58
					const plotWidth = width - left - right
					const plotHeight = height - top - bottom
					const maxCount = Math.max.apply(null, this.lineItems.map(item => item.count).concat([1]))
					const yMax = Math.max(4, Math.ceil(maxCount / 4) * 4)
					const ctx = uni.createCanvasContext('dimensionLineChart', this)
					ctx.clearRect(0, 0, width, height)
					ctx.setFontSize(10); ctx.setTextAlign('right'); ctx.setTextBaseline('middle')
					for (let i = 0; i <= 4; i++) {
						const y = top + plotHeight * i / 4
						const value = Math.round(yMax * (4 - i) / 4)
						ctx.setStrokeStyle('#e8eef5'); ctx.setLineWidth(1); ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke()
						ctx.setFillStyle('#8a9aae'); ctx.fillText(String(value), left - 7, y)
					}
					const step = this.lineItems.length > 1 ? plotWidth / (this.lineItems.length - 1) : 0
					const points = this.lineItems.map((item, index) => ({ x: this.lineItems.length > 1 ? left + step * index : left + plotWidth / 2, y: top + plotHeight * (1 - item.count / yMax), item }))
					ctx.setStrokeStyle('#2f80ed'); ctx.setLineWidth(3); ctx.beginPath()
					points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)); ctx.stroke()
					points.forEach(point => {
						ctx.setFillStyle('#fff'); ctx.setStrokeStyle('#2f80ed'); ctx.setLineWidth(2); ctx.beginPath(); ctx.arc(point.x, point.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
						ctx.setTextAlign('center'); ctx.setTextBaseline('bottom'); ctx.setFillStyle('#2f80ed'); ctx.setFontSize(11); ctx.fillText(point.item.count + '人', point.x, point.y - 7)
						ctx.setTextBaseline('top'); ctx.setFillStyle('#52657c'); ctx.setFontSize(10); const label = point.item.name.length > 7 ? point.item.name.slice(0, 7) + '…' : point.item.name; ctx.fillText(label, point.x, height - bottom + 14)
					})
					ctx.draw()
				})
			}
		}
	}
</script>

<style scoped>
	.page { min-height: 100vh; box-sizing: border-box; padding: 28rpx 24rpx 50rpx; background: #f4f7fb; color: #1a2c4a }
	.game-head { padding: 30rpx 32rpx; border-radius: 22rpx; color: #fff; background: linear-gradient(135deg, #2f80ed, #56ccf2) }.game-title { display: block; font-size: 34rpx; font-weight: 700 }.game-sub { display: block; margin-top: 10rpx; color: rgba(255,255,255,.85); font-size: 22rpx }
	.summary { display: flex; margin-top: 22rpx; padding: 26rpx 8rpx; border-radius: 22rpx; background: #fff }.summary view { flex: 1; text-align: center; color: #8a9aae; font-size: 20rpx }.summary view + view { border-left: 1rpx solid #edf1f6 }.summary text { display: block }.number { margin-bottom: 6rpx; color: #1a2c4a; font-size: 30rpx; font-weight: 700 }.green { color: #25ad70 }.orange { color: #f29a38 }.red { color: #e95d68 }
	.filters { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12rpx; margin-top: 22rpx }.filter { padding: 18rpx 15rpx; border-radius: 14rpx; background: #fff; font-size: 21rpx }.filter text { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis }.filter text:first-child { margin-bottom: 6rpx; color: #9aaabd; font-size: 19rpx }
	.view-tabs { display: flex; margin-top: 22rpx; padding: 7rpx; border-radius: 16rpx; background: #e8eef6 }.view-tabs view { flex: 1; padding: 16rpx; border-radius: 12rpx; text-align: center; color: #74869c; font-size: 24rpx }.view-tabs .active { color: #2f80ed; background: #fff; font-weight: 700; box-shadow: 0 3rpx 10rpx rgba(42,83,136,.08) }
	.chart-card { margin-top: 22rpx; padding: 28rpx 20rpx; border-radius: 22rpx; background: #fff }.chart-head { padding: 0 6rpx }.chart-title { font-size: 28rpx; font-weight: 700 }.dimension-tabs { display: flex; margin-top: 20rpx; gap: 12rpx }.dimension-tabs text { flex: 1; padding: 13rpx 8rpx; border-radius: 12rpx; text-align: center; color: #74869c; background: #f1f5fa; font-size: 22rpx }.dimension-tabs .active { color: #fff; background: #2f80ed; font-weight: 700 }.line-scroll { width: 100%; margin-top: 16rpx }.line-canvas { height: 440rpx }.empty-chart { padding: 80rpx 0; text-align: center; color: #9aaabd; font-size: 22rpx }
	.table-card { margin-top: 22rpx; padding: 26rpx 20rpx; border-radius: 22rpx; background: #fff }.table-title { margin: 0 6rpx 18rpx; font-size: 28rpx; font-weight: 700 }.table-scroll { width: 100% }.table { min-width: 900rpx }
	.table { min-width: 1220rpx }.tr { display: grid; grid-template-columns: 150rpx 210rpx 220rpx 260rpx 100rpx 130rpx; align-items: center; min-height: 82rpx; border-bottom: 1rpx solid #edf1f6; color: #52657c; font-size: 22rpx }.tr text { padding: 12rpx; box-sizing: border-box }.th { min-height: 66rpx; border-radius: 12rpx; border-bottom: none; color: #315070; background: #edf5ff; font-weight: 700 }.student-name { color: #1a2c4a; font-weight: 700 }.status-complete { color: #25ad70; font-weight: 700 }.status-progress { color: #f29a38; font-weight: 700 }.status-failed { color: #e95d68; font-weight: 700 }.empty-row { padding: 80rpx 20rpx; text-align: center; color: #9aaabd; font-size: 23rpx }
</style>
