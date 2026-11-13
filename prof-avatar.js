/* =====================================================================
   prof-avatar.js — le personnage gymnaste de chaque élève dans l'outil prof
   - Reçu avec la fiche du groupe (champ « av » de chaque élève) et gardé dans DB.el[clé].av.
   - Tableau de classe : petite vignette (immobile) devant le nom.
   - Fiche élève : le personnage animé, sa forme (meilleur niveau P validé ici) et le nombre débloqué.
   La forme se calcule avec les P de cet outil, qui seuls font foi.
   ===================================================================== */
(function(){
'use strict';
if(!window.GYMAV)return;
const A=GYMAV,CLE_NIV=/^\d[A-F]$/;
function stats(E){let n=0,best='';Object.entries(E.v||{}).forEach(([k,v])=>{if(!CLE_NIV.test(k))return;if(v.e||v.p)n++;if(v.p&&k[1]>best)best=k[1]});return {n,best,f:A.forme(best),nb:A.nbDebloques(n)}}
const idDe=E=>(E.av&&A.parId[E.av])?E.av:A.parDefaut(E.nom);
const oI=importerObjet;
window.importerObjet=function(o,source){const r=oI(o,source);
  try{if(o&&o.el){const c=classeDe(o.c||'',o.el.map(x=>x.n));o.el.forEach(x=>{if(x.av&&A.parId[x.av]){const E=eleve(c,x.n);E.av=x.av}});sauver()}}catch(e){}
  return r};
const oT=vTableau;
window.vTableau=function(){let h=oT();if(!DB.classe)return h;
  elevesClasse(DB.classe).forEach(x=>{const k=esc(x.k),st=stats(x.E);
    h=h.replace(`data-v="${k}"><td style="text-align:left">`,`data-v="${k}"><td style="text-align:left"><span class="gav-mini" title="${esc(A.parId[idDe(x.E)].n)}">${A.svg(idDe(x.E),st.f,{px:30,anim:false})}</span>`)});
  return h};
const oE=vEleve;
window.vEleve=function(k){let h=oE(k);const E=DB.el[k];if(!E)return h;const st=stats(E),id=idDe(E),a=A.parId[id];
  const fig=A.FIG[st.f===0?'salut':st.f===1?a.f2:a.f3];
  return h.replace(/(<h2>[^<]*<\/h2>)/,`$1<div class="gav-pf">${A.svg(id,st.f,{px:84})}<div><b>${esc(a.n)}</b>${E.av?'':' <small class="muted">(personnage par défaut : pas encore reçu)</small>'}<br><span class="small">Forme ${st.f+1} · ${esc(fig)} · meilleur P : ${st.best||'aucun'}<br>${st.n} niveaux validés (E ou P) · ${st.nb} / ${A.AV.length} personnages débloqués</span></div></div>`)};
const css=document.createElement('style');css.textContent='.gav-mini{display:inline-block;vertical-align:middle;margin-right:4px}.gav-mini svg{display:block}.gav-pf{display:flex;gap:12px;align-items:center;background:#f7f5f2;border-radius:14px;padding:6px 12px;margin:4px 0 10px}';document.head.appendChild(css);
})();
