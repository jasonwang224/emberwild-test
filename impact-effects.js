// Crisp, very short contact flashes. Standard materials work on both renderers;
// these accents never create lights or change the game's damage timing.
export const MAX_IMPACT_FLASHES=32;
export const IMPACT_LIFETIME=Object.freeze({normal:.18,critical:.23});

export function createImpactFeedback(B,scene){
  const active=[];let disposed=false,serial=0;
  scene.setRenderingAutoClearDepthStencil(2,false,false,false);
  function remove(hit){
    const index=active.indexOf(hit);if(index<0)return;
    active.splice(index,1);hit.mesh.dispose();hit.material.dispose();
    hit.core.dispose();hit.rim.dispose();
  }
  function ink(name,color){
    const material=new B.StandardMaterial(name,scene);
    material.disableLighting=true;material.diffuseColor=B.Color3.Black();material.emissiveColor=color;
    material.specularColor=B.Color3.Black();material.backFaceCulling=false;
    material.transparencyMode=B.Material.MATERIAL_ALPHABLEND;
    material.disableDepthWrite=true;material.zOffset=-2;
    return material;
  }
  function spawn(position,color='#e4b874',critical=false){
    if(disposed||!position||![position.x,position.y,position.z].every(Number.isFinite))return null;
    if(active.length>=MAX_IMPACT_FLASHES)remove(active[0]);
    const tint=color instanceof B.Color3?color.clone():typeof color==='string'&&/^#[0-9a-f]{6}$/i.test(color)?B.Color3.FromHexString(color):B.Color3.FromHexString('#e4b874');
    const mesh=new B.Mesh('four-point contact flash',scene),data=new B.VertexData();
    // One coplanar mesh: a cream four-point core surrounded by a colored rim.
    // Separate submeshes avoid the depth flicker of overlapping billboard planes.
    const edge=[[0,.5],[.105,.105],[.5,0],[.105,-.105],[0,-.5],[-.105,-.105],[-.5,0],[-.105,.105]];
    const positions=[],normals=[],indices=[];
    for(const size of [1,.74])for(const [x,y]of edge){positions.push(x*size,y*size,0);normals.push(0,0,-1);}
    positions.push(0,0,0);normals.push(0,0,-1);
    for(let i=0;i<8;i++){const next=(i+1)%8;indices.push(i,next,8+i,next,8+next,8+i);}
    for(let i=0;i<8;i++)indices.push(16,8+i,8+(i+1)%8);
    data.positions=positions;data.normals=normals;data.indices=indices;data.applyToMesh(mesh);
    const rim=ink('contact flash colored rim',tint.scale(.72)),core=ink('contact flash cream core',B.Color3.FromHexString(critical?'#fff7ce':'#fff2d7'));
    const material=new B.MultiMaterial('contact flash inks',scene);material.subMaterials=[rim,core];mesh.material=material;
    mesh.subMeshes=[];new B.SubMesh(0,0,17,0,48,mesh);new B.SubMesh(1,0,17,48,24,mesh);
    mesh.position.copyFrom(position);mesh.billboardMode=B.Mesh.BILLBOARDMODE_ALL;mesh.renderingGroupId=2;mesh.isPickable=false;
    mesh.metadata={contactFlash:true,critical:!!critical};
    // GlowLayer ignores mesh.visibility. Exclude the contact star so its pointed
    // silhouette stays sharp and its quick fade cannot leave a glowing orb.
    const glows=(scene.effectLayers||[]).filter(layer=>layer instanceof B.GlowLayer);
    glows.forEach(layer=>layer.addExcludedMesh(mesh));mesh.onDisposeObservable.add(()=>glows.forEach(layer=>layer.removeExcludedMesh(mesh)));
    const hit={mesh,material,core,rim,time:0,duration:critical?IMPACT_LIFETIME.critical:IMPACT_LIFETIME.normal,
      size:critical?1.55:1.08,angle:((serial++%5)-2)*.08};
    active.push(hit);mesh.scaling.setAll(hit.size);mesh.rotation.z=hit.angle;
    return mesh;
  }
  function update(dt,options={}){
    if(disposed||(typeof options==='boolean'?options:options?.paused))return;
    dt=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
    for(const hit of [...active]){
      hit.time+=dt;if(hit.time>=hit.duration){remove(hit);continue;}
      // Hold the contact for two 60 Hz frames, then taper rapidly.
      const hold=1/30,p=Math.max(0,(hit.time-hold)/(hit.duration-hold));
      const pop=hit.time<hold?1+.10*Math.sin(hit.time/hold*Math.PI):1-.72*p;
      hit.mesh.scaling.setAll(hit.size*pop);hit.mesh.rotation.z=hit.angle+p*.16;
      hit.core.alpha=hit.rim.alpha=(1-p)*(1-p);
    }
  }
  function clear(){for(const hit of [...active])remove(hit);}
  function dispose(){if(disposed)return;clear();disposed=true;}
  scene.onDisposeObservable.add(dispose);
  return {spawn,update,clear,dispose,get activeCount(){return active.length;}};
}
