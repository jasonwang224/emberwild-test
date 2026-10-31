/* Tiny canopy motion; tree anchors in UV2 survive the static mesh merge. */
export const CANOPY_WIND_PADDING = .075;
export function canopyWindOffset(x,z,height,time,vertexX=0) {
  const phase=x*1.71+z*.93,weight=Math.max(0,Math.min(1,(height-1.7)*.35));
  const gust=Math.sin(time*.71+phase)*.65+Math.sin(time*1.17+phase*1.37)*.35;
  return [weight*.045*gust,weight*.007*Math.sin(time*1.3+phase+vertexX),weight*.028*Math.sin(time*.83+phase+.6)];
}

const GLSL=`
float ewWindPhase=uv2.x*1.71+uv2.y*.93;
float ewWindWeight=clamp((positionUpdated.y-1.7)*0.35,0.0,1.0);
float ewWindGust=sin(ewWindTime*0.71+ewWindPhase)*0.65+sin(ewWindTime*1.17+ewWindPhase*1.37)*0.35;
positionUpdated += ewWindWeight*vec3(0.045*ewWindGust,0.007*sin(ewWindTime*1.3+ewWindPhase+positionUpdated.x),0.028*sin(ewWindTime*0.83+ewWindPhase+0.6));
`;
const WGSL=`
let ewWindPhase: f32=vertexInputs.uv2.x*1.71+vertexInputs.uv2.y*0.93;
let ewWindWeight: f32=clamp((positionUpdated.y-1.7)*0.35,0.0,1.0);
let ewWindGust: f32=sin(uniforms.ewWindTime*0.71+ewWindPhase)*0.65+sin(uniforms.ewWindTime*1.17+ewWindPhase*1.37)*0.35;
positionUpdated += ewWindWeight*vec3f(0.045*ewWindGust,0.007*sin(uniforms.ewWindTime*1.3+ewWindPhase+positionUpdated.x),0.028*sin(uniforms.ewWindTime*0.83+ewWindPhase+0.6));
`;

export function installCanopyWind(B,scene,materials) {
  const state={time:0};
  class CanopyWindPlugin extends B.MaterialPluginBase {
    constructor(material){super(material,'EmberwildCanopyWind',160,{},true,true);this.doNotSerialize=true;}
    getClassName(){return 'EmberwildCanopyWind';}
    isCompatible(language){return language===B.ShaderLanguage.GLSL||language===B.ShaderLanguage.WGSL;}
    prepareDefines(defines){defines.UV2=true;}
    getAttributes(attributes){if(!attributes.includes(B.VertexBuffer.UV2Kind))attributes.push(B.VertexBuffer.UV2Kind);}
    getUniforms(language=B.ShaderLanguage.GLSL){return {ubo:[{name:'ewWindTime',size:1,type:'float'}],vertex:language===B.ShaderLanguage.GLSL?'uniform float ewWindTime;':''};}
    bindForSubMesh(buffer){buffer.updateFloat('ewWindTime',state.time);}
    getCustomCode(shaderType,language=B.ShaderLanguage.GLSL){return shaderType==='vertex'?{CUSTOM_VERTEX_UPDATE_POSITION:language===B.ShaderLanguage.WGSL?WGSL:GLSL}:null;}
  }
  for(const material of materials){
    if(!material.metadata?.canopyWind||material.pluginManager?.getPlugin('EmberwildCanopyWind'))continue;
    new CanopyWindPlugin(material);material.markAsDirty(B.Material.AllDirtyFlag);
  }
  return {update(time){if(Number.isFinite(time))state.time=time;}};
}
