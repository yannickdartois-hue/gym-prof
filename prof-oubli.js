/* =====================================================================
   prof-oubli.js — retrouver le code secret oublié d'un groupe
   ---------------------------------------------------------------------
   - Une paire de clés ECDH P-256 est créée dans l'outil (DB.oubli) ; la
     clé privée ne quitte pas l'appareil (elle voyage seulement dans la
     sauvegarde de l'outil). La clé publique part dans le QR de la classe
     (champ ek), ajoutée ici sans modifier prof.js.
   - Le téléphone d'un groupe y range son code, chiffré pour cette clé.
   - « Code oublié ? » sur le téléphone affiche un QR (t:'O') : n'importe
     quel scanner de l'outil (Valider un élève, Recevoir) le reconnaît et
     affiche le code à 4 chiffres.
   Chargé après prof-valid.js.
   ===================================================================== */
(function(){
'use strict';
const b64u=u=>{let s='';new Uint8Array(u).forEach(x=>s+=String.fromCharCode(x));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const deb64u=t=>{t=String(t).replace(/-/g,'+').replace(/_/g,'/');while(t.length%4)t+='=';return Uint8Array.from(atob(t),c=>c.charCodeAt(0))};
const OUBLI={
  async cles(){
    if(DB.oubli&&DB.oubli.priv&&DB.oubli.pub)return DB.oubli;
    const kp=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveKey']);
    DB.oubli={priv:await crypto.subtle.exportKey('jwk',kp.privateKey),pub:b64u(await crypto.subtle.exportKey('raw',kp.publicKey))};
    sauver();return DB.oubli;
  },
  async lire(oc){
    const c=await OUBLI.cles();
    const priv=await crypto.subtle.importKey('jwk',c.priv,{name:'ECDH',namedCurve:'P-256'},false,['deriveKey']);
    const pub=await crypto.subtle.importKey('raw',deb64u(oc.e),{name:'ECDH',namedCurve:'P-256'},false,[]);
    const k=await crypto.subtle.deriveKey({name:'ECDH',public:pub},priv,{name:'AES-GCM',length:256},false,['decrypt']);
    const t=new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:deb64u(oc.i)},k,deb64u(oc.d)));
    if(!/^gym\|\d{4}$/.test(t))throw 0;return t.slice(4);
  }
};
/* La clé publique dans le QR de la classe */
const _enc=GQR.encoder;
GQR.encoder=async function(o){
  if(o&&o.a==='GYM'&&o.t==='C'&&!o.ek&&!(typeof DEMO!=='undefined'&&DEMO))o=Object.assign({},o,{ek:(await OUBLI.cles()).pub});
  return _enc.call(this,o);
};
/* Tous les scanners de l'outil reconnaissent le QR « code oublié » */
function montrer(noms,classe,code){
  const d=document.createElement('div');d.className='voile';
  d.innerHTML=`<div class="fen" style="max-width:460px;text-align:center"><p class="small muted">${esc(classe||'')} · code oublié</p>
    <h2 style="margin:4px 0">${esc((noms||[]).join(', ')||'Groupe')}</h2>
    <p style="font-size:64px;font-weight:800;letter-spacing:.15em;margin:10px 0">${code}</p>
    <p class="small">Dites-le au groupe (sans l’afficher à toute la classe).</p>
    <div class="rangee" style="justify-content:center;margin-top:10px"><button class="bt act" type="button">Fermer</button></div></div>`;
  d.querySelector('button').onclick=()=>d.remove();document.body.appendChild(d);
}
const _scan=GQR.scanner;
GQR.scanner=function(onCode,opts){
  return _scan.call(this,async t=>{
    let o=null;try{o=await GQR.decoder(t)}catch(e){}
    if(o&&o.t==='O'&&o.o){
      let code;try{code=await OUBLI.lire(o.o)}catch(e){throw new Error('Code illisible : ce groupe a été protégé par un autre appareil prof (restaurez votre sauvegarde).')}
      setTimeout(()=>montrer(o.n,o.c,code),300);
      return 'Code de '+((o.n||[]).join(', ')||'ce groupe')+' : '+code;
    }
    return onCode(t);
  },opts);
};
window.GYMOubliProf=OUBLI;
})();
