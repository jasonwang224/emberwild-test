// Village artwork shares the same directional, grounded animation as creatures.
// The interaction anchors stay fixed so shops and quests remain easy to reach.
export function createVillagers(B,scene,world,sprites,{onGreet=()=>{}}={}){
 if(!sprites)return null;
 const kinds={npc:'elder',smith:'smith',inn:'inn',cook:'cook'},actors=[];
 const shadowMaterial=new B.StandardMaterial('village-foot-shadows',scene);
 shadowMaterial.disableLighting=true;shadowMaterial.emissiveColor=B.Color3.FromHexString('#263d30');shadowMaterial.alpha=.25;
 for(const item of world.interactables){
  const kind=kinds[item.type];if(!kind)continue;
  const root=new B.TransformNode('villager-'+item.id,scene);root.parent=item.mesh;
  const sprite=sprites.createCreature(kind,root,kind==='elder'?2.55:kind==='cook'?2.65:2.4);
  const halo=B.MeshBuilder.CreateDisc('villager-foot-shadow',{radius:.54,tessellation:20,sideOrientation:B.Mesh.DOUBLESIDE},scene);
  halo.parent=root;halo.rotation.x=Math.PI/2;halo.position.y=.035;halo.material=shadowMaterial;halo.isPickable=false;
  actors.push({item,root,sprite,halo,kind,phase:actors.length*1.17,clock:0,greeting:0,welcomed:false,facing:new B.Vector3(0,0,-1)});
 }
 return {
  actors,
  greet(item){const actor=actors.find(a=>a.item===item);if(actor)actor.greeting=.8;},
  update(dt,playerPosition,cameraAlpha,paused=false){
   for(const actor of actors){
    const dx=playerPosition.x-actor.item.x,dz=playerPosition.z-actor.item.z,near=Math.hypot(dx,dz)<7;
    if(near&&Math.hypot(dx,dz)>.1)actor.facing.set(dx,0,dz).normalize();
    if(!paused){
     const distance=Math.hypot(dx,dz);
     if(distance>8)actor.welcomed=false;
     if(distance<5.5&&!actor.welcomed){actor.welcomed=true;actor.greeting=.8;onGreet(actor.item);}
     actor.clock+=dt;actor.greeting=Math.max(0,actor.greeting-dt);
     const hopping=actor.greeting>0||(actor.clock+actor.phase)%4.8<.72;
     const motion=sprites.animate(actor.sprite,dt,{moving:hopping,pace:.85});
     actor.halo.scaling.setAll(1-motion.hop*.6);actor.halo.visibility=1-motion.hop*.7;
    }
    sprites.face(actor.sprite,actor.facing,cameraAlpha);
   }
  },
  dispose(){actors.forEach(actor=>actor.root.dispose());actors.length=0;shadowMaterial.dispose();}
 };
}
