/** Original small-ensemble adventure music. No recordings or transcriptions.
 * Each 32-bar score develops its own melody, harmony, meter and instrumental roles.
 * A score step is one sixteenth note; durations end within the written bar. */
const track=(title,theme,bpm,stepsPerBar,description,filter,swing=0)=>Object.freeze({title,theme,bpm,bars:32,stepsPerBar,description,filter,swing});
export const CHIP_TRACKS=Object.freeze({
 sunbeam_overture:track('Sunbeam Overture','title',96,16,'Bells and flute over rolling piano, warm strings and a gentle drum kit.',6000),
 lantern_waltz:track('Lantern Waltz','town',108,12,'Flute and clarinet trade a waltz over piano, strings and softly brushed drums.',5600),
 market_shuffle:track('Marketday Shuffle','town',112,16,'Clarinet, piano and guitar swing over walking bass, string flourishes and a light kit.',6200,.16),
 coppertrail_hop:track('Coppertrail Hop','overworld',122,16,'Guitar and flute lead a bright ensemble of piano, strings, bells and driving drums.',6400),
 cloudmeadow_sway:track('Cloudmeadow Sway','overworld',94,12,'A lilting flute melody with fingerpicked guitar, electric piano, bells and warm string harmonies.',5800),
 glass_cavern:track('Glass Cavern','dungeon',78,16,'Glass bells answer distant clarinet above roomy strings, broken piano chords and low bass.',4600),
 clockwork_ruins:track('Clockwork Ruins','dungeon',106,16,'Low clarinet and ticking bells weave through piano chords, tense strings and quiet drums.',5400),
 banner_march:track('Little Banner March','combat',138,16,'Brass fanfares, answering flutes and rhythmic piano ride a full string section and marching kit.',6500),
 bramble_breakbeat:track('Bramble Breakbeat','combat',146,16,'Nimble brass and piano riffs with guitar, urgent strings, syncopated bass and drum fills.',6500)
});
export const THEME_PLAYLISTS=Object.freeze({
 title:Object.freeze(['sunbeam_overture']),town:Object.freeze(['lantern_waltz','market_shuffle']),
 overworld:Object.freeze(['coppertrail_hop','cloudmeadow_sway']),dungeon:Object.freeze(['glass_cavern','clockwork_ruins']),
 combat:Object.freeze(['banner_march','bramble_breakbeat'])
});
export const CHIP_THEMES=Object.freeze(Object.fromEntries(Object.entries(THEME_PLAYLISTS).map(([theme,ids])=>[theme,CHIP_TRACKS[ids[0]]])));

// Authored four-bar A and B phrases, an answering turnaround and a final cadence.
// MIDI pitch:step length, r = rest. These are musical phrases, not random notes.
const phrases={
 sunbeam_overture:{
  a:['79:6 r:2 74:2 71:2 76:4','78:8 74:4 r:4','71:2 76:2 83:8 81:2 79:2','78:4 76:4 74:4 r:4'],
  b:['83:4 79:2 76:2 72:4 76:4','81:6 78:2 74:4 r:4','79:2 83:2 86:4 84:2 83:2 81:4','78:4 r:2 81:2 74:8'],
  turn:'76:4 72:4 74:2 78:2 81:4',end:'79:12 r:4'
 },
 lantern_waltz:{
  a:['77:4 81:2 79:2 77:4','76:2 72:2 69:4 r:4','74:4 77:4 81:4','79:6 76:2 72:4'],
  b:['81:2 84:2 86:4 84:4','82:4 79:4 r:4','81:4 77:4 74:2 76:2','79:8 72:4'],
  turn:'79:4 81:2 79:2 76:4',end:'77:8 r:4'
 },
 market_shuffle:{
  a:['r:1 70:2 69:1 65:3 67:1 70:2 r:2 62:4','63:3 65:1 67:2 r:2 65:3 62:1 58:4','r:2 67:1 70:1 75:3 74:1 70:2 67:2 r:4','69:3 65:1 62:2 65:2 60:4 r:4'],
  b:['74:3 77:1 75:2 r:2 74:3 70:1 67:4','72:3 69:1 65:2 62:2 r:2 65:2 69:4','r:1 70:2 74:1 77:3 75:1 74:2 72:2 r:4','69:3 65:1 60:4 62:3 65:1 r:4'],
  turn:'65:3 62:1 60:2 62:2 65:3 69:1 r:4',end:'70:3 65:1 58:8 r:4'
 },
 coppertrail_hop:{
  a:['62:1 r:1 69:2 65:1 67:1 r:2 72:3 69:1 67:2 r:2','65:2 r:2 62:3 64:1 65:2 69:2 r:4','67:1 69:1 72:2 r:2 74:2 72:3 69:1 67:4','64:2 67:1 71:1 r:4 69:2 65:2 r:4'],
  b:['77:2 r:2 76:1 72:1 69:2 74:3 72:1 69:2 r:2','71:1 67:1 64:2 r:2 67:2 71:2 74:2 r:4','72:1 r:1 77:2 76:1 74:1 r:2 72:3 69:1 65:4','67:2 64:1 61:1 r:4 64:2 69:2 r:4'],
  turn:'72:1 69:1 67:2 r:2 65:2 64:3 61:1 69:4',end:'65:2 64:2 62:8 r:4'
 },
 cloudmeadow_sway:{
  a:['81:6 78:3 76:3','73:3 76:3 80:6','78:3 81:3 85:3 83:3','81:6 r:6'],
  b:['85:3 83:3 81:6','78:6 74:3 76:3','80:3 83:3 88:6','85:3 81:3 80:3 r:3'],
  turn:'85:3 83:3 80:6',end:'81:9 r:3'
 },
 glass_cavern:{
  a:['85:2 r:10 80:4','r:4 76:6 r:6','79:3 r:5 85:2 r:6','r:8 75:4 r:4'],
  b:['88:3 r:5 86:2 r:6','r:6 82:4 r:6','85:2 r:2 79:2 r:6 76:4','r:4 75:6 r:6'],
  turn:'83:3 r:5 80:4 r:4',end:'85:8 r:8'
 },
 clockwork_ruins:{
  a:['52:3 59:1 58:2 r:2 55:4 r:4','54:3 57:1 60:2 59:2 r:4 54:4','55:4 r:2 62:2 61:3 59:1 55:4','54:2 51:2 52:4 r:8'],
  b:['67:3 64:1 59:4 62:2 r:2 60:4','57:4 54:3 53:1 54:4 r:4','59:3 63:1 66:2 r:2 64:4 60:4','59:2 54:2 51:4 r:8'],
  turn:'55:4 54:2 51:2 54:4 r:4',end:'52:10 r:6'
 },
 banner_march:{
  a:['72:2 72:1 72:1 79:4 76:2 79:2 84:4','83:2 79:2 77:2 76:2 74:4 r:4','77:2 77:1 77:1 81:4 84:2 81:2 77:4','79:6 74:2 71:4 r:4'],
  b:['81:4 76:2 76:2 79:4 72:4','77:2 77:2 81:4 79:4 r:4','74:2 74:1 74:1 77:4 81:2 84:2 86:4','83:4 79:4 74:4 r:4'],
  turn:'77:2 77:1 77:1 81:4 79:2 74:2 71:4',end:'72:12 r:4'
 },
 bramble_breakbeat:{
  a:['r:1 69:1 76:1 72:1 r:2 79:2 76:1 r:1 72:2 71:1 69:1 r:2','65:2 r:1 69:1 72:1 76:1 r:2 74:3 72:1 r:4','r:1 74:1 77:1 81:1 r:2 79:2 77:1 r:1 74:2 72:2 r:2','71:1 68:1 r:2 64:2 68:2 r:1 71:1 76:2 r:4'],
  b:['r:1 84:1 81:1 76:1 r:2 79:2 83:1 r:1 81:2 79:1 76:1 r:2','77:2 r:1 81:1 84:1 83:1 r:2 81:3 77:1 r:4','r:1 74:1 81:1 77:1 r:2 84:2 81:1 r:1 79:2 77:2 r:2','80:1 83:1 r:2 88:2 86:2 r:1 83:1 80:2 r:4'],
  turn:'r:1 74:1 72:1 71:1 r:2 68:2 64:1 r:1 68:2 71:2 r:2',end:'76:1 72:1 r:2 69:8 r:4'
 }
};
// Bass root plus three accompanying chord tones; contrasting B harmony follows A.
const harmony={
 sunbeam_overture:[[43,59,62,66],[40,59,62,64],[48,60,64,67],[38,57,60,66],[40,59,62,67],[45,57,60,64],[48,60,64,67],[38,57,60,66]],
 lantern_waltz:[[41,57,60,65],[45,57,60,64],[46,58,62,65],[48,58,60,64],[38,57,62,65],[43,58,62,67],[46,58,62,65],[48,58,60,64]],
 market_shuffle:[[46,58,62,65],[43,58,62,67],[39,55,58,63],[41,57,60,63],[43,58,62,67],[48,55,58,64],[39,55,58,63],[41,57,60,63]],
 coppertrail_hop:[[38,57,60,65],[41,57,60,64],[43,59,62,67],[45,57,61,64],[46,58,62,65],[40,55,59,64],[43,59,62,67],[45,57,61,64]],
 cloudmeadow_sway:[[45,61,64,68],[40,59,64,68],[42,61,66,69],[45,61,64,69],[42,57,61,66],[38,57,62,66],[40,59,64,68],[40,59,64,68]],
 glass_cavern:[[37,56,61,64],[37,55,61,64],[43,55,61,64],[36,54,60,63],[40,56,59,64],[38,56,62,65],[43,55,61,64],[36,54,60,63]],
 clockwork_ruins:[[40,55,59,64],[42,54,57,60],[43,55,59,62],[47,54,59,63],[48,55,60,64],[42,54,57,60],[47,54,59,63],[47,54,59,63]],
 banner_march:[[48,60,64,67],[43,59,62,65],[41,57,60,65],[43,59,62,65],[45,57,60,64],[41,57,60,65],[38,57,60,65],[43,59,62,65]],
 bramble_breakbeat:[[45,57,60,64],[41,57,60,65],[38,57,62,65],[40,56,59,64],[48,60,64,67],[41,57,60,65],[38,57,62,65],[40,56,59,64]]
};
// Each bridge has new melodic material and its own harmonic journey. The returning
// A melody stays recognizable; development comes from phrasing and orchestration.
const bridges={
 sunbeam_overture:{
  a:['76:4 79:2 78:2 74:4 71:4','75:4 78:4 83:6 r:2','79:2 76:2 72:4 76:4 79:4','81:4 78:2 74:2 78:4 r:4'],
  h:[[40,55,59,64],[47,54,59,63],[48,55,60,64],[38,54,57,62]]
 },
 lantern_waltz:{
  a:['74:6 69:2 65:4','70:4 74:2 77:2 74:4','79:2 77:2 74:4 70:4','76:6 74:2 72:4'],
  h:[[38,53,57,62],[46,53,58,62],[43,55,58,62],[48,55,58,64]]
 },
 market_shuffle:{
  a:['67:3 70:1 74:4 r:2 70:2 67:4','65:2 62:2 r:2 58:2 62:3 65:1 67:4','64:3 67:1 70:2 72:2 76:4 r:4','75:2 72:2 69:3 67:1 65:4 r:4'],
  h:[[39,55,58,62],[43,53,58,62],[48,55,58,64],[41,57,60,63]]
 },
 coppertrail_hop:{
  a:['74:4 70:2 65:2 62:2 r:2 65:4','76:3 72:1 67:2 r:2 64:4 67:4','77:2 74:2 69:4 65:2 64:2 62:4','61:2 64:2 69:3 71:1 73:4 r:4'],
  h:[[46,53,58,62],[48,55,60,64],[38,53,57,62],[45,55,61,64]]
 },
 cloudmeadow_sway:{
  a:['83:3 78:3 74:6','81:3 78:3 74:3 73:3','78:6 73:3 69:3','76:3 80:3 83:3 r:3'],
  h:[[47,54,59,62],[38,54,57,62],[42,57,61,66],[40,56,59,64]]
 },
 glass_cavern:{
  a:['88:4 r:4 85:2 r:6','r:2 84:4 r:6 89:4','86:2 r:6 81:4 r:4','r:4 87:4 84:2 r:6'],
  h:[[45,57,61,64],[41,56,60,65],[38,57,62,65],[36,55,60,63]]
 },
 clockwork_ruins:{
  a:['57:6 60:2 64:3 62:1 r:4','60:3 57:1 54:4 r:2 50:2 54:4','55:2 59:2 64:4 60:2 59:2 r:4','63:3 66:1 59:4 54:2 51:2 r:4'],
  h:[[45,55,60,64],[38,54,60,62],[48,55,59,64],[47,54,59,63]]
 },
 banner_march:{
  a:['76:6 72:2 69:4 72:4','71:2 74:2 76:4 79:6 r:2','77:4 81:2 84:2 81:4 77:4','74:2 77:2 79:4 83:4 r:4'],
  h:[[45,57,60,64],[40,55,59,64],[41,57,60,65],[43,59,62,65]]
 },
 bramble_breakbeat:{
  a:['77:3 76:1 72:2 r:2 69:2 72:2 76:4','79:2 76:2 r:1 72:1 67:2 72:3 76:1 r:4','74:1 79:1 83:2 81:2 79:2 r:2 74:2 71:2 r:2','80:2 76:2 71:3 68:1 64:4 r:4'],
  h:[[41,57,60,65],[48,55,60,64],[43,55,59,62],[40,56,59,64]]
 }
};
// Eight four-bar sections: A, A', B, B', bridge, bridge build, A, final A'.
// These are instrument hand-offs of the same written melody, not transposed copies.
const leads={
 sunbeam_overture:[['vibraphone','flute','vibraphone','piano','clarinet','flute','vibraphone','flute'],.092,.95],
 lantern_waltz:[['flute','flute','clarinet','flute','piano','flute','flute','clarinet'],.095,.9],
 market_shuffle:[['clarinet','clarinet','piano','clarinet','guitar','piano','clarinet','clarinet'],.09,.76],
 coppertrail_hop:[['guitar','flute','guitar','piano','clarinet','flute','guitar','flute'],.1,.79],
 cloudmeadow_sway:[['flute','flute','clarinet','flute','piano','clarinet','flute','flute'],.09,.94],
 glass_cavern:[['vibraphone','vibraphone','piano','vibraphone','vibraphone','piano','vibraphone','vibraphone'],.075,.97],
 clockwork_ruins:[['clarinet','clarinet','piano','clarinet','guitar','clarinet','clarinet','piano'],.092,.82],
 banner_march:[['brass','brass','piano','brass','flute','brass','brass','brass'],.095,.85],
 bramble_breakbeat:[['brass','piano','brass','piano','guitar','brass','brass','piano'],.091,.74]
};
const placement={piano:-.28,epiano:-.24,strings:0,flute:-.12,clarinet:.2,brass:-.06,guitar:.3,bass:0,vibraphone:.22};

function compile(id){
 const meta=CHIP_TRACKS[id],p=phrases[id],bridge=bridges[id],meter=meta.stepsPerBar;
 const bars=[...p.a,...p.a.slice(0,3),p.end,...p.b,...p.b.slice(0,3),p.turn,
  ...bridge.a,...bridge.a.slice(0,3),p.turn,...p.a,...p.a.slice(0,2),p.turn,p.end];
 const frames=Array.from({length:meta.bars*meter},()=>({notes:[],drums:[]}));
 const add=(bar,step,note,steps,voice,volume,role,pan=placement[voice],send=.09)=>{
  if(!Number.isInteger(step)||step<0||step+steps>meter+.0001)throw new Error(`Note crosses bar: ${id}/${bar}`);
  frames[bar*meter+step].notes.push({note,steps,voice,volume,role,pan,send});
 };
 const drum=(bar,step,kind,volume)=>frames[bar*meter+step].drums.push({kind,volume});
 for(let bar=0;bar<meta.bars;bar++){
  const inBridge=bar>=16&&bar<24,reprise=bar>=24,lift=(bar>=12&&bar<16)||(bar>=20&&bar<24)||bar>=28;
  const section=Math.floor(bar/4),softBridge=inBridge&&!lift,energy=softBridge?.82:reprise?1.04:1;
  const h=bar===7||bar===31?harmony[id][0]:inBridge?(bar===23?harmony[id][3]:bridge.h[bar%4]):harmony[id][(bar>=8&&bar<16?4:0)+bar%4];
  const root=h[0],tones=h.slice(1),[voices,leadLevel,gate]=leads[id],voice=voices[section];
  let cursor=0;
  for(const token of bars[bar].split(' ')){
   const[pitch,length]=token.split(':'),duration=Number(length);
   if(pitch!=='r')add(bar,cursor,Number(pitch),duration*gate,voice,leadLevel*energy,'lead',-.08,id==='glass_cavern'?.3:.13);
   cursor+=duration;
  }
  if(cursor!==meter)throw new Error(`Invalid phrase: ${id}/${bar} has ${cursor} steps`);
  const bass=(step,pitch,length=2,level=.1)=>add(bar,step,pitch,length,'bass',level*energy,'bass',0,.025);
  const note=(step,pitch,length,kind,level=.035,role='arp',pan=placement[kind],send=.09)=>add(bar,step,pitch,length,kind,level*energy,role,pan,send);
  const chord=(step,length,kind,level=.025,notes=tones)=>notes.forEach((pitch,i)=>
   note(step,pitch,length,kind,level*(i===1?.92:1),'harmony',kind==='strings'?[-.58,.04,.58][i]:placement[kind]+(i-1)*.13,kind==='strings'?.24:.09));
  const counter=(step,pitch,length,kind,level=.04)=>note(step,pitch,length,kind,level,'counter',kind===voice?.28:placement[kind],id==='glass_cavern'?.34:.16);
  const hit=(step,kind,level)=>drum(bar,step,kind,level*(softBridge?.78:1));

  // String voicings give immediate harmonic depth. Battle strings bow in two
  // separated phrases; the cavern keeps longer, softer room around each bell.
  if(meta.theme==='combat'){
   chord(0,6.8,'strings',softBridge?.02:.024);chord(8,6.8,'strings',lift?.03:.024);
  }else chord(0,meter-.8,'strings',id==='glass_cavern'?.024:softBridge?.025:.02);

  switch(id){
   case 'sunbeam_overture':{
    bass(0,root,6,.095);bass(8,root+7,4.8,.086);
    chord(0,3.4,'piano',.027);chord(8,3.2,'piano',.024);
    [2,6,10,14].forEach((s,i)=>note(s,h[1+(i+bar)%3]+12,1.5,'guitar',.034));
    const answer=voice==='flute'?'clarinet':'flute';
    if(bar%2===0){counter(4,h[2]+12,3,answer,.04);counter(12,h[1]+12,3,answer,.038);}
    else{counter(2,h[3]+12,2,answer,.035);counter(7,h[2]+12,2,answer,.04);counter(12,h[1]+12,3,answer,.036);}
    hit(0,'kick',.031);hit(8,'snare',.019);
    [2,6,10,14].forEach(s=>hit(s,'shaker',.012));
    if(lift){hit(4,'ride',.014);hit(12,'ride',.014);}break;
   }
   case 'lantern_waltz':{
    bass(0,root,3.3,.1);if(lift||bar%2)bass(8,root+7,2.6,.073);
    chord(0,2.1,'piano',.022);chord(4,2.2,'piano',.034);chord(8,2.2,'piano',.028);
    [1,5,9].forEach((s,i)=>note(s,h[1+(i+bar)%3]+12,1.6,'guitar',.029));
    const answer=voice==='clarinet'?'flute':'clarinet';
    counter(2,h[1]+12,1.5,answer,.039);counter(6,h[2]+12,1.5,answer,.043);counter(10,h[3],1.5,answer,.038);
    if(lift)note(0,h[3]+12,2.4,'vibraphone',.034);
    hit(0,'kick',.034);hit(4,'shaker',.017);hit(8,'shaker',.015);
    if(bar%2)hit(8,'snare',.014);break;
   }
   case 'market_shuffle':{
    const walk=[root,root+(h[2]-root+12)%12,root+7,root+(bar%2?10:9)];
    walk.forEach((pitch,i)=>bass(i*4,pitch,3.05,.1));
    chord(0,1.3,'piano',.024);[2,7,10,14].forEach(s=>chord(s,.78,'piano',s===7?.028:.023));
    [1,5,9,13].forEach((s,i)=>note(s,h[1+(i+bar)%3]+12,1.4,'guitar',.039));
    const answer=voice==='clarinet'?'flute':'clarinet';
    counter(3,h[3]+12,2,answer,.035);counter(11,h[2]+12,2,answer,.04);
    if(lift)counter(14,h[1]+12,1.5,answer,.038);
    hit(0,'kick',.038);hit(8,'kick',.029);hit(4,'snare',.023);hit(12,'snare',.027);
    [2,6,10,14].forEach(s=>hit(s,'shaker',.018));
    if(!softBridge){hit(0,'ride',.016);hit(7,'ride',.011);hit(8,'ride',.014);}break;
   }
   case 'coppertrail_hop':{
    bass(0,root,1.8,.105);bass(5,root+7,1.8);bass(8,root+12,2.2,.103);bass(14,root+7,1.6,.09);
    chord(0,1.8,'piano',.027);[3,7,11].forEach(s=>chord(s,1.4,'piano',.026));
    [1,5,9,13].forEach((s,i)=>note(s,h[1+(i+bar)%3]+12,1.5,'vibraphone',.034));
    const answer=voice==='flute'?'clarinet':'flute';
    counter(2,h[3]+12,2,answer,.042);counter(6,h[2]+12,1.5,answer,.04);counter(12,h[1]+12,3,answer,.046);
    if(voice!=='guitar')note(10,h[3],1.3,'guitar',.038);
    hit(0,'kick',.046);hit(7,'kick',.036);hit(4,'snare',.024);hit(12,'snare',.034);
    [2,6,10,14].forEach(s=>hit(s,'hat',.017));
    if(lift){hit(0,'ride',.019);hit(8,'ride',.015);}break;
   }
   case 'cloudmeadow_sway':{
    bass(0,root,5.2,.09);bass(6,root+7,4.7,.084);
    chord(0,3.6,'epiano',.025);chord(6,3.6,'epiano',.022);
    [0,3,6,9].forEach((s,i)=>note(s,h[1+(i+bar)%3],2.2,'guitar',.041));
    note(2,h[2]+12,2.1,'vibraphone',.031);note(8,h[3]+12,2.1,'vibraphone',.03);
    const answer=voice==='clarinet'?'flute':'clarinet';
    counter(4,h[3],1.6,answer,.037);counter(10,h[2]+12,1.5,answer,.038);
    hit(0,'kick',.027);hit(6,'tom',.023);hit(3,'shaker',.014);hit(9,'shaker',.013);
    if(lift)hit(6,'ride',.013);break;
   }
   case 'glass_cavern':{
    bass(0,root,11,.081);if(bar%2)bass(12,root+7,3,.065);
    [0,4,9,13].forEach((s,i)=>note(s,h[1+(i+bar)%3]+(i%2?0:12),2.5,'piano',i===0?.035:.028));
    // The answer enters between the widely spaced bell attacks, so the melody
    // can remain quiet and mysterious without leaving an empty accompaniment.
    counter(2,h[1]+12,3.5,'clarinet',.036);counter(10,h[3],3.5,'clarinet',.033);
    if(lift)note(6,h[2]+12,2.5,'guitar',.03,'arp',.37,.27);
    hit(0,'kick',.022);hit(6,'shaker',.011);hit(12,'tom',.022);
    if(bar%2)hit(14,'ride',.01);break;
   }
   case 'clockwork_ruins':{
    bass(0,root,3.2,.09);bass(6,root+12,2,.075);bass(10,root+7,3.1,.082);
    chord(0,2.1,'piano',.026);chord(8,2.1,'piano',.024);
    [1,5,9,13].forEach((s,i)=>note(s,h[1+(i+bar)%3]+12,.9,'vibraphone',.039));
    counter(4,h[3]+12,2.7,'flute',.034);counter(12,h[2]+12,2.7,'flute',.036);
    if(lift)note(15,h[1]+12,.65,'guitar',.04);
    hit(0,'kick',.029);[3,7,11,15].forEach((s,i)=>hit(s,'hat',i%2?.011:.014));
    hit(8,'snare',.016);hit(12,'tom',bar%2?.029:.019);break;
   }
   case 'banner_march':{
    [0,4,8,12].forEach((s,i)=>bass(s,root+(i%2?7:0),3.2,.107));
    chord(0,1.4,'piano',.031);chord(6,1.2,'piano',.028);chord(8,1.4,'piano',.032);chord(14,1.2,'piano',.028);
    [2,6,10,14].forEach((s,i)=>note(s,h[1+i%3]+12,1.25,'guitar',.039));
    const answer=voice==='flute'?'clarinet':'flute';
    counter(3,h[3]+12,2.5,answer,.044);counter(11,h[2]+12,2.5,answer,.044);
    if(lift)note(0,h[1]+24,1.8,'vibraphone',.037);
    hit(0,'kick',.059);hit(8,'kick',.053);hit(4,'snare',.044);hit(12,'snare',.049);
    [2,6,10,14].forEach(s=>hit(s,lift?'ride':'hat',.02));
    if(!softBridge)hit(10,'kick',.026);break;
   }
   case 'bramble_breakbeat':{
    bass(0,root,1.5,.108);bass(3,root+12,1.6,.1);bass(7,root+7,1.6,.105);bass(10,root,1.6,.108);bass(14,root+12,1.5,.098);
    chord(0,.9,'piano',.025);[2,6,11,15].forEach(s=>chord(s,.7,'piano',.03));
    [1,5,9,13].forEach((s,i)=>note(s,h[1+(i+bar)%3]+12,.85,'guitar',.044));
    const answer=voice==='brass'?'clarinet':'brass';
    counter(4,h[3]+12,1.8,answer,.044);counter(8,h[2]+12,1.4,answer,.044);counter(12,h[1]+12,1.7,answer,.04);
    if(lift)note(0,h[3]+12,1.3,'vibraphone',.034);
    [0,6,10].forEach(s=>hit(s,'kick',.059));hit(4,'snare',.045);hit(12,'snare',.051);
    [1,3,7,9,11,15].forEach(s=>hit(s,'hat',.019));
    if(bar%2)hit(14,'shaker',.016);break;
   }
  }

  // Phrase-level punctuation changes with the song and with the section. The
  // final cadence settles instead of running a drum fill directly into the loop.
  if(bar%8===0&&bar>0&&!softBridge)hit(0,'crash',meta.theme==='combat'?.035:.02);
  if(bar%4===3&&bar!==7&&bar!==31){
   if(id==='lantern_waltz'){hit(10,'shaker',.018);hit(11,'snare',.016);}
   else if(id==='cloudmeadow_sway'){hit(9,'tom',.021);hit(11,'shaker',.016);}
   else if(id==='glass_cavern'){hit(15,'shaker',.012);}
   else if(id==='clockwork_ruins'){hit(14,'tom',.025);hit(15,'hat',.014);}
   else if(id==='market_shuffle'){hit(13,'snare',.016);hit(15,'snare',.022);}
   else if(meta.theme==='combat'){
    hit(13,'snare',.024);hit(14,'tom',.035);hit(15,'snare',.031);
   }else{hit(14,'tom',.026);hit(15,'shaker',.017);}
  }
 }
 return Object.freeze(frames.map(frame=>Object.freeze({notes:Object.freeze(frame.notes.map(Object.freeze)),drums:Object.freeze(frame.drums.map(Object.freeze))})));
}
const scores=Object.freeze(Object.fromEntries(Object.keys(CHIP_TRACKS).map(id=>[id,compile(id)])));
export function scoreStep(trackIdOrTheme,step){
 const id=Object.hasOwn(scores,trackIdOrTheme)?trackIdOrTheme:Object.hasOwn(THEME_PLAYLISTS,trackIdOrTheme)?THEME_PLAYLISTS[trackIdOrTheme][0]:THEME_PLAYLISTS.overworld[0];
 const frames=scores[id],position=Number.isFinite(step)?Math.trunc(step):0;
 return frames[((position%frames.length)+frames.length)%frames.length];
}
