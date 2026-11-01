import {enableRightDragOrbit} from './camera-controls.js?v=9517e800';
import {createImpactFeedback} from './impact-effects.js?v=9517e800';
import {createDashTrail} from './dash-trail.js?v=9517e800';
import {createLootBeacon} from './loot-beacon.js?v=9517e800';
import {createLootAppearance} from './loot-appearance.js?v=9517e800';
import {createBossLane} from './boss-lane.js?v=9517e800';
import {chooseTarget,enemyDistance,CREATURE_NAMES} from './targeting.js?v=9517e800';
import {enemyProfile} from './enemy-profile.js?v=9517e800';
import {createBossPresence} from './boss-presence.js?v=9517e800';
import {createWorldLighting,setWorldLighting} from './lighting.js?v=9517e800';
import {createWorld} from './world.js?v=9517e800';
import {normalizeTreeStyle} from './tree-style-options.js?v=9517e800';
import {treeStyleMenuHTML,treeStyleName} from './tree-style-ui.js?v=9517e800';
import {findClearPosition,resolveMovement} from './world-navigation.js?v=9517e800';
import {createAudio} from './audio.js?v=9517e800';
import {CHIP_TRACKS,THEME_PLAYLISTS} from './chiptune-score.js?v=9517e800';
import {createSpriteLibrary} from './sprites.js?v=9517e800';
import {applyCelShading} from './cel.js?v=9517e800';
import {createVillagers} from './villagers.js?v=9517e800';
import {createCampRescues} from './camp-rescues.js?v=9517e800';
import {createTownGuards,GUARD_REACH} from './town-guards.js?v=9517e800';
import {createQuestMarkers} from './quest-markers.js?v=9517e800';
import {QUESTS,questStatus,questObjectives,acceptQuest,claimQuest,recordQuestEvent,setTrackedQuest} from './quests.js?v=9517e800';
import {mainQuestView,sideQuestView,questCardHTML,questObjectiveHTML,questRewardText,questLogHTML,questDialogueHTML,questGiverHTML,trackedQuestInfo,questGiverState as getQuestGiverState} from './quest-ui.js?v=9517e800';
import {createRenderer} from './renderer.js?v=9517e800';
import {bindGameLifecycle} from './game-lifecycle.js?v=9517e800';
import {createCombatVisuals} from './combat-visuals.js?v=9517e800';
import {createPotionAnimation} from './potion-animation.js?v=9517e800';
import {createHealingEffects} from './healing-effects.js?v=9517e800';
import {createTitleScene} from './title-scene.js?v=9517e800';
import {createAbilityEffects,ABILITY_CUES} from './ability-effects.js?v=9517e800';
import {CLASSES,SAVE_KEY,newGame,stats,addXP,xpNeeded,makeLoot,equip,parseSave,questInfo,RARITIES} from './core.js?v=9517e800';

const $=id=>document.getElementById(id),B=window.BABYLON,V=B?.Vector3;
const canvas=$('game'),sound=createAudio();
let engine,scene,camera,sun,shadow,world,hero,fox,sprites=null,selectedClass='knight',save=newGame(),mode='intro',zone='overworld',backend='WebGL',worldGeneration=0,t=0,hudTime=0,saveTime=0,lastZone='',inCombat=0;
let enemies=[],projectiles=[],effects=[],drops=[],floaters=[],respawns=[],telegraphs=[],nearby=null,target=null,preferredTarget=null,targetMarker=null,clickTarget=null,boss=null,villagers=null,campRescues=null,townGuards=null,questMarkers=null,abilityEffects=null,impacts=null,dashTrail=null;
let attackCD=0,skillCD=0,ultCD=0,dashCD=0,dashTime=0,invincible=0,shieldTime=0,petCD=0,attackAnim=0,combo=0,comboTime=0,shake=0,paused=false,fishing=null,lastFacing=new V(0,0,1);
const keys=new Set(),touch={x:0,z:0},materials=new Map(),camTarget=new V(0,0,0),temp=new V();
const clearedCamps=new Set();
let saved=null;try{saved=parseSave(localStorage.getItem(SAVE_KEY));}catch{}
applyAudioMix(saved?.settings??save.settings);
let treeStyleBusy=false,introWorldReusable=false;
let titleScene=null,titlePaused=false,titleMusic=saved?.settings.sound??save.settings.sound,titleClock=0;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function mat(hex,em=0,alpha=1){const key=hex+em+alpha;if(materials.has(key))return materials.get(key);const m=new B.StandardMaterial(key,scene);m.diffuseColor=B.Color3.FromHexString(hex);m.emissiveColor=m.diffuseColor.scale(em);m.specularColor=new B.Color3(.04,.04,.04);m.alpha=alpha;materials.set(key,m);return m;}
function sphere(name,pos,scale,color,parent=null){const m=B.MeshBuilder.CreateSphere(name,{diameter:1,segments:6},scene);m.position.copyFrom(pos);m.scaling.copyFrom(scale);m.material=mat(color);m.isPickable=false;if(parent)m.parent=parent;return m;}
function box(name,pos,size,color,parent=null){const m=B.MeshBuilder.CreateBox(name,{size:1},scene);m.position.copyFrom(pos);m.scaling.copyFrom(size);m.material=mat(color);m.isPickable=false;if(parent)m.parent=parent;return m;}
function cone(name,pos,r,h,color,parent=null){const m=B.MeshBuilder.CreateCylinder(name,{height:h,diameterBottom:r*2,diameterTop:0,tessellation:7},scene);m.position.copyFrom(pos);m.material=mat(color);m.isPickable=false;if(parent)m.parent=parent;return m;}
function ring(pos,r,color,life=.5){const m=B.MeshBuilder.CreateTorus('spell ring',{diameter:r*2,thickness:.09,tessellation:40},scene);m.position.set(pos.x,.12,pos.z);m.material=mat(color,1);m.isPickable=false;effects.push({mesh:m,life,max:life,kind:'ring'});return m;}
function slash(pos,facing){const paths=[[],[]],angle=Math.atan2(facing.x,facing.z);for(let i=0;i<=18;i++){const a=angle-.95+i/18*1.9;for(let j=0;j<2;j++){const r=1.6+j*.38*Math.sin(i/18*Math.PI);paths[j].push(new V(Math.sin(a)*r,.65,Math.cos(a)*r));}}const mesh=B.MeshBuilder.CreateRibbon('sunsteel arc',{pathArray:paths,sideOrientation:B.Mesh.DOUBLESIDE},scene);mesh.position.copyFrom(pos);mesh.material=mat('#fff1b6',1);mesh.isPickable=false;effects.push({mesh,life:.18,max:.18,kind:'ring'});}
function burst(pos,color,n=9){for(let i=0;i<n;i++){const m=sphere('mote',pos.clone(),new V(.13,.13,.13),color);m.material=mat(color,.7);effects.push({mesh:m,life:.5+Math.random()*.35,max:.85,kind:'spark',velocity:new V((Math.random()-.5)*5,Math.random()*4,(Math.random()-.5)*5)});}}
function floating(text,pos,color='#fff2ce',big=false){const el=document.createElement('div');el.className='floating-number'+(big?' big':'');el.textContent=text;el.style.color=color;$('float-layer').append(el);floaters.push({el,pos:pos.clone(),life:1.2});}
function toast(title,body='',icon='✦'){const el=document.createElement('div');el.className='game-toast';el.innerHTML=`<span>${icon}</span><div><b>${esc(title)}</b>${body?`<small>${esc(body)}</small>`:''}</div>`;$('toast-stack').append(el);setTimeout(()=>el.remove(),4500);}
function announce(title,sub=''){const el=$('zone-banner');el.innerHTML=`<small>${esc(sub)}</small><strong>${esc(title)}</strong>`;el.hidden=false;el.classList.add('visible');setTimeout(()=>{el.classList.remove('visible');el.hidden=true;},3200);}
function attachHeroEffects(actor,cls){
 actor.restBodyScale=actor.body.scaling.clone();
 actor.weaponParts=actor.sprite?[]:[actor.weapon,...actor.root.getChildMeshes().filter(mesh=>mesh.name==='guard'||mesh.name==='star crystal')];
 actor.potion=createPotionAnimation(B,scene,{root:actor.root,heroClass:cls,sprite:!!actor.sprite});
 actor.healing=createHealingEffects(B,scene,{root:actor.root,sprite:actor.sprite||actor.body});
 return actor;
}
function potionEquipment(){const drinking=!!hero?.potion?.active;if(hero?.combat)hero.combat.rig.setEnabled(!drinking);else if(hero){hero.weaponParts.forEach(mesh=>mesh.setEnabled(!drinking));hero.arms[1]?.setEnabled(!drinking);}}
function cancelPotion(){hero?.potion?.cancel();potionEquipment();}
function createHero(cls){
 if(sprites){const root=new B.TransformNode('hero',scene),body=new B.TransformNode('sprite-bob',scene);body.parent=root;const sprite=sprites.createHero(cls,body,2.35);const dummy=()=>{const n=new B.TransformNode('animation-anchor',scene);n.parent=root;return n;};const halo=actorShadow(root,.64);halo.name='hero shadow';return attachHeroEffects({root,body,feet:[dummy(),dummy()],arms:[dummy(),dummy()],weapon:dummy(),cape:dummy(),sprite,halo,combat:createCombatVisuals(B,scene,{root,heroClass:cls})},cls);}
 const root=new B.TransformNode('hero',scene),c=CLASSES[cls].color;
 const feet=[sphere('boot',new V(-.25,.2,0),new V(.4,.45,.6),'#554737',root),sphere('boot',new V(.25,.2,0),new V(.4,.45,.6),'#554737',root)];
 const body=sphere('tunic',new V(0,.85,0),new V(1,1.15,.75),c,root);
 box('belt',new V(0,.65,-.03),new V(.98,.16,.77),'#674c37',root);
 sphere('face',new V(0,1.6,.05),new V(.88,.9,.83),'#f2cf9b',root);
 sphere('hair',new V(0,1.85,-.16),new V(.96,.68,.75),'#654735',root);
 for(const x of [-.19,.19])sphere('eyes',new V(x,1.64,.43),new V(.085,.13,.07),'#283432',root);
 const armL=sphere('arm',new V(-.58,.96,0),new V(.35,.68,.35),c,root),armR=sphere('arm',new V(.58,.96,0),new V(.35,.68,.35),c,root);
 const cape=box('cape',new V(0,.92,-.48),new V(.8,1.15,.13),cls==='mage'?'#634c88':cls==='ranger'?'#385f4a':'#ac674b',root);cape.rotation.x=-.16;
 let weapon;
 if(cls==='knight'){sphere('helmet',new V(0,1.95,-.07),new V(1.05,.53,1),'#adbdb7',root);box('helmet crest',new V(0,2.2,-.04),new V(.15,.34,.75),'#b45243',root);weapon=box('blade',new V(.88,1.2,.35),new V(.14,1.5,.22),'#d9edf0',root);box('guard',new V(.88,.6,.35),new V(.6,.13,.24),'#d9b46b',root);const shield=sphere('shield',new V(-.79,.95,.12),new V(.28,.95,.8),'#547e89',root);box('shield emblem',new V(-.94,.96,.13),new V(.05,.45,.12),'#e8c477',root);}
 if(cls==='mage'){cone('wizard hat',new V(0,2.37,-.05),.65,1.1,'#735c9b',root);const brim=B.MeshBuilder.CreateCylinder('hat brim',{diameter:1.55,height:.12,tessellation:10},scene);brim.parent=root;brim.position.y=1.96;brim.material=mat('#8e71b6');brim.isPickable=false;weapon=box('staff',new V(.8,1.15,.25),new V(.14,2.15,.14),'#78593c',root);const gem=sphere('star crystal',new V(.8,2.3,.25),new V(.44,.65,.44),'#a5d9f0',root);gem.material=mat('#a5d9f0',.6);}
 if(cls==='ranger'){cone('hood',new V(0,2.05,-.05),.61,.65,'#4b8058',root);weapon=B.MeshBuilder.CreateTorus('bow',{diameter:1.25,thickness:.11,tessellation:14},scene);weapon.parent=root;weapon.position.set(.78,1.1,.25);weapon.rotation.z=Math.PI/2;weapon.material=mat('#bc9255');weapon.isPickable=false;box('quiver',new V(.24,1.06,-.64),new V(.4,.9,.35),'#6b4d36',root);}
 root.getChildMeshes().forEach(m=>shadow?.addShadowCaster(m));return attachHeroEffects({root,body,feet,arms:[armL,armR],weapon,cape},cls);
}
// Contact ink sits above painted paving; the raised arena needs its own height.
function contactShadowHeight(root){return world?.surfaceHeight?.(root.position.x,root.position.z)>0?.025:zone==='dungeon'&&Math.hypot(root.position.x,root.position.z-18)<9.9?.16:.075;}
function actorShadow(root,radius){const mesh=B.MeshBuilder.CreateDisc('grounded creature shadow',{radius,tessellation:20,sideOrientation:B.Mesh.DOUBLESIDE},scene);mesh.parent=root;mesh.rotation.x=Math.PI/2;mesh.position.y=contactShadowHeight(root);mesh.material=mat('#292431',1,.54);mesh.material.disableLighting=true;mesh.material.specularColor=B.Color3.Black();mesh.isPickable=false;return mesh;}
function landingDust(position,size=1){if(effects.length>120)return;for(let i=0;i<3;i++){const a=i/3*Math.PI*2+Math.random()*.4,m=B.MeshBuilder.CreateIcoSphere('landing puff',{radius:.10*size,subdivisions:1},scene);m.position.copyFrom(position).addInPlace(new V(Math.sin(a)*.28*size,.10,Math.cos(a)*.28*size));m.material=mat('#d3c79e',0,.35);m.isPickable=false;effects.push({mesh:m,life:.24,max:.24,kind:'dust',velocity:new V(Math.sin(a)*.6,.2,Math.cos(a)*.6)});}}
function updateActorMotion(actor,mesh,dt,moving,pace=1){const motion=sprites.animate(mesh,dt,{moving,pace,windup:actor.windup||0,hurt:actor.hurt||0});if(!motion)return;actor.halo.scaling.setAll(1-motion.hop*.55);actor.halo.visibility=1-motion.hop*.7;if(motion.landed&&moving&&dist(actor.root.position,hero.root.position)<18)landingDust(actor.root.position,actor.kind==='boss'?1.7:.75);}
function createFox(){const root=new B.TransformNode('fox',scene);if(sprites){const sprite=sprites.createCreature('fox',root,1.65),tail=new B.TransformNode('fox-tail-anchor',scene);tail.parent=root;return {root,tail,sprite,kind:'fox',halo:actorShadow(root,.42),facing:new V(0,0,-1)};}sphere('fox body',new V(0,.43,0),new V(.65,.6,.95),'#d59650',root);sphere('fox head',new V(0,.74,.38),new V(.7,.6,.65),'#e7a95f',root);sphere('fox muzzle',new V(0,.65,.68),new V(.38,.28,.3),'#f3dfb5',root);for(const x of [-.25,.25]){cone('fox ear',new V(x,1.12,.34),.2,.42,'#bd7642',root);sphere('fox eye',new V(x*.6,.8,.66),new V(.07,.09,.06),'#252e2a',root);}const tail=cone('fox tail',new V(0,.6,-.7),.25,.85,'#efca8a',root);tail.rotation.x=-.8;root.getChildMeshes().forEach(m=>shadow?.addShadowCaster(m));return {root,tail};}
async function boot(){
 const lifecycle=bindGameLifecycle(window,{
  stopRenderLoop:()=>engine?.stopRenderLoop(),persist:()=>{if(hero&&mode!=='intro')persist();},
  disposeWorld:()=>{try{clearTitleBackdrop();clearZoneActors();}finally{world?.dispose();}},disposeScene:()=>scene?.dispose(),
  disposeSprites:()=>sprites?.dispose(),disposeSound:()=>sound.dispose(),disposeEngine:()=>engine?.dispose(),
  onError:(stage,error)=>console.info('Page cleanup:',stage,error)
 });
 try{
 if(!B)throw Error('The game engine could not load. Please reload.');
 window.EmberwildLoading?.set(10,'Waking the valley…');
 const renderer=await createRenderer(B,canvas,{gpuAvailable:!!navigator.gpu,location});
 if(lifecycle.disposed){renderer?.engine?.dispose();return;}
 if(!renderer){window.EmberwildLoading?.set(12,'Finding a path into the valley…');return;}
 ({engine,backend}=renderer);engine.setHardwareScalingLevel(Math.max(1,devicePixelRatio/1.4));
 scene=new B.Scene(engine);abilityEffects=createAbilityEffects(B,scene);impacts=createImpactFeedback(B,scene);dashTrail=createDashTrail(B,scene);scene.clearColor=new B.Color4(.64,.79,.8,1);scene.fogMode=B.Scene.FOGMODE_EXP2;scene.fogDensity=.006;scene.fogColor=new B.Color3(.64,.79,.8);
 ({sun,shadow}=createWorldLighting(B,scene));
 camera=new B.ArcRotateCamera('camera',-Math.PI/2-.28,.82,35,V.Zero(),scene);camera.minZ=.2;camera.maxZ=180;camera.fov=.72;
 camera.lowerBetaLimit=.4;camera.upperBetaLimit=1.15;camera.lowerRadiusLimit=19;camera.upperRadiusLimit=52;camera.wheelDeltaPercentage=.012;camera.pinchDeltaPercentage=.012;camera.panningSensibility=0;
 camera.attachControl(canvas,true);enableRightDragOrbit(camera);camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');camera.inputs.attached.pointers.buttons=[2];camera.inputs.attached.pointers.angularSensibilityX=450;camera.inputs.attached.pointers.angularSensibilityY=650;camera.inputs.attached.pointers.pinchToPanMaxDistance=0;camera.inputs.attached.pointers.multiTouchPanAndZoom=false;
 const glow=new B.GlowLayer('magic',scene,{blurKernelSize:24});glow.intensity=.25;
 scene.imageProcessingConfiguration.contrast=1.05;scene.imageProcessingConfiguration.exposure=1.03;
 window.EmberwildLoading?.set(20,'Loading characters and companions…');
 try{sprites=await createSpriteLibrary(B,scene,{onProgress:(loaded,total)=>{if(!lifecycle.disposed)window.EmberwildLoading?.set(20+45*loaded/total,'Loading characters and companions…');}});}catch(err){console.info('Using procedural character fallback',err.message);}
 if(lifecycle.disposed){sprites?.dispose();return;}
 window.EmberwildLoading?.set(65,'Growing trees, gardens, and villages…');
 // Paint the gauge before the synchronous world construction blocks this turn.
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 if(lifecycle.disposed)return;
 buildZone('overworld',false);introWorldReusable=true;hero=createHero(selectedClass);hero.root.position.set(0,0,-5);fox=createFox();fox.root.position.set(1,0,-6);
 setupTitleBackdrop();
 resize();window.addEventListener('resize',resize);new ResizeObserver(resize).observe(canvas);
 window.EmberwildLoading?.set(85,'Preparing your first view…');
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 if(lifecycle.disposed)return;
 bind();let firstFrame=true;
 engine.runRenderLoop(()=>{
  try{
   const dt=Math.min(.04,engine.getDeltaTime()/1000);tick(dt);scene.render();
   if(firstFrame&&scene.isReady()){
    const ready=`Ready when you are. · ${backend}`;
    if(window.EmberwildLoading?.complete(ready)===false){engine.stopRenderLoop();return;}
    firstFrame=false;$('loading-status').textContent=ready;$('start-button').disabled=false;
    if(saved){$('continue-button').hidden=false;$('continue-button').disabled=false;$('continue-button').textContent=`Continue · Level ${saved.level} ${CLASSES[saved.heroClass].name}`;}
   }
  }catch(error){if(!firstFrame)throw error;engine.stopRenderLoop();console.error(error);window.EmberwildLoading?.fail('The first view could not load. Reload to try again.');}
 });
 }catch(err){console.error(err);window.EmberwildLoading?.fail(err.message);$('loading-status').textContent=err.message;$('start-button').disabled=true;}
}
function resize(){if(!engine||!camera)return;engine.resize();camera.fov=canvas.clientWidth/canvas.clientHeight<.8?.95:.72;}
let transitioning=false;
function transition(action,label='Following the lanterns…'){
 if(transitioning)return;transitioning=true;paused=true;keys.clear();touch.x=touch.z=0;
 const veil=$('world-transition');$('transition-label').textContent=label;veil.hidden=false;
 // Let the browser paint the loading state before synchronous mesh creation.
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  try{action();veil.hidden=true;}catch(error){console.error(error);$('transition-label').textContent='The path could not load. Reload to continue your saved journey.';$('transition-retry').hidden=false;}
  finally{transitioning=false;}
 }));
}
function launchAdventure(continuing=false){
 // Unlock audio in the click gesture, before the loading transition defers work.
 sound.unlock();transition(()=>start(continuing),continuing?'Returning to your adventure…':'Following the lanterns…');
}
function resetCamera(){camera.alpha=-Math.PI/2-.28;camera.beta=.82;camera.radius=35;camera.inertialAlphaOffset=camera.inertialBetaOffset=camera.inertialRadiusOffset=0;}
function clearTitleBackdrop(){titleScene?.dispose();titleScene=null;}
function setupTitleBackdrop(){
 clearTitleBackdrop();titleScene=createTitleScene(B,scene,{sprites,world,shadow});titleClock=0;titlePaused=false;
 camera.alpha=-Math.PI/2-.08;camera.beta=.84;camera.radius=30;camera.inertialAlphaOffset=camera.inertialBetaOffset=camera.inertialRadiusOffset=0;
 camTarget.set(0,0,2.2);camera.target.set(0,.5,2.2);lastFacing.set(0,0,-1);
 hero.root.position.set(-1.8,0,-5);fox.root.position.set(2,0,-5);hero.root.rotation.y=Math.PI;
 $('title-pause').setAttribute('aria-pressed','false');$('title-pause').setAttribute('aria-label','Pause animated backdrop');$('title-pause').textContent='Ⅱ';
}
function titleMenu(action){
 if(mode!=='intro')return;
 if(action==='home'){closeModal();return;}
 if(action==='adventure'){$('title-class-picker').focus();return;}
 if(action==='map'){map();return;}
 if(action==='town'){openModal('<div class="eyebrow">A PLACE TO CALL HOME</div><h2 class="modal-title">Welcome to Hearthglen.</h2><p class="dialogue">Rest by the fountain, meet Elder Rowan, and find your first quest. Bram forges your equipment, Lysa keeps the inn warm, and Mira always has something cooking.</p><p>Beyond the gates: flowering meadows, hidden treasures, enemy camps, and ancient waystones.</p><button class="secondary" data-action="close">Back to the town square</button>');return;}
 if(action==='controls')openModal('<div class="eyebrow">YOUR ADVENTURE STARTS HERE</div><h2 class="modal-title">Find your own path.</h2><div class="title-help-keys"><kbd>WASD / Arrows</kbd><span>Move around the world</span><kbd>Space · Q · F</kbd><span>Attack, class skill, and ultimate</span><kbd>R · Shift</kbd><span>Drink a potion · Dash</span><kbd>E</kbd><span>Talk, gather, and interact</span><kbd>I · J · M</kbd><span>Inventory · Quests · Map</span><kbd>Right mouse + drag</kbd><span>Rotate the camera · Scroll to zoom</span></div><p>On touch screens, use the movement stick and action buttons. Your adventure saves on this device.</p><button class="secondary" data-action="close">Ready to explore</button>');
}
function resetDynamics(){clearTitleBackdrop();worldGeneration++;cancelPotion();hero?.healing?.clear();hero?.combat?.cancel();abilityEffects?.clear();impacts?.clear();dashTrail?.clear();enemies.forEach(e=>{e.root.dispose();e.hpMesh?.dispose();});enemies=[];for(const list of [projectiles,effects,drops,telegraphs]){list.forEach(e=>e.mesh?.dispose());list.length=0;}floaters.forEach(f=>f.el.remove());floaters=[];respawns=[];boss=null;target=null;preferredTarget=null;targetMarker?.setEnabled(false);nearby=null;clickTarget=null;}
function clearZoneActors(){questMarkers?.dispose();questMarkers=null;villagers?.dispose();villagers=null;campRescues?.dispose();campRescues=null;townGuards?.dispose();townGuards=null;}
function characterSpeech(item,text,actor,life=2.8){
 if(mode!=='play')return;
 if(actor?.root)for(let i=floaters.length-1;i>=0;i--){const f=floaters[i];if(f.stationary&&f.follow===actor.root){f.el.remove();floaters.splice(i,1);}}
 const el=document.createElement('div');el.className='village-greeting';el.style.visibility='hidden';el.textContent=text;el.title=item.name||'';
 $('float-layer').append(el);floaters.push({el,pos:new V(item.x,3,item.z),life,stationary:true,follow:actor?.root});
}
function campGuardCount(id){return enemies.filter(e=>e.campId===id).length;}
function campNeedsRescue(id){return !save.rescued.includes(id)&&world.interactables.some(o=>o.type==='captive'&&o.campId===id);}
function setupZoneActors(){
 clearZoneActors();
 villagers=createVillagers(B,scene,world,sprites,{onGreet:(item,actor)=>{const words={npc:'Welcome, wanderer!',smith:'Good steel. Good day!',inn:'Room by the hearth?',cook:'Something warm?'};characterSpeech(item,item.greetingText||words[item.type],actor);}});
 campRescues=createCampRescues(B,scene,world,sprites,{rescued:save.rescued,onSay:(item,text,actor)=>characterSpeech(item,text,actor,3)});
 townGuards=createTownGuards(B,scene,world,sprites,{onStrike:repelTownThreat,onGreet:(item,actor)=>characterSpeech(item,item.greetingText||'Hearthglen is under our protection.',actor)});
 questMarkers=createQuestMarkers(B,scene,world.interactables);
}
function buildZone(next,spawnMobs=true){resetDynamics();clearZoneActors();if(world?.shadowCasters)for(const mesh of world.shadowCasters)shadow.removeShadowCaster?.(mesh);world?.dispose();zone=next;world=createWorld(B,scene,{zone,difficulty:save.ascension+1,spriteVillagers:!!sprites});world.ground.receiveShadows=true;world.ground.metadata={ground:true};setupZoneActors();
 if(world.shadowCasters)for(const mesh of world.shadowCasters)shadow.addShadowCaster(mesh);
 applyCelShading(B,scene);
 activateZone(next,spawnMobs);
}
function activateZone(next,spawnMobs=true){
 restoreTreeStyle(world);
 setWorldLighting(B,scene,sun,next);
 if(next==='overworld')save.shrines.forEach(id=>world.setShrineActive(id));
 for(const item of world.interactables){if(item.type==='chest'&&save.chests.includes(item.id)&&next==='overworld')item.mesh.setEnabled(false);if(item.type==='herb'&&save.gathered.includes(item.id))item.mesh.setEnabled(false);}
 if(hero){hero.root.position.set(world.spawn.x,0,world.spawn.z);fox.root.position.copyFrom(hero.root.position).addInPlace(new V(1,0,-1));camTarget.copyFrom(hero.root.position);}
 clearedCamps.clear();
 if(spawnMobs){for(const p of world.spawnPoints)spawnEnemy(p.kind,p.x,p.z,p.level||1,p.campId);if(next==='dungeon')spawnEnemy('boss',0,22,save.ascension+3);}
 $('boss-hud').hidden=true;save.zone=next;
}
function start(continuing=false){clearTitleBackdrop();resetCamera();sound.setEnabled(false);sound.unlock();const mix={sound:titleMusic,musicVolume:sound.musicVolume,effectsVolume:sound.effectsVolume};save=continuing&&saved?parseSave(JSON.stringify(saved)):newGame(selectedClass);if(!continuing)Object.assign(save.settings,mix);applyAudioMix(save.settings);selectedClass=save.heroClass;hero.root.dispose();fox.root.dispose();hero=createHero(selectedClass);fox=createFox();
 // Only the untouched title world is reusable. Later restarts need fresh
 // interactables, shrine state and encounters, just as a zone transition does.
 const reuseIntroWorld=introWorldReusable&&zone===save.zone&&save.zone==='overworld';introWorldReusable=false;
 if(reuseIntroWorld){resetDynamics();setupZoneActors();applyCelShading(B,scene);activateZone(save.zone,true);}else buildZone(save.zone,true);
 if(continuing){const restored=findClearPosition({x:save.x,z:save.z},world.obstacles,world.bounds,.48,world.spawn);hero.root.position.x=restored.x;hero.root.position.z=restored.z;}else hero.root.position.set(world.spawn.x,0,world.spawn.z);hero.root.position.y=world.surfaceHeight?.(hero.root.position.x,hero.root.position.z)||0;camTarget.copyFrom(hero.root.position);fox.root.position.copyFrom(hero.root.position).addInPlace(new V(1,0,-1));
 const st=stats(save);save.hp=clamp(save.hp,1,st.maxHp);save.mana=clamp(save.mana,0,st.maxMana);attackCD=skillCD=ultCD=dashCD=dashTime=invincible=shieldTime=petCD=attackAnim=combo=comboTime=shake=inCombat=saveTime=hudTime=0;lastFacing.set(0,0,1);keys.clear();touch.x=touch.z=0;fishing=null;lastZone='';mode='play';paused=false;$('intro').hidden=true;$('hud').hidden=false;$('modal').hidden=true;sound.update(zone==='overworld'&&world.isSafe(hero.root.position.x,hero.root.position.z)?'town':zone,false);sound.setEnabled(save.settings.sound);applyQuality();canvas.focus();updateHUD();announce(continuing?'Welcome home, wanderer.':'Your story starts here.','EMBERWILD');if(!continuing)toast('Meet Elder Rowan','Follow the ! marker by the fountain. Press E to talk.','!');persist();}
function persist(){if(mode==='intro')return;save.x=hero.root.position.x;save.z=hero.root.position.z;save.zone=zone;try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));$('save-status').textContent='Adventure saved · on this device';saved=parseSave(JSON.stringify(save));}catch{$('save-status').textContent='Saving unavailable in this browser';}}

const ENEMY={slime:{hp:55,speed:2.5,damage:10,color:'#75bba0',xp:28,gold:8},mushroom:{hp:85,speed:1.8,damage:13,color:'#bf757b',xp:38,gold:12},wolf:{hp:100,speed:4,damage:15,color:'#708ba1',xp:42,gold:14},golem:{hp:180,speed:1.4,damage:22,color:'#879b8d',xp:65,gold:24},boss:{hp:1200,speed:1.9,damage:28,color:'#8c77a4',xp:400,gold:250}};
function spawnEnemy(kind,x,z,level=1,campId=null){
 const cfg=ENEMY[kind]||ENEMY.slime,profile=enemyProfile(kind),root=new B.TransformNode(kind,scene);root.position.set(x,0,z);const size=profile.fallbackScale;
 let body;
 if(kind==='slime'){body=sphere('jelly',new V(0,.6,0),new V(1.4,1.2,1.35),cfg.color,root);sphere('jelly shine',new V(-.36,.96,.38),new V(.23,.14,.07),'#d0f0ce',root);}
 else if(kind==='mushroom'){body=sphere('stem',new V(0,.65,0),new V(.8,1.1,.8),'#dbcba1',root);sphere('cap',new V(0,1.25,0),new V(1.8,.85,1.7),cfg.color,root);for(const [sx,sz] of [[-.4,.3],[.4,.15],[0,-.4]])sphere('cap spot',new V(sx,1.63,sz),new V(.25,.08,.22),'#f5d4a0',root);}
 else if(kind==='wolf'){body=sphere('wolf',new V(0,.65,0),new V(.9,1,1.3),cfg.color,root);sphere('head',new V(0,1.2,.42),new V(.95,.8,.85),cfg.color,root);for(const sx of [-.3,.3])cone('ear',new V(sx,1.7,.4),.2,.5,cfg.color,root);sphere('snout',new V(0,1.05,.9),new V(.55,.35,.4),'#bac7c3',root);}
 else{body=box('guardian body',new V(0,1,0),new V(1.3,1.7,.9),cfg.color,root);sphere('head',new V(0,2,0),new V(1.2,1,.95),cfg.color,root);for(const sx of [-1,1]){box('arm',new V(sx*.8,1,0),new V(.5,1.5,.65),cfg.color,root);box('foot',new V(sx*.4,.2,.1),new V(.55,.4,.8),'#596b66',root);}const crystal=sphere('heart',new V(0,1.25,.5),new V(.45,.65,.22),kind==='boss'?'#d5a0ec':'#97e2c0',root);crystal.material=mat(kind==='boss'?'#d5a0ec':'#97e2c0',1);if(kind==='boss'){for(let i=0;i<5;i++)cone('crown',new V((i-2)*.27,2.7,0),.16,.7,'#e0bb65',root);}}
 for(const sx of [-.25,.25])sphere('enemy eye',new V(sx,kind==='slime'?.7:kind==='mushroom'?.85:kind==='wolf'?1.28:2.05,kind==='slime'?.62:kind==='mushroom'?.38:.49),new V(.11,.14,.08),kind==='boss'?'#ffc788':'#273a38',root);
 if(sprites){root.getChildMeshes().forEach(m=>m.dispose());body=sprites.createCreature(kind,root,profile.spriteHeight);}
 root.scaling.setAll(sprites?1:size);root.getChildMeshes().forEach(m=>{if(!sprites)shadow.addShadowCaster(m);});
 const barRoot=new B.TransformNode('enemy hp',scene);barRoot.parent=root;barRoot.position.y=profile.barHeight/root.scaling.y;barRoot.scaling.setAll(1/root.scaling.x);
 const bg=B.MeshBuilder.CreatePlane('hp back',{width:profile.barWidth,height:.1},scene);bg.parent=barRoot;bg.billboardMode=B.Mesh.BILLBOARDMODE_ALL;bg.material=mat('#293d35',.3);bg.isPickable=false;
 const hpMesh=B.MeshBuilder.CreatePlane('hp',{width:profile.barWidth-.05,height:.065},scene);hpMesh.parent=barRoot;hpMesh.position.z=-.02;hpMesh.billboardMode=B.Mesh.BILLBOARDMODE_ALL;hpMesh.material=mat('#c57e73',.5);hpMesh.isPickable=false;barRoot.setEnabled(false);
 const presence=kind==='boss'||kind==='golem'?createBossPresence(B,scene,root,{kind,radius:profile.shadowRadius+.1}):null;if(presence)presence.root.scaling.setAll(1/root.scaling.x);
 const mult=1+Math.max(0,level-1)*.25;const e={kind,campId,profile,root,body,presence,hp:cfg.hp*mult,maxHp:cfg.hp*mult,level,cfg,speed:cfg.speed,home:new V(x,0,z),cooldown:1+Math.random(),hpMesh,barRoot,slow:0,phase:Math.random()*6,elite:kind==='boss',windup:0,attackPos:null,pattern:0,hurt:0,facing:new V(Math.sin(x+z),0,Math.cos(x+z)),visualPosition:root.position.clone(),halo:sprites?actorShadow(root,profile.shadowRadius):null};enemies.push(e);if(kind==='boss')boss=e;return e;
}
function nearestEnemy(range=Infinity){return chooseTarget(enemies,hero.root.position,range,preferredTarget);}
function largeEnemyAtPointer(x,y){
 const ownsMesh=(enemy,mesh)=>(enemy.elite||enemy.kind==='golem')&&(mesh===enemy.body||!sprites&&mesh?.parent===enemy.root);
 const pick=scene.pick(x,y,mesh=>enemies.some(enemy=>ownsMesh(enemy,mesh)));
 if(!pick?.hit)return null;
 const enemy=enemies.find(enemy=>ownsMesh(enemy,pick.pickedMesh));if(!enemy)return null;
 const data=enemy.body.metadata;
 if(pick.pickedMesh===enemy.body&&data?.manifest){
  const uv=pick.getTextureCoordinates?.(),m=data.manifest;
  const frame=m.frames.find(frame=>frame.column===data.direction&&frame.row===data.pose);
  if(!uv||!frame)return null;
  // The plane is foot anchored, but its UVs still address the whole inset cell.
  // Reject empty atlas gutters rather than letting the big rectangular card
  // swallow a click on the ground beside the crown or shoulders.
  const px=data.direction*m.cellWidth+1+uv.x*(m.cellWidth-2);
  const py=data.pose*m.cellHeight+m.cellHeight-1-uv.y*(m.cellHeight-2);
  const [left,top,width,height]=frame.tightRect;
  if(px<left||px>left+width||py<top||py>top+height)return null;
 }
 return enemy;
}
function updateTargetFeedback(){
 const safe=world.isSafe(hero.root.position.x,hero.root.position.z);
 const enemy=mode==='play'&&!safe&&!nearby?nearestEnemy(18):null,panel=$('target-hud');
 panel.hidden=!enemy;if(!enemy){targetMarker?.setEnabled(false);return;}
 if(!targetMarker){targetMarker=B.MeshBuilder.CreateTorus('selected creature ring',{diameter:1.65,thickness:.045,tessellation:40},scene);targetMarker.material=mat('#f3d8a1',.55);targetMarker.isPickable=false;}
 targetMarker.setEnabled(true);targetMarker.position.set(enemy.root.position.x,.09,enemy.root.position.z);
 const radius=enemy.profile.targetScale;targetMarker.scaling.set(radius,1,radius);
 $('target-name').textContent=CREATURE_NAMES[enemy.kind]+' · Lv '+enemy.level;
 $('target-fill').style.width=clamp(enemy.hp/enemy.maxHp*100,0,100)+'%';
 $('target-health').textContent=Math.ceil(enemy.hp)+' / '+Math.ceil(enemy.maxHp);
 $('target-hint').textContent=enemyDistance(enemy,hero.root.position)<CLASSES[save.heroClass].range?'Space · '+CLASSES[save.heroClass].attack:save.heroClass==='knight'?'Move closer to strike':'Move closer · F reaches this target';
}
function awardXP(n){const gains=addXP(save,n);if(gains){const st=stats(save);save.hp=st.maxHp;save.mana=st.maxMana;ring(hero.root.position,3,'#f1ce7d',1.2);burst(hero.root.position.add(new V(0,1,0)),'#f1ce7d',22);toast(`Level ${save.level}`,`Health and mana restored. Your power grows.`, '↑');sound.play('level');persist();}}
function grantItem(item){if(save.inventory.length>=100){let least=0;for(let i=1;i<save.inventory.length;i++)if((save.inventory[i].price||0)<(save.inventory[least].price||0))least=i;const sold=save.inventory.splice(least,1)[0];save.gold+=sold.price||0;toast('Made room for a new treasure',`${sold.name} sold for ${sold.price||0} gold.`);}save.inventory.push(item);}
function drop(kind,pos,value){
 const color=kind==='gold'?'#f1cd6a':kind==='shard'?'#9fc7f3':kind==='gear'?RARITIES.find(r=>r.name===value.rarity).color:'#d38887';
 const mesh=createLootAppearance(B,scene,{kind,color});
 mesh.position.copyFrom(pos);mesh.position.y=kind==='gear'?.05:.12;
 const lightColor=kind==='gear'?({rare:'#59dafa',legendary:'#ffd15a',uncommon:'#78e694'}[value.rarity]||color):color;
 const phase=Math.random()*6,beacon=createLootBeacon(B,scene,mesh,lightColor,{beam:kind==='gear'&&value.rarity!=='common',rarity:kind==='gear'?value.rarity:'common',intensity:kind==='gear'?1:.58,phase});
 drops.push({kind,mesh,value,phase,age:0,beacon});
}
function damageEnemy(e,n,critical=false){if(!enemies.includes(e))return;e.hp-=n;impacts?.spawn(e.root.position.add(new V(0,e.profile.impactHeight,0)),CLASSES[save.heroClass].color,critical);e.hurt=.18;inCombat=4;e.barRoot.setEnabled(true);e.hpMesh.scaling.x=clamp(e.hp/e.maxHp,.001,1);floating(Math.round(n)+(critical?'!':''),e.root.position.add(new V(0,e.profile.damageHeight,0)),critical?'#ffe19c':'#fff4d4',critical);burst(e.root.position.add(new V(0,.7,0)),e.cfg.color,4);sound.play('hit');if(e.hp<=0)killEnemy(e);}
function killEnemy(e){sound.play('enemy-pop');const p=e.root.position.clone();enemies.splice(enemies.indexOf(e),1);e.root.dispose();save.kills++;questEvent({type:'kill',kind:e.kind});combo++;comboTime=4;awardXP(e.cfg.xp+Math.floor(e.level*4));drop('gold',p,e.cfg.gold+e.level*3);drop('shard',p.add(new V(.6,0,.4)),e.kind==='golem'?2:1);
 if(Math.random()<.28||e.kind==='golem'||e.kind==='boss')drop('gear',p.add(new V(-.7,0,.3)),makeLoot(save.level,save.heroClass,e.kind==='boss'?1:Math.random()));
 if(Math.random()<.13)drop('potion',p.add(new V(.3,0,-.7)),1);if(combo===5)toast('On a roll!','Five creatures defeated in one streak.','⚔');
 if(e.kind==='boss'){boss=null;$('boss-hud').hidden=true;save.bosses++;save.ascension++;if(save.quest>=2)save.quest=Math.max(save.quest,3);save.gold+=250;save.totalGold+=250;save.shards+=5;const crown={id:'crown-'+save.bosses,name:'Crown of the First Dawn',slot:'charm',rarity:'legendary',level:save.level,damage:8+save.ascension*3,hp:30,crit:.08,price:200};grantItem(crown);sound.play('win');ring(p,8,'#f1c56e',2);persist();const victoryGeneration=worldGeneration;setTimeout(()=>{if(mode==='play'&&worldGeneration===victoryGeneration)openModal(`<div class="eyebrow">THE HOLLOW KING HAS FALLEN</div><h2 class="modal-title">A new dawn.</h2><p>The old crown remembers the sunlight. The valley will remember you.</p><div class="reward-hero">♛</div><h3>Crown of the First Dawn</h3><p class="rarity-legendary">Legendary relic added to your bag</p><div class="stats-grid"><div><b>+250</b><small>GOLD</small></div><div><b>+5</b><small>EMBER SHARDS</small></div><div><b>${save.ascension}</b><small>ASCENSION UNLOCKED</small></div></div><button class="primary" data-action="home">Return to Hearthglen →</button><button class="secondary" data-action="close">Keep exploring</button>`);},700);}
 else if(zone==='overworld')respawns.push({kind:e.kind,campId:e.campId,x:e.home.x,z:e.home.z,level:e.level,time:e.campId?180:55});
 if(e.campId&&!enemies.some(other=>other.campId===e.campId))questEvent({type:'camp',id:e.campId});
 if(e.campId&&!enemies.some(other=>other.campId===e.campId)&&!clearedCamps.has(e.campId)){const camp=world.camps.find(c=>c.id===e.campId);clearedCamps.add(e.campId);toast((camp?.name||'Enemy camp')+' cleared',campNeedsRescue(e.campId)?'Free the captive, then collect the guarded cache.':'The guarded cache is yours. More creatures may return later.','⚑');sound.play('quest');}
 if(save.quest===1&&save.kills===6){toast('A promise kept','Return to Elder Rowan for your reward.','!');sound.play('quest');}burst(p.add(new V(0,1,0)),e.cfg.color,12);}
function hurt(n){if(invincible>0||mode!=='play'||paused)return;const st=stats(save);const taken=Math.max(1,Math.round(n*(1-st.armor)*(shieldTime>0?.35:1)));save.hp=Math.max(0,save.hp-taken);invincible=.55;inCombat=5;shake=.25;floating('-'+taken,hero.root.position.add(new V(0,2.3,0)),'#ff988c',true);sound.play(shieldTime>0?'shield-block':'hurt');if(save.hp<=0){cancelPotion();hero?.healing?.clear();hero?.combat?.cancel();abilityEffects?.clear();impacts?.clear();dashTrail?.clear();mode='dead';sound.play('death');save.gold=Math.max(0,save.gold-Math.floor(save.gold*.1));openModal('<div class="eyebrow">EVERY HERO STUMBLES</div><h2 class="modal-title">The embers remain.</h2><p>Pip brought you back from the edge. You dropped a few coins, but kept your gear and progress.</p><button class="primary" data-action="revive">Wake up in Hearthglen →</button>',false);}}
function fire(from,to,damage,color,speed=20,enemy=false,pierce=false,style='bolt'){
 const dir=to.subtract(from);dir.y=0;dir.normalize();let mesh;
 if(style==='arrow'){
  mesh=new B.TransformNode('flying arrow',scene);mesh.position.copyFrom(from);
  box('arrow shaft',new V(0,0,0),new V(.055,.055,.9),'#e6c48b',mesh);
  const head=cone('arrowhead',new V(0,0,.55),.12,.28,'#e4f0da',mesh);head.rotation.x=Math.PI/2;
  for(const a of [0,Math.PI/2]){const fin=box('arrow feather',new V(0,0,-.33),new V(.3,.025,.25),'#c9e1a8',mesh);fin.rotation.z=a;}
 }else{mesh=sphere('spell',from.clone(),new V(.28,.28,.55),color);mesh.material=mat(color,1);}
 mesh.rotation.y=Math.atan2(dir.x,dir.z);projectiles.push({mesh,velocity:dir.scale(speed),life:1.6,damage,enemy,pierce,style,color,trail:0,hit:new Set()});
}
function beginHeroAction(kind,facing,release,{center=null}={}){
 const cls=save.heroClass,special=kind!=='basic',ability=special?ABILITY_CUES[cls][kind]:null;
 const charge=ability?ability+'-charge':{knight:'sword-charge',mage:'wand-charge',ranger:'bow-draw'}[cls],cue=ability||{knight:'sword-swing',mage:'wand-release',ranger:'bow-release'}[cls];
 let windupFX=null;hero.actionFacing=facing.clone();
 const onRelease=muzzle=>{windupFX?.cancel();if(mode!=='play')return;sound.play(cue);if(special)abilityEffects?.release({heroClass:cls,kind,origin:hero.root.position,center:center||hero.root.position,facing});release(muzzle);};
 if(hero.combat){hero.combat.update(0,facing,camera.alpha,{hop:hero.locomotion?.hop||0});if(hero.combat.attack({kind,facing,onRelease})){sound.play(charge);if(special)windupFX=abilityEffects?.charge({heroClass:cls,kind,root:hero.root,center:center||hero.root.position.clone(),windup:hero.combat.state.windup});}}
 else onRelease(hero.root.position.add(new V(0,1,0)));
}
function attack(){if(mode!=='play'||paused||attackCD>0||hero.potion?.active||hero.combat?.busy)return;const cls=save.heroClass,c=CLASSES[cls],e=nearestEnemy(c.range);attackCD=c.rate;attackAnim=.5;const st=stats(save),critical=Math.random()<st.crit,n=st.damage*(critical?1.8:1);if(e){lastFacing=e.root.position.subtract(hero.root.position);lastFacing.y=0;lastFacing.normalize();hero.root.rotation.y=Math.atan2(lastFacing.x,lastFacing.z);}
 const facing=lastFacing.clone();beginHeroAction('basic',facing,muzzle=>{
 if(cls==='knight'){const p=hero.root.position.add(facing.scale(1.5));slash(hero.root.position,facing);for(const foe of [...enemies])if(enemyDistance(foe,p)<2.3)damageEnemy(foe,n,critical);}
 else{fire(muzzle,muzzle.add(facing.scale(12)),n,c.color,cls==='ranger'?28:19,false,false,cls==='ranger'?'arrow':'bolt');burst(muzzle,c.color,3);}
 });}
function skill(ultimate=false){
 if(mode!=='play'||paused||hero.potion?.active||hero.combat?.active&&hero.combat.state.kind!=='basic')return;
 const cd=ultimate?ultCD:skillCD,cost=ultimate?40:20;if(cd>0)return;if(save.mana<cost){toast('Not enough mana','Mana regenerates while you explore.');return;}
 // A requested special can take priority over a basic wind-up, never another special.
 if(hero.combat?.active)hero.combat.cancel();
 save.mana-=cost;if(ultimate)ultCD=18;else skillCD=6;
 const st=stats(save),c=save.heroClass,kind=ultimate?'ultimate':'skill',enemy=c==='knight'?null:nearestEnemy(ultimate?18:17);
 const center=ultimate&&enemy?enemy.root.position.clone():hero.root.position.clone();
 const facing=enemy?enemy.root.position.subtract(hero.root.position):lastFacing.clone();facing.y=0;if(facing.lengthSquared()<.001)facing.copyFrom(lastFacing);facing.normalize();lastFacing.copyFrom(facing);
 attackAnim=ultimate?1.2:.8;
 beginHeroAction(kind,facing,muzzle=>{const p=hero.root.position.clone();
 if(c==='knight'){const radius=ultimate?7:4.5;for(const e of [...enemies])if(enemyDistance(e,p)<radius){damageEnemy(e,st.damage*(ultimate?3.2:2));if(enemies.includes(e))e.slow=2;}if(ultimate){shieldTime=5;shake=.22;toast('Dawnward','Damage reduced for 5 seconds.','☀');}}
 if(c==='mage'){const impact=ultimate?center:p;for(const foe of [...enemies])if(enemyDistance(foe,impact)<5.5){damageEnemy(foe,st.damage*(ultimate?4:1.5));if(enemies.includes(foe))foe.slow=ultimate?2:5;}if(ultimate)shake=.13;}
 if(c==='ranger'){if(ultimate){for(const foe of [...enemies])if(enemyDistance(foe,center)<6)damageEnemy(foe,st.damage*3.2);}
 else{const yaw=Math.atan2(facing.x,facing.z);for(const offset of [-.16,0,.16]){const aim=muzzle.add(new V(Math.sin(yaw+offset)*17,0,Math.cos(yaw+offset)*17));fire(muzzle,aim,st.damage*1.6,'#cce8a9',26,false,true,'arrow');}}}
 },{center});
}
function dash(){if(mode!=='play'||paused||dashCD>0)return;cancelPotion();dashCD=2.4;dashTime=.2;invincible=.36;burst(hero.root.position.add(new V(0,.5,0)),CLASSES[save.heroClass].color,10);sound.play('dash');clickTarget=null;}
function potion(){
 if(mode!=='play'||paused||hero.potion.active||dashTime>0)return;
 if(save.potions<1){toast('No potions left','Buy some from the inn or brew them with herbs.');return;}
 const st=stats(save);if(save.hp>=st.maxHp&&save.mana>=st.maxMana)return;
 if(hero.combat?.active)return;
 const actor=hero,generation=worldGeneration;hero.potionFacing=lastFacing.clone();hero.root.rotation.y=Math.atan2(lastFacing.x,lastFacing.z);
 if(actor.potion.start({facing:hero.potionFacing,onSip:()=>{
  if(hero!==actor||generation!==worldGeneration||mode!=='play'||save.potions<1)return;
  const current=stats(save);save.potions--;save.hp=Math.min(current.maxHp,save.hp+current.maxHp*.6);save.mana=Math.min(current.maxMana,save.mana+35);
  actor.healing.trigger();sound.play('potion-gulp');sound.play('heal');floating('+HEAL',actor.root.position.add(new V(0,2,0)),'#abe1b3');persist();updateHUD();
 }})){attackAnim=0;potionEquipment();sound.play('potion-open');}
}
function warning(e,pos,r,delay,damage,kind='slam'){
 if(e.elite)sound.play('boss-warning');
 const mesh=new B.TransformNode('attack warning',scene);mesh.position.set(pos.x,.1,pos.z);
 const fill=B.MeshBuilder.CreateDisc('danger fill',{radius:r,tessellation:48,sideOrientation:B.Mesh.DOUBLESIDE},scene);fill.rotation.x=Math.PI/2;fill.parent=mesh;fill.material=mat('#ec7267',.5,.28);fill.isPickable=false;
 const boundary=B.MeshBuilder.CreateTorus('danger boundary',{diameter:r*2,thickness:.065,tessellation:48},scene);boundary.parent=mesh;boundary.material=mat('#ff8b7d',1);boundary.isPickable=false;
 const clock=B.MeshBuilder.CreateTorus('danger countdown',{diameter:r*2,thickness:.045,tessellation:48},scene);clock.parent=mesh;clock.position.y=.025;clock.material=mat('#ffe1b3',1);clock.isPickable=false;clock.scaling.setAll(.04);
 telegraphs.push({mesh,fill,clock,pos:pos.clone(),r,time:delay,max:delay,damage,kind,source:e});
}
function repelTownThreat(actor,e){
 if(mode!=='play'||paused||zone!=='overworld'||!townGuards?.actors.includes(actor)||actor.root.isDisposed()||!actor.root.isEnabled()||!enemies.includes(e)||e.root.isDisposed()||e.hp<=0||e.elite||e.kind==='boss')return;
 const dx=e.root.position.x-actor.root.position.x,dz=e.root.position.z-actor.root.position.z;
 if(Math.hypot(dx,dz)>GUARD_REACH+.1||dx*actor.outward.x+dz*actor.outward.z<-.25)return;
 e.guardRepel=.85;e.guardPush=actor.outward.clone();e.windup=0;e.attackPos=null;e.cooldown=Math.max(e.cooldown,1.8);e.slow=Math.max(e.slow,1.1);
 for(let i=telegraphs.length-1;i>=0;i--)if(telegraphs[i].source===e){telegraphs[i].mesh.dispose();telegraphs.splice(i,1);}
 moveEntity(e.root,actor.outward.scale(1.7),e.profile.collisionRadius);
 if(dist(hero.root.position,actor.root.position)<20){impacts?.spawn(e.root.position.add(new V(0,e.profile.impactHeight,0)),'#ffe3a0');sound.play('shield-block');}
}
function updateEnemies(dt){
 for(const e of [...enemies]){e.cooldown-=dt;e.slow=Math.max(0,e.slow-dt);const p=e.root.position,d=dist(p,hero.root.position),safe=world.isSafe(hero.root.position.x,hero.root.position.z);
 e.presence?.update(dt,{windup:e.windup,enraged:e.hp/e.maxHp<.35});
 e.hurt=Math.max(0,e.hurt-dt);
 if(!sprites&&e.kind==='slime'){e.body.position.y=.6+Math.sin(t*5+e.phase)*.08;e.body.scaling.y=1.2+Math.sin(t*5+e.phase)*.06;}
 if(e.kind==='boss'){$('boss-hud').hidden=d>23;$('boss-name').textContent=`THE HOLLOW KING · ASCENSION ${save.ascension+1}`;$('boss-fill').style.width=clamp(e.hp/e.maxHp*100,0,100)+'%';}
 if(e.guardRepel>0){e.guardRepel=Math.max(0,e.guardRepel-dt);e.facing.copyFrom(e.guardPush);moveEntity(e.root,e.guardPush.scale(dt*e.speed),e.profile.collisionRadius);continue;}
 const active=!safe&&(!e.campId||dist(p,e.home)<23&&dist(hero.root.position,e.home)<26)&&(d<(e.elite?25:13)||e.hp<e.maxHp&&d<24);e.barRoot.setEnabled(active&&e.hp<e.maxHp);
 if(!active){e.windup=Math.max(0,e.windup-dt);if(dist(p,e.home)>1){e.facing.copyFrom(e.home).subtractInPlace(p).normalize();moveEntity(e.root,e.facing.scale(dt*e.speed*.6),e.profile.returnRadius);}continue;}inCombat=Math.max(inCombat,.2);
 const desired=e.kind==='mushroom'?6:e.elite?5:1.8;e.facing.copyFrom(hero.root.position).subtractInPlace(p);e.facing.y=0;if(e.facing.lengthSquared()>.001)e.facing.normalize();if(!sprites)e.root.rotation.y=Math.atan2(e.facing.x,e.facing.z);
 if(d>desired&&e.windup<=0){const dir=hero.root.position.subtract(p);dir.y=0;dir.normalize();moveEntity(e.root,dir.scale(dt*e.speed*(e.slow>0?.35:1)),e.profile.collisionRadius);}
 e.windup=Math.max(0,e.windup-dt);
 if(e.cooldown<=0&&e.windup<=0&&d<(e.elite?25:e.kind==='mushroom'?10:3.5)){
 if(e.elite){const phase=e.hp/e.maxHp<.35?2:e.hp/e.maxHp<.7?1:0;e.pattern++;e.cooldown=3.1-phase*.5;e.windup=.85;
 if(e.pattern%4===0){const lane=createBossLane(B,scene,{origin:p,facing:e.facing,width:3.4,length:13,delay:1.05,damage:e.cfg.damage*1.15,source:e});telegraphs.push(lane);e.windup=lane.max;sound.play('boss-warning');floating('HOLLOW SWEEP',p.add(new V(0,e.profile.damageHeight,0)),'#ffe0b4');}
 else if(e.pattern%3===0){warning(e,p,7,.95,e.cfg.damage*(1+save.ascension*.2));if(phase>0){for(const off of [-3,3])spawnEnemy('slime',p.x+off,p.z+2,save.ascension+1);}}
 else if(e.pattern%3===1){warning(e,hero.root.position.clone(),3.4,.95,e.cfg.damage*1.2);if(phase>0)warning(e,hero.root.position.add(lastFacing.scale(4)),3,.95,e.cfg.damage);}
 else {for(let i=0;i<8+phase*4;i++){const a=i/(8+phase*4)*Math.PI*2;fire(p.add(new V(0,1,0)),p.add(new V(Math.cos(a)*10,0,Math.sin(a)*10)),e.cfg.damage*.65,'#e9a3c7',7+phase*2,true);}}sound.play('boss');}
 else if(e.kind==='mushroom'){e.cooldown=2.5;e.windup=.18;fire(p.add(new V(0,1,0)),hero.root.position,e.cfg.damage,'#d7a4d8',8,true);}
 else{e.cooldown=e.kind==='wolf'?1.7:2.1;e.windup=.65;warning(e,hero.root.position.clone(),e.kind==='golem'?2.7:1.65,e.kind==='wolf'?.5:.75,e.cfg.damage*(1+(e.level-1)*.12));}}
 }
 for(let i=telegraphs.length-1;i>=0;i--){const w=telegraphs[i];w.time-=dt;const progress=clamp(1-w.time/w.max,0,1);w.clock.scaling.setAll(Math.max(.04,progress));w.fill.visibility=.55+.45*progress;if(w.time<=0){if(enemies.includes(w.source)){
  if(w.kind==='lane'){const lane=w.impact();for(let j=1;j<=6;j++){const p=lane.origin.add(lane.facing.scale(lane.length*j/7));burst(p.add(new V(0,.45,0)),'#e6a080',4);impacts?.spawn(p.add(new V(0,.6,0)),'#f4b693');}if(w.contains(hero.root.position))hurt(w.damage);}
  else{ring(w.pos,w.r,'#e6a080',.4);burst(w.pos.add(new V(0,.5,0)),'#e6a080',8);if(dist(hero.root.position,w.pos)<w.r)hurt(w.damage);}
 }w.mesh.dispose();telegraphs.splice(i,1);}}
}
function moveEntity(root,delta,radius=.45){const p=resolveMovement(root.position,delta,world.obstacles,world.bounds,radius);root.position.x=p.x;root.position.z=p.z;root.position.y=world.surfaceHeight?.(p.x,p.z)||0;}

function openModal(html,closable=true){paused=true;keys.clear();touch.x=touch.z=0;clickTarget=null;$('modal-content').innerHTML=(closable?'<button class="modal-close" aria-label="Close panel" data-action="close">×</button>':'')+html;$('modal').hidden=false;$('modal-content').querySelector('button')?.focus();}
function closeModal(){if(mode==='dead')return;paused=false;fishing=null;$('modal').hidden=true;canvas.focus();persist();}
function talk(){if(mode!=='play'||paused)return;if(!nearby){toast('A little closer…','Move near a person, plant, chest, or waystone, then press E.');return;}const o=nearby;villagers?.greet(o);
 if(o.type==='captive'){
  if(zone!=='overworld'||!world.interactables.includes(o)||o.mesh.isDisposed()||!o.mesh.isEnabled()||dist(hero.root.position,o)>3.4||save.rescued.includes(o.campId))return;
  const camp=world.camps.find(c=>c.id===o.campId);if(!camp)return;
  const guards=campGuardCount(camp.id);
  if(guards){toast('Someone needs your help',`Defeat ${guards} remaining camp guard${guards===1?'':'s'}, then return to free ${o.name.split(' · ')[0]}.`,'♡');return;}
  if(!campRescues?.release(o))return;
  save.rescued.push(camp.id);persist();
  toast('A traveler rescued',`${o.name.split(' · ')[0]} is heading to safety.`, '♡');sound.play('quest');nearby=null;updateInteraction();return;
 }
 if(o.type==='npc'){
 let text,button;
 if(save.quest===0){text='Ah, a new face! I’m Rowan. Our waystones have gone dark, and the woodland creatures have grown restless. Help six of them find their peace, and keep the ember shards you discover. Pip here has already decided to come along.';button='<button class="primary" data-action="accept">I’ll help the valley →</button>';}
 else if(save.quest===1&&save.kills>=6){text='The meadow feels lighter already. Take this reward. Now seek our three waystones—west, northeast, and southeast. Each needs three ember shards. When all three shine, the northern gate will open.';button='<button class="primary" data-action="quest-reward">Claim reward · 80 gold + a relic →</button>';}
 else if(save.bosses>0&&save.quest>=2&&save.quest<4){text='You brought the dawn back. That crown belongs to you now. The Hollow King’s echoes still haunt the deeper chambers—each return will test you further. But first, welcome home, hero.';button='<button class="primary" data-action="final-reward">Complete the tale · 200 gold →</button>';}
 else{text=save.quest===1?`Six restless creatures, that’s all I ask. You’ve helped ${Math.min(6,save.kills)} so far. Hold Space to attack, Q for your calling’s special skill, and Shift to dodge. Pip will watch your back.`:save.quest<4?'The waystones wait beyond the village. Your map marks each with a diamond. Find shards from creatures and chests, and don’t forget to equip your treasures.':'Some heroes leave their story behind. Others keep writing. The gate is open, the inn is warm, and there is always another dawn.';button='<button class="primary" data-action="close">Back to the adventure →</button>';}
 openModal(`<div class="eyebrow">ELDER ROWAN · HEARTHGLEN</div><h2 class="modal-title">A keeper of small hopes.</h2><p class="dialogue">${text}</p>${questObjectiveHTML(mainQuestView(save).objectives)}<p class="quest-rewards"><span>REWARDS</span> ${questRewardText(mainQuestView(save).rewards)}</p>${button}<div class="quest-card-actions"><button class="secondary" data-action="quest-track:main">Track main story</button><button class="secondary" data-action="quest-log:active">Quest log</button></div>`);sound.play('click');}
 if(['smith','inn','cook'].includes(o.type)){openQuestGiver(o);return;}
 if(o.type==='herb'){if(save.gathered.includes(o.id))return;save.herbs++;save.gathered.push(o.id);questEvent({type:'gather',id:o.id});o.mesh.setEnabled(false);burst(new V(o.x,.5,o.z),'#b4d992');toast('Moonleaf gathered',`${save.herbs} in your bag · Brew 3 leaves into a potion.`,'❧');sound.play('loot');awardXP(8);persist();}
 if(o.type==='chest'){const camp=world.camps.find(c=>c.chestId===o.id),guards=camp?enemies.filter(e=>e.campId===camp.id).length:0;if(guards){toast('The cache is guarded',`${camp.name} · defeat ${guards} remaining creature${guards===1?'':'s'} first.`,'⚑');return;}const key=zone==='dungeon'?o.id+'-'+save.ascension:o.id;if(save.chests.includes(key))return;save.chests.push(key);o.mesh.setEnabled(false);const item=makeLoot(save.level+1,save.heroClass,.8+Math.random()*.2);grantItem(item);save.gold+=30;save.shards+=2;save.totalGold+=30;awardXP(30);burst(new V(o.x,1,o.z),'#ecc875',16);toast('A treasure worth the detour',`${item.name} · +30 gold · +2 shards`,'♜');sound.play('loot');persist();}
 if(o.type==='shrine'){if(save.shrines.includes(o.id)){toast('The waystone is awake','Its light reaches all the way to Hearthglen.','✧');return;}if(save.shards<3){toast('The stone is waiting',`You need 3 ember shards. You have ${save.shards}.`,'◇');return;}save.shards-=3;save.shrines.push(o.id);world.setShrineActive(o.id);save.hp=stats(save).maxHp;awardXP(90);save.gold+=40;ring(new V(o.x,0,o.z),5,'#ade5c1',1.5);sound.play('quest');announce('A waystone awakens',`${save.shrines.length} OF 3 · HEALTH RESTORED`);spawnEnemy('golem',o.x+3,o.z+3,save.level);if(save.shrines.length===3){toast('The northern gate opens','The Hollow King awaits beyond the ruins.','♛');}persist();}
 if(o.type==='portal'){if(save.shrines.length<3){toast('Sealed by old magic',`Restore all three waystones first · ${save.shrines.length}/3`,'◇');return;}openModal(`<div class="eyebrow">THE HOLLOW SANCTUM</div><h2 class="modal-title">Beyond the last lantern.</h2><p>Ancient guardians. A fallen king. A crown that still remembers the sun.</p><div class="stats-grid"><div><b>${save.ascension+1}</b><small>ASCENSION</small></div><div><b>${save.level}</b><small>YOUR LEVEL</small></div><div><b>${save.potions}</b><small>POTIONS</small></div></div><p class="muted">Dodge the red danger zones. Higher ascensions bring tougher enemies and better rewards.</p><button class="primary" data-action="dungeon">Enter the sanctum →</button>`);}
 if(o.type==='exit')goHome();if(o.type==='fishing')startFishing();
}
function smith(){openModal(`<div class="eyebrow">BRAMBLE & STEEL · BLACKSMITH</div><h2 class="modal-title">Good steel. Better stories.</h2><p>Bram can temper your weapon, or find something special in the old supply crates.</p><div class="stats-grid"><div><b>${save.gold}</b><small>YOUR GOLD</small></div><div><b>+${save.forge*4}</b><small>FORGE DAMAGE</small></div></div><button class="choice" data-action="forge"><b>Temper your weapon · ${50+save.forge*35} gold</b><small>Permanently gain +4 damage. Keeps working when you swap weapons.</small></button><button class="choice" data-action="buy-relic"><b>A wanderer’s relic · ${60+save.level*12} gold</b><small>A random piece of equipment at your level. Uncommon or better.</small></button><button class="secondary" data-action="bag">Open equipment bag →</button>`);}
function inn(){openModal(`<div class="eyebrow">THE LITTLE LANTERN · INN</div><h2 class="modal-title">Come in. Catch your breath.</h2><p>There’s always a bed for a friend of the valley. Lysa keeps her best potions under the counter.</p><div class="stats-grid"><div><b>${save.gold}</b><small>GOLD</small></div><div><b>${save.potions}</b><small>POTIONS</small></div></div><button class="choice" data-action="rest"><b>Rest by the hearth · Free</b><small>Restore all health and mana.</small></button><button class="choice" data-action="buy-potion"><b>Buy a healing draught · 15 gold</b><small>Restores 60% health and 35 mana. Press R to drink.</small></button>`);}
function cook(){openModal(`<div class="eyebrow">MIRA’S CAMP KITCHEN</div><h2 class="modal-title">A little forest alchemy.</h2><p>Moonleaf makes a fine tonic. A fish from the pond makes an even finer supper.</p><div class="stats-grid"><div><b>${save.herbs}</b><small>MOONLEAF</small></div><div><b>${save.fish}</b><small>FISH</small></div></div><button class="choice" data-action="brew"><b>Brew a potion · 3 moonleaf</b><small>Turn gathered herbs into one healing draught.</small></button><button class="choice" data-action="cook-fish"><b>Cook a silverfin · 1 fish</b><small>Restore all health and gain 50 experience.</small></button><button class="choice" data-action="sell-fish"><b>Sell a silverfin · Earn 25 gold</b><small>The village is always hungry.</small></button>`);}
function itemText(g){return [g.damage?`+${g.damage} damage`:'',g.hp?`+${g.hp} health`:'',g.armor?`${Math.round(g.armor*100)}% armor`:'',g.crit?`${Math.round(g.crit*100)}% critical`:'',g.speed?`+${g.speed.toFixed(1)} speed`:''].filter(Boolean).join(' · ');}
function bag(){const st=stats(save);openModal(`<div class="eyebrow">YOUR PACK · ${save.inventory.length} TREASURES</div><h2 class="modal-title">Every find tells a story.</h2><div class="stats-grid"><div><b>${st.damage}</b><small>DAMAGE</small></div><div><b>${st.maxHp}</b><small>MAX HEALTH</small></div><div><b>${Math.round(st.crit*100)}%</b><small>CRITICAL</small></div></div><h3>Equipped</h3><div class="item-grid">${['weapon','armor','charm'].map(slot=>{const g=save.equipment[slot];return `<div class="item-card ${g?'rarity-'+g.rarity:''}"><small>${slot.toUpperCase()}</small><b>${g?esc(g.name):'Nothing equipped'}</b><p>${g?itemText(g):'Find treasures in the wild.'}</p></div>`;}).join('')}</div><h3>In your bag</h3><div class="item-grid">${save.inventory.length?save.inventory.map(g=>`<div class="item-card rarity-${g.rarity}"><small>${g.rarity.toUpperCase()} · ${g.slot.toUpperCase()} · LV ${g.level}</small><b>${esc(g.name)}</b><p>${itemText(g)}</p><div class="item-actions"><button class="secondary" data-equip="${esc(g.id)}">Equip</button><button class="secondary" data-sell="${esc(g.id)}">Sell · ${g.price}g</button></div></div>`).join(''):'<p class="muted">Your first treasure is waiting beyond the village. Defeat creatures or open a hidden chest.</p>'}</div><p class="muted">${save.herbs} moonleaf · ${save.fish} silverfin · ${save.potions} potions · ${save.shards} ember shards</p>`);}
function questGiverState(item){return getQuestGiverState(save,item);}
function questGiverNearby(id){const giver=world.interactables.find(o=>o.id===id);return mode==='play'&&zone==='overworld'&&giver&&dist(hero.root.position,giver)<=3.8?giver:null;}
function questEvent(event){
 if(mode!=='play')return;
 const ready=recordQuestEvent(save,event);
 for(const id of ready){const q=QUESTS.find(q=>q.id===id);toast('Quest objectives complete',`${q.title} · Return to ${q.giverName}.`,'?');sound.play('quest');}
 if(ready.length)persist();
}
function openQuestGiver(item){if(item.type==='npc'){nearby=item;talk();return;}openModal(questGiverHTML(save,item));sound.play('click');}
function openQuestDetails(id){
 if(id==='main'){
  const giver=questGiverNearby('elder');if(giver){paused=false;openQuestGiver(giver);return;}
  const q=mainQuestView(save);openModal(`<div class="eyebrow">MAIN STORY · ELDER ROWAN</div><h2 class="modal-title">The Verdant Crown</h2>${questCardHTML(q,save.quests.tracked)}<p class="muted">Speak to Elder Rowan by the fountain to accept his request or collect a reward.</p>`);return;
 }
 const q=QUESTS.find(q=>q.id===id);if(!q)return;
 const html=questDialogueHTML(save,id,!!questGiverNearby(q.giverId));if(html)openModal(html);
}
function questAction(action,id){
 const q=QUESTS.find(q=>q.id===id);
 if(action==='open'){openQuestDetails(id);return;}
 if(action==='track'){
  if(setTrackedQuest(save,id)){toast('Quest tracked',id==='main'?'The Verdant Crown':q.title,'◆');sound.play('click');persist();updateHUD();journal((id==='main'?mainQuestView(save).status:questStatus(save,id))==='available'?'available':'active');}
  return;
 }
 if(!q||!questGiverNearby(q.giverId)){toast('Speak to the quest giver','Return to their yellow marker in Hearthglen.','!');return;}
 if(action==='accept'){
  if(acceptQuest(save,id)){toast('Quest accepted',q.title,'!');sound.play('quest');persist();updateHUD();openQuestDetails(id);}
  return;
 }
 if(action==='claim'){
  const reward=claimQuest(save,id);if(!reward)return;
  save.gold+=reward.gold||0;save.totalGold+=reward.gold||0;save.potions+=reward.potions||0;save.shards+=reward.shards||0;
  if(reward.gear)grantItem(makeLoot(save.level,save.heroClass,.85,.9));
  awardXP(reward.xp||0);persist();updateHUD();sound.play('quest');
  openModal(`<div class="eyebrow">QUEST COMPLETE · ${esc(q.giverName)}</div><h2 class="modal-title">${esc(q.title)}</h2><p class="dialogue">${esc(q.dialogue.complete)}</p><div class="quest-reward-earned"><span aria-hidden="true">✓</span><b>Rewards received</b><p>${esc(questRewardText(reward))}</p></div><div class="quest-card-actions"><button class="primary" data-action="giver:${q.giverId}">Anything else I can help with? →</button><button class="secondary" data-action="close">Back to the adventure</button></div>`);
 }
}
function journal(filter='active'){openModal(questLogHTML(save,typeof filter==='string'?filter:'active'));}
function toggleSound(){save.settings.sound=!save.settings.sound;sound.setEnabled(save.settings.sound);sound.unlock();if(save.settings.sound)sound.play('click');persist();updateHUD();}
function treeShadowChange(removed,added){for(const mesh of removed)shadow.removeShadowCaster?.(mesh);for(const mesh of added)shadow.addShadowCaster(mesh);}
function restoreTreeStyle(targetWorld){
 const id=normalizeTreeStyle(save.settings.treeStyle);
 if(id==='current')return Promise.resolve({applied:true,styleId:id});
 return targetWorld.setTreeStyle(id,{onShadowChange:treeShadowChange}).catch(error=>{console.error('Tree style could not load',error);if(world===targetWorld&&mode==='play')toast('Tree style unavailable','The current trees are still visible. Try again from Settings.');return {applied:false,styleId:targetWorld.treeStyle};});
}
function treeStyles(error=''){openModal(treeStyleMenuHTML(save.settings.treeStyle,{busy:treeStyleBusy,error,dungeon:zone==='dungeon'}));}
async function changeTreeStyle(value){
 if(treeStyleBusy)return;
 const id=normalizeTreeStyle(value),targetWorld=world;treeStyleBusy=true;treeStyles();
 try{
  // Paint the loading state before constructing and merging a forest.
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const result=await targetWorld.setTreeStyle(id,{onShadowChange:treeShadowChange});
  if(result.applied&&world===targetWorld){save.settings.treeStyle=id;persist();sound.play('click');}
 }catch(error){console.error('Tree style could not load',error);treeStyleBusy=false;if(!$('modal').hidden&&$('modal-content').querySelector('[data-tree-menu]'))treeStyles('load');return;}
 finally{treeStyleBusy=false;}
 if(!$('modal').hidden&&$('modal-content').querySelector('[data-tree-menu]'))treeStyles();
}
const musicAreaNames={title:'Title',town:'Town',overworld:'Exploration',dungeon:'Dungeon',combat:'Battle'};
function applyAudioMix(settings){sound.setMusicVolume(settings.musicVolume);sound.setEffectsVolume(settings.effectsVolume);}
function prepareTitleMusic(){
 sound.update('title',false);sound.setEnabled(titleMusic);
 $('title-sound').setAttribute('aria-pressed',String(titleMusic));
 $('title-sound').setAttribute('aria-label',titleMusic?'Mute title music':'Enable title music');
 $('title-sound').title=titleMusic?'Music is on · starts with your first click or keypress':'Music is off';
}
function bindMusicActivation(){
 $('title-sound').onclick=()=>musicEnabled(!titleMusic);
 let pending=false;
 const activate=event=>{
  // Bubble after button handlers so the first Mute click stays silent. Touch
  // clicks and keyboard activation also unlock audio without delaying loading.
  if(!event.isTrusted||event.repeat||!sound.enabled||sound.unlocked||pending)return;
  if(event.type==='keydown'&&['Enter','Space'].includes(event.code)&&event.target.closest?.('button'))return;
  pending=true;sound.unlock().finally(()=>{pending=false;});
 };
 window.addEventListener('click',activate);
 window.addEventListener('keydown',activate);
}
function changeAudioVolume(key,percent,commit=false){
 if(!['musicVolume','effectsVolume'].includes(key)||!Number.isFinite(percent))return;
 const value=clamp(percent/100,0,1);
 if(key==='musicVolume')sound.setMusicVolume(value);else sound.setEffectsVolume(value);
 save.settings[key]=value;
 if(mode==='intro'){
  // Title controls must retain the existing adventure, not save the preview hero.
  if(saved){saved.settings[key]=value;if(commit)try{localStorage.setItem(SAVE_KEY,JSON.stringify(saved));}catch{}}
 }else if(commit)persist();
 syncMusicStatus();
}
function musicMixerHTML(){
 return `<fieldset class="music-mixer"><legend>Sound balance</legend>${[['musicVolume','Music volume'],['effectsVolume','Sound effects volume']].map(([key,label])=>{const percent=Math.round(sound[key]*100),id=`mix-${key}`;return `<div class="music-mix-control"><label for="${id}">${label}</label><output for="${id}" data-volume-output="${key}">${percent}%</output><input id="${id}" type="range" min="0" max="100" step="1" value="${percent}" data-audio-volume="${key}" aria-valuetext="${percent} percent"></div>`;}).join('')}<p>Balance the soundtrack and game sounds separately. Set either to 0% to silence it.</p></fieldset>`;
}
function musicEnabled(enabled=true){
 if(mode==='intro'){
  titleMusic=enabled;save.settings.sound=enabled;prepareTitleMusic();
  // Change only sound preferences, never replace an adventure with its preview.
  if(saved){saved.settings.sound=enabled;try{localStorage.setItem(SAVE_KEY,JSON.stringify(saved));}catch{}}
 }else{save.settings.sound=enabled;updateHUD();persist();}
 sound.setEnabled(enabled);if(enabled)sound.unlock();
}
function musicLibrary(focusAction=''){
 const current=sound.currentTrack,selection=sound.musicSelection,scroll=$('modal-content').scrollTop;
 const groups=Object.entries(THEME_PLAYLISTS).map(([area,ids])=>`<section class="music-track-group"><h3>${musicAreaNames[area]||esc(area)}</h3><div class="music-track-grid">${ids.map(id=>{const track=CHIP_TRACKS[id];return `<button type="button" class="music-track${current.id===id&&sound.enabled?' playing':''}" data-action="music-select:${esc(id)}" data-music-id="${esc(id)}" aria-label="Play ${esc(track.title)}" aria-pressed="${selection===id}"><span class="music-track-heading"><b>${esc(track.title)}</b><span class="music-play-indicator" aria-hidden="true">▶</span></span><small>${esc(track.description)}</small></button>`;}).join('')}</div></section>`).join('');
 openModal(`<section class="music-library" data-music-library><div class="eyebrow">THE EMBERWILD SONGBOOK</div><h2 class="modal-title">A tune for every trail.</h2><p class="music-library-intro">Original instrumental music with woodwinds, strings, brass, mallets, bass, and percussion. Choose a song now, or let the soundtrack follow your adventure.</p><div class="music-player"><small data-music-state>${sound.enabled?(sound.unlocked?'NOW PLAYING':'MUSIC READY'):'MUSIC PAUSED'}</small><strong data-music-title>${esc(current.title)}</strong><p data-music-description>${esc(current.description)}</p><div class="music-player-actions"><button type="button" class="secondary" data-action="music-toggle">${sound.enabled?'Mute music':'Play music'}</button><button type="button" class="secondary" data-action="music-next">Next tune →</button></div></div>${musicMixerHTML()}<button type="button" class="music-auto" data-action="music-select:auto" aria-pressed="${selection==='auto'}"><b>Automatic · follow the adventure</b><small>Switches with your surroundings and rotates the songs in each area.</small></button>${groups}<div class="music-library-footer"><p>Choosing a song keeps it playing until you select another or return to Automatic. This choice lasts for this visit.</p><button type="button" class="secondary" data-action="music-back">${mode==='intro'?'Back to the title screen':'Back to settings'}</button></div></section>`);
 syncMusicStatus();
 if(focusAction){const button=[...$('modal-content').querySelectorAll('[data-action]')].find(el=>el.dataset.action===focusAction);button?.focus({preventScroll:true});$('modal-content').scrollTop=scroll;}
}
function syncMusicStatus(){
 if($('modal').hidden)return;
 const panel=$('modal-content').querySelector('[data-music-library]');if(!panel)return;
 const track=sound.currentTrack,selection=sound.musicSelection,key=track.id+'|'+selection+'|'+sound.enabled+'|'+sound.unlocked+'|'+sound.musicVolume+'|'+sound.effectsVolume;
 if(panel.dataset.musicStatus===key)return;panel.dataset.musicStatus=key;
 panel.querySelector('[data-music-title]').textContent=track.title;
 panel.querySelector('[data-music-description]').textContent=track.description;
 panel.querySelector('[data-music-state]').textContent=sound.enabled?(sound.unlocked?'NOW PLAYING':'MUSIC READY'):'MUSIC PAUSED';
 panel.querySelector('[data-action="music-toggle"]').textContent=sound.enabled?'Mute music':'Play music';
 for(const name of ['musicVolume','effectsVolume']){
  const percent=Math.round(sound[name]*100),input=panel.querySelector(`[data-audio-volume="${name}"]`);
  if(input){input.value=String(percent);input.setAttribute('aria-valuetext',`${percent} percent`);panel.querySelector(`[data-volume-output="${name}"]`).textContent=`${percent}%`;}
 }
 const next=panel.querySelector('[data-action="music-next"]');
 next.disabled=selection==='auto'&&(THEME_PLAYLISTS[track.theme]?.length||0)<2;
 next.title=next.disabled?'Choose a song below to explore the soundtrack':'Play the next tune';
 panel.querySelector('[data-action="music-select:auto"]').setAttribute('aria-pressed',String(selection==='auto'));
 panel.querySelectorAll('[data-music-id]').forEach(button=>{button.classList.toggle('playing',sound.enabled&&button.dataset.musicId===track.id);button.setAttribute('aria-pressed',String(selection===button.dataset.musicId));});
}
function settings(){openModal(`<div class="eyebrow">TAKE A BREATHER</div><h2 class="modal-title">Make yourself at home.</h2><button class="choice" data-action="sound"><b>Music & sound · ${save.settings.sound?'ON':'OFF'}</b><small>Original instrumental soundtrack, combat themes, and effects.</small></button><button class="choice music-settings-choice" data-action="music"><b>Choose music</b><small>Now playing: ${esc(sound.currentTrack.title)} · ${sound.musicSelection==='auto'?'Automatic':'Your selection'}</small></button><button class="choice" data-action="auto"><b>Automatic basic attacks · ${save.settings.autoAttack?'ON':'OFF'}</b><small>Targets the nearest enemy in range. You still control skills and dodges.</small></button><button class="choice" data-action="quality"><b>Graphics · ${save.settings.quality==='low'?'PERFORMANCE':'HIGH'}</b><small>${backend} renderer · Lower quality disables shadows and reduces resolution.</small></button><button class="choice" data-action="trees"><b>Tree designs · ${treeStyleName(save.settings.treeStyle)}</b><small>Compare the original artwork and saved 3D styles. Shortcut: T.</small></button><div class="controls-help"><p><b>WASD / arrows</b> Move · <b>Click ground</b> Walk to point<br><b>Space / click enemy</b> Basic attack · <b>Q</b> Skill · <b>F</b> Ultimate<br><b>Shift</b> Dodge · <b>R</b> Potion · <b>E</b> Interact<br><b>Right-drag / Z / C</b> Orbit · <b>Scroll</b> Zoom · <b>V</b> Reset view<br><b>I</b> Equipment · <b>J</b> Journal · <b>M</b> Map<br><b>T</b> Tree designs · <b>Esc / P</b> Pause</p></div><button class="primary" data-action="close">Back to the wild →</button><button class="secondary" data-action="title">Save & return to title</button>`);}
function drawMap(c,full=false){const ctx=c.getContext('2d'),w=c.width,h=c.height,bo=world.bounds,pad=full?28:8;const px=x=>pad+(x-bo.minX)/(bo.maxX-bo.minX)*(w-pad*2),py=z=>h-pad-(z-bo.minZ)/(bo.maxZ-bo.minZ)*(h-pad*2),labels=[];ctx.fillStyle=zone==='dungeon'?'#252338':'#344f42';ctx.fillRect(0,0,w,h);
 if(zone==='overworld'){
  ctx.fillStyle='#a79974';ctx.fillRect(px(-27),py(25),px(27)-px(-27),py(-11)-py(25));
  if(full)labels.push({text:'Hearthglen',x:px(0),y:py(25)-9,center:true,size:12,bold:true,priority:5,color:'#fff1cc'});
  ctx.fillStyle='#56929c';ctx.beginPath();ctx.ellipse(px(-33),py(-5),Math.abs(px(8)-px(0)),Math.abs(py(7)-py(0)),0,0,Math.PI*2);ctx.fill();
  for(const route of world.mapRoutes){ctx.strokeStyle=route.stone?'#e2d6af':'#a38f69';ctx.lineWidth=full?(route.stone?3.2:1.8):1;ctx.beginPath();route.points.forEach(([x,z],i)=>i?ctx.lineTo(px(x),py(z)):ctx.moveTo(px(x),py(z)));ctx.stroke();}
  for(const landmark of world.landmarks){if(world.camps.some(c=>c.id===landmark.id))continue;ctx.fillStyle='#d5ccab';ctx.font=`${full?13:9}px Georgia`;ctx.fillText('✦',px(landmark.x)-4,py(landmark.z)+4);if(full&&landmark.kind!=='town')labels.push({text:landmark.name,x:px(landmark.x)+7,y:py(landmark.z)-7,size:10,priority:1,color:'#d5ccab'});}
  for(const camp of world.camps){const count=enemies.filter(e=>e.campId===camp.id).length;ctx.fillStyle=count?'#e29b79':'#aed39c';ctx.font=`bold ${full?17:11}px Georgia`;ctx.fillText('⚑',px(camp.x)-5,py(camp.z)+5);if(full)labels.push({text:camp.name+(count?' · '+count:' · clear')+(campNeedsRescue(camp.id)?' · captive':''),x:px(camp.x)-24,y:py(camp.z)-14,size:11,priority:4,color:count?'#e29b79':'#aed39c'});}
 }
 for(const e of enemies){ctx.fillStyle=e.elite?'#efbd70':'#d88875';ctx.beginPath();ctx.arc(px(e.root.position.x),py(e.root.position.z),e.elite?5:full?3:1.8,0,Math.PI*2);ctx.fill();}
 for(const o of world.interactables){if(o.type==='herb'||o.type==='chest'&&save.chests.includes(o.id)||o.type==='captive'&&save.rescued.includes(o.campId))continue;const giverState=questGiverState(o);ctx.fillStyle=giverState==='available'||giverState==='ready'?'#ffe05d':o.type==='shrine'?(save.shrines.includes(o.id)?'#aee7bd':'#92c6e4'):o.type==='portal'?'#c4a4e3':o.type==='npc'?'#f5d47e':'#d8caa9';ctx.font=`${full?18:11}px Georgia`;const glyph=giverState==='ready'?'?':giverState==='available'?'!':o.type==='shrine'?'◆':o.type==='portal'?'◉':o.type==='chest'?'▪':'·';ctx.fillText(glyph,px(o.x)-4,py(o.z)+4);if(full&&['shrine','portal','npc','fishing','smith','inn','cook'].includes(o.type)){const short={npc:'Rowan',fishing:'Pond',smith:'Bram · Smith',inn:'Lysa · Inn',cook:'Mira · Kitchen'},offset=o.type==='smith'?[-16,17]:o.type==='inn'?[8,17]:o.type==='fishing'?[-25,-10]:[8,0];labels.push({text:short[o.type]||o.name||o.type,x:px(o.x)+offset[0],y:py(o.z)+offset[1],size:11,priority:short[o.type]?3:2,color:'#efead4'});}}
 if(full){
  const occupied=[];
  labels.sort((a,b)=>b.priority-a.priority);
  for(const label of labels){
   ctx.font=`${label.bold?'bold ':''}${label.size}px Arial`;
   const width=ctx.measureText(label.text)?.width||label.text.length*label.size*.54,startX=label.x-(label.center?width/2:0);
   let best=null;
   for(const [dx,dy] of [[0,0],[0,-14],[0,14],[-width-14,0],[0,-28],[0,28],[-width-14,-14],[-width-14,14]]){
    const x=clamp(startX+dx,7,w-width-7),y=clamp(label.y+dy,26,h-8),rect={x:x-3,y:y-label.size-3,w:width+6,h:label.size+7};
    const overlap=occupied.reduce((n,r)=>n+Math.max(0,Math.min(rect.x+rect.w,r.x+r.w)-Math.max(rect.x,r.x))*Math.max(0,Math.min(rect.y+rect.h,r.y+r.h)-Math.max(rect.y,r.y)),0);
    if(!best||overlap<best.overlap)best={x,y,rect,overlap};
    if(!overlap)break;
   }
   occupied.push(best.rect);ctx.fillStyle=label.color;ctx.fillText(label.text,best.x,best.y);
  }
 }
 ctx.fillStyle='#fff4c7';ctx.beginPath();ctx.arc(px(hero.root.position.x),py(hero.root.position.z),full?6:4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#25473a';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#ddcfaa';ctx.font='10px Arial';ctx.fillText('N',w/2-3,13);}
function map(){openModal(`<div class="eyebrow">${zone==='dungeon'?'THE HOLLOW SANCTUM':'THE EMBER VALLEY'}</div><h2 class="modal-title">There’s more beyond the path.</h2><div class="map-wrap"><canvas id="large-map" width="520" height="460" aria-label="World map"></canvas></div><p class="map-legend">● You &nbsp; ◆ Waystone &nbsp; ◉ Gate &nbsp; ! Quest giver &nbsp; ? Reward &nbsp; <span style="color:#d88875">●</span> Creatures &nbsp; ⚑ Camp &nbsp; ✦ Landmark</p>${mode==='intro'?'<button class="secondary" data-action="close">Back to the start menu</button>':`<button class="secondary" data-action="travel">Return to Hearthglen ${inCombat>0?'· unavailable in combat':''}</button>`}`);drawMap($('large-map'),true);}
function startFishing(){fishing={start:t};openModal('<div class="eyebrow">MOONMIRROR POND</div><h2 class="modal-title">Something took the bait.</h2><p>Reel in when the golden marker is inside the green zone.</p><div class="fish-track"><div class="fish-zone"></div><div class="fish-marker" id="fish-marker"></div></div><button class="primary" data-action="catch">Reel it in! · Space</button><p class="muted">A quiet moment can still be an adventure.</p>');sound.play('fish');}
function catchFish(){if(!fishing)return;const n=(Math.sin((t-fishing.start)*2.3)+1)/2;if(n>.35&&n<.65){save.fish++;questEvent({type:'fish'});awardXP(20);sound.play('loot');toast('A silverfin!','Cook it for experience, or sell it at the camp kitchen.','♧');}else toast('It slipped away','Try again. Watch the golden marker.');closeModal();}
function goHome(){closeModal();mode='play';save.gathered=save.bosses>0?[]:save.gathered;buildZone('overworld');save.hp=stats(save).maxHp;save.mana=stats(save).maxMana;invincible=2;announce('Hearthglen','A LITTLE LIGHT IN THE WILD');sound.play('portal');persist();}
function modalAction(action){
 if(action==='music'){musicLibrary();return;}
 if(action==='music-back'){if(mode==='intro')closeModal();else settings();return;}
 if(action==='music-toggle'){musicEnabled(!sound.enabled);syncMusicStatus();return;}
 if(action==='music-next'){sound.nextMusic();musicEnabled();syncMusicStatus();return;}
 if(action.startsWith('music-select:')){if(sound.selectMusic(action.slice(13))){musicEnabled();syncMusicStatus();}return;}

 if(action==='trees'){treeStyles();return;}
 if(action.startsWith('tree-style:'))return changeTreeStyle(action.slice(11));
 if(action.startsWith('quest-')){
  const [kind,id]=action.split(':');
  if(kind==='quest-log'){journal(id);return;}
  if(['quest-open','quest-track','quest-accept','quest-claim'].includes(kind)){questAction(kind.slice(6),id);return;}
 }
 if(action.startsWith('giver:')){const item=questGiverNearby(action.slice(6));if(item)openQuestGiver(item);return;}
 if(action.startsWith('service:')){const type=action.slice(8);if(!questGiverNearby(type))return;if(type==='smith')smith();if(type==='inn')inn();if(type==='cook')cook();return;}
 if(action==='close'){closeModal();return;}if(action==='revive'){mode='play';goHome();return;}
 if(action==='accept'&&save.quest===0&&questGiverNearby('elder')){save.quest=1;setTrackedQuest(save,'main');closeModal();toast('Quest accepted','Trouble in the meadow · Defeat 6 creatures.','!');sound.play('quest');}
 if(action==='quest-reward'&&save.quest===1&&save.kills>=6&&questGiverNearby('elder')){save.quest=2;save.gold+=80;save.totalGold+=80;grantItem(makeLoot(save.level,save.heroClass,.85,.9));awardXP(100);closeModal();toast('A promise kept','80 gold and a rare relic. Open your bag with I.','✦');}
 if(action==='final-reward'&&save.bosses>0&&save.quest>=2&&save.quest<4&&questGiverNearby('elder')){save.quest=4;save.gold+=200;save.totalGold+=200;awardXP(200);closeModal();announce('The Verdant Crown','YOUR FIRST TALE IS COMPLETE · THE ADVENTURE CONTINUES');sound.play('win');}
 if(action==='forge'){const price=50+save.forge*35;if(save.gold<price)toast('A few coins short',`Tempering costs ${price} gold.`);else{save.gold-=price;save.forge++;sound.play('loot');toast('Tempered in sunlight','Permanent +4 damage.');smith();}}
 if(action==='buy-relic'){const price=60+save.level*12;if(save.gold<price)toast('A few coins short');else{save.gold-=price;const g=makeLoot(save.level,save.heroClass,.41+Math.random()*.59);grantItem(g);toast(g.name,'Added to your equipment bag.','✦');sound.play('loot');smith();}}
 if(action==='buy-potion'){if(save.gold<15)toast('A few coins short');else{save.gold-=15;save.potions++;sound.play('coin');inn();}}
 if(action==='rest'){save.hp=stats(save).maxHp;save.mana=stats(save).maxMana;closeModal();toast('Rested and ready','Health and mana fully restored.');sound.play('heal');}
 if(action==='brew'){if(save.herbs<3)toast('You need 3 moonleaf','Look for glowing plants beyond the village.');else{save.herbs-=3;save.potions++;sound.play('heal');cook();}}
 if(action==='cook-fish'){if(save.fish<1)toast('You need a silverfin','Try fishing at Moonmirror Pond.');else{save.fish--;save.hp=stats(save).maxHp;awardXP(50);sound.play('heal');cook();}}
 if(action==='sell-fish'){if(save.fish<1)toast('No fish to sell');else{save.fish--;save.gold+=25;save.totalGold+=25;sound.play('coin');cook();}}
 if(action==='dungeon'){closeModal();buildZone('dungeon');save.hp=stats(save).maxHp;save.mana=stats(save).maxMana;announce('The Hollow Sanctum',`ASCENSION ${save.ascension+1} · MIND THE RED CIRCLES`);sound.play('portal');}
 if(action==='home'&&mode!=='intro')goHome();if(action==='travel'&&mode!=='intro'){if(inCombat>0)toast('Lose your pursuers first');else goHome();}
 if(action==='bag')bag();if(action==='catch')catchFish();
 if(action==='sound'){toggleSound();settings();}
 if(action==='auto'){save.settings.autoAttack=!save.settings.autoAttack;settings();}
 if(action==='quality'){save.settings.quality=save.settings.quality==='low'?'high':'low';applyQuality();settings();}
 if(action==='title'){persist();closeModal();mode='intro';resetDynamics();if(zone!=='overworld')buildZone('overworld',false);setupTitleBackdrop();$('hud').hidden=true;$('intro').hidden=false;$('continue-button').hidden=false;$('continue-button').textContent=`Continue · Level ${saved.level} ${CLASSES[saved.heroClass].name}`;titleMusic=save.settings.sound;prepareTitleMusic();}
 updateHUD();persist();
}
function applyQuality(){const low=save.settings.quality==='low';scene.shadowsEnabled=!low;engine.setHardwareScalingLevel(low?1.8:Math.max(1,devicePixelRatio/1.4));resize();}

let actionbarClass='';
function syncClassActionbar(c){
 if(actionbarClass===save.heroClass)return;
 const icons={knight:['sword','whirlwind','dawnfall'],mage:['starbolt','frost','starfall'],ranger:['bow','volley','rain']}[save.heroClass];
 for(const [index,[id,kind,shortcut,keys]]of [['attack','Basic attack','Space','Space'],['skill','Class skill','Q / 1','Q 1'],['ultimate','Ultimate','F / 2','F 2']].entries()){
  const button=$(id+'-button'),label=`${c[id]} · ${kind} (${shortcut})`;
  $(id+'-name').textContent=c[id];
  button.querySelector('use').setAttribute('href',`./assets/ability-icons.svg#${icons[index]}`);
  button.title=label;button.setAttribute('aria-label',label);button.setAttribute('aria-keyshortcuts',keys);
  if(id!=='attack')button.setAttribute('aria-describedby',id+'-cd');
 }
 actionbarClass=save.heroClass;
}
function updateHUD(){if(!hero)return;const st=stats(save),c=CLASSES[save.heroClass],q=trackedQuestInfo(save);syncClassActionbar(c);$('hero-name').textContent=c.name;$('portrait').innerHTML=`<span style="font-size:25px;color:${c.color}">${c.icon}</span>`;$('level').textContent=save.level;$('hp-fill').style.width=clamp(save.hp/st.maxHp*100,0,100)+'%';$('hp-text').textContent=`${Math.ceil(save.hp)} / ${st.maxHp}`;$('mana-fill').style.width=clamp(save.mana/st.maxMana*100,0,100)+'%';$('mana-text').textContent=`${Math.floor(save.mana)} / ${st.maxMana}`;$('xp-fill').style.width=clamp(save.xp/xpNeeded(save.level)*100,0,100)+'%';$('coins').textContent=save.gold;$('shards').textContent=save.shards;$('quest-title').textContent=q.title;$('quest-body').textContent=q.text;$('quest-body').style.whiteSpace='pre-line';$('potion-count').textContent=save.potions;$('potion-button').disabled=!!hero.potion?.active;$('potion-button').setAttribute('aria-busy',String(!!hero.potion?.active));
 for(const [id,cd]of [['skill',skillCD],['ultimate',ultCD],['dash',dashCD]]){$(id+'-cd').textContent=cd>0?Math.ceil(cd)+'s':'';$(id+'-button').classList.toggle('on-cooldown',cd>0);}
 drawMap($('minimap'));
 const soundButton=$('sound-button');soundButton.setAttribute('aria-pressed',String(save.settings.sound));soundButton.setAttribute('aria-label',save.settings.sound?'Mute music and sound':'Enable music and sound');$('sound-state').textContent=save.settings.sound?'ON':'OFF';
}
function collectDrops(dt){
 for(let i=drops.length-1;i>=0;i--){
  const d=drops[i];d.age+=dt;if(d.kind!=='gear')d.mesh.rotation.y+=dt*.8;d.mesh.position.y=d.kind==='gear'?.05+Math.sin(d.age*2+d.phase)*.02:.12+Math.sin(d.age*3+d.phase)*.05;
  const len=dist(d.mesh.position,hero.root.position);
  if(len<5){const dir=hero.root.position.subtract(d.mesh.position);dir.y=0;d.mesh.position.addInPlace(dir.scale(Math.min(1,dt*4)));}
  d.beacon.update(dt);
  if(len<1.2){
   if(d.kind==='gold'){save.gold+=d.value;save.totalGold+=d.value;sound.play('coin');}
   if(d.kind==='shard'){save.shards+=d.value;sound.play('coin');}
   if(d.kind==='potion'){save.potions++;toast('Healing draught','Press R when you need it.','♡');}
   if(d.kind==='gear'){if(save.inventory.length<100){save.inventory.push(d.value);toast(d.value.name,`${d.value.rarity} ${d.value.slot} · Press I to equip`, '✦');sound.play('loot');}else{save.gold+=d.value.price;toast('Bag full','Treasure sold for gold.');}}
   d.mesh.dispose();drops.splice(i,1);
  }
 }
}
function updateProjectiles(dt){for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];p.life-=dt;p.mesh.position.addInPlace(p.velocity.scale(dt));if(p.enemy){if(dist(p.mesh.position,hero.root.position)<.85){hurt(p.damage);p.life=0;}}else{for(const e of [...enemies]){if(!p.hit.has(e)&&dist(p.mesh.position,e.root.position)<e.profile.projectileRadius){damageEnemy(e,p.damage);p.hit.add(e);if(!p.pierce){p.life=0;break;}}}}if(p.life<=0){p.mesh.dispose();projectiles.splice(i,1);}}}
function updateEffects(dt){for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;if(e.kind==='dust'){e.mesh.position.addInPlace(e.velocity.scale(dt));e.mesh.scaling.scaleInPlace(1+dt*3);e.mesh.visibility=clamp(e.life/e.max,0,1);}else if(e.kind==='ring'){e.mesh.scaling.scaleInPlace(1+dt*1.8);e.mesh.visibility=clamp(e.life/e.max,0,1);}else{e.mesh.position.addInPlace(e.velocity.scale(dt));e.velocity.y-=dt*7;e.mesh.scaling.scaleInPlace(Math.pow(.1,dt));}if(e.life<=0){e.mesh.dispose();effects.splice(i,1);}}
 for(let i=floaters.length-1;i>=0;i--){const f=floaters[i];if(f.follow){if(f.follow.isDisposed()){f.el.remove();floaters.splice(i,1);continue;}f.pos.copyFrom(f.follow.position);f.pos.y+=3;}if(!(f.stationary&&paused))f.life-=dt;if(!f.stationary)f.pos.y+=dt*.9;const p=B.Vector3.Project(f.pos,B.Matrix.Identity(),scene.getTransformMatrix(),camera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight()));f.el.style.visibility=p.z>=0&&p.z<=1?'visible':'hidden';f.el.style.left=p.x/engine.getRenderWidth()*canvas.clientWidth+'px';f.el.style.top=p.y/engine.getRenderHeight()*canvas.clientHeight+'px';f.el.style.opacity=Math.min(1,f.life*2);if(f.life<=0){f.el.remove();floaters.splice(i,1);}}
}
function getRegion(){const p=hero.root.position;if(zone==='dungeon')return ['The Hollow Sanctum','ASCENSION '+(save.ascension+1)];if(world.isSafe(p.x,p.z))return ['Hearthglen','SANCTUARY · THE EMBER VALLEY'];const camp=world.camps.find(c=>dist(c,p)<c.radius+3);if(camp){const guards=enemies.filter(e=>e.campId===camp.id).length;return [camp.name,guards?`ENEMY CAMP · ${guards} GUARDS`:campNeedsRescue(camp.id)?'CAMP CLEARED · FREE THE CAPTIVE':'CAMP CLEARED · SEARCH THE CACHE'];}const landmark=world.landmarks.find(l=>dist(l,p)<(l.radius||6)+2);if(landmark)return [landmark.name,landmark.description||'A LANDMARK OF THE VALLEY'];if(p.z>52)return ['The Highmeadow','ANCIENT STONES UNDER OPEN SKIES'];if(p.z<-36)return ['Sunwheel Downs','WIND THROUGH THE GOLDEN GRASS'];if(p.z>34)return ['The Forgotten Gate','RUINS OF THE FIRST DAWN'];if(p.x<-17)return ['Moonmirror Grove','WHERE THE WATER KEEPS ITS SECRETS'];if(p.x>18&&p.z<0)return ['Sunpetal Fields','WILD MAGIC STIRS'];if(p.x>18)return ['Whisperwood','FOLLOW THE LIGHT BETWEEN THE LEAVES'];return ['The Wandering Meadow','BEYOND THE VILLAGE WALLS'];}
function updateInteraction(){nearby=null;let n=3.4;for(const o of world.interactables){if(!o.mesh.isEnabled())continue;const d=dist(hero.root.position,o);if(d<n){n=d;nearby=o;}}const el=$('interact-prompt');if(nearby){el.hidden=false;el.innerHTML=`<kbd>E</kbd> ${esc(nearby.type==='herb'?'Gather '+nearby.name:nearby.type==='chest'?'Open treasure':nearby.type==='captive'?(campGuardCount(nearby.campId)?'Help ':'Free ')+nearby.name.split(' · ')[0]:nearby.name||nearby.type)}`;}else el.hidden=true;$('interact-button').classList.toggle('available',!!nearby);}
function updateCompanion(dt){
 const onDock=(world.surfaceHeight?.(hero.root.position.x,hero.root.position.z)||world.surfaceHeight?.(fox.root.position.x,fox.root.position.z))>0;
 const desired=hero.root.position.add(onDock?new V(1,0,0):new V(1.3,0,-1.2)),delta=desired.subtract(fox.root.position);delta.y=0;
 const moving=delta.length()>1;
 if(moving){const step=delta.scale(Math.min(1,dt*3));if(onDock)moveEntity(fox.root,step,.3);else fox.root.position.addInPlace(step);if(fox.sprite)fox.facing.copyFrom(delta).normalize();else fox.root.rotation.y=Math.atan2(delta.x,delta.z);}
 const footHeight=world.surfaceHeight?.(fox.root.position.x,fox.root.position.z)||0;
 if(fox.sprite){fox.root.position.y=footHeight;updateActorMotion(fox,fox.sprite,dt,moving,Math.min(1.3,delta.length()/2));}
 else{fox.root.position.y=footHeight+Math.sin(t*9)*.04;fox.tail.rotation.z=Math.sin(t*5)*.3;}
 petCD-=dt;if(petCD<=0){const e=nearestEnemy(9);if(e){fire(fox.root.position.add(new V(0,.7,0)),e.root.position,8+save.level*2,'#f3c37c',16);petCD=3.5;}}
}
function tick(dt){if(mode==='intro'&&titlePaused)dt=0;t+=dt;world?.update(dt,t);if(!hero)return;
 if(mode==='intro'){
  titleClock+=dt;titleScene?.update(dt,camera.alpha);
  hero.root.position.set(-1.8+Math.sin(titleClock*.17)*.45,0,-5+Math.cos(titleClock*.17)*.2);
  if(hero.sprite){hero.locomotion=sprites.animate(hero.sprite,dt,{moving:titleClock%6>4.6,pace:.65});hero.sprite.visibility=1;hero.halo.visibility=1;}
  else{hero.locomotion={hop:Math.sin(titleClock*2)*.025,sx:1,sy:1,roll:0};}
  const oldFox=fox.root.position.clone(),a=titleClock*.24;fox.root.position.set(1.9+Math.sin(a)*.9,0,-4.9+Math.cos(a)*.5);
  if(fox.sprite){const delta=fox.root.position.subtract(oldFox);delta.y=0;if(delta.lengthSquared()>.00001)fox.facing.copyFrom(delta).normalize();const motion=sprites.animate(fox.sprite,dt,{moving:true,pace:.55});fox.halo.scaling.setAll(1-motion.hop*.55);fox.halo.visibility=1-motion.hop*.7;}else{fox.tail.rotation.z=Math.sin(titleClock*4)*.25;}
 }

 const visualPause=paused||mode!=='play';if(!visualPause){save.playtime+=dt;saveTime+=dt;inCombat=Math.max(0,inCombat-dt);attackCD=Math.max(0,attackCD-dt);skillCD=Math.max(0,skillCD-dt);ultCD=Math.max(0,ultCD-dt);dashCD=Math.max(0,dashCD-dt);dashTime=Math.max(0,dashTime-dt);invincible=Math.max(0,invincible-dt);shieldTime=Math.max(0,shieldTime-dt);attackAnim=Math.max(0,attackAnim-dt);comboTime-=dt;if(comboTime<=0)combo=0;
 const st=stats(save);save.mana=Math.min(st.maxMana,save.mana+dt*5);if(world.isSafe(hero.root.position.x,hero.root.position.z))save.hp=Math.min(st.maxHp,save.hp+dt*3);
 const move=new V((keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touch.x,0,(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+touch.z);
 if(move.lengthSquared()>.01){clickTarget=null;const a=camera.alpha??-Math.PI/2,x=move.x,z=move.z;move.x=-Math.sin(a)*x-Math.cos(a)*z;move.z=Math.cos(a)*x-Math.sin(a)*z;}else if(clickTarget){const delta=clickTarget.subtract(hero.root.position);delta.y=0;if(delta.length()<.5)clickTarget=null;else move.copyFrom(delta).normalize();}
 if(move.lengthSquared()>1)move.normalize();const moving=move.lengthSquared()>.01;if(moving&&dashTime<=0){lastFacing.copyFrom(move).normalize();if(attackAnim<=0&&!hero.potion?.active)hero.root.rotation.y=Math.atan2(move.x,move.z);}
 const old=hero.root.position.clone();moveEntity(hero.root,(dashTime>0?lastFacing.scale(25):move.scale(st.speed)).scale(dt));if(dashTime>0)dashTrail?.spawn(old,hero.root.position);if(clickTarget&&dist(old,hero.root.position)<.003)clickTarget=null;
 if(hero.sprite){const motion=sprites.animate(hero.sprite,dt,{moving:dist(old,hero.root.position)>.002,pace:dashTime>0?1.3:1});hero.locomotion=motion;hero.body.position.y=motion.hop;hero.sprite.scaling.set(motion.sx,motion.sy,1);hero.sprite.rotation.z=motion.roll;hero.halo.scaling.setAll(1-motion.hop*.5);hero.halo.visibility=1-motion.hop*.7;hero.sprite.visibility=invincible>0?.55+Math.sin(t*45)*.3:1;if(motion.landed&&moving)landingDust(hero.root.position,.8);}else{hero.body.position.y=.85+(moving?Math.sin(t*12)*.07:Math.sin(t*2)*.025);hero.feet.forEach((f,i)=>{f.position.z=moving?Math.sin(t*12+i*Math.PI)*.22:0;});hero.arms.forEach((a,i)=>{a.rotation.x=attackAnim>0?-Math.sin(attackAnim*12):moving?Math.sin(t*12+i*Math.PI)*.25:0;});hero.cape.rotation.x=-.16-(moving?.15:0);hero.weapon.rotation.x=attackAnim>0?-Math.sin(attackAnim*12)*.6:0;hero.body.visibility=invincible>0?.45+Math.sin(t*45)*.3:1;hero.locomotion={hop:hero.body.position.y-.85,sx:1,sy:1,roll:0};}
 target=nearestEnemy(CLASSES[save.heroClass].range);if(keys.has('Space')||save.settings.autoAttack&&target)attack();
 updateEnemies(dt);updateProjectiles(dt);collectDrops(dt);updateCompanion(dt);updateInteraction();updateTargetFeedback();
 if(sprites)for(const enemy of enemies){const moving=dist(enemy.root.position,enemy.visualPosition)>.001;updateActorMotion(enemy,enemy.body,dt,moving,enemy.slow>0?.5:1);enemy.visualPosition.copyFrom(enemy.root.position);}
 for(let i=respawns.length-1;i>=0;i--){respawns[i].time-=dt;const r=respawns[i];if(r.time<=0&&dist(hero.root.position,r)>15){spawnEnemy(r.kind,r.x,r.z,r.level,r.campId);respawns.splice(i,1);}}
 if(saveTime>12){saveTime=0;persist();}
 }
 updateEffects(dt);if(fishing){const n=(Math.sin((t-fishing.start)*2.3)+1)/2;const m=$('fish-marker');if(m)m.style.left=(n*100)+'%';}
 const desired=mode==='intro'?new V(0,0,2.2):hero.root.position;camTarget.copyFrom(V.Lerp(camTarget,desired,1-Math.exp(-dt*5)));camera.target.copyFrom(new V(camTarget.x,.5,camTarget.z));if(!paused&&mode==='play'){if(keys.has('KeyZ'))camera.alpha-=dt*1.4;if(keys.has('KeyC'))camera.alpha+=dt*1.4;}if(shake>0){shake-=dt;camera.target.x+=(Math.random()-.5)*shake;}
 sun.position.set(camTarget.x-36,40,camTarget.z-27.2);

 if(fox.sprite)sprites.face(fox.sprite,fox.facing,camera.alpha);
 villagers?.update(dt,hero.root.position,camera.alpha,mode==='intro'?titlePaused:paused,mode==='play');
 campRescues?.update(dt,hero.root.position,camera.alpha,{paused:paused||mode!=='play',enabled:mode==='play'&&zone==='overworld',guardCount:campGuardCount});questMarkers?.update(dt,questGiverState,mode==='play'&&zone==='overworld',paused);
 townGuards?.update(dt,hero.root.position,camera.alpha,{paused:paused||mode!=='play',enabled:mode==='play'&&zone==='overworld',enemies});
 abilityEffects?.update(dt,{paused:visualPause});impacts?.update(dt,{paused:visualPause});dashTrail?.update(dt,{paused:visualPause});
 hero.combat?.update(dt,lastFacing,camera.alpha,{paused:visualPause,hop:hero.locomotion?.hop||0,moving:keys.size>0||!!clickTarget});
 hero.potion?.update(dt,hero.potionFacing||lastFacing,camera.alpha,{paused:paused||mode!=='play',hop:hero.locomotion?.hop||0});potionEquipment();
 hero.healing?.update(dt,{paused:paused||mode!=='play'});
 if(hero.sprite){const base=hero.locomotion||{hop:0,sx:1,sy:1,roll:0},motion=(hero.potion?.active?hero.potion.bodyMotion:hero.combat?.bodyMotion)||{hop:0,sx:1,sy:1,lean:0,spin:0};hero.body.position.y=base.hop+motion.hop;hero.sprite.scaling.set(base.sx*motion.sx,base.sy*motion.sy,1);hero.sprite.rotation.z=base.roll+motion.lean;const aim=hero.potion?.active?(hero.potionFacing||lastFacing):hero.combat?.active?(hero.actionFacing||lastFacing):lastFacing,yaw=Math.atan2(aim.x,aim.z)+motion.spin;sprites.face(hero.sprite,new V(Math.sin(yaw),0,Math.cos(yaw)),camera.alpha);hero.halo.scaling.setAll(Math.max(.5,1-(base.hop+motion.hop)*.5));}
 else{const motion=hero.potion?.bodyMotion||{hop:0,sx:1,sy:1,lean:0};hero.body.position.y=.85+(hero.locomotion?.hop||0)+motion.hop;hero.body.scaling.set(hero.restBodyScale.x*motion.sx,hero.restBodyScale.y*motion.sy,hero.restBodyScale.z);hero.body.rotation.z=motion.lean;}

 if(hero.halo)hero.halo.position.y=contactShadowHeight(hero.root);if(fox.halo)fox.halo.position.y=contactShadowHeight(fox.root);
 if(sprites)for(const enemy of enemies){enemy.halo.position.y=contactShadowHeight(enemy.root);sprites.face(enemy.body,enemy.facing,camera.alpha);}
 hudTime+=dt;if(hudTime>.12&&mode!=='intro'){hudTime=0;if(mode==='play'&&!paused&&zone==='overworld')for(const landmark of world.landmarks)if(landmark.kind!=='town'&&dist(hero.root.position,landmark)<(landmark.radius||6))questEvent({type:'visit',id:landmark.id});updateHUD();const region=getRegion();$('zone-name').textContent=region[0];$('zone-sub').textContent=region[1];if(lastZone!==region[0]){if(lastZone&&mode==='play')announce(region[0],region[1]);lastZone=region[0];}}
 sound.update(mode==='intro'?'title':zone==='overworld'&&world.isSafe(hero.root.position.x,hero.root.position.z)?'town':zone,inCombat>0&&mode==='play');
 syncMusicStatus();
}
function bind(){
 document.querySelectorAll('[data-title-action]').forEach(btn=>btn.onclick=()=>titleMenu(btn.dataset.titleAction));
 $('title-library').onclick=()=>musicLibrary();
 $('title-pause').onclick=()=>{titlePaused=!titlePaused;$('title-pause').setAttribute('aria-pressed',String(titlePaused));$('title-pause').setAttribute('aria-label',titlePaused?'Resume animated backdrop':'Pause animated backdrop');$('title-pause').textContent=titlePaused?'▶':'Ⅱ';};

 document.querySelectorAll('[data-class]').forEach(btn=>btn.onclick=()=>{selectedClass=btn.dataset.class;document.querySelectorAll('[data-class]').forEach(b=>{b.classList.toggle('selected',b===btn);b.setAttribute('aria-pressed',b===btn?'true':'false');});const p=hero.root.position.clone();hero.root.dispose();hero=createHero(selectedClass);hero.root.position.copyFrom(p);sound.play('click');});
 $('start-button').onclick=()=>{if(saved){openModal('<div class="eyebrow">A NEW CHAPTER</div><h2 class="modal-title">Begin a new adventure?</h2><p>Your saved adventure will be replaced when you begin. You can continue it instead from the title screen.</p><button class="primary" data-action="new-game">Begin new adventure</button><button class="secondary" data-action="close">Keep my current adventure</button>');}else launchAdventure();};$('continue-button').onclick=()=>launchAdventure(true);$('transition-retry').onclick=()=>location.reload();
 $('attack-button').onclick=attack;$('skill-button').onclick=()=>skill();$('ultimate-button').onclick=()=>skill(true);$('dash-button').onclick=dash;$('potion-button').onclick=potion;$('interact-button').onclick=talk;
 $('bag-button').onclick=bag;$('journal-button').onclick=()=>journal();$('quest-log-button').onclick=()=>journal();$('settings-button').onclick=settings;$('map-button').onclick=map;$('minimap').onclick=map;$('sound-button').onclick=toggleSound;
 $('camera-left').onclick=()=>{camera.alpha-=Math.PI/4;};$('camera-right').onclick=()=>{camera.alpha+=Math.PI/4;};$('camera-reset').onclick=resetCamera;
 $('modal').addEventListener('click',e=>{const el=e.target.closest('button');if(!el)return;const action=el.dataset.action;if(action==='new-game'){launchAdventure();return;}if(action){if(['dungeon','home','travel','revive'].includes(action))transition(()=>modalAction(action),action==='dungeon'?'Opening the Hollow Sanctum…':'Following the lanterns home…');else modalAction(action);return;}if(el.dataset.equip){equip(save,el.dataset.equip);const st=stats(save);save.hp=Math.min(save.hp,st.maxHp);sound.play('loot');bag();persist();}if(el.dataset.sell){const i=save.inventory.findIndex(g=>g.id===el.dataset.sell);if(i>=0){save.gold+=save.inventory[i].price;save.inventory.splice(i,1);sound.play('coin');bag();persist();}}});
 $('modal').addEventListener('input',e=>{if(e.target.matches?.('[data-audio-volume]'))changeAudioVolume(e.target.dataset.audioVolume,Number(e.target.value));});
 $('modal').addEventListener('change',e=>{if(e.target.matches?.('[data-audio-volume]'))changeAudioVolume(e.target.dataset.audioVolume,Number(e.target.value),true);});
 window.addEventListener('keydown',e=>{if(transitioning)return;if(e.code!=='Escape'&&(paused||mode==='intro')&&e.target.closest?.('button,input,select,textarea'))return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&mode==='play')e.preventDefault();if(e.code!=='Escape'&&e.target.tagName==='INPUT')return;if(mode==='intro'){if(e.code==='Escape'&&!$('modal').hidden)closeModal();return;}if(paused){if(e.code==='Escape'&&mode!=='dead')closeModal();if(e.code==='Space'&&fishing){e.preventDefault();catchFish();}return;}keys.add(e.code);if(e.repeat)return;switch(e.code){case'ShiftLeft':case'ShiftRight':dash();break;case'KeyQ':case'Digit1':skill();break;case'KeyF':case'Digit2':skill(true);break;case'KeyR':potion();break;case'KeyE':talk();break;case'KeyI':bag();break;case'KeyJ':journal();break;case'KeyM':map();break;case'KeyT':treeStyles();break;case'Escape':case'KeyP':settings();break;}});
 window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();touch.x=touch.z=0;if(mode==='play'&&!paused)settings();});document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();persist();if(mode==='play'&&!paused)settings();}});window.addEventListener('beforeunload',persist);
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 const orbitTouches=new Map();let pinchLength=0;
 canvas.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;orbitTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);if(orbitTouches.size===2){const [a,b]=[...orbitTouches.values()];pinchLength=Math.hypot(a.x-b.x,a.y-b.y);}});
 canvas.addEventListener('pointermove',e=>{if(!orbitTouches.has(e.pointerId)||paused)return;const old=orbitTouches.get(e.pointerId);orbitTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(orbitTouches.size===1){camera.alpha-=(e.clientX-old.x)*.006;camera.beta=clamp(camera.beta-(e.clientY-old.y)*.004,.4,1.15);}else{const [a,b]=[...orbitTouches.values()],length=Math.hypot(a.x-b.x,a.y-b.y);if(pinchLength>0&&length>0)camera.radius=clamp(camera.radius*pinchLength/length,19,52);pinchLength=length;}});
 for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,e=>{orbitTouches.delete(e.pointerId);pinchLength=0;});
 window.addEventListener('keydown',e=>{if(e.code==='KeyV'&&mode==='play'&&!paused)resetCamera();});
 canvas.addEventListener('pointerdown',e=>{if(mode!=='play'||paused||e.pointerType==='touch'||e.button>0)return;canvas.focus();const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top,bodyTarget=largeEnemyAtPointer(x,y);if(bodyTarget){preferredTarget=bodyTarget;if(enemyDistance(bodyTarget,hero.root.position)<CLASSES[save.heroClass].range)attack();else clickTarget=bodyTarget.root.position.clone();return;}const pick=scene.pick(x,y,m=>m.metadata?.ground===true);if(pick?.hit){const point=pick.pickedPoint;const en=enemies.find(f=>dist(f.root.position,point)<f.profile.selectionRadius);if(en){preferredTarget=en;if(enemyDistance(en,hero.root.position)<CLASSES[save.heroClass].range)attack();else clickTarget=new V(point.x,0,point.z);}else{preferredTarget=null;clickTarget=new V(point.x,0,point.z);}}});
 const stick=$('stick');let pointer=null;const reset=()=>{pointer=null;touch.x=touch.z=0;$('knob').style.transform='';};const movement=e=>{const r=stick.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/(r.width*.35),z=-(e.clientY-r.top-r.height/2)/(r.height*.35);const len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}touch.x=x;touch.z=z;$('knob').style.transform=`translate(${x*25}px,${-z*25}px)`;};stick.onpointerdown=e=>{pointer=e.pointerId;stick.setPointerCapture(pointer);movement(e);};stick.onpointermove=e=>{if(e.pointerId===pointer)movement(e);};stick.onpointerup=reset;stick.onpointercancel=reset;
}
prepareTitleMusic();bindMusicActivation();
boot();
