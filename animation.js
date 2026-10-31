// Independent visual motion: collision roots and attack positions stay grounded.
export const CREATURE_MOTION = {
  hero: { rate: 3.15, lift: .30 }, fox: { rate: 3.6, lift: .27 },
  slime: { rate: 2.2, lift: .39 }, mushroom: { rate: 2.7, lift: .24 },
  wolf: { rate: 3.4, lift: .30 }, golem: { rate: 1.25, lift: .18 },
  boss: { rate: 1.05, lift: .17 }, elder: { rate: 2.0, lift: .18 },
  smith: { rate: 2.5, lift: .22 }, inn: { rate: 2.7, lift: .24 },
  cook: { rate: 3.0, lift: .27 }
};

export function advanceBounce(state, dt, { moving=false, pace=1, windup=0, hurt=0 }={}) {
  const profile=CREATURE_MOTION[state.kind]||CREATURE_MOTION.slime;
  const heavy=state.kind==='boss'||state.kind==='golem';
  dt=Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0));
  state.time=(state.time||0)+dt;
  let phase=state.phase||0, landed=false;
  if(windup>0){
    // Hold the anticipation pose while the ground warning is visible.
    state.phase=0;state.wasWinding=true;
    return {hop:0,sx:heavy?1.095:1.06,sy:heavy?.89:.93,roll:Math.sin(state.time*(heavy?12:28))*(heavy?.006:.018),pose:2,landed:false};
  }
  if(state.wasWinding){phase=heavy?.22:.14;state.wasWinding=false;state.rebound=true;}
  if(moving||phase>0){
    const next=phase+dt*profile.rate*Math.max(.45,Math.min(1.4,pace));
    if(next>=1){landed=true;phase=moving?next%1:0;state.rebound=false;}else phase=next;
  }
  state.phase=phase;
  let hop=0,sx=1,sy=1,pose=0;
  if(heavy){
    // Heavy creatures push off slowly, make a brief low hop, then spend a third
    // of the stride absorbing their weight. The collision root never moves up.
    if(phase>0&&phase<.22){const coil=Math.sin(phase/.22*Math.PI)*.045;sx+=coil;sy-=coil;pose=2;}
    else if(phase>=.22&&phase<.66){
      const flight=(phase-.22)/.44;hop=4*flight*(1-flight)*profile.lift*(state.rebound?1.2:1);
      const stretch=Math.sin(flight*Math.PI)*.018;sx-=stretch*.4;sy+=stretch;pose=1;
    }else if(phase>=.66){
      const settle=(phase-.66)/.34;
      const squash=Math.sin(settle*Math.PI)*.085+Math.sin(settle*Math.PI*2)*.018;
      sx+=squash;sy-=squash;pose=2;
    }else{const breath=Math.sin(state.time*1.65)*.005;sx-=breath*.5;sy+=breath;}
    // Keep large enemies planted under repeated hits instead of wobbling like
    // the small slimes. Hit flashes still provide the immediate damage cue.
    if(hurt>0){sx+=.018;sy-=.016;}
    return {hop,sx,sy,pose,landed,roll:hurt>0?Math.sin(state.time*22)*.009:Math.sin(phase*Math.PI*2)*.009};
  }
  if(phase>0&&phase<.14){const squash=Math.sin(phase/.14*Math.PI)*.055;sx+=squash;sy-=squash;pose=2;}
  else if(phase>=.14&&phase<.86){
    const flight=(phase-.14)/.72;
    hop=4*flight*(1-flight)*profile.lift*(state.rebound?1.2:1);
    const stretch=Math.sin(flight*Math.PI)*.045;sx-=stretch*.45;sy+=stretch;pose=1;
  }else if(phase>=.86){const squash=Math.sin((phase-.86)/.14*Math.PI)*.07;sx+=squash;sy-=squash;pose=2;}
  else{const breath=Math.sin(state.time*2.5)*.012;sx-=breath*.5;sy+=breath;}
  if(hurt>0){sx+=.07;sy-=.06;}
  return {hop,sx,sy,pose,landed,roll:hurt>0?Math.sin(state.time*46)*.06:Math.sin(phase*Math.PI*2)*.025};
}
