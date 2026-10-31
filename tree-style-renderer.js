import {normalizeTreeStyle} from './tree-style-options.js';
export {TREE_STYLE_OPTIONS,normalizeTreeStyle} from './tree-style-options.js';

const loaders={
  'original-sprites':()=>import('./tree-styles/original-sprites.js'),
  prototype:()=>import('./tree-styles/prototype.js'),
  c8f1bee:()=>import('./tree-styles/c8f1bee.js'),
  e8edc64:()=>import('./tree-styles/e8edc64.js'),
  '44a9bb3':()=>import('./tree-styles/44a9bb3.js'),
  '9f3c194':()=>import('./tree-styles/9f3c194.js'),
  '17cd003':()=>import('./tree-styles/17cd003.js'),
  '23c89c4':()=>import('./tree-styles/23c89c4.js'),
  '9de1d1e':()=>import('./tree-styles/9de1d1e.js')
};

export function normalizeTreePlacements(trees=[]){
  return trees.map((tree,index)=>{
    const {x,z}=tree,s=tree.s??tree.scale??1;
    if(![x,z,s].every(Number.isFinite)||s<=0)throw new RangeError(`Invalid tree placement ${index}.`);
    const variant=tree.variant||tree.appearance?.variant;
    return {...tree,x,z,s,variant,golden:!!tree.golden||variant==='gold'||variant==='russet',pine:!!tree.pine};
  });
}

/** Builds a disabled visual layer. The world commits it atomically after stale
 * request checks, updates its shadow list, and enables the root. Collision and
 * gameplay data belong to the original world and never enter this renderer. */
export async function createTreeStyleRenderer(B,scene,options={}){
  const styleId=normalizeTreeStyle(options.styleId);
  if(styleId==='current')throw new RangeError('Current trees are retained by the world, not reconstructed.');
  const trees=normalizeTreePlacements(options.trees);
  const module=await loaders[styleId]();
  const result=await module.build(B,scene,{...options,trees});
  result.styleId=styleId;
  return result;
}
