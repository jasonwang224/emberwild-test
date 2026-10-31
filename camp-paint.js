/* Painted frontier materials. Texture marks describe the material, not baked light;
 * the same cel lighting and real shadows as the village still supply its depth. */
const SIZE=128;
const MATERIALS=[
  ['campSlate','slate','#929b98','box',2.5],
  ['campSlateLight','slate','#bdc2af','box',2.5],
  ['campTimber','timber','#bc9464','timber',2.4],
  ['campTimberDark','timber','#89705b','timber',2.4],
  ['campCanvasRed','canvas','#c5796c','canvas',2],
  ['campCanvasGreen','canvas','#879d70','canvas',2],
  ['campCanvasCream','canvas','#e2d4ae','canvas',2],
  ['campIron','iron','#9aa4a1','box',1.2],
  ['campSoil','soil','#b99d73','planar',4],
  ['campAsh','ash','#777362','planar',2.2],
  ['campRuins','ruins','#afbbb1','box',2.6],
  ['campPaving','paving','#bec2ad','planar',3],
  ['campLogEnds','ends','#c6a56e','authored',1],
  ['campRope','rope','#d3bd8d','rope',.65]
];

function paint(context,kind){
  const p=context;
  let seed=73541;
  for(const c of kind)seed=Math.imul(seed^c.charCodeAt(0),16777619);
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
  const pick=a=>a[Math.floor(random()*a.length)];
  p.imageSmoothingEnabled=false;p.fillStyle='#e8e3d5';p.fillRect(0,0,SIZE,SIZE);
  const repeat=draw=>{for(const dx of [-SIZE,0,SIZE])for(const dy of [-SIZE,0,SIZE])draw(dx,dy);};
  function line(points,color,width=1){p.strokeStyle=color;p.lineWidth=width;repeat((dx,dy)=>{p.beginPath();points.forEach(([x,y],i)=>i?p.lineTo(Math.round(x)+dx,Math.round(y)+dy):p.moveTo(Math.round(x)+dx,Math.round(y)+dy));p.stroke();});}
  function polygon(points,color){p.fillStyle=color;repeat((dx,dy)=>{p.beginPath();points.forEach(([x,y],i)=>i?p.lineTo(Math.round(x)+dx,Math.round(y)+dy):p.moveTo(Math.round(x)+dx,Math.round(y)+dy));p.closePath();p.fill();});}
  function patch(x,y,w,h,color){polygon([[x+2,y],[x+w*.6,y-1],[x+w,y+2],[x+w-1,y+h*.6],[x+w-4,y+h],[x+2,y+h-1],[x,y+h*.4]],color);}
  function stroke(x,y,w,h,color){p.fillStyle=color;repeat((dx,dy)=>{p.fillRect(Math.floor(x)+dx+1,Math.floor(y)+dy,Math.max(1,w-2),h);p.fillRect(Math.floor(x)+dx,Math.floor(y)+dy+1,w,Math.max(1,h-2));});}
  function ellipse(x,y,rx,ry,color,width=1){p.strokeStyle=color;p.lineWidth=width;repeat((dx,dy)=>{p.beginPath();p.ellipse(x+dx,y+dy,rx,ry,0,0,Math.PI*2);p.stroke();});}
  const dust=()=>{for(let j=0;j<78;j++){const x=random()*128,y=random()*128;stroke(x,y,2+random()*3,1,j%3?'#d0c7b2':'#f6edd8');}};
  if(kind==='slate'){
    // Wide broken strata and short branching fractures survive the normal
    // gameplay camera. Their steps avoid photographic cracks and flat stripes.
    p.fillStyle='#c8d0c8';p.fillRect(0,0,128,128);
    for(let j=0;j<12;j++){
      const y=random()*128,x=random()*128,w=24+random()*51,h=8+random()*17;
      polygon([[x+4,y+3],[x+w*.36,y-2],[x+w*.61,y+2],[x+w-3,y],[x+w,y+h*.45],[x+w-8,y+h*.72],[x+w*.7,y+h],[x+w*.38,y+h-4],[x+2,y+h+2],[x,y+8]],pick(['#dce1d2','#b0c0b6','#bdc9c0','#e2e6d7']));
      line([[x+5,y+3],[x+w*.36,y-2],[x+w*.59,y+2]],'#eff0df',2);
      if(j%2===0)line([[x+w*.28,y+h-1],[x+w*.42,y+h-4],[x+w*.65,y+h-2]],'#83978e',2);
    }
    for(let j=0;j<8;j++){
      const x=random()*128,y=random()*128;
      line([[x,y],[x+6,y+7],[x+4,y+12],[x+12,y+18]],'#6c817e',1.5);
      line([[x+1,y],[x+8,y+7]],'#ececda',1);
      if(j%2===0)line([[x+4,y+12],[x-3,y+14]],'#82938b',1);
    }
    for(let j=0;j<19;j++){
      const x=random()*128,y=random()*128,w=3+random()*11;
      polygon([[x,y],[x+w,y-2],[x+w*.7,y+4],[x+1,y+3]],j%3?'#aebeb2':'#f2efdc');
    }
  }else if(kind==='timber'){
    p.fillStyle='#e0cfad';p.fillRect(0,0,128,128);
    for(let col=0;col<5;col++){
      const x=col*27-5;
      polygon([[x+2,0],[x+23,0],[x+25,38],[x+22,77],[x+24,128],[x,128],[x+3,80],[x,43]],pick(['#d2bf9e','#e8d5ae','#f3dfb6','#bda98e']));
      line([[x+2,0],[x+3,30],[x+1,61],[x+3,95],[x+2,128]],'#8f7f6d',1.4);
      line([[x+5,0],[x+6,48],[x+4,82],[x+6,128]],'#fff0c4',1.5);
    }
    for(let j=0;j<35;j++){
      const x=random()*128,y=random()*128,h=8+random()*36;
      line([[x,y],[x+1,y+h*.32],[x-1,y+h*.65],[x,y+h]],j%3?'#ad987c':'#f4e2b9',j%4?1:2);
    }
    for(const [x,y] of [[19,31],[70,88],[112,48]]){
      ellipse(x,y,7,17,'#b19a7e',1.4);ellipse(x,y,3,9,'#8e7965',2);
      line([[x,y-6],[x-1,y],[x+1,y+5]],'#736653',2);
      line([[x+6,y-11],[x+9,y],[x+7,y+14]],'#f8e8bc',2);
    }
  }else if(kind==='canvas'){
    p.fillStyle='#dedbc8';p.fillRect(0,0,128,128);
    // Long uneven fold bands, then a restrained weave. No roof-tile grid.
    for(let j=0;j<5;j++){
      const x=j*27-9;
      polygon([[x,0],[x+9,0],[x+5,29],[x+11,61],[x+8,98],[x+10,128],[x-2,128],[x+2,92],[x-2,54],[x+2,23]],'#aeb3a4');
      polygon([[x+11,0],[x+19,0],[x+18,38],[x+22,79],[x+18,128],[x+11,128],[x+15,80],[x+12,39]],'#f8f0d8');
    }
    for(let j=0;j<45;j++)stroke(random()*128,random()*128,3+random()*10,1,j%3?'#d0d0bc':'#eee7d0');
    for(let y=5;y<128;y+=9)line([[0,y],[128,y]],'rgba(249,241,215,.16)',1);
    // A joined canvas seam and a repair patch make the shelter look inhabited.
    line([[94,0],[95,36],[93,80],[94,128]],'#8b9388',2);
    line([[98,0],[99,36],[97,80],[98,128]],'#f9efd4',1);
    for(let y=3;y<128;y+=7)line([[91,y+1],[99,y-1]],'#f9eed0',2);
    polygon([[25,66],[48,63],[52,87],[27,90]],'#bfc5b2');
    line([[25,66],[48,63],[52,87],[27,90],[25,66]],'#879487',1);
    for(let j=0;j<5;j++){
      line([[26+j*5,65-j*.5],[27+j*5,69-j*.5]],'#f6eace',1);
      line([[28+j*5,87-j*.5],[29+j*5,91-j*.5]],'#f6eace',1);
    }
  }else if(kind==='iron'){
    p.fillStyle='#aebbb4';p.fillRect(0,0,128,128);
    for(let j=0;j<12;j++)patch(random()*128,random()*128,18+random()*32,7+random()*12,pick(['#bdc6b9','#96a7a4','#ccd1bf']));
    for(let j=0;j<14;j++){
      const x=random()*128,y=random()*128;
      patch(x,y,5+random()*14,3+random()*7,j%2?'#b49677':'#907b66');
      stroke(x,y-1,8,2,'#e5dfc6');
    }
    for(let j=0;j<23;j++)line([[random()*128,random()*128],[random()*128,random()*128]],j%3?'#9daea6':'#e7e9d6',1);
  }else if(kind==='soil'||kind==='ash'){
    const ash=kind==='ash';p.fillStyle=ash?'#b8b6a8':'#dfd0af';p.fillRect(0,0,128,128);
    const colors=ash?['#a4ada1','#c7c6b3','#b1b7a7','#c0c2b0']:['#d5c5a5','#e8d8b8','#d9caad','#cec0a2','#e2d2b2'];
    // Scuffed ground uses ragged islands, never the quadrilateral brush blocks
    // that read as a checkerboard when the complete clearing repeats the tile.
    for(let j=0;j<16;j++){
      const x=random()*128,y=random()*128,rx=10+random()*17,ry=5+random()*10,points=[];
      for(let k=0;k<18;k++){
        const a=k*Math.PI/9,r=.72+random()*.4;
        points.push([x+Math.cos(a)*rx*r,y+Math.sin(a)*ry*r]);
      }
      polygon(points,pick(colors));
    }
    for(let j=0;j<52;j++){
      const x=random()*128,y=random()*128,w=2+random()*5;
      polygon([[x,y],[x+w*.6,y-1],[x+w,y+1],[x+w*.7,y+3],[x+1,y+2]],ash?'#7c877b':'#aaa58d');
      stroke(x,y-1,w-1,1,ash?'#ddd8bf':'#f8e5bd');
    }
    if(ash)for(let j=0;j<15;j++){const x=random()*128,y=random()*128;line([[x,y],[x+3,y+8]],'#5e6b64',2);}
    else for(let j=0;j<14;j++){const x=random()*128,y=random()*128;line([[x,y],[x+5,y-2],[x+12,y-1]],'#c5b698',1);}
    dust();
  }else if(kind==='ruins'||kind==='paving'){
    const paving=kind==='paving';p.fillStyle='#6d827c';p.fillRect(0,0,128,128);
    const rows=paving?4:5,h=128/rows;
    for(let row=0;row<rows;row++){
      let x=(row%2)*19-20,y=row*h;
      while(x<128){
        const w=24+random()*24;
        const pts=[[x+3,y+2],[x+w-4,y+1],[x+w-1,y+5],[x+w-2,y+h-4],[x+w-6,y+h-2],[x+4,y+h-1],[x+1,y+h-5],[x+1,y+6]];
        polygon(pts,pick(['#d0d6c7','#becabf','#e0e0ce','#a7b9b1','#d4d6c2']));
        line([[x+3,y+4],[x+w-6,y+3],[x+w-3,y+6]],'#f2edd7',2);
        line([[x+4,y+h-3],[x+w-5,y+h-4]],'#8e9f94',2);
        patch(x+w*.3,y+8,w*.35,5+random()*6,pick(['#bdc9ba','#e1dfc7','#afbfb0']));
        if((row+Math.floor(x))%3===0)line([[x+w*.5,y+1],[x+w*.43,y+8],[x+w*.57,y+13]],'#7e948b',1);
        x+=w;
      }
    }
    for(let j=0;j<16;j++){
      const x=random()*128,y=random()*128;
      patch(x,y,5+random()*8,3+random()*5,pick(['#a8ba8c','#bbc79c','#829f86']));
      stroke(x+1,y-1,3,1,'#d4d4af');
    }
  }else if(kind==='ends'){
    p.fillStyle='#ddc9a0';p.fillRect(0,0,128,128);
    for(let r=7;r<89;r+=9){
      const pts=[];for(let j=0;j<=36;j++){const a=j*Math.PI/18,rr=r+Math.sin(a*3+r)*2+Math.cos(a*5-r);pts.push([64+Math.cos(a)*rr,64+Math.sin(a)*rr*.92]);}
      line(pts,r%2?'#a18b6d':'#b39b77',2);
    }
    line([[64,63],[72,83],[74,97],[91,127]],'#82735d',2);
    line([[32,2],[35,18],[48,37]],'#9f8a6d',2);
    for(let j=0;j<20;j++)stroke(random()*128,random()*128,2+random()*5,1,'#f3dfae');
  }else if(kind==='rope'){
    p.fillStyle='#b9b49d';p.fillRect(0,0,128,128);
    for(let j=-3;j<11;j++){
      const x=j*18;
      polygon([[x,0],[x+10,0],[x+74,128],[x+64,128]],'#eee2bd');
      line([[x,0],[x+64,128]],'#8d947f',2);
      line([[x+8,0],[x+72,128]],'#fff0c9',2);
    }
    for(let j=0;j<28;j++)stroke(random()*128,random()*128,1,3+random()*5,'#dfd7b4');
  }
}

/** All returned materials and successfully created textures belong to the caller.
 * A missing or broken canvas is safe for server-side world construction. */
export function createCampMaterials(B,scene,{materials=[],textures=[]}={}){
  const result={},shared=new Map(),hasCanvas=typeof document!=='undefined'||typeof OffscreenCanvas!=='undefined';
  for(const [key,family,hex,projection,tileSize] of MATERIALS){
    const name=key.replace(/^camp/,'').replace(/[A-Z]/g,c=>'-'+c.toLowerCase()).replace(/^-/,'');
    const material=new B.StandardMaterial('world-camp-'+name,scene);
    material.diffuseColor=B.Color3.FromHexString(hex);material.specularColor=new B.Color3(0,0,0);material.emissiveColor=new B.Color3(0,0,0);
    material.metadata={campPaint:{family,projection,tileSize},paintedSurface:true};
    result[key]=material;materials.push(material);
    if(!hasCanvas)continue;
    if(!shared.has(family)){
      let texture=null;
      try{
        texture=new B.DynamicTexture('camp-paint-'+family,{width:SIZE,height:SIZE},scene,true,B.Texture.NEAREST_NEAREST_MIPLINEAR??B.Texture.NEAREST_SAMPLINGMODE);
        const context=texture.getContext();if(!context)throw new Error('Canvas context unavailable');
        paint(context,family);texture.hasAlpha=false;texture.wrapU=B.Texture.WRAP_ADDRESSMODE;texture.wrapV=B.Texture.WRAP_ADDRESSMODE;
        texture.anisotropicFilteringLevel=1;texture.metadata={paintedSurface:true,campPaint:true,family};texture.update(false);
        textures.push(texture);shared.set(family,texture);
      }catch{
        if(texture)texture.dispose();shared.set(family,null);
      }
    }
    if(shared.get(family))material.diffuseTexture=shared.get(family);
  }
  return result;
}

/** Apply only UV0, after transforms are set and before the world's batching.
 * Local cloth and grain projections rotate with their objects. Broad terrain
 * and stone use world units; cylinder caps retain their authored round mapping. */
export function applyCampPaintUV(B,mesh){
  const spec=mesh.material?.metadata?.campPaint;
  if(!spec||spec.projection==='authored')return false;
  const positions=mesh.getVerticesData(B.VertexBuffer.PositionKind),normals=mesh.getVerticesData(B.VertexBuffer.NormalKind);
  if(!positions||!normals)return false;
  const matrix=mesh.computeWorldMatrix(true),low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<positions.length;i+=3)for(let k=0;k<3;k++){low[k]=Math.min(low[k],positions[i+k]);high[k]=Math.max(high[k],positions[i+k]);}
  const extent=high.map((v,k)=>v-low[k]),scale=[new B.Vector3(1,0,0),new B.Vector3(0,1,0),new B.Vector3(0,0,1)].map(v=>B.Vector3.TransformNormal(v,matrix).length());
  const uv=[],tile=spec.tileSize,original=mesh.getVerticesData(B.VertexBuffer.UVKind),box=positions.length===72;
  const timber=spec.projection==='timber'||spec.projection==='rope';
  if(timber&&!box){
    // Babylon cylinders have their length on local Y, including tilted logs.
    // Their authored U already handles the split seam and cap orientation.
    if(!original)return false;
    const circumference=Math.PI*Math.max(extent[0]*scale[0],extent[2]*scale[2]),across=spec.projection==='rope'?.22:1.1;
    for(let i=0;i<positions.length;i+=3){
      if(Math.abs(normals[i+1])>.9)uv.push(original[i/3*2],original[i/3*2+1]);
      else uv.push(original[i/3*2]*Math.max(.3,circumference/across),(positions[i+1]-low[1])*scale[1]/tile);
    }
  }else if(timber||spec.projection==='canvas'){
    const axis=[0,1,2].sort((a,b)=>extent[b]*scale[b]-extent[a]*scale[a])[0];
    for(let i=0;i<positions.length;i+=3){
      const facing=[0,1,2].sort((a,b)=>Math.abs(normals[i+b])-Math.abs(normals[i+a]))[0];
      let across,along;
      if(timber){across=[0,1,2].find(k=>k!==axis&&k!==facing)??(axis+1)%3;along=facing===axis?[0,1,2].find(k=>k!==axis&&k!==across):axis;}
      else{const axes=[0,1,2].filter(k=>k!==facing);[across,along]=facing===1?[2,0]:axes;}
      uv.push((positions[i+across]-low[across])*scale[across]/(timber ? .85 : tile),(positions[i+along]-low[along])*scale[along]/tile);
    }
  }else{
    for(let i=0;i<positions.length;i+=3){
      const p=B.Vector3.TransformCoordinates(new B.Vector3(positions[i],positions[i+1],positions[i+2]),matrix);
      const n=B.Vector3.TransformNormal(new B.Vector3(normals[i],normals[i+1],normals[i+2]),matrix);
      if(spec.projection==='planar'||Math.abs(n.y)>=Math.max(Math.abs(n.x),Math.abs(n.z)))uv.push(p.x/tile,p.z/tile);
      else if(Math.abs(n.x)>Math.abs(n.z))uv.push(p.z/tile,p.y/tile);
      else uv.push(p.x/tile,p.y/tile);
    }
  }
  mesh.setVerticesData(B.VertexBuffer.UVKind,uv);return true;
}
