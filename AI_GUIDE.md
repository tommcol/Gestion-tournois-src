# 🤖 GUIDE ARCHITECTURE & CODE POUR IA (GESTION-TOURNOIS-SRC)

> **Document destiné à toute Intelligence Artificielle (ou développeur) reprenant ou modifiant ce projet.**  
> Ce document décrit de manière exhaustive le fonctionnement du projet, son modèle de données, son architecture réseau, ses algorithmes métier et le rôle de chaque composant et fonction du code source.

---

## 1. VUE D'ENSEMBLE DU PROJET

**Gestion Tournois SRC (Tournoi Pro)** est une application web temps réel complète dédiée à l'organisation, la gestion et la diffusion de tournois sportifs (spécialement conçue pour le basketball, adaptable à d'autres sports collectifs).

### Cas d'usage multi-écrans en temps réel :
1. **Poste Central Organisateur (Admin)** : Paramétrage du tournoi, gestion des équipes, poules, planning des sessions, chrono central avec buzzer, validation des scores, gestion des phases finales et de la sonorisation.
2. **Tablettes Terrains (`CourtView`)** : Disposées sur chaque terrain à la table de marque (`?mode=court&court=X`). Permet de marquer les points en direct (+1, +2, +3), déclarer un forfait, signaler que les équipes sont prêtes, et synchroniser le score en direct.
3. **Écran Géant TV (`TVDisplay`)** : Affiché en plein écran (`?mode=tv`). Résolution fixe vectorielle 1920×1080 redimensionnée automatiquement par mise à l'échelle CSS (`transform: scale(...)`). Alterne en boucle automatique : prochains matchs, résultats de la session précédente, classements des poules, phases finales et logos des sponsors partenaires, avec pied de page affichant le chronomètre officiel et le ruban défilant des scores en direct.
4. **Diffusion Sonore & Musique** : Déclenchement automatique des sons d'ambiance (coup de sifflet début, alerte 1 minute, corne/buzzer de fin) et commandes musicales synchronisées.

---

## 2. MODES D'EXÉCUTION (DUAL-MODE)

L'application a été conçue pour fonctionner de deux façons complémentaires :

### Mode A : Réseau Local (Production en gymnase)
- **Serveur** : Node.js + Express + Socket.io exécuté sur un PC central via `server.ts` (port 3000).
- **Communication** : WebSockets bidirectionnels temps réel entre le PC admin, les tablettes de terrain et les écrans TV connectés au même réseau Wi-Fi local.
- **Persistance** : Fichier disque `tournament_data.json` mis à jour via `POST /save` + snapshots automatiques dans le dossier `backups/` à chaque changement de session.

### Mode B : Mode Aperçu Autonome (Web / Cloudflare Workers / Hors-ligne)
- **Déploiement** : Single Page Application statique compatible Cloudflare Workers (`wrangler.jsonc`, dossier `dist/`).
- **Détection automatique** : Si aucun serveur Socket.io n'est joignable sous 1,2 seconde (ou erreur de connexion), l'application bascule automatiquement en `isPreviewMode = true`.
- **Persistance** : Stockage local dans le navigateur (`localStorage` avec clé `tournament_preview_state` et `IndexedDB` via `utils/db.ts`).
- **Affichage** : Un bandeau discret et clair informe l'utilisateur :  
  *« Mode aperçu : données sur ce navigateur uniquement ; tablettes et TV non synchronisées »*.
- **Transition transparente** : Dès qu'un serveur local redevient accessible, l'application se reconnecte et quitte le mode aperçu.

---

## 3. MODÈLE DE DONNÉES (`types.ts`)

### `TournamentState` (État global)
```typescript
export interface TournamentState {
  tournamentName: string;            // Nom du tournoi (ex: "Tournoi des As SRC")
  numberOfCourts: number;            // Nombre total de terrains actifs (ex: 4)
  timerDuration: number;             // Durée d'un match en secondes (ex: 600s = 10min)
  breakDuration: number;             // Durée de la pause entre sessions (en secondes)
  matchDisplayDuration: number;      // Temps d'affichage par page sur la TV (secondes)
  sponsorDisplayDuration: number;    // Temps d'affichage d'un sponsor sur la TV (secondes)
  categories: Category[];            // Liste des catégories (ex: U13M, Seniors, Loisirs)
  teams: Team[];                     // Liste de toutes les équipes engagées
  matches: Match[];                  // Matchs de poules générés
  pools: Pool[];                     // Poules réparties
  finalMatches: { [categoryId: string]: FinalMatch[] }; // Arbres de phases finales par catégorie
  sponsors: Sponsor[];               // Partenaires et sponsors avec logos
  standings: { [poolId: string]: Standing[] }; // Classements calculés
  currentSession: number;            // Numéro de la session de jeu active (1, 2, 3...)
  soundConfig: CustomSoundConfig;    // Fichiers audio personnalisés (début, fin, 1min)
  tvConfig: TVConfig;                // Options d'affichage TV (cases à cocher)
  playlist: Track[];                 // Morceaux de musique MP3/Web
  isPoolStageFinished: boolean;      // True si la phase de poule est close
  isFinalPhase: boolean;             // True si on joue les phases finales
  isTournamentStarted: boolean;      // True si le tournoi a démarré
  enableCourtView: boolean;          // Activation/désactivation de la saisie tablette
}
```

### Autres structures clés :
- **`Category`** : Nom, couleur UI, arbitre/marqueur obligatoires, terrains réservés, configuration de phase finale, type de tournoi (`traditional` ou `swiss`), aller-retour (`isDoubleRoundRobin`).
- **`Team`** & **`Player`** : Équipe avec identifiant, nom, catégorie, poule, joueur(s), mixité, quotas femmes.
- **`Match`** : Identifiant, `team1Id`, `team2Id`, scores, statut (`pending` | `finished`), terrain assigné (`court`), session (`sessionNumber`), `refereeId`, `scorerId`, forfait éventuel (`isForfeit`).
- **`FinalMatch`** : Idem `Match` avec round (`roundOf32`, `roundOf16`, `quarterFinal`, `semiFinal`, `final`, `thirdPlace`), liens d'arborescence (`sourceMatch1`, `sourceMatch2`), `isReady` pour tablette.
- **`Standing`** : Statistiques d'équipe dans une poule (joués, victoires=3pts, nuls=2pts, défaites=1pt, forfait=0pt, points marqués, encaissés, différence, confrontations directes).

---

## 4. ARCHITECTURE BACKEND (`server.ts`)

Le fichier `server.ts` démarre un serveur HTTP Node avec Express et Socket.io sur le port 3000.

### Routes HTTP :
- `POST /save` : Reçoit le `TournamentState` complet au format JSON et l'écrit de manière synchrone/asynchrone dans `tournament_data.json`.
- `POST /api/upload` : Réception de fichiers bruts (logos sponsors, sons, musiques), sauvegarde dans `public/uploads/` avec préfixe timestamp et renvoie l'URL `/uploads/...`.
- `GET /uploads/*` : Distribution des fichiers statiques téléversés.
- En développement : monte les middlewares de Vite (`vite.middlewares`).
- En production : sert les fichiers compilés du dossier `dist/`.

### Événements Socket.io (`io`) :
| Événement Socket | Direction | Description |
|---|---|---|
| `connection` | Client -> Serveur | Envoie l'état courant `state_update`, les scores en direct actifs et les statuts des terrains prêts. |
| `update_state` | Client -> Serveur -> Tous | Reçoit une mise à jour d'état, fusionne intelligemment les matchs (ne réinitialise jamais un match déjà `finished`), crée un snapshot si la session avance, et diffuse `state_update` aux autres clients. |
| `court_ready` / `court_ready_cancel` | Tablette -> Serveur -> Tous | Signale qu'un terrain est prêt à démarrer (équipes présentes à la table). Diffuse `court_ready_update`. |
| `live_score` | Tablette -> Serveur -> Tous | Envoie le score d'un match en temps réel (+1 point, etc.). Diffuse `live_score_update` instantanément pour la TV et l'admin. |
| `timer_start` | Admin -> Serveur -> Tous | Déclenche le chrono simultanément sur tous les écrans et tablettes. |
| `play_audio` | Admin -> Serveur -> Tous | Transmet l'ordre de jouer un effet sonore (sifflet, buzzer) via `audio_event`. |
| `music_command` | Admin -> Serveur -> Tous | Ordres de lecture/pause/changement de piste musicale (`music_sync`). |
| `courts_reset` | Serveur -> Tous | Réinitialise l'état "prêt" des terrains au passage à la session suivante. |

### Sauvegarde et Snapshots automatiques :
- Fonction `saveSnapshot(state, sessionNum)` : Crée un fichier `backups/tournament_data_session_{sessionNum}.json`.
- Fonction `cleanupSnapshots()` : Conserve automatiquement les 5 derniers snapshots pour éviter de saturer le disque.

---

## 5. GESTION D'ÉTAT FRONTEND (`context/`)

### `TournamentContext.tsx`
C'est le cœur réactif de l'application React :
- **`useTournament()`** : Hook fournissant `{ state, dispatch, emitAudioEvent, emitMusicCommand, isLoaded, isPreviewMode, socket }`.
- **Gestionnaire de connexion Socket.io** : Écoute `state_update`, `live_score_update`, `court_ready_update`, `audio_event`, `music_sync`.
- **Fallback Mode Aperçu** : Timeout de 1200ms et écouteur `connect_error`. Si le serveur n'est pas là, charge depuis `localStorage` (`tournament_preview_state`) ou `IndexedDB`, ou initialData.
- **Synchronisation locale automatique** : Sauvegarde dans `localStorage` et `IndexedDB` à chaque modification d'état pour une résilience totale en cas de coupure de courant ou de rafraîchissement.

### Réducteurs (`context/reducers/`)
Le réducteur racine `tournamentReducer` dispatche chaque action vers son module spécialisé :
1. **`categoryReducer.ts`** :
   - `ADD_CATEGORY`, `UPDATE_CATEGORY`, `DELETE_CATEGORY` : Gère le cycle de vie des catégories et supprime en cascade les équipes et matchs rattachés.
2. **`teamReducer.ts`** :
   - `ADD_TEAM`, `UPDATE_TEAM`, `DELETE_TEAM` : Ajout, modification et retrait des équipes. Met à jour les poules si assignées.
3. **`poolMatchReducer.ts`** :
   - `GENERATE_CATEGORY_POOLS_AND_MATCHES` : Appelle `generatePools`, `generateMatchesForPools` ou `generateSwissMatches`, puis régénère le planning global `generateSchedule`.
   - `RESET_CATEGORY_POOLS` : Nettoie les matchs et poules d'une catégorie.
   - `UPDATE_MATCH_SCORE` : Enregistre le score final d'un match de poule, gère les forfaits, recalcule immédiatement les classements de la poule (`calculatePoolStandings`) et vérifie si la phase de poule est terminée.
4. **`finalPhaseReducer.ts`** :
   - `GENERATE_FINAL_PHASE` : Génère le tableau éliminatoire (1/16, 1/8, 1/4, 1/2, finale, petite finale) selon les équipes qualifiées.
   - `UPDATE_FINAL_MATCH_SCORE` : Valide le score d'un match de tableau et qualifie automatiquement le vainqueur au match du tour suivant via `updateBracketProgression`.
   - `UPDATE_FINAL_MATCH_COURT` & `SET_FINAL_MATCH_READY` : Assignation d'un terrain et état prêt pour la tablette.
   - `UPDATE_MANUAL_PAIRINGS` : Permet à l'organisateur d'ajuster manuellement les confrontations de phase finale.
5. **`sessionReducer.ts`** :
   - `NEXT_SESSION` : Incrémente `currentSession`, archive l'état.
   - `PREVIOUS_SESSION` : Recule d'une session.
   - `RESET_SESSIONS` : Remet à 1.
   - `START_TOURNAMENT` : Passe `isTournamentStarted = true`.
   - `FINISH_POOL_STAGE` : Bascule vers les phases finales.
6. **`configReducer.ts`** :
   - `UPDATE_CONFIG` : Met à jour les terrains, durées des matchs, durées de pause, paramètres TV.
   - `UPDATE_SOUND_CONFIG` : Personnalisation des fichiers audios.
7. **`sponsorReducer.ts`** :
   - `ADD_SPONSOR`, `UPDATE_SPONSOR`, `DELETE_SPONSOR` : Gestion des sponsors et de leurs logos Base64.
8. **`globalReducer.ts`** :
   - `SET_STATE` : Remplacement complet de l'état (lors de la réception d'un événement serveur ou chargement de sauvegarde).
   - `CLEAR_DATA` / `RESET_TOURNAMENT` : Remise à zéro totale du tournoi.

---

## 6. LOGIQUE MÉTIER & ALGORITHMES (`utils/`)

### `utils/poolLogic.ts`
- **`generatePools(teams, teamsPerPool, categoryId)`** : Mélange aléatoirement les équipes d'une catégorie et les découpe en poules équilibrées (`poolId: ${categoryId}-pool-${i+1}`).
- **`generateMatchesForPools(pools, allTeams)`** : Génère toutes les confrontations directes possibles (Round-Robin simple : chaque équipe affronte toutes les autres de sa poule).
- **`generateSwissMatches(teams, matchCount, poolId)`** : Génération de rondes selon l'algorithme du cercle (Circle Method / Système Suisse).
- **`generateDoubleRoundRobinMatches(pools, allTeams)`** : Génère les matchs aller et retour.

### `utils/scheduleLogic.ts` (Planification des sessions et terrains)
- **`generateSchedule(matchesToSchedule, allTeams, numberOfCourts, categories)`** :
  - Calcule le nombre estimé de sessions nécessaires.
  - Répartit les matchs sur les terrains de 1 à `numberOfCourts` pour chaque session.
  - **Gestion de la fatigue / Repos** : Maximise le temps de repos entre deux matchs pour une même équipe (`idealIntervals`, `lastSessionPlayed`). Évite absolument qu'une équipe joue deux sessions consécutives si possible.
  - **Réservation de terrains** : Respecte les terrains réservés par catégorie (`reservedCourtIds`).
  - **Assignation automatique des officiels (`assignOfficials`)** : Assigne automatiquement des équipes au repos pour faire l'arbitre (`refereeId`) et le marqueur (`scorerId`), en s'assurant qu'une équipe n'arbitre jamais pendant qu'elle joue ou juste avant de jouer.

### `utils/standingsLogic.ts` (Calcul des classements)
- **`calculatePoolStandings(pool, matches)`** :
  - Victoire = **3 points**
  - Match Nul = **2 points**
  - Défaite = **1 point** (règle officielle basket : encourage à jouer)
  - Forfait = **0 point** pour l'équipe forfait, **3 points** pour l'adversaire (score conventionnel 20-0).
  - **Départage strict en cas d'égalité** :
    1. Points de classement au tournoi.
    2. Confrontation directe entre les équipes à égalité.
    3. Différence de points globale (`pointsDifference`).
    4. Meilleure attaque (`pointsFor`).

### `utils/finalPhaseLogic.ts` (Arbre éliminatoire)
- **`createEmptyPairings(totalTeams, categoryId)`** : Crée les matchs initiaux vides (4 équipes -> demi-finales, 8 -> quarts, 16 -> 8èmes, 32 -> 16èmes).
- **`generateBracket(initialRoundMatches, categoryId)`** : Construit l'arbre complet avec les liaisons parents/enfants (`sourceMatch1`, `sourceMatch2`) et le match pour la 3ème place (petite finale).
- **`updateBracketProgression(matches, finishedMatch)`** : Quand un match se termine, trouve le match suivant dépendant et injecte l'identifiant du vainqueur dans `team1Id` ou `team2Id`.

### `utils/db.ts`
- Encapsule l'API `IndexedDB` du navigateur via la bibliothèque `idb` pour stocker l'état `TournamentState` de manière robuste et asynchrone (`saveTournamentState`, `loadTournamentState`, `clearTournamentState`).

---

## 7. COMPOSANTS ET VUES (`components/` et `App.tsx`)

### Point d'entrée : `App.tsx`
- Inspecte l'URL :
  - Si `?mode=tv` -> rend `<TVDisplay />`.
  - Si `?mode=court&court=X` -> rend `<CourtView courtNumber={X} />`.
  - Sinon -> rend l'interface Organisateur / Administration avec barre de navigation.
- Affiche le bandeau d'alerte jaune/ambre si `isPreviewMode` est actif.
- Initialise les écouteurs globaux pour les bruitages et alertes audio.

### Affichage Écran TV : `components/TVDisplay.tsx`
- **Résolution 1080p native** : Utilise un conteneur rigide de 1920×1080 px avec `transform: scale(scale)` calculé en fonction de la fenêtre réelle. Cela garantit un rendu typographique parfait sans débordement sur n'importe quel écran ou TV (720p, 1080p, 4K, 16:9).
- **Boucle d'affichage automatique** : Fait défiler successivement selon les options activées :
  1. Prochains matchs (`NextSessionMatches.tsx`).
  2. Résultats précédents (`PreviousSessionResults.tsx`).
  3. Classements des poules (`TVStandings.tsx`).
  4. Phases finales (`TVBracket.tsx`).
  5. Écrans partenaires (`SponsorDisplay.tsx`).
- **Footer TV (108px)** :
  - Chronomètre officiel haute lisibilité (`TVTimer.tsx`).
  - Marquee défilant en temps réel (`liveScores`) affichant les scores instantanés de tous les terrains en cours de jeu.
  - Indicateur de session ou de phase finale.
- **Gestion audio TV** : Détecte les politiques d'autoplay des navigateurs avec un écran initial « Démarrer l'affichage TV » pour débloquer l'audio.

### Saisie Tablettes : `components/CourtView.tsx`
- Interface simplifiée et robuste optimisée pour tablettes tactiles posées à la table de marque.
- Sélection du match assigné au terrain.
- Boutons larges de score (+1, +2, +3, -1) pour chaque équipe.
- Gestion des fautes d'équipe et temps-morts.
- Émission en direct des scores (`live_score`) vers le serveur pour affichage immédiat sur la TV.
- Déclaration de forfait et validation définitive du match.
- Bouton « Équipes prêtes » pour notifier l'organisateur central que le terrain peut démarrer.

### Chronomètre & Régie : `components/GlobalTimer.tsx` & `components/SessionManager.tsx`
- Gestion du temps de jeu : Start, Pause, Reset.
- Alertes sonores synchronisées :
  - Coup de sifflet au coup d'envoi.
  - Son d'avertissement à 1 minute de la fin.
  - Corne de brume / Buzzer officiel au coup de sifflet final (temps = 0).
- Passage à la session suivante en un clic avec enregistrement de sauvegarde.

### Gestion des Matchs et Poules :
- `PoolsDisplay.tsx` : Vue en colonnes des poules et de leurs équipes.
- `StandingsDisplay.tsx` : Tableaux des classements avec victoires, nuls, défaites, goal-average et points.
- `GlobalSchedule.tsx` & `MatchSchedule.tsx` : Grille complète des matchs par session et terrain avec filtres par catégorie et terrain.
- `ScoreDialog.tsx` : Fenêtre modale de saisie/modification manuelle des scores par l'organisateur.

### Phases Finales :
- `FinalPhaseManager.tsx` : Sélection du nombre de qualifiés par poule, génération automatique ou manuelle des confrontations, visualisation interactive des tableaux.
- `ManualPairingsEditor.tsx` : Interface drag-and-drop / select pour ajuster les duels de phase finale.

### Administration & Utilitaires :
- `TournamentConfig.tsx` : Configuration générale (nom, nombre de terrains, durées, paramètres TV).
- `TeamManager.tsx` : Ajout/import d'équipes, gestion des catégories et des compositions.
- `OfficialsManager.tsx` : Attribution et contrôle des arbitres et marqueurs.
- `SponsorManager.tsx` : Téléversement et gestion des logos partenaires pour la TV.
- `MusicPlayer.tsx` : Lecteur musical intégré pour animer le gymnase entre les matchs.
- `ExportDialog.tsx` : Sauvegarde sous forme de fichier JSON exportable et restauration de sauvegardes précédentes.

---

## 8. CONSIGNES IMPORTANTES POUR TOUTE MODIFICATION FUTURE PAR UNE IA

1. **Ne pas casser le Dual-Mode** :
   - Toute modification de la communication doit préserver à la fois le fonctionnement réseau local WebSocket (`server.ts`) et le repli automatique en mode aperçu (`localStorage` / `IndexedDB`).
2. **Ne pas modifier la résolution TV** :
   - L'écran TV (`components/TVDisplay.tsx`) repose sur le conteneur `1920x1080` scalé. Ne pas réintroduire d'unités `vh` ou `vw` aléatoires qui casseraient l'alignement sur les téléviseurs.
3. **Préserver les règles de calcul des points** :
   - En basketball : Victoire = 3, Nul = 2, Défaite = 1, Forfait = 0 (avec bonus de 3 points à l'adversaire).
4. **Validation obligatoire après modifications** :
   - Toujours exécuter `npm run build` pour vérifier la compilation TypeScript (`tsc`) et le packaging Vite.
   - Toujours exécuter `npx wrangler deploy --dry-run` pour garantir que l'application reste publiable sans erreur sur Cloudflare Workers.
5. **Gestion des paquets** :
   - Le projet utilise `npm` avec `package.json` et `package-lock.json`. Ne pas utiliser ou créer de `bun.lock`.

---

## 9. HISTORIQUE, RAISONS D'ÊTRE ET OBJECTIFS : LE « POURQUOI » DE CHAQUE CHOIX TECHNIQUE

Voici l'explication précise de chaque brique mise en place, des problèmes réels rencontrés et du but visé :

### 1. Pourquoi le conteneur TV fixe 1920×1080 avec `transform: scale()` ?
- **Problème résolu** : Dans un gymnase, les téléviseurs, vidéoprojecteurs et écrans d'affichage ont des résolutions très hétérogènes (720p, 1080p, 4K, ratio 16:9 ou parfois 16:10). Avec du CSS responsive classique (`vh`, `vw`, flexbox fluide), le texte débordait, les colonnes se chevauchaient ou le chronomètre et les sponsors étaient tronqués.
- **But recherché** : Fixer un canevas vectoriel invariant de 1920×1080 pixels et appliquer un calcul mathématique de redimensionnement (`Math.min(windowWidth / 1920, windowHeight / 1080)`). Résultat : la TV a exactement le même rendu parfait, net et prévisible sur n'importe quel écran du monde sans aucun débordement.

### 2. Pourquoi le « Mode Aperçu Autonome » vs « Réseau Local » ?
- **Problème résolu** : Initialement, l'application dépendait entièrement du serveur Node local (`server.ts`). Lorsque l'application était déployée sur le Web (Cloudflare Workers, GitHub Pages, aperçu distant), aucun serveur Node/Socket.io n'était joignable. L'application se bloquait sur un écran blanc ou affichait des boîtes de dialogue intempestives `alert('Le serveur ne répond pas')`.
- **But recherché** : Permettre à l'application d'être testée et utilisée en autonomie n'importe où (mode Web, démonstration, Cloudflare) grâce à `localStorage` et `IndexedDB`, tout en conservant automatiquement la puissance de la synchronisation réseau local (WebSockets) dès que le PC du gymnase est allumé.

### 3. Pourquoi le bandeau ambre d'avertissement en Mode Aperçu ?
- **Problème résolu** : Sans ce bandeau, un utilisateur testant l'application en ligne sur deux navigateurs différents ne comprenait pas pourquoi les scores saisis sur un appareil n'apparaissaient pas sur l'autre appareil.
- **But recherché** : Donner une transparence totale et immédiate à l'utilisateur :  
  *« Mode aperçu : données sur ce navigateur uniquement ; tablettes et TV non synchronisées »*. L'utilisateur sait ainsi immédiatement qu'il teste la version autonome et que pour synchroniser plusieurs appareils, il suffit d'être sur le réseau local avec le serveur lancé.

### 4. Pourquoi la configuration Cloudflare Workers `wrangler.jsonc` ?
- **Problème résolu** : Permettre d'héberger l'interface web sur le réseau CDN mondial ultra-rapide de Cloudflare sans avoir à configurer de serveur web complexe.
- **But recherché** : Avec `"directory": "./dist"` et `"not_found_handling": "single-page-application"`, n'importe quelle URL de l'application (ex: `/`, `/index.html?mode=tv`, `?mode=court`) est servie instantanément avec des temps de réponse sous les 50ms et zéro maintenance serveur pour la partie web statique.

### 5. Pourquoi la suppression de `bun.lock` et le maintien strict de `package-lock.json` ?
- **Problème résolu** : La présence concurrente de plusieurs gestionnaires de paquets (`bun` et `npm`) créait des désynchronisations dans les dépendances, des avertissements et des échecs de compilation dans les outils de build automatisés.
- **But recherché** : Standardiser sur `npm` et son fichier de verrouillage déterministe `package-lock.json`, validé par la commande `npm ci`, pour garantir que n'importe quelle machine ou pipeline CI compilera exactement les mêmes versions de bibliothèques sans surprise.

### 6. Pourquoi la fusion intelligente des matchs côté serveur (`server.ts`) ?
- **Problème résolu** : En tournoi avec 4 ou 8 terrains en simultané, chaque table de marque valide son match sur sa tablette. Si un client envoyait un état complet plus ancien ou si l'admin modifiait un paramètre au même moment, les scores validés sur le terrain risquaient d'être écrasés et remis à zéro (`status: pending`).
- **But recherché** : Le serveur inspecte chaque match reçu. Si un match est déjà au statut `finished` côté serveur, il est protégé et conservé. Aucune perte de score n'est possible, même lors de soumissions concurrentes.

### 7. Pourquoi la sauvegarde automatique avec rotation des 5 derniers snapshots ?
- **Problème résolu** : Le risque majeur d'un tournoi bénévole est la coupure de courant générale du gymnase, le débranchement accidentel du PC ou la fermeture inopinée du navigateur.
- **But recherché** : À chaque incrémentation de session, le serveur écrit un fichier `backups/tournament_data_session_X.json`. En cas d'incident, l'organisateur peut recharger le fichier exact de la session précédente en 2 clics. La rotation automatique sur 5 fichiers évite de saturer le disque dur du PC avec des centaines de mégaoctets de données superflues.

### 8. Pourquoi le ruban défilant (Marquee) des scores en direct sur la TV ?
- **Problème résolu** : L'écran TV tourne en boucle (matchs suivants, résultats, classements, sponsors). Si un spectateur ou un coach voulait savoir le score du Terrain 2 pendant le match, il devait attendre que la TV boucle sur la bonne page, ce qui prenait parfois plusieurs minutes.
- **But recherché** : Afficher en permanence au bas de la TV un bandeau défilant qui retransmet en direct seconde par seconde l'évolution des points marqués sur les tablettes. Tout le gymnase reste informé en temps réel sans interrompre le cycle des affichages.

### 9. Pourquoi le bouton « Équipes prêtes » sur les tablettes de terrain ?
- **Problème résolu** : Le speaker / organisateur central au micro ne savait jamais si tous les terrains avaient bien leurs joueurs et arbitres prêts avant de lancer le chronomètre officiel. Souvent, le chrono partait alors qu'un terrain cherchait encore son ballon ou ses remplaçants.
- **But recherché** : Chaque table de marque clique sur « Prêt » sur sa tablette quand les deux équipes sont sur le terrain. L'écran organisateur affiche des voyants verts pour chaque terrain prêt. Dès que tous les voyants sont au vert, l'organisateur peut lancer le chrono central en toute sérénité.

### 10. Pourquoi l'automatisation des arbitres et marqueurs (`assignOfficials`) ?
- **Problème résolu** : Trouver des arbitres et des officiels de table de marque est la tâche la plus complexe et source de tensions dans les tournois sportifs associatifs.
- **But recherché** : Un algorithme intelligent prend les équipes qui ne jouent pas lors de la session courante (équipes au repos) et leur attribue automatiquement l'arbitrage ou la table de marque sur un terrain précis, en veillant à ce qu'une équipe n'enchaîne pas deux arbitrages d'affilée et ne soit pas mobilisée juste avant un de ses propres matchs.

### 11. Pourquoi le déverrouillage audio interactif sur la TV ?
- **Problème résolu** : Les navigateurs web (Chrome, Edge, Firefox, Safari) interdisent par défaut la lecture automatique de sons (autoplay) si l'utilisateur n'a pas cliqué sur la page. Sans cela, le buzzer de fin de match et les sifflets ne sonnaient pas sur la sono du gymnase branchée à la TV.
- **But recherché** : Afficher un grand bouton élégant « Activer l'affichage et la sonorisation TV » au premier chargement. Un simple clic déverrouille l'AudioContext du navigateur, garantissant que tous les signaux sonores (sifflet, 1 minute, sirène de fin) retentiront à plein volume sans blocage.

