import request from '@/utils/request'
const dictCache = {}
export function getDicts(dictType) {
    if (dictCache[dictType]) {
        return Promise.resolve(dictCache[dictType])
    }
    return request({
        url: '/api/common/dict/data/type/' + dictType,
        method: 'get'
    }).then(res => {
        if (res.code === 200) {
            dictCache[dictType] = res.data
            return res.data
        } else {
            return []
        }
    })
}