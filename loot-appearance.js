// Grounded, vertex-painted loot silhouettes. Each item is one merged mesh and
// one owned material; no image assets or animation clocks are required.
export function createLootAppearance(B,scene,{kind='gear',color='#8dbce9'}={}){
 const root=new B.Mesh(`${kind} grounded loot`,scene);root.isPickable=false;
 root.metadata={lootAppearance:true,lootKind:kind};
 const positions=[],normals=[],colors=[],indices=[];
 const ink=hex=>B.Color3.FromHexString(hex);
 const accent=color instanceof B.Color3?color.clone():typeof color==='string'&&/^#[0-9a-f]{6}$/i.test(color)?ink(color):ink('#8dbce9');
 function face(points,shade){
  const base=positions.length/3,c=typeof shade==='string'?ink(shade):shade;
  for(const p of points){positions.push(...p);colors.push(c.r,c.g,c.b,1);}
  for(let i=1;i<points.length-1;i++)indices.push(base,base+i,base+i+1);
 }
 function box(cx,cy,cz,w,h,d,palette){
  const x=cx-w/2,X=cx+w/2,y=cy-h/2,Y=cy+h/2,z=cz-d/2,Z=cz+d/2;
  const shades=Array.isArray(palette)?palette:Array(6).fill(palette);
  face([[x,y,z],[X,y,z],[X,Y,z],[x,Y,z]],shades[0]);
  face([[X,y,Z],[x,y,Z],[x,Y,Z],[X,Y,Z]],shades[1]);
  face([[x,y,Z],[x,y,z],[x,Y,z],[x,Y,Z]],shades[2]);
  face([[X,y,z],[X,y,Z],[X,Y,Z],[X,Y,z]],shades[3]);
  face([[x,Y,z],[X,Y,z],[X,Y,Z],[x,Y,Z]],shades[4]);
  face([[x,y,Z],[X,y,Z],[X,y,z],[x,y,z]],shades[5]);
 }
 function lathe(cx,cz,rings,palette,sides=8,stretch=1){
  const points=rings.map(([y,r])=>Array.from({length:sides},(_,i)=>{
   const a=i*Math.PI*2/sides+Math.PI/8;return[cx+Math.cos(a)*r,y,cz+Math.sin(a)*r*stretch];
  }));
  face([...points[0]].reverse(),palette[0]);
  for(let row=0;row<points.length-1;row++)for(let i=0;i<sides;i++){
   const j=(i+1)%sides;
   face([points[row][i],points[row][j],points[row+1][j],points[row+1][i]],palette[(i+row*3)%palette.length]);
  }
  face(points.at(-1),palette.at(-1));
 }
 if(kind==='gear'){
  // Broad cloth sack, pinched and tied at the mouth, with angular painted
  // patches that remain readable at the gameplay camera's small pixel size.
  lathe(0,0,[[0,.24],[.07,.36],[.27,.38],[.38,.27],[.435,.115]],
   ['#68432d','#8e5c36','#a97643','#bd8b51','#93623b','#c5995e','#795034','#ac7a46'],8,.77);
  lathe(0,0,[[.425,.11],[.475,.155],[.51,.115]],['#70462d','#ad7d49','#c39962','#d2ad75'],8,.72);
  // The tying cord and knot are part of this same mesh, so they add no draw calls.
  box(0,.425,0,.27,.045,.21,['#503724','#60432c','#705035','#58402b','#997044','#4d3524']);
  box(.015,.432,-.135,.09,.065,.07,['#c7a269','#89613a','#a67b48','#725132','#d5b77e','#5a3d29']);
  face([[-.20,.13,-.281],[-.08,.11,-.303],[.03,.32,-.284],[-.10,.35,-.276]],'#c69a61');
  face([[-.20,.13,-.284],[-.17,.13,-.288],[-.07,.34,-.280],[-.10,.35,-.279]],'#e0bc7b');
  // A dark border and coloured clasp distinguish equipment from currency.
  box(.10,.245,-.29,.145,.14,.035,'#503a2e');
  box(.10,.251,-.313,.105,.095,.018,[accent,accent.scale(.66),accent.scale(.82),accent.scale(.68),B.Color3.Lerp(accent,ink('#fff0c9'),.62),accent.scale(.56)]);
  box(.081,.279,-.325,.035,.026,.008,'#fff0ca');
 }else if(kind==='potion'){
  lathe(0,0,[[0,.105],[.055,.17],[.22,.17],[.295,.08],[.37,.065]],
   ['#824d65','#bf6d91','#e38daa','#f0b3c3','#b05e82','#d782a2'],8,.85);
  lathe(0,0,[[.35,.078],[.39,.078]],['#7f4965','#f0bdc7','#e89bb7','#f6d5cf'],8,.86);
  lathe(0,0,[[.385,.055],[.455,.061]],['#704934','#ab7950','#d4a671','#bc8e5d'],8,.90);
  box(-.052,.18,-.143,.035,.115,.015,'#ffe3d7');
  box(.025,.12,-.149,.07,.048,.016,'#ead4b7');
 }else if(kind==='gold'){
  const coin=(x,z,y,r)=>lathe(x,z,[[y,r*.92],[y+.022,r],[y+.063,r],[y+.074,r*.9]],
   ['#7e542b','#b78335','#e2b64c','#f7d77b','#d29a38','#ffe69a'],10);
  coin(-.135,-.035,0,.19);coin(.14,.035,0,.17);coin(.015,.015,.065,.18);
  box(-.015,.145,-.005,.038,.008,.13,'#b28234');
  box(-.03,.149,-.028,.068,.008,.022,'#f8e2a1');
 }else{
  // Crystalline shards keep a readable blue silhouette and a dark lower facet.
  lathe(0,0,[[0,.065],[.14,.17],[.38,.11],[.51,0]],
   ['#365e88','#5d94bd','#94cce3','#c3e9ea','#6eafd1','#457ba7'],6,.76);
 }
 const data=new B.VertexData();data.positions=positions;data.indices=indices;
 B.VertexData.ComputeNormals(positions,indices,normals);data.normals=normals;data.colors=colors;data.applyToMesh(root);
 const material=new B.StandardMaterial(`${kind} painted loot material`,scene);
 material.disableLighting=true;material.diffuseColor=B.Color3.White();material.emissiveColor=B.Color3.White();material.specularColor=B.Color3.Black();
 material.backFaceCulling=false;root.material=material;root.useVertexColors=true;
 // Painted item colours stay crisp; only the separate beacon supplies bloom.
 const glows=(scene.effectLayers||[]).filter(layer=>layer instanceof B.GlowLayer);
 for(const layer of glows)layer.addExcludedMesh(root);
 let disposed=false;root.onDisposeObservable.add(()=>{if(disposed)return;disposed=true;for(const layer of glows)layer.removeExcludedMesh(root);material.dispose();});
 return root;
}
