export const EMBED_HOSTS =
  /(^|\.)(vidsrc\.(xyz|me|net|to|in|cc|pro|io)|2embed\.(cc|to|ru)|vidlink\.pro|cloudnestra\.com|multiembed\.com|vidbinge\.(com|dev)|vsrc\.(net|xyz)|smashystream\.[a-z]+|moviesapi\.[a-z]+)$/i;

const AD_HOST =
  /(doubleclick|googlesyndication|googleadservices|adservice\.google|imasdk|adsbygoogle|prebid|amazon-adsystem|pubmatic|rubiconproject|criteo|taboola|outbrain|popads|popcash|propellerads|histats|juicyads|exoclick|trafficjunky|mgid|revcontent|adnxs|smartadserver|casalemedia|33across|sharethrough|teads|vungle|unityads|chartboost|applovin|clickadu|hilltopads|onclickads|adsterra|monetag|profitableratecpm|adcash|bidvertiser|zedo|adform|flashtalking|serving-sys|media\.net)/i;

export const isAdUrl = (u) => AD_HOST.test(u);

const abs = (u, base) => {
  try {
    return new URL(u, base).href;
  } catch {
    return null;
  }
};

const BRIDGE = `<script>(function(){
var o=window.open;window.open=function(){try{return o.apply(window,arguments)}catch(e){return null}};
window.onbeforeunload=null;window.alert=function(){};
function fix(){document.querySelectorAll('a[target]').forEach(function(a){a.target='_self'});
document.querySelectorAll('iframe').forEach(function(f){if(/${AD_HOST.source}/i.test(f.src))f.remove()})}
document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[target]');if(a)a.target='_self'},true);
document.addEventListener('DOMContentLoaded',fix);
})();</script>`;

export function rewriteHtml(html, base, origin) {
  const px = (u) => `${origin}/api/player/asset?url=${encodeURIComponent(u)}`;

  let out = html.replace(
    /<meta[^>]+http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi,
    "",
  );

  out = out.replace(
    /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (m, src) => (isAdUrl(src) ? "" : m),
  );

  out = out.replace(
    /<iframe\b[^>]*\bsrc=["']([^"']+)["'][^>]*>(?:<\/iframe>)?/gi,
    (m, src) => (isAdUrl(src) ? "" : m),
  );

  out = out.replace(
    /\b(src|href|poster|data-src|action)=["']([^"']+)["']/gi,
    (m, attr, val) => {
      if (/^(data:|blob:|javascript:|#|about:)/i.test(val)) return m;
      const a = abs(val, base);
      return a ? `${attr}="${px(a)}"` : m;
    },
  );

  const head = `<base href="${base}">${BRIDGE}`;
  return /<head[^>]*>/i.test(out)
    ? out.replace(/<head[^>]*>/i, (m) => m + head)
    : head + out;
}

// Cuts CUE-OUT/CUE-IN ad blocks and re-points every URI at the proxy.
export function filterPlaylist(text, base, origin) {
  const px = (u) =>
    `${origin}/api/player/asset?url=${encodeURIComponent(abs(u, base) ?? u)}`;

  const lines = text.split(/\r?\n/);
  const sawCue = lines.some((l) => l.trim().startsWith("#EXT-X-CUE-OUT"));

  const out = [];
  let cue = false;
  let dropped = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("#EXT-X-CUE-IN")) {
      cue = false;
      continue;
    }
    if (line.startsWith("#EXT-X-CUE-OUT")) {
      cue = true;
      continue;
    }
    if (/^#EXT-X-(SCTE35|ASSET|DATERANGE)/.test(line)) continue;
    if (line.startsWith("#EXT-OATCLS-SCTE35")) continue;

    if (line.startsWith("#")) {
      out.push(line.replace(/URI="([^"]+)"/g, (_m, u) => `URI="${px(u)}"`));
      continue;
    }

    if (sawCue && cue) {
      dropped = true;
      continue;
    }
    if (dropped) {
      out.push("#EXT-X-DISCONTINUITY");
      dropped = false;
    }
    out.push(px(line));
  }

  return out.join("\n") + "\n";
}

export function upstreamHeaders(req, target) {
  const h = {
    "user-agent":
      req.headers.get("user-agent") ??
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    accept: req.headers.get("accept") ?? "*/*",
    referer: `https://${target.hostname}/`,
    origin: `https://${target.hostname}`,
  };

  const range = req.headers.get("range");
  if (range) h.range = range;

  return h;
}
