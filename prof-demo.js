/* =====================================================================
   prof-demo.js — mode démo de l'outil prof : une classe fictive « DÉMO »
   (24 élèves, 4 semaines de cycle, niveaux validés E et P, niveaux à valider).
   Les vraies données restent intactes : en démo rien n'est enregistré.
   Ouverture : bouton « Découvrir avec une classe fictive » ou adresse …/?demo
   Code de validation de la démo : 0000
   ===================================================================== */
'use strict';
let DEMO=false,DB_REEL=null;
const DEMO_CL='DÉMO';
const DEMO_ELEVES=['Lucas ARNAUD','Emma BENOIT','Hugo BLANC','Léa BRUN','Nathan CARON','Inès CHEVALIER','Tom DUBOIS','Zoé DURAND','Sacha FAURE','Chloé FONTAINE',
  'Enzo GARNIER','Manon GIRARD','Noah GUERIN','Lina HENRY','Théo LAMBERT','Jade LEROY','Louis MARTIN','Rose MERCIER','Adam MOREL','Lou PETIT','Gabriel ROUX','Alice SIMON','Jules VINCENT','Mila ROBIN'];
function alea(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
async function construireDemo(){
  const r=alea(20261105),ent=(a,b)=>a+Math.floor(r()*(b-a+1));
  const d=vide();d.classes[DEMO_CL]={eleves:DEMO_ELEVES.slice(),lien:'',barres:false};d.classe=DEMO_CL;d.vue='tableau';d.pin=await empreinte('0000');
  const J=n=>Date.now()-n*864e5;
  DEMO_ELEVES.forEach((nom,i)=>{
    const k=norm(DEMO_CL)+'|'+norm(nom),E={nom,classe:DEMO_CL,v:{},maj:J(ent(0,6))};
    const force=r(); // aisance générale de l'élève
    // groupes de 3 : l'observateur est un camarade du même groupe
    const g=Math.floor(i/3)*3,obs=prenom(DEMO_ELEVES[g+((i-g+1)%3)]||DEMO_ELEVES[g]);
    GYM.ateliers.forEach(a=>{
      const p=Math.max(-1,Math.min(5,Math.round(force*4+r()*2-1.5)));   // dernier niveau P (-1 = aucun)
      const e=Math.min(5,p+(r()<.1?1:0));                                // parfois un niveau de plus validé E seulement
      NIVS.forEach((n,x)=>{if(x>e)return;const v={e:J(26-x*4+ent(0,2)),par:obs};if(x<=p)v.p=v.e+864e5*ent(0,3);E.v[a.n+n]=v});
    });
    d.el[k]=E;
  });
  d.journal=['Démo · fiches reçues de 8 groupes (QR et Nuage)'];
  return d;
}
async function ouvrirDemo(){if(!DEMO){DB_REEL=DB}DB=await construireDemo();DEMO=true;rendre();scrollTo(0,0)}
function quitterDemo(){DB=DB_REEL||charger();DB_REEL=null;DEMO=false;rendre();scrollTo(0,0)}
function bandeauDemo(){return DEMO?`<div class="demo-bandeau"><span>👀 <b>Mode démo</b> : classe fictive, rien n’est enregistré. Code de validation : <b>0000</b>.</span><button type="button" class="bt mini" data-act="demofin">Quitter la démo</button></div>`:''}
function carteDemo(){return DEMO?'':`<section class="carte demo-carte"><h3>👀 Découvrir avec une classe fictive</h3><p class="small muted">24 élèves, un mois de cycle : tableau, niveaux à valider, export. Vos vraies données ne sont pas touchées.</p><button type="button" class="bt" data-act="demo">Ouvrir la démo</button></section>`}
