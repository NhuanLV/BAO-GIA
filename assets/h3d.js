/* ===== CÔNG TRƯỜNG 3D LIỀN MẠCH (Three.js r128): các bước cộng dồn, camera bay giữa các bước ===== */
var H3D=(function(){
if(typeof THREE==='undefined')return {ready:false,attach:function(){},resize:function(){},detach:function(){}};
var T=THREE,R={ready:false},renderer,scene,camera,canvas,container=null,raf=0,clock=new T.Clock(),tTotal=0;
var layers=[],mach={},stage=-1,stageT=0,DUR=3.2,camP=new T.Vector3(40,30,60),camT=new T.Vector3(0,0,0),goalP=new T.Vector3(40,30,60),goalT=new T.Vector3(0,0,0),orbit=0;
var MAT={};function M(c,o){var k=c+(o?JSON.stringify(o):'');if(!MAT[k])MAT[k]=new T.MeshLambertMaterial(Object.assign({color:c},o||{}));return MAT[k];}
function add(p,m){(p||scene).add(m);return m;}
function box(w,h,d,c,x,y,z,p,o){var m=new T.Mesh(new T.BoxGeometry(w,h,d),M(c,o));m.position.set(x||0,y||0,z||0);return add(p,m);}
function cyl(rt,rb,h,c,x,y,z,p,seg,o){var m=new T.Mesh(new T.CylinderGeometry(rt,rb,h,seg||14),M(c,o));m.position.set(x||0,y||0,z||0);return add(p,m);}
function grp(x,y,z,p){var g=new T.Group();g.position.set(x||0,y||0,z||0);return add(p,g);}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function ease(t){return t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}
var PILES=[];for(var ix=-1;ix<=1;ix++)for(var iz=-1;iz<=1;iz++)PILES.push([ix*5,iz*5]);
function L(name,g,at,kind,leave,h){var o={name:name,g:g,at:at,kind:kind||'pop',leave:leave==null?null:leave,h:h||8};g.userData.y0=g.position.y;layers.push(o);g.visible=false;return o;}

/* ---------- địa hình ---------- */
function gh(x){if(x<=12)return x<=-12?0.6:0.5;if(x<=15.3)return 0.5-(x-12)*(1.1/3.3);return -0.6;}
function terrain(){
  var pos=[],col=[],cg=new T.Color(0x86a368),cb=new T.Color(0xa89b7d),cr=new T.Color(0xb7a98a),X0=-260,X1=140,Z0=-99,Z1=99,dx=4,dz=3;
  function v(x,z,c){pos.push(x,gh(x),z);col.push(c.r,c.g,c.b);}
  for(var x=X0;x<X1;x+=dx)for(var z=Z0;z<Z1;z+=dz){
    var cx=x+dx/2,cz=z+dz/2;
    if(cx>-12&&cx<12&&Math.abs(cz)<12)continue;                 /* cửa sổ cắt ngang đất */
    if(cx>=-240&&cx<-12&&Math.abs(cz)<6)continue;               /* hành lang đường */
    if(cx>16&&cx<100&&Math.abs(cz)<56)continue;                 /* vùng nạo vét */
    var c=cx>12?cb:((cx<-12&&Math.abs(cz)<14)?cr:cg);
    v(x,z,c);v(x,z+dz,c);v(x+dx,z,c);v(x+dx,z,c);v(x,z+dz,c);v(x+dx,z+dz,c);}
  var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.computeVertexNormals();
  scene.add(new T.Mesh(g,new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide})));
  /* cửa sổ đất trong suốt để thấy cọc */
  var layersC=[[0.5,-2,0x7a6445],[-2,-8,0xb08f60],[-8,-14,0xcdb98f],[-14,-18,0x857e72]];
  layersC.forEach(function(a){box(24,a[0]-a[1],24,a[2],0,(a[0]+a[1])/2,0,null,{transparent:true,opacity:0.34,depthWrite:false});});
  /* nước */
  var w=new T.Mesh(new T.PlaneGeometry(300,300),new T.MeshLambertMaterial({color:0x5f8fa8,transparent:true,opacity:0.62,depthWrite:false}));w.rotation.x=-Math.PI/2;w.position.set(162,-0.31,0);scene.add(w);
  /* mặt nền vùng nạo vét (trước khi nạo vét) */
  var pit=grp(0,0,0);var bed=new T.Mesh(new T.PlaneGeometry(84,112),new T.MeshLambertMaterial({color:0xa89b7d}));bed.rotation.x=-Math.PI/2;bed.position.set(58,-0.6,0);pit.add(bed);
  R.pitBed=bed;
  var walls=grp(0,0,0,pit);box(84,2,0.4,0x6b5a3e,58,-1.6,56,walls);box(84,2,0.4,0x6b5a3e,58,-1.6,-56,walls);box(0.4,2,112,0x6b5a3e,100,-1.6,0,walls);box(0.4,2,112,0x6b5a3e,16,-1.6,0,walls);R.pitWalls=walls;walls.visible=false;
  /* bờ đối diện và nền đáy xa */
  var far=new T.Mesh(new T.PlaneGeometry(300,300),new T.MeshLambertMaterial({color:0x7d9a5c}));far.rotation.x=-Math.PI/2;far.position.set(330,0.2,0);scene.add(far);
  /* mặt bằng cạn trong đê quây */
  var dry=new T.Mesh(new T.PlaneGeometry(92,124),new T.MeshLambertMaterial({color:0xa89b7d}));dry.rotation.x=-Math.PI/2;dry.position.set(58,-0.2,0);var dg=grp(0,0,0);dg.add(dry);L('dry',dg,3,'none',31);
}
/* ---------- người, máy ---------- */
function man(x,z,s,p,vest){var g=grp(x,0,z,p);cyl(0.18,0.2,0.8,0x2f3a45,0,0.4,0,g,8);cyl(0.26,0.26,0.7,vest||0xf08a1c,0,1.15,0,g,10);var h=new T.Mesh(new T.SphereGeometry(0.17,10,8),M(0x4a3f38));h.position.y=1.7;g.add(h);var hat=new T.Mesh(new T.SphereGeometry(0.2,10,6,0,Math.PI*2,0,Math.PI/2),M(0xf4f4ef));hat.position.y=1.74;g.add(hat);g.scale.setScalar(s||1);g.userData.idle=function(t){g.position.y=Math.abs(Math.sin(t*3+x))*0.05;};return g;}
function crawlerBase(g,len,w,col){[-1,1].forEach(function(s){box(0.9,0.9,len,0x262b30,s*w/2,0.45,0,g);for(var k=-2;k<=2;k++)cyl(0.32,0.32,0.95,0x4a535b,s*w/2,0.45,k*len/5,g,8).rotation.z=Math.PI/2;});box(w-0.6,0.5,len-0.8,0x3a4147,0,0.9,0,g);}
function craneM(){var g=new T.Group();crawlerBase(g,6,3.2);box(3.4,1.8,4.8,0xe8b73a,0,2,-0.4,g);box(1.6,1.4,1.5,0xbfdbe8,0.8,3.4,1.2,g);box(3,1.2,1.4,0x353b41,0,1.8,-3.2,g);
  var b=grp(0,2.8,1.4,g);var boom=box(0.55,0.55,26,0xd4621f,0,0,13,b);b.rotation.x=-1.08;g.userData.boom=b;
  var tip=new T.Vector3(0,0,26);var hook=grp(0,0,26,b);g.userData.hook=hook;var rope=cyl(0.03,0.03,12,0x1f2a33,0,-6,0,hook,4);var blk=box(0.5,0.6,0.5,0x14354f,0,-12,0,hook);g.userData.load=grp(0,-12.5,0,hook);
  g.userData.idle=function(t){b.rotation.y=Math.sin(t*0.5)*0.12;};return g;}
function rigM(){var g=new T.Group();crawlerBase(g,7,3.4);box(3.6,2,5,0xe8b73a,0,2.1,-0.5,g);box(1.6,1.4,1.6,0xbfdbe8,0.9,3.5,1.6,g);var mast=grp(0,1.6,3.6,g);box(0.9,24,0.9,0xb35a1a,0,12,0,mast);box(1.4,0.9,1.4,0x2d343a,0,23.5,0,mast);
  var head=grp(0,17,0.9,mast);box(1.6,1.2,1.6,0x2d343a,0,0,0,head);var kelly=cyl(0.14,0.14,22,0x7b868e,0,-11,0,head,8);cyl(0.5,0.5,0.9,0x59636b,0,-22.4,0,kelly,10);g.userData.head=head;g.userData.kelly=kelly;
  g.userData.idle=function(t,tt){head.position.y=14-Math.abs(Math.sin(t*0.6))*9;kelly.rotation.y=t*6;};return g;}
function mixerM(){var g=new T.Group();box(2.5,0.5,9,0x3b4248,0,0.9,0,g);box(2.5,2,2,0xe8702f,0,2.1,4,g);box(1.9,0.9,0.1,0xbfdbe8,0,2.5,5.05,g);
  var dr=grp(0,2.3,-0.8,g);var d=cyl(1.35,1.35,6,0xf1f1ec,0,0,0,dr,16);d.rotation.x=Math.PI/2+0.14;var st=cyl(1.37,1.37,0.4,0xd4621f,0,0,-1.2,dr,16);st.rotation.x=Math.PI/2+0.14;g.userData.drum=d;
  [[-1.2,-3],[1.2,-3],[-1.2,-1.2],[1.2,-1.2],[-1.2,3.2],[1.2,3.2]].forEach(function(w){cyl(0.52,0.52,0.4,0x1f2326,w[0],0.52,w[1],g,10).rotation.z=Math.PI/2;});
  g.userData.idle=function(t){d.rotation.y=t*1.2;};return g;}
function pumpM(){var g=mixerM();g.children[2].visible=false;var b=grp(0,3.2,-2.5,g);var s1=box(0.5,0.5,8,0xd6a321,0,0,4,b);var s2=grp(0,0,8,b);box(0.45,0.45,7,0xd6a321,0,0,3.5,s2);var s3=grp(0,0,7,s2);box(0.4,0.4,6,0xd6a321,0,0,3,s3);b.rotation.x=-0.5;s2.rotation.x=0.9;s3.rotation.x=0.8;g.userData.pb=b;g.userData.idle=function(t){b.rotation.y=Math.sin(t*0.4)*0.1;};return g;}
function excM(){var g=new T.Group();crawlerBase(g,4.6,2.6);box(2.8,1.5,3.4,0xe8b73a,0,1.9,-0.2,g);box(1.2,1.3,1.4,0xbfdbe8,0.6,3.1,0.8,g);box(2.6,1,1,0x353b41,0,1.7,-2,g);
  var b=grp(0,2.2,1.4,g);box(0.5,0.5,5.5,0xe8b73a,0,0,2.7,b);var a=grp(0,0,5.4,b);box(0.4,0.4,3,0xe8b73a,0,0,1.4,a);var bk=grp(0,0,2.9,a);box(1.3,0.35,0.9,0x59636b,0,0,0.3,bk);box(1.3,0.8,0.15,0x59636b,0,-0.3,0.65,bk);
  b.rotation.x=-0.5;a.rotation.x=1.0;bk.rotation.x=0.6;g.userData.idle=function(t){var s=Math.sin(t*0.9);b.rotation.x=-0.5+s*0.25;a.rotation.x=1.0-s*0.3;bk.rotation.x=0.6+s*0.5;g.rotation.y=g.userData.ry0+Math.sin(t*0.4)*0.3;};g.userData.ry0=0;return g;}
function dumpM(){var g=new T.Group();box(2.5,0.5,8,0x3b4248,0,1,0,g);var bed=grp(0,1.3,-3,g);var bb=box(2.7,1.5,5,0xe8702f,0,0.8,2.5,bed);box(2.4,0.5,4.6,0x8c7448,0,1.4,2.5,bed);box(2.5,2.2,2,0xf1f1ec,0,2.1,3.6,g);box(1.9,0.9,0.1,0xbfdbe8,0,2.6,4.65,g);
  [[-1.2,-2.5],[1.2,-2.5],[-1.2,-0.9],[1.2,-0.9],[-1.2,3.2],[1.2,3.2]].forEach(function(w){cyl(0.55,0.55,0.4,0x1f2326,w[0],0.55,w[1],g,10).rotation.z=Math.PI/2;});g.userData.idle=function(t){bed.rotation.x=-Math.max(0,Math.sin(t*0.5))*0.4;};return g;}
function rollerM(){var g=new T.Group();var body=grp(0,0,0,g);box(1.6,1.2,4.2,0xe8b73a,0,1.5,0,body);box(1.3,1.4,1.4,0xbfdbe8,0,2.6,0.6,body);cyl(0.85,0.85,2.1,0xb5bdc3,0,0.85,1.9,body,14).rotation.z=Math.PI/2;cyl(0.85,0.85,2.1,0xb5bdc3,0,0.85,-1.9,body,14).rotation.z=Math.PI/2;g.userData.body=body;g.userData.idle=function(t){body.position.z=Math.sin(t*0.7)*7;};return g;}
function sawM(){var g=new T.Group();box(0.9,0.6,1.4,0xe0662a,0,0.7,0,g);var d=cyl(0.35,0.35,0.05,0xb5bdc3,0.5,0.4,0.5,g,16);d.rotation.z=Math.PI/2;box(0.1,1,0.1,0x59636b,0,1.2,-0.5,g);g.userData.idle=function(t){d.rotation.x=t*30;g.position.z=g.userData.z0+Math.sin(t*0.5)*4.5;};return g;}
function bargeM(){var g=new T.Group();box(11,1.5,34,0x59636b,0,0.2,0,g);box(10.4,0.2,33,0x7b868e,0,1,0,g);var e=excM();e.position.set(0,1.1,-6);e.scale.setScalar(1.35);g.add(e);g.userData.exc=e;box(1,1,1,0xffffff,0,-10,0,g).visible=false;
  g.userData.idle=function(t){e.userData.idle(t);g.position.y=Math.sin(t*1.2)*0.06;};return g;}
function hopperM(){var g=new T.Group();box(9,1.7,28,0x8a2f1b,0,0.3,0,g);box(8.6,0.2,27,0x5a6168,0,1.2,0,g);var tug=grp(0,0.4,-20,g);box(5,2.5,8,0xf1f1ec,0,1.4,0,tug);box(3.4,1.6,3.4,0xbfdbe8,0,3.4,0.6,tug);box(4.6,0.3,7.5,0xd4621f,0,0.2,0,tug);g.userData.idle=function(t){g.position.x=g.userData.x0+Math.sin(t*0.25)*8;g.position.y=Math.sin(t*1.1)*0.07;};return g;}
function tripod(g,x,z){var t=grp(x,0,z,g);[[-0.4,0.3],[0.4,0.3],[0,-0.45]].forEach(function(l){var c=cyl(0.03,0.03,1.5,0x2e353b,l[0]*0.5,0.75,l[1]*0.5,t,5);c.rotation.z=-l[0]*0.5;c.rotation.x=l[1]*0.5;});box(0.25,0.3,0.25,0xd8792b,0,1.6,0,t);return t;}
function containerM(x,z,c,p){box(6,2.6,2.4,c,x,1.3,z,p);box(5.9,0.1,2.3,0x59636b,x,2.65,z,p);box(0.1,1.8,1.2,0x7d6a4f,x+3.02,1.2,z,p);}

/* ---------- dựng thế giới ---------- */
function build(){
  scene=new T.Scene();scene.background=new T.Color(0xcfe3ee);scene.fog=new T.Fog(0xcfe3ee,150,520);
  scene.add(new T.HemisphereLight(0xe8f0f6,0x5d6b52,0.52));var dl=new T.DirectionalLight(0xfff3dc,0.62);dl.position.set(70,120,50);scene.add(dl);
  camera=new T.PerspectiveCamera(42,1.5,0.5,900);
  terrain();
  /* 0: khảo sát */
  var g0=grp(0,0,0);for(var k=0;k<14;k++){var sx=-(k*16+12);cyl(0.01,0.1,0.9,0xd4621f,sx,0.9,-6.8,g0,6);cyl(0.01,0.1,0.9,0xd4621f,sx,0.9,6.8,g0,6);}
  [[-7,-8],[7,-8],[-7,8],[7,8]].forEach(function(p){cyl(0.01,0.12,1.4,0xd4621f,p[0],1,p[1],g0,6);});tripod(g0,-20,-10);var m0=man(-18.6,-10,1.1,g0);L('stakes',g0,0,'pop');layers[layers.length-1].g.userData.men=[m0];
  /* 1: lán trại + đường công vụ + kho thép */
  var g1=grp(0,0,0);containerM(-60,-30,0xdfe3e5,g1);containerM(-52,-30,0x7fa6c9,g1);containerM(-60,-34,0xdfe3e5,g1);containerM(-52,-34,0xe0a63a,g1);
  box(26,0.05,16,0xa39a8a,-56,0.62,-28,g1);[0,1,2].forEach(function(i){box(12,0.5,1,0x8a4b1f,-30,0.9+i*0.55,-20+i*0,g1);});box(0.2,6,0.2,0xcccccc,-70,3.2,-22,g1);box(1.6,1,0.05,0xc0392b,-69.2,5.6,-22,g1);
  box(232,0.05,4,0xa39a8a,-125,0.64,-11,g1);L('camp',g1,1,'pop');
  /* 2: sàn công tác */
  var g2=grp(0,0,0);box(4,0.12,24,0xc9cbcc,-10,0.56,0,g2);box(4,0.12,24,0xc9cbcc,10,0.56,0,g2);box(16,0.12,4,0xc9cbcc,0,0.56,10,g2);box(16,0.12,4,0xc9cbcc,0,0.56,-10,g2);L('platform',g2,2,'grow');
  /* 3: đê quây hình chữ U */
  var g3=grp(0,0,0);function dseg(len,x,z,ry){var sh=new T.Shape();sh.moveTo(-4.5,-0.6);sh.lineTo(4.5,-0.6);sh.lineTo(1.25,1.4);sh.lineTo(-1.25,1.4);sh.closePath();var ge=new T.ExtrudeGeometry(sh,{depth:len,bevelEnabled:false});ge.translate(0,0,-len/2);var m=new T.Mesh(ge,M(0x8c7448));m.position.set(x,0,z);m.rotation.y=ry;g3.add(m);}
  dseg(30,29,58,Math.PI/2);dseg(30,29,-58,Math.PI/2);dseg(116,44,0,0);var tg2=grp(46.9,0.45,0,g3);tg2.rotation.z=-Math.atan2(2,3.25);var tarp=new T.Mesh(new T.PlaneGeometry(3.9,116),new T.MeshLambertMaterial({color:0x3f8f4f,side:T.DoubleSide}));tarp.rotation.x=-Math.PI/2;tg2.add(tarp);L('dike',g3,3,'grow',31);
  /* 4: điện, 5: phao */
  var g4=grp(0,0,0);box(3.2,1.8,1.6,0xe8b73a,-24,1.5,-16,g4);for(var q=0;q<6;q++){cyl(0.08,0.08,7,0x59636b,-16-q*10,3.8,-8.5,g4,5);}for(var q2=0;q2<5;q2++){box(10,0.03,0.03,0x2d343a,-21-q2*10,7,-8.5,g4);}L('power',g4,4,'pop');
  var g5=grp(0,0,0);[[110,-45],[110,0],[110,45],[70,-68],[30,-68],[70,68],[30,68]].forEach(function(p,i){var b=grp(p[0],-0.3,p[1],g5);cyl(0.6,0.9,1.2,i%2?0x1b7a51:0xc0392b,0,0.5,0,b,10);cyl(0.06,0.06,2.4,0x59636b,0,2,0,b,5);var lt=new T.Mesh(new T.SphereGeometry(0.25,8,6),new T.MeshBasicMaterial({color:0xffd34d}));lt.position.y=3.3;b.add(lt);b.userData.idle=function(t){b.position.y=-0.3+Math.sin(t*1.4+i)*0.12;};});L('buoys',g5,5,'pop');
  /* đường: các lớp */
  function road(y0,y1,col,name,at,w){var g=grp(0,0,0);box(234,y1-y0,w||12,col,-123,(y0+y1)/2,0,g);return L(name,g,at,'grow');}
  var strip=grp(0,0,0);box(234,0.04,12,0x8c7448,-123,0.63,0,strip);L('rstrip',strip,6,'none',8);
  var dig=grp(0,0,0);box(234,0.04,12,0x6b5a3e,-123,0.2,0,dig);[-1,1].forEach(function(s){for(var h=0;h<5;h++){var sp=new T.Mesh(new T.ConeGeometry(2,1.3,8),M(0x7a6445));sp.position.set(-30-h*45,0.9,s*9);dig.add(sp);}});L('rdig',dig,7,'none',8);
  road(0.2,1.02,0xa39a8a,'rfill',8);road(1.02,1.62,0x8f8a80,'rrock',9);road(1.62,2.02,0xc9c3b6,'rcpdd',25);road(2.02,2.28,0xcfd4d6,'rbt',26);
  var joints=grp(0,0,0);for(var j=0;j<52;j++)box(0.05,0.03,12,0x4a535b,-8-j*4.5,2.295,0,joints);box(234,0.03,0.05,0x4a535b,-123,2.295,0,joints);L('rjoints',joints,28,'pop');
  var dow=grp(0,0,0);for(var j2=0;j2<52;j2++){box(0.06,0.06,10,0xa0561f,-8-j2*4.5,2.1,0,dow);}L('rdowels',dow,27,'pop',28);
  var slab=grp(0,0,0);box(6,0.27,12,0xe2e5e6,-9,2.29,0,slab);L('rslab',slab,29,'pop');
  var curb=grp(0,0,0);[-1,1].forEach(function(s){box(234,0.4,0.35,0xcfd4d6,-123,2.46,s*6.2,curb);box(234,0.5,0.6,0xb9bdbf,-123,1.9,s*6.5,curb);});L('curb',curb,30,'grow');
  /* cọc: ống vách, hố, lồng, bê tông */
  var cas=grp(0,0,0),sh=grp(0,0,0),cg=grp(0,0,0),pc=grp(0,0,0);
  PILES.forEach(function(p){
    var c=new T.Mesh(new T.CylinderGeometry(0.58,0.58,6,16,1,true),new T.MeshLambertMaterial({color:0x9fb1bf,side:T.DoubleSide}));c.position.set(p[0],-0.5,p[1]);cas.add(c);
    var gs=new T.CylinderGeometry(0.5,0.5,17,14);gs.translate(0,-8.5,0);var s=new T.Mesh(gs,M(0x2a2018));s.position.set(p[0],0.5,p[1]);sh.add(s);
    var gc=new T.CylinderGeometry(0.42,0.42,16,12,6,true);gc.translate(0,-8,0);var cm=new T.Mesh(gc,new T.MeshBasicMaterial({color:0xb5651d,wireframe:true}));cm.position.set(p[0],0.8,p[1]);cg.add(cm);
    var gp=new T.CylinderGeometry(0.5,0.5,17,16);gp.translate(0,8.5,0);var pm=new T.Mesh(gp,M(0xb9bdbf));pm.position.set(p[0],-16.5,p[1]);pc.add(pm);});
  L('casing',cas,11,'stagdrop',14);L('shafts',sh,12,'stagy',14);L('cage',cg,13,'stagdrop',14);L('piles',pc,14,'stagy');
  var dw=grp(0,0,0);PILES.forEach(function(p){for(var a=0;a<4;a++){var an=a*Math.PI/2;cyl(0.02,0.02,1.4,0xa0561f,p[0]+Math.cos(an)*0.38,1.2,p[1]+Math.sin(an)*0.38,dw,4);}});L('dowels',dw,17,'pop',20);
  /* ván khuôn bệ, thép bệ, bệ */
  var fm=grp(0,0,0);[[0,1.2,-7.2,12.8,2.4,0.15],[0,1.2,7.2,12.8,2.4,0.15],[-6.2,1.2,0,0.15,2.4,14.4],[6.2,1.2,0,0.15,2.4,14.4]].forEach(function(f){box(f[3],f[4],f[5],0x7a8791,f[0],f[1],f[2],fm,{transparent:true,opacity:0.55});});L('form',fm,18,'drop',21,6);
  var pts=[];for(var lv=0;lv<2;lv++){var yy=0.7+lv*1.0;for(var xx=-5.6;xx<=5.6;xx+=0.4){pts.push(new T.Vector3(xx,yy,-6.6),new T.Vector3(xx,yy,6.6));}for(var zz=-6.6;zz<=6.6;zz+=0.4){pts.push(new T.Vector3(-5.6,yy,zz),new T.Vector3(5.6,yy,zz));}}
  var rb=grp(0,0,0);rb.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:0xa0561f})));L('rebar',rb,19,'grow',20);
  var cs=new T.Shape();cs.moveTo(-6,0.94);cs.lineTo(6,0.10);cs.lineTo(6,1.70);cs.lineTo(-6,2.28);cs.closePath();var cgm=new T.ExtrudeGeometry(cs,{depth:14,bevelEnabled:false});cgm.translate(0,-0.1,-7);var cap=new T.Mesh(cgm,M(0xb2b6b8));cap.position.y=0.1;var capg=grp(0,0,0);capg.add(cap);L('cap',capg,20,'grow');
  /* khối neo: hố, khối, cột bích */
  var A=[[-40,13],[-50,-13]];var pits=grp(0,0,0),anc=grp(0,0,0),bol=grp(0,0,0);
  A.forEach(function(a){box(4.4,2.6,4.4,0x3a2d1e,a[0],-0.55,a[1],pits);var an=grp(a[0],0,a[1],anc);box(3.5,0.8,3.5,0xb2b6b8,0,-1.35,0,an);var fr=cyl(0.57,1.77,1.7,0xb2b6b8,0,-0.1,0,an,4);fr.rotation.y=Math.PI/4;
    var bo=grp(a[0],0.75,a[1],bol);cyl(0.22,0.28,0.6,0x4a535b,0,0.3,0,bo,10);cyl(0.34,0.24,0.18,0x6b747c,0,0.66,0,bo,10);});
  L('pits',pits,21,'grow',22);L('anchors',anc,22,'grow');L('bollards',bol,23,'pop');
  /* đệm va */
  var fe=grp(0,0,0);[-3.5,3.5].forEach(function(z){box(0.7,1.2,1.5,0x1f2326,6.35,1.15,z,fe);});L('fenders',fe,24,'pop');
  /* kè mái */
  var liner=grp(0,0,0);var ln=new T.Mesh(new T.PlaneGeometry(112,3.5),new T.MeshLambertMaterial({color:0xcfc7b0}));ln.rotation.x=-Math.PI/2;ln.rotation.z=Math.PI/2;ln.position.set(13.65,0.0,0);var sl=Math.atan2(1.1,3.3);var lg=new T.Group();lg.position.set(13.65,-0.05,0);lg.rotation.z=-sl;var lp=new T.Mesh(new T.PlaneGeometry(3.5,112),new T.MeshLambertMaterial({color:0xcfc7b0,side:T.DoubleSide}));lp.rotation.x=-Math.PI/2;lg.add(lp);liner.add(lg);L('liner',liner,32,'pop');
  var bk=new T.InstancedMesh(new T.BoxGeometry(0.5,0.1,0.35),M(0xc9cdcf),7*320);var mtx=new T.Matrix4(),q=new T.Quaternion(),sc=new T.Vector3(1,1,1),ps=new T.Vector3(),idx=0;q.setFromEuler(new T.Euler(0,0,-sl));
  for(var zi=0;zi<320;zi++)for(var ui=0;ui<7;ui++){var u=(ui+0.5)*0.5,xx2=12.2+u*Math.cos(sl),yy2=0.5-u*Math.sin(sl);ps.set(xx2,yy2+0.05,-56+zi*0.35);mtx.compose(ps,q,sc);bk.setMatrixAt(idx++,mtx);}bk.instanceMatrix.needsUpdate=true;var bg=grp(0,0,0);bg.add(bk);bg.userData.inst=bk;bg.userData.n=idx;L('blocks',bg,33,'count');
  var rp=new T.InstancedMesh(new T.DodecahedronGeometry(0.45,0),M(0x8f8a80),700);idx=0;for(var ri=0;ri<700;ri++){ps.set(15.3+Math.random()*4.5,-0.4+Math.random()*0.5,-56+ri*0.16);var sx=0.7+Math.random()*0.8;q.setFromEuler(new T.Euler(Math.random()*3,Math.random()*3,0));sc.set(sx,0.6+Math.random()*0.5,sx);mtx.compose(ps,q,sc);rp.setMatrixAt(idx++,mtx);}rp.instanceMatrix.needsUpdate=true;var rg=grp(0,0,0);rg.add(rp);rg.userData.inst=rp;rg.userData.n=idx;L('riprap',rg,34,'count');
  /* quan trắc, phòng thí nghiệm */
  var mo=grp(0,0,0);[[-10,-9],[10,-9],[16,0],[-100,-8],[-180,-8]].forEach(function(p){cyl(0.12,0.12,1.6,0xffffff,p[0],1.4,p[1],mo,6);cyl(0.2,0.2,0.2,0xd4621f,p[0],0.7,p[1],mo,6);});L('monitor',mo,36,'pop');
  var lab=grp(0,0,0);containerM(-68,-24,0xdfe3e5,lab);box(2,1,1,0xb9bdbf,-62,0.6,-24,lab);L('lab',lab,37,'pop');
  /* máy */
  mach.crane=craneM();mach.rig=rigM();mach.mixer=mixerM();mach.pump=pumpM();mach.exc=excM();mach.dump=dumpM();mach.roller=rollerM();mach.saw=sawM();mach.barge=bargeM();mach.hopper=hopperM();mach.exc2=excM();mach.dump2=dumpM();mach.mixer2=mixerM();mach.crane2=craneM();
  Object.keys(mach).forEach(function(k){mach[k].visible=false;scene.add(mach[k]);});
  mach.men=[man(0,0,1.1,scene),man(0,0,1.1,scene,0xe5d11a)];mach.men.forEach(function(m){m.visible=false;});
  /* thùng cọc ống vách hoặc lồng thép treo trên cẩu */
}
/* ---------- các bước ---------- */
var CP={ov:[70,48,78,24,0,0],pile:[32,21,38,-4,6,0],pile2:[22,12,27,-1,0.5,0],road:[-70,16,30,-120,1,-2],road2:[-30,14,24,-80,1,0],bank:[-70,22,52,-52,1,-16],dike:[120,62,118,40,0,0],buoy:[150,48,120,60,0,0],dredge:[60,26,56,56,-1,0],slope:[28,8,34,14,0,0],anc:[-20,9,30,-42,0,8],fin:[60,40,90,10,0,0]};
function P(a){return {p:new T.Vector3(a[0],a[1],a[2]),t:new T.Vector3(a[3],a[4],a[5])};}
var STG=[
 {c:['7.1'],cam:'ov',m:{men0:[-18.6,0,-10,0]}},
 {c:['1.2'],cam:'bank',m:{dump:[-60,0.64,-11,Math.PI/2]}},
 {c:['1.3'],cam:'pile',m:{exc:[-14,0.7,8,-Math.PI/2],dump:[-30,0.64,-11,Math.PI/2]}},
 {c:['1.1'],cam:'dike',m:{exc:[60,1.8,56,Math.PI],dump:[80,1.8,60,-Math.PI/2]}},
 {c:['1.4'],cam:'bank',m:{}},
 {c:['1.5'],cam:'buoy',m:{}},
 {c:['2.1'],cam:'road',m:{exc:[-80,0.7,4,Math.PI/2],dump:[-95,0.7,-3,-Math.PI/2]}},
 {c:['2.2'],cam:'road',m:{exc:[-100,0.25,0,Math.PI/2],dump:[-115,0.25,3,-Math.PI/2]}},
 {c:['2.3'],cam:'road2',m:{dump:[-60,1.0,2,-Math.PI/2],roller:[-90,1.0,-1,Math.PI/2]}},
 {c:['2.4'],cam:'road2',m:{dump:[-60,1.6,2,-Math.PI/2],roller:[-100,1.6,-1,Math.PI/2]}},
 {c:['B0'],cam:'pile',m:{rig:[-14,0.7,0,Math.PI/2],crane:[-14,0.7,-10,Math.PI/2]}},
 {c:['P1'],cam:'pile',m:{crane:[-14,0.7,-6,Math.PI/2],men0:[3,0.6,9,0]}},
 {c:['P2'],cam:'pile',m:{rig:[0,0.7,9.2,Math.PI]}},
 {c:['P3'],cam:'pile',m:{crane:[-12,0.7,9,Math.PI/2]}},
 {c:['P4'],cam:'pile',m:{mixer:[-12,0.7,-12,Math.PI/2],pump:[-15,0.7,10,Math.PI/2]}},
 {c:['P5'],cam:'pile2',m:{men0:[7,0.6,8,0],men1:[8.2,0.6,8,0]}},
 {c:['P5b'],cam:'pile2',m:{crane:[-12,0.7,9,Math.PI/2]}},
 {c:['P6'],cam:'pile2',m:{men0:[0,0.6,2.6,0],men1:[3,0.6,2.8,0]}},
 {c:['P7'],cam:'pile2',m:{crane:[-14,0.7,9,Math.PI/2]}},
 {c:['P8'],cam:'pile2',m:{men0:[-2,2,6,0],men1:[2,2,-6,0]}},
 {c:['P9'],cam:'pile2',m:{mixer:[-14,0.7,-12,Math.PI/2],pump:[-14,0.7,9,Math.PI/2]}},
 {c:['6.1'],cam:'anc',m:{exc:[-34,0.6,13,Math.PI/2]}},
 {c:['6.3'],cam:'anc',m:{mixer:[-34,0.6,8,Math.PI/2]}},
 {c:['6.5'],cam:'anc',m:{crane:[-34,0.6,18,Math.PI/2]}},
 {c:['6.6'],cam:'pile2',m:{crane:[-12,0.7,9,Math.PI/2]}},
 {c:['4.1'],cam:'road2',m:{dump:[-70,1.62,2,-Math.PI/2],roller:[-100,1.62,-1,Math.PI/2]}},
 {c:['4.2'],cam:'road2',m:{mixer:[-60,2.02,2,-Math.PI/2],men0:[-80,2.02,3,0],men1:[-85,2.02,-3,0]}},
 {c:['4.3'],cam:'road2',m:{men0:[-70,2.1,2,0],men1:[-72,2.1,-2,0]}},
 {c:['4.7'],cam:'road2',m:{saw:[-60,2.3,1,0],men0:[-64,2.3,3,0]}},
 {c:['4.8'],cam:'road2',m:{men0:[-12,2.3,3,0],men1:[-14,2.3,-3,0]}},
 {c:['4.10'],cam:'road2',m:{mixer:[-50,2.3,8,-Math.PI/2],men0:[-70,2.3,6.9,0]}},
 {c:['2.5'],cam:'dredge',m:{barge:[58,0.1,10,Math.PI/2],hopper:[64,0.2,-20,Math.PI/2]}},
 {c:['5.2'],cam:'slope',m:{men0:[10,0.6,5,0],men1:[10,0.6,-6,0]}},
 {c:['5.1'],cam:'slope',m:{crane:[6,0.9,16,0]}},
 {c:['5.3'],cam:'slope',m:{exc:[8,0.6,-12,0],dump:[-8,0.6,-14,Math.PI/2]}},
 {c:['7.2'],cam:'dredge',m:{}},
 {c:['7.3'],cam:'ov',m:{men0:[-10,0.6,-9,0]}},
 {c:['7.4'],cam:'bank',m:{men0:[-62,0.6,-27,0]}},
 {c:['7.5'],cam:'fin',m:{}}];
var SOF={};STG.forEach(function(s,i){s.c.forEach(function(c){SOF[c]=i;});});
function setStage(i){
  stage=i;stageT=0;var S=STG[i],cp=P(CP[S.cam]);goalP.copy(cp.p);goalT.copy(cp.t);
  Object.keys(mach).forEach(function(k){if(k!=='men')mach[k].visible=false;});mach.men.forEach(function(m){m.visible=false;});
  Object.keys(S.m).forEach(function(k){var a=S.m[k],o;if(k==='men0'||k==='men1'){o=mach.men[+k.slice(3)];}else{o=mach[k];}if(!o)return;o.visible=true;o.position.set(a[0],a[1],a[2]);o.rotation.y=a[3];if(o.userData.ry0!=null)o.userData.ry0=a[3];if(o.userData.z0!=null||k==='saw'){o.userData.z0=a[2];}if(k==='hopper')o.userData.x0=a[0];if(k==='rig'){o.userData.entry=true;o.userData.xe=a[0];}});
  /* tải trên cẩu */
  var cr=mach.crane;if(cr&&cr.userData.load){while(cr.userData.load.children.length)cr.userData.load.remove(cr.userData.load.children[0]);
    var code=S.c[0];if(code==='P1'){var t=cyl(0.58,0.58,6,0x9fb1bf,0,-3,0,cr.userData.load,14);}
    if(code==='P3'){var t2=new T.Mesh(new T.CylinderGeometry(0.42,0.42,16,12,6,true),new T.MeshBasicMaterial({color:0xb5651d,wireframe:true}));t2.position.y=-8;cr.userData.load.add(t2);}
    if(code==='P5b'){box(1.4,1.6,1.4,0xd4621f,0,-1,0,cr.userData.load);}
    if(code==='P7'){box(10,2.2,0.2,0x7a8791,0,-1.2,0,cr.userData.load);}
    if(code==='6.5'){cyl(0.22,0.28,0.7,0x4a535b,0,-0.6,0,cr.userData.load,10);}
    if(code==='6.6'){box(0.7,1.2,1.5,0x1f2326,0,-1,0,cr.userData.load);}
    if(code==='5.1'){box(3,0.3,2,0xc9cdcf,0,-0.4,0,cr.userData.load);}}
}
function applyLayers(){
  var tt=ease(clamp(stageT/DUR,0,1));
  layers.forEach(function(l){var g=l.g,s=stage;
    if(s<l.at||(l.leave!=null&&s>=l.leave)){g.visible=false;return;}g.visible=true;var p=s>l.at?1:tt;
    switch(l.kind){
      case 'grow':g.scale.y=Math.max(0.001,p);break;
      case 'pop':g.scale.setScalar(Math.max(0.001,p));break;
      case 'drop':g.position.y=g.userData.y0+(1-p)*l.h;break;
      case 'count':g.userData.inst.count=Math.floor(p*g.userData.n);break;
      case 'stagy':case 'stagdrop':var n=g.children.length;g.children.forEach(function(c,i){var pi=clamp((p*(n+1.5)-i)/1.5,0,1);if(l.kind==='stagy')c.scale.y=Math.max(0.001,pi);else{c.position.y=(c.userData.y0==null?(c.userData.y0=c.position.y):c.userData.y0)+(1-pi)*8;}});break;
      default:break;}
    if(l.name==='stakes'&&g.userData.men)g.userData.men[0].visible=true;
  });
  /* nạo vét: hạ đáy vùng nạo vét */
  var pb=R.pitBed;if(stage>=31){var dp=stage>31?1:tt;pb.position.y=-0.6-2.0*dp;R.pitWalls.visible=true;R.pitWalls.scale.y=1;}else{pb.position.y=-0.6;R.pitWalls.visible=false;}
  if(stage<31)pb.visible=true;
}
function resize(){if(!container||!renderer)return;var w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function frame(){
  raf=requestAnimationFrame(frame);if(!container||!canvas.isConnected||canvas.offsetParent===null){return;}
  var dt=Math.min(clock.getDelta(),0.1);tTotal+=dt;stageT+=dt;
  var k=1-Math.exp(-dt*2.4);camP.lerp(goalP,k);camT.lerp(goalT,k);orbit+=dt*0.12;
  var rel=camP.clone().sub(camT),a=Math.sin(orbit)*0.22,cs=Math.cos(a),sn=Math.sin(a);var rx=rel.x*cs-rel.z*sn,rz=rel.x*sn+rel.z*cs;
  camera.position.set(camT.x+rx,camT.y+rel.y+Math.sin(orbit*1.3)*0.8,camT.z+rz);camera.lookAt(camT);
  applyLayers();
  Object.keys(mach).forEach(function(kk){var m=mach[kk];if(kk==='men'){m.forEach(function(x){if(x.visible&&x.userData.idle)x.userData.idle(tTotal);});return;}if(m.visible&&m.userData.idle)m.userData.idle(tTotal,stageT);});
  layers.forEach(function(l){if(l.g.visible&&l.g.children.forEach)l.g.children.forEach(function(c){if(c.userData&&c.userData.idle)c.userData.idle(tTotal);});});
  var rig=mach.rig;if(rig.visible&&rig.userData.entry){var e=clamp(stageT/2.6,0,1);rig.position.x=rig.userData.xe-(1-ease(e))*70;}
  renderer.render(scene,camera);
}
R.init=function(holdEl){
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));canvas=renderer.domElement;canvas.className='h3-3d';
  build();R.ready=true;setStage(0);
};
R.attach=function(el,code){
  if(!R.ready||!el)return;container=el;if(canvas.parentNode!==el)el.appendChild(canvas);el.classList.add('on3d');resize();
  var s=SOF[code];if(s!=null&&s!==stage){setStage(s);}
  if(!raf){clock.getDelta();frame();}
};
R.detach=function(){container=null;};R.resize=resize;R.stageOf=function(c){return SOF[c];};R.setStage=setStage;
return R;})();
