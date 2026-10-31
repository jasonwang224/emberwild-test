/* Shared by settings validation and the lazy-loaded in-world art switcher. */
export const TREE_STYLE_OPTIONS=Object.freeze([
  {id:'current',name:'Current painted clusters',description:'The latest full-depth crowns, fruit and blossom varieties.'},
  {id:'original-sprites',name:'Original pixel artwork',description:'The original green, pink and gold 2D tree sprites; camera-facing artwork.'},
  {id:'prototype',name:'Faceted prototype',description:'A reconstruction of the first simple low-poly trees.'},
  {id:'c8f1bee',name:'01 · Large plain clusters',description:'The first saved 3D crowns, built from broad plain lobes.'},
  {id:'e8edc64',name:'02 · Finer painted foliage',description:'Small textured leaf volumes around rounded cores.'},
  {id:'44a9bb3',name:'03 · Tiny dense leaves',description:'Hundreds of tiny leaves create a fine, busy canopy.'},
  {id:'9f3c194',name:'04 · Rounded bulbs',description:'Larger overlapping bulbs with painted leaf detail.'},
  {id:'17cd003',name:'05 · Randomized species',description:'Varied tree forms, eight color families and gentle wind.'},
  {id:'23c89c4',name:'06 · Broad matte paint',description:'Broader leaf paint and softer matte lighting.'},
  {id:'9de1d1e',name:'07 · Mottled reference crowns',description:'Scalloped crowns, orchard fruit and violet flowering trees.'}
].map(option=>Object.freeze({...option,thumbnail:`./assets/tree-styles/${option.id}.png`})));

const styleIds=new Set(TREE_STYLE_OPTIONS.map(option=>option.id));
export function normalizeTreeStyle(value){return styleIds.has(value)?value:'current';}
