//  AI BATTLE TURN
// ══════════════════════════════════════════════
function aiTurn(){
  let aiT=BASE_TOKENS;
  let spent=0;

  while(aiT>0&&aiDeployOne(aiT)){
    const last=aiLastDeployCost;aiT-=last;spent+=last;
  }

  const snap=[];
  grid.forEach((c,i)=>{if(c.unit&&c.unit.owner==='e')snap.push({q:i%COLS,r:Math.floor(i/COLS),idx:i});});
  snap.forEach(({q,r,idx})=>{
    const unit=grid[idx].unit;if(!unit||unit.waitTurns>0)return;
    if(!unit.attackedThisTurn&&unit.range>0){
      const target=aiFindAttackTarget(q,r,unit);
      if(target){
        const targetCell=grid[ri(target.q,target.r)];
        if(target.type==='tower'){
          aiAttackTower(unit,targetCell,q,r,target.q,target.r);
        } else {
          const t=targetCell.unit;
          resolveCombat(unit,t,q,r,target.q,target.r);unit.attackedThisTurn=true;
          if(t.hp<=0)targetCell.unit=null;
          if(unit.hp<=0){grid[idx].unit=null;}
        }
      }
      if(unit.hp<=0)return;
    }
    if(aiT>0&&!unit.movedThisTurn&&unit.move>0){
      const used=aiMoveUnitToward(q,r,unit,aiT);
      aiT-=used;spent+=used;
    }
  });

  while(aiT>0&&aiDeployOne(aiT)){
    const last=aiLastDeployCost;aiT-=last;spent+=last;
  }

  if(aiDeck.length>0)aiHand.push(aiDeck.pop());
  log(`AI 턴 완료 — 토큰 ${spent}/${BASE_TOKENS} 사용`,'enemy');
  // AI base damage is applied in applyBaseDamage() called from endTurn
}

let aiLastDeployCost=0;
function aiDeployOne(aiT){
  aiLastDeployCost=0;
  const spots=[];
  for(let r=0;r<ROWS;r++)for(let q=0;q<COLS;q++){
    const c=grid[ri(q,r)];
    if(isEnemyDeploy(q,r)&&!c.unit&&!c.terrain&&!c.wall&&!c.bridge)spots.push({q,r});
  }
  if(!spots.length)return false;
  const affordable=aiHand.filter(c=>UNIT_DEFS[c.type].cost<=aiT);
  if(!affordable.length)return false;
  affordable.sort((a,b)=>UNIT_DEFS[b.type].cost-UNIT_DEFS[a.type].cost);
  const card=affordable[0],def=UNIT_DEFS[card.type];
  spots.sort((a,b)=>hexDist(a.q,a.r,PLAYER_START.q,PLAYER_START.r)-hexDist(b.q,b.r,PLAYER_START.q,PLAYER_START.r));
  const{q,r}=spots[0];
  grid[ri(q,r)].unit=createUnit(card.type,'e');
  aiHand.splice(aiHand.indexOf(card),1);
  aiLastDeployCost=def.cost;
  log(`적 ${def.emoji} ${card.type} 배치`,'enemy');
  return true;
}

function aiFindAttackTarget(q,r,unit){
  const vis=new Set([`${q},${r}`]),front=[{q,r,d:0}],targets=[];
  while(front.length>0){
    const cur=front.shift();if(cur.d>=unit.range)continue;
    hexNeighbours(cur.q,cur.r).forEach(nb=>{
      const key=`${nb.q},${nb.r}`;if(vis.has(key))return;vis.add(key);
      front.push({q:nb.q,r:nb.r,d:cur.d+1});
      const t=grid[ri(nb.q,nb.r)].unit;
      if(t&&t.owner==='p'&&!isRangedMountainBlocked(unit,q,r,nb.q,nb.r))targets.push({q:nb.q,r:nb.r,unit:t});
      const tower=grid[ri(nb.q,nb.r)].tower;
      if(tower&&tower.owner==='p'&&canAttackTower(unit)&&!isRangedMountainBlocked(unit,q,r,nb.q,nb.r)){
        targets.push({q:nb.q,r:nb.r,type:'tower',tower});
      }
    });
  }
  targets.sort((a,b)=>{
    const aKing=a.unit&&a.unit.name==='킹',bKing=b.unit&&b.unit.name==='킹';
    if(aKing!==bKing)return aKing?-1:1;
    const aTower=a.type==='tower',bTower=b.type==='tower';
    if(aTower!==bTower)return aTower?1:-1;
    return (a.unit?.hp??a.tower.hp)-(b.unit?.hp??b.tower.hp);
  });
  return targets[0]||null;
}

function aiAttackTower(unit,cell,sq,sr,tq,tr){
  const dmg=unit.name==='트레뷰셋'?unit.atk*2:unit.atk;
  cell.tower.hp-=dmg;unit.attackedThisTurn=true;
  log(`${UNIT_DEFS[unit.name].emoji}${unit.name}→🗼 아군 감시탑: ${dmg}피해`,'enemy');
  if(cell.tower.hp>0)return;
  cell.tower=null;
  log('🗼 아군 감시탑 파괴!','combat');
  if(cell.unit){
    const fallDmg=Math.ceil(cell.unit.maxHp/2);
    cell.unit.hp-=fallDmg;
    log(`💥 주둔 ${cell.unit.name} 낙하 피해 ${fallDmg}`,'player');
    if(cell.unit.hp<=0){
      log(`💀 ${cell.unit.name} 사망`,'player');
      cell.unit=null;
    }
  }
}

function aiMoveUnitToward(q,r,unit,aiT){
  const path=bfsPathHex(q,r,PLAYER_START.q,PLAYER_START.r,'e');
  if(!path||path.length===0)return 0;
  const target=path[Math.min(path.length-1,Math.max(0,unit.move-1))];
  const key=`${q},${r}`;
  if(!reservations[key])aiReservationQueue.push(key);
  reservations[key]={tq:target.q,tr:target.r,owner:'e',seq:reservations[key]?.seq??reservationSeq++};
  return Math.min(aiT,Math.max(1,unit.move));
}

// ══════════════════════════════════════════════
//  END TURN (battle)
// ══════════════════════════════════════════════
async function endTurn(){
  if(phase!=='battle')return;
  cancelSelection();
  aiTurn();
  await executeReservations();
  await processAutoBuildings();
  const saved=Math.min(tokens,PIGGY_MAX-piggy);
  if(saved>0){piggy+=saved;log(`💰 미사용 토큰 ${saved}개 → 저금통(${piggy}개)`,'system');}
  tokens=0;
  grid.forEach(c=>{if(c.unit&&c.unit.waitTurns>0)c.unit.waitTurns--;});
  applyBaseDamage();
  checkWinCondition();
  if(phase!=='battle')return; // ended
  turn++;if(turn>MAX_TURNS){endGame();return;}
  tokens=BASE_TOKENS;
  if(playerDeck.length>0)playerHand.push(playerDeck.pop());
  else if(playerDiscard.length>0){playerDeck=shuffle(playerDiscard);playerDiscard=[];playerHand.push(playerDeck.pop());}
  grid.forEach(c=>{if(c.unit){c.unit.movedThisTurn=false;c.unit.attackedThisTurn=false;c.unit.builtThisTurn=false;}});
  document.getElementById('phase-text').textContent=`전투 중 — 턴 ${turn}/${MAX_TURNS}`;
  updateHUD();refreshAll();renderHand();checkWinCondition();
  log(`── 턴 ${turn} 시작 — 토큰 ${BASE_TOKENS}개 (저금통 ${piggy}개) ──`,'system');
  setHint('기물 카드를 선택해 배치하거나, 기물을 클릭해 이동/공격하세요');
}

// ══════════════════════════════════════════════
//  WIN / END
// ══════════════════════════════════════════════
// FIX 3: apply base damage each turn — units on the enemy's start deal their atk
function applyBaseDamage(){
  // Player units on enemy start → damage enemy base
  const eCell=grid[ri(ENEMY_START.q,ENEMY_START.r)];
  if(eCell.unit&&eCell.unit.owner==='p'){
    const dmg=eCell.unit.atk;
    enemyBaseHp=Math.max(0,enemyBaseHp-dmg);
    log(`🏯 적 진영 피해 -${dmg} (남은 HP: ${enemyBaseHp})`,'player');
  }
  // AI units on player start → damage player base
  const pCell=grid[ri(PLAYER_START.q,PLAYER_START.r)];
  if(pCell.unit&&pCell.unit.owner==='e'){
    const dmg=pCell.unit.atk;
    playerBaseHp=Math.max(0,playerBaseHp-dmg);
    log(`🏰 내 진영 피해 -${dmg} (남은 HP: ${playerBaseHp})`,'enemy');
  }
}
function checkWinCondition(){
  // Instant win: base destroyed
  if(enemyBaseHp<=0){endGame('진영 파괴! 승리 🎉 적 진영 HP 0');return;}
  if(playerBaseHp<=0){endGame('진영 파괴! 패배... 내 진영 HP 0');return;}
  const pKing=grid[ri(PLAYER_START.q,PLAYER_START.r)].unit;
  const eKing=grid[ri(ENEMY_START.q,ENEMY_START.r)].unit;
  if(!eKing||eKing.name!=='킹'||eKing.owner!=='e'){endGame('적 킹 처치! 승리 🎉');return;}
  if(!pKing||pKing.name!=='킹'||pKing.owner!=='p'){endGame('내 킹이 쓰러졌습니다. 패배...');return;}
  // Occupation win: unit on start and enemy base takes damage each turn
  // (handled in applyBaseDamage — no instant win by occupation alone)
}
function endGame(msg){
  if(!msg){
    let p=0,e=0;grid.forEach(c=>{if(c.unit){if(c.unit.owner==='p')p++;else e++;}});
    msg=p>e?`판정 승리! 기물 ${p}:${e} 🎉`:e>p?`판정 패배. 기물 ${p}:${e}`:`무승부! ${p}:${e}`;
  }
  showModal('게임 종료',msg+`\n최종 턴: ${turn}`);
}

function showModal(t,b){document.getElementById('modal-title').textContent=t;document.getElementById('modal-body').textContent=b;document.getElementById('modal-overlay').classList.add('active');}
function closeModal(){document.getElementById('modal-overlay').classList.remove('active');}

function createUnit(name,owner){
  const def=UNIT_DEFS[name];
  return {name,owner,hp:def.hp,maxHp:def.hp,atk:def.atk,def:def.def,move:def.move,range:def.range,sight:def.sight,
    waitTurns:0,movedThisTurn:false,attackedThisTurn:false,builtThisTurn:false};
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
function initGame(){
  grid=Array.from({length:ROWS*COLS},()=>({terrain:null,wall:null,bridge:null,tower:null,unit:null}));
  grid[ri(PLAYER_START.q,PLAYER_START.r)].unit=createUnit('킹','p');
  grid[ri(ENEMY_START.q,ENEMY_START.r)].unit=createUnit('킹','e');
  grid[ri(PLAYER_ENGINEER_START.q,PLAYER_ENGINEER_START.r)].unit=createUnit('공병','p');
  grid[ri(ENEMY_ENGINEER_START.q,ENEMY_ENGINEER_START.r)].unit=createUnit('공병','e');
  playerDeck=buildDeck();aiDeck=buildDeck();
  playerHand=[];aiHand=[];
  for(let i=0;i<5;i++){playerHand.push(playerDeck.pop());aiHand.push(aiDeck.pop());}
  reservations={};playerReservationQueue=[];aiReservationQueue=[];reservationSeq=0;pendingBuildings=[];
  visibleHexes.clear();exploredHexes.clear();
  pMtnLeft=MTN_QUOTA;eMtnLeft=MTN_QUOTA;pRivLeft=RIV_QUOTA;eRivLeft=RIV_QUOTA;
  pMtnPlaced=[];eMtnPlaced=[];pRivPlaced=[];eRivPlaced=[];consecutiveSkips=0;
  playerBaseHp=BASE_HP;enemyBaseHp=BASE_HP;
  initSVG();refreshAll();renderHand();
  document.getElementById('token-val').textContent=BASE_TOKENS;
  startObsPhase();
}

initGame();
