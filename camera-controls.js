// Babylon 9.32 keeps pointer actions in its movement input map. Disabling
// panning alone leaves right-drag assigned to a disabled pan action.
export function enableRightDragOrbit(camera){
 camera.movement.input.setInteraction('pointer',{button:2},'rotate');
}
