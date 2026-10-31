// Short directional strokes follow actual travel, so blocked dashes leave no trail.
export function createDashTrail(B,scene){
 const active=[];let disposed=false;
 function remove(item){item.mesh.dispose();item.material.dispose();active.splice(active.indexOf(item),1);}
 function spawn(from,to){
  if(disposed||![from?.x,from?.y,from?.z,to?.x,to?.y,to?.z].every(Number.isFinite))return null;
  const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz);if(length<.035)return null;
  while(active.length>=12)remove(active[0]);
  const ux=dx/length,uz=dz/length,px=uz,pz=-ux,positions=[],indices=[];
  // Three slender tapered strips, each on a slightly different height/side.
  for(let j=0;j<3;j++){
   const offset=(j-1)*.31,reach=Math.min(1.8,length*2.7)*(j===1?1:.72),width=j===1?.075:.045;
   const x=to.x+px*offset-ux*.12,z=to.z+pz*offset-uz*.12,y=to.y+.38+j*.23,n=positions.length/3;
   positions.push(x,y,z,x-ux*reach+px*width,y-.025,z-uz*reach+pz*width,x-ux*reach*1.12,y-.025,z-uz*reach*1.12,x-ux*reach-px*width,y-.025,z-uz*reach-pz*width);
   indices.push(n,n+1,n+2,n,n+2,n+3);
  }
  const mesh=new B.Mesh('directional dash strokes',scene),data=new B.VertexData();data.positions=positions;data.indices=indices;data.normals=[];B.VertexData.ComputeNormals(positions,indices,data.normals);data.applyToMesh(mesh);
  const material=new B.StandardMaterial('dash stroke ink',scene);material.disableLighting=true;material.emissiveColor=B.Color3.FromHexString('#c2f4ed');material.diffuseColor=B.Color3.Black();material.backFaceCulling=false;material.alpha=.72;material.disableDepthWrite=true;mesh.material=material;mesh.isPickable=false;
  const glows=(scene.effectLayers||[]).filter(layer=>layer instanceof B.GlowLayer);glows.forEach(g=>g.addExcludedMesh(mesh));mesh.onDisposeObservable.add(()=>glows.forEach(g=>g.removeExcludedMesh(mesh)));
  active.push({mesh,material,time:0});return mesh;
 }
 function update(dt,{paused=false}={}){if(disposed||paused)return;dt=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));for(const item of [...active]){item.time+=dt;if(item.time>=.24)remove(item);else item.material.alpha=.72*(1-item.time/.24)**2;}}
 function clear(){for(const item of [...active])remove(item);}
 function dispose(){if(disposed)return;clear();disposed=true;}scene.onDisposeObservable.add(dispose);
 return {spawn,update,clear,dispose,get activeCount(){return active.length;}};
}
