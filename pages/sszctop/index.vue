<template>
	<view class="page">
		<view class="head"><text @click="back">‹</text><text>谁是职场TOP</text><text></text></view>
		<view v-if="loading" class="panel loading">加载中…</view>

		<!-- 首页：让入口内容保持居中，方便单人和组队用户快速选择。 -->
		<view v-else-if="!room" class="panel home-panel">
			<text class="title">职业认知排序挑战</text>
			<text class="intro">从随机职业中拖拽排序，完成后生成个人报告。</text>
			<view class="modes">
				<button :class="{ on: mode === 'solo' }" @click="mode = 'solo'">单人开始</button>
				<button :class="{ on: mode === 'team' }" @click="mode = 'team'">组队游玩</button>
			</view>
			<view v-if="mode === 'team'" class="join">
				<input v-model="joinCode" maxlength="6" placeholder="输入6位房间号" />
				<button @click="join">加入</button>
			</view>
			<button class="primary" @click="create">创建{{ mode === 'team' ? '组队' : '单人' }}房间</button>
		</view>

		<!-- 等待页：成员列表、二维码和准备状态全部可见。 -->
		<view v-else-if="room.status === 'waiting'" class="panel">
			<text class="title">{{ room.mode === 'team' ? '组队房间' : '选择维度' }}</text>
			<text v-if="room.mode === 'team'" class="code">{{ room.roomCode }}</text>
			<image v-if="room.mode === 'team' && roomQr" class="room-qr" :src="roomQr" mode="aspectFit" />
			<button v-if="room.mode === 'team'" class="share" open-type="share">分享房间</button>
			<view v-if="room.mode === 'team'" class="member-panel">
				<text class="section-title">队内成员（{{ room.members.length }}/4）</text>
				<view v-for="m in room.members" :key="m.userId" class="member-row">
					<text>{{ m.studentName }}{{ m.userId === room.ownerUserId ? '（房主）' : '' }}</text><text
					:class="['state', m.userId === room.ownerUserId || m.confirmStatus === 'ready' ? 'ready' : 'waiting']">{{ m.userId === room.ownerUserId ? '负责开始' : (m.confirmStatus === 'ready' ? '已准备' : '未准备') }}</text>
				</view>
			</view>
			<view class="dimensions">
				<view v-for="d in dimensions" :key="d.dimensionId"
					:class="['dimension', { selected: dimensionId === d.dimensionId }]" @click="showDimension(d)">
					<text>{{ d.name }}</text><text class="hint">点击查看维度说明</text>
				</view>
			</view>
			<button v-if="room.mode === 'team' && !isOwner" class="ready-btn" :class="{ active: isReady }"
				@click="toggleReady">{{ isReady ? '取消准备' : '准备' }}</button>
			<!-- 房主始终负责点击开始；点击前刷新房间状态，避免 WebSocket 延迟导致按钮无响应。 -->
			<text v-if="room.mode === 'team' && isOwner && (!allReady || room.members.length < 2)" class="start-tip">请等待至少 1 名队员加入并准备完成</text>
			<button v-if="room.mode !== 'team' || isOwner" class="primary" :disabled="starting"
				@click="start">{{ starting ? '正在开始…' : '开始游戏' }}</button>
			<!-- <button v-else class="primary" disabled>等待房主开始游戏</button> -->
			<button v-if="room.mode === 'team'" class="minor" @click="leave">退出房间</button>
		</view>

		<!-- 游戏页：上方职业池，下方排序框，队友状态独立展示。 -->
		<view v-else-if="room.status === 'playing'" class="panel">
			<text class="title">{{ room.dimension.name }}</text>
			<view class="dimension-entry" @click="showDimension(room.dimension)"><text>查看维度说明</text><text>›</text>
			</view>
			<text class="section-title">职业列表（{{ available.length }}/12）</text>
			<view class="career-pool">
				<view v-for="(c, i) in available" :key="c.careerId" class="card pool-card"
					:class="{ dragging: draggingCareerId === c.careerId }" @touchstart="dragStart('pool', i, c)"
					@touchmove="dragMove" @touchend="dragEnd" @touchcancel="dragEnd">
					<text>{{ c.name }}</text>
					<text class="major">{{ c.major }}</text>
				</view>
				<text v-if="!available.length" class="empty">已选择 3 个职业，请在下方调整排序</text>
			</view>
			<text class="section-title sort-title">排序框（{{ ordered.length }}/3）</text>
			<view class="sort-box">
				<view v-for="(c, i) in ordered" :key="c.careerId" class="card sort-card"
					:class="{ locked: locks[c.careerId], dragging: draggingCareerId === c.careerId }"
					><text class="rank">{{ i + 1 }}</text>
					<view class="career-content" @touchstart="dragStart('order', i, c)" @touchmove="dragMove" @touchend="dragEnd" @touchcancel="dragEnd"><text>{{ c.name }}</text><text class="major">{{ c.major }}</text>
					</view>
					<view class="move-buttons">
						<button class="move-button" hover-class="none" :disabled="i === 0" @click.stop="moveCareer(i, -1)">↑</button>
						<button class="move-button" hover-class="none" :disabled="i === ordered.length - 1"
							@click.stop="moveCareer(i, 1)">↓</button>
					</view>
					<text v-if="locks[c.careerId]" class="lock">{{ locks[c.careerId] }}调整中</text>
					<button class="remove-career" hover-class="none" @click.stop="removeFromOrder(c)">−</button>
				</view>
				<text v-if="!ordered.length" class="empty">请从上方拖入职业</text>
			</view>
			<text class="tip">从上方 12 个职业中选择 3 个，按住排序框中的职业卡可调整顺序。</text>
			<button class="primary" :disabled="confirming || ordered.length !== 3"
				@click="confirm">{{ ordered.length === 3 ? '确认当前排序' : '请选择 3 个职业' }}</button>
			<view class="member-panel game-members"><text class="section-title">队内成员状态</text>
				<view v-for="m in room.members" :key="m.userId" class="member-row">
					<text>{{ m.studentName }}{{ m.userId === room.ownerUserId ? '（房主）' : '' }}</text><text
						:class="['state', m.confirmStatus === 'confirmed' ? 'ready' : 'waiting']">{{ m.confirmStatus === 'confirmed' ? '已确认' : '排序中' }}</text>
				</view>
			</view>
		</view>

		<!-- 终局不会展示房间内 12 个职业的中转页，页面切换期间只保留简短加载提示。 -->
		<view v-else class="panel loading">正在生成个人报告…</view>

		<view v-if="dimensionVisible" class="dimension-mask" @click="dimensionVisible = false">
			<view class="dimension-dialog" @click.stop><text
					class="dialog-title">{{ selectedDimension.name }}</text><text
					class="dialog-description">{{ selectedDimension.description || '暂无说明' }}</text><button
					class="primary" @click="dimensionVisible = false">知道了</button></view>
		</view>
	</view>
</template>

<script>
	import config from '@/config/api.js'
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
		socketTicket,
		roomQr
	} from '@/api/sszctop'
	import {
		redirectToActivityWeek
	} from '@/utils/activity'

	export default {
		data() {
			return {
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
				roomQr: '',
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
				// 防止房主连续点击导致重复发起开始请求。
				starting: false,
				confirming: false,
				routingReport: false
			}
		},
		computed: {
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
				return !!(this.room && this.room.members && this.room.members.length >= 2 && this.room.members.filter(m => String(m.userId) !== String(this.room.ownerUserId)).every(m => m
					.confirmStatus === 'ready'))
			}
		},
			onLoad(o) {
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
				if (this.room.status === 'waiting' && this.room.mode === 'team') roomQr(this.room.roomCode).then(x => {
					if (x.code === 200) this.roomQr = x.data
				});
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
				createRoom({
					gameId: this.gameId,
					instanceId: this.activityId,
					mode: this.mode
				}).then(x => this.setRoom(x))
			},
			join() {
				joinRoom({
					gameId: this.gameId,
					instanceId: this.activityId,
					roomCode: this.joinCode
				}).then(x => this.setRoom(x))
			},
			showDimension(d) {
				this.selectedDimension = d || {};
				this.dimensionId = d && d.dimensionId ? d.dimensionId : this.dimensionId;
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
					this.roomQr = ''
				})
			},
			career(id) {
				return (this.room.careers || []).find(c => String(c.careerId) === String(id)) || {}
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
				if (d.source === 'pool') {
					if (this.ordered.length >= 3) {
						uni.showToast({
							title: '排序框最多选择 3 个职业',
							icon: 'none'
						});
						return
					}
					const pos = this.available.findIndex(c => String(c.careerId) === String(d.careerId));
					if (pos >= 0) this.ordered.push(this.available.splice(pos, 1)[0]);
				}
				this.syncOrder()
			},
			removeFromOrder(career) {
				const index = this.ordered.findIndex(c => String(c.careerId) === String(career.careerId));
				if (index < 0) return;
				this.available.push(this.ordered.splice(index, 1)[0]);
				this.syncOrder()
			},
			moveCareer(index, offset) {
				const target = index + offset;
				if (target < 0 || target >= this.ordered.length) return;
				const item = this.ordered.splice(index, 1)[0];
				this.ordered.splice(target, 0, item);
				this.syncOrder()
			},
			syncOrder() {
				if (!this.room || this.room.status !== 'playing') return;
				this.orderSyncing = true;
				updateOrder(this.room.roomCode, {
					careerIds: this.ordered.map(x => Number(x.careerId)),
					orderVersion: Number(this.room.orderVersion)
				}).then(x => {
					if (x.code === 200 && x.data) {
						this.room.orderVersion = x.data.orderVersion;
						this.room.members = x.data.members || this.room.members
						setTimeout(() => {
							this.orderSyncing = false
						}, 500)
					} else if (x.code === 500 && /排序已被队友更新|排序已更新/.test(x.msg || '')) {
						// 并发排序时服务端会拒绝旧版本；直接拉取队友最新排序，避免用户必须等待下一次操作。
						getRoom(this.room.roomCode).then(latest => this.setRoom(latest)).finally(() => {
							this.orderSyncing = false
						})
					} else uni.showToast({
						title: x.msg || '排序同步失败，请重试',
						icon: 'none'
					});
					if (x.code !== 200 && !(x.code === 500 && /排序已被队友更新|排序已更新/.test(x.msg || ''))) this.orderSyncing = false
				}).catch(err => {
					this.orderSyncing = false;
					// 请求层将业务错误包装为异常时，同样识别版本冲突并静默同步。
					if (err && /排序已被队友更新|排序已更新/.test(err.message || '')) {
						getRoom(this.room.roomCode).then(x => this.setRoom(x))
						return
					}
					uni.showToast({
						title: (err && err.message) || '排序同步失败，请重试',
						icon: 'none'
					});
				})
			},
			confirm() {
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
			back() {
				redirectToActivityWeek()
			}
		}
	}
</script>

<style scoped>
	.page {
		min-height: 100vh;
		background: #f4f7fb
	}

	.head {
		height: 100rpx;
		padding: var(--status-bar-height) 28rpx 0;
		background: #2456a6;
		color: #fff;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 34rpx
	}

	.head text:first-child {
		font-size: 58rpx
	}

	.panel {
		margin: 28rpx;
		padding: 32rpx;
		background: #fff;
		border-radius: 22rpx
	}

	.home-panel {
		text-align: center;
		margin-top: 18vh
	}

	.loading {
		text-align: center
	}

	.title {
		display: block;
		text-align: center;
		font-size: 40rpx;
		font-weight: bold;
		margin-bottom: 20rpx
	}

	.intro,
	.tip {
		display: block;
		color: #68758b;
		line-height: 1.7;
		font-size: 26rpx
	}

	.modes,
	.join {
		display: flex;
		gap: 18rpx;
		margin-top: 26rpx
	}

	.modes button,
	.join button {
		flex: 1;
		background: #e9effb;
		color: #2456a6
	}

	.modes .on,
	.primary {
		background: #2456a6 !important;
		color: #fff !important
	}

	.join input {
		border: 1rpx solid #d9e2f0;
		padding: 12rpx;
		border-radius: 10rpx;
		flex: 2
	}

	.primary {
		margin-top: 30rpx
	}

	/* 组队未满足开局条件时提示房主；按钮仍保持固定位置，条件满足后可直接点击。 */
	.start-tip {
		display: block;
		margin-top: 22rpx;
		text-align: center;
		font-size: 24rpx;
		color: #ef9639
	}

	.minor {
		margin-top: 16rpx;
		color: #68758b
	}

	.share,
	.ready-btn {
		margin-top: 18rpx;
		background: #e9effb;
		color: #2456a6
	}

	.ready-btn.active {
		background: #25a16b;
		color: #fff
	}

	.code {
		display: block;
		text-align: center;
		color: #ef9639;
		font-size: 54rpx;
		letter-spacing: 8rpx;
		margin: 18rpx
	}

	.room-qr {
		display: block;
		width: 300rpx;
		height: 300rpx;
		margin: 10rpx auto
	}

	.section-title {
		display: block;
		margin-top: 24rpx;
		font-size: 28rpx;
		font-weight: bold;
		color: #34445d
	}

	.member-panel {
		background: #f8faff;
		border-radius: 14rpx;
		padding: 4rpx 18rpx
	}

	.member-row {
		display: flex;
		justify-content: space-between;
		padding: 16rpx 0;
		border-bottom: 1rpx solid #eef1f6
	}

	.state {
		font-size: 24rpx
	}

	.state.ready {
		color: #25a16b
	}

	.state.waiting {
		color: #ef9639
	}

	.dimension,
	.card {
		padding: 22rpx;
		margin-top: 16rpx;
		border-radius: 14rpx;
		background: #f6f8fc;
		transition: box-shadow .16s ease, opacity .16s ease;
		transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease
	}

	.dimension.selected {
		border: 2rpx solid #ef9639
	}

	.dimension text {
		display: block
	}

	.dimension text:first-child {
		font-weight: bold;
		font-size: 30rpx
	}

	.hint {
		color: #8b97aa;
		font-size: 23rpx;
		margin-top: 8rpx
	}

	.dimension-entry {
		display: flex;
		justify-content: space-between;
		padding: 18rpx;
		background: #f6f8fc;
		color: #2456a6;
		border-radius: 12rpx
	}

	.career-pool {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx
	}

	.pool-card {
		width: calc(50% - 6rpx);
		box-sizing: border-box
	}

	.sort-title {
		margin-top: 30rpx
	}

	.sort-box {
		min-height: 170rpx;
		border: 2rpx dashed #b9c9e2;
		border-radius: 14rpx;
		padding: 8rpx
	}

	.sort-card {
		display: flex;
		align-items: center;
		gap: 16rpx
	}

	.career-content {
		flex: 1
	}

	.remove-career {
		width: 42rpx;
		height: 42rpx;
		border-radius: 50%;
		background: #f44336;
		color: #fff;
		font-size: 38rpx;
		line-height: 36rpx;
		text-align: center;
		font-weight: 300;
		box-shadow: 0 4rpx 10rpx rgba(244, 67, 54, .28)
	}

	.rank {
		width: 40rpx;
		height: 40rpx;
		border-radius: 50%;
		background: #2456a6;
		color: #fff;
		text-align: center;
		line-height: 40rpx
	}

	.major {
		display: block;
		color: #8b97aa;
		font-size: 23rpx
	}

	.locked {
		opacity: .55
	}

	.lock {
		margin-left: auto;
		font-size: 23rpx;
		color: #ef9639
	}

	.empty {
		display: block;
		text-align: center;
		padding: 50rpx 0;
		color: #a5b0c0;
		font-size: 25rpx
	}

	.tip {
		margin-top: 18rpx
	}

	.game-members {
		margin-top: 18rpx
	}

	.pass {
		color: #25a16b
	}

	.fail {
		color: #d9534f
	}

	.dimension-mask {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, .45);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10
	}

	.dimension-dialog {
		width: 78%;
		background: #fff;
		border-radius: 18rpx;
		padding: 32rpx
	}

	.dialog-title {
		display: block;
		font-size: 36rpx;
		font-weight: bold;
		text-align: center
	}

	.dialog-description {
		display: block;
		margin-top: 22rpx;
		color: #58677d;
		line-height: 1.8;
		font-size: 27rpx
	}

	.card.dragging {
		transform: scale(1.04) translateY(-8rpx);
		box-shadow: 0 14rpx 28rpx rgba(36, 86, 166, .25);
		opacity: .9;
		z-index: 2;
		transform: none;
		box-shadow: 0 10rpx 22rpx rgba(36, 86, 166, .24);
		opacity: .82
	}

	.sort-box:after {
		content: '拖动职业到这里排序';
		display: block;
		text-align: center;
		color: #b9c9e2;
		font-size: 23rpx;
		padding: 8rpx
	}

	.sort-box:not(:empty):after {
		display: none
	}

	/* 排序按钮不参与拖拽事件，避免点击按钮时触发卡片移动。 */
	.move-buttons {
		display: flex;
		gap: 8rpx;
		margin-left: auto
	}

	.move-button {
		display: inline-block;
		width: 42rpx;
		height: 42rpx;
		border-radius: 50%;
		background: #e8f0ff;
		color: #2456a6;
		text-align: center;
		line-height: 40rpx;
		font-size: 28rpx;
		font-weight: bold
	}

	.move-button.disabled {
		opacity: .35
	}

	.remove-career {
		flex: none
	}

	.move-button {
		margin: 0;
		padding: 0;
		border: 0;
		min-width: 42rpx;
		line-height: 42rpx
	}

	.move-button[disabled] {
		color: #2456a6;
		background: #e8f0ff;
		opacity: .35
	}

	.move-button::after,
	.remove-career::after {
		border: 0
	}

	.remove-career {
		display: flex;
		flex: none;
		width: 42rpx;
		height: 42rpx;
		margin: 0;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: #f44336;
		color: #fff;
		justify-content: center;
		font-size: 36rpx;
		line-height: 40rpx;
		font-weight: 800
	}

	.remove-career::after {
		border: 0
	}
</style>
