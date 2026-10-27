export const allowedFiles = new Set([
  'robot-directions.js',
  'robot-directions.css',
  'quanta-agent-iterations.js',
  'quanta-agent-iterations.css'
]);

export function applyEdits(original, edits) {
  if (!Array.isArray(edits) || !edits.length || edits.length > 6) {
    throw Error('No bounded patch');
  }
  const result = { ...original };
  let bytes = 0;
  for (const edit of edits) {
    if (
      !allowedFiles.has(edit.path) ||
      typeof result[edit.path] !== 'string' ||
      typeof edit.before !== 'string' ||
      !edit.before ||
      typeof edit.after !== 'string' ||
      result[edit.path].split(edit.before).length !== 2
    ) {
      throw Error('Patch scope or unique match rejected');
    }
    bytes += edit.before.length + edit.after.length;
    if (bytes > 16000) throw Error('Patch too large');
    result[edit.path] = result[edit.path].replace(edit.before, edit.after);
  }
  return result;
}

export function clearButtonPatch(original) {
  if (original['robot-directions.js'].includes("clearButton.dataset.clear='1'")) return [];
  // Use a single‑quoted string for the replacement to avoid nested back‑ticks which caused a syntax error.
  const afterString =
    "// Manual clear also cancels a pending draft write and clears both recovery stores.\n" +
    "const clearButton=node('button','Clear text');clearButton.type='button';clearButton.dataset.clear='1';\n" +
    "clearButton.style.minHeight='44px';send.after(clearButton);\n" +
    "clearButton.addEventListener('click',async()=>{\n" +
    "  clearButton.disabled=true;\n" +
    "  try{\n" +
    "    await ready;clearTimeout(draftTimer);input.value='';await storage(DRAFT,'');\n" +
    "    try{localStorage.removeItem(DRAFT)}catch{}\n" +
    "    status.textContent='Text cleared. Your saved jobs are still available.';input.focus();\n" +
    "  }catch(e){status.textContent='Could not clear the saved draft: '+e.message}\n" +
    "  finally{clearButton.disabled=false}\n" +
    "});\n" +
    "let draftTimer;input.addEventListener('input',";
  return [{
    path: 'robot-directions.js',
    before: "let draftTimer;input.addEventListener('input',",
    after: afterString
  }];
}
