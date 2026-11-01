import {applyCampPaintUV} from './camp-paint.js?v=17317200';

const PROFILES=[
  {name:'Fern',kind:'inn',height:2.12,thanks:'Thank you! I can finally go home!'},
  {name:'Nell',kind:'cook',height:2.22,thanks:'You saved me! Supper is on me!'},
  {name:'Wren',kind:'elder',height:2.25,thanks:'My hero! Safe travels, friend!'}
];
const RADIUS=.52;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// A short grid search uses the same circle footprints as player movement.
// Every diagonal and every simplified leg is checked, including the final exit.
function escapeRoute(start,camp,obstacles,bounds){
  const radius=camp.radius||10,extent=radius+7,near=obstacles.filter(o=>Math.hypot(o.x-camp.x,o.z-camp.z)<extent+o.r+2);
  const clear=p=>p.x>=bounds.minX+RADIUS&&p.x<=bounds.maxX-RADIUS&&p.z>=bounds.minZ+RADIUS&&p.z<=bounds.maxZ-RADIUS&&near.every(o=>Math.hypot(p.x-o.x,p.z-o.z)>o.r+RADIUS);
  const leg=(a,b)=>clear(b)&&near.every(o=>{const dx=b.x-a.x,dz=b.z-a.z,d2=dx*dx+dz*dz,t=d2?clamp(((o.x-a.x)*dx+(o.z-a.z)*dz)/d2,0,1):0;return Math.hypot(a.x+dx*t-o.x,a.z+dz*t-o.z)>o.r+RADIUS;});
  if(!clear(start))return null;
  const home={x:-camp.x,z:-5-camp.z},length=Math.hypot(home.x,home.z)||1;
  home.x/=length;home.z/=length;
  const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].sort((a,b)=>(b[0]*home.x+b[1]*home.z)-(a[0]*home.x+a[1]*home.z));
  const nodes=[{...start,gx:0,gz:0,parent:-1}],seen=new Set(['0,0']);
  for(let n=0;n<nodes.length&&n<4200;n++){
    const point=nodes[n],dx=point.x-camp.x,dz=point.z-camp.z;
    if(Math.hypot(dx,dz)>=radius+4&&(dx*home.x+dz*home.z)>radius*.45){
      const raw=[];for(let i=n;i>=0;i=nodes[i].parent)raw.unshift({x:nodes[i].x,z:nodes[i].z});
      const route=[raw[0]];let i=0;
      while(i<raw.length-1){let j=raw.length-1;while(j>i+1&&!leg(raw[i],raw[j]))j--;route.push(raw[j]);i=j;}
      return route;
    }
    for(const [ox,oz] of directions){
      const gx=point.gx+ox,gz=point.gz+oz,key=gx+','+gz;
      if(seen.has(key))continue;
      const next={x:start.x+gx*.85,z:start.z+gz*.85,gx,gz,parent:n};
      if(Math.abs(next.x-camp.x)>extent||Math.abs(next.z-camp.z)>extent||!leg(point,next))continue;
      seen.add(key);nodes.push(next);
    }
  }
  return null;
}

function placement(camp,world,bounds){
  const obstacles=world.obstacles||[],candidates=[[2.6,1.2],[-2.8,-1.8],[1.4,-.8],[0,3.4],[-3.8,2.1],[3.8,-1.6],[0,0]];
  for(let ring=2;ring<=5;ring++)for(let i=0;i<12;i++){const a=i*Math.PI/6;candidates.push([Math.cos(a)*ring,Math.sin(a)*ring]);}
  for(const [dx,dz] of candidates){
    const start={x:camp.x+dx,z:camp.z+dz};
    if(obstacles.some(o=>Math.hypot(start.x-o.x,start.z-o.z)<o.r+1.45))continue;
    if((world.interactables||[]).some(o=>Math.hypot(start.x-o.x,start.z-o.z)<2.1))continue;
    if((world.spawnPoints||[]).some(o=>Math.hypot(start.x-o.x,start.z-o.z)<1.45))continue;
    const route=escapeRoute(start,camp,obstacles,bounds);if(route)return {start,route};
  }
  return null;
}

export function createCampRescues(B,scene,world,sprites,{rescued=[],onSay=()=>{}}={}){
  const actors=[],materials=[],owned=new B.TransformNode('camp-rescue-residents',scene);
  const bounds=world.bounds||{minX:-64,maxX:64,minZ:-54,maxZ:70},saved=new Set(rescued);
  let disposed=false,greetingGap=0,enabled=true;
  const interactions=world.interactables||(world.interactables=[]);
  function material(name,color,alpha=1,unlit=false){
    const m=new B.StandardMaterial('rescue-'+name,scene);m.diffuseColor=B.Color3.FromHexString(color);m.specularColor=B.Color3.Black();m.alpha=alpha;m.backFaceCulling=false;
    if(unlit){m.disableLighting=true;m.emissiveColor=m.diffuseColor.clone();m.diffuseColor=B.Color3.Black();m.metadata={emberwildCel:false};}
    materials.push(m);return m;
  }
  let wood,iron,gold,shadow,skin,eyes;
  function inks(){
    wood??=scene.getMaterialByName('world-camp-timber')||material('painted-wood','#856039');
    iron??=scene.getMaterialByName('world-camp-iron')||material('painted-iron','#444553');
    gold??=material('lock','#b18a4d');shadow??=material('foot-shadow','#292431',.54,true);
  }
  function part(name,parent,x,y,z,w,h,d,mat){
    const m=B.MeshBuilder.CreateBox('rescue-'+name,{width:w,height:h,depth:d},scene);m.parent=parent;m.position.set(x,y,z);m.material=mat;m.isPickable=false;m.receiveShadows=true;applyCampPaintUV(B,m);return m;
  }
  function batch(parent,exclude=null){
    const groups=new Map();
    for(const mesh of parent.getChildMeshes(true)){
      if(mesh===exclude)continue;
      const pieces=groups.get(mesh.material)||[];pieces.push(mesh);groups.set(mesh.material,pieces);
    }
    parent.computeWorldMatrix(true);const inverse=parent.getWorldMatrix().clone().invert();
    for(const [mat,pieces] of groups){
      if(pieces.length<2)continue;for(const mesh of pieces)mesh.computeWorldMatrix(true);
      const mesh=B.Mesh.MergeMeshes(pieces,true,true,undefined,false,false);if(!mesh)continue;
      mesh.name=parent.name+'-'+mat.name;mesh.bakeTransformIntoVertices(inverse);mesh.parent=parent;mesh.isPickable=false;mesh.receiveShadows=true;
    }
  }
  function removeInteraction(item){const index=interactions.indexOf(item);if(index>=0)interactions.splice(index,1);item.mesh.setEnabled(false);}
  function fallback(parent,height){
    skin??=material('fallback-cloak','#ab78ad');eyes??=material('fallback-eyes','#292431',1,true);
    const body=new B.TransformNode('rescued-round-traveler',scene);body.parent=parent;
    const ball=B.MeshBuilder.CreateSphere('rescue-round-cloak',{diameter:height*.65,segments:12},scene);ball.parent=body;ball.position.y=height*.36;ball.scaling.y=.86;ball.material=skin;ball.isPickable=false;
    for(const side of [-1,1])part('traveler-eye',body,side*.16,height*.42,-height*.30,.085,.13,.045,eyes);
    return body;
  }
  for(const [index,camp] of (world.camps||[]).entries()){
    if(saved.has(camp.id))continue;
    const spot=placement(camp,world,bounds);if(!spot)continue;
    inks();const profile=PROFILES[index%PROFILES.length],{start,route}=spot;
    const root=new B.TransformNode('captive-'+camp.id,scene);root.parent=owned;root.position.set(start.x,0,start.z);
    const sprite=sprites?sprites.createCreature(profile.kind,root,profile.height):fallback(root,profile.height);
    const halo=B.MeshBuilder.CreateDisc('captive-foot-shadow',{radius:.5,tessellation:20,sideOrientation:B.Mesh.DOUBLESIDE},scene);halo.parent=root;halo.rotation.x=Math.PI/2;halo.position.y=.075;halo.material=shadow;halo.isPickable=false;
    const anchor=new B.TransformNode('captive-interaction-'+camp.id,scene);anchor.parent=owned;anchor.position.set(start.x,0,start.z);
    const item={id:'rescue-'+camp.id,campId:camp.id,type:'captive',name:profile.name+' · Captive',x:start.x,z:start.z,mesh:anchor};interactions.push(item);
    const cage=new B.TransformNode('captive-cage-'+camp.id,scene);cage.parent=owned;cage.position.set(start.x,0,start.z);
    const first=route[1];cage.rotation.y=Math.atan2(-(first.x-start.x),-(first.z-start.z));
    for(const x of [-.91,.91])for(const z of [-.91,.91]){
      part('cage-post',cage,x,.91,z,.16,1.76,.16,wood);
      for(const y of [.28,1.5])part('post-iron-band',cage,x,y,z,.18,.10,.18,iron);
    }
    for(const z of [-.91,.91])part('cage-crossbar',cage,0,1.72,z,2,.14,.15,wood);
    for(const x of [-.91,.91])for(const y of [.2,1.35])part('cage-side-rail',cage,x,y,0,.13,.11,1.9,wood);
    for(const z of [-.5,0,.5])for(const x of [-.91,.91])part('cage-side-bar',cage,x,.94,z,.055,1.5,.055,iron);
    for(const x of [-.5,0,.5])part('cage-back-bar',cage,x,.94,.91,.055,1.5,.055,iron);
    part('cage-back-rail',cage,0,.2,.91,1.85,.12,.13,wood);
    const gate=new B.TransformNode('captive-gate-'+camp.id,scene);gate.parent=cage;gate.position.set(-.91,0,-.91);
    for(const x of [.10,1.72])part('gate-frame',gate,x,.88,0,.10,1.56,.09,wood);
    for(const y of [.18,1.6])part('gate-rail',gate,.91,y,0,1.72,.10,.09,wood);
    for(const x of [.48,.91,1.34])part('gate-bar',gate,x,.89,0,.045,1.4,.045,iron);
    const lock=part('gate-padlock',gate,1.65,.86,-.08,.18,.24,.12,gold);
    batch(cage);batch(gate,lock);
    actors.push({root,item,profile,sprite,halo,cage,gate,lock,route,state:'captive',timer:0,next:1,clock:0,cooldown:0,welcomed:false,lastGuarded:null,facing:new B.Vector3(0,0,-1)});
  }
  function release(item){
    if(disposed)return false;const actor=actors.find(a=>a.item===item&&a.state==='captive');if(!actor)return false;
    actor.state='thanking';actor.timer=0;actor.lock.setEnabled(false);removeInteraction(item);
    onSay(item,actor.profile.thanks,actor);return true;
  }
  function update(dt,playerPosition,cameraAlpha,{paused=false,enabled:active=true,guardCount=()=>0}={}){
    if(disposed)return;
    if(enabled!==active){owned.setEnabled(active);enabled=active;}
    if(!active||paused)return;
    dt=Number.isFinite(dt)?clamp(dt,0,.1):0;if(dt===0)return;
    greetingGap=Math.max(0,greetingGap-dt);
    for(const actor of actors){
      if(actor.state==='gone')continue;
      actor.clock+=dt;actor.timer+=dt;actor.cooldown=Math.max(0,actor.cooldown-dt);
      const dx=(playerPosition?.x??0)-actor.root.position.x,dz=(playerPosition?.z??0)-actor.root.position.z,distance=Math.hypot(dx,dz);
      let moving=false,fade=1;
      if(actor.state==='captive'){
        if(distance<8&&distance>.1)actor.facing.set(dx,0,dz).normalize();
        if(distance>10)actor.welcomed=false;
        const guarded=guardCount(actor.item.campId)>0;
        const cleared=actor.lastGuarded===true&&!guarded;actor.lastGuarded=guarded;
        if(distance<7.5&&greetingGap===0&&((!actor.welcomed&&actor.cooldown===0)||cleared)){
          actor.welcomed=true;actor.cooldown=20;greetingGap=3.5;
          onSay(actor.item,guarded?'Over here! Please drive the guards away!':'The guards are gone! Please let me out!',actor);
        }
      }else if(actor.state==='thanking'){
        actor.gate.rotation.y=Math.PI*.58*Math.min(1,actor.timer/.6);
        if(distance>.1)actor.facing.set(dx,0,dz).normalize();
        moving=actor.timer<.8;
        if(actor.timer>=3){actor.state='leaving';actor.timer=0;}
      }else if(actor.state==='leaving'){
        if(actor.next<actor.route.length){
          const goal=actor.route[actor.next],x=goal.x-actor.root.position.x,z=goal.z-actor.root.position.z,d=Math.hypot(x,z);
          if(d<.015)actor.next++;
          else{const step=Math.min(d,dt*1.7);actor.root.position.x+=x/d*step;actor.root.position.z+=z/d*step;actor.facing.set(x/d,0,z/d);moving=step>0;}
          actor.timer=0;
        }else{
          fade=Math.max(0,1-actor.timer/1.6);
          if(fade===0){actor.state='gone';actor.root.dispose(false);actor.item.mesh.dispose();continue;}
        }
      }
      let hop=0;
      if(sprites){const motion=sprites.animate(actor.sprite,dt,{moving,pace:moving?.85:.65});hop=motion?.hop||0;sprites.face(actor.sprite,actor.facing,Number.isFinite(cameraAlpha)?cameraAlpha:-Math.PI/2);actor.sprite.visibility=fade;}
      else{hop=moving?Math.abs(Math.sin(actor.clock*10))*.25:0;actor.sprite.position.y=hop;actor.sprite.scaling.set(1+hop*.15,1-hop*.1,1+hop*.15);actor.sprite.rotation.y=Math.atan2(-actor.facing.x,-actor.facing.z);for(const mesh of actor.sprite.getChildMeshes())mesh.visibility=fade;}
      actor.halo.scaling.setAll(Math.max(.65,1-hop*.6));actor.halo.visibility=fade*(1-hop*.7);
    }
  }
  function dispose(){
    if(disposed)return;disposed=true;
    for(const actor of actors){const i=interactions.indexOf(actor.item);if(i>=0)interactions.splice(i,1);}
    owned.dispose(false);for(const material of materials)material.dispose(false,false);actors.length=0;
  }
  return {actors,release,update,dispose};
}
