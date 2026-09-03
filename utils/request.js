// uni-app 通用请求工具
import config from '../config/api.js'

/**
 * 通用请求方法
 * @param {Object} options - 请求配置
 * @returns {Promise} 请求结果
 */
function request(options) {
    return new Promise((resolve, reject) => {
        const {url, method = 'GET', data = {}, params = {}, header = {}} = options;

        // 获取token（如果有的话）
        const token = uni.getStorageSync('token');

        let requestUrl = config.BASE_URL + url;
        if (params && Object.keys(params).length > 0) {
            const query = Object.keys(params)
                .filter(key => params[key] !== undefined && params[key] !== null)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
                .join('&');
            if (query) {
                requestUrl += (url.indexOf('?') > -1 ? '&' : '?') + query;
            }
        }
        uni.request({
            url: requestUrl,
            method: method.toUpperCase(),
            data,
            timeout: config.TIMEOUT,
            header: {
                'Content-Type': 'application/json',
                'X-Front-Token': token ? `Bearer ${token}` : '',
                ...header
            },
            success: (res) => {
                console.log('请求成功:', res);
                if (res.statusCode === 200) {
                    // 统一处理响应数据
                    const {code, msg, data: responseData} = res.data;
                    console.log('响应code:', code);
                    console.log('响应msg:', msg);
                    if (code === 200 || code === 500) {
                        resolve(res.data);
                    } else if (code === 401) {
                        // token过期，清除本地token
                        uni.removeStorageSync('token');
                        uni.showToast({
                            title: '登录已过期，请重新登录',
                            icon: 'none'
                        });
                        // 记录当前页面路径（用于登录后跳转）
                        const pages = getCurrentPages();
                        if (pages.length > 0) {
                            const currentPage = pages[pages.length - 1];
                            // 只对特定页面（如问卷调查页面）记录重定向
                            if (currentPage.route && currentPage.route.includes('wjdc/general')) {
                                const redirectUrl = `/${currentPage.route}${currentPage.options ? '?' + Object.keys(currentPage.options).map(key => `${key}=${currentPage.options[key]}`).join('&') : ''}`;
                                uni.setStorageSync('loginRedirectUrl', redirectUrl);
                            }
                        }
                        // 401处理，直接从本地缓存获取activityId
                        const activityId = uni.getStorageSync('activityId') || '';
                        setTimeout(() => {
                            uni.redirectTo({
                                url: `/pages/mp/login/index${activityId ? ('?activityId=' + activityId) : ''}`
                            });
                        }, 500);
                        reject(new Error(msg || '登录已过期'));
                    } else {
                        uni.showToast({
                            title: '未知错误',
                            icon: 'none'
                        });
                        reject(new Error(msg || '请求失败'));
                    }
                } else {
                    uni.showToast({
                        title: `请求失败: ${res.statusCode}`,
                        icon: 'none'
                    });
                    reject(new Error(`请求失败: ${res.statusCode}`));
                }
            },
            fail: (err) => {
                console.error('请求失败:', err);
                uni.showToast({
                    title: '网络错误，请检查网络连接',
                    icon: 'none'
                });
                reject(err);
            }
        });
    });
}

// 导出请求方法
export default request;

// 导出便捷方法
export const get = (url, params = {}) => {
    return request({
        url,
        method: 'GET',
        data: params
    });
};

export const post = (url, data = {}) => {
    return request({
        url,
        method: 'POST',
        data
    });
};

export const put = (url, data = {}) => {
    return request({
        url,
        method: 'PUT',
        data
    });
};

export const del = (url, data = {}) => {
    return request({
        url,
        method: 'DELETE',
        data
    });
}; 
