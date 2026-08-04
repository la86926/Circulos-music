(()=>{
'use strict';
if(window.__circulosPianoColorsFixV1)return;
window.__circulosPianoColorsFixV1=true;

const style=document.createElement('style');
style.textContent=`
#chordsView #performancePianoKeyboard .white-key.piano-tonic-color,
#chordsView #performancePianoKeyboard .white-key.root-tone,
#chordsView #performancePianoKeyboard .white-key.synced-root-tone,
#chordsView #performancePianoKeyboard .black-key.piano-tonic-color,
#chordsView #performancePianoKeyboard .black-key.root-tone,
#chordsView #performancePianoKeyboard .black-key.synced-root-tone{
  background:#D5DCF9!important;
  color:#22263A!important;
  box-shadow:none!important;
  border-color:#AEB9E8!important;
}

#chordsView #performancePianoKeyboard .white-key.piano-chord-color,
#chordsView #performancePianoKeyboard .white-key.chord-tone,
#chordsView #performancePianoKeyboard .white-key.voicing-tone,
#chordsView #performancePianoKeyboard .white-key.synced-chord-tone,
#chordsView #performancePianoKeyboard .black-key.piano-chord-color,
#chordsView #performancePianoKeyboard .black-key.chord-tone,
#chordsView #performancePianoKeyboard .black-key.voicing-tone,
#chordsView #performancePianoKeyboard .black-key.synced-chord-tone{
  background:#8CA18F!important;
  color:#FFFFFF!important;
  box-shadow:none!important;
  border-color:#8CA18F!important;
}

#chordsView #performancePianoKeyboard .piano-tonic-color.piano-chord-color,
#chordsView #performancePianoKeyboard .root-tone.chord-tone,
#chordsView #performancePianoKeyboard .synced-root-tone.synced-chord-tone{
  background:#D5DCF9!important;
  color:#22263A!important;
  box-shadow:none!important;
  border-color:#AEB9E8!important;
}
`;
document.head.appendChild(style);
})();
