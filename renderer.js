// A failed WebGPU initialization can leave both Babylon and the canvas partial.
// Reload into WebGL so recovery starts with a fresh canvas and no GPU resources.
const diagnosticKey='emberwild-webgpu-startup';
function recordDiagnostic(storage,value){
 try{storage??=globalThis.sessionStorage;if(value)storage?.setItem(diagnosticKey,JSON.stringify(value));else storage?.removeItem(diagnosticKey);}catch{}
}
export function readRendererDiagnostic(storage){
 try{return JSON.parse((storage??globalThis.sessionStorage)?.getItem(diagnosticKey)||'null');}catch{return null;}
}
export async function createRenderer(B,canvas,{gpuAvailable,location,report=console.info,diagnosticStorage}={}){
 const url=new URL(location.href);
 if(gpuAvailable&&url.searchParams.get('renderer')!=='webgl'){
  let gpu;
  try{
   if(await B.WebGPUEngine.IsSupportedAsync){
    gpu=new B.WebGPUEngine(canvas,{antialias:true,glslangOptions:{jsPath:'./glslang.js?v=17317200',wasmPath:'./glslang.wasm'},twgslOptions:{jsPath:'./twgsl.js?v=17317200',wasmPath:'./twgsl.wasm'}});
    await gpu.initAsync();
    recordDiagnostic(diagnosticStorage,null);
    return {engine:gpu,backend:'WebGPU'};
   }
  }catch(error){
   // Preserve the first failure across the compatibility reload. A diagnostic
   // page can show it without needing Firefox's "preserve console logs" setting.
   recordDiagnostic(diagnosticStorage,{name:error?.name||'Error',message:String(error?.message??error).slice(0,4000),stage:gpu?'WebGPU initialization':'WebGPU support probe / construction',at:new Date().toISOString()});
   // Babylon 9.32 dispose() assumes initAsync created _timestampQuery and other
   // resources. Its cleanup error must never prevent the compatibility retry.
   try{gpu?.dispose();}catch(cleanupError){report('Partial WebGPU cleanup:',cleanupError);}
   report('Restarting with WebGL after WebGPU initialization failed:',error);
   url.searchParams.set('renderer','webgl');
   location.replace(url.href);
   return null;
  }
 }
 if(!B.Engine.isSupported())throw Error('WebGL is unavailable. Enable browser hardware acceleration and reload.');
 return {engine:new B.Engine(canvas,true,{stencil:true}),backend:'WebGL'};
}
