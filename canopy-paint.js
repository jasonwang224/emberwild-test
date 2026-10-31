// One continuous painted cap per rounded leaf mass. Angular U wraps around
// the lobe; V runs from its shaded underside to the face toward the sun.
const SIZE=128,TAU=Math.PI*2;
const BRUSH_MARKS=[[.12,.66,.045,.030],[.35,.70,.030,.025],[.67,.62,.040,.040],[.81,.69,.055,.035],[.91,.53,.040,.040]];

export function createCanopyPixels(){
  const pixels=new Uint8ClampedArray(SIZE*SIZE*4),side=SIZE/2;
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const u=(x>>1)/side,v=(y>>1)/(side-1),a=u*TAU;
    const cap=Math.min(.73,.60+Math.sin(a*5+.4)*.15+Math.cos(a*9-1.2)*.045+Math.sin(a*2)*.025);
    const shoulder=Math.min(cap-.035,.44+Math.sin(a*4-.9)*.060+Math.cos(a*7+.4)*.028);
    const base=.30+Math.sin(a*6+.5)*.035;
    let value=v>cap?253:v>shoulder?216:v>base?178:145;
    // A handful of adjacent-tone brush marks gives the large caps a painted
    // surface without covering them in repeating high-contrast leaf islands.
    for(const [cx,cy,rx,ry] of BRUSH_MARKS){
      const dx=(u-cx)/rx,dy=(v-cy)/ry;
      if(dx*dx+dy*dy<1+.18*Math.sin(dx*7+dy*5))value=value===253?241:value===216?228:value;
    }
    const i=(y*SIZE+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=value;pixels[i+3]=255;
  }
  return pixels;
}

/** Spherical paint avoids the fragmented IcoSphere atlas. Seam vertices
 * unwrap within each triangle; UV2 stays available for the wind anchor. */
export function canopyPaintUV(positions,scale,indices,phase=0){
  const uv=[],[sx,sy,sz]=scale;
  const light=[-.597,.663,-.451],side=[-.603,0,.798],up=[.529,.747,.400];
  for(let i=0;i<positions.length;i+=3){
    let x=positions[i]/sx,y=positions[i+1]/sy,z=positions[i+2]/sz;
    const r=Math.hypot(x,y,z)||1;x/=r;y/=r;z/=r;
    const u=Math.atan2(x*up[0]+y*up[1]+z*up[2],x*side[0]+z*side[2])/TAU+.5;
    const v=1-Math.acos(Math.max(-1,Math.min(1,x*light[0]+y*light[1]+z*light[2])))/Math.PI;
    uv.push(u+phase,v);
  }
  for(let i=0;i<indices.length;i+=3){
    const ids=[indices[i]*2,indices[i+1]*2,indices[i+2]*2],values=ids.map(id=>uv[id]);
    if(Math.max(...values)-Math.min(...values)>.5){const mid=(Math.max(...values)+Math.min(...values))/2;for(const id of ids)if(uv[id]<mid)uv[id]+=1;}
  }
  return uv;
}

let cachedPixels;
export function createCanopyPaint(B,scene){
  const texture=new B.DynamicTexture('painted-canopy-caps',{width:SIZE,height:SIZE},scene,true,B.Texture.NEAREST_NEAREST_MIPLINEAR??B.Texture.NEAREST_SAMPLINGMODE);
  const context=texture.getContext(),frame=context.createImageData(SIZE,SIZE);
  frame.data.set(cachedPixels||(cachedPixels=createCanopyPixels()));
  context.imageSmoothingEnabled=false;context.putImageData(frame,0,0);
  texture.hasAlpha=false;texture.wrapU=B.Texture.WRAP_ADDRESSMODE;texture.wrapV=B.Texture.CLAMP_ADDRESSMODE;
  texture.anisotropicFilteringLevel=1;texture.level=1;texture.update(false);
  return texture;
}
