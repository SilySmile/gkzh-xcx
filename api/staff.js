import config from '@/config/api.js'

function request(options) {
    return new Promise((resolve, reject) => {
        const token = uni.getStorageSync('staffToken')
        uni.request({
            url: config.BASE_URL + options.url,
            method: options.method || 'GET',
            data: options.data || {},
            header: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
            success: ({ data, statusCode }) => {
                if (statusCode === 200 && data.code === 200) return resolve(data)
                if (statusCode === 401 || (data && data.code === 401)) {
                    uni.removeStorageSync('staffToken')
                    uni.removeStorageSync('staffProfile')
                    const pages = getCurrentPages()
                    const current = pages.length ? pages[pages.length - 1].route : ''
                    if (current !== 'pages/mp/login/index') {
                        uni.reLaunch({ url: '/pages/mp/login/index' })
                    }
                }
                reject(new Error((data && data.msg) || '请求失败'))
            },
            fail: reject
        })
    })
}

export const staffLogin = data => request({ url: '/api/staff/login', method: 'POST', data })
export const getStaffProfile = () => request({ url: '/api/staff/profile' })
export const getPrizeRecords = () => request({ url: '/api/staff/prizes' })
export const scanPrize = recordId => request({ url: '/api/staff/prize/scan', method: 'POST', data: { recordId } })
export const resolvePrize = (recordId, redemptionCode) => request({ url: '/api/staff/prize/resolve', method: 'POST', data: { recordId, redemptionCode } })
export const redeemPrize = (recordId, remark = '') => request({ url: '/api/staff/prize/redeem', method: 'POST', data: { recordId, remark } })
export const getPrizeLogs = recordId => request({ url: `/api/staff/prize/${recordId}/logs` })
export const getCodeStatistics = () => request({ url: '/api/staff/statistics/codes' })
export const getInterestTypes = () => request({ url: '/api/staff/statistics/types' })
export const getActivityStatistics = bizType => request({ url: `/api/staff/statistics/activities/${bizType}` })
export const getStaffGameStatistics = (gameId, filters = {}) => request({ url: `/api/staff/statistics/games/${gameId}`, data: filters })
