/* =====================================================================
   prof.js — Gymnastique · outil prof
   Reçoit les fiches des groupes (QR scannés, fichiers JSON ou dossier .zip
   du Nuage), tient le tableau de la classe (niveaux E et P par atelier),
   liste les niveaux à valider et exporte pour la note.
   Données gardées sur cet appareil uniquement (localStorage).
   ===================================================================== */
const AVT=(n,b,c)=>window.EPSAvatar?EPSAvatar(n,b,c):'';

'use strict';
const CLEP='gym-prof-v1',NIVS=['A','B','C','D','E','F'];
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const dateFr=ms=>ms?new Date(ms).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}):'';
const prenom=n=>String(n||'').split(/\s+/)[0];
/* Couleur de cadre de chaque atelier, comme l'accueil du PowerPoint */
const COUL={1:'#92d050',2:'#ffff00',3:'#00b0f0',4:'#7030a0',5:'#ffc000',6:'#ff6600'},TXT={4:'#fff'};
const st=k=>COUL[k]?`style="--at:${COUL[k]};--at-t:${TXT[k]||'#1c2128'}"`:'';

/* ---------- Base ---------- */
// DB.el[clé] = {nom, classe, v:{'1C':{e:ms, par:'Hugo', p:ms, pp:1 (validé ici par le prof), deb:1}}, maj:ms}
function vide(){return {classes:{},el:{},pin:'',vue:'tableau',classe:'',eleve:null,journal:[],recus:{}}}
function charger(){try{const o=JSON.parse(localStorage.getItem(CLEP));if(o&&o.el)return Object.assign(vide(),o)}catch(e){}return vide()}
let DB=charger();
function sauver(){if(DEMO)return;try{localStorage.setItem(CLEP,JSON.stringify(DB))}catch(e){alert('Mémoire pleine : exportez une sauvegarde.')}}
const cle=(c,n)=>norm(c)+'|'+norm(n);
function journal(t){DB.journal.unshift(new Date().toLocaleString('fr-FR')+' · '+t);DB.journal=DB.journal.slice(0,60)}
function eleve(c,n){const k=cle(c,n);return DB.el[k]||(DB.el[k]={nom:n,classe:c,v:{},maj:0})}
const etat=(E,k)=>{const v=E.v[k];return v&&v.p?'p':v&&v.e?'e':''};
function meilleur(E,a,q){let b='';NIVS.forEach(n=>{const s=etat(E,a+n);if(q==='p'?s==='p':s)b=n});return b}

/* ---------- Réception des fiches de groupe ---------- */
function importerObjet(o,source){
  if(!o||o.a!=='GYM'||o.t!=='G')throw new Error('Ce n’est pas une fiche de groupe gym.');
  const c=o.c||'?';let n=0;
  (o.el||[]).forEach(x=>{
    const E=eleve(c,x.n);
    GYM.ateliers.forEach((a,ia)=>NIVS.forEach((nv,in_)=>{
      const k=a.n+nv,ch=(x.s||'')[ia*6+in_]||'0',d=(x.d||{})[k],v=E.v[k]||{};
      const te=d&&d[0]?d[0]*1000:(ch==='e'||ch==='p'?o.ts*1000:0),tp=d&&d[2]?d[2]*1000:(ch==='p'?o.ts*1000:0);
      if(te&&(!v.e||te>v.e)){v.e=te;v.par=d?d[1]:''}
      // Les P venant d’un téléphone ne comptent plus : seuls ceux validés dans cet outil (prof-valid.js) font foi.
      if(ch==='d')v.deb=1;
      if(v.e||v.p||v.deb){E.v[k]=v}
    }));
    if(x.o)E.obj={k:x.o,t:o.ts*1000};
    if(x.en)E.ench=x.en;
    if(x.x)E.rate=x.x;
    if(x.qz)E.quiz=1;
    E.maj=Math.max(E.maj,o.ts*1000);n++;
  });
  DB.recus[(o.g||'')+'|'+o.ts]=1;
  journal('Fiche reçue ('+source+') : '+c+' · '+(o.el||[]).map(x=>prenom(x.n)).join(', '));
  if(!DB.classe)DB.classe=c;sauver();
  return 'Reçu : '+(o.el||[]).map(x=>prenom(x.n)).join(', ')+' ('+c+')';
}
async function importerFichiers(files){
  const msgs=[];
  for(const f of files){
    try{
      if(/\.zip$/i.test(f.name)){
        if(!window.JSZip)await chargerScript('jszip.js');
        const z=await JSZip.loadAsync(await f.arrayBuffer());
        for(const nom of Object.keys(z.files).filter(n=>/\.json$/i.test(n))){try{msgs.push(importerObjet(JSON.parse(await z.files[nom].async('string')),'Nuage'))}catch(e){msgs.push(nom+' : '+e.message)}}
      }else msgs.push(importerObjet(JSON.parse(await f.text()),'fichier'));
    }catch(e){msgs.push(f.name+' : '+e.message)}
  }
  rendre();alert(msgs.join('\n')||'Aucun fichier lu.');
}
function chargerScript(src){return new Promise((ok,ko)=>{const e=document.createElement('script');e.src=src;e.onload=()=>ok();e.onerror=()=>ko(new Error('Impossible de charger '+src));document.head.appendChild(e)})}

/* ---------- Classes : import des listes Pronote ---------- */
function partsNom(t){
  const w=String(t||'').replace(/\s+/g,' ').trim().split(' ').filter(Boolean);
  const maj=x=>x===x.toUpperCase()&&/[A-ZÀ-Ý]/.test(x),part=x=>/^(de|du|des|d'|d’|le|la|van|von|der|den|di|da|del|dos)$/.test(x);
  const dans=w.map(maj);
  for(let i=w.length-2;i>=0;i--)if(!dans[i]&&part(w[i])&&dans[i+1])dans[i]=true;
  return {nom:w.filter((x,i)=>dans[i]).join(' '),pre:w.filter((x,i)=>!dans[i]).join(' ')};
}
function decouperNom(t){t=String(t||'').replace(/\s+/g,' ').trim();if(!t)return null;const {nom,pre}=partsNom(t);return nom&&pre?pre+' '+nom:t}
function lireLignes(rows,classeDefaut){
  rows=rows.map(r=>(r||[]).map(c=>c==null?'':String(c).trim()));
  const hi=rows.findIndex(r=>r.some(c=>/^(é|e)l(è|e)ve|^nom\b|^nom$|pr(é|e)nom/i.test(c)));
  const H=hi>=0?rows[hi].map(c=>norm(c)):[];
  const col=re=>H.findIndex(h=>re.test(h));
  const iNom=col(/^nom( de famille)?$/),iPre=col(/^prenom/),iEl=col(/^eleve|^nom prenom|^nom et prenom|^identite/),iCl=col(/^classe/);
  const out={};
  rows.slice(hi+1).forEach(r=>{
    let n='';
    if(iNom>=0&&iPre>=0&&r[iNom])n=r[iPre]+' '+r[iNom].toUpperCase();
    else if(iEl>=0)n=decouperNom(r[iEl]);
    else if(hi<0)n=decouperNom(r[0]);
    if(!n||/^(total|effectif)/i.test(n))return;
    const c=(iCl>=0&&r[iCl])||classeDefaut;if(!c)return;
    (out[c]=out[c]||new Set()).add(n.trim());
  });
  return out;
}
const triNom=(a,b)=>{const k=n=>{const p=partsNom(n);return norm(p.nom+' '+p.pre)};return k(a).localeCompare(k(b))};
async function importerListe(files,texte,classeDefaut){
  const lots=[];
  if(files&&files.length&&!window.XLSX)await chargerScript('xlsx.js');
  for(const f of files||[]){
    const buf=await f.arrayBuffer();let wb;
    if(/\.(csv|txt)$/i.test(f.name)||/text|csv/.test(f.type)){
      let t;try{t=new TextDecoder('utf-8',{fatal:true}).decode(buf)}catch(e){t=new TextDecoder('windows-1252').decode(buf)}
      t=t.replace(/^﻿/,'');const l0=t.split(/\r?\n/)[0],sep=(l0.match(/;/g)||[]).length>=(l0.match(/,/g)||[]).length?';':',';
      wb=XLSX.read(t,{type:'string',FS:sep});
    }else wb=XLSX.read(buf,{type:'array'});
    wb.SheetNames.forEach(sn=>lots.push(XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:false,defval:''})));
  }
  if(texte&&texte.trim())lots.push(texte.trim().split(/\r?\n/).map(l=>l.split(/\t|;/)));
  const tout={};lots.forEach(rows=>Object.entries(lireLignes(rows,classeDefaut)).forEach(([c,set])=>{tout[c]=tout[c]||new Set();set.forEach(n=>tout[c].add(n))}));
  const C=Object.keys(tout);
  if(!C.length){alert(classeDefaut?'Aucun nom trouvé.':'Aucun élève trouvé. Il faut une colonne « Classe », ou écrire le nom de la classe avant d’importer.');return}
  C.forEach(c=>{const old=DB.classes[c]||{};DB.classes[c]={eleves:[...tout[c]].sort(triNom),lien:old.lien||'',barres:!!old.barres}});
  journal('Listes importées : '+C.map(c=>c+' ('+tout[c].size+')').join(', '));
  DB.classe=C[0];DB.vue='tableau';sauver();rendre();
}
function chaineEleve(E){return GYM.ateliers.map(a=>NIVS.map(n=>{const v=E.v[a.n+n]||{};return v.p?'p':v.e?'e':v.deb?'d':'0'}).join('')).join('')}
async function empreinte(code){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('gym-prof|'+code));return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,24)}
async function qrDemarrage(c){
  const L=DB.classes[c]=DB.classes[c]||{eleves:elevesClasse(c).map(x=>x.nom),lien:'',barres:false};if(!L.cc){L.cc=EPSCode.nouvelleCle();sauver()}
  // validations connues par élève (6 ateliers × 6 niveaux : 0, e, p, d) — seules les lignes non vides
  const pv={};elevesClasse(c).forEach(x=>{const ch=chaineEleve(x.E);if(/[epd]/.test(ch))pv[x.nom]=ch});
  const txt=await GQR.encoder({a:'GYM',v:1,t:'C',c,l:L.eleves,u:L.lien||'',pk:(await SIGNE.cles()).pub,b:L.barres?1:0,tc:L.tc?1:0,cc:L.cc,pv,ts:Math.round(Date.now()/1000)});
  let svg;try{svg=GQR.svgQR(txt)}catch(e){svg='<p class="alerte">Liste trop longue pour un seul QR.</p>'}
  const d=document.createElement('div');d.className='voile';
  d.innerHTML=`<div class="fen" style="max-width:640px"><h2>Classe ${esc(c)} · gymnastique</h2><p>Appli élève : « QR de la classe (prof) », ou Groupe → « Scanner le QR de la classe ».</p><p class="small muted">Le QR contient aussi vos validations P : elles s’ajoutent sur les tablettes, et un groupe qui a oublié son code retrouve ses niveaux en recréant son carnet avec la liste de la classe.</p><div class="qrbox">${svg}</div><button class="bt noir" type="button" style="margin-top:12px">Fermer</button></div>`;
  d.querySelector('button').onclick=()=>d.remove();document.body.appendChild(d);
}

/* ---------- Vues ---------- */
function elevesClasse(c){
  const L=(DB.classes[c]&&DB.classes[c].eleves)||[];
  const set=new Map(L.map(n=>[cle(c,n),n]));
  Object.entries(DB.el).forEach(([k,E])=>{if(norm(E.classe)===norm(c)&&!set.has(k))set.set(k,E.nom)});
  return [...set.entries()].map(([k,n])=>({k,nom:n,E:DB.el[k]||{nom:n,classe:c,v:{},maj:0},horsListe:!L.includes(n)})).sort((a,b)=>triNom(a.nom,b.nom));
}
function classesConnues(){return [...new Set([...Object.keys(DB.classes),...Object.values(DB.el).map(e=>e.classe)])].sort()}
function rendre(){
  const C=classesConnues();if(!DB.classe&&C.length)DB.classe=C[0];
  const T=[['tableau','📊','Classe'],['valider','✅','À valider'],['recevoir','📥','Recevoir'],['classes','⚙️','Réglages']];
  $('#onglets').innerHTML=T.map(([k,i,l])=>`<button type="button" class="${DB.vue===k?'ici':''}" data-act="vue" data-v="${k}"><i>${i}</i>${l}${k==='valider'&&nbAValider()?' ('+nbAValider()+')':''}</button>`).join('');
  $('#sous').textContent=DB.classe?'Classe '+DB.classe:'Lycée Georges Pompidou';
  const sel=C.length?`<div class="qui">${C.map(c=>`<button type="button" class="${c===DB.classe?'ici':''}" data-act="classe" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>`:'';
  $('#app').innerHTML=bandeauDemo()+(DB.eleve&&DB.vue==='tableau'?vEleve(DB.eleve):{tableau:()=>sel+(DB.vueAt?vParAtelier():vTableau()),valider:()=>sel+vValider(),recevoir:()=>sel+vRecevoir(),classes:vClasses}[DB.vue]());
}
function cellule(E,a){const p=meilleur(E,a,'p'),e=meilleur(E,a,'e');
  return `<td>${p?`<span class="L L${p}" style="width:36px;height:36px;font-size:20px">${p}</span>`:'<span class="muted">–</span>'}${e&&e!==p?`<span class="eseul" title="validé E par un camarade, à confirmer"><span class="L L${e}">${e}</span><small>E</small></span>`:''}</td>`}
function vTableau(){
  if(!DB.classe)return `<h2>Bienvenue</h2>${AVT('prof','Bienvenue ! Commence par importer la liste Pronote de ta classe.')}<p class="carte">Commencez par importer une liste Pronote (onglet Réglages), puis montrez le QR de la classe aux tablettes.</p>${carteDemo()}`;
  const L=elevesClasse(DB.classe);
  return `<h2>Classe ${esc(DB.classe)}</h2>
  <p class="small muted">Lettre = meilleur niveau validé <b>P</b> par atelier · petite lettre en pointillés = niveau plus haut validé seulement <b>E</b> par un camarade (à confirmer). Touchez un élève pour sa fiche.</p>
  ${basculeVue()}
  <div class="rangee"><button class="bt mini" type="button" data-act="qrclasse">▦ QR de la classe</button><button class="bt mini" type="button" data-act="rotation">🔄 Rotation des ateliers</button><button class="bt mini" type="button" data-act="csv">⬇ Export CSV (note)</button><button class="bt mini" type="button" data-act="pronote">📋 Notes pour Pronote</button><button class="bt mini" type="button" data-act="imprimer">🖨 Imprimer</button></div>
  <div style="overflow-x:auto;margin-top:10px"><table class="tab"><thead><tr><th style="text-align:left">Élève</th>${GYM.ateliers.map(a=>`<th title="${esc(a.nom)}" style="box-shadow:inset 0 -8px 0 ${COUL[a.n]}">${a.n}<br><span class="small">${esc(a.court)}</span></th>`).join('')}<th>Items<br><span class="small">/16</span></th><th>Part.<br><span class="small">/4</span></th><th>Note<br><span class="small">/20</span></th></tr></thead>
  <tbody>${L.map(x=>{const N=note(x.E,DB.classe);return `<tr data-act="eleve" data-v="${esc(x.k)}"><td style="text-align:left"><b>${esc(x.nom)}</b>${rafale(x.E)?' <span title="Plusieurs validations E en quelques minutes : à vérifier">⚡</span>':''}${x.horsListe?' <span class="small muted">(hors liste)</span>':''}${x.E.st==='disp'?' <span class="small muted">(dispensé)</span>':x.E.st==='ip'?' <span class="small muted">(inapte partiel)</span>':''}${x.E.maj?`<br><span class="small muted">reçu ${dateFr(x.E.maj)}</span>`:''}</td>${GYM.ateliers.map(a=>cellule(x.E,a.n)).join('')}<td>${fmt(N.items)}</td><td>${fmt(N.part)}${N.partAuto?'<sup title="proposée par l’appli">*</sup>':''}</td><td><b>${fmt(N.total)}</b></td></tr>`}).join('')}</tbody></table></div>
  <p class="small muted">⚡ = au moins ${RAFALE.n} validations E en moins de ${RAFALE.min} min : allez voir. * = participation proposée par l’appli (observations justes : E confirmés ensuite par votre P), à confirmer dans la fiche de l’élève. Barème : onglet Réglages.</p>`;
}
function vEleve(k){
  const E=DB.el[k]||(()=>{const [c]=k.split('|');const x=elevesClasse(DB.classe).find(y=>y.k===k);return x?eleve(x.E.classe||DB.classe,x.nom):null})();
  if(!E){DB.eleve=null;return vTableau()}
  const N=note(E,E.classe||DB.classe),obs=observations(E,E.classe||DB.classe);
  return `<button class="retour" type="button" data-act="eleve" data-v="">‹ Classe</button><h2>${esc(E.nom)}</h2><p class="small muted">${esc(E.classe)} · touchez une case pour valider ou retirer P (validation professeur).</p>
  <section class="carte note-carte"><div class="rangee" style="justify-content:space-between"><b style="font:800 30px var(--d)">${fmt(N.total)} / 20</b><span>Items ${fmt(N.items)}/16 · Participation ${fmt(N.part)}/4</span></div>
   ${rafale(E)?`<p class="alerte">⚡ ${RAFALE.n} validations E ou plus en moins de ${RAFALE.min} min (${esc(rafale(E))}) : à vérifier.</p>`:''}
   <div style="margin:10px 0"><span class="small"><b>Statut</b></span><div class="rangee">${[['','Apte'],['ip','Inapte partiel'],['disp','Dispensé du cycle']].map(([s,l])=>`<button type="button" class="bt mini ${(E.st||'')===s?'act':''}" data-act="statut" data-v="${s}" data-e="${esc(k)}">${l}</button>`).join('')}</div>
   ${E.st==='ip'?`<p class="small muted">Ateliers <b>non évalués</b> (certificat d’inaptitude partielle). La note sur 16 se calcule sur les autres ateliers ; la participation compte comme d’habitude (observer, parer, conseiller).</p><div class="rangee">${GYM.ateliers.map(a=>`<label class="coche" style="margin:0"><input type="checkbox" data-excl="${a.n}" data-e="${esc(k)}" ${(E.excl||[]).includes(a.n)?'checked':''}> ${a.n} · ${esc(a.court)}</label>`).join('')}</div>`:''}
   ${E.st==='disp'?'<p class="small muted">Pas de note : « Disp » dans l’export CSV et dans les notes pour Pronote.</p>':''}</div>
   <label class="small"><b>Participation /4</b> — observations justes (E confirmés par votre P) : <b>${obs}</b> (l’appli propose ${fmt(partAuto(obs))})</label>
   <div class="rangee">${[0,1,2,3,4].map(p=>`<button type="button" class="bt mini ${E.part===p?'act':''}" data-act="part" data-v="${p}" data-e="${esc(k)}">${p}</button>`).join('')}<button type="button" class="bt mini ${E.part==null?'act':''}" data-act="part" data-v="" data-e="${esc(k)}">Auto</button></div>
   ${E.obj?`<p class="small">🎯 Dernier objectif du jour (${dateFr(E.obj.t)}) : <b>atelier ${E.obj.k[0]} niveau ${E.obj.k[1]}</b> · ${esc((niveauDe(E.obj.k)||{}).nom||'')}</p>`:''}
   ${E.ench&&E.ench.length?`<p class="small">🧩 Enchaînement : ${E.ench.map(p=>esc(nomPiece(p))).join(' → ')}</p>`:''}
   <p class="small">${E.quiz?'🛡️ Quiz sécurité réussi':'🛡️ Quiz sécurité pas encore réussi (niveaux ⚠️ bloqués sur la tablette)'}</p>
   ${courbe(E,E.classe||DB.classe)}
   <div class="rangee"><button class="bt mini" type="button" data-act="imprimer">🖨 Imprimer la fiche</button></div>
  </section>
  ${GYM.ateliers.map(a=>`<section class="atelier" ${st(a.n)}><header><span class="n">${a.n}</span><b>${esc(a.nom)}</b></header>
   ${a.niv.map(n=>{const kk=a.n+n.n,v=E.v[kk]||{},s=etat(E,kk);return `<div class="niv" style="cursor:default"><span class="L L${n.n}">${n.n}</span><span><span class="nom">${esc(n.nom)}</span><div class="crit">${v.e?'E '+dateFr(v.e)+(v.par?' par '+esc(v.par):''):''}${v.p?' · P '+dateFr(v.p):''}${v.deb?' · ouvert par le prof':''}</div></span>
     <span class="ep"><span class="${s?'e v':''}">E</span><button class="bt mini ${s==='p'?'ok':''}" type="button" data-act="togP" data-v="${kk}" data-e="${esc(k)}" style="min-width:56px">${s==='p'?'P ✔':'P'}</button></span></div>`}).join('')}</section>`).join('')}`;
}
function aValider(c){const out=[];elevesClasse(c).forEach(x=>Object.entries(x.E.v).forEach(([k,v])=>{if(v.e&&!v.p)out.push({x,k,v})}));return out.sort((a,b)=>a.k.localeCompare(b.k)||triNom(a.x.nom,b.x.nom))}
function nbAValider(){return DB.classe?aValider(DB.classe).length:0}
function vValider(){
  if(!DB.classe)return '<p class="carte">Aucune classe.</p>';
  const T=aValider(DB.classe),f=DB.tourAt||0,L=f?T.filter(y=>+y.k[0]===f):T;
  return `<h2>À valider (P)</h2><p><button class="bt act" type="button" data-act="scanvalid">📷 Valider un élève (QR de son téléphone)</button></p><p class="small muted">Niveaux cochés E par un camarade, pas encore validés par vous. Tour de gymnase : choisissez l’atelier où vous êtes, regardez l’élève passer, validez d’un toucher.</p>
  <div class="qui">${[0,...GYM.ateliers.map(a=>a.n)].map(n=>`<button type="button" class="${f===n?'ici':''}" ${n?st(n):''} data-act="tour" data-v="${n}">${n?n+' · '+esc(GYM.ateliers[n-1].court):'Tous'} (${n?T.filter(y=>+y.k[0]===n).length:T.length})</button>`).join('')}</div>
  ${L.length?GYM.ateliers.map(a=>{const M=L.filter(y=>+y.k[0]===a.n);return M.length?`<section class="atelier" ${st(a.n)}><header><span class="n">${a.n}</span><b>${esc(a.nom)}</b></header>${M.map(y=>{const n=a.niv.find(z=>z.n===y.k[1]);return `<div class="niv" style="cursor:default"><span class="L L${y.k[1]}">${y.k[1]}</span><span><span class="nom">${esc(y.x.nom)}${rafale(y.x.E)?' ⚡':''}</span><div class="crit">${esc(n.nom)} · E ${dateFr(y.v.e)}${y.v.par?' par '+esc(y.v.par):''}${n.prof?' · ⚠️ présence prof':''}</div></span><span class="ep"><button class="bt mini ok" type="button" data-act="togP" data-v="${y.k}" data-e="${esc(y.x.k)}">Valider P</button></span></div>`}).join('')}</section>`:''}).join(''):'<p class="carte">Rien en attente.</p>'}`;
}
function vRecevoir(){
  return `<h2>Recevoir les fiches</h2>
  <section class="carte"><h3>▦ Scanner les QR des tablettes</h3><p class="small muted">Appli élève → Envoyer → « Montrer le QR code ». La caméra reste ouverte : scannez les groupes à la suite.</p><button class="bt act" type="button" data-act="scan">📷 Scanner</button></section>
  <section class="carte"><h3>📄 Fichiers ou dossier du Nuage</h3><p class="small muted">Fichiers .json des groupes, ou le dossier du Nuage téléchargé en .zip.</p><label class="bt" for="fic">Choisir les fichiers</label><input id="fic" type="file" accept=".json,.zip,application/json,application/zip" multiple hidden></section>
  ${vBilan()}
  <section class="carte"><h3>Journal</h3><div class="small">${DB.journal.slice(0,20).map(esc).join('<br>')||'—'}</div></section>`;
}
function vClasses(){
  const C=Object.keys(DB.classes).sort();
  return `<h2>Réglages</h2>
  <section class="carte"><h3>🔐 Validation P</h3><p class="small muted">Plus aucun code à taper sur les téléphones. L’élève touche « Montrer au professeur » : vous scannez son QR (À valider → <b>📷 Valider un élève</b>), vous validez, puis il scanne votre réponse. Elle est signée par une clé qui reste sur cet iPad : un élève ne peut pas fabriquer de P. Seuls les P enregistrés ici comptent dans la note. Gardez une sauvegarde de l’outil (la clé est dedans).</p></section>
  <section class="carte"><h3>Importer une liste Pronote</h3><p class="small muted">Pronote : liste des élèves → Exporter (xlsx, xls ou csv). Avec une colonne « Classe », plusieurs classes d’un coup. Sinon écrivez la classe d’abord.</p>
  <label class="small"><b>Classe</b> (si le fichier n’a pas de colonne Classe)</label><input id="cl-nom" type="text" placeholder="ex. 1G3">
  <div class="rangee" style="margin-top:10px"><label class="bt noir" for="cl-fic">Choisir le fichier Pronote</label><input id="cl-fic" type="file" accept=".xlsx,.xls,.csv,.ods,.txt" hidden multiple></div></section>
  ${C.map(c=>{const L=DB.classes[c];return `<section class="carte"><h3>${esc(c)} · ${L.eleves.length} élèves</h3>
   <label class="small"><b>Lien de dépôt Nuage</b> (facultatif, « Demande de fichier »)</label><input type="text" data-lien="${esc(c)}" value="${esc(L.lien||'')}" placeholder="https://nuage…">
   <label class="coche"><input type="checkbox" data-barres="${esc(c)}" ${L.barres?'checked':''}> Afficher les barres asymétriques aux élèves</label>
   <label class="coche"><input type="checkbox" data-tc="${esc(c)}" ${L.tc?'checked':''}> 🔑 Code du cours pour valider E à <b>tous</b> les niveaux (sinon : seulement les niveaux ⚠️)</label>
   <div class="rangee" style="margin-top:10px"><button class="bt act" type="button" data-act="qrclasse" data-v="${esc(c)}">▦ QR de démarrage</button><button class="bt" type="button" data-act="codecours" data-v="${esc(c)}">🔑 Code du cours</button><button class="bt mini danger" type="button" data-act="suppclasse" data-v="${esc(c)}">Supprimer la classe</button></div></section>`}).join('')}
  ${vBareme()}
  ${carteDemo()}
  <section class="carte"><h3>Sauvegarde</h3><div class="rangee"><button class="bt" type="button" data-act="sauvegarde">⬇ Télécharger une sauvegarde</button><label class="bt" for="restau">⬆ Restaurer</label><input id="restau" type="file" accept=".json" hidden></div></section>`;
}
function exportCSV(){
  const c=DB.classe,L=elevesClasse(c);
  const lignes=[['Nom','Classe',...GYM.ateliers.flatMap(a=>['A'+a.n+' '+a.court+' (P)','A'+a.n+' (E)']),'Nb niveaux P','Items /16','Participation /4','Note /20','Observations','À vérifier']];
  const v2=n=>n==null?'Disp':String(n).replace('.',',');
  L.forEach(x=>{const N=note(x.E,c);lignes.push([x.nom,c,...GYM.ateliers.flatMap(a=>[meilleur(x.E,a.n,'p'),meilleur(x.E,a.n,'e')]),Object.values(x.E.v).filter(v=>v.p).length,v2(N.items),v2(N.part)+(N.partAuto?' (auto)':''),v2(N.total),observations(x.E,c),[rafale(x.E)?'rafale de E':'',x.E.st==='ip'?'inapte partiel (ateliers '+(x.E.excl||[]).join(', ')+' non évalués)':x.E.st==='disp'?'dispensé':''].filter(Boolean).join(' · ')])});
  const txt='﻿'+lignes.map(r=>r.map(v=>/[;"\n]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':v).join(';')).join('\r\n');
  telecharger('gym_'+c+'_niveaux.csv',txt,'text/csv');
}
function telecharger(nom,txt,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:type||'application/json'}));a.download=nom;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}

/* ---------- Évènements ---------- */
document.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-act]');if(!b)return;const act=b.dataset.act,v=b.dataset.v;
  switch(act){
    case 'vue':DB.vue=v;DB.eleve=null;sauver();rendre();scrollTo(0,0);break;
    case 'classe':DB.classe=v;DB.eleve=null;sauver();rendre();break;
    case 'eleve':DB.eleve=v||null;rendre();scrollTo(0,0);break;
    case 'togP':{const E=DB.el[b.dataset.e]||(()=>{const x=elevesClasse(DB.classe).find(y=>y.k===b.dataset.e);return eleve(DB.classe,x.nom)})();
      const w=E.v[v]=E.v[v]||{};if(w.p){if(!confirm('Retirer la validation P ?'))return;delete w.p;delete w.pp}else{w.p=Date.now();w.pp=1;if(!w.e)w.e=w.p}
      if(!w.e&&!w.p&&!w.deb)delete E.v[v];sauver();rendre();break}
    case 'scanvalid':scanValidation();break;
    case 'scan':GQR.scanner(async t=>{const r=importerObjet(await GQR.decoder(t),'QR');rendre();return r},{continu:true,titre:'Fiches des groupes',aide:'Scannez les QR des tablettes les uns après les autres.'});break;
    case 'qrclasse':qrDemarrage(v||DB.classe);break;
    case 'codecours':{const c=v||DB.classe,L=DB.classes[c]=DB.classes[c]||{eleves:elevesClasse(c).map(x=>x.nom),lien:'',barres:false};if(!L.cc){L.cc=EPSCode.nouvelleCle();sauver()}EPSCode.prof({app:'gyp',classe:c,cle:L.cc,seances:[{v:'G',n:'Gym'}]});break}
    case 'csv':exportCSV();break;
    case 'rotation':ouvrirRotation();break;
    case 'rot-go':lancerRotation(+v);break;
    case 'rot-stop':DB.rotation=null;sauver();fermerRotation();break;
    case 'pronote':notesPronote();break;
    case 'imprimer':window.print();break;
    case 'tour':DB.tourAt=+v;sauver();rendre();break;
    case 'vueat':DB.vueAt=+v||0;sauver();rendre();break;
    case 'statut':{const E=DB.el[b.dataset.e];if(!E)return;if(v)E.st=v;else{delete E.st;delete E.excl}sauver();rendre();break}
    case 'part':{const E=DB.el[b.dataset.e];if(!E)return;if(v==='')delete E.part;else E.part=+v;sauver();rendre();break}
    case 'bilanj':DB.bilanJ=+v;rendre();break;
    case 'pin':{const a=prompt('Nouveau code de validation (4 à 8 chiffres) :');if(a==null)return;if(!/^\d{4,8}$/.test(a)){alert('4 à 8 chiffres.');return}
      if(prompt('Retapez le code :')!==a){alert('Les deux codes sont différents.');return}DB.pin=await empreinte(a);sauver();rendre();alert('Code enregistré. Refaites scanner le QR de la classe sur les tablettes.');break}
    case 'suppclasse':if(confirm('Supprimer la liste de la classe '+v+' ? (les niveaux reçus restent)')){delete DB.classes[v];sauver();rendre()}break;
    case 'demo':await ouvrirDemo();break;
    case 'demofin':quitterDemo();break;
    case 'sauvegarde':if(DEMO){alert('Démo : pas de sauvegarde.');return}telecharger('gym-prof_sauvegarde_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(DB));break;
  }
});
document.addEventListener('change',async ev=>{
  const t=ev.target;
  if(t.id==='fic'&&t.files.length){await importerFichiers([...t.files]);t.value=''}
  else if(t.id==='cl-fic'&&t.files.length){await importerListe([...t.files],'',($('#cl-nom').value||'').trim());t.value=''}
  else if(t.id==='restau'&&t.files[0]&&DEMO){alert('Quittez la démo avant de restaurer.');t.value=''}
  else if(t.id==='restau'&&t.files[0]){try{const o=JSON.parse(await t.files[0].text());if(!o.el)throw 0;if(confirm('Remplacer les données de cet appareil par la sauvegarde ?')){DB=Object.assign(vide(),o);sauver();rendre()}}catch(e){alert('Fichier de sauvegarde non reconnu.')}}
  else if(t.dataset.bar){const B=bareme();if(t.dataset.bar==='nat')B.nat=Math.max(1,Math.min(6,+t.value||6));else if(t.dataset.bar==='cible')B.cible=Math.max(1,+t.value||8);else B.val[+t.dataset.bar]=Math.max(0,+String(t.value).replace(',','.')||0);DB.bareme=B;sauver();rendre()}
  else if(t.id==='bilan-date'){DB.bilanJ=t.value?new Date(t.value+'T12:00').getTime():0;rendre()}
  else if(t.dataset.lien){DB.classes[t.dataset.lien].lien=t.value.trim();sauver()}
  else if(t.dataset.excl){const E=DB.el[t.dataset.e];if(E){const n=+t.dataset.excl,s=new Set(E.excl||[]);t.checked?s.add(n):s.delete(n);E.excl=[...s].sort();sauver();rendre()}}
  else if(t.dataset.tc){DB.classes[t.dataset.tc].tc=t.checked;sauver();alert('Refaites scanner le QR de la classe pour que les téléphones le prennent en compte.')}
  else if(t.dataset.barres){DB.classes[t.dataset.barres].barres=t.checked;sauver();alert('Refaites scanner le QR de la classe pour que les tablettes le prennent en compte.')}
});
if(/[?&]demo\b/.test(location.search))ouvrirDemo();
rendre();
