/* Shared construction mechanics; geometry remains in the saved style modules. */
const CLASSIC_PALETTES={moss:['#315e42','#659145','#b4ce71'],sage:['#40684d','#83a66d','#c1d38b'],lime:['#3c6940','#82ad4f','#c7dc7a'],forest:['#214f3d','#4b8855','#98ba65'],teal:['#234d4b','#427c63','#8eba80'],blush:['#945779','#d68fa7','#f9d3c8'],gold:['#937340','#d5ac58','#f2d78d'],lavender:['#656084','#9c8cbd','#d7c8e5']};
const REFERENCE_PALETTES={moss:['#244832','#648445','#b4c66f'],sage:['#345747','#7d9b62','#bacb86'],lime:['#31543a','#7b9e4b','#c2d778'],forest:['#193e35','#47744b','#94ad60'],teal:['#1c3c40','#416c58','#8faf74'],blush:['#7e405c','#c17897','#edb6c3'],gold:['#71402e','#b77838','#e7b358'],lavender:['#373651','#746a9b','#beb0d9'],ivory:['#905d78','#c89da4','#f3e2bf'],russet:['#623625','#9b512b','#ce953f']};

// World disposal can happen while a batch yields or a sprite atlas loads.
// Never attach fresh meshes to the already-disposed parent on resumption.
export function assertTreeBuildActive(root,{parent,signal}={}){
  if(root.isDisposed()||parent?.isDisposed()||signal?.aborted){
    const error=new Error('Tree style construction was cancelled.');error.name='AbortError';throw error;
  }
}

// Keep the woodland's color distribution while retaining the historical model's
// scale, seed, crown structure, lean and original paint palette.
export function scopeHistoricalStyle(original,placement,nineSpecies=false){
  const variant=placement.variant||placement.appearance?.variant;
  if(!variant)return original;
  const family={pink:'blush',ivory:'blush',violet:'lavender',russet:'gold',apple:'moss',pear:'sage'}[variant]||variant;
  const palettes=nineSpecies?REFERENCE_PALETTES:CLASSIC_PALETTES;
  const palette=palettes[nineSpecies&&palettes[variant]?variant:family]||original.palette;
  const result={...original,family,palette:[...palette],variant};
  if(nineSpecies){
    if(variant==='pink'||variant==='ivory')result.shape='spreading';
    else if(variant==='violet')result.shape='birch';
    else if(variant==='apple'||variant==='pear')result.shape='orchard';
    result.fruit=variant==='apple'?'red':variant==='pear'?'gold':null;
  }
  return result;
}

export function finishHistoricalBatch(B,root,batches,shadowCasters,{outline=.010,padding=0}={}){
  for(const [material,meshes] of batches){
    const groups=new Map();
    for(const mesh of meshes){
      mesh.computeWorldMatrix(true);
      const cast=!!mesh.metadata?.castsShadow,foliage=!!mesh.metadata?.celFoliage;
      const center=mesh.getBoundingInfo().boundingBox.centerWorld;
      const key=`${cast?'caster':'surface'}:${foliage?'leaf':'solid'}:${Math.floor(center.x/32)}:${Math.floor(center.z/32)}`;
      if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
    }
    for(const [key,group] of groups){
      const foliage=!!group[0].metadata?.celFoliage,cast=!!group[0].metadata?.castsShadow;
      const merged=group.length===1?group[0]:B.Mesh.MergeMeshes(group,true,true,undefined,false,false);
      if(!merged)throw new Error('Could not assemble historical tree geometry.');
      merged.name=`tree-style-${material.name}-${key}`;
      merged.parent=root;merged.isPickable=false;merged.receiveShadows=!material.metadata?.canopyWind;
      merged.metadata={treeGeometry:true,worldCaster:cast,celFoliage:foliage};
      merged.freezeWorldMatrix();
      if(padding&&material.metadata?.canopyWind){
        const bounds=merged.getBoundingInfo().boundingBox,pad=new B.Vector3(padding,padding,padding);
        merged.setBoundingInfo(new B.BoundingInfo(bounds.minimum.subtract(pad),bounds.maximum.add(pad)));
        merged.getBoundingInfo().update(merged.getWorldMatrix());
      }
      if(foliage&&!material.metadata?.foliageSurface){merged.renderOutline=true;merged.outlineWidth=outline;merged.outlineColor=new B.Color3(.13,.19,.16);}
      if(cast)shadowCasters.push(merged);
    }
  }
  batches.clear();
}
