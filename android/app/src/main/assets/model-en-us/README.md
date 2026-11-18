# Vosk Speech Recognition Model

Place the contents of `vosk-model-small-en-us-0.15` here (download from https://alphacephei.com/vosk/models).

Required files (from the model zip):
- am/final.mdl
- conf/mfcc.conf
- conf/model.conf
- graph/phones/word_boundary.int
- graph/HCLG.fst (or HCLr.fst + Gr.fst)
- graph/words.txt
- ivector/final.dubm, final.ie, final.mat, global_cmvn.stats, online_cmvn_iext.conf, online_cmvn.conf, splice.conf
- README

The model folder name (`model-en-us`) must match the string passed to `Vosk.loadModel('model-en-us')` in the app.

On first launch Android will copy the model from assets to internal storage (~40 MB, one-time).

