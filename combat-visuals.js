import {applyCelShading} from './cel.js?v=efee0e5a';

// Weapon motion lives beside the billboard, never inside it. The collision root
// stays grounded while hands, weapon tips and release effects move in real 3D.
export const COMBAT_TIMING = Object.freeze({
  knight: {windup: .105, duration: .38},
  mage: {windup: .14, duration: .44},
  ranger: {windup: .16, duration: .46}
});
export const COMBAT_ACTION_TIMING=Object.freeze({
  knight:{basic:COMBAT_TIMING.knight,skill:{windup:.22,duration:.72},ultimate:{windup:.48,duration:1.16}},
  mage:{basic:COMBAT_TIMING.mage,skill:{windup:.28,duration:.78},ultimate:{windup:.50,duration:1.18}},
  ranger:{basic:COMBAT_TIMING.ranger,skill:{windup:.26,duration:.78},ultimate:{windup:.48,duration:1.14}}
});
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const ease=n=>{n=clamp(n);return n*n*(3-2*n);};
const mix=(a,b,n)=>a+(b-a)*n;
const REST_BODY={hop:0,sx:1,sy:1,lean:0,spin:0};
// Each special has a separate hand/weapon trajectory, sampled in seconds.
// r/l: glove anchors, w: weapon rotation, rr/lr: wrist rotation, b: body motion.
const SPECIAL_POSES={
 knight:{
  skill:[
   {at:0},
   {at:.14,r:[.88,.94,-.24],l:[-.43,.83,.02],w:[.8,0,-.4],lr:[0,1.15,0],b:{sx:1.09,sy:.9,lean:.1,spin:-.25}},
   {at:.22,r:[.78,1.03,.20],l:[-.40,.94,.04],w:[Math.PI/2,0,0],lr:[0,1.15,0],b:{hop:.12,sx:.96,sy:1.07}},
   {at:.46,r:[.78,1.03,.20],l:[-.40,.94,.04],w:[Math.PI/2,0,0],lr:[0,1.15,0],b:{hop:.24,sx:.97,sy:1.05,spin:Math.PI*1.5}},
   {at:.58,r:[.70,.94,.16],l:[-.45,.87,.03],w:[1.2,0,-.2],lr:[0,.8,0],b:{sx:1.09,sy:.91,spin:Math.PI*2}},
   {at:.72,b:{spin:Math.PI*2}}
  ],
  ultimate:[
   {at:0},
   {at:.17,r:[.20,.76,.20],l:[-.02,.68,.18],w:[-.35,0,0],b:{sx:1.13,sy:.83,lean:-.07}},
   {at:.34,r:[.08,1.80,.10],l:[-.11,1.64,.10],w:[-.22,0,0],b:{hop:.42,sx:.93,sy:1.12,lean:-.05}},
   {at:.42,r:[.08,1.86,.16],l:[-.10,1.70,.16],w:[-.1,0,0],b:{hop:.48,sx:.95,sy:1.09}},
   {at:.48,r:[.08,1.25,.48],l:[-.10,1.12,.48],w:[3.05,0,0],b:{sx:1.17,sy:.80,lean:.08}},
   {at:.66,r:[.10,1.18,.46],l:[-.10,1.06,.46],w:[3.00,0,0],b:{sx:1.07,sy:.93}},
   {at:.88,r:[.52,1.04,.20],l:[-.48,.91,.12],w:[1.25,0,-.12],b:{hop:.08,sx:.98,sy:1.03}},
   {at:1.16}
  ]
 },
 mage:{
  skill:[
   {at:0},
   {at:.17,r:[.98,1.04,-.22],l:[-.80,1.12,.30],w:[1.0,0,-.1],rr:[0,-1.15,0],b:{sx:1.06,sy:.92,lean:.13}},
   {at:.28,r:[.84,1.10,.30],l:[-.78,1.24,.40],w:[1.3,0,0],rr:[0,-.80,0],b:{hop:.12,sx:.98,sy:1.05,lean:.09}},
   {at:.49,r:[.34,1.16,.48],l:[-.90,1.16,.30],w:[1.25,0,.12],rr:[0,1.15,0],b:{hop:.17,sx:.97,sy:1.05,lean:-.14}},
   {at:.62,r:[.62,.96,.26],l:[-.88,1.01,.24],w:[.75,0,-.16],rr:[0,.55,0],b:{sx:1.05,sy:.95,lean:-.08}},
   {at:.78}
  ],
  ultimate:[
   {at:0},
   {at:.18,r:[.20,.76,.20],l:[-.02,.65,.20],w:[.06,0,0],b:{sx:1.10,sy:.87}},
   {at:.36,r:[.12,1.72,.10],l:[-.08,1.56,.10],w:[0,0,0],b:{hop:.22,sx:.95,sy:1.09}},
   {at:.50,r:[.10,1.92,.12],l:[-.10,1.76,.12],w:[0,0,0],b:{hop:.38,sx:.94,sy:1.11}},
   {at:.72,r:[.12,1.84,.16],l:[-.10,1.66,.16],w:[-.10,0,0],b:{hop:.44,sx:.97,sy:1.05}},
   {at:.96,r:[.56,1.18,.26],l:[-.52,1.03,.20],w:[.3,0,-.14],b:{sx:1.07,sy:.92}},
   {at:1.18}
  ]
 },
 ranger:{
  skill:[
   {at:0},
   {at:.16,r:[-.42,1.07,-.08],l:[-.42,1.07,.56],w:[0,-.45,.22],draw:.64,b:{sx:1.07,sy:.92,lean:.10}},
   {at:.26,r:[-.38,1.08,-.12],l:[-.38,1.08,.64],w:[0,0,0],draw:.025,b:{hop:.12,sx:.96,sy:1.06}},
   {at:.37,r:[-.16,1.05,-.18],l:[-.30,1.05,.54],w:[0,.55,-.22],draw:.08,b:{hop:.17,sx:.98,sy:1.04,lean:-.12}},
   {at:.48,r:[.06,.98,.02],l:[-.46,.98,.58],w:[0,-.28,.18],draw:.025,b:{sx:1.06,sy:.94,lean:.09}},
   {at:.59,r:[.18,.93,.08],l:[-.52,.95,.46],w:[0,.16,-.1],b:{lean:-.04}},
   {at:.78}
  ],
  ultimate:[
   {at:0},
   {at:.16,r:[.02,.62,.06],l:[-.42,.83,.24],lr:[-.55,0,0],draw:.30,b:{sx:1.12,sy:.85,lean:.07}},
   {at:.32,r:[-.22,.99,.18],l:[-.22,1.55,.18],lr:[-1.25,0,0],w:[0,0,0],draw:.56,b:{hop:.12,sx:.95,sy:1.09,lean:-.08}},
   {at:.46,r:[-.18,1.02,.16],l:[-.18,1.72,.16],lr:[-Math.PI/2,0,0],w:[0,0,0],draw:.70,b:{hop:.28,sx:.96,sy:1.08,lean:-.07}},
   {at:.48,r:[-.18,.99,.16],l:[-.18,1.76,.16],lr:[-Math.PI/2,0,0],w:[0,0,0],draw:.025,b:{hop:.38,sx:.95,sy:1.10,lean:-.07}},
   {at:.68,r:[-.14,1.08,.14],l:[-.18,1.66,.16],lr:[-1.45,0,0],w:[0,0,0],b:{hop:.22,sx:1.02,sy:.97,lean:-.04}},
   {at:.92,r:[.14,.93,.12],l:[-.44,1.12,.32],lr:[-.65,0,0],w:[0,-.10,0],b:{sx:1.06,sy:.92}},
   {at:1.14}
  ]
 }
};

export function createCombatVisuals(B,scene,{root,heroClass='knight'}={}) {
  const cls=COMBAT_TIMING[heroClass]?heroClass:'knight',V=B.Vector3;
  // The sprite's cyan scenery-occlusion silhouette is drawn in group 1 with a
  // GREATER depth test. Draw equipment afterward, retaining world/body depth,
  // so a foreground glove is never mistaken for scenery hiding the hero.
  scene.setRenderingAutoClearDepthStencil(2,false,false,false);
  const rig=new B.TransformNode('combat-'+cls,scene);rig.parent=root;
  const right=new B.TransformNode('weapon-hand',scene),left=new B.TransformNode('support-hand',scene);
  right.parent=left.parent=rig;
  const ownMaterials=[],meshes=[];
  let disposed=false,clock=0,action=null,attackCount=0,angle=0,hop=0,bodyMotion={...REST_BODY};
  const makeMaterial=(name,color,emission=0)=>{
    const m=new B.StandardMaterial('world-combat-'+name,scene);
    m.diffuseColor=B.Color3.FromHexString(color);m.emissiveColor=m.diffuseColor.scale(emission);
    m.specularColor=B.Color3.Black();ownMaterials.push(m);return m;
  };
  const handMat=makeMaterial('gloves',{knight:'#43c9df',mage:'#c797f3',ranger:'#bce7b8'}[cls]);
  const gold=makeMaterial('brass','#e5b861'),wood=makeMaterial('wood','#926038');
  const silver=makeMaterial('blade','#e0f3e8'),ink=makeMaterial('grip','#435355');
  const decorate=(mesh,parent,material)=>{
    mesh.parent=parent;mesh.material=material;mesh.isPickable=false;
    mesh.renderingGroupId=2;
    mesh.renderOutline=true;mesh.outlineColor=B.Color3.FromHexString('#273a3e');mesh.outlineWidth=.012;
    meshes.push(mesh);return mesh;
  };
  const orb=(name,parent,diameter,material)=>decorate(B.MeshBuilder.CreateSphere(name,{diameter,segments:8},scene),parent,material);
  const box=(name,parent,size,material,pos)=>{const m=decorate(B.MeshBuilder.CreateBox(name,{width:size[0],height:size[1],depth:size[2]},scene),parent,material);if(pos)m.position.set(...pos);return m;};
  const rightGlove=orb('round weapon glove',right,.31,handMat),leftGlove=orb('round support glove',left,.31,handMat);
  rightGlove.scaling.set(1,.9,1);leftGlove.scaling.set(1,.9,1);
  const weapon=new B.TransformNode('held-'+cls,scene);weapon.parent=cls==='ranger'?left:right;
  const tip=new B.TransformNode('weapon-release-point',scene);tip.parent=weapon;
  let shield=null,shieldRig=null,arrow=null,string=null,crystal=null,flash=null;
  const stringPath=[new V(0,-.67,0),new V(0,0,0),new V(0,.67,0)];
  if(cls==='knight') {
    box('sword leather handle',weapon,[.12,.3,.14],ink,[0,.03,0]);
    box('sword golden crossguard',weapon,[.5,.11,.2],gold,[0,.2,0]);
    box('sunsteel blade',weapon,[.18,.94,.075],silver,[0,.72,0]);
    const point=decorate(B.MeshBuilder.CreateCylinder('sword point',{height:.24,diameterBottom:.2,diameterTop:0,tessellation:4},scene),weapon,silver);point.position.y=1.31;
    box('blade gleam',weapon,[.035,.86,.085],gold,[0,.72,0]);tip.position.y=1.42;
    shieldRig=new B.TransformNode('shield forearm anchor',scene);shieldRig.parent=left;
    shield=orb('little round shield',shieldRig,.79,gold);shield.scaling.set(1,1,.24);shield.position.z=.14;
    const face=orb('shield blue face',shieldRig,.64,makeMaterial('shield','#4f9dad'));face.scaling.set(1,1,.25);face.position.z=.23;
    const boss=orb('shield brass boss',shieldRig,.17,gold);boss.position.z=.32;
  } else if(cls==='mage') {
    box('wand wooden handle',weapon,[.105,.72,.105],wood,[0,.24,0]);
    box('wand gold collar',weapon,[.21,.14,.21],gold,[0,.6,0]);
    crystal=decorate(B.MeshBuilder.CreateIcoSphere('wand star crystal',{radius:.22,subdivisions:1},scene),weapon,makeMaterial('crystal','#b8eeff',.65));crystal.position.y=.82;crystal.scaling.y=1.3;
    tip.position.y=1.08;
  } else {
    leftGlove.position.z=.3;
    const path=[];for(let i=0;i<=16;i++){const a=-Math.PI/2+i/16*Math.PI;path.push(new V(0,Math.sin(a)*.67,Math.cos(a)*.31));}
    decorate(B.MeshBuilder.CreateTube('curved wooden bow',{path,radius:.055,tessellation:6,cap:B.Mesh.CAP_ALL},scene),weapon,wood);
    box('bow wrapped grip',weapon,[.13,.26,.13],gold,[0,0,.3]);
    string=decorate(B.MeshBuilder.CreateTube('bow drawstring',{path:stringPath,radius:.015,tessellation:4,updatable:true},scene),weapon,silver);string.renderOutline=false;
    arrow=new B.TransformNode('nocked arrow',scene);arrow.parent=weapon;
    box('arrow shaft',arrow,[.045,.045,1.06],wood,[0,0,.3]);
    const point=decorate(B.MeshBuilder.CreateCylinder('arrowhead',{height:.2,diameterBottom:.14,diameterTop:0,tessellation:4},scene),arrow,silver);point.rotation.x=Math.PI/2;point.position.z=.93;
    box('arrow feather',arrow,[.14,.035,.19],silver,[0,0,-.18]);tip.position.set(0,0,1.03);
  }
  flash=orb('weapon release gleam',tip,.25,makeMaterial('release',{knight:'#fff0bb',mage:'#bdedff',ranger:'#ecf4b7'}[cls],1));
  flash.renderOutline=false;flash.visibility=0;
  applyCelShading(B,scene);

  function idle(){
    right.position.set(.78,.82,.10);left.position.set(-.78,.82,.10);
    right.rotation.setAll(0);left.rotation.setAll(0);weapon.rotation.setAll(0);
    if(shieldRig){shieldRig.position.setAll(0);shieldRig.rotation.setAll(0);}
    if(cls==='knight'){weapon.rotation.set(.12,0,-.18);left.rotation.y=-.12;}
    else if(cls==='mage'){weapon.rotation.set(.15,0,-.3);}
    else{left.position.set(-.68,.93,.35);right.position.set(.35,.85,.12);weapon.rotation.y=-.12;}
  }
  function specialPose(){
    const frames=SPECIAL_POSES[cls][action.kind];
    let index=0;while(index<frames.length-2&&action.time>frames[index+1].at)index++;
    const a=frames[index],b=frames[index+1],t=ease((action.time-a.at)/(b.at-a.at));
    for(const [key,target] of [['r',right.position],['l',left.position],['w',weapon.rotation],['rr',right.rotation],['lr',left.rotation]]){
      const rest=target.asArray(),from=a[key]||rest,to=b[key]||rest;
      target.set(...from.map((n,i)=>mix(n,to[i],t)));
    }
    for(const key of Object.keys(REST_BODY))bodyMotion[key]=mix(a.b?.[key]??REST_BODY[key],b.b?.[key]??REST_BODY[key],t);
    if(shieldRig&&action.kind==='ultimate'){
      // Slide the shield onto the forearm while the free glove joins the hilt.
      const tuck=ease(action.time/.17)*(1-ease((action.time-.78)/.38));
      shieldRig.position.set(-.48*tuck,-.44*tuck,-.12*tuck);shieldRig.rotation.z=.3*tuck;
    }
    if(crystal){const charge=action.time<action.windup?ease(action.time/action.windup):1-ease((action.time-action.windup)/(action.duration-action.windup));crystal.scaling.setAll(1+charge*(action.kind==='ultimate'?.45:.25));crystal.scaling.y*=1.3;}
    if(arrow)arrow.setEnabled(action.time<action.windup||action.time>action.duration-.10);
    return mix(a.draw??.025,b.draw??.025,t);
  }
  function pose(){
    idle();
    bodyMotion={...REST_BODY};
    const breathe=Math.sin(clock*3)*.025;
    right.position.y+=breathe;left.position.y+=breathe;
    rig.position.y=hop;
    // Cancel the parent's gameplay yaw, then use the world-space aim direction.
    rig.rotation.y=angle-(root.rotation.y||0);
    flash.visibility=0;
    let draw=.025;
    if(action){
      const anticipation=ease(action.time/action.windup);
      const after=Math.max(0,action.time-action.windup);
      const recovery=ease(after/(action.duration-action.windup));
      const strike=action.time<action.windup?0:1-recovery;
      const power=action.kind==='ultimate'?1.2:1;
      if(action.kind!=='basic')draw=specialPose();
      else if(cls==='knight'){
        if(action.time<action.windup){
          right.position.z=mix(.1,-.38,anticipation);right.position.y=mix(.82,1.15,anticipation);
          weapon.rotation.x=mix(.12,-.65,anticipation);weapon.rotation.z=mix(-.18,-.85,anticipation);
          right.rotation.y=-.65*anticipation;
        }else{
          // A quick full arm sweep followed by a slower return to the guard pose.
          const sweep=ease(after/.14),returning=ease((after-.14)/Math.max(.01,action.duration-action.windup-.14));
          right.rotation.y=mix(-.65,1.25,sweep)*(1-returning);
          right.position.set(mix(.78,.48,strike),mix(.82,1.02,strike),mix(.1,.48,strike));
          weapon.rotation.x=mix(.12,1.48,strike);weapon.rotation.z=mix(-.18,-.55,strike);
        }
        left.position.z+=.2*(action.time<action.windup?anticipation:strike);left.rotation.y-=.35*strike;
      }else if(cls==='mage'){
        const aimed=action.time<action.windup?anticipation:strike;
        right.position.set(mix(.78,.57,aimed),mix(.82,1.02,aimed),mix(.1,.31,aimed));
        weapon.rotation.x=mix(.15,Math.PI/2,aimed);weapon.rotation.z=mix(-.3,0,aimed);
        left.position.y+=.22*aimed;left.position.z+=.16*aimed;
        if(after>0)right.position.z-=Math.sin(Math.min(1,after/.14)*Math.PI)*.15;
        crystal.scaling.setAll(1+.12*(action.time<action.windup?anticipation:0));crystal.scaling.y*=1.3;
      }else{
        const aimed=action.time<action.windup?anticipation:strike;
        left.position.set(mix(-.68,-.38,aimed),mix(.93,1.05,aimed),mix(.35,.58,aimed));
        weapon.rotation.y=mix(-.12,0,aimed);
        draw=action.time<action.windup?.025+.53*anticipation:.025+Math.sin(after*80)*Math.exp(-after*24)*.09;
        right.position.set(mix(.35,-.38,aimed),mix(.85,1.05,aimed),left.position.z-draw);
        if(after>0)right.position.z-=Math.sin(Math.min(1,after/.17)*Math.PI)*.24;
        arrow.setEnabled(action.time<action.windup||recovery>.85);
      }
      if(action.time>=action.windup&&after<.105){flash.visibility=(1-after/.105)*.8;flash.scaling.setAll((1+after*14)*power);}
    }else{
      if(arrow)arrow.setEnabled(true);
      if(crystal)crystal.scaling.set(1,1.3,1);
    }
    if(string){
      stringPath[1].z=-draw;
      B.MeshBuilder.CreateTube('bow drawstring',{path:stringPath,instance:string},scene);
      arrow.position.z=-draw;
      tip.position.z=1.03-draw;
    }
    rig.position.y=hop+bodyMotion.hop;
    rig.rotation.y=angle+bodyMotion.spin-(root.rotation.y||0);
    rig.computeWorldMatrix(true);right.computeWorldMatrix(true);left.computeWorldMatrix(true);weapon.computeWorldMatrix(true);tip.computeWorldMatrix(true);
  }
  function getMuzzle(){return tip.getAbsolutePosition().clone();}
  function attack({kind='basic',facing,onRelease}={}){
    if(disposed||action&&(action.kind!=='basic'||!action.released))return false;
    if(!['basic','skill','ultimate'].includes(kind))kind='basic';
    if(facing&&Math.hypot(facing.x,facing.z)>.0001)angle=Math.atan2(facing.x,facing.z);
    const timing=COMBAT_ACTION_TIMING[cls][kind];
    action={kind,time:0,...timing,released:false,onRelease};attackCount++;
    pose();return true;
  }
  function update(dt,facing,cameraAlpha,{paused=false,hop:bodyHop=0,moving=false}={}){
    if(disposed)return;
    if(!action&&facing&&Math.hypot(facing.x,facing.z)>.0001)angle=Math.atan2(facing.x,facing.z);
    if(!paused){
      dt=clamp(Number.isFinite(dt)?dt:0,0,.1);clock+=dt;hop=Number.isFinite(bodyHop)?bodyHop:0;
      if(action)action.time+=dt;
    }
    pose();
    if(!paused&&action){
      if(!action.released&&action.time>=action.windup){
        action.released=true;const callback=action.onRelease;action.onRelease=null;
        callback?.(getMuzzle());
        if(disposed)return;
      }
      if(action&&action.time>=action.duration){action=null;pose();}
    }
  }
  function cancel(){if(disposed)return;action=null;pose();}
  function dispose(){if(disposed)return;disposed=true;action=null;bodyMotion={...REST_BODY};rig.dispose();ownMaterials.forEach(m=>m.dispose());}
  root.onDisposeObservable.add(dispose);pose();
  return {rig,right,left,weapon,tip,meshes,heroClass:cls,attack,update,getMuzzle,cancel,dispose,
    get busy(){return !!action&&(action.kind!=='basic'||!action.released);},get active(){return !!action;},
    get bodyMotion(){return {...bodyMotion};},
    get state(){return {active:!!action,time:action?.time||0,windup:action?.windup||0,duration:action?.duration||0,released:!!action?.released,kind:action?.kind||null,attackCount,disposed};}};
}
