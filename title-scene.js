import {findClearPosition} from './world-navigation.js?v=efee0e5a';

// Title-only visitors and atmosphere. They never enter the game's enemy,
// interaction or save collections; disposing the title removes every extra.
export function createTitleScene(B,scene,{sprites=null,world}={}){
  const root=new B.TransformNode('title-town-life',scene),materials=[],actors=[],droplets=[],rings=[],motes=[],butterflies=[];
  let time=0,disposed=false;
  const bounds=world?.bounds||{minX:-12,maxX:12,minZ:-12,maxZ:12};
  const obstacles=(world?.obstacles||[]).filter(o=>Math.abs(o.x)<20&&Math.abs(o.z)<20);
  function material(name,color,alpha=1){
    const m=new B.StandardMaterial('title-'+name,scene);m.disableLighting=true;m.emissiveColor=B.Color3.FromHexString(color);
    m.diffuseColor=B.Color3.Black();m.specularColor=B.Color3.Black();m.alpha=alpha;m.backFaceCulling=false;
    m.metadata={emberwildCel:false};materials.push(m);return m;
  }
  const footInk=material('foot-shadows','#292431',.54),waterInk=material('water-glints','#c4eee4',.72);
  const goldInk=material('warm-glints','#fff0ad',.72),wingInk=material('butterfly-wings','#f5c886');
  function finish(mesh,mat,parent=root){mesh.parent=parent;mesh.material=mat;mesh.isPickable=false;return mesh;}
  function clear(x,z){return x>bounds.minX+.5&&x<bounds.maxX-.5&&z>bounds.minZ+.5&&z<bounds.maxZ-.5&&obstacles.every(o=>Math.hypot(x-o.x,z-o.z)>o.r+.46);}
  function segmentClear(a,b){
    const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
    return clear(b.x,b.z)&&obstacles.every(o=>{
      const p=length?Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.z-a.z)*dz)/length)):0;
      return Math.hypot(a.x+dx*p-o.x,a.z+dz*p-o.z)>o.r+.45;
    });
  }
  const cast=[
    ['knight',-4.4,-6.2,2.4,true],['mage',3.2,-6.8,2.4,true],['ranger',5.8,-3.5,2.3,true],
    ['slime',-6.8,-1.8,1.75,false],['mushroom',4.9,1.4,1.95,false],['fox',-3.8,1.3,1.7,false]
  ];
  if(sprites)for(const [i,[kind,x,z,height,isHero]] of cast.entries()){
    const node=new B.TransformNode('title-visitor-'+kind,scene);node.parent=root;
    const start=findClearPosition({x,z},obstacles,bounds,.48,{x:0,z:-5});node.position.set(start.x,0,start.z);
    const sprite=isHero?sprites.createHero(kind,node,height):sprites.createCreature(kind,node,height);
    // Friendly title visitors must not show the player's cyan wall silhouette.
    if(sprite.metadata?.ghost)sprite.metadata.ghost.dispose();
    if(sprite.metadata)delete sprite.metadata.ghost;
    const halo=finish(B.MeshBuilder.CreateDisc('title-visitor-shadow',{radius:isHero?.57:.43,tessellation:16},scene),footInk,node);
    halo.rotation.x=Math.PI/2;halo.position.y=.075;
    const route=[start],offsets=[[1.2,.65],[-.45,1.15],[-1.1,-.5],[.7,-1.05]];
    for(let n=0;n<offsets.length;n++){
      const offset=offsets[(n+i)%offsets.length],point={x:start.x+offset[0],z:start.z+offset[1]};
      if(segmentClear(route[route.length-1],point)&&segmentClear(point,start))route.push(point);
    }
    // Every leg is reversible, avoiding an unchecked last-to-first shortcut.
    route.push(...route.slice(1,-1).reverse());
    actors.push({node,sprite,halo,isHero,height,route,next:1%route.length,wait:i*.32,speed:.57+i%3*.12,facing:new B.Vector3(0,0,-1)});
  }
  // Existing water and stone stay untouched; only tiny moving highlights are added.
  if(obstacles.some(o=>Math.hypot(o.x,o.z-5.8)<.1&&o.r>=1.8)){
    for(let i=0;i<12;i++)droplets.push(finish(B.MeshBuilder.CreateSphere('title-fountain-drop',{diameter:.085,segments:4},scene),waterInk));
    for(let i=0;i<3;i++){
      const ring=finish(B.MeshBuilder.CreateTorus('title-fountain-ripple',{diameter:1,thickness:.025,tessellation:32},scene),waterInk);
      ring.position.set(0,.782+i*.002,5.8);rings.push(ring);
    }
  }
  for(let i=0;i<7;i++){
    const mote=finish(B.MeshBuilder.CreatePlane('title-sunlit-mote',{width:.045,height:.07},scene),goldInk);
    mote.billboardMode=B.Mesh.BILLBOARDMODE_ALL;motes.push(mote);
  }
  for(let i=0;i<2;i++){
    const butterfly=new B.TransformNode('title-butterfly',scene);butterfly.parent=root;
    const wings=[];
    for(const side of [-1,1]){
      const wing=finish(B.MeshBuilder.CreatePlane('title-butterfly-wing',{width:.13,height:.19,sideOrientation:B.Mesh.DOUBLESIDE},scene),wingInk,butterfly);
      wing.position.x=side*.065;wing.rotation.x=Math.PI/2;wing.rotation.z=side*.35;wings.push({wing,side});
    }
    butterflies.push({node:butterfly,wings});
  }
  function update(dt,cameraAlpha){
    if(disposed)return;
    dt=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;time+=dt;
    for(const [i,actor] of actors.entries()){
      let moving=false;
      if(actor.wait>0)actor.wait=Math.max(0,actor.wait-dt);
      else if(actor.route.length>1){
        const target=actor.route[actor.next],dx=target.x-actor.node.position.x,dz=target.z-actor.node.position.z,d=Math.hypot(dx,dz);
        if(d<.015){actor.next=(actor.next+1)%actor.route.length;actor.wait=1.6+i*.19;}
        else{const step=Math.min(d,dt*actor.speed);actor.node.position.x+=dx/d*step;actor.node.position.z+=dz/d*step;actor.facing.set(dx/d,0,dz/d);moving=step>0;}
      }
      const motion=sprites.animate(actor.sprite,dt,{moving,pace:.7});
      if(motion){
        if(actor.isHero){actor.sprite.position.y=actor.height*.45+motion.hop;actor.sprite.scaling.set(motion.sx,motion.sy,1);actor.sprite.rotation.z=motion.roll;}
        actor.halo.scaling.setAll(Math.max(.65,1-motion.hop*.6));actor.halo.visibility=1-motion.hop*.65;
      }
      sprites.face(actor.sprite,actor.facing,Number.isFinite(cameraAlpha)?cameraAlpha:-Math.PI/2);
    }
    for(let i=0;i<droplets.length;i++){
      const p=(time*.7+i/12)%1,a=Math.floor(i/3)*Math.PI/2,r=.2+p*.78,drop=droplets[i];
      drop.position.set(Math.sin(a)*r,1.78+Math.sin(p*Math.PI)*.25-p,5.8+Math.cos(a)*r);
      drop.scaling.set(.75,1.5+.7*p,.75);drop.visibility=Math.sin(p*Math.PI)*.8;
    }
    for(let i=0;i<rings.length;i++){const p=(time*.45+i/3)%1;const scale=.6+p*1.8;rings[i].scaling.set(scale,1,scale);rings[i].visibility=Math.sin(p*Math.PI)*.25;}
    for(let i=0;i<motes.length;i++){
      const a=time*(.11+i*.012)+i*2.4,mote=motes[i];
      mote.position.set(Math.sin(a)*6.5,1.1+(i%3)*.5+Math.sin(time*.6+i)*.3,-1+Math.cos(a)*3.4);
      mote.visibility=Math.pow(Math.max(0,Math.sin(time*.8+i*1.7)),3)*.65;
    }
    for(let i=0;i<butterflies.length;i++){
      const butterfly=butterflies[i],a=time*.38+i*3.1;
      butterfly.node.position.set((i?6.5:-6.5)+Math.cos(a)*.8,1.2+Math.sin(a*1.7)*.3,-4+i*5+Math.sin(a)*.7);
      butterfly.node.rotation.y=-a;
      for(const {wing,side} of butterfly.wings)wing.rotation.y=side*Math.sin(time*16+i)*.9;
    }
  }
  function dispose(){if(disposed)return;disposed=true;root.dispose(false);for(const mat of materials)mat.dispose(false,false);actors.length=droplets.length=rings.length=motes.length=butterflies.length=0;}
  update(0,-Math.PI/2);
  return {update,dispose};
}
