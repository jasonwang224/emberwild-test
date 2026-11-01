// Shared by the shoreline geometry, collision passage and actors' foot height.
export const POND_DOCK=Object.freeze({
  minX:-28.6,maxX:-23.4,minZ:-7.35,maxZ:-4.65,deckEndX:-24.2,height:.30,z:-6
});
export function dockSurfaceHeight(x,z){
  const d=POND_DOCK;
  if(x<d.minX||x>d.maxX||z<d.minZ||z>d.maxZ)return 0;
  return d.height*Math.min(1,(d.maxX-x)/(d.maxX-d.deckEndX));
}
