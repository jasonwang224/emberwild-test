/* Side stories share the existing save, without replacing Elder Rowan's main quest. */
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};

export const QUESTS=freeze([
  {
    id:'smith-quarry',title:'Sparks in the Quarry',giverId:'smith',giverName:'Bram',category:'Battle',prerequisites:[],
    description:'Clear the four guards from Cinderwatch Quarry in the southwest, then report to Bram.',
    objectives:[{type:'camp',id:'cinderwatch',label:'Clear Cinderwatch Quarry',target:1}],
    rewards:{gold:65,xp:90,shards:2},
    dialogue:{offer:'The quarry carts have stopped coming. Four creatures have claimed Cinderwatch, southwest of town. Clear them out and I can get the forge singing again.',progress:'Cinderwatch lies beyond the southwest trails. Clear all four guards, then bring me the good news.',complete:'That is the sound of wagons rolling again! Take these coins and ember shards. You have earned a place by my forge.'}
  },
  {
    id:'smith-stonehearts',title:'A Heart of Stone',giverId:'smith',giverName:'Bram',category:'Battle',prerequisites:['smith-quarry'],
    description:'Defeat two stone golems after accepting this task, then return to Bram for rare equipment.',
    objectives:[{type:'kill',kind:'golem',label:'Defeat stone golems',target:2}],
    rewards:{gold:55,xp:130,gear:'rare'},
    dialogue:{offer:'Those walking boulders are still a danger to travelers. Bring down two stone golems. Find them in the old ruins and quarry; I will fashion you something special.',progress:'Two golems, friend. Their heavy swings leave a moment to strike. I only need your word; keep whatever they drop.',complete:'Strong arms, stronger heart. I made this rare piece while you were away. May it carry you safely through the wild.'}
  },
  {
    id:'inn-landmarks',title:'Stories for the Hearth',giverId:'inn',giverName:'Lysa',category:'Exploration',prerequisites:[],
    description:'Visit any three frontier landmarks: Sunwheel Mill, The Three Sisters, Sentinel Bell, or Wayfarer’s Rest.',
    objectives:[{type:'visit',label:'Visit different frontier landmarks',target:3}],
    rewards:{gold:45,xp:80,potions:2},
    dialogue:{offer:'A good inn needs better stories! Visit any three of the mill, the standing stones, the bell tower, and the painted caravan. I will keep a warm seat for your return.',progress:'Look for the four star markers on your map. Get close to three different landmarks, then tell me what you found.',complete:'Sails in the breeze, old stones, travelers on the road... now those are stories worth sharing. Here is your pay, and a little comfort for the next journey.'}
  },
  {
    id:'inn-stockade',title:'An Open Road',giverId:'inn',giverName:'Lysa',category:'Battle',prerequisites:['inn-landmarks'],
    description:'Clear all four guards from Thornhide Stockade east of town, then return to Lysa.',
    objectives:[{type:'camp',id:'thornhide',label:'Clear Thornhide Stockade',target:1}],
    rewards:{gold:80,xp:110,potions:2},
    dialogue:{offer:'Now for a story with a brave ending. The Thornhide pack has frightened traders off the eastern road. Clear their stockade and our guests can travel in peace.',progress:'Follow the road east to the timber walls. Use the broad gates and defeat all four guards. I will be here when the road is safe.',complete:'The first trader is already on the way! The inn will be full tonight, thanks to you. Take this, with all our gratitude.'}
  },
  {
    id:'cook-moonleaf',title:'A Little Forest Alchemy',giverId:'cook',giverName:'Mira',category:'Gathering',prerequisites:[],
    description:'Gather Moonleaf from three different plants. Leaves you have already gathered count, and you keep your ingredients.',
    objectives:[{type:'gather',label:'Gather different Moonleaf plants',target:3}],
    rewards:{gold:20,xp:40,potions:2},
    dialogue:{offer:'Every good wanderer should know Moonleaf. Find three different glowing plants and gather their leaves. Anything you have already found counts, and the leaves are yours to keep.',progress:'Look for glowing Moonleaf beside the woodland trails. Three different plants will do. Brew your leaves whenever you like; I am interested in what you have learned.',complete:'You know your Moonleaf now! Keep the leaves, and take two of my best tonics. The wild is kinder to a prepared traveler.'}
  },
  {
    id:'cook-silverfin',title:'Supper from the Silver Water',giverId:'cook',giverName:'Mira',category:'Fishing',prerequisites:['cook-moonleaf'],
    description:'Catch two silverfin at Moonmirror Pond after accepting this task, then return to Mira. Keep both fish.',
    objectives:[{type:'fish',label:'Catch silverfin at Moonmirror Pond',target:2}],
    rewards:{gold:35,xp:60,potions:1},
    dialogue:{offer:'Ready for a quieter kind of adventure? Catch two silverfin at Moonmirror Pond, west of town. Reel in while the marker is green. You can keep your catch!',progress:'Patience makes a fine fisher. Catch two silverfin since we spoke, then come back. Cooking or selling a catch will not undo your progress.',complete:'Two silverfin! You have a feel for the water. Here is a little reward for a lesson well learned. Supper is in good hands.'}
  }
]);

const byId=new Map(QUESTS.map(quest=>[quest.id,quest]));
const campIds=new Set(['cinderwatch','thornhide','moonshard']);
const landmarkIds=new Set(['sunwheel','three-sisters','sentinel','wayfarer']);
const validHerb=id=>typeof id==='string'&&/^herb\d{1,3}$/.test(id);
const validDiscovery=value=>{
  if(typeof value!=='string')return false;
  const [type,id,...rest]=value.split(':');
  if(rest.length)return false;
  return type==='gather'?validHerb(id):type==='camp'?campIds.has(id):type==='visit'&&landmarkIds.has(id);
};
const field=(object,key)=>object&&typeof object==='object'&&Object.hasOwn(object,key)?object[key]:undefined;
const uniqueKnown=list=>Array.isArray(list)?[...new Set(list.filter(id=>typeof id==='string'&&byId.has(id)))]:[];
const prerequisitesMet=(quest,state)=>quest.prerequisites.every(id=>state.completed.includes(id));
const count=(value,target)=>Number.isFinite(value)?Math.max(0,Math.min(target,Math.floor(value))):0;

export function newQuestState(){return {accepted:[],completed:[],progress:{},tracked:'main',discoveries:[]};}

export function normalizeQuestState(raw){
  const state=newQuestState();
  state.completed=uniqueKnown(field(raw,'completed'));
  state.accepted=[...new Set([...uniqueKnown(field(raw,'accepted')),...state.completed])]
    .filter(id=>state.completed.includes(id)||prerequisitesMet(byId.get(id),state));
  const storedProgress=field(raw,'progress');
  for(const id of state.accepted){
    const quest=byId.get(id),values=field(storedProgress,id);
    state.progress[id]=quest.objectives.map((objective,index)=>state.completed.includes(id)?objective.target:count(Array.isArray(values)?values[index]:0,objective.target));
  }
  const discoveries=field(raw,'discoveries');
  state.discoveries=Array.isArray(discoveries)?[...new Set(discoveries.filter(validDiscovery))].slice(0,200):[];
  const tracked=field(raw,'tracked'),quest=byId.get(tracked);
  if(quest&&!state.completed.includes(tracked)&&prerequisitesMet(quest,state))state.tracked=tracked;
  return state;
}

function readState(save){return normalizeQuestState(field(save,'quests'));}
function ensureState(save){return save.quests=readState(save);}

function discoveryCount(save,state,objective){
  if(objective.type==='gather'){
    const plants=new Set(state.discoveries.filter(value=>value.startsWith('gather:')).map(value=>value.slice(7)));
    if(Array.isArray(save.gathered))save.gathered.filter(validHerb).forEach(id=>plants.add(id));
    return plants.size;
  }
  if(objective.type==='visit')return state.discoveries.filter(value=>value.startsWith('visit:')).length;
  if(objective.type==='camp')return state.discoveries.includes('camp:'+objective.id)||Array.isArray(save.chests)&&save.chests.includes('camp-'+objective.id+'-cache')?1:0;
  return 0;
}

function objectivesFor(save,state,quest){
  const accepted=state.accepted.includes(quest.id),completed=state.completed.includes(quest.id);
  return quest.objectives.map((objective,index)=>{
    const current=completed?objective.target:accepted?count(Math.max(state.progress[quest.id]?.[index]||0,discoveryCount(save,state,objective)),objective.target):0;
    return {label:objective.label,current,target:objective.target,done:current>=objective.target};
  });
}

function statusFor(save,state,quest){
  if(!quest)return 'locked';
  if(state.completed.includes(quest.id))return 'completed';
  if(!prerequisitesMet(quest,state))return 'locked';
  if(!state.accepted.includes(quest.id))return 'available';
  return objectivesFor(save,state,quest).every(objective=>objective.done)?'ready':'active';
}

export function questStatus(save,id){return statusFor(save,readState(save),byId.get(id));}
export function questObjectives(save,id){const quest=byId.get(id);return quest?objectivesFor(save,readState(save),quest):[];}
export function questsForGiver(save,giverId){const state=readState(save);return QUESTS.filter(quest=>quest.giverId===giverId&&statusFor(save,state,quest)!=='locked');}

export function acceptQuest(save,id){
  const quest=byId.get(id),state=ensureState(save);
  if(!quest||statusFor(save,state,quest)!=='available')return false;
  state.accepted.push(id);
  state.progress[id]=quest.objectives.map(objective=>count(discoveryCount(save,state,objective),objective.target));
  state.tracked=id;
  return true;
}

/** Mark the claim first; the caller grants these rewards in the same saved transaction. */
export function claimQuest(save,id){
  const quest=byId.get(id),state=ensureState(save);
  if(!quest||statusFor(save,state,quest)!=='ready')return null;
  state.completed.push(id);
  state.progress[id]=quest.objectives.map(objective=>objective.target);
  if(state.tracked===id)state.tracked='main';
  return {...quest.rewards};
}

export function recordQuestEvent(save,event){
  if(!event||typeof event!=='object')return [];
  const type=field(event,'type'),id=field(event,'id'),kind=field(event,'kind');
  const valid=type==='fish'||type==='kill'&&kind==='golem'||type==='gather'&&validHerb(id)||type==='camp'&&campIds.has(id)||type==='visit'&&landmarkIds.has(id);
  if(!valid)return [];
  const state=ensureState(save),before=new Set(state.accepted.filter(questId=>byId.get(questId).objectives.every((objective,index)=>(state.progress[questId]?.[index]||0)>=objective.target)));
  if(['gather','camp','visit'].includes(type)){
    const discovery=type+':'+id;
    if(!state.discoveries.includes(discovery))state.discoveries.push(discovery);
  }
  const newlyReady=[];
  for(const questId of state.accepted){
    if(state.completed.includes(questId))continue;
    const quest=byId.get(questId);
    state.progress[questId]=quest.objectives.map((objective,index)=>{
      let value=state.progress[questId]?.[index]||0;
      if(objective.type==='kill'&&type==='kill'&&objective.kind===kind||objective.type==='fish'&&type==='fish')value++;
      return count(Math.max(value,discoveryCount(save,state,objective)),objective.target);
    });
    if(!before.has(questId)&&statusFor(save,state,quest)==='ready')newlyReady.push(questId);
  }
  return newlyReady;
}

export function setTrackedQuest(save,id){
  const state=ensureState(save);
  if(id==='main'){state.tracked='main';return true;}
  if(['available','active','ready'].includes(statusFor(save,state,byId.get(id)))){state.tracked=id;return true;}
  return false;
}

export function trackedQuest(save){const state=readState(save);return byId.get(state.tracked)||null;}
