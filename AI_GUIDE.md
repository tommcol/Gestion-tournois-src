## Officiels et séparation des sessions — version 2.5.0 du 23 octobre 2026

### Inscriptions et accès
- Dans « Arbitre / Marqueur », la liste « Staff et volontaires — personnes qui ne jouent pas » permet d'ajouter prénom, nom, Arbitre, Marqueur ou les deux. Modifier et Désactiver/Réactiver restent possibles. La désactivation conserve la personne pour comprendre les anciens résultats et enlève ses missions futures non commencées.
- Deux cases indépendantes indiquent « Arbitrage en phases finales » et « Marque en phases finales ». Elles existent pour les joueurs dans leur inscription et pour les officiels non joueurs. Non coché = non disponible ; les anciennes inscriptions sans ces champs ne sont pas supposées disponibles pour les finales. Le rôle correspondant doit être coché aussi.
- `types.ts` ajoute `Official`, `TournamentState.officials`, `Player.finalsReferee/finalsScorer` et les actions UPSERT_OFFICIAL, SET_OFFICIAL_ACTIVE, REASSIGN_OFFICIALS. Les deux serveurs autorisent ces actions uniquement aux organisateurs. Les sauvegardes et messages partiels incluent la liste, indépendamment des médias.

### Répartition des missions
- `utils/officialAssignments.ts` centralise l'attribution. Le calendrier des matchs ne bouge pas : seules refereeId/scorerId changent. La catégorie commande si un arbitre et/ou un marqueur sont nécessaires ; les rôles non demandés restent vides.
- Joueurs : plafond commun arbitrage + marque = partie entière de 30 % des sessions sans match. Exemple : 10 sessions, 4 jouées donnent 6 libres, donc une mission maximum. Avec 3 libres le plafond vaut zéro : ne pas ajouter automatiquement un minimum d'une mission. Aucun arbitrage d'une rencontre de sa propre poule. Une mission ne peut chevaucher un match joué ou une autre mission ; une session sépare les activités du joueur.
- Non joueurs : plafond indicatif arrondi à l'entier le plus proche de 70 % des sessions prévues (7 pour 10, 4 pour 6). Ce n'est pas une obligation de créer des missions inutiles. Les personnes les moins chargées par rapport à leur plafond passent d'abord, ce qui décale leurs pauses. Tous les arbitrages d'une session sont affectés avant les tables. Les personnes uniquement marqueurs sont prioritaires pour la marque, préservant les personnes capables d'arbitrer.
- Un non joueur qui travaille à deux sessions consécutives reste sur le même terrain ; après une pause, il peut changer. Aucun officiel ne reçoit deux missions simultanées. Si les disponibilités, repos ou plafonds empêchent une affectation, l'identifiant technique Staff reste utilisé mais le texte visible est exactement « Arbitre — staff/volontaire » ou « Marqueur — staff/volontaire ».
- Les matchs terminés, la session de poule déjà commencée et les matchs de finale activés gardent leurs missions. « Répartir les missions à venir » permet de reprendre un ancien calendrier sans déplacer les rencontres ni modifier les scores. L'inscription/modification d'un officiel recalcule automatiquement les missions à venir.
- Quand le planning des finales existe, les compteurs comprennent les sessions de poule puis les sessions finales, sans les confondre. Les compteurs sont recalculés avec le programme actuellement connu ; les anciennes affectations sont conservées. Si les participants futurs ne sont pas encore connus, tous les participants possibles sont exclus des missions qui pourraient chevaucher leur match. Les nouvelles affiches sont prises en compte après un résultat PC ou tablette. L'activation manuelle vérifie aussi qu'un joueur ou un officiel n'est pas déjà occupé sur un autre match actif.
- La répartition est un compromis automatique, pas une garantie de couvrir tous les terrains : les cases staff/volontaire signalent précisément ce qui reste à pourvoir. Les pauses de personnes ayant des compétences différentes peuvent se rejoindre si les contraintes ne permettent pas mieux.

### Tableau, feuilles et lisibilité
- Le tableau des officiels affiche session, terrain, rencontre, noms attribués et personnes en repos, pour les poules ou les finales. Les noms non joueurs apparaissent aussi au calendrier global et dans les tableaux finaux.
- Les feuilles non joueurs sont accessibles depuis Arbitre / Marqueur et depuis Feuilles de Route > Feuilles de route des officiels. Choisir les personnes et Poules/Phases finales, préparer l'aperçu puis imprimer. Plusieurs personnes tiennent sur une page A4 paysage ; les longues listes sont découpées en parties sans perdre les pauses ou missions. Colonnes : Session, Terrain, Rôle, Match. Le nombre de pages est annoncé.
- `utils/officialRoadmaps.ts`, `OfficialPaperCard` et le portail d'impression existant produisent le même document à l'écran et à l'impression. L'aperçu est un instantané à préparer de nouveau si le planning change.
- Calendrier global : bandes de session plus contrastées, bordure supérieure épaisse dans la couleur de l'application et espace entre les sessions. Le repli automatique et les boutons gardent leur fonctionnement ; chrono, musique et commandes générales restent à leur place.

### Vérifications
- tests/officials.test.mjs couvre les quotas, la poule d'origine, les conflits, les repos, les deux rôles, le maintien du terrain, la désactivation et la conservation des missions terminées, les choix des finales, les feuilles multipages et la diffusion en ligne.
- tests/courtNetwork.test.mjs vérifie aussi l'enregistrement et la restauration d'un officiel sur le serveur Windows.

## Phases finales — version 2.4.1 du 23 octobre 2026

### Problèmes corrigés après l'essai complet sur Cloudflare
- `updateWinnerInFinals` renvoie de nouveaux objets uniquement pour les rencontres qui changent. Les vainqueurs passent au tour suivant et chaque perdant de demi-finale rejoint la petite finale sans mutation de l'ancien état : les mises à jour partielles atteignent PC, TV et tablettes sans F5. Les autres catégories restent inchangées.
- L'éditeur manuel porte une clé composée de la catégorie et des identifiants des rencontres. La réception asynchrone du tableau créé sur le serveur réinitialise correctement son brouillon ; les scores ou voyants reçus ensuite ne remplacent pas les choix en cours. Un message indique la préparation tant que les rencontres ne sont pas arrivées.
- `utils/finalMatchSafety.ts` vérifie les deux équipes, le terrain et les matchs déjà actifs, toutes catégories confondues. Le PC explique le refus. Le reducer commun et les serveurs Windows/Cloudflare contrôlent aussi l'activation : deux commandes concurrentes ne peuvent pas occuper le même terrain. Un match actif doit être arrêté avant un changement de terrain.
- La prolongation des tablettes garde le score égal de départ dans le brouillon et sur le serveur (`overtimeStartScore`). Il faut marquer au moins deux points PENDANT cette prolongation pour envoyer le résultat, sans exiger deux points d'écart : 9–9 puis 11–10 est valable, 10–9 ne l'est pas. La notification PC/TV, les fautes et les points restent conservés. La confirmation de réception de la prolongation précède l'envoi du score ; les renvois ne changent pas le score de départ.
- La règle est vérifiée également à la réception Windows et Cloudflare, avec réponse `overtime` si le résultat est prématuré. L'organisateur conserve son droit de corriger un résultat officiel ; cette correction manuelle n'est pas limitée par le contrôle tablette.

### Vérifications et limites de cette livraison
- `tests/finalPhaseRegression.test.mjs` couvre la progression complète depuis les quarts, l'immuabilité, la reconstruction des messages partiels, les conflits de terrain et d'équipe, les commandes concurrentes et la prolongation après restauration d'un tournoi en ligne.
- `tests/courtNetwork.test.mjs` vérifie aussi le refus à un point et l'acceptation à deux points en prolongation sur le serveur Windows.
- Cette livraison ne traite pas la répartition des arbitres/marqueurs, leurs feuilles personnelles ni les critères de départage des poules : ce sont des sujets séparés de l'audit.

## Tournois en ligne et dossiers médias — version 2.4.0 du 22 octobre 2026

### Deux modes conservés
- Windows / réseau local : serveur Express + Socket.IO existant, sans Internet. Les anciens fichiers et liens /uploads restent lisibles.
- Cloudflare : véritable serveur de tournoi dans un Durable Object SQLite « TournamentRoom », déclaré dans wrangler.jsonc avec migration online-v1. Déploiement automatique via GitHub ; aucun bucket R2 ou secret manuel requis pour cette version.
- Depuis Configuration, « Créer mon tournoi en ligne » copie explicitement la préparation actuelle vers un nouveau tournoi privé. L’ouverture de l’accueil seule ne publie aucune donnée. « Retrouver mon dernier tournoi » et « Rejoindre » permettent de reprendre un tournoi existant.
- Un lien organisateur donne les commandes ; les liens TV sont en lecture et chaque lien tablette est limité à son terrain. Les secrets restent dans le fragment #access (pas dans la requête HTTP), puis dans le protocole de négociation WebSocket. Ne jamais mettre ces liens dans le guide, les logs ou un dépôt public. Garder le lien organisateur en favori : pas de récupération de compte par email dans cette version.
- Pour synchroniser, ouvrir les liens du MÊME tournoi, pas les simples anciennes adresses ?view=court. Chaque appareil doit avoir Internet. Le mode Windows local reste indépendant : pas de basculement automatique ou fusion entre un tournoi local et un tournoi en ligne.

### Synchronisation et sauvegardes
- services/OnlineSocket.ts adapte les messages existants à WebSocket natif ; services/onlineSession.ts gère les liens, accès et fichiers. Le serveur en ligne contrôle les rôles ; changer ?court= ne donne pas accès à un autre terrain.
- cloudflare/roomEngine.ts réutilise tournamentReducer, receiveCourtScore et diffState. Les commandes officielles passent par le serveur, sont sauvegardées avant accusé de réception, identifiées pour éviter les doublons et diffusées par modifications partielles. Un score live ne lance AUCUN classement ni résultat officiel.
- Le voyant prêt, les notifications de prolongation et les conflits de scores suivent les mêmes messages que Windows. Une tablette prête se resignale à la reconnexion ; les points et fautes restent dans son brouillon. Résultat non reçu = conservé à l’écran et renvoyé après reconnexion. Un score tardif différent attend le choix de l’organisateur.
- Chrono : échéance serveur commune et alarme Durable Object ; pas de sauvegarde complète du tournoi à chaque seconde. Les horloges affichent l’échéance localement, les ticks ne redonnent pas de temps. Les sons restent soumis à l’autorisation audio du navigateur.
- Les sauvegardes du tournoi, du chrono, des accusés et des fichiers sont durables. Le document principal, les métadonnées de contrôle et les sauvegardes de sessions sont séparés : position musicale ou voyant prêt ne réécrivent pas tous les matchs. Jusqu’à cinq sessions précédentes sont conservées, avec un plafond de taille ; le JSON d’export reste utilisable.
- Les caches navigateur, commandes en attente, brouillons tablette et position musicale sont isolés par identifiant de tournoi. Ne pas mélanger avec le cache Windows historique.

### Dossiers Musiques / Sponsors
- Configuration contient deux dossiers et permet sélection multiple, liste et réutilisation par « Utiliser ». Ajouter au dossier ajoute aussi au tournoi ; retirer une musique de la playlist ou un sponsor de la diffusion ne supprime pas son fichier.
- En ligne : fichiers stockés en morceaux SQLite, avec liens opaques non devinables ; lecture audio avec Range/206 (déplacement dans un morceau). Musique 50 Mo maximum, image PNG/JPG/WEBP 2 Mo maximum, 256 Mo cumulés par tournoi. Les images SVG ne sont pas acceptées comme fichiers en ligne. Aucun fichier utilisateur n’est ajouté au GitHub.
- Windows : dossiers physiques uploads/musiques et uploads/sponsors dans le répertoire de données de l’application ; l’ajout depuis le lecteur et la gestion Sponsors y enregistre aussi les fichiers. Les anciens sponsors intégrés en image dans un JSON restent compatibles.
- Les fichiers médias ne sont PAS intégrés aux sauvegardes JSON. Les musiques d’un ancien PC (/uploads/...) doivent être ajoutées de nouveau au dossier en ligne : un serveur Cloudflare ne peut pas lire le disque de ce PC.
- Le mode préparation dans le navigateur seul n’a pas de serveur de fichiers : créer le tournoi en ligne avant les ajouts, ou utiliser Windows.

### Vérifications et maintenance
- tests/onlineRoom.test.mjs : droits TV/terrains, voyant prêt, live sans classement, score officiel, renvoi après redémarrage, chrono et mises à jour partielles. Test Miniflare avec WebSockets, SQLite persistant, upload audio, lecture partielle et refus des accès non autorisés.
- Tests Cloudflare exécutés avec Miniflare/Workerd en plus des scénarios Windows existants. GitHub Actions utilise Node 22 (requis par le runtime de test Cloudflare). Tester aussi après le déploiement réel avant de déclarer le mode en ligne opérationnel.
- Essai sur Cloudflare effectué avec un tournoi fictif : lien organisateur, tablette terrain 1 et TV distincts ; voyant T1 vert, live 2–0 sans classement prématuré, score automatiquement reçu à la fin du chrono, puis classement mis à jour ; import d’un WAV lisible et d’un PNG dans les dossiers.
- Les anciennes clés locales de commandes en attente et de serveur déjà utilisé sont conservées pour ne pas perdre un envoi Windows pendant la mise à jour. Un lien room sans code d’accès affiche une explication ; il ne charge pas un autre tournoi local.
- Aucun changement des règles sportives, classements de départage ou disposition des commandes générales dans cette version.

## Ajustements des sélecteurs et impressions — version 2.3.1 du 22 octobre 2026

- Poules : « Équipes par poule » utilise désormais la même liste de choix et le même style que « Matchs par équipe » en Suisse. Les choix vont de 2 au nombre d’équipes de la catégorie (avec conservation de la valeur courante et du choix initial 4).
- Feuilles de route : les catégories se choisissent par boutons avec pastille de couleur comme dans Organisation/Poules, plus par menu déroulant. Les cases de sélection individuelle des équipes à réimprimer restent disponibles.
- Feuilles de match : 4 matchs maximum par page A4 paysage, sans option 6 matchs. Le générateur plafonne aussi à 4 pour les anciens appels. Cette consigne remplace les indications 4/6 ou « jusqu’à 6 » des sections historiques ci-dessous.
- Les feuilles validées, les règles sportives et les commandes générales restent inchangées.

# 📖 GUIDE COMPLET DE L'APPLICATION — GESTION TOURNOIS SRC (TOURNAMENT MANAGER PRO)

> **Ce guide est le document de référence absolu pour comprendre, utiliser, maintenir ou faire évoluer l'application.**  
> Il s'adresse aux organisateurs de tournois, aux bénévoles sans compétences informatiques, ainsi qu'à tout développeur ou Intelligence Artificielle prenant en charge le code.  
> Tout est expliqué en français courant avec des mots simples. Chaque terme technique est défini immédiatement.

---


## Feuilles de route et points déjà cochés — version 2.3.0 du 22 octobre 2026

### Demande validée
L’objectif prioritaire est l’économie de papier : plusieurs équipes par feuille, en conservant leurs noms et missions lisibles. Ne pas proposer une équipe par page par défaut. La remarque précédente sur une limitation à une seule catégorie des feuilles de match a été retirée par l’utilisateur ; conserver le regroupement des matchs de toutes les catégories de la session ou du terrain choisi.

Dans la navigation générale, l’entrée Feuilles de Route reste à sa place. Seule sa page est réorganisée en deux espaces : **Feuilles de route des équipes** et **Feuilles de match**. Le chrono, la musique, les commandes générales et les règles sportives ne sont pas déplacés.

### Feuilles de route : utilisation
1. Choisir une catégorie.
2. Garder toutes ses équipes cochées ou choisir seulement celles à réimprimer. Toutes les équipes / Tout décocher facilitent cette sélection ; les choix restent locaux à cette page, sans changer les inscriptions.
3. Préparer l’aperçu. Le nombre réel de feuilles A4 paysage est annoncé avant l’impression.
4. Imprimer les pages affichées. Les cartes sont regroupées automatiquement, avec plusieurs rangées si elles tiennent.

Toutes les équipes d’une catégorie ont les mêmes colonnes, selon les obligations de cette catégorie : **Session, Match, Terrain**, plus **Arbitrage** si prévu, plus **Marque** si prévue. Une mission contient le nom complet du joueur et « Terrain N » dans la même case. Pas de colonnes T.A, T.M, T.Ma. Les cases restent présentes même lorsqu’une équipe n’a pas de mission à cette session. Le nom de l’équipe est en titre : la case Match indique son adversaire, sans répéter inutilement son propre nom.

Le nombre de colonnes de cartes reste compact : jusqu’à six équipes côte à côte sans officiels, cinq avec un rôle, quatre avec les deux rôles. Le calcul de hauteur utilise les noms et missions ; plusieurs rangées partagent une feuille. Les longs plannings sont divisés en parties numérotées, sans retirer de session ou couper les noms. Toutes les missions sont conservées, y compris si plusieurs joueurs d’une équipe sont affectés à des matchs différents dans une session ou s’ils officient pour une autre catégorie. Les sessions précédant la première activité ou suivant la dernière activité de cette catégorie ne créent pas de lignes vides inutiles ; les numéros réels des sessions sont conservés et les missions extérieures comptent dans cette plage.

Les actions Exporter Excel et Copier pour Sheets restent disponibles dans Autres exports et utilisent les seules équipes choisies. Le calendrier de la catégorie passe également par un aperçu paginé ; il lit les scores officiels actuels au moment de sa préparation. L’aperçu est un document préparé, pas un écran de scores en direct.

### Feuilles de match et bonus
Le choix Par session / Par terrain concerne seulement les feuilles de match. L’aperçu propose jusqu’à six matchs par feuille en mode économique, ou quatre en plus grand. Si les noms sont trop longs pour le mode compact, le document utilise quatre cartes ; le compteur annonce le nombre effectivement préparé. Les 21 cases de marque, les 13 cases de fautes et la ligne de score final sont conservées. La mise en page papier est sobre pour limiter l’encre.

Règle existante conservée : zéro joueuse = zéro point de départ, une joueuse = un point, deux joueuses ou plus = deux points. Le seul nom « catégorie mixte » ne permet pas d’attribuer un bonus. `utils/startingBonus.ts` utilise le nombre de joueuses explicitement renseigné ; s’il manque dans une ancienne équipe, il compte les joueurs dont le genre est Femme. Un nombre explicite zéro reste prioritaire. Le helper est utilisé par les feuilles, les libellés d’équipes et l’initialisation d’un nouveau match tablette, pour garder le même résultat. Il ne modifie aucun score validé ni un brouillon tablette déjà commencé et n’ajoute pas une deuxième fois le bonus à un résultat saisi.

Chaque feuille indique clairement « Départ : N point(s) déjà coché(s) » (ou zéro point d’avance). Les premières cases concernées portent une vraie croix vectorielle noire SVG, et pas seulement un fond orange : elles restent identifiables lorsque l’impression des couleurs/fonds est désactivée. Si aucune joueuse n’est renseignée, aucune case n’est inventée ; l’interface explique la source du bonus.

### Code et précautions de maintenance
- `utils/paperDocuments.ts` prépare des documents immuables pour les routes, les matchs et le calendrier. Les missions sont indexées par session et les noms par identifiant. La pagination tient compte des largeurs et de la mesure de texte du navigateur.
- `components/PaperPages.tsx` rend les mêmes pages pour l’aperçu et l’impression ; `PaperPreview.tsx` adapte uniquement le zoom de l’aperçu à la largeur disponible. Les pages imprimées gardent les dimensions A4.
- `components/paperPrint.css` limite les styles d’impression au mode papier via une classe temporaire sur le corps de la page, retirée au démontage. La page nommée `tournamentPaper` définit l’A4 paysage. Ne pas réintroduire un `body > * { display: none }` global, qui casserait les autres impressions.
- `TeamRoadmaps.tsx` ne construit plus une grande section cachée à chaque score. Les documents sont préparés sur clic et leur aperçu est mémorisé. `samePaperMatches` ignore les scores pour l’abonnement au planning papier, mais détecte les changements d’équipes, terrains, sessions, arbitres et marqueurs. Les changements de sélection ou de planning annulent l’ancien aperçu.
- `useTournamentStateReader` fournit une lecture ponctuelle du tournoi pour le calendrier, sans abonner le formulaire papier à tous les résultats.

Vérifications : préparation de l’application et du serveur, **51 tests** dont douze tests papier : quatre configurations d’officiels, regroupement compact, sélection d’équipes, missions multiples, planning long, noms complets, bonus anciens/explicites, croix noires, pagination 4/6, compte des pages, absence de reconstruction sur un simple score, et isolation des styles d’impression. La fabrication Windows et le déploiement Cloudflare doivent être confirmés avant d’annoncer leur disponibilité. Une vérification de l’aperçu ne remplace pas un essai sur l’imprimante du club ; le format attendu est A4 paysage à taille réelle, sans en-têtes/pieds de page ajoutés par le navigateur.

---

## Scores en direct et mises à jour ciblées — version 2.2.1 du 22 octobre 2026

### Décision de l’organisateur
**Pendant un match, les points ajoutés sur une tablette changent seulement le score en direct du bandeau TV. Ils ne valident pas le match, ne changent pas les résultats officiels, ne recalculent pas les classements et ne font pas avancer les phases finales.** L’envoi du score final au PC reste distinct. Après validation par le PC, le résultat officiel et le classement de la poule concernée sont mis à jour ; les finales gardent leurs règles de progression existantes. Un résultat papier peut toujours être saisi pendant la session suivante. Il ne faut donc pas geler tous les classements pendant toute une session : un autre match officiellement validé peut mettre à jour sa propre poule pendant qu’un match est encore en direct.

Conserver les emplacements, tailles et styles des boutons, le chrono, le défilement TV, les choix par moment du tournoi et les formulaires existants. Les modifications concernent les abonnements aux données et le découpage interne de l’affichage, pas les règles sportives ou la présentation.

### Affichage plus léger
- `context/TournamentStore.tsx` conserve l’état officiel dans un magasin partagé. `useTournamentSelector` s’abonne à une portion précise ; `useTournamentFields` choisit plusieurs champs avec comparaison de leurs références. Quand ces données restent identiques, le composant ne se redessine pas. La sélection reste correcte lorsqu’une catégorie ou une page change sans nouvelle réception réseau.
- `TournamentContext.tsx` garde les commandes et la connexion dans un contexte stable. `useTournamentControls()` permet de les utiliser sans recevoir tous les scores. `useTournament()` reste compatible avec les anciens écrans qui lisent encore l’ensemble de l’état ; **ne pas prétendre que chaque composant du logiciel a été réécrit**. Pour les nouvelles évolutions, préférer une sélection précise aux abonnements complets.
- Le cadre `App`, le lecteur musical, les commandes du chrono, la configuration et la liste des équipes ne s’abonnent plus aux scores qui ne les concernent pas. Le dialogue de score n’écoute que les commandes : une réception réseau ailleurs ne réinitialise pas la saisie en cours.
- `components/ScheduleMatchRow.tsx` contient la ligne existante du calendrier, avec les mêmes cases et boutons. La ligne et ses fonctions sont stables ; valider un match ne redessine pas ses voisins. Les scores rapides restent conservés pour les autres lignes.
- Chaque `PoolStandingCard` de `StandingsDisplay` écoute seulement le classement de sa poule. Le cadre des catégories ne dépend plus de tous les classements. `TVStandings` écoute les tailles de poules pour sa pagination et les seuls classements de la page visible. Les tables `TVStandingTable` inchangées sont mémorisées ; un score hors écran sera visible quand sa page sera affichée.
- Les listes triées des matchs et résultats TV conservent leur référence lorsqu’aucun de leurs matchs n’a changé. Les secondes du chrono ne fabriquent plus inutilement une nouvelle liste pour ces blocs.

### Deux chemins séparés à préserver
1. **Direct** : `CourtView` envoie `live_score`. `server.ts` utilise `readLiveScore` (`utils/liveScores.ts`) pour ne relayer que terrain, identités et points destinés à l’affichage. Un champ parasite comme `status: finished` ou un faux `standings` n’est pas transmis. Ce chemin ne déclenche aucun traitement de résultat, aucun changement de version officielle et aucune sauvegarde du tournoi.
2. **Résultat officiel** : `court_submit`, ou une saisie validée par l’organisateur, conserve le traitement existant : contrôle du score, règles de finale, gestion des conflits, sauvegarde et accusé de réception. **Ne jamais transformer chaque point live en `UPDATE_MATCH_SCORE`/`UPDATE_FINAL_MATCH_SCORE`.** Le score final envoyé peut différer du dernier score live reçu ; seul le résultat accepté fait foi.

`services/liveScoresChannel.ts` garde les scores provisoires à part, sans les ajouter à `TournamentState`. Le fournisseur de connexion les reçoit même si le bandeau n’est pas encore monté. `components/LiveScoreTicker.tsx` écoute seul ce canal et reproduit les mêmes éléments du bandeau (pause, deux copies du ruban, message d’attente). Le reste de `TVDisplay` ne possède plus d’état local `liveScores` et ne se redessine donc plus à chaque point. Les messages identiques ou invalides sont ignorés ; les cartes des autres terrains restent stables. Le canal se vide lors d’une connexion, d’un reset des terrains ou du signal officiel de fin du chrono ; la copie initiale fournie par le serveur reste reçue avant le montage.

`utils/socketSubscriptions.ts` retire uniquement les écouteurs de la vue quittée. Le calendrier et le gestionnaire des finales l’utilisent : ne pas remettre `socket.off('courts_reset')` sans fonction précise, qui débrancherait aussi le canal live.

### Vérifications de cette version
`npm run build`, `npm run build:server`, `npm test` : **39 tests**, dont six nouveaux essais de rendu avec React (`tests/targetedRendering.test.mjs`, dépendance de développement `react-test-renderer`). Ils vérifient une saisie conservée, un cadre/lecteur témoin non redessinés, une seule carte de poule modifiée, des tables TV inchangées/hors écran, les lignes voisines du calendrier, 100 changements live sans changement officiel, l’arrivée du direct avant montage, la pause et la désinscription d’une vue.

Le test réseau réel `tests/incrementalNetwork.test.mjs` envoie aussi 100 scores live avec plusieurs clients : pas de nouveau message officiel ni changement du fichier sauvegardé ; une TV qui rejoint retrouve le direct mais garde le match non validé. L’envoi final est ensuite enregistré avec les autres scénarios de réception, conflit et reconnexion. Les tests React vérifient les rendus et la valeur saisie, pas un essai physique au gymnase ni la position du curseur sur un vrai PC. Tester le nouveau fichier Windows sur le matériel du tournoi reste nécessaire pour juger le confort réel.

GitHub déclenche automatiquement Cloudflare et la fabrication Windows ; ne pas annoncer un nouvel EXE disponible tant que sa fabrication et son fichier téléchargeable ne sont pas confirmés. L’aperçu Cloudflare ne devient pas un serveur de synchronisation en ligne.

---

## Fluidité et musique — version 2.2.0 du 22 octobre 2026

Cette section remplace les anciennes explications concernant l’envoi intégral du tournoi à chaque modification, le lecteur musical recréé et le chrono inclus dans le contexte général. **Conserver les emplacements des boutons, les couleurs choisies, les règles sportives et le fonctionnement des sessions.** Le logiciel Windows continue à démarrer son serveur local ; aucune connexion Internet n’est nécessaire pendant le tournoi. Cette mise à jour améliore ce fonctionnement existant, sans changer de technologie Windows.

### Ce que l’organisateur doit constater
- Passer à la session suivante ou précédente ne recharge pas le morceau. Changer d’onglet ne détruit pas le lecteur non plus.
- Le lecteur garde le morceau, sa position, le volume et le mode aléatoire dans ce navigateur. Une vraie fermeture ou un F5 interrompt nécessairement le son pendant la fermeture : la réouverture tente de reprendre au même endroit, avec une précision d’environ deux secondes. Certains navigateurs imposent un clic sur Lecture/Activer le son avant de reprendre. Il ne faut pas promettre une lecture sans interruption lors d’un vrai F5.
- Le chrono reste visible sur le PC, les TV et les tablettes. Le PC envoie un recalage régulier par seconde pendant la lecture du chrono, et immédiatement lors d’un départ, d’une pause, d’une remise à zéro et d’une reconnexion. Les effets sonores gardent leurs déclenchements ; la TV avec son reçoit les commandes sonores séparément. Le mode TV muet garde son fonctionnement.
- Un score tablette est toujours sauvegardé sur le PC avant le message de réception. Une coupure ne supprime ni les points ni les fautes conservés par la tablette.
- Les cases de présence, le repli des sessions complètes, les phases finales, les catégories multiples et les options TV conservent leurs règles.

### Organisation du code pour l’IA
- `context/tournamentReducer.ts` regroupe les traitements déjà existants, sans dépendre de React. Il est partagé entre le PC serveur et l’aperçu Cloudflare. Sur le réseau, **le serveur applique les actions**, notamment les générations à identifiants aléatoires : ne pas les appliquer une seconde fois dans le navigateur.
- `TournamentContext.tsx` sépare les données du tournoi et `useOfficialClock()`. Les composants qui n’affichent pas le chrono ne sont plus réveillés pour un simple tick. Le contexte général garde une valeur stable quand seul le chrono change.
- Le navigateur annonce `auth.protocol: 2`. Une connexion reçoit une copie complète `state_update` et son numéro `revision`. Ensuite les modifications passent par `state_patch` avec `baseRevision`, `revision` et `patches`. Une rupture dans la suite déclenche `state_request` pour obtenir une copie complète. **Ne jamais ignorer un saut de numéro.** Les anciens appareils utilisent encore le protocole complet ; fermer et rouvrir les pages TV/tablette pour bénéficier du nouveau fonctionnement.
- `utils/statePatch.ts` calcule/applique des modifications immuables. Les listes inchangées, particulièrement `playlist` et `sponsors`, gardent leur référence. Les chemins dangereux (`__proto__`, `constructor`, `prototype`) sont refusés. `shareUnchanged` conserve aussi les références lors d’un rattrapage complet.
- L’organisateur envoie `tournament_action` avec un identifiant stable et une action. Les commandes non confirmées restent dans `tournament_pending_actions_v2` du navigateur et sont réessayées après coupure ; elles ne sont retirées qu’après réception de la réponse. Quand un serveur déjà utilisé est hors connexion, les commandes attendent son retour ; on ne fabrique pas un tournoi divergent. Le rôle TV/tablette ne peut pas utiliser ces commandes d’organisation. Il ne s’agit pas d’une nouvelle authentification sécurisée.
- `initialize_state` sert uniquement à démarrer un serveur sans données depuis la copie locale. Si le serveur possède déjà un tournoi, cette commande renvoie sa version sans l’écraser. Les 512 derniers identifiants d’actions et le numéro de version sont enregistrés atomiquement avec les données, dans `__sync` de `tournament_data.json` ; ce champ interne n’est pas diffusé aux écrans. Une commande renvoyée après perte de confirmation n’est pas appliquée deux fois.
- `utils/coalescedSave.ts` groupe les écritures rapprochées (200 ms sur le serveur, 300 ms pour la copie locale). Les écritures sont ordonnées, le fichier principal est remplacé atomiquement et les scores/changements de session forcent une écriture immédiate. Une confirmation d’action attend l’écriture du lot correspondant. Un échec ne bloque pas les sauvegardes suivantes. Les copies de fin de session gardent l’état précédent et s’écrivent sans bloquer le serveur. La copie navigateur utilise IndexedDB ; une copie JSON locale ne sert que de secours en cas d’échec. La TV ne réécrit pas tout le tournoi sur son disque à chaque score.
- `GlobalTimer.tsx` se réveille à la seconde, calé sur l’heure de fin, au lieu de vérifier dix fois par seconde. `timer_sync` est la seule voie régulière de recalage pour les nouveaux appareils ; les anciens reçoivent encore leur événement compatible. On calcule le temps à partir de `endsAt`, jamais en retirant simplement une seconde à un compteur supposé exact. La tablette ne réécrit plus son brouillon juste pour chaque seconde affichée ; les points/fautes et transitions restent enregistrés immédiatement.
- `services/MusicController.ts` garde un seul élément audio, indépendant des montages de l’interface. `musicRuntime.ts` le relie une seule fois au mixage des sons et l’ajoute invisiblement à la page. `MusicPlayer.tsx` conserve les mêmes commandes. **Ne pas rétablir un effet qui fait `audio.src = ...; audio.load()` à chaque nouveau tableau playlist.** On recharge seulement quand l’URL du morceau choisi change ; un nouvel objet représentant le même morceau ne suffit pas. La position restaurée est liée à l’URL du morceau, pour ne pas appliquer la minute d’un ancien morceau au suivant.
- Le lecteur conserve ses réglages dans `src_music_admin_v2` ou `src_music_tv_v2`. La synchronisation musicale est un `snapshot` toutes les trois secondes pendant la lecture et lors des commandes, sans retransmettre le tournoi. Le serveur conserve le dernier état dans `music_state.json` ; `services/musicChannel.ts` garde le message initial si le lecteur TV n’est pas encore monté. Une TV qui rejoint retrouve le morceau courant ; elle ne commande pas le lecteur du PC et ne crée pas de boucle de messages.
- `poolMatchReducer.ts` ne recalcule que le classement de la poule dont le score change. Les générations/réinitialisations continuent à recalculer ce qui est nécessaire. Les grands blocs TV sont mémorisés et les listes de matchs restent stables pendant les ticks. La TV prépare l’image du sponsor suivant ; les fichiers importés, dont les noms sont uniques, peuvent rester en cache du navigateur.
- Le calcul de secondes restantes utilise l’heure actuelle au rendu (`remainingSeconds`) : le décompte de préparation commence à cinq, sans afficher brièvement six à cause d’une ancienne seconde en mémoire.
- Le module Excel est chargé au clic sur Exporter, au lieu d’alourdir le démarrage de chaque écran. L’export conserve son contenu et son bouton.

### Vérifications et limites à conserver dans les réponses
`npm run build`, `npm run build:server`, `npm test`. Les 33 tests comprennent les règles précédentes, 500 changements avec 100 équipes/200 matchs, les petites mises à jour réelles par Socket.IO, la réception durable des scores, le redémarrage, les commandes en double, le recalage du chrono sans seconde voie audio, le lecteur avec un élément audio simulé et le regroupement des écritures.

Mesure sur un jeu fictif avec un logo de 1 Mo : passage de session complet du nouveau protocole = **81 octets**, sans renvoyer le logo ; 500 actions (scores et sessions) = environ 150 ko de modifications seules, contre environ 550 Mo si toutes les données étaient renvoyées à chaque fois. Cela mesure la taille des messages dans ce scénario, **pas un gain de vitesse garanti sur le PC de l’organisateur**.

Les essais automatiques du lecteur utilisent un faux lecteur audio : ils vérifient les chargements, la position, la reprise, l’aléatoire et les erreurs de lecture. Ils ne remplacent pas l’écoute sur le PC Windows réel avec ses fichiers et ses TV. Essai complémentaire dans le navigateur Chrome sur Cloudflare, avec un tournoi fictif et une piste WAV silencieuse de 120 secondes importés : la lecture reste active lors des passages de session et de la navigation entre onglets ; après une vraie recharge, la position en pause est retrouvée exactement à 69,699426 secondes et le mode aléatoire reste actif. L’ouverture de la TV montre le sponsor fictif et la session 2. Cet essai utilise l’aperçu, sans synchronisation entre appareils. Le navigateur distant de vérification ne peut pas joindre le serveur local de l’environnement de développement. Ne pas présenter cette limite comme un test Windows réussi. Les essais du réseau exécutent réellement le serveur et plusieurs clients connectés.

Cloudflare reste un aperçu avec des données propres au navigateur : cette mise à jour ne crée pas de serveur de synchronisation en ligne ni d’hébergement des musiques importées. Le test complet PC/TV/tablettes se fait avec le nouveau logiciel Windows et le même réseau local. L’ancien EXE déjà téléchargé ne change pas tout seul : télécharger la nouvelle fabrication GitHub après son succès.

---

## Apparence Bleu électrique — mise à jour du 22 octobre 2026

L’utilisateur a choisi la proposition graphique « Bleu électrique ». Il a autorisé son application avec des couleurs personnalisables. C’est un habillage : conserver les emplacements, dimensions, ordre, libellés et comportements des boutons, du chrono et des écrans. Les images proposées servaient d’inspiration ; leurs filtres, logos fictifs ou boutons supplémentaires ne sont pas des fonctionnalités à ajouter.

### Utilisation
Dans **Configuration**, tout en bas, après les rubriques existantes, ouvrir **Apparence — couleurs de l’application et de la TV**. Pour l’organisateur et pour la TV, choisir séparément une couleur principale (palette proposée ou sélecteur de couleur libre) et un fond clair ou sombre. Les choix sont enregistrés automatiquement dans la même sauvegarde que le tournoi. Les sauvegardes anciennes sans apparence adoptent le Bleu électrique : organisateur clair et TV sombre. **Revenir au Bleu électrique** rétablit les couleurs des deux écrans, sans modifier les équipes, les scores ou le chrono.

L’habillage colore les commandes principales, l’onglet sélectionné, les fonds, les séparations et les accents des matchs/classements TV. Les boutons gardent leur place et leur taille ; leurs coins et ombres sont adoucis. Démarrer/valider reste vert, la pause orange et les actions sensibles rouges. Les logos des sponsors et les couleurs des catégories ne sont pas recolorés. La tablette conserve son habillage précédent.

### Code et sauvegarde
- `types.ts` : `ScreenAppearance` (couleur `accent` et `mode` clair/sombre), `AppearanceConfig` (organisateur et TV), champ facultatif `TournamentState.appearance` pour compatibilité des sauvegardes.
- `utils/appearance.ts` : valeurs de départ, six couleurs proposées, validation stricte des couleurs, calcul des contrastes et variables de couleur. Le texte d’un bouton passe au blanc ou au bleu très sombre selon la couleur choisie pour rester lisible. Les textes d’accent sont éclaircis/assombris si nécessaire.
- `components/AppearanceSettings.tsx` : rubrique repliable ajoutée à la fin de Configuration, deux aperçus, choix des couleurs, fond et retour au modèle. Les mises à jour passent par `UPDATE_CONFIG` ; aucune nouvelle méthode de sauvegarde.
- `App.tsx` : variables limitées à `.appearance-organizer` ou `.appearance-tv`, indépendamment. La vue terrain ne reçoit pas ces styles.
- `index.css` : remplace l’ancien habillage Vestiaire orange par Bleu électrique ; modifie les couleurs, rayons des angles et ombres, sans modifier le positionnement, le dimensionnement ou l’ordre des commandes existantes. L’habillage TV conserve le cadre 1920 × 1080 et toute la logique de diffusion.
- `TournamentConfig.tsx` : les champs de configuration ne sont plus réinitialisés pour une simple modification d’apparence ; seuls leurs paramètres correspondants déclenchent leur mise à jour.
- `tests/appearance.test.mjs` : anciennes sauvegardes, lisibilité des couleurs, absence de modification des données sportives et conservation après réouverture/export/import.

Vérifications : préparation de l’application et du serveur réussie, 22 tests automatiques. Dans le navigateur, les couleurs des deux écrans restent indépendantes et conservées après rechargement ; modifier l’apparence n’efface pas une saisie de configuration non sauvegardée. Le retour au Bleu électrique est accessible dans la même rubrique.

Sur le réseau local, l’apparence choisie est transmise aux écrans par le mécanisme existant. Sur Cloudflare, chaque navigateur conserve son aperçu et ses choix localement ; cette fonction n’ajoute pas la synchronisation des appareils.

---

## Mise à jour du 22 octobre 2026 — décisions de fonctionnement

Cette section décrit les corrections intégrées à partir du dépôt `8ff7582746194d4ceacc0c80f61846f2221e9996`. Les repères de lignes présents plus bas proviennent de la version précédente : chercher les noms des fonctions plutôt que ces numéros. Ce guide explique le logiciel ; il ne remplace pas le règlement du tournoi.

### Consignes pour l’IA qui reprend le projet
L’organisateur ne sait pas coder : expliquer les comportements en français courant. Les demandes les plus récentes de l’utilisateur priment sur les anciennes consignes de cette conversation. Le 22 octobre 2026, il a autorisé l’intégration directe des corrections dans GitHub et demandé la mise à jour de ce guide. Ce n’est pas une autorisation générale pour toutes les futures modifications.

Ne pas inventer de règle sportive. Les forfaits et la condition de fin de prolongation attendent le règlement officiel. Ne pas présenter la saisie papier pendant la session suivante comme un bug. Préserver les catégories multiples, le nombre variable d’équipes et les tableaux finaux déjà créés. Une génération de tableau ne doit pas démarrer son affichage TV. Tester le comportement réel et distinguer les tests automatiques d’un essai sur PC Windows, tablette et TV.

### Sessions et résultats papier
Une session se replie seulement lorsque tous ses matchs ont un score validé, qu’il ait été saisi sur le PC ou reçu d’une tablette. Passer à la session suivante ne suffit pas. Le titre et une flèche restent visibles ; cliquer permet de revoir les matchs. Les résultats papier peuvent être saisis pendant la session suivante. Un 0–0 de poule validé compte comme un résultat ; deux cases vides ne comptent pas.

### Tablettes : points, fautes et coupures
`CourtView` garde immédiatement une copie des points, fautes, équipes, terrain, état du match et échéance du chrono dans la mémoire du navigateur (`src-court-draft-v1-N`). Le chrono est recalé sur le PC sans réinitialiser les points ou les fautes. À son terme, le résultat est envoyé automatiquement ; le bouton permet aussi un envoi confirmé. Pendant une coupure, le résultat reste lisible en grand et le marqueur peut le montrer à l’organisateur. Tant que la réception n’est pas confirmée, un nouveau match ne remplace pas cet écran. Le résultat est renvoyé au retour du réseau.

Le message `court_submit` porte un identifiant stable. Le serveur sauvegarde le résultat avant de confirmer sa réception et garde les accusés dans `court_receipts.json`. Un renvoi ne peut donc pas écraser une correction ultérieure du PC. Si le PC possède déjà un score différent, `courtConflicts` conserve les deux propositions. `OrganizerNotifications` propose « Garder le score PC » ou « Garder le score tablette ». Le marqueur ne peut plus modifier un score envoyé.

Conserver la même adresse du PC et le même navigateur pour retrouver la copie locale. Effacer les données du navigateur supprime cette copie. Cette évolution ne fournit pas une installation hors ligne complète : sans réseau, une page déjà ouverte peut continuer, mais un rechargement dépend aussi de la disponibilité des fichiers de l’application. Garder la page ouverte pendant la coupure.

### Égalité et prolongation
Une égalité en phase finale est refusée dans la tablette, dans le traitement commun des résultats et dans la réception serveur. À la fin du chrono, le bouton « Prolongation » prévient le PC (`court_overtime`) ; le match porte ce libellé sur la TV. Les points et les fautes restent en place. La règle qui termine une prolongation attend le règlement : aucune durée, mort subite ou victoire à deux points n’est imposée. Le marqueur envoie le score décidé selon le règlement lorsqu’il n’y a plus égalité. Les forfaits gardent leur comportement actuel.

### TV selon le moment du tournoi
`TVMomentSettings` est disponible dans Configuration et, en version dépliable, dans le Calendrier Global. Les choix sont enregistrés dès qu’une case change. Chaque moment possède ses cases : matchs, résultats, classements, sponsors dans le défilement, sponsor au lancement, chronomètre et scores des tablettes. Sans choix particulier, le fonctionnement est :

| Moment | Affichage par défaut |
| --- | --- |
| Arrivée | Sponsors seulement |
| Tournoi démarré, premier match non lancé | Matchs de session 1 et sponsors autorisés |
| Match en cours | Session suivante, résultats de la précédente s’il y en a, classements, sponsors autorisés |
| Pause après le match | Même contenu ; compte à rebours de pause dans le bandeau |
| Dernière session en cours | Résultats précédents, classements, sponsors autorisés ; pas de session inexistante |
| Dernière session terminée | Résultats de cette dernière session et classements |
| Phases finales lancées par l’organisateur | Tour en cours de chaque catégorie, avec sponsors selon les choix |

Le sponsor au lancement se règle séparément des diapositives de sponsors. La case générale « Autoriser les sponsors (tous les moments) » peut couper tous les sponsors à tout moment et reste prioritaire sur ces choix. La création d’un tableau ne change pas le mode TV. L’organisateur lance lui-même l’affichage des finales. Les résultats de poule manquants des catégories concernées sont listés avant confirmation. Corriger une poule ne recalcule jamais un tableau final déjà créé.

`currentFinalMatches` conserve tous les matchs du tour en cours, y compris ceux encore à jouer, jusqu’au dernier résultat validé. Deux catégories peuvent afficher deux tours différents. Finale et petite finale partagent le dernier niveau d’affichage. Une sélection administrative d’un tour futur ne fait pas disparaître les matchs non terminés du tour en cours. Relancer l’affichage TV ne réinitialise plus les résultats ou les terrains d’un tableau déjà commencé.

### Horloge et échanges réseau
`ClockSnapshot` transporte la session, le mode poules/finales, les matchs concernés et l’heure de fin. Le serveur la conserve dans `timer_state.json`, la renvoie aux nouveaux écrans (`timer_sync`) et marque la fin même si l’onglet du PC est fermé après le démarrage effectif du chrono. Le décompte de départ et les sons restent pilotés par le navigateur de l’organisateur. `GlobalTimer` utilise une heure de fin, pas une simple soustraction dépendant du rythme de l’onglet. Les composants cachés sur la TV restent passifs.

Les vues tablette et TV n’envoient plus l’ensemble du tournoi avec `update_state`. Cette distinction des vues évite les écrasements involontaires ; elle ne constitue pas une authentification par mot de passe. Les contrôles réseau existants ne sont pas transformés en système de comptes.

### Fichiers ajoutés et vérifications
- `utils/tournamentFlow.ts` : règles de repli, sélection du tour final, moments TV et contenu attendu.
- `utils/courtResults.ts` : réception des résultats, refus des égalités et mise en attente des conflits.
- `components/TVMomentSettings.tsx` : cases TV selon les moments et accès rapide.
- `components/OrganizerNotifications.tsx` : prolongations et choix entre deux scores différents.
- `scripts/runTests.mjs` : lance la même liste de tests sous Windows et Linux sans dépendre du développement de `*.test.mjs` par le terminal. `npm test` utilise ce lanceur.
- `tests/tournamentFlow.test.mjs` : scénarios de journée et protection des résultats.
- `tests/courtNetwork.test.mjs` : échanges réels avec le serveur, reconnexion, accusés conservés après redémarrage, conflits, prolongation et horloge.

Cloudflare reste un aperçu sans le serveur local. Cette correction n’ajoute pas la synchronisation réseau à Cloudflare. Un échec d’ajout de musique affiche désormais un message au lieu de sembler réussir.

---

## SOMMAIRE

1. [À quoi sert l’application](#1-à-quoi-sert-lapplication)
2. [Le déroulement complet d’un tournoi (Étape par étape)](#2-le-déroulement-complet-dun-tournoi)
3. [Explication de tous les écrans et de tous les boutons (Inventaire exhaustif)](#3-explication-de-tous-les-écrans-et-de-tous-les-boutons)
4. [Explication du code, fichier par fichier](#4-explication-du-code-fichier-par-fichier)
5. [Comment les données circulent dans l'application](#5-comment-les-données-circulent)
6. [Petit dictionnaire des termes techniques](#6-petit-dictionnaire)
7. [Points à vérifier et écarts observés](#7-points-à-vérifier)

---

## 1. À QUOI SERT L'APPLICATION

L'application **Gestion Tournois SRC** (ou **Tournament Manager Pro**) est un logiciel conçu pour organiser et animer un tournoi sportif de A à Z (spécialement calibré pour le **Basketball 3x3**, mais utilisable pour tout sport collectif se jouant sur plusieurs terrains avec des sessions de jeu au temps).

### À qui sert-elle ?
1. **Aux organisateurs (Table de contrôle centrale)** :
   - Ils définissent le tournoi (nom, nombre de terrains, durée des matchs, pauses).
   - Ils inscrivent les équipes et gèrent les catégories (jeunes, seniors, loisirs, mixte...).
   - Ils génèrent automatiquement les poules et le calendrier des matchs en évitant qu'une équipe ne joue deux matchs d'affilée sans repos.
   - Ils pilotent le chronomètre officiel central, la sonorisation (musique, sifflet, corne de fin de match) et valident les scores.
2. **Aux bénévoles et marqueurs sur les terrains (Tablettes tactiles)** :
   - Chaque terrain peut disposer d'une tablette ou d'un smartphone affichant une feuille de marque simplifiée.
   - Le marqueur clique sur `+1`, `+2`, `+3` au fur et à mesure que les paniers sont marqués.
   - Il note les fautes et indique à l'organisateur central quand les deux équipes sont prêtes à jouer.
3. **Au public, aux joueurs et aux entraîneurs (Écran TV géant)** :
   - Un écran de télévision ou un vidéoprojecteur branché dans le gymnase fait défiler automatiquement les informations utiles : les prochains matchs, les résultats récents, les classements en direct, les tableaux de phase finale et les logos des sponsors.
   - Au bas de l'écran TV, le chronomètre officiel défile en direct et un ruban d'information fait défiler les scores des matchs en cours sur chaque terrain.

### Comment est-elle utilisée le jour du tournoi ?
- **Aucune connexion Internet n'est requise** le jour J. L'application tourne sur un réseau local Wi-Fi privé créé par une simple box ou un routeur dans le gymnase.
- Le PC de l'organisateur fait office de **serveur** : tous les autres appareils (la télé et les tablettes) s'y connectent via leur navigateur web (Chrome, Edge, Safari...) en tapant l'adresse IP du PC.
- Si le tournoi est consulté hors du gymnase sur Internet (mode démonstration ou hébergement Cloudflare), l'application bascule automatiquement en **Mode Aperçu** : les données sont conservées dans le navigateur de l'appareil sans perturber le réseau.

---

## 2. LE DÉROULEMENT COMPLET D'UN TOURNOI

Voici la chronologie exacte des étapes que suit un organisateur, avec le détail des clics, des saisies et des réactions du logiciel.

---

### Étape 1 : Réglages généraux (Terrains, Durée et Pauses)
1. **Où cliquer** : Menu latéral gauche → onglet **Configuration**.
2. **Ce que l'on saisit** (dans le bloc *« 🏗️ Informations générales »*) :
   - **Nom du Tournoi** : Texte libre (ex. : `Tournoi des As SRC 2026`). Ce nom apparaît en grand sur l'écran TV en attente et en haut du menu admin.
   - **Nombre de Terrains** : Nombre entier supérieur ou égal à 1 (ex. : `4`). Cela détermine combien de matchs peuvent être joués en même temps lors d'une session.
   - **Durée du Match (minutes)** : Durée de jeu effective (ex. : `10`). C'est le temps qui sera décompté par le chronomètre officiel.
   - **Temps de Pause (minutes)** : Intervalle de battement entre la fin d'une session et le début de la suivante (ex. : `2`).
3. **Action** : Cliquer sur le bouton bleu **« Enregistrer la configuration »** tout en bas de la page.
4. **Ce qui se passe** : Une boîte de dialogue confirme : *« Configuration sauvegardée ! »*. Ces paramètres sont mémorisés dans l'état général et enregistrés sur le disque du PC.

---

### Étape 2 : Création des Catégories
Une catégorie représente une division sportive (ex. : *U13 Garçons*, *Seniors Féminines*, *Mixte Entreprises*). Chaque catégorie peut avoir ses propres règles de gestion.
1. **Où cliquer** : Toujours dans l'onglet **Configuration**, ouvrir le bloc *« 🏷️ Catégories & Terrains »*, puis cliquer sur le bouton pointillé **« + Ajouter une catégorie »**.
2. **Ce qui apparaît** : Une fenêtre modale (boîte de dialogue) intitulée *« Ajouter une catégorie »* ou *« Modifier la catégorie »*.
3. **Ce que l'on configure** :
   - **Nom de la catégorie** : Nom officiel (ex. : `U15 Mixtes`).
   - **Couleur** : Une pastille de couleur pour identifier visuellement la catégorie sur le calendrier et sur l'écran TV.
   - **Terrains réservés** : Case(s) à cocher pour réserver certains terrains exclusivement à cette catégorie pendant la phase de poules (ex. : réserver le Terrain 1 aux petits). Si aucun terrain n'est coché, les matchs peuvent avoir lieu sur n'importe quel terrain disponible.
   - **Arbitre obligatoire** : Si coché, l'application désignera obligatoirement une équipe pour arbitrer chaque match et l'affichera sur la TV et les feuilles de route.
   - **Marqueur obligatoire** : Si coché, l'application désignera une équipe pour tenir la table de marque.
   - **Saisie détaillée des joueurs** :
     - Si décoché (mode simplifié) : on saisit juste le nom de l'équipe et éventuellement le nombre de femmes.
     - Si coché (mode détaillé) : on saisira la liste nominative des joueurs avec leur prénom, nom et genre.
4. **Action** : Cliquer sur **« Enregistrer »**. La catégorie s'ajoute immédiatement à la liste.

---

### Étape 3 : Inscription des équipes
1. **Où cliquer** : Menu latéral gauche → onglet **Équipes**.
2. **Ce qui apparaît** : Deux sous-onglets : *« Liste des équipes »* et *« Inscription »*.
3. **Formulaire d'inscription** :
   - **Nom de l'équipe** : Texte unique (ex. : `Les Aigles Verts`).
   - **Catégorie** : Menu déroulant pour choisir dans quelle catégorie inscrire l'équipe.
   - **Calcul du bonus féminin 3x3** :
     - *En mode simplifié* : Un champ numérique permet de renseigner le nombre de femmes dans l'équipe.
     - *En mode détaillé* : On ajoute chaque joueur un par un via le sous-formulaire (Prénom, Nom, Sexe `Homme`/`Femme`, Rôles : `Joueur`, `Arbitre`, `Marqueur`).
     - **Règle du bonus calculée par le logiciel** :
       - 0 femme = 0 point de bonus.
       - 1 femme = +1 point de bonus au score initial.
       - 2 femmes ou plus = +2 points de bonus au score initial.
       - Un badge orange `+1 pt` ou `+2 pts` s'affichera automatiquement à côté du nom de l'équipe lors des matchs et sur la feuille de match.
4. **Action** : Cliquer sur **« Ajouter l'équipe »**. L'équipe apparaît dans le tableau récapitulatif avec sa catégorie et sa pastille de couleur.

---

### Étape 4 : Organisation en Poules (Traditionnelle ou Suisse)
1. **Où cliquer** : Menu latéral gauche → onglet **Organisation**.
2. **Sélectionner la catégorie** : Des onglets en haut permettent de basculer d'une catégorie à l'autre.
3. **Choisir le format sportif** :
   - **Format Traditionnel (Poules classiques)** :
     - On choisit le *Nombre d'équipes par poule* (ex. : poules de 3, 4 ou 5 équipes).
     - Option *Double aller-retour* : à cocher si vous souhaitez que les équipes s'affrontent deux fois (très pratique quand il y a peu d'équipes, ex. : une poule unique de 3 équipes).
     - Cliquer sur le bouton vert **« Générer les poules et matchs »**.
     - Le logiciel mélange aléatoirement les équipes de la catégorie, crée les poules nommées Poule A, Poule B, etc., et crée tous les matchs nécessaires.
   - **Format Système Suisse** :
     - Idéal pour les tournois où l'on veut garantir exactement le même nombre de matchs à chaque équipe sans élimination prématurée.
     - On sélectionne *Système Suisse* et on choisit le *Nombre de matchs par équipe* (ex. : 3 ou 4 matchs).
     - Le logiciel utilise la méthode mathématique du cercle pour planifier les rencontres sans doublons.
4. **Attention / Risque** : Si des scores avaient déjà été enregistrés pour cette catégorie, le bouton avertit l'utilisateur : *« ATTENTION : Des scores ont déjà été saisis. Régénérer effacera tous les résultats de cette catégorie. Continuer ? »*.

---

### Étape 5 : Création du Calendrier global, des Sessions et Terrains
1. **Où cliquer** : Menu latéral gauche → onglet **Calendrier Global**.
2. **Action** : Cliquer sur le bouton bleu **« Générer le calendrier global »** (ou la génération est automatique dès la création des poules).
3. **Ce que fait l'algorithme intelligent (`scheduleLogic.ts`)** :
   - Il calcule le nombre de sessions nécessaires pour jouer tous les matchs sur le nombre de terrains disponibles.
   - **Priorité 1** : Remplir au maximum chaque terrain à chaque session pour qu'aucun terrain ne reste inoccupé.
   - **Priorité 2 (Repos des équipes)** : Il calcule l'intervalle idéal de repos pour chaque équipe et évite rigoureusement qu'une équipe joue deux sessions consécutives si d'autres équipes peuvent jouer.
   - **Priorité 3 (Terrains réservés)** : Il place les matchs des catégories sur leurs terrains prioritaires tant qu'il y a des matchs de poule.
   - **Priorité 4 (Arbitrage automatique)** : Pour chaque match nécessitant un arbitre ou un marqueur, il choisit automatiquement une équipe qui ne joue pas pendant cette session pour tenir la table, sans que cette équipe n'enchaîne deux arbitrages d'affilée.

---

### Étape 6 : Pilotage du tournoi le jour J (Sessions, Chrono et Scores)
1. **Lancement du tournoi** :
   - Dans le bandeau supérieur de l'écran, cliquer sur **« Démarrer le tournoi »**.
2. **Le Chronomètre central (`GlobalTimer`)** :
   - Cliquer sur le bouton vert **« Démarrer »**.
   - Un compte à rebours visuel et sonore (5, 4, 3, 2, 1) se déclenche, suivi du coup de sifflet officiel.
   - Le chrono s'affiche en grand sur l'écran admin et sur la TV.
   - À 1 minute de la fin, un son d'avertissement retentit automatiquement.
   - La lecture de la corne de fin démarre à 10 secondes restantes (le fichier personnalisé peut contenir le décompte et le buzzer). À zéro, le match se termine et la pause commence si elle est configurée.
3. **Saisie et validation des scores sur l'Admin** :
   - Sur la ligne de chaque match de la session active, l'organisateur peut ajuster le score avec les boutons `+` et `-`.
   - Cliquer sur le bouton vert **« ✓ Valider »**.
   - Le match passe au statut *Terminé* (badge vert).
   - En cas d'erreur, cliquer sur **« ✏️ Modifier »** pour corriger les points ou déclarer un **Forfait** (l'équipe absente reçoit 0 point au classement, l'adversaire reçoit 3 points de victoire ; le code actuel conserve un score affiché de 0–0 et exclut ce match du calcul des points marqués/encaissés. Cette règle reste à confirmer avec les arbitres et le règlement officiel).
4. **Passage à la session suivante** :
   - Cliquer sur le bouton bleu **« Lancer la session suivante »**.
   - Le numéro de session passe de 1 à 2.
   - L'écran TV bascule instantanément pour afficher les matchs de la session 2.
   - Le serveur enregistre une sauvegarde instantanée dans le dossier `backups/`.
   - En cas d'erreur de manipulation, le bouton **« ← Session précédente »** permet de revenir en arrière sans perdre aucun score.

---

### Étape 7 : Classement et Départage des équipes
1. **Où cliquer** : Menu latéral gauche → onglet **Classement**.
2. **Barème officiel appliqué** :
   - **Victoire** = 3 points.
   - **Match nul** = 2 points.
   - **Défaite** = 1 point (règle officielle basket : encourage la participation).
   - **Forfait** = 0 point.
3. **Critères de départage en cas d'égalité de points** :
   1. Nombre total de points au classement.
   2. Résultat de la confrontation directe entre les équipes à égalité.
   3. Différence générale de points marqués et encaissés (`Points Pour - Points Contre`).
   4. Meilleure attaque (total des points marqués).

---

### Étape 8 : Phase Finale (Arbres éliminatoires et finales)
1. **Où cliquer** : Menu latéral gauche → onglet **Phase Finale**.
2. **Sélectionner la catégorie** et choisir la configuration :
   - Nombre total d'équipes qualifiées : 4 (demi-finales), 8 (quarts de finale), 16 (huitièmes) ou 32 (seizièmes).
3. **Génération du tableau** :
   - **Mode Automatique** : Le logiciel prend automatiquement les 1ers et 2èmes de chaque poule et les croise (ex. : 1er Poule A affronte 2ème Poule B).
   - **Mode Manuel** : L'organisateur utilise un éditeur d'appariements pour composer lui-même les affiches de son choix.
   - Cliquer sur **« Générer la phase finale »**.
4. **Progression des vainqueurs** :
   - Chaque match de phase finale dispose d'un champ pour lui affecter un terrain (`Court`).
   - Quand le score d'un quart de finale est validé, le logiciel qualifie automatiquement le vainqueur dans la demi-finale correspondante.
   - Si le tableau commence en demi-finale, une **Petite Finale (Match pour la 3ème place)** est automatiquement créée entre les deux perdants des demi-finales.
   - **Règle de sécurité 3x3** : En phase finale, un score nul est impossible. L'application bloque la validation tant qu'une équipe n'a pas au moins un point d'avance.
5. **Régie TV pour les finales** :
   - Un sélecteur permet de forcer l'affichage sur la TV d'un tour particulier (ex. : afficher en grand l'arbre des Quarts, ou uniquement les Finales).

---

### Étape 9 : Diffusion sur l'Écran TV géant
1. **Où cliquer** : En haut à gauche de l'écran admin, deux boutons violets sont présents :
   - **« Lancer la TV »** : Ouvre l'écran public dans un nouvel onglet avec la sonorisation activée (sifflets, buzzers, musique).
   - **« TV (Muet) »** : Ouvre l'écran public sans aucun son (idéal pour un deuxième écran dans les vestiaires ou au bar).
2. **Ce qui apparaît sur la TV** :
   - Un premier écran d'accueil avec un gros bouton : *« Activer l'affichage TV »*. Ce clic est nécessaire pour autoriser le navigateur à jouer du son (règle de sécurité des navigateurs appelée *autoplay policy*).
   - Ensuite, l'affichage 1920×1080 démarre son cycle automatique :
     1. Prochains matchs de la session en cours avec les terrains et arbitres.
     2. Résultats de la session précédente (vainqueur en vert, perdant en rouge).
     3. Classements complets des poules.
     4. Tableaux des phases finales en cours.
     5. Diapositives des sponsors partenaires avec leurs logos.
   - **Bandeau bas permanent** : Le chronomètre officiel en gros chiffres à gauche, le numéro de session à droite, et un ruban défilant au centre affichant les scores en direct reçus des tablettes.

---

### Étape 10 : Utilisation des Tablettes Terrains (`CourtView`)
1. **Comment y accéder** : Sur chaque tablette posée à la table de marque d'un terrain, ouvrir l'adresse du serveur avec le paramètre du terrain, par exemple : `http://192.168.1.50:3000/?view=court&court=1` pour le Terrain 1.
2. **Fonctionnement à la table** :
   - La tablette affiche le match prévu pour sa session et son terrain.
   - Les marqueurs cliquent sur le bouton **« Équipes prêtes »** : l'organisateur voit instantanément le voyant du terrain passer au vert sur son écran de contrôle.
   - Pendant le match, le marqueur utilise les boutons tactiles `+` et `−` (un point par clic) pour ajouter les points au fur et à mesure. Chaque point est envoyé instantanément sur le bandeau défilant de la TV.
   - Le marqueur peut aussi comptabiliser les fautes d'équipe avec un code couleur conforme aux règles FIBA 3x3 :
     - De 1 à 6 fautes : vert (fautes normales).
     - De 7 à 9 fautes : orange (2 lancers-francs automatiques).
     - 10 fautes et plus : rouge (2 lancers-francs plus possession de balle).
   - En fin de match, le marqueur clique sur **« Envoyer le score »**. Le score final est validé et met à jour le classement sans que l'organisateur central n'ait besoin de ressaisir quoi que ce soit.

---

### Étape 11 : Feuilles de route, Feuilles de match et Impressions
1. **Où cliquer** : Menu latéral gauche → onglet **Feuilles de Route**.
2. **Feuilles de route par équipe** :
   - Pour chaque équipe inscrite, l'application génère son planning personnalisé pour toute la journée : à quelle heure/session elle joue, sur quel terrain, contre qui, et quand elle doit arbitrer ou tenir la table.
   - Trois boutons d'action :
     - **« Imprimer (Direct) »** : Ouvre la boîte d'impression du navigateur pour imprimer directement les feuilles de route à distribuer aux capitaines à leur arrivée.
     - **« Copier pour Sheets »** : Copie les données brutes dans le presse-papier pour les coller dans Google Sheets ou Excel.
     - **« Exporter (.xlsx) »** : Télécharge un tableau pour tableur.
3. **Feuilles de match papier 3x3** :
   - Permet d'imprimer des feuilles de match de secours au format officiel 3x3 (A4 paysage, découpable en 4 feuilles par page format 2×2).
   - Chaque feuille comprend l'en-tête du match, les noms des équipes, le rappel du bonus féminin pré-rempli, la grille de pointage de 1 à 21 points et la grille des fautes de 1 à 13.

---

### Étape 12 : Sauvegardes, Exportations et Sécurité
1. **Copies de secours automatiques** :
   - Sur le réseau local, les changements envoyés par Socket.IO sont fusionnés par le serveur puis écrits en série dans `tournament_data.json`.
   - Le navigateur garde aussi une copie locale dans **IndexedDB** et `localStorage`.
   - Quand on passe à la session suivante, le serveur archive l'état de la session qui vient de finir dans `backups/`. Les cinq copies les plus récentes sont conservées.
2. **Export / Import manuel** :
   - Dans **Configuration** → cliquer sur le bouton gris **« Exporter / Importer »**.
   - Cliquer sur **« Télécharger la sauvegarde (.json) »** pour enregistrer une copie sur une clé USB.
   - Pour réinstaller un tournoi sur un autre ordinateur, cliquer sur **« Importer un fichier JSON »**.

---

## 3. EXPLICATION DE TOUS LES ÉCRANS ET DE TOUS LES BOUTONS

Voici l'inventaire exhaustif de tous les contrôles visibles de l'application, classés par écran.

---

### A. Barre de navigation supérieure (`App.tsx`)
- **Titre du tournoi** : Texte à gauche. Affiche le nom actuel du tournoi.
- **Bouton « Lancer la TV »** (fond violet, icône écran) :
  - *Action* : Ouvre l'affichage TV avec le son activé dans un nouvel onglet de navigateur (`?view=tv`).
  - *Données modifiées* : Aucune.
  - *Risque / Confirmation* : Aucun.
- **Bouton « TV (Muet) »** (fond gris foncé, icône haut-parleur barré) :
  - *Action* : Ouvre l'affichage TV sans sonorisation (`?view=tv&mute=true`).
  - *Données modifiées* : Aucune.
  - *Risque / Confirmation* : Aucun.
- **Lecteur de musique (`MusicPlayer.tsx`)** :
  - *Bouton Lecture/Pause (▶ / ⏸)* : Démarre ou suspend la musique d'ambiance.
  - *Bouton Suivant (⏭)* : Passe au morceau suivant de la playlist.
  - *Bouton Volume (icône enceinte)* : Règle le niveau sonore de la musique.
- **Chronomètre global (`GlobalTimer.tsx`)** :
  - *Affichage numérique (ex. : `10:00`)* : Indique le temps restant de la session.
  - *Bouton « Start » (vert)* : Lance le décompte sonore de 5 secondes puis démarre le chrono.
  - *Bouton « Pause » (orange)* : Met le chronomètre en pause sans réinitialiser le temps.
  - *Bouton « Reset » (rouge)* : Remet le chronomètre à la durée configurée pour la session.

---

### B. Menu latéral gauche (`App.tsx`)
- **Bouton « Configuration »** : Affiche l'écran de paramétrage général, des catégories, de la TV et des sponsors.
- **Bouton « Équipes »** : Affiche le tableau des équipes engagées et le formulaire d'inscription.
- **Bouton « Organisation »** : Affiche la répartition des poules et la génération des matchs.
- **Bouton « Calendrier Global »** : Affiche le planning de toutes les sessions, le contrôle des terrains et la saisie des scores.
- **Bouton « Classement »** : Affiche les tableaux des scores et points de chaque poule.
- **Bouton « Phase Finale »** : Affiche la création et la gestion des arbres éliminatoires (quarts, demis, finales).
- **Bouton « Feuilles de Route »** : Affiche les fiches individuelles par équipe et l'impression des feuilles de match.
- **Bouton « Arbitre / Marqueur »** : Affiche la grille récapitulative des désignations des officiels.
- **Bouton « Aide »** : Affiche le manuel d'utilisation intégré.

---

### C. Écran « Configuration » (`TournamentConfig.tsx`)
#### Bloc 1 : Informations générales
- **Champ « Nom du Tournoi »** : Saisie du nom affiché publiquement.
- **Champ « Nombre de Terrains »** : Saisie du nombre de terrains physiques disponibles (minimum 1).
- **Champ « Durée du Match (minutes) »** : Durée du compte à rebours de jeu (minimum 1 minute).
- **Champ « Temps de Pause (minutes) »** : Durée de battement théorique entre sessions.

#### Bloc 2 : Catégories & Terrains
- **Bouton « Modifier » (bleu, à côté de chaque catégorie)** : Ouvre la fenêtre `CategoryDialog` pour changer le nom, la couleur ou les terrains réservés de la catégorie.
- **Bouton « Supprimer » (rouge)** : Supprime la catégorie. *Attention : supprime également les équipes et matchs rattachés*.
- **Bouton « + Ajouter une catégorie » (rectangle en pointillés)** : Ouvre la fenêtre `CategoryDialog` pour créer une nouvelle division.

#### Bloc 3 : Paramètres avancés (Menu accordéon repliable)
- **Sous-bloc « 📺 Affichage TV »** :
  - *Champ « Durée affichage matchs TV (sec) »* : Temps en secondes de chaque page de matchs (défaut : 8s).
  - *Champ « Durée affichage sponsors TV (sec) »* : Temps d'affichage d'un sponsor (défaut : 6s).
  - *Case à cocher « Prochains Matchs »* : Active ou masque la diapositive des matchs à venir sur la TV.
  - *Case à cocher « Résultats Précédents »* : Active ou masque la diapositive des derniers scores.
  - *Case à cocher « Classements »* : Active ou masque la diapositive des classements de poules.
  - *Case à cocher « Sponsors »* : Active ou masque la diapositive des partenaires commerciaux.
  - *Case à cocher « Afficher Chrono »* : Affiche le chronomètre dans le pied de page de la TV.
  - *Case à cocher « Scores en Direct »* : Active le bandeau défilant des scores issus des tablettes. Grisé si les tablettes ne sont pas activées.
- **Sous-bloc « 🔔 Sons personnalisés »** :
  - *Bouton « Choisir un fichier » pour Sifflet de Départ* : Téléverse un fichier audio MP3/WAV (max 1 Mo) pour remplacer le sifflet par défaut.
  - *Bouton « Choisir un fichier » pour Alerte 1 Minute* : Téléverse un son d'avertissement.
  - *Bouton « Choisir un fichier » pour Corne de Fin* : Téléverse le son du buzzer final.
  - *Boutons « Réinitialiser »* : Rétablissent les signaux sonores par défaut du logiciel.
- **Sous-bloc « 🏢 Sponsors » (`SponsorManager.tsx`)** :
  - *Champ texte « Nom du sponsor »* + bouton pour importer le logo (image PNG/JPEG).
  - *Bouton « Ajouter le sponsor »* : Enregistre le partenaire dans la boucle TV.
  - *Bouton « Supprimer »* sur chaque sponsor existant.
- **Sous-bloc « 📱 Tablettes terrain »** :
  - *Case à cocher « Activer la saisie sur tablette terrain »* : Autorise l'accès aux pages `?view=court&court=X`.
  - *Liens directs Terrain 1, Terrain 2...* : Permet d'ouvrir la page de chaque terrain dans un nouvel onglet pour tester ou envoyer le lien aux marqueurs.

#### Bas de page Configuration
- **Bouton bleu « Enregistrer la configuration »** : Applique toutes les modifications et les diffuse en temps réel sur le réseau.
- **Bouton « Exporter / Importer »** : Ouvre la boîte de dialogue `ExportDialog`.
- **Bouton rouge « Nouveau tournoi (Conserver réglages) »** : Réinitialise les équipes, poules et matchs tout en gardant les catégories, réglages TV, sponsors et sons. *Affiche une confirmation de sécurité avant d'effacer les données*.

---

### D. Écran « Équipes » (`TeamManager.tsx`)
- **Onglet « Liste des équipes »** : Tableau listant toutes les équipes avec leur catégorie, leur composition et leur bonus féminin.
- **Onglet « Inscription »** :
  - *Champ « Nom de l'équipe »*.
  - *Menu déroulant « Catégorie »*.
  - *Section Joueurs (si mode détaillé)* :
    - Champs Prénom, Nom, boutons radio Homme/Femme, cases Joueur/Arbitre/Marqueur.
    - Bouton vert « + Ajouter le joueur ».
  - *Champ « Nombre de joueuses » (si mode simplifié)* : Renseigne manuellement le quota féminin pour le bonus 3x3.
  - *Bouton vert « Ajouter l'équipe »*.
- **Sur chaque ligne d'équipe** :
  - *Bouton bleu « Modifier »* : Charge les données de l'équipe dans le formulaire.
  - *Bouton rouge « Supprimer »* : Supprime l'équipe après confirmation.

---

### E. Écran « Organisation / Poules » (`PoolsDisplay.tsx`)
- **Onglets de catégories** : Permet de choisir quelle catégorie organiser.
- **Boutons radio Format** : Choix entre *« Tournoi Traditionnel »* et *« Système Suisse »*.
- **Champ « Équipes par poule »** (mode traditionnel) : Définit la taille des poules (ex. : 4).
- **Case à cocher « Double aller-retour »** : Double le nombre de confrontations.
- **Champ « Nombre de matchs par équipe »** (mode suisse) : Fixe le nombre exact de tours.
- **Bouton vert « Générer les poules et matchs »** : Crée les groupes et les rencontres. *Affiche une alerte rouge si des scores existent déjà*.
- **Bouton rouge « Réinitialiser les poules »** : Supprime les poules et remet les équipes en attente.

---

### F. Écran « Calendrier Global » (`GlobalSchedule.tsx`)
- **Bouton « Démarrer le tournoi »** : Initialise le tournoi et verrouille les poules.
- **Bouton vert « Lancer la session suivante »** : Incrémente le numéro de session active et synchronise la TV.
- **Bouton gris « ← Session précédente »** : Recule d'une session sans effacer aucun score.
- **Bouton « 📺 Contrôle TV »** : Ouvre un menu pop-up rapide permettant d'activer ou de désactiver instantanément les diapositives TV (matchs, résultats, classements, sponsors, live scores) sans avoir à quitter le calendrier.
- **Indicateurs de terrains (T.1, T.2...)** : Pastilles cliquables. Grises = en attente ; Vertes = équipes prêtes signalées par la tablette. Un clic manuel permet à l'organisateur de basculer l'état à la main.
- **Sur chaque ligne de match** :
  - *Boutons `-` et `+`* pour chaque équipe : Ajuste les points en direct.
  - *Bouton vert « ✓ Valider »* : Enregistre le score officiel et met à jour le classement immédiatement.
  - *Bouton bleu « ✏️ Modifier »* : Ouvre la fenêtre `ScoreDialog` pour changer le score ou cocher un forfait.

---

### G. Écran « Phase Finale » (`FinalPhaseManager.tsx`)
- **Onglet par catégorie** : Permet de piloter la phase finale catégorie par catégorie.
- **Menu « Équipes qualifiées »** : Choix entre 4, 8, 16 ou 32 équipes.
- **Bouton radio Génération** : *Automatique* (selon les classements de poules) ou *Manuelle* (composition personnalisée).
- **Bouton vert « Générer la phase finale »** : Construit l'arbre complet du tournoi.
- **Sélecteur « Régie TV »** : Force l'affichage d'un tour particulier sur la TV (ex. : Demi-finales).
- **Dans chaque match du tableau** :
  - *Champ « Terrain »* : Assigne un numéro de terrain à la rencontre.
  - *Champs Score 1 et Score 2* : Saisie du résultat.
  - *Bouton « Valider le match »* : Valide le vainqueur et l'envoie automatiquement au tour suivant.

---

### H. Écran Tablettes Terrains (`CourtView.tsx`)
- **Bouton vert « Équipes prêtes »** : Envoie le signal réseau à l'admin que le match peut débuter.
- **Section Équipe 1 & Équipe 2** :
  - Nom de l'équipe et badge de bonus féminin.
  - Gros chiffre du score actuel.
  - Boutons de marque : `+` et `−` (un point par clic).
  - Boutons de fautes : `+ Faute`, `- Faute` avec compteur dynamique (vert / orange / rouge).
- Les forfaits sont saisis par l’organisateur sur le PC ; aucun bouton forfait n’est ajouté à la tablette.
- **Bouton bleu « Envoyer le score »** : Valide définitivement le match auprès du serveur central.

---

## 4. EXPLICATION DU CODE, FICHIER PAR FICHIER

Voici l'analyse détaillée de chaque fichier du projet avec son rôle exact, ses fonctions et les lignes de code stratégiques.

---

### A. Fichiers de configuration et de démarrage (Racine)

#### 1. `server.ts` (Serveur Node.js et WebSockets — 267 lignes)
- **À quoi il sert** : C'est le moteur central de l'application lorsqu'elle est exécutée sur un ordinateur dans le gymnase. Il écoute sur le port 3000, sert les pages web aux tablettes et à la télé, et synchronise tous les scores en direct grâce à Socket.io.
- **Ce qu'il reçoit et produit** : Reçoit des requêtes HTTP (`/save`, `/api/upload`) et des paquets WebSockets (`update_state`, `live_score`, `court_ready`). Il produit la diffusion des événements à tous les appareils connectés et enregistre le fichier `tournament_data.json`.
- **Détail des lignes clés** :
  - *Lignes 9 à 22* : Initialisation du serveur Express et de l'instance Socket.io avec une limite de mémoire tampon de 100 Mo (`maxHttpBufferSize: 1e8`) pour permettre l'échange d'images de sponsors en haute définition.
  - *Lignes 28 à 50* : Route `POST /api/upload` qui réceptionne les fichiers sons et logos et les enregistre dans le dossier `public/uploads/` avec un préfixe horodaté (`Date.now()`).
  - *Route `POST /save`* : Conservée pour compatibilité avec d'anciennes versions. La version actuelle enregistre l'état reçu par Socket.IO après fusion.
  - *Lignes 80 à 100 (`cleanupSnapshots`)* : Fonction qui inspecte le dossier `backups/`, trie les sauvegardes par date et supprime les plus anciennes pour ne conserver strictement que les 5 derniers snapshots.
  - *Fonction `saveSnapshot`* : Enregistre l'état précédent lors du passage à une session suivante, sous un nom horodaté. Le dossier garde les cinq copies les plus récentes.
  - *Lignes 120 à 146* : Lors de la connexion d'un nouvel appareil (`connection`), le serveur lui transmet immédiatement l'état actuel (`state_update`), les scores en direct en cours (`live_score_update`) et les terrains prêts (`court_ready_update`).
  - *Lignes 148 à 192 (`update_state`)* : **Algorithme de fusion intelligente**. Le serveur compare l'état reçu avec son état en mémoire. Si un match était déjà validé au statut `finished`, le serveur refuse de l'écraser par un statut `pending` (lignes 153 à 173). Cela protège les résultats contre toute désynchronisation entre plusieurs tablettes.
  - *Lignes 195 à 214* : Gestion des signaux `court_ready` et `court_ready_cancel` émis par les tablettes et rediffusés à l'organisateur.
  - *Lignes 217 à 222* : Relais immédiat des points marqués en direct (`live_score`) vers la TV.
  - *Lignes 225 à 240* : Relais des ordres de chronomètre (`timer_start`), d'effets sonores (`play_audio`) et de musique (`music_command`).
  - *Lignes 247 à 264* : Démarrage du serveur web Vite en mode développement ou distribution des fichiers statiques compilés (`dist/index.html`) en production sur `0.0.0.0:3000`.

#### 2. `main.cjs` et `scripts/buildServer.mjs` (Démarrage du programme Windows)
- **À quoi ils servent** : La commande `npm run build:windows` crée un serveur autonome dans `server-build/server.cjs`, puis fabrique le programme Windows portable. Au lancement du programme, `main.cjs` démarre ce serveur, attend sa réponse de contrôle, puis ouvre l'application à son adresse locale.
- **Données du tournoi** : Les données et les fichiers téléversés sont rangés dans le dossier de données de l'application Windows, pas dans le dossier temporaire du programme.
- **À retenir** : La version Cloudflare reste une prévisualisation web. Le serveur local est nécessaire pour faire communiquer les tablettes et l'écran TV pendant le tournoi.

#### 3. `types.ts` (Modèle de données TypeScript — 207 lignes)
- **À quoi il sert** : Ce fichier définit la structure stricte de toutes les données manipulées par le logiciel. Il empêche les erreurs de programmation en vérifiant le type de chaque variable.
- **Structures essentielles** :
  - *Lignes 2 à 18 (`Player`, `Team`)* : Modèle d'un joueur (prénom, nom, sexe, rôles) et d'une équipe (nom, catégorie, poule, quota féminin).
  - *Lignes 20 à 33 (`Category`)* : Modèle d'une catégorie avec ses options d'arbitrage, terrains réservés et configuration de phase finale.
  - *Lignes 35 à 50 (`Match`)* : Modèle d'un match de poule avec scores, statut (`pending` ou `finished`), terrain assigné, session, arbitre, marqueur et forfait éventuel.
  - *Lignes 56 à 67 (`Standing`)* : Statistiques de classement d'une équipe (joués, victoires, nuls, défaites, points de classement, goal-average).
  - *Lignes 77 à 96 (`FinalMatch`)* : Match de phase finale avec round (seizième à finale), liens vers les matchs précédents (`sourceMatch1`, `sourceMatch2`) et indicateur `isReady`.
  - *Lignes 124 à 146 (`TournamentState`)* : L'objet global contenant l'état complet du tournoi.
  - *Lignes 148 à 207 (`TournamentAction`)* : L'inventaire de toutes les commandes reconnues par le logiciel (`SET_STATE`, `UPDATE_CONFIG`, `ADD_TEAM`, `UPDATE_MATCH_SCORE`, `NEXT_SESSION`, etc.).

#### 4. `App.tsx` (Routeur principal et coquille de l'application — 239 lignes)
- **À quoi il sert** : C'est le composant React racine. Il lit les paramètres de l'adresse web pour décider d'afficher l'interface d'administration, l'écran TV ou l'écran d'une tablette terrain.
- **Détail des lignes clés** :
  - *Lignes 39 à 57 (`useEffect`)* : Analyse l'URL du navigateur (`window.location.search`). Si `view=tv`, il bascule en mode plein écran TV (`isTvMode`). Si `view=court`, il bascule en mode tablette terrain (`isCourtMode`) pour le numéro de terrain indiqué.
  - *Lignes 107 à 125* : Rendu du mode TV avec affichage du bandeau ambre si `isPreviewMode` est actif, et inclusion invisible des composants de musique et de sons (`MusicPlayer` et `GlobalTimer`) pour qu'ils puissent retentir sur la sono de la TV.
  - *Lignes 127 à 151* : Rendu du mode tablette avec vérification que l'option a bien été activée dans les réglages (`state.enableCourtView`).
  - *Lignes 153 à 236* : Rendu du mode Administrateur avec la barre supérieure, le menu latéral gauche et l'affichage dynamique de la vue sélectionnée via la fonction `renderView()` (lignes 68 à 91).

#### 5. `wrangler.jsonc` (Configuration Cloudflare Workers — 9 lignes)
- **À quoi il sert** : Permet de déployer instantanément la version web de l'application sur le réseau mondial de Cloudflare.
- **Contenu** : Indique le nom du projet (`gestion-tournois-src`), la date de compatibilité, le dossier des fichiers compilés (`./dist`) et configure la redirection Single Page Application (`"not_found_handling": "single-page-application"`).

---

### B. Gestion d'état et Réducteurs (`context/`)

#### 1. `context/TournamentContext.tsx` (Gestionnaire d'état global — 188 lignes)
- **À quoi il sert** : Ce fichier crée le contexte React accessible par tous les boutons et écrans de l'application. C'est lui qui gère la communication avec le serveur Socket.io et qui assure la bascule automatique vers le mode aperçu en cas d'absence de serveur.
- **Détail des lignes clés** :
  - *Lignes 29 à 40* : Initialisation de la connexion Socket.io vers l'adresse du serveur local avec un délai d'expiration rapide (`timeout: 1200`).
  - *Lignes 42 à 80 (`useEffect` de connexion)* : Si le serveur ne répond pas après 1200 millisecondes ou renvoie une erreur `connect_error`, la variable `isPreviewMode` passe à `true`. L'application charge alors les données depuis la base de données interne du navigateur (`IndexedDB` ou `localStorage`).
  - *Lignes 82 à 130* : Écouteurs d'événements Socket.io. Dès que le serveur envoie `state_update`, l'état React est mis à jour.
  - *Lignes 132 à 155* : Le navigateur conserve une copie locale dans `localStorage` et `IndexedDB`. Sur le réseau local, il envoie `update_state` au serveur par WebSocket, et le serveur écrit l'état fusionné sur le disque.

#### 2. `context/reducers/poolMatchReducer.ts` (Gestion des poules et scores — 145 lignes)
- **À quoi il sert** : Il contient les fonctions qui créent les poules, génèrent les matchs et calculent les conséquences d'un score saisi.
- **Fonctions clés** :
  - *Lignes 16 à 48 (`GENERATE_CATEGORY_POOLS_AND_MATCHES`)* : Appelle la logique de découpage des poules, crée les confrontations, planifie les terrains et sessions, puis recalcule les classements à zéro.
  - *Lignes 50 à 95 (`UPDATE_MATCH_SCORE`)* : Met à jour le score d'un match de poule, bascule son statut à `finished`, prend en compte le forfait éventuel, et recalcule immédiatement les classements de la poule via `calculatePoolStandings()`.
  - *Lignes 97 à 120* : Vérifie si tous les matchs de poules du tournoi sont achevés pour passer automatiquement `isPoolStageFinished` à `true`.

#### 3. `context/reducers/scheduleLogic.ts` (dans `utils/` — 337 lignes)
- **À quoi il sert** : C'est le cerveau mathématique de la planification. Il résout le problème d'optimisation de l'emploi du temps du tournoi.
- **Fonctionnement détaillé** :
  - *Lignes 4 à 35* : Récupère les matchs à planifier et filtre les équipes par catégorie.
  - *Lignes 37 à 67* : Calcule pour chaque équipe son nombre de matchs total et son **intervalle idéal de repos** (`estimatedSessions / matches`).
  - *Lignes 70 à 180 (Boucle de planification des sessions)* : Pour chaque session et chaque terrain :
    - Il sélectionne en priorité les matchs dont les deux équipes ont le plus grand temps de repos depuis leur dernier match (`lastSessionPlayed`).
    - Il s'assure qu'une équipe ne peut JAMAIS jouer deux matchs au cours de la même session.
    - Il respecte les terrains réservés de la catégorie.
  - *Lignes 190 à 335 (`assignOfficials`)* : Pour chaque match nécessitant un arbitre ou un marqueur :
    - Il cherche une équipe au repos lors de cette session.
    - Il vérifie qu'elle ne vient pas d'arbitrer lors de la session précédente.
    - Il lui affecte le rôle et enregistre son identifiant dans `refereeId` et `scorerId`.

#### 4. `context/reducers/standingsLogic.ts` (dans `utils/` — 208 lignes)
- **À quoi il sert** : Calcule le classement officiel de chaque poule selon les règles sportives.
- **Fonctionnement détaillé** :
  - *Lignes 4 à 25* : Initialise les statistiques de chaque équipe à zéro.
  - *Lignes 27 à 75* : Parcourt tous les matchs terminés de la poule :
    - Victoire = +3 points.
    - Nul = +2 points.
    - Défaite = +1 point.
    - Forfait = 0 point pour l'équipe absente, +3 points pour l'équipe présente.
    - Ajoute les points marqués (`pointsFor`) et encaissés (`pointsAgainst`).
  - *Lignes 80 à 205 (Départage)* : Trie le tableau :
    1. Tri par points de tournoi décroissants.
    2. Si égalité entre deux équipes : analyse du résultat de leur match direct (`directConfrontationWins`).
    3. Si égalité persistante : différence de points globale (`pointsDifference`).
    4. Si égalité persistante : total des points marqués (`pointsFor`).

#### 5. `context/reducers/finalPhaseReducer.ts`
- **À quoi il sert** : Gère la création des tableaux finaux et la progression des vainqueurs tour après tour.
- **Fonctionnement** :
  - `GENERATE_FINAL_PHASE` : Le mode automatique choisit les équipes qualifiées. Le mode manuel garde les choix de l'organisateur.
  - `UPDATE_MANUAL_PAIRINGS` : Après les affiches manuelles du premier tour, prépare aussi les tours suivants sans choisir les équipes à la place de l'organisateur.
  - `UPDATE_FINAL_MATCH_SCORE` : Valide un score, désigne le gagnant et transmet le résultat au match lié du tour suivant.

---

### C. Composants d'affichage et d'interface (`components/`)

#### 1. `components/TVDisplay.tsx` (Écran Géant TV 1080p — 320 lignes)
- **À quoi il sert** : Affiche l'écran public 16:9 haute définition destiné aux téléviseurs du gymnase.
- **Fonctionnement mathématique clé** :
  - Le composant crée un canevas rigide de **1920 pixels de large par 1080 pixels de haut**.
  - Il mesure la taille réelle de la fenêtre (`window.innerWidth`, `window.innerHeight`) et applique un style CSS `transform: scale(scale)` centré.
  - **Résultat** : L'affichage ne bave jamais, ne déborde jamais et conserve exactement les mêmes proportions qu'il soit affiché sur un écran 720p, 1080p ou 4K.
- **Boucle d'animation** :
  - Un minuteur fait alterner les écrans selon les durées paramétrées : `NextSessionMatches` → `PreviousSessionResults` → `TVStandings` → `TVBracket` → `SponsorDisplay`.
  - Le bas de l'écran contient en permanence le composant `TVTimer` (chrono) et `LiveScores` (scores en direct défilants).

#### 2. `components/CourtView.tsx` (Feuille de marque tablette — 340 lignes)
- **À quoi il sert** : Fournit une interface tactile simplifiée pour les bénévoles à la table de marque sur chaque terrain.
- **Fonctionnement** :
  - Lit le numéro du terrain passé dans l'URL.
  - Affiche les deux équipes avec leurs couleurs et leur bonus féminin.
  - Envoie un signal réseau `live_score` à chaque changement de score pour répercuter le score en direct sur la TV.
  - Gère les boutons de fautes d'équipe avec avertissement visuel orange à 7 fautes et rouge à 10 fautes.
  - À la fin du chrono ou au clic sur « Envoyer le score », il transmet `court_submit`. Le terrain reste affiché jusqu’à confirmation de réception. Seul le PC peut ensuite corriger le score.

#### 3. `components/GlobalTimer.tsx` (Régie Chronomètre — 210 lignes)
- **À quoi il sert** : Contrôle le décompte officiel du temps et déclenche les alertes sonores sur le PC et sur les téléviseurs connectés.
- **Fonctionnement sonore** :
  - Utilise soit des sons de synthèse générés par l'API Web Audio du navigateur, soit les fichiers audio personnalisés téléversés par l'utilisateur (sifflet, 1 minute, corne de brume).
  - Émet l'événement `play_audio` via WebSockets pour que les alertes retentissent sur toutes les télés connectées à la sono.

#### 4. `components/TeamRoadmaps.tsx` & `TeamRoadmapDialog.tsx` (Feuilles de route — 280 lignes)
- **À quoi il sert** : Analyse le calendrier complet pour extraire le planning individuel de chaque équipe.
- **Fonctionnement** :
  - Pour chaque équipe, il liste l'ordre chronologique de ses matchs (avec numéro de session, heure estimée, terrain adverse) et ses sessions d'arbitrage ou de marque.
  - Intègre les styles CSS `@media print` pour garantir une mise en page papier parfaite sans éléments d'interface inutiles lors du clic sur « Imprimer ».

---

## 5. COMMENT LES DONNÉES CIRCULENT

### 1. Où sont stockées les données ?
L'application utilise un système de stockage à quatre niveaux :
1. **La mémoire vive (RAM de React)** : Tant que l'application est ouverte, les données sont immédiatement disponibles dans le contexte `state`.
2. **Le disque dur du PC central** : Sur le réseau local, le serveur écrit dans `tournament_data.json` l'état reçu et fusionné après chaque changement envoyé par WebSocket.
3. **Le dossier des sauvegardes automatiques (`backups/`)** : Au passage à une session suivante, l'état juste avant le changement est archivé dans un fichier horodaté. Les cinq copies les plus récentes sont gardées.
4. **La mémoire interne du navigateur (`IndexedDB` et `localStorage`)** : Le navigateur conserve une copie miroir de secours. Si le serveur Node.js est coupé ou redémarré, le navigateur est capable de réinjecter instantanément les données.

### 2. Le cheminement d'une action utilisateur (Exemple : validation d'un panier sur une tablette)
```
[Tablette Terrain 1]
    │ L'utilisateur clique deux fois sur "+"
    ▼
[CourtView.tsx]
    │ Met à jour son affichage local
    │ Émet l'événement WebSocket "live_score"
    ▼
[Serveur Node.js (server.ts)]
    │ Reçoit le score en direct
    │ Le diffuse instantanément à tous les écrans connectés ("live_score_update")
    ▼
[Écran Géant TV (TVDisplay.tsx)]
    │ Le ruban défilant en bas affiche immédiatement : "T.1 : Équipe A 14 - 12 Équipe B"
```

### 3. Que se passe-t-il en cas de coupure de courant ou de panne réseau ?
- **Si le réseau Wi-Fi se déconnecte temporairement** : Les tablettes et la TV affichent le bandeau ambre du mode aperçu. Les données saisies continuent d'être mémorisées localement dans la mémoire du navigateur sans être perdues.
- **Dès que le Wi-Fi revient** : La connexion est retentée automatiquement, sans limite de tentatives. Le délai dépend du réseau. Les points et fautes locaux ne sont pas remplacés par les données de reconnexion.
- **Si le PC s'éteint brutalement** : Au redémarrage, le fichier `tournament_data.json` contient l'état de la toute dernière action enregistrée. De plus, les archives du dossier `backups/` permettent de recharger le tournoi exactement au début de n'importe quelle session passée.

---

## 6. PETIT DICTIONNAIRE DES TERMES TECHNIQUES

- **Serveur** : L'ordinateur principal (généralement le PC de l'organisateur) qui fait tourner le programme central et auquel tous les autres écrans se connectent.
- **Navigateur** : Le logiciel utilisé pour afficher les pages web (ex. : Google Chrome, Mozilla Firefox, Microsoft Edge, Apple Safari).
- **Réseau Local (LAN / Wi-Fi)** : Le réseau sans fil privé créé dans le gymnase qui relie le PC, les tablettes et la télé entre eux, sans nécessiter d'accès à Internet.
- **WebSocket (Socket.io)** : Une technologie de communication ultrarapide qui permet à deux appareils d'échanger des informations instantanément sans avoir besoin de recharger la page web.
- **Base de données (IndexedDB)** : Un espace de stockage sécurisé situé à l'intérieur même du navigateur web, capable de retenir des informations même si l'ordinateur est redémarré.
- **État (State)** : La mémoire à l'instant T de l'application (la liste des équipes, la session en cours, les scores de chaque match).
- **Composant** : Un bloc de construction de l'interface visuelle (ex. : le chronomètre est un composant, le tableau de classement en est un autre).
- **Fonction** : Une suite d'instructions dans le code qui effectue un travail précis (ex. : calculer le classement, générer les poules).
- **API (Application Programming Interface)** : Les portes d'entrée du serveur qui permettent aux pages web de lui envoyer ou de lui demander des données (ex. : la route `/save`).
- **JSON** : Le format de texte utilisé pour stocker et échanger les données du tournoi de manière lisible et universelle.
- **Cloudflare Workers** : Un service en ligne permettant d'héberger l'application sur Internet pour la rendre accessible partout dans le monde en mode démonstration.

---

## 7. POINTS À VÉRIFIER ET ÉCARTS OBSERVÉS

Cette section recense les différences identifiées entre les textes d'aide de l'application (`HelpGuide.tsx`), le comportement programmé dans le code source et ce qui reste à valider sur le terrain.

### A. Comportements présents dans le code et limites des vérifications
1. **Le calcul actuel des points en poule** : Le code applique rigoureusement 3 points pour une victoire, 2 points pour un match nul, 1 point pour une défaite et 0 point pour un forfait (confirmé dans `standingsLogic.ts`).
2. **Le conteneur TV fixe 1920×1080** : La mise à l'échelle automatique par `transform: scale` est bien active et adapte le cadre à la fenêtre ; vérifier la lisibilité sur la TV réelle (confirmé dans `TVDisplay.tsx`).
3. **La protection contre l'écrasement des scores** : Le serveur fusionne les matchs et refuse d'écraser un match terminé par un statut non terminé (confirmé dans `server.ts`).
4. **Les copies de secours** : Les changements sur le réseau local sont envoyés au serveur par WebSocket, puis enregistrés sur le disque. Le navigateur conserve en parallèle une copie locale dans `IndexedDB` (confirmé dans `TournamentContext.tsx` et `server.ts`).
5. **Le bonus féminin 3x3** : Les règles (+1 pt pour 1 femme, +2 pts pour 2 femmes ou plus) sont bien programmées et affichées en rappel visuel orange (confirmé dans `TeamManager.tsx` et `CourtView.tsx`).
6. **Sauvegarde de fin de session** : Le serveur garde l'état d'avant le changement de session dans une copie horodatée. Une file d'écriture évite que deux sauvegardes rapides se remplacent.
7. **Phases finales** : Le tableau crée la finale et la petite finale à partir des deux demi-finales. Le mode manuel prépare les tours à remplir et garde les choix séparés par catégorie.
8. **Démarrage Windows** : Le paquet contient un serveur de production séparé de l'écran. Le programme empaqueté le démarre et attend sa réponse avant d'afficher l'application.

La version du 22 octobre passe 18 tests automatiques et les commandes de préparation de l’application et du serveur. Cela ne remplace pas un essai du nouvel EXE sous Windows ni une répétition sur les appareils du gymnase.

### B. Écarts entre le guide d'aide (`HelpGuide.tsx`) et le code réel
1. **Timing des alertes sonores du chronomètre** :
   - *Dans `HelpGuide.tsx` (ligne 247)* : Le texte indique que la corne de fin retentit à **10 secondes** de la fin et que le chrono se remet à zéro **2 secondes après la fin**.
   - *Dans le code réel (`GlobalTimer.tsx`)* : Le décompte visuel dure 5 secondes, puis le sifflet est lu et le chrono démarre à la fin de sa lecture. L’alerte d’une minute est prévue à **60 secondes restantes** et la lecture du son de fin à **10 secondes restantes**. L’échéance officielle termine le match à zéro. Le chrono reste à zéro jusqu’à Start, Reset ou changement de session ; il ne revient plus automatiquement à la durée initiale après deux secondes.
2. **Export Excel des feuilles de route** :
   - *Dans `HelpGuide.tsx` (ligne 378)* : Mention d'un bouton *« Exporter (.xlsx) »*.
   - *Dans le code (`TeamRoadmaps.tsx`)* : Le code génère une impression directe et une copie pour tableur Google Sheets/Excel via le presse-papier, mais ne télécharge pas un binaire natif `.xlsx` avec macro. L'utilisateur utilise principalement l'impression navigateur ou le collage direct.
3. **Validation manuelle des terrains T.1, T.2 dans le calendrier** :
   - *Dans `HelpGuide.tsx` (ligne 226)* : Il est écrit que cliquer sur les pastilles T.1, T.2 valide manuellement le terrain.
   - *Dans le code* : Le clic bascule l'état visuel du terrain dans l'interface d'administration, mais n'envoie pas forcément l'événement `court_ready` équivalent à celui émis physiquement par la tablette terrain.

### C. Points recommandés à tester lors de la répétition générale avant le tournoi
1. **Liaison sono avec la TV** : Tester le clic sur « Activer l'affichage TV » sur l'ordinateur relié au téléviseur pour vérifier que les navigateurs autorisent la sortie audio vers la prise HDMI ou jack de la sono.
2. **Couverture Wi-Fi dans le gymnase** : S'assurer que le signal du routeur Wi-Fi atteint confortablement les tables de marque des terrains les plus éloignés.
3. **Format des fichiers audio personnalisés** : Si des MP3 personnalisés sont utilisés pour le sifflet et le buzzer, vérifier qu'ils pèsent moins de 1 Mo pour ne pas alourdir la mémoire.

---

### D. Liste de tous les fichiers du projet examinés
Tous les fichiers de code du projet ont été inspectés intégralement pour la rédaction de ce guide :
- `App.tsx`
- `server.ts`
- `main.cjs`
- `scripts/buildServer.mjs`
- `types.ts`
- `wrangler.jsonc`
- `context/TournamentContext.tsx`
- `context/reducers/categoryReducer.ts`
- `context/reducers/configReducer.ts`
- `context/reducers/finalPhaseReducer.ts`
- `context/reducers/globalReducer.ts`
- `context/reducers/poolMatchReducer.ts`
- `context/reducers/sessionReducer.ts`
- `context/reducers/sponsorReducer.ts`
- `context/reducers/teamReducer.ts`
- `utils/db.ts`
- `utils/finalPhaseLogic.ts`
- `utils/helpers.ts`
- `utils/id.ts`
- `utils/poolLogic.ts`
- `utils/scheduleLogic.ts`
- `utils/standingsLogic.ts`
- `utils/sessionSnapshot.ts`
- `hooks/useAutoFit.ts`
- `components/AlertDialog.tsx`
- `components/CategoryDialog.tsx`
- `components/CourtView.tsx`
- `components/ExportDialog.tsx`
- `components/FinalPhaseManager.tsx`
- `components/GlobalSchedule.tsx`
- `components/GlobalTimer.tsx`
- `components/HelpGuide.tsx`
- `components/LiveScores.tsx`
- `components/ManualPairingsEditor.tsx`
- `components/MatchSchedule.tsx`
- `components/MusicPlayer.tsx`
- `components/NextSessionMatches.tsx`
- `components/OfficialsManager.tsx`
- `components/PoolsDisplay.tsx`
- `components/PreviousSessionResults.tsx`
- `components/ScoreDialog.tsx`
- `components/SponsorDisplay.tsx`
- `components/SponsorManager.tsx`
- `components/StandingsDisplay.tsx`
- `components/TVBracket.tsx`
- `components/TVDisplay.tsx`
- `tests/finalPhaseLogic.test.mjs`
- `tests/serverSession.integration.test.mjs`
- `tests/sessionSnapshot.test.mjs`
- `components/TVStandings.tsx`
- `components/TVTimer.tsx`
- `components/TeamManager.tsx`
- `components/TeamRoadmapDialog.tsx`
- `components/TeamRoadmaps.tsx`
- `components/TournamentConfig.tsx`

*Aucun fichier utile n'a été ignoré ou laissé de côté.*


