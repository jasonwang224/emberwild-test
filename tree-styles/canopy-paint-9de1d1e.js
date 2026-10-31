// Original, repeating foliage paint. The canopy remains rounded 3D geometry:
// these broad scallops supply brush-shaped albedo changes, not baked lighting.
// A neutral palette lets the same surface work on green, pink and autumn trees.
const SIZE=128;
const VALUES=[166,201,228,253];

function random(seed){
  let value=seed>>>0;
  return()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
}

export function createCanopyPixels(){
  // Paint at half resolution for deliberate two-texel steps, avoiding smooth
  // vector edges and the glitter caused by dense single-pixel leaf noise.
  const side=SIZE/2,ink=new Uint8Array(side*side);ink.fill(VALUES[1]);
  const rng=random(438127),wrap=n=>(n%side+side)%side;
  const ellipse=(cx,cy,rx,ry,value)=>{
    const low=Math.floor(cy-ry),high=Math.ceil(cy+ry);
    for(let y=low;y<=high;y++){
      const dy=(y+.5-cy)/ry;if(Math.abs(dy)>1)continue;
      const reach=rx*Math.sqrt(1-dy*dy);
      for(let x=Math.ceil(cx-reach-.5);x<=Math.floor(cx+reach-.5);x++)ink[wrap(y)*side+wrap(x)]=value;
    }
  };
  const cloud=(cx,cy,rx,ry,value,lobes=6)=>{
    ellipse(cx,cy,rx*.77,ry*.77,value);
    const phase=rng()*Math.PI*2;
    for(let lobe=0;lobe<lobes;lobe++){
      const angle=phase+lobe/lobes*Math.PI*2+(rng()-.5)*.48;
      const reach=.52+rng()*.13,size=.32+rng()*.15;
      ellipse(cx+Math.cos(angle)*rx*reach,cy+Math.sin(angle)*ry*reach,rx*size,ry*size,value);
    }
  };
  // Deliberately asymmetric islands: no evenly spaced leaf rows, uniform
  // circular spots, outlines, or fixed top-left highlights on every bulb.
  for(const [x,y,rx,ry] of [[3,9,13,11],[25,3,12,10],[49,21,15,11],[21,32,13,13],[5,53,16,11],[43,55,13,14]])cloud(x,y,rx,ry,VALUES[0]);
  for(const [x,y,rx,ry] of [[12,1,13,10],[35,13,11,15],[59,4,12,11],[9,28,12,13],[34,37,14,10],[58,39,11,15],[20,59,12,10],[48,61,12,8]])cloud(x,y,rx,ry,VALUES[2]);
  for(const [x,y,rx,ry] of [[11,5,9,7],[34,14,7,10],[57,2,7,7],[9,29,7,9],[36,36,10,6],[58,43,6,9],[23,58,8,6]])cloud(x,y,rx,ry,VALUES[3],5);
  // A few secondary midtone intrusions break up the larger pale caps without
  // filling the canopy with high-frequency flecks.
  cloud(40,18,5,4,VALUES[2],4);cloud(5,25,4,6,VALUES[2],4);cloud(31,36,5,3,VALUES[2],4);
  const pixels=new Uint8ClampedArray(SIZE*SIZE*4);
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const value=ink[(y>>1)*side+(x>>1)],i=(y*SIZE+x)*4;
    pixels[i]=pixels[i+1]=pixels[i+2]=value;pixels[i+3]=255;
  }
  return pixels;
}

let cachedPixels;
export function createCanopyPaint(B,scene){
  const texture=new B.DynamicTexture('painted-canopy-scallops',{width:SIZE,height:SIZE},scene,true,B.Texture.NEAREST_NEAREST_MIPLINEAR??B.Texture.NEAREST_SAMPLINGMODE);
  const context=texture.getContext(),frame=context.createImageData(SIZE,SIZE);
  frame.data.set(cachedPixels||(cachedPixels=createCanopyPixels()));
  context.imageSmoothingEnabled=false;context.putImageData(frame,0,0);
  texture.hasAlpha=false;texture.wrapU=B.Texture.WRAP_ADDRESSMODE;texture.wrapV=B.Texture.WRAP_ADDRESSMODE;
  texture.anisotropicFilteringLevel=1;texture.level=1.06;texture.update(false);
  return texture;
}
