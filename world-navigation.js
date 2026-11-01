// Shared sanctuary and circle collision rules for the enlarged valley.
export const TOWN_SAFE_BOUNDS=Object.freeze({minX:-27,maxX:27,minZ:-11,maxZ:25});
const EPS=1e-6;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const inside=(p,box)=>box&&p.x>=box.minX-EPS*.1&&p.x<=box.maxX+EPS*.1&&p.z>=box.minZ-EPS*.1&&p.z<=box.maxZ+EPS*.1;
const closestIn=(p,box)=>({x:clamp(p.x,box.minX,box.maxX),z:clamp(p.z,box.minZ,box.maxZ)});

export function isTownSafe(x,z,pad=0){
  const b=TOWN_SAFE_BOUNDS;
  return Number.isFinite(x)&&Number.isFinite(z)&&Number.isFinite(pad)&&
    x>=b.minX-pad&&x<=b.maxX+pad&&z>=b.minZ-pad&&z<=b.maxZ+pad;
}

function geometry(obstacles,bounds,radius){
  if(!Number.isFinite(radius)||radius<0||!bounds||
    !['minX','maxX','minZ','maxZ'].every(key=>Number.isFinite(bounds[key])))throw new TypeError('Navigation requires finite bounds and a nonnegative radius.');
  const box={minX:bounds.minX+radius,maxX:bounds.maxX-radius,minZ:bounds.minZ+radius,maxZ:bounds.maxZ-radius};
  if(box.minX>box.maxX||box.minZ>box.maxZ)throw new RangeError('Navigation bounds cannot contain this actor.');
  const passages=new Map();
  for(const o of obstacles){
    if(!o||!Number.isFinite(o.x)||!Number.isFinite(o.z)||!Number.isFinite(o.r)||o.r<0)throw new TypeError('Navigation obstacles require finite coordinates and nonnegative radii.');
    if(o.passage!==undefined){
      const p=o.passage;
      if(!p||!['minX','maxX','minZ','maxZ'].every(key=>Number.isFinite(p[key]))||p.minX>=p.maxX||p.minZ>=p.maxZ)throw new TypeError('Navigation passages require finite, ordered rectangle bounds.');
      // A passage exempts only its own obstacle. The actor's entire footprint
      // must fit on the surface; larger actors still collide with the water.
      const inset={minX:p.minX+radius,maxX:p.maxX-radius,minZ:p.minZ+radius,maxZ:p.maxZ-radius};
      if(inset.minX<=inset.maxX&&inset.minZ<=inset.maxZ)passages.set(o,inset);
    }
  }
  const circles=obstacles;
  const bounded=p=>({x:clamp(p.x,box.minX,box.maxX),z:clamp(p.z,box.minZ,box.maxZ)});
  const clear=p=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&
    p.x>=box.minX-EPS&&p.x<=box.maxX+EPS&&p.z>=box.minZ-EPS&&p.z<=box.maxZ+EPS&&
    circles.every(o=>Math.hypot(p.x-o.x,p.z-o.z)>=o.r+radius-EPS*.1||inside(p,passages.get(o)));
  return {box,circles,passages,bounded,clear};
}

function finitePoint(p){
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))throw new TypeError('Navigation positions must be finite.');
}

// The nearest free point lies on a circle, a box edge, or their intersections.
// Testing those candidates avoids a coarse grid moving an old save needlessly.
export function findClearPosition(position,obstacles,bounds,radius=.45,fallback={x:0,z:-5}){
  finitePoint(position);
  const {box,circles,passages,bounded,clear}=geometry(obstacles,bounds,radius);
  const initial=bounded(position);
  if(clear(initial))return initial;
  let best=null,bestDistance=Infinity;
  const consider=(x,z)=>{
    if(x<box.minX-EPS||x>box.maxX+EPS||z<box.minZ-EPS||z>box.maxZ+EPS)return;
    const p=bounded({x,z}),distance=Math.hypot(p.x-position.x,p.z-position.z);
    if(distance<bestDistance-EPS&&clear(p)){best=p;bestDistance=distance;}
  };
  if(fallback&&Number.isFinite(fallback.x)&&Number.isFinite(fallback.z))consider(fallback.x,fallback.z);
  for(const x of [box.minX,box.maxX])for(const z of [box.minZ,box.maxZ])consider(x,z);
  for(const passage of passages.values()){
    const p=closestIn(position,passage);consider(p.x,p.z);
    for(const x of [passage.minX,passage.maxX])for(const z of [passage.minZ,passage.maxZ])consider(x,z);
    // A barrel or another obstacle can cover the closest deck point. Include
    // its intersections with deck edges before falling back to a distant bank.
    for(const o of circles){
      const r=o.r+radius+EPS;
      for(const x of [passage.minX,passage.maxX]){
        const squared=r*r-(x-o.x)**2;
        if(squared>=0)for(const z of [o.z-Math.sqrt(squared),o.z+Math.sqrt(squared)])if(inside({x,z},passage))consider(x,z);
      }
      for(const z of [passage.minZ,passage.maxZ]){
        const squared=r*r-(z-o.z)**2;
        if(squared>=0)for(const x of [o.x-Math.sqrt(squared),o.x+Math.sqrt(squared)])if(inside({x,z},passage))consider(x,z);
      }
    }
  }
  for(let i=0;i<circles.length;i++){
    const a=circles[i],ar=a.r+radius+EPS,dx=position.x-a.x,dz=position.z-a.z,d=Math.hypot(dx,dz);
    if(d>EPS)consider(a.x+dx/d*ar,a.z+dz/d*ar);
    else for(const [nx,nz] of [[1,0],[0,1],[-1,0],[0,-1]])consider(a.x+nx*ar,a.z+nz*ar);
    for(const x of [box.minX,box.maxX]){
      const squared=ar*ar-(x-a.x)**2;
      if(squared>=0){const offset=Math.sqrt(squared);consider(x,a.z+offset);consider(x,a.z-offset);}
    }
    for(const z of [box.minZ,box.maxZ]){
      const squared=ar*ar-(z-a.z)**2;
      if(squared>=0){const offset=Math.sqrt(squared);consider(a.x+offset,z);consider(a.x-offset,z);}
    }
    for(let j=i+1;j<circles.length;j++){
      const b=circles[j],br=b.r+radius+EPS,xx=b.x-a.x,zz=b.z-a.z,len=Math.hypot(xx,zz);
      if(len<EPS||len>ar+br||len<Math.abs(ar-br))continue;
      const along=(ar*ar-br*br+len*len)/(2*len),height=Math.sqrt(Math.max(0,ar*ar-along*along));
      const mx=a.x+xx/len*along,mz=a.z+zz/len*along;
      consider(mx-zz/len*height,mz+xx/len*height);
      consider(mx+zz/len*height,mz-xx/len*height);
    }
  }
  if(!best)throw new RangeError('No clear navigation position exists inside the world bounds.');
  return best;
}

export function resolveMovement(position,delta,obstacles,bounds,radius=.45){
  finitePoint(position);finitePoint(delta);
  const {circles,passages,bounded,clear}=geometry(obstacles,bounds,radius);
  let current=bounded(position);
  // Old saves are normally repaired before movement. This also makes a newly
  // inserted obstacle recoverable rather than leaving an actor inside a wall.
  if(!clear(current))current=findClearPosition(current,obstacles,bounds,radius,current);
  const target=bounded({x:current.x+delta.x,z:current.z+delta.z});
  const dx=target.x-current.x,dz=target.z-current.z;
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/Math.max(.15,radius*.6)));
  const step={x:dx/steps,z:dz/steps};
  const project=(candidate,previous)=>{
    let p=bounded(candidate);
    for(let pass=0;pass<12;pass++){
      if(clear(p))return p;
      for(const o of circles){
        const passage=passages.get(o);
        if(inside(p,passage))continue;
        let ox=p.x-o.x,oz=p.z-o.z,len=Math.hypot(ox,oz),min=o.r+radius;
        if(len>=min)continue;
        if(len<EPS){ox=previous.x-o.x;oz=previous.z-o.z;len=Math.hypot(ox,oz);if(len<EPS){ox=1;oz=0;len=1;}}
        const bank=bounded({x:o.x+ox/len*(min+EPS),z:o.z+oz/len*(min+EPS)});
        // From a pier, stop/slide at its edge instead of snapping to the bank.
        // An approaching actor must actually step onto it, never jump the
        // water between a nearby bank and a side edge via collision correction.
        p=inside(previous,passage)?bounded(closestIn(p,passage)):bank;
      }
    }
    return clear(p)?p:null;
  };
  for(let n=0;n<steps;n++){
    const maxDistance=Math.hypot(step.x,step.z)+radius*2+EPS;
    let next=project({x:current.x+step.x,z:current.z+step.z},current);
    if(!next||Math.hypot(next.x-current.x,next.z-current.z)>maxDistance){
      // A crowded corner may oscillate between circles. Try a local slide;
      // never accept a final projection that has crossed a neighboring wall.
      const slides=Math.abs(step.x)>=Math.abs(step.z)?[[step.x,0],[0,step.z]]:[[0,step.z],[step.x,0]];
      next=null;
      for(const [sx,sz] of slides){const candidate=project({x:current.x+sx,z:current.z+sz},current);if(candidate&&Math.hypot(candidate.x-current.x,candidate.z-current.z)<=maxDistance){next=candidate;break;}}
    }
    if(next)current=next;
  }
  return current;
}
