System.register("chunks:///_virtual/game.ts",["./_rollupPluginModLoBabelHelpers.js","cc"],(function(o){"use strict";var e,t,i,r,n,a,l,s,c,h,u,m,g,b,f,p,d,C;return{setters:[function(o){e=o.applyDecoratedDescriptor,t=o.inheritsLoose,i=o.initializerDefineProperty,r=o.assertThisInitialized,n=o.defineProperty},function(o){a=o.cclegacy,l=o._decorator,s=o.Color,c=o.Prefab,h=o.AudioSource,u=o.Label,m=o.view,g=o.Vec3,b=o.director,f=o.instantiate,p=o.Sprite,d=o.UITransform,C=o.Component}],execute:function(){var y,x,w,_,v,z,S,N,B,k,T,A,L,D,M,E,P,R,O;a._RF.push({},"5b892c2kOFGJ7YFjJSWdkPy","game",void 0);var U=l.ccclass,W=l.property;o("game",(y=U("game"),x=W(Number),w=W(Number),_=W(s),v=W(c),z=W([s]),S=W(Number),N=W(Number),B=W(Number),y((A=e((T=function(o){function e(){for(var e,t=arguments.length,a=new Array(t),l=0;l<t;l++)a[l]=arguments[l];return e=o.call.apply(o,[this].concat(a))||this,i(r(e),"ROW_NUM",A,r(e)),i(r(e),"COL_NUM",L,r(e)),i(r(e),"defaultColor",D,r(e)),i(r(e),"boxPrefab",M,r(e)),n(r(e),"_boxSize",void 0),n(r(e),"_boxArray",[]),i(r(e),"colorArray",E,r(e)),i(r(e),"countDownTime",P,r(e)),i(r(e),"rewardTime",R,r(e)),i(r(e),"punishTime",O,r(e)),n(r(e),"wrongAudioEffect",void 0),n(r(e),"rightAudioEffect",void 0),n(r(e),"scoreLabel",void 0),n(r(e),"countDownTimeLabel",void 0),n(r(e),"score",0),n(r(e),"_gameStop",void 0),n(r(e),"timeCallback",(function(){this.countDownTime-=1,this.countDownTimeLabel.string=this.countDownTime,this.countDownTime<0&&this.gameStop()})),e}t(e,o);var a=e.prototype;return a.onLoad=function(){this.wrongAudioEffect=this.getComponents(h)[0],this.rightAudioEffect=this.getComponents(h)[1],this.scoreLabel=this.node.parent.getChildByName("score").getComponent(u),this.countDownTimeLabel=this.node.parent.getChildByPath("timeFrameOut/timeFrameIn/time").getComponent(u);var o=this.node.parent.getChildByName("refresh");o.on("touch-start",this.onRefresh,o),this._boxSize=Math.floor(m.getVisibleSize().width/this.COL_NUM);for(var e=0;e<this.ROW_NUM;e++){for(var t=e*this._boxSize+this._boxSize/2,i=[],r=0;r<this.COL_NUM;r++){var n=r*this._boxSize+this._boxSize/2,a=new g(n,t,0),l=Math.floor(Math.random()*(this.colorArray.length+1)),s=this.defaultColor;l<this.colorArray.length&&(s=this.colorArray[l]);var c=this.createBox(a,s);i[r]=c.getChildByName("body")}this._boxArray[e]=i}this.schedule(this.timeCallback,1)},a.retiming=function(){this.countDownTimeLabel.string=this.countDownTime+"",this.unschedule(this.timeCallback),this.schedule(this.timeCallback,1)},a.onRefresh=function(){b.loadScene("game-portrait")},a.start=function(){console.log("game start")},a.createBox=function(o,e){var t=f(this.boxPrefab);return t.setPosition(o),t.getChildByName("body").getComponent(p).color=e,t.getComponent(d).width=this._boxSize,t.getComponent(d).height=this._boxSize,t.getChildByName("background").getComponent(d).width=this._boxSize,t.getChildByName("background").getComponent(d).height=this._boxSize,t.getChildByName("body").getComponent(d).width=.9*this._boxSize,t.getChildByName("body").getComponent(d).height=.9*this._boxSize,this.node.addChild(t),t.getChildByName("body").getComponent("box").setGame(this),t},a.clickBox=function(o){if(!this._gameStop)if(this.compareColor(o.getComponent(p).color,this.defaultColor)){var e=(o.node.getParent().position.x-this._boxSize/2)/this._boxSize,t=(o.node.getParent().position.y-this._boxSize/2)/this._boxSize;console.log("clickbox col:"+e+", row : "+t),this.clearCrossBoxs(e,t)}else this.clickWrong()},a.clearCrossBoxs=function(o,e){for(var t=[],i=e-1;i>=0;i--){var r=this._boxArray[i][o];if(!this.compareColor(r.getComponent(p).color,this.defaultColor)){t.push(r),console.log("1find box col : "+o+", row : "+i);break}}for(i=e+1;i<this.ROW_NUM;i++){r=this._boxArray[i][o];if(!this.compareColor(r.getComponent(p).color,this.defaultColor)){t.push(r),console.log("2find box col : "+o+", row : "+i);break}}for(var n=o-1;n>=0;n--){r=this._boxArray[e][n];if(!this.compareColor(r.getComponent(p).color,this.defaultColor)){t.push(r),console.log("3find box col : "+n+", row : "+e);break}}for(n=o+1;n<this.COL_NUM;n++){r=this._boxArray[e][n];if(!this.compareColor(r.getComponent(p).color,this.defaultColor)){t.push(r),console.log("4find box col : "+n+", row : "+e);break}}this.findClearBox(t)},a.findClearBox=function(o){for(var e=0;e<o.length;e++){var t=o[e].getComponent(p).color;if(t!=s.WHITE)for(var i=e+1;i<o.length;i++){console.log(o[e].getComponent(p).color+", "+o[i].getComponent(p).color);var r=o[i].getComponent(p).color;this.compareColor(t,r)&&(console.log(e+" clear"),o[e].clear=!0,o[i].clear=!0)}}var n=!0;for(e=0;e<o.length;e++)o[e].clear&&(n=!1,this.score+=10,this.clearBox(o[e]));n?this.clickWrong():this.clickRight()},a.clickWrong=function(){this.wrongAudioEffect.play(),this.score-=10,this.scoreLabel.string=""+this.score,this.countDownTime-=this.punishTime,this.retiming()},a.clickRight=function(){this.countDownTime+=this.rewardTime,this.rightAudioEffect.play(),this.scoreLabel.string=""+this.score,this.retiming()},a.clearBox=function(o){o.getComponent("box").clear()},a.compareColor=function(o,e){return o.r==e.r&&o.g==e.g&&o.b==e.b},a.gameStop=function(){this._gameStop=!0,this.unschedule(this.timeCallback);var o=this.node.parent.getChildByName("stop").getComponent(u);o.enabled=!0,o.string="游戏结束，得分："+this.score},e}(C)).prototype,"ROW_NUM",[x],{configurable:!0,enumerable:!0,writable:!0,initializer:function(){return 8}}),L=e(T.prototype,"COL_NUM",[w],{configurable:!0,enumerable:!0,writable:!0,initializer:function(){return 6}}),D=e(T.prototype,"defaultColor",[_],{configurable:!0,enumerable:!0,writable:!0,initializer:function(){return(new s).fromHEX("#8ea2a2")}}),M=e(T.prototype,"boxPrefab",[v],{configurable:!0,enumerable:!0,writable:!0,initializer:function(){return null}}),E=e(T.prototype,"colorArray",[z],{configurable:!0,enumerable:!0,writable:!0,initializer:function(){return[s.GREEN,s.RED,s.BLUE]}}),P=e(T.prototype,"countDownTime",[S],{configurable:!0,enumerable:!0,writable:!0,initializer:function(){return 60}}),R=e(T.prototype,"rewardTime",[N],{configurable:!0,enumerable:!0,writable:!0,initializer:function(){return 2}}),O=e(T.prototype,"punishTime",[B],{configurable:!0,enumerable:!0,writable:!0,initializer:function(){return 5}}),k=T))||k));a._RF.pop()}}}));

System.register("chunks:///_virtual/box.ts",["./_rollupPluginModLoBabelHelpers.js","cc"],(function(o){"use strict";var t,n,e,i,r,s,c,a,l,u;return{setters:[function(o){t=o.inheritsLoose,n=o.defineProperty,e=o.assertThisInitialized},function(o){i=o.cclegacy,r=o._decorator,s=o.Sprite,c=o.Color,a=o.instantiate,l=o.tween,u=o.Component}],execute:function(){var h;i._RF.push({},"fe816Rxw71PErzuCKS7D6by","box",void 0);var p=r.ccclass;r.property,o("box",p("box")(h=function(o){function i(){for(var t,i=arguments.length,r=new Array(i),s=0;s<i;s++)r[s]=arguments[s];return t=o.call.apply(o,[this].concat(r))||this,n(e(t),"testpro",111),n(e(t),"_game",void 0),t}t(i,o);var r=i.prototype;return r.onLoad=function(){console.log("box onload"),this.node.on("touch-start",this.on_touch_start,this),this.node.on("touch-end",this.on_touch_end,this)},r.start=function(){console.log("box start")},r.setGame=function(o){this._game=o},r.on_touch_start=function(){console.log("touch start")},r.on_touch_end=function(){console.log("touch end"),this.getComponent(s).color!=c.WHITE?this._game.clickBox(this):console.log("click white box")},r.clear=function(){var o=a(this.node);o.parent=this.node.parent,o.setPosition(this.node.position),o.getComponent("box").playClearAnimation(),this.getComponent(s).color=this._game.defaultColor},r.playClearAnimation=function(){var o=this;l(this.getComponent(s)).to(.1,{color:c.TRANSPARENT},{easing:"fade",onUpdate:function(t,n){o.getComponent(s).color=new c(o.getComponent(s).color.r,o.getComponent(s).color.g,o.getComponent(s).color.b,t.a)},onComplete:function(t){o.node.destroy()}}).start()},i}(u))||h);i._RF.pop()}}}));

System.register("chunks:///_virtual/main",["./game.ts","./box.ts"],(function(){"use strict";return{setters:[null,null],execute:function(){}}}));

(function(r) {
  r('virtual:///prerequisite-imports/main', 'chunks:///_virtual/main'); 
})(function(mid, cid) {
    System.register(mid, [cid], function (_export, _context) {
    return {
        setters: [function(_m) {
            var _exportObj = {};

            for (var _key in _m) {
              if (_key !== "default" && _key !== "__esModule") _exportObj[_key] = _m[_key];
            }
      
            _export(_exportObj);
        }],
        execute: function () { }
    };
    });
});