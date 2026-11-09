/* aide.js — mode d'emploi de l'outil prof de gymnastique (lu par eps-aide.js) */
window.EPS_AIDE={appli:'Gymnastique · Prof',bouton:false,publics:[
{id:'prof',titre:'Professeur',chapitres:[
{t:'🔑 Code du cours (niveaux ⚠️)',html:`<ol>
<li>En gym, le code ne sert qu’aux niveaux ⚠️ : sans lui, un élève ne peut pas valider E un salto ou un niveau E/F de trampoline hors du cours.</li>
<li>Début de cours : <span class="bouton">🔑 Code du cours</span>, écrivez les 4 chiffres au tableau.</li>
<li>Chaque groupe tape le code : la séance du jour s’ouvre sur son téléphone pendant 2 heures. Les autres niveaux ne demandent rien.</li>
<li><b>Plus rapide : le QR du jour.</b> Le QR de la classe affiché un jour de cours ouvre aussi la séance : chaque groupe le scanne (« QR de la classe »), rien à taper. Il apporte en même temps vos P et la liste à jour. Le code au tableau reste valable.</li>
<li>Le code ne vaut que ce jour-là. Pour préparer un cours, changez la date : le code s’affiche à l’avance. Aucune connexion nécessaire.</li>
</ol><p class="astuce">Une seule fois après cette mise à jour : refaites scanner le <b>QR de démarrage</b> (il apporte la clé de la classe). Tant qu’un téléphone ne l’a pas rescanné, il n’est pas verrouillé.</p>`},

{t:'Mise en place (une fois par classe)',html:`<ol>
<li><b>Réglages → Importer une liste Pronote</b> (xlsx, xls ou csv). Avec une colonne « Classe », plusieurs classes d’un coup.</li><li><b>Toutes les classes d’un coup</b> : le fichier fait par la page « Mes classes » du portail mon-EPS. <b>Élève arrivé en cours d’année</b> : collez « NOM Prénom » avec le nom de la classe → « Ajouter ces élèves ». Classe déjà présente : l’appli demande toujours « Ajouter » ou « Remplacer la liste ». Ensuite, faites rescanner le QR de démarrage.</li>
<li>Facultatif : <b>lien de dépôt Nuage</b> de la classe, et la case <b>barres asymétriques</b> (cachées par défaut).</li>
<li><span class="bouton">▦ QR de démarrage</span> : chaque tablette le scanne (appli élève → « QR de la classe »).</li>
</ol><p class="astuce">Le QR de la classe contient aussi les validations que vous connaissez : refaites-le scanner de temps en temps, il renvoie vos P sur les tablettes et permet à un groupe qui a oublié son code de retrouver ses niveaux.</p>`},
{t:'Pendant le cours',html:`<ul>
<li><b>Valider P devant l’élève</b> : il touche « 📲 Montrer au professeur » ; vous : À valider → <span class="bouton">📷 Valider un élève</span>, scannez son téléphone, <span class="bouton">✅ Valider P</span>. Votre écran affiche alors un QR de réponse signé : l’élève le scanne pour voir son P. Pressé ? Fermez : le P compte déjà, il descendra avec le QR de la classe. <b>Seuls les P enregistrés dans votre outil comptent</b>, un téléphone ne peut pas en créer.</li>
<li><b>À valider</b> : les niveaux validés E par un camarade, pas encore P. Choisissez l’atelier où vous êtes (tour de gymnase), regardez l’élève, <span class="bouton">Valider P</span>. ⚡ = rafale de validations E (4 en moins de 10 min) : allez voir.</li>
<li><span class="bouton">🔄 Rotation des ateliers</span> (onglet Classe) : nombre de groupes, minutes par atelier, ateliers ouverts. Grand affichage avec compte à rebours et bip ; le QR de rotation affiche l’atelier en cours sur chaque tablette.</li>
<li><b>Par atelier</b> (onglet Classe) : qui est à quel niveau, 🎯 objectifs du jour, et les <b>critères les plus ratés</b> signalés par les observateurs.</li>
</ul>`},
{t:'Code secret oublié par un groupe',html:`<ul>
<li>Le groupe touche son carnet, puis <b>Code oublié ?</b> : un QR s’affiche.</li>
<li>Vous le scannez avec n’importe quel scanner de l’outil (<span class="bouton">📷 Valider un élève</span> ou <b>Recevoir → Scanner</b>) : le code à 4 chiffres s’affiche en grand. Dites-le au groupe.</li>
<li>Fonctionne pour les groupes qui ont scanné le QR de la classe (version de novembre 2026) puis tapé leur code au moins une fois. La clé qui lit les codes est dans votre outil : gardez une sauvegarde à jour.</li>
</ul>`},
{t:'Fin du cours : recevoir',html:`<ul>
<li><b>Recevoir → Scanner</b> : la caméra reste ouverte, scannez les QR des groupes à la suite.</li>
<li>Ou <b>fichiers .json</b> des groupes, ou le dossier du Nuage téléchargé en <b>.zip</b>.</li>
<li><b>Bilan de séance</b> (même onglet) : validations E et P de chaque élève le jour choisi ; en rose, rien ce jour-là.</li>
</ul>`},
{t:'Note sur 20',html:`<ul>
<li><b>Items /16</b> : par atelier, le meilleur niveau validé P (A = 1 … F = 6 par défaut), meilleurs ateliers retenus, ramené sur 16. Réglable dans <b>Réglages → Barème</b>.</li>
<li><b>Participation /4</b> : proposée d’après les <b>observations justes</b> de l’élève (ses E confirmés ensuite par votre P). Modifiable dans sa fiche (0 à 4, ou Auto). * = proposée par l’appli.</li>
<li><b>Élève dispensé ou inapte</b> : dans sa fiche, <span class="bouton">Inapte partiel</span> puis cochez les ateliers non évalués (la note /16 se calcule sur les autres), ou <span class="bouton">Dispensé du cycle</span> : pas de note, « Disp » dans l’export et pour Pronote.</li>
<li>Fiche élève : note, quiz sécurité, objectif, enchaînement, <b>courbe de progression</b>, P à valider ou retirer d’un toucher.</li>
<li><span class="bouton">⬇ Export CSV</span>, <span class="bouton">📋 Notes pour Pronote</span> (une note par ligne, ordre NOM Prénom, à coller dans la colonne du devoir), <span class="bouton">🖨 Imprimer</span>.</li>
</ul>`},
{t:'Sauvegarde, démo, mise à jour',html:`<ul>
<li>Les données restent sur cet appareil. <b>Réglages → Sauvegarde</b> : téléchargez-la régulièrement.</li>
<li><b>Démo</b> (Réglages) : classe fictive de 24 élèves, vos données ne sont pas touchées. </li>
<li>Bandeau jaune « Nouvelle version » : <span class="bouton">Mettre à jour</span>.</li>
</ul>`}
]}
]};
