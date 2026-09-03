// 小程序谁是职场TOP API：房间操作、心跳票据和个人报告。
import request from '@/utils/request'
export const getCatalog=()=>request({url:'/api/sszctop/catalog',method:'get'})
export const createRoom=data=>request({url:'/api/sszctop/rooms',method:'post',data})
export const joinRoom=data=>request({url:'/api/sszctop/rooms/join',method:'post',data})
export const getRoom=code=>request({url:'/api/sszctop/rooms/'+code,method:'get'})
export const startRoom=(code,data)=>request({url:'/api/sszctop/rooms/'+code+'/start',method:'post',data})
export const readyRoom=(code,data)=>request({url:'/api/sszctop/rooms/'+code+'/ready',method:'post',data})
export const updateOrder=(code,data)=>request({url:'/api/sszctop/rooms/'+code+'/order',method:'put',data})
export const confirmRoom=(code,data)=>request({url:'/api/sszctop/rooms/'+code+'/confirm',method:'post',data})
export const leaveRoom=code=>request({url:'/api/sszctop/rooms/'+code+'/leave',method:'post'})
export const socketTicket=code=>request({url:'/api/sszctop/rooms/'+code+'/socket-ticket',method:'post'})
export const roomQr=code=>request({url:'/api/sszctop/rooms/'+code+'/qrcode',method:'get'})
export const getReport=gameId=>request({url:'/api/sszctop/report/'+gameId,method:'get'})
