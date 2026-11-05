/* =====================================================================
   prof-valid.js — validation P par aller-retour de QR signé
   1. Le téléphone de l'élève affiche un QR « demande » (t:'V') : classe,
      nom, niveau, E éventuel, x = 'p' (valider P) ou 'd' (ouvrir le niveau).
   2. Le prof le scanne ici, valide : c'est enregistré dans l'outil (fait foi).
   3. L'outil affiche un QR « réponse » (t:'P') signé ECDSA P-256 avec une
      clé privée qui ne quitte jamais l'iPad. Le téléphone ne connaît que la
      clé publique (QR de classe, champ pk) : il vérifie, il ne peut pas signer.
   Le second scan est facultatif : le P descend aussi avec le QR de classe.
   ===================================================================== */
const b64u=u=>{let s='';u.forEach(x=>s+=String.fromCharCode(x));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const SIGNE={
  async cles(){
    if(DB.sig&&DB.sig.priv&&DB.sig.pub)return DB.sig;
    const kp=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
    DB.sig={priv:await crypto.subtle.exportKey('jwk',kp.privateKey),pub:b64u(new Uint8Array(await crypto.subtle.exportKey('raw',kp.publicKey)))};
    sauver();return DB.sig;
  },
  async signer(txt){
    const c=await SIGNE.cles(),k=await crypto.subtle.importKey('jwk',c.priv,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
    return b64u(new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},k,new TextEncoder().encode(txt))));
  }
};
const msgSigne=o=>['GYMP',o.c,o.n,o.k,o.x,o.p].join('|');

function scanValidation(){
  GQR.scanner(async t=>{
    const o=await GQR.decoder(t);
    if(o.t==='G'){const r=importerObjet(o,'QR');rendre();return r}
    if(o.t!=='V')throw new Error('Ce n’est pas un QR « Montrer au professeur ».');
    setTimeout(()=>ouvrirDemande(o),250);return 'Demande de '+o.n+' · '+o.k;
  },{titre:'Valider un élève',aide:'Scannez le QR « Montrer au professeur » du téléphone de l’élève.'});
}
function ouvrirDemande(o){
  const a=GYM.ateliers.find(x=>String(x.n)===String(o.k[0])),n=a&&a.niv.find(z=>z.n===o.k[1]);
  if(!a||!n){alert('Niveau inconnu : '+o.k);return}
  const E=eleve(o.c,o.n),w=E.v[o.k]||{};
  if(o.e&&o.e[0]&&(!w.e||o.e[0]*1000>w.e)){w.e=o.e[0]*1000;w.par=o.e[1]||''}
  const d=document.createElement('div');d.className='voile';d.id='valid-voile';
  const deja=o.x==='d'?w.deb||w.e:w.p;
  d.innerHTML=`<div class="fen" style="max-width:560px"><p class="small muted">${esc(o.c)} · atelier ${a.n} · ${esc(a.nom)}</p>
    <h2 style="margin-top:2px"><span class="L L${n.n}" style="vertical-align:4px">${n.n}</span> ${esc(o.n)}</h2>
    <p><b>${esc(n.nom)}</b>${n.prof?' ⚠️':''}</p><ul class="small">${n.crit.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>
    <p class="small">${w.e?`E validé par ${esc(prenom(w.par)||'?')} le ${new Date(w.e).toLocaleDateString('fr-FR')}`:'Pas de validation E : validation directe par vous.'}</p>
    ${deja?`<p class="tampon p">${o.x==='d'?'Niveau déjà ouvert':'Déjà validé P le '+new Date(w.p).toLocaleDateString('fr-FR')}</p>`:''}
    <div class="rangee" style="justify-content:space-between;margin-top:12px"><button class="bt" type="button" data-r="non">Annuler</button>
    <button class="bt act" type="button" data-r="oui">${o.x==='d'?'🔓 Ouvrir ce niveau':'✅ Valider P'}</button></div></div>`;
  d.querySelector('[data-r="non"]').onclick=()=>d.remove();
  d.querySelector('[data-r="oui"]').onclick=async()=>{
    const t=Date.now();
    if(o.x==='d')w.deb=1;else{if(!w.p)w.p=t;w.pp=1;if(!w.e){w.e=w.p;w.par='professeur'}}
    E.v[o.k]=w;E.maj=Math.max(E.maj||0,t);sauver();rendre();
    const r={a:'GYM',v:1,t:'P',c:o.c,n:o.n,k:o.k,x:o.x==='d'?'d':'p',p:Math.round((o.x==='d'?t:w.p)/1000)};
    r.s=await SIGNE.signer(msgSigne(r));
    let svg;try{svg=GQR.svgQR(await GQR.encoder(r))}catch(e){svg='<p class="alerte">QR impossible.</p>'}
    d.querySelector('.fen').innerHTML=`<h2>${o.x==='d'?'🔓 Niveau ouvert':'✅ Validé P'} · ${esc(o.n)} · ${o.k}</h2>
      <p class="small">C’est enregistré dans votre outil. Pour que l’élève le voie tout de suite : il touche <b>« Scanner la réponse du prof »</b> et vise ce QR. Pas le temps ? Fermez : ça arrivera avec le QR de la classe.</p>
      <div class="qrbox" style="max-width:320px;margin:auto">${svg}</div>
      <div class="rangee" style="justify-content:space-between;margin-top:12px"><button class="bt" type="button" data-r="fin">Fermer</button><button class="bt act" type="button" data-r="suite">📷 Élève suivant</button></div>`;
    d.querySelector('[data-r="fin"]').onclick=()=>d.remove();
    d.querySelector('[data-r="suite"]').onclick=()=>{d.remove();scanValidation()};
  };
  document.body.appendChild(d);
}
