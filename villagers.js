import {TOWN_SAFE_BOUNDS,findClearPosition} from './world-navigation.js?v=54d49b7f';

export const TOWNSFOLK=Object.freeze([
 {id:'poppy',name:'Poppy · Gardener',kind:'inn',height:2.15,speed:.95,route:[[-3,-3],[-1,-1],[2,-2],[1,-4]],words:['Morning, friend!','Lovely day for a stroll.','May your boots stay dry!']},
 {id:'milo',name:'Milo · Courier',kind:'smith',height:2.1,speed:1.12,route:[[3,1],[4,3],[3.2,5],[2.8,2]],words:['Hello there, traveler!','Taking the scenic route?','Good to see you again!']},
 {id:'tilly',name:'Tilly · Baker',kind:'cook',height:2.25,speed:.82,route:[[-20,0],[-20,3],[-20,7],[-19,8]],words:['A warm hello to you!','The bread smells lovely today.','Enjoy your day in town!']},
 {id:'bea',name:'Bea · Florist',kind:'inn',height:1.95,speed:.88,route:[[16,3],[17,5],[18,6],[18,3]],words:['Hello, sunshine!','The flowers are in bloom.','Stay a little, wanderer!']},
 {id:'oren',name:'Oren · Storyteller',kind:'elder',height:2.3,speed:.72,route:[[3,13],[6,15],[9,15]],words:['Well met, young friend.','Every path has a story.','Safe travels out there!']}
]);

// Village artwork shares the same directional, grounded animation as creatures.
// The interaction anchors stay fixed so shops and quests remain easy to reach.
export function createVillagers(B,scene,world,sprites,{onGreet=()=>{}}={}){
 if(!sprites)return null;
 const kinds={npc:'elder',smith:'smith',inn:'inn',cook:'cook'},actors=[],residents=[];
 let greetingGap=0,disposed=false;
 const shadowMaterial=new B.StandardMaterial('village-foot-shadows',scene);
 shadowMaterial.disableLighting=true;shadowMaterial.emissiveColor=B.Color3.FromHexString('#292431');shadowMaterial.specularColor=B.Color3.Black();shadowMaterial.alpha=.54;
 for(const item of world.interactables){
  const kind=kinds[item.type];if(!kind)continue;
  const root=new B.TransformNode('villager-'+item.id,scene);root.parent=item.mesh;
  const sprite=sprites.createCreature(kind,root,kind==='elder'?2.55:kind==='cook'?2.65:2.4);
  const halo=B.MeshBuilder.CreateDisc('villager-foot-shadow',{radius:.54,tessellation:20,sideOrientation:B.Mesh.DOUBLESIDE},scene);
  halo.parent=root;halo.rotation.x=Math.PI/2;halo.position.y=.075;halo.material=shadowMaterial;halo.isPickable=false;
  actors.push({item,root,sprite,halo,kind,phase:actors.length*1.17,clock:0,greeting:0,welcomed:false,facing:new B.Vector3(0,0,-1)});
 }
 // Ambient townsfolk never enter interactables: they have no quest marker,
 // shop, collision blocker or quest/save state of their own.
 if(world.isSafe?.(0,-5)){
  const bounds=TOWN_SAFE_BOUNDS,obstacles=(world.obstacles||[]).filter(o=>o.x+o.r>bounds.minX&&o.x-o.r<bounds.maxX&&o.z+o.r>bounds.minZ&&o.z-o.r<bounds.maxZ);
  const clearLeg=(a,b)=>obstacles.every(o=>{
   const dx=b.x-a.x,dz=b.z-a.z,d2=dx*dx+dz*dz;
   const t=d2?Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.z-a.z)*dz)/d2)):0;
   return Math.hypot(a.x+t*dx-o.x,a.z+t*dz-o.z)>o.r+.48;
  });
  for(const [index,profile] of TOWNSFOLK.entries()){
   const first=profile.route[0],start=findClearPosition({x:first[0],z:first[1]},obstacles,bounds,.5);
   const route=[start];
   for(const [x,z] of profile.route.slice(1)){
    const point=findClearPosition({x,z},obstacles,bounds,.5,start);
    if(clearLeg(route[route.length-1],point)&&Math.hypot(point.x-route[route.length-1].x,point.z-route[route.length-1].z)>.2)route.push(point);
   }
   // Return over checked legs, never cut an untested corner back to the start.
   route.push(...route.slice(1,-1).reverse());
   const root=new B.TransformNode('townsfolk-'+profile.id,scene);root.position.set(start.x,0,start.z);
   const sprite=sprites.createCreature(profile.kind,root,profile.height);
   const halo=B.MeshBuilder.CreateDisc('townsfolk-foot-shadow',{radius:.46,tessellation:16,sideOrientation:B.Mesh.DOUBLESIDE},scene);
   halo.parent=root;halo.rotation.x=Math.PI/2;halo.position.y=.075;halo.material=shadowMaterial;halo.isPickable=false;
   const item={id:profile.id,name:profile.name,type:'townsfolk',x:start.x,z:start.z,mesh:root};
   residents.push({item,root,sprite,halo,profile,route,next:1%route.length,wait:index*.5,clock:0,greeting:0,cooldown:0,welcomed:false,line:0,facing:new B.Vector3(0,0,-1)});
  }
 }
 return {
  actors,residents,
  greet(item){const actor=actors.find(a=>a.item===item);if(actor)actor.greeting=.8;},
  update(dt,playerPosition,cameraAlpha,paused=false,greetingsEnabled=true){
   if(disposed)return;
   dt=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
   if(!paused)greetingGap=Math.max(0,greetingGap-dt);
   for(const actor of actors){
    const dx=playerPosition.x-actor.item.x,dz=playerPosition.z-actor.item.z,near=Math.hypot(dx,dz)<7;
    if(near&&Math.hypot(dx,dz)>.1)actor.facing.set(dx,0,dz).normalize();
    if(!paused){
     const distance=Math.hypot(dx,dz);
     if(distance>8||!greetingsEnabled)actor.welcomed=false;
     if(greetingsEnabled&&distance<5.5&&!actor.welcomed){actor.welcomed=true;actor.greeting=.8;onGreet(actor.item);}
     actor.clock+=dt;actor.greeting=Math.max(0,actor.greeting-dt);
     const hopping=actor.greeting>0||(actor.clock+actor.phase)%4.8<.72;
     const motion=sprites.animate(actor.sprite,dt,{moving:hopping,pace:.85});
     actor.halo.scaling.setAll(1-motion.hop*.6);actor.halo.visibility=1-motion.hop*.7;
    }
    sprites.face(actor.sprite,actor.facing,cameraAlpha);
   }
   for(const actor of residents){
    const dx=playerPosition.x-actor.root.position.x,dz=playerPosition.z-actor.root.position.z,distance=Math.hypot(dx,dz);
    if(!paused){
     actor.clock+=dt;actor.cooldown=Math.max(0,actor.cooldown-dt);actor.greeting=Math.max(0,actor.greeting-dt);
     if(distance>7||!greetingsEnabled)actor.welcomed=false;
     if(greetingsEnabled&&distance<4&&!actor.welcomed&&actor.cooldown===0&&greetingGap===0){
      actor.welcomed=true;actor.greeting=3.2;actor.cooldown=20;greetingGap=3.5;
      actor.item.greetingText=actor.profile.words[actor.line++%actor.profile.words.length];
      onGreet(actor.item,actor);
     }
     let moving=false;
     if(actor.greeting>0){if(distance>.1)actor.facing.set(dx,0,dz).normalize();}
     else if(greetingsEnabled&&distance<1.15){if(distance>.1)actor.facing.set(dx,0,dz).normalize();}
     else if(actor.wait>0)actor.wait=Math.max(0,actor.wait-dt);
     else if(actor.route.length>1){
      const goal=actor.route[actor.next],x=goal.x-actor.root.position.x,z=goal.z-actor.root.position.z,d=Math.hypot(x,z);
      if(d<.015){actor.next=(actor.next+1)%actor.route.length;actor.wait=1.1+(actor.line%3)*.35;}
      else{const step=Math.min(d,dt*actor.profile.speed);actor.root.position.x+=x/d*step;actor.root.position.z+=z/d*step;actor.facing.set(x/d,0,z/d);moving=step>0;}
     }
     actor.item.x=actor.root.position.x;actor.item.z=actor.root.position.z;
     const motion=sprites.animate(actor.sprite,dt,{moving:moving||actor.greeting>2.4,pace:moving?.8:.65});
     actor.halo.scaling.setAll(Math.max(.65,1-motion.hop*.6));actor.halo.visibility=1-motion.hop*.7;
    }
    sprites.face(actor.sprite,actor.facing,cameraAlpha);
   }
  },
  dispose(){if(disposed)return;disposed=true;[...actors,...residents].forEach(actor=>actor.root.dispose());actors.length=0;residents.length=0;shadowMaterial.dispose();}
 };
}
