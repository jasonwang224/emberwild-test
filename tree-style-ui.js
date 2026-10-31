import {TREE_STYLE_OPTIONS,normalizeTreeStyle} from './tree-style-options.js';

export function treeStyleName(id){return TREE_STYLE_OPTIONS.find(style=>style.id===normalizeTreeStyle(id))?.name||'Current painted clusters';}
export function treeStyleMenuHTML(id,{busy=false,error='',dungeon=false}={}) {
  const selected=normalizeTreeStyle(id);
  return `<section class="tree-style-menu" data-tree-menu>
    <div class="eyebrow">THE TREE COLLECTION</div><h2 class="modal-title">Choose your forest.</h2>
    <p class="tree-style-intro">Try the designs from the tree history sheet. Your choice is saved with this adventure.</p>
    <p class="tree-style-status" role="status">${busy?'Growing your new forest…':error?'That design could not load. Your previous trees are still here.':dungeon?'Your selection will appear when you return outdoors.':'Current look: '+treeStyleName(selected)}</p>
    <div class="tree-style-grid">${TREE_STYLE_OPTIONS.map(style=>`<button class="tree-style-card" data-action="tree-style:${style.id}" aria-pressed="${style.id===selected}" ${busy?'disabled':''}>
      <img src="./assets/tree-styles/${style.id}.png" alt="" loading="lazy" width="256" height="160">
      <span class="tree-style-copy"><b>${style.name}</b><small>${style.description}</small></span><span class="tree-style-check" aria-hidden="true">${style.id===selected?'✓':''}</span>
    </button>`).join('')}</div>
    <div class="tree-style-footer"><button class="primary" data-action="close">Back to the adventure →</button><button class="secondary" data-action="tree-style:current" ${busy?'disabled':''}>Restore current trees</button></div>
    <p class="tree-style-tip">Press T to reopen this collection. The original pixel artwork stays flat as you orbit; the 3D designs have depth.</p>
  </section>`;
}
