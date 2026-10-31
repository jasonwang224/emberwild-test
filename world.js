/* Emberwild — original procedural scenery. No external assets. */
import {createMeadowTexture} from './meadow-texture.js?v=e2609980';
import {buildMeadowDetail} from './meadow-detail.js?v=e2609980';
import {installCanopyWind,CANOPY_WIND_PADDING} from './canopy-wind.js?v=e2609980';
import {installEnvironmentPaint,applyEnvironmentPaintUV} from './environment-paint.js?v=e2609980';
import {createCampMaterials,applyCampPaintUV} from './camp-paint.js?v=e2609980';
import {createCanopyPaint,canopyPaintUV} from './canopy-paint.js?v=e2609980';
import {treeAppearance,buildTreeCanopy,buildTreeBranches,buildTreeAccents} from './tree-canopy.js?v=e2609980';
import {createTreeStyleController} from './tree-style-controller.js?v=e2609980';
import {TOWN_PLAN,buildTownExpansion} from './town-expansion.js?v=e2609980';
import {EXPANSION_BOUNDS,EXPANSION_ROUTES,expansionReservedAreas,buildWorldExpansion} from './world-expansion.js?v=e2609980';
import {buildCampTerrain} from './camp-terrain.js?v=e2609980';
import {dressCamps} from './camp-dressing.js?v=e2609980';
import {isTownSafe,findClearPosition} from './world-navigation.js?v=e2609980';
import {enemyProfile} from './enemy-profile.js?v=e2609980';
import {createCircleQuery,createSegmentQuery} from './world-spatial-query.js?v=e2609980';
import {canopyVertexLayout,deformCanopyTemplate,cachedCanopyPaintUV} from './canopy-vertex-cache.js?v=e2609980';
import {applyBatchVertexData,uploadBatchGeometry} from './world-batch-geometry.js?v=e2609980';
import {installWaterSurface} from './water-surface.js?v=e2609980';
export {treeAppearance} from './tree-canopy.js?v=e2609980';

export function createWorld(B, scene, options = {}) {
  const dungeon = options.zone === 'dungeon';
  const root = new B.TransformNode('emberwild-world', scene);
  const obstacles = [], interactables = [], spawnPoints = [], shadowCasters = [], treePositions=[], batches = new Map();
  const materials = [], textures = [], animated = [], shrineParts = new Map();
  const ballTemplates = new Map();
  const mapRoutes=[];
  let town=null,expansion=null;
  let foliageDetailMode=false;
  let treeGeometryMode=false;
  let seed = dungeon ? 80419 : 928531;
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
  const range = (a,b) => a + rand() * (b-a);
  const color = h => B.Color3.FromHexString(h);
  function mat(name, hex, emissive = 0, alpha = 1) {
    const m = new B.StandardMaterial('world-'+name, scene);
    m.diffuseColor = color(hex); m.specularColor = new B.Color3(.035,.045,.05);
    if (emissive) m.emissiveColor = color(hex).scale(emissive);
    m.alpha = alpha; materials.push(m); return m;
  }
  const M = {
    grass:mat('grass','#749b67'), grassLight:mat('grass-light','#7a9e6b'), grassDark:mat('grass-dark','#6d9463'),
    // The cobble texture already contains its cream/sand color; a second warm
    // tint made the final paving muddy and removed its pale limestone highlights.
    earth:mat('earth','#7b6957'), sand:mat('sand','#c7b991'), path:mat('path','#ffffff'), pebble:mat('pebble','#c8bda0'),
    dirt:mat('woodland-dirt','#b58d64'), dirtEdge:mat('woodland-dirt-edge','#947a56'), violetRoof:mat('violet-roof','#8e7099'),
    water:mat('water','#66b6ca',.09), ripple:mat('ripples','#99d6d2',.3,.60), pond:mat('pond','#65a7b6',.08),
    stone:mat('stone','#8d9790'), stoneLight:mat('stone-light','#afb5a5'), stoneDark:mat('stone-dark','#65756f'),
    wood:mat('wood','#735849'), woodLight:mat('wood-light','#a78056'), woodDark:mat('wood-dark','#493f3e'), violetBark:mat('violet-bark','#675a81'),
    wall:mat('plaster','#eddbb2'), wallShade:mat('plaster-shade','#d2bf98'), roof:mat('roof','#bd7558'), roofLight:mat('roof-light','#d09264'),
    brick:mat('town-masonry','#c8b38e'), brickLight:mat('town-capstone','#d2bd93'),
    timber:mat('town-timber','#735145'), timberLight:mat('town-timber-light','#a78056'), timberDark:mat('town-timber-dark','#53434b'),
    awning:mat('town-awning','#9b5c63'), cloth:mat('town-cloth','#f0dfb9'), townSlate:mat('town-slate','#58677b'),
    blueRoof:mat('blue-roof','#527a83'), leaf:mat('leaves','#477b5b'), leafLight:mat('leaves-light','#76a164'), leafDark:mat('leaves-dark','#3d6954'),
    goldLeaf:mat('gold-leaves','#d4b46c'), gold:mat('gold','#e6bd65',.06), iron:mat('iron','#5b6872'),
    leafTop:mat('leaf-sunlight','#98b875'), leafDeep:mat('leaf-deep','#365b4a'),
    blade:mat('tapered-grass','#91ad6b'), fern:mat('fern-fronds','#6e9a65'),
    pinkLeaf:mat('blossom-mid','#c784a1'), pinkLeafLight:mat('blossom-light','#efb9c0'), pinkLeafDark:mat('blossom-shadow','#925d82'),
    goldLeafLight:mat('autumn-light','#e3cb8d'), goldLeafDark:mat('autumn-shadow','#a48250'),
    window:mat('warm-windows','#c5c4ad',.12), cream:mat('cream','#fff0cb'), pink:mat('pink','#e9a5a1'), lavender:mat('lavender','#a79ec9'),
    red:mat('berries','#c97068'), green:mat('herbs','#a7c878'), teal:mat('teal','#61c5b5',.35),
    skin:mat('skin','#e6ad82'), hair:mat('hair','#675044'), cloak:mat('cloak','#8b718c'), apron:mat('apron','#bcc6ad'),
    black:mat('eyes','#353c40'), crystal:mat('crystal','#83d9dc',.7), flame:mat('flame','#ffd28b',.9),
    dungeon:mat('dungeon-floor','#82715f'), dungeonDark:mat('dungeon-dark','#51483f'), dungeonStone:mat('dungeon-stone','#78838c'),
    dungeonTile:mat('dungeon-tile','#8b8172'), dungeonWall:mat('dungeon-wall','#4e5e67'),
    purple:mat('amethyst','#b79bdf',.6), rune:mat('runes','#b8a1f2',.9), moss:mat('moss','#648782'),
    contact:mat('soft-contact','#304e45',0,.15), treeFoliage:mat('canopy-paint','#ffffff'), treeFruit:mat('orchard-paint','#ffffff')
  };
  const foliageMaterials=[M.leaf,M.leafLight,M.leafDark,M.leafTop,M.leafDeep,M.goldLeaf,M.goldLeafLight,M.goldLeafDark,M.pinkLeaf,M.pinkLeafLight,M.pinkLeafDark,M.treeFoliage];
  for(const m of foliageMaterials)m.metadata={foliageSurface:true};
  M.treeFoliage.metadata.canopyWind=true;
  M.treeFruit.metadata={foliageSurface:true,canopyWind:true};
  // Original painted surface textures are generated locally and remain optional
  // so world geometry also works in headless / NullEngine validation.
  if (!dungeon && (typeof document !== 'undefined' || typeof OffscreenCanvas !== 'undefined')) {
    let textureSeed=651402;
    const noise=()=>{textureSeed=(Math.imul(textureSeed,1664525)+1013904223)|0;return(textureSeed>>>0)/4294967296;};
    try {
      const grassTex=createMeadowTexture(B,scene);
      M.grass.diffuseTexture=grassTex;M.grassLight.diffuseTexture=grassTex;M.grassDark.diffuseTexture=grassTex;textures.push(grassTex);
      const pathTex=new B.DynamicTexture('hand-laid-cobbles',{width:128,height:128},scene,false,B.Texture.NEAREST_SAMPLINGMODE);
      const p=pathTex.getContext();p.scale(.125,.125);p.imageSmoothingEnabled=false;p.fillStyle='#a5aa8d';p.fillRect(0,0,1024,1024);
      for(let row=-1;row<10;row++)for(let col=-1;col<10;col++) {
        const cell=128,x=col*cell+(row%2)*64,y=row*cell,w=110+noise()*6,h=109+noise()*9;
        const corners=[[x+13,y+8],[x+w-8,y+7+noise()*5],[x+w+1,y+19],[x+w,y+h-5],[x+w-11,y+h+5],[x+14,y+h+4],[x+5,y+h-8],[x+5,y+20]];
        const c=Math.floor(216+noise()*23);p.fillStyle=`rgb(${c},${c-2},${c-13})`;p.beginPath();corners.forEach(([a,b],i)=>i?p.lineTo(a,b):p.moveTo(a,b));p.closePath();p.fill();
        p.strokeStyle='rgba(112,115,95,.23)';p.lineWidth=3;p.stroke();
        p.strokeStyle='rgba(255,255,242,.42)';p.lineWidth=3;p.beginPath();p.moveTo(x+15,y+13);p.lineTo(x+w-12,y+12);p.stroke();
        p.fillStyle='rgba(128,139,111,.09)';for(let k=0;k<8;k++)p.fillRect(x+15+noise()*(w-25),y+15+noise()*(h-25),2+noise()*4,2+noise()*4);
      }
      pathTex.update();pathTex.wrapU=B.Texture.WRAP_ADDRESSMODE;pathTex.wrapV=B.Texture.WRAP_ADDRESSMODE;pathTex.anisotropicFilteringLevel=1;
      M.path.diffuseTexture=pathTex;textures.push(pathTex);
      const roofTex=new B.DynamicTexture('pixel-shingles',{width:128,height:128},scene,false,B.Texture.NEAREST_SAMPLINGMODE);
      const r=roofTex.getContext();r.imageSmoothingEnabled=false;r.fillStyle='#95948c';r.fillRect(0,0,128,128);
      for(let row=0;row<8;row++)for(let col=-1;col<9;col++) {
        const x=col*16+(row%2)*8,y=row*16,c=Math.floor(190+noise()*42);
        r.fillStyle=`rgb(${c},${c-4},${c-9})`;r.fillRect(x+1,y+1,14,14);
        r.fillStyle='rgba(255,249,225,.35)';r.fillRect(x+1,y+1,14,2);
        r.fillStyle='rgba(77,74,70,.30)';r.fillRect(x+1,y+13,14,2);
        if(noise()>.55){r.fillStyle='rgba(90,90,77,.14)';r.fillRect(x+6,y+5,2,4);}
      }
      roofTex.update();roofTex.wrapU=B.Texture.WRAP_ADDRESSMODE;roofTex.wrapV=B.Texture.WRAP_ADDRESSMODE;roofTex.anisotropicFilteringLevel=1;M.roof.diffuseTexture=roofTex;M.blueRoof.diffuseTexture=roofTex;textures.push(roofTex);
      const wallTex=new B.DynamicTexture('pixel-plaster',{width:64,height:64},scene,false,B.Texture.NEAREST_SAMPLINGMODE);
      const w=wallTex.getContext();w.fillStyle='#eee9d9';w.fillRect(0,0,64,64);
      for(let j=0;j<380;j++){w.fillStyle=j%3?'rgba(135,119,92,.1)':'rgba(255,255,242,.45)';w.fillRect(Math.floor(noise()*64),Math.floor(noise()*64),1,1);}
      wallTex.update();wallTex.wrapU=B.Texture.WRAP_ADDRESSMODE;wallTex.wrapV=B.Texture.WRAP_ADDRESSMODE;M.wall.diffuseTexture=wallTex;textures.push(wallTex);
      const dirtTex=new B.DynamicTexture('packed-earth',{width:128,height:128},scene,false,B.Texture.NEAREST_SAMPLINGMODE),dirtCtx=dirtTex.getContext();
      dirtCtx.fillStyle='#e5dbc6';dirtCtx.fillRect(0,0,128,128);
      for(let j=0;j<1300;j++){dirtCtx.fillStyle=j%3?'rgba(106,89,66,.11)':'rgba(255,250,225,.20)';dirtCtx.fillRect(Math.floor(noise()*128),Math.floor(noise()*128),1+Math.floor(noise()*2),1);}
      dirtTex.update();dirtTex.wrapU=B.Texture.WRAP_ADDRESSMODE;dirtTex.wrapV=B.Texture.WRAP_ADDRESSMODE;M.dirt.diffuseTexture=dirtTex;textures.push(dirtTex);
      // Pixel-scale leaves live on the curved 3D surfaces, rather than being
      // camera-facing canopy artwork. The lighting plugin still shades them.
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
      barkTex.update();barkTex.wrapU=B.Texture.WRAP_ADDRESSMODE;barkTex.wrapV=B.Texture.WRAP_ADDRESSMODE;M.wood.diffuseTexture=barkTex;M.violetBark.diffuseTexture=barkTex;textures.push(barkTex);
    } catch(error) { console.warn('Procedural paint unavailable; using solid world colors.',error); }
  }
  installEnvironmentPaint(B,scene,M,{dungeon,textures});
  if(!dungeon&&!options.treeStudy)Object.assign(M,createCampMaterials(B,scene,{materials,textures}));
  function finish(mesh, material, parent = root, isStatic = true) {
    mesh.material = material; mesh.parent = parent; mesh.isPickable = false; mesh.receiveShadows = material!==M.treeFoliage;
    const casts=/^(expansion-|tree-crown|tree-trunk|visible-tree|bark-|tree-root$|house-|timber-|back-timber|side-timber|door-|door$|window-frame|side-window-frame|back-window-frame|roof-|gable-|chimney|fence-|lantern-|forge$|anvil|stall-|market-awning|market-table|table-leg|garden-shrub|pillar-|gate-|ruined-|boulder|shrine-pillar|round-house|dome-|porthole-frame|bench-|fountain-(step|basin|rim|column|dish|stone))/.test(mesh.name);
    if(foliageDetailMode||casts)mesh.metadata={celFoliage:foliageDetailMode,castsShadow:casts};
    if(treeGeometryMode)mesh.metadata={...mesh.metadata,treeGeometry:true};
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
    let canopyLayout=null;
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
      if(name.startsWith('tree-crown')){
        canopyLayout=canopyVertexLayout(template);
        vd.positions=deformCanopyTemplate(template,r,x*.73+y*.49+z*.91);
      }else vd.positions=template.positions.map(value=>value*r);
      vd.normals=template.normals.slice();vd.indices=template.indices.slice();vd.uvs=template.uvs.slice();
      v._originalBuilderSideOrientation=B.Mesh.FRONTSIDE;
    }
    if(paint){
      vd.colors=[];vd.uvs2=[];
      for(let j=0;j<vd.positions.length/3;j++){vd.colors.push(paint.color.r,paint.color.g,paint.color.b,1);vd.uvs2.push(paint.x,paint.z);}
      if(paint.crown){
        // Shared crown light keeps each mass matte. Its continuous scalloped
        // paint supplies the leaf detail instead of circular sphere highlights.
        const {center,axes}=paint.crown,[sx,sy,sz]=scale||[1,1,1];
        for(let j=0;j<vd.positions.length;j+=3){
          const source=canopyLayout?.unique[canopyLayout.source[j/3]]??j;
          if(source!==j){vd.normals[j]=vd.normals[source];vd.normals[j+1]=vd.normals[source+1];vd.normals[j+2]=vd.normals[source+2];continue;}
          let mx=(x+vd.positions[j]*sx-center[0])/(axes[0]*axes[0]);
          let my=(y+vd.positions[j+1]*sy-center[1])/(axes[1]*axes[1]);
          let mz=(z+vd.positions[j+2]*sz-center[2])/(axes[2]*axes[2]);
          const ml=Math.hypot(mx,my,mz)||1;mx/=ml;my/=ml;mz/=ml;
          let nx=vd.normals[j]/sx,ny=vd.normals[j+1]/sy,nz=vd.normals[j+2]/sz;
          const nl=Math.hypot(nx,ny,nz)||1;nx=(nx/nl*.30+mx*.70)*sx;ny=(ny/nl*.30+my*.70)*sy;nz=(nz/nl*.30+mz*.70)*sz;
          const length=Math.hypot(nx,ny,nz)||1;vd.normals[j]=nx/length;vd.normals[j+1]=ny/length;vd.normals[j+2]=nz/length;
        }
      }
      if(paint.crown){
        // One rounded cap follows the lobe, continuously across sphere faces.
        const phase=Math.sin(x*3.17+y*8.91+z*1.43)*.17;
        vd.uvs=canopyLayout?cachedCanopyPaintUV(vd.positions,scale||[1,1,1],vd.indices,phase,canopyLayout):canopyPaintUV(vd.positions,scale||[1,1,1],vd.indices,phase);
      }
      v.hasVertexAlpha=false;
    }
    // Upload final vertices once, after the per-bulb surface variation.
    if(staticMesh)applyBatchVertexData(B,v,vd);else vd.applyToMesh(v);
    v.position.set(x,y,z);
    if(scale) v.scaling.set(...scale); return finish(v,m,parent,staticMesh);
  }
  function torus(name,x,y,z,r,thickness,m,parent=root,staticMesh=true) {
    const v=B.MeshBuilder.CreateTorus(name,{diameter:r*2,thickness,tessellation:r>2?32:r>1?24:12},scene);v.position.set(x,y,z);return finish(v,m,parent,staticMesh);
  }
  function beam(name,a,b,width,m,parent=root,staticMesh=true) {
    const A=new B.Vector3(...a), C=new B.Vector3(...b), diff=C.subtract(A);
    const v=box(name,...A.add(C).scale(.5).asArray(),width,diff.length(),width,m,parent,staticMesh);
    v.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef(B.Axis.Y,diff.normalize(),new B.Quaternion());return v;
  }
  function node(name,x,y,z) {const n=new B.TransformNode(name,scene);n.parent=root;n.position.set(x,y,z);return n;}
  function interact(id,type,name,x,z) {const n=node(id,x,0,z); const v={id,type,name,x,z,mesh:n};interactables.push(v);return n;}
  function obstacle(x,z,r){obstacles.push({x,z,r});}
  function groundPlane(name,w,h,z,m,y=0,pickable=true) {
    const g=B.MeshBuilder.CreateGround(name,{width:w,height:h,subdivisions:1},scene);g.position.set(0,y,z);finish(g,m,root,false);
    g.isPickable=pickable;if(pickable) g.metadata={ground:true};return g;
  }
  function rock(x,z,size=1,m=M.stone,collide=true) {
    const r=ball('boulder',x,size*.38,z,size,m,root,true,[1,.7,.82]);r.rotation.y=rand()*6.28;
    if(collide) obstacle(x,z,size*.8);
    if(size>1) ball('moss',x-.14,size*.88,z+.08,size*.48,M.moss,root,true,[1,.24,.8]);
  }
  function tree(x,z,s=1,golden=false,pine=false,appearance=null) {
    const style=appearance||treeAppearance(x,z,s,golden,pine),{height,width,depth,leanX,leanZ}=style;
    treePositions.push({x,z,s,golden,pine,variant:style.variant,appearance:style});
    treeGeometryMode=true;
    const shade=cylinder('tree-contact-shadow',x-.25*s,.027,z+.18*s,1.55*s*width,.006,M.contact,18);
    shade.scaling.z=.75*depth;shade.rotation.y=style.yaw;shade.receiveShadows=false;
    foliageDetailMode=true;
    const shades=style.palette.map(color),h=style.trunkHeight*s;
    const canopyShades=[shades[0],shades[1],shades[2]];
    const trunkMaterial=style.variant==='violet'?M.violetBark:M.wood;
    const trunk=cylinder('tree-trunk',x+leanX*.45,h*.45,z+leanZ*.45,.23*s,h*.9,trunkMaterial,9,root,true,.15*s);
    trunk.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef(B.Axis.Y,new B.Vector3(leanX,h*.9,leanZ).normalize(),new B.Quaternion());
    for(const branch of buildTreeBranches(style)){
      const placed=p=>[x+p[0]*s+leanX*Math.min(1,p[1]/style.trunkHeight),p[1]*s,z+p[2]*s+leanZ*Math.min(1,p[1]/style.trunkHeight)];
      beam('visible-tree-branch',placed(branch.from),placed(branch.to),branch.radius*s,trunkMaterial);
    }
    for(let j=0;j<4;j++){
      const a=j*Math.PI/2+style.yaw;
      beam('tree-root',[x,.15,z],[x+Math.sin(a)*.54*s,.06,z+Math.cos(a)*.54*s],.10*s,trunkMaterial);
    }
    beam('bark-highlight',[x+.12*s,.25,z-.09*s],[x+leanX*.66+.08*s,h*.68,z+leanZ*.66-.06*s],.047*s,style.variant==='violet'?M.lavender:M.woodLight);
    const crown={center:[x+leanX,3.55*height*s,z+leanZ],axes:[2.4*width*s,1.65*height*s,2.4*width*depth*s]};
    for(const d of buildTreeCanopy(style)){
      ball(d.core?'tree-crown-core':'tree-crown-lobe',x+leanX+d.x*s,d.y*s,z+leanZ+d.z*s,d.r*s,M.treeFoliage,root,true,d.scale,{color:canopyShades[d.tone].scale(d.tint??1),x,z,crown});
    }
    for(const d of buildTreeAccents(style)){
      const violet=d.kind==='violet-flower',c=violet?shades[d.tone]:color(d.kind==='apple'?'#d34d49':'#e6c565');
      ball(violet?'tree-flower-spike':'orchard-fruit',x+leanX+d.x*s,d.y*s,z+leanZ+d.z*s,d.r*s,M.treeFruit,root,true,d.scale,{color:c,x,z});
      if(violet){
        // Small cream petals around each purple head, rather than a pale
        // triangle capping a crystal-like spike. Every glint has real depth.
        const petalColor=color(d.tipColor||'#eee2cf'),petalRadius=d.r*(d.tipScale||.26)*s;
        for(let petal=0;petal<3;petal++){
          const a=petal*Math.PI*2/3+d.x*1.7+d.z*.9;
          ball('tree-flower-tip',x+leanX+(d.x+Math.cos(a)*d.r*.42)*s,(d.y+d.r*d.scale[1]*.60+(petal===1?.03:0))*s,z+leanZ+(d.z+Math.sin(a)*d.r*.42)*s,petalRadius,M.treeFruit,root,true,[1.20,.72,.80],{color:petalColor,x,z});
        }
      }else{
        ball('orchard-fruit-glint',x+leanX+(d.x-d.r*.22)*s,(d.y+d.r*.40)*s,z+leanZ+(d.z-d.r*.42)*s,d.r*.30*s,M.treeFruit,root,true,[1,.70,.65],{color:color(d.kind==='apple'?'#f3a076':'#fff0b4'),x,z});
      }
    }
    cylinder('tree-root-earth',x,.045,z,.43*s,.085,M.earth,7);foliageDetailMode=false;treeGeometryMode=false;obstacle(x,z,.5*s);
  }
  function flower(x,z,c=M.cream,s=1) {
    cylinder('flower-stem',x,.19*s,z,.025*s,.38*s,M.leaf,4);
    for(let j=0;j<5;j++){const a=j*1.256;ball('flower-petal',x+Math.sin(a)*.10*s,.42*s,z+Math.cos(a)*.10*s,.085*s,c,root,true,[1,.48,1]);}
    ball('flower-center',x,.46*s,z,.055*s,M.gold);
  }
  function shrub(x,z,s=1,berries=false) {
    const base=cylinder('shrub-shadow',x,.029,z,.75*s,.005,M.contact,12);base.scaling.z=.8;
    foliageDetailMode=true;
    ball('garden-shrub-core',x,.38*s,z,.55*s,M.leafDeep,root,true,[1,.7,.8]);
    ball('garden-shrub-core',x,.60*s,z,.42*s,M.leaf,root,true,[1,.8,1]);
    for(let j=0;j<12;j++){const a=j*2.399,yy=.22+(j%4)*.16,r=.24+(j%3)*.02;ball('garden-shrub-leaf',x+Math.sin(a)*.43*s,yy*s,z+Math.cos(a)*.38*s,r*s,j%4===0?M.leafTop:j%2?M.leaf:M.leafLight);}
    if(berries)for(let j=0;j<5;j++){const a=j*1.25;ball('shrub-berry',x+Math.sin(a)*.44*s,.76*s,z+Math.cos(a)*.44*s,.075*s,M.red);}foliageDetailMode=false;
  }
  function grassTuft(x,z,s=1) {
    const angles=[rand()*3.14,rand()*3.14,rand()*3.14],pos=[],indices=[],colors=[];
    for(let j=0;j<7;j++){
      const a=angles[j%3]+j*1.7,c=Math.cos(a),sn=Math.sin(a),h=(.32+(j%4)*.105)*s*.65,w=.027*s,bend=(j%2?.11:-.09)*s,ox=Math.sin(a)*.09*s,oz=Math.cos(a)*.09*s,base=pos.length/3;
      const local=[[-w,0,0],[w,0,0],[bend*.43,h*.56,-.012*s],[bend,h,0],[bend*.43,h*.56,.012*s]];
      for(const [px,py,pz] of local){pos.push(ox+px*c+pz*sn,py,oz-px*sn+pz*c);const shade=j%2?.86:1;colors.push(shade,shade,shade*.94,1);}
      for(const i of [0,1,2,1,3,2,0,4,1,1,4,3,0,2,4,2,3,4])indices.push(base+i);
    }
    const normals=[];B.VertexData.ComputeNormals(pos,indices,normals);const mesh=new B.Mesh('tapered-grass-tuft',scene),vd=new B.VertexData();vd.positions=pos;vd.indices=indices;vd.normals=normals;vd.colors=colors;applyBatchVertexData(B,mesh,vd);mesh.position.set(x,.025,z);finish(mesh,M.blade);
  }
  function fern(x,z,s=1) {
    const pos=[],indices=[],colors=[];
    function leaflet(cx,cy,cz,dx,dz,len,width,tone){const n=pos.length/3,perpX=-dz,perpZ=dx;pos.push(cx,cy,cz,cx+dx*len*.45+perpX*width,cy+.025*s,cz+dz*len*.45+perpZ*width,cx+dx*len,cy+.04*s,cz+dz*len,cx+dx*len*.45-perpX*width,cy+.025*s,cz+dz*len*.45-perpZ*width,cx+dx*len*.42,cy+.065*s,cz+dz*len*.42);for(const k of [0,4,1,1,4,2,2,4,3,3,4,0])indices.push(n+k);for(let j=0;j<5;j++)colors.push(tone,tone,tone*.95,1);}
    for(let f=0;f<6;f++){
      const a=f*1.047+x*.1,dx=Math.sin(a),dz=Math.cos(a),length=(.60+(f%3)*.09)*s;
      for(let k=0;k<4;k++){
        const t=.22+k*.2,px=dx*length*t,pz=dz*length*t,py=(.10+Math.sin(t*2.7)*.36)*s,leafLen=(.25-k*.035)*s;
        for(const side of [-1,1])leaflet(px,py,pz,dx*.35-dz*side*.94,dz*.35+dx*side*.94,leafLen,.055*s,k%2?.85:1);
      }
      leaflet(0,.08*s,0,dx,dz,length,.018*s,.85);
    }
    const normals=[];B.VertexData.ComputeNormals(pos,indices,normals);const mesh=new B.Mesh('fern-rosette',scene),vd=new B.VertexData();vd.positions=pos;vd.indices=indices;vd.normals=normals;vd.colors=colors;applyBatchVertexData(B,mesh,vd);mesh.position.set(x,0,z);finish(mesh,M.fern);
  }
  function clover(x,z,s=1) {
    for(let j=0;j<3;j++){const a=j*2.094;ball('clover-leaf',x+Math.sin(a)*.10*s,.08*s,z+Math.cos(a)*.10*s,.13*s,j%2?M.leafLight:M.green,root,true,[1,.25,1]);}
  }
  function flowerSpire(x,z,s=1) {
    cylinder('foxglove-stem',x,.43*s,z,.025*s,.86*s,M.leafDark,4);
    for(let j=0;j<6;j++){const a=j*2.2;ball('foxglove-flower',x+Math.sin(a)*.07*s,(.39+j*.10)*s,z+Math.cos(a)*.07*s,(.105-j*.009)*s,j%3?M.lavender:M.pink,root,true,[.8,1.25,.8]);}
    for(const side of [-1,1])ball('foxglove-leaf',x+side*.13*s,.19*s,z,.18*s,M.leaf,root,true,[1.3,.3,.5]);
  }
  function pinkBush(x,z,s=1) {
    shrub(x,z,s,false);
    for(let j=0;j<9;j++){const a=j*2.4,r=.22+Math.sqrt(j/9)*.36;ball('pink-bush-bloom',x+Math.sin(a)*r*s,(.72+Math.sin(j)*.13)*s,z+Math.cos(a)*r*s,.16*s,j%3?M.pinkLeafLight:M.pinkLeaf,root,true,[1,.7,1]);}
  }
  function lantern(x,z,s=1) {
    box('lantern-plinth',x,.12*s,z,.44*s,.24*s,.44*s,M.brickLight);
    cylinder('lantern-foot',x,.32*s,z,.19*s,.22*s,M.townSlate,6,root,true,.12*s);
    cylinder('lantern-post',x,1.25*s,z,.08*s,1.76*s,M.townSlate,6);
    cylinder('lantern-collar',x,1.95*s,z,.14*s,.14*s,M.townSlate,6);
    box('lantern-glass',x,2.30*s,z,.40*s,.59*s,.40*s,M.window);
    for(const dx of [-.23,.23])for(const dz of [-.23,.23])box('lantern-frame',x+dx*s,2.30*s,z+dz*s,.065*s,.70*s,.065*s,M.townSlate);
    box('lantern-foot',x,1.96*s,z,.59*s,.10*s,.59*s,M.townSlate);
    cylinder('lantern-cap',x,2.74*s,z,.48*s,.30*s,M.townSlate,4,root,true,.06*s).rotation.y=Math.PI/4;
    ball('lantern-finial',x,2.94*s,z,.07*s,M.gold);
  }
  function barrel(x,z,s=1,parent=root,isStatic=true) {
    cylinder('barrel',x,.46*s,z,.38*s,.92*s,M.woodLight,10,parent,isStatic,.32*s);
    for(const y of [.14,.72]) torus('barrel-hoop',x,y*s,z,.355*s,.06*s,M.iron,parent,isStatic);
    cylinder('barrel-top',x,.93*s,z,.31*s,.025*s,M.wood,10,parent,isStatic);
  }
  function roof(x,z,w,d,y,matRoof=M.roof) {
    const hw=w/2,hd=d/2,rise=1.65,slope=Math.hypot(hw,rise),uvWidth=d/3.6,uvHeight=slope/3.6;
    // Separate slope vertices give both roof sides a real eave-to-ridge unwrap.
    const mesh=new B.Mesh('gable-roof',scene),pos=[x-hw,y,z-hd,x-hw,y,z+hd,x,y+rise,z+hd,x,y+rise,z-hd,x+hw,y,z-hd,x,y+rise,z-hd,x,y+rise,z+hd,x+hw,y,z+hd];
    const indices=[0,2,1,0,3,2,4,6,5,4,7,6],normals=[];
    B.VertexData.ComputeNormals(pos,indices,normals);const vd=new B.VertexData();vd.positions=pos;vd.indices=indices;vd.normals=normals;vd.uvs=[0,0,uvWidth,0,uvWidth,uvHeight,0,uvHeight,0,0,0,uvHeight,uvWidth,uvHeight,uvWidth,0];applyBatchVertexData(B,mesh,vd);finish(mesh,matRoof);
    for(const side of [-1,1]){
      const zz=z+side*(hd-.04),gable=new B.Mesh('gable-plaster',scene),data=new B.VertexData();
      data.positions=[x-hw+.25,y-.03,zz,x+hw-.25,y-.03,zz,x,y+rise-.12,zz];data.indices=side<0?[0,1,2]:[0,2,1];data.normals=[];B.VertexData.ComputeNormals(data.positions,data.indices,data.normals);data.uvs=[0,0,1,0,.5,1];applyBatchVertexData(B,gable,data);finish(gable,M.wall);
      beam('gable-center-timber',[x,y,zz+side*.045],[x,y+rise-.15,zz+side*.045],.12,M.timber);
      for(const sign of [-1,1])beam('gable-diagonal-timber',[x+sign*hw*.65,y,zz+side*.055],[x,y+rise*.75,zz+side*.055],.12,M.timber);
    }
    beam('roof-ridge',[x,y+1.67,z-hd-.08],[x,y+1.67,z+hd+.08],.18,M.timberDark);
    for(const zz of [z-hd-.02,z+hd+.02]) {
      beam('roof-trim',[x-hw,y,zz],[x,y+1.68,zz],.16,M.timberDark);
      beam('roof-trim',[x,y+1.68,zz],[x+hw,y,zz],.16,M.timberDark);
    }
    for(const sign of [-1,1])beam('roof-eave',[x+sign*hw,y-.05,z-hd],[x+sign*hw,y-.05,z+hd],.18,M.timberDark);
    // Painted, staggered tile lips supply the courses without continuous raised ribs.
  }
  function house(x,z,w=5.4,d=4.4,blue=false) {
    const front=z-d/2,back=z+d/2;
    box('house-contact-shadow',x-.2,.028,z+.2,w+.95,.008,d+.85,M.contact);
    box('house-foundation',x,.16,z,w+.3,.32,d+.3,M.brickLight);
    box('house-masonry',x,.96,z,w,1.55,d,M.brick);
    box('house-stone-belt',x,1.77,z,w+.13,.18,d+.13,M.brickLight);
    box('house-plaster',x,2.98,z,w,2.40,d,M.wall);
    for(const zz of [front-.075,back+.075]){
      for(const y of [1.92,4.08])box('timber-crossbeam',x,y,zz,w+.05,.17,.15,M.timber);
      for(const sign of [-1,1]){
        box('timber-corner',x+sign*(w/2-.10),3.00,zz,.17,2.47,.15,M.timber);
        const edge=x+sign*(w/2-.22),inside=x+sign*w*.38;
        beam('timber-diagonal',[edge,2.04,zz],[inside,2.65,zz],.13,M.timber);
        beam('timber-diagonal',[edge,3.97,zz],[inside,3.48,zz],.13,M.timber);
        for(let row=0;row<3;row++)box('house-corner-stone',x+sign*(w/2-.13),.48+row*.43,zz,.31,.35,.18,M.brickLight);
      }
    }
    box('door-frame',x,1.30,front-.11,1.30,2.36,.20,M.timberDark);
    box('door',x,1.20,front-.23,1.02,2.07,.10,M.timberLight);
    for(let j=-1;j<=1;j++)box('door-plank',x+j*.28,1.20,front-.30,.025,1.96,.025,M.timberDark);
    for(const y of [.55,1.72])box('door-iron-strap',x,y,front-.33,.91,.065,.035,M.iron);
    ball('door-knob',x+.30,1.15,front-.36,.065,M.gold);
    box('door-lintel',x,2.52,front-.12,1.55,.17,.26,M.brickLight);
    box('door-step',x,.16,front-.65,1.7,.32,.9,M.brickLight);
    for(const side of [-1,1]) {
      const wx=x+side*w*.30;
      box('window-frame',wx,3.03,front-.10,1.15,1.28,.16,M.timber);
      box('window-glow',wx,3.03,front-.20,.90,1.02,.05,M.window);
      box('window-divider',wx,3.03,front-.25,.065,1.02,.05,M.timber);
      box('window-divider',wx,3.03,front-.25,.94,.065,.05,M.timber);
      box('window-sill',wx,2.34,front-.19,1.34,.12,.30,M.brickLight);
      for(const edge of [-1,1]){
        const sx=wx+edge*.73;
        const shutter=box('window-shutter',sx,3.04,front-.13,.33,1.12,.08,blue?M.townSlate:M.timberLight);shutter.rotation.y=edge*.20;
        for(const yy of [2.66,3.41])box('window-shutter-strap',sx,yy,front-.19,.34,.065,.04,M.timberDark);
      }
      box('window-box',wx,2.21,front-.34,1.24,.24,.43,M.timberLight);
      for(let j=0;j<5;j++)ball('window-flowers',wx+(j-2)*.2,2.42,front-.35,.16,j%2?M.pink:M.cream);
      const sx=x+side*(w/2+.075);
      for(const y of [1.92,4.08])box('side-timber-crossbeam',sx,y,z,.15,.17,d,M.timber);
      for(const edge of [-1,1])beam('side-timber-diagonal',[sx,2.04,z+edge*(d/2-.20)],[sx,3.92,z+edge*(d*.18)],.13,M.timber);
      box('side-window-frame',sx,3.03,z,.14,1.28,1.15,M.timber);
      box('side-window-glow',sx+side*.09,3.03,z,.05,1.02,.90,M.window);
      box('side-window-divider',sx+side*.14,3.03,z,.05,1.02,.065,M.timber);
      box('side-window-divider',sx+side*.14,3.03,z,.05,.065,.94,M.timber);
      box('back-window-frame',wx,3.03,back+.10,1.0,1.18,.14,M.timber);
      box('back-window-glow',wx,3.03,back+.19,.78,.96,.05,M.window);
      box('back-window-divider',wx,3.03,back+.24,.065,.96,.05,M.timber);
    }
    roof(x,z,w+.85,d+.85,4.25,blue?M.blueRoof:M.roof);
    box('chimney',x+w*.28,4.90,z+d*.2,.65,1.65,.7,M.brick);
    box('chimney-cap',x+w*.28,5.76,z+d*.2,.85,.2,.9,M.brickLight);
    const smoke=node('chimney-smoke',x+w*.28,5.85,z+d*.2);
    const smokeMat=mat('smoke-'+x+'-'+z,'#e8ddca',.1,.17);
    for(let j=0;j<3;j++){const puff=ball('smoke',0,j*.65,0,.3+j*.14,smokeMat,smoke,false);animated.push({type:'smoke',mesh:puff,baseY:j*.65,phase:j*1.8});}
    barrel(x+w*.5+.5,z+d*.2,.85);barrel(x-w*.5-.6,z-.8,.75);
    obstacle(x,z,Math.max(w,d)*.57);
  }
  function roundHouse(x,z,w=5.5,d=4.8,violet=false) {
    const radius=w*.48,stretch=d/w;
    box('house-contact-shadow',x,.028,z,w+.7,.008,d+.7,M.contact);
    const base=cylinder('round-house-foundation',x,.22,z,radius+.15,.44,M.pebble,24);base.scaling.z=stretch;
    const wall=cylinder('round-house-wall',x,1.65,z,radius,2.85,M.wall,32);wall.scaling.z=stretch;
    const masonry=cylinder('round-house-masonry',x,.77,z,radius+.02,1.12,M.brick,32);masonry.scaling.z=stretch;
    masonry.setVerticesData(B.VertexBuffer.UVKind,masonry.getVerticesData(B.VertexBuffer.UVKind).map((v,i)=>v*(i%2?.45:3)));
    const belt=torus('round-house-stone-belt',x,1.37,z,radius+.04,.12,M.pebble);belt.scaling.z=stretch;
    for(let j=0;j<8;j++){const a=j*Math.PI/4;box('round-house-timber',x+Math.sin(a)*(radius+.015),2.18,z+Math.cos(a)*(radius*stretch+.015),.11,1.83,.11,M.timber);}
    const shape=[new B.Vector3(radius+0.26,2.98,0),new B.Vector3(radius+.46,3.17,0),new B.Vector3(radius+.28,3.55,0),new B.Vector3(radius*.87,4.02,0),new B.Vector3(radius*.63,4.43,0),new B.Vector3(radius*.33,4.77,0),new B.Vector3(.12,5.07,0)];
    const dome=B.MeshBuilder.CreateLathe('dome-roof',{shape,tessellation:32,sideOrientation:B.Mesh.DOUBLESIDE,cap:B.Mesh.CAP_ALL},scene);dome.position.set(x,0,z);dome.scaling.z=stretch;
    dome.setVerticesData(B.VertexBuffer.UVKind,dome.getVerticesData(B.VertexBuffer.UVKind).map((v,i)=>v*(i%2?1:3)));
    finish(dome,violet?M.violetRoof:M.roof);
    for(const [y,r] of [[3.17,radius+.47],[3.98,radius*.9],[4.43,radius*.63]]){const band=torus('dome-roof-band',x,y,z,r,.10,violet?M.cream:M.gold);band.scaling.z=stretch;}
    ball('dome-finial',x,5.13,z,.19,M.gold);
    for(const a of [-Math.PI/2,0,Math.PI/2]) {
      const normal=new B.Vector3(Math.sin(a),0,Math.cos(a)),px=x+normal.x*(radius+.08),pz=z+normal.z*(radius*stretch+.08);
      const frame=cylinder('porthole-frame',px,1.85,pz,.59,.16,M.wood,24);frame.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef(B.Axis.Y,normal,new B.Quaternion());
      const glass=cylinder('porthole-glass',px+normal.x*.11,1.85,pz+normal.z*.11,.44,.10,M.window,24);glass.rotationQuaternion=frame.rotationQuaternion.clone();
      torus('porthole-rivets',px,1.85,pz,.49,.045,M.gold).rotationQuaternion=frame.rotationQuaternion.clone();
    }
    const front=z-radius*stretch;
    box('door-frame',x,1.26,front-.1,1.4,2.35,.2,M.woodDark);box('door',x,1.18,front-.23,1.12,2.15,.08,M.woodLight);
    for(const dx of [-.28,0,.28])box('door-plank',x+dx,1.18,front-.29,.025,2.02,.03,M.wood);
    ball('door-knob',x+.33,1.15,front-.35,.07,M.gold);box('door-step',x,.13,front-.65,1.8,.26,.95,M.stoneLight);
    barrel(x-radius-.4,z,.8);shrub(x+radius+.25,z-.4,.7,true);obstacle(x,z,Math.max(w,d)*.57);
  }
  function person(id,type,name,x,z,style=0) {
    const n=interact(id,type,name,x,z), cloth=[M.cloak,M.blueRoof,M.roofLight,M.apron][style%4],phase=rand()*6;
    if(options.spriteVillagers)return n;
    ball('npc-shadow',0,.025,0,.52,M.grassDark,n,false,[1,.035,.75]);
    for(const side of [-1,1]) {box('npc-boot',side*.16,.16,-.04,.24,.3,.36,M.woodDark,n,false);cylinder('npc-leg',side*.16,.38,0,.11,.4,M.wood,6,n,false);}
    cylinder('npc-coat',0,.83,0,.34,.79,cloth,8,n,false,.24);
    ball('npc-head',0,1.52,0,.32,M.skin,n,false,[1,1.08,1]);
    ball('npc-hair',0,1.66,.07,.33,M.hair,n,false,[1,.7,1]);
    for(const side of [-1,1]) {
      ball('npc-eye',side*.115,1.54,-.284,.034,M.black,n,false);
      const a=cylinder('npc-arm',side*.36,.93,0,.11,.56,cloth,6,n,false);a.rotation.z=side*.2;
      ball('npc-hand',side*.41,.64,-.015,.12,M.skin,n,false);
    }
    ball('npc-nose',0,1.46,-.31,.075,M.skin,n,false);
    if(type==='npc') {ball('elder-beard',0,1.31,-.18,.23,M.cream,n,false,[1,1.15,.55]); cylinder('elder-hat',0,1.87,0,.39,.3,M.cloak,8,n,false,.21);beam('walking-stick',[.53,.08,-.1],[.53,1.3,-.1],.075,M.woodLight,n,false);}
    if(type==='smith') {box('smith-apron',0,.8,-.27,.42,.6,.06,M.woodDark,n,false);box('smith-hammer',.45,.78,-.23,.38,.18,.17,M.iron,n,false);}
    if(type==='cook') {cylinder('chef-cap',0,1.85,0,.35,.32,M.cream,8,n,false);ball('chef-cap-top',0,2.02,0,.35,M.cream,n,false,[1,.55,1]);box('chef-apron',0,.85,-.28,.42,.6,.06,M.cream,n,false);}
    if(type==='inn') {cylinder('inn-hat',0,1.79,0,.4,.13,M.roofLight,8,n,false);ball('inn-feather',.25,1.99,0,.17,M.gold,n,false,[.5,1.5,.25]);}
    animated.push({type:'npc',mesh:n,phase});return n;
  }
  function chest(id,x,z,dark=false) {
    const n=interact(id,'chest',dark?'Ancient cache':'Explorer’s cache',x,z);
    box('chest-bottom',0,.36,0,1.1,.65,.75,dark?M.dungeonDark:M.wood,n,false);
    const lid=cylinder('chest-lid',0,.7,0,.39,1.12,dark?M.dungeonStone:M.woodLight,8,n,false);lid.rotation.z=Math.PI/2;lid.scaling.z=.95;
    for(const side of [-1,1]) {box('chest-band',side*.39,.42,-.39,.095,.63,.05,M.gold,n,false);box('chest-band-top',side*.39,.97,0,.095,.05,.72,M.gold,n,false);}
    box('chest-lock',0,.56,-.43,.22,.28,.09,M.gold,n,false);
    const gem=ball('chest-spark',0,1.35,0,.11,dark?M.purple:M.gold,n,false);animated.push({type:'bob',mesh:gem,baseY:1.35,phase:rand()*6});return n;
  }
  function herb(id,x,z) {
    const n=interact(id,'herb','Moonleaf',x,z);cylinder('herb-earth',0,.035,0,.47,.07,M.earth,8,n,false);
    for(let j=0;j<5;j++){const a=j*1.256;const leaf=ball('moonleaf',Math.sin(a)*.19,.25,Math.cos(a)*.19,.24,M.green,n,false,[.55,1.4,.8]);leaf.rotation.z=Math.sin(a)*.6;leaf.rotation.x=Math.cos(a)*.6;}
    ball('moonleaf-bud',0,.62,0,.14,M.lavender,n,false);return n;
  }
  function shrine(id,x,z) {
    const n=interact(id,'shrine','Ancient shrine',x,z);
    cylinder('shrine-clearing',0,.035,0,2.8,.06,M.path,16,n,false);
    cylinder('shrine-base',0,.20,0,1.5,.36,M.stoneDark,8,n,false);
    cylinder('shrine-base-step',0,.43,0,1.15,.18,M.stoneLight,8,n,false);
    cylinder('shrine-pedestal',0,.85,0,.54,.75,M.stone,6,n,false,.38);
    for(const s of [-1,1]) {box('shrine-pillar',s*1.25,1.2,.6,.36,2.05,.4,M.stone,n,false);ball('shrine-pillar-cap',s*1.25,2.27,.6,.3,M.stoneLight,n,false);}
    const gem=ball('shrine-heart',0,1.85,0,.61,M.crystal,n,false,[.65,1.4,.65]);
    const ring=torus('shrine-ring',0,1.8,0,.9,.07,M.teal,n,false);ring.rotation.x=.45;
    shrineParts.set(id,{gem,ring,active:false});animated.push({type:'shrine',mesh:gem,ring,baseY:1.85,phase:rand()*6});
    for(let j=0;j<6;j++){const a=j*Math.PI/3;box('shrine-rune',Math.sin(a)*1.9,.08,Math.cos(a)*1.9,.17,.03,.36,M.teal,n,false).rotation.y=a;}
    return n;
  }
  let ground, bounds, spawn;
  if(options.treeStudy){
    bounds={minX:-23,maxX:23,minZ:-20,maxZ:24};spawn={x:0,z:-15};
    ground=groundPlane('tree-grove-meadow',320,320,2,M.grass);
    const specimens=[
      ['moss',-10,-8,1.15],['apple',0,-8,.82],['pink',10,-8,1.03],
      ['pear',-11,3,.94],['forest',0,3,1.24],['ivory',11,3,.86],
      ['gold',-10,14,1.06],['russet',0,14,.92],['violet',10,14,1.08]
    ];
    for(const [variant,x,z,s] of specimens){
      let style;for(let i=0;i<10000;i++){const candidate=treeAppearance((i%101)-50,Math.floor(i/101)-45,s);if(candidate.variant===variant&&(!['moss','forest'].includes(variant)||candidate.shape==='oak')){style=candidate;break;}}
      tree(x,z,s,false,false,style);
    }
    for(let j=0;j<440;j++){
      const x=range(-20,20),z=range(-15,21);if(obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+.25))continue;
      grassTuft(x,z,range(.8,1.5));if(j%17===0)flower(x+.15,z,M.cream,range(.8,1.2));
      if(j%37===0)clover(x,z,1.15);
    }
  }else if (!dungeon) {
    bounds={...EXPANSION_BOUNDS};spawn={x:0,z:-5};
    groundPlane('endless-water',360,360,8,M.water,-.65,false);
    box('island-earth',0,-1.3,8,133,2.2,129,M.earth);
    box('island-sand',0,-.27,8,134,.18,130,M.sand);
    ground=groundPlane('island-ground',130,126,8,M.grass);
    for(let j=0;j<130;j++) {
      const side=j%4;
      const x=side<2?(side===0?-65.6:65.6):range(-65,65), z=side>=2?(side===2?-55.5:71.5):range(-55,71);
      ball('island-edge',x,-.32,z,range(1.5,3.2),j%4===0?M.sand:M.stone,root,true,[1,.6,.9]);
    }
    // Hand laid village paving gives way to gently bending earthen trails.
    const paths=[];
    const routes=[
      {p:[[0,-9],[0,1],[0,14]],w:2.4,stone:true},{p:[[-17,-5],[-7,-5],[4,-5],[17,-5]],w:2.4,stone:true},
      {p:[[0,-7],[4,-2],[8,3]],w:2.2,stone:true},{p:[[-5,2],[-3,-2],[0,-6]],w:2.2,stone:true},
      {p:[[0,-9],[.7,-15],[-1.7,-23],[0,-32]],w:2.2},{p:[[0,14],[1.6,23],[-1.3,33],[0,43]],w:2.2},
      {p:[[-17,-5],[-21,-4.6],[-24,-6],[-26,-6]],w:2.1},{p:[[17,-5],[22,-4],[26,-5]],w:2.0},
      {p:[[-3,12],[-12,17],[-20,17],[-30,22]],w:1.95},{p:[[3,16],[12,18],[21,26],[30,28]],w:1.95},
      {p:[[16,-6],[19,-11],[27,-17],[30,-24]],w:1.9},
      ...TOWN_PLAN.routes,...EXPANSION_ROUTES
    ];
    let pathQuery;
    function onPath(x,z,pad=0){
      pathQuery??=createSegmentQuery(paths.map(([a,b,w])=>[a,b,w*.5]));
      return pathQuery(x,z,pad)||town?.contains(x,z,pad)===true;
    }
    function trailRibbon(points,width,y,material,name) {
      const left=[],right=[];
      for(let j=0;j<points.length;j++){const p=points[j],a=points[Math.max(0,j-1)],b=points[Math.min(points.length-1,j+1)],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1,w=width*(1+.08*Math.sin(j*.73));left.push(new B.Vector3(p.x+dz/len*w*.5,y,p.z-dx/len*w*.5));right.push(new B.Vector3(p.x-dz/len*w*.5,y,p.z+dx/len*w*.5));}
      finish(B.MeshBuilder.CreateRibbon(name,{pathArray:[left,right],sideOrientation:B.Mesh.DOUBLESIDE},scene),material);
    }
    for(let routeIndex=0;routeIndex<routes.length;routeIndex++) {
      const route=routes[routeIndex],pts=B.Curve3.CreateCatmullRomSpline(route.p.map(([x,z])=>new B.Vector3(x,0,z)),12,false).getPoints();
      mapRoutes.push({points:pts.map(p=>[p.x,p.z]),stone:!!route.stone});
      for(let j=0;j<pts.length-1;j++)paths.push([[pts[j].x,pts[j].z],[pts[j+1].x,pts[j+1].z],route.w*1.1]);
      if(!route.stone)trailRibbon(pts,route.w+.30,.012,M.dirtEdge,'dirt-shoulder');
      trailRibbon(pts,route.w,.023+routeIndex*.0004,route.stone?M.path:M.dirt,route.stone?'village-path':'winding-trail');
      if(!route.stone)for(let j=3;j<pts.length;j+=6){const p=pts[j];clover(p.x+route.w*.6,p.z,.8);grassTuft(p.x-route.w*.65,p.z,1.2);}
    }
    const plaza=cylinder('village-plaza',0,.018,1.2,9.3,.035,M.path,64);
    const plazaVertices=plaza.getVerticesData(B.VertexBuffer.PositionKind);
    for(let j=0;j<plazaVertices.length;j+=3){const r=Math.hypot(plazaVertices[j],plazaVertices[j+2]);if(r<6)continue;const a=Math.atan2(plazaVertices[j],plazaVertices[j+2]),variation=1+.027*Math.sin(a*7)+.016*Math.sin(a*13+.6);plazaVertices[j]*=variation;plazaVertices[j+2]*=variation;}
    plaza.setVerticesData(B.VertexBuffer.PositionKind,plazaVertices);
    const beforePlazaEdgeSeed=seed;
    // Broken, planted edges soften the plaza without obstructing its walkways.
    for(let j=0;j<51;j++){
      const a=j*Math.PI*2/51,r=9.12+Math.sin(j*2.31)*.15,x=Math.sin(a)*r,z=1.2+Math.cos(a)*r;
      if(onPath(x,z,.2)||j%7===0)continue;
      const edge=box('plaza-edge-stone',x,.044,z,.42+(j%3)*.08,.065,.23+(j%2)*.10,M.pebble);edge.rotation.y=a+Math.sin(j)*.12;
      if(j%4===0){grassTuft(x+Math.sin(a)*.25,z+Math.cos(a)*.25,.65);clover(x,z,.40);}
    }
    seed=beforePlazaEdgeSeed;
    // The central wishing fountain anchors the village silhouette.
    cylinder('fountain-step',0,.14,5.8,2.05,.28,M.pebble,24);cylinder('fountain-basin',0,.47,5.8,1.75,.5,M.pebble,24);
    cylinder('fountain-water',0,.74,5.8,1.48,.04,M.pond,32);torus('fountain-rim',0,.75,5.8,1.65,.28,M.pebble);
    const wellColumn=cylinder('fountain-column',0,1.05,5.8,.55,1.5,M.brick,16);
    wellColumn.setVerticesData(B.VertexBuffer.UVKind,wellColumn.getVerticesData(B.VertexBuffer.UVKind).map((v,i)=>v*(i%2?.625:2)));
    cylinder('fountain-dish',0,1.7,5.8,.85,.24,M.pebble,16);
    for(let row=0;row<2;row++)for(let j=0;j<24;j++){const a=(j+row*.5)*Math.PI/12;const brick=box('fountain-stone',Math.sin(a)*1.74,.36+row*.23,5.8+Math.cos(a)*1.74,.42,.19,.12,M.pebble);brick.rotation.y=a;}
    for(const dx of [-.68,.68])for(const dz of [-.68,.68]){
      cylinder('fountain-column-capital',dx,1.87,5.8+dz,.14,.18,M.pebble,8);
      cylinder('fountain-column-post',dx,2.48,5.8+dz,.085,1.12,M.pebble,8);
      cylinder('fountain-column-capital',dx,3.04,5.8+dz,.15,.14,M.pebble,8);
    }
    cylinder('roof-well',0,3.75,5.8,1.56,1.30,M.roof,16,root,true,.07);
    torus('roof-well-eave',0,3.10,5.8,1.56,.11,M.timberDark);
    for(let j=1;j<6;j++){const f=j/6;torus('roof-well-tile-course',0,3.10+f*1.30,5.8,1.56*(1-f)+.07*f,.035,M.roofLight);}
    ball('roof-well-finial',0,4.46,5.8,.12,M.gold);
    function bench(x,z,angle){const n=node('village-bench',x,0,z);n.rotation.y=angle;for(let j=0;j<4;j++)box('bench-seat',0,.62,-.3+j*.2,2.2,.10,.17,M.timberLight,n);for(const y of [1.0,1.23])box('bench-back',0,y,.42,2.2,.16,.11,M.timberLight,n);for(const side of [-1,1]){box('bench-iron-leg',side*.85,.32,0,.10,.64,.67,M.townSlate,n);box('bench-iron-back',side*.85,.88,.43,.09,.95,.09,M.townSlate,n);}}
    bench(-3.8,5.3,-Math.PI/2);bench(3.8,7.4,Math.PI/2);
    ball('fountain-gem',0,2.17,5.8,.31,M.crystal,root,false,[.65,1.5,.65]);obstacle(0,5.8,2.0);
    for(let j=0;j<4;j++){const a=j*Math.PI/2;const drop=ball('water-drop',Math.sin(a)*.65,1.3,5.8+Math.cos(a)*.65,.09,M.ripple,root,false,[.7,2,.7]);animated.push({type:'fountain',mesh:drop,phase:j*1.6});}
    house(-11,2,5.5,4.3,false);house(11.5,.2,6.3,4.9,true);roundHouse(-7.3,12,4.5,4.1,false);house(11,11,4.6,4.0,false);
    // Blacksmith's outside forge and anvil.
    box('forge',-14.8,.65,-1.8,1.45,1.3,1.4,M.stoneDark);
    box('forge-hearth',-14.8,1.31,-1.8,1.12,.04,1.06,M.woodDark);
    const ember=mat('forge-embers','#d7793c',.22);
    for(let j=0;j<9;j++)ball('forge-coal',-15.14+(j%3)*.31,1.35,-2.12+Math.floor(j/3)*.30,.16,j%3===0?M.iron:ember,root,true,[1,.45,1]);
    for(const xx of [-15.43,-14.17])box('forge-rim',xx,1.44,-1.8,.17,.28,1.42,M.brick);
    box('forge-back',-14.8,1.54,-1.18,1.45,.48,.18,M.brick);
    box('anvil-base',-11,.28,-4,1.2,.55,.9,M.wood);box('anvil',-11,.75,-4,1.3,.4,.5,M.iron);box('anvil-foot',-11,.49,-4,.65,.15,.5,M.iron);
    const horn=cylinder('anvil-horn',-10.17,.8,-4,.23,.7,M.iron,5,root,true,0);horn.rotation.z=-Math.PI/2;
    // Small trade details sit against buildings, leaving the plaza and doors clear.
    function crate(x,z,s=1){
      box('market-crate',x,.39*s,z,.9*s,.78*s,.82*s,M.timber);
      for(const side of [-1,1]){
        for(const y of [.12,.65])box('market-crate-rim',x,y*s,z+side*.43*s,.98*s,.10*s,.07*s,M.timberLight);
        beam('market-crate-brace',[x-.36*s,.13*s,z+side*.47*s],[x+.36*s,.65*s,z+side*.47*s],.09*s,M.timberLight);
      }
      for(let j=0;j<4;j++)box('market-crate-lid',x+(-.34+j*.23)*s,.81*s,z,.20*s,.06*s,.84*s,M.timberLight);
    }
    crate(9.1,6.2,.82);crate(9.2,7.05,.62);crate(-14.5,.35,.9);
    function tradeSign(x,z,blue=false){
      beam('timber-sign-bracket',[x,3.06,z+.58],[x,3.06,z-.25],.09,M.timberDark);
      for(const dx of [-.34,.34])box('market-sign-chain',x+dx,2.81,z-.24,.035,.43,.035,M.iron);
      box('market-trade-sign',x,2.37,z-.25,1.05,.64,.12,blue?M.townSlate:M.timber);
      for(const y of [2.10,2.64])box('market-sign-edge',x,y,z-.32,1.08,.055,.04,M.timberLight);
      if(blue){box('market-inn-pillow',x-.26,2.43,z-.33,.23,.15,.035,M.cream);box('market-inn-bed',x,2.28,z-.33,.69,.10,.035,M.cream);}
      else{box('market-smith-symbol',x,2.40,z-.33,.63,.15,.035,M.cream);box('market-smith-symbol',x,2.23,z-.33,.24,.20,.035,M.cream);}
    }
    tradeSign(-9.35,-.42);tradeSign(13.35,-2.46,true);
    // Produce awning, baskets and bright cooking station.
    for(const x of [5.2,8.8]) cylinder('stall-post',x,1.4,5.5,.075,2.8,M.timber,6);
    for(let j=0;j<6;j++){
      const cloth=j%2?M.cloth:M.awning,shade=box('market-awning',5.5+j*.6,2.68,5.6,.6,.08,2.1,cloth);shade.rotation.x=.12;
      box('market-awning-valance',5.5+j*.6,2.53,4.56,.58,.27,.055,cloth);
    }
    box('market-table',7,1.03,5.4,3.4,.16,1.2,M.timberLight);for(const x of [5.65,8.35])box('table-leg',x,.51,5.4,.13,1.02,.8,M.timber);
    for(const xx of [5.9,7,8.1]){
      box('market-tray',xx,1.14,5.4,1.01,.06,.94,M.timberDark);
      for(const zz of [4.92,5.88])box('market-tray-edge',xx,1.24,zz,1.04,.20,.055,M.timberLight);
    }
    for(let j=0;j<12;j++) ball('market-produce',range(5.6,8.3),1.21,range(5,5.8),.15,j%3===0?M.red:j%3===1?M.gold:M.green);
    cylinder('cooking-pot',8.5,.4,3.2,.4,.6,M.iron,10);torus('cooking-pot-rim',8.5,.71,3.2,.4,.07,M.woodDark);
    person('elder','npc','Elder Rowan',-5,2,0);person('smith','smith','Bram · Blacksmith',-10,-5,1);person('inn','inn','Lysa · Innkeeper',9,-5,2);person('cook','cook','Mira · Camp Kitchen',7,3,3);
    for(const [x,z] of [[-4,-7],[4,-7],[-4,10],[5,13],[-17,-5],[19,-5],[0,27],[-22,17],[23,23],[26,-17]]) lantern(x,z);
    // Quiet pocket gardens behind the cottages.
    for(const [gx,gz] of [[-15,10],[15,11]]) {
      box('garden-soil',gx,.035,gz,3.7,.07,4,M.earth);
      for(let j=0;j<4;j++) {box('garden-row',gx-1.3+j*.85,.08,gz,.45,.1,3.5,M.wood);for(let k=0;k<5;k++)ball('cabbage',gx-1.3+j*.85,.28,gz-1.4+k*.7,.23,j%2?M.leafLight:M.green);}
    }
    function fence(x,z,len,rotation=0) {
      const n=node('fence',x,0,z);n.rotation.y=rotation;
      for(let j=0;j<=len/1.4;j++) box('fence-post',-len/2+j*1.4,.6,0,.12,1.2,.13,M.woodLight,n);
      for(const y of [.35,.8])box('fence-rail',0,y,0,len,.1,.1,M.woodLight,n);
    }
    fence(-14,14,8);fence(13,14,7);fence(-17.5,10,7,Math.PI/2);fence(17,10,7,Math.PI/2);
    // Tended borders distinguish the village from the wild meadow beyond it.
    for(const [x,z,s] of [[-14.3,-.4,.8],[-7.8,-.5,.7],[8.1,-2.4,.7],[14.8,-2.4,.9],[-10,9,.8],[-4.7,9,.7],[8.2,8,.8],[13.8,8,.85],[-17.7,14,.85],[17.5,14,1]])shrub(x,z,s,true);
    for(const [bx,bz,spread] of [[-4.5,-9.7,1.4],[4.8,-10.5,1.5],[-15.8,5.8,1.3],[17.8,5.6,1.6],[-3.8,12,1],[5.4,15.7,1],[-16.4,15.8,1.2],[16.4,15.8,1.1]]) {
      for(let j=0;j<13;j++){const a=j*2.4,r=Math.sqrt((j+1)/13)*spread;flower(bx+Math.sin(a)*r,bz+Math.cos(a)*r,[M.cream,M.pink,M.lavender,M.gold][j%4],range(1.0,1.55));}
    }
    for(let j=0;j<26;j++){const a=j*.24166;const x=Math.sin(a)*7.9,z=1.2+Math.cos(a)*7.9;if(!onPath(x,z,.5)&&!obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+.6))flower(x,z,j%3?M.cream:M.lavender,1.45);}
    town=buildTownExpansion({B,scene,root,M,box,cylinder,ball,beam,torus,node,finish,house,roundHouse,lantern,barrel,shrub,flower,grassTuft,obstacle,bench,crate,fence});
    // Fishing pond, reeds and a timber dock connected to the west lane.
    const pond=cylinder('pond-water',-33,.032,-5,7.65,.045,M.pond,48,root,false);pond.scaling.z=.91;obstacle(-33,-5,6.7);
    for(let j=0;j<28;j++){const a=j*Math.PI*2/28;const x=-33+Math.sin(a)*8.1,z=-5+Math.cos(a)*7.4;rock(x,z,range(.35,.7),M.stoneLight,false);}
    // Raised grassy shelves expose layered rock faces above the waterline.
    for(let j=0;j<26;j++){
      const a=j*Math.PI*2/26,x=-33+Math.sin(a)*7.8,z=-5+Math.cos(a)*7.15;
      if(x>-27.8&&z>-8.5&&z<-3.8)continue;
      const h=.22+(j%4)*.08,w=1.45+(j%3)*.12;
      const cliff=box('pond-rock-bank',x,h*.45,z,w,h,.95,j%3?M.stoneDark:M.stone);cliff.rotation.y=-a;
      const shelf=box('pond-grassy-shelf',x,h+.035,z,w+.08,.12,1.15,j%2?M.grass:M.grassLight);shelf.rotation.y=-a;
      if(j%2===0){clover(x+Math.sin(a)*.4,z+Math.cos(a)*.4,1.2);grassTuft(x+Math.sin(a)*.6,z+Math.cos(a)*.6,1.6);}
    }
    // The water shader supplies moving glints; static white blocks made the
    // surface read as a flat painted disk when the camera rotated.
    for(let j=0;j<12;j++){const x=range(-37,-30),z=range(-9,0);cylinder('lily-pad',x,.055,z,.25,.035,j%3?M.leaf:M.leafLight,8);if(j%3===0){ball('water-lily',x,.16,z,.13,M.pink);cylinder('lily-pad-small',x+.28,.057,z-.17,.16,.025,M.leafLight,7);cylinder('lily-pad-small',x-.23,.056,z+.22,.13,.025,M.leaf,7);}}
    for(let j=0;j<9;j++){const x=-27.6-j*.44;box('dock-plank',x,.20,-6, .40,.2,2.7,M.woodLight);}
    for(const x of [-27.5,-30.9])for(const z of [-7.3,-4.7])cylinder('dock-post',x,.22,z,.12,1.1,M.wood,6);
    const fish=interact('fishing','fishing','Moonmirror Pond',-26,-7);barrel(.45,0,.7,fish,false);
    beam('fishing-rod',[-.2,.25,0],[-1.25,2.05,.25],.045,M.woodLight,fish,false);
    beam('fishing-line',[-1.25,2.05,.25],[-3,.3,1],.008,M.cream,fish,false);
    const bob=ball('fishing-bobber',-3,.3,1,.10,M.red,fish,false);animated.push({type:'bob',mesh:bob,baseY:.3,phase:0});
    for(let j=0;j<12;j++){
      const a=range(0,6.28),x=-33+Math.sin(a)*7.6,z=-5+Math.cos(a)*7.2;
      for(let k=0;k<3;k++){
        const h=range(.8,1.4),px=x+k*.12;
        cylinder('pond-reeds',px,h*.5+.05,z,.018,h,M.leafDark,4);
        if(k!==1)cylinder('pond-cattail',px,h-.06,z,.052,.24,M.woodDark,6);
        const leaf=cylinder('pond-reed-leaf',px+.055,.36,z+.06,.045,.66,k%2?M.leafLight:M.goldLeafLight,4,root,true,0);
        leaf.rotation.z=(k-1)*.28;leaf.rotation.x=.18;
      }
    }
    // A small bridge crosses a decorative spring in the north meadow.
    const beforeBrookSeed=seed;
    const brook=[[-13.6,18.3],[-13.2,20.5],[-13,22.5],[-13,25.5],[-12.2,27.8],[-13.1,30.2],[-12.9,31.8]];
    for(let j=0;j<brook.length;j++) {
      const [x,z]=brook[j];
      cylinder('brook-bank',x,.019,z,1.36,.035,M.earth,14);
      cylinder('brook-water-bend',x,.046,z,.99,.025,M.pond,18);
      if(j<brook.length-1){const [nx,nz]=brook[j+1],len=Math.hypot(nx-x,nz-z),angle=Math.atan2(nx-x,nz-z);
        box('brook-bank', (x+nx)/2,.019,(z+nz)/2,2.65,.035,len,M.earth).rotation.y=angle;
        box('brook-water',(x+nx)/2,.046,(z+nz)/2,1.97,.025,len,M.pond).rotation.y=angle;
      }
      if(z<22||z>26)for(const side of [-1,1]){
        rock(x+side*1.25,z+.35,range(.34,.63),j%2?M.stone:M.stoneLight,false);
        rock(x+side*1.24,z-.52,range(.25,.42),M.stone,false);
        grassTuft(x+side*1.6,z+.05,1.3);
        if(j%2===0)flower(x+side*1.8,z-.4,M.lavender,1.25);
        const shelfHeight=.18+(j%3)*.075;
        box('brook-cliff-face',x+side*1.45,shelfHeight*.45,z,1.0,shelfHeight,1.35,M.stoneDark);
        box('brook-turf-shelf',x+side*1.55,shelfHeight,z,1.1,.12,1.42,M.grassDark);
      }
    }
    for(const [x,z] of [[-13.6,18.3],[-12.9,31.7]]){
      const ripple=torus('spring-ripple',x,.068,z,.54,.022,M.ripple,root,false);animated.push({type:'ripple',mesh:ripple,phase:z*.3});
    }
    rock(-12.9,32.5,.95,M.stoneDark,false);rock(-13.7,32.25,.55,M.stone,false);rock(-12.2,32.3,.5,M.stoneLight,false);
    seed=beforeBrookSeed;
    for(let j=0;j<10;j++)box('bridge-plank',-15+j*.46,.38,24,.43,.18,2.6,M.woodLight);
    for(const z of [22.8,25.2]){for(const x of [-15,-11])box('bridge-post',x,.78,z,.14,1.4,.14,M.wood);beam('bridge-rail',[-15,1.15,z],[-11,1.15,z],.12,M.wood);}
    shrine('shrine0',-30,22);shrine('shrine1',30,28);shrine('shrine2',30,-24);
    // Ruined arch around the entrance to the subterranean arena.
    const portal=interact('portal','portal','The Hollow Gate',0,44);
    cylinder('portal-platform',0,.18,0,3.2,.35,M.stoneDark,12,portal,false);
    for(const s of [-1,1]) {
      for(let j=0;j<5;j++)box('gate-stone',s*1.65,.55+j*.68,0,.72,.64,.95,j%2?M.stone:M.stoneLight,portal,false).rotation.y=s*.025*j;
      ball('gate-cap',s*1.55,3.7,0,.55,M.stoneDark,portal,false);
    }
    box('gate-lintel',0,3.95,0,3.9,.6,1.0,M.stone,portal,false);
    const veil=ball('portal-veil',0,1.95,.1,1,M.purple,portal,false,[1.4,1.75,.12]);animated.push({type:'portal',mesh:veil,phase:0});
    for(let j=0;j<7;j++)ball('portal-rune',-1.2+j*.4,4.0,-.53,.075,M.rune,portal,false);
    for(const s of [-1,1]){rock(s*4,43,1.5);box('ruined-wall',s*4.4,.7,46,3.2,1.4,.8,M.stoneDark);}
    const chests=[[-39,33],[39,39],[-40,-28],[36,-33],[18,44],[-18,34]];
    chests.forEach(([x,z],i)=>chest('chest'+i,x,z));
    const herbs=[[-19,2],[-24,13],[-33,31],[21,14],[38,22],[24,-18],[14,-28],[-9,-23],[-35,-19],[-17,29],[10,34],[39,-8]];
    herbs.forEach(([x,z],i)=>herb('herb'+i,x,z));
    const points=[[-15,-20,'slime',1],[13,-18,'slime',1],[-31,7,'slime',1],[32,7,'slime',1],[-30,17,'mushroom',2],[-34,16,'mushroom',2],[-27,30,'wolf',2],[-36,32,'mushroom',2],[30,32,'slime',2],[35,24,'wolf',2],[29,35,'mushroom',2],[37,34,'golem',3],[26,-20,'wolf',2],[34,-27,'mushroom',2],[25,-30,'slime',2],[35,-16,'wolf',2],[-33,-23,'wolf',2],[-38,-29,'slime',2],[-16,32,'mushroom',2],[-9,39,'wolf',3],[9,39,'wolf',3],[15,43,'golem',3],[40,10,'mushroom',2],[-8,-31,'slime',1]];
    expansion=buildWorldExpansion({B,scene,root,M,box,cylinder,ball,torus,beam,rock,tree,shrub,flower,grassTuft,fern,barrel,chest,obstacle,animated});
    const campTerrain=buildCampTerrain({B,scene,root,M,cylinder,obstacle,obstacles,materials},expansion.camps);
    dressCamps({root,M,box,cylinder,ball,beam,torus,obstacle,campGroundHeight:campTerrain.heightAt},expansion.camps);
    for(const p of expansion.spawnPoints)points.push([p.x,p.z,p.kind,p.level,p.campId]);
    // Hand placed silhouettes frame town before filling the surrounding woodland.
    for(const [x,z,s] of [[-20,3,1.2],[-21,-12,1.15],[20,2,1.25],[19,17,1.1],[-20,17,1.1],[4,-16,.95],[-8,-13,1.0],[-39,-12,1.4],[-17,-11,1.0],[21,-9,1.2],[-14,18,1.15],[14,18,1.1],[-20,10,1.2],[21,10,1.15],[18,-16,1.0]]){if(!isTownSafe(x,z,1)&&!points.some(([a,b,,level])=>Math.hypot(x-a,z-b)<(level===1?6.2:4.4)))tree(x,z,s,false,false);}
    const reserved=[...points.map(([x,z,,level])=>[x,z,level===1?6.2:4.4]),...interactables.map(v=>[v.x,v.z,3.2]),...expansionReservedAreas(),[-33,-5,10],[-13,25,5],[0,44,5]];
    for(let j=0;j<260;j++) {
      const x=range(-61,61),z=range(-51,67);
      if(isTownSafe(x,z,3)||onPath(x,z,2.0)||reserved.some(([a,b,r])=>Math.hypot(x-a,z-b)<r)||obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+1.9))continue;
      tree(x,z,range(.65,1.40),j%11===0,z>34&&j%3===0);
    }
    for(let j=0;j<110;j++) {
      const x=range(-61,61),z=range(-51,67);
      if(isTownSafe(x,z,2)||onPath(x,z,1.4)||reserved.some(([a,b,r])=>Math.hypot(x-a,z-b)<r)||obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+1.5))continue;
      rock(x,z,range(.4,1.15),j%3?M.stone:M.stoneDark);
    }
    function plantedBed(bx,bz,radius,kind=0) {
      for(let j=0;j<102;j++){
        const a=j*2.399,r=Math.sqrt((j+1)/102)*radius,x=bx+Math.sin(a)*r,z=bz+Math.cos(a)*r;
        if(onPath(x,z,.1)||interactables.some(o=>Math.hypot(o.x-x,o.z-z)<1.8)||obstacles.some(o=>Math.hypot(o.x-x,o.z-z)<o.r+.2))continue;
        if(j%5===0)clover(x,z,range(1.05,1.55));else grassTuft(x,z,range(1.30,2.1));
        if(j%31===11)fern(x,z,kind===1?1.2:1.0);
        if(j%3===0){if(kind===0)flower(x,z,M.cream,range(1.1,1.65)*.62);else if(kind===1)flowerSpire(x,z,range(.9,1.5)*.72);else flower(x,z,M.pinkLeafLight,range(1.1,1.65)*.62);}
      }
      if(kind===2&&!onPath(bx,bz,1.0)&&!obstacles.some(o=>Math.hypot(o.x-bx,o.z-bz)<o.r+1.0)&&!interactables.some(o=>Math.hypot(o.x-bx,o.z-bz)<2.3))pinkBush(bx,bz,.8);
    }
    const beds=[[-7,-10,2.2,0],[7,-10,2.1,1],[-11,-15,2.6,1],[10,-16,2.8,0],[17,-19,2.5,2],[21,-13,2.5,1],[-17,-16,2.7,0],[-23,10,2.3,2],[-26,17,2.0,1],[23,19,2.5,2],[27,23,2.2,0],[-35,5,2.5,1],[-40,-12,2.2,0],[-26,-14,2.6,2],[5,19,2.0,1],[9,26,2.5,0],[-8,24,2.3,0],[-21,29,2.4,1]];
    beds.forEach(args=>plantedBed(...args));
    for(let j=0;j<treePositions.length;j+=3){const p=treePositions[j];plantedBed(p.x+1.4*p.s,p.z-.8*p.s,1.9*p.s,j%3);}
    for(let j=0;j<3400;j++) {
      const x=range(-62,62),z=range(-52,68);
      if(onPath(x,z,.4)||obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+.5)||Math.hypot(x,z-1)<9.6||reserved.some(([a,b,r])=>Math.hypot(x-a,z-b)<r*.55))continue;
      const patch=Math.sin(x*.27+Math.sin(z*.2)*1.2)*Math.cos(z*.22);
      if(patch<-.25&&j%3!==0)continue;
      if(j%23===0)flowerSpire(x,z,range(.8,1.15));
      else if(j%11===0)flower(x,z,M.cream,range(.7,1.2));
      else if(j%4===0)clover(x,z,range(.85,1.45));
      else grassTuft(x,z,range(.85,1.7));
    }
    // The dense meadow asks these questions hundreds of thousands of times.
    // Snapshot completed geometry into a broad-phase grid while retaining the
    // same exact distances and seeded choices for every grass/flower vertex.
    const detailCamps=createCircleQuery(expansion.camps.map(c=>[c.x,c.z,c.radius*.8]));
    const detailObstacles=createCircleQuery(obstacles.map(o=>[o.x,o.z,o.r]));
    const detailInteractions=createCircleQuery(interactables.map(o=>[o.x,o.z,1.15]));
    const detailBrook=createSegmentQuery(brook.slice(0,-1).map((p,i)=>[p,brook[i+1],1.35]));
    const detailEncounters=createCircleQuery(points.map(([x,z])=>[x,z,3.0]));
    const detail=buildMeadowDetail({
      bounds:{minX:-62,maxX:62,minZ:-52,maxZ:68},candidates:220000,maxTriangles:240000,
      blocked:(x,z,pad)=>onPath(x,z,pad+.10)||Math.hypot(x,z-1.2)<9.65||detailCamps(x,z)||detailObstacles(x,z,pad+.12)||detailInteractions(x,z,pad)||Math.hypot(x+33,z+5)<8.6||detailBrook(x,z,pad)||(x>-15.4&&x<-10.4&&z>22.5&&z<25.5),
      lowTurf:detailEncounters
    });
    for(const [name,data] of [['short-grass-swathes',detail.grass],['meadow-flower-ribbons',detail.flowers]]){
      if(!data.indices.length)continue;
      const material=mat(name,'#ffffff');material.backFaceCulling=false;
      const mesh=new B.Mesh(name,scene),vd=new B.VertexData();
      vd.positions=data.positions;vd.indices=data.indices;vd.normals=data.normals;vd.colors=data.colors;applyBatchVertexData(B,mesh,vd);
      finish(mesh,material);
    }
    // Fireflies and slowly drifting motes bring still scenery to life.
    for(let j=0;j<18;j++) {const x=range(-30,30),z=range(-20,35);const f=ball('firefly',x,range(.6,1.8),z,.045,j%2?M.gold:M.teal,root,false);animated.push({type:'firefly',mesh:f,base:f.position.clone(),phase:rand()*6});}
    // Preserve world seed progression; the pond now animates flat brush marks.
    for(let j=0;j<7;j++){range(-5,5);range(-4,4);range(.3,.9);rand();}

    for(const [x,z,kind,level,campId] of points) {
      const p=findClearPosition({x,z},obstacles,bounds,enemyProfile(kind).collisionRadius+.12,spawn);
      if(!isTownSafe(p.x,p.z))spawnPoints.push({...p,kind,level,campId});
    }
  } else {
    bounds={minX:-22,maxX:22,minZ:-20,maxZ:32};spawn={x:0,z:-14};
    ground=groundPlane('dungeon-floor',46,54,6,M.dungeon);
    box('dungeon-underfloor',0,-1.4,6,48,2.5,56,M.dungeonDark);
    // Large-cut floor slabs, broken in places by ancient glowing roots.
    for(let x=-21;x<=21;x+=3)for(let z=-19;z<=31;z+=3){const tile=box('dungeon-slab',x,.024,z,2.88,.045,2.88,(Math.abs(x+z)%5===0)?M.dungeonTile:M.dungeon);tile.rotation.y=range(-.015,.015);}
    for(let j=0;j<44;j++) {const x=range(-21,21),z=range(-19,31);box('floor-crack',x,.055,z,range(.5,1.5),.025,.035,M.dungeonDark).rotation.y=rand()*6.28;}
    for(const x of [-23,23])box('dungeon-side-wall',x,1.5,6,1.4,3,55,M.dungeonWall);
    box('dungeon-back-wall',0,2.1,33,47,4.2,1.5,M.dungeonWall);
    // Low foreground ruins never hide the hero.
    box('dungeon-front-wall',-13,.65,-21,19,1.3,1.2,M.dungeonStone);box('dungeon-front-wall',13,.65,-21,19,1.3,1.2,M.dungeonStone);
    function pillar(x,z,broken=false){cylinder('pillar-foot',x,.22,z,1.0,.44,M.dungeonStone,8);cylinder('pillar-shaft',x,broken?1.15:2.1,z,.63,broken?1.9:3.8,M.dungeonStone,8);if(!broken)cylinder('pillar-cap',x,4.1,z,.89,.35,M.stoneLight,8);obstacle(x,z,.95);}
    for(const [x,z,b] of [[-16,-10,0],[16,-10,1],[-16,3,1],[16,3,0],[-17,23,0],[17,23,0],[-10,30,1],[10,30,1]])pillar(x,z,b);
    // Purple crystalline pylons mark the descent into the boss arena.
    for(const [x,z] of [[-10,7],[10,7],[0,28]]) {
      cylinder('pylon-plinth',x,.3,z,1.5,.6,M.dungeonDark,6);cylinder('pylon-base',x,.74,z,.85,.3,M.dungeonStone,6);
      const crystal=ball('pylon-crystal',x,2.0,z,.9,M.purple,root,false,[.65,1.7,.65]);animated.push({type:'bob',mesh:crystal,baseY:2,phase:rand()*6});
      for(let j=0;j<4;j++){const a=j*Math.PI/2;ball('pylon-shard',x+Math.sin(a)*.7,1.13,z+Math.cos(a)*.7,.31,M.rune,root,true,[.5,1.8,.5]);}obstacle(x,z,1.3);
    }
    cylinder('arena-dais',0,.07,18,9.8,.14,M.dungeonDark,40);
    torus('arena-ring',0,.16,18,8.6,.12,M.purple);
    torus('arena-inner-ring',0,.16,18,6.5,.045,M.rune);
    for(let j=0;j<16;j++){const a=j*Math.PI/8;box('arena-rune',Math.sin(a)*7.5,.17,18+Math.cos(a)*7.5,.25,.035,.8,M.rune).rotation.y=a;}
    for(const x of [-5,5])for(let z=-14;z<13;z+=4)box('dungeon-lane-rune',x,.075,z,.12,.025,.9,M.purple);
    const exit=interact('exit','exit','Return to Willowmere',0,-17);
    cylinder('exit-platform',0,.15,0,1.8,.3,M.dungeonStone,10,exit,false);torus('exit-ring',0,.35,0,1.45,.12,M.teal,exit,false);
    const exitGem=ball('exit-light',0,1.5,0,.45,M.crystal,exit,false,[.65,1.7,.65]);animated.push({type:'bob',mesh:exitGem,baseY:1.5,phase:0});
    chest('dungeonChest',12,25,true);
    for(let j=0;j<30;j++){const x=(j%2?1:-1)*range(18.5,21),z=range(-18,31);rock(x,z,range(.3,.9),M.dungeonStone,false);if(j%3===0)ball('wall-crystal',x,.5,z,.4,M.purple,root,true,[.6,2,.6]);}
    for(let j=0;j<20;j++){const mote=ball('dungeon-mote',range(-18,18),range(.5,3),range(-15,29),.045,M.rune,root,false);animated.push({type:'firefly',mesh:mote,base:mote.position.clone(),phase:rand()*6});}
    for(const [x,z,kind] of [[-7,-6,'mushroom'],[7,-6,'mushroom'],[-12,0,'wolf'],[12,0,'wolf'],[-6,6,'slime'],[6,6,'slime'],[-12,17,'golem'],[12,17,'golem']])spawnPoints.push({x,z,kind,level:3});
  }
  // World-space UVs keep cobbles the same size on the round plaza and long
  // lanes; merging then preserves this mapping without one texture per road.
  for(const mesh of root.getChildMeshes()) {
    if(mesh.material?.metadata?.campPaint)applyCampPaintUV(B,mesh);
    else applyEnvironmentPaintUV(B,mesh);
    const tileSize=mesh.material===M.path?5.0:mesh.material===M.dirt?4.0:[M.grass,M.grassLight,M.grassDark].includes(mesh.material)?24:0;
    if(!tileSize||!mesh.material.diffuseTexture)continue;
    const positions=mesh.getVerticesData(B.VertexBuffer.PositionKind);if(!positions)continue;
    const uv=[],matrix=mesh.computeWorldMatrix(true);
    for(let j=0;j<positions.length;j+=3){const p=B.Vector3.TransformCoordinates(new B.Vector3(positions[j],positions[j+1],positions[j+2]),matrix);uv.push(p.x/tileSize,p.z/tileSize);}
    mesh.setVerticesData(B.VertexBuffer.UVKind,uv);
  }
  // Bake many small authored pieces into a handful of material batches.
  for(const [material,meshes] of batches) {
    const groups=new Map();
    for(const m of meshes){m.computeWorldMatrix(true);const cast=!!m.metadata?.castsShadow,foliage=!!m.metadata?.celFoliage,center=m.getBoundingInfo().boundingBox.centerWorld;const key=(m.metadata?.treeGeometry?'trees:':'world:')+(cast?`${foliage?'leaves':'solid'}:${Math.floor(center.x/32)}:${Math.floor(center.z/32)}`:'surface');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}
    for(const [key,group] of groups) {
      const foliage=!!group[0].metadata?.celFoliage,cast=!!group[0].metadata?.castsShadow,treeGeometry=!!group[0].metadata?.treeGeometry;
      const merged=group.length===1?group[0]:B.Mesh.MergeMeshes(group,true,true,undefined,false,false);
      if(merged&&group.length===1)uploadBatchGeometry(merged);
      // Painted crown normals describe the whole tree, not every small lobe.
      // Keep ground casting, but skip incoming depth shadows on those crowns:
      // physical normal bias otherwise leaves striped acne as leaves sway.
      if(merged){merged.name='scenery-'+material.name+'-'+key;if(group.length>1)merged.parent=root;merged.isPickable=false;merged.receiveShadows=material!==M.treeFoliage;merged.freezeWorldMatrix();
        if(material.metadata?.campTerrainFringe){merged.hasVertexAlpha=true;merged.useVertexColors=true;merged.alphaIndex=material.name==='world-camp-grass-fringe'?2:material.name==='world-camp-paving-fringe'?1:0;}
        if(material.metadata?.canopyWind){const bounds=merged.getBoundingInfo().boundingBox,pad=new B.Vector3(CANOPY_WIND_PADDING,CANOPY_WIND_PADDING,CANOPY_WIND_PADDING);merged.setBoundingInfo(new B.BoundingInfo(bounds.minimum.subtract(pad),bounds.maximum.add(pad)));merged.getBoundingInfo().update(merged.getWorldMatrix());}
        if(foliage&&!material.metadata?.foliageSurface){merged.renderOutline=true;merged.outlineWidth=.010;merged.outlineColor=new B.Color3(.16,.24,.17);}
        merged.metadata={...merged.metadata,treeGeometry};
        if(cast){merged.metadata.worldCaster=true;shadowCasters.push(merged);}
      }
    }
  }
  // Preserve each interaction's movable/hideable root while combining its
  // little nonanimated parts; herbs and chests otherwise cost many draw calls.
  const animatedMeshes=new Set(animated.flatMap(a=>[a.mesh,a.ring].filter(Boolean)));
  for(const item of interactables) {
    const groups=new Map(),n=item.mesh;
    for(const m of n.getChildMeshes()){if(animatedMeshes.has(m))continue;if(!groups.has(m.material))groups.set(m.material,[]);groups.get(m.material).push(m);}
    n.computeWorldMatrix(true);const inverse=n.getWorldMatrix().clone().invert();
    for(const [material,parts] of groups){if(parts.length<2)continue;const cast=parts.some(m=>m.metadata?.castsShadow);parts.forEach(m=>m.computeWorldMatrix(true));const merged=B.Mesh.MergeMeshes(parts,true,true,undefined,false,false);if(!merged)continue;merged.name=item.id+'-'+material.name;merged.bakeTransformIntoVertices(inverse);merged.parent=n;merged.isPickable=false;merged.receiveShadows=true;if(cast)shadowCasters.push(merged);}
  }
  for(let j=shadowCasters.length-1;j>=0;j--)if(shadowCasters[j].isDisposed())shadowCasters.splice(j,1);
  const canopyWind=installCanopyWind(B,scene,[M.treeFoliage,M.treeFruit]);
  const waterSurface=!dungeon&&!options.treeStudy?installWaterSurface(B,scene,{materials,root}):null;
  const treeStyles=createTreeStyleController(B,scene,{root,trees:treePositions,currentMeshes:root.getChildMeshes().filter(mesh=>mesh.metadata?.treeGeometry),shadowCasters});
  return {
    ground, obstacles, interactables, spawnPoints, shadowCasters, spawn, bounds, treePositions,mapRoutes,
    camps:expansion?.camps||[],landmarks:[...(town?.landmarks||[]),...(expansion?.landmarks||[])],
    isSafe:(x,z)=>!dungeon&&isTownSafe(x,z),
    get treeStyle(){return treeStyles.styleId;},
    setTreeStyle:(id,options)=>treeStyles.setStyle(id,options),
    update(dt,t) {
      canopyWind.update(t);
      waterSurface?.update(t);
      treeStyles.update(t);
      expansion?.update?.(dt,t);
      for(const a of animated) {
        if(a.mesh.isDisposed())continue;
        const wave=Math.sin(t*1.8+a.phase);
        if(a.type==='bob')a.mesh.position.y=a.baseY+wave*.1;
        else if(a.type==='shrine'){a.mesh.position.y=a.baseY+wave*.13;a.mesh.rotation.y=t*.45;a.ring.rotation.z=t*.25;}
        else if(a.type==='npc')a.mesh.rotation.y=Math.sin(t*.5+a.phase)*.08;
        else if(a.type==='portal'){a.mesh.scaling.x=1.4+wave*.04;a.mesh.scaling.y=1.75+Math.cos(t*1.4)*.05;}
        else if(a.type==='smoke'){const p=(t*.22+a.phase)%2.6;a.mesh.position.y=p;a.mesh.position.x=Math.sin(p+a.phase)*.25;a.mesh.scaling.setAll(.7+p*.25);}
        else if(a.type==='fountain')a.mesh.position.y=.85+((t*1.4+a.phase)%1)*.8;
        else if(a.type==='firefly'){a.mesh.position.x=a.base.x+Math.sin(t*.5+a.phase)*.55;a.mesh.position.y=a.base.y+wave*.25;a.mesh.position.z=a.base.z+Math.cos(t*.4+a.phase)*.45;}
        else if(a.type==='ripple'){const s=.6+(Math.sin(t*.6+a.phase)+1)*.4;a.mesh.scaling.set(s,1,s);}
      }
    },
    setShrineActive(id) {
      const s=shrineParts.get(id);if(!s)return;s.active=true;s.gem.material=M.gold;s.ring.material=M.flame;
    },
    dispose() {treeStyles.dispose();root.dispose(false);for(const m of materials)m.dispose();for(const tex of textures)tex.dispose();}
  };
}
