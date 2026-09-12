/* 루슈닉 회화수첩 — 오프라인 캐시 */
const SHELL = "rushnyk-shell-v1";
const MEDIA = "rushnyk-media-v1";
const CORE = ["./", "./index.html"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== MEDIA).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 오디오 트랙: 한 번 재생하면 저장 → 다음부터 오프라인 재생
  if (/\.(mp3|wav|m4a)$/i.test(url.pathname)) {
    e.respondWith(
      caches.open(MEDIA).then(async cache => {
        const hit = await cache.match(req, { ignoreVary: true, ignoreSearch: true });
        if (hit) return hit;
        try {
          const res = await fetch(req.url, { mode: "no-cors" });
          cache.put(req, res.clone()).catch(() => {});
          return res;
        } catch (err) {
          return new Response("", { status: 504 });
        }
      })
    );
    return;
  }

  // 앱 화면: 캐시 우선, 온라인이면 조용히 갱신
  if (url.origin === location.origin) {
    e.respondWith(
      caches.open(SHELL).then(async cache => {
        const hit = await cache.match(req, { ignoreSearch: true });
        const net = fetch(req).then(res => {
          if (res && res.status === 200) cache.put(req, res.clone()).catch(() => {});
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
