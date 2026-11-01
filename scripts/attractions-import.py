#!/usr/bin/env python3
"""Normalize bounded Overture Places tourist features into an attributed Colorado JSON snapshot.
No fake photos, reviews, prices or paid advertisements. Run after overturemaps download.
"""
import argparse,json,re
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urlparse

BBOX=(-109.060,36.990,-102.040,41.010)
# Overture's broad historic_site taxonomy can include ordinary residential
# complexes. A high confidence score is not evidence of public visitor access.
# Exclude clear residential facility names pending independent historic proof.
RESIDENTIAL_FALSE_POSITIVE = re.compile(
    r"\b(?:apartments?|apartment homes?|condominiums?|condos?|townhomes?|"
    r"townhouses?|leasing office|property management|self[- ]?storage|"
    r"senior living|assisted living|residential rentals?)\b", re.I
)
CATEGORIES=set("""museum art_museum history_museum science_museum natural_history_museum
children_museum art_gallery tourist_attraction visitor_center welcome_center national_park
state_park regional_park nature_reserve nature_preserve botanical_garden zoo aquarium
historic_site historical_landmark monument memorial cave scenic_lookout observation_deck
waterfall hot_springs ski_resort ski_area amusement_park theme_park water_park adventure_park
planetarium science_center wildlife_refuge heritage_site national_monument recreation_area
hiking_area nature_trail scenic_drive outdoor_recreation cultural_center historic_house
archaeological_site canyon garden park observatory historic_mine mine_tour rafting
whitewater_rafting""".split())

def safe_site(value):
 if isinstance(value,list): value=next((x for x in value if isinstance(x,str)),'')
 if isinstance(value,dict): value=value.get('url','')
 if not isinstance(value,str) or len(value)>400:return ''
 try:
  p=urlparse(value)
  return value if p.scheme=='https' and p.hostname and '.' in p.hostname and not p.username and not p.password and not p.port else ''
 except ValueError:return ''

def normalize(feature):
 p=feature.get('properties') or {}
 tax=p.get('taxonomy') or {}
 primary=str(tax.get('primary') or p.get('basic_category') or '').lower()
 basic=str(p.get('basic_category') or '').lower()
 if primary not in CATEGORIES and basic not in CATEGORIES:return None
 hierarchy=tax.get('hierarchy') or []
 if hierarchy and hierarchy[0] not in ('arts_and_entertainment','recreation_and_leisure','tourism') and primary not in ('national_park','state_park','museum','park','zoo','aquarium','historic_site'):return None
 if str(p.get('operating_status') or feature.get('operating_status') or '').lower() in ('permanently_closed','closed_permanently'):return None
 try:
  confidence=float(p.get('confidence') or 0)
  lon,lat=(feature.get('geometry') or {}).get('coordinates')[:2]
  lon,lat=float(lon),float(lat)
 except (IndexError,ValueError,TypeError):return None
 if confidence<.70 or not (BBOX[0]<=lon<=BBOX[2] and BBOX[1]<=lat<=BBOX[3]):return None
 a=p.get('addresses') or []
 addr=a[0] if isinstance(a,list) and a and isinstance(a[0],dict) else {}
 # Missing address region cannot establish Colorado membership from a padded download box.
 if str(addr.get('region') or '').upper() not in ('CO','COLORADO'):return None
 names=p.get('names') or {}
 name=names.get('primary','') if isinstance(names,dict) else ''
 if isinstance(name,dict):name=name.get('value','')
 name=re.sub(r'\s+',' ',str(name).strip())[:160]
 if (primary if primary in CATEGORIES else basic) == 'historic_site' and RESIDENTIAL_FALSE_POSITIVE.search(name):
  return None
 identity=str(p.get('id') or feature.get('id') or '')
 if not name or not re.fullmatch(r'[a-zA-Z0-9-]{10,100}',identity):return None
 return {'id':'overture:'+identity,'name':name,'city':str(addr.get('locality') or '')[:100],
 'state':'CO','category':primary if primary in CATEGORIES else basic,
 'address':str(addr.get('freeform') or '')[:240],'latitude':lat,'longitude':lon,
 'website':safe_site(p.get('websites')),'source_name':'Overture Maps',
 'source_url':'https://overturemaps.org/','license':'CDLA-Permissive-2.0',
 'confidence':confidence,'image_url':'','image_attribution':''}

def closure_id(feature):
 """Only explicit permanently closed Colorado Overture attractions yield tombstones."""
 p=feature.get('properties') or {}
 status=str(p.get('operating_status') or feature.get('operating_status') or '').lower()
 if status not in ('permanently_closed','closed_permanently'):return None
 tax=p.get('taxonomy') or {}
 primary=str(tax.get('primary') or p.get('basic_category') or '').lower()
 basic=str(p.get('basic_category') or '').lower()
 if primary not in CATEGORIES and basic not in CATEGORIES:return None
 addresses=p.get('addresses') or []
 addr=addresses[0] if isinstance(addresses,list) and addresses and isinstance(addresses[0],dict) else {}
 if str(addr.get('region') or '').upper() not in ('CO','COLORADO'):return None
 try:
  lon,lat=(feature.get('geometry') or {}).get('coordinates')[:2]
  lon,lat=float(lon),float(lat)
 except (IndexError,ValueError,TypeError):return None
 if not (BBOX[0]<=lon<=BBOX[2] and BBOX[1]<=lat<=BBOX[3]):return None
 identity=str(p.get('id') or feature.get('id') or '')
 return 'overture:'+identity if re.fullmatch(r'[a-zA-Z0-9-]{10,100}',identity) else None

def build(features,release='2026-10-21.0',generated_at=None,limit=5000):
 items,seen=[],set()
 closed=set()
 for feature in features:
  tombstone=closure_id(feature)
  if tombstone:
   closed.add(tombstone)
   continue
  row=normalize(feature)
  if row is None:continue
  key=(row['name'].casefold(),round(row['latitude'],4),round(row['longitude'],4))
  if key in seen:continue
  seen.add(key);items.append(row)
 items.sort(key=lambda row:(row['name'].casefold(),row['id']))
 return {'schema_version':1,'source_name':'Overture Maps','dataset_version':release,
 'generated_at':generated_at or datetime.now(timezone.utc).isoformat().replace('+00:00','Z'),
 'state':'CO','license':'CDLA-Permissive-2.0','eligible_count':len(items),
 'truncated':len(items)>limit or len(closed)>limit,'items':items[:limit],
 'closed_ids':sorted(closed)[:limit]}

def main():
 p=argparse.ArgumentParser()
 p.add_argument('--input',required=True);p.add_argument('--output',required=True)
 p.add_argument('--release',default='2026-10-21.0');p.add_argument('--limit',type=int,default=5000)
 args=p.parse_args()
 if args.limit<10 or args.limit>5000:raise SystemExit('Invalid record limit')
 data=json.loads(Path(args.input).read_text())
 if data.get('type')!='FeatureCollection' or not isinstance(data.get('features'),list):raise SystemExit('Expected GeoJSON FeatureCollection')
 result=build(data['features'],args.release,limit=args.limit)
 if len(result['items'])<6:raise SystemExit('Refusing an unpopulated Overture snapshot')
 out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True)
 out.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
 print('Colorado eligible',result['eligible_count'],'imported',len(result['items']),'truncated',result['truncated'])
if __name__=='__main__':main()
