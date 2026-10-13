#!/usr/bin/env python3
"""Register a tested ComfyUI API export. Standard library only; no GPU installation."""
import argparse,json,pathlib
p=argparse.ArgumentParser()
p.add_argument('engine',choices=['wan','ltx','hunyuan','cogvideo','framepack'])
p.add_argument('workflow',type=pathlib.Path)
p.add_argument('--bind',action='append',default=[],help='field=node:input, e.g. prompt=6:text; use actual exported node IDs')
p.add_argument('--audio',action='store_true')
p.add_argument('--output',type=pathlib.Path,default=pathlib.Path('open-video-workflows.json'))
a=p.parse_args();graph=json.loads(a.workflow.read_text())
if not isinstance(graph,dict) or not graph or any(not isinstance(n,dict) or 'class_type' not in n or 'inputs' not in n for n in graph.values()):p.error('Use ComfyUI Export (API), not a UI workflow.')
if not a.bind:
 for node,item in graph.items():print(node,item['class_type'],json.dumps(item['inputs']))
 raise SystemExit('Inspection only. Register with --bind using the tested workflow inputs.')
bindings={}
for spec in a.bind:
 field,target=spec.split('=',1);node,name=target.split(':',1)
 if field not in ['prompt','image','width','height','frames','fps','seed','generate_audio']:p.error('Unknown binding field: '+field)
 if node not in graph or name not in graph[node]['inputs']:p.error('Missing node/input: '+target)
 bindings.setdefault(field,[]).append([node,name])
if 'prompt' not in bindings:p.error('A positive prompt binding is required')
config=json.loads(a.output.read_text()) if a.output.exists() else {}
config[a.engine]={'prompt':graph,'bindings':bindings,'capabilities':{'audio':a.audio}}
a.output.write_text(json.dumps(config,indent=2)+'\n')
print('Registered',a.engine,'in',a.output)
