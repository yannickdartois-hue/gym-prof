/* =====================================================================
   prof-qr-groupes.js — v1.1 : les groupes voyagent dans le QR de démarrage
   (chargé après prof-groupes.js ; prof.js n'est pas modifié)
   Le QR de la classe (t:'C') reçoit en plus g = {numéro: [rangs dans la liste l]}.
   Sur une nouvelle tablette, l'appli élève coche d'avance les noms du groupe
   quand il choisit son numéro. Seuls des rangs voyagent : les noms sont déjà dans l.
   ===================================================================== */
(function(){
'use strict';
if(!window.GQR||!GQR.encoder)return;
function groupesQR(c,liste){
  if(typeof window.GYMGroupesDe!=='function'||typeof elevesClasse!=='function')return null;
  const L=elevesClasse(c),R=window.GYMGroupesDe(c,L),rang=new Map((liste||[]).map((n,i)=>[norm(n),i])),g={};
  L.forEach(x=>{const r=R.get(x.k);if(!r||!/^[1-8]$/.test(r.n||''))return;const i=rang.get(norm(x.nom));if(i==null)return;(g[r.n]=g[r.n]||[]).push(i)});
  return Object.keys(g).length?g:null;
}
const enc=GQR.encoder;
GQR.encoder=async function(o){
  try{if(o&&o.a==='GYM'&&o.t==='C'&&!o.g){const g=groupesQR(o.c,o.l);if(g)o=Object.assign({},o,{g})}}catch(e){}
  return enc(o);
};
window.GYMGroupesQR=groupesQR;
})();
