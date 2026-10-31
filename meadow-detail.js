/* Fine meadow geometry is authored in two buffers, never one mesh per blade.
 * Its own seed keeps decorative changes independent of encounters and quests. */
export function buildMeadowDetail({blocked=()=>false,lowTurf=()=>false,seed=710491,candidates=170000,maxTriangles=190000,bounds={minX:-46,maxX:46,minZ:-38,maxZ:50}}={}) {
  const fieldWidth=bounds.maxX-bounds.minX,fieldDepth=bounds.maxZ-bounds.minZ;
  if(!(fieldWidth>0&&fieldDepth>0))throw new RangeError('Meadow bounds must have positive area.');
  const grass={positions:[],indices:[],normals:[],colors:[]},flowers={positions:[],indices:[],normals:[],colors:[]};
  const tufts=[],blooms=[];
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
  const vertex=(data,x,y,z,r,g,b)=>{data.positions.push(x,y,z);data.normals.push(.18,.9695,.164);data.colors.push(r,g,b,1);};
  const triangles=()=>grass.indices.length/3+flowers.indices.length/3;
  const grassBudget=Math.max(0,maxTriangles-20000);
  for(let n=0;n<candidates&&triangles()<grassBudget-8;n++) {
    const x=bounds.minX+random()*fieldWidth,z=bounds.minZ+random()*fieldDepth;
    // Two broad warped waves meet smaller broken edges: irregular swathes,
    // with low turf visible between them instead of circular planted islands.
    const warp=Math.sin(z*.21)*1.4+Math.cos(x*.18)*.8;
    const sweep=Math.sin(x*.43+z*.23+warp)*.48+Math.cos(z*.39-x*.12)*.27+Math.sin(x*1.72+z*1.17)*.16;
    const density=sweep>.20?1:sweep>-.02?.24:.025;
    if(random()>density||blocked(x,z,.17))continue;
    const low=lowTurf(x,z),count=2+Math.floor(random()*3),tone=.95+random()*.05;
    tufts.push({x,z,low,count});
    for(let j=0;j<count;j++) {
      const angle=random()*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle);
      const h=(.30+random()*.34)*(low?.56:1),w=.035+random()*.020;
      const ox=x+(random()-.5)*.20,oz=z+(random()-.5)*.20,bend=(random()-.5)*.13;
      const base=grass.positions.length/3;
      // The asymmetric four-point silhouette needs only two triangles, so
      // density comes from many fine blades rather than expensive thick tufts.
      const shape=[[-w,.025,0],[w,.025,0],[bend,.025+h,.024],[-w*.48+bend*.4,.025+h*.56,.013]];
      for(let v=0;v<shape.length;v++) {
        const [px,y,pz]=shape[v],t=Math.pow((y-.025)/h,.65);
        vertex(grass,ox+px*c+pz*s,y,oz-px*s+pz*c,(.34+.55*t)*tone,(.49+.46*t)*tone,(.20+.20*t)*tone);
      }
      for(const i of [0,1,3,1,2,3])grass.indices.push(base+i);
    }
  }
  const palettes=[[.99,.88,.65],[.93,.66,.72],[.70,.83,.88],[.94,.90,.74]];
  // Broken ribbons of tiny blossoms sit within the grass, with gaps and
  // tapered ends. Each blossom is only four petals / four triangles.
  const ribbonCells=Array.from({length:144},(_,i)=>i);
  for(let i=ribbonCells.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ribbonCells[i],ribbonCells[j]]=[ribbonCells[j],ribbonCells[i]];}
  for(const ribbon of ribbonCells) {
    // Jittered cells ensure that every open field has a few flower ribbons;
    // purely random centers can leave a whole encounter field without flowers.
    const cellX=bounds.minX+4+(ribbon%12)*(fieldWidth-8)/11,cellZ=bounds.minZ+4+Math.floor(ribbon/12)*(fieldDepth-8)/11;
    let cx=cellX,cz=cellZ;
    for(let attempt=0;attempt<8;attempt++){
      cx=cellX+(random()-.5)*4;cz=cellZ+(random()-.5)*4;
      if(!blocked(cx,cz,.40))break;
    }
    const angle=random()*Math.PI*2,dx=Math.cos(angle),dz=Math.sin(angle),length=1.1+random()*1.7,width=.25+random()*.42;
    const palette=palettes[ribbon%palettes.length];
    for(let j=0;j<38&&triangles()<maxTriangles-4;j++) {
      const t=random()*2-1,side=(random()-.5)*width*2*(1-t*t),curve=Math.sin(t*3.5+ribbon)*.52;
      const x=cx+dx*t*length-dz*(side+curve),z=cz+dz*t*length+dx*(side+curve);
      if(random()<.18||x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ||blocked(x,z,.14))continue;
      const y=.12+random()*.14,r=.065+random()*.040,rot=random()*Math.PI,tone=.94+random()*.06;
      blooms.push({x,z});
      for(let petal=0;petal<4;petal++) {
        const a=rot+petal*Math.PI*.5,px=Math.cos(a),pz=Math.sin(a),start=flowers.positions.length/3;
        vertex(flowers,x-pz*r*.37,y,z+px*r*.37,palette[0]*tone,palette[1]*tone,palette[2]*tone);
        vertex(flowers,x+px*r,y+.014,z+pz*r,palette[0],palette[1],palette[2]);
        vertex(flowers,x+pz*r*.37,y,z-px*r*.37,palette[0]*tone,palette[1]*tone,palette[2]*tone);
        flowers.indices.push(start,start+1,start+2);
      }
    }
  }
  return {grass,flowers,tufts,blooms,triangleCount:triangles()};
}
