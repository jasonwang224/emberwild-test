/* Painted pond: blue color fields, broken pale shore strokes and little
 * drifting ripple marks. The surface and surrounding scenery stay 3D. */
export const WATER_PLUGIN='EmberwildPaintedPond';
const definitions=`
float ewPondNoise(vec2 p){return sin(p.x*1.73+sin(p.y*1.21))*sin(p.y*2.19+sin(p.x*.83));}
float ewPondHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float ewPondValue(vec2 p){
    vec2 cell=floor(p);
    vec2 f=fract(p);
    vec2 u=f*f*(vec2(3.0)-2.0*f);
    float a=mix(ewPondHash(cell),ewPondHash(cell+vec2(1.0,0.0)),u.x);
    float b=mix(ewPondHash(cell+vec2(0.0,1.0)),ewPondHash(cell+vec2(1.0,1.0)),u.x);
    return mix(a,b,u.y);
}
`;
const surface=`
vec2 ewP=vPositionW.xz-vec2(-33.0,-5.0);
vec2 ewBrush=floor(ewP*18.0)/18.0;
float ewRadius=length(ewP/vec2(7.65,6.9615));
// Four flat depth paints meet at uneven, stepped brush edges.
// Offset contours keep the pale shelf from reading as concentric rings.
vec2 ewWarp=vec2(ewPondNoise(ewBrush*.43),ewPondNoise(ewBrush*.51+vec2(8.1,2.7)))*.20;
vec2 ewFieldP=ewBrush+ewWarp;
float ewDepth=length((ewBrush+vec2(.35,-.25))/vec2(7.65,6.9615));
float ewPaintEdge=ewPondNoise(ewBrush*vec2(.51,.83))*.042+(ewPondValue(ewBrush*1.25)-.5)*.055;
float ewMiddle=step(.44,ewDepth+ewPaintEdge);
float ewShelf=step(.70,ewRadius+ewPaintEdge+ewPondNoise(ewBrush*.69+vec2(3.0,7.0))*.025);
float ewShore=step(.88,ewRadius+ewPondNoise(ewBrush*vec2(.8,1.2))*.022);
vec3 ewPaint=vec3(.18,.405,.49);
ewPaint=mix(ewPaint,vec3(.25,.49,.555),ewMiddle);
ewPaint=mix(ewPaint,vec3(.335,.575,.615),ewShelf);
ewPaint=mix(ewPaint,vec3(.43,.665,.67),ewShore);
float ewDarkWash=step(.80,ewPondValue(ewFieldP*vec2(.32,.66)+vec2(7.2,4.8)));
float ewBlueWash=step(.83,ewPondValue(ewFieldP*vec2(.40,.83)+vec2(16.3,8.1)));
float ewLightWash=step(.83,ewPondValue(ewFieldP*vec2(.82,1.05)+vec2(2.1,17.4)));
ewPaint-=vec3(.035,.055,.05)*ewDarkWash;
ewPaint-=vec3(.02,.035,.03)*ewBlueWash;
ewPaint+=vec3(.065,.075,.06)*ewLightWash;
float ewDryBrush=step(.89,ewPondValue(ewFieldP*vec2(1.25,3.0)+vec2(25.0,9.0)));
ewPaint+=vec3(.05,.065,.05)*ewDryBrush;
float ewRim=step(.977,ewRadius)*(1.0-step(1.0,ewRadius));
float ewRimBreak=step(-.15,ewPondNoise(ewBrush*1.1));
ewPaint=mix(ewPaint,vec3(.73,.79,.61),ewRim*ewRimBreak*.60);
// Cluster sparse single/double/triple strokes, leaving quiet open water.
vec2 ewFlow=ewP+vec2(ewWaterTime*.025,sin(ewWaterTime*.22)*.035);
float ewRow=floor(ewFlow.y/.68);
vec2 ewGrid=vec2(ewFlow.x+sin(ewRow*9.7)*.85,ewFlow.y)/vec2(1.45,.68);
vec2 ewCell=floor(ewGrid);
float ewSeed=ewPondHash(ewCell);
vec2 ewLocal=fract(ewGrid)-vec2(.5,.5+(ewSeed-.5)*.33);
float ewLength=.045+ewPondHash(ewCell+vec2(3.0,7.0))*.22;
float ewDash=(1.0-smoothstep(ewLength-.018,ewLength,abs(ewLocal.x)))*(1.0-smoothstep(.025,.065,abs(ewLocal.y)));
float ewCompanion=(1.0-smoothstep(ewLength*.42,ewLength*.5,abs(ewLocal.x+.07)))*(1.0-smoothstep(.018,.05,abs(ewLocal.y-.13)))*step(.79,ewSeed);
float ewThird=(1.0-smoothstep(.035,.055,abs(ewLocal.x-.05)))*(1.0-smoothstep(.018,.045,abs(ewLocal.y+.10)))*step(.94,ewSeed);
float ewFade=.55+.45*sin(ewWaterTime*.55+ewSeed*12.0);
float ewCluster=step(.40,ewPondValue(ewCell*.42+vec2(7.0,3.0)));
float ewMark=max(max(ewDash,ewCompanion),ewThird)*step(.75,ewSeed)*ewCluster*ewFade*(1.0-ewShore*.7);
vec3 ewStroke=mix(vec3(.49,.70,.70),vec3(.78,.84,.68),step(.94,ewSeed));
ewPaint=mix(ewPaint,ewStroke,ewMark*.68);
`;
const finish=`
// Soft painted shadow bands keep the blue visible beneath the trees.
float ewLight=clamp(dot(diffuseBase,vec3(.2126,.7152,.0722)),0.0,1.0);
color=vec4(ewPaint*(.80+.20*step(.5,ewLight)),1.0);
`;
function wgsl(code){
    const types={float:'f32',vec2:'vec2f',vec3:'vec3f',vec4:'vec4f'};
    return code.replace(/(float|vec[234]) (\w+)\(([^)]*)\)\s*\{/g,(_,type,name,args)=>`fn ${name}(${args.split(',').filter(Boolean).map(a=>{const[t,n]=a.trim().split(/\s+/);return `${n}: ${types[t]}`;}).join(',')}) -> ${types[type]} {`)
        .replace(/\b(float|vec[234]) (\w+)=/g,(_,type,name)=>`var ${name}: ${types[type]}=`)
        .replace(/\bvec([234])\(/g,'vec$1f(')
        .replace(/\bvPositionW\b/g,'fragmentInputs.vPositionW')
        .replace(/\bewWaterTime\b/g,'uniforms.ewWaterTime');
}
export function installWaterSurface(B,scene,{materials,root}={}){
    const pond=root?.getChildMeshes().find(m=>m.name==='pond-water');
    if(!pond)return {update(){}};
    if(pond.material.metadata?.paintedPondController)return pond.material.metadata.paintedPondController;
    const state={time:0};
    const material=new B.StandardMaterial('world-painted-pond',scene);
    material.diffuseColor.set(.27,.55,.63);material.specularColor.set(0,0,0);
    material.metadata={emberwildCel:false,waterSurface:true};
    class PaintedPondPlugin extends B.MaterialPluginBase{
        constructor(m){super(m,WATER_PLUGIN,170,{},true,true);this.doNotSerialize=true;}
        getClassName(){return WATER_PLUGIN;}
        isCompatible(language){return language===B.ShaderLanguage.GLSL||language===B.ShaderLanguage.WGSL;}
        getUniforms(language=B.ShaderLanguage.GLSL){return{ubo:[{name:'ewWaterTime',size:1,type:'float'}],fragment:language===B.ShaderLanguage.GLSL?'uniform float ewWaterTime;':''};}
        bindForSubMesh(buffer){buffer.updateFloat('ewWaterTime',state.time);}
        getCustomCode(shaderType,language=B.ShaderLanguage.GLSL){
            if(shaderType!=='fragment')return null;
            const convert=language===B.ShaderLanguage.WGSL?wgsl:x=>x;
            return{CUSTOM_FRAGMENT_DEFINITIONS:convert(definitions),CUSTOM_FRAGMENT_BEFORE_LIGHTS:convert(surface),CUSTOM_FRAGMENT_BEFORE_FOG:convert(finish)};
        }
    }
    new PaintedPondPlugin(material);pond.material=material;materials.push(material);
    const controller={update(time){if(Number.isFinite(time))state.time=time;}};
    material.metadata.paintedPondController=controller;
    return controller;
}
