import {createCombatVisuals} from './combat-visuals.js?v=e2609980';

export const GUARD_REACH=3.5;
export const GUARD_POSTS=Object.freeze([
 {id:'south-west',gate:'Southgate',x:-2.2,z:-10,outward:[0,-1]},
 {id:'south-east',gate:'Southgate',x:2.2,z:-10,outward:[0,-1]},
 {id:'north-west',gate:'Northgate',x:-.8,z:25,outward:[0,1]},
 {id:'north-east',gate:'Northgate',x:3.5,z:25,outward:[0,1]},
 {id:'east-north',gate:'Eastgate',x:26,z:-2.9,outward:[1,0]},
 {id:'east-south',gate:'Eastgate',x:26,z:-7.1,outward:[1,0]},
 {id:'west-north',gate:'Westgate',x:-25.2,z:-3.7,outward:[-1,0]},
 {id:'west-south',gate:'Westgate',x:-25.2,z:-8.3,outward:[-1,0]}
].map(post=>Object.freeze({...post,outward:Object.freeze(post.outward)})));

// Sentinels are grounded actors, not obstacles, quest givers, or enemy spawns.
// Only their body/arms move; each post remains clear for the player to pass.
export function createTownGuards(B,scene,world,sprites,{onStrike=()=>{},onGreet=()=>{}}={}){
 const actors=[],materials=[];
 let disposed=false,greetingGap=0,frame={enabled:false,paused:false,enemies:[]};
 const inTown=world.isSafe?.(0,-5)&&world.camps?.length>0;
 const material=(name,color,unlit=false)=>{
  const m=new B.StandardMaterial(name,scene);m.diffuseColor=B.Color3.FromHexString(color);
  m.emissiveColor=m.diffuseColor.scale(unlit?1:.12);m.specularColor=B.Color3.Black();m.disableLighting=unlit;materials.push(m);return m;
 };
 const shadow=inTown?material('town-guard-foot-shadow','#292431',true):null;if(shadow)shadow.alpha=.54;
 let fallbackPalette=null;
 function fallback(body){
  fallbackPalette??={skin:material('world-guard-teal','#77bb9a'),armor:material('world-guard-steel','#8295bb'),rim:material('world-guard-rim','#c3cddc'),ink:material('world-guard-ink','#26353e'),plume:material('world-guard-plume','#cb6959')};
  const p=fallbackPalette,figure=new B.TransformNode('round-guard-fallback',scene);figure.parent=body;
  const orb=(name,position,scale,mat)=>{
   const m=B.MeshBuilder.CreateSphere(name,{diameter:1,segments:8},scene);m.parent=figure;m.position.set(...position);m.scaling.set(...scale);m.material=mat;m.isPickable=false;m.renderOutline=true;m.outlineWidth=.012;m.outlineColor=B.Color3.FromHexString('#26353e');return m;
  };
  orb('round guard body',[0,.76,0],[1.48,1.45,1.2],p.skin);
  orb('guard helmet',[0,1.58,0],[1.56,.88,1.3],p.armor);
  orb('helmet brim',[0,1.32,.08],[1.65,.14,1.38],p.rim);
  orb('helmet red crest',[0,2.04,-.13],[.19,.45,.58],p.plume);
  for(const x of [-.28,.28])orb('guard eye',[x,.98,.55],[.13,.21,.1],p.ink);
  return figure;
 }
 for(const [index,post] of (inTown?GUARD_POSTS:[]).entries()){
  const root=new B.TransformNode('town-guard-'+post.id,scene);root.position.set(post.x,0,post.z);
  const body=new B.TransformNode('guard-body',scene);body.parent=root;
  const sprite=sprites?.createHero?.('knight',body,2.4)||null;
  if(sprite?.metadata?.ghost){
   // The hero's cyan through-scenery silhouette is exclusively a player aid.
   sprite.metadata.ghost.dispose();sprite.metadata.ghost=null;
  }
  const figure=sprite||fallback(body),combat=createCombatVisuals(B,scene,{root,heroClass:'knight'});
  const halo=B.MeshBuilder.CreateDisc('guard-foot-shadow',{radius:.62,tessellation:16,sideOrientation:B.Mesh.DOUBLESIDE},scene);
  halo.parent=root;halo.rotation.x=Math.PI/2;halo.position.y=.075;halo.material=shadow;halo.isPickable=false;
  const outward=new B.Vector3(post.outward[0],0,post.outward[1]),item={id:'guard-'+post.id,type:'guard',name:post.gate+' Guard',x:post.x,z:post.z,mesh:root};
  const actor={root,body,sprite,figure,combat,halo,item,post,outward,facing:outward.clone(),clock:index*.46,cooldown:0,target:null,welcomed:false,greetingCooldown:0};
  if(!sprite)figure.rotation.y=Math.atan2(outward.x,outward.z);
  combat.update(0,outward,0);if(sprite)sprites?.face?.(sprite,outward,0);actors.push(actor);
 }
 function eligible(actor,enemy){
  if(!enemy||!Number.isFinite(enemy.hp)||enemy.hp<=0||enemy.kind==='boss'||enemy.elite||!enemy.root||enemy.root.isDisposed()||!enemy.root.isEnabled())return false;
  const dx=enemy.root.position.x-actor.post.x,dz=enemy.root.position.z-actor.post.z,d=Math.hypot(dx,dz);
  return Number.isFinite(d)&&d<=GUARD_REACH&&dx*actor.outward.x+dz*actor.outward.z>=-.25;
 }
 function strike(actor,enemy){
  if(disposed||!frame.enabled||frame.paused||!frame.enemies.includes(enemy)||!eligible(actor,enemy))return;
  onStrike(actor,enemy);
 }
 return {
  actors,
  update(dt,playerPosition,cameraAlpha,{paused=false,enabled=true,enemies=[]}={}){
   if(disposed)return;
   frame={paused,enabled,enemies};dt=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
   if(enabled&&!paused)greetingGap=Math.max(0,greetingGap-dt);
   for(const actor of actors){
    if(actor.root.isDisposed())continue;
    actor.root.setEnabled(enabled);
    if(!enabled){actor.combat.cancel();actor.target=null;actor.welcomed=false;continue;}
    if(!paused){
     actor.clock+=dt;actor.cooldown=Math.max(0,actor.cooldown-dt);actor.greetingCooldown=Math.max(0,actor.greetingCooldown-dt);
     if(actor.target&&(!enemies.includes(actor.target)||!eligible(actor,actor.target))){actor.combat.cancel();actor.target=null;}
     if(!actor.combat.active&&actor.cooldown===0){
      const target=enemies.filter(e=>eligible(actor,e)).sort((a,b)=>B.Vector3.DistanceSquared(a.root.position,actor.root.position)-B.Vector3.DistanceSquared(b.root.position,actor.root.position))[0];
      if(target){
       actor.facing.set(target.root.position.x-actor.post.x,0,target.root.position.z-actor.post.z);if(actor.facing.lengthSquared()>.001)actor.facing.normalize();else actor.facing.copyFrom(actor.outward);
       if(actor.combat.attack({facing:actor.facing,onRelease:()=>strike(actor,target)})){actor.target=target;actor.cooldown=1.4;}
      }
     }
     if(!actor.combat.active){actor.target=null;actor.facing.copyFrom(actor.outward);}
     const distance=Math.hypot((playerPosition?.x??Infinity)-actor.post.x,(playerPosition?.z??Infinity)-actor.post.z);
     if(distance>6)actor.welcomed=false;
     if(distance<4&&!actor.welcomed&&!actor.combat.active&&actor.greetingCooldown===0&&greetingGap===0){
      actor.welcomed=true;actor.greetingCooldown=24;greetingGap=4;
      actor.item.greetingText=actor.post.id.endsWith('west')||actor.post.id.endsWith('north')?'Welcome to Hearthglen. We’ll hold the gate.':'Safe travels! The town is under our watch.';
      onGreet(actor.item,actor);
     }
     // Foot position never bobs: the small breath changes only the body shape.
     const breath=Math.sin(actor.clock*2.3)*.009;
     actor.body.scaling.set(1-breath*.45,1+breath,1);
    }
    actor.combat.update(dt,actor.facing,cameraAlpha,{paused});
    if(actor.sprite)sprites?.face?.(actor.sprite,actor.facing,cameraAlpha);
    else actor.figure.rotation.y=Math.atan2(actor.facing.x,actor.facing.z);
   }
  },
  dispose(){if(disposed)return;disposed=true;frame.enabled=false;for(const actor of actors){actor.combat.dispose();actor.root.dispose();}actors.length=0;materials.forEach(m=>m.dispose());}
 };
}
