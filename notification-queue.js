// Keep all notification types in one lane: each message finishes before the
// next one is shown, without changing the existing card artwork or wording.
export function createNotificationQueue({show,setTimer=setTimeout,clearTimer=clearTimeout}){
  const pending=[];
  let current=null,timer=null,cleanup=null,generation=0,changing=0,disposed=false;
  const same=(a,b)=>['kind','title','body','icon'].every(key=>a[key]===b[key]);

  function hide(){
    const release=cleanup;cleanup=null;
    const oldTimer=timer;timer=null;
    current=null;
    if(oldTimer!==null)clearTimer(oldTimer);
    changing++;
    try{release?.();}finally{changing--;}
  }

  function advance(){
    if(disposed||changing||current||pending.length===0)return;
    const message=pending.shift(),token=++generation;
    current=message;changing++;
    try{
      const release=show(message);
      // clear/dispose can occur while a display is being created. Release that
      // display immediately rather than leaving it outside the queue's lifetime.
      if(token!==generation||disposed){if(typeof release==='function')release();return;}
      cleanup=typeof release==='function'?release:null;
      const duration=Number.isFinite(message.duration)&&message.duration>=0?message.duration:4500;
      timer=setTimer(()=>{
        if(disposed||token!==generation)return;
        generation++;
        try{hide();}finally{advance();}
      },duration);
    }finally{
      changing--;
      if(!current)advance();
    }
  }

  function clear(){
    generation++;pending.length=0;
    try{hide();}finally{advance();}
  }

  return {
    push(message){
      if(disposed||(current&&same(current,message))||pending.some(item=>same(item,message)))return false;
      pending.push(Object.freeze({...message}));advance();return true;
    },
    clear,
    dispose(){if(disposed)return;disposed=true;clear();},
    get active(){return current;},
    get pendingCount(){return pending.length;}
  };
}
