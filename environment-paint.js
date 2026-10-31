/* Original, local albedo painting for Emberwild's solid 3D scenery. */
const FAMILIES = [
  {kind:'stone',keys:['stone','stoneLight','stoneDark','pebble','moss','townSlate'],tile:2.8,projection:'box'},
  {kind:'masonry',keys:['brick','brickLight','dungeonStone','dungeonWall'],tile:3.2,projection:'box'},
  {kind:'slab',keys:['dungeon','dungeonDark','dungeonTile'],tile:4.5,projection:'box'},
  {kind:'timber',keys:['wood','woodLight','woodDark'],projection:'authored'},
  {kind:'planks',keys:['timber','timberLight','timberDark'],projection:'timber'},
  {kind:'plaster',keys:['wall','wallShade'],tile:3.5,projection:'wall',replace:true},
  {kind:'shingle',keys:['roof','roofLight'],projection:'authored',replace:true},
  {kind:'slate-shingle',keys:['blueRoof','violetRoof'],projection:'authored',replace:true},
  {kind:'cobbles',keys:['path'],tile:5,projection:'planar',replace:true},
  {kind:'cloth',keys:['awning','cloth'],projection:'authored'},
  {kind:'earth',keys:['earth','dirtEdge'],tile:3.5,projection:'planar'},
  {kind:'sand',keys:['sand'],tile:4,projection:'planar'},
  {kind:'metal',keys:['iron','gold'],projection:'authored'},
  {kind:'water',keys:['water','pond'],tile:7,projection:'planar'},
  {kind:'botanical',keys:['blade','fern','cream','pink','lavender','red','green'],projection:'authored'}
];

function painter(context,kind) {
  let seed=1779033703;for(const c of kind)seed=Math.imul(seed^c.charCodeAt(0),16777619);
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
  const pick=a=>a[Math.floor(random()*a.length)],p=context,size=128;
  p.imageSmoothingEnabled=false;
  p.fillStyle=kind==='water'?'#9fcfce':kind==='metal'?'#ece9df':'#e9e7dc';p.fillRect(0,0,size,size);
  // Tiled marks wrap at the texture boundary, avoiding a visible square seam.
  function mark(x,y,draw){for(const dx of [-size,0,size])for(const dy of [-size,0,size])draw(Math.floor(x)+dx,Math.floor(y)+dy);}
  function patch(x,y,w,h,fill){p.fillStyle=fill;mark(x,y,(a,b)=>{p.beginPath();p.moveTo(a+2,b);p.lineTo(a+w-3,b+1);p.lineTo(a+w,b+Math.floor(h*.45));p.lineTo(a+w-2,b+h);p.lineTo(a+3,b+h-1);p.lineTo(a,b+Math.floor(h*.55));p.closePath();p.fill();});}
  function chippedRect(x,y,w,h,fill,c=.65){p.fillStyle=fill;mark(x,y,(a,b)=>{p.beginPath();p.moveTo(a+c,b);p.lineTo(a+w-c*.7,b);p.lineTo(a+w,b+c);p.lineTo(a+w,b+h-c*.8);p.lineTo(a+w-c,b+h);p.lineTo(a+c*.8,b+h);p.lineTo(a,b+h-c);p.lineTo(a,b+c*.6);p.closePath();p.fill();});}
  function stroke(x,y,w,h,fill){p.fillStyle=fill;mark(x,y,(a,b)=>{p.fillRect(a+2,b,w-3,h);p.fillRect(a,b+1,w,h-1);});}
  function polygon(points,fill){p.fillStyle=fill;mark(0,0,(x,y)=>{p.beginPath();p.moveTo(points[0][0]+x,points[0][1]+y);for(let k=1;k<points.length;k++)p.lineTo(points[k][0]+x,points[k][1]+y);p.closePath();p.fill();});}
  function paintedLine(points,color,width=1){p.strokeStyle=color;p.lineWidth=width;mark(0,0,(x,y)=>{p.beginPath();p.moveTo(points[0][0]+x,points[0][1]+y);for(let k=1;k<points.length;k++)p.lineTo(points[k][0]+x,points[k][1]+y);p.stroke();});}
  const pale=['#f4f1e5','#eeeddf','#e3e4d7','#d9ddd1','#f5f2e7'];
  if(['stone','earth','sand','metal','botanical'].includes(kind)) {
    const count=kind==='sand'?70:kind==='botanical'?55:38;
    for(let j=0;j<count;j++)patch(random()*size,random()*size,8+random()*21,4+random()*13,pick(pale));
  }
  if(kind==='stone') {
    for(let j=0;j<24;j++){
      const x=random()*size,y=random()*size,w=5+random()*13;
      stroke(x,y,w,2,j%3?'#c3cbbf':'#f8f3e4');
      if(j%3===0)stroke(x+3,y+2,w*.55,2,'#d1d5c8');
    }
    // A few stepped fissures read as painted chips, never photographic noise.
    for(let j=0;j<4;j++){
      const x=random()*size,y=random()*size;
      stroke(x,y,6,2,'#afbcae');stroke(x+4,y+2,7,2,'#bcc6b8');
    }
  } else if(kind==='masonry') {
    p.fillStyle='#81796a';p.fillRect(0,0,size,size);
    const heights=[17,20,16,21,17,19,18];let y=0;
    for(let row=0;row<heights.length;row++){
      const n=row%3===1?3:4,weights=Array.from({length:n},()=>.8+random()*.45),total=weights.reduce((a,b)=>a+b,0);let x=(row%2)*17-7;
      for(let col=0;col<n;col++){
        const width=weights[col]/total*128,w=width-1.4,h=heights[row]-1.4;
        chippedRect(x+.6,y+.6,w,h,pick(['#f3e6ca','#ddd6bd','#f9ebcb','#d1ceba','#e8ddbf']),.9+random()*.9);
        stroke(x+3,y+1.8,w-5,1,'#fff3d5');stroke(x+3,y+h-1,w-5,1,'#b6b49e');
        if((row+col)%2===0)patch(x+w*.3,y+4,w*.40,h*.45,pick(['#d3c9af','#f7e8c9','#c5c3af']));
        if((row+col)%3===0){stroke(x+3,y+3,4,3,'#aaa590');stroke(x+4,y+2,5,1,'#f9ecd0');}
        if((row*2+col)%5===0)patch(x+w*.64,y+h-5,5,3,'#aaa58f');
        x+=width;
      }
      y+=heights[row];
    }
  } else if(kind==='slab') {
    p.fillStyle='#92998a';p.fillRect(0,0,size,size);
    patch(2,2,124,124,'#e9e1ca');
    stroke(7,3,112,2,'#faf0d8');stroke(8,122,110,2,'#b4b9a5');
    for(let j=0;j<12;j++)patch(12+random()*96,10+random()*100,12+random()*25,5+random()*9,pick(['#e5dfc9','#ece4ce','#e0ddc7']));
    for(let j=0;j<5;j++)stroke(12+random()*100,12+random()*100,4+random()*9,1,j%2?'#bbc2aa':'#f5ecd4');
    stroke(3,24,4,2,'#a8b29c');stroke(118,92,7,2,'#a8b29c');
  } else if(kind==='cobbles') {
    p.fillStyle='#665e4e';p.fillRect(0,0,size,size);
    // Paint the earth first: only the irregular joints and worn corners expose
    // these warm soil strokes, occasional cooler damp patches and sparse moss.
    for(let j=0;j<64;j++)patch(random()*size,random()*size,5+random()*14,2+random()*8,pick(['#766a55','#5e594b','#8d7d60','#746b57','#6b654f']));
    for(let j=0;j<16;j++)patch(random()*size,random()*size,3+random()*8,2+random()*5,pick(['#556246','#697349','#7b8054']));
    for(let j=0;j<100;j++)stroke(random()*size,random()*size,2+random()*3,1,j%3?'#8f8064':'#4f4d40');
    // Periodic fitted stones retain the bright faces, but the clearance varies
    // by shared edge. The same stone pair always agrees on its dirt joint,
    // including across the texture seam; this is not a uniform outline stroke.
    const sites=[];
    for(let row=0;row<9;row++)for(let col=0;col<8;col++){
      const x=(col+(row%2)*.22)*size/8+(random()-.5)*5,y=(row+.25)*size/9+(random()-.5)*4;
      if(![11,38].includes(row*8+col))sites.push([x,y]);
    }
    sites.push([sites[8][0]+6,sites[8][1]+5],[sites[31][0]-5,sites[31][1]+6]);
    function clip(points,nx,ny,limit){
      const out=[];
      for(let k=0;k<points.length;k++){
        const a=points[k],b=points[(k+1)%points.length],da=a[0]*nx+a[1]*ny-limit,db=b[0]*nx+b[1]*ny-limit;
        if(da<=1e-7)out.push(a);
        if((da<0)!==(db<0)){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
      }
      return out;
    }
    for(let s=0;s<sites.length;s++){
      const [x,y]=sites[s];let raw=[[x-64,y-64],[x+64,y-64],[x+64,y+64],[x-64,y+64]];
      const borders=[];
      for(let t=0;t<sites.length;t++)for(const dx of [-128,0,128])for(const dy of [-128,0,128]){
        const q=sites[t];
        const qx=q[0]+dx,qy=q[1]+dy,nx=qx-x,ny=qy-y;
        if(nx*nx+ny*ny<1e-6||nx*nx+ny*ny>6400)continue;
        const limit=(qx*qx+qy*qy-x*x-y*y)/2;
        raw=clip(raw,nx,ny,limit);
        const hash=Math.sin((Math.min(s,t)+1)*127.1+(Math.max(s,t)+1)*311.7)*43758.5453,variation=hash-Math.floor(hash);
        const gap=.70+variation*1.45+(variation>.87?(variation-.87)*8:0);
        borders.push({nx,ny,limit:limit-Math.hypot(nx,ny)*gap*.5});
      }
      const cx=raw.reduce((n,v)=>n+v[0],0)/raw.length,cy=raw.reduce((n,v)=>n+v[1],0)/raw.length;
      let face=raw;for(const b of borders)face=clip(face,b.nx,b.ny,b.limit);
      const outline=[];
      for(let k=0;k<face.length;k++){
        const v=face[k],prev=face[(k+face.length-1)%face.length],next=face[(k+1)%face.length],chip=.08+random()*.12+(s%11===0?.08:0);
        outline.push([v[0]+(prev[0]-v[0])*chip,v[1]+(prev[1]-v[1])*chip],[v[0]+(next[0]-v[0])*chip*.85,v[1]+(next[1]-v[1])*chip*.85]);
      }
      const mood=Math.sin(cx*.055)+Math.cos(cy*.043),palette=mood>.5?['#fff0d4','#f3e4c9','#f3e1d1']:mood<-.6?['#dce0c8','#e4e1cf','#ece8d3']:['#fbefd5','#ede5ce','#f4e9d7'];
      polygon(outline,pick(palette));
      const minX=Math.min(...face.map(v=>v[0])),maxX=Math.max(...face.map(v=>v[0])),minY=Math.min(...face.map(v=>v[1])),maxY=Math.max(...face.map(v=>v[1]));
      const sw=maxX-minX,sh=maxY-minY,scumbles=Array.from({length:3+s%3},(_,j)=>({x:cx-sw*.35+random()*sw*.45,y:cy-sh*.30+random()*sh*.50,w:sw*(.22+random()*.26),h:sh*(.12+random()*.15),color:pick(['#fff4e1','#e2e0d5','#eee5d4','#f3e9dc'])}));
      mark(0,0,(a,b)=>{
        p.save();p.beginPath();p.moveTo(outline[0][0]+a,outline[0][1]+b);for(let k=1;k<outline.length;k++)p.lineTo(outline[k][0]+a,outline[k][1]+b);p.closePath();p.clip();
        for(const q of scumbles){p.fillStyle=q.color;p.fillRect(q.x+a+1,q.y+b,q.w-1,q.h);p.fillRect(q.x+a,q.y+b+1,q.w,q.h-1);}
        p.restore();
      });
      for(let k=0;k<face.length;k++){
        const a=face[k],b=face[(k+1)%face.length];
        if(Math.abs(a[0]-b[0])<Math.abs(a[1]-b[1])*.7)continue;
        const upper=(a[1]+b[1])*.5<cy;
        paintedLine([a,b].map(v=>[cx+(v[0]-cx)*.87,cy+(v[1]-cy)*.87]),upper?'#fff9ed':'#bcb7aa',upper?1.8:1.5);
      }
      if(s%3===0)stroke(cx-3,cy,6,1,'#deded1');
      if(s%8===0)stroke(cx-2,cy+2,3,1,'#b9b9a9');
    }
  } else if(kind==='timber') {
    p.fillStyle='#e7e0cb';p.fillRect(0,0,size,size);
    for(let j=0;j<45;j++){
      const x=random()*size,y=random()*size,h=8+random()*29;
      p.fillStyle=j%3?'#c7c5ae':'#f5ecd4';mark(x,y,(a,b)=>{p.fillRect(a,b,1+(j%2),h);p.fillRect(a+1,b+h,1,h*.25);});
    }
    for(let j=0;j<5;j++){
      const x=random()*size,y=random()*size;
      p.strokeStyle='#bebea7';p.lineWidth=1;mark(x,y,(a,b)=>{p.beginPath();p.ellipse(a,b,3,8,.1,0,Math.PI*2);p.stroke();});
    }
  } else if(kind==='planks') {
    p.fillStyle='#786b63';p.fillRect(0,0,size,size);
    for(let col=0;col<4;col++){
      const x=col*32;
      p.fillStyle=pick(['#eed7b5','#d5c3ac','#f3dfbd','#e0c9ad']);p.fillRect(x+2,0,29,128);
      p.fillStyle='#b7a496';p.fillRect(x+28,0,3,128);
      for(let j=0;j<6;j++){
        const y=j*23+random()*8,h=9+random()*9;
        p.fillStyle='#fff0cc';mark(x+2,y,(a,b)=>p.fillRect(a,b,2,h));
      }
      for(let j=0;j<12;j++){
        const gx=x+5+random()*20,gy=random()*128,h=15+random()*30,bend=(random()-.5)*3;
        paintedLine([[gx,gy],[gx+bend,gy+h*.35],[gx+bend*.6,gy+h]],j%3?'#b8a795':'#f8e8c8',j%4?1:1.6);
      }
      const kx=x+12+random()*8,ky=18+random()*90;
      for(let ring=0;ring<2;ring++){
        p.strokeStyle=ring?'#d6c3a9':'#a28f80';p.lineWidth=1;mark(kx,ky,(a,b)=>{p.beginPath();p.ellipse(a,b,2.5+ring*2,6+ring*5,0,0,Math.PI*2);p.stroke();});
      }
      paintedLine([[kx,ky-3],[kx-1,ky+3]],'#8f8075',1.2);
      for(let j=0;j<3;j++){const gy=8+j*43+random()*8;paintedLine([[x+6,gy+3],[x+12,gy],[x+23,gy+2]],'#c4b29a',1);}
    }
  } else if(kind==='plaster') {
    p.fillStyle='#eee7d5';p.fillRect(0,0,size,size);
    // Broken warm limewash strokes form irregular repairs, without a large
    // polygon silhouette that competes with the facade's timber framing.
    for(let j=0;j<10;j++){
      const cx=random()*128,cy=14+random()*92;
      for(let k=0;k<3;k++){
        const x=cx+(random()-.5)*13,y=cy+(random()-.5)*8,w=7+random()*11,h=4+random()*6;
        p.fillStyle=pick(['#f7ead0','#e0d3bc','#e9ddc6','#f2e4cc']);
        mark(x,y,(a,b)=>{p.fillRect(a+1,b,w-3,2);p.fillRect(a,b+2,w,h-3);p.fillRect(a+2,b+h-2,w-4,2);});
      }
    }
    for(let j=0;j<9;j++){
      const x=random()*128,w=3+random()*7,h=3+random()*8;
      patch(x,2+random()*8,w,h,pick(['#d3cbbb','#d5d8c5','#e0d6bd']));
      patch(x+11,110+random()*13,w+3,4+random()*7,pick(['#d3cdb6','#d9d4ba','#cbd0b9']));
      stroke(x+12,109+random()*10,w,1,'#f8edd3');
      if(j%3===0)stroke(x+13,121-random()*5,4,2,'#ada58d');
    }
    for(let j=0;j<16;j++)stroke(random()*128,14+random()*99,3+random()*4,1,j%4?'#faf1da':'#c0c5b1');
  } else if(kind==='shingle'||kind==='slate-shingle') {
    const cool=kind==='slate-shingle',palette=cool?['#c9d3d5','#9ebbc4','#c2d6d2','#b7c2d5','#d7dedc']:['#ecc19b','#dca38d','#f4c999','#cea698','#e7b18d'];
    p.fillStyle=cool?'#8a9fa9':'#b28e80';p.fillRect(0,0,size,size);
    for(let row=0;row<8;row++){
      const weights=Array.from({length:8},()=>.85+random()*.30),total=weights.reduce((a,b)=>a+b,0);let x=(row%2)*8;
      for(let col=0;col<8;col++){
        const width=weights[col]/total*128,yy=row*16,yOffset=col%3===0?1:0,w=width-1.2,h=15-yOffset;
        chippedRect(x+.5,yy+yOffset,w,h,pick(palette),1.3+random()*.65);
        // Short, independently shaded tile caps and lower lips do not connect
        // into full-length corrugations. Adjacent courses shift by half a tile.
        const cap=6+random()*2,lip=7+random()*2,lipY=yy+12+(col+row)%2;
        stroke(x+3+random(),yy+3+yOffset,cap,3,cool?'#e1ede4':'#ffe0ae');
        stroke(x+3,lipY-1,lip+1,2,cool?'#91a9b4':'#b6877e');
        stroke(x+3,lipY,lip,2,cool?'#70859a':'#946672');
        p.fillStyle=cool?'#9aadb6':'#c79b87';mark(x+w-2,yy+4,(a,b)=>p.fillRect(a,b,1,6));
        if((row+col)%4===0)stroke(x+4,yy+7,4,1,cool?'#c5d8d8':'#f6d7ac');
        if((row*3+col)%9===0)stroke(x+w-3,yy+10,3,2,cool?'#b8cccb':'#dcc09f');
        x+=width;
      }
    }
  } else if(kind==='cloth') {
    p.fillStyle='#f1ead6';p.fillRect(0,0,size,size);
    for(let j=0;j<24;j++)stroke(random()*size,random()*size,7+random()*17,1,j%3?'#e0e3ce':'#fcf3dc');
    for(let x=12;x<size;x+=24){p.fillStyle='#e2e5d1';p.fillRect(x,0,1,size);}
  } else if(kind==='earth'||kind==='sand') {
    for(let j=0;j<65;j++)stroke(random()*size,random()*size,3+random()*7,2,pick(['#d0d2c0','#faf2dc','#e0dfca']));
  } else if(kind==='metal') {
    for(let j=0;j<18;j++)stroke(random()*size,random()*size,5+random()*14,2,j%3?'#d4dbd0':'#faf3df');
  } else if(kind==='water') {
    for(let j=0;j<8;j++)patch(random()*size,random()*size,10+random()*15,2+random()*3,pick(['#9acbca','#a8d3ce','#afd7d0']));
    for(let j=0;j<130;j++){
      const x=random()*size,y=random()*size,w=3+Math.floor(random()*4);
      p.fillStyle=j%6?'#f3f8e8':'#bfded3';mark(x,y,(a,b)=>p.fillRect(a,b,w,j%4?1:2));
      if(j%5===0){p.fillStyle='#f7faec';mark(x+w+2,y+1,(a,b)=>p.fillRect(a,b,1,1));}
    }
  } else if(kind==='botanical') {
    for(let j=0;j<38;j++)stroke(random()*size,random()*size,3+random()*5,2,pick(['#f6f3df','#d6ddc6','#e8ecd6']));
  }
}

/** Add shared albedo textures, preserving material colors, lighting and batches.
 * Call after world.js's established paint setup. The caller owns `textures`.
 * Missing Canvas support safely leaves original solid materials in headless use.
 */
export function installEnvironmentPaint(B,scene,M,{dungeon=false,textures=[]}={}) {
  const applied=[],created=[];
  if(typeof document==='undefined'&&typeof OffscreenCanvas==='undefined')return {applied,createdTextures:created};
  for(const family of FAMILIES){
    const entries=family.keys.filter(key=>M[key]&&!M[key].metadata?.environmentPaint);
    if(!entries.length)continue;
    let texture=null;
    for(const key of entries){
      const material=M[key];
      if(material.diffuseTexture&&!family.replace){
        material.metadata={...material.metadata,paintedSurface:true,environmentPaint:{family:family.kind,source:'existing'}};applied.push(key);continue;
      }
      if(!texture){
        try{
          texture=new B.DynamicTexture('environment-paint-'+family.kind,{width:128,height:128},scene,true,B.Texture.NEAREST_SAMPLINGMODE);
          const ctx=texture.getContext();if(!ctx)throw new Error('Canvas context unavailable');
          painter(ctx,family.kind);texture.update(false);
          texture.wrapU=B.Texture.WRAP_ADDRESSMODE;texture.wrapV=B.Texture.WRAP_ADDRESSMODE;texture.anisotropicFilteringLevel=1;
          texture.metadata={paintedSurface:true,family:family.kind};created.push(texture);textures.push(texture);
        }catch{if(texture)texture.dispose();texture=null;break;}
      }
      material.diffuseTexture=texture;
      material.metadata={...material.metadata,paintedSurface:true,environmentPaint:{family:family.kind,source:'procedural',dungeon},paintUV:{projection:family.projection,tileSize:family.tile||1}};
      applied.push(key);
    }
  }
  // Coverage includes the original meadow, path, roof, bark and canopy paint.
  for(const material of Object.values(M))if(material?.diffuseTexture)material.metadata={...material.metadata,paintedSurface:true};
  return {applied,createdTextures:created};
}

/** Optional world-space UV0 mapping. Run after transforms are final, before
 * batching. Never touches UV2 (canopy wind anchors) or any geometric property.
 * Round architectural pieces keep their cylindrical/torus unwraps.
 */
export function applyEnvironmentPaintUV(B,mesh){
  const spec=mesh.material?.metadata?.paintUV;if(!spec||spec.projection==='authored')return false;
  if((spec.projection==='box'||spec.projection==='wall')&&/fountain|pillar|round-house|dome|barrel|shrine|torus|arch|porthole/.test(mesh.name))return false;
  if(mesh.material?.metadata?.environmentPaint?.family==='slab'&&mesh.name==='dungeon-slab')return false;
  const positions=mesh.getVerticesData(B.VertexBuffer.PositionKind),normals=mesh.getVerticesData(B.VertexBuffer.NormalKind);
  if(!positions||!normals)return false;
  if(spec.projection==='timber'){
    // Box beams are built along different local axes. Keep grain running with
    // their length, including rotated diagonals; cylindrical unwraps stay intact.
    if(positions.length!==72)return false;
    const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity],uv=[];
    for(let i=0;i<positions.length;i+=3)for(let k=0;k<3;k++){low[k]=Math.min(low[k],positions[i+k]);high[k]=Math.max(high[k],positions[i+k]);}
    const axis=[0,1,2].sort((a,b)=>(high[b]-low[b])-(high[a]-low[a]))[0];
    for(let i=0;i<positions.length;i+=3){
      const facing=[0,1,2].sort((a,b)=>Math.abs(normals[i+b])-Math.abs(normals[i+a]))[0];
      const across=[0,1,2].find(k=>k!==axis&&k!==facing)??(axis+1)%3;
      const along=facing===axis?[0,1,2].find(k=>k!==axis&&k!==across):axis;
      uv.push((positions[i+across]-low[across])/1.4+.02,(positions[i+along]-low[along])/(facing===axis?1.4:2.8));
    }
    mesh.setVerticesData(B.VertexBuffer.UVKind,uv);return true;
  }
  const matrix=mesh.computeWorldMatrix(true),uv=[],tile=spec.tileSize;
  let low=Infinity,high=-Infinity;
  if(spec.projection==='wall')for(let i=0;i<positions.length;i+=3){
    const v=B.Vector3.TransformCoordinates(new B.Vector3(positions[i],positions[i+1],positions[i+2]),matrix);
    low=Math.min(low,v.y);high=Math.max(high,v.y);
  }
  for(let i=0;i<positions.length;i+=3){
    const p=B.Vector3.TransformCoordinates(new B.Vector3(positions[i],positions[i+1],positions[i+2]),matrix);
    const n=B.Vector3.TransformNormal(new B.Vector3(normals[i],normals[i+1],normals[i+2]),matrix);
    if(spec.projection==='planar'||Math.abs(n.y)>=Math.max(Math.abs(n.x),Math.abs(n.z)))uv.push(p.x/tile,p.z/tile);
    else if(Math.abs(n.x)>Math.abs(n.z))uv.push(p.z/tile,spec.projection==='wall'?(p.y-low)/Math.max(high-low,.001):p.y/tile);
    else uv.push(p.x/tile,spec.projection==='wall'?(p.y-low)/Math.max(high-low,.001):p.y/tile);
  }
  mesh.setVerticesData(B.VertexBuffer.UVKind,uv);return true;
}
