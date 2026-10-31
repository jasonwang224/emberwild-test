// World-space presentation and contact sizes. Sprite heights describe an atlas
// cell; the artwork occupies only part of that cell. Keep combat roots unscaled
// for sprites so an authored bounce never moves the collision footprint.
const ordinary={spriteHeight:2,fallbackScale:1,collisionRadius:.7,returnRadius:.8,
  projectileRadius:.9,selectionRadius:2,shadowRadius:.48,targetScale:1,
  barHeight:2.15,barWidth:1.25,impactHeight:.9,damageHeight:1.6,reachBonus:0};
export const ENEMY_PROFILES=Object.freeze({
  slime:Object.freeze({...ordinary,spriteHeight:1.6,barHeight:1.65}),
  mushroom:Object.freeze({...ordinary}),
  wolf:Object.freeze({...ordinary}),
  golem:Object.freeze({...ordinary,spriteHeight:3.8,fallbackScale:1.05,
    collisionRadius:1,returnRadius:1,projectileRadius:1.4,shadowRadius:1.05,
    targetScale:1.65,barHeight:3.05,barWidth:1.55,impactHeight:1.7,
    damageHeight:2.9,reachBonus:.35}),
  boss:Object.freeze({...ordinary,spriteHeight:7,fallbackScale:1.6,
    collisionRadius:2.1,returnRadius:2.1,projectileRadius:2.6,selectionRadius:2.65,
    shadowRadius:2.1,targetScale:3,barHeight:6,barWidth:2.25,
    impactHeight:2.65,damageHeight:5.6,reachBonus:1.15})
});
export const enemyProfile=kind=>ENEMY_PROFILES[kind]||ENEMY_PROFILES.slime;
