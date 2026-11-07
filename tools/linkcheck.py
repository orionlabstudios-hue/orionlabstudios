# Release check for the website. Run from anywhere: python tools/linkcheck.py [folder]
# - Every internal link and anchor must resolve to a real file and id.
# - No page may still hold the release-day token, or an address that must never be published.
# - Every external link is requested once (a failure is printed, it does not fail the run).
# Prints ratios, and has controls that must be caught. Exit 0 = pass, 1 = fail.
import html.parser, pathlib, sys, urllib.error, urllib.parse, urllib.request

ROOT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent
BASE_HOSTS = {"orionlabstudio.com", "www.orionlabstudio.com"}
# Text that must be on no page when a release ships.
#   %%RELEASE_DAY%% stands in for a "Last updated" date until the release day is known.
#   The admin address is for business accounts only.
FORBIDDEN = ["%%RELEASE_DAY%%", "admin@orionlabstudio.com"]


def forbidden_in(text):
    return [f for f in FORBIDDEN if f in text]


class P(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.links, self.ids = [], set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            self.ids.add(a["id"])
        if tag == "a" and a.get("name"):
            self.ids.add(a["name"])
        for k in ("href", "src", "content" if a.get("property") == "og:image" else "_"):
            if a.get(k):
                self.links.append(a[k])


def parse(path):
    p = P()
    p.feed(path.read_text(encoding="utf-8"))
    return p


pages = [p for p in sorted(ROOT.rglob("*.html")) if ".git" not in p.parts]
parsed = {p: parse(p) for p in pages}


def target(page, url):
    u = urllib.parse.urlsplit(url)
    if u.scheme or u.netloc:
        return None, None
    path = urllib.parse.unquote(u.path)
    if not path:
        return page, u.fragment
    t = (ROOT / path.lstrip("/")) if path.startswith("/") else (page.parent / path)
    if path.endswith("/") or t.is_dir():
        t = t / "index.html"
    return t, u.fragment


def check_internal(page, url):
    t, frag = target(page, url)
    if not t.exists():
        return "no file"
    if frag and t.suffix == ".html":
        if frag not in parsed.get(t, parse(t)).ids:
            return "no anchor"
    return None


internal = external = mail = bad = 0
ext = {}
for page, p in parsed.items():
    for url in p.links:
        u = urllib.parse.urlsplit(url)
        if u.scheme in ("mailto", "tel"):
            mail += 1
            continue
        if u.scheme in ("data", "javascript"):
            continue
        if u.scheme in ("http", "https") or url.startswith("//"):
            if u.hostname in BASE_HOSTS:
                internal += 1
                local = urllib.parse.urlunsplit(("", "", u.path or "/", "", u.fragment))
                why = check_internal(page, local)
                if why:
                    bad += 1
                    print(f"BROKEN {why}: {page.relative_to(ROOT).as_posix()} -> {url}")
            else:
                external += 1
                ext.setdefault(url, page.relative_to(ROOT).as_posix())
            continue
        internal += 1
        why = check_internal(page, url)
        if why:
            bad += 1
            print(f"BROKEN {why}: {page.relative_to(ROOT).as_posix()} -> {url}")

control = check_internal(pages[0], "/this-page-must-not-exist/")
print(f"control (a page that does not exist): {'reported broken, good' if control else 'NOT CAUGHT - this check is void'}")

held = 0
for page in pages:
    found = forbidden_in(page.read_text(encoding="utf-8"))
    if found:
        held += 1
        print(f"NOT READY TO RELEASE: {page.relative_to(ROOT).as_posix()} holds {', '.join(found)}")
caught = all(forbidden_in(f"x {f} x") == [f] for f in FORBIDDEN) and not forbidden_in("x")
print(f"control (each forbidden text in a test string, and a clean string): {'caught, good' if caught else 'NOT CAUGHT - this check is void'}")
print(f"pages free of forbidden text: {len(pages) - held}/{len(pages)}")

ext_ok = 0
for url, where in sorted(ext.items()):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 link-check"})
        with urllib.request.urlopen(req, timeout=20) as r:
            ext_ok += 1
    except urllib.error.HTTPError as e:
        print(f"EXTERNAL {e.code}: {url} (from {where})")
    except Exception as e:
        print(f"EXTERNAL failed: {url} (from {where}) {type(e).__name__}")
print(f"pages {len(pages)}; internal links good {internal - bad}/{internal}; mail links {mail}; external addresses good {ext_ok}/{len(ext)}")
sys.exit(1 if bad or held or not control or not caught else 0)
