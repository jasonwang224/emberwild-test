// Original, seamless grass paint: ragged moss islands under fine interwoven
// turf strokes. Tall blades and tiny flower ribbons live in meadow-detail.js.
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function hash(x,y,seed=731){let n=Math.imul(x+seed,374761393)^Math.imul(y+seed,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;}
function field(x,y,period,seed){const fx=x*period,fy=y*period,ix=Math.floor(fx),iy=Math.floor(fy),sx=smooth(fx-ix),sy=smooth(fy-iy);return mix(mix(hash(ix%period,iy%period,seed),hash((ix+1)%period,iy%period,seed),sx),mix(hash(ix%period,(iy+1)%period,seed),hash((ix+1)%period,(iy+1)%period,seed),sx),sy);}
export function createMeadowPixels(size=1024){
 const data=new Uint8ClampedArray(size*size*4),mossMap=new Float32Array(size*size),detailArea=(size/1024)**2;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size;
  const warpU=(u+(field(u,v,7,147)-.5)*.035+1)%1,warpV=(v+(field(u,v,7,321)-.5)*.035+1)%1;
  const broad=field(u,v,4,31),islands=field(warpU,warpV,15,793),broken=field(u,v,43,247),turf=field(u,v,137,89),grain=hash(x,y,911);
  // Ragged mid-size islands change hue as well as value. Their porous edges
  // are finer than their interiors, so the field never reads as smooth clouds.
  const moss=Math.round(clamp((islands+(broken-.5)*.36+(turf-.5)*.27-.48)*4.6)*6)/6;
  const sun=Math.round(clamp((broad-.43)*3.2)*3)/3;
  const dry=clamp((field(u,v,19,583)-.65)*4);
  let r=mix(206,246,sun),g=mix(231,247,sun),b=mix(174,171,sun);
  r=mix(r,116,moss*.86);g=mix(g,173,moss*.86);b=mix(b,136,moss*.86);
  r=mix(r,235,dry*.38);g=mix(g,218,dry*.38);b=mix(b,166,dry*.38);
  const scumble=(broken-.5)*12+(turf-.5)*18+(grain-.5)*11;
  const i=(y*size+x)*4;
  data[i]=r+scumble;data[i+1]=g+scumble*.8;data[i+2]=b+scumble*.65;data[i+3]=255;
  mossMap[y*size+x]=moss;
 }
 const wrap=n=>(n%size+size)%size;
 const pixel=(x,y,c,alpha)=>{x=wrap(x);y=wrap(y);const i=(y*size+x)*4;for(let k=0;k<3;k++)data[i+k]=mix(data[i+k],c[k],alpha);};
 // Small marks gather into uneven banks. Avoid large confetti-like chips:
 // these are low grass leaves, while distinct flowers are separate geometry.
 const pale=[[242,246,180],[218,238,177],[226,239,170],[234,228,164],[200,223,160]];
 const dark=[[108,154,114],[126,172,119],[150,188,129],[169,200,140]];
 const paintChip=(x,y,w,h,c,alpha)=>{
  for(let row=0;row<h;row++){
   const inset=row===0||row===h-1?1:0;
   for(let col=inset;col<w-inset;col++)pixel(x+col+(row>h*.55?1:0),y+row,c,alpha);
  }
 };
 for(let group=0;group<Math.round(1100*detailArea);group++){
  const cx=Math.floor(hash(group,0,91)*size),cy=Math.floor(hash(group,1,91)*size);
  const radius=(9+hash(group,2,91)*22)*size/1024,count=13+Math.floor(hash(group,3,91)*24);
  for(let j=0;j<count;j++){
   const angle=hash(group,j,163)*Math.PI*2,reach=Math.sqrt(hash(group,j,257))*radius;
   const x=Math.floor(cx+Math.cos(angle)*reach),y=Math.floor(cy+Math.sin(angle)*reach*.72);
   const moss=mossMap[wrap(y)*size+wrap(x)],edge=moss>.10&&moss<.85;
   const light=hash(group,j,419)<(edge?.74:.46),palette=light?pale:dark;
   const c=palette[Math.floor(hash(group,j,379)*palette.length)];
   const w=2+Math.floor(hash(group,j,521)*2),h=2+Math.floor(hash(group,j,653)*3);
   paintChip(x,y,w,h,c,light?.66:.52);
   if(j%4===0)paintChip(x-2,y-3,3,3,c,light?.54:.4);
  }
 }
 // Dense, uneven short blades are painted into the ground itself, so texture
 // remains visible between the separate upright 3D plants.
 for(let j=0;j<Math.round(23500*detailArea);j++){
  const x=Math.floor(hash(j,0,15)*size),y=Math.floor(hash(j,1,15)*size);
  if(field(x/size,y/size,17,123)<.29)continue;
  const light=j%3===0,h=3+Math.floor(hash(j,2,15)*5),c=light?[237,243,173]:[112,163,111];
  const lean=hash(j,3,15)>.5?1:-1;
  for(let k=0;k<h;k++){
   pixel(x+lean*Math.floor(k*.35),y-k,c,light?.76:.55);
   if(k<h-2)pixel(x+lean*Math.floor(k*.35)-1,y-k,c,light?.46:.34);
  }
 }
 return data;
}
let cachedPixels;
export function createMeadowTexture(B,scene){
 const size=1024,tex=new B.DynamicTexture('painted-meadow',{width:size,height:size},scene,true,B.Texture.NEAREST_NEAREST_MIPLINEAR),ctx=tex.getContext();
 const pixels=cachedPixels||(cachedPixels=createMeadowPixels(size));
 const frame=ctx.createImageData(size,size);frame.data.set(pixels);ctx.putImageData(frame,0,0);
 tex.update();tex.wrapU=B.Texture.WRAP_ADDRESSMODE;tex.wrapV=B.Texture.WRAP_ADDRESSMODE;tex.anisotropicFilteringLevel=4;
 return tex;
}
