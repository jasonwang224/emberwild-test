import {deformCanopyPositions} from './tree-canopy.js';
import {canopyPaintUV} from './canopy-paint.js';

const layouts=new WeakMap();
const coordinate=value=>Object.is(value,-0)?'-0':String(value);

/** Icosphere triangles repeat the same points (540 entries, 132 distinct
 * points at the current detail). Cache that topology, never a tree's shape.
 * Matching normals as well as positions preserves authored smooth seams. */
export function canopyVertexLayout(template){
  let layout=layouts.get(template);if(layout)return layout;
  const first=new Map(),unique=[],source=new Uint32Array(template.positions.length/3);
  for(let offset=0;offset<template.positions.length;offset+=3){
    const key=[...template.positions.slice(offset,offset+3),...template.normals.slice(offset,offset+3)].map(coordinate).join(',');
    let index=first.get(key);
    if(index===undefined){index=unique.length;first.set(key,index);unique.push(offset);}
    source[offset/3]=index;
  }
  layout={unique,source};layouts.set(template,layout);return layout;
}

/** Evaluate exactly the original deformation once per repeated vertex and
 * expand it back to the original triangle topology before Babylon upload. */
export function deformCanopyTemplate(template,radius,seed){
  const layout=canopyVertexLayout(template),compact=[];
  for(const offset of layout.unique)compact.push(template.positions[offset]*radius,template.positions[offset+1]*radius,template.positions[offset+2]*radius);
  const deformed=deformCanopyPositions(compact,seed),positions=new Array(template.positions.length);
  for(let vertex=0;vertex<layout.source.length;vertex++){
    const from=layout.source[vertex]*3,to=vertex*3;
    positions[to]=deformed[from];positions[to+1]=deformed[from+1];positions[to+2]=deformed[from+2];
  }
  return positions;
}

/** The spherical coordinates repeat too. UV seam correction still runs in
 * the original triangle order, so every final UV value remains identical. */
export function cachedCanopyPaintUV(positions,scale,indices,phase,layout){
  const compact=[];
  for(const offset of layout.unique)compact.push(positions[offset],positions[offset+1],positions[offset+2]);
  const base=canopyPaintUV(compact,scale,[],phase),uv=new Array(positions.length/3*2);
  for(let vertex=0;vertex<layout.source.length;vertex++){
    const from=layout.source[vertex]*2;uv[vertex*2]=base[from];uv[vertex*2+1]=base[from+1];
  }
  for(let i=0;i<indices.length;i+=3){
    const a=indices[i]*2,b=indices[i+1]*2,c=indices[i+2]*2;
    const low=Math.min(uv[a],uv[b],uv[c]),high=Math.max(uv[a],uv[b],uv[c]);
    if(high-low>.5){const mid=(high+low)/2;if(uv[a]<mid)uv[a]+=1;if(uv[b]<mid)uv[b]+=1;if(uv[c]<mid)uv[c]+=1;}
  }
  return uv;
}
