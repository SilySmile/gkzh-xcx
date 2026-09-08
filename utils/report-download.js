// 报告链接走后端 API，避免 /profile 路径被站点首页接管。
export function reportArchiveUrl(baseUrl, path) {
  const match = typeof path === 'string' && path.match(/^\/(?:profile|api\/common)\/report-cache\/([a-fA-F0-9]{32})\.zip$/)
  if (!match) throw new Error('报告压缩包生成失败，请重试')
  return `${baseUrl.replace(/\/+$/, '')}/api/common/report-cache/${match[1]}.zip`
}
