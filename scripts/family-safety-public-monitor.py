#!/usr/bin/env python3
"""Check fixed official public advisory pages. A changed page is NOT a threat alert."""
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

STATE = Path(__file__).resolve().parent.parent / 'data/family-safety-watch.json'
SOURCES = {
 'us-qatar':'https://travel.state.gov/en/international-travel/travel-advisories/qatar.html',
 'us-israel':'https://travel.state.gov/en/international-travel/travel-advisories/israel.html',
 'uk-qatar':'https://www.gov.uk/foreign-travel-advice/qatar',
 'uk-israel':'https://www.gov.uk/foreign-travel-advice/israel',
}
MAX_BYTES = 500_000

class VisibleText(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True)
  self.parts=[]
  self.ignored=[]
 def handle_starttag(self,tag,attrs):
  if tag in ('script','style','svg','noscript'): self.ignored.append(tag)
 def handle_endtag(self,tag):
  if self.ignored and self.ignored[-1]==tag: self.ignored.pop()
 def handle_data(self,data):
  if not self.ignored and data.strip(): self.parts.append(data)

def normalize_public_page(content):
 parser=VisibleText()
 parser.feed(content)
 return re.sub(r'\s+',' ',' '.join(parser.parts)).strip()

def public_digest(url):
 if url not in SOURCES.values(): raise ValueError('public_source_not_allowlisted')
 request=Request(url,headers={'User-Agent':'QuantaPhi-Public-Advisory-Watch/1.0 (read-only)','Accept':'text/html'})
 with urlopen(request,timeout=14) as response:
  origin=urlparse(url)
  final=urlparse(response.geturl())
  if final.scheme!='https' or final.hostname!=origin.hostname: raise ValueError('unsafe_public_source_redirect')
  if response.status!=200: raise ValueError('public_source_http_error')
  if 'html' not in response.headers.get('Content-Type','').lower(): raise ValueError('unexpected_content_type')
  body=response.read(MAX_BYTES+1)
 if len(body)>MAX_BYTES: raise ValueError('public_source_too_large')
 visible=normalize_public_page(body.decode('utf-8',errors='replace'))
 if len(visible)<140: raise ValueError('unverifiable_public_document')
 return hashlib.sha256(visible.encode('utf-8')).hexdigest()

def update_state(snapshot,check=public_digest,now=None):
 if snapshot.get('schema_version')!=1 or snapshot.get('monitor_kind')!='official_civilian_safety_sources': raise ValueError('invalid_public_receipt')
 now=now or datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')
 prior={row.get('id'):row for row in snapshot.get('sources',[]) if isinstance(row,dict)}
 rows=[]
 for source_id,url in SOURCES.items():
  old=prior.get(source_id,{})
  digest=old.get('content_sha256')
  row={'id':source_id,'url':url,'status':'pending','last_checked_utc':now,
       'last_success_utc':old.get('last_success_utc'),'last_change_utc':old.get('last_change_utc'),
       'content_sha256':digest}
  try:
   current=check(url)
   if not isinstance(current,str) or not re.fullmatch('[0-9a-f]{64}',current):
    raise ValueError('invalid_public_digest')
   row['last_success_utc']=now
   row['content_sha256']=current
   if digest and digest!=current:
    row['last_change_utc']=now
    row['status']='review_required'
   else: row['status']='ok'
  except Exception as error:
   row['status']='unavailable'
   print('Source unavailable:',source_id,type(error).__name__,file=sys.stderr)
  rows.append(row)
 return {'schema_version':1,'monitor_kind':'official_civilian_safety_sources',
         'last_run_utc':now,'sources':rows}

def main():
 state=json.loads(STATE.read_text(encoding='utf-8'))
 updated=update_state(state)
 STATE.write_text(json.dumps(updated,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 count=sum(s['status'] in ('ok','review_required') for s in updated['sources'])
 print(f'Official public advisory pages reachable: {count}/{len(SOURCES)}. No air movements tracked.')

if __name__=='__main__': main()
