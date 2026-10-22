import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_APPEARANCE, resolveAppearance, themeVariables, contrast, readableAccent, COLOR_PRESETS } from '../utils/appearance.ts';
import { configReducer } from '../context/reducers/configReducer.ts';
import { globalReducer } from '../context/reducers/globalReducer.ts';
import { initialData } from '../data/initialData.ts';

test('une ancienne sauvegarde sans apparence reçoit le Bleu électrique, avec deux fonds indépendants', () => {
  assert.deepEqual(resolveAppearance(), DEFAULT_APPEARANCE);
  assert.equal(resolveAppearance().organizer.mode, 'light');
  assert.equal(resolveAppearance().tv.mode, 'dark');
  assert.deepEqual(resolveAppearance({ organizer: { accent: 'red; background: black', mode: 'incorrect' } }), DEFAULT_APPEARANCE);
});

test('les couleurs choisies restent lisibles même aux extrêmes blanc, noir, jaune et menthe', () => {
  for (const accent of [...COLOR_PRESETS.map(p => p.color), '#ffffff', '#000000', '#ffff00', '#00ffff']) {
    for (const mode of ['light', 'dark']) {
      const theme = themeVariables({ accent, mode });
      assert.ok(contrast(theme['--ui-accent-text'], accent) >= 4.5, accent);
      assert.ok(contrast(readableAccent(accent, theme['--ui-panel']), theme['--ui-panel']) >= 4.5, accent);
      assert.ok(contrast(theme['--ui-text'], theme['--ui-panel']) >= 4.5);
      assert.ok(contrast(theme['--ui-muted'], theme['--ui-panel']) >= 4.5);
    }
  }
});

test('modifier l’apparence ne change aucun score, équipe, chrono ou réglage TV', () => {
  const state = structuredClone(initialData);
  const appearance = { organizer: { accent: '#c92336', mode: 'dark' }, tv: { accent: '#1464ff', mode: 'light' } };
  const updated = configReducer(state, { type: 'UPDATE_CONFIG', payload: { appearance } });
  const { appearance: saved, ...everythingElse } = updated;
  assert.deepEqual(everythingElse, state);
  assert.deepEqual(saved, appearance);
  assert.strictEqual(updated.matches, state.matches);
  assert.strictEqual(updated.tvConfig, state.tvConfig);
});

test('les couleurs survivent à une sauvegarde, une réouverture et un nouveau tournoi sans équipes', () => {
  const appearance = { organizer: { accent: '#7c3aed', mode: 'dark' }, tv: { accent: '#ed7020', mode: 'light' } };
  const backup = JSON.parse(JSON.stringify({ ...initialData, appearance }));
  const restored = globalReducer(initialData, { type: 'SET_STATE', payload: backup });
  assert.deepEqual(resolveAppearance(restored.appearance), appearance);
  assert.deepEqual(globalReducer(restored, { type: 'CLEAR_DATA' }).appearance, appearance);
  assert.deepEqual(resolveAppearance(DEFAULT_APPEARANCE), DEFAULT_APPEARANCE);
});
