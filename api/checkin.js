import request from '@/utils/request'

// 获取学校列表
export function getSchoolList(schoolId) {
    return request({
        url: `/api/common/school/${schoolId}`,
        method: 'GET'
    })
}
// 获取学院树
export function getDepartmentTreeBySchoolId(schoolId) {
    return request({
        url: `/api/common/tree/${schoolId}`,
        method: 'GET'
    })
}

// 学生签到
export function checkinStudent(data) {
    return request({
        url: '/api/student/checkin',
        method: 'POST',
        data
    })
}

// 学生签退
export function signout(data) {
    return request({
        url: '/api/student/signout',
        method: 'POST',
        data
    })
}

// 学生退出登录
export function logout() {
    return request({
        url: '/api/student/logout',
        method: 'GET',
    })
}

// 学生注册
export function registerStudent(data) {
    return request({
        url: '/api/student/register',
        method: 'POST',
        data
    })
}

// 学生登录
export function loginStudent(data) {
    return request({
        url: '/api/student/login',
        method: 'POST',
        data
    })
}


export function getAllSchools() {
    return request({
        url: '/api/common/schools',
        method: 'GET'
    })
}

// 获取个人资料（用于校验登录态）
export function getProfile() {
    return request({
        url: '/api/student/profile',
        method: 'GET'
    })
}
