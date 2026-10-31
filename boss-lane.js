// A fixed, directional boss warning. The same rectangle defines the visible
// boundary and damage query; the caller owns countdown, pause and source death.
export function createBossLane(B,scene,{origin,facing,width=3.4,length=13,delay=1.05,damage=0,source=null}={}){
  width=Number.isFinite(width)&&width>0?width:3.4;
  length=Number.isFinite(length)&&length>0?length:13;
  delay=Number.isFinite(delay)&&delay>0?delay:1.05;
  const start=new B.Vector3(Number.isFinite(origin?.x)?origin.x:0,Number.isFinite(origin?.y)?origin.y:0,Number.isFinite(origin?.z)?origin.z:0);
  const dx=Number.isFinite(facing?.x)?facing.x:0,dz=Number.isFinite(facing?.z)?facing.z:1,n=Math.hypot(dx,dz);
  const direction=n>.0001?new B.Vector3(dx/n,0,dz/n):new B.Vector3(0,0,1);
  const center=start.add(direction.scale(length/2)),mesh=new B.TransformNode('boss directional lane warning',scene);
  mesh.position.copyFrom(center);mesh.position.y+=.10;mesh.rotation.y=Math.atan2(direction.x,direction.z);
  mesh.metadata={kind:'lane',width,length};
  const materials=[];
  function material(name,color,alpha){
    const m=new B.StandardMaterial(name,scene);m.disableLighting=true;m.diffuseColor=B.Color3.Black();m.emissiveColor=B.Color3.FromHexString(color);
    m.alpha=alpha;m.backFaceCulling=false;m.fogEnabled=false;m.specularColor=B.Color3.Black();materials.push(m);return m;
  }
  const wash=material('boss lane translucent red','#d84748',.40),edge=material('boss lane red boundary','#ff8b7d',.92),timer=material('boss lane countdown cream','#ffe1b3',.92);
  function attach(child,mat){child.parent=mesh;child.material=mat;child.isPickable=false;child.metadata={bossLane:true};return child;}
  function rectangleFrame(name,w,l,thickness,mat){
    const frame=new B.Mesh(name,scene),data=new B.VertexData(),x=w/2,z=l/2,t=Math.min(thickness,x*.4,z*.4);
    const corners=[[-x,-z],[x,-z],[x,z],[-x,z],[-x+t,-z+t],[x-t,-z+t],[x-t,z-t],[-x+t,z-t]],indices=[];
    data.positions=corners.flatMap(([px,pz])=>[px,0,pz]);data.normals=corners.flatMap(()=>[0,1,0]);
    for(let i=0;i<4;i++){const j=(i+1)%4;indices.push(i,4+i,j,j,4+i,4+j);}
    data.indices=indices;data.applyToMesh(frame);return attach(frame,mat);
  }
  const fill=attach(B.MeshBuilder.CreateGround('boss lane danger fill',{width,height:length,subdivisions:1,sideOrientation:B.Mesh.DOUBLESIDE},scene),wash);
  fill.visibility=.55;
  const border=rectangleFrame('boss lane exact boundary',width,length,.075,edge);border.position.y=.015;
  const clock=rectangleFrame('boss lane expanding countdown',width,length,.045,timer);clock.position.y=.03;clock.scaling.setAll(.04);
  const chevrons=[];
  for(let i=0;i<3;i++){
    const half=Math.min(.55,width*.23),span=Math.min(.5,length*.04),path=[new B.Vector3(-half,0,-span),new B.Vector3(0,0,span),new B.Vector3(half,0,-span)];
    const arrow=attach(B.MeshBuilder.CreateTube('boss lane direction chevron',{path,radius:.04,tessellation:4,cap:B.Mesh.CAP_ALL},scene),edge);
    arrow.position.set(0,.025,-length/2+(i+1)*length/4);chevrons.push(arrow);
  }
  // A low-opacity floor wash must not bloom like an opaque sheet. The boundary
  // and countdown retain bloom, while the danger footprint stays transparent.
  const glows=(scene.effectLayers||[]).filter(layer=>layer instanceof B.GlowLayer);
  glows.forEach(layer=>layer.addExcludedMesh(fill));
  let disposed=false;
  mesh.onDisposeObservable.add(()=>{if(disposed)return;disposed=true;glows.forEach(layer=>layer.removeExcludedMesh(fill));materials.forEach(m=>m.dispose());});
  function contains(point){
    if(disposed||!point||!Number.isFinite(point.x)||!Number.isFinite(point.z))return false;
    const x=point.x-start.x,z=point.z-start.z,forward=x*direction.x+z*direction.z,side=x*direction.z-z*direction.x,epsilon=1e-6;
    return forward>=-epsilon&&forward<=length+epsilon&&Math.abs(side)<=width/2+epsilon;
  }
  // Snapshot data for the caller's directional impact VFX; no timer or resource
  // escapes the warning root's lifetime.
  function impact(){return {origin:start.clone(),center:center.clone(),facing:direction.clone(),width,length};}
  return {mesh,fill,border,clock,chevrons,pos:center.clone(),r:Math.hypot(width,length)/2,kind:'lane',source,time:delay,max:delay,damage,width,length,contains,impact};
}
