// Original, locally synthesized PCM instruments. No recordings or third-party samples.
// Buffers are created only when a score first asks for that instrument, then reused.
const SAMPLE_RATE=22050;
const TAU=Math.PI*2;
const ALIASES=Object.freeze({reed:'clarinet',pluck:'guitar',bell:'vibraphone',triangle:'bass',pulse:'brass','e-piano':'epiano'});
export const INSTRUMENT_NAMES=Object.freeze(['piano','epiano','strings','flute','clarinet','brass','guitar','bass','vibraphone']);

const DEFINITIONS={
 piano:{rootFrequency:220,seconds:3.4,attack:.004,decay:.20,sustain:.78,release:.24,gain:.95,pan:-.19,send:.13},
 epiano:{rootFrequency:220,seconds:3.2,attack:.005,decay:.28,sustain:.76,release:.30,gain:.93,pan:-.10,send:.16},
 strings:{rootFrequency:220,seconds:2,loop:true,attack:.085,decay:.18,sustain:.86,release:.31,gain:.85,pan:.23,send:.21},
 flute:{rootFrequency:220,seconds:2,loop:true,attack:.027,decay:.12,sustain:.90,release:.13,gain:.72,pan:-.12,send:.18},
 clarinet:{rootFrequency:220,seconds:2,loop:true,attack:.022,decay:.14,sustain:.85,release:.11,gain:.73,pan:.13,send:.13},
 brass:{rootFrequency:220,seconds:2,loop:true,attack:.034,decay:.16,sustain:.73,release:.15,gain:.80,pan:.09,send:.12},
 guitar:{rootFrequency:220,seconds:2.8,attack:.003,decay:.19,sustain:.76,release:.15,gain:.96,pan:-.27,send:.10},
 bass:{rootFrequency:110,seconds:2,loop:true,attack:.006,decay:.20,sustain:.57,release:.12,gain:.82,pan:0,send:.025},
 vibraphone:{rootFrequency:440,seconds:3.4,attack:.003,decay:.22,sustain:.87,release:.34,gain:.92,pan:.29,send:.22},
};

// Integer-Hz partials and modulation complete whole cycles in the two-second
// sustained buffers. Their endpoints therefore meet with no crossfade pitch dip.
function sustained(name,t,root){
 const phase=TAU*root*t;
 if(name==='strings'){
  let value=0;
  for(let layer=-1;layer<=1;layer++){
   const bow=TAU*(root+layer)*t+.21*layer+.045*Math.sin(TAU*(5+layer*.5)*t+layer);
   for(let h=1;h<=11;h++)value+=Math.sin(bow*h+.16*h*h)/(Math.pow(h,1.18)*(1+h*h*.014));
  }
  return value*(.95+.05*Math.sin(TAU*1.5*t));
 }
 if(name==='flute'){
  const p=phase+.052*Math.sin(TAU*5*t);
  let value=Math.sin(p)+.155*Math.sin(2*p+.2)+.065*Math.sin(3*p)+.019*Math.sin(4*p);
  // A quiet periodic breath band gives air, without a noisy looping splice.
  for(let k=0;k<9;k++)value+=.0035*Math.sin(TAU*(1327+k*263)*t+k*k*.79);
  return value*(.975+.025*Math.sin(TAU*4.5*t));
 }
 if(name==='clarinet'){
  const p=phase+.033*Math.sin(TAU*4.5*t);
  return (Math.sin(p)+.40*Math.sin(3*p+.1)+.17*Math.sin(5*p+.25)+.075*Math.sin(7*p+.4)+.026*Math.sin(9*p)+.035*Math.sin(2*p))*(.98+.02*Math.sin(TAU*3*t));
 }
 if(name==='brass'){
  const p=phase+.035*Math.sin(TAU*5.5*t);
  const weights=[1,.64,.46,.39,.28,.16,.09,.052,.03,.016];
  let value=0;
  for(let h=1;h<=weights.length;h++)value+=weights[h-1]*Math.sin(h*p+.1*h);
  return value*(.98+.02*Math.sin(TAU*2*t));
 }
 // Rounded, fingered bass with enough upper harmonics for small speakers.
 return Math.sin(phase)+.31*Math.sin(2*phase+.15)+.115*Math.sin(3*phase+.2)+.043*Math.sin(4*phase)+.018*Math.sin(5*phase);
}

function transient(name,t,root,noise){
 const phase=TAU*root*t;
 if(name==='piano'){
  let value=0;
  for(let h=1;h<=12;h++){
   // String stiffness, unison beating, and faster high-partial decay create a
   // hammer strike which mellows into a warm soundboard, rather than an organ.
   const frequency=root*h*Math.sqrt((1+.00009*h*h)/1.00009);
   const amplitude=Math.exp(-h*.075)/Math.pow(h,1.24)*Math.exp(-t*(.58+h*.27));
   value+=amplitude*(Math.sin(TAU*frequency*t+.12*h)+.31*Math.sin(TAU*(frequency+.43)*t+.17*h));
  }
  return value+.034*noise*Math.exp(-t*150);
 }
 if(name==='epiano'){
  const tine=.72*Math.exp(-t*5.8)*Math.sin(2*phase)+.23*Math.exp(-t*8.5)*Math.sin(3*phase);
  return Math.sin(phase+tine)*Math.exp(-t*.83)+.12*Math.sin(2*phase+.2)*Math.exp(-t*2.7)+.075*Math.sin(7*phase)*Math.exp(-t*11);
 }
 if(name==='guitar'){
  let value=0;
  for(let h=1;h<=14;h++){
   const amplitude=Math.sin(h*Math.PI*.215)/Math.pow(h,1.12);
   value+=amplitude*Math.sin(h*phase+.07*h)*Math.exp(-t*(1.03+h*.39));
  }
  return value+.038*noise*Math.exp(-t*120)+.075*Math.sin(2*phase+.35)*Math.exp(-t*17);
 }
 // The inharmonic bar modes distinguish a vibraphone from a sine bell.
 const tremolo=.96+.04*Math.sin(TAU*6*t);
 return tremolo*(Math.sin(phase)*Math.exp(-t*.88)+.31*Math.sin(phase*2.76+.08)*Math.exp(-t*2.1)+.13*Math.sin(phase*5.40)*Math.exp(-t*4.8)+.035*Math.sin(phase*8.93)*Math.exp(-t*10));
}

function buildBuffer(context,name,definition){
 const length=Math.round(definition.seconds*SAMPLE_RATE);
 const buffer=context.createBuffer(1,length,SAMPLE_RATE);
 const data=buffer.getChannelData(0);
 let seed=0x681e2a45,total=0,weightTotal=0;
 for(let i=0;i<length;i++){
  const t=i/SAMPLE_RATE;
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const noise=seed/2147483648-1;
  const weight=definition.loop?1:Math.min(1,i/(SAMPLE_RATE*.002),(length-1-i)/(SAMPLE_RATE*.09));
  const value=(definition.loop?sustained(name,t,definition.rootFrequency):transient(name,t,definition.rootFrequency,noise))*weight;
  data[i]=value;total+=value;weightTotal+=weight;
 }
 // Remove DC without moving the silent endpoints of struck/plucked samples.
 const dc=total/weightTotal;
 let peak=0;
 for(let i=0;i<length;i++){
  const weight=definition.loop?1:Math.min(1,i/(SAMPLE_RATE*.002),(length-1-i)/(SAMPLE_RATE*.09));
  data[i]-=dc*weight;peak=Math.max(peak,Math.abs(data[i]));
 }
 const scale=.78/Math.max(peak,.000001);
 for(let i=0;i<length;i++)data[i]*=scale;
 return buffer;
}

export function createInstrumentBank(context){
 const cache=new Map();
 let disposed=false;
 return {
  get(voice){
   if(disposed)return null;
   const name=ALIASES[voice]||voice;
   if(!Object.hasOwn(DEFINITIONS,name))return null;
   if(!cache.has(name)){
    const definition=DEFINITIONS[name];
    const {seconds,...profile}=definition;
    cache.set(name,Object.freeze({
     ...profile,loop:!!definition.loop,buffer:buildBuffer(context,name,definition),
     ...(definition.loop?{loopStart:0,loopEnd:seconds}:{}),
    }));
   }
   return cache.get(name);
  },
  dispose(){disposed=true;cache.clear();},
 };
}
