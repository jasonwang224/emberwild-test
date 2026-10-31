/* Small, authored worksite stories. These pockets leave camp fights and gates open. */
export function dressCamps(api,camps){
  const {root,M,box,cylinder,ball,beam,torus,obstacle}=api;
  const meshes=[],footprints=[];
  let seed=638107;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
  let camp;
  const ground=(x,z)=>api.campGroundHeight?.(x,z,camp.id)??.08;
  const position=(dx,dz)=>[camp.x+dx,camp.z+dz];
  function keep(mesh,low=true){
    mesh.metadata={...mesh.metadata,campDressing:camp.id,castsShadow:!low};
    meshes.push(mesh);return mesh;
  }
  function stone(dx,dz,s=.24,height=.11,material=M.campSlate){
    const [x,z]=position(dx,dz);
    const m=keep(ball('camp-dressing-stone',x,ground(x,z)+height*.47,z,s,material,root,true,[1,height*.5/s,.72+random()*.38]),height<.18);
    m.rotation.y=random()*Math.PI;return m;
  }
  function plank(dx,dz,length,angle,broken=false){
    const [x,z]=position(dx,dz),y=ground(x,z);
    const m=keep(box('camp-dressing-'+(broken?'split-plank':'wood-offcut'),x,y+.035,z,length,.065,.15+random()*.07,M.campTimber));
    m.rotation.y=angle;
    if(broken){
      const splinter=keep(box('camp-dressing-splinter',x+Math.cos(angle)*length*.43,y+.027,z-Math.sin(angle)*length*.43,length*.34,.035,.055,M.campTimberDark));
      splinter.rotation.y=angle+.17;
    }
    return m;
  }
  function pile(dx,dz,material,accent){
    const [x,z]=position(dx,dz);
    for(let j=0;j<4;j++){
      const a=j*2.4;
      stone(dx+Math.sin(a)*.21,dz+Math.cos(a)*.22,.27+j*.025,.19+(j%2)*.09,material);
    }
    for(let j=0;j<3;j++)stone(dx-.20+j*.20,dz+.07,.075,.085,accent);
    obstacle(x,z,.53);footprints.push({x,z,r:.53,campId:camp.id});
  }
  function sack(dx,dz,angle){
    const [x,z]=position(dx,dz),y=ground(x,z);
    const body=keep(ball('camp-dressing-supply-sack',x,y+.26,z,.36,M.campCanvasCream,root,true,[.95,.75,.82]),false);body.rotation.y=angle;
    keep(ball('camp-dressing-sack-neck',x,y+.52,z,.11,M.campCanvasCream,root,true,[1,.65,1]),false);
    keep(torus('camp-dressing-sack-tie',x,y+.48,z,.095,.035,M.campRope),false);
    obstacle(x,z,.40);footprints.push({x,z,r:.40,campId:camp.id});
  }
  function coil(dx,dz){
    const [x,z]=position(dx,dz),y=ground(x,z);
    for(let j=0;j<4;j++)keep(torus('camp-dressing-rope-coil',x+.015*j,y+.025+j*.012,z,.15+j*.055,.026,M.campRope));
  }
  function stump(dx,dz){
    const [x,z]=position(dx,dz),y=ground(x,z);
    keep(cylinder('camp-dressing-cut-stump',x,y+.16,z,.31,.31,M.campTimberDark,7),false);
    keep(cylinder('camp-dressing-endgrain',x,y+.32,z,.295,.025,M.campLogEnds,7),false);
    keep(box('camp-dressing-stump-split',x+.05,y+.338,z,.03,.012,.37,M.campTimberDark),false).rotation.y=.8;
    obstacle(x,z,.34);footprints.push({x,z,r:.34,campId:camp.id});
  }
  for(camp of camps){
    seed=camp.id==='cinderwatch'?638107:camp.id==='thornhide'?938821:360241;
    if(camp.id==='cinderwatch'){
      // Spoil beside the cutting face and supplies, rather than across the approach.
      for(const [dx,dz] of [[-2,-7.2],[1.3,-7.6],[7,-1.5],[6.5,6.3],[1.8,8.1]]){
        for(let j=0;j<3;j++)stone(dx+(random()-.5)*1.1,dz+(random()-.5)*.9,.15+random()*.14,.08+random()*.06,j%2?M.campSlateLight:M.campSlate);
      }
      for(const [dx,dz,a] of [[-5.9,-7.1,.2],[6.8,5.6,1.6],[-2.5,7.5,-.3]]){
        plank(dx,dz,.80,a,true);plank(dx+.25,dz+.24,.56,a+.45,true);
      }
      pile(7.4,1.0,M.campSlate,M.gold);pile(3.2,-7.4,M.campSlateLight,M.campIron);
      // Abandoned pick and a broken wheel lean into the quarry worksite story.
      {
        const [x,z]=position(-5.8,-1.3),y=ground(x,z);
        keep(beam('camp-dressing-pick-handle',[x-.40,y+.075,z-.18],[x+.37,y+.075,z+.22],.055,M.campTimber));
        keep(beam('camp-dressing-pick-head',[x+.18,y+.10,z+.50],[x+.52,y+.10,z-.07],.09,M.campIron));
        keep(beam('camp-dressing-pick-point',[x+.52,y+.10,z-.07],[x+.48,y+.07,z-.22],.045,M.campIron));
      }
      {
        const [x,z]=position(-6.2,-7.4),y=ground(x,z),r=.43;
        keep(torus('camp-dressing-broken-wheel-rim',x,y+.075,z,r,.065,M.campIron));
        for(let j=0;j<4;j++){
          const a=j*Math.PI*.5+.2;
          keep(beam('camp-dressing-wheel-spoke',[x,y+.07,z],[x+Math.sin(a)*r*.82,y+.07,z+Math.cos(a)*r*.82],.06,M.campTimber));
        }
        keep(cylinder('camp-dressing-wheel-hub',x,y+.08,z,.10,.12,M.campTimberDark,6));
      }
    }else if(camp.id==='thornhide'){
      for(const [dx,dz,a] of [[-1.7,-6.9,.6],[.8,-6.5,-.3],[-4.8,3.7,1.5],[-2.5,6.3,.2],[4,-3.0,-.8]]){
        plank(dx,dz,.68+random()*.35,a,true);plank(dx+.30,dz-.18,.47,a+.3);
      }
      for(const [dx,dz] of [[-5.4,-2.8],[-4,6],[2.9,-6.7]]){
        sack(dx,dz,.3);sack(dx+.52,dz+.18,-.5);
      }
      coil(-5.5,2.3);coil(3.3,6.9);
      stump(2.8,7.5);stump(6.5,-3.2);
      for(let j=0;j<5;j++){
        const dx=-4.8+j*.27,dz=-6.8+(j%2)*.23;
        plank(dx,dz,.27+random()*.13,random()*2,true);
      }
    }else if(camp.id==='moonshard'){
      for(const [dx,dz] of [[-5.4,-5.8],[-1.2,-7.1],[5.9,-6.5],[7.1,-.2],[7.6,6.5]]){
        for(let j=0;j<3;j++)stone(dx+(random()-.5)*1.2,dz+(random()-.5)*.9,.20+random()*.17,.09+random()*.07,j%2?M.campRuins:M.campSlateLight);
      }
      for(const [dx,dz] of [[-6.7,.8],[6.9,-5.8],[-6.9,6.7]]){
        const [x,z]=position(dx,dz),y=ground(x,z);
        const piece=keep(cylinder('camp-dressing-fallen-column',x,y+.25,z,.26,.88,M.campRuins,7),false);
        piece.rotation.z=Math.PI/2;piece.rotation.y=.3;
        for(const side of [-1,1]){
          const end=keep(cylinder('camp-dressing-column-break',x+side*.42*Math.cos(.3),y+.25,z-side*.42*Math.sin(.3),.27,.07,M.campSlateLight,7),false);
          end.rotation.z=Math.PI/2;end.rotation.y=.3;
        }
        obstacle(x,z,.58);footprints.push({x,z,r:.58,campId:camp.id});
      }
      // Small opaque facets read as fallen masonry and spent crystal, not new loot.
      for(const [dx,dz] of [[-5,-6.8],[-1.8,8.9],[7.7,2.0]]){
        for(let j=0;j<5;j++){
          const a=j*2.4,r=.17+j*.07;
          stone(dx+Math.sin(a)*r,dz+Math.cos(a)*r,.085+random()*.08,.09+random()*.06,j%3?M.campSlate:M.campRuins);
        }
      }
      for(let j=0;j<8;j++){
        const a=j*.72,dx=-7.5+Math.sin(a)*.6,dz=-4.5+j*.49;
        stone(dx,dz,.10+random()*.07,.055,M.campSlateLight);
      }
    }
  }
  return {meshes,footprints};
}
