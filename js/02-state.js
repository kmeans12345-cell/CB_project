function buildDeck(){
  const counts={보병:3,궁병:3,창병:3,공병:3,기마병:3,방패병:1,포병:1,트레뷰셋:1,기사:1,마법사:1,힐러:1};
  const d=[];
  for(const[k,n]of Object.entries(counts))for(let i=0;i<n;i++)d.push({type:k,id:Math.random().toString(36).slice(2)});
  return shuffle(d);
}

// ══════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════
let phase='setup';  // setup | obs-random | obs-mountain | obs-river | battle
let turn=1;
let tokens=BASE_TOKENS,piggy=0;
let playerDeck=[],playerHand=[],playerDiscard=[];
let aiDeck=[],aiHand=[],aiDiscard=[];
let grid=[];
let mode=null;
let selectedCard=null,selectedUnit=null;
let actionBusy=false;
let turnBusy=false;
let reservations={};
let playerReservationQueue=[];
let aiReservationQueue=[];
let reservationSeq=0;
let pendingBuildings=[];
// FIX 3: nexus HP
let playerBaseHp=BASE_HP, enemyBaseHp=BASE_HP;
let highlighted=new Set();
let attackTargets=new Set();
let healTargets=new Set();
let visibleHexes=new Set();
let exploredHexes=new Set();

// Obstacle placement state
let obsFirstPlayer=null;   // legacy manual placement starter
let obsCurrentTurn=null;   // 'p' or 'e'
let obsPhase='mountain';   // 'mountain' | 'river'
// Each player's remaining quota
let pMtnLeft=MTN_QUOTA, eMtnLeft=MTN_QUOTA;
let pRivLeft=RIV_QUOTA, eRivLeft=RIV_QUOTA;
// Track placed positions for adjacency rules
let pMtnPlaced=[],eMtnPlaced=[];  // all mountains by player
let pRivPlaced=[],eRivPlaced=[];  // all river tiles by player
// River chain: a player's river must all be contiguous (chain of up to 5)
// Consecutive skips tracking
let consecutiveSkips=0;

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function ri(q,r){return r*COLS+q;}
function inBounds(q,r){return q>=0&&q<COLS&&r>=0&&r<ROWS;}
function isPlayerDeploy(q,r){return hexDist(q,r,PLAYER_START.q,PLAYER_START.r)===DEPLOY_RADIUS;}
function isEnemyDeploy(q,r) {return hexDist(q,r,ENEMY_START.q, ENEMY_START.r )===DEPLOY_RADIUS;}
// No-go: very close to either start
function isDeployNoGo(q,r){
  return hexDist(q,r,PLAYER_START.q,PLAYER_START.r)<=2||hexDist(q,r,ENEMY_START.q,ENEMY_START.r)<=2;
}

function log(msg,cls=''){
  const el=document.getElementById('log-bar');
  const d=document.createElement('div');
  d.className='log-entry '+cls;d.textContent=`[턴${turn}] ${msg}`;
  el.appendChild(d);el.scrollTop=el.scrollHeight;
}
function setHint(msg,active=false){
  const el=document.getElementById('action-hint');el.textContent=msg;el.className=active?'active':'';
}
function availableTokens(){return tokens+piggy;}
function spendTokens(amount){
  if(availableTokens()<amount)return false;
  const fromPiggy=Math.min(piggy,amount);
  piggy-=fromPiggy;
  tokens-=amount-fromPiggy;
  return true;
}
function availableMoveTokens(owner='p'){
  return owner==='p'?tokens:BASE_TOKENS;
}
function spendMoveTokens(amount,owner='p'){
  if(owner!=='p')return true;
  if(tokens<amount)return false;
  tokens-=amount;
  return true;
}
