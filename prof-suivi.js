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
const fmt=x=>(Math.round(x*10)/10).toString().replace('.',',');
const niveauDe=k=>{const a=GYM.ateliers.find(x=>x.n===+k[0]);return a&&a.niv.find(n=>n.n===k[1])};
function nomPiece(p){if(p[0]==='L'){const f=GYM.fiches[p.slice(1)];return f?'liaison « '+f.t+' »':'liaison'}const n=niveauDe(p);return n?n.nom+' ('+p[1]+')':p}
// Observations faites par cet élève pour ses camarades (E où il est noté comme observateur)
function observations(E,c){const p=norm(prenom(E.nom));let n=0;elevesClasse(c).forEach(x=>{if(x.E===E)return;Object.values(x.E.v).forEach(v=>{if(v.e&&!v.pp&&v.par&&norm(v.par)===p)n++})});return n}
function partAuto(obs){const B=bareme();return Math.min(4,Math.round(obs/B.cible*4*2)/2)}
function note(E,c){
  const B=bareme(),max=B.val[5]||1;
  const pts=GYM.ateliers.map(a=>{const p=meilleur(E,a.n,'p');return p?B.val[NIVS.indexOf(p)]:0}).sort((x,y)=>y-x).slice(0,B.nat);
  const items=Math.min(16,16*pts.reduce((s,x)=>s+x,0)/(B.nat*max));
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
   <p class="small muted"><b>16 points sur la validation des items</b> : pour chaque atelier, le meilleur niveau validé <b>P</b> rapporte des points (ci-dessous). On garde les meilleurs ateliers, puis on ramène sur 16. <b>4 points de participation</b> : proposés d’après le nombre d’observations faites pour les camarades, modifiables dans la fiche de chaque élève.</p>
   <div class="bareme">${NIVS.map((n,i)=>`<label><span class="L L${n}">${n}</span><input type="number" min="0" step="0.5" inputmode="decimal" data-bar="${i}" value="${B.val[i]}"></label>`).join('')}</div>
   <div class="rangee" style="margin-top:10px"><label class="small"><b>Ateliers retenus</b> (les meilleurs) <input type="number" min="1" max="6" data-bar="nat" value="${B.nat}" style="width:90px"></label>
   <label class="small"><b>Observations pour 4/4</b> <input type="number" min="1" data-bar="cible" value="${B.cible}" style="width:90px"></label></div>
   <p class="small muted">Exemple : niveaux P en C, D, B, E, A et aucun → (3+4+2+5+1+0) / (${B.nat} × ${B.val[5]}) × 16 = <b>${fmt(Math.min(16,16*([3,4,2,5,1,0].map(x=>x?B.val[x-1]:0).sort((a,b)=>b-a).slice(0,B.nat).reduce((s,x)=>s+x,0))/(B.nat*(B.val[5]||1))))}</b> / 16.</p></section>`;
}
