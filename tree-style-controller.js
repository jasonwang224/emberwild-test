import {normalizeTreeStyle} from './tree-style-options.js?v=e2609980';
import {createTreeStyleRenderer} from './tree-style-renderer.js?v=e2609980';

// Own only tree visuals. Navigation, encounters and interactions stay in place.
export function createTreeStyleController(B,scene,{root,trees,currentMeshes,shadowCasters}) {
  const currentCasters=shadowCasters.filter(mesh=>currentMeshes.includes(mesh));
  let active=null,styleId='current',request=0,disposed=false;
  function replaceCasters(removed,added,onShadowChange) {
    const removedSet=new Set(removed);
    for(let i=shadowCasters.length-1;i>=0;i--)if(removedSet.has(shadowCasters[i]))shadowCasters.splice(i,1);
    shadowCasters.push(...added);
    onShadowChange?.(removed,added);
  }
  return {
    get styleId(){return styleId;},
    async setStyle(value,{onShadowChange}={}) {
      const id=normalizeTreeStyle(value),ticket=++request;
      if(disposed)return {applied:false,styleId};
      if(id===styleId)return {applied:true,styleId};
      let next=null;
      if(id!=='current'&&trees.length){
        try{next=await createTreeStyleRenderer(B,scene,{styleId:id,trees,parent:root});}
        catch(error){if(disposed||ticket!==request)return {applied:false,styleId};throw error;}
      }
      if(disposed||ticket!==request){next?.dispose();return {applied:false,styleId};}
      const previous=active,removed=previous?previous.shadowCasters:currentCasters;
      const added=next?next.shadowCasters:id==='current'?currentCasters:[];
      for(const mesh of currentMeshes)mesh.setEnabled(id==='current');
      next?.root.setEnabled(true);
      replaceCasters(removed,added,onShadowChange);
      active=next;styleId=id;previous?.dispose();
      return {applied:true,styleId};
    },
    update(time){active?.update(time);},
    dispose(){if(disposed)return;disposed=true;request++;active?.dispose();active=null;}
  };
}
