// Release browser/GPU resources before a real document exit. These callbacks
// must be synchronous: pagehide cannot wait for asynchronous cleanup work.
export function bindGameLifecycle(target,callbacks={}){
  let disposed=false,attached=true;
  const stages=['stopRenderLoop','persist','disposeWorld','disposeScene','disposeSprites','disposeSound','disposeEngine'];
  function invoke(stage){
    try{callbacks[stage]?.();}
    catch(error){
      // Saving, audio, or partial-world cleanup must never strand the engine.
      try{callbacks.onError?.(stage,error);}catch{}
    }
  }
  function detach(){
    if(!attached)return;
    attached=false;target.removeEventListener('pagehide',onPageHide);
  }
  function cleanup(){
    if(disposed)return false;
    disposed=true;
    // Mark disposed before callbacks: synchronous re-entry is harmless.
    detach();
    for(const stage of stages)invoke(stage);
    return true;
  }
  function onPageHide(event){
    if(disposed)return;
    // A back/forward-cache entry is suspended, not destroyed. Keeping its
    // render loop and resources intact allows the exact game to resume.
    if(event.persisted){invoke('persist');return;}
    cleanup();
  }
  target.addEventListener('pagehide',onPageHide);
  return {cleanup,detach,get disposed(){return disposed;}};
}
