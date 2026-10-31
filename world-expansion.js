/* Authored frontier clearings: solid scenery, stable encounters and readable silhouettes. */
export const EXPANSION_BOUNDS=Object.freeze({minX:-64,maxX:64,minZ:-54,maxZ:70});

export const CAMP_LAYOUT=Object.freeze([
  {id:'cinderwatch',name:'Cinderwatch Quarry',x:-43,z:-36,radius:10,description:'Ember-lit quarry · a stolen supply cache',chestId:'camp-cinderwatch-cache',chest:{x:-41,z:-35}},
  {id:'thornhide',name:'Thornhide Stockade',x:46,z:-9,radius:10,description:'Timber barricades · the wolf pack’s den',chestId:'camp-thornhide-cache',chest:{x:46,z:-7}},
  {id:'moonshard',name:'Moonshard Ruins',x:-43,z:40,radius:10,description:'Broken arches · a crystal-bound sentry',chestId:'camp-moonshard-cache',chest:{x:-45,z:40}}
]);

export const EXPANSION_LANDMARKS=Object.freeze([
  {id:'sunwheel',name:'Sunwheel Mill',x:18,z:-43,radius:7,type:'mill',description:'Turning linen sails above the golden fields'},
  {id:'three-sisters',name:'The Three Sisters',x:-12,z:60,radius:7,type:'stones',description:'Three ancient standing stones beneath a ring of flowers'},
  {id:'sentinel',name:'Sentinel Bell',x:47,z:43,radius:7,type:'tower',description:'A blue-roofed watchtower overlooking the far meadow'},
  {id:'wayfarer',name:'Wayfarer’s Rest',x:-53,z:14,radius:5,type:'wagon',description:'A painted caravan at the edge of the orchard'}
]);

export const EXPANSION_ROUTES=Object.freeze([
  {p:[[-27,-22],[-32,-28],[-37,-33],[-43,-36]],w:2.5},
  {p:[[26,-5],[33,-7],[39,-11],[46,-9]],w:2.5},
  {p:[[-30,22],[-37,28],[-40,34],[-43,40]],w:2.4},
  {p:[[0,-32],[5,-38],[11,-40],[18,-43]],w:2.3},
  {p:[[0,43],[-5,49],[-11,54],[-12,60]],w:2.15},
  {p:[[30,28],[37,32],[40,39],[47,43]],w:2.15},
  {p:[[-30,22],[-38,20],[-45,16],[-53,14]],w:2.1},
  {p:[[-43,40],[-36,47],[-24,51],[-12,60]],w:1.8},
  {p:[[47,43],[40,52],[24,58],[8,58],[-12,60]],w:1.8}
]);

export function expansionReservedAreas(){
  return [...CAMP_LAYOUT,...EXPANSION_LANDMARKS].map(({x,z,radius})=>[x,z,radius+1.2]);
}

export function expansionSpawnPoints(){
  return [
    [-44,-36,'golem',3,'cinderwatch'],[-39.8,-39.5,'slime',2,'cinderwatch'],[-47,-34,'mushroom',2,'cinderwatch'],[-43,-32.7,'wolf',2,'cinderwatch'],
    [43,-7,'wolf',2,'thornhide'],[44,-12,'wolf',2,'thornhide'],[49,-9,'mushroom',2,'thornhide'],[47,-12,'slime',2,'thornhide'],
    [-42,38,'golem',3,'moonshard'],[-46,37,'mushroom',3,'moonshard'],[-40,42,'slime',3,'moonshard'],[-43,44,'wolf',3,'moonshard'],
    [-51,23,'wolf',2,null],[35,51,'mushroom',2,null],[-22,54,'wolf',3,null],[42,-41,'slime',2,null]
  ].map(([x,z,kind,level,campId])=>({x,z,kind,level,...campId?{campId}:{}}));
}

/** Primitives belong to createWorld: their materials, paint, batching and disposal stay shared. */
export function buildWorldExpansion(api){
  const {B,scene,root,M,box,cylinder,ball,torus,beam,rock,shrub,flower,grassTuft,fern,barrel,chest,obstacle}=api;
  const moving=[], rotors=[];
  let seed=784053;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
  const range=(a,b)=>a+(b-a)*random();
  const node=(name,x,y,z)=>{const n=new B.TransformNode(name,scene);n.parent=root;n.position.set(x,y,z);return n;};
  const slab=(name,x,z,r,material,stretch=1,y=.032)=>{
    const m=cylinder('expansion-'+name,x,y,z,r,.045,material,32);m.scaling.z=stretch;m.metadata={...m.metadata,castsShadow:false};
    if(/quarry|stockade|moon-court|moon-paving/.test(name)){
      const p=m.getVerticesData(B.VertexBuffer.PositionKind);
      if(p){for(let i=0;i<p.length;i+=3){const a=Math.atan2(p[i+2],p[i]),k=1+.027*Math.sin(a*5+.7)+.018*Math.cos(a*9-1.2);p[i]*=k;p[i+2]*=k;}m.setVerticesData(B.VertexBuffer.PositionKind,p);}
    }
    return m;
  };
  // Cut-back corners and uneven bevels keep quarry blocks solid without the
  // perfectly square silhouette of an unworked box. Footprints stay unchanged.
  function chippedBlock(mesh,w,h,d,variant){
    const hx=w/2,hy=h/2,hz=d/2,b=Math.min(w,h,d)*(.10+(variant%3)*.015),rings=[];
    for(let level=0;level<4;level++){
      const inset=level===0||level===3?b*.65:0,xx=hx-inset,zz=hz-inset;
      const yy=[-hy,-hy+b,hy-b,hy][level],cut=b*(1.0+(variant%2)*.3);
      rings.push([[-xx+cut,-zz],[xx-cut,-zz],[xx,-zz+cut],[xx,zz-cut],[xx-cut,zz],[-xx+cut,zz],[-xx,zz-cut],[-xx,-zz+cut]].map(([x,z],i)=>[x,yy+(level>1?Math.sin(i*1.7+variant)*b*.16:0),z]));
    }
    const positions=[],indices=[],uvs=[];
    function face(points){
      const a=new B.Vector3(...points[0]),v=new B.Vector3(...points[1]).subtract(a),u=new B.Vector3(...points[2]).subtract(a);
      const center=points.reduce((sum,p)=>sum.add(new B.Vector3(...p)),B.Vector3.Zero());
      if(B.Vector3.Dot(B.Vector3.Cross(v,u),center)>0)points.reverse();
      const start=positions.length/3;
      for(const p of points){positions.push(...p);uvs.push(0,0);}
      for(let i=1;i<points.length-1;i++)indices.push(start,start+i,start+i+1);
    }
    face([...rings[0]]);face([...rings[3]]);
    for(let k=0;k<3;k++)for(let i=0;i<8;i++){const j=(i+1)%8;face([rings[k][i],rings[k][j],rings[k+1][j],rings[k+1][i]]);}
    const normals=[];B.VertexData.ComputeNormals(positions,indices,normals);
    const data=new B.VertexData();Object.assign(data,{positions,indices,normals,uvs});data.applyToMesh(mesh);
    return mesh;
  }
  function crate(x,z,s=1){
    box('expansion-supply-crate',x,.45*s,z,1.0*s,.9*s,1.0*s,M.campTimber);
    for(const zz of [-.53,.53]){
      for(const y of [.15,.75])box('expansion-crate-rim',x,y*s,z+zz*s,1.08*s,.11*s,.07*s,M.campTimberDark);
      beam('expansion-crate-brace',[x-.4*s,.15*s,z+zz*s],[x+.4*s,.75*s,z+zz*s],.1*s,M.campTimber);
      for(const dx of [-.42,.42])for(const yy of [.15,.75])ball('expansion-crate-nail',x+dx*s,yy*s,z+(zz+Math.sign(zz)*.04)*s,.035*s,M.campIron,root,true,[1,1,.4]);
    }
  }
  function banner(x,z,cloth=M.campCanvasRed,height=4.5,mark=M.cream){
    cylinder('expansion-banner-mast',x,height*.5,z,.085,height,M.campTimberDark,7);
    beam('expansion-banner-crossbar',[x-.12,height-.15,z],[x+1.5,height-.15,z],.10,M.campTimber);
    box('expansion-banner-cloth',x+.68,height-1.0,z,.98,1.65,.045,cloth);
    box('expansion-banner-mark',x+.68,height-1.0,z-.035,.14,.70,.035,mark).rotation.z=.55;
    box('expansion-banner-mark',x+.68,height-1.0,z+.035,.14,.70,.035,mark).rotation.z=.55;
    cylinder('expansion-banner-finial',x,height+.12,z,.14,.28,M.campIron,5,root,true,.025);
    obstacle(x,z,.18);
  }
  function fire(x,z,s=1){
    slab('charcoal-ring',x,z,.9*s,M.campAsh,1,.09);
    for(let j=0;j<9;j++){const a=j*Math.PI*2/9;ball('expansion-fire-stone',x+Math.sin(a)*.9*s,.14*s,z+Math.cos(a)*.9*s,.23*s,M.campSlate,root,true,[1,.7,1]);}
    for(const angle of [.6,-.6]){const log=cylinder('expansion-fire-log',x,.20*s,z,.16*s,1.4*s,M.campTimberDark,7);log.rotation.z=Math.PI/2;log.rotation.y=angle;}
    for(let j=0;j<3;j++){
      const flame=ball('expansion-fire-flame',x+(j-1)*.23*s,(.50+j*.08)*s,z+(j%2)*.15*s,.30*s,j===1?M.flame:M.gold,root,false,[.7,1.5,.7]);
      moving.push({kind:'fire',mesh:flame,baseY:flame.position.y,scale:flame.scaling.clone(),phase:j*2.3});
    }
    obstacle(x,z,.9*s);
  }
  function tent(x,z,w,d,cloth,angle=0){
    const n=node('expansion-canvas-shelter',x,0,z);n.rotation.y=angle;
    const rise=w*.72,slope=Math.hypot(w*.5,rise);
    for(const side of [-1,1]){
      const panel=box('expansion-tent-canvas',side*w*.25,rise*.5,0,slope,.07,d,cloth,n);panel.rotation.z=-side*Math.atan2(rise,w*.5);
      for(const zz of [-d*.5,d*.5])beam('expansion-tent-seam',[side*w*.5,.04,zz],[0,rise,zz],.055,M.campCanvasCream,n);
      for(const zz of [-d*.32,d*.32]){
        beam('expansion-tent-binding',[side*w*.51,.04,zz],[0,rise+.035,zz],.035,M.campRope,n);
        beam('expansion-tent-guy',[side*w*.48,.20,zz],[side*w*.70,.045,zz-.20],.025,M.campRope,n);
        cylinder('expansion-tent-peg',side*w*.70,.11,zz-.20,.045,.22,M.campTimberDark,5,n);
      }
    }
    beam('expansion-tent-ridge',[0,rise,-d*.55],[0,rise,d*.55],.10,M.campTimber,n);
    for(const zz of [-d*.53,d*.53])cylinder('expansion-tent-pole',0,rise*.5,zz,.07,rise+.3,M.campTimber,6,n);
    box('expansion-tent-bedroll',0,.09,.25,w*.48,.15,d*.70,M.campCanvasGreen,n);
    obstacle(x,z,Math.max(w,d)*.48);
  }
  function stoneRune(x,y,z,m=M.rune,scale=1){
    const runes=[[0,.18,0,.42],[-.14,-.05,.36,.065],[.14,-.15,.065,.25]];
    for(const [dx,dy,w,h] of runes)box('expansion-rune-inlay',x+dx*scale,y+dy*scale,z,(w||.06)*scale,h*scale,.025,m);
  }

  // A mining site is defined by hard slate terraces, rust earth and a tall timber hoist.
  {
    const {x,z}=CAMP_LAYOUT[0];
    // The workyard is seated into the meadow by buildCampTerrain.
    for(let j=0;j<9;j++){
      const a=-1.9+j*.24,bx=x+Math.sin(a)*8.7,bz=z+Math.cos(a)*7.8;
      const h=1.4+(j%3)*.54,face=chippedBlock(box('expansion-quarry-scarp',bx,h*.5,bz,2.7,h,2.1,M.campSlate),2.7,h,2.1,j);face.rotation.y=-a+.09*Math.sin(j);
      chippedBlock(box('expansion-quarry-cut-face',bx,h+.05,bz,2.5,.12,1.9,M.campSlateLight),2.5,.12,1.9,j).rotation.y=face.rotation.y;
      const ledge=node('expansion-quarry-strata',bx,0,bz);ledge.rotation.y=face.rotation.y;
      for(let k=0;k<2;k++)box('expansion-quarry-split-layer',.10*(j%3-1),h*(.28+k*.37),-1.045,2.35-(j+k)%3*.21,.07,.12,M.campSlateLight,ledge);
      obstacle(bx,bz,1.25);
      if(j%2===0)rock(bx+.5,bz-.8,.6,M.campSlate,false);
    }
    const hx=x-5.5,hz=z-5;
    for(const dx of [-.8,.8])beam('expansion-hoist-leg',[hx+dx,.05,hz],[hx,6.2,hz],.28,M.campTimberDark);
    beam('expansion-hoist-boom',[hx,5.8,hz],[hx+5.0,6.5,hz],.32,M.campTimber);
    beam('expansion-hoist-brace',[hx,3.8,hz],[hx+3,6.2,hz],.18,M.campTimber);
    for(const y of [.65,2.75,5.45])for(const side of [-1,1]){
      const strap=box('expansion-hoist-iron-strap',hx+side*.8*(1-(y-.05)/6.15),y,hz,.32,.14,.32,M.campIron);
      strap.rotation.z=side*Math.atan(.8/6.15);
    }
    cylinder('expansion-hoist-rope',hx+4.7,4.5,hz,.035,3.9,M.campRope,5);
    const hook=torus('expansion-hoist-hook',hx+4.7,2.5,hz,.24,.07,M.campIron);hook.rotation.x=Math.PI/2;
    const pulley=torus('expansion-hoist-pulley',hx+4.65,6.35,hz,.25,.09,M.campIron);pulley.rotation.x=Math.PI/2;
    obstacle(hx,hz,1.0);
    for(const dx of [-.5,.5])box('expansion-quarry-rail',x+4+dx,.10,z+2,.07,.13,5.5,M.campIron);
    for(let j=0;j<9;j++)box('expansion-quarry-sleeper',x+4,.06,z-.5+j*.6,1.5,.09,.16,M.campTimberDark);
    box('expansion-ore-cart',x+4,.68,z+3,1.4,.7,1.9,M.campTimber);
    for(const dx of [-.71,.71]){
      box('expansion-cart-rim',x+4+dx,1.03,z+3,.10,.13,2.04,M.campIron);
      for(const dz of [-.75,.75])box('expansion-cart-brace',x+4+dx,.68,z+3+dz,.05,.65,.13,M.campIron);
    }
    for(const dx of [-.82,.82])for(const dz of [-.65,.65]){const wheel=cylinder('expansion-cart-wheel',x+4+dx,.35,z+3+dz,.32,.12,M.campIron,9);wheel.rotation.z=Math.PI/2;}
    for(let j=0;j<5;j++)ball('expansion-cart-ore',x+3.6+(j%2)*.55,1.08,z+2.5+Math.floor(j/2)*.45,.34,j%2?M.campSlate:M.gold,root,true,[1,.75,1]);
    obstacle(x+4,z+3,1.15);
    tent(x-1,z+5.8,3.3,3.5,M.campCanvasRed,-.15);banner(x+6.3,z-3.5,M.campCanvasRed,5.2);fire(x+1.5,z-3.2,.85);
    crate(x-6,z+.5,.92);barrel(x-5.7,z+1.6,.85);crate(x+5.7,z+5.2,.76);
    for(let j=0;j<42;j++){
      const a=j*2.399,r=3.5+random()*5.6;
      ball('expansion-quarry-chippings',x+Math.sin(a)*r,.10,z+Math.cos(a)*r,.045+random()*.065,j%3?M.campSlateLight:M.campSlate,root,true,[1.5,.40,1]);
    }
  }

  // The pack's stockade has a wide west entrance, split log palisades and green canvas.
  {
    const {x,z}=CAMP_LAYOUT[1];
    // Uneven trampled earth and grass margins are authored by buildCampTerrain.
    for(let j=0;j<42;j++){
      const a=j*Math.PI*2/42,dx=Math.sin(a)*8.4,dz=Math.cos(a)*8.1;
      if(dx<-5.9&&Math.abs(dz)<4.5||dx>6.8&&Math.abs(dz)<2.9)continue;
      const h=2.1+random()*.8;
      cylinder('expansion-palisade-log',x+dx,h*.46,z+dz,.24,h*.92,j%4?M.campTimber:M.campTimberDark,7);
      cylinder('expansion-palisade-point',x+dx,h+.20,z+dz,.25,.56,M.campLogEnds,7,root,true,0);
      if(j%3===0)for(const yy of [.75,1.45])torus('expansion-palisade-binding',x+dx,yy,z+dz,.25,.035,M.campRope);
      obstacle(x+dx,z+dz,.34);
      if(j%5===0)shrub(x+dx*1.14,z+dz*1.14,.70,false);
    }
    for(const dz of [-4.2,4.2]){
      const px=x-7.0,pz=z+dz;
      cylinder('expansion-stockade-gatepost',px,1.8,pz,.44,3.6,M.campTimberDark,8,root,true,.30);
      ball('expansion-stockade-bone-cap',px,3.67,pz,.43,M.cream,root,true,[1,.7,.7]);obstacle(px,pz,.52);
      for(const s of [-1,1]){const horn=cylinder('expansion-stockade-horn',px+s*.37,3.95,pz,.13,.66,M.cream,5,root,true,0);horn.rotation.z=-s*.50;}
    }
    tent(x+1.1,z+5.2,3.6,3.2,M.campCanvasGreen,.2);tent(x+5.1,z+2.3,2.8,2.5,M.campCanvasCream,-.3);
    fire(x+.6,z-.4,.80);banner(x-3.4,z+4.7,M.campCanvasRed,4.5);
    for(let row=0;row<2;row++)for(let j=0;j<3-row;j++){
      const log=cylinder('expansion-stockade-timber',x+4.9+(j-row*.5)*.42,.28+row*.38,z-5.2,.23,2.6,M.campTimber,8);log.rotation.x=Math.PI/2;
      cylinder('expansion-log-cut',x+4.9+(j-row*.5)*.42,.28+row*.38,z-6.52,.21,.035,M.campLogEnds,8).rotation.x=Math.PI/2;
    }
    obstacle(x+5.4,z-5.2,1.1);crate(x-4.2,z-5.3);barrel(x-3,z-5.8,.9);
  }

  // A shallow, traversable ruin rather than another tent circle: arches frame the moon crystal.
  {
    const {x,z}=CAMP_LAYOUT[2];
    // Broken paving and grass encroachment are authored by buildCampTerrain.
    for(let j=0;j<30;j++){
      const a=j*2.399,r=2.8+random()*4.7;
      const tile=box('expansion-moon-broken-slab',x+Math.sin(a)*r,.12,z+Math.cos(a)*r,range(.7,1.2),.09,range(.55,.95),j%4?M.campRuins:M.moss);tile.rotation.y=a*.4;
    }
    for(const dx of [-5.7,5.7]){
      const pz=z+4.3;
      for(let tier=0;tier<4;tier++)box('expansion-moon-arch-pier',x+dx,.48+tier*.85,pz,1.12,.80,1.2,M.campRuins);
      box('expansion-moon-arch-capital',x+dx,3.86,pz,1.55,.35,1.55,M.campSlate);
      stoneRune(x+dx,2.15,pz-.615,M.rune,.8);
      obstacle(x+dx,pz,.85);
    }
    for(let j=0;j<5;j++){
      const xx=x-4.6+j*1.1,yy=4.0+Math.sin((j+1)/6*Math.PI)*.85;
      box('expansion-moon-broken-arch',xx,yy,z+4.3,1.08,.65,1.0,M.campRuins).rotation.z=.25-j*.10;
    }
    for(const [dx,dz,h] of [[-6,-2,2.2],[5.5,-2.5,1.6],[.5,7.1,1.1]]){
      cylinder('expansion-moon-column-base',x+dx,.25,z+dz,.9,.5,M.campSlate,8);
      cylinder('expansion-moon-column',x+dx,h*.5+.45,z+dz,.55,h,M.campRuins,8);
      box('expansion-moon-column-chip',x+dx+.1,h+.47,z+dz,.7,.18,.7,M.campSlateLight).rotation.z=.12;
      obstacle(x+dx,z+dz,.85);
    }
    const cx=x-2,cz=z+5;
    cylinder('expansion-moon-altar',cx,.35,cz,1.25,.7,M.campRuins,6);
    const shard=ball('expansion-moon-heart',cx,2.65,cz,1.02,M.purple,root,false,[.65,1.95,.65]);
    moving.push({kind:'shard',mesh:shard,baseY:2.65,phase:.7});obstacle(cx,cz,1.3);
    for(let j=0;j<4;j++){
      const a=j*Math.PI/2,bx=cx+Math.sin(a)*1.7,bz=cz+Math.cos(a)*1.7;
      const m=ball('expansion-moon-satellite',bx,.85,bz,.32,M.crystal,root,false,[.55,1.8,.55]);moving.push({kind:'shard',mesh:m,baseY:.85,phase:j*1.5});
    }
    const ring=torus('expansion-moon-rune-ring',cx,.15,cz,2.3,.055,M.rune);
    for(let j=0;j<8;j++){const a=j*Math.PI/4;box('expansion-moon-rune-floor',cx+Math.sin(a)*2.8,.14,cz+Math.cos(a)*2.8,.12,.045,.43,M.rune).rotation.y=a;}
    banner(x+6.5,z+1.2,M.campCanvasGreen,4.1,M.crystal);
    for(let j=0;j<9;j++){const a=j*2.4;fern(x+Math.sin(a)*8.1,z+Math.cos(a)*8.1,1.15);flower(x+Math.sin(a)*8.5,z+Math.cos(a)*8.5,M.lavender,1.2);}
  }

  // Sunwheel Mill: one moving cross of linen sails and a small wheat enclosure.
  {
    const {x,z}=EXPANSION_LANDMARKS[0];
    slab('mill-courtyard',x,z,5.2,M.dirt,.92);
    cylinder('expansion-mill-foot',x,.24,z,2.25,.48,M.brick,12);
    cylinder('expansion-mill-tower',x,3.35,z,1.95,6.25,M.wall,12,root,true,1.4);
    for(const y of [.6,2.25,4.15,6.35])torus('expansion-mill-timber-band',x,y,z,1.95-y*.075,.11,M.timberDark);
    cylinder('expansion-mill-roof',x,7.14,z,1.85,1.7,M.roof,12,root,true,.04);
    box('expansion-mill-door',x,.91,z-1.94,.95,1.82,.12,M.timberDark);
    for(const yy of [3.0,5.0]){box('expansion-mill-window',x,yy,z-1.73,.55,.68,.10,M.townSlate);box('expansion-mill-window-bar',x,yy,z-1.80,.055,.70,.04,M.cream);}
    obstacle(x,z,2.15);
    const rotor=node('expansion-mill-sails',x,5.6,z-2.0);rotors.push(rotor);
    cylinder('expansion-mill-axle',0,0,0,.28,.45,M.timberDark,10,rotor,false).rotation.x=Math.PI/2;
    for(let j=0;j<4;j++){
      const arm=new B.TransformNode('expansion-mill-arm',scene);arm.parent=rotor;arm.rotation.z=j*Math.PI/2;
      box('expansion-mill-spoke',0,1.9,0,.15,4.1,.12,M.timberDark,arm,false);
      box('expansion-mill-linen-sail',.45,2.5,.015,.95,2.45,.065,M.cloth,arm,false);
      for(let k=0;k<5;k++)box('expansion-mill-sail-rib',.44,1.42+k*.53,-.035,.99,.065,.055,M.timberLight,arm,false);
    }
    for(const dx of [-3.1,3.1]){barrel(x+dx,z+1.4,.9);crate(x+dx,z+.2,.8);}
    for(let j=0;j<80;j++){
      const bx=x+range(-4.5,4.5),bz=z+range(3.1,5.7);
      cylinder('expansion-wheat-stem',bx,.45,bz,.022,.9,M.goldLeaf,4);
      ball('expansion-wheat-head',bx,.95,bz,.11,M.goldLeafLight,root,true,[.6,2.4,.6]);
    }
  }

  // Three uneven monoliths, rather than an enclosed arena, leave open walking lanes.
  {
    const {x,z}=EXPANSION_LANDMARKS[1];
    slab('sisters-lawn',x,z,6.2,M.grassDark,.88);
    for(const [dx,dz,h,w,tilt] of [[-3.1,1.0,5.2,1.5,-.11],[0,2.8,7.1,1.9,.045],[3.2,.4,4.1,1.45,.15]]){
      const stone=box('expansion-sister-standing-stone',x+dx,h*.5,z+dz,w,h,w*.74,M.stone);stone.rotation.z=tilt;stone.rotation.y=dx*.07;
      const cap=ball('expansion-sister-stone-crown',x+dx-Math.sin(tilt)*h*.5,h-.10,z+dz,w*.55,M.stoneLight,root,true,[1,.36,.82]);cap.rotation.y=dx*.07;
      stoneRune(x+dx,2.4,z+dz-w*.39,M.teal,1.6);
      obstacle(x+dx,z+dz,w*.74);
      ball('expansion-sister-root-moss',x+dx-.35,.14,z+dz+.3,w*.65,M.moss,root,true,[1,.25,.8]);
    }
    for(let j=0;j<44;j++){const a=j*2.399,r=4.8+(j%3)*.38;flower(x+Math.sin(a)*r,z+Math.cos(a)*r,M.lavender,1.2+(j%4)*.15);if(j%3===0)grassTuft(x+Math.sin(a)*(r+.5),z+Math.cos(a)*(r+.5),1.2);}
    chest('landmark-three-sisters-cache',x+2.2,z-2.1,true);
  }

  // A tall silhouette with an open lower gallery; paths run up to its western stairs.
  {
    const {x,z}=EXPANSION_LANDMARKS[2];
    slab('sentinel-yard',x,z,5.9,M.path,.90);
    cylinder('expansion-sentinel-foot',x,.25,z,2.2,.5,M.brick,8);
    for(const dx of [-1.3,1.3])for(const dz of [-1.3,1.3]){
      box('expansion-sentinel-leg',x+dx,3.0,z+dz,.38,6.0,.38,M.timberDark);
      obstacle(x+dx,z+dz,.35);
    }
    for(const dz of [-1.3,1.3]){
      beam('expansion-sentinel-brace',[x-1.3,.65,z+dz],[x+1.3,3.8,z+dz],.18,M.timber);
      beam('expansion-sentinel-brace',[x+1.3,.65,z+dz],[x-1.3,3.8,z+dz],.18,M.timber);
    }
    box('expansion-sentinel-deck',x,4.3,z,3.6,.24,3.6,M.timberLight);
    for(const side of [-1,1]){
      box('expansion-sentinel-rail',x+side*1.7,5.0,z,.09,.9,3.5,M.timber);
      box('expansion-sentinel-rail',x,5.0,z+side*1.7,3.5,.9,.09,M.timber);
    }
    cylinder('expansion-sentinel-roof',x,6.7,z,2.65,1.55,M.blueRoof,4,root,true,.08).rotation.y=Math.PI/4;
    box('expansion-bell-crossbeam',x,5.95,z,2.8,.18,.18,M.timberDark);
    const bell=cylinder('expansion-sentinel-bell',x,5.4,z,.48,.82,M.gold,12,root,true,.20);torus('expansion-bell-lip',x,5.0,z,.48,.08,M.gold);
    cylinder('expansion-bell-rope',x,3.1,z-.1,.025,4.3,M.woodDark,5);
    banner(x-3.8,z+1.8,M.blueRoof,4.8,M.gold);
    for(let j=0;j<5;j++)box('expansion-sentinel-step',x-2.6+j*.28,.08+j*.09,z,1.0,.16+j*.18,1.15,M.brickLight);
    for(const dz of [-3.7,3.7])shrub(x+2.7,z+dz,.85,true);
    chest('landmark-sentinel-cache',x+3,z-2.7);
  }

  // A little roadside caravan gives the far western orchard a warm, inhabited contrast.
  {
    const {x,z}=EXPANSION_LANDMARKS[3];
    slab('caravan-clearing',x,z,4.7,M.dirt,.9);
    box('expansion-caravan-bed',x,.9,z,2.4,.45,4.0,M.timberDark);
    box('expansion-caravan-body',x,1.55,z,2.25,1.25,3.8,M.blueRoof);
    for(const dx of [-1.3,1.3])for(const dz of [-1.35,1.35]){
      const wheel=torus('expansion-caravan-wheel',x+dx,.62,z+dz,.62,.14,M.woodDark);wheel.rotation.z=Math.PI/2;
      for(const angle of [0,Math.PI/3,Math.PI*2/3]){const spoke=box('expansion-caravan-spoke',x+dx,.62,z+dz,.08,1.12,.06,M.woodLight);spoke.rotation.x=angle;}
    }
    for(let j=0;j<10;j++){
      const a=-Math.PI/2+j*Math.PI/9,xx=x+Math.sin(a)*1.3,yy=2.1+Math.cos(a)*1.2;
      const slat=box('expansion-caravan-rounded-roof',xx,yy,z,.43,.065,4.15,j%2?M.cloth:M.blueRoof);slat.rotation.z=-a;
    }
    box('expansion-caravan-door',x,1.62,z-1.94,.85,1.25,.10,M.timber);
    box('expansion-caravan-step',x,.36,z-2.2,1.15,.20,.5,M.timberLight);
    for(const side of [-1,1])beam('expansion-caravan-shaft',[x+side*.6,.58,z-1.8],[x+side*.6,.32,z-3.5],.10,M.woodDark);
    obstacle(x,z,1.8);barrel(x+2,z+.5,.85);crate(x+2.1,z-.7,.8);
    flower(x-2.2,z-1.4,M.pink,1.5);flower(x-2.0,z-.8,M.lavender,1.5);shrub(x-2.6,z+1.4,.75,true);
    chest('landmark-wayfarer-cache',x+2.1,z-2.5);
  }

  for(const camp of CAMP_LAYOUT)chest(camp.chestId,camp.chest.x,camp.chest.z,camp.id==='moonshard');
  return {
    camps:CAMP_LAYOUT.map(c=>({...c,chest:{...c.chest}})),
    landmarks:EXPANSION_LANDMARKS.map(l=>({...l})),
    spawnPoints:expansionSpawnPoints(),
    update(dt,t){
      for(const rotor of rotors)if(!rotor.isDisposed())rotor.rotation.z=t*.18;
      for(const a of moving){
        if(a.mesh.isDisposed())continue;
        if(a.kind==='fire'){
          a.mesh.position.y=a.baseY+Math.sin(t*7.4+a.phase)*.055;
          a.mesh.scaling.set(a.scale.x*(1+Math.sin(t*6.2+a.phase)*.06),a.scale.y*(1+Math.sin(t*8.3+a.phase)*.13),a.scale.z);
        }else{a.mesh.position.y=a.baseY+Math.sin(t*1.5+a.phase)*.12;a.mesh.rotation.y=t*.32+a.phase;}
      }
    }
  };
}
