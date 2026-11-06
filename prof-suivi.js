/* =====================================================================
   prof-suivi.js — outils de suivi de l'outil prof (chargé avant prof.js,
   utilisé au moment de l'affichage)
   - Note : 16 points sur la validation des items (niveaux P), 4 points de
     participation (proposée d'après les observations faites pour les
     camarades, modifiable élève par élève).
   - Rafales : plusieurs validations E en quelques minutes → « ⚡ à vérifier ».
   - Vue par atelier (groupes de besoin, parade) et bilan de séance.
   ===================================================================== */

'use strict';
const RAFALE={n:4,min:10};
function bareme(){const B=DB.bareme||{};return {val:(B.val&&B.val.length===6)?B.val.slice():[1,2,3,4,5,6],nat:B.nat||6,cible:B.cible||8}}
const fmt=x=>x==null?'Disp.':(Math.round(x*10)/10).toString().replace('.',',');
const niveauDe=k=>{const a=GYM.ateliers.find(x=>x.n===+k[0]);return a&&a.niv.find(n=>n.n===k[1])};
function nomPiece(p){if(p[0]==='L'){const f=GYM.fiches[p.slice(1)];return f?'liaison « '+f.t+' »':'liaison'}const n=niveauDe(p);return n?n.nom+' ('+p[1]+')':p}
// Observations faites par cet élève pour ses camarades (E où il est noté comme observateur)
// Seules comptent les observations confirmées ensuite par une validation P du professeur : valider n'importe quoi ne rapporte rien.
// L'observateur arrive en nom complet (anciennes fiches : prénom seul).
function observations(E,c){const nc=norm(E.nom),p=norm(prenom(E.nom));let n=0;elevesClasse(c).forEach(x=>{if(x.E===E)return;Object.values(x.E.v).forEach(v=>{if(v.e&&v.p&&!v.pp&&v.par&&(norm(v.par)===nc||norm(v.par)===p))n++})});return n}
function partAuto(obs){const B=bareme();return Math.min(4,Math.round(obs/B.cible*4*2)/2)}
/* Statut (fiche élève) : E.st = '' apte · 'ip' inapte partiel (E.excl = ateliers non évalués) · 'disp' dispensé du cycle (pas de note). */
const ateliersNotes=E=>E.st==='ip'?GYM.ateliers.filter(a=>!(E.excl||[]).includes(a.n)):GYM.ateliers;
function note(E,c){
  const B=bareme(),max=B.val[5]||1,AT=ateliersNotes(E);
  if(E.st==='disp'||!AT.length)return {items:null,part:null,partAuto:false,total:null,disp:true};
  const nat=Math.min(B.nat,AT.length);
  const pts=AT.map(a=>{const p=meilleur(E,a.n,'p');return p?B.val[NIVS.indexOf(p)]:0}).sort((x,y)=>y-x).slice(0,nat);
  const items=Math.min(16,16*pts.reduce((s,x)=>s+x,0)/(nat*max));
  const auto=E.part==null,part=auto?partAuto(observations(E,c)):E.part;
  return {items,part,partAuto:auto,total:items+part};
}
function rafale(E){
  const T=Object.values(E.v).filter(v=>v.e&&!v.pp&&v.par&&!/^(professeur|récupéré)$/.test(v.par)).map(v=>v.e).sort((a,b)=>a-b);
  for(let i=0;i+RAFALE.n-1<T.length;i++)if(T[i+RAFALE.n-1]-T[i]<=RAFALE.min*60000)return new Date(T[i]).toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  return '';
}
function basculeVue(){return `<div class="qui"><button type="button" class="${DB.vueAt?'':'ici'}" data-act="vueat" data-v="0">Par élève</button><button type="button" class="${DB.vueAt?'ici':''}" data-act="vueat" data-v="${DB.vueAt||1}">Par atelier</button></div>`}
function vParAtelier(){
  const a=GYM.ateliers[(DB.vueAt||1)-1],L=elevesClasse(DB.classe),auj=new Date().toDateString();
  const col=lv=>L.filter(x=>meilleur(x.E,a.n,'p')===lv);
  return `<h2>Classe ${esc(DB.classe)}</h2>${basculeVue()}
  <div class="qui">${GYM.ateliers.map(x=>`<button type="button" class="${x.n===a.n?'ici':''}" ${st(x.n)} data-act="vueat" data-v="${x.n}">${x.n} · ${esc(x.court)}</button>`).join('')}</div>
  <p class="small muted">Meilleur niveau validé <b>P</b> sur l’atelier ${a.n}. 🎯 = objectif du jour sur cet atelier · <span class="eseul"><span class="L LB">B</span><small>E</small></span> = niveau suivant déjà validé E.</p>
  <div class="paratelier">${['',...NIVS].map(lv=>`<section class="carte" ${st(a.n)}><h3>${lv?`<span class="L L${lv}" style="width:36px;height:36px;font-size:20px">${lv}</span> ${esc(a.niv[NIVS.indexOf(lv)].nom)}`:'Aucun niveau P'}</h3>
    ${col(lv).map(x=>{const e=meilleur(x.E,a.n,'e'),ob=x.E.obj&&new Date(x.E.obj.t).toDateString()===auj&&+x.E.obj.k[0]===a.n?x.E.obj.k[1]:'';return `<button type="button" class="ligne-el" data-act="eleve" data-v="${esc(x.k)}">${esc(x.nom)}${e&&e!==lv?` <span class="eseul"><span class="L L${e}">${e}</span><small>E</small></span>`:''}${ob?` 🎯${ob}`:''}</button>`}).join('')||'<p class="small muted">—</p>'}</section>`).join('')}</div>`;
}
function vBilan(){
  if(!DB.classe)return '';
  const j=DB.bilanJ||Date.now(),d=new Date(j),jour=d.toDateString(),iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const L=elevesClasse(DB.classe).map(x=>{let e=0,p=0;Object.values(x.E.v).forEach(v=>{if(v.e&&!v.pp&&new Date(v.e).toDateString()===jour)e++;if(v.p&&new Date(v.p).toDateString()===jour)p++});
    const ob=x.E.obj&&new Date(x.E.obj.t).toDateString()===jour?x.E.obj.k:'';return {x,e,p,ob}});
  const actifs=L.filter(y=>y.e||y.p).length;
  return `<section class="carte"><h3>📋 Bilan de séance · ${esc(DB.classe)}</h3>
   <div class="rangee"><input id="bilan-date" type="date" value="${iso}" style="max-width:220px"><span class="small muted">${actifs} élève${actifs>1?'s':''} sur ${L.length} avec au moins une validation ce jour</span></div>
   <table class="tab" style="margin-top:8px"><thead><tr><th style="text-align:left">Élève</th><th>E</th><th>P</th><th>Objectif</th></tr></thead><tbody>
   ${L.sort((a,b)=>(a.e+a.p)-(b.e+b.p)||triNom(a.x.nom,b.x.nom)).map(y=>`<tr data-act="eleve" data-v="${esc(y.x.k)}" ${y.e+y.p?'':'style="background:#fff4f2"'}><td style="text-align:left">${esc(y.x.nom)}${rafale(y.x.E)?' ⚡':''}</td><td>${y.e||'·'}</td><td>${y.p||'·'}</td><td>${y.ob?y.ob[0]+' · '+y.ob[1]:''}</td></tr>`).join('')}</tbody></table>
   <p class="small muted">En rose : aucune validation ce jour (fiche non reçue, absent, ou groupe qui n’avance pas). Les données dépendent des fiches reçues.</p></section>`;
}
function vBareme(){
  const B=bareme();
  return `<section class="carte"><h3>📐 Barème (note sur 20)</h3>
   <p class="small muted"><b>16 points sur la validation des items</b> : pour chaque atelier, le meilleur niveau validé <b>P</b> rapporte des points (ci-dessous). On garde les meilleurs ateliers, puis on ramène sur 16. <b>4 points de participation</b> : proposés d’après le nombre d’observations justes faites pour les camarades (E confirmé ensuite par votre P), modifiables dans la fiche de chaque élève.</p>
   <div class="bareme">${NIVS.map((n,i)=>`<label><span class="L L${n}">${n}</span><input type="number" min="0" step="0.5" inputmode="decimal" data-bar="${i}" value="${B.val[i]}"></label>`).join('')}</div>
   <div class="rangee" style="margin-top:10px"><label class="small"><b>Ateliers retenus</b> (les meilleurs) <input type="number" min="1" max="6" data-bar="nat" value="${B.nat}" style="width:90px"></label>
   <label class="small"><b>Observations pour 4/4</b> <input type="number" min="1" data-bar="cible" value="${B.cible}" style="width:90px"></label></div>
   <p class="small muted">Exemple : niveaux P en C, D, B, E, A et aucun → (3+4+2+5+1+0) / (${B.nat} × ${B.val[5]}) × 16 = <b>${fmt(Math.min(16,16*([3,4,2,5,1,0].map(x=>x?B.val[x-1]:0).sort((a,b)=>b-a).slice(0,B.nat).reduce((s,x)=>s+x,0))/(B.nat*(B.val[5]||1))))}</b> / 16.</p></section>`;
}

/* ---------- Critères ratés (déclarés par les observateurs : « Pas encore réussi ») ---------- */
function vRates(a){
  const L=elevesClasse(DB.classe),lignes=[];
  a.niv.forEach(n=>{const k=a.n+n.n,tot=[0,0,0,0];let qui=0;L.forEach(x=>{const r=(x.E.rate||{})[k];if(r){qui++;r.forEach((c,i)=>tot[i]+=c)}});
    if(qui)lignes.push({n,tot,qui})});
  if(!lignes.length)return `<section class="carte"><h3>❌ Critères ratés · atelier ${a.n}</h3><p class="small muted">Rien de signalé pour l’instant (bouton « Pas encore réussi » des tablettes).</p></section>`;
  const lab=n=>[n.crit[0],n.crit[1],'Réussi du premier coup','Réception maîtrisée'];
  return `<section class="carte"><h3>❌ Critères ratés · atelier ${a.n}</h3><p class="small muted">Nombre d’essais ratés signalés par les observateurs, par critère. Les plus hauts = priorités de remédiation collective.</p>
   ${lignes.map(({n,tot,qui})=>{const m=Math.max(...tot)||1;return `<div class="rate"><b><span class="L L${n.n}" style="width:30px;height:30px;font-size:18px">${n.n}</span> ${esc(n.nom)} <span class="small muted">(${qui} élève${qui>1?'s':''})</span></b>
     ${lab(n).map((l,i)=>tot[i]?`<div class="barre-rate"><span>${esc(l)}</span><i style="width:${Math.round(100*tot[i]/m)}%"></i><b>${tot[i]}</b></div>`:'').join('')}</div>`}).join('')}</section>`;
}
{const _vpa=vParAtelier;vParAtelier=function(){return _vpa()+vRates(GYM.ateliers[(DB.vueAt||1)-1])}}

/* ---------- Progression sur le cycle (items /16 séance après séance) ---------- */
function courbe(E,c){
  const jours=[...new Set(Object.values(E.v).filter(v=>v.p).map(v=>new Date(v.p).toDateString()))].map(d=>new Date(d).getTime()).sort((a,b)=>a-b);
  if(jours.length<2)return '';
  const B=bareme(),max=B.val[5]||1;
  const pts=jours.map(j=>{const fin=j+864e5;const vals=GYM.ateliers.map(a=>{let b=0;NIVS.forEach((n,i)=>{const v=E.v[a.n+n];if(v&&v.p&&v.p<fin)b=B.val[i]});return b}).sort((x,y)=>y-x).slice(0,B.nat);return Math.min(16,16*vals.reduce((s,x)=>s+x,0)/(B.nat*max))});
  const W=560,H=150,px=i=>30+i*(W-50)/(pts.length-1),py=v=>H-20-v*(H-40)/16;
  return `<figure class="courbe"><figcaption class="small"><b>Progression</b> · items /16 à chaque séance</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Progression des items">
   ${[0,8,16].map(v=>`<line x1="30" x2="${W-20}" y1="${py(v)}" y2="${py(v)}" stroke="#dde2e8"/><text x="4" y="${py(v)+5}" font-size="13" fill="#5b6470">${v}</text>`).join('')}
   <polyline fill="none" stroke="#0f766e" stroke-width="3" points="${pts.map((v,i)=>px(i)+','+py(v)).join(' ')}"/>
   ${pts.map((v,i)=>`<circle cx="${px(i)}" cy="${py(v)}" r="5" fill="#0f766e"/><text x="${px(i)}" y="${H-3}" font-size="12" text-anchor="middle" fill="#5b6470">${dateFr(jours[i])}</text>`).join('')}</svg></figure>`;
}

/* ---------- Notes pour Pronote : une note par ligne, dans l'ordre alphabétique de la classe ---------- */
async function notesPronote(){
  const c=DB.classe,L=elevesClasse(c),arr=x=>x==null?'Disp':(Math.round(x*2)/2).toString().replace('.',',');
  const txt=L.map(x=>arr(note(x.E,c).total)).join('\n');
  let ok=false;try{await navigator.clipboard.writeText(txt);ok=true}catch(e){}
  const d=document.createElement('div');d.className='voile';
  d.innerHTML=`<div class="fen"><h3>Notes /20 pour Pronote · ${esc(c)}</h3>${AVT('tableau','Vérifie les notes avant de les reporter dans Pronote.')}<p class="small">${ok?'✅ Copiées. ':''}Dans Pronote : saisie des notes du devoir → cliquez dans la case du premier élève → collez. Les notes sont arrondies au demi-point, dans l’ordre alphabétique (NOM puis prénom).</p>
   <p class="small muted">Vérifiez que l’ordre est le même que dans Pronote (élèves arrivés ou partis en cours d’année).</p>
   <textarea readonly style="width:100%;height:240px;font:16px/1.4 monospace;border-radius:12px;border:1.5px solid var(--trait);padding:8px">${L.map(x=>arr(note(x.E,c).total)+'\t'+x.nom).join('\n')}</textarea>
   <div class="rangee" style="margin-top:10px;justify-content:flex-end"><button class="bt noir" type="button">Fermer</button></div></div>`;
  d.querySelector('button').onclick=()=>d.remove();document.body.appendChild(d);
}

/* ---------- Rotation des ateliers ---------- */
let ROT_T=null;
function fermerRotation(){clearInterval(ROT_T);ROT_T=null;const d=$('#rotation');if(d)d.remove();rendre()}
function ouvrirRotation(){
  const R=DB.rotation&&DB.rotation.c===DB.classe&&new Date(DB.rotation.d).toDateString()===new Date().toDateString()?DB.rotation:null;
  if(R)return afficherRotation();
  const d=document.createElement('div');d.className='voile';d.id='rotation';
  d.innerHTML=`<div class="fen"><h2>🔄 Rotation des ateliers · ${esc(DB.classe)}</h2>
   <label class="small"><b>Nombre de groupes</b></label><input id="rot-g" type="number" min="1" max="12" value="6">
   <label class="small"><b>Minutes par atelier</b></label><input id="rot-m" type="number" min="1" max="60" value="8">
   <p class="small"><b>Ateliers ouverts aujourd’hui</b> (dans l’ordre de passage)</p>
   <div class="rangee">${GYM.ateliers.map(a=>`<label class="coche" ${st(a.n)} style="border:3px solid var(--at)"><input type="checkbox" data-rot="${a.n}" checked> ${a.n} · ${esc(a.court)}</label>`).join('')}</div>
   <p class="small muted">Le groupe 1 commence sur le 1er atelier coché, le groupe 2 sur le 2e, etc. ; à chaque fin de temps, chacun passe à l’atelier suivant. Plus de groupes que d’ateliers : deux groupes partagent un atelier.</p>
   <div class="rangee" style="margin-top:10px;justify-content:space-between"><button class="bt" type="button" onclick="fermerRotation()">Annuler</button><button class="bt act" type="button" data-act="rot-go" data-v="0">Démarrer maintenant</button><button class="bt" type="button" data-act="rot-go" data-v="5">Démarrer dans 5 min</button></div></div>`;
  document.body.appendChild(d);
}
function lancerRotation(dans){
  const o=[...document.querySelectorAll('[data-rot]:checked')].map(i=>+i.dataset.rot);if(!o.length){alert('Cochez au moins un atelier.');return}
  DB.rotation={c:DB.classe,d:Date.now()+dans*60000,m:Math.max(1,+$('#rot-m').value||8),g:Math.max(1,+$('#rot-g').value||6),o};sauver();
  const d=$('#rotation');if(d)d.remove();afficherRotation();
}
function bip(){try{const C=new (window.AudioContext||window.webkitAudioContext)();[0,.25,.5].forEach(t=>{const o=C.createOscillator(),g=C.createGain();o.frequency.value=880;o.connect(g);g.connect(C.destination);g.gain.setValueAtTime(.4,C.currentTime+t);g.gain.exponentialRampToValueAtTime(.001,C.currentTime+t+.2);o.start(C.currentTime+t);o.stop(C.currentTime+t+.22)})}catch(e){}}
async function afficherRotation(){
  const R=DB.rotation,qr=await GQR.encoder({a:'GYM',v:1,t:'T',c:R.c,d:Math.round(R.d/1000),m:R.m,g:R.g,o:R.o});
  let svg;try{svg=GQR.svgQR(qr)}catch(e){svg=''}
  const d=document.createElement('div');d.className='voile';d.id='rotation';
  d.innerHTML=`<div class="fen" style="max-width:900px"><div class="rangee" style="justify-content:space-between"><h2 style="margin:0">🔄 Rotation · ${esc(R.c)}</h2><span id="rot-temps" class="rot-temps"></span></div>
   <div id="rot-grille" class="rot-grille"></div>
   <details><summary class="small" style="min-height:44px;font-weight:700">▦ QR pour les tablettes (appli élève → « QR de la classe »)</summary><div class="qrbox" style="max-width:300px">${svg}</div></details>
   <div class="rangee" style="margin-top:10px;justify-content:space-between"><button class="bt danger" type="button" data-act="rot-stop">Arrêter la rotation</button><button class="bt noir" type="button" onclick="fermerRotation()">Fermer (la rotation continue)</button></div></div>`;
  document.body.appendChild(d);
  let dernier=-2;
  const maj=()=>{const t=Date.now()-R.d,dur=R.m*60000,tour=t<0?-1:Math.floor(t/dur),grid=$('#rot-grille'),tps=$('#rot-temps');if(!grid){clearInterval(ROT_T);return}
    if(tour!==dernier){if(dernier!==-2&&tour>=0)bip();dernier=tour}
    if(tour>=R.o.length){tps.textContent='Terminé';grid.innerHTML='<p class="carte">Rotation terminée.</p>';return}
    const rest=t<0?-t:dur-(t%dur),mm=Math.floor(rest/60000),ss=Math.floor(rest/1000)%60;
    tps.textContent=(t<0?'Début dans ':'Tour '+(tour+1)+'/'+R.o.length+' · ')+mm+':'+String(ss).padStart(2,'0');
    const tr=Math.max(0,tour);
    grid.innerHTML=Array.from({length:R.g},(_,g)=>{const a=R.o[(g+tr)%R.o.length],A=GYM.ateliers[a-1];return `<div class="rot-case" ${st(a)}><span>Groupe ${g+1}</span><b>${a} · ${esc(A.court)}</b></div>`}).join('');
  };
  maj();clearInterval(ROT_T);ROT_T=setInterval(maj,1000);
}
