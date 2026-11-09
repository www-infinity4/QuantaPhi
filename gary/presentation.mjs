/* Gary family presentation + responsible Cast capability decisions.
 * Friday November 6, 2026 at midnight America/Chicago = 06:00 UTC.
 * This fixed UTC instant avoids device-local timezone and clock display drift.
 */
export const FAMILY_SWITCH_UTC='2026-11-06T06:00:00.000Z';
const SWITCH_MS=Date.parse(FAMILY_SWITCH_UTC);
export function familyPresentationAt(now=new Date()){
  const ms=+new Date(now);
  return Number.isFinite(ms) && ms<SWITCH_MS?'birthday':'octaves';
}
export function castAction({remotePromptAvailable=false,activeNativeMedia=false}={}){
  return remotePromptAvailable && activeNativeMedia ?'native-media-picker':'help';
}
export function castInstructions(){
  return [
    'Connect the phone and Google Cast TV/Chromecast to the same Wi-Fi network. Mobile data by itself usually cannot find the TV.',
    'On Android, swipe down twice from the top of your screen and tap Screen Cast, Cast or Smart View. If missing, edit Quick Settings tiles or use Google Home to cast your screen.',
    'Choose your TV and approve its connection prompt. Your TV must support the selected casting method.',
    'For Netflix, CNN or other protected streams, open the official app/site and use its Cast button if available. This page cannot cast protected provider players.',
    'Fullscreen makes the page bigger on the phone; it is not screen casting. To stop mirroring, use the Android Cast notification or settings.'
  ];
}
