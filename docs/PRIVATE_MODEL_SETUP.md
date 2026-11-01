# Private model weights

Trained weights are not included in the current source tree. Obtain the matching GraphCodeBERT V3 model.safetensors through a private team channel. Keep a backup outside this Git checkout before pulling the commit that removes tracked weights: Git removes tracked files during checkout.

Config, tokenizer and best_info.json remain under model_v3. Either copy the matching weights there after updating (they are ignored), or keep the complete matching model package outside the repository and set MODEL_DIR to its absolute path in your untracked .env. Never use git add -f to commit private weights.

This commit does NOT remove previous public weights from Git history, forks, Git LFS storage or existing downloads. Full removal requires coordinating history cleanup across repositories and asking GitHub Support to purge removed LFS objects. Existing downloaded copies cannot be recalled.
