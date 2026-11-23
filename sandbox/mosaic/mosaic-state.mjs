/** Local-only creator state. No provider calls and no publishing authority. */
const MAX_SCRIPT_LENGTH = 800;
export function createStudio(script = '') {
  return Object.freeze({script:String(script).slice(0,MAX_SCRIPT_LENGTH), scenes:Object.freeze([]), provenance:'owner-authored-local-draft'});
}
export function createStoryboard(studio) {
  if (!studio || studio.provenance !== 'owner-authored-local-draft') throw new TypeError('Invalid local project');
  const text = studio.script.trim();
  const scenes = text ? text.split(/[.!?]+(?:\s+|$)/).map(scene=>scene.trim()).filter(Boolean).slice(0,6) : [];
  return Object.freeze({...studio, scenes:Object.freeze(scenes)});
}
export function pipelineStatus(studio) {
  return Object.freeze({
    script:studio.scenes.length > 0 ? 'ready' : 'needs_script',
    image:'not_connected',voice:'not_connected',video:'not_connected',review:'blocked'
  });
}
export function exportProject(studio) {
  return {schema:'quanta-mosaic-local-v1', provenance:studio.provenance,
    script:studio.script,scenes:[...studio.scenes],media:null,publishable:false,
    providerStatus:pipelineStatus(studio)};
}
