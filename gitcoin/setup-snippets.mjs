/* Public copy-only setup for users collecting THEIR OWN pending GIT receipts.
 * No remote code runs in the browser; no wallet mint or provider GPT Coin claim.
 */
const BRANCH='feat/gitcoin-termux-sqlite-20261104';
const SOURCE='https://github.com/www-infinity4/QuantaPhi';
export function normalizeGithubRepo(raw){
 const value=typeof raw==='string'?raw.trim():'';
 if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}\/[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(value)||value.includes('..'))throw Error('invalid_github_repository');
 return value;
}
export function makeTermuxSetup(raw){
 const repo=normalizeGithubRepo(raw),[owner,name]=repo.split('/');
 return [
  'cd ~',
  'pkg install -y git gh nodejs python',
  'if ! gh auth status >/dev/null 2>&1; then',
  '  echo "Sign in to your own GitHub account using: gh auth login"',
  '  exit 1',
  'fi',
  'TOOLS="$HOME/quantaphi-gitcoin"',
  'if [ -d "$TOOLS/.git" ]; then',
  `  git -C "$TOOLS" fetch --depth 1 origin ${BRANCH}`,
  `  git -C "$TOOLS" checkout -B ${BRANCH} FETCH_HEAD`,
  'else',
  `  git clone --depth 1 --branch ${BRANCH} ${SOURCE}.git "$TOOLS"`,
  'fi',
  `WORK="$HOME/gitcoin-workspaces/${owner}/${name}"`,
  `mkdir -p "$HOME/gitcoin-workspaces/${owner}"`,
  'if [ ! -d "$WORK/.git" ]; then',
  '  if [ -e "$WORK" ]; then echo "Workspace exists but is not a Git clone"; exit 1; fi',
  `  git clone https://github.com/${repo}.git "$WORK"`,
  'else',
  '  git -C "$WORK" pull --ff-only',
  'fi',
  `python3 "$TOOLS/gitcoin/termux-ledger.py" scan --worktree "$WORK" --repo ${repo} --intent website --builder human`,
  'python3 "$TOOLS/gitcoin/termux-ledger.py" balance',
  'python3 "$TOOLS/gitcoin/termux-ledger.py" receipts'
 ].join('\n');
}
export function makeAiInstructions(raw){
 const repo=normalizeGithubRepo(raw);
 return [
 'I want to collect traceable, pending GIT code-line receipts from my own GitHub repository: '+repo+'.',
 'Use the QuantaPhi GIT collector instructions at '+SOURCE+'/blob/'+BRANCH+'/gitcoin/TERMUX.md',
 'and the source at '+SOURCE+'/blob/'+BRANCH+'/gitcoin/termux-ledger.py.',
 'Help me set it up on Android Termux using git, gh, Node and Python with a local SQLite database; no npm or paid API.',
 'Authenticate only through my own gh auth login. Verify the GitHub remote and pushed commit.',
 'Do not request, expose, export or copy credentials or private repository source to an unrelated service.',
 'Each code line gets a deterministic local GIT-P-<receipt hash> reference and an authenticated gh collector record; these are NOT minted coin serials.',
 'The server-only GIT ledger assigns immutable global serials GIT-000000000001, etc., after authorized GitHub/Quant AI review and accepted code work.',
 'Each code line must get its own provenance receipt, including excluded low-value lines; Quant AI will separately review candidates.',
 'Do not claim, mint, issue, transfer or value spendable GITs based only on local receipts.',
 'Bubbles Bits are separately verified Bubbles tool-work events. GPT Coin is a different optional provider-issued asset;',
 'a user-created imitation must not be labeled provider-issued and there is no verified GPT Coin minting integration.',
 'Show local pending and excluded totals and the receipts command, never pretend they are financial income or settled balances.'
 ].join('\n');
}
