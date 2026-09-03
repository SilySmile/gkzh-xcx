import request from '../utils/request.js';

// 获取选项数据
export function getJsSdkConfig(url) {
  return request({
    url: `/api/common/jssdk/config?url=` + url,
    method: 'GET'
  });
}