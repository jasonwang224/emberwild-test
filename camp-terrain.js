/* Ragged frontier floors, blended meadow edges and shallow peripheral banks.
 * Only the banks obstruct movement; the existing combat floor stays near Y=0. */
export function buildCampTerrain(api,camps){
  const {B,scene,root,M,cylinder,obstacle}=api;
  const materials=api.materials||[],existing=api.obstacles||[],banks=[],records=[];
  const TAU=Math.PI*2,segments=64;
  let seed=904123;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
  const phase=camp=>camp.id==='cinderwatch'?.37:camp.id==='thornhide'?2.10:4.3;
  const base=(x,z)=>.035+Math.sin(x*.67+z*.29)*.009+Math.cos(z*.79-x*.23)*.008;
  const edge=(camp,a,radius)=>radius*(1+.13*Math.sin(a*3+phase(camp))+.09*Math.cos(a*5-phase(camp)*.7)+.065*Math.sin(a*2+1.1));
  const accesses={cinderwatch:[[6,3]],thornhide:[[-1,0],[1,0]],moonshard:[[3,-6],[1,1]]};
  const inAccess=(camp,dx,dz,pad=0)=>(accesses[camp.id]||[[1,0]]).some(([ax,az])=>{
    const length=Math.hypot(ax,az),along=(dx*ax+dz*az)/length,across=Math.abs(dx*az-dz*ax)/length;
    return along>1&&across<1.65+pad;
  });
  function fringeMaterial(source,name,layer){
    // Explicitly share the existing texture: StandardMaterial.clone may clone
    // dynamic textures too, leaving an extra image outside world ownership.
    const material=new B.StandardMaterial(name,scene);
    material.diffuseColor=source.diffuseColor.clone();material.specularColor=source.specularColor.clone();material.emissiveColor=source.emissiveColor.clone();material.diffuseTexture=source.diffuseTexture;
    material.alpha=1;material.transparencyMode=B.Material.MATERIAL_ALPHABLEND;
    material.metadata={...source.metadata,campTerrainFringe:true,campTerrainLayer:layer};materials.push(material);return material;
  }
  const soilFringe=fringeMaterial(M.campSoil,'world-camp-soil-fringe',0);
  const grassFringe=fringeMaterial(M.grass,'world-camp-grass-fringe',2);
  const pavingFringe=camps.some(c=>c.id==='moonshard')?fringeMaterial(M.campPaving,'world-camp-paving-fringe',1):null;
  function make(name,camp,material,data,{alpha=false,cast=false,kind='floor'}={}){
    const mesh=cylinder(name,camp.x,0,camp.z,1,.02,material,8,root);
    const normals=[];B.VertexData.ComputeNormals(data.positions,data.indices,normals);
    const vertices=new B.VertexData();Object.assign(vertices,{...data,normals});
    if(!alpha&&kind!=='grass')delete vertices.colors;
    if(kind==='grass')delete vertices.uvs;
    vertices.applyToMesh(mesh);
    // Existing grassTuft geometry deliberately has color but no UV buffer;
    // other solid scenery has UV but no color buffer. Match those layouts so
    // the world's shared-material merge can combine these new pieces safely.
    if(kind==='grass')mesh.removeVerticesData(B.VertexBuffer.UVKind);
    mesh.hasVertexAlpha=alpha;mesh.useVertexColors=alpha||kind==='grass';
    if(alpha)mesh.alphaIndex=material.metadata.campTerrainLayer;
    mesh.metadata={...mesh.metadata,castsShadow:cast,campTerrain:camp.id,campTerrainKind:kind};
    mesh.refreshBoundingInfo();records.push(mesh);return mesh;
  }
  // Shared world-space UVs survive batching and keep meadow texture continuous
  // across each bank crest and little islands of grass within the clearing.
  function point(data,camp,x,z,y,alpha=1,tile=4,color=1){
    const i=data.positions.length/3;data.positions.push(x,y,z);data.uvs.push((camp.x+x)/tile,(camp.z+z)/tile);data.colors.push(color,color,color,alpha);return i;
  }
  function ringSurface(name,camp,material,radius,width,alpha=false,tile=4,lift=0,offset=[0,0],kind='floor'){
    const data={positions:[],indices:[],uvs:[],colors:[]},rings=alpha?[0,.55,1]:[.35,.7,1];
    if(!alpha)point(data,camp,offset[0],offset[1],base(camp.x+offset[0],camp.z+offset[1])+lift,1,tile);
    for(let k=0;k<rings.length;k++)for(let j=0;j<segments;j++){
      const a=j*TAU/segments,r=alpha?edge(camp,a,radius)+width*rings[k]:edge(camp,a,radius)*rings[k];
      const x=offset[0]+Math.cos(a)*r,z=offset[1]+Math.sin(a)*r;
      point(data,camp,x,z,base(camp.x+x,camp.z+z)+lift,alpha?(1-rings[k])**1.35:1,tile);
    }
    if(!alpha){
      for(let j=0;j<segments;j++)data.indices.push(0,1+j,1+(j+1)%segments);
      for(let k=0;k<2;k++)for(let j=0;j<segments;j++){
        const a=1+k*segments+j,b=1+k*segments+(j+1)%segments,c=a+segments,d=b+segments;
        data.indices.push(a,c,b,b,c,d);
      }
    }else for(let k=0;k<2;k++)for(let j=0;j<segments;j++){
      const a=k*segments+j,b=k*segments+(j+1)%segments,c=a+segments,d=b+segments;
      data.indices.push(a,c,b,b,c,d);
    }
    return make(name,camp,material,data,{alpha,kind});
  }
  const bankEdge=(bank,a)=>1+.17*Math.sin(a*3+bank.shape)+.10*Math.cos(a*5-1.1)+.07*Math.sin(a+bank.angle);
  function bankHeight(bank,x,z){
    const dx=x-bank.x,dz=z-bank.z,c=Math.cos(bank.angle),s=Math.sin(bank.angle);
    const u=(dx*c+dz*s)/bank.rx,v=(-dx*s+dz*c)/bank.rz,r=Math.hypot(u,v)/bankEdge(bank,Math.atan2(v,u));
    return r<1?bank.h*(1-r*r)**1.45:0;
  }
  function heightAt(x,z,campId){
    const camp=camps.find(c=>c.id===campId)||camps.find(c=>Math.hypot(x-c.x,z-c.z)<c.radius+3);
    if(!camp)return 0;
    const dx=x-camp.x,dz=z-camp.z,r=Math.hypot(dx,dz),a=Math.atan2(dz,dx);
    let y=r<edge(camp,a,(camp.radius||10)*.85)+1.8?base(x,z):0;
    if(camp.id==='moonshard'&&r<edge(camp,a,5.7)+1.25)y+=.007;
    for(const bank of banks)if(bank.campId===camp.id){const height=bankHeight(bank,x,z);if(height>0)y=Math.max(y,base(x,z)+height);}
    return y;
  }
  function buildBank(camp,angle,index){
    const r=(camp.radius||10)+.8,x=camp.x+Math.cos(angle)*r,z=camp.z+Math.sin(angle)*r;
    const rx=1.05+random()*.28,rz=.70+random()*.22,collision=Math.max(rx,rz)*1.34+.10;
    if(inAccess(camp,x-camp.x,z-camp.z,collision)||existing.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+collision+.45))return;
    const bank={campId:camp.id,x,z,rx,rz,collision,angle:angle+.35,shape:phase(camp)+index*1.31,h:.27+random()*.18};banks.push(bank);
    obstacle(x,z,collision);
    const data={positions:[],indices:[],uvs:[],colors:[]},count=24;
    point(data,camp,x-camp.x,z-camp.z,base(x,z)+bank.h,1,4,.96);
    for(const fraction of [.35,.70,1])for(let j=0;j<count;j++){
      const a=j*TAU/count,outline=bankEdge(bank,a),xx=Math.cos(a)*rx*fraction*outline,zz=Math.sin(a)*rz*fraction*outline,c=Math.cos(bank.angle),s=Math.sin(bank.angle);
      const wx=x+xx*c-zz*s,wz=z+xx*s+zz*c;
      point(data,camp,wx-camp.x,wz-camp.z,base(wx,wz)+bankHeight(bank,wx,wz),fraction===1?0:fraction>.5?.85:1,4,.89+fraction*.11);
    }
    for(let j=0;j<count;j++)data.indices.push(0,1+j,1+(j+1)%count);
    for(let k=0;k<2;k++)for(let j=0;j<count;j++){
      const a=1+k*count+j,b=1+k*count+(j+1)%count,c=a+count,d=b+count;data.indices.push(a,c,b,b,c,d);
    }
    make('expansion-'+camp.id+'-earth-bank-'+index,camp,soilFringe,data,{alpha:true,kind:'bank'});
    // Copy the bank's complete ring topology. A separate center-to-edge fan
    // cuts through this convex surface between samples and makes green rings.
    const cap={positions:[],indices:data.indices.slice(),uvs:[],colors:[]};
    for(let j=0;j<data.positions.length;j+=3){
      const vertex=j/3,ring=vertex===0?-1:Math.floor((vertex-1)/count),a=((vertex-1)%count)*TAU/count;
      // Turf reaches farther down the back and sides. Only the camp-facing
      // slope keeps a small bare-soil scar; neither layer has a hard round rim.
      const exposed=Math.max(0,Math.cos(a-(Math.PI-.35))),alpha=ring<0?1:ring===0?1-exposed*.12:ring===1?.96-exposed*.64:0;
      point(cap,camp,data.positions[j],data.positions[j+2],data.positions[j+1]+.008,alpha,24);
    }
    make('expansion-'+camp.id+'-bank-turf-'+index,camp,grassFringe,cap,{alpha:true,kind:'turf'});
  }
  function blades(camp){
    const data={positions:[],indices:[],uvs:[],colors:[]};let placed=0;
    const campBanks=banks.filter(bank=>bank.campId===camp.id);
    const bankObstacle=o=>campBanks.some(bank=>Math.abs(o.x-bank.x)<1e-6&&Math.abs(o.z-bank.z)<1e-6&&Math.abs(o.r-bank.collision)<1e-6);
    for(let attempt=0;attempt<950&&placed<170;attempt++){
      let x,z;
      if(attempt<campBanks.length*12){
        const bank=campBanks[Math.floor(attempt/12)],a=random()*TAU,r=Math.sqrt(random())*.58,c=Math.cos(bank.angle),s=Math.sin(bank.angle);
        const u=Math.cos(a)*bank.rx*r,v=Math.sin(a)*bank.rz*r;
        x=bank.x+u*c-v*s;z=bank.z+u*s+v*c;
      }else{
        const a=random()*TAU,edgeR=edge(camp,a,(camp.radius||10)*.85),r=edgeR-1.2+random()*3.0;
        x=camp.x+Math.cos(a)*r;z=camp.z+Math.sin(a)*r;
      }
      if(inAccess(camp,x-camp.x,z-camp.z,.2)||existing.some(o=>!bankObstacle(o)&&Math.hypot(x-o.x,z-o.z)<o.r+.20))continue;
      const onBank=banks.find(b=>b.campId===camp.id&&bankHeight(b,x,z)>.05),ground=heightAt(x,z,camp.id)+.01;
      for(let j=0;j<5;j++){
        const t=random()*TAU,ox=(random()-.5)*.26,oz=(random()-.5)*.26,h=.15+random()*.25,w=.025+random()*.025,lean=.05+random()*.10;
        const dx=Math.cos(t)*w,dz=Math.sin(t)*w,bendX=Math.sin(t)*lean,bendZ=-Math.cos(t)*lean;
        const xx=x-camp.x+ox,zz=z-camp.z+oz,k=data.positions.length/3;
        data.positions.push(xx-dx,ground,zz-dz,xx+dx,ground,zz+dz,xx+dx*.3+bendX,ground+h*.60,zz+dz*.3+bendZ,xx+bendX*1.4,ground+h,zz+bendZ*1.4);
        data.uvs.push(0,0,1,0,.65,.65,.5,1);
        const shade=.78+random()*.22;for(let q=0;q<4;q++)data.colors.push(shade,shade,shade,1);
        data.indices.push(k,k+2,k+1,k,k+3,k+2);
        // Back faces need their own vertices, otherwise ComputeNormals sums
        // equal opposite triangles into zero-length normals and black blades.
        data.positions.push(...data.positions.slice(k*3,k*3+12));
        data.uvs.push(...data.uvs.slice(k*2,k*2+8));
        data.colors.push(...data.colors.slice(k*4,k*4+16));
        data.indices.push(k+5,k+6,k+4,k+6,k+7,k+4);
      }
      placed++;if(onBank)onBank.grass=true;
    }
    const mesh=make('expansion-'+camp.id+'-grass-encroachment',camp,M.blade,data,{kind:'grass'});
    mesh.metadata.campTufts=placed;mesh.metadata.celFoliage=true;
  }
  for(const camp of camps){
    seed=camp.id==='cinderwatch'?904123:camp.id==='thornhide'?615171:300991;
    const radius=(camp.radius||10)*.85;
    ringSurface('expansion-'+camp.id+'-terrain',camp,M.campSoil,radius,0);
    ringSurface('expansion-'+camp.id+'-terrain-fringe',camp,soilFringe,radius,1.7,true);
    if(camp.id==='moonshard'){
      ringSurface('expansion-moonshard-paving',camp,M.campPaving,5.7,0,false,3,.007);
      ringSurface('expansion-moonshard-paving-fringe',camp,pavingFringe,5.7,1.25,true,3,.007);
    }
    const candidates=camp.id==='cinderwatch'?[-1.5,-.65,1.5]:camp.id==='thornhide'?[-1.2,1.3,2.2]:[-2.4,1.7,.0];
    candidates.forEach((a,i)=>buildBank(camp,a,i));
    for(let j=0;j<3;j++){
      const a=phase(camp)+j*2.1,r=edge(camp,a,radius)-.55,offset=[Math.cos(a)*r,Math.sin(a)*r];
      if(inAccess(camp,...offset,.7))continue;
      const turfRadius=.48+random()*.22;
      ringSurface('expansion-'+camp.id+'-turf-island-'+j,camp,M.grass,turfRadius,0,false,24,.009,offset,'turf');
      ringSurface('expansion-'+camp.id+'-turf-island-fringe-'+j,camp,grassFringe,turfRadius,.35,true,24,.009,offset,'turf');
    }
    blades(camp);
  }
  return {heightAt};
}
