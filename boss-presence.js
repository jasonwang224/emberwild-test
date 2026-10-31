// A restrained, ground-bound menace accent. Time comes only from the game loop;
// no lights, particle emitters or render observers survive the boss's lifetime.
export function createBossPresence(B,scene,parent,{kind='boss',radius=2.2}={}){
  radius=Number.isFinite(radius)&&radius>0?Math.min(radius,5):2.2;
  const root=new B.TransformNode('boss presence',scene);root.parent=parent;
  root.metadata={bossPresence:true,kind};
  const materials=[],meshes=[],glows=(scene.effectLayers||[]).filter(layer=>layer instanceof B.GlowLayer);
  let time=0,disposed=false;
  function ink(name,color,alpha){
    const m=new B.StandardMaterial(name,scene);m.disableLighting=true;m.diffuseColor=B.Color3.Black();
    m.emissiveColor=B.Color3.FromHexString(color);m.specularColor=B.Color3.Black();m.alpha=alpha;
    m.backFaceCulling=false;m.disableDepthWrite=true;m.transparencyMode=B.Material.MATERIAL_ALPHABLEND;
    materials.push(m);return m;
  }
  function attach(mesh,material){
    mesh.parent=root;mesh.material=material;mesh.isPickable=false;mesh.receiveShadows=false;
    mesh.metadata={bossPresence:true};meshes.push(mesh);
    // Glow ignores mesh.visibility. These tiny, softly fading marks keep their
    // own readable silhouette without lighting up the entire danger circle.
    glows.forEach(glow=>glow.addExcludedMesh(mesh));return mesh;
  }
  const soot=ink('boss grounded soot','#392d3a',.23),ember=ink('boss quiet ember','#b57356',.38);
  const rim=new B.Mesh('broken boss thorn corona',scene),data=new B.VertexData(),positions=[],indices=[],normals=[];
  // Separated low spikes, not an opaque disc: the existing warning underneath
  // stays visible through the large gaps and the whole unfilled center.
  for(let i=0;i<14;i++){
    const angle=i/14*Math.PI*2,span=.065+(i%3)*.012,outer=radius*(.88+(i%4)*.035),inner=radius*.74;
    const base=positions.length/3;
    for(const [a,r,y]of [[angle-span,inner,.035],[angle,outer,.035],[angle+span,inner,.035]]){
      positions.push(Math.cos(a)*r,y,Math.sin(a)*r);normals.push(0,1,0);
    }
    indices.push(base,base+1,base+2);
  }
  data.positions=positions;data.normals=normals;data.indices=indices;data.applyToMesh(rim);attach(rim,soot);
  const motes=[];
  for(let i=0;i<8;i++){
    const mesh=attach(B.MeshBuilder.CreatePlane('boss ember mote '+i,{size:.055+(i%3)*.014},scene),ember);
    mesh.billboardMode=B.Mesh.BILLBOARDMODE_ALL;mesh.rotation.z=Math.PI/4;
    motes.push({mesh,phase:i/8,angle:i*2.399963229728653,band:.68+(i%3)*.08});
  }
  function paint(windup,enraged){
    const charge=windup>0?1:0,pulse=.5+.5*Math.sin(time*(charge?10:2.3));
    soot.alpha=(enraged?.27:.20)+charge*(.035+.035*pulse);
    ember.alpha=(enraged?.5:.32)+charge*.22;
    rim.scaling.x=rim.scaling.z=1+charge*.025*pulse;
    for(const mote of motes){
      const p=(time*(charge?.38:.16)+mote.phase)%1,angle=mote.angle+time*.045;
      mote.mesh.position.set(Math.cos(angle)*radius*mote.band,.10+p*(charge?.8:.55),Math.sin(angle)*radius*mote.band);
      mote.mesh.visibility=Math.sin(p*Math.PI)*(charge?.75:.42);
      mote.mesh.scaling.setAll(1+charge*.3*pulse);
    }
  }
  function update(dt,{windup=0,enraged=false,paused=false}={}){
    if(disposed||paused)return;
    const step=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
    // Zero or malformed deltas cannot change state during a frozen frame.
    if(step===0)return;
    time+=step;paint(windup,!!enraged);
  }
  function cleanup(){
    if(disposed)return;disposed=true;
    glows.forEach(glow=>meshes.forEach(mesh=>glow.removeExcludedMesh(mesh)));
    materials.forEach(material=>material.dispose());
  }
  root.onDisposeObservable.add(cleanup);
  function dispose(){if(disposed)return;root.dispose();cleanup();}
  paint(0,false);
  return {root,rim,motes:motes.map(mote=>mote.mesh),update,dispose,get disposed(){return disposed;}};
}
