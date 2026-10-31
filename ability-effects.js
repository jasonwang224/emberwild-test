// Shared by the adventure and training clearing. These are visual timelines;
// gameplay damage is released exactly once by the held-weapon animation.
export const ABILITY_NAMES={knight:{skill:'Whirlwind',ultimate:'Dawnfall'},mage:{skill:'Frost bloom',ultimate:'Starfall'},ranger:{skill:'Triple volley',ultimate:'Arrow rain'}};
export const ABILITY_CUES={knight:{skill:'whirlwind',ultimate:'dawnfall'},mage:{skill:'frost-bloom',ultimate:'starfall'},ranger:{skill:'triple-volley',ultimate:'arrow-rain'}};
export const ABILITY_MAX_MESHES_PER_GROUP=96;
const clamp=n=>Math.max(0,Math.min(1,n));
export function createAbilityEffects(B,scene){
 const V=B.Vector3,groups=[];let disposed=false;
 function group(ability,phase,origin,duration){
  if(groups.length>=16)remove(groups[0]);
  const root=new B.TransformNode(ability+' '+phase,scene);root.position.copyFrom(origin);
  const g={root,ability,phase,time:0,duration,materials:[],render:null};groups.push(g);return g;
 }
 function remove(g){const i=groups.indexOf(g);if(i<0)return;groups.splice(i,1);g.root.dispose();g.materials.forEach(m=>m.dispose());}
 function material(g,color,alpha=1){const m=new B.StandardMaterial(g.ability+' glow',scene);m.diffuseColor=m.emissiveColor=B.Color3.FromHexString(color);m.disableLighting=true;m.backFaceCulling=false;m.alpha=alpha;g.materials.push(m);return m;}
 function attach(g,m,mat){m.parent=g.root;m.material=mat;m.isPickable=false;m.metadata={ability:g.ability,phase:g.phase};return m;}
 function ring(g,radius,mat,y=.12,width=.045){const m=attach(g,B.MeshBuilder.CreateTorus('ability halo',{diameter:radius*2,thickness:width,tessellation:radius<2?16:32},scene),mat);m.position.y=y;return m;}
 function crystal(g,mat,size=.3){return attach(g,B.MeshBuilder.CreateIcoSphere('ability crystal',{radius:size,subdivisions:1},scene),mat);}
 function beam(g,mat,height=3,width=.08){return attach(g,B.MeshBuilder.CreateCylinder('ability ray',{height,diameter:width,tessellation:6},scene),mat);}
 function arc(g,radius,span,mat,width=.48){const paths=[[],[]];for(let i=0;i<=32;i++){const a=-span/2+i/32*span;paths[0].push(new V(Math.sin(a)*radius,0,Math.cos(a)*radius));const r=radius+width*Math.sin(i/32*Math.PI);paths[1].push(new V(Math.sin(a)*r,0,Math.cos(a)*r));}return attach(g,B.MeshBuilder.CreateRibbon('sweeping ability crescent',{pathArray:paths,sideOrientation:B.Mesh.DOUBLESIDE},scene),mat);}
 function flash(g,radius,mat){
  const discs=[.55,1].map((scale,i)=>{const m=attach(g,B.MeshBuilder.CreateDisc('brief ground impact flash',{radius:radius*scale,tessellation:48,sideOrientation:B.Mesh.DOUBLESIDE},scene),mat);m.rotation.x=Math.PI/2;m.position.y=.10+i*.015;
   // Babylon's glow pass reads material.alpha, not mesh.visibility. These broad
   // translucent flashes share a material with bright sparks, so including them
   // in glow would leave an opaque luminous pool during their otherwise soft fade.
   const glows=(scene.effectLayers||[]).filter(layer=>layer instanceof B.GlowLayer);
   glows.forEach(layer=>layer.addExcludedMesh(m));m.onDisposeObservable.add(()=>glows.forEach(layer=>layer.removeExcludedMesh(m)));
   return m;});
  return p=>{for(let i=0;i<discs.length;i++){const q=clamp(p/(i?.24:.16)),s=.15+q*(i?.95:.8);discs[i].scaling.setAll(s);discs[i].visibility=(1-q)*(1-q)*(i?.22:.44);discs[i].setEnabled(q<1);}};
 }
 function debris(g,count,mat,{name='impact spark',radius=4,height=1.5,size=.16,start=0,leaf=false}={}){
  const pieces=Array.from({length:count},(_,i)=>{const m=leaf?arc(g,.17,Math.PI*1.35,mat,.16):crystal(g,mat,size*(.75+(i%3)*.2));m.name=name;m.metadata.detail='debris';return {m,a:i*2.399963,r:radius*(.62+(i%5)*.085),delay:start+(i%4)*.016,stretch:leaf?1:1+(i%3)*.6};});
  return p=>{for(const {m,a,r,delay,stretch} of pieces){const q=clamp((p-delay)/Math.max(.01,1-delay));m.setEnabled(p>=delay);const distance=.45+q*(r-.45),s=Math.max(.025,1-q);m.position.set(Math.sin(a+q*.3)*distance,.12+Math.sin(q*Math.PI)*height*(.7+(r%1)*.3),Math.cos(a+q*.3)*distance);m.rotation.set(q*8+a,q*6+a,leaf?Math.sin(q*12+a)*.7:q*9);m.scaling.set(s,stretch*s,s);m.visibility=(1-q)*.9;}};
 }
 function arrow(g,mat){const a=new B.TransformNode('falling spirit arrow',scene);a.parent=g.root;const shaft=attach(g,B.MeshBuilder.CreateCylinder('spirit arrow shaft',{height:1.2,diameter:.055,tessellation:5},scene),mat);shaft.parent=a;const head=attach(g,B.MeshBuilder.CreateCylinder('spirit arrow point',{height:.22,diameterTop:.2,diameterBottom:0,tessellation:4},scene),mat);head.parent=a;head.position.y=-.68;const fin=attach(g,B.MeshBuilder.CreateBox('spirit arrow feather',{width:.22,height:.23,depth:.045},scene),mat);fin.parent=a;fin.position.y=.45;return a;}
 function charge({heroClass,kind,root,center,windup=.3}){
  if(disposed||kind==='basic')return {cancel(){}};
  const name=ABILITY_CUES[heroClass][kind],ultimate=kind==='ultimate';
  const targeted=ultimate&&heroClass!=='knight',g=group(name,'charge',targeted?center:root.position,windup+.08);
  const color=heroClass==='knight'?'#ffe6a2':heroClass==='mage'?(ultimate?'#ffc9eb':'#b5f5ff'):'#d2f5a5',m=material(g,color,.62);
  const halo=ring(g,targeted?2.3:1.15,m,.14,.035),inner=ring(g,targeted?1.8:.87,m,.16,.025);
  const motes=Array.from({length:ultimate?8:5},(_,i)=>{const c=crystal(g,m,.09);return {c,a:i*Math.PI*2/(ultimate?8:5)};});
  const sky=targeted?Array.from({length:heroClass==='mage'?5:9},(_,i)=>({m:heroClass==='mage'?crystal(g,m,i?.24:.45):arrow(g,m),a:i*2.4,r:i?Math.sqrt(i/9)*3.5:0})):[];
  g.render=p=>{p=clamp(p*g.duration/windup);if(!targeted)g.root.position.copyFrom(root.position);const s=1.22-.25*p;halo.scaling.set(s,1,s);inner.scaling.set(.6+.4*p,1,.6+.4*p);inner.rotation.y=p*2;for(const {c,a} of motes){const r=(ultimate?1.9:1.1)*(1-.4*p);c.position.set(Math.cos(a+p*2)*r,.3+p*1.4,Math.sin(a+p*2)*r);c.scaling.setAll(.5+p);}for(const {m,a,r} of sky){m.position.set(Math.sin(a)*r,7*(1-p*p)+.7,Math.cos(a)*r);m.rotation.y=p*4;}m.alpha=.25+.5*p;};g.render(0);
  return {cancel:()=>remove(g)};
 }
 function release({heroClass,kind,origin,center=origin,facing=new V(0,0,1)}){
  if(disposed||kind==='basic')return;
  const name=ABILITY_CUES[heroClass][kind],ultimate=kind==='ultimate',targeted=ultimate&&heroClass!=='knight';
  const g=group(name,'impact',targeted?center:origin,ultimate?1.05:.68),yaw=Math.atan2(facing.x,facing.z);
  if(heroClass==='knight'&&!ultimate){
   const gold=material(g,'#ffd477',.9),white=material(g,'#fff0bc',.9),a=arc(g,2.4,Math.PI*1.55,gold,.85),b=arc(g,3.25,Math.PI*1.2,white,.65),c=arc(g,3.8,Math.PI*.85,gold,.42),h=ring(g,4.5,gold,.14,.16),inner=ring(g,3.35,white,.17,.10);
   const burst=flash(g,2.7,white),sparks=debris(g,18,gold,{name:'golden whirlwind spark',radius:4.45,height:1.65,size:.16});
   g.render=p=>{const s=.48+.52*clamp(p*2.1);a.position.y=.65+Math.sin(p*Math.PI)*.65;b.position.y=1.4-p*.8;c.position.y=.28+Math.sin(p*Math.PI)*.28;a.rotation.y=yaw+p*Math.PI*3.5;b.rotation.y=yaw+Math.PI+p*Math.PI*3.5;c.rotation.y=yaw-p*Math.PI*2;a.scaling.set(s,1,s);b.scaling.set(s,1,s);c.scaling.set(s,1,s);h.scaling.setAll(.22+.78*clamp(p*2));inner.scaling.setAll(.35+.65*clamp(p*2.5));h.visibility=1-p;burst(p);sparks(p);gold.alpha=(1-p)*.92;white.alpha=(1-p)*.84;};
  }else if(heroClass==='knight'){
   const gold=material(g,'#ffc765',.85),white=material(g,'#fff0b2',.9),halo=ring(g,7,gold,.15,.25),inner=ring(g,4.6,white,.17,.18),core=ring(g,2.1,gold,.19,.14);
   const rays=Array.from({length:12},(_,i)=>({m:beam(g,gold,2.8,.18),a:i*Math.PI/6}));
   const crescents=Array.from({length:3},(_,i)=>{const m=arc(g,5.9,Math.PI*.55,white,.7);m.position.y=.24;m.rotation.y=i*Math.PI*2/3;return m;});
   const burst=flash(g,4.1,white),sparks=debris(g,22,gold,{name:'dawnfall golden impact debris',radius:6.8,height:2.7,size:.21});
   const blade=attach(g,B.MeshBuilder.CreateBox('dawnfall luminous sword',{width:.35,height:4.2,depth:.12},scene),white);blade.position.y=2.5;
   const guard=attach(g,B.MeshBuilder.CreateBox('dawnfall luminous crossguard',{width:1.6,height:.2,depth:.2},scene),gold);guard.position.y=3.7;
   g.render=p=>{const s=.14+.86*Math.sin(Math.min(1,p*2.3)*Math.PI/2);halo.scaling.set(s,1,s);inner.scaling.set(.2+.8*clamp(p*3),1,.2+.8*clamp(p*3));core.scaling.setAll(.2+.8*clamp(p*4));blade.scaling.y=1-p*.7;blade.position.y=2.5-p*1.4;guard.position.y=3.7-p*2.3;for(const {m,a} of rays){m.position.set(Math.sin(a)*6*s,.2+Math.sin(p*Math.PI)*1.5,Math.cos(a)*6*s);m.scaling.y=.15+Math.sin(p*Math.PI)*.7;m.visibility=1-p;}for(let i=0;i<crescents.length;i++){crescents[i].scaling.set(s,1,s);crescents[i].rotation.y=i*Math.PI*2/3+p*.75;crescents[i].position.y=.25+Math.sin(p*Math.PI)*.5;}burst(p);sparks(p);gold.alpha=white.alpha=(1-p)*.9;};
  }else if(heroClass==='mage'&&!ultimate){
   const ice=material(g,'#b9f6ff',.85),violet=material(g,'#a7b8ff',.62),halo=ring(g,5.5,ice,.12,.18),inner=ring(g,3.6,violet,.15,.13);
   const petals=Array.from({length:14},(_,i)=>{const c=crystal(g,i%2?ice:violet,.48);c.scaling.set(.65,2.9,.65);return {c,a:i*Math.PI/7};});
   const snow=Array.from({length:6},(_,i)=>{const b=beam(g,ice,4.5,.10);b.rotation.z=Math.PI/2;b.rotation.y=i*Math.PI/3;return b;});
   const wisps=Array.from({length:3},(_,i)=>{const m=arc(g,3.5+i*.25,Math.PI*.9,i%2?ice:violet,.55);return m;});
   const burst=flash(g,3.3,ice),shards=debris(g,18,ice,{name:'frost bloom flying ice shard',radius:5.3,height:2.2,size:.17}),flakes=debris(g,8,violet,{name:'frost bloom snow wisp',radius:4.7,height:2.6,size:.12,start:.08,leaf:true});
   g.render=p=>{const r=.65+Math.sin(Math.min(1,p*1.7)*Math.PI/2)*4.35;halo.scaling.setAll(.15+.85*Math.min(1,p*2.4));inner.scaling.setAll(.2+.8*Math.min(1,p*3));for(const {c,a} of petals){c.position.set(Math.sin(a)*r,.2+Math.sin(p*Math.PI)*.9,Math.cos(a)*r);c.rotation.z=.45*Math.sin(a);c.scaling.y=.25+2.9*Math.sin(p*Math.PI);}for(const b of snow){b.position.y=.18;b.scaling.y=.2+p*1.8;}for(let i=0;i<wisps.length;i++){const w=wisps[i];w.rotation.y=i*2.1-p*4;w.position.y=.35+Math.sin(p*Math.PI)*(.9+i*.3);w.scaling.setAll(.35+.65*clamp(p*2));w.visibility=(1-p)*.65;}burst(p);shards(p);flakes(p);ice.alpha=(1-p)*.88;violet.alpha=(1-p)*.65;};
  }else if(heroClass==='mage'){
   const rose=material(g,'#ffade0',.8),gold=material(g,'#fff0b4',.95),halo=ring(g,5.5,rose,.12,.20),inner=ring(g,4.2,gold,.16,.12);
   const stars=Array.from({length:7},(_,i)=>{const a=i*2.4,r=i?1.2+(i%3):0,c=crystal(g,gold,i?.42:.78),tail=beam(g,rose,3.4,.22),trail=beam(g,gold,1.8,.075),bloom=ring(g,i?1.05:1.65,i%2?rose:gold,.18,.13),crown=arc(g,i?.5:.9,Math.PI*1.6,rose,.45);c.name='falling star comet';tail.name='rose comet trail';trail.name='golden comet trail';bloom.name='star impact bloom';crown.name='star impact petal';return {c,tail,trail,bloom,crown,x:Math.sin(a)*r,z:Math.cos(a)*r,delay:i*.055};});
   const burst=flash(g,3.5,gold),sparks=debris(g,16,gold,{name:'starfall golden fragment',radius:5.25,height:2.4,size:.15}),wisps=debris(g,8,rose,{name:'starfall rose wisp',radius:4.8,height:2.6,start:.18,leaf:true});
   g.render=p=>{halo.scaling.setAll(.28+.72*clamp(p*2.4));inner.scaling.setAll(.2+.8*clamp(p*3));for(const s of stars){const q=s.delay===0?1:clamp((p-s.delay)*3.4),y=(1-q)*7,hitAt=s.delay===0?0:s.delay+1/3.4,hit=clamp((p-hitAt)/.35),landed=p>=hitAt;s.c.position.set(s.x,y+.3,s.z);s.c.rotation.y=p*7;s.c.rotation.z=p*4;s.c.scaling.setAll(q<1?1:Math.max(.03,1.65*(1-hit)));s.c.setEnabled(hit<1);s.tail.position.set(s.x,y+1.8,s.z);s.tail.scaling.y=.45+q*.55;s.tail.visibility=(1-q)*.8;s.tail.setEnabled(q<1);s.trail.position.set(s.x,y+1,s.z);s.trail.visibility=1-q;s.trail.setEnabled(q<1);s.bloom.position.set(s.x,.18,s.z);s.bloom.scaling.setAll(.12+hit*1.1);s.bloom.visibility=landed?(1-hit)*.9:0;s.bloom.setEnabled(landed&&hit<1);s.crown.position.set(s.x,.25+Math.sin(hit*Math.PI)*.6,s.z);s.crown.scaling.setAll(.2+hit*1.2);s.crown.rotation.y=hit*5;s.crown.visibility=landed?(1-hit)*.7:0;s.crown.setEnabled(landed&&hit<1);}burst(p);sparks(p);wisps(p);rose.alpha=(1-p)*.85;gold.alpha=(1-p)*.93;};
  }else if(!ultimate){
   const lime=material(g,'#e1ffb1',.9),gold=material(g,'#fff1ba',.8),trails=[-.16,0,.16].map(a=>{const m=arc(g,.21,Math.PI*1.3,lime,.18),streak=beam(g,gold,1.4,.075);m.rotation.x=Math.PI/2;m.rotation.y=yaw+a;streak.rotation.set(Math.PI/2,yaw+a,0);return {m,streak,a:yaw+a};});
   g.render=p=>{for(const {m,streak,a} of trails){const r=.7+p*11;m.position.set(Math.sin(a)*r,1.1+Math.sin(p*Math.PI)*.5,Math.cos(a)*r);m.scaling.setAll(.8+p);streak.position.set(Math.sin(a)*(r-.6),m.position.y,Math.cos(a)*(r-.6));streak.visibility=1-p;}lime.alpha=(1-p)*.8;gold.alpha=(1-p)*.65;};
  }else{
   const lime=material(g,'#d9ffac',.9),gold=material(g,'#fff0b4',.8),halo=ring(g,6,lime,.12,.16),inner=ring(g,4.6,gold,.16,.09);
   const rain=Array.from({length:18},(_,i)=>{const a=i*2.4,r=Math.sqrt(i/18)*5.15,bloom=ring(g,.65,i%2?lime:gold,.18,.10);bloom.name='arrow impact bloom';return {m:arrow(g,lime),bloom,x:Math.sin(a)*r,z:Math.cos(a)*r,delay:(i%6)*.055};});
   const burst=flash(g,2.8,gold),leaves=debris(g,10,lime,{name:'arrow rain leaf wisp',radius:5.8,height:2.1,start:.18,leaf:true}),splinters=debris(g,6,gold,{name:'arrow rain hit spark',radius:5.2,height:1.4,size:.14,start:.25});
   g.render=p=>{halo.scaling.setAll(.48+.52*clamp(p*2.6));inner.scaling.setAll(.3+.7*clamp(p*3));for(const a of rain){const q=a.delay===0?1:clamp((p-a.delay)*3.6),hitAt=a.delay===0?0:a.delay+1/3.6,hit=clamp((p-hitAt)/.32);a.m.position.set(a.x,(1-q)*8+.7,a.z);a.m.rotation.z=-.1;a.m.scaling.setAll(q===1?Math.max(.01,1-hit):1);a.m.setEnabled(p>=a.delay&&hit<1);a.bloom.position.set(a.x,.18,a.z);a.bloom.scaling.setAll(.12+hit*1.35);a.bloom.visibility=p>=hitAt?(1-hit)*.95:0;a.bloom.setEnabled(p>=hitAt&&hit<1);}burst(p);leaves(p);splinters(p);lime.alpha=(1-p)*.9;gold.alpha=(1-p)*.82;};
  }
  g.render(0);
 }
 function update(dt,{paused=false}={}){if(disposed||paused)return;dt=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));for(const g of [...groups]){g.time+=dt;if(g.time>=g.duration){remove(g);continue;}g.render(clamp(g.time/g.duration));}}
 function clear(){for(const g of [...groups])remove(g);}
 function dispose(){if(disposed)return;clear();disposed=true;}
 scene.onDisposeObservable.add(dispose);
 return {charge,release,update,clear,dispose,get activeCount(){return groups.length;}};
}
