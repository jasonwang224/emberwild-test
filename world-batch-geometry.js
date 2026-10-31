/** Temporary scenery pieces exist only to be transformed/merged on the CPU.
 * Keep their vertex arrays available without uploading thousands of throwaway
 * GPU buffers. Babylon's merged mesh receives normal resident vertex buffers.
 * Uses the public VertexBuffer postponement API; no engine overrides. */
export function applyBatchVertexData(B,mesh,data){
  const engine=mesh.getScene().getEngine();
  for(const [property,kind] of [['positions',B.VertexBuffer.PositionKind],['normals',B.VertexBuffer.NormalKind],
    ['uvs',B.VertexBuffer.UVKind],['uvs2',B.VertexBuffer.UV2Kind],['colors',B.VertexBuffer.ColorKind]]){
    const values=data[property];if(!values)continue;
    const options={postponeInternalCreation:true,updatable:false};
    if(property==='colors')options.stride=data.positions&&values.length===data.positions.length?3:4;
    mesh.setVerticesBuffer(new B.VertexBuffer(engine,values,kind,options));
  }
  if(data.colors&&data.hasVertexAlpha)mesh.hasVertexAlpha=true;
  mesh.setIndices(data.indices||[]);
}

/** A one-piece batch is retained rather than merged. Materialize only those
 * surviving buffers once, before the scene's first frame. */
export function uploadBatchGeometry(mesh){
  for(const kind of mesh.getVerticesDataKinds()){
    const buffer=mesh.getVertexBuffer(kind);
    if(buffer&&!buffer.getBuffer())buffer.create();
  }
}
