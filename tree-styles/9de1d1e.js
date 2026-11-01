// Tree-only reconstruction of saved revision 9de1d1e. Original procedural geometry and surface paint.
import {applyCelShading} from './cel-9de1d1e.js?v=9517e800';
import {finishHistoricalBatch,scopeHistoricalStyle,assertTreeBuildActive} from './runtime.js?v=9517e800';
import {installCanopyWind,CANOPY_WIND_PADDING} from '../canopy-wind.js?v=9517e800';
import {createCanopyPaint} from './canopy-paint-9de1d1e.js?v=9517e800';
import {treeAppearance,buildTreeCanopy,buildTreeBranches,buildTreeAccents,deformCanopyPositions} from './tree-canopy-9de1d1e.js?v=9517e800';

export async function build(B,scene,options={}) {
  const root=new B.TransformNode('tree-style-9de1d1e',scene);root.setEnabled(false);if(options.parent)root.parent=options.parent;
  const materials=[],textures=[],shadowCasters=[],batches=new Map(),ballTemplates=new Map();
  let foliageDetailMode=false,seed=928531;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
  const range=(a,b)=>a+rand()*(b-a),color=h=>B.Color3.FromHexString(h);
  function mat(name,hex,emissive=0,alpha=1){const m=new B.StandardMaterial('world-history-9de1d1e-'+name,scene);m.diffuseColor=color(hex);m.specularColor=new B.Color3(.035,.045,.05);if(emissive)m.emissiveColor=color(hex).scale(emissive);m.alpha=alpha;materials.push(m);return m;}
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
    contact:mat('soft-contact','#304e45',0,.15),
    treeFoliage:mat('canopy-paint','#ffffff'),
    treeFruit:mat('orchard-paint','#ffffff')
  };
  const foliageMaterials=[M.leaf,M.leafLight,M.leafDark,M.leafTop,M.leafDeep,M.goldLeaf,M.goldLeafLight,M.goldLeafDark,M.pinkLeaf,M.pinkLeafLight,M.pinkLeafDark,M.treeFoliage];
  for(const m of foliageMaterials)m.metadata={foliageSurface:true};
  M.treeFoliage.metadata.canopyWind=true;
  M.treeFruit.metadata={foliageSurface:true,canopyWind:true};

  let disposed=false;
  const dispose=()=>{if(disposed)return;disposed=true;root.dispose();for(const t of textures)t.dispose();for(const m of materials)m.dispose();};
  try {
  assertTreeBuildActive(root,options);
  if(typeof document!=='undefined'||typeof OffscreenCanvas!=='undefined'){
    let textureSeed=651402;const noise=()=>{textureSeed=(Math.imul(textureSeed,1664525)+1013904223)|0;return(textureSeed>>>0)/4294967296;};
      const leafTex=new B.DynamicTexture('painted-leaf-mottling',{width:64,height:64},scene,true,B.Texture.NEAREST_SAMPLINGMODE),leafCtx=leafTex.getContext();
      leafCtx.imageSmoothingEnabled=false;leafCtx.fillStyle='#f1f3df';leafCtx.fillRect(0,0,64,64);
      const leafPaint=['#f7f8e9','#edf0dd','#dbe3c8','#d2dcbc','#e4eacb','#f3f5dc'];
      for(let j=0;j<42;j++){
        const x=Math.floor(noise()*64),y=Math.floor(noise()*64),w=7+Math.floor(noise()*8),h=5+Math.floor(noise()*6);
        for(const ox of [0,-64,64])for(const oy of [0,-64,64]){
          leafCtx.fillStyle=leafPaint[j%leafPaint.length];
          for(let row=0;row<h;row++){
            const inset=row===0||row===h-1?3:row===1||row===h-2?1:0;
            leafCtx.fillRect(x+ox+inset+(row>h*.55?1:0),y+oy+row,w-inset*2,1);
          }
        }
      }
      leafTex.update();leafTex.wrapU=B.Texture.WRAP_ADDRESSMODE;leafTex.wrapV=B.Texture.WRAP_ADDRESSMODE;leafTex.anisotropicFilteringLevel=1;
      for(const m of foliageMaterials)m.diffuseTexture=leafTex;
      textures.push(leafTex);
      const canopyTex=createCanopyPaint(B,scene);M.treeFoliage.diffuseTexture=canopyTex;textures.push(canopyTex);
      const barkTex=new B.DynamicTexture('pixel-bark-grain',{width:32,height:64},scene,false,B.Texture.NEAREST_SAMPLINGMODE),barkCtx=barkTex.getContext();
      barkCtx.fillStyle='#e1d8be';barkCtx.fillRect(0,0,32,64);
      for(let j=0;j<100;j++){barkCtx.fillStyle=j%3?'rgba(75,63,50,.23)':'rgba(255,246,213,.22)';barkCtx.fillRect(Math.floor(noise()*32),Math.floor(noise()*64),1+Math.floor(noise()*2),3+Math.floor(noise()*12));}
      barkTex.update();barkTex.wrapU=B.Texture.WRAP_ADDRESSMODE;barkTex.wrapV=B.Texture.WRAP_ADDRESSMODE;M.wood.diffuseTexture=barkTex;textures.push(barkTex);

  }
  function finish(mesh, material, parent = root, isStatic = true) {
    mesh.material = material; mesh.parent = parent; mesh.isPickable = false; mesh.receiveShadows = material!==M.treeFoliage;
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
  function ball(name,x,y,z,r,m,parent=root,staticMesh=true,scale=null,paint=null) {
    const organic=/tree-crown|garden-shrub|clover-leaf|flower-petal|foxglove-leaf/.test(name);
    const detailed=/tree-crown|garden-shrub-core/.test(name);
    const v=new B.Mesh(name,scene),vd=new B.VertexData();
    if(/^(flower-petal|flower-center|foxglove-flower|shrub-berry|orchard-fruit|tree-flower-spike|tree-flower-tip)$/.test(name)){
      // These tiny botanical details occupy only a few pixels at play distance.
      // Smooth eight-face primitives fund the much denser grass and leaf edges.
      vd.positions=[0,r,0,r,0,0,0,0,r,-r,0,0,0,0,-r,0,-r,0];vd.normals=[0,1,0,1,0,0,0,0,1,-1,0,0,0,0,-1,0,-1,0];vd.indices=[0,1,2,0,2,3,0,3,4,0,4,1,5,2,1,5,3,2,5,4,3,5,1,4];vd.uvs=[.5,1,0,.5,.25,.5,.5,.5,.75,.5,.5,0];
    }else{
      // Thousands of foliage bulbs share the same unit topology. Reuse its
      // construction, but copy vertex arrays so every bulb stays independent.
      const subdivisions=name.startsWith('tree-crown')?3:detailed?2:1;
      const key=subdivisions+(organic?'smooth':'flat');
      if(!ballTemplates.has(key))ballTemplates.set(key,B.VertexData.CreateIcoSphere({radius:1,subdivisions,flat:!organic}));
      const template=ballTemplates.get(key);
      vd.positions=template.positions.map(value=>value*r);vd.normals=template.normals.slice();vd.indices=template.indices.slice();vd.uvs=template.uvs.slice();
      v._originalBuilderSideOrientation=B.Mesh.FRONTSIDE;
    }
    if(name.startsWith('tree-crown'))vd.positions=deformCanopyPositions(vd.positions,x*.73+y*.49+z*.91);
    if(paint){
      vd.colors=[];vd.uvs2=[];
      for(let j=0;j<vd.positions.length/3;j++){vd.colors.push(paint.color.r,paint.color.g,paint.color.b,1);vd.uvs2.push(paint.x,paint.z);}
      if(paint.crown){
        // Shade the canopy as one crown with small lobe relief. Fully radial
        // normals on every overlapping sphere produce rows of shiny-looking
        // circular caps; crown normals retain volume with broad painted light.
        const {center,axes}=paint.crown,[sx,sy,sz]=scale||[1,1,1];
        for(let j=0;j<vd.positions.length;j+=3){
          let mx=(x+vd.positions[j]*sx-center[0])/(axes[0]*axes[0]);
          let my=(y+vd.positions[j+1]*sy-center[1])/(axes[1]*axes[1]);
          let mz=(z+vd.positions[j+2]*sz-center[2])/(axes[2]*axes[2]);
          const ml=Math.hypot(mx,my,mz)||1;mx/=ml;my/=ml;mz/=ml;
          let nx=vd.normals[j]/sx,ny=vd.normals[j+1]/sy,nz=vd.normals[j+2]/sz;
          const nl=Math.hypot(nx,ny,nz)||1;nx=(nx/nl*.34+mx*.66)*sx;ny=(ny/nl*.34+my*.66)*sy;nz=(nz/nl*.34+mz*.66)*sz;
          const length=Math.hypot(nx,ny,nz)||1;vd.normals[j]=nx/length;vd.normals[j+1]=ny/length;vd.normals[j+2]=nz/length;
        }
      }
      // IcoSphere UVs unfold all twenty base faces into one atlas. Repeating
      // the canopy paint gives each visible lobe several scalloped islands,
      // instead of stretching a single pale patch across the whole bulb.
      // UV2 retains the independent tree anchor used by canopy wind.
      const u=(Math.sin(x*3.17+y*8.91+z*1.43)*245.71)%1,uvV=(Math.sin(x*1.21+y*4.73-z*2.77)*317.13)%1;
      const paintRepeat=paint.crown?1.8:1;
      for(let j=0;j<vd.uvs.length;j+=2){vd.uvs[j]=vd.uvs[j]*paintRepeat+u;vd.uvs[j+1]=vd.uvs[j+1]*paintRepeat+uvV;}
      v.hasVertexAlpha=false;
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
  function tree(x,z,s=1,golden=false,pine=false,appearance=null) {
    const style=appearance||treeAppearance(x,z,s,golden,pine),{height,width,depth,leanX,leanZ}=style;
    const shade=cylinder('tree-contact-shadow',x-.25*s,.027,z+.18*s,1.55*s*width,.006,M.contact,18);
    shade.scaling.z=.75*depth;shade.rotation.y=style.yaw;shade.receiveShadows=false;
    foliageDetailMode=true;
    const shades=style.palette.map(color),h=style.trunkHeight*s;
    const canopyShades=[shades[0],shades[1],B.Color3.Lerp(shades[1],shades[2],.70)];
    const trunk=cylinder('tree-trunk',x+leanX*.45,h*.45,z+leanZ*.45,.20*s,h*.9,M.wood,9,root,true,.12*s);
    trunk.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef(B.Axis.Y,new B.Vector3(leanX,h*.9,leanZ).normalize(),new B.Quaternion());
    for(const branch of buildTreeBranches(style)){
      const placed=p=>[x+p[0]*s+leanX*Math.min(1,p[1]/style.trunkHeight),p[1]*s,z+p[2]*s+leanZ*Math.min(1,p[1]/style.trunkHeight)];
      beam('visible-tree-branch',placed(branch.from),placed(branch.to),branch.radius*s,M.wood);
    }
    for(let j=0;j<4;j++){
      const a=j*Math.PI/2+style.yaw;
      beam('tree-root',[x,.15,z],[x+Math.sin(a)*.54*s,.06,z+Math.cos(a)*.54*s],.10*s,M.wood);
    }
    beam('bark-highlight',[x+.12*s,.25,z-.09*s],[x+leanX*.66+.08*s,h*.68,z+leanZ*.66-.06*s],.047*s,M.woodLight);
    const crown={center:[x+leanX,3.55*height*s,z+leanZ],axes:[2.4*width*s,1.65*height*s,2.4*width*depth*s]};
    for(const d of buildTreeCanopy(style)){
      ball(d.core?'tree-crown-core':'tree-crown-lobe',x+leanX+d.x*s,d.y*s,z+leanZ+d.z*s,d.r*s,M.treeFoliage,root,true,d.scale,{color:canopyShades[d.tone],x,z,crown});
    }
    for(const d of buildTreeAccents(style)){
      const violet=d.kind==='violet-flower',c=violet?shades[d.tone]:color(d.kind==='apple'?'#d34d49':'#e6c565');
      ball(violet?'tree-flower-spike':'orchard-fruit',x+leanX+d.x*s,d.y*s,z+leanZ+d.z*s,d.r*s,M.treeFruit,root,true,d.scale,{color:c,x,z});
      if(violet){
        ball('tree-flower-tip',x+leanX+d.x*s,(d.y+d.r*d.scale[1]*.58)*s,z+leanZ+d.z*s,d.r*.38*s,M.treeFruit,root,true,[d.scale[0],d.scale[1]*.65,d.scale[2]],{color:shades[2],x,z});
      }else{
        ball('orchard-fruit-glint',x+leanX+(d.x-d.r*.22)*s,(d.y+d.r*.40)*s,z+leanZ+(d.z-d.r*.42)*s,d.r*.30*s,M.treeFruit,root,true,[1,.70,.65],{color:color(d.kind==='apple'?'#f3a076':'#fff0b4'),x,z});
      }
    }
    cylinder('tree-root-earth',x,.045,z,.43*s,.085,M.earth,7);foliageDetailMode=false;
  }

  const placements=options.trees||[];
  for(let i=0;i<placements.length;i++){assertTreeBuildActive(root,options);const p=placements[i];const original=treeAppearance(p.x,p.z,p.s,p.golden,p.pine);const style=scopeHistoricalStyle(original,p,true);tree(p.x,p.z,p.s,p.golden,p.pine,style);
    if((i+1)%16===0){finishHistoricalBatch(B,root,batches,shadowCasters,{outline:.010,padding:CANOPY_WIND_PADDING});await new Promise(resolve=>setTimeout(resolve,0));}
  }
  assertTreeBuildActive(root,options);
  finishHistoricalBatch(B,root,batches,shadowCasters,{outline:.010,padding:CANOPY_WIND_PADDING});
  const wind=installCanopyWind(B,scene,[M.treeFoliage,M.treeFruit]);
  applyCelShading(B,{materials});for(const material of materials)material.metadata={...material.metadata,emberwildCel:false,historicalTree:true};
  const meshes=root.getChildMeshes();
  return {root,meshes,materials,textures,shadowCasters,update(time=0){if(!disposed)wind.update(time);},dispose};
  }catch(error){dispose();throw error;}
}
