/* Deterministic, genuinely volumetric crowns. All positions are local to a tree.
 * The renderer applies world scale and trunk lean after these descriptors. */
export const TREE_PALETTES={
  moss:['#1d4238','#66874c','#c0d187'],
  sage:['#294e43','#7d9b62','#c6d494'],
  lime:['#254b39','#7b9e4b','#cedd8c'],
  forest:['#173b36','#4d754b','#a9bf77'],
  teal:['#193c40','#47735d','#b0c58c'],
  blush:['#75405e','#c27b9b','#efd0d3'],
  gold:['#71402e','#b77838','#e7b358'],
  lavender:['#373651','#746a9b','#beb0d9']
};
const IVORY=['#835570','#c69ca8','#f3e5c4'];
const RUSSET=['#623625','#9b512b','#ce953f'];
const TAU=Math.PI*2;

/** Break perfect circular outlines without adding triangles. Three broad,
 * rotated great-circle waves make rounded scallops; pole fading removes all
 * angular seams. This is a position-only deformation so the renderer can keep
 * its smooth, whole-crown painted lighting rather than shade every dent. */
export function deformCanopyPositions(positions,seed=0,amplitude=.17){
  if(positions.length%3)throw new RangeError('Canopy positions must contain complete XYZ vertices.');
  const result=positions.slice();
  const amount=Number.isFinite(amplitude)?Math.min(.18,Math.max(0,amplitude)):.17;
  const phase=Number.isFinite(seed)?seed:0;
  const turn=phase*.73+.47,tilt=Math.sin(phase*.29)*.9+.38;
  const ct=Math.cos(turn),st=Math.sin(turn),cp=Math.cos(tilt),sp=Math.sin(tilt);
  for(let i=0;i<positions.length;i+=3){
    const x=positions[i],y=positions[i+1],z=positions[i+2],radius=Math.hypot(x,y,z);
    if(radius===0)continue;
    const nx=(x*ct-z*st)/radius,nz0=(x*st+z*ct)/radius,ny0=y/radius;
    const ny=ny0*cp-nz0*sp,nz=ny0*sp+nz0*cp;
    const a=Math.cos(5*Math.atan2(nx,nz)+phase*.37)*(nx*nx+nz*nz);
    const b=Math.cos(4*Math.atan2(ny,nx)-phase*.23)*(ny*ny+nx*nx);
    const c=Math.cos(6*Math.atan2(nz,ny)+phase*.19)*(nz*nz+ny*ny);
    const swell=1+amount*(a*.70+b*.20+c*.10);
    result[i]=x*swell;result[i+1]=y*swell;result[i+2]=z*swell;
  }
  return result;
}

export function treeAppearance(x,z,s=1,golden=false,pine=false){
  const noise=n=>{const f=Math.sin(n*127.1+x*311.7+z*74.7)*43758.5453;return f-Math.floor(f);};
  const pick=noise(1),green=noise(2);
  const family=golden?'gold':pick<.14?'blush':pick<.20?'lavender':pick<.30?'gold':green<.28?'moss':green<.50?'lime':green<.73?'sage':green<.94?'forest':'teal';
  const shape=pine?'spire':family==='lavender'?'birch':family==='blush'?'spreading':['oak','birch','orchard','spreading'][Math.floor(noise(3)*4)];
  const variant=family==='blush'?(noise(12)<.44?'ivory':'pink'):family==='gold'?(golden||noise(13)<.45?'gold':'russet'):family==='lavender'?'violet':shape==='orchard'?(noise(14)<.72?'apple':'pear'):family;
  const height=(shape==='birch'||shape==='spire'?1.12:shape==='orchard'?.83:.92)+noise(4)*.23;
  const width=(shape==='birch'||shape==='spire'?.82:shape==='oak'?1.25:1.10)+noise(5)*.24;
  const palette=variant==='ivory'?IVORY:variant==='russet'?RUSSET:TREE_PALETTES[family];
  return {family,variant,shape,palette:[...palette],height,width,depth:.88+noise(6)*.27,
    leanX:(noise(7)-.5)*.70*s,leanZ:(noise(8)-.5)*.70*s,
    bulbScale:.94+noise(9)*.13,coreCount:CROWNS[shape].length,yaw:noise(11)*TAU,
    trunkHeight:3.32*height,fruit:variant==='apple'?'red':variant==='pear'?'gold':null,noise};
}

// Each layout is a handful of connected branch crowns rather than a sequence
// of horizontal rings. Front and back have different occlusion and silhouettes.
const CROWNS={
  oak:[[-1.00,3.28,-.32,1.04],[1.00,3.18,-.28,.98],[-.10,3.12,.96,1.09],[-.05,3.50,-.91,.94],[-.58,3.99,.12,1.01],[.63,3.90,.40,.93]],
  spreading:[[-1.18,3.14,-.28,1.10],[1.13,3.19,-.37,1.05],[.16,3.03,1.04,1.13],[-.28,3.42,-.87,1.01],[-.65,3.77,.18,1.05],[.59,3.70,.42,1.00]],
  orchard:[[-.74,3.02,-.40,.97],[.76,2.98,-.28,.94],[-.03,2.92,.79,1.04],[-.37,3.65,-.09,.95],[.48,3.54,.35,.88]],
  birch:[[-.58,3.20,-.35,.88],[.61,3.24,-.28,.89],[-.06,3.12,.69,.94],[-.32,3.79,-.30,.87],[.34,3.83,.45,.82],[-.09,4.29,.04,.72]],
  spire:[[-.59,3.18,-.34,.89],[.58,3.22,-.28,.88],[-.08,3.11,.66,.93],[-.39,3.82,-.19,.83],[.37,3.83,.35,.80],[-.09,4.39,.04,.66]]
};

function crownCenters(style){
  const n=style.noise,template=CROWNS[style.shape]||CROWNS.oak;
  return template.map(([x,y,z,r],i)=>({
    x:x+(n(800+i*4)-.5)*.23,y:y+(n(801+i*4)-.5)*.17,
    z:z+(n(802+i*4)-.5)*.23,r:r*(.94+n(803+i*4)*.12)
  }));
}

function transform(style,x,y,z,r,scale,tone,extra={}){
  const c=Math.cos(style.yaw),sn=Math.sin(style.yaw);
  return {x:(x*c-z*sn)*style.width,y:y*style.height,z:(x*sn+z*c)*style.width*style.depth,r,
    scale:[scale[0]*style.width,scale[1]*style.height,scale[2]*style.width*style.depth],tone,...extra};
}

function buildExteriorCrown(style){
  const n=style.noise,result=[],spread=style.shape==='spreading';
  // These interconnected inner crowns cover the fork ends and close any
  // small gaps. The visible foliage is placed on the outside of the WHOLE
  // crown, rather than hidden among repeated rings around each inner mass.
  for(const [i,c] of crownCenters(style).entries()){
    result.push(transform(style,c.x,c.y,c.z,c.r*.98,[1,spread?.84:.97,1],1,{cluster:i,core:true}));
  }
  const count=80,angle=Math.PI*(3-Math.sqrt(5)),phase=n(1900)*TAU;
  const ax=spread?2.16:2.08,ay=spread?1.03:1.24,az=spread?1.91:1.88,cy=spread?3.39:3.49;
  for(let j=0;j<count;j++){
    const up=1-2*(j+.5)/count,ring=Math.sqrt(1-up*up),a=phase+j*angle;
    const contour=1+.045*Math.sin(a*3+phase)+.025*Math.cos(a*5-phase);
    const x=Math.cos(a)*ring*ax*contour-.12*up+(n(1920+j)-.5)*.14;
    const y=cy+up*ay+(n(2020+j)-.5)*.14;
    const z=Math.sin(a)*ring*az*contour+(n(2120+j)-.5)*.14;
    const radius=(.44+n(2220+j)*.13)*style.bulbScale;
    const tone=up<-.12?0:up>.40&&n(2620+j)>.22||up>.15&&n(2720+j)>.90?2:1;
    result.push(transform(style,x,y,z,radius,
      [.96+n(2320+j)*.13,.91+n(2420+j)*.15,.96+n(2520+j)*.13],tone,
      {cluster:j%style.coreCount,core:false,tint:.90+n(2820+j)*.14}));
  }
  return result;
}

/** Forty-five to eighty-six overlapping masses with real X/Y/Z volume.
 * r is sphere radius. scale includes style dimensions. Apply only world s.
 * yaw rotates the composition, not the ellipsoid axes; that leaves simple
 * deterministic baked descriptors suitable for merged meshes. */
export function buildTreeCanopy(style){
  if((style.shape==='oak'||style.shape==='spreading')&&style.family!=='blush')return buildExteriorCrown(style);
  const n=style.noise,result=[];
  const squash=style.shape==='spreading'?.83:style.shape==='orchard'?.92:1.0;
  for(const [i,core] of crownCenters(style).entries()){
    const baseScale=[1.02,squash,1.00];
    result.push(transform(style,core.x,core.y,core.z,core.r*.74,baseScale,1,{cluster:i,core:true}));
    // The reference uses broad overlapping cloud-like bulbs, not strings of
    // small leaves around a ball. Five staggered shoulders, two offset caps
    // and a low lobe hide the core and keep medium scallops readable in play.
    // Each crown has its own phase, so those lobes never form horizontal rows.
    const phase=n(900+i)*TAU;
    for(let j=0;j<8;j++){
      const a=phase+(j<5?j*TAU/5+(n(930+i*12+j)-.5)*.30:j===5?.62:j===6?Math.PI+.36:Math.PI*1.38);
      const yy=j<5?(n(950+i*12+j)-.5)*.66:j===5?.66+n(980+i*12+j)*.14:j===6?.42+n(980+i*12+j)*.12:-.53-n(980+i*12+j)*.09;
      const ring=j<5?.79+n(990+i*12+j)*.10:j===5?.35:j===6?.65:.40;
      const dx=Math.cos(a)*ring*core.r,dz=Math.sin(a)*ring*core.r;
      const radius=core.r*(j===7?.58:.59)+core.r*n(1000+i*12+j)*.11;
      const y=core.y+yy*core.r*squash;
      const tone=j===7||yy<-.22&&y<3.4?0:j===5||j===6?2:1;
      result.push(transform(style,core.x+dx,y,core.z+dz,radius*style.bulbScale,
        [.97+n(1100+i*12+j)*.12,squash*(.94+n(1150+i*12+j)*.11),.97+n(1200+i*12+j)*.12],tone,
        {cluster:i,core:false}));
    }
  }
  return result;
}

/** Branch endpoints are inside the foliage, so trunk forks never protrude
 * above an orchard or a flattened blossom canopy. Positions omit world lean. */
export function buildTreeBranches(style){
  return crownCenters(style).slice(0,3).map((c,i)=>{
    const p=transform(style,c.x,c.y,c.z,1,[1,1,1],0);
    return {from:[0,(1.63+i*.13)*style.height,0],to:[p.x*.84,p.y,p.z*.84],radius:.18-i*.02};
  });
}

function visibleSurface(origin,direction,lobes,outset){
  const length=Math.hypot(...direction),ray=direction.map(v=>v/length);
  let distance=0;
  for(const d of lobes){
    const center=[d.x,d.y,d.z];
    let a=0,b=0,c=-1;
    for(let axis=0;axis<3;axis++){
      const radius=d.r*d.scale[axis],o=(origin[axis]-center[axis])/radius,v=ray[axis]/radius;
      a+=v*v;b+=2*o*v;c+=o*o;
    }
    const discriminant=b*b-4*a*c;
    if(discriminant>=0)distance=Math.max(distance,(-b+Math.sqrt(discriminant))/(2*a));
  }
  return origin.map((value,axis)=>value+ray[axis]*(distance+outset));
}

/** Decoration follows the exterior of individual masses around every side.
 * Fruit is true geometry, never a billboard or a camera-facing strip.
 * Violet trees carry dense, short upright flower heads with tiny cream tips.
 * Their varying width and height should read as blossoms rather than crystal
 * spikes. The renderer uses tipColor/tipScale for the separate petal glints. */
export function buildTreeAccents(style){
  const fruit=style.fruit,violet=style.variant==='violet';
  if(!fruit&&!violet)return [];
  const n=style.noise,centers=crownCenters(style),lobes=buildTreeCanopy(style),result=[];
  for(const [i,c] of centers.entries()){
    const count=violet?16:8;
    for(let j=0;j<count;j++){
      const a=j*TAU/count+n(1300+i)*TAU;
      const yy=violet?-.18+n(1350+i*16+j)*.98:-.42+n(1350+i*8+j)*1.08;
      const radial=Math.sqrt(1-yy*yy)*(violet?1.16:1.20);
      const x=c.x+Math.cos(a)*c.r*radial,z=c.z+Math.sin(a)*c.r*radial;
      const p=transform(style,x,c.y+yy*c.r,z,(violet?.17:.105)+n(1400+i*(violet?16:8)+j)*(violet?.075:.049),
        violet?[.78+n(1500+i*16+j)*.18,1.26+n(1600+i*16+j)*.27,.78+n(1700+i*16+j)*.18]:[.92,1.05,.92],violet?(j%3===0?0:1):j%3===0?2:1,
        {kind:violet?'violet-flower':fruit==='red'?'apple':'pear',cluster:i,
          ...(violet?{tipColor:'#eee2cf',tipScale:.23+n(1800+i*16+j)*.08}:{} )});
      const center=transform(style,c.x,c.y,c.z,1,[1,1,1],0);
      // A fruit placed on a core sphere can disappear under an overlapping
      // scallop. Attach it to the outermost actual foliage surface instead.
      const surface=visibleSurface([center.x,center.y,center.z],[p.x-center.x,p.y-center.y,p.z-center.z],lobes,p.r*.12);
      [p.x,p.y,p.z]=surface;
      result.push(p);
    }
  }
  return result;
}
