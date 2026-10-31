// Small, painted-looking light and star glints. Gameplay owns the clock through
// update(dt), so pauses freeze the effect and collecting a drop disposes it all.
export function createLootBeacon(B,scene,lootMesh,color='#85c9ff',options={}){
  const tint=color instanceof B.Color3?color.clone():typeof color==='string'&&/^#[0-9a-f]{6}$/i.test(color)?B.Color3.FromHexString(color):B.Color3.FromHexString('#85c9ff');
  const beam=options.beam!==false,intensity=Number.isFinite(options.intensity)?Math.max(0,Math.min(1.6,options.intensity)):1;
  const tier=options.rarity==='uncommon'?0:options.rarity==='legendary'?2:1;
  const beamHeight=[3,3.8,5][tier],beamWidth=[.32,.37,.42][tier],coreWidth=[.065,.075,.085][tier];
  const phase=Number.isFinite(options.phase)?options.phase:0;
  const root=new B.Mesh('rarity loot beacon',scene);root.parent=lootMesh;root.position.y=.1;root.isPickable=false;
  root.metadata={lootBeacon:true,lootBeam:beam,lootBeamHeight:beam?beamHeight:0};
  const materials=[],softMeshes=[],sparkles=[],strips=[];
  function ink(name,emissive,alpha){
    const m=new B.StandardMaterial(name,scene);m.disableLighting=true;m.diffuseColor=B.Color3.Black();m.emissiveColor=emissive;
    m.specularColor=B.Color3.Black();m.backFaceCulling=false;m.alpha=Math.min(1,alpha*intensity);
    m.transparencyMode=B.Material.MATERIAL_ALPHABLEND;m.alphaMode=B.Engine.ALPHA_ADD;m.disableDepthWrite=true;
    materials.push(m);return m;
  }
  // Additive light can brighten a pale cobblestone without painting dark stars
  // onto it. Intensity changes opacity, retaining the same luminous core hue.
  const haze=ink('loot soft painted light',tint.scale(intensity>0?1:0),.55);
  const light=ink('loot warm sparkle core',B.Color3.Lerp(tint,B.Color3.FromHexString('#fff5dc'),.76).scale(intensity>0?1.3:0),.98);
  function attach(mesh,material,soft=false){mesh.parent=root;mesh.material=material;mesh.isPickable=false;mesh.metadata={lootBeacon:true};if(soft)softMeshes.push(mesh);return mesh;}
  function geometry(name,positions,normals,colors,indices,material,soft=false,updatable=false){
    const mesh=attach(new B.Mesh(name,scene),material),data=new B.VertexData();
    data.positions=positions;data.normals=normals;data.colors=colors;data.indices=indices;data.applyToMesh(mesh,updatable);
    mesh.hasVertexAlpha=true;mesh.useVertexColors=true;if(soft)softMeshes.push(mesh);return mesh;
  }
  function halo(name,radius,horizontal){
    const positions=[0,0,0],normals=horizontal?[0,1,0]:[0,0,-1],colors=[1,1,1,.72],indices=[];
    // Two fading bands give softness without an opaque disc or a texture asset.
    for(let ring=0;ring<2;ring++)for(let i=0;i<24;i++){
      const a=i*Math.PI/12,r=radius*(ring===0?.46:1),x=Math.cos(a)*r,y=Math.sin(a)*r;
      positions.push(x,horizontal?0:y,horizontal?y:0);normals.push(...(horizontal?[0,1,0]:[0,0,-1]));colors.push(1,1,1,ring===0?.38:0);
      if(ring===0)indices.push(0,1+i,1+(i+1)%24);
      else{const a0=1+i,b0=1+(i+1)%24,a1=25+i,b1=25+(i+1)%24;indices.push(a0,a1,b0,b0,a1,b1);}
    }
    return geometry(name,positions,normals,colors,indices,haze,true);
  }
  const pool=halo('loot grounded glow pool',beam?.55:.48,true);
  const corona=halo('loot bobbing light corona',beam?.43:.31,false);corona.billboardMode=B.Mesh.BILLBOARDMODE_ALL;
  let core=null,motes=null,motePositions=null,moteColors=null;
  if(beam){
    for(let plane=0;plane<2;plane++){
      const positions=[],normals=[],colors=[],indices=[],heights=[0,.2,beamHeight*.86,beamHeight],fade=[.35,.94,.68,0];
      for(let row=0;row<4;row++)for(let column=0;column<3;column++){
        positions.push((column-1)*beamWidth/2,heights[row],0);normals.push(0,0,-1);colors.push(1,1,1,column===1?fade[row]:0);
      }
      for(let row=0;row<3;row++)for(let column=0;column<2;column++){const i=row*3+column;indices.push(i,i+1,i+3,i+1,i+4,i+3);}
      const strip=geometry('soft crossed loot beam',positions,normals,colors,indices,haze,true);strip.rotation.y=plane*Math.PI/2;strips.push(strip);
    }
    const white=ink('loot white hot beam core',B.Color3.FromHexString('#fffdf0').scale(intensity>0?1.8:0),.94);
    core=attach(B.MeshBuilder.CreateCylinder('thin rarity beam core',{height:beamHeight*.97,diameterBottom:coreWidth,diameterTop:coreWidth*.66,tessellation:8},scene),white);
    // Twelve tiny motes share one reusable mesh, rather than twelve draw calls.
    motePositions=new Float32Array(12*8*3);moteColors=new Float32Array(12*8*4);
    const normals=[],indices=[];
    for(let i=0;i<12;i++)for(let plane=0;plane<2;plane++){
      const v=i*8+plane*4;indices.push(v,v+1,v+2,v,v+2,v+3);
      for(let p=0;p<4;p++){normals.push(plane===0?0:1,0,plane===0?-1:0);moteColors.set([1,1,1,0],(v+p)*4);}
    }
    motes=geometry('loot rising sparkle motes',motePositions,normals,moteColors,indices,light,false,true);
    motes.setBoundingInfo(new B.BoundingInfo(new B.Vector3(-1,-2,-1),new B.Vector3(1,beamHeight+1,1)));
  }
  const count=beam?7:4;
  for(let i=0;i<count;i++){
    const positions=[0,0,0],normals=[0,0,-1],colors=[1,1,1,1],indices=[];
    for(let p=0;p<8;p++){
      const a=p*Math.PI/4,r=p%2?.22:1;positions.push(Math.cos(a)*r,Math.sin(a)*r*1.24,0);normals.push(0,0,-1);colors.push(1,1,1,p%2?1:.85);indices.push(0,1+p,1+(p+1)%8);
    }
    const star=geometry('loot four point sparkle',positions,normals,colors,indices,light);star.billboardMode=B.Mesh.BILLBOARDMODE_ALL;
    sparkles.push(star);
  }
  // Broad vertex-alpha softness must stay out of bloom; otherwise the glow pass
  // fills its invisible edges. Only tiny stars and the optional fine core bloom.
  const glows=(scene.effectLayers||[]).filter(layer=>layer instanceof B.GlowLayer);
  for(const layer of glows)for(const mesh of softMeshes)layer.addExcludedMesh(mesh);
  let elapsed=0,disposed=false;
  function render(){
    const time=elapsed+phase,pulse=.5+.5*Math.sin(time*2.25),ground=.028-lootMesh.position.y-root.position.y;
    // Drops translate and yaw on level ground. Keep this light pool at the
    // ground plane while the item and its corona retain their own gentle bob.
    pool.position.y=ground;pool.scaling.setAll(.92+.12*pulse);pool.visibility=.75+.18*pulse;
    corona.position.y=-.08;corona.scaling.setAll(.88+.15*pulse);corona.visibility=.45+.17*pulse;
    if(core){core.position.y=ground+beamHeight*.97/2;core.visibility=.84+.12*pulse;for(const strip of strips)strip.position.y=ground;}
    for(let i=0;i<count;i++){
      const life=((time*.53+i/count)%1+1)%1;
      const arch=Math.sin(life*Math.PI),twinkle=.35+.65*Math.pow(.5+.5*Math.sin(life*Math.PI*4+i*1.7),2);
      const angle=i*2.399963+time*.28,radius=beam?.06+Math.sin(life*Math.PI)*.15:.19+Math.sin(life*Math.PI)*.20;
      const star=sparkles[i],size=(.10+(i%3)*.025)*(.68+.32*arch)*(.76+.24*twinkle);
      star.position.set(Math.cos(angle)*radius,beam?ground+.14+life*(beamHeight-.28):ground+.05+life*.93,Math.sin(angle)*radius);
      star.scaling.setAll(size);star.rotation.z=Math.sin(time*.7+i)*.16;star.visibility=Math.pow(arch,.7)*(.62+.38*twinkle)*.98;
    }
    if(motes){
      for(let i=0;i<12;i++){
        const life=((time*.31+i/12)%1+1)%1,angle=i*2.399963+time*.4,r=.12+.15*Math.sin(life*Math.PI);
        const x=Math.cos(angle)*r,y=ground+.1+life*(beamHeight-.2),z=Math.sin(angle)*r,size=.018+(i%3)*.006,alpha=Math.sin(life*Math.PI)*.85;
        for(let plane=0;plane<2;plane++)for(let p=0;p<4;p++){
          const vertex=i*8+plane*4+p,k=vertex*3,h=p===1?size:p===3?-size:0;
          motePositions[k]=x+(plane===0?h:0);motePositions[k+1]=y+(p===0?size*1.5:p===2?-size*1.5:0);motePositions[k+2]=z+(plane===1?h:0);
          moteColors[vertex*4+3]=alpha;
        }
      }
      motes.updateVerticesData(B.VertexBuffer.PositionKind,motePositions,false,false);motes.updateVerticesData(B.VertexBuffer.ColorKind,moteColors,false,false);
    }
  }
  root.update=dt=>{if(disposed||!Number.isFinite(dt)||dt<=0)return;elapsed+=dt;render();};
  root.onDisposeObservable.add(()=>{if(disposed)return;disposed=true;for(const layer of glows)for(const mesh of softMeshes)layer.removeExcludedMesh(mesh);for(const material of materials)material.dispose();});
  render();
  return root;
}
