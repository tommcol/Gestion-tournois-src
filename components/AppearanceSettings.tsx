import React from 'react';
import { useTournament } from '../context/TournamentContext';
import type { AppearanceConfig, ScreenAppearance } from '../types';
import { COLOR_PRESETS, DEFAULT_APPEARANCE, resolveAppearance, themeVariables } from '../utils/appearance';

export default function AppearanceSettings() {
  const { state, dispatch } = useTournament();
  const appearance = resolveAppearance(state.appearance);
  const update = (target: keyof AppearanceConfig, change: Partial<ScreenAppearance>) => dispatch({
    type: 'UPDATE_CONFIG', payload: { appearance: { ...appearance, [target]: { ...appearance[target], ...change } } },
  });
  return <details className="appearance-settings bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
    <summary className="p-4 font-bold cursor-pointer">🎨 Apparence — couleurs de l’application et de la TV</summary>
    <div className="p-4 pt-0 space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">Présentation Bleu électrique. Choisis tes couleurs : elles sont enregistrées automatiquement.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(['organizer', 'tv'] as const).map(target => {
          const title = target === 'organizer' ? 'Organisateur' : 'TV';
          const screen = appearance[target];
          return <fieldset key={target} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
            <legend className="font-bold px-2">{title}</legend>
            <label className="flex items-center gap-3 text-sm font-medium">
              <span>Couleur principale {title.toLowerCase()}</span>
              <input type="color" aria-label={`Couleur ${title}`} value={screen.accent} onChange={e => update(target, { accent: e.target.value })} className="appearance-color-picker" />
            </label>
            <div className="flex flex-wrap gap-2" aria-label={`Couleurs proposées ${title}`}>
              {COLOR_PRESETS.map(preset => <button type="button" key={preset.color} aria-label={`${title} : ${preset.name}`} aria-pressed={screen.accent === preset.color} title={preset.name} onClick={() => update(target, { accent: preset.color })} className="appearance-swatch" style={{ backgroundColor: preset.color }}>
                {screen.accent === preset.color ? <span className="appearance-swatch-check" aria-hidden="true">✓</span> : null}
              </button>)}
            </div>
            <label className="flex items-center gap-3 text-sm"><span>Fond {title.toLowerCase()}</span><select aria-label={`Fond ${title}`} className="border rounded-lg p-2" value={screen.mode} onChange={e => update(target, { mode: e.target.value as ScreenAppearance['mode'] })}><option value="light">Clair</option><option value="dark">Sombre</option></select></label>
            <div className="appearance-preview rounded-xl overflow-hidden border" style={themeVariables(screen) as React.CSSProperties} aria-label={`Aperçu ${title}`}>
              <div className="appearance-preview-header p-3 flex items-center justify-between"><strong>Tournoi SRC Basket</strong><span className="font-mono">07:32</span></div>
              <div className="p-3 space-y-2"><div className="appearance-preview-accent rounded-lg p-2 font-bold">{target === 'organizer' ? 'Session 2' : 'Prochains matchs — Session 3'}</div><div className="appearance-preview-panel rounded-lg p-3 flex justify-between gap-2"><span>SRC Rouges</span><span>{target === 'organizer' ? '12 – 8' : 'contre'}</span><span>Les Panthères</span></div><p className="text-xs">{target === 'organizer' ? 'Aperçu des couleurs de tes commandes et tableaux.' : 'Aperçu des couleurs de l’écran TV.'}</p></div>
            </div>
          </fieldset>;
        })}
      </div>
      <button type="button" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 font-bold" onClick={() => dispatch({ type: 'UPDATE_CONFIG', payload: { appearance: resolveAppearance(DEFAULT_APPEARANCE) } })}>Revenir au Bleu électrique</button>
      <p className="text-sm text-gray-500 dark:text-gray-400">Le bouton de retour rétablit les couleurs des deux écrans : organisateur clair et TV sombre.</p>
    </div>
  </details>;
}
