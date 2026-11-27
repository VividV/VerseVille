import json, re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from verses import V, LINKS, TOPICS
S = sys.argv[1]; OUT = sys.argv[2]
A = {b['name']: b['chapters'] for b in json.load(open(f'{S}/kjv-a/kjv.json', encoding='utf-8-sig'))}
def bname(n): return {'I ':'1 ','II ':'2 ','III ':'3 '}.get(n.split(' ')[0]+' ', n.split(' ')[0]+' ') + ' '.join(n.split(' ')[1:]) if n.split(' ')[0] in ('I','II','III') else n
B = {bname(b['name']): {c['chapter']: {v['verse']: v['text'] for v in c['verses']} for c in b['chapters']} for b in json.load(open(f'{S}/kjv-b/kjv.json', encoding='utf-8-sig'))['books']}

def clean(t):
    t = re.sub(r'\s+([,.;:?!])', r'\1', t)   # "already ." -> "already."
    t = re.sub(r'\s+', ' ', t).strip()
    return t
def toks(t): return re.sub(r"[^a-z0-9' ]", ' ', t.lower().replace('’', "'")).split()

def ref(book, c, v):
    name = 'Psalm' if book == 'Psalms' else book
    return f'{name} {c}:{v}'
def sid(book, c, v):
    return re.sub(r'[^a-z0-9]+', '-', ref(book, c, v).lower()).strip('-') + '-kjv'

problems = []
out = []
topic_ids = {t[0] for t in TOPICS}
for book, c, v, topics, expl in V:
    a = clean(A[book][c-1][v-1]); b = clean(B[book][c][v])
    ta, tb = toks(a), toks(b)
    if ta != tb:
        problems.append((ref(book,c,v), a, b))
    assert all(t in topic_ids for t in topics), (book,c,v,topics)
    wc = len(a.split())
    out.append(dict(id=sid(book,c,v), book=book, chapter=c, verse=v, reference=ref(book,c,v), translation='KJV',
        text=a, topicIds=topics, explanation=expl, relatedScriptureIds=[],
        difficulty=1 if wc <= 12 else 2 if wc <= 22 else 3, wordCount=wc, isActive=True))

byid = {s['id']: s for s in out}
assert len(byid) == len(out), 'duplicate ids'
def link(x, y):
    if y not in byid[x]['relatedScriptureIds']: byid[x]['relatedScriptureIds'].append(y)
for (p, q) in LINKS:
    x, y = sid(*p), sid(*q); link(x, y); link(y, x)
# Fill up to 3 related verses by most shared topics (stable order).
for s in out:
    cands = sorted((o for o in out if o['id'] != s['id'] and o['id'] not in s['relatedScriptureIds']),
                   key=lambda o: -len(set(o['topicIds']) & set(s['topicIds'])))
    for o in cands:
        if len(s['relatedScriptureIds']) >= 3: break
        if set(o['topicIds']) & set(s['topicIds']): s['relatedScriptureIds'].append(o['id'])

for r, a, b in problems: print('MISMATCH', r, '\n  A:', a, '\n  B:', b)
print(len(out), 'verses,', len(problems), 'mismatches')
json.dump(out, open(f'{OUT}/scriptures.json', 'w'), indent=2, ensure_ascii=False)
used = sorted({t for s in out for t in s['topicIds']})
json.dump([dict(id=i, name=n, icon=ic) for i, n, ic in TOPICS if i in used], open(f'{OUT}/topics.json', 'w'), indent=2, ensure_ascii=False)
