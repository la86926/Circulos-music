(()=>{
'use strict';
if(window.__circulosPianoColorsFixV1)return;
window.__circulosPianoColorsFixV1=true;

const style=document.createElement('style');
style.textContent=`
#chordsView #performancePianoKeyboard .white-key.piano-tonic-color,
#chordsView #performancePianoKeyboard .white-key.root-tone,
#chordsView #performancePianoKeyboard .white-key.synced-root-tone{
  background:#D5DCF9!important;
  color:#263252!important;
  box-shadow:inset 0 -8px 0 #AAB6EA!important;
  border-color:#AAB6EA!important;
}

#chordsView #performancePianoKeyboard .black-key.piano-tonic-color,
#chordsView #performancePianoKeyboard .black-key.root-tone,
#chordsView #performancePianoKeyboard .black-key.synced-root-tone{
  background:#D5DCF9!important;
  color:#263252!important;
  box-shadow:inset 0 0 0 3px #AAB6EA!important;
  border-color:#AAB6EA!important;
}

#chordsView #performancePianoKeyboard .white-key.piano-chord-color,
#chordsView #performancePianoKeyboard .white-key.chord-tone,
#chordsView #performancePianoKeyboard .white-key.voicing-tone,
#chordsView #performancePianoKeyboard .white-key.synced-chord-tone{
  background:#e2f4e8!important;
  color:#4f9a70!important;
  box-shadow:inset 0 -7px 0 #4f9a70!important;
  border-color:#4f9a70!important;
}

#chordsView #performancePianoKeyboard .black-key.piano-chord-color,
#chordsView #performancePianoKeyboard .black-key.chord-tone,
#chordsView #performancePianoKeyboard .black-key.voicing-tone,
#chordsView #performancePianoKeyboard .black-key.synced-chord-tone{
  background:#4f9a70!important;
  color:#FFFFFF!important;
  box-shadow:inset 0 0 0 3px #e2f4e8!important;
  border-color:#4f9a70!important;
}

#chordsView #performancePianoKeyboard .white-key.piano-tonic-color.piano-chord-color,
#chordsView #performancePianoKeyboard .white-key.root-tone.chord-tone,
#chordsView #performancePianoKeyboard .white-key.root-tone.voicing-tone,
#chordsView #performancePianoKeyboard .white-key.synced-root-tone.chord-tone{
  background:#D5DCF9!important;
  color:#263252!important;
  box-shadow:inset 0 -8px 0 #AAB6EA!important;
  border-color:#AAB6EA!important;
}

#chordsView #performancePianoKeyboard .black-key.piano-tonic-color.piano-chord-color,
#chordsView #performancePianoKeyboard .black-key.root-tone.chord-tone,
#chordsView #performancePianoKeyboard .black-key.root-tone.voicing-tone,
#chordsView #performancePianoKeyboard .black-key.synced-root-tone.chord-tone{
  background:#D5DCF9!important;
  color:#263252!important;
  box-shadow:inset 0 0 0 3px #AAB6EA!important;
  border-color:#AAB6EA!important;
}
`;
document.head.appendChild(style);
})();
