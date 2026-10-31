/* Exact broad-phase queries for procedural planting. The grid only removes
 * distant candidates; the final distance test is the original authored test.
 * This changes neither the seeded random stream nor a blade's placement. */
function gridQuery(entries,contains,cellSize=8){
  const cells=new Map(),seen=new Uint32Array(entries.length);
  let generation=0;
  for(let index=0;index<entries.length;index++){
    const item=entries[index];
    for(let x=Math.floor(item.minX/cellSize);x<=Math.floor(item.maxX/cellSize);x++)
      for(let z=Math.floor(item.minZ/cellSize);z<=Math.floor(item.maxZ/cellSize);z++){
        const key=x+':'+z;
        let bucket=cells.get(key);if(!bucket)cells.set(key,bucket=[]);
        bucket.push(index);
      }
  }
  return (x,z,pad=0)=>{
    // Padding expands the query, not the geometry. A tiny conservative margin
    // ensures an exact cell boundary cannot hide a candidate through rounding.
    const reach=Math.max(0,pad)+1e-9;
    if(++generation===0x100000000){seen.fill(0);generation=1;}
    const minX=Math.floor((x-reach)/cellSize),maxX=Math.floor((x+reach)/cellSize);
    const minZ=Math.floor((z-reach)/cellSize),maxZ=Math.floor((z+reach)/cellSize);
    for(let cx=minX;cx<=maxX;cx++)for(let cz=minZ;cz<=maxZ;cz++){
      const bucket=cells.get(cx+':'+cz);if(!bucket)continue;
      for(const index of bucket){
        if(seen[index]===generation)continue;seen[index]=generation;
        if(contains(entries[index],x,z,pad))return true;
      }
    }
    return false;
  };
}

/** Input circles are [x,z,radius]. Snapshot once after obstacle construction. */
export function createCircleQuery(circles){
  return gridQuery(circles.map(([x,z,r])=>({x,z,r,minX:x-r,maxX:x+r,minZ:z-r,maxZ:z+r})),
    (item,x,z,pad)=>Math.hypot(x-item.x,z-item.z)<item.r+pad);
}

/** Input segments are [startXZ,endXZ,halfWidth]. Degenerate segments retain
 * the original NaN comparison and therefore never count as occupied ground. */
export function createSegmentQuery(segments){
  return gridQuery(segments.map(([a,b,r])=>({x:a[0],z:a[1],dx:b[0]-a[0],dz:b[1]-a[1],r,
    minX:Math.min(a[0],b[0])-r,maxX:Math.max(a[0],b[0])+r,
    minZ:Math.min(a[1],b[1])-r,maxZ:Math.max(a[1],b[1])+r})),(item,x,z,pad)=>{
      const {dx,dz}=item,t=Math.max(0,Math.min(1,((x-item.x)*dx+(z-item.z)*dz)/(dx*dx+dz*dz)));
      return Math.hypot(x-item.x-dx*t,z-item.z-dz*t)<item.r+pad;
    });
}
