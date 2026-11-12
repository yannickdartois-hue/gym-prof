/* Hors ligne. À chaque mise en ligne : augmenter VERSION (gym-prof-vN). */
const VERSION='gym-prof-v31';
// Toutes les applis partagent le même stockage (même adresse github.io) : on n'efface QUE les anciennes versions de CETTE appli.
const MES_CACHES=/^gym-prof-v\d+$/;
const sous3s=p=>{p.catch(()=>{});return Promise.race([p,new Promise((_,non)=>setTimeout(()=>non(new Error('réseau lent')),3000))])};
const FICHIERS=['./','index.html','prof.js','prof-valid.js','prof-oubli.js','eps-code.js','eps-maj.js','eps-coffre.js','eps-garde.js','eps-avatars.js','img/avatars/prof.webp','img/avatars/tableau.webp','aide.js','eps-aide.js','prof-demo.js','prof-suivi.js','donnees.js','qrcode.js','jsqr.js','scan.js','xlsx.js','jszip.js','eps-charte-v1.css','manifest.webmanifest',
  'icon-32.png','icon-180.png','icon-192.png','icon-512.png','polices/archivo.woff2','polices/atkinson-400.woff2','polices/atkinson-700.woff2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FICHIERS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>MES_CACHES.test(k)&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  const net=fetch(e.request,{cache:'no-cache'}).then(r=>{if(r.status===200){const c=r.clone();caches.open(VERSION).then(x=>x.put(e.request,c))}return r});
  e.respondWith(sous3s(net).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(h=>h||net)));
});
