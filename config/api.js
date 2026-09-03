// API配置文件

// 开发环境配置
const DEV_CONFIG = {
  BASE_URL: 'http://localhost:8080',
  TIMEOUT: 10000
};

// 生产环境配置
const PROD_CONFIG = {
  BASE_URL: 'https://zhiye.sxgkzh.cn',
  TIMEOUT: 10000
};

// 测试环境配置
const TEST_CONFIG = {
  BASE_URL: 'https://your-test-domain.com',
  TIMEOUT: 10000
};

// 根据环境选择配置
let config = DEV_CONFIG;

// #ifdef H5
// H5环境
if (process.env.NODE_ENV === 'production') {
  config = PROD_CONFIG;
} else {
  config = DEV_CONFIG;
}
// #endif

// #ifdef MP-WEIXIN
// 微信小程序环境：直接使用线上服务，避免真机无法访问本机 localhost。
config = PROD_CONFIG;
// #endif

// #ifdef APP-PLUS
// App环境
config = PROD_CONFIG;
// #endif

export default config; 
