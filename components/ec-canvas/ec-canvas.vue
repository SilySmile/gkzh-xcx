<template><view class="ec-wrap"><canvas :id="canvasId" :canvas-id="canvasId" class="ec-canvas" /></view></template>
<script>
import * as echarts from 'echarts'
export default { name:'EcCanvas', props:{ canvasId:{type:String,default:'ec-canvas'}, option:{type:Object,required:true}, width:{type:Number,default:320}, height:{type:Number,default:320} }, data:()=>({chart:null}), watch:{ option:{deep:true,handler(v){if(this.chart)this.chart.setOption(v,true)} } }, mounted(){this.$nextTick(this.init)}, beforeDestroy(){if(this.chart){this.chart.dispose();this.chart=null}}, methods:{ init(){
// #ifdef MP-WEIXIN
const q=wx.createSelectorQuery().in(this); q.select('#'+this.canvasId).node(res=>{if(!res||!res.node)return;const canvas=res.node;const dpr=wx.getWindowInfo?wx.getWindowInfo().pixelRatio:2;canvas.width=this.width*dpr;canvas.height=this.height*dpr;this.chart=echarts.init(canvas,null,{width:this.width,height:this.height,renderer:'canvas'});this.chart.setOption(this.option);this.$emit('ready',this.chart)}).exec()
// #endif
// #ifndef MP-WEIXIN
const canvas=document.getElementById(this.canvasId);if(canvas){this.chart=echarts.init(canvas);this.chart.setOption(this.option);this.$emit('ready',this.chart)}
// #endif
} } }
</script>
<style scoped>.ec-wrap{width:100%;height:100%;position:relative}.ec-canvas{width:100%;height:100%}</style>
