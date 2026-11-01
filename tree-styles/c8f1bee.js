// Tree-only reconstruction of saved revision c8f1bee. Original procedural geometry and surface paint.
import {applyCelShading} from './cel-c8f1bee.js?v=17317200';
import {finishHistoricalBatch,scopeHistoricalStyle,assertTreeBuildActive} from './runtime.js?v=17317200';

export async function build(B,scene,options={}) {
  const root=new B.TransformNode('tree-style-c8f1bee',scene);root.setEnabled(false);if(options.parent)root.parent=options.parent;
  const materials=[],textures=[],shadowCasters=[],batches=new Map(),ballTemplates=new Map();
  let foliageDetailMode=false,seed=928531;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
  const range=(a,b)=>a+rand()*(b-a),color=h=>B.Color3.FromHexString(h);
  function mat(name,hex,emissive=0,alpha=1){const m=new B.StandardMaterial('world-history-c8f1bee-'+name,scene);m.diffuseColor=color(hex);m.specularColor=new B.Color3(.035,.045,.05);if(emissive)m.emissiveColor=color(hex).scale(emissive);m.alpha=alpha;materials.push(m);return m;}
  const M={
    earth:mat('earth','#7b6957'),
    wood:mat('wood','#735849'),
    woodLight:mat('wood-light','#a78056'),
    leaf:mat('leaves','#477b5b'),
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

  let disposed=false;
  const dispose=()=>{if(disposed)return;disposed=true;root.dispose();for(const t of textures)t.dispose();for(const m of materials)m.dispose();};
  try {
  assertTreeBuildActive(root,options);
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
    const organic=/tree-crown|garden-shrub/.test(name);
    const v = B.MeshBuilder.CreateIcoSphere(name,{radius:r,subdivisions:organic?2:1,flat:!organic},scene); v.position.set(x,y,z);
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
    // An overlapping lower ring, middle crown and sunlit cap create readable
    // cel-like volumes that remain fully three dimensional from every angle.
    const clusters=[
      [-.92,3.35,-.12,.84,0],[.82,3.32,-.34,.86,0],[.06,3.22,.88,.83,0],[-.18,3.22,-.87,.83,0],
      [-1.05,4.05,.18,.96,1],[.92,4.09,.19,1.02,1],[.10,4.04,-.88,1.0,1],[.02,4.1,.85,.97,1],
      [-.45,4.73,-.36,.88,2],[.49,4.78,.08,.91,2],[-.31,4.78,.55,.81,2],[.05,5.22,.04,.68,2]
    ];
    for(let j=0;j<clusters.length;j++) {
      const [dx,dy,dz,r,tone]=clusters[j];
      const lean=Math.sin(x*.37+z*.21)*.3;
      const crownY=(3.0+(dy-3.0)*(variant===0?.65:.78))*s*height;
      const crown=ball('tree-crown',x+(dx+lean*(dy-3))*s*width,crownY,z+(dz+Math.sin(j*2+x)*.10)*s*width,r*s*.88,shades[tone],root,true,[width,variant===0?.78:.88,width]);
      crown.rotation.y=j*.57+x*.1;
    }
    for(let j=0;j<10;j++){const a=j*.628+.3,r=.44+(j%3)*.06;ball('tree-crown-scallop',x+Math.sin(a)*1.48*s*width,(3.75+Math.sin(a*3+x)*.23)*s*height,z+Math.cos(a)*1.38*s*width,r*s,shades[j%3===0?2:1],root,true,[width,.85,width]);}
    if(!golden&&!blossom&&Math.abs(Math.round(x-z))%4===0) {
      for(let j=0;j<6;j++){const a=j*1.047;ball('orchard-fruit',x+Math.sin(a)*1.5*s,3.55*s,z+Math.cos(a)*1.5*s,.10*s,M.red);}
    }
    cylinder('tree-root-earth',x,.08,z,.5*s,.16,M.earth,7);foliageDetailMode=false;
  }

  const placements=options.trees||[];
  for(let i=0;i<placements.length;i++){assertTreeBuildActive(root,options);const p=placements[i];tree(p.x,p.z,p.s,p.golden,p.pine,p.variant);
    if((i+1)%16===0){finishHistoricalBatch(B,root,batches,shadowCasters,{outline:.022,padding:0});await new Promise(resolve=>setTimeout(resolve,0));}
  }
  assertTreeBuildActive(root,options);
  finishHistoricalBatch(B,root,batches,shadowCasters,{outline:.022,padding:0});
  const wind={update(){}};
  applyCelShading(B,{materials});for(const material of materials)material.metadata={...material.metadata,emberwildCel:false,historicalTree:true};
  const meshes=root.getChildMeshes();
  return {root,meshes,materials,textures,shadowCasters,update(time=0){if(!disposed)wind.update(time);},dispose};
  }catch(error){dispose();throw error;}
}
