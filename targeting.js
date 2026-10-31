import {enemyProfile} from './enemy-profile.js';
// Existing attack ranges already include contact with ordinary creatures. Only
// the extra footprint of a larger guardian or boss extends that reach.
export function enemyDistance(enemy,position){
 const bonus=(enemy.profile||enemyProfile(enemy.kind)).reachBonus;
 return Math.max(0,Math.hypot(enemy.root.position.x-position.x,enemy.root.position.z-position.z)-bonus);
}
// Shared selection rules for attacks and their visible preview.
export function chooseTarget(enemies,position,range,preferred=null){
 const distance=e=>enemyDistance(e,position);
 if(preferred&&enemies.includes(preferred)&&preferred.hp>0&&distance(preferred)<range)return preferred;
 let best=null,nearest=range;
 for(const enemy of enemies){if(enemy.hp<=0)continue;const d=distance(enemy);if(d<nearest){best=enemy;nearest=d;}}
 return best;
}
export const CREATURE_NAMES={slime:'Meadow Jelly',mushroom:'Sporecap',wolf:'Bramble Pup',golem:'Moss Guardian',boss:'The Hollow King'};
