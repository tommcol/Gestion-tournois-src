import { roomScope } from './onlineSession';
import { soundManager } from '../assets/sounds';
import { MusicController } from './MusicController';
import { sendMusicCommand, subscribeMusic } from './musicChannel';
let controller: MusicController | undefined;
export function getMusicController() {
  if (controller) return controller;
  const audio = new Audio();
  audio.hidden = true; audio.dataset.musicEngine = 'persistent'; document.body.append(audio);
  const follower = new URLSearchParams(window.location.search).get('view')?.startsWith('tv') || false;
  controller = new MusicController(audio, localStorage, (follower ? 'src_music_tv_v2' : 'src_music_admin_v2') + (roomScope() === 'local' ? '' : ':' + roomScope()), sendMusicCommand, volume => soundManager.setMusicVolume(volume), follower);
  void soundManager.connectMusicElement(audio).catch(error => console.warn('Connexion audio:', error));
  subscribeMusic(data => controller!.receive(data));
  window.addEventListener('pagehide', controller.persist);
  window.addEventListener('tournament_music_connected', controller.publish);
  window.addEventListener('unlock_music_player', () => {
    void soundManager.ensureContextState();
    if (follower) void controller!.play(false);
  });
  return controller;
}
