import React, { useState } from 'react';

// ─── Composants UI ───────────────────────────────────────────────────────────

const Badge: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${color}`}>
        {children}
    </span>
);

const Tip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-3">
        <span className="text-blue-500 text-lg flex-shrink-0">💡</span>
        <p className="text-sm text-blue-700 dark:text-blue-300">{children}</p>
    </div>
);

const Warning: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3">
        <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
        <p className="text-sm text-amber-700 dark:text-amber-300">{children}</p>
    </div>
);

const Step: React.FC<{ n: number; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
    <div className="flex gap-4 mb-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm">{n}</div>
        <div className="flex-1">
            <div className="font-bold text-gray-800 dark:text-gray-100 mb-1">{title}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{children}</div>
        </div>
    </div>
);

const Table: React.FC<{ headers: string[]; rows: (string | React.ReactNode)[][] }> = ({ headers, rows }) => (
    <div className="overflow-x-auto mt-3 rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
            <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                    {headers.map((h, i) => (
                        <th key={i} className="px-4 py-2 text-left font-bold text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                        {row.map((cell, j) => (
                            <td key={j} className="px-4 py-2 text-gray-700 dark:text-gray-300">{cell}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const Section: React.FC<{
    icon: string;
    title: string;
    subtitle?: string;
    badge?: { text: string; color: string };
    defaultOpen?: boolean;
    children: React.ReactNode;
}> = ({ icon, title, subtitle, badge, defaultOpen = false, children }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
                <span className="text-2xl">{icon}</span>
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 dark:text-white text-base">{title}</span>
                        {badge && <Badge color={badge.color}>{badge.text}</Badge>}
                    </div>
                    {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
                </div>
                <span className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {open && (
                <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-gray-700">
                    {children}
                </div>
            )}
        </div>
    );
};

// ─── Composant principal ─────────────────────────────────────────────────────

const HelpGuide: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">🏀 Guide d'utilisation</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Tournament Manager Pro — Gestion complète de tournois 3x3 Basketball</p>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        🔄 <strong>Workflow recommandé :</strong> Configuration → Équipes → Organisation → Calendrier (jour J) → Phase Finale → Résultats
                    </p>
                </div>
            </div>

            <Section icon="⚙️" title="Configuration du tournoi" subtitle="Tout regroupé en 3 sections claires" defaultOpen={true}>
                <div className="space-y-5">
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1">🏗️ Section 1 — Informations générales</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Ouverte par défaut. À configurer en premier.</p>
                        <Table
                            headers={['Paramètre', 'Description', 'Contrainte']}
                            rows={[
                                ['Nom du tournoi', 'Affiché sur l\'écran TV en attente', 'Obligatoire'],
                                ['Nombre de terrains', 'Terrains disponibles le jour J', 'Min. 1'],
                                ['Durée du match', 'En minutes — durée du chrono principal', 'Min. 1 min'],
                                ['Durée de pause', 'Entre deux sessions (peut être 0)', 'Min. 0'],
                            ]}
                        />
                        <Tip>Le bouton Sauvegarder est dans cette section. Un seul clic sauvegarde tous les paramètres généraux.</Tip>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1">🏷️ Section 2 — Catégories & Terrains</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Ouverte par défaut. Créez vos divisions ici.</p>
                        <Table
                            headers={['Option', 'Effet']}
                            rows={[
                                ['Couleur', 'Identifie visuellement la catégorie dans toute l\'app et sur la TV'],
                                ['Terrains réservés', 'Exclusifs à cette catégorie pendant les poules — libérés automatiquement après'],
                                ['Arbitre obligatoire', 'Affiche la colonne arbitre dans feuilles de route et TV'],
                                ['Marqueur obligatoire', 'Affiche la colonne marqueur dans feuilles de route et TV'],
                                ['Type de tournoi', 'Traditionnel (poules A/B/C) ou Suisse (classement unique)'],
                                ['Saisie détaillée', 'Nom/prénom/genre par joueur — calcule le bonus féminin automatiquement'],
                            ]}
                        />
                        <Tip>Les terrains réservés s'affichent ici en même temps que le nombre de terrains configuré au-dessus — vous voyez immédiatement si la configuration est cohérente.</Tip>
                        <Warning>Les terrains réservés sont libérés automatiquement quand tous les matchs de poule de la catégorie sont planifiés.</Warning>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1">⚙️ Section 3 — Paramètres avancés</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Fermée par défaut — 4 sous-sections.</p>
                        <Table
                            headers={['Sous-section', 'Contenu']}
                            rows={[
                                ['📺 Affichage TV', 'Durées des slides, activer/désactiver chaque slide du cycle'],
                                ['🔔 Sons', 'Import MP3/WAV : sifflet départ, alerte 1 min, corne de fin (max 1Mo)'],
                                ['🏢 Sponsors', 'Ajout et suppression des logos partenaires affichés sur la TV'],
                                ['📱 Tablettes terrain', 'Activation + liens d\'accès par terrain générés automatiquement'],
                            ]}
                        />
                    </div>
                </div>
            </Section>

            <Section icon="👥" title="Gestion des équipes" subtitle="Saisie avant le tournoi ou le jour même">
                <div className="space-y-4">
                    <Table
                        headers={['Mode', 'Informations saisies', 'Bonus féminin']}
                        rows={[
                            ['Simplifié', 'Nom d\'équipe + nombre de joueuses', 'Saisi manuellement'],
                            ['Détaillé', 'Nom, prénom, genre de chaque joueur', 'Calculé automatiquement'],
                        ]}
                    />
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Bonus féminin 3x3</h3>
                        <Table
                            headers={['Joueuses', 'Points bonus', 'Affichage']}
                            rows={[
                                ['0', '0 pt', '—'],
                                ['1', <Badge color="bg-orange-100 text-orange-700">+1 pt</Badge>, 'Badge orange dans ScoreDialog et tablette terrain'],
                                ['2 ou plus', <Badge color="bg-orange-100 text-orange-700">+2 pts</Badge>, 'Badge orange dans ScoreDialog et tablette terrain'],
                            ]}
                        />
                        <Tip>Le bonus est à intégrer manuellement dans le score saisi. Exemple : équipe +1 marque 12 paniers → saisir 13. Le rappel s'affiche en orange dans la fenêtre de saisie.</Tip>
                    </div>
                </div>
            </Section>

            <Section icon="📋" title="Organisation des poules" subtitle="Génération du planning catégorie par catégorie">
                <div className="space-y-4">
                    <Table
                        headers={['Format', 'Description', 'Idéal pour']}
                        rows={[
                            ['Traditionnel', 'Poules de N équipes, tous contre tous', 'Catégories classiques'],
                            ['Double aller-retour', 'Chaque match joué deux fois', 'Peu d\'équipes'],
                            ['Suisse', 'Classement unique, nombre de matchs configurable', 'Garantir le même temps de jeu'],
                        ]}
                    />
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Algorithme de planning</h3>
                        <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <li>🎯 <strong>Priorité 1</strong> — Remplir tous les terrains à chaque session (jamais de terrain vide)</li>
                            <li>⚖️ <strong>Priorité 2</strong> — Espacer régulièrement les matchs de chaque équipe sur tout le tournoi</li>
                            <li>🔒 <strong>Terrains réservés</strong> — Strictement réservés à leur catégorie pendant les poules, libérés après</li>
                        </ul>
                    </div>
                    <Warning>Une confirmation est demandée avant de régénérer les poules si des scores ont déjà été saisis.</Warning>
                </div>
            </Section>

            <Section icon="🗓️" title="Calendrier Global — Jour J" subtitle="Votre tableau de bord principal pendant le tournoi">
                <div className="space-y-4">
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Saisie des scores</h3>
                        <Table
                            headers={['Élément', 'Description']}
                            rows={[
                                ['Boutons +/−', 'Saisie directe sur chaque ligne de match — score minimum 0'],
                                ['✓ Valider', 'Confirme le score et met à jour le classement immédiatement'],
                                ['✏️ Modifier', 'Ouvre une boîte de dialogue pour corriger un score terminé'],
                                ['🔴 Forfait', 'Dans la boîte de dialogue — 0 pt à l\'absent, 3 pts à l\'adversaire, score affiché 0-0'],
                            ]}
                        />
                        <Warning>Les matchs de phase finale sont gérés exclusivement dans l'onglet Phase Finale.</Warning>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Contrôle des sessions</h3>
                        <Table
                            headers={['Élément', 'Description']}
                            rows={[
                                ['Badge EN COURS', 'Mise en évidence visuelle de la session active'],
                                ['Lancer la session suivante', 'Avance le tournoi et actualise la TV'],
                                ['← Session précédente', 'Revient en arrière sans effacer les scores'],
                                ['Heure de fin estimée', 'Calculée selon sessions restantes et durée configurée'],
                                ['Indicateurs T.1 T.2...', 'Cliquables — vert = prêt, gris = en attente. Clic = validation manuelle'],
                            ]}
                        />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">📺 Contrôle TV rapide</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Le bouton <strong>"📺 Contrôle TV"</strong> dans le header du calendrier ouvre des bascules instantanées sans aller dans la configuration :
                        </p>
                        <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <li>🗓️ Prochains matchs &nbsp; 🏅 Résultats &nbsp; 📊 Classements</li>
                            <li>🏢 Sponsors &nbsp; 🔴 Scores en direct (grisé si tablettes non activées)</li>
                        </ul>
                        <Tip>Pratique pour désactiver les sponsors en cours de tournoi ou masquer les classements pendant la phase finale.</Tip>
                    </div>
                </div>
            </Section>

            <Section icon="⏱️" title="Chronomètre" subtitle="Synchronisé sur tous les écrans en temps réel">
                <div className="space-y-3">
                    <Step n={1} title="Décompte de départ">Cliquez Démarrer → décompte 5-4-3-2-1 → coup de sifflet → chrono lancé sur tous les écrans simultanément.</Step>
                    <Step n={2} title="Alertes sonores automatiques">Alerte à 1 minute restante. Corne de fin à 10 secondes. Le chrono se remet automatiquement 2 secondes après la fin.</Step>
                    <Step n={3} title="Pause">Ne remet pas à zéro — reprend exactement là où il s'est arrêté.</Step>
                    <Table
                        headers={['Comportement', 'Détail']}
                        rows={[
                            ['Chrono maître', 'L\'admin est la source de vérité — TV et tablettes reçoivent les ticks toutes les secondes'],
                            ['Zéro dérive', 'La TV affiche la valeur exacte de l\'admin — pas de calcul indépendant'],
                            ['Son sur tablette', 'Aucun son sur les feuilles de marque terrain — uniquement le chrono affiché'],
                        ]}
                    />
                </div>
            </Section>

            <Section icon="🏅" title="Classement" subtitle="Mis à jour en temps réel après chaque score validé">
                <div className="space-y-4">
                    <Table
                        headers={['Résultat', 'Points', 'Note']}
                        rows={[
                            ['Victoire', <Badge color="bg-green-100 text-green-700">3 pts</Badge>, '—'],
                            ['Match nul', <Badge color="bg-yellow-100 text-yellow-700">2 pts</Badge>, 'Score identique en fin de temps réglementaire'],
                            ['Défaite', <Badge color="bg-gray-100 text-gray-700">1 pt</Badge>, '—'],
                            ['Forfait', <Badge color="bg-red-100 text-red-700">0 pt</Badge>, 'Score affiché 0-0, adversaire reçoit 3 pts'],
                        ]}
                    />
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Critères de départage en cas d'égalité</h3>
                        <ol className="space-y-1 text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside">
                            <li>Points totaux</li>
                            <li>Nombre de victoires</li>
                            <li>Points marqués — hors matchs forfait</li>
                            <li>Points encaissés — le moins possible, hors matchs forfait</li>
                        </ol>
                    </div>
                </div>
            </Section>

            <Section icon="🏆" title="Phase Finale" subtitle="Tableaux à élimination directe par catégorie">
                <div className="space-y-4">
                    <Table
                        headers={['Fonctionnalité', 'Détail']}
                        rows={[
                            ['Génération auto', 'Les meilleures équipes qualifiées remplissent le bracket automatiquement'],
                            ['Génération manuelle', 'Vous choisissez vous-même les pairings via l\'éditeur'],
                            ['Navigation onglets', 'Un onglet par tour — ● en cours, ✓ terminé — s\'ouvre sur le bon tour automatiquement'],
                            ['Terrain par match', 'Saisissez le terrain dans le bracket — affiché sur la TV'],
                            ['Score égal bloqué', 'Impossible en phase finale 3x3 — un match doit toujours avoir un vainqueur'],
                            ['Régie TV', 'Choisissez manuellement quel tour afficher sur l\'écran public'],
                        ]}
                    />
                    <Tip>Le bracket TV affiche automatiquement le premier tour avec des matchs non terminés. Si vous commencez en quarts, les quarts s'affichent directement.</Tip>
                    <Warning>Une confirmation est demandée avant de régénérer si des scores existent déjà.</Warning>
                </div>
            </Section>

            <Section icon="📺" title="Affichage TV" subtitle="Deux modes — cycle automatique configurable">
                <div className="space-y-4">
                    <Table
                        headers={['Mode', 'URL d\'accès']}
                        rows={[
                            ['TV normale (avec sons)', <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">192.168.X.X:3000?view=tv</code>],
                            ['TV muette (sans sons)', <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">192.168.X.X:3000?view=tv&mute=true</code>],
                        ]}
                    />
                    <Tip>Mettez ces URLs en favori dans le navigateur de la TV. Ouvrez une nouvelle TV en cours de tournoi — elle se synchronise immédiatement avec l'état actuel.</Tip>
                    <Table
                        headers={['Slide', 'Contenu', 'Durée']}
                        rows={[
                            ['Prochains matchs', 'Équipes, terrains, arbitres/marqueurs si obligatoires — noms adaptatifs', 'Configurable'],
                            ['Résultats', 'Scores session précédente — gagnant vert, perdant rouge', 'Configurable'],
                            ['Classements', 'Points, victoires, +/- — taille de texte adaptative au nombre d\'équipes', 'Configurable'],
                            ['Sponsors', 'Logos partenaires', 'Configurable'],
                            ['Scores en direct', 'Bandeau défilant avec scores tablettes — si option activée', '—'],
                        ]}
                    />
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Bandeau bas permanent</h3>
                        <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <li>⬛ <strong>Gauche</strong> — Chrono en temps réel synchronisé avec l'admin</li>
                            <li>📊 <strong>Centre</strong> — Scores en direct défilants si tablettes activées</li>
                            <li>🔢 <strong>Droite</strong> — Numéro de session actuelle en grand blanc</li>
                            <li>🔊 <strong>Haut droite</strong> — Icône son discrète (rouge si muet)</li>
                        </ul>
                    </div>
                </div>
            </Section>

            <Section icon="📱" title="Feuilles de marque (tablettes terrain)" subtitle="À activer dans Configuration → Paramètres avancés → Tablettes terrain" badge={{ text: 'OPTIONNEL', color: 'bg-green-100 text-green-700' }}>
                <div className="space-y-4">
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Mise en route le matin du tournoi</h3>
                        <Step n={1} title="Activer dans la configuration">Configuration → Paramètres avancés → Tablettes terrain → cocher "Activer les tablettes terrain".</Step>
                        <Step n={2} title="Ouvrir sur chaque tablette">Cliquez sur le bouton "Terrain N" → s'ouvre dans un nouvel onglet sur la tablette concernée.</Step>
                        <Step n={3} title="Mettre en favori">Sur la tablette, ajoutez la page aux favoris. Le marqueur n'appuie plus que sur le favori toute la journée.</Step>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Déroulement d'un match</h3>
                        <Table
                            headers={['Étape', 'Tablette', 'Admin / TV']}
                            rows={[
                                ['En attente', '"Équipes prêtes" → cliquer', 'Indicateur terrain passe en vert'],
                                ['Chrono lancé', 'Feuille de marque apparaît automatiquement', 'Score initial visible dans le bandeau TV'],
                                ['Pendant le match', '+/− score (min = bonus), +/− fautes', 'Score mis à jour en direct sur la TV'],
                                ['Fin du chrono', 'Reste sur la feuille — panier au buzzer possible', '—'],
                                ['Envoi', '"Envoyer le score" → confirmation', 'Score enregistré dans le classement'],
                            ]}
                        />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Fautes — code couleur</h3>
                        <Table
                            headers={['Fautes', 'Couleur', 'Règle 3x3']}
                            rows={[
                                ['1 à 6', <Badge color="bg-green-100 text-green-700">Vert</Badge>, 'Normal'],
                                ['7 à 9', <Badge color="bg-orange-100 text-orange-700">Orange</Badge>, '2 lancers-francs automatiques'],
                                ['10 à 13', <Badge color="bg-red-100 text-red-700">Rouge</Badge>, '2 lancers-francs + possession'],
                            ]}
                        />
                    </div>
                    <Tip>Si une tablette plante, cliquez sur l'indicateur T.N dans le calendrier pour valider manuellement depuis l'admin.</Tip>
                </div>
            </Section>

            <Section icon="🖨️" title="Feuilles de route & Impression" subtitle="Tous les outils d'impression au même endroit">
                <div className="space-y-4">
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Feuilles de route équipes</h3>
                        <Table
                            headers={['Format', 'Usage']}
                            rows={[
                                ['Imprimer (Direct)', 'Impression directe depuis le navigateur'],
                                ['Copier pour Sheets', 'Copie les données pour Google Sheets'],
                                ['Exporter (.xlsx)', 'Fichier Excel téléchargeable'],
                            ]}
                        />
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Les colonnes arbitre/marqueur n'apparaissent que si l'option est cochée dans la catégorie.</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Feuilles de match 3x3</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Paysage A4 — 4 feuilles par page (2×2). Sélection par <strong>session</strong> ou par <strong>terrain</strong>.</p>
                        <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <li>🔵 En-tête coloré — catégorie, session, terrain, poule</li>
                            <li>👕 Noms des équipes avec badge bonus féminin</li>
                            <li>✋ Grille fautes (1 à 13)</li>
                            <li>📊 Grille marque 1→21 en 4 lignes (6+6+6+3) — cases bonus pré-cochées orange</li>
                            <li>🏁 Score final à remplir &nbsp; ✂️ Lignes de coupe en pointillés</li>
                        </ul>
                    </div>
                </div>
            </Section>

            <Section icon="💾" title="Sauvegarde & Sécurité" subtitle="Double protection automatique — aucune action requise">
                <div className="space-y-3">
                    <Table
                        headers={['Mécanisme', 'Localisation', 'Déclenchement']}
                        rows={[
                            ['Serveur', 'tournament_data.json sur le PC', 'À chaque action automatiquement'],
                            ['IndexedDB', 'Dans le navigateur (copie locale)', 'À chaque action automatiquement'],
                        ]}
                    />
                    <Table
                        headers={['Scénario de panne', 'Récupération']}
                        rows={[
                            ['Serveur Node.js plante', 'IndexedDB restaure au redémarrage — 0 donnée perdue'],
                            ['Navigateur plante', 'Le serveur a la dernière version — 0 donnée perdue'],
                            ['Coupure électrique', 'Perte maximum = la dernière action effectuée'],
                        ]}
                    />
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Protections contre les erreurs</h3>
                        <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <li>🛡️ Confirmation avant régénération poules ou phase finale si scores existants</li>
                            <li>🛡️ Score négatif impossible &nbsp; 🛡️ Score égal impossible en phase finale</li>
                            <li>🛡️ Bouton ← Session précédente pour corriger une erreur de session</li>
                        </ul>
                    </div>
                </div>
            </Section>

            <Section icon="🎯" title="Conseils pour le jour J" subtitle="Retours d'expérience">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                        { icon: '🌙', title: 'La veille', text: 'Préparez équipes et configuration. Le jour J : générer les poules et lancer.' },
                        { icon: '🖨️', title: 'Feuilles de match', text: 'Imprimez par session juste avant chaque session — noms et bonus pré-remplis.' },
                        { icon: '⏰', title: 'Gestion du temps', text: 'Utilisez l\'heure de fin estimée dans le calendrier pour piloter vos pauses.' },
                        { icon: '📺', title: 'Contrôle TV rapide', text: 'Bouton "📺 Contrôle TV" dans le calendrier — désactivez sponsors en un clic sans aller dans la config.' },
                        { icon: '📱', title: 'Tablette en panne', text: 'Cliquez sur l\'indicateur T.N dans le calendrier pour valider manuellement.' },
                        { icon: '🏟️', title: 'Phase finale TV', text: 'La TV affiche le tour en cours automatiquement. Régie TV pour forcer un tour spécifique.' },
                        { icon: '🔄', title: 'Deux tournois', text: 'Jeunes le matin, adultes le soir : exportez le JSON entre les deux pour sauvegarder.' },
                        { icon: '📡', title: 'Nouvelle TV', text: 'Ouvrez ?view=tv sur n\'importe quel écran — synchronisation immédiate avec l\'état actuel.' },
                    ].map((item, i) => (
                        <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <span className="text-xl">{item.icon}</span>
                                <div>
                                    <div className="font-bold text-sm text-gray-800 dark:text-gray-100">{item.title}</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{item.text}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            <div className="mt-6 text-center text-xs text-gray-400 dark:text-gray-600 pb-4">
                Tournament Manager Pro — Développé pour le 3x3 Basketball 🏀
            </div>
        </div>
    );
};

export default HelpGuide;
