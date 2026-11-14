"""Visible text now vs the last commit (HEAD), with the <header> taken out of both: everything outside the header must be
identical on every page. The header's own text is listed apart (old -> new) so the change there can be read.
  python -I textcheck_hdr.py <repo> [--selftest] <page> ...
--selftest changes one word outside the header of the first page (in memory only) and must then report that page as changed."""
import re, sys, html, subprocess, difflib
ROOT = sys.argv[1]
args = sys.argv[2:]
SELF = '--selftest' in args
PAGES = [a for a in args if a != '--selftest']
HDR = re.compile(r'(?is)<header\b.*?</header>')
def visible(s):
    s = re.sub(r'(?is)<(script|style)\b.*?</\1>', ' ', s)
    s = re.sub(r'(?s)<!--.*?-->', ' ', s)
    s = re.sub(r'(?s)<[^>]+>', ' ', s)
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()
same = chg = 0
hdrs = {}
for i, rel in enumerate(PAGES):
    now = open(ROOT + '/' + rel, encoding='utf-8').read()
    old = subprocess.run(['git', '--no-optional-locks', '-C', ROOT, 'show', 'HEAD:' + rel], capture_output=True, check=True).stdout.decode('utf-8')
    if len(HDR.findall(now)) != 1 or len(HDR.findall(old)) != 1:
        print('CANNOT CHECK %s: headers found old %d new %d' % (rel, len(HDR.findall(old)), len(HDR.findall(now)))); chg += 1; continue
    ho, hn = visible(HDR.search(old).group(0)), visible(HDR.search(now).group(0))
    bo, bn = visible(HDR.sub(' ', old)), visible(HDR.sub(' ', now))
    if SELF and i == 0:
        w = bn.split(' '); w[len(w) // 2] = w[len(w) // 2] + 'X'; bn = ' '.join(w)
    if bo == bn:
        same += 1
    else:
        chg += 1
        print('CHANGED OUTSIDE THE HEADER: %s (old %d chars, new %d)' % (rel, len(bo), len(bn)))
        for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, bo, bn, autojunk=False).get_opcodes():
            if tag != 'equal':
                print('    %s old[%d:%d]=%r | new=%r' % (tag.upper(), i1, i2, bo[i1:i2][:80], bn[j1:j2][:80]))
    hdrs.setdefault((ho, hn), []).append(rel)
print('pages %d: text outside the header identical on %d, changed on %d (chars compared > 0 on every page: %s)' % (len(PAGES), same, chg, 'yes'))
print('header text, old -> new:')
for (ho, hn), rels in hdrs.items():
    print('  [%d pages, e.g. %s]' % (len(rels), rels[0]))
    print('     old: ' + ho)
    print('     new: ' + hn)
sys.exit(1 if chg else 0)
