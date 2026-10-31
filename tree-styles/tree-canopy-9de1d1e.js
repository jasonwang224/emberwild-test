/* Deterministic, genuinely volumetric crowns. All positions are local to a tree.
 * The renderer applies world scale and trunk lean after these descriptors. */
export const TREE_PALETTES={
  moss:['#244832','#648445','#b4c66f'],
  sage:['#345747','#7d9b62','#bacb86'],
  lime:['#31543a','#7b9e4b','#c2d778'],
  forest:['#193e35','#47744b','#94ad60'],
  teal:['#1c3c40','#416c58','#8faf74'],
  blush:['#7e405c','#c17897','#edb6c3'],
  gold:['#71402e','#b77838','#e7b358'],
  lavender:['#373651','#746a9b','#beb0d9']
};
const IVORY=['#905d78','#c89da4','#f3e2bf'];
const RUSSET=['#623625','#9b512b','#ce953f'];
const TAU=Math.PI*2;

/** Break perfect circular outlines without adding triangles. Three broad,
 * rotated great-circle waves make rounded scallops; pole fading removes all
 * angular seams. This is a position-only deformation so the renderer can keep
 * its smooth, whole-crown painted lighting rather than shade every dent. */
export function deformCanopyPositions(positions,seed=0,amplitude=.14){
  if(positions.length%3)throw new RangeError('Canopy positions must contain complete XYZ vertices.');
  const result=positions.slice();
  const amount=Number.isFinite(amplitude)?Math.min(.18,Math.max(0,amplitude)):.14;
  const phase=Number.isFinite(seed)?seed:0;
  const turn=phase*.73+.47,tilt=Math.sin(phase*.29)*.9+.38;
  const ct=Math.cos(turn),st=Math.sin(turn),cp=Math.cos(tilt),sp=Math.sin(tilt);
  for(let i=0;i<positions.length;i+=3){
    const x=positions[i],y=positions[i+1],z=positions[i+2],radius=Math.hypot(x,y,z);
    if(radius===0)continue;
    const nx=(x*ct-z*st)/radius,nz0=(x*st+z*ct)/radius,ny0=y/radius;
    const ny=ny0*cp-nz0*sp,nz=ny0*sp+nz0*cp;
    const a=Math.cos(6*Math.atan2(nx,nz)+phase*.37)*(nx*nx+nz*nz);
    const b=Math.cos(5*Math.atan2(ny,nx)-phase*.23)*(ny*ny+nx*nx);
    const c=Math.cos(7*Math.atan2(nz,ny)+phase*.19)*(nz*nz+ny*ny);
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
    bulbScale:.94+noise(9)*.13,coreCount:5,yaw:noise(11)*TAU,
    trunkHeight:3.32*height,fruit:variant==='apple'?'red':variant==='pear'?'gold':null,noise};
}

// Each layout is a handful of connected branch crowns rather than a sequence
// of horizontal rings. Front and back have different occlusion and silhouettes.
const CROWNS={
  oak:[[-.98,3.45,-.48,1.03],[.91,3.34,-.38,1.02],[-.05,3.36,.98,1.07],[-.42,4.05,-.13,1.04],[.66,4.00,.37,.94]],
  spreading:[[-1.11,3.27,-.30,1.08],[1.02,3.30,-.45,1.03],[.02,3.14,.99,1.11],[-.53,3.91,-.08,1.06],[.59,3.82,.36,.99]],
  orchard:[[-.72,3.15,-.42,.92],[.72,3.08,-.30,.91],[-.02,3.02,.75,.99],[-.35,3.82,-.04,.91],[.50,3.68,.32,.82]],
  birch:[[-.52,3.42,-.32,.83],[.57,3.45,-.25,.85],[-.06,3.36,.66,.85],[-.29,4.10,-.06,.85],[.37,4.38,.24,.72]],
  spire:[[-.52,3.34,-.29,.84],[.56,3.51,-.22,.85],[-.10,3.55,.63,.82],[-.34,4.19,-.13,.79],[.31,4.58,.19,.65]]
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

/** Fifty-five intersecting rounded masses, each with an actual X/Y/Z volume.
 * r is sphere radius. scale includes style dimensions. Apply only world s.
 * yaw rotates the composition, not the ellipsoid axes; that leaves simple
 * deterministic baked descriptors suitable for merged meshes. */
export function buildTreeCanopy(style){
  const n=style.noise,result=[];
  const squash=style.shape==='spreading'?.83:style.shape==='orchard'?.92:1.0;
  for(const [i,core] of crownCenters(style).entries()){
    const baseScale=[1.02,squash,1.00];
    result.push(transform(style,core.x,core.y,core.z,core.r*.88,baseScale,1,{cluster:i,core:true}));
    // Irregular side scallops interrupt the large sphere outline. The smaller
    // hidden core only fills their junctions instead of exposing a huge disc.
    // Two offset upper caps bridge the top without a single circular summit.
    const phase=n(900+i)*TAU;
    for(let j=0;j<10;j++){
      const a=phase+(j<7?j*TAU/7+(n(930+i*12+j)-.5)*.19:j===7?.20:j===8?Math.PI+ .40:1.80);
      const yy=j<7?(n(950+i*12+j)-.5)*.67:j<9?.67+n(980+i*12+j)*.14:-.61;
      const ring=j<7?.87+n(990+i*12+j)*.10:j<9?.39:.38;
      const dx=Math.cos(a)*ring*core.r,dz=Math.sin(a)*ring*core.r;
      const radius=core.r*(.48+n(1000+i*12+j)*.13)*style.bulbScale;
      const y=core.y+yy*core.r*squash;
      // Let lighting shade the full volume. Only the underscallops use the
      // deepest paint; roughly one fifth of all masses carry the light paint.
      const tone=j===9||yy<-.24&&y<3.5?0:j===7||j===8?2:1;
      result.push(transform(style,core.x+dx,y,core.z+dz,radius,
        [.96+n(1100+i*12+j)*.13,squash*(.91+n(1150+i*12+j)*.12),.96+n(1200+i*12+j)*.12],tone,
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
    return {from:[0,(1.82+i*.13)*style.height,0],to:[p.x*.84,p.y,p.z*.84],radius:.11-i*.012};
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
 * Violet flower heads are larger angular clusters; render their `kind` with
 * a low-sided mesh to distinguish the reference's upright flowering trees. */
export function buildTreeAccents(style){
  const fruit=style.fruit,violet=style.variant==='violet';
  if(!fruit&&!violet)return [];
  const n=style.noise,centers=crownCenters(style),lobes=buildTreeCanopy(style),result=[];
  for(const [i,c] of centers.entries()){
    const count=violet?12:8;
    for(let j=0;j<count;j++){
      const a=j*TAU/count+n(1300+i)*TAU;
      const yy=violet?-.18+n(1350+i*16+j)*.98:-.42+n(1350+i*8+j)*1.08;
      const radial=Math.sqrt(1-yy*yy)*(violet?1.16:1.20);
      const x=c.x+Math.cos(a)*c.r*radial,z=c.z+Math.sin(a)*c.r*radial;
      const p=transform(style,x,c.y+yy*c.r,z,(violet?.19:.105)+n(1400+i*(violet?16:8)+j)*(violet?.08:.049),
        violet?[.65,2.35,.65]:[.92,1.05,.92],violet?(j%3===0?1:0):j%3===0?2:1,
        {kind:violet?'violet-flower':fruit==='red'?'apple':'pear',cluster:i,
          ...(violet?{tipColor:'#c5b5df',tipScale:.22}:{} )});
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
