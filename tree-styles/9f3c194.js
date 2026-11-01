// Tree-only reconstruction of saved revision 9f3c194. Original procedural geometry and surface paint.
import {applyCelShading} from './cel-c8f1bee.js?v=17317200';
import {finishHistoricalBatch,scopeHistoricalStyle,assertTreeBuildActive} from './runtime.js?v=17317200';

export async function build(B,scene,options={}) {
  const root=new B.TransformNode('tree-style-9f3c194',scene);root.setEnabled(false);if(options.parent)root.parent=options.parent;
  const materials=[],textures=[],shadowCasters=[],batches=new Map(),ballTemplates=new Map();
  let foliageDetailMode=false,seed=928531;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
  const range=(a,b)=>a+rand()*(b-a),color=h=>B.Color3.FromHexString(h);
  function mat(name,hex,emissive=0,alpha=1){const m=new B.StandardMaterial('world-history-9f3c194-'+name,scene);m.diffuseColor=color(hex);m.specularColor=new B.Color3(.035,.045,.05);if(emissive)m.emissiveColor=color(hex).scale(emissive);m.alpha=alpha;materials.push(m);return m;}
  const M={
    earth:mat('earth','#7b6957'),
    wood:mat('wood','#735849'),
    woodLight:mat('wood-light','#a78056'),
    leaf:mat('leaves','#477b5b'),
    leafLight:mat('leaves-light','#76a164'),
    leafDark:mat('leaves-dark','#3d6954'),
    goldLeaf:mat('gold-leaves','#d4b46c'),
    leafTop:mat('leaf-sunlight','#98b875'),
    leafDeep:mat('leaf-deep','#365b4a'),
    pinkLeaf:mat('blossom-mid','#c784a1'),
    pinkLeafLight:mat('blossom-light','#efb9c0'),
    pinkLeafDark:mat('blossom-shadow','#925d82'),
    goldLeafLight:mat('autumn-light','#e3cb8d'),
    goldLeafDark:mat('autumn-shadow','#a48250'),
    red:mat('berries','#c97068'),
    contact:mat('soft-contact','#304e45',0,.15)
  };
  const foliageMaterials=[M.leaf,M.leafLight,M.leafDark,M.leafTop,M.leafDeep,M.goldLeaf,M.goldLeafLight,M.goldLeafDark,M.pinkLeaf,M.pinkLeafLight,M.pinkLeafDark];
  for(const m of foliageMaterials)m.metadata={foliageSurface:true};

  let disposed=false;
  const dispose=()=>{if(disposed)return;disposed=true;root.dispose();for(const t of textures)t.dispose();for(const m of materials)m.dispose();};
  try {
  assertTreeBuildActive(root,options);
  if(typeof document!=='undefined'||typeof OffscreenCanvas!=='undefined'){
    let textureSeed=651402;const noise=()=>{textureSeed=(Math.imul(textureSeed,1664525)+1013904223)|0;return(textureSeed>>>0)/4294967296;};
      const leafTex=new B.DynamicTexture('painted-leaf-mottling',{width:64,height:64},scene,true,B.Texture.NEAREST_SAMPLINGMODE),leafCtx=leafTex.getContext();
      leafCtx.imageSmoothingEnabled=false;leafCtx.fillStyle='#e4e6e2';leafCtx.fillRect(0,0,64,64);
      const leafPaint=['#f1f2e6','#e3e6dc','#c7d1bb','#b9c7aa','#d6dfc9','#e9edda'];
      for(let j=0;j<150;j++){
        const x=Math.floor(noise()*64),y=Math.floor(noise()*64),w=3+Math.floor(noise()*5),h=2+Math.floor(noise()*4);
        for(const ox of [0,-64,64])for(const oy of [0,-64,64]){
          leafCtx.fillStyle=leafPaint[j%leafPaint.length];leafCtx.fillRect(x+ox+1,y+oy,w-2,h);leafCtx.fillRect(x+ox,y+oy+1,w,h-2);
          if(j%3===0){leafCtx.fillStyle='rgba(255,255,240,.12)';leafCtx.fillRect(x+ox+1,y+oy,Math.max(1,w-3),1);}
        }
      }
      leafTex.update();leafTex.wrapU=B.Texture.WRAP_ADDRESSMODE;leafTex.wrapV=B.Texture.WRAP_ADDRESSMODE;leafTex.anisotropicFilteringLevel=1;
      for(const m of foliageMaterials)m.diffuseTexture=leafTex;
      textures.push(leafTex);
      const barkTex=new B.DynamicTexture('pixel-bark-grain',{width:32,height:64},scene,false,B.Texture.NEAREST_SAMPLINGMODE),barkCtx=barkTex.getContext();
      barkCtx.fillStyle='#e1d8be';barkCtx.fillRect(0,0,32,64);
      for(let j=0;j<100;j++){barkCtx.fillStyle=j%3?'rgba(75,63,50,.23)':'rgba(255,246,213,.22)';barkCtx.fillRect(Math.floor(noise()*32),Math.floor(noise()*64),1+Math.floor(noise()*2),3+Math.floor(noise()*12));}
      barkTex.update();barkTex.wrapU=B.Texture.WRAP_ADDRESSMODE;barkTex.wrapV=B.Texture.WRAP_ADDRESSMODE;M.wood.diffuseTexture=barkTex;textures.push(barkTex);

  }
  function finish(mesh, material, parent = root, isStatic = true) {
    mesh.material = material; mesh.parent = parent; mesh.isPickable = false; mesh.receiveShadows = true;
    const casts=/^(tree-crown|tree-trunk|visible-tree|bark-|tree-root$|tree-flower|orchard-fruit)/.test(mesh.name);
    mesh.metadata={treeGeometry:true,celFoliage:foliageDetailMode,castsShadow:casts};
    if(casts&&!isStatic)shadowCasters.push(mesh);
    if (isStatic) { if (!batches.has(material)) batches.set(material,[]); batches.get(material).push(mesh); }
    return mesh;
  }
  function box(name,x,y,z,w,h,d,m,parent=root,staticMesh=true) {
    const v = B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene); v.position.set(x,y,z); return finish(v,m,parent,staticMesh);
  }
  function cylinder(name,x,y,z,r,h,m,sides=10,parent=root,staticMesh=true,top=r) {
    const v = B.MeshBuilder.CreateCylinder(name,{height:h,diameter:r*2,diameterTop:top*2,diameterBottom:r*2,tessellation:sides},scene);
    v.position.set(x,y,z); return finish(v,m,parent,staticMesh);
  }
  function ball(name,x,y,z,r,m,parent=root,staticMesh=true,scale=null) {
    const organic=/tree-crown|garden-shrub|clover-leaf|flower-petal|foxglove-leaf/.test(name);
    const detailed=/tree-crown|garden-shrub-core/.test(name);
    const v=new B.Mesh(name,scene),vd=new B.VertexData();
    if(/^(flower-petal|flower-center|foxglove-flower|shrub-berry|orchard-fruit)$/.test(name)){
      // These tiny botanical details occupy only a few pixels at play distance.
      // Smooth eight-face primitives fund the much denser grass and leaf edges.
      vd.positions=[0,r,0,r,0,0,0,0,r,-r,0,0,0,0,-r,0,-r,0];vd.normals=[0,1,0,1,0,0,0,0,1,-1,0,0,0,0,-1,0,-1,0];vd.indices=[0,1,2,0,2,3,0,3,4,0,4,1,5,2,1,5,3,2,5,4,3,5,1,4];vd.uvs=[.5,1,0,.5,.25,.5,.5,.5,.75,.5,.5,0];
    }else{
      // Thousands of foliage bulbs share the same unit topology. Reuse its
      // construction, but copy vertex arrays so every bulb stays independent.
      const key=(detailed?'2':'1')+(organic?'smooth':'flat');
      if(!ballTemplates.has(key))ballTemplates.set(key,B.VertexData.CreateIcoSphere({radius:1,subdivisions:detailed?2:1,flat:!organic}));
      const template=ballTemplates.get(key);
      vd.positions=template.positions.map(value=>value*r);vd.normals=template.normals.slice();vd.indices=template.indices.slice();vd.uvs=template.uvs.slice();
      v._originalBuilderSideOrientation=B.Mesh.FRONTSIDE;
    }
    if(name.startsWith('tree-crown')){
      // A perfectly spherical lobe produces concentric cel-lit rings. Give
      // each bulb a gently scalloped surface and its analytic smooth normals,
      // so the light forms irregular leaf-shaped patches instead of flat caps.
      const positions=vd.positions,normals=vd.normals,phase=x*.73+y*.49+z*.91;
      for(let i=0;i<positions.length;i+=3){
        const nx=normals[i],ny=normals[i+1],nz=normals[i+2];
        const a=nx*7+ny*3+phase,b=nz*6-ny*4,c=nx*12+nz*10-ny*7+phase;
        const sa=Math.sin(a),ca=Math.cos(a),sb=Math.sin(b),cb=Math.cos(b),sc=Math.sin(c),cc=Math.cos(c);
        const swell=1+.065*sa*sb+.018*sc;
        const gx=.455*ca*sb+.216*cc,gy=.195*ca*sb-.26*sa*cb-.126*cc,gz=.39*sa*cb+.18*cc;
        const radial=gx*nx+gy*ny+gz*nz;
        let tx=nx-(gx-nx*radial)/swell,ty=ny-(gy-ny*radial)/swell,tz=nz-(gz-nz*radial)/swell;
        const length=Math.hypot(tx,ty,tz);tx/=length;ty/=length;tz/=length;
        positions[i]*=swell;positions[i+1]*=swell;positions[i+2]*=swell;
        normals[i]=tx;normals[i+1]=ty;normals[i+2]=tz;
      }
    }
    // Upload final vertices once, after the per-bulb surface variation.
    vd.applyToMesh(v);
    v.position.set(x,y,z);
    if(scale) v.scaling.set(...scale); return finish(v,m,parent,staticMesh);
  }
  function beam(name,a,b,width,m,parent=root,staticMesh=true) {
    const A=new B.Vector3(...a), C=new B.Vector3(...b), diff=C.subtract(A);
    const v=box(name,...A.add(C).scale(.5).asArray(),width,diff.length(),width,m,parent,staticMesh);
    v.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef(B.Axis.Y,diff.normalize(),new B.Quaternion());return v;
  }
  function tree(x,z,s=1,golden=false,pine=false,forcedVariant=null) {
    const shade=cylinder('tree-contact-shadow',x-.45*s,.027,z+.3*s,1.55*s,.006,M.contact,18);
    shade.scaling.z=.7;shade.rotation.y=-.45;shade.receiveShadows=false;
    foliageDetailMode=true;
    const blossom=!golden&&(forcedVariant?forcedVariant==='pink'||forcedVariant==='ivory':Math.abs(Math.round(x+z))%7===0);
    const shades=golden?[M.goldLeafDark,M.goldLeaf,M.goldLeafLight]:blossom?[M.pinkLeafDark,M.pinkLeaf,M.pinkLeafLight]:[M.leafDeep,M.leaf,M.leafTop];
    const variant=Math.abs(Math.round(x*3+z*7))%3;
    const height=variant===0?.89:variant===1?1.04:.96,width=variant===0?1.32:variant===1?1.05:1.18,h=3.8*s*height;
    cylinder('tree-trunk',x,h*.45,z,.23*s,h*.9,M.wood,8,root,true,.14*s);
    for(let j=0;j<4;j++) {
      const a=j*Math.PI/2+.35;
      beam('visible-tree-branch',[x,h*.48,z],[x+Math.sin(a)*.87*s*width,h*.95,z+Math.cos(a)*.87*s*width],.13*s,M.wood);
      beam('tree-root',[x,.15,z],[x+Math.sin(a)*.60*s,.06,z+Math.cos(a)*.60*s],.12*s,M.wood);
    }
    beam('bark-highlight',[x+.16*s,.35,z-.10*s],[x+.10*s,h*.72,z-.08*s],.055*s,M.woodLight);
    // Rounded, overlapping foliage bulbs make a continuous crown, with real
    // volume under a rotating camera. Surface paint supplies the fine detail;
    // hundreds of tiny flattened leaf meshes would read like stacked scales.
    const cores=[[-.58,3.53,0,.80,0],[.57,3.55,0,.82,0],[0,3.55,.55,.78,0],[-.52,4.07,-.14,.85,1],[.50,4.11,-.13,.83,1],[0,4.38,.31,.75,2]];
    for(const [dx,dy,dz,r,tone] of cores){
      ball('tree-crown-core',x+dx*s*width,dy*s*height,z+dz*s*width,r*s*.88,shades[tone],root,true,[width,1.02,width]);
    }
    const phase=x*.313+z*.197;
    const leafNoise=n=>{const f=Math.sin(n*127.1+x*311.7+z*74.7)*43758.5453;return f-Math.floor(f);};
    for(let j=0;j<54;j++){
      const core=cores[j%cores.length],layer=Math.floor(j/cores.length);
      const yy=-.88+layer*.22,a=layer*2.399+phase+(j%cores.length)*1.1,ring=Math.sqrt(1-yy*yy),spread=.70+leafNoise(j+151)*.15;
      const dx=core[0]+Math.cos(a)*ring*core[3]*spread,dz=core[2]+Math.sin(a)*ring*core[3]*spread,dy=core[1]+yy*core[3]*.84;
      const r=(.43+leafNoise(j+263)*.24)*s;
      let tone=dy>4.25?2:dy<3.50?0:1;if(leafNoise(j+419)>.85)tone=Math.min(2,tone+1);
      const lobe=ball('tree-crown-bulb',x+(dx+.1*Math.sin(phase+dy))*s*width,dy*s*height,z+dz*s*width,r,shades[tone],root,true,[.94+leafNoise(j+29)*.18,1.18+leafNoise(j+31)*.18,.94+leafNoise(j+37)*.18]);
      lobe.rotation.y=a;lobe.rotation.z=Math.sin(a)*.18;
    }
    if(!golden&&!blossom&&Math.abs(Math.round(x-z))%4===0) {
      for(let j=0;j<6;j++){const a=j*1.047;ball('orchard-fruit',x+Math.sin(a)*1.5*s,3.55*s,z+Math.cos(a)*1.5*s,.10*s,M.red);}
    }
    cylinder('tree-root-earth',x,.08,z,.5*s,.16,M.earth,7);foliageDetailMode=false;
  }

  const placements=options.trees||[];
  for(let i=0;i<placements.length;i++){assertTreeBuildActive(root,options);const p=placements[i];tree(p.x,p.z,p.s,p.golden,p.pine,p.variant);
    if((i+1)%16===0){finishHistoricalBatch(B,root,batches,shadowCasters,{outline:.010,padding:0});await new Promise(resolve=>setTimeout(resolve,0));}
  }
  assertTreeBuildActive(root,options);
  finishHistoricalBatch(B,root,batches,shadowCasters,{outline:.010,padding:0});
  const wind={update(){}};
  applyCelShading(B,{materials});for(const material of materials)material.metadata={...material.metadata,emberwildCel:false,historicalTree:true};
  const meshes=root.getChildMeshes();
  return {root,meshes,materials,textures,shadowCasters,update(time=0){if(!disposed)wind.update(time);},dispose};
  }catch(error){dispose();throw error;}
}
