/* =====================================================================
   prof-groupes.js — groupes et classes corrigés à la main (chargé après prof.js et prof-suivi.js)
   - Vue « Par groupe » : chaque élève est rangé dans un groupe, dans cet ordre de priorité :
       1. la fiche de groupe la plus récente qui le contient, si elle est plus récente que votre choix manuel ;
       2. votre choix manuel (numéro 1 à 8, ou « aucun ») ;
       3. la fiche de groupe la plus récente qui le contient ;
       4. pour les fiches reçues avant que l'outil garde les groupes : les élèves de la classe
          reçus dans la même fiche (même heure d'envoi) forment un groupe « reconstitué ».
   - Bouton « ✎ Organiser les groupes » : un menu de groupe devant chaque élève de la classe.
   - Fiche d'un élève : « Groupe » (1 à 8, aucun, auto) et « Changer de classe » (avec rattachement
     à un nom de la liste : les validations sont fusionnées, rien n'est perdu).
   Données : DB.grpMan = {cléÉlève: {g:'1'…'8' ou 'x' (aucun), t:ms}}.
   ===================================================================== */
(function(){
'use strict';
const NUM='12345678'.split('');
const manuel=()=>(DB.grpMan=DB.grpMan||{});

/* groupe effectif de chaque élève d'une classe : Map(clé -> {id, n (numéro ou ''), src, t}) */
function groupesDe(c,L){
  const byK=new Map(L.map(x=>[norm(x.nom),x])),fiche=new Map();
  Object.entries(DB.groupes||{}).filter(([,g])=>norm(g.classe)===norm(c)).forEach(([gk,g])=>(g.noms||[]).forEach(n=>{const x=byK.get(norm(n));if(!x)return;
    const f=fiche.get(x.k);if(!f||g.maj>f.t)fiche.set(x.k,{gk,g,t:g.maj})}));
  const M=manuel(),R=new Map();
  L.forEach(x=>{const f=fiche.get(x.k),m=M[x.k];
    if(f&&(!m||f.t>m.t)){const n=String(f.g.lt||'');R.set(x.k,{id:n?'n:'+n:'f:'+f.gk,n,src:'fiche',t:f.g.recu||f.t});return}
    if(m){if(m.g!=='x')R.set(x.k,{id:'n:'+m.g,n:m.g,src:'main',t:m.t});return}
    if(f){R.set(x.k,{id:'f:'+f.gk,n:'',src:'fiche',t:f.g.recu||f.t});return}
    const t=x.E&&x.E.maj;if(t)R.set(x.k,{id:'r:'+t,n:'',src:'rec',t:x.E.recu||t})});
  // un groupe reconstitué d'un seul élève n'apprend rien : il reste « sans groupe »
  const nb={};R.forEach(v=>{nb[v.id]=(nb[v.id]||0)+1});R.forEach((v,k)=>{if(v.src==='rec'&&nb[v.id]<2)R.delete(k)});
  return R}

const date=t=>{const d=new Date(t);return d.toDateString()===new Date().toDateString()?'aujourd’hui à '+d.getHours()+' h '+String(d.getMinutes()).padStart(2,'0'):'le '+d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})};
const aConf=E=>Object.values(E.v||{}).filter(v=>v.e&&!v.p).length;
const tab=m=>`<div style="overflow-x:auto"><table class="tab"><thead><tr><th style="text-align:left">Élève</th>${GYM.ateliers.map(a=>`<th title="${esc(a.nom)}" style="box-shadow:inset 0 -6px 0 ${COUL[a.n]}">${a.n}</th>`).join('')}<th title="validations E à confirmer">E à<br>confirmer</th></tr></thead>
  <tbody>${m.map(x=>`<tr data-act="eleve" data-v="${esc(x.k)}"><td style="text-align:left">${pastille(x.E)}<b>${esc(x.nom)}</b></td>${GYM.ateliers.map(a=>cellule(x.E,a.n)).join('')}<td>${aConf(x.E)||'–'}</td></tr>`).join('')}</tbody></table></div>`;
const menu=(k,cur,auto)=>`<select data-grman="${esc(k)}" aria-label="Groupe">${auto?`<option value="">Auto</option>`:''}${NUM.map(n=>`<option value="${n}"${cur===n?' selected':''}>Groupe ${n}</option>`).join('')}<option value="x"${cur==='x'?' selected':''}>Aucun groupe</option></select>`;

window.vParGroupe=function(){const c=DB.classe,L=elevesClasse(c),R=groupesDe(c,L);
  if(DB.grOrg)return vOrganiser(c,L,R);
  const cartes=new Map();L.forEach(x=>{const g=R.get(x.k);if(!g)return;const C=cartes.get(g.id)||{g,m:[],t:0,main:0};C.m.push(x);if(g.src!=='main')C.t=Math.max(C.t,g.t||0);if(g.src==='main')C.main=1;cartes.set(g.id,C)});
  const ordre=[...cartes.values()].sort((a,b)=>(a.g.n?0:1)-(b.g.n?0:1)||String(a.g.n).localeCompare(String(b.g.n),'fr',{numeric:true})||a.m[0].nom.localeCompare(b.m[0].nom,'fr'));
  let i=0;const seuls=L.filter(x=>!R.has(x.k)&&(!x.horsListe||(x.E&&x.E.maj)));
  const titre=C=>C.g.n?`<span class="grlt">Groupe ${esc(C.g.n)}</span>`:`<span class="grlt" style="background:#e5e7eb;color:#374151">${C.g.src==='rec'?'Reconstitué':'Sans numéro'} ${++i}</span>`;
  const info=C=>C.g.src==='rec'?'même fiche reçue '+date(C.t)+' · numéro inconnu':C.main&&C.m.every(x=>R.get(x.k).src==='main')?'réparti à la main':(C.main?'en partie réparti à la main · ':'')+'dernière fiche '+date(C.t);
  return `<h2>Classe ${esc(c)} · par groupe</h2>${basculeVue()}
  <div class="rangee" style="justify-content:space-between;align-items:center"><p class="small muted" style="margin:0">${cartes.size} groupe${cartes.size>1?'s':''}. Touchez un élève pour sa fiche. Lettre = meilleur niveau P · pointillés = E à confirmer.</p>
  <button class="bt mini" type="button" data-act="grorg">✎ Organiser les groupes</button></div>
  <div class="grgrid">${ordre.map(C=>`<section class="carte grcarte"><h3>${titre(C)}${esc(C.m.map(x=>prenomP(x.nom)).join(' · '))}</h3><p class="small muted">${info(C)}</p>${tab(C.m)}</section>`).join('')||'<p class="carte muted">Aucun groupe pour l’instant : utilisez « ✎ Organiser les groupes » ou attendez les fiches.</p>'}</div>
  ${seuls.length?`<section class="carte"><h3>Sans groupe · ${seuls.length}</h3><p class="small muted">Aucune fiche de groupe reçue pour ces élèves, ou retirés d’un groupe. « ✎ Organiser les groupes » pour les placer.</p>${tab(seuls)}</section>`:''}`};

function vOrganiser(c,L,R){const M=manuel();
  const lig=x=>{const g=R.get(x.k),m=M[x.k];const cur=m&&(!g||g.src==='main')?m.g:'';
    const d=g?(g.src==='fiche'?(g.n?'fiche : groupe '+g.n:'fiche sans numéro'):g.src==='rec'?'reconstitué':'à la main'):'sans groupe';
    return `<div class="rangee" style="justify-content:space-between;align-items:center;border-top:1px solid #e5e7eb;padding:6px 0"><span>${pastille(x.E)}<b>${esc(x.nom)}</b> <small class="muted">${esc(d)}</small></span>${menu(x.k,cur,true)}</div>`};
  return `<h2>Classe ${esc(c)} · organiser les groupes</h2>
  <p class="small muted">Choisissez le groupe de chaque élève (1 à 8, comme le numéro de groupe des tablettes). « Auto » = d’après les fiches reçues. Votre choix reste, sauf si une fiche plus récente arrive de la tablette de l’élève.</p>
  <div class="rangee"><button class="bt" type="button" data-act="grorg">✔ Terminé</button><button class="bt mini" type="button" data-act="grfige">Garder les groupes actuels (numéroter les reconstitués)</button></div>
  <section class="carte">${L.filter(x=>!x.horsListe||(x.E&&x.E.maj)).map(lig).join('')}</section>`}

/* les groupes affichés deviennent des choix manuels ; les groupes sans numéro prennent les numéros libres */
function figer(){const c=DB.classe,L=elevesClasse(c),R=groupesDe(c,L),M=manuel(),now=Date.now();
  const pris=new Set([...R.values()].filter(g=>g.n).map(g=>g.n)),libre=()=>NUM.find(n=>!pris.has(n));const nv={};let n=0;
  L.forEach(x=>{const g=R.get(x.k);if(!g||g.n)return;if(!nv[g.id]){const l=libre();if(!l)return;pris.add(l);nv[g.id]=l}M[x.k]={g:nv[g.id],t:now};n++});
  journal(c+' · '+n+' élève(s) placé(s) dans un groupe numéroté');sauver()}

/* ---------- fiche de l'élève : groupe et classe ---------- */
function blocEleve(k){const E=DB.el[k];if(!E)return '';const c=E.classe,L=elevesClasse(c),R=groupesDe(c,L),g=R.get(k),m=manuel()[k];
  const etat=g?(g.n?'Groupe '+g.n:g.src==='rec'?'groupe reconstitué (sans numéro)':'groupe sans numéro')+(g.src==='fiche'?' (d’après la tablette)':g.src==='main'?' (à la main)':''):'aucun groupe';
  const C=Object.keys(DB.classes).sort();
  return `<section class="carte"><h3>Groupe et classe</h3>
   <label class="small"><b>Groupe</b> · actuellement : ${esc(etat)}</label>
   <div class="rangee">${menu(k,m?m.g:'',true)}</div>
   <p class="small muted" style="margin-top:4px">Si l’élève change vraiment de groupe : sur l’ancienne tablette « Retirer », sur la nouvelle « Ajouter un élève » avec le même nom. Sinon la prochaine fiche de l’ancienne tablette le remettra dans son ancien groupe.</p>
   ${C.length?`<label class="small"><b>Changer de classe</b>${DB.classes[c]?'':' · <span style="color:#b45309">« '+esc(c)+' » n’est pas une de vos classes</span>'}</label>
   <div class="rangee"><select id="mv-cl" aria-label="Classe">${C.map(x=>`<option${x===c?' selected':''}>${esc(x)}</option>`).join('')}</select>
   <select id="mv-nom" aria-label="Nom dans la liste"></select><button class="bt mini" type="button" data-act="mvcl" data-e="${esc(k)}">Déplacer</button></div>
   <p class="small muted" style="margin-top:4px">Choisissez le nom de la liste qui correspond : ses validations sont réunies sur ce nom.</p>`:''}</section>`}
function remplirNoms(k){const s=$('#mv-cl'),t=$('#mv-nom'),E=DB.el[k];if(!s||!t||!E)return;const L=(DB.classes[s.value]&&DB.classes[s.value].eleves)||[];
  const p=norm(prenomP(E.nom)),proche=L.filter(n=>norm(n)===norm(E.nom)||norm(prenomP(n))===p||norm(n).includes(norm(E.nom)));
  const autres=L.filter(n=>!proche.includes(n)).sort(triNom);
  t.innerHTML=`${proche.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('')}<option value="">— garder « ${esc(E.nom)} » —</option>${autres.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('')}`}

/* déplace (et fusionne si besoin) un élève vers une autre classe / un autre nom ; rien n'est perdu */
function deplacer(k,c2,nom2){const E=DB.el[k];if(!E)return null;const nom=nom2||E.nom,nom0=E.nom,k2=cle(c2,nom);if(k2===k)return k;const F=DB.el[k2];
  if(F){Object.entries(E.v||{}).forEach(([nv,v])=>{const w=F.v[nv]||{};if(v.e&&(!w.e||v.e>w.e)){w.e=v.e;w.par=v.par}if(v.p&&(!w.p||v.p<w.p)){w.p=v.p;w.pp=v.pp}if(v.deb)w.deb=1;F.v[nv]=w});
    ['obj','ench','rate','quiz','av','st','part'].forEach(f=>{if(F[f]==null&&E[f]!=null)F[f]=E[f]});F.maj=Math.max(F.maj||0,E.maj||0);F.recu=Math.max(F.recu||0,E.recu||0)}
  else DB.el[k2]=Object.assign(E,{classe:c2,nom});
  delete DB.el[k];const M=manuel();if(M[k]&&!M[k2])M[k2]=M[k];delete M[k];
  journal(nom0+' déplacé(e) vers '+c2+(nom!==nom0?' (rattaché(e) à '+nom+')':''));return k2}

const oE=vEleve;window.vEleve=function(k){const h=oE(k);if(!DB.el[k])return h;const b=blocEleve(k);
  const i=h.indexOf('<section class="carte note-carte">');return i<0?h+b:h.slice(0,i)+b+h.slice(i)};
const oR=rendre;window.rendre=function(){oR();if(DB.eleve&&DB.vue==='tableau')remplirNoms(DB.eleve)};

document.addEventListener('click',ev=>{const b=ev.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='grorg'){ev.stopImmediatePropagation();DB.grOrg=!DB.grOrg;sauver();rendre();return}
  if(a==='grfige'){ev.stopImmediatePropagation();figer();DB.grOrg=false;sauver();rendre();return}
  if(a==='mvcl'){ev.stopImmediatePropagation();const k=b.dataset.e,c2=$('#mv-cl').value,n2=$('#mv-nom').value,E=DB.el[k];if(!E||!c2)return;
    const c1=E.classe,k2=deplacer(k,c2,n2);if(!k2)return;DB.eleve=k2;
    if(!classesConnues().includes(c1)&&DB.classe===c1)DB.classe=c2;sauver();rendre();return}
},true);
document.addEventListener('change',ev=>{const s=ev.target.closest('select');if(!s)return;
  if(s.dataset.grman!=null){ev.stopImmediatePropagation();const M=manuel(),k=s.dataset.grman;if(s.value)M[k]={g:s.value,t:Date.now()};else delete M[k];sauver();
    if(!DB.grOrg)rendre();return}
  if(s.id==='mv-cl'){ev.stopImmediatePropagation();const b=document.querySelector('[data-act="mvcl"]');if(b)remplirNoms(b.dataset.e)}
},true);
const css=document.createElement('style');css.textContent='select[data-grman],#mv-cl,#mv-nom{font:inherit;padding:6px 8px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;max-width:100%}';document.head.appendChild(css);
try{rendre()}catch(e){}
})();
