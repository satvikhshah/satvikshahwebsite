// Builds the publishable site into ./dist
// 1. Copies the static site (index.html, images, icons, admin panel …)
// 2. Turns every Markdown post in content/blog into its own page at /blog/<slug>/
// 3. Writes /blog/ (index), /blog/posts.json (used by the home page), /blog/feed.xml and /sitemap.xml
// Posts with `draft: true` are skipped, so drafts never reach the public site.

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { Marked } from "marked";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "dist");
const POSTS_DIR = path.join(ROOT, "content", "blog");
const SITE = "https://satvikshah.com";
const AUTHOR = "Satvik Shah";
const EMAIL = "satvikshah@jsassignments.com";
const PHONE = "+91 98980 12617";

const CATS = {
  finance: ["Finance & Decision Making", "Virtual CFO, MIS, working capital, profitability and cash flow."],
  tax: ["Taxation, Compliance & Governance", "Income tax, GST, audit, company law and governance."],
  systems: ["Systems, Technology & Automation", "Process design, AI, SOPs, internal controls and automation."],
  entre: ["Entrepreneurship & Business Building", "Execution, partnerships, strategy and brand building."],
  risk: ["Risk, Insurance & Financial Security", "Life insurance, risk perception and long-term discipline."],
  realestate: ["Real Estate & Property", "Transactions, land, title, tax and development partnerships."],
  people: ["Leadership & People", "Teams, mentoring, communication and workplace culture."],
  beyond: ["Beyond Business", "Reflections, books, sport, culture and life lessons."],
  ideas: ["Ideas in Progress", "Open questions and evolving views, labelled as untested."],
};
const IDEAS = [
  "A dashboard with forty numbers is a list. A dashboard with four numbers is a decision.",
  "If a task depends on someone remembering it, it is not yet a process.",
  "Cash flow is the truth that profit has to explain.",
  "Insurance bought after the need is visible is usually bought too late.",
  "The cheapest time to fix a land title problem is before you pay the advance.",
  "Every new venture shows you which of your old skills were really habits.",
];
const DISCLOSURE = {
  tax: "This article explains the law as understood on the date of publication. It is general information, not advice for your specific situation. Tax law changes, so check the current position or speak to a professional before acting.",
  realestate: "This article explains the law and practice as understood on the date of publication. It is general information, not advice for your specific transaction. Title questions should be reviewed by your advocate, and tax positions checked against the current law before acting.",
  risk: "General education on insurance and risk. Not a recommendation of any specific policy. Insurance is the subject matter of solicitation.",
  default: "General commentary for educational purposes. It is not advice for any specific business or situation.",
};

/* ---------- helpers ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const slugify = (s) => String(s).toLowerCase().replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const toDate = (v) => (v instanceof Date ? v : new Date(String(v)));
const dateLabel = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const iso = (d) => d.toISOString().slice(0, 10);
const write = (rel, content) => {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
};

/* ---------- 1. copy the static site ---------- */
const EXCLUDE = new Set(["dist", "node_modules", "content", "scripts", "package.json", "package-lock.json", "netlify.toml", "README.md"]);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const entry of fs.readdirSync(ROOT)) {
  if (EXCLUDE.has(entry) || entry.startsWith(".")) continue;
  fs.cpSync(path.join(ROOT, entry), path.join(OUT, entry), { recursive: true });
}

/* ---------- 2. shared page parts, taken from index.html so the design stays in one place ---------- */
const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const style = indexHtml.match(/<style>[\s\S]*?<\/style>/)[0];
const fontLink = (indexHtml.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/) || [""])[0];
const socials = [...indexHtml.matchAll(/\{key:"(\w+)",\s*label:"([^"]+)",\s*abbr:"([^"]+)",\s*url:"([^"]*)"/g)]
  .filter((m) => m[4])
  .map((m) => `<a class="soc" href="${esc(m[4])}" target="_blank" rel="noopener me" aria-label="${esc(m[2])}" title="${esc(m[2])}">${esc(m[3])}</a>`)
  .join("");
let footer = (indexHtml.match(/<footer class="site">[\s\S]*?<\/footer>/) || [""])[0];
footer = footer
  .replace(/(<div class="js-social"[^>]*>)(<\/div>)/, `$1${socials}$2`)
  .replace(/(<p class="js-email"[^>]*>)(<\/p>)/, `$1${esc(EMAIL)}$2`)
  .replace(/(<p class="js-phone"[^>]*>)(<\/p>)/, `$1${esc(PHONE)}$2`)
  .replace(/href="#([a-z-]+)"/g, 'href="/#$1"')
  .replace(/href="\/#blog"/g, 'href="/blog/"');

const BLOG_CSS = `<style>
.toc a{display:block;border-bottom:1px solid var(--stone);padding:9px 0;font:500 .9rem var(--f-body);color:var(--text);text-decoration:none}
.toc a:hover{color:var(--gold-ink)}
.prose ul,.prose ol{margin:0 0 18px;padding-left:22px}.prose li{margin:6px 0}
.prose h3{font-size:1.35rem;margin:30px 0 10px}
.prose a{color:var(--ink);text-decoration:none;border-bottom:1px solid var(--gold)}
.prose img{max-width:100%;height:auto;border:1px solid var(--rule)}
.prose code{font-family:var(--f-mono);font-size:.9em;background:var(--paper-2);padding:1px 5px}
.prose hr{border:0;border-top:3px double var(--rule);margin:36px 0}
.post-cover{margin:26px 0 0;max-width:900px}.post-cover img{display:block;width:100%;height:auto;border:1px solid var(--ink)}
.author img{width:72px;height:72px;object-fit:cover;border:1px solid var(--ink)}
.rss{font:500 .74rem var(--f-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.entry[hidden]{display:none}
</style>`;

const header = (active) => `<a class="skip" href="#main">Skip to content</a>
<header class="top">
  <div class="wrap">
    <a class="brand" href="/" aria-label="Satvik Shah, home"><b>Satvik Shah</b><span>CA · DISA · DIRM · MBA</span></a>
    <button class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="nav">Menu</button>
    <nav class="nav" id="nav" aria-label="Primary">
      <a href="/">Home</a><a href="/#about">About</a><a href="/#work">My Work</a><a href="/#advisory">Work With Me</a>
      <a href="/blog/"${active ? ' aria-current="page"' : ""}>Blog</a><a href="/#beyond">Beyond Work</a><a href="/#connect" class="nav-cta">Connect</a>
    </nav>
    <div class="socials">${socials}</div>
  </div>
</header>`;

const SCRIPT = `<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>
(function(){
  var b=document.getElementById("menuBtn"),n=document.getElementById("nav");
  if(b)b.addEventListener("click",function(){var o=n.classList.toggle("open");b.setAttribute("aria-expanded",String(o));});
  function toast(m){var t=document.getElementById("toast");t.textContent=m;t.classList.add("show");setTimeout(function(){t.classList.remove("show")},2000);}
  document.addEventListener("click",function(e){
    var c=e.target.closest("[data-copy-url]");
    if(c){var u=c.getAttribute("data-copy-url");try{navigator.clipboard.writeText(u).then(function(){toast("Link copied")});}catch(x){toast(u)}}
    var s=e.target.closest("[data-share]");
    if(s){var q="\\u201c"+s.getAttribute("data-share")+"\\u201d \\u00b7 Satvik Shah, ${SITE}/blog/";try{navigator.clipboard.writeText(q).then(function(){toast("Copied, ready to share")});}catch(x){}}
    var ch=e.target.closest(".chip[data-k]");
    if(ch){var k=ch.getAttribute("data-k");document.querySelectorAll(".chip[data-k]").forEach(function(x){x.setAttribute("aria-pressed",String(x===ch))});
      document.querySelectorAll(".entry[data-cat]").forEach(function(en){en.hidden=!!k&&en.getAttribute("data-cat")!==k});}
  });
})();
</script>`;

const page = ({ title, description, canonical, image, type = "website", jsonld = [], body, active = true, robots = "" }) => `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${robots ? `<meta name="robots" content="${robots}">\n` : ""}<link rel="canonical" href="${canonical}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="alternate" type="application/rss+xml" title="Satvik Shah · Blog" href="${SITE}/blog/feed.xml">
<meta name="theme-color" content="#142238">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fontLink}
${style}
${BLOG_CSS}
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n")}
</head>
<body class="notes-off">
${header(active)}
<main id="main" tabindex="-1">
${body}
</main>
${footer}
${SCRIPT}
</body>
</html>
`;

const entryHtml = (p) => `<a class="entry" href="${p.url}" data-cat="${p.category}"><span class="when">${esc(p.dateLabel)}</span><div><span class="cat">${esc(p.categoryName)}</span><h3>${esc(p.title)}</h3><p class="sum">${esc(p.summary)}</p></div><span class="rt">${p.readMins} min read</span></a>`;

/* ---------- 3. read and render posts ---------- */
const files = fs.existsSync(POSTS_DIR) ? fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md")) : [];
const posts = [];
let drafts = 0;
for (const file of files) {
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) { console.warn("Skipping (no front matter):", file); continue; }
  const fm = yaml.load(m[1]) || {};
  if (fm.draft === true || fm.draft === "true") { drafts++; continue; }
  if (!fm.title) { console.warn("Skipping (no title):", file); continue; }
  const slug = slugify(fm.slug || file.replace(/\.md$/, ""));
  const date = toDate(fm.date || Date.now());
  const toc = [];
  const md = new Marked({
    gfm: true,
    renderer: {
      heading(text, level, rawText) {
        if (level === 2) {
          const id = slugify(rawText) || `section-${toc.length + 1}`;
          toc.push({ id, text: rawText.replace(/<[^>]+>/g, "") });
          return `<h2 id="${id}">${text}</h2>\n`;
        }
        return `<h${level}>${text}</h${level}>\n`;
      },
    },
  });
  let html = md.parse(m[2]);
  html = html.replace(/<table>/g, '<div class="tbl"><table>').replace(/<\/table>/g, "</table></div>");
  const words = m[2].replace(/[#>*_|`-]/g, " ").split(/\s+/).filter(Boolean).length;
  const category = CATS[fm.category] ? fm.category : "ideas";
  posts.push({
    slug, url: `/blog/${slug}/`, title: String(fm.title), summary: String(fm.summary || ""),
    category, categoryName: CATS[category][0], date, dateIso: iso(date), dateLabel: dateLabel(date),
    readMins: Math.max(1, Math.round(words / 220)), cover: fm.cover ? String(fm.cover) : "", html, toc,
  });
}
posts.sort((a, b) => b.date - a.date);

/* ---------- 4. post pages ---------- */
for (const p of posts) {
  const url = SITE + p.url;
  const image = p.cover ? (p.cover.startsWith("http") ? p.cover : SITE + p.cover) : `${SITE}/img/og-share.jpg`;
  const related = [...posts.filter((q) => q !== p && q.category === p.category), ...posts.filter((q) => q !== p && q.category !== p.category)].slice(0, 2);
  const share = encodeURIComponent(url);
  const body = `<section class="phead">
  <div class="wrap art-head">
    <a class="link" href="/blog/"><span class="arrow">←</span> Blog</a>
    <p class="eyebrow" style="margin-top:28px">${esc(p.categoryName)}</p>
    <h1>${esc(p.title)}</h1>
    ${p.summary ? `<p class="lede">${esc(p.summary)}</p>` : ""}
    <div class="art-meta"><span>By ${AUTHOR}</span><span>Published · <time datetime="${p.dateIso}">${esc(p.dateLabel)}</time></span><span>${p.readMins} min read</span></div>
    ${p.cover ? `<figure class="post-cover"><img src="${esc(p.cover)}" alt="" loading="eager"></figure>` : ""}
  </div>
</section>
<section class="sec">
  <div class="wrap art-layout">
    <nav class="toc" aria-label="Contents">${p.toc.length ? `<h4>Contents</h4>${p.toc.map((t) => `<a href="#${t.id}">${esc(t.text)}</a>`).join("")}` : ""}</nav>
    <article class="prose">
${p.html}
      <div class="share" aria-label="Share this article">
        <span class="eyebrow" style="margin-right:6px">Share</span>
        <a class="btn ghost small" target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=${share}">LinkedIn</a>
        <a class="btn ghost small" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(p.title + " by Satvik Shah " + url)}">WhatsApp</a>
        <button class="btn ghost small" data-copy-url="${url}">Copy link</button>
      </div>
      <div class="author">
        <img src="/img/hero.jpg" alt="Satvik Shah" width="72" height="72" loading="lazy">
        <div>
          <p class="eyebrow">About the author</p>
          <p style="margin-top:6px;font-size:1rem">Satvik Shah is a Chartered Accountant (2006) and a promoter director of JS Assignments Private Limited, where he leads virtual CFO, MIS and process-automation work for owner-managed businesses. He holds the DISA and DIRM qualifications and an MBA in Insurance and Financial Planning. <a class="link" href="/#about">More about Satvik</a> · <a class="link" href="/#connect">Get in touch</a></p>
        </div>
      </div>
      <p class="disclosure">${esc(DISCLOSURE[p.category] || DISCLOSURE.default)}</p>
      ${related.length ? `<h2 style="font-size:1.4rem">Related reading</h2><div class="register">${related.map(entryHtml).join("")}</div>` : ""}
    </article>
  </div>
</section>`;
  const jsonld = [
    {
      "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: p.summary,
      datePublished: p.dateIso, dateModified: p.dateIso, image, url, mainEntityOfPage: url, articleSection: p.categoryName,
      author: { "@type": "Person", name: AUTHOR, url: SITE + "/" }, publisher: { "@type": "Person", name: AUTHOR, url: SITE + "/" },
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
        { "@type": "ListItem", position: 2, name: "Blog", item: SITE + "/blog/" },
        { "@type": "ListItem", position: 3, name: p.title, item: url },
      ],
    },
  ];
  write(`blog/${p.slug}/index.html`, page({ title: `${p.title} · Satvik Shah`, description: p.summary || p.title, canonical: url, image, type: "article", jsonld, body }));
}

/* ---------- 5. blog index ---------- */
const usedCats = Object.keys(CATS).filter((k) => posts.some((p) => p.category === k));
const indexBody = `<section class="phead">
  <div class="wrap">
    <span class="eyebrow">Blog</span>
    <h1>Ideas, observations, <em>experiences and lessons.</em></h1>
    <p class="lede">Practical notes on finance, tax, systems, property, insurance and building businesses, from two decades of work as a Chartered Accountant, virtual CFO and entrepreneur.</p>
  </div>
</section>
<section class="sec">
  <div class="wrap sheet">
    <div class="folio">L.F.<b>41</b></div>
    <div class="body">
      ${usedCats.length > 1 ? `<p class="flabel">Browse by topic</p><div class="chips" role="group" aria-label="Filter by topic"><button class="chip" data-k="" aria-pressed="true">All</button>${usedCats.map((k) => `<button class="chip" data-k="${k}" aria-pressed="false">${esc(CATS[k][0])}</button>`).join("")}</div>` : ""}
      <div class="register">${posts.length ? posts.map(entryHtml).join("") : `<div class="empty">New articles are on their way. <a class="link" href="/#connect">Suggest a topic</a></div>`}</div>
      <p class="rss" style="margin-top:20px"><a class="link" href="/blog/feed.xml">RSS feed</a> · New posts also appear on <a class="link" href="https://www.linkedin.com/in/satvik-shah-40106a8" target="_blank" rel="noopener">LinkedIn</a></p>
    </div>
  </div>
</section>
<section class="sec" aria-labelledby="h-ideas">
  <div class="wrap sheet">
    <div class="folio">L.F.<b>42</b></div>
    <div class="body">
      <div class="sec-head"><span class="eyebrow">Ideas worth sharing</span><h2 id="h-ideas">Short observations, <span class="total">free to pass on.</span></h2></div>
      <div class="ideas">${IDEAS.map((t) => `<div class="idea"><p>${esc(t)}</p><button class="copy-btn" data-share="${esc(t)}">Copy &amp; share</button></div>`).join("")}</div>
    </div>
  </div>
</section>
<section class="band"><div class="wrap"><span class="eyebrow">Have a question?</span><h2 style="margin-top:16px">Tell me what you are deciding. I may write about it next.</h2><div class="btns" style="margin-top:28px"><a class="btn primary" href="/#connect">Start a conversation <span class="arrow">→</span></a></div></div></section>`;
write("blog/index.html", page({
  title: "Blog · Satvik Shah",
  description: "Articles by CA Satvik Shah on finance, MIS, tax, property transactions, insurance, systems and building businesses.",
  canonical: `${SITE}/blog/`, image: `${SITE}/img/og-share.jpg`,
  jsonld: [{ "@context": "https://schema.org", "@type": "Blog", name: "Satvik Shah · Blog", url: `${SITE}/blog/`, author: { "@type": "Person", name: AUTHOR, url: SITE + "/" } }],
  body: indexBody,
}));

/* ---------- 6. data, feed, sitemap ---------- */
write("blog/posts.json", JSON.stringify(posts.map(({ slug, url, title, summary, category, categoryName, dateIso, dateLabel, readMins }) => ({ slug, url, title, summary, category, categoryName, date: dateIso, dateLabel, readMins })), null, 2));

const rssItems = posts.map((p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE}${p.url}</link>
      <guid isPermaLink="true">${SITE}${p.url}</guid>
      <pubDate>${p.date.toUTCString()}</pubDate>
      <category>${esc(p.categoryName)}</category>
      <description>${esc(p.summary)}</description>
    </item>`).join("\n");
write("blog/feed.xml", `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Satvik Shah · Blog</title>
    <link>${SITE}/blog/</link>
    <description>Ideas, observations and lessons from business and life.</description>
    <language>en-IN</language>
${rssItems}
  </channel>
</rss>
`);

const today = iso(new Date());
const urls = [[`${SITE}/`, today], [`${SITE}/blog/`, posts[0] ? posts[0].dateIso : today], ...posts.map((p) => [SITE + p.url, p.dateIso])];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, d]) => `  <url><loc>${u}</loc><lastmod>${d}</lastmod></url>`).join("\n")}
</urlset>
`);

console.log(`Built ${posts.length} published post(s); skipped ${drafts} draft(s). Output: dist/`);
