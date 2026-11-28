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
/* Classe d'une fiche : même classe malgré majuscules/espaces ; sans classe (ou classe inconnue) : la classe
   dont la liste contient le plus de ces élèves. Évite les groupes « isolés » hors de leur classe. */
function classeDe(c,noms){const K=Object.keys(DB.classes),nc=norm(c);const ex=K.find(k=>norm(k)===nc);if(ex)return ex;
  let best=null,bn=0;K.forEach(k=>{const L=new Set((DB.classes[k].eleves||[]).map(norm));const n=noms.filter(x=>L.has(norm(x))).length;if(n>bn){bn=n;best=k}});
  return best||c||'Sans classe'}
function rangerIsoles(){let n=0;Object.entries(DB.el).forEach(([k,E])=>{if(DB.classes[E.classe])return;const c=classeDe(E.classe,[E.nom]);if(c&&DB.classes[c]&&c!==E.classe){const k2=cle(c,E.nom),F=DB.el[k2];
    if(F){Object.entries(E.v).forEach(([nv,v])=>{const w=F.v[nv]||{};if(v.e&&(!w.e||v.e>w.e)){w.e=v.e;w.par=v.par}if(v.p&&!w.p){w.p=v.p;w.pp=v.pp}if(v.deb)w.deb=1;F.v[nv]=w});F.maj=Math.max(F.maj||0,E.maj||0)}
    else DB.el[k2]=Object.assign(E,{classe:c});delete DB.el[k];n++}});if(n){journal(n+' élève(s) rangé(s) dans leur classe');sauver()}}
/* v1.8 : QR de groupe allégé (v:2, appli élève v1.17) : dates en minutes avant l'envoi, observateur = numéro dans le groupe.
   On le remet au format complet avant de l'importer : rien ne change dans les données. */
function deV2(o){if(!o||o.v!==2||!Array.isArray(o.el))return o;
  o.el.forEach(x=>{const d={};Object.entries(x.d||{}).forEach(([k,v])=>{d[k]=[o.ts-(+v[0]||0)*60,typeof v[1]==='number'?((o.el[v[1]]||{}).n||''):(v[1]||''),0]});x.d=d});o.v=1;return o}
/* QR de groupe en plusieurs morceaux (GYMQ:id:i/n:…) : on les rassemble, dans n'importe quel ordre */
const MORCEAUX={};
async function lireTexteGroupe(t){t=String(t||'').trim();const m=/^GYMQ:([a-z0-9]+):(\d+)\/(\d+):(.*)$/.exec(t);
  if(!m)return GQR.decoder(t);const M=MORCEAUX[m[1]]=MORCEAUX[m[1]]||{n:+m[3],p:{}};M.p[+m[2]]=m[4];const nb=Object.keys(M.p).length;
  if(nb<M.n)return {partiel:`QR ${nb} sur ${M.n} lu : montrez le suivant.`};delete MORCEAUX[m[1]];return GQR.decoder(Array.from({length:M.n},(_,i)=>M.p[i+1]).join(''))}
function importerObjet(o,source){
  o=deV2(o);
  if(!o||o.a!=='GYM'||o.t!=='G')throw new Error('Ce n’est pas une fiche de groupe gym.');
  const c=classeDe(o.c||'',(o.el||[]).map(x=>x.n));let n=0;
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
    E.maj=Math.max(E.maj,o.ts*1000);E.recu=Date.now();n++;
  });
  /* composition du groupe (vue « Par groupe ») */
  DB.groupes=DB.groupes||{};{const noms=(o.el||[]).map(x=>x.n),gk=norm(c)+'|'+(o.g||noms.map(norm).sort().join('+')),G=DB.groupes[gk]||{};
    if(!G.maj||o.ts*1000>=G.maj)DB.groupes[gk]={classe:c,noms,maj:o.ts*1000,recu:Date.now(),lt:o.lt||G.lt||''}}
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
    const c=classeDefaut||(iCl>=0&&r[iCl]);if(!c)return; /* nom écrit = groupe : remplace la classe Pronote (groupes de Terminale) */
    (out[c]=out[c]||new Set()).add(n.trim());
  });
  return out;
}
const triNom=(a,b)=>{const k=n=>{const p=partsNom(n);return norm(p.nom+' '+p.pre)};return k(a).localeCompare(k(b))};
/* Classe déjà présente : ajouter les élèves du fichier à la liste actuelle, ou remplacer la liste */
const cleNomL=n=>String(n||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().split(/[\s'’-]+/).filter(Boolean).sort().join(' ');
function modeListe(C,actuelle,tout){
  const ex=C.filter(c=>(actuelle(c)||[]).length);if(!ex.length)return Promise.resolve('remplacer');
  const e=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  let petit=false;
  const lignes=ex.map(c=>{const a=actuelle(c),ka=new Set(a.map(cleNomL)),f=[...tout[c].keys()],kf=new Set(f.map(cleNomL));
    const nv=f.filter(n=>!ka.has(cleNomL(n))).length,abs=a.filter(n=>!kf.has(cleNomL(n))).length;if(f.length<a.length/2)petit=true;
    return `<li><b>${e(c)}</b> : ${a.length} élève${a.length>1?'s':''} dans l’appli, ${f.length} dans le fichier — ${nv} nouveau${nv>1?'x':''}${abs?`, ${abs} absent${abs>1?'s':''} du fichier`:''}</li>`}).join('');
  return new Promise(ok=>{const d=document.createElement('div');
    d.style.cssText='position:fixed;inset:0;z-index:2147483000;background:rgba(15,20,30,.55);display:flex;align-items:center;justify-content:center;padding:16px';
    const bt=(v,t,s,pri)=>`<button type="button" data-v="${v}" style="display:block;width:100%;text-align:left;min-height:52px;margin:8px 0 0;padding:10px 14px;border-radius:12px;border:0;font:inherit;cursor:pointer;background:${pri?'#1c2128':'#e5e9f0'};color:${pri?'#fff':'#14181f'}"><b>${t}</b><br><span style="font-size:14px;opacity:.85">${s}</span></button>`;
    d.innerHTML=`<div role="dialog" aria-modal="true" style="background:#fff;color:#14181f;border-radius:16px;max-width:500px;width:100%;max-height:90vh;overflow:auto;padding:18px;font-size:17px;line-height:1.4;box-shadow:0 12px 40px rgba(0,0,0,.3)">
      <h3 style="margin:0 0 6px;font-size:21px">Cette classe existe déjà</h3><ul style="margin:6px 0;padding-left:20px;font-size:15px">${lignes}</ul>
      ${bt('ajout','Ajouter ces élèves','Garde la liste actuelle et ajoute seulement les noms nouveaux. Pour un élève arrivé en cours d’année.',petit)}
      ${bt('remplacer','Remplacer la liste','La liste devient celle du fichier. Un élève absent du fichier garde ses résultats, mais passe « Hors liste ».',!petit)}
      ${bt('','Annuler','Ne rien changer.',false)}</div>`;
    d.addEventListener('click',ev=>{const b=ev.target.closest('button[data-v]');if(!b)return;d.remove();ok(b.dataset.v||null)});
    document.body.appendChild(d)})}
function fusionListe(t,anciens){const vus=new Set([...t.keys()].map(cleNomL));(anciens||[]).forEach(n=>{if(!vus.has(cleNomL(n))){t instanceof Map?t.set(n,''):t.add(n)}})}
async function importerListe(files,texte,classeDefaut){
  const lots=[];
  if(files&&files.length&&!window.XLSX)await chargerScript('xlsx.js');
  for(const f of files||[]){
    const buf=await f.arrayBuffer();let wb;
    if(/\.(csv|txt)$/i.test(f.name)||/text|csv/.test(f.type)){
      let t;try{t=new TextDecoder('utf-8',{fatal:true}).decode(buf)}catch(e){t=new TextDecoder('windows-1252').decode(buf)}
      t=t.replace(/^﻿/,'');const l0=t.split(/\r?\n/)[0],sep=['\t',';',','].map(c=>[c,l0.split(c).length]).sort((a,b)=>b[1]-a[1])[0][0];
      wb=XLSX.read(t,{type:'string',FS:sep});
    }else wb=XLSX.read(buf,{type:'array'});
    wb.SheetNames.forEach(sn=>lots.push(XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:false,defval:''})));
  }
  if(texte&&texte.trim())lots.push(texte.trim().split(/\r?\n/).map(l=>l.split(/\t|;/)));
  const tout={};lots.forEach(rows=>Object.entries(lireLignes(rows,classeDefaut)).forEach(([c,set])=>{tout[c]=tout[c]||new Set();set.forEach(n=>tout[c].add(n))}));
  const C=Object.keys(tout);
  if(!C.length){alert(classeDefaut?'Aucun nom trouvé.':'Aucun élève trouvé. Il faut une colonne « Classe », ou écrire le nom de la classe avant d’importer.');return}
  const avant={};C.forEach(c=>avant[c]=((DB.classes[c]||{}).eleves||[]).slice());
  const mode=await modeListe(C,c=>avant[c],tout);if(!mode)return;
  if(mode==='ajout')C.forEach(c=>fusionListe(tout[c],avant[c]));
  C.forEach(c=>{const old=DB.classes[c]||{};DB.classes[c]={eleves:[...tout[c]].sort(triNom),lien:old.lien||'',barres:!!old.barres,liaisons:!!old.liaisons}});
  journal('Listes importées : '+C.map(c=>c+' ('+tout[c].size+')').join(', '));if(mode==='ajout'){const r=C.map(c=>{const ka=new Set(avant[c].map(cleNomL)),nv=[...tout[c].keys()].filter(n=>!ka.has(cleNomL(n)));return c+' : '+(nv.length?'+'+nv.length+' ('+nv.join(', ')+')':'aucun nouveau nom')+' → '+tout[c].size+' élèves'});setTimeout(()=>alert('Élèves ajoutés\n'+r.join('\n')+'\n\nPense à refaire scanner le QR de démarrage aux groupes de cette classe.'),50)}
  DB.classe=C[0];DB.vue='tableau';sauver();rendre();
}
function chaineEleve(E){return GYM.ateliers.map(a=>NIVS.map(n=>{const v=E.v[a.n+n]||{};return v.p?'p':v.e?'e':v.deb?'d':'0'}).join('')).join('')}
async function empreinte(code){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('gym-prof|'+code));return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,24)}
async function qrDemarrage(c,cjForce,svgSeul){
  const L=DB.classes[c]=DB.classes[c]||{eleves:elevesClasse(c).map(x=>x.nom),lien:'',barres:false};if(!L.cc){L.cc=EPSCode.nouvelleCle();sauver()}
  // validations connues par élève (6 ateliers × 6 niveaux : 0, e, p, d) — seules les lignes non vides
  const pv={};elevesClasse(c).forEach(x=>{const ch=chaineEleve(x.E);if(/[epd]/.test(ch))pv[x.nom]=ch});
  const txt=await GQR.encoder({a:'GYM',v:1,t:'C',c,l:L.eleves,u:L.lien||'',pk:(await SIGNE.cles()).pub,b:L.barres?1:0,li:L.liaisons?1:0,tc:L.tc?1:0,cc:L.cc,cj:cjForce||await EPSCode.cjDuJour('gyp',c,L.cc,'G'),pv,ts:Math.round(Date.now()/1000)});
  let svg;try{svg=GQR.svgQR(txt)}catch(e){svg='<p class="alerte">Liste trop longue pour un seul QR.</p>'}
  if(svgSeul)return svg;
  const d=document.createElement('div');d.className='voile';
  d.innerHTML=`<div class="fen" style="max-width:640px"><h2>Classe ${esc(c)} · gymnastique</h2><p>Appli élève : « QR de la classe (prof) », ou Groupe → « Scanner le QR de la classe ».</p><p class="small" style="background:#fff7ed;border-left:6px solid #ea580c;padding:6px 10px;border-radius:8px">🎬 <b>Au premier cours</b> : faites télécharger les vidéos avec le Wi-Fi du lycée (Accueil de l’appli élève → « Télécharger les vidéos », environ 90 Mo). Sinon certaines ne se chargeront pas au gymnase.</p><p class="small muted">Le QR contient aussi vos validations P : elles s’ajoutent sur les tablettes, et un groupe qui a oublié son code retrouve ses niveaux en recréant son carnet avec la liste de la classe.</p><div class="qrbox">${svg}</div><button class="bt noir" type="button" style="margin-top:12px">Fermer</button></div>`;
  d.querySelector('button').onclick=()=>d.remove();document.body.appendChild(d);
  const bA=document.createElement('button');bA.className='bt act';bA.type='button';bA.textContent='🖨 Affiche du premier cours (A4)';bA.style.marginTop='10px';bA.onclick=()=>afficheCours(c,svg);d.querySelector('.fen').appendChild(bA);
  const bP=document.createElement('button');bP.className='bt';bP.type='button';bP.textContent='🗓 QR pour un autre jour · imprimer';bP.style.margin='10px 0 0 8px';bP.onclick=()=>EPSCode.preparer({app:'gyp',classe:c,cle:L.cc,titre:'Gymnastique',seances:[{v:'G',n:'Gym'}],qr:cj=>qrDemarrage(c,cj,true)});d.querySelector('.fen').appendChild(bP);
}
/* Affiche A4 : QR de l'appli (appareil photo) + QR de la classe (dans l'appli), avec les étapes */
function afficheCours(c,svgClasse){const URL_APP='https://yannickdartois-hue.github.io/gym-eleves/';
  const a=document.createElement('div');a.id='affiche';
  a.innerHTML=`<h1>Gymnastique · premier cours · ${esc(c)}</h1><div class="aff2">
   <div><h2>① Installer l’appli</h2>${GQR.svgQR(URL_APP)}<ol><li>Scannez ce QR avec <b>l’appareil photo</b>.</li><li>Ajoutez l’appli à l’<b>écran d’accueil</b> (iPhone : Partager → « Sur l’écran d’accueil » ; Android : ⋮ → « Installer »).</li><li><b>Ouvrez l’appli avec son icône</b> et touchez « Télécharger les vidéos » (Wi-Fi).</li></ol></div>
   <div><h2>② Entrer dans la classe</h2>${svgClasse}<ol><li>Dans l’appli : « 📷 Scanner le QR de la classe ».</li><li>« Créer notre groupe » : lettre du groupe, code à 4 chiffres (notez-le !).</li><li>Cochez vos noms dans la liste.</li></ol></div></div>
   <p class="pied">Le QR ② donne la liste de la classe ; la séance qu’il ouvre n’est valable qu’aujourd’hui (${new Date().toLocaleDateString('fr-FR')}).</p>`;
  document.body.appendChild(a);document.body.classList.add('impr-affiche');
  const fin=()=>{document.body.classList.remove('impr-affiche');a.remove();window.removeEventListener('afterprint',fin)};window.addEventListener('afterprint',fin);setTimeout(()=>window.print(),200)}

/* ---------- Vues ---------- */
function elevesClasse(c){
  const L=(DB.classes[c]&&DB.classes[c].eleves)||[];
  const set=new Map(L.map(n=>[cle(c,n),n]));
  Object.entries(DB.el).forEach(([k,E])=>{if(norm(E.classe)===norm(c)&&!set.has(k))set.set(k,E.nom)});
  return [...set.entries()].map(([k,n])=>({k,nom:n,E:DB.el[k]||{nom:n,classe:c,v:{},maj:0},horsListe:!L.includes(n)})).sort((a,b)=>triNom(a.nom,b.nom));
}
function classesConnues(){return [...new Set([...Object.keys(DB.classes),...Object.values(DB.el).map(e=>e.classe)])].sort()}
function rendre(){
  try{rangerIsoles()}catch(e){}
  const C=classesConnues();if(!DB.classe&&C.length)DB.classe=C[0];
  const T=[['tableau','📊','Classe'],['appel','📋','Appel'],['valider','✅','À valider'],['recevoir','📥','Recevoir'],['classes','⚙️','Réglages']];
  $('#onglets').innerHTML=T.map(([k,i,l])=>`<button type="button" class="${DB.vue===k?'ici':''}" data-act="vue" data-v="${k}"><i>${i}</i>${l}${k==='valider'&&nbAValider()?' ('+nbAValider()+')':''}</button>`).join('');
  $('#sous').textContent=DB.classe?'Classe '+DB.classe:'Lycée Georges Pompidou';
  const sel=C.length?`<div class="qui">${C.map(c=>`<button type="button" class="${c===DB.classe?'ici':''}" data-act="classe" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>`:'';
  $('#app').innerHTML=bandeauDemo()+(DB.eleve&&DB.vue==='tableau'?vEleve(DB.eleve):{tableau:()=>sel+(DB.vueGr?vParGroupe():DB.vueAt?vParAtelier():vTableau()),appel:()=>sel+vAppelGym(),valider:()=>sel+vValider(),recevoir:()=>sel+vRecevoir(),classes:vClasses}[DB.vue]());
}
function cellule(E,a){const p=meilleur(E,a,'p'),e=meilleur(E,a,'e');
  return `<td>${p?`<span class="L L${p}" style="width:36px;height:36px;font-size:20px">${p}</span>`:'<span class="muted">–</span>'}${e&&e!==p?`<span class="eseul" title="validé E par un camarade, à confirmer"><span class="L L${e}">${e}</span><small>E</small></span>`:''}</td>`}
/* Suivi des scans (comme en athlétisme) : reçu aujourd'hui / un autre jour / jamais */
const jourDe=t=>{const d=new Date(t);return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate()};
function recuEtat(E){const t=E&&(E.recu||E.maj);if(!t)return 'non';return jourDe(t)===jourDe(Date.now())?'auj':'avant'}
function pastille(E){const s=recuEtat(E);return `<span class="pst ${s}" title="${s==='auj'?'reçu aujourd’hui':s==='avant'?'reçu un autre jour':'pas encore reçu'}"></span>`}
/* v. « Encore N élèves à scanner » affiché dans le scanner, sous le nom des élèves lus (règle commune des outils prof).
   manque : noms des élèves de la classe sans séance reçue (hors absents notés à l'appel) ; lib : « classe · séance ». */
function resteBloc(manque,total,lib,nAbs){if(!total)return '';const s=manque.length>1?'s':'',ab=nAbs?` · ${nAbs} absent${nAbs>1?'s':''} non compté${nAbs>1?'s':''}`:'';
  return manque.length?`<div class="scan-reste" style="background:#fff7ed;border:2px solid #fb923c;border-radius:12px;padding:8px 10px;color:#14181f;text-align:left"><b style="font-size:20px">Encore ${manque.length} élève${s} à scanner</b> <span style="font-size:14px">· ${esc(lib)}${ab}</span><div style="font-size:15px;margin-top:4px;line-height:1.35">${manque.map(esc).join(', ')}</div></div>`
    :`<div class="scan-reste ok" style="background:#dcfce7;border:2px solid #22c55e;border-radius:12px;padding:8px 10px;color:#14532d;text-align:left"><b style="font-size:20px">✓ Toute la classe est scannée</b> <span style="font-size:14px">· ${esc(lib)}${ab}</span></div>`}
function resteHTML(){if(!DB.classe)return '';const auj=apJour(),L=elevesClasse(DB.classe).filter(x=>!x.horsListe&&x.E.st!=='disp'),
    abs=L.filter(x=>apStatut(DB.classe,auj,x.k,null).s==='a'),m=L.filter(x=>!abs.includes(x)&&recuEtat(x.E)!=='auj');
  return resteBloc(m.map(x=>x.nom),L.length,DB.classe+' · aujourd’hui',abs.length)}
/* ---------- Appel (chantier 10) : en gym, la séance est la date du cours ---------- */
function vAppelGym(){const c=DB.classe;if(!c)return '<p class="muted">Choisissez d’abord une classe (onglet Réglages).</p>';
  const auj=apJour();let d=DB.apD&&DB.apD.c===c&&DB.apD.j===auj?DB.apD.d:auj;
  const dates=[...new Set(Object.keys(apBase()).filter(id=>id.slice(0,id.lastIndexOf('|'))===c).map(id=>id.slice(id.lastIndexOf('|')+1)).concat([auj]))].sort().reverse().slice(0,12);
  const choix=`<div class="ap-act" style="align-items:center"><label class="small" for="ap-date"><b>Date du cours</b></label><input type="date" id="ap-date" value="${esc(d)}" max="${auj}" style="min-height:46px;font-size:16px;border-radius:12px;border:2px solid #cbd5e1;padding:0 10px"></div>${dates.length>1?`<div class="qui">${dates.map(x=>`<button type="button" class="${x===d?'ici':''}" data-apd="${esc(x)}">${esc(x===auj?'Aujourd’hui':new Date(x+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'}))}</button>`).join('')}</div>`:''}`;
  const K=elevesClasse(c).map(x=>({k:x.k,nom:x.nom,auto:APA.autoDe(x.k,d)}));
  return apVue(c,d,'cours du '+apDateFr(d),K,choix)}
const APA={db:()=>DB,sauver:()=>sauver(),rendre:()=>{const y=scrollY;rendre();scrollTo(0,y)},sansRefaite:true,dateDe:s=>s,
  lien:(k,nom)=>`<button type="button" class="ap-nom" data-apfiche="${esc(k)}">${esc(nom)}</button>`,
  nom:k=>(DB.el[k]&&DB.el[k].nom)||k,nomSeance:s=>'cours du '+s,autoTxt:'d’après le statut du cycle dans la fiche',
  autoDe:k=>{const E=DB.el[k];if(E&&E.st==='ip')return {s:'ip',info:'inapte partiel (cycle)'};if(E&&E.st==='disp')return {s:'i',info:'dispensé du cycle'};return null}};
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-apfiche],[data-apd]');if(!b)return;e.preventDefault();e.stopPropagation();
  if(b.dataset.apfiche!=null){DB.vue='tableau';DB.eleve=b.dataset.apfiche;rendre();scrollTo(0,0);return}
  DB.apD={c:DB.classe,d:b.dataset.apd,j:apJour()};sauver();rendre()},true);
document.addEventListener('change',e=>{if(e.target&&e.target.id==='ap-date'&&e.target.value){DB.apD={c:DB.classe,d:e.target.value,j:apJour()};sauver();rendre()}});
/* lien vers le cahier de textes (résumés Pronote) de l'écran de cours du cycle */
const CAHIER_URL='https://yannickdartois-hue.github.io/cycle-gym/index.html#cahier';
function cahierLien(){return `<a href="${CAHIER_URL}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:12px;min-height:56px;margin:10px 0 14px;padding:10px 14px;border-radius:14px;border:2px solid #334155;background:#fff;color:#1c2128;text-decoration:none;font-weight:800;font-size:17px"><span style="font-size:24px">📋</span><span>Cahier de textes · résumés à coller dans Pronote<small style="display:block;font-weight:400;font-size:14px;color:#5b6470">Ouvre l’écran de cours du cycle (texte de chaque séance, PDF, Word)</small></span></a>`}
/* ===================== Appel (chantier 10, 26/11/2026) =====================
   Repris du module d'appel de Demi-fond et mis à niveau. Code propre à cet outil (copie autonome).
   4 statuts exclusifs : Présent · Absent · Inapte · Inapte partiel (absent ≠ inapte, partout).
   Précisions cumulables : en retard, oubli de tenue, absence justifiée, oubli d'envoi.
   Données : <base>.appel2['classe|séance'] = [ {d:'AAAA-MM-JJ', t, el:{ clé élève:{s,m:[],t} }} , … ]
   - la date est fixée au 1er appel de la séance ; les corrections modifient ce même appel ;
   - « Séance refaite aujourd'hui » ajoute un nouvel appel daté : les précédents sont gardés ;
   - toucher le statut actif le retire (retour au statut automatique ou « non renseigné »).
   L'adaptateur APA (défini juste avant ce bloc) relie le module à l'outil.
   Chantier 13 : « Bilan » de fin de cours = appréciation générale facultative (☹ 🙁 🙂 😃), champ « ap » (1 à 4)
   de la même entrée (élève × séance × date) : une seule par élève et par séance, modifiable, historique gardé.
   Ce n'est ni une note ni une évaluation de compétence : rien n'est calculé à partir d'elle.
   v2 (28/11/2026) : écran d'appel en grille d'étiquettes (voir apVue). */
const AP4=[['p','Présent','P'],['a','Absent','A'],['i','Inapte','I'],['ip','Inapte partiel','IP']];
const AP4N={p:'Présent',a:'Absent',i:'Inapte',ip:'Inapte partiel'};
const APP=[[1,'☹','Pas bon','#dc2626','#fee2e2'],[2,'🙁','Moyen','#ea580c','#ffedd5'],[3,'🙂','Bien','#65a30d','#ecfccb'],[4,'😃','Très bien','#15803d','#dcfce7']];
const APPN={1:'Pas bon',2:'Moyen',3:'Bien',4:'Très bien'},APPE={1:'☹',2:'🙁',3:'🙂',4:'😃'};
let AP_MODE=(()=>{try{return localStorage.getItem('eps-ap-mode:'+location.pathname)||'appel'}catch(e){return 'appel'}})();
const APM={retard:'En retard',tenue:'Oubli de tenue',just:'Absence justifiée',oubli:'Oubli d’envoi'};
const apJour=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const apDateFr=d=>{try{return new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}catch(e){return d}};
function apBase(){const B=APA.db();return B.appel2=B.appel2||{}}
function apRecs(c,s){return apBase()[c+'|'+s]||[]}
function apRec(c,s){const L=apRecs(c,s);return L.length?L[L.length-1]:null}
/* statut final d'un élève : manuel (appel), sinon ancien appel (avant ce module), sinon automatique */
function apStatut(c,s,k,auto){
  const r=apRec(c,s),e=r&&r.el[k];
  if(e&&e.s)return {s:e.s,m:e.m||[],src:'appel'};
  const a=auto||{};
  if(e&&!e.s&&(e.m||[]).length)return {s:a.s||'',m:e.m,src:a.s?'auto':'',info:a.info};
  const o=APA.ancien&&APA.ancien(c,s,k);if(o&&o.s)return {s:o.s,m:o.m||[],src:'ancien'};
  return {s:a.s||'',m:[],src:a.s?'auto':'',info:a.info};
}
function apModifier(c,s,k,f){
  const B=apBase(),id=c+'|'+s,L=B[id]=B[id]||[];let r=L[L.length-1];
  if(!r){r={d:APA.dateDe?APA.dateDe(s):apJour(),t:Date.now(),el:{}};L.push(r)}
  const e=f(r.el[k]?{s:r.el[k].s||'',m:(r.el[k].m||[]).slice(),ap:r.el[k].ap||0}:{s:'',m:[],ap:0});
  if(e&&!e.ap)delete e.ap;
  if(e&&(e.s||e.m.length||e.ap)){e.t=Date.now();r.el[k]=e}else delete r.el[k];
  r.maj=Date.now();
}
function apRefaite(c,s){const B=apBase(),id=c+'|'+s,L=B[id]=B[id]||[];const r=L[L.length-1];if(r&&r.d===apJour())return false;L.push({d:apJour(),t:Date.now(),el:{},refaite:true});return true}
let AP_CTX=null;   /* contexte de l'écran d'appel affiché : {c,s,K:[{k,nom,auto}]} */
function apStyle(){if(document.getElementById('ap-style'))return;const st=document.createElement('style');st.id='ap-style';st.textContent=`
.ap-tete{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0}
.ap-cpt{display:inline-block;padding:4px 10px;border-radius:999px;font-weight:800;font-size:14px;background:#eef2f6;color:#1c2128}
.ap-cpt.p{background:#dcfce7;color:#166534}.ap-cpt.a{background:#fee2e2;color:#991b1b}.ap-cpt.i{background:#e0e7ff;color:#3730a3}.ap-cpt.ip{background:#fef3c7;color:#92400e}.ap-cpt.n{background:#f1f5f9;color:#475569}
.ap-liste{list-style:none;margin:8px 0;padding:0;display:grid;gap:8px}
@media(min-width:760px){.ap-liste{grid-template-columns:1fr 1fr}}
.ap-l{border:2px solid #e2e8f0;border-radius:14px;padding:10px;background:#fff}
.ap-l.s-p{border-color:#86efac}.ap-l.s-a{border-color:#fca5a5}.ap-l.s-i{border-color:#a5b4fc}.ap-l.s-ip{border-color:#fcd34d}
.ap-n{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;margin-bottom:8px}
.ap-nom{background:none;border:0;padding:0;font:inherit;font-weight:800;font-size:17px;color:#14181f;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-color:#cbd5e1}
.ap-info{font-size:13.5px;color:#475569}.ap-info.al{color:#b42318;font-weight:700}
.ap-b{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.ap-b button{min-height:48px;border-radius:12px;border:2px solid #cbd5e1;background:#fff;color:#14181f;font-family:inherit;font-weight:800;font-size:17px;line-height:1;cursor:pointer;padding:0 4px}
.ap-b button small{display:block;font-weight:600;font-size:11px;margin-top:2px}
.ap-b button[aria-pressed=true].p{background:#15803d;border-color:#15803d;color:#fff}.ap-b button[aria-pressed=true].a{background:#b91c1c;border-color:#b91c1c;color:#fff}
.ap-b button[aria-pressed=true].i{background:#4338ca;border-color:#4338ca;color:#fff}.ap-b button[aria-pressed=true].ip{background:#b45309;border-color:#b45309;color:#fff}
.ap-b button.auto{border-style:dashed}
.ap-m{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.ap-m button{min-height:40px;border-radius:999px;border:2px solid #cbd5e1;background:#fff;color:#334155;font-family:inherit;font-weight:700;font-size:14px;padding:0 12px;cursor:pointer}
.ap-m button[aria-pressed=true]{background:#334155;border-color:#334155;color:#fff}
.ap-act{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
.ap-act button{min-height:46px;border-radius:12px;border:2px solid #1c2128;background:#1c2128;color:#fff;font-family:inherit;font-weight:700;font-size:15px;padding:0 14px;cursor:pointer}
.ap-act button.sec{background:#fff;color:#1c2128;border-color:#cbd5e1}
.ap-date{font-size:14px;color:#475569;margin:4px 0}
.ap-hist{width:100%;border-collapse:collapse;font-size:14px}.ap-hist th,.ap-hist td{padding:5px 6px;border-top:1px solid #e2e8f0;text-align:center}.ap-hist th:first-child,.ap-hist td:first-child{text-align:left}
.ap-hw{overflow-x:auto}
.ap-mode{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0;max-width:560px}
.ap-mode button{min-height:48px;border-radius:12px;border:2px solid #cbd5e1;background:#fff;color:#1c2128;font-family:inherit;font-weight:800;font-size:16px;cursor:pointer}
.ap-mode button[aria-pressed=true]{background:#1c2128;border-color:#1c2128;color:#fff}
.ap-s{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.ap-s button{min-height:58px;border-radius:12px;border:2px solid #e2e8f0;background:#fff;color:#334155;font-family:inherit;cursor:pointer;padding:2px}
.ap-s button span{display:block;font-size:26px;line-height:1.1}.ap-s button small{display:block;font-size:12px;font-weight:700;margin-top:2px}
.ap-s button[aria-pressed=true]{color:#fff}
.ap-st{display:inline-block;font-size:12px;font-weight:800;border-radius:999px;padding:2px 8px;background:#eef2f6;color:#475569}
.ap-l.b-1{border-color:#fca5a5}.ap-l.b-2{border-color:#fdba74}.ap-l.b-3{border-color:#bef264}.ap-l.b-4{border-color:#86efac}`;document.head.appendChild(st)}
/* écran d'appel : c classe, s séance, sNom libellé, K [{k,nom,auto:{s,info,nonRecu}}], choix html du sélecteur de séance
   v2 (28/11/2026, à la demande de Yannick) : grille compacte d'étiquettes, tout le monde présent par défaut.
   Un toucher sur un nom fait défiler : Présent → Absent → Inapte → Inapte partiel → Présent.
   Appui long : fenêtre avec les 4 statuts, les précisions et le lien vers la fiche. */
let AP_FEN=null;   /* clé de l'élève dont la fenêtre (appui long) est ouverte */
const AP_CYCLE={p:'a',a:'i',i:'ip',ip:'p','':'a'};
const AP_ICO={retard:'⏰ retard',tenue:'👕 tenue',just:'✉️ justifié',oubli:'📤 oubli d’envoi'};
function apVue(c,s,sNom,K,choix){
  apStyle();apStyle2();AP_CTX={c,s,K};
  const r=apRec(c,s),L=K.map(x=>Object.assign({},x,{st:apStatut(c,s,x.k,x.auto)}));
  const n={p:0,a:0,i:0,ip:0,'':0};L.forEach(x=>n[x.st.s||'']++);
  const recus=K.filter(x=>!(x.auto&&x.auto.nonRecu)).length;
  const auj=apJour(),dateTxt=r?`Appel du <b>${esc(apDateFr(r.d))}</b>${r.d!==auj?' · <span class="ap-info al">ce n’est pas aujourd’hui</span>':''}${apRecs(c,s).length>1?` · ${apRecs(c,s).length} appels pour cette séance`:''}`:`Rien d’enregistré pour cette séance : ce sera daté d’aujourd’hui (${esc(apDateFr(auj))}).`;
  const modeHtml=`<div class="ap-mode" role="group" aria-label="Écran"><button type="button" data-apmode="appel" aria-pressed="${AP_MODE!=='bilan'}">📋 Appel</button><button type="button" data-apmode="bilan" aria-pressed="${AP_MODE==='bilan'}">🙂 Bilan de fin de cours</button></div>`;
  if(AP_MODE==='bilan')return apBilan(c,s,sNom,L,choix,dateTxt,modeHtml,K);
  const tuile=x=>{const st=x.st,sel=st.s||'',vu=sel||'p',auto=st.src!=='appel',m=st.m||[];
    const tip=`${AP4N[vu]}${!sel?' (par défaut)':auto?' (proposé '+(APA.autoTxt||'automatiquement')+')':''}`;
    return `<button type="button" class="ap-t t-${vu}${auto?' t-auto':''}${m.length?' t-m':''}" data-apt="${esc(x.k)}" title="${esc(x.nom)} : ${esc(tip)}" aria-label="${esc(x.nom)} : ${esc(tip)}">
      <span class="ap-tn">${esc(x.nom)}</span><span class="ap-ts">${{p:'P',a:'A',i:'I',ip:'IP'}[vu]}</span>${m.length?`<span class="ap-tm">${m.map(z=>AP_ICO[z]||z).join(' · ')}</span>`:''}</button>`};
  const nonR=n[''];
  return `<h2>Appel · ${esc(sNom)}</h2>${modeHtml}${choix||''}
   <p class="ap-date">${dateTxt}</p>
   <div class="ap-tete2"><span class="ap-cpt p">${n.p+nonR} présent${n.p+nonR>1?'s':''}</span><span class="ap-cpt a">${n.a} absent${n.a>1?'s':''}</span><span class="ap-cpt i">${n.i} inapte${n.i>1?'s':''}</span><span class="ap-cpt ip">${n.ip} inapte${n.ip>1?'s':''} partiel${n.ip>1?'s':''}</span><span class="ap-recus">📥 ${recus} carnet${recus>1?'s':''} reçu${recus>1?'s':''} sur ${K.length}</span></div>
   <p class="ap-aide">Tout le monde est présent. <b>Touche un nom</b> : Absent → Inapte → Inapte partiel → Présent. <b>Appui long</b> : retard, tenue, absence justifiée, fiche de l’élève.</p>
   <div class="ap-grille">${L.map(tuile).join('')}</div>
   <p class="ap-leg"><span><i class="lp"></i>P présent</span><span><i class="la"></i>A absent</span><span><i class="li"></i>I inapte</span><span><i class="lip"></i>IP inapte partiel</span><span>Pointillés : statut proposé, pas encore confirmé</span></p>
   <div class="ap-act2">${nonR?`<button type="button" class="ap-fin" data-apx="tous">✓ Appel terminé : ${nonR} présent${nonR>1?'s':''} à enregistrer</button>`:`<span class="ap-ok">✓ Appel enregistré</span>`}<button type="button" class="sec" data-apmode="bilan">🙂 Bilan</button></div>
   <div class="ap-act">${r&&r.d!==auj&&!APA.sansRefaite?'<button type="button" class="sec" data-apx="refaite">📅 Séance refaite aujourd’hui (nouvel appel)</button>':''}<button type="button" class="sec" data-apx="csv">⬇ Exporter l’appel (CSV)</button></div>
   ${apRecap(c,K)}${AP_FEN?apFen(L.find(x=>x.k===AP_FEN)):''}`;
}
/* fenêtre de l'appui long : 4 statuts, précisions, fiche */
function apFen(x){if(!x)return '';const st=x.st,sel=st.s||'p',m=st.m||[];
  const pm=sel==='a'?['just']:['retard','tenue'];if(x.auto&&x.auto.nonRecu&&sel!=='a')pm.push('oubli');m.forEach(z=>{if(!pm.includes(z))pm.push(z)});
  return `<div class="ap-voile" data-apfx="1"><div class="ap-fen" role="dialog" aria-label="${esc(x.nom)}"><div class="ap-fh"><b>${esc(x.nom)}</b><button type="button" class="ap-fx" data-apfx="1" aria-label="Fermer">✕</button></div>
   <div class="ap-f4">${AP4.map(([v,l,ab])=>`<button type="button" class="${v}${sel===v?' on':''}" data-ap4="${esc(x.k)}|${v}" aria-pressed="${sel===v}">${ab}<small>${l}</small></button>`).join('')}</div>
   <div class="ap-fm">${pm.map(z=>`<button type="button" class="${m.includes(z)?'on':''}" data-apm="${esc(x.k)}|${z}" aria-pressed="${m.includes(z)}">${AP_ICO[z]||APM[z]}</button>`).join('')}</div>
   <div class="ap-ff">${APA.lien(x.k,'📄 Fiche de l’élève')}${x.auto&&x.auto.info?`<span class="ap-info">${esc(x.auto.info)}</span>`:x.auto&&x.auto.nonRecu?'<span class="ap-info">carnet pas encore reçu</span>':''}</div></div></div>`}
function apStyle2(){if(document.getElementById('ap-style2'))return;const st=document.createElement('style');st.id='ap-style2';st.textContent=`
.ap-tete2{display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:#fff;border:1px solid #dde2e8;border-radius:16px;padding:10px 12px;margin:8px 0}
.ap-tete2 .ap-cpt{font-size:16px;padding:6px 12px}.ap-tete2 .ap-cpt.i{background:#ffedd5;color:#9a3412}.ap-tete2 .ap-cpt.ip{background:#fef9c3;color:#854d0e}
.ap-recus{margin-left:auto;font-size:15px;color:#5b6470}
.ap-aide{font-size:15px;color:#5b6470;margin:4px 2px 10px;line-height:1.35}
.ap-grille{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
@media(min-width:620px){.ap-grille{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(min-width:760px){.ap-grille{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}}
.ap-t{position:relative;min-height:58px;border-radius:14px;border:2px solid #cfe9d6;background:#fff;padding:8px 44px 8px 12px;text-align:left;font:inherit;font-weight:700;font-size:16px;line-height:1.15;color:#1c2128;display:flex;flex-direction:column;justify-content:center;cursor:pointer;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;touch-action:manipulation}
.ap-tn{overflow-wrap:anywhere}
.ap-ts{position:absolute;right:8px;top:50%;transform:translateY(-50%);min-width:30px;height:30px;padding:0 4px;border-radius:999px;display:grid;place-items:center;font-weight:900;font-size:14px;background:#e7f6ec;color:#15803d}
.ap-tm{display:block;font-size:12.5px;font-weight:700;margin-top:3px;opacity:.95}
.ap-t.t-a{background:#b42318;border-color:#b42318;color:#fff}.ap-t.t-a .ap-ts{background:#fff;color:#b42318}
.ap-t.t-i{background:#ea580c;border-color:#ea580c;color:#fff}.ap-t.t-i .ap-ts{background:#fff;color:#c2410c}
.ap-t.t-ip{background:#facc15;border-color:#eab308;color:#1c2128}.ap-t.t-ip .ap-ts{background:#fff;color:#854d0e}
.ap-t.t-auto{border-style:dashed}.ap-t.t-auto.t-a,.ap-t.t-auto.t-i,.ap-t.t-auto.t-ip{opacity:.82}
.ap-leg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13.5px;color:#5b6470;margin:10px 2px}.ap-leg i{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:5px;vertical-align:-1px}
.ap-leg .lp{background:#15803d}.ap-leg .la{background:#b42318}.ap-leg .li{background:#ea580c}.ap-leg .lip{background:#facc15}
.ap-act2{display:flex;gap:10px;margin:12px 0 6px;align-items:stretch}
.ap-act2 .ap-fin{flex:1;min-height:56px;border-radius:14px;border:0;background:#15803d;color:#fff;font:inherit;font-weight:800;font-size:17px;cursor:pointer}
.ap-act2 .ap-ok{flex:1;display:grid;place-items:center;min-height:56px;border-radius:14px;background:#dcfce7;color:#166534;font-weight:800;font-size:17px}
.ap-act2 .sec{min-height:56px;border-radius:14px;border:2px solid #1c2128;background:#fff;font:inherit;font-weight:800;font-size:16px;padding:0 16px;cursor:pointer}
.ap-voile{position:fixed;inset:0;z-index:2147483000;background:rgba(15,20,30,.45);display:flex;align-items:flex-end;justify-content:center}
@media(min-width:620px){.ap-voile{align-items:center}}
.ap-fen{background:#fff;color:#1c2128;border-radius:22px 22px 0 0;padding:16px 16px 24px;width:100%;max-width:520px;max-height:90vh;overflow:auto}
@media(min-width:620px){.ap-fen{border-radius:22px}}
.ap-fh{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.ap-fh b{font-size:21px}
.ap-fx{min-width:46px;min-height:46px;border-radius:12px;border:2px solid #cbd5e1;background:#fff;font-size:18px;cursor:pointer}
.ap-f4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
.ap-f4 button{min-height:60px;border-radius:12px;border:2px solid #cbd5e1;background:#fff;font:inherit;font-weight:900;font-size:18px;cursor:pointer;line-height:1.1}.ap-f4 small{display:block;font-size:12px;font-weight:700}
.ap-f4 .p.on{background:#15803d;border-color:#15803d;color:#fff}.ap-f4 .a.on{background:#b42318;border-color:#b42318;color:#fff}.ap-f4 .i.on{background:#ea580c;border-color:#ea580c;color:#fff}.ap-f4 .ip.on{background:#facc15;border-color:#eab308}
.ap-fm{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}.ap-fm button{min-height:46px;border-radius:999px;border:2px solid #cbd5e1;background:#fff;font:inherit;font-weight:700;font-size:15px;padding:0 14px;cursor:pointer}.ap-fm .on{background:#e0f2fe;border-color:#0369a1;color:#0369a1}
.ap-ff{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.ap-ff .ap-nom{min-height:46px;border-radius:12px;border:2px solid #1c2128;background:#fff;padding:0 14px;font:inherit;font-weight:800;cursor:pointer}
/* bilan : la carte d'un élève absent ou inapte prend la couleur de son statut (comme la grille d'appel) */
.ap-l.bs-a{background:#b42318;border-color:#b42318;color:#fff}.ap-l.bs-i{background:#ea580c;border-color:#ea580c;color:#fff}.ap-l.bs-ip{background:#facc15;border-color:#eab308;color:#1c2128}
.ap-l.bs-a .ap-nom,.ap-l.bs-i .ap-nom,.ap-l.bs-a .ap-info,.ap-l.bs-i .ap-info{color:#fff}.ap-l.bs-ip .ap-nom,.ap-l.bs-ip .ap-info{color:#1c2128}
.ap-l.bs-a .ap-st,.ap-l.bs-i .ap-st,.ap-l.bs-ip .ap-st{background:#fff;font-weight:800}.ap-l.bs-a .ap-st{color:#b42318}.ap-l.bs-i .ap-st{color:#c2410c}.ap-l.bs-ip .ap-st{color:#854d0e}
:root[data-theme="dark"] .ap-tete2,:root[data-theme="dark"] .ap-t:not(.t-a):not(.t-i):not(.t-ip),:root[data-theme="dark"] .ap-fen{background:#161b22;color:#e6edf3;border-color:#2a313b}
`;document.head.appendChild(st)}
/* toucher = statut suivant ; appui long (0,5 s) = fenêtre */
let AP_LONG=null,AP_LONGFAIT=false;
document.addEventListener('pointerdown',e=>{const t=e.target.closest&&e.target.closest('[data-apt]');if(!t)return;AP_LONGFAIT=false;clearTimeout(AP_LONG);
  AP_LONG=setTimeout(()=>{AP_LONGFAIT=true;AP_FEN=t.dataset.apt;try{navigator.vibrate&&navigator.vibrate(15)}catch(x){}APA.rendre()},500)},true);
['pointerup','pointercancel','pointerleave'].forEach(ev=>document.addEventListener(ev,()=>clearTimeout(AP_LONG),true));
document.addEventListener('scroll',()=>clearTimeout(AP_LONG),true);
document.addEventListener('contextmenu',e=>{if(e.target.closest&&e.target.closest('[data-apt]'))e.preventDefault()},true);
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-apt],[data-ap4],[data-apfx]');if(!b||!AP_CTX)return;
  if(b.dataset.apfx!=null){if(e.target.closest('.ap-fen')&&!e.target.closest('.ap-fx'))return;e.preventDefault();e.stopPropagation();AP_FEN=null;APA.rendre();return}
  e.preventDefault();e.stopPropagation();const {c,s,K}=AP_CTX;
  if(b.dataset.apt!=null){if(AP_LONGFAIT){AP_LONGFAIT=false;return}
    const k=b.dataset.apt,x=K.find(y=>y.k===k)||{},st=apStatut(c,s,k,x.auto),nx=AP_CYCLE[st.s||''];
    apModifier(c,s,k,en=>{en.s=nx;if(nx!=='a')en.m=en.m.filter(m=>m!=='just');else en.m=en.m.filter(m=>m==='just');return en})}
  else{const v=b.dataset.ap4,i=v.lastIndexOf('|'),k=v.slice(0,i),val=v.slice(i+1);
    apModifier(c,s,k,en=>{en.s=val;if(val!=='a')en.m=en.m.filter(m=>m!=='just');else en.m=en.m.filter(m=>m==='just');return en})}
  APA.sauver();APA.rendre();
},true);
/* Bilan de fin de cours : une appréciation facultative par élève (un toucher ; re-toucher l'enlève) */
function apBilan(c,s,sNom,L,choix,dateTxt,modeHtml,K){
  const r=apRec(c,s),apDe=k=>(r&&r.el[k]&&r.el[k].ap)||0;const n={0:0,1:0,2:0,3:0,4:0};
  L.forEach(x=>{if(x.st.s!=='a')n[apDe(x.k)]++});
  const ligne=x=>{const v=apDe(x.k),abs=x.st.s==='a';
    return `<li class="ap-l${v?' b-'+v:''}${x.st.s&&x.st.s!=='p'?' bs-'+x.st.s:''}"><div class="ap-n">${APA.lien(x.k,x.nom)}${x.st.s?`<span class="ap-st">${AP4N[x.st.s]}</span>`:''}</div>
      ${abs?'<p class="ap-info">Absent : pas d’appréciation.</p>':`<div class="ap-s" role="group" aria-label="Appréciation de ${esc(x.nom)}">${APP.map(([q,e,l,col,bg])=>`<button type="button" data-apa="${esc(x.k)}|${q}" aria-pressed="${v===q}" title="${l}" style="${v===q?`background:${col};border-color:${col}`:`background:${bg}`}"><span aria-hidden="true">${e}</span><small>${l}</small></button>`).join('')}</div>`}</li>`};
  return `<h2>Bilan · ${esc(sNom)}</h2>${modeHtml}${choix||''}
   <p class="ap-date">${dateTxt}</p>
   <p class="small">Appréciation générale de la séance, <b>facultative</b> : un toucher par élève, re-toucher pour l’enlever. Ce n’est ni une note ni une évaluation de compétence.</p>
   <div class="ap-tete">${APP.map(([q,e,l,col,bg])=>`<span class="ap-cpt" style="background:${bg};color:${col}">${e} ${l} ${n[q]}</span>`).join('')}${n[0]?`<span class="ap-cpt n">Sans appréciation ${n[0]}</span>`:''}</div>
   <ul class="ap-liste">${L.map(ligne).join('')}</ul>
   <p class="small muted">Gardé avec l’appel de la séance (même date) : changer de séance ou corriger plus tard n’efface rien. Hors connexion, sur l’appareil et dans la sauvegarde.</p>
   ${apRecap(c,K)}`;
}
/* récapitulatif du cycle pour la classe : par élève, nombre de séances par statut et précisions */
function apRecap(c,K){
  const B=apBase(),ids=Object.keys(B).filter(id=>id.slice(0,id.lastIndexOf('|'))===c);if(!ids.length)return '';
  const ordre=ids.map(id=>{const L=B[id];return [id,L.length?L[0].d:'']}).sort((a,b)=>a[1]<b[1]?-1:a[1]>b[1]?1:0).map(x=>x[0]);
  const apSuite=k=>ordre.map(id=>apRecs(id.slice(0,id.lastIndexOf('|')),id.slice(id.lastIndexOf('|')+1)).map(r=>r.el[k]&&r.el[k].ap).filter(Boolean)).flat();
  const rows=K.map(x=>{const t={a:0,i:0,ip:0,just:0,retard:0,tenue:0,ap:apSuite(x.k)};ids.forEach(id=>{const s=id.slice(id.lastIndexOf('|')+1);const st=apStatut(c,s,x.k,(APA.autoDe&&APA.autoDe(x.k,s))||null);if(t[st.s]!=null&&st.s!=='p')t[st.s]++;(st.m||[]).forEach(m=>{if(t[m]!=null)t[m]++})});return [x,t]}).filter(([,t])=>Object.entries(t).some(([q,v])=>q==='ap'?v.length:v));
  return `<details><summary><b>Récapitulatif de la classe</b> (${ids.length} séance${ids.length>1?'s':''} avec appel)</summary>${rows.length?`<div class="ap-hw"><table class="ap-hist"><tr><th>Élève</th><th>Abs.</th><th>dont just.</th><th>Inapte</th><th>Inapte part.</th><th>Retards</th><th>Tenue</th><th>Bilans (séance par séance)</th></tr>${rows.map(([x,t])=>`<tr><td>${esc(x.nom)}</td><td>${t.a||''}</td><td>${t.just||''}</td><td>${t.i||''}</td><td>${t.ip||''}</td><td>${t.retard||''}</td><td>${t.tenue||''}</td><td style="white-space:nowrap" title="${t.ap.map(q=>APPN[q]).join(', ')}">${t.ap.map(q=>APPE[q]).join(' ')}</td></tr>`).join('')}</table></div>`:'<p class="small">Rien à signaler : tous présents, aucun bilan.</p>'}</details>`;
}
function apCSV(c){
  const B=apBase(),L=[['Classe','Séance','Date','Élève','Statut','Précisions','Appréciation (bilan)','Modifié le']];
  Object.keys(B).filter(id=>id.slice(0,id.lastIndexOf('|'))===c).forEach(id=>{const s=id.slice(id.lastIndexOf('|')+1);B[id].forEach(r=>Object.entries(r.el).forEach(([k,e])=>L.push([c,APA.nomSeance?APA.nomSeance(s):s,r.d,APA.nom(k),AP4N[e.s]||'',(e.m||[]).map(m=>APM[m]).join(' + '),e.ap?APPN[e.ap]:'',e.t?new Date(e.t).toLocaleString('fr-FR'):''])))});
  const txt='﻿'+L.map(r=>r.map(v=>{v=String(v==null?'':v);return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}).join(';')).join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/csv;charset=utf-8'}));a.download='appel_'+String(c).replace(/[^\w-]+/g,'_')+'_'+apJour()+'.csv';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-ap],[data-apm],[data-apx],[data-apa],[data-apmode]');if(!b||!AP_CTX)return;
  e.preventDefault();e.stopPropagation();const {c,s,K}=AP_CTX;
  if(b.dataset.ap!=null){const v=b.dataset.ap,i=v.lastIndexOf('|'),k=v.slice(0,i),val=v.slice(i+1),x=K.find(y=>y.k===k)||{},st=apStatut(c,s,k,x.auto);
    apModifier(c,s,k,en=>{en.s=st.src==='appel'&&st.s===val?'':val;if(en.s!=='a')en.m=en.m.filter(m=>m!=='just');if(en.s==='a')en.m=en.m.filter(m=>m==='just');return en})}
  else if(b.dataset.apm!=null){const v=b.dataset.apm,i=v.lastIndexOf('|'),k=v.slice(0,i),m=v.slice(i+1),x=K.find(y=>y.k===k)||{},st=apStatut(c,s,k,x.auto);
    apModifier(c,s,k,en=>{if(!en.s)en.s=st.s||'p';const j=en.m.indexOf(m);if(j>=0)en.m.splice(j,1);else en.m.push(m);return en})}
  else if(b.dataset.apmode!=null){AP_MODE=b.dataset.apmode==='bilan'?'bilan':'appel';try{localStorage.setItem('eps-ap-mode:'+location.pathname,AP_MODE)}catch(x){}}
  else if(b.dataset.apa!=null){const v=b.dataset.apa,i=v.lastIndexOf('|'),k=v.slice(0,i),q=+v.slice(i+1);
    if(apStatut(c,s,k,(K.find(y=>y.k===k)||{}).auto).s==='a')return;apModifier(c,s,k,en=>{en.ap=en.ap===q?0:q;return en})}
  else if(b.dataset.apx==='tous'){K.forEach(x=>{if(!apStatut(c,s,x.k,x.auto).s)apModifier(c,s,x.k,en=>{en.s='p';return en})})}
  else if(b.dataset.apx==='refaite'){if(!confirm('Nouvel appel daté d’aujourd’hui pour cette séance ? L’appel précédent est gardé dans l’historique.'))return;apRefaite(c,s)}
  else if(b.dataset.apx==='csv'){apCSV(c);return}
  APA.sauver();APA.rendre();
},true);
/* ===================== fin du module Appel ===================== */

function vTableau(){
  if(!DB.classe)return `<h2>Bienvenue</h2>${AVT('prof','Bienvenue ! Commence par importer la liste Pronote de ta classe.')}<p class="carte">Commencez par importer une liste Pronote (onglet Réglages), puis montrez le QR de la classe aux tablettes.</p>${carteDemo()}`;
  const L=elevesClasse(DB.classe);
  const nAuj=L.filter(x=>!x.horsListe&&recuEtat(x.E)==='auj').length,nTot=L.filter(x=>!x.horsListe).length;
  return `<h2>Classe ${esc(DB.classe)}</h2><p class="suivi"><span class="pst auj"></span><b>${nAuj} / ${nTot}</b> reçus aujourd’hui <span class="pst avant"></span>un autre jour <span class="pst non"></span>pas encore reçu</p>
  <p class="small muted">Lettre = meilleur niveau validé <b>P</b> par atelier · petite lettre en pointillés = niveau plus haut validé seulement <b>E</b> par un camarade (à confirmer). Touchez un élève pour sa fiche.</p>
  ${basculeVue()}${cahierLien()}
  <div class="rangee"><button class="bt mini" type="button" data-act="qrclasse">▦ QR de la classe</button><button class="bt mini" type="button" data-act="rotation">🔄 Rotation des ateliers</button><button class="bt mini" type="button" data-act="csv">⬇ Export CSV (note)</button><button class="bt mini" type="button" data-act="pronote">📋 Notes pour Pronote</button><button class="bt mini" type="button" data-act="imprimer">🖨 Imprimer</button></div>
  <div style="overflow-x:auto;margin-top:10px"><table class="tab"><thead><tr><th style="text-align:left">Élève</th>${GYM.ateliers.map(a=>`<th title="${esc(a.nom)}" style="box-shadow:inset 0 -8px 0 ${COUL[a.n]}">${a.n}<br><span class="small">${esc(a.court)}</span></th>`).join('')}<th>Items<br><span class="small">/16</span></th><th>Part.<br><span class="small">/4</span></th><th>Note<br><span class="small">/20</span></th></tr></thead>
  <tbody>${L.map(x=>{const N=note(x.E,DB.classe);return `<tr data-act="eleve" data-v="${esc(x.k)}"><td style="text-align:left">${pastille(x.E)}<b>${esc(x.nom)}</b>${rafale(x.E)?' <span title="Plusieurs validations E en quelques minutes : à vérifier">⚡</span>':''}${x.horsListe?' <span class="small muted">(hors liste)</span>':''}${x.E.st==='disp'?' <span class="small muted">(dispensé)</span>':x.E.st==='ip'?' <span class="small muted">(inapte partiel)</span>':''}${x.E.maj?`<br><span class="small muted">reçu ${dateFr(x.E.maj)}</span>`:''}</td>${GYM.ateliers.map(a=>cellule(x.E,a.n)).join('')}<td>${fmt(N.items)}</td><td>${fmt(N.part)}${N.partAuto?'<sup title="proposée par l’appli">*</sup>':''}</td><td><b>${fmt(N.total)}</b></td></tr>`}).join('')}</tbody></table></div>
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
  <label class="small"><b>Classe ou groupe</b> (rempli : remplace la classe Pronote du fichier, ex. groupe de Terminale)</label><input id="cl-nom" type="text" placeholder="ex. 1G3">
  <div class="rangee" style="margin-top:10px"><label class="bt noir" for="cl-fic">Choisir le fichier Pronote</label><input id="cl-fic" type="file" accept=".xlsx,.xls,.csv,.ods,.txt" hidden multiple></div>
  <label class="small" for="cl-txt" style="display:block;margin-top:10px"><b>Ou coller la liste</b> (un élève par ligne, « NOM Prénom ») — pratique pour un élève arrivé en cours d’année</label><textarea id="cl-txt" rows="3" style="width:100%;box-sizing:border-box;font:inherit" placeholder="DUPONT Marie"></textarea>
  <div class="rangee" style="margin-top:8px"><button class="bt" type="button" data-act="clcoller">Importer la liste collée</button></div></section>
  ${C.map(c=>{const L=DB.classes[c];return `<section class="carte"><h3>${esc(c)} · ${L.eleves.length} élèves</h3>
   <label class="small"><b>Lien de dépôt Nuage</b> (facultatif, « Demande de fichier »)</label><input type="text" data-lien="${esc(c)}" value="${esc(L.lien||'')}" placeholder="https://nuage…">
   <label class="coche"><input type="checkbox" data-barres="${esc(c)}" ${L.barres?'checked':''}> Afficher les barres asymétriques aux élèves</label>
   <label class="coche"><input type="checkbox" data-liaisons="${esc(c)}" ${L.liaisons?'checked':''}> Afficher les éléments de liaison aux élèves <span class="small muted">(cachés en début de cycle)</span></label>
   <label class="coche"><input type="checkbox" data-tc="${esc(c)}" ${L.tc?'checked':''}> 📷 QR du jour obligatoire pour valider E à <b>tous</b> les niveaux (sinon : seulement les niveaux ⚠️)</label>
   <div class="rangee" style="margin-top:10px"><button class="bt act" type="button" data-act="qrclasse" data-v="${esc(c)}">▦ QR de démarrage</button><button class="bt mini danger" type="button" data-act="suppclasse" data-v="${esc(c)}">Supprimer la classe</button></div></section>`}).join('')}
<section class="carte"><h3>🔑 Un groupe a oublié son code</h3><ol class="small"><li>Le groupe touche son carnet, puis « Code oublié ? » : un QR s’affiche.</li><li>Scanne-le avec <b>📷 Valider un élève</b> ou <b>Recevoir → Scanner</b> : le code à 4 chiffres s’affiche en grand.</li><li>Dis-le au groupe. Rien n’est perdu.</li></ol><p class="small muted">Carnet trop ancien (pas de QR s’affiche) : le groupe en crée un nouveau, scanne le QR de la classe ; ses validations envoyées sont chez toi.</p></section>
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
    case 'clcoller':importerListe([],($('#cl-txt').value||''),($('#cl-nom').value||'').trim());break;
    case 'eleve':DB.eleve=v||null;rendre();scrollTo(0,0);break;
    case 'togP':{const E=DB.el[b.dataset.e]||(()=>{const x=elevesClasse(DB.classe).find(y=>y.k===b.dataset.e);return eleve(DB.classe,x.nom)})();
      const w=E.v[v]=E.v[v]||{};if(w.p){if(!confirm('Retirer la validation P ?'))return;delete w.p;delete w.pp}else{w.p=Date.now();w.pp=1;if(!w.e)w.e=w.p}
      if(!w.e&&!w.p&&!w.deb)delete E.v[v];sauver();rendre();break}
    case 'scanvalid':scanValidation();break;
    case 'scan':GQR.scanner(async t=>{const o=await lireTexteGroupe(t);if(o.partiel)return o.partiel;const r=importerObjet(o,'QR');rendre();return r},{continu:true,titre:'Fiches des groupes',aide:'Scannez les QR des tablettes les uns après les autres.',reste:resteHTML});break;
    case 'qrclasse':qrDemarrage(v||DB.classe);break;
    case 'csv':exportCSV();break;
    case 'rotation':ouvrirRotation();break;
    case 'rot-go':lancerRotation(+v);break;
    case 'rot-stop':DB.rotation=null;sauver();fermerRotation();break;
    case 'pronote':notesPronote();break;
    case 'imprimer':window.print();break;
    case 'tour':DB.tourAt=+v;sauver();rendre();break;
    case 'vueat':DB.vueAt=+v||0;DB.vueGr=0;sauver();rendre();break;
    case 'vuegr':DB.vueGr=1;DB.vueAt=0;sauver();rendre();break;
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
  else if(t.id==='restau'&&t.files[0]){try{const o=JSON.parse(await EPSCoffre.lireFichier(t.files[0]));if(!o.el)throw 0;if(confirm('Remplacer les données de cet appareil par la sauvegarde ?')){DB=Object.assign(vide(),o);sauver();rendre()}}catch(e){alert('Fichier de sauvegarde non reconnu.')}}
  else if(t.dataset.bar){const B=bareme();if(t.dataset.bar==='nat')B.nat=Math.max(1,Math.min(6,+t.value||6));else if(t.dataset.bar==='cible')B.cible=Math.max(1,+t.value||8);else B.val[+t.dataset.bar]=Math.max(0,+String(t.value).replace(',','.')||0);DB.bareme=B;sauver();rendre()}
  else if(t.id==='bilan-date'){DB.bilanJ=t.value?new Date(t.value+'T12:00').getTime():0;rendre()}
  else if(t.dataset.lien){DB.classes[t.dataset.lien].lien=t.value.trim();sauver()}
  else if(t.dataset.excl){const E=DB.el[t.dataset.e];if(E){const n=+t.dataset.excl,s=new Set(E.excl||[]);t.checked?s.add(n):s.delete(n);E.excl=[...s].sort();sauver();rendre()}}
  else if(t.dataset.tc){DB.classes[t.dataset.tc].tc=t.checked;sauver();alert('Refaites scanner le QR de la classe pour que les téléphones le prennent en compte.')}
  else if(t.dataset.liaisons){DB.classes[t.dataset.liaisons].liaisons=t.checked;sauver();alert('Refaites scanner le QR de la classe pour que les tablettes le prennent en compte.')}
  else if(t.dataset.barres){DB.classes[t.dataset.barres].barres=t.checked;sauver();alert('Refaites scanner le QR de la classe pour que les tablettes le prennent en compte.')}
});
if(/[?&]demo\b/.test(location.search))ouvrirDemo();
rendre();
