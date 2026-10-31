// A warm afternoon key and cool open-sky fill keep painted shadows readable.
// Shared by the adventure and the scenery viewer so art review matches play.
export function createWorldLighting(B,scene){
 const sky=new B.HemisphericLight('sky',new B.Vector3(0,1,0),scene);
 sky.intensity=.34;sky.diffuse=new B.Color3(.72,.83,1);sky.groundColor=new B.Color3(.24,.29,.34);
 const sun=new B.DirectionalLight('sun',new B.Vector3(.9,-1,.68),scene);
 sun.position=new B.Vector3(-36,40,-27.2);sun.diffuse=new B.Color3(1,.91,.77);sun.intensity=.98;
 sun.shadowMinZ=1;sun.shadowMaxZ=125;sun.shadowFrustumSize=80;sun.autoUpdateExtends=false;
 const shadow=new B.ShadowGenerator(2048,sun);
 shadow.usePercentageCloserFiltering=true;shadow.filteringQuality=B.ShadowGenerator.QUALITY_LOW;
 shadow.bias=.0006;shadow.normalBias=.018;shadow.setDarkness(0);
 return {sun,shadow,sky};
}
export function setWorldLighting(B,scene,sun,zone){
 const dungeon=zone==='dungeon';
 scene.fogColor=B.Color3.FromHexString(dungeon?'#25243a':'#b2cacc');
 scene.clearColor=B.Color4.FromColor3(scene.fogColor);scene.fogDensity=dungeon?.012:.004;
 sun.intensity=dungeon?.72:.98;
}
