// A pooled, game-clock-driven heal flourish. Atlas textures remain owned by the
// sprite library; the temporary tint belongs only to this character.
export const HEALING_EFFECT_DURATION=2.05;
const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};

export function createHealingEffects(B,scene,{root,sprite=null}={}){
  if(!root)throw new Error('Healing effects require a character root');
  const rig=new B.TransformNode('potion-healing-effects',scene);rig.parent=root;
  const materials=[],stars=[],motes=[];
  let disposed=false,elapsed=HEALING_EFFECT_DURATION,originalMaterial=null,bodyMaterial=null;
  let originalEmissive=null,originalDiffuse=null;
  // Keep the same world depth as equipment; a healing sparkle cannot make a
  // foreground wall disappear or trigger the hero's occlusion silhouette.
  scene.setRenderingAutoClearDepthStencil(2,false,false,false);
  function material(name,color){
    const m=new B.StandardMaterial(name,scene);m.disableLighting=true;
    m.emissiveColor=B.Color3.FromHexString(color);m.diffuseColor=B.Color3.Black();m.specularColor=B.Color3.Black();
    m.backFaceCulling=false;m.disableDepthWrite=true;m.transparencyMode=B.Material.MATERIAL_ALPHABLEND;
    m.metadata={emberwildCel:false};materials.push(m);return m;
  }
  const mint=material('potion-heal-mint','#a2ffd0'),gold=material('potion-heal-gold','#fff0aa'),ringMat=material('potion-heal-ring','#7cebb1');
  function star(name,mat,points=4){
    const mesh=new B.Mesh(name,scene),positions=[0,0,0],indices=[];
    for(let i=0;i<points*2;i++){
      const a=i*Math.PI/points,r=i%2?.22:1;
      positions.push(Math.sin(a)*r,Math.cos(a)*r,0);
    }
    for(let i=1;i<=points*2;i++)indices.push(0,i,i===points*2?1:i+1);
    const data=new B.VertexData();data.positions=positions;data.indices=indices;data.normals=[];
    B.VertexData.ComputeNormals(positions,indices,data.normals);data.applyToMesh(mesh);
    mesh.parent=rig;mesh.material=mat;mesh.billboardMode=B.Mesh.BILLBOARDMODE_ALL;
    mesh.isPickable=false;mesh.renderingGroupId=2;return mesh;
  }
  for(let i=0;i<12;i++)stars.push(star('potion rising star '+i,i%3?mint:gold));
  for(let i=0;i<6;i++)motes.push(star('potion orbit mote '+i,i%2?mint:gold,2));
  const ring=B.MeshBuilder.CreateTorus('potion healing ground ripple',{diameter:1.15,thickness:.04,tessellation:48},scene);
  ring.parent=rig;ring.material=ringMat;ring.position.y=.065;ring.isPickable=false;ring.renderingGroupId=2;
  rig.setEnabled(false);

  function restoreBody(){
    if(sprite&&!sprite.isDisposed()&&sprite.material===bodyMaterial)sprite.material=originalMaterial;
  }
  function tintBody(){
    if(!sprite||sprite.isDisposed()||!(sprite.material instanceof B.StandardMaterial))return;
    // Do not clone the atlas: facing changes update its UV offsets every frame.
    // Sharing only its reference keeps both direction and ownership intact.
    if(sprite.material!==bodyMaterial){
      originalMaterial=sprite.material;
      bodyMaterial??=new B.StandardMaterial('potion healed body',scene);
      for(const key of ['diffuseTexture','opacityTexture','ambientTexture','emissiveTexture','bumpTexture'])bodyMaterial[key]=originalMaterial[key];
      for(const key of ['useAlphaFromDiffuseTexture','useEmissiveAsIllumination','linkEmissiveWithDiffuse','backFaceCulling','transparencyMode','alphaCutOff','alpha','disableLighting','disableDepthWrite','depthFunction'])bodyMaterial[key]=originalMaterial[key];
      for(const key of ['diffuseColor','emissiveColor','specularColor','ambientColor'])bodyMaterial[key].copyFrom(originalMaterial[key]);
      bodyMaterial.metadata={emberwildCel:false};
      originalEmissive=originalMaterial.emissiveColor.clone();originalDiffuse=originalMaterial.diffuseColor.clone();
      // Ordinary sprite emission is clamped before albedo multiplication. Use
      // additive illumination for a readable mint wash over the actual silhouette.
      bodyMaterial.useEmissiveAsIllumination=true;
      sprite.material=bodyMaterial;
    }
  }
  function paint(){
    const fadeIn=smooth(elapsed/.14),fadeOut=1-smooth((elapsed-1.35)/.70),envelope=fadeIn*fadeOut;
    if(bodyMaterial&&sprite?.material===bodyMaterial){
      const pulse=envelope*(.88+.12*Math.sin(elapsed*12));
      bodyMaterial.diffuseColor.set(originalDiffuse.r+originalEmissive.r,originalDiffuse.g+originalEmissive.g,originalDiffuse.b+originalEmissive.b);
      bodyMaterial.emissiveColor.set(.12*pulse,.56*pulse,.29*pulse);
    }
    for(let i=0;i<stars.length;i++){
      const mesh=stars[i],delay=(i%4)*.09,life=1.50+(i%3)*.12,p=(elapsed-delay)/life;
      const visible=p>=0&&p<1;
      mesh.setEnabled(visible);
      if(!visible)continue;
      const a=i*2.399963+elapsed*(i%2?.36:-.3),radius=.88+(i%3)*.17;
      mesh.position.set(Math.sin(a)*radius,.55+(i%3)*.18+p*(2.05+(i%3)*.12),Math.cos(a)*radius);
      const twinkle=.85+.15*Math.sin(p*Math.PI*3+i),size=(.16+(i%3)*.035)*Math.sin(p*Math.PI)*twinkle;
      mesh.scaling.set(size,size*(i%2?1.35:1),size);mesh.rotation.z=Math.sin(elapsed*2+i)*.22;
      mesh.visibility=Math.min(1,p*7,(1-p)*4)*fadeOut;
    }
    for(let i=0;i<motes.length;i++){
      const mesh=motes[i],a=i*Math.PI/3+elapsed*1.8,r=.94+.09*Math.sin(elapsed*3+i);
      mesh.position.set(Math.sin(a)*r,.55+(i%3)*.44+elapsed*.22,Math.cos(a)*r);
      const size=(.065+.02*Math.sin(elapsed*9+i))*envelope;
      mesh.scaling.set(size,size*1.6,size);mesh.visibility=envelope*.75;
    }
    const groundPhase=clamp(elapsed/1.3),scale=.7+groundPhase*1.9;
    ring.scaling.set(scale,1,scale);ring.visibility=(1-groundPhase)*fadeIn*.6;
  }
  function clear(){
    if(disposed)return;
    elapsed=HEALING_EFFECT_DURATION;rig.setEnabled(false);restoreBody();
  }
  function dispose(){
    if(disposed)return;
    clear();disposed=true;root.onDisposeObservable.remove(onRootDispose);
    rig.dispose(false);bodyMaterial?.dispose(false,false);for(const m of materials)m.dispose(false,false);
  }
  const onRootDispose=root.onDisposeObservable.add(dispose);
  return {
    trigger(){if(disposed||root.isDisposed())return false;elapsed=0;tintBody();rig.setEnabled(true);paint();return true;},
    update(dt,{paused=false}={}){
      if(disposed||elapsed>=HEALING_EFFECT_DURATION||paused||!Number.isFinite(dt)||dt<=0)return;
      elapsed=Math.min(HEALING_EFFECT_DURATION,elapsed+dt);
      if(elapsed>=HEALING_EFFECT_DURATION){clear();return;}
      paint();
    },
    clear,dispose,get active(){return !disposed&&elapsed<HEALING_EFFECT_DURATION;}
  };
}
