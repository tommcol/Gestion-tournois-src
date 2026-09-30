# 📖 GUIDE COMPLET DE L'APPLICATION — GESTION TOURNOIS SRC (TOURNAMENT MANAGER PRO)

> **Ce guide est le document de référence absolu pour comprendre, utiliser, maintenir ou faire évoluer l'application.**  
> Il s'adresse aux organisateurs de tournois, aux bénévoles sans compétences informatiques, ainsi qu'à tout développeur ou Intelligence Artificielle prenant en charge le code.  
> Tout est expliqué en français courant avec des mots simples. Chaque terme technique est défini immédiatement.

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
   - À 0 seconde, la corne de brume officielle (buzzer) retentit sur la sono.
3. **Saisie et validation des scores sur l'Admin** :
   - Sur la ligne de chaque match de la session active, l'organisateur peut ajuster le score avec les boutons `+` et `-`.
   - Cliquer sur le bouton vert **« ✓ Valider »**.
   - Le match passe au statut *Terminé* (badge vert).
   - En cas d'erreur, cliquer sur **« ✏️ Modifier »** pour corriger les points ou déclarer un **Forfait** (l'équipe absente reçoit 0 point au classement, l'adversaire reçoit 3 points de victoire avec un score officiel de 20-0).
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
   - Pendant le match, le marqueur utilise les gros boutons tactiles `+1`, `+2`, `+3` pour ajouter les points au fur et à mesure. Chaque point est envoyé instantanément sur le bandeau défilant de la TV.
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
  - *Bouton « Démarrer » (vert)* : Lance le décompte sonore de 5 secondes puis démarre le chrono.
  - *Bouton « Pause » (orange)* : Met le chronomètre en pause sans réinitialiser le temps.
  - *Bouton « Réinitialiser » (gris)* : Remet le chronomètre à la durée configurée pour la session.

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
  - Boutons de marque : `+1`, `+2`, `+3`, `-1`.
  - Boutons de fautes : `+ Faute`, `- Faute` avec compteur dynamique (vert / orange / rouge).
  - Bouton `Temps-mort`.
- **Bouton rouge « Déclarer forfait »** : Ouvre la confirmation de forfait pour l'équipe qui ne s'est pas présentée.
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
  - Envoie un signal réseau `live_score` à chaque clic sur `+1`, `+2`, `+3` pour répercuter le score en direct sur la TV.
  - Gère les boutons de fautes d'équipe avec avertissement visuel orange à 7 fautes et rouge à 10 fautes.
  - Lors du clic sur « Envoyer le score », il transmet `UPDATE_MATCH_SCORE` et libère le terrain pour la session suivante.

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
    │ L'utilisateur clique sur "+2 points"
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
- **Dès que le Wi-Fi revient** : La connexion WebSocket se rétablit automatiquement sous 1 seconde et synchronise les états.
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

### A. Ce qui est confirmé et pleinement opérationnel dans le code
1. **La règle officielle des points en poule** : Le code applique rigoureusement 3 points pour une victoire, 2 points pour un match nul, 1 point pour une défaite et 0 point pour un forfait (confirmé dans `standingsLogic.ts`).
2. **Le conteneur TV fixe 1920×1080** : La mise à l'échelle automatique par `transform: scale` est bien active et garantit un affichage sans débordement (confirmé dans `TVDisplay.tsx`).
3. **La protection contre l'écrasement des scores** : Le serveur fusionne les matchs et refuse d'écraser un match terminé par un statut non terminé (confirmé dans `server.ts`).
4. **Les copies de secours** : Les changements sur le réseau local sont envoyés au serveur par WebSocket, puis enregistrés sur le disque. Le navigateur conserve en parallèle une copie locale dans `IndexedDB` (confirmé dans `TournamentContext.tsx` et `server.ts`).
5. **Le bonus féminin 3x3** : Les règles (+1 pt pour 1 femme, +2 pts pour 2 femmes ou plus) sont bien programmées et affichées en rappel visuel orange (confirmé dans `TeamManager.tsx` et `CourtView.tsx`).
6. **Sauvegarde de fin de session** : Le serveur garde l'état d'avant le changement de session dans une copie horodatée. Une file d'écriture évite que deux sauvegardes rapides se remplacent.
7. **Phases finales** : Le tableau crée la finale et la petite finale à partir des deux demi-finales. Le mode manuel prépare les tours à remplir et garde les choix séparés par catégorie.
8. **Démarrage Windows** : Le paquet contient un serveur de production séparé de l'écran. Le programme empaqueté le démarre et attend sa réponse avant d'afficher l'application.

Ces trois points ont des tests automatiques. La compilation et l'essai du serveur empaqueté ont également été vérifiés sur la version de travail.

### B. Écarts entre le guide d'aide (`HelpGuide.tsx`) et le code réel
1. **Timing des alertes sonores du chronomètre** :
   - *Dans `HelpGuide.tsx` (ligne 247)* : Le texte indique que la corne de fin retentit à **10 secondes** de la fin et que le chrono se remet à zéro **2 secondes après la fin**.
   - *Dans le code réel (`GlobalTimer.tsx`)* : Le sifflet de départ retentit à 0s après le décompte 5-4-3-2-1, l'alerte retentit à **60 secondes restantes** (1 minute), et la corne de brume de fin retentit exactement à **0 seconde** (fin du match). Il n'y a pas de corne à 10 secondes dans le code.
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
