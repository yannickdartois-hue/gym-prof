/* aide.js — mode d'emploi de l'outil prof de gymnastique (lu par eps-aide.js) */
window.EPS_AIDE={appli:'Gymnastique · Prof',bouton:false,publics:[
{id:'prof',titre:'Professeur',chapitres:[
{t:'Mise en place (une fois par classe)',html:`<ol>
<li><b>Réglages → Votre code de validation</b> : 4 à 8 chiffres. Vous le tapez sur les tablettes pour valider P. Seule son empreinte part dans le QR.</li>
<li><b>Réglages → Importer une liste Pronote</b> (xlsx, xls ou csv). Avec une colonne « Classe », plusieurs classes d’un coup.</li>
<li>Facultatif : <b>lien de dépôt Nuage</b> de la classe, et la case <b>barres asymétriques</b> (cachées par défaut).</li>
<li><span class="bouton">▦ QR de démarrage</span> : chaque tablette le scanne (appli élève → « QR de la classe »).</li>
</ol><p class="astuce">Le QR de la classe contient aussi les validations que vous connaissez : refaites-le scanner de temps en temps, il renvoie vos P sur les tablettes et permet à un groupe qui a oublié son code de retrouver ses niveaux.</p>`},
{t:'Pendant le cours',html:`<ul>
<li><b>À valider</b> : les niveaux validés E par un camarade, pas encore P. Choisissez l’atelier où vous êtes (tour de gymnase), regardez l’élève, <span class="bouton">Valider P</span>. ⚡ = rafale de validations E (4 en moins de 10 min) : allez voir.</li>
<li><span class="bouton">🔄 Rotation des ateliers</span> (onglet Classe) : nombre de groupes, minutes par atelier, ateliers ouverts. Grand affichage avec compte à rebours et bip ; le QR de rotation affiche l’atelier en cours sur chaque tablette.</li>
<li><b>Par atelier</b> (onglet Classe) : qui est à quel niveau, 🎯 objectifs du jour, et les <b>critères les plus ratés</b> signalés par les observateurs.</li>
</ul>`},
{t:'Fin du cours : recevoir',html:`<ul>
<li><b>Recevoir → Scanner</b> : la caméra reste ouverte, scannez les QR des groupes à la suite.</li>
<li>Ou <b>fichiers .json</b> des groupes, ou le dossier du Nuage téléchargé en <b>.zip</b>.</li>
<li><b>Bilan de séance</b> (même onglet) : validations E et P de chaque élève le jour choisi ; en rose, rien ce jour-là.</li>
</ul>`},
{t:'Note sur 20',html:`<ul>
<li><b>Items /16</b> : par atelier, le meilleur niveau validé P (A = 1 … F = 6 par défaut), meilleurs ateliers retenus, ramené sur 16. Réglable dans <b>Réglages → Barème</b>.</li>
<li><b>Participation /4</b> : proposée d’après les <b>observations justes</b> de l’élève (ses E confirmés ensuite par votre P). Modifiable dans sa fiche (0 à 4, ou Auto). * = proposée par l’appli.</li>
<li>Fiche élève : note, quiz sécurité, objectif, enchaînement, <b>courbe de progression</b>, P à valider ou retirer d’un toucher.</li>
<li><span class="bouton">⬇ Export CSV</span>, <span class="bouton">📋 Notes pour Pronote</span> (une note par ligne, ordre NOM Prénom, à coller dans la colonne du devoir), <span class="bouton">🖨 Imprimer</span>.</li>
</ul>`},
{t:'Sauvegarde, démo, mise à jour',html:`<ul>
<li>Les données restent sur cet appareil. <b>Réglages → Sauvegarde</b> : téléchargez-la régulièrement.</li>
<li><b>Démo</b> (Réglages) : classe fictive de 24 élèves, vos données ne sont pas touchées. Code de la démo : 0000.</li>
<li>Bandeau jaune « Nouvelle version » : <span class="bouton">Mettre à jour</span>.</li>
</ul>`}
]}
]};
