#!/data/data/com.termux/files/usr/bin/bash
# QuantaPhi Solar Research: free Crossref, Europe PMC, OpenAlex metadata.
set -eu
cd "$HOME"
command -v python >/dev/null 2>&1 || pkg install -y python
mkdir -p "$HOME/quanta-research"
cat > "$HOME/quanta-research/run.py" <<'PY'
import csv,datetime as dt,hashlib,html,json,re,sys,time
from pathlib import Path
from urllib.parse import urlencode,quote
from urllib.request import Request,urlopen
from urllib.error import HTTPError,URLError

HOME=Path.home()/'quanta-research'; OUT=HOME/'results'; RAW=OUT/'raw'
TOPICS=['solar paint photovoltaic coating','photocatalytic water vapor hydrogen',
'hybrid photovoltaic photoelectrochemical hydrogen','perovskite silicon tandem solar',
'quantum dot semiconductor photovoltaics','machine learning solar materials discovery',
'silicon germanium nanostructure solar cell']
TODAY=dt.date.today().isoformat(); SINCE='2022-01-01'
AGENT='QuantaPhi-Termux-Research/1.0 (+https://quantaphi.org)'

def doi(value):
    v=re.sub(r'^https?://(?:dx\.)?doi\.org/','',str(value or '').strip().lower()).rstrip('.,;')
    return v if re.fullmatch(r'10\.\d{4,9}/[-._;()/:a-z0-9]+',v) else ''
def title(v):
    if isinstance(v,list):v=v[0] if v else ''
    return re.sub(r'\s+',' ',re.sub(r'<[^>]*>',' ',str(v or ''))).strip()[:260]
def year(v):
    try:
        n=int(v);return n if 1800<=n<=2100 else None
    except (ValueError,TypeError):return None
def get(provider,q):
    if provider=='Crossref':
        url='https://api.crossref.org/works?'+urlencode({'query':q,'rows':5,
            'filter':f'from-pub-date:{SINCE},until-pub-date:{TODAY}'})
    elif provider=='EuropePMC':
        url='https://www.ebi.ac.uk/europepmc/webservices/rest/search?'+urlencode({
            'query':f'({q}) AND FIRST_PDATE:[{SINCE} TO {TODAY}]',
            'format':'json','pageSize':5,'resultType':'lite'})
    else:
        url='https://api.openalex.org/works?'+urlencode({'search':q,'per-page':5,
            'filter':f'from_publication_date:{SINCE},to_publication_date:{TODAY}'})
    path=RAW/(hashlib.sha256(url.encode()).hexdigest()[:24]+'.json')
    if path.exists() and time.time()-path.stat().st_mtime<72000:
        return json.loads(path.read_text(encoding='utf-8'))
    request=Request(url,headers={'User-Agent':AGENT,'Accept':'application/json'})
    with urlopen(request,timeout=20) as response:
        data=response.read(2500001)
    if len(data)>2500000:raise ValueError('Large provider response skipped')
    result=json.loads(data)
    if not isinstance(result,dict):raise ValueError('Invalid provider response')
    path.write_text(json.dumps(result,ensure_ascii=False),encoding='utf-8')
    return result

def ingest(provider,packet,topic):
    if provider=='Crossref':items=packet.get('message',{}).get('items',[])
    elif provider=='EuropePMC':items=packet.get('resultList',{}).get('result',[])
    else:items=packet.get('results',[])
    output=[]
    for v in items[:5]:
        if not isinstance(v,dict):continue
        if provider=='Crossref':
            identifier=doi(v.get('DOI'));name=title(v.get('title'))
            authors=[title(a.get('given','')+' '+a.get('family','')) for a in v.get('author',[])[:6] if isinstance(a,dict)]
            dateparts=(v.get('published') or {}).get('date-parts',[[]]); yr=year(dateparts[0][0]) if dateparts and dateparts[0] else None
            journal=title(v.get('container-title')); count=v.get('is-referenced-by-count')
            institutions=[]
        elif provider=='EuropePMC':
            identifier=doi(v.get('doi'));name=title(v.get('title'));yr=year(v.get('pubYear'))
            authors=[x.strip() for x in str(v.get('authorString') or '').split(',')[:6] if x.strip()]
            journal=title(v.get('journalTitle'));count=None;institutions=[]
        else:
            identifier=doi(v.get('doi'));name=title(v.get('title'));yr=year(v.get('publication_year'))
            authors=[title(a.get('author',{}).get('display_name')) for a in v.get('authorships',[])[:6] if isinstance(a,dict)]
            institutions=[title(i.get('display_name')) for a in v.get('authorships',[])[:6] if isinstance(a,dict)
                for i in a.get('institutions',[])[:2] if isinstance(i,dict)]
            journal=title(((v.get('primary_location') or {}).get('source') or {}).get('display_name'))
            count=v.get('cited_by_count')
        if not name or not identifier:continue
        output.append(dict(doi=identifier,title=name,year=yr,area=topic,authors=authors,
           journal=journal,institutions=institutions,providers=[provider],
           url='https://doi.org/'+quote(identifier,safe='/:;()'),
           citations=max(0,count) if isinstance(count,int) else None,
           measuredEfficiency=None,hydrogenYield=None,readiness='research_unreviewed',
           imageRights='not_checked',publicationStatus='draft_only'))
    return output

def main():
    RAW.mkdir(parents=True,exist_ok=True)
    queries=[' '.join(sys.argv[1:])] if len(sys.argv)>1 else TOPICS
    all_rows=[];errors=[]
    for q in queries:
        print('\nResearch:',q,flush=True)
        for provider in ('Crossref','EuropePMC','OpenAlex'):
            try:
                rows=ingest(provider,get(provider,q),q);all_rows.extend(rows)
                print(' ',provider,len(rows),'paper records',flush=True)
            except (HTTPError,URLError,TimeoutError,OSError,ValueError,KeyError) as exc:
                errors.append({'provider':provider,'topic':q,'error':str(exc)[:160]})
                print(' ',provider,'temporarily unavailable',flush=True)
            time.sleep(.65)
    unique={}
    for r in all_rows:
        key=r['doi']
        if key in unique:
            original=unique[key];original['providers']=sorted(set(original['providers']+r['providers']))
            for field in ('authors','institutions'):
                original[field]=list(dict.fromkeys(original[field]+r[field]))[:12]
            if original['citations'] is None:original['citations']=r['citations']
        else:unique[key]=r
    records=sorted(unique.values(),key=lambda r:(r['year'] or 0,len(r['providers'])),reverse=True)
    payload={'schemaVersion':1,'generatedAt':dt.datetime.now(dt.timezone.utc).isoformat(),
       'publishStatus':'draft_only','disclaimer':'Only bibliographic metadata verified. No efficiency, hydrogen yield, product readiness or rights claims.',
       'queries':queries,'errors':errors,'records':records}
    (OUT/'quick-card-candidates.json').write_text(json.dumps(payload,indent=2,ensure_ascii=False),encoding='utf-8')
    with (OUT/'research-papers.csv').open('w',encoding='utf-8',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=['area','title','year','doi','url','journal','authors','institutions','providers','citations'])
        writer.writeheader()
        for r in records:writer.writerow({k:', '.join(r[k]) if isinstance(r[k],list) else r[k] for k in writer.fieldnames})
    cards=''.join('<article><small>'+html.escape(str(r['area']))+' · '+str(r['year'] or '?')+'</small><h2>'+html.escape(r['title'])+'</h2><p>'+html.escape(r['journal'])+'</p><p><a href="'+html.escape(r['url'],quote=True)+'">Read original paper</a></p><p>Research draft: measurements and images unverified.</p></article>' for r in records)
    page='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>QuantaPhi Research Drafts</title><style>body{max-width:900px;margin:auto;padding:18px;background:#f3f5f9;font:18px/1.5 system-ui;color:#193040}article{background:white;border:1px solid #d8dfeb;border-radius:16px;margin:18px 0;padding:22px}h2{font-size:21px}a{color:#175189}</style><h1>QuantaPhi · Research Drafts</h1><p>Original research links, not published site cards.</p>'+cards
    (OUT/'research-cards.html').write_text(page,encoding='utf-8')
    print('\nSaved',len(records),'unique source-backed research candidates. Provider errors:',len(errors))
    print('FILES:',OUT/'quick-card-candidates.json',OUT/'research-papers.csv',OUT/'research-cards.html',sep='\n  ')
    return 0 if records else 2
if __name__=='__main__':sys.exit(main())
PY
python "$HOME/quanta-research/run.py" "$@"
