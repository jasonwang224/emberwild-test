import {advanceBounce} from './animation.js?v=9517e800';
// Original HD2D sprite atlas: crisp pixels, alpha-tested silhouettes, real 3D placement.
export function directionFrame(direction,alpha){const right=-Math.sin(alpha)*direction.x+Math.cos(alpha)*direction.z,toward=Math.cos(alpha)*direction.x+Math.sin(alpha)*direction.z;return (Math.round(Math.atan2(right,toward)/(Math.PI/4))+8)%8;}
// Measured alpha bounds of the separate 4-by-2 town-watch sheet. Each view
// retains its own silhouette and is planted at the same foot anchor.
const GUARD_ATLAS={width:1774,height:887,frames:[
 [33,49,372,353],[480,49,365,354],[913,50,367,353],[1370,49,367,351],
 [33,484,372,352],[481,483,365,353],[918,483,376,355],[1367,482,370,356]
]};
export async function createSpriteLibrary(B,scene,{onProgress=()=>{}}={}){
 const sourceTextures=new Set();let loadFailed=false,loadError,completed=0,disposed=false,guardAtlas=null;
 // Count logical assets after decoding/parsing, not network attempts. A failed
 // WebP followed by a successful PNG still completes just one atlas.
 function completeAsset(value){if(!loadFailed)onProgress(++completed,22);return value;}
 function loadTexture(url,message){return new Promise((resolve,reject)=>{
   // Track sources before callbacks run, including a synchronous cache hit.
   const texture=new B.Texture(url,scene,true,true,B.Texture.NEAREST_SAMPLINGMODE,
     ()=>queueMicrotask(()=>{if(loadFailed||disposed){texture.dispose();reject(loadError||new Error('Sprite library disposed'));}else resolve(texture);}),
     (_m,e)=>queueMicrotask(()=>{texture.dispose();sourceTextures.delete(texture);reject(e||new Error(message));}));
   sourceTextures.add(texture);
 });}
 function loadAtlas(name,message){
   // Lossless WebP decodes to exactly the same RGBA pixels, including alpha.
   // Retain the PNG route for an unavailable/corrupt WebP or an older decoder.
   return loadTexture('./assets/'+name+'.webp',message).catch(error=>{
     if(loadFailed)throw loadError||error;
     return loadTexture('./assets/'+name+'.png',message);
   }).then(completeAsset);
 }
 // This optional outfit must never extend the startup gate or turn a missing
 // guard image into a missing player/creature library. Posts use their matching
 // procedural uniform until it is ready, then replace it without moving.
 const guardReady=loadTexture('./assets/town-watch-directions.webp','Town-watch atlas unavailable')
  .catch(error=>{if(loadFailed||disposed)throw loadError||error;return loadTexture('./assets/town-watch-directions.png','Town-watch atlas unavailable');})
  .then(texture=>{if(disposed){texture.dispose();return false;}guardAtlas=texture;texture.hasAlpha=true;return true;}).catch(()=>false);
 try{
 // Begin every independent image and manifest request in the same turn. No
 // character -> hero -> creature download waterfall before the title is ready.
 const kinds=['fox','slime','mushroom','wolf','golem','boss','elder','smith','inn','cook'];
 const [atlas,heroAtlas,creatureSources]=await Promise.all([
   loadAtlas('characters','Sprite atlas unavailable'),
   loadAtlas('round-heroes','Directional heroes unavailable'),
   Promise.all(kinds.map(async kind=>{
     const [texture,manifest]=await Promise.all([
       loadAtlas(kind+'-directions',kind+' atlas unavailable'),
       fetch('./assets/'+kind+'-directions.json').then(r=>{if(!r.ok)throw Error(kind+' manifest unavailable');return r.json();}).then(completeAsset)
     ]);
     if(loadFailed){texture.dispose();return null;}
     texture.hasAlpha=true;return [kind,{texture,manifest}];
   }))
 ]);
 atlas.hasAlpha=true;const materials=new Map();
 const rects=[[36,35,375,409],[449,77,384,364],[868,77,368,367],[41,490,328,329],[465,571,356,236],[896,514,318,300],[20,865,361,350],[434,867,379,348],[834,831,402,386]];
 function material(index){if(materials.has(index))return materials.get(index);const [x,y,w,h]=rects[index];const texture=atlas.clone();texture.uScale=w/1254;texture.vScale=h/1254;texture.uOffset=x/1254;texture.vOffset=1-(y+h)/1254;texture.wrapU=texture.wrapV=B.Texture.CLAMP_ADDRESSMODE;texture.updateSamplingMode(B.Texture.NEAREST_SAMPLINGMODE);texture.hasAlpha=true;
 const m=new B.StandardMaterial('sprite-'+index,scene);m.diffuseTexture=texture;m.useAlphaFromDiffuseTexture=true;m.emissiveColor=new B.Color3(.85,.85,.85);m.diffuseColor=new B.Color3(.15,.15,.15);m.specularColor=B.Color3.Black();m.backFaceCulling=false;m.transparencyMode=B.Material.MATERIAL_ALPHATEST;m.alphaCutOff=.25;materials.set(index,m);return m;}
 function create(index,parent,height=2.7,width=height*rects[index][2]/rects[index][3]){const mesh=B.MeshBuilder.CreatePlane('pixel-character',{width,height},scene);mesh.parent=parent;mesh.position.y=height*.48;mesh.billboardMode=B.Mesh.BILLBOARDMODE_ALL;mesh.material=material(index);mesh.isPickable=false;return mesh;}
 heroAtlas.hasAlpha=true;const heroMaterials=new Map();
 function createHero(cls,parent,height=2.35){const row={knight:0,mage:1,ranger:2}[cls];const texture=heroAtlas.clone();texture.hasAlpha=true;texture.wrapU=texture.wrapV=B.Texture.CLAMP_ADDRESSMODE;texture.uScale=254/2048;texture.vScale=254/768;texture.uOffset=1/2048;texture.vOffset=1-(row*256+255)/768;
 const m=new B.StandardMaterial('round-'+cls,scene);m.diffuseTexture=texture;m.useAlphaFromDiffuseTexture=true;m.emissiveColor=new B.Color3(.78,.78,.78);m.diffuseColor=new B.Color3(.22,.22,.22);m.specularColor=B.Color3.Black();m.backFaceCulling=false;m.transparencyMode=B.Material.MATERIAL_ALPHATEST;m.alphaCutOff=.5;heroMaterials.set(cls,m);
 const mesh=B.MeshBuilder.CreatePlane('eight-direction-'+cls,{width:height,height},scene);mesh.parent=parent;mesh.position.y=height*.45;mesh.billboardMode=B.Mesh.BILLBOARDMODE_ALL;mesh.material=m;mesh.isPickable=false;mesh.metadata={directional:true,direction:0};
 // Draw a cyan silhouette only where scenery is in front of the hero.
 const ghost=mesh.clone('hero-occlusion');const ink=new B.StandardMaterial('occluded-hero',scene);ink.disableLighting=true;ink.diffuseColor=B.Color3.Black();ink.emissiveColor=B.Color3.FromHexString('#65e9ff');ink.opacityTexture=texture;ink.alpha=.8;ink.transparencyMode=B.Material.MATERIAL_ALPHABLEND;ink.depthFunction=B.Constants.GREATER;ink.disableDepthWrite=true;ink.backFaceCulling=false;ghost.material=ink;ghost.renderingGroupId=1;ghost.metadata=null;mesh.metadata.ghost=ghost;
 scene.setRenderingAutoClearDepthStencil(1,false,false,false);mesh.onDisposeObservable.add(()=>{m.dispose(true,true);ink.dispose(false,false);if(heroMaterials.get(cls)===m)heroMaterials.delete(cls);});return mesh;}
 const creatures=new Map(creatureSources);
 const creatureMaterials=new Set();
 const guardMaterials=new Set();
 function createGuard(parent,height=2.4){
  if(disposed||!guardAtlas)return null;
  const texture=guardAtlas.clone();texture.hasAlpha=true;texture.wrapU=texture.wrapV=B.Texture.CLAMP_ADDRESSMODE;
  texture.updateSamplingMode(B.Texture.NEAREST_SAMPLINGMODE);
  const m=new B.StandardMaterial('town-watch-uniform',scene);m.diffuseTexture=texture;m.useAlphaFromDiffuseTexture=true;
  m.emissiveColor=new B.Color3(.78,.78,.78);m.diffuseColor=new B.Color3(.22,.22,.22);m.specularColor=B.Color3.Black();m.backFaceCulling=false;m.transparencyMode=B.Material.MATERIAL_ALPHATEST;m.alphaCutOff=.5;guardMaterials.add(m);
  const mesh=B.MeshBuilder.CreatePlane('eight-direction-town-watch',{size:height,updatable:true},scene);
  mesh.parent=parent;mesh.position.y=.04;mesh.billboardMode=B.Mesh.BILLBOARDMODE_ALL;mesh.material=m;mesh.isPickable=false;
  mesh.metadata={directional:true,direction:0,guard:true,height,vertices:mesh.getVerticesData(B.VertexBuffer.PositionKind).slice()};
  setGuardFrame(mesh);
  mesh.onDisposeObservable.add(()=>{m.dispose(true,true);guardMaterials.delete(m);});return mesh;
 }
 function setGuardFrame(mesh){
  const {height,vertices,direction}=mesh.metadata,[x,y,w,h]=GUARD_ATLAS.frames[direction],texture=mesh.material.diffuseTexture;
  texture.uScale=w/GUARD_ATLAS.width;texture.vScale=h/GUARD_ATLAS.height;texture.uOffset=x/GUARD_ATLAS.width;texture.vOffset=1-(y+h)/GUARD_ATLAS.height;
  const positions=vertices.slice();for(let i=0;i<positions.length;i+=3){positions[i]*=w/h;positions[i+1]+=height/2;}
  mesh.updateVerticesData(B.VertexBuffer.PositionKind,positions);mesh.refreshBoundingInfo();
 }
 function createCreature(kind,parent,height){
   const source=creatures.get(kind),texture=source.texture.clone(),manifest=source.manifest;
   texture.hasAlpha=true;texture.wrapU=texture.wrapV=B.Texture.CLAMP_ADDRESSMODE;
   texture.uScale=(manifest.cellWidth-2)/manifest.width;texture.vScale=(manifest.cellHeight-2)/manifest.height;
   const m=new B.StandardMaterial('creature-'+kind,scene);m.diffuseTexture=texture;m.useAlphaFromDiffuseTexture=true;
   m.emissiveColor=new B.Color3(.68,.68,.68);m.diffuseColor=new B.Color3(.32,.32,.32);m.specularColor=B.Color3.Black();m.backFaceCulling=false;m.transparencyMode=B.Material.MATERIAL_ALPHATEST;m.alphaCutOff=.5;creatureMaterials.add(m);
   const mesh=B.MeshBuilder.CreatePlane('eight-direction-'+kind,{width:height,height,updatable:true},scene);
   mesh.parent=parent;mesh.position.y=.04;mesh.billboardMode=B.Mesh.BILLBOARDMODE_ALL;mesh.material=m;mesh.isPickable=false;
   mesh.metadata={directional:true,direction:0,pose:0,kind,manifest,height,vertices:mesh.getVerticesData(B.VertexBuffer.PositionKind).slice(),motion:{kind,phase:0,time:Math.random()*10}};
   setCreatureFrame(mesh);
   mesh.onDisposeObservable.add(()=>{m.dispose(true,true);creatureMaterials.delete(m);});return mesh;
 }
 function setCreatureFrame(mesh){
   const {manifest,height,direction,pose,vertices}=mesh.metadata,texture=mesh.material.diffuseTexture;
   texture.uOffset=(direction*manifest.cellWidth+1)/manifest.width;texture.vOffset=1-(pose*manifest.cellHeight+manifest.cellHeight-1)/manifest.height;
   const frame=manifest.frames.find(f=>f.column===direction&&f.row===pose),rect=frame.tightRect;
   // Shift vertices, not the collision root: every generated view shares a foot anchor.
   const dx=height*(.5-((rect[0]-direction*manifest.cellWidth)+rect[2]/2)/manifest.cellWidth);
   const dy=height*(((rect[1]-pose*manifest.cellHeight)+rect[3])/manifest.cellHeight-.5);
   const positions=vertices.slice();for(let i=0;i<positions.length;i+=3){positions[i]+=dx;positions[i+1]+=dy;}
   mesh.updateVerticesData(B.VertexBuffer.PositionKind,positions);mesh.refreshBoundingInfo();
 }
 function animate(mesh,dt,options){
   if(!mesh?.metadata?.directional)return null;
   const data=mesh.metadata;data.motion??={kind:'hero',phase:0,time:0};
   const motion=advanceBounce(data.motion,dt,options);
   if(data.manifest){mesh.position.y=.04+motion.hop;mesh.scaling.set(motion.sx,motion.sy,1);mesh.rotation.z=motion.roll;if(data.pose!==motion.pose){data.pose=motion.pose;setCreatureFrame(mesh);}}
   return motion;
 }
 function face(mesh,direction,alpha){if(!mesh?.metadata?.directional)return;const frame=directionFrame(direction,alpha),data=mesh.metadata;if(data.direction!==frame){data.direction=frame;if(data.guard)setGuardFrame(mesh);else if(data.manifest)setCreatureFrame(mesh);else mesh.material.diffuseTexture.uOffset=(frame*256+1)/2048;}if(data.ghost){data.ghost.scaling.copyFrom(mesh.scaling);data.ghost.rotation.z=mesh.rotation.z;data.ghost.visibility=mesh.visibility;}}
 return {create,createHero,createCreature,createGuard,guardReady,animate,face,dispose(){if(disposed)return;disposed=true;sourceTextures.forEach(texture=>texture.dispose());sourceTextures.clear();creatureMaterials.forEach(m=>m.dispose(true,true));guardMaterials.forEach(m=>m.dispose(true,true));materials.forEach(m=>m.dispose(true,true));heroMaterials.forEach(m=>m.dispose(true,true));}};
 }catch(error){
   // Reject promptly so procedural fallback can start while siblings still load.
   loadFailed=true;loadError=error;sourceTextures.forEach(texture=>texture.dispose());sourceTextures.clear();throw error;
 }
}
