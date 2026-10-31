import {finishHistoricalBatch,assertTreeBuildActive} from './runtime.js?v=e2609980';
import {applyCelShading} from './cel-c8f1bee.js?v=e2609980';

/* Visual reconstruction from the surviving first-prototype screenshot. The
 * original unsaved builder is unavailable; this option is labeled accordingly. */
export async function build(B,scene,options={}){
  const root=new B.TransformNode('tree-style-prototype',scene);root.setEnabled(false);if(options.parent)root.parent=options.parent;
  const materials=[],textures=[],meshes=[],shadowCasters=[],batches=new Map();let disposed=false;
  const dispose=()=>{if(disposed)return;disposed=true;root.dispose();for(const material of materials)material.dispose();};
  function material(name,hex){const m=new B.StandardMaterial('world-tree-prototype-'+name,scene);m.diffuseColor=B.Color3.FromHexString(hex);m.specularColor=B.Color3.Black();materials.push(m);return m;}
  const trunk=material('trunk','#6a4836');
  const palettes=[['#3d7150','#75a767','#9bbb72'],['#996280','#ce93aa','#e8b3be'],['#ad833e','#dbb45e','#edd08c']].map((colors,i)=>colors.map((hex,j)=>material(`${i}-${j}`,hex)));
  function add(mesh,m,p){mesh.parent=root;mesh.material=m;mesh.isPickable=false;mesh.metadata={treeGeometry:true,castsShadow:true};mesh.position.set(...p);if(!batches.has(m))batches.set(m,[]);batches.get(m).push(mesh);return mesh;}
  try{
    assertTreeBuildActive(root,options);
    const trees=options.trees||[];
    for(let index=0;index<trees.length;index++){
      assertTreeBuildActive(root,options);
      const p=trees[index],s=p.s,variant=p.variant||p.appearance?.variant;
      const palette=palettes[p.golden||variant==='gold'||variant==='russet'?2:['pink','ivory','violet'].includes(variant)?1:0];
      const phase=Math.sin(p.x*4.31+p.z*2.72),height=1+phase*.10,width=1-phase*.08;
      add(B.MeshBuilder.CreateCylinder('prototype-tree-trunk',{height:3.5*s*height,diameterBottom:.52*s,diameterTop:.26*s,tessellation:6},scene),trunk,[p.x,1.75*s*height,p.z]);
      const clusters=[[-.85,3.30,-.15,1.15,0],[.84,3.45,-.12,1.19,0],[0,3.42,.70,1.16,0],[-.66,4.13,.12,1.20,1],[.65,4.17,.20,1.24,1],[0,4.30,-.65,1.13,1],[.02,4.85,.02,1.03,2]];
      for(let j=0;j<clusters.length;j++){
        const [x,y,z,r,tone]=clusters[j];
        const mesh=add(B.MeshBuilder.CreateIcoSphere('prototype-tree-crown',{radius:r*s,subdivisions:1,flat:true},scene),palette[tone],[p.x+x*s*width,y*s*height,p.z+z*s*width]);
        mesh.scaling.set(width,.88,width);mesh.rotation.y=j*.64+phase;
      }
      if((index+1)%32===0){finishHistoricalBatch(B,root,batches,shadowCasters);await new Promise(resolve=>setTimeout(resolve,0));}
    }
    assertTreeBuildActive(root,options);
    finishHistoricalBatch(B,root,batches,shadowCasters);applyCelShading(B,{materials});for(const material of materials)material.metadata={...material.metadata,emberwildCel:false,historicalTree:true};meshes.push(...root.getChildMeshes());
    return {root,meshes,materials,textures,shadowCasters,update(){},dispose};
  }catch(error){dispose();throw error;}
}
