import {assertTreeBuildActive} from './runtime.js?v=54d49b7f';
/* The actual original generated tree artwork, with alpha and pixel sampling. */
const CELLS=[[21,36,478,456],[533,51,471,441],[1044,55,467,440]];
export async function build(B,scene,options={}){
  const root=new B.TransformNode('tree-style-original-sprites',scene);root.setEnabled(false);if(options.parent)root.parent=options.parent;
  const materials=[],textures=[],meshes=[],shadowCasters=[];let disposed=false;
  const dispose=()=>{if(disposed)return;disposed=true;root.dispose();for(const texture of textures)texture.dispose();for(const material of materials)material.dispose();};
  try{
    assertTreeBuildActive(root,options);
    let atlas=null;
    if(typeof document!=='undefined'||typeof OffscreenCanvas!=='undefined'){
      atlas=await new Promise((resolve,reject)=>{
        const texture=new B.Texture(new URL('../assets/foliage.png',import.meta.url).href,scene,true,true,B.Texture.NEAREST_SAMPLINGMODE,()=>queueMicrotask(()=>resolve(texture)),(_message,error)=>queueMicrotask(()=>reject(error||new Error('Original tree artwork could not load.'))));
        textures.push(texture);
      });
      assertTreeBuildActive(root,options);
      atlas.hasAlpha=true;atlas.wrapU=atlas.wrapV=B.Texture.CLAMP_ADDRESSMODE;
    }
    assertTreeBuildActive(root,options);
    for(let i=0;i<3;i++){
      const material=new B.StandardMaterial('original-tree-art-'+i,scene);materials.push(material);
      material.diffuseColor=B.Color3.White();material.emissiveColor=B.Color3.White();material.specularColor=B.Color3.Black();material.disableLighting=true;
      material.backFaceCulling=false;material.useAlphaFromDiffuseTexture=true;material.transparencyMode=B.Material.MATERIAL_ALPHATEST;material.alphaCutOff=.32;
      if(atlas){const texture=atlas.clone(),[x,y,w,h]=CELLS[i];textures.push(texture);texture.uScale=w/1536;texture.vScale=h/1024;texture.uOffset=x/1536;texture.vOffset=1-(y+h)/1024;texture.hasAlpha=true;texture.wrapU=texture.wrapV=B.Texture.CLAMP_ADDRESSMODE;material.diffuseTexture=texture;}
    }
    for(const p of options.trees||[]){
      const variant=p.variant||p.appearance?.variant;
      const cell=p.golden||variant==='gold'||variant==='russet'?2:['pink','ivory','violet'].includes(variant)?1:0;
      const height=5.2*p.s,width=height*CELLS[cell][2]/CELLS[cell][3];
      const mesh=B.MeshBuilder.CreatePlane('original-pixel-tree',{width,height},scene);mesh.parent=root;
      // Put the pivot at the trunk foot: an orbit never lifts the sprite off
      // the ground, even though this intentionally historical look is flat.
      const positions=mesh.getVerticesData(B.VertexBuffer.PositionKind);
      for(let j=1;j<positions.length;j+=3)positions[j]+=height*.5;
      mesh.setVerticesData(B.VertexBuffer.PositionKind,positions);
      mesh.position.set(p.x,.015,p.z);mesh.billboardMode=B.Mesh.BILLBOARDMODE_ALL;mesh.material=materials[cell];
      mesh.isPickable=false;mesh.receiveShadows=false;mesh.metadata={treeGeometry:true,worldCaster:true,originalSprite:true};
      meshes.push(mesh);shadowCasters.push(mesh);
    }
    return {root,meshes,materials,textures,shadowCasters,update(){},dispose};
  }catch(error){dispose();throw error;}
}
