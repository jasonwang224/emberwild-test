// Flat pixel glyphs stay readable from every camera angle without loading fonts
// or creating a canvas texture. The quest system owns each giver's state.
export function createQuestMarkers(B,scene,interactables){
  const types=new Set(['npc','smith','inn','cook']),markers=[];
  const material=new B.StandardMaterial('quest-marker-ink',scene);
  material.disableLighting=true;material.diffuseColor=B.Color3.Black();
  material.emissiveColor=B.Color3.White();material.specularColor=B.Color3.Black();
  material.backFaceCulling=false;material.fogEnabled=false;
  const palette={outline:'#47321e',yellow:'#ffda44',shade:'#edb52c',light:'#fff39b'};
  for(const key of Object.keys(palette))palette[key]=B.Color3.FromHexString(palette[key]);
  const patterns={
    available:['..###..','..###..','..###..','..###..','..###..','..###..','...#...','.......','..###..','..###..'],
    ready:['.#####.','#######','##...##','.....##','....###','...###.','..###..','..##...','.......','..##...','..##...']
  };
  const glowLayers=(scene.effectLayers||[]).filter(layer=>layer instanceof B.GlowLayer);
  function glyph(item,state){
    const rows=patterns[state],height=rows.length,width=rows[0].length,cell=1.5/(height+2);
    const solid=(x,y)=>rows[y]?.[x]==='#';
    const positions=[],normals=[],colors=[],indices=[];
    for(let y=-1;y<=height;y++)for(let x=-1;x<=width;x++){
      const inside=solid(x,y);
      if(!inside&&![-1,0,1].some(dy=>[-1,0,1].some(dx=>solid(x+dx,y+dy))))continue;
      const color=!inside?palette.outline:y===0?palette.light:y>=height-2?palette.shade:palette.yellow;
      const left=(x-width/2)*cell,top=(height/2-y)*cell,i=positions.length/3;
      positions.push(left,top,0,left+cell,top,0,left+cell,top-cell,0,left,top-cell,0);
      for(let k=0;k<4;k++){normals.push(0,0,-1);colors.push(color.r,color.g,color.b,1);}
      indices.push(i,i+1,i+2,i,i+2,i+3);
    }
    const mesh=new B.Mesh(`quest-${state}-${item.id}`,scene),data=new B.VertexData();
    data.positions=positions;data.normals=normals;data.colors=colors;data.indices=indices;data.applyToMesh(mesh);
    mesh.material=material;mesh.useVertexColors=true;mesh.hasVertexAlpha=false;
    mesh.parent=item.mesh;mesh.position.y=4.05;mesh.billboardMode=B.Mesh.BILLBOARDMODE_ALL;
    mesh.isPickable=false;mesh.checkCollisions=false;mesh.receiveShadows=false;mesh.applyFog=false;
    mesh.metadata={questMarker:true,giverId:item.id,questState:state,castsShadow:false};
    for(const layer of glowLayers)layer.addExcludedMesh(mesh);
    mesh.setEnabled(false);return mesh;
  }
  for(const item of interactables)if(types.has(item.type)&&item.mesh){
    markers.push({item,available:glyph(item,'available'),ready:glyph(item,'ready'),state:null,phase:markers.length*1.37});
  }
  let elapsed=0,disposed=false;
  return {
    markers,
    update(dt,getState,visible=true,paused=false){
      if(disposed)return;
      if(!paused&&visible&&Number.isFinite(dt)&&dt>0)elapsed+=Math.min(dt,.1);
      // Keep the glyph prominent at the widest normal zoom without letting it
      // grow to dominate the town when the camera is close to an NPC.
      const radius=scene.activeCamera?.radius;
      const scale=Number.isFinite(radius)?Math.max(.86,Math.min(1.32,radius/31)):1;
      for(const marker of markers){
        if(marker.item.mesh.isDisposed())continue;
        const state=typeof getState==='function'?getState(marker.item):null;
        marker.state=state==='available'||state==='ready'?state:null;
        const y=4.05+Math.sin(elapsed*2.7+marker.phase)*.09;
        for(const stateName of ['available','ready']){
          const mesh=marker[stateName];if(mesh.isDisposed())continue;
          mesh.position.y=y;mesh.scaling.setAll(scale);
          mesh.setEnabled(!!visible&&marker.state===stateName&&marker.item.mesh.isEnabled());
        }
      }
    },
    dispose(){
      if(disposed)return;disposed=true;
      for(const marker of markers)for(const mesh of [marker.available,marker.ready]){
        for(const layer of glowLayers)layer.removeExcludedMesh(mesh);
        if(!mesh.isDisposed())mesh.dispose();
      }
      markers.length=0;material.dispose();
    }
  };
}
