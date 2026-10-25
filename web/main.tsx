import {createRoot} from 'react-dom/client';
import Home from '../app/page';
import '../app/globals.css';
import '../app/studio-design.css';
import { startPwa } from '../app/pwa';
import VoiceCompanion from '../app/voice-companion';
startPwa();
createRoot(document.getElementById('root')!).render(
  new URLSearchParams(location.search).has('companion') ? <VoiceCompanion companion /> : <Home/>
);
