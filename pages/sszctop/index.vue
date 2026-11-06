<template>
	<view class="page">
		<!-- 背景图自带页面大标题，交互元素叠加在上方 -->
		<image class="page-bg" mode="scaleToFill" :style="{ height: bgHeight }" :src="bgImage" />
		<view class="header" :style="{ paddingTop: statusBarHeight + 'px' }">
			<image class="back-icon" :src="assets.back" mode="aspectFit" @click="back" />
			<image class="logo" :src="assets.logo" mode="aspectFit" />
			<view class="header-placeholder"></view>
		</view>

		<view v-if="loading" class="loading">加载中…</view>

		<!-- 第 1 页：选择参赛方式 -->
		<view v-else-if="!room" class="home">
			<view class="home-actions">
				<view class="mode-row">
					<image class="mode-btn" mode="aspectFit" :src="mode === 'solo' ? assets.soloOn : assets.soloOff"
						@click="pickMode('solo')" />
					<image class="mode-btn" mode="aspectFit" :src="mode === 'team' ? assets.teamOn : assets.teamOff"
						@click="pickMode('team')" />
				</view>
				<image class="start-btn" mode="aspectFit" :src="assets.start" @click="create" />
			</view>
		</view>

		<!-- 第 2 页：选择挑战维度；组队时同页展示队伍状态 -->
		<view v-else-if="room.status === 'waiting'" class="stage">
			<view v-if="room.mode === 'team'" class="team-strip">
				<view class="team-head">
					<text class="room-code">房间号：{{ room.roomCode }}</text>
					<text class="team-count">{{ room.members.length }}/4 人</text>
				</view>
				<view class="member-chips">
					<view v-for="m in room.members" :key="m.userId" class="chip"
						:class="{ ready: m.userId === room.ownerUserId || m.confirmStatus === 'ready' }">
						<text class="chip-name">{{ m.studentName }}{{ m.userId === room.ownerUserId ? '（房主）' : '' }}</text>
						<text class="chip-state">{{ m.userId === room.ownerUserId ? '负责开始' : (m.confirmStatus === 'ready' ? '已准备' : '未准备') }}</text>
					</view>
				</view>
			</view>

			<view class="dimension-grid">
				<view v-for="d in dimensions" :key="d.dimensionId" class="dimension-card"
					:class="{ selected: String(dimensionId) === String(d.dimensionId) }" @click="showDimension(d)">
					<image class="dimension-img" mode="widthFix" :src="dimensionImage(d)" />
					<text class="dimension-hint">点击查看维度说明</text>
				</view>
			</view>

			<view class="stage-actions">
				<image v-if="(room.mode !== 'team' || isOwner) && dimensionId" class="start-btn" mode="aspectFit"
					:class="{ disabled: starting }" :src="assets.start" @click="start" />
				<image v-else-if="room.mode !== 'team' || isOwner" class="hint-img" mode="widthFix"
					:src="assets.hintTap" />
				<view v-else class="waiting-tip">等待房主选择维度并开始游戏</view>

				<view v-if="room.mode === 'team' && !isOwner" class="ready-btn" :class="{ on: isReady }"
					@click="toggleReady">{{ isReady ? '取消准备' : '准备' }}</view>
				<text v-if="room.mode === 'team' && isOwner && (!allReady || room.members.length < 2)"
					class="start-tip">请等待至少 1 名队员加入并准备完成</text>
				<text v-if="room.mode === 'team'" class="leave-line" @click="leave">退出房间</text>
			</view>
		</view>

		<!-- 第 3 页：职业排序 -->
		<view v-else-if="room.status === 'playing'" class="stage game-stage">
			<view class="dimension-bar" @click="showDimension(room.dimension)">
				<text>当前维度：</text>
				<text class="dimension-name">{{ room.dimension.name }}</text>
				<text class="dimension-more">（点击查看维度说明）</text>
			</view>

			<view class="career-panel">
				<view class="career-grid">
					<view v-for="c in careers" :key="c.careerId" class="career-card"
						:class="{ chosen: isChosen(c), locked: locks[c.careerId] }" @click="toggleCareer(c)">
						<image class="career-img" mode="widthFix" :src="careerImage(c)" />
						<view class="select-dot" :class="{ checked: isChosen(c) }">
							<image v-if="isChosen(c)" class="check-icon" :src="assets.iconCheck" mode="aspectFit" />
						</view>
						<text v-if="locks[c.careerId]" class="lock-tip">{{ locks[c.careerId] }}调整中</text>
					</view>
				</view>
			</view>

			<view class="sort-head">
				<text class="sort-title">排序框</text>
				<text class="sort-count">{{ ordered.length }}/3</text>
			</view>
			<view class="sort-box">
				<view v-for="(c, i) in ordered" :key="c.careerId" class="sort-row">
					<text class="rank">{{ i + 1 }}</text>
					<view class="row-main" :class="{ dragging: draggingCareerId === c.careerId }"
						@touchstart="dragStart('order', i, c)" @touchmove="dragMove" @touchend="dragEnd"
						@touchcancel="dragEnd">
						<text class="row-name">{{ c.name }}</text>
					</view>
					<image class="row-icon" :class="{ disabled: i === 0 }" mode="aspectFit" :src="assets.iconUp"
						@click.stop="moveCareer(i, -1)" />
					<image class="row-icon" :class="{ disabled: i === ordered.length - 1 }" mode="aspectFit"
						:src="assets.iconDown" @click.stop="moveCareer(i, 1)" />
					<image class="row-icon minus" mode="aspectFit" :src="assets.iconMinus"
						@click.stop="removeFromOrder(c)" />
				</view>
				<text v-if="!ordered.length" class="sort-empty">从上方的职业卡片中选择 3 个</text>
			</view>
			<text class="tip">从上方 12 个职业中选择 3 个，按住排序框中的职业卡可调整顺序。</text>

			<image class="confirm-btn" mode="aspectFit" :class="{ disabled: ordered.length !== 3 || confirming }"
				:src="assets.confirm" @click="confirm" />

			<view v-if="room.mode === 'team'" class="member-panel">
				<text class="member-title">队内成员状态</text>
				<view v-for="m in room.members" :key="m.userId" class="member-row">
					<text class="member-name">{{ m.studentName }}{{ m.userId === room.ownerUserId ? '（房主）' : '' }}</text>
					<text class="member-state" :class="{ done: m.confirmStatus === 'confirmed' }">{{ m.confirmStatus === 'confirmed' ? '已确认' : '排序中' }}</text>
				</view>
			</view>
		</view>

		<!-- 结算后直接跳转个人报告，中转页只显示简短提示 -->
		<view v-else class="loading">正在生成个人报告…</view>

		<!-- 维度说明弹窗 -->
		<view v-if="dimensionVisible" class="mask" @click="dimensionVisible = false">
			<view class="dialog dimension-dialog" @click.stop>
				<image v-if="selectedDimension.dimensionId" class="dialog-dimension-img" mode="widthFix"
					:src="dimensionImage(selectedDimension)" />
				<text class="dialog-title">{{ selectedDimension.name }}</text>
				<scroll-view scroll-y class="dialog-desc-wrap">
					<text class="dialog-desc">{{ selectedDimension.description || '暂无说明' }}</text>
				</scroll-view>
				<image class="dialog-btn" mode="aspectFit" :src="assets.know" @click="dimensionVisible = false" />
			</view>
		</view>

		<!-- 组队入房弹窗 -->
		<view v-if="joinDialog" class="mask" @click="joinDialog = false">
			<view class="dialog join-dialog" @click.stop>
				<text class="dialog-title">组队游玩</text>
				<text class="join-tip">输入队友的 6 位房间号加入，也可以创建新房间邀请队友。</text>
				<input class="join-input" v-model="joinCode" type="number" maxlength="6" placeholder="请输入 6 位房间号" />
				<view class="join-actions">
					<view class="join-btn primary" @click="join">加入房间</view>
					<view class="join-btn" @click="createTeam">创建新房间</view>
				</view>
				<text class="join-cancel" @click="joinDialog = false">取消</text>
			</view>
		</view>
	</view>
</template>

<script>
	import config from '@/config/api.js'
	import {
		SSZCTOP_ASSETS,
		SSZCTOP_DIMENSION_IMAGES,
		SSZCTOP_CAREER_IMAGES
	} from '@/config/sszctop-assets.js'
	import {
		getCatalog,
		createRoom,
		joinRoom,
		getRoom,
		startRoom,
		readyRoom,
		updateOrder,
		confirmRoom,
		leaveRoom,
		socketTicket
	} from '@/api/sszctop'
	import {
		redirectToActivityWeek
	} from '@/utils/activity'

	export default {
		data() {
			return {
				assets: SSZCTOP_ASSETS,
				statusBarHeight: 20,
				loading: true,
				gameId: null,
				activityId: null,
				mode: 'solo',
				joinCode: '',
				inviteCode: '',
				room: null,
				dimensions: [],
				dimensionId: null,
				selectedDimension: {},
				dimensionVisible: false,
				joinDialog: false,
				ordered: [],
				available: [],
				socket: null,
				socketMode: null,
				socketConnected: false,
				heart: null,
				locks: {},
				drag: null,
				draggingCareerId: null,
				orderSyncing: false,
				syncAgain: false,
				syncTimer: null,
				// 防止房主连续点击导致重复发起开始请求。
				starting: false,
				creating: false,
				confirming: false,
				confirmAfterSync: false,
				routingReport: false
			}
		},
		computed: {
			bgImage() {
				if (this.room && this.room.status === 'playing') return this.assets.page3Bg
				if (this.room) return this.assets.page2Bg
				return this.assets.page1Bg
			},
			// 背景图按设计稿 750 宽度等比换算，显式给高度避免部分基础库 widthFix 计算为 0。
			bgHeight() {
				if (this.room && this.room.status === 'playing') return '2063rpx'
				return '1623rpx'
			},
			careers() {
				return (this.room && this.room.careers) || []
			},
			currentMember() {
				return this.room && (this.room.members || []).find(m => String(m.userId) === String(this.room
					.currentUserId))
			},
			isReady() {
				return !!(this.currentMember && this.currentMember.confirmStatus === 'ready')
			},
			isOwner() {
				return !!(this.room && String(this.room.currentUserId) === String(this.room.ownerUserId))
			},
			allReady() {
				return !!(this.room && this.room.members && this.room.members.length >= 2 && this.room.members.filter(m =>
					String(m.userId) !== String(this.room.ownerUserId)).every(m => m
					.confirmStatus === 'ready'))
			}
		},
		onLoad(o) {
			try {
				this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20
			} catch (e) {
				this.statusBarHeight = 20
			}
			this.gameId = o.gameId;
			this.activityId = o.activityId || o.instanceId || '';
			this.inviteCode = o.roomCode || '';
			getCatalog().then(r => {
				this.dimensions = r.data || [];
				this.loading = false;
				if (this.inviteCode) {
					this.mode = 'team';
					this.joinCode = this.inviteCode;
					this.join()
				}
			})
		},
		onUnload() {
			if (this.syncTimer) clearTimeout(this.syncTimer)
			this.syncTimer = null
			this.closeSocket()
		},
		onShareAppMessage() {
			return this.room && this.room.mode === 'team' ? {
				title: '邀请你加入谁是职场TOP房间',
				path: '/pages/sszctop/index?activityId=' + this.activityId + '&instanceId=' + this.activityId + '&gameId=' + this.room.gameId + '&gameType=sszctop&roomCode=' + this.room.roomCode
			} : {
				title: '谁是职场TOP'
			}
		},
		methods: {
			/** 后台上传的图片可能是 /profile 相对路径，小程序需补全服务器地址。 */
			resolveImage(value) {
				if (!value) return ''
				if (/^https?:\/\//i.test(value) || value.indexOf('data:') === 0) return value
				return config.BASE_URL + (value.charAt(0) === '/' ? value : '/' + value)
			},
			/** 维度图片优先用后台配置，未配置时按维度编码回退到内置素材。 */
			dimensionImage(d) {
				if (!d) return ''
				return this.resolveImage(d.imageUrl || SSZCTOP_DIMENSION_IMAGES[d.code] || '')
			},
			/** 职业图片优先用后台配置，未配置时按职业名称回退到内置素材。 */
			careerImage(c) {
				if (!c) return ''
				return this.resolveImage(c.imageUrl || SSZCTOP_CAREER_IMAGES[c.name] || '')
			},
			pickMode(mode) {
				this.mode = mode
				if (mode === 'team') {
					this.joinCode = ''
					this.joinDialog = true
				} else {
					this.joinDialog = false
				}
			},
			createTeam() {
				this.mode = 'team'
				this.joinDialog = false
				this.create()
			},
			setRoom(r) {
				if (r.code !== 200) return uni.showToast({
					title: r.msg || '操作失败',
					icon: 'none'
				});
				this.room = r.data;
				this.dimensionId = this.room.dimensionId || this.dimensionId;
				const careers = this.room.careers || [];
				const ids = this.room.sharedOrderIds || [];
				this.ordered = ids.map(id => careers.find(c => String(c.careerId) === String(id))).filter(Boolean);
				this.available = careers.filter(c => !this.ordered.some(x => String(x.careerId) === String(c.careerId)));
				// 成功和失败都是不可重玩的终局，直接进入每位成员独立的最终报告。
				if ((this.room.status === 'passed' || this.room.status === 'failed') && !this.routingReport) {
					this.routingReport = true;
					this.closeSocket();
					uni.redirectTo({ url: '/pages/sszctop/report?gameId=' + this.room.gameId });
					return;
				}
				if (this.room.mode === 'team' && (this.room.status === 'playing' || this.room.status === 'waiting')) this.connect();
				else this.closeSocket()
			},
			create() {
				if (this.room || this.creating) return
				this.creating = true
				createRoom({
					gameId: this.gameId,
					instanceId: this.activityId,
					mode: this.mode
				}).then(x => this.setRoom(x)).finally(() => {
					this.creating = false
				})
			},
			join() {
				const code = String(this.joinCode || '').trim()
				if (!/^\d{6}$/.test(code)) {
					return uni.showToast({
						title: '请输入 6 位房间号',
						icon: 'none'
					})
				}
				this.joinDialog = false
				joinRoom({
					gameId: this.gameId,
					instanceId: this.activityId,
					roomCode: code
				}).then(x => this.setRoom(x))
			},
			showDimension(d) {
				if (!d) return
				this.selectedDimension = d || {};
				// 队伍维度由房主决定，队员只查看说明，不能改动共享选择。
				if (!this.room || this.room.mode !== 'team' || this.isOwner) {
					this.dimensionId = d && d.dimensionId ? d.dimensionId : this.dimensionId;
				}
				this.dimensionVisible = true
			},
			toggleReady() {
				readyRoom(this.room.roomCode, {
					ready: !this.isReady
				}).then(x => this.setRoom(x))
			},
			/**
			 * 房主点击开局前主动拉取一次最新成员状态。
			 * WebSocket 短暂重连时，成员已准备但房主页面尚未同步的情况也能正常开局；
			 * 人数、准备状态和维度仍以服务端校验结果为准。
			 */
			async start() {
				if (this.starting) return
				if (!this.dimensionId) {
					return uni.showToast({ title: '请先选择一个维度', icon: 'none' })
				}
				this.starting = true
				uni.showLoading({ title: '正在开始游戏', mask: true })
				try {
					const latest = await getRoom(this.room.roomCode)
					if (!latest || latest.code !== 200) throw new Error((latest && latest.msg) || '房间状态获取失败')
					this.setRoom(latest)
					const result = await startRoom(this.room.roomCode, {
						instanceId: this.activityId,
						dimensionId: this.dimensionId
					})
					if (!result || result.code !== 200) throw new Error((result && result.msg) || '开始游戏失败')
					this.setRoom(result)
				} catch (error) {
					uni.showToast({ title: error.message || '开始游戏失败，请重试', icon: 'none' })
				} finally {
					uni.hideLoading()
					this.starting = false
				}
			},
			leave() {
				leaveRoom(this.room.roomCode).then(() => {
					this.closeSocket();
					this.room = null;
				})
			},
			career(id) {
				return (this.room.careers || []).find(c => String(c.careerId) === String(id)) || {}
			},
			isChosen(c) {
				return this.ordered.some(x => String(x.careerId) === String(c.careerId))
			},
			/** 点击职业卡加入或移出排序框，替代原先把卡片拖入排序框的操作。 */
			toggleCareer(c) {
				if (!this.room || this.room.status !== 'playing' || this.locks[c.careerId]) return
				const index = this.ordered.findIndex(x => String(x.careerId) === String(c.careerId))
				if (index >= 0) {
					this.ordered.splice(index, 1)
					this.available.push(c)
					this.scheduleSync()
					return
				}
				if (this.ordered.length >= 3) {
					return uni.showToast({
						title: '排序框最多选择 3 个职业',
						icon: 'none'
					})
				}
				this.ordered.push(c)
				const pos = this.available.findIndex(x => String(x.careerId) === String(c.careerId))
				if (pos >= 0) this.available.splice(pos, 1)
				this.scheduleSync()
			},
			dragStart(source, i, c) {
				if (this.locks[c.careerId]) return;
				this.draggingCareerId = c.careerId;
				this.drag = {
					source,
					i,
					y: 0,
					moved: false,
					careerId: c.careerId
				};
				this.send({
					type: 'career.lock',
					careerId: c.careerId
				})
			},
			dragMove(e) {
				if (!this.drag || !e.touches || !e.touches.length) return;
				const y = e.touches[0].clientY;
				if (!this.drag.y) {
					this.drag.y = y;
					return
				}
				if (Math.abs(y - this.drag.y) > 60 && this.drag.source === 'order') {
					const to = y > this.drag.y ? Math.min(this.ordered.length - 1, this.drag.i + 1) : Math.max(0, this.drag
						.i - 1);
					const x = this.ordered.splice(this.drag.i, 1)[0];
					if (x) {
						this.ordered.splice(to, 0, x);
						this.drag.i = to;
						this.drag.y = y;
						this.drag.moved = true
					}
				}
			},
			dragEnd() {
				if (!this.drag) return;
				const d = this.drag;
				this.drag = null;
				this.draggingCareerId = null;
				this.send({
					type: 'career.unlock',
					careerId: d.careerId
				});
				if (d.moved) this.scheduleSync()
			},
			removeFromOrder(career) {
				const index = this.ordered.findIndex(c => String(c.careerId) === String(career.careerId));
				if (index < 0) return;
				this.available.push(this.ordered.splice(index, 1)[0]);
				this.scheduleSync()
			},
			moveCareer(index, offset) {
				const target = index + offset;
				if (target < 0 || target >= this.ordered.length) return;
				const item = this.ordered.splice(index, 1)[0];
				this.ordered.splice(target, 0, item);
				this.scheduleSync()
			},
			/**
			 * 连续点击选择时先把本地排序改完，再合并成一次提交。
			 * 避免多个请求同时携带旧 orderVersion，导致服务端判定版本冲突并把已选职业回退。
			 */
			scheduleSync() {
				if (!this.room || this.room.status !== 'playing') return
				if (this.syncTimer) clearTimeout(this.syncTimer)
				this.syncTimer = setTimeout(() => {
					this.syncTimer = null
					this.syncOrder()
				}, 220)
			},
			syncOrder() {
				if (!this.room || this.room.status !== 'playing') return;
				// 上一次提交未完成时只标记待同步，等返回后再提交最新排序。
				if (this.orderSyncing) {
					this.syncAgain = true;
					return
				}
				this.orderSyncing = true;
				updateOrder(this.room.roomCode, {
					careerIds: this.ordered.map(x => Number(x.careerId)),
					orderVersion: Number(this.room.orderVersion)
				}).then(x => {
					if (x.code === 200 && x.data) {
						this.room.orderVersion = x.data.orderVersion;
						this.room.members = x.data.members || this.room.members
					} else if (x.code === 500 && /排序已被队友更新|排序已更新/.test(x.msg || '')) {
						// 并发排序时服务端会拒绝旧版本；直接拉取队友最新排序，避免用户必须等待下一次操作。
						getRoom(this.room.roomCode).then(latest => this.setRoom(latest))
					} else uni.showToast({
						title: x.msg || '排序同步失败，请重试',
						icon: 'none'
					})
				}).catch(err => {
					// 请求层将业务错误包装为异常时，同样识别版本冲突并静默同步。
					if (err && /排序已被队友更新|排序已更新/.test(err.message || '')) {
						getRoom(this.room.roomCode).then(x => this.setRoom(x))
						return
					}
					uni.showToast({
						title: (err && err.message) || '排序同步失败，请重试',
						icon: 'none'
					});
				}).finally(() => {
					this.orderSyncing = false
					if (this.syncAgain) {
						this.syncAgain = false
						this.scheduleSync()
					}
					// 用户点了确认但排序还没提交时，等本次同步完成后再自动提交确认。
					if (this.confirmAfterSync) {
						this.confirmAfterSync = false
						this.confirm()
					}
				})
			},
			confirm() {
				if (this.ordered.length !== 3) return;
				if (this.confirming) return;
				// 220ms 合并窗口未结束或上一次排序提交还在路上时，先提交排序再确认。
				if (this.syncTimer || this.orderSyncing) {
					this.confirmAfterSync = true
					if (this.syncTimer) {
						clearTimeout(this.syncTimer)
						this.syncTimer = null
					}
					if (!this.orderSyncing) this.syncOrder()
					return
				}
				this.doConfirm()
			},
			doConfirm() {
				this.confirming = true;
				confirmRoom(this.room.roomCode, {
					orderVersion: this.room.orderVersion
				}).then(x => {
					this.confirming = false;
					this.setRoom(x)
				}).catch(() => {
					this.confirming = false
				})
			},
			connect() {
				if (this.socket || !this.room) return;
				socketTicket(this.room.roomCode).then(r => {
					if (r.code !== 200) return;
					const ws = config.BASE_URL.replace(/^http/, 'ws') + '/ws/games/sszctop/' + this.room.gameId +
						'/rooms/' + this.room.roomCode + '?ticket=' + r.data.ticket;
					this.socketConnected = false;
					this.socket = uni.connectSocket({
						url: ws
					});
					this.socketMode = this.socket && typeof this.socket.onMessage === 'function' ? 'task' :
						'global';
					const onOpen = () => {
						this.socketConnected = true;
						if (!this.heart) this.heart = setInterval(() => this.send({
							type: 'heartbeat.ping'
						}), 5000)
					};
					const onClose = () => {
						this.socketConnected = false;
						this.socket = null;
						this.socketMode = null;
						clearInterval(this.heart);
						this.heart = null
					};
					if (this.socketMode === 'task') {
						this.socket.onOpen(onOpen);
						this.socket.onMessage(e => this.message(e));
						this.socket.onClose(onClose);
						this.socket.onError(onClose)
					} else {
						uni.onSocketOpen(onOpen);
						uni.onSocketMessage(e => this.message(e));
						uni.onSocketClose(onClose);
						uni.onSocketError(onClose)
					}
				})
			},
			message(e) {
				let m;
				try {
					m = JSON.parse(e.data)
				} catch (x) {
					return
				}
				if (m.type === 'member.disconnected') uni.showToast({
					title: ((m.data && m.data.name) || '队友') + '连接断开，已移出本局',
					icon: 'none'
				});
				if (['member.online', 'member.joined', 'member.left', 'member.ready', 'member.disconnected',
						'room.started', 'order.updated', 'confirm.updated', 'room.finished'
					].includes(m.type) && this.room) getRoom(this.room.roomCode).then(x => this.setRoom(x));
				if (m.type === 'career.locked') this.$set(this.locks, m.data.careerId, m.data.name);
				if (m.type === 'career.unlocked') this.$delete(this.locks, m.data.careerId)
			},
			send(x) {
				if (!this.socket || !this.socketConnected) return;
				const data = JSON.stringify(x);
				try {
					if (this.socketMode === 'global') uni.sendSocketMessage({
						data
					});
					else if (typeof this.socket.send === 'function') this.socket.send({
						data
					})
				} catch (e) {
					this.socketConnected = false
				}
			},
			closeSocket() {
				this.socketConnected = false;
				if (this.heart) clearInterval(this.heart);
				this.heart = null;
				if (this.socketMode === 'global') uni.closeSocket();
				else if (this.socket && typeof this.socket.close === 'function') this.socket.close();
				this.socket = null;
				this.socketMode = null
			},
			/** 正常返回上一页；游戏开始后禁止主动退出，只能通过结算离开。 */
			back() {
				if (this.room && this.room.status === 'playing') {
					return uni.showToast({
						title: '游戏进行中，无法返回',
						icon: 'none'
					})
				}
				const pages = getCurrentPages()
				if (pages.length > 1) return uni.navigateBack()
				redirectToActivityWeek()
			}
		}
	}
</script>

<style scoped>
	.page {
		position: relative;
		min-height: 100vh;
		background: #f4f5fc;
		overflow-x: hidden;
	}

	.page-bg {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		z-index: 0;
		display: block;
	}

	.header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 88rpx;
		padding-left: 24rpx;
		padding-right: 24rpx;
		box-sizing: content-box;
	}

	.back-icon {
		width: 40rpx;
		height: 64rpx;
	}

	.logo {
		width: 270rpx;
		height: 42rpx;
	}

	.header-placeholder {
		width: 40rpx;
		height: 1rpx;
	}

	.loading {
		position: relative;
		z-index: 1;
		padding-top: 60vh;
		text-align: center;
		color: #6b7c93;
		font-size: 28rpx;
	}

	/* 第 1 页：按钮固定在背景图对应位置，避免短屏时压到白色卡片上 */
	.home {
		position: relative;
		z-index: 1;
		height: 1623rpx;
	}

	.home-actions {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 96rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.mode-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 94rpx;
	}

	.mode-btn {
		width: 270rpx;
		height: 90rpx;
	}

	.start-btn {
		width: 490rpx;
		height: 86rpx;
		margin-top: 94rpx;
		transition: opacity .15s ease, transform .15s ease;
	}

	.start-btn.disabled {
		opacity: .55;
	}

	/* 第 2、3 页共用：标题由背景图提供，内容从标题下方开始 */
	.stage {
		position: relative;
		z-index: 1;
		padding: 330rpx 0 60rpx;
	}

	.game-stage {
		padding-top: 300rpx;
	}

	.team-strip {
		margin: 0 40rpx 24rpx;
		padding: 22rpx 24rpx;
		border-radius: 22rpx;
		background: rgba(255, 255, 255, .96);
		box-shadow: 0 10rpx 30rpx rgba(58, 94, 158, .10);
	}

	.team-head {
		display: flex;
		align-items: center;
	}

	.room-code {
		color: #14346b;
		font-size: 34rpx;
		font-weight: bold;
		letter-spacing: 4rpx;
	}

	.team-count {
		margin-left: 18rpx;
		color: #7b8aa3;
		font-size: 24rpx;
	}

	.member-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
		margin-top: 16rpx;
	}

	.chip {
		padding: 8rpx 18rpx;
		border-radius: 14rpx;
		background: #f1f5fb;
	}

	.chip.ready {
		background: #eefaf4;
	}

	.chip-name {
		display: block;
		color: #2b3a52;
		font-size: 24rpx;
	}

	.chip-state {
		display: block;
		margin-top: 2rpx;
		color: #ef9639;
		font-size: 21rpx;
	}

	.chip.ready .chip-state {
		color: #20a66a;
	}

	/* 第 2 页：七个维度卡片，2 列布局，最后一张自动居中 */
	.dimension-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 44rpx 120rpx;
		padding: 0 40rpx;
	}

	.dimension-card {
		position: relative;
		width: 243rpx;
		transition: transform .16s ease;
	}

	/* 维度卡片图上已包含名称，说明文字叠加在卡片底部留白内。 */
	.dimension-hint {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 8rpx;
		text-align: center;
		color: #8b9ab1;
		font-size: 20rpx;
	}

	.dimension-card.selected {
		transform: scale(1.04);
		border-radius: 22rpx;
		box-shadow: 0 0 0 4rpx #2c71da, 0 12rpx 26rpx rgba(44, 113, 218, .22);
	}

	.dimension-img {
		width: 100%;
		display: block;
	}

	.stage-actions {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-top: 26rpx;
		padding: 0 40rpx;
	}

	.hint-img {
		width: 620rpx;
		margin-top: 10rpx;
	}

	.waiting-tip {
		padding: 24rpx 40rpx;
		border-radius: 18rpx;
		background: rgba(255, 255, 255, .92);
		color: #4a5c78;
		font-size: 27rpx;
	}

	.ready-btn {
		margin-top: 24rpx;
		padding: 20rpx 0;
		width: 360rpx;
		border-radius: 46rpx;
		background: #ffffff;
		border: 2rpx solid #2c71da;
		color: #2c71da;
		text-align: center;
		font-size: 30rpx;
		font-weight: bold;
	}

	.ready-btn.on {
		background: #20a66a;
		border-color: #20a66a;
		color: #ffffff;
	}

	.start-tip {
		margin-top: 18rpx;
		color: #ef9639;
		font-size: 24rpx;
		text-align: center;
	}

	.leave-line {
		margin-top: 20rpx;
		color: #7b8aa3;
		font-size: 25rpx;
		text-decoration: underline;
	}

	/* 第 3 页：当前维度条 */
	.dimension-bar {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 74rpx;
		margin: 0 56rpx 20rpx;
		border-radius: 40rpx;
		background: rgba(255, 255, 255, .94);
		box-shadow: 0 8rpx 22rpx rgba(58, 94, 158, .08);
		font-size: 26rpx;
		color: #3d4f6b;
	}

	.dimension-name {
		color: #2c71da;
		font-weight: bold;
	}

	.dimension-more {
		color: #8b9ab1;
		font-size: 22rpx;
	}

	.career-panel {
		margin: 0 30rpx;
		padding: 24rpx 20rpx;
		border-radius: 26rpx;
		background: #ffffff;
		box-shadow: 0 14rpx 36rpx rgba(58, 94, 158, .10);
	}

	.career-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 18rpx 20rpx;
	}

	.career-card {
		position: relative;
		width: 203rpx;
		transition: transform .14s ease;
	}

	.career-card.chosen {
		transform: scale(1.03);
	}

	.career-card.locked {
		opacity: .5;
	}

	.career-img {
		width: 100%;
		display: block;
	}

	.select-dot {
		position: absolute;
		top: 10rpx;
		right: 12rpx;
		width: 34rpx;
		height: 34rpx;
		border-radius: 50%;
		border: 2rpx solid #b9d3f2;
		background: rgba(255, 255, 255, .9);
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.select-dot.checked {
		background: #2c71da;
		border-color: #2c71da;
	}

	.check-icon {
		width: 22rpx;
		height: 16rpx;
	}

	.lock-tip {
		position: absolute;
		left: 6rpx;
		bottom: 6rpx;
		padding: 2rpx 8rpx;
		border-radius: 8rpx;
		background: rgba(239, 150, 57, .92);
		color: #fff;
		font-size: 18rpx;
	}

	.sort-head {
		display: flex;
		align-items: baseline;
		margin: 30rpx 40rpx 14rpx;
	}

	.sort-title {
		color: #14346b;
		font-size: 32rpx;
		font-weight: bold;
	}

	.sort-count {
		margin-left: 14rpx;
		color: #7b8aa3;
		font-size: 26rpx;
	}

	.sort-box {
		margin: 0 38rpx;
		padding: 14rpx;
		border: 2rpx dashed #a9bdd6;
		border-radius: 22rpx;
		background: rgba(255, 255, 255, .55);
		min-height: 150rpx;
	}

	.sort-row {
		display: flex;
		align-items: center;
		height: 92rpx;
		padding: 0 14rpx;
		margin-bottom: 12rpx;
		border-radius: 18rpx;
		background: #ffffff;
		box-shadow: 0 6rpx 16rpx rgba(58, 94, 158, .07);
	}

	.sort-row:last-child {
		margin-bottom: 0;
	}

	.rank {
		width: 46rpx;
		height: 46rpx;
		border-radius: 50%;
		background: #2c71da;
		color: #ffffff;
		font-size: 26rpx;
		font-weight: bold;
		text-align: center;
		line-height: 46rpx;
	}

	.row-main {
		flex: 1;
		min-width: 0;
		padding: 0 16rpx;
	}

	.row-main.dragging {
		opacity: .6;
	}

	.row-name {
		color: #22314a;
		font-size: 30rpx;
		font-weight: bold;
	}

	.row-icon {
		width: 48rpx;
		height: 48rpx;
		margin-left: 10rpx;
	}

	.row-icon.disabled {
		opacity: .35;
	}

	.sort-empty {
		display: block;
		padding: 46rpx 0;
		text-align: center;
		color: #9aabc2;
		font-size: 25rpx;
	}

	.tip {
		display: block;
		margin: 18rpx 44rpx 0;
		color: #7b8aa3;
		font-size: 23rpx;
		line-height: 1.7;
	}

	.confirm-btn {
		width: 380rpx;
		height: 78rpx;
		margin: 26rpx auto 0;
		display: block;
	}

	.confirm-btn.disabled {
		opacity: .55;
	}

	.member-panel {
		margin: 26rpx 38rpx 0;
		padding: 22rpx 24rpx;
		border-radius: 22rpx;
		background: rgba(255, 255, 255, .95);
		box-shadow: 0 10rpx 26rpx rgba(58, 94, 158, .08);
	}

	.member-title {
		display: block;
		margin-bottom: 10rpx;
		color: #14346b;
		font-size: 28rpx;
		font-weight: bold;
	}

	.member-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 14rpx 0;
		border-top: 1rpx solid #eef2f8;
	}

	.member-name {
		color: #2b3a52;
		font-size: 26rpx;
	}

	.member-state {
		color: #ef9639;
		font-size: 24rpx;
	}

	.member-state.done {
		color: #20a66a;
	}

	/* 弹窗 */
	.mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 50;
		background: rgba(17, 33, 61, .45);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.dialog {
		width: 620rpx;
		max-height: 80vh;
		padding: 36rpx 34rpx 30rpx;
		border-radius: 28rpx;
		background: #ffffff;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.dimension-dialog {
		width: 640rpx;
	}

	.dialog-dimension-img {
		width: 240rpx;
		margin-bottom: 6rpx;
	}

	.dialog-title {
		color: #14346b;
		font-size: 36rpx;
		font-weight: bold;
		text-align: center;
	}

	.dialog-desc-wrap {
		width: 100%;
		max-height: 300rpx;
		margin-top: 18rpx;
	}

	.dialog-desc {
		color: #58677d;
		font-size: 27rpx;
		line-height: 1.8;
	}

	.dialog-btn {
		width: 420rpx;
		height: 62rpx;
		margin-top: 26rpx;
	}

	.join-dialog {
		width: 600rpx;
	}

	.join-tip {
		margin-top: 16rpx;
		color: #7b8aa3;
		font-size: 24rpx;
		line-height: 1.7;
		text-align: center;
	}

	.join-input {
		width: 100%;
		height: 86rpx;
		margin-top: 24rpx;
		padding: 0 24rpx;
		border-radius: 16rpx;
		background: #f3f6fb;
		font-size: 30rpx;
		letter-spacing: 6rpx;
		text-align: center;
		box-sizing: border-box;
	}

	.join-actions {
		display: flex;
		gap: 20rpx;
		width: 100%;
		margin-top: 26rpx;
	}

	.join-btn {
		flex: 1;
		height: 80rpx;
		line-height: 80rpx;
		border-radius: 40rpx;
		text-align: center;
		font-size: 28rpx;
		background: #eef3fb;
		color: #2c71da;
	}

	.join-btn.primary {
		background: #2c71da;
		color: #ffffff;
	}

	.join-cancel {
		margin-top: 22rpx;
		color: #9aabc2;
		font-size: 25rpx;
	}
</style>
