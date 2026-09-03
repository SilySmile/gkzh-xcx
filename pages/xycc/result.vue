<template>
    <view class="container">
        <uni-nav-bar
            dark
            :fixed="true"
            shadow
            background-color="#007AFF"
            status-bar
            title="测评结果"
            left-icon="left"
            @clickLeft="back"
            :border="false"
        />
        <view class="result-container">
            <view class="header-card">
                <view class="result-title">您的职业兴趣类型为</view>
                <view class="result-code-triangle">
                    <view
                        v-for="item in codeTypes"
                        :key="item.code"
                        class="result-code-hex"
                        :style="{ background: item.lightColor }"
                    >
                        <view class="result-code-hex-inner" :style="{ background: item.color }">
                            <text class="result-code-letter">{{ item.code }}</text>
                            <text class="result-code-name">{{ item.name }}</text>
                        </view>
                    </view>
                </view>
            </view>

            <view v-if="codeTypes.length" class="type-explain">
                <view class="type-explain-title">下述是你的结论</view>
                <view
                    v-for="item in codeTypes"
                    :key="item.code"
                    class="type-card"
                    :style="{ borderTopColor: item.color }"
                >
                    <view class="type-card-head">
                        <text class="type-card-icon">{{ item.icon }}</text>
                        <text class="type-card-name">{{ item.name }}（{{ item.code }}）</text>
                    </view>
                    <view class="type-card-section">
                        <text class="type-card-label">特点</text>
                        <text class="type-card-text">{{ item.summary }}</text>
                    </view>
                    <view class="type-card-section">
                        <text class="type-card-label">生活事例</text>
                        <text class="type-card-text">{{ item.life }}</text>
                    </view>
                </view>
            </view>


<!--            <view class="combo-card">
                <view class="combo-label">你的霍兰德组合</view>
                <view class="combo-code">{{ code }}</view>
                <view class="combo-names">{{ codeTypes.map(item => item.name).join(" / ") }}</view>
            </view> -->

            <view class="combo-detail-card">
                <view class="combo-detail-title">你的职业方向与工作环境偏好</view>
                <view class="combo-detail-row">
                    <view class="combo-detail-label">职业方向</view>
                    <view class="combo-detail-tags">
                        <text
                            v-for="(item, idx) in careers"
                            :key="idx"
                            class="combo-detail-tag"
                        >{{ item.title }}</text>
                    </view>
                </view>
                <view class="combo-detail-row">
                    <view class="combo-detail-label">工作环境偏好</view>
                    <view class="combo-detail-tags">
                        <text
                            v-for="(item, idx) in workEnvs"
                            :key="idx"
                            class="combo-detail-tag secondary"
                        >{{ item.title }}</text>
                    </view>
                </view>
            </view>

            <button class="growth-btn" @click="viewGrowth">探索兴趣培养方法</button>
            <button class="download-btn" @click="downloadPdf">下载报告</button>

            <view v-if="growthVisible" class="growth-preview" @click="growthVisible = false">
                <view class="growth-gallery" @click.stop>
                    <view class="growth-main-wrap">
                        <swiper class="growth-swiper" :current="growthIndex" :duration="260" @change="onGrowthChange">
                            <swiper-item v-for="image in growthImages" :key="image">
                                <image :src="image" mode="widthFix" class="growth-image" />
                            </swiper-item>
                        </swiper>
                        <text class="growth-counter">{{ growthIndex + 1 }}/{{ growthImages.length }}</text>
                    </view>
                    <view class="growth-scrollbar">
                        <view class="growth-scroll-track">
                            <view class="growth-scroll-thumb" :style="{ transform: 'translateY(' + (growthIndex * 100) + '%)' }"></view>
                        </view>
                    </view>
                </view>
            </view>

        </view>
    </view>
</template>

<script>
import {getXyccResult, getHollandCodes, createReportCache} from '../../api/xycc.js';
import { redirectToActivityWeek } from '@/utils/activity'
import { hollandCodes } from '@/data/holland-codes.js'
import config from '@/config/api.js'

const codeStyleMap = {
    'I': { icon: '🔬', color: '#2980b9' },
    'R': { icon: '🛠️', color: '#e67e22' },
    'S': { icon: '🤝', color: '#27ae60' },
    'E': { icon: '📈', color: '#c0392b' },
    'A': { icon: '🎨', color: '#8e44ad' },
    'C': { icon: '📋', color: '#7f8c8d' }
}

function hexToRgba(hex, alpha = 0.45) {
    const value = (hex || '').replace('#', '')
    const r = parseInt(value.substring(0, 2), 16)
    const g = parseInt(value.substring(2, 4), 16)
    const b = parseInt(value.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default {
    data() {
        return {
            code: '',
            careers: [],
            workEnvs: [],
            hollandCodeMap: {},
            growthVisible: false,
            growthIndex: 0,
            growthImages: [
                'https://zhiye.sxgkzh.cn/imgs/xycc/bg/bg1.png',
                'https://zhiye.sxgkzh.cn/imgs/xycc/bg/bg2.jpg'
            ]
        }
    },
    computed: {
        codeTypes() {
            return (this.code || '').split('').map(ch => {
                const staticItem = hollandCodes.find(type => type.code === ch) || {}
                const backendItem = this.hollandCodeMap[ch] || {}
                const style = codeStyleMap[ch] || { icon: '📋', color: '#7f8c8d' }
                return {
                    ...staticItem,
                    ...backendItem,
                    ...style,
                    lightColor: hexToRgba(style.color, 0.45)
                }
            }).filter(Boolean)
        }
    },
    onLoad(options) {
        getHollandCodes().then(res => {
            if (res.code === 200 && Array.isArray(res.data)) {
                this.hollandCodeMap = res.data.reduce((map, item) => {
                    map[item.code] = item
                    return map
                }, {})
            }
        })
        if (options.activityId) { uni.setStorageSync('activityId', options.activityId)
            getXyccResult({activityId: options.activityId}).then(res => {
                if (res.code === 200 && res.data) {
                    this.code = res.data.code;
                    this.careers = res.data.careers || [];
                    this.workEnvs = res.data.workEnvs || [];
                }
            });
        }
    },
    methods: {
        goNext() {
            const activityId = uni.getStorageSync('activityId');
            if (!activityId) {
                uni.showToast({title: '未找到活动ID', icon: 'none'});
                return;
            }
            redirectToActivityWeek()
        },
        goCodes() {
            uni.navigateTo({
                url: '/pages/xycc/codes' + (this.code ? '?code=' + this.code.charAt(0) : '')
            })
        },
        viewGrowth() {
            this.growthIndex = 0
            this.growthVisible = true
        },

        onGrowthChange(event) {
            this.growthIndex = event.detail.current
        },
        downloadPdf() { const activityId = uni.getStorageSync('activityId') || ''; if (!activityId) return uni.showToast({ title: '缺少活动信息，请返回重新进入报告', icon: 'none' }); uni.showLoading({ title: '生成报告' }); createReportCache(activityId).then(res => { const path = res.data; if (!path || path.indexOf('/profile/report-cache/') !== 0) throw new Error('报告文件生成失败，请重试'); const reportUrl = config.BASE_URL + path; uni.downloadFile({ url: reportUrl, success: file => { if (file.statusCode !== 200) throw new Error('报告下载失败'); uni.openDocument({ filePath: file.tempFilePath, showMenu: true, fileType: 'pdf' }); }, fail: () => uni.showModal({ title: '下载报告', content: '下载失败，报告链接已复制，请粘贴到浏览器下载。', showCancel: false, success: () => uni.setClipboardData({ data: reportUrl }) }) }); }).catch(error => { uni.showToast({ title: (error && error.message) || '报告生成失败，请重试', icon: 'none' }); }).finally(() => uni.hideLoading()); return;
            // #ifdef H5
            const activityId = uni.getStorageSync('activityId') || ''
            const reportUrl = (typeof window !== 'undefined' && window.location)
                ? window.location.href
                : config.BASE_URL + '/h5/#/pages/xycc/result?activityId=' + encodeURIComponent(activityId)
            uni.setClipboardData({ data: reportUrl, success: () => uni.showModal({ title: '下载报告', content: '报告链接已复制，请粘贴到浏览器中打开并下载。', showCancel: false, confirmText: '知道了' }) })
            return
            // #endif
            // #ifndef H5
            uni.showToast({ title: '请在浏览器中打开后下载', icon: 'none' })
            // #endif
        },
        back() {
            this.goNext();
        }
    }
}
</script>

<style scoped>
.container {
    min-height: 100vh;
    background-color: #f5f7fa;
}

.result-container {
    padding: 24rpx;
}

.header-card {
    background: transparent;
    border-radius: 0;
    padding: 24rpx 30rpx;
    color: #1a2c4a;
    margin-bottom: 30rpx;
    box-shadow: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    position: relative;
}

.result-icon {
    font-size: 80rpx;
    margin-bottom: 20rpx;
    z-index: 1;
}

.result-title {
    font-size: 42rpx;
    font-weight: bold;
    color: #1a2c4a;
    margin-bottom: 8rpx;
    z-index: 1;
}

.result-subtitle {
    font-size: 32rpx;
    opacity: 0.9;
    z-index: 1;
}

.result-code {
    color: #f1c40f;
    font-weight: bold;
    background: rgba(0,0,0,0.2);
    padding: 5rpx 15rpx;
    border-radius: 10rpx;
}

.info-card {
    background: #ffffff;
    border-radius: 20rpx;
    padding: 40rpx 30rpx;
    box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.08);
    margin-bottom: 50rpx;
}

.explain-img {
    width: 100%;
    margin-top: 20rpx;
    border-radius: 12rpx;
}

.info-row {
    display: flex;
    align-items: flex-start;
}

.info-icon {
    font-size: 48rpx;
    margin-right: 30rpx;
    margin-top: 5rpx;
    min-width: 60rpx;
}

.info-content {
    flex: 1;
}

.info-label {
    font-size: 34rpx;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 25rpx;
    display: flex;
    align-items: center;
}

.info-label::after {
    content: "";
    flex: 1;
    height: 2rpx;
    background: linear-gradient(to right, #eee, transparent);
    margin-left: 20rpx;
}

.info-value {
    font-size: 28rpx;
    color: #34495e;
    line-height: 1.6;
}

.tag-container {
    display: flex;
    flex-wrap: wrap;
}
/*
.tag {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 10rpx 18rpx;
    border-radius: 50rpx;
    font-size: 26rpx;
    box-shadow: 0 4rpx 10rpx rgba(102, 126, 234, 0.3);
    margin-right: 10rpx;
    margin-bottom: 10rpx;
}

.tag.secondary {
    background: linear-gradient(135deg, #4facfe, #00f2fe);
    box-shadow: 0 4rpx 10rpx rgba(79, 172, 254, 0.3);
}
*/
.empty-text {
    color: #95a5a6;
    font-style: italic;
    padding: 20rpx 0;
}

.divider {
    height: 2rpx;
    background: linear-gradient(to right, transparent, #eee, transparent);
    margin: 40rpx 0;
}

.next-btn {
    width: 100%;
    background: linear-gradient(135deg, #FF6B6B, #FF8E53);
    color: #fff;
    border: none;
    border-radius: 50rpx;
    padding: 10rpx 0;
    font-size: 34rpx;
    font-weight: 600;
    box-shadow: 0 8rpx 20rpx rgba(255, 107, 107, 0.4);
    transition: all 0.3s ease;
}

.code-btn {
    width: 100%;
    margin-bottom: 20rpx;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: #fff;
    border: none;
    border-radius: 50rpx;
    padding: 10rpx 0;
    font-size: 34rpx;
    font-weight: 600;
}

.type-explain {
    margin-bottom: 30rpx;
}

.type-explain-title {
    font-size: 34rpx;
    font-weight: 700;
    color: #2c3e50;
    margin-bottom: 20rpx;
    padding-left: 6rpx;
}

.type-card {
    background: #ffffff;
    border-radius: 20rpx;
    border-top: 8rpx solid #667eea;
    box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.08);
    padding: 28rpx 26rpx;
    margin-bottom: 24rpx;
}

.type-card-head {
    display: flex;
    align-items: center;
    margin-bottom: 18rpx;
}

.type-card-icon {
    font-size: 42rpx;
    margin-right: 14rpx;
}

.type-card-name {
    font-size: 34rpx;
    font-weight: 700;
    color: #1a2c4a;
}

.type-card-section {
    margin-top: 18rpx;
}

.type-card-label {
    display: block;
    font-size: 26rpx;
    font-weight: 700;
    color: #1856d1;
    margin-bottom: 8rpx;
}

.type-card-text {
    display: block;
    font-size: 28rpx;
    color: #34495e;
    line-height: 1.65;
}

.combo-card {
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: 20rpx;
    padding: 42rpx 30rpx;
    margin-bottom: 30rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    box-shadow: 0 8rpx 20rpx rgba(102, 126, 234, 0.3);
}

.combo-label {
    font-size: 26rpx;
    color: rgba(255, 255, 255, 0.85);
    margin-bottom: 18rpx;
    letter-spacing: 2rpx;
}

.combo-code {
    font-size: 72rpx;
    font-weight: 900;
    color: #ffffff;
    letter-spacing: 12rpx;
    margin-bottom: 18rpx;
}

.combo-names {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.92);
    letter-spacing: 1rpx;
}

.combo-detail-card {
    background: #ffffff;
    border-radius: 20rpx;
    padding: 34rpx 28rpx;
    margin-bottom: 30rpx;
    box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.08);
}

.combo-detail-title {
    font-size: 32rpx;
    font-weight: 700;
    color: #1a2c4a;
    margin-bottom: 24rpx;
    text-align: center;
}

.combo-detail-row {
    margin-top: 22rpx;
}

.combo-detail-row:first-of-type {
    margin-top: 0;
}

.combo-detail-label {
    font-size: 26rpx;
    font-weight: 700;
    color: #1856d1;
    margin-bottom: 12rpx;
}

.combo-detail-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
}

.combo-detail-tag {
    background: #eef4ff;
    color: #1856d1;
    padding: 10rpx 18rpx;
    border-radius: 50rpx;
    font-size: 26rpx;
    line-height: 1.4;
}

.combo-detail-tag.secondary {
    background: #eafaf1;
    color: #27ae60;
}

.download-btn {
    width: 100%;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: #ffffff;
    border: none;
    border-radius: 50rpx;
    font-size: 32rpx;
    font-weight: 600;
    margin-top: 30rpx;
}

.growth-btn {
    width: 100%;
    background: #ffffff;
    color: #1856d1;
    border: 2rpx solid #1856d1;
    border-radius: 50rpx;
    font-size: 32rpx;
    font-weight: 600;
    margin-top: 30rpx;
}

.growth-preview {
    position: fixed;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40rpx;
}
.growth-image {
    width: 100%;
    border-radius: 20rpx;
}

.growth-image { width: 100%; max-height: 78vh; border-radius: 20rpx; }
.growth-gallery { width: 100%; max-width: 680rpx; display: flex; align-items: center; gap: 18rpx; }
.growth-main-wrap { flex: 1; min-width: 0; position: relative; }
.growth-swiper { width: 100%; height: 78vh; }
.growth-scrollbar { width: 18rpx; height: 180rpx; flex-shrink: 0; display: flex; justify-content: center; }
.growth-scroll-track { width: 6rpx; height: 100%; border-radius: 6rpx; background: rgba(255,255,255,.35); position: relative; }
.growth-scroll-thumb { position: absolute; left: -5rpx; top: 0; width: 16rpx; height: 50%; border-radius: 10rpx; background: #fff; transition: transform .2s ease; }
.growth-counter { position: absolute; left: 50%; bottom: 16rpx; transform: translateX(-50%); padding: 6rpx 18rpx; border-radius: 24rpx; background: rgba(0,0,0,.58); color: #fff; font-size: 22rpx; }

/* 图片与右侧进度条保持紧凑，并让图片始终在弹窗中央 */
.growth-gallery {
    width: 100%;
    max-width: 760rpx;
    justify-content: center;
    gap: 6rpx;
}

.growth-main-wrap {
    flex: 0 1 660rpx;
    width: calc(100% - 24rpx);
    display: flex;
    align-items: center;
    justify-content: center;
}

.growth-swiper {
    display: flex;
    align-items: center;
    justify-content: center;
}

.growth-swiper swiper-item {
    display: flex;
    align-items: center;
    justify-content: center;
}

.growth-image {
    width: 100%;
    max-width: 100%;
    max-height: 78vh;
    object-fit: contain;
}

.growth-scrollbar {
    margin-left: 0;
}

.result-code-triangle {
    display: grid;
    grid-template-columns: repeat(2, 140rpx);
    grid-template-rows: repeat(2, 160rpx);
    justify-content: center;
    gap: 12rpx;
    z-index: 1;
    margin-top: 8rpx;
}

.result-code-hex {
    width: 140rpx;
    height: 160rpx;
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    box-shadow: inset 0 0 0 2rpx rgba(255, 255, 255, 0.2);
    position: relative;
}

.result-code-hex-inner {
    position: absolute;
    left: 10rpx;
    top: 10rpx;
    width: calc(100% - 20rpx);
    height: calc(100% - 20rpx);
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    box-shadow: inset 0 8rpx 12rpx rgba(0, 0, 0, 0.18), inset 0 -8rpx 12rpx rgba(255, 255, 255, 0.22);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.result-code-hex:nth-child(1) {
    grid-column: 1 / 3;
    justify-self: center;
    transform: translateY(40rpx);
}

.result-code-hex:nth-child(2) {
    grid-column: 1;
}

.result-code-hex:nth-child(3) {
    grid-column: 2;
}

.result-code-letter {
    font-size: 64rpx;
    font-weight: 900;
    color: #ffffff;
    line-height: 1;
}

.result-code-name {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.9);
    margin-top: 8rpx;
}


</style>
