// Small enough to run before the engine bundle. Progress represents completed
// startup stages and assets, never an elapsed-time estimate.
(()=>{
  const get=id=>document.getElementById(id),panel=get('startup-loading');
  if(!panel)return;
  const gauge=get('loading-gauge'),fill=get('loading-fill'),percent=get('loading-percent'),status=get('loading-status');
  let value=0,finished=false,failed=false;
  function paint(next,label){
    value=Math.max(value,Math.min(100,Math.round(next)));
    fill.style.width=value+'%';percent.textContent=value+'%';
    gauge.setAttribute('aria-valuenow',String(value));
    gauge.setAttribute('aria-valuetext',`${value}% · ${label}`);status.textContent=label;
  }
  function unwatch(){window.removeEventListener('error',onError,true);window.removeEventListener('unhandledrejection',onRejection);}
  function fail(message='The valley could not load. Check your connection and try again.'){
    if(finished||failed)return;
    failed=true;panel.dataset.state='error';panel.setAttribute('aria-busy','false');
    get('loading-label').textContent='LOADING INTERRUPTED';status.textContent=message;
    gauge.setAttribute('aria-valuetext',`Loading interrupted at ${value}%`);
    get('start-button').disabled=true;get('continue-button').disabled=true;get('loading-retry').hidden=false;unwatch();
  }
  function onError(event){if(event.target?.tagName==='SCRIPT'||event.target===window)fail();}
  function onRejection(){fail();}
  get('loading-retry').onclick=()=>window.location.reload();
  window.addEventListener('error',onError,true);window.addEventListener('unhandledrejection',onRejection);
  window.EmberwildLoading={
    set(next,label){if(!finished&&!failed&&Number.isFinite(next))paint(Math.min(99,next),label);},
    complete(label){if(failed)return false;if(finished)return true;paint(100,label);finished=true;panel.dataset.state='ready';panel.setAttribute('aria-busy','false');get('loading-label').textContent='YOUR ADVENTURE IS READY';unwatch();return true;},
    fail
  };
  window.EmberwildLoading.set(5,'Loading the game…');
})();
