import {applyCelShading} from './cel.js';

// Driven by the game clock: pausing never finishes a drink behind a menu.
export const POTION_TIMING=Object.freeze({sip:.55,duration:1.40});
const REST=Object.freeze({hop:0,sx:1,sy:1,lean:0,spin:0});
const clamp=n=>Math.max(0,Math.min(1,n));
const ease=n=>{n=clamp(n);return n*n*(3-2*n);};
const lerp=(a,b,t)=>a+(b-a)*t;
const FRAMES=[
  {at:0,p:[.77,.55,.13],tilt:0,roll:-.16,size:.35},
  {at:.16,p:[.87,.72,.28],tilt:-.12,roll:-.16,size:1},
  {at:.36,p:[.51,1.03,.75],tilt:-.80,roll:-.08,size:1},
  {at:.50,p:[.14,1.12,.87],tilt:-2.02,roll:0,size:1},
  {at:.90,p:[.14,1.18,.85],tilt:-2.22,roll:0,size:1},
  {at:1.10,p:[.56,.86,.51],tilt:-.30,roll:-.12,size:1},
  {at:1.28,p:[.78,.56,.14],tilt:0,roll:-.16,size:.90},
  {at:POTION_TIMING.duration,p:[.72,.48,.09],tilt:0,roll:-.16,size:.20}
];

/** A reusable tiny hand and painted flask. Gameplay owns inventory and healing. */
export function createPotionAnimation(B,scene,{root,heroClass='knight',sprite=true}={}){
  if(!root)throw new Error('Potion animation needs a hero root');
  scene.setRenderingAutoClearDepthStencil(2,false,false,false);
  const rig=new B.TransformNode('potion-drinking',scene);rig.parent=root;
  const hand=new B.TransformNode('potion-hand',scene);hand.parent=rig;
  const bottle=new B.TransformNode('held-healing-flask',scene);bottle.parent=hand;
  const mouth=new B.TransformNode('potion-bottle-mouth',scene);mouth.parent=bottle;mouth.position.y=.44;
  const materials=[],meshes=[];
  let disposed=false,action=null,angle=0,hop=0,bodyMotion={...REST};
  const material=(name,color)=>{
    const m=new B.StandardMaterial('world-potion-'+name,scene);
    m.diffuseColor=B.Color3.FromHexString(color);m.specularColor=B.Color3.Black();
    materials.push(m);return m;
  };
  const gloveMat=material('glove',{knight:'#43c9df',mage:'#c797f3',ranger:'#bce7b8'}[heroClass]||'#43c9df');
  const ruby=material('ruby-draught','#d9586d'),glass=material('glass-rim','#bde0cf');
  const paper=material('cream-label','#f4e9bc'),ink=material('label-heart','#a23f5a');
  const shine=material('painted-glint','#ffe9d1'),corkMat=material('cork','#bd8b52');
  function mesh(m,parent,mat){
    m.parent=parent;m.material=mat;m.isPickable=false;m.renderingGroupId=2;
    m.renderOutline=true;m.outlineColor=B.Color3.FromHexString('#344c49');m.outlineWidth=.010;
    meshes.push(m);return m;
  }
  const sphere=(name,parent,diameter,mat)=>mesh(B.MeshBuilder.CreateSphere(name,{diameter,segments:10},scene),parent,mat);
  const cylinder=(name,parent,diameter,height,mat)=>mesh(B.MeshBuilder.CreateCylinder(name,{diameter,height,tessellation:10},scene),parent,mat);
  const glove=sphere('tiny potion glove',hand,.30,gloveMat);glove.position.set(.15,-.09,.02);glove.scaling.set(1,.88,.9);
  const flask=sphere('round ruby potion bottle',bottle,.46,ruby);flask.scaling.set(1,1.12,.86);flask.position.y=.035;
  const shoulder=cylinder('pale flask shoulder',bottle,.28,.085,glass);shoulder.position.y=.24;
  const neck=cylinder('potion bottle neck',bottle,.14,.15,glass);neck.position.y=.335;
  const lip=cylinder('potion bottle lip',bottle,.22,.055,glass);lip.position.y=.425;
  const cork=cylinder('potion cork',bottle,.15,.11,corkMat);cork.position.y=.49;
  // Flat brush marks and a cream label keep the flask readable without glass
  // refraction or specular highlights that clash with the painted world.
  for(const side of [-1,1]){
    const label=mesh(B.MeshBuilder.CreateBox('potion cream label',{width:.23,height:.16,depth:.018},scene),bottle,paper);
    label.position.set(0,.025,side*.202);label.renderOutline=false;
    const heart=sphere('potion label seal',bottle,.09,ink);heart.scaling.set(1,.85,.18);heart.position.set(0,.025,side*.217);heart.renderOutline=false;
    const glint=mesh(B.MeshBuilder.CreateBox('painted bottle glint',{width:.046,height:.14,depth:.018},scene),bottle,shine);
    glint.position.set(-.12,.12,side*.166);glint.rotation.z=-.18;glint.renderOutline=false;
  }
  applyCelShading(B,scene);

  function pose(){
    bodyMotion={...REST};rig.setEnabled(!!action&&!disposed);
    if(!action||disposed)return;
    const time=action.time;
    let i=0;while(i<FRAMES.length-2&&time>FRAMES[i+1].at)i++;
    const a=FRAMES[i],b=FRAMES[i+1],p=ease((time-a.at)/(b.at-a.at));
    hand.position.set(...a.p.map((value,k)=>lerp(value,b.p[k],p)));
    // The fallback humanoid's face is higher than the round sprite's face.
    const raise=ease(time/.36)*(1-ease((time-1.10)/.30));
    if(!sprite)hand.position.y+=.58*raise;
    bottle.rotation.set(lerp(a.tilt,b.tilt,p),0,lerp(a.roll,b.roll,p));
    hand.scaling.setAll(lerp(a.size,b.size,p));
    const drinking=time>=.50&&time<=.90;
    const gulp=drinking?Math.sin((time-.50)/.40*Math.PI*4):0;
    hand.position.y+=gulp*.025;bottle.rotation.x+=gulp*.035;
    const settle=ease(time/.16)*(1-ease((time-1.10)/.30));
    bodyMotion={hop:.025*raise,sx:1+.028*settle-gulp*.009,sy:1-.025*settle+gulp*.017,lean:-.045*raise,spin:0};
    rig.position.y=hop+bodyMotion.hop;
    rig.rotation.y=angle-(root.rotation.y||0);
    cork.setEnabled(time<.27);cork.position.y=.49+ease((time-.12)/.15)*.22;
    // Drain the ruby body to a paler empty flask through the gulp phase.
    const drained=ease((time-POTION_TIMING.sip)/.35);
    ruby.diffuseColor.set(lerp(.851,.63,drained),lerp(.345,.76,drained),lerp(.427,.69,drained));
    rig.computeWorldMatrix(true);hand.computeWorldMatrix(true);bottle.computeWorldMatrix(true);mouth.computeWorldMatrix(true);
  }
  function start({facing,onSip}={}){
    if(disposed||action)return false;
    if(facing&&Math.hypot(facing.x,facing.z)>.0001)angle=Math.atan2(facing.x,facing.z);
    action={time:0,sipped:false,onSip};pose();return true;
  }
  function update(dt,facing,_cameraAlpha,{paused=false,hop:bodyHop=0}={}){
    if(disposed)return;
    if(!action&&facing&&Math.hypot(facing.x,facing.z)>.0001)angle=Math.atan2(facing.x,facing.z);
    if(!paused){
      hop=Number.isFinite(bodyHop)?bodyHop:0;
      if(action)action.time+=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
    }
    pose();
    if(paused||!action)return;
    if(!action.sipped&&action.time>=POTION_TIMING.sip){
      action.sipped=true;const callback=action.onSip;action.onSip=null;
      callback?.(mouth.getAbsolutePosition().clone());
      if(disposed||!action)return;
    }
    if(action.time>=POTION_TIMING.duration){action=null;pose();}
  }
  function cancel(){if(disposed)return;action=null;pose();}
  function dispose(){
    if(disposed)return;disposed=true;action=null;bodyMotion={...REST};
    root.onDisposeObservable.remove(disposeObserver);rig.dispose();materials.forEach(m=>m.dispose());
  }
  const disposeObserver=root.onDisposeObservable.add(dispose);pose();
  return {rig,hand,bottle,mouth,meshes,start,update,cancel,dispose,
    get active(){return !!action;},get bodyMotion(){return {...bodyMotion};},
    get state(){return {active:!!action,time:action?.time||0,sipped:!!action?.sipped,disposed};}};
}
