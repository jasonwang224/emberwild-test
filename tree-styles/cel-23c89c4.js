/* Four-band diffuse lighting for authored world geometry.
 * Checked against the GLSL and WGSL StandardMaterial sources in babylon.js.
 * Install after createWorld; repeat after changing zones. Idempotent per material.
 */
const NAME = 'EmberwildHistoricalCel_23c89c4';

// StandardMaterial has no named AFTER_LIGHTS hook. This exact, shared anchor
// occurs once after all light/shadow contributions and before color composition.
// Babylon's documented regex injection keeps the match through $0.
const AFTER_LIGHTS = '!aggShadow\\s*=\\s*aggShadow\\s*/\\s*numLights\\s*;';

const GLSL = `$0
// Quantize irradiance, never the albedo texture or final framebuffer color.
float ewCelLuma = dot(max(diffuseBase, vec3(0.0)), vec3(0.2126, 0.7152, 0.0722));
if (ewCelLuma > 0.0001) {
    float ewCelBand = 0.43;
    if (ewCelLuma >= 1.00) { ewCelBand = 1.04; }
    else if (ewCelLuma >= 0.70) { ewCelBand = 0.84; }
    else if (ewCelLuma >= 0.40) { ewCelBand = 0.65; }
    // Keep genuinely unlit surfaces dark, rather than introducing ambient light.
    ewCelBand *= min(ewCelLuma / 0.16, 1.0);
    diffuseBase *= ewCelBand / ewCelLuma;
}
`;

const WGSL = `$0
// Same irradiance bands as GLSL; ordinary WGSL local variables only.
let ewCelLuma: f32 = dot(max(diffuseBase, vec3f(0.0)), vec3f(0.2126, 0.7152, 0.0722));
if (ewCelLuma > 0.0001) {
    var ewCelBand: f32 = 0.43;
    if (ewCelLuma >= 1.00) { ewCelBand = 1.04; }
    else if (ewCelLuma >= 0.70) { ewCelBand = 0.84; }
    else if (ewCelLuma >= 0.40) { ewCelBand = 0.65; }
    ewCelBand *= min(ewCelLuma / 0.16, 1.0);
    diffuseBase *= ewCelBand / ewCelLuma;
}
`;

/**
 * Apply four-band cel shading to opaque, lit world-* StandardMaterials.
 * Returns the number newly installed. Transparent water/contact effects and
 * unlit sprite materials keep their own rendering. No new textures or uniforms.
 */
export function applyCelShading(B, scene) {
    if (!B?.MaterialPluginBase || !scene) return 0;

    class CelLightingPlugin extends B.MaterialPluginBase {
        constructor(material) {
            super(material, NAME, 180, {}, true, true);
            this.doNotSerialize = true;
        }
        getClassName() { return NAME; }
        isCompatible(language) {
            return language === B.ShaderLanguage.GLSL || language === B.ShaderLanguage.WGSL;
        }
        getCustomCode(shaderType, language = B.ShaderLanguage.GLSL) {
            if (shaderType !== 'fragment') return null;
            return { [AFTER_LIGHTS]: language === B.ShaderLanguage.WGSL ? WGSL : GLSL };
        }
    }

    let installed = 0;
    for (const material of scene.materials) {
        if (!(material instanceof B.StandardMaterial) || !material.name.startsWith('world-')) continue;
        if (material.disableLighting || material.alpha < 1 || material.metadata?.emberwildCel === false) continue;
        // Painted surfaces keep their highlights in the albedo. Smooth specular
        // is composed after our diffuse bands and would restore a plastic look.
        material.specularColor.set(0,0,0);
        if (material.pluginManager?.getPlugin(NAME)) continue;
        new CelLightingPlugin(material);
        material.markAsDirty(B.Material.AllDirtyFlag);
        installed++;
    }
    return installed;
}
