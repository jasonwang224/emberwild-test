/* Hearthglen's connected market, guild and civic quarters. All scenery is solid
 * geometry using the world's shared painted materials and static batches. */
export const TOWN_PLAN = Object.freeze({
  bounds:{minX:-27,maxX:27,minZ:-11,maxZ:25},
  buildings:[
    {id:'guildhall',name:'The Adventurers Guild',x:6.8,z:21,w:7.2,d:5.4,blue:true},
    {id:'civic-hall',name:'Suncrest Hall',x:22,z:12,w:6.4,d:5.4,blue:false},
    {id:'east-cottage',name:'Weavers Row',x:22,z:0,w:4.8,d:4.0,blue:true},
    {id:'west-cottage',name:'Orchard House',x:-21,z:13.5,w:5.2,d:4.4,blue:false},
    {id:'apothecary',name:'The Copper Kettle',x:-20,z:-6,w:4.6,d:4.2,round:true}
  ],
  routes:[
    {p:[[-5,1],[-12,-3.8],[-18,-2.2],[-20,2]],w:3.1,stone:true},
    {p:[[-20,2],[-19.8,7],[-20,10.9]],w:3.3,stone:true},
    {p:[[-17,-5],[-20,-2.6]],w:2.7,stone:true},
    {p:[[-19.8,8],[-16.5,8],[-12.7,7.6],[-3.5,9.7],[0,13.5]],w:2.7,stone:true},
    {p:[[5,-3],[16,-4.6],[22,-3]],w:3.0,stone:true},
    {p:[[14.8,-4],[17.1,1.2],[17.4,6],[21.9,8.9]],w:3.1,stone:true},
    {p:[[4.7,9],[6.2,14.5],[7.0,17.9]],w:3.1,stone:true},
    {p:[[0,14],[6.4,15.8],[14.8,16.8],[20.5,16.8]],w:3.2,stone:true},
    {p:[[17.4,6],[17.7,12.6],[17.8,17]],w:2.8,stone:true}
  ],
  plazas:[
    {id:'market-square',x:-20,z:3.8,r:5.0,stretch:1.18},
    {id:'suncrest-court',x:18.1,z:6.0,r:4.8,stretch:.98},
    {id:'guild-forecourt',x:6.8,z:16.2,r:4.0,stretch:.73}
  ],
  landmarks:[
    {id:'guildhall',name:'Adventurers Guild',x:6.8,z:21,kind:'town'},
    {id:'clocktower',name:'Hearthglen Clocktower',x:14,z:21,kind:'town'},
    {id:'market-square',name:'Copperleaf Market',x:-20,z:3.8,kind:'town'},
    {id:'suncrest-hall',name:'Suncrest Hall',x:22,z:12,kind:'town'}
  ]
});

/** Reservations also keep random trees and grass out of the expanded paving.
 * The wider town bounds are separately used to keep enemies outside town. */
export function inTownPaving(x,z,pad=0) {
  return TOWN_PLAN.plazas.some(p=>Math.hypot(x-p.x,(z-p.z)/p.stretch)<p.r+pad);
}

export function buildTownExpansion(ctx) {
  const {root,M,box,cylinder,ball,beam,torus,node,house,roundHouse,lantern,
    barrel,shrub,flower,obstacle,bench,crate,fence}=ctx;
  const footprints=[];
  const reserve=(x,z,r)=>{footprints.push({x,z,r});};

  for(const p of TOWN_PLAN.plazas){
    const paving=cylinder('village-'+p.id,p.x,.033,p.z,p.r,.040,M.path,40);
    paving.scaling.z=p.stretch;
    // Sparse, individually skewed curbstones and planting soften the boundary.
    for(let j=0;j<27;j++){
      const a=j*Math.PI*2/27,x=p.x+Math.sin(a)*p.r,z=p.z+Math.cos(a)*p.r*p.stretch;
      if(TOWN_PLAN.routes.some(route=>route.p.some(([px,pz])=>Math.hypot(x-px,z-pz)<route.w*.72)))continue;
      if(j%5!==0){const curb=box('house-court-edge',x,.065,z,.43+(j%3)*.08,.095,.19,M.pebble);curb.rotation.y=a+.08*Math.sin(j);}
      if(j%6===0){shrub(x+Math.sin(a)*.55,z+Math.cos(a)*.55,.45);flower(x+Math.sin(a)*.8,z+Math.cos(a)*.8,M.cream,.75);}
    }
  }

  for(const h of TOWN_PLAN.buildings){
    if(h.round)roundHouse(h.x,h.z,h.w,h.d,true);
    else house(h.x,h.z,h.w,h.d,h.blue);
    reserve(h.x,h.z,Math.max(h.w,h.d)*.62);
  }

  function banner(x,y,z,w=1.25,h=1.8,material=M.townSlate,symbol='star'){
    box('house-banner-backing',x,y,z,w+.14,h+.12,.11,M.gold);
    box('house-banner-cloth',x,y+.02,z-.07,w,h,.07,material);
    for(const side of [-1,1])box('house-banner-trim',x+side*(w/2-.06),y,z-.12,.055,h-.1,.03,M.cream);
    if(symbol==='crown'){
      box('house-banner-crown',x,y-.20,z-.13,w*.60,.13,.045,M.gold);
      for(const dx of [-.22,0,.22])beam('house-banner-crown',[x+dx*w,y-.17,z-.14],[x+dx*w,y+.18+(dx===0?.11:0),z-.14],.10,M.gold);
    }else{
      const star=box('house-banner-star',x,y,z-.14,w*.38,w*.38,.045,M.gold);star.rotation.z=Math.PI/4;
      box('house-banner-star',x,y,z-.17,w*.13,w*.68,.035,M.gold);
      box('house-banner-star',x,y,z-.17,w*.68,w*.13,.035,M.gold);
    }
  }

  // A wider facade, matching banners and covered entrance distinguish the guild
  // from ordinary cottages without replacing any of the established services.
  banner(6.8,3.0,18.13,1.45,1.70,M.townSlate);
  for(const side of [-1,1]){
    cylinder('house-guild-column',6.8+side*1.28,1.18,17.72,.15,2.36,M.brickLight,8);
    box('house-guild-capital',6.8+side*1.28,2.40,17.72,.43,.18,.43,M.brickLight);
  }
  const guildPorch=box('roof-guild-porch',6.8,2.63,17.72,3.2,.15,1.45,M.blueRoof);guildPorch.rotation.x=.12;
  for(const x of [4.1,9.5]){
    box('house-guild-planter',x,.25,17.7,.85,.5,.7,M.brickLight);
    for(let j=0;j<5;j++)ball('house-guild-blooms',x+(j%3-1)*.20,.65+Math.floor(j/3)*.1,17.7+(j%2-.5)*.22,.18,j%2?M.pink:M.cream);
  }
  banner(22,3.02,9.19,1.38,1.72,M.violetRoof,'crown');
  for(let j=0;j<8;j++){
    const cloth=j%2?M.cloth:M.violetRoof,awning=box('market-awning-civic',20.04+j*.56,2.42,8.85,.56,.08,1.17,cloth);awning.rotation.x=.15;
    box('market-awning-civic-fringe',20.04+j*.56,2.30,8.29,.55,.22,.055,cloth);
  }

  // The clock can be recognized from all four approaches and above the roofs.
  const tx=14,tz=21;
  box('house-clock-foundation',tx,.2,tz,2.9,.4,2.9,M.brickLight);
  box('house-clock-masonry',tx,2.50,tz,2.20,4.6,2.20,M.brick);
  box('house-clock-stone-belt',tx,4.45,tz,2.42,.23,2.42,M.brickLight);
  box('house-clock-upper',tx,5.31,tz,2.18,1.55,2.18,M.wall);
  for(const dx of [-1.13,1.13])for(const dz of [-1.13,1.13])box('timber-clock-corner',tx+dx,5.28,tz+dz,.13,1.75,.13,M.timberDark);
  for(const side of [-1,1])for(const axis of ['x','z']){
    const px=tx+(axis==='x'?side*1.19:0),pz=tz+(axis==='z'?side*1.19:0);
    const face=cylinder('house-clock-rim',px,5.35,pz,.64,.13,M.gold,20);
    const dial=cylinder('house-clock-dial',px+(axis==='x'?side*.08:0),5.35,pz+(axis==='z'?side*.08:0),.54,.04,M.cream,20);
    if(axis==='x'){face.rotation.z=Math.PI/2;dial.rotation.z=Math.PI/2;}
    else{face.rotation.x=Math.PI/2;dial.rotation.x=Math.PI/2;}
    for(let j=0;j<12;j++){
      const a=j*Math.PI/6,dx=Math.sin(a)*.42,dy=Math.cos(a)*.42;
      box('house-clock-hour',px+(axis==='z'?dx:side*.12),5.35+dy,pz+(axis==='x'?dx:side*.12),axis==='z'?.055:.035,.075,axis==='x'?.055:.035,M.timberDark);
    }
    const center=[px+(axis==='x'?side*.14:0),5.35,pz+(axis==='z'?side*.14:0)];
    beam('house-clock-hand',center,[center[0]+(axis==='z'?.27:0),5.53,center[2]+(axis==='x'?.27:0)],.055,M.timberDark);
    beam('house-clock-hand',center,[center[0],5.72,center[2]],.045,M.timberDark);
  }
  box('roof-clock-eave',tx,6.15,tz,2.68,.16,2.68,M.timberDark);
  cylinder('roof-clock-spire',tx,7.15,tz,2.02,1.95,M.blueRoof,4,root,true,0).rotation.y=Math.PI/4;
  ball('roof-clock-finial',tx,8.24,tz,.16,M.gold);
  beam('roof-clock-weather-vane',[tx,8.15,tz],[tx,8.9,tz],.055,M.iron);
  beam('roof-clock-weather-arrow',[tx-.48,8.72,tz],[tx+.48,8.72,tz],.06,M.gold);
  obstacle(tx,tz,1.7);reserve(tx,tz,2.2);

  function marketStall(x,z,rotation,shade,stock){
    const n=node('market-quarter-stall',x,0,z);n.rotation.y=rotation;
    for(const xx of [-1.55,1.55])for(const zz of [-.85,.85])cylinder('stall-post',xx,1.32,zz,.075,2.64,M.timber,6,n);
    beam('stall-front-brace',[-1.55,2.3,-.85],[-.95,2.65,-.85],.09,M.timber,n);
    beam('stall-front-brace',[1.55,2.3,-.85],[.95,2.65,-.85],.09,M.timber,n);
    for(let j=0;j<7;j++){
      const material=j%2?M.cloth:shade,cloth=box('market-awning',-1.5+j*.50,2.72,0,.50,.09,2.15,material,n);cloth.rotation.x=.11;
      box('market-awning-valance',-1.5+j*.50,2.57,-1.05,.49,.29,.055,material,n);
    }
    box('market-table',0,.91,-.10,3.0,.14,1.32,M.timberLight,n);
    for(const side of [-1,1])box('table-leg',side*1.18,.44,-.1,.13,.88,1.04,M.timber,n);
    for(let j=0;j<3;j++){
      const xx=-.92+j*.92;box('market-stock-tray',xx,1.03,-.1,.84,.15,1.15,M.timber,n);
      for(let k=0;k<6;k++)ball('market-produce',xx+(k%2-.5)*.28,1.17+(k%3===0?.08:0),-.45+Math.floor(k/2)*.30,.15,stock[(j+k)%stock.length],n,true,[1,stock.length===1?.65:1,1]);
    }
    reserve(x,z,2.0);obstacle(x,z,1.35);
  }
  marketStall(-23.1,2.8,-Math.PI/2,M.leaf,[M.red,M.gold,M.green]);
  marketStall(-22.8,7.1,-Math.PI/2,M.townSlate,[M.cream]);
  marketStall(-16.9,4.5,Math.PI/2,M.awning,[M.lavender,M.pink,M.cream]);
  crate(-24.1,5.0,.68);crate(-24.2,5.75,.56);barrel(-16.5,6.6,.8);barrel(-22.7,9.1,.65);

  // A carved sun monument and small green courts give the larger streets
  // destinations of their own, while leaving the center of each square open.
  const sx=20.9,sz=4.1;
  box('house-monument-step',sx,.12,sz,1.8,.24,1.8,M.brickLight);
  box('house-monument-pedestal',sx,.7,sz,1.2,.92,1.2,M.brick);
  box('house-monument-cap',sx,1.21,sz,1.45,.16,1.45,M.brickLight);
  cylinder('house-monument-column',sx,2.0,sz,.36,1.5,M.brickLight,8);
  const sun=ball('house-monument-sun',sx,2.95,sz,.63,M.gold,root,true,[1,1,.30]);
  for(let j=0;j<8;j++){
    const a=j*Math.PI/4;beam('house-monument-sun-ray',[sx+Math.sin(a)*.67,2.95+Math.cos(a)*.67,sz],[sx+Math.sin(a)*.91,2.95+Math.cos(a)*.91,sz],.10,M.gold);
  }
  obstacle(sx,sz,.85);reserve(sx,sz,1.2);
  bench(16.5,8.7,0);bench(-17.1,8.6,0);bench(2.4,16.6,-Math.PI/2);
  for(const [x,z,s] of [[-24.9,-.5,.92],[-15.5,8.7,.9],[-23.9,10.1,.92],[17.0,-2.0,1.0],[24.9,6.5,.95],[17.2,16.2,1.05],[2.7,17.6,.95],[11.2,16.5,.95]])lantern(x,z,s);

  // Varied pocket planting preserves visibly grassy breaks between quarters.
  for(const [x,z,w] of [[-24.3,13.3,2.5],[24.8,12,2.0],[-18.5,17.0,2.7],[20.7,20.4,3.0],[4.2,23.8,2.0]]){
    box('house-garden-bed',x,.12,z,w,.24,.75,M.brickLight);
    box('house-garden-soil',x,.25,z,w-.18,.025,.57,M.earth);
    for(let j=0;j<7;j++){
      const px=x+(j-3)*w/8;shrub(px,z,.26+(j%3)*.04);
      flower(px,z-.22,[M.cream,M.pink,M.lavender][j%3],.70+(j%2)*.16);
    }
  }
  fence(-21.4,17.1,5.8);fence(25.7,15.2,5.4,Math.PI/2);
  return {
    landmarks:TOWN_PLAN.landmarks.map(item=>({...item})),footprints,
    contains:(x,z,pad=0)=>inTownPaving(x,z,pad)||footprints.some(p=>Math.hypot(x-p.x,z-p.z)<p.r+pad)
  };
}
