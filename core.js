import {newQuestState,normalizeQuestState} from './quests.js?v=17317200';
import {normalizeTreeStyle} from './tree-style-options.js?v=17317200';

export const SAVE_KEY='emberwild-save-v1';
export const CLASSES={
 knight:{name:'Dawnwarden',icon:'⚔',color:'#e6b95d',hp:150,mana:80,damage:23,speed:6.4,range:3.5,rate:.66,attack:'Sunsteel slash',skill:'Whirlwind',ultimate:'Dawnfall',description:'A brave blade, a steadfast heart. Close combat and powerful area attacks.'},
 mage:{name:'Starweaver',icon:'✦',color:'#b098eb',hp:105,mana:130,damage:26,speed:6.2,range:11,rate:.8,attack:'Starbolt',skill:'Frost bloom',ultimate:'Starfall',description:'Turn starlight into firepower. Ranged spells and crowd control.'},
 ranger:{name:'Wildstrider',icon:'➶',color:'#88c77e',hp:120,mana:100,damage:19,speed:7.2,range:13,rate:.53,attack:'Thorn arrow',skill:'Triple volley',ultimate:'Arrow rain',description:'Light on your feet. Swift arrows, piercing volleys, and a wild heart.'}
};
export const RARITIES=[{name:'common',color:'#c6d0bf',mult:1},{name:'uncommon',color:'#80cd91',mult:1.35},{name:'rare',color:'#90bafa',mult:1.8},{name:'legendary',color:'#f1c56e',mult:2.5}];
export const xpNeeded=level=>80+level*45;
export function newGame(heroClass='knight'){
 return {version:1,heroClass,level:1,xp:0,gold:35,shards:0,herbs:0,fish:0,potions:5,kills:0,quest:0,quests:newQuestState(),shrines:[],chests:[],gathered:[],rescued:[],inventory:[],equipment:{weapon:null,armor:null,charm:null},forge:0,ascension:0,bosses:0,totalGold:0,playtime:0,zone:'overworld',x:0,z:-5,hp:CLASSES[heroClass].hp,mana:CLASSES[heroClass].mana,settings:{sound:true,musicVolume:.8,effectsVolume:.8,autoAttack:false,quality:'high',treeStyle:'current'},achievements:[]};
}
export function stats(s){const c=CLASSES[s.heroClass];const gear=Object.values(s.equipment).filter(Boolean);return {maxHp:c.hp+(s.level-1)*16+gear.reduce((a,g)=>a+(g.hp||0),0),maxMana:c.mana+(s.level-1)*5,damage:c.damage+(s.level-1)*4+s.forge*4+gear.reduce((a,g)=>a+(g.damage||0),0),speed:c.speed+gear.reduce((a,g)=>a+(g.speed||0),0),armor:Math.min(.55,gear.reduce((a,g)=>a+(g.armor||0),0)),crit:.08+gear.reduce((a,g)=>a+(g.crit||0),0)};}
export function addXP(s,value){s.xp+=value;let gained=0;while(s.xp>=xpNeeded(s.level)){s.xp-=xpNeeded(s.level);s.level++;gained++;}return gained;}
export function makeLoot(level,heroClass,roll=Math.random(),slotRoll=Math.random()){
 const rarity=roll>.97?3:roll>.76?2:roll>.4?1:0;const r=RARITIES[rarity];const slot=slotRoll<.45?'weapon':slotRoll<.8?'armor':'charm';
 const prefixes=['Wayfarer’s','Verdant','Moonlit','Sovereign’s'];const weapons={knight:'Blade',mage:'Staff',ranger:'Longbow'};
 const item={id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),name:prefixes[rarity]+' '+(slot==='weapon'?weapons[heroClass]:slot==='armor'?'Mantle':'Sigil'),slot,rarity:r.name,level,price:Math.round((12+level*8)*r.mult)};
 if(slot==='weapon')item.damage=Math.round((4+level*2)*r.mult);
 if(slot==='armor'){item.hp=Math.round((12+level*5)*r.mult);item.armor=.025*r.mult;}
 if(slot==='charm'){item.crit=.025*r.mult;item.speed=.12*r.mult;item.damage=Math.round(level*r.mult);}
 return item;
}
export function equip(s,id){const i=s.inventory.findIndex(g=>g.id===id);if(i<0)return false;const item=s.inventory.splice(i,1)[0],old=s.equipment[item.slot];s.equipment[item.slot]=item;if(old)s.inventory.push(old);return true;}
export function parseSave(raw){
 try{const x=JSON.parse(raw);if(!x||x.version!==1||!Object.hasOwn(CLASSES,x.heroClass))return null;const s=newGame(x.heroClass);
 for(const k of ['level','xp','gold','shards','herbs','fish','potions','kills','quest','forge','ascension','bosses','totalGold','playtime','hp','mana','x','z'])if(Number.isFinite(x[k]))s[k]=x[k];
 for(const k of ['level','xp','gold','shards','herbs','fish','potions','kills','quest','forge','ascension','bosses','totalGold'])s[k]=Math.max(0,Math.floor(s[k]));
 for(const k of ['playtime','hp','mana'])s[k]=Math.max(0,s[k]);
 s.level=Math.max(1,Math.min(100,s.level));s.quest=Math.max(0,Math.min(4,s.quest));s.zone=x.zone==='dungeon'?'dungeon':'overworld';
 const validItem=g=>g&&typeof g.id==='string'&&typeof g.name==='string'&&['weapon','armor','charm'].includes(g.slot)&&RARITIES.some(r=>r.name===g.rarity)&&['damage','hp','speed','armor','crit','price','level'].every(k=>g[k]===undefined||Number.isFinite(g[k]));
 s.inventory=Array.isArray(x.inventory)?x.inventory.filter(validItem).slice(0,100):[];
 for(const k of ['weapon','armor','charm'])if(validItem(x.equipment?.[k])&&x.equipment[k].slot===k)s.equipment[k]=x.equipment[k];
 for(const k of ['shrines','chests','gathered','achievements'])s[k]=Array.isArray(x[k])?x[k].filter(v=>typeof v==='string').slice(0,200):[];
 s.rescued=Array.isArray(x.rescued)?[...new Set(x.rescued.filter(id=>['cinderwatch','thornhide','moonshard'].includes(id)))]:[];
 s.quests=normalizeQuestState(x.quests);
 s.settings={...s.settings,...(x.settings&&typeof x.settings==='object'?x.settings:{})};s.settings.treeStyle=normalizeTreeStyle(s.settings.treeStyle);
 for(const key of ['musicVolume','effectsVolume'])s.settings[key]=Number.isFinite(s.settings[key])?Math.max(0,Math.min(1,s.settings[key])):.8;
 return s;
 }catch{return null;}
}
export function questInfo(s){
 if(s.quest===0)return {title:'A light in the wild',text:'Speak to Elder Rowan by the village fountain.',target:'elder'};
 if(s.quest===1&&s.kills<6)return {title:'Trouble in the meadow',text:`Defeat woodland creatures · ${Math.min(6,s.kills)} / 6\nCollect the ember shards they leave behind.`,target:'meadow'};
 if(s.quest===1)return {title:'A promise kept',text:'Return to Elder Rowan for your reward.',target:'elder'};
 if(s.shrines.length<3)return {title:'Wake the waystones',text:`Restore the three waystones · ${s.shrines.length} / 3\nEach requires 3 ember shards. Explore the map.`,target:'shrine'};
 if(s.bosses===0)return {title:'The hollow crown',text:'Enter the northern gate. Defeat the Hollow King.',target:'portal'};
 if(s.quest<4)return {title:'Homeward, hero',text:'Return to Elder Rowan. The valley has a new story.',target:'elder'};
 return {title:'Beyond the first dawn',text:`Venture deeper. Ascension ${s.ascension+1} awaits.\nDiscover every chest and perfect your equipment.`,target:'portal'};
}
