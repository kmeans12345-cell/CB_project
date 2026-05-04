// ══════════════════════════════════════════════
//  BATTLE SELECTION
// ══════════════════════════════════════════════
function cancelSelection(){
  mode=null;selectedCard=null;selectedUnit=null;
  clearHighlights();renderHand();
  document.getElementById('btn-cancel').style.display='none';
  document.getElementById('btn-install-wall').style.display='none';
  document.getElementById('btn-install-bridge').style.display='none';
  document.getElementById('btn-install-tower').style.display='none';
  document.getElementById('btn-reserve').style.display='none';
  setHint('기물을 클릭해 이동하거나 공격하세요');
  document.getElementById('unit-info').innerHTML='<div style="color:var(--text3);font-size:10px;padding:4px">헥스를 클릭하면<br>정보가 표시됩니다</div>';
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')cancelSelection();});

function selectCard(card){
  if(phase!=='battle')return;
  const def=UNIT_DEFS[card.type];
  if(def.cost>availableTokens()){log('토큰 부족!','system');return;}
  selectedCard=card;selectedUnit=null;mode='place';
  clearHighlights();renderHand();
  for(let r=0;r<ROWS;r++)for(let q=0;q<COLS;q++)
    if(isPlayerDeploy(q,r)&&!grid[ri(q,r)].unit&&!grid[ri(q,r)].terrain&&!grid[ri(q,r)].wall)
      highlighted.add(`${q},${r}`);
  refreshAll();
  document.getElementById('btn-cancel').style.display='block';
  showUnitInfo(def,card.type);
  setHint(`${card.type} 배치: 아군 킹 주변 6칸 중 빈 헥스 클릭 (코스트 ${def.cost})`,true);
}

function selectPlayerUnit(q,r){
  const unit=grid[ri(q,r)].unit;if(!unit||unit.owner!=='p')return;
  if(selectedUnit&&selectedUnit.q===q&&selectedUnit.r===r){cancelSelection();return;}
  selectedUnit={q,r};selectedCard=null;
  clearHighlights();
  showUnitInfo(UNIT_DEFS[unit.name],unit.name,unit,q,r);
  document.getElementById('btn-cancel').style.display='block';
  document.getElementById('btn-reserve').style.display='block';
  const canMove=!unit.movedThisTurn&&unit.waitTurns===0&&availableTokens()>0;
  const canAtk=!unit.attackedThisTurn&&unit.waitTurns===0&&unit.range>0;
  if(canMove){
    mode='move';
    hexReachable(q,r,unit.move,'p').forEach(({q:nq,r:nr})=>{
      const c=grid[ri(nq,nr)];
      if(c.unit&&c.unit.owner==='e'&&!unit.attackedThisTurn&&findAttackStandSpot(q,r,nq,nr,unit))attackTargets.add(`${nq},${nr}`);
      else if(!c.unit)highlighted.add(`${nq},${nr}`);
    });
    if(!unit.attackedThisTurn)showRangedTargets(q,r,unit);
    if(!unit.attackedThisTurn)showMoveAttackTargets(q,r,unit);
    refreshAll();
    setHint(`${unit.name} 선택됨\n이동: 금색 / 공격: 빨간\n다시 클릭 → 해제`,true);
  } else if(canAtk){
    mode='attack';showRangedTargets(q,r,unit);refreshAll();
    setHint(`${unit.name} — 공격 대상(빨간) 클릭`,true);
  } else {
    mode=null;refreshAll();
    const r2=[];
    if(unit.waitTurns>0)r2.push(`강 대기 ${unit.waitTurns}턴`);
    if(unit.movedThisTurn)r2.push('이동 완료');
    if(unit.attackedThisTurn)r2.push('공격 완료');
    if(availableTokens()<=0)r2.push('토큰 없음');
    setHint(`${unit.name} — ${r2.join(', ')}`);
  }
  if(unit.name==='공병'&&availableTokens()>=2&&!unit.movedThisTurn&&!unit.builtThisTurn){
    document.getElementById('btn-install-wall').style.display='block';
    document.getElementById('btn-install-bridge').style.display='block';
  }
  if(unit.name==='공병'&&availableTokens()>=3&&!unit.movedThisTurn&&!unit.builtThisTurn){
    document.getElementById('btn-install-tower').style.display='block';
  }
}

function canAttackBridge(unit){
  return unit&&(unit.name==='트레뷰셋'||unit.name==='포병');
}

function canAttackTower(unit){
  return unit&&unit.range>0;
}

function buildingName(type){
  return type==='wall'?'벽':type==='bridge'?'다리':'감시탑';
}

function showRangedTargets(q,r,unit){
  const vis=new Set([`${q},${r}`]),front=[{q,r,d:0}];
  while(front.length>0){
    const cur=front.shift();if(cur.d>=unit.range)continue;
    hexNeighbours(cur.q,cur.r).forEach(nb=>{
      const key=`${nb.q},${nb.r}`;if(vis.has(key))return;vis.add(key);
      front.push({q:nb.q,r:nb.r,d:cur.d+1});
      const c=grid[ri(nb.q,nb.r)];
      if(c.unit&&c.unit.owner==='e'&&visibleHexes.has(key)&&!isRangedMountainBlocked(unit,q,r,nb.q,nb.r))attackTargets.add(key);
      if(c.bridge&&visibleHexes.has(key)&&canAttackBridge(unit))attackTargets.add(key);
      if(c.tower&&c.tower.owner==='e'&&visibleHexes.has(key)&&canAttackTower(unit)&&!isRangedMountainBlocked(unit,q,r,nb.q,nb.r))attackTargets.add(key);
    });
  }
}

function showMoveAttackTargets(q,r,unit){
  if(!unit||unit.range<=0)return;
  for(let tr=0;tr<ROWS;tr++)for(let tq=0;tq<COLS;tq++){
    const key=`${tq},${tr}`,target=grid[ri(tq,tr)].unit;
    if(!target||target.owner!=='e'||!visibleHexes.has(key))continue;
    if(hexDist(q,r,tq,tr)<=unit.range&&!isRangedMountainBlocked(unit,q,r,tq,tr))continue;
    if(findAttackStandSpot(q,r,tq,tr,unit))attackTargets.add(key);
  }
}

function startReserveMode(){
  if(!selectedUnit)return;mode='reserve';clearHighlights();
  for(let r=0;r<ROWS;r++)for(let q=0;q<COLS;q++){
    const c=grid[ri(q,r)];
    if(q===selectedUnit.q&&r===selectedUnit.r)continue;
    if(c.terrain==='mountain'||c.unit||c.wall)continue;
    highlighted.add(`${q},${r}`);
  }
  refreshAll();setHint('📌 예약: 목표 헥스를 클릭\n매 턴 종료 시 토큰 남으면 자동 이동',true);
}

function reserveMoveTo(q,r){
  if(!selectedUnit)return false;
  const cell=grid[ri(q,r)];
  if(q===selectedUnit.q&&r===selectedUnit.r){cancelSelection();return true;}
  const unit=grid[ri(selectedUnit.q,selectedUnit.r)].unit;
  if(cell.terrain==='mountain'||cell.wall||(cell.unit&&cell.unit.owner===unit.owner)){
    log('해당 위치에 예약 불가','system');return true;
  }
  const key=`${selectedUnit.q},${selectedUnit.r}`;
  if(!reservations[key])playerReservationQueue.push(key);
  reservations[key]={tq:q,tr:r,owner:'p',seq:reservations[key]?.seq??reservationSeq++};
  log(`📌 이동 예약: ${unit?.name} → (${q},${r})`,'reserve');
  cancelSelection();refreshAll();return true;
}

function reserveMoveAttackTo(tq,tr){
  if(!selectedUnit)return false;
  const{q:sq,r:sr}=selectedUnit;
  const unit=grid[ri(sq,sr)].unit,target=grid[ri(tq,tr)].unit;
  if(!unit||!target||target.owner===unit.owner)return false;
  if(unit.attackedThisTurn||unit.range<=0){log('공격 예약 불가','system');return true;}
  if(!visibleHexes.has(`${tq},${tr}`)){log('시야 밖 대상은 공격 예약할 수 없습니다','system');return true;}
  const stand=findAttackStandSpot(sq,sr,tq,tr,unit);
  if(!stand){log('이번 턴 이동 후 공격 가능한 위치가 없습니다','system');return true;}
  const key=`${sq},${sr}`;
  if(!reservations[key])playerReservationQueue.push(key);
  reservations[key]={type:'moveAttack',tq:stand.q,tr:stand.r,owner:'p',attackQ:tq,attackR:tr,seq:reservations[key]?.seq??reservationSeq++};
  log(`📌 공격 예약: ${unit.name} → (${stand.q},${stand.r}) 이동 후 (${tq},${tr}) 공격`,'reserve');
  cancelSelection();refreshAll();return true;
}

function pathMoveCost(path){
  return path.reduce((sum,{q,r})=>sum+moveCost(grid[ri(q,r)]),0);
}

function findAttackStandSpot(sq,sr,tq,tr,unit){
  if(!unit||unit.range<=0)return null;
  const candidates=[];
  if(hexDist(sq,sr,tq,tr)<=unit.range&&!isRangedMountainBlocked(unit,sq,sr,tq,tr)){
    candidates.push({q:sq,r:sr,path:[],cost:0});
  }
  for(let r=0;r<ROWS;r++)for(let q=0;q<COLS;q++){
    if(q===tq&&r===tr)continue;
    if(hexDist(q,r,tq,tr)>unit.range)continue;
    if(isRangedMountainBlocked(unit,q,r,tq,tr))continue;
    const cell=grid[ri(q,r)];
    if(cell.terrain==='mountain'||cell.wall)continue;
    if(cell.unit&&!(q===sq&&r===sr))continue;
    const path=bfsPathHex(sq,sr,q,r,unit.owner);
    if(!path)continue;
    const cost=pathMoveCost(path);
    if(cost>unit.move)continue;
    candidates.push({q,r,path,cost});
  }
  candidates.sort((a,b)=>a.cost-b.cost||hexDist(a.q,a.r,tq,tr)-hexDist(b.q,b.r,tq,tr));
  return candidates[0]||null;
}

function startWallMode(){
  if(!selectedUnit)return;
  if(availableTokens()<2){log('벽 설치: 토큰 2개 필요','system');return;}
  mode='wall';clearHighlights();
  for(let r=0;r<ROWS;r++)for(let q=0;q<COLS;q++){
    if(isValidWallTarget(q,r))highlighted.add(`${q},${r}`);
  }
  refreshAll();setHint('벽을 설치할 헥스를 클릭하세요\n멀리 있으면 공병이 근처까지 이동 예약합니다',true);
}

function startBridgeMode(){
  if(!selectedUnit)return;
  if(availableTokens()<2){log('다리 설치: 토큰 2개 필요','system');return;}
  mode='bridge';clearHighlights();
  for(let r=0;r<ROWS;r++)for(let q=0;q<COLS;q++){
    if(isValidBridgeTarget(q,r))highlighted.add(`${q},${r}`);
  }
  refreshAll();setHint('다리를 설치할 강 헥스를 클릭하세요\n멀리 있으면 공병이 근처까지 이동 예약합니다',true);
}

function startTowerMode(){
  if(!selectedUnit)return;
  if(availableTokens()<3){log('감시탑 건설: 토큰 3개 필요','system');return;}
  mode='tower';clearHighlights();
  for(let r=0;r<ROWS;r++)for(let q=0;q<COLS;q++){
    if(isValidTowerTarget(q,r))highlighted.add(`${q},${r}`);
  }
  refreshAll();setHint('감시탑을 건설할 헥스를 클릭하세요\n멀리 있으면 공병이 근처까지 이동 예약합니다',true);
}

// ══════════════════════════════════════════════
//  HEX CLICK
// ══════════════════════════════════════════════
function onHexClick(q,r){
  // Obstacle placement phases
  if((phase==='obs-mountain'||phase==='obs-river')&&obsCurrentTurn==='p'){
    playerPlaceObs(q,r);return;
  }

  if(phase!=='battle')return;
  const cell=grid[ri(q,r)];

  if(selectedUnit&&q===selectedUnit.q&&r===selectedUnit.r){cancelSelection();return;}
  if(mode==='place'&&selectedCard){placeUnit(q,r);return;}
  if(mode==='wall'){doInstallWall(q,r);return;}
  if(mode==='bridge'){doInstallBridge(q,r);return;}
  if(mode==='tower'){doInstallTower(q,r);return;}
  if(mode==='reserve'&&selectedUnit){
    reserveMoveTo(q,r);return;
  }
  if(mode==='move'&&selectedUnit){
    if(cell.unit&&cell.unit.owner==='e'){
      const{q:sq,r:sr}=selectedUnit,unit=grid[ri(sq,sr)].unit;
      if(unit&&hexDist(sq,sr,q,r)<=unit.range&&!unit.attackedThisTurn&&!isRangedMountainBlocked(unit,sq,sr,q,r))doAttack(sq,sr,q,r);
      else if(unit&&!unit.attackedThisTurn)reserveMoveAttackTo(q,r);
      else log('사거리 초과 또는 이미 공격함','system');
      return;
    }
    const attacker=grid[ri(selectedUnit.q,selectedUnit.r)].unit;
    if(cell.tower&&cell.tower.owner==='e'&&canAttackTower(attacker)&&hexDist(selectedUnit.q,selectedUnit.r,q,r)<=attacker.range&&!attacker.attackedThisTurn){
      if(cell.unit&&cell.unit.owner==='e'){
        const attackUnit=confirm('이 칸에는 기물과 감시탑이 함께 있습니다.\n확인: 기물 공격\n취소: 감시탑 공격');
        if(!attackUnit){doAttackTower(selectedUnit.q,selectedUnit.r,q,r);return;}
      } else if(highlighted.has(`${q},${r}`)&&!cell.unit){
        const captureTower=confirm('주둔 병력이 없는 적 감시탑입니다.\n확인: 이동해 점령\n취소: 감시탑 공격');
        if(!captureTower){doAttackTower(selectedUnit.q,selectedUnit.r,q,r);return;}
      } else {
        doAttackTower(selectedUnit.q,selectedUnit.r,q,r);return;
      }
    }
    if(cell.bridge&&canAttackBridge(attacker)&&hexDist(selectedUnit.q,selectedUnit.r,q,r)<=attacker.range&&!attacker.attackedThisTurn){
      if(highlighted.has(`${q},${r}`)){
        const moveOntoBridge=confirm('이 칸에는 다리가 있습니다.\n확인: 다리 위로 이동\n취소: 다리 공격');
        if(!moveOntoBridge){doAttackBridge(selectedUnit.q,selectedUnit.r,q,r);return;}
      } else {
        doAttackBridge(selectedUnit.q,selectedUnit.r,q,r);return;
      }
    }
    reserveMoveTo(q,r);return;
  }
  if(mode==='attack'&&selectedUnit){
    if(cell.unit&&cell.unit.owner==='e')doAttack(selectedUnit.q,selectedUnit.r,q,r);
    else if(cell.tower&&cell.tower.owner==='e')doAttackTower(selectedUnit.q,selectedUnit.r,q,r);
    else if(cell.bridge)doAttackBridge(selectedUnit.q,selectedUnit.r,q,r);
    else cancelSelection();
    return;
  }
  if(cell.unit&&cell.unit.owner==='p'){selectPlayerUnit(q,r);return;}
  cancelSelection();
}

// ══════════════════════════════════════════════
//  BATTLE ACTIONS
// ══════════════════════════════════════════════
function placeUnit(q,r){
  if(!selectedCard)return;
  if(!isPlayerDeploy(q,r)){log('아군 킹 주변 6칸에만 배치 가능','system');return;}
  const idx=ri(q,r);
  if(grid[idx].unit||grid[idx].terrain||grid[idx].wall){log('해당 헥스에 배치 불가','system');return;}
  const def=UNIT_DEFS[selectedCard.type];
  let cost=def.cost;
  spendTokens(cost);
  grid[idx].unit={name:selectedCard.type,owner:'p',hp:def.hp,maxHp:def.hp,
    atk:def.atk,def:def.def,move:def.move,range:def.range,sight:def.sight,
    waitTurns:0,movedThisTurn:false,attackedThisTurn:false,builtThisTurn:false};
  const hi=playerHand.indexOf(selectedCard);if(hi>=0)playerHand.splice(hi,1);
  log(`${def.emoji} ${grid[idx].unit.name} 배치 (${q},${r}) 토큰${def.cost}`,'player');
  cancelSelection();updateHUD();refreshAll();renderHand();
}

function doMove(q,r){
  if(!selectedUnit)return;
  const{q:sq,r:sr}=selectedUnit,unit=grid[ri(sq,sr)].unit;
  if(!unit||unit.owner!=='p')return;
  if(unit.waitTurns>0){log('강 대기 중 이동 불가','system');return;}
  if(unit.movedThisTurn){log('이미 이동했습니다','system');return;}
  if(availableTokens()<1){log('토큰 부족','system');return;}
  if(hexDist(sq,sr,q,r)>unit.move){log(`이동 범위 초과 (최대 ${unit.move}칸)`,'system');return;}
  const dest=grid[ri(q,r)];
  if(dest.terrain==='mountain'){log('산은 이동 불가','system');return;}
  if(dest.unit){log('다른 기물이 있습니다','system');return;}
  if(dest.terrain==='river'&&!dest.bridge){
    if(availableTokens()<2){log('강 진입: 토큰 2개 필요','system');return;}
    spendTokens(1);unit.waitTurns=2;log(`🌊 강 진입 — ${unit.name} 2턴 대기`,'player');
  }
  const oldKey=`${sq},${sr}`;
  if(reservations[oldKey]){reservations[`${q},${r}`]=reservations[oldKey];delete reservations[oldKey];}
  grid[ri(q,r)].unit=unit;grid[ri(sq,sr)].unit=null;
  spendTokens(1);unit.movedThisTurn=true;
  log(`${UNIT_DEFS[unit.name].emoji} ${unit.name} (${sq},${sr})→(${q},${r})`,'player');
  cancelSelection();updateHUD();refreshAll();checkWinCondition();
}

function doAttack(sq,sr,tq,tr){
  const atk=grid[ri(sq,sr)].unit,def=grid[ri(tq,tr)].unit;
  if(!atk||!def)return;
  if(atk.owner===def.owner){log('아군 공격 불가','system');return;}
  if(atk.attackedThisTurn){log('이미 공격했습니다','system');return;}
  if(atk.waitTurns>0){log('대기 중 공격 불가','system');return;}
  if(hexDist(sq,sr,tq,tr)>atk.range){log('사거리 초과','system');return;}
  if(!visibleHexes.has(`${tq},${tr}`)){log('시야 밖 대상은 공격할 수 없습니다','system');return;}
  if(isRangedMountainBlocked(atk,sq,sr,tq,tr)){log('산이 사선을 막아 공격할 수 없습니다','system');return;}
  if(grid[ri(tq,tr)].tower&&grid[ri(tq,tr)].tower.owner!==atk.owner&&canAttackTower(atk)){
    const attackUnit=confirm('이 칸에는 기물과 감시탑이 함께 있습니다.\n확인: 기물 공격\n취소: 감시탑 공격');
    if(!attackUnit){doAttackTower(sq,sr,tq,tr);return;}
  }
  if(grid[ri(tq,tr)].bridge&&canAttackBridge(atk)){
    const attackUnit=confirm('이 칸에는 기물과 다리가 함께 있습니다.\n확인: 기물 공격\n취소: 다리 공격');
    if(!attackUnit){doAttackBridge(sq,sr,tq,tr);return;}
  }
  resolveCombat(atk,def,sq,sr,tq,tr);atk.attackedThisTurn=true;
  if(def.hp<=0)grid[ri(tq,tr)].unit=null;
  if(atk.hp<=0)grid[ri(sq,sr)].unit=null;
  cancelSelection();updateHUD();refreshAll();checkWinCondition();
}

function doAttackTower(sq,sr,tq,tr){
  const atk=grid[ri(sq,sr)].unit,cell=grid[ri(tq,tr)];
  if(!atk||!cell.tower)return;
  if(cell.tower.owner===atk.owner){log('아군 감시탑 공격 불가','system');return;}
  if(!canAttackTower(atk)){log('감시탑을 공격할 수 없습니다','system');return;}
  if(atk.attackedThisTurn){log('이미 공격했습니다','system');return;}
  if(atk.waitTurns>0){log('대기 중 공격 불가','system');return;}
  if(hexDist(sq,sr,tq,tr)>atk.range){log('사거리 초과','system');return;}
  if(!visibleHexes.has(`${tq},${tr}`)){log('시야 밖 대상은 공격할 수 없습니다','system');return;}
  if(isRangedMountainBlocked(atk,sq,sr,tq,tr)){log('산이 사선을 막아 공격할 수 없습니다','system');return;}
  const dmg=atk.name==='트레뷰셋'?atk.atk*2:atk.atk;
  cell.tower.hp-=dmg;atk.attackedThisTurn=true;
  log(`${UNIT_DEFS[atk.name].emoji}${atk.name}→🗼 감시탑: ${dmg}피해`,'combat');
  if(cell.tower.hp<=0){
    cell.tower=null;
    log('🗼 감시탑 파괴!','combat');
    if(cell.unit){
      const fallDmg=Math.ceil(cell.unit.maxHp/2);
      cell.unit.hp-=fallDmg;
      log(`💥 주둔 ${cell.unit.name} 낙하 피해 ${fallDmg}`,cell.unit.owner==='p'?'player':'enemy');
      if(cell.unit.hp<=0){
        log(`💀 ${cell.unit.name} 사망`,cell.unit.owner==='p'?'player':'enemy');
        cell.unit=null;
      }
    }
  }
  cancelSelection();updateHUD();refreshAll();checkWinCondition();
}

function doAttackBridge(sq,sr,tq,tr){
  const atk=grid[ri(sq,sr)].unit,cell=grid[ri(tq,tr)];
  if(!atk||!cell.bridge)return;
  if(!canAttackBridge(atk)){log('다리는 트레뷰셋과 포병만 공격할 수 있습니다','system');return;}
  if(atk.attackedThisTurn){log('이미 공격했습니다','system');return;}
  if(atk.waitTurns>0){log('대기 중 공격 불가','system');return;}
  if(hexDist(sq,sr,tq,tr)>atk.range){log('사거리 초과','system');return;}
  if(!visibleHexes.has(`${tq},${tr}`)){log('시야 밖 대상은 공격할 수 없습니다','system');return;}
  if(isRangedMountainBlocked(atk,sq,sr,tq,tr)){log('산이 사선을 막아 공격할 수 없습니다','system');return;}
  const dmg=atk.name==='트레뷰셋'?atk.atk*2:atk.atk;
  cell.bridge.hp-=dmg;atk.attackedThisTurn=true;
  log(`${UNIT_DEFS[atk.name].emoji}${atk.name}→🌉 다리: ${dmg}피해`,'combat');
  if(cell.bridge.hp<=0){
    cell.bridge=null;
    log('🌉 다리 파괴!','combat');
    if(cell.unit){
      log(`💀 ${cell.unit.name} 추락 사망`,cell.unit.owner==='p'?'player':'enemy');
      cell.unit=null;
    }
  }
  cancelSelection();updateHUD();refreshAll();checkWinCondition();
}

function canEvade(unit){
  return unit&&(unit.name==='기사'||unit.name==='기마병');
}

function tryEvade(unit){
  return canEvade(unit)&&Math.random()<0.3;
}

function applySplashDamage(atk,target,damage){
  if(tryEvade(target)){
    log(`💨 ${target.name} 회피!`,'combat');
    return;
  }
  target.hp-=damage;
}

function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

async function animateCombatHex(q,r){
  const key=`${q},${r}`;
  attackTargets.add(key);refreshAll();
  await delay(180);
  attackTargets.delete(key);refreshAll();
  await delay(120);
}

function resolveCombat(atk,def,sq,sr,tq,tr){
  if(tryEvade(def)){
    log(`💨 ${def.name} 회피! ${atk.name}의 공격 무효`,'combat');
    return;
  }
  if(atk.name==='마법사'){
    const dmg=Math.max(1,atk.atk-def.def);def.hp-=dmg;
    log(`🔮 마법사→${def.name} ${dmg}+스플래시20`,'combat');
    hexNeighbours(tq,tr).forEach(({q:nq,r:nr})=>{
      const u=grid[ri(nq,nr)].unit;if(u&&u.owner!==atk.owner){applySplashDamage(atk,u,20);if(u.hp<=0)grid[ri(nq,nr)].unit=null;}
    });return;
  }
  if(atk.name==='포병'){
    const dmg=Math.max(1,atk.atk-def.def);def.hp-=dmg;
    log(`💣 포병→${def.name} 중심${dmg}+주변10`,'combat');
    hexNeighbours(tq,tr).forEach(({q:nq,r:nr})=>{
      const u=grid[ri(nq,nr)].unit;if(u&&u.owner!==atk.owner){applySplashDamage(atk,u,10);if(u.hp<=0)grid[ri(nq,nr)].unit=null;}
    });return;
  }
  if(atk.name==='트레뷰셋'&&grid[ri(tq,tr)].wall){
    const w=grid[ri(tq,tr)].wall;w.hp-=(atk.atk*2);
    if(w.hp<=0){grid[ri(tq,tr)].wall=null;log(`⚙️ 벽 파괴!`,'combat');}return;
  }
  let dmg=Math.max(1,atk.atk-def.def);
  if(atk.name==='창병'&&def.name==='기마병')dmg+=20;
  def.hp-=dmg;
  let ret=0;
  if(def.range>0&&hexDist(sq,sr,tq,tr)<=def.range&&def.hp>0){
    ret=Math.max(1,def.atk-atk.def);
    if(def.name==='창병'&&atk.name==='기마병')ret+=20;
    atk.hp-=ret;
  }
  log(`${UNIT_DEFS[atk.name].emoji}${atk.name}→${def.name}: ${dmg}피해${ret?` / 반격${ret}`:'`'}`,'combat');
  if(def.hp<=0)log(`💀 ${def.name} 사망`,def.owner==='p'?'player':'enemy');
  if(atk.hp<=0)log(`💀 ${atk.name} 사망`,atk.owner==='p'?'player':'enemy');
}

function doInstallWall(q,r){
  if(!selectedUnit)return;
  const{q:eq,r:er}=selectedUnit;
  const engineer=grid[ri(eq,er)].unit;
  if(!engineer)return;
  // FIX 2: only 1 wall per turn per engineer
  if(engineer.builtThisTurn){log('공병은 1턴에 건축물을 1개만 건설할 수 있습니다','system');return;}
  if(!isValidWallTarget(q,r)){log('해당 위치에 설치 불가','system');return;}
  if(!hexNeighbours(eq,er).some(n=>n.q===q&&n.r===r)){queueConstruction('wall',eq,er,q,r);return;}
  const c=grid[ri(q,r)];
  c.wall={owner:'p',hp:200};spendTokens(2);
  engineer.builtThisTurn=true;
  log(`🪵 건축물 건설: 벽 (${q},${r}) HP200`,'player');
  cancelSelection();updateHUD();refreshAll();
}

function doInstallBridge(q,r){
  if(!selectedUnit)return;
  const{q:eq,r:er}=selectedUnit;
  const engineer=grid[ri(eq,er)].unit;
  if(!engineer)return;
  if(engineer.builtThisTurn){log('공병은 1턴에 건축물을 1개만 건설할 수 있습니다','system');return;}
  if(!isValidBridgeTarget(q,r)){log('해당 위치에 설치 불가','system');return;}
  if(!hexNeighbours(eq,er).some(n=>n.q===q&&n.r===r)){queueConstruction('bridge',eq,er,q,r);return;}
  const c=grid[ri(q,r)];
  c.bridge={hp:200};spendTokens(2);
  if(c.unit)c.unit.waitTurns=0;
  engineer.builtThisTurn=true;
  log(`🌉 건축물 건설: 다리 (${q},${r}) HP200`,'player');
  cancelSelection();updateHUD();refreshAll();
}

function doInstallTower(q,r){
  if(!selectedUnit)return;
  const{q:eq,r:er}=selectedUnit;
  const engineer=grid[ri(eq,er)].unit;
  if(!engineer)return;
  if(engineer.builtThisTurn){log('공병은 1턴에 건축물을 1개만 건설할 수 있습니다','system');return;}
  if(!isValidTowerTarget(q,r)){log('해당 위치에 건설 불가','system');return;}
  if(!hexNeighbours(eq,er).some(n=>n.q===q&&n.r===r)){queueConstruction('tower',eq,er,q,r);return;}
  queueAdjacentTower(eq,er,q,r);
}

function isValidWallTarget(q,r){
  const c=grid[ri(q,r)];
  return !c.wall&&!c.bridge&&!c.tower&&!c.unit&&!c.terrain;
}

function isValidBridgeTarget(q,r){
  const c=grid[ri(q,r)];
  return c.terrain==='river'&&!c.bridge&&!c.wall&&!c.tower;
}

function isValidTowerTarget(q,r){
  const c=grid[ri(q,r)];
  return !c.terrain&&!c.wall&&!c.bridge&&!c.tower&&!c.unit;
}

function queueConstruction(type,eq,er,tq,tr){
  const stand=findConstructionStandSpot(eq,er,tq,tr);
  if(!stand){log('해당 위치 근처로 이동할 경로가 없습니다','system');return;}
  const key=`${eq},${er}`;
  if(!reservations[key])playerReservationQueue.push(key);
  reservations[key]={tq:stand.q,tr:stand.r,owner:'p',seq:reservations[key]?.seq??reservationSeq++};
  pendingBuildings=pendingBuildings.filter(c=>!(c.owner==='p'&&c.eq===eq&&c.er===er));
  pendingBuildings.push({type,owner:'p',eq:stand.q,er:stand.r,tq,tr,readyTurn:turn+1});
  log(`📌 건축물 자동 건설 예약: ${buildingName(type)} (${tq},${tr})`,'reserve');
  cancelSelection();refreshAll();
}

function queueAdjacentTower(eq,er,tq,tr){
  const engineer=grid[ri(eq,er)].unit;
  if(availableTokens()<3){log('감시탑 건설: 토큰 3개 필요','system');return;}
  spendTokens(3);
  engineer.builtThisTurn=true;
  engineer.waitTurns=Math.max(engineer.waitTurns||0,2);
  pendingBuildings=pendingBuildings.filter(c=>!(c.owner==='p'&&c.eq===eq&&c.er===er));
  pendingBuildings.push({type:'tower',owner:'p',eq,er,tq,tr,started:true,completeTurn:turn+2,readyTurn:turn});
  log(`🗼 감시탑 건설 시작: (${tq},${tr}) — 공병 2턴 이동 불가`,'player');
  cancelSelection();updateHUD();refreshAll();
}

function findConstructionStandSpot(eq,er,tq,tr){
  const options=hexNeighbours(tq,tr).filter(n=>{
    const c=grid[ri(n.q,n.r)];
    if(c.terrain==='mountain'||c.wall)return false;
    if(c.unit&&!(n.q===eq&&n.r===er))return false;
    return !!bfsPathHex(eq,er,n.q,n.r,'p');
  });
  options.sort((a,b)=>hexDist(eq,er,a.q,a.r)-hexDist(eq,er,b.q,b.r));
  return options[0]||null;
}

// ══════════════════════════════════════════════
//  RESERVATIONS
// ══════════════════════════════════════════════
function executeReservations(){
  return executeReservationsAnimated();
}

async function processAutoBuildings(){
  const remaining=[];
  for(const c of pendingBuildings){
    if(c.readyTurn>turn){remaining.push(c);continue;}
    const engineer=grid[ri(c.eq,c.er)].unit;
    if(!engineer||engineer.owner!==c.owner||engineer.name!=='공병'){remaining.push(c);continue;}
    if(!hexNeighbours(c.eq,c.er).some(n=>n.q===c.tq&&n.r===c.tr)){remaining.push(c);continue;}
    if(c.type==='tower'){
      if(!c.started){
        if(engineer.builtThisTurn){remaining.push(c);continue;}
        if(!isValidTowerTarget(c.tq,c.tr))continue;
        if(availableTokens()<3){log('감시탑 자동 건설 토큰 부족 — 다음 턴에 다시 시도','system');remaining.push(c);continue;}
        spendTokens(3);
        engineer.builtThisTurn=true;
        engineer.waitTurns=Math.max(engineer.waitTurns||0,2);
        remaining.push({...c,started:true,completeTurn:turn+2});
        log(`🗼 예약 감시탑 건설 시작: (${c.tq},${c.tr}) — 공병 2턴 이동 불가`,c.owner==='p'?'player':'enemy');
        await delay(120);
        continue;
      }
      if(c.completeTurn>turn){remaining.push(c);continue;}
      if(!isValidTowerTarget(c.tq,c.tr))continue;
      grid[ri(c.tq,c.tr)].tower={owner:c.owner,hp:50,maxHp:50,sight:5};
      log(`🗼 감시탑 완공: (${c.tq},${c.tr}) HP50 탐색5`,c.owner==='p'?'player':'enemy');
      await delay(120);
      continue;
    }
    if(engineer.builtThisTurn){remaining.push(c);continue;}
    if(availableTokens()<2){log('건축물 자동 건설 토큰 부족 — 다음 턴에 다시 시도','system');remaining.push(c);continue;}
    if(c.type==='wall'){
      if(!isValidWallTarget(c.tq,c.tr))continue;
      grid[ri(c.tq,c.tr)].wall={owner:c.owner,hp:200};
      spendTokens(2);engineer.builtThisTurn=true;
      log(`🪵 예약 건축물 자동 건설: 벽 (${c.tq},${c.tr}) HP200`,c.owner==='p'?'player':'enemy');
    } else {
      if(!isValidBridgeTarget(c.tq,c.tr))continue;
      const target=grid[ri(c.tq,c.tr)];
      target.bridge={hp:200};
      if(target.unit)target.unit.waitTurns=0;
      spendTokens(2);engineer.builtThisTurn=true;
      log(`🌉 예약 건축물 자동 건설: 다리 (${c.tq},${c.tr}) HP200`,c.owner==='p'?'player':'enemy');
    }
    await delay(120);
  }
  pendingBuildings=remaining;
  refreshAll();updateHUD();
}

async function executeReservationsAnimated(){
  Object.values(reservations).forEach(res=>{res.movedThisTurnCost=0;});
  let guard=0;
  while((playerReservationQueue.length||aiReservationQueue.length)&&guard++<40){
    const max=Math.max(playerReservationQueue.length,aiReservationQueue.length);
    let movedAny=false;
    for(let i=0;i<max;i++){
      const pKey=playerReservationQueue[i],eKey=aiReservationQueue[i];
      if(pKey&&reservations[pKey]){
        movedAny=(await stepReservation(pKey))||movedAny;
        await delay(120);
      }
      if(eKey&&reservations[eKey]){
        movedAny=(await stepReservation(eKey))||movedAny;
        await delay(120);
      }
      checkWinCondition();
      if(phase!=='battle')return;
    }
    cleanupReservationQueues();
    if(!movedAny)break;
  }
  cleanupReservationQueues();
}

function cleanupReservationQueues(){
  playerReservationQueue=playerReservationQueue.filter(k=>reservations[k]);
  aiReservationQueue=aiReservationQueue.filter(k=>reservations[k]);
}

async function stepReservation(key){
  const res=reservations[key];if(!res)return false;
  const[sq,sr]=key.split(',').map(Number);
  const unit=grid[ri(sq,sr)].unit;
  if(!unit||unit.owner!==res.owner){delete reservations[key];return false;}
  if(unit.waitTurns>0)return false;
  if(res.type==='moveAttack'&&canExecuteReservedAttack(unit,sq,sr,res)){
    await executeReservedAttack(unit,sq,sr,res);
    delete reservations[key];
    return true;
  }
  if(sq===res.tq&&sr===res.tr){delete reservations[key];return false;}
  const path=bfsPathHex(sq,sr,res.tq,res.tr,res.owner);if(!path||path.length===0)return false;
  const step=path[0],dest=grid[ri(step.q,step.r)];
  if(dest.wall||dest.terrain==='mountain'){delete reservations[key];return false;}
  if(dest.unit&&dest.unit.owner===unit.owner){return false;}
  const cost=moveCost(dest);
  if((res.movedThisTurnCost||0)+cost>unit.move)return false;
  if(availableTokens()<cost)return false;
  if(dest.unit&&dest.unit.owner!==unit.owner){
    spendTokens(cost);
    res.movedThisTurnCost=(res.movedThisTurnCost||0)+cost;
    await resolveReservationDuel(unit,dest.unit,sq,sr,step.q,step.r);
    delete reservations[key];
    return true;
  }
  if(dest.tower&&dest.tower.owner!==unit.owner&&!dest.unit){
    dest.tower.owner=unit.owner;
    log(`🗼 ${unit.name} 감시탑 점령 (${step.q},${step.r})`,unit.owner==='p'?'player':'enemy');
  }
  grid[ri(step.q,step.r)].unit=unit;grid[ri(sq,sr)].unit=null;
  spendTokens(cost);
  res.movedThisTurnCost=(res.movedThisTurnCost||0)+cost;
  delete reservations[key];
  if(res.type==='moveAttack'&&step.q===res.tq&&step.r===res.tr){
    await executeReservedAttack(unit,step.q,step.r,res);
  } else if(step.q!==res.tq||step.r!==res.tr){
    const nextKey=`${step.q},${step.r}`;
    reservations[nextKey]={...res};
    replaceReservationKey(key,nextKey,res.owner);
  }
  if(dest.terrain==='river'&&!dest.bridge)unit.waitTurns=2;
  refreshAll();
  return true;
}

function canExecuteReservedAttack(unit,sq,sr,res){
  if(!unit||unit.attackedThisTurn||unit.waitTurns>0)return false;
  const target=grid[ri(res.attackQ,res.attackR)].unit;
  if(!target||target.owner===unit.owner)return false;
  if(hexDist(sq,sr,res.attackQ,res.attackR)>unit.range)return false;
  if(isRangedMountainBlocked(unit,sq,sr,res.attackQ,res.attackR))return false;
  return true;
}

async function executeReservedAttack(unit,sq,sr,res){
  const targetCell=grid[ri(res.attackQ,res.attackR)];
  const target=targetCell.unit;
  if(!target||target.owner===unit.owner){
    log(`📌 공격 예약 취소: 대상 없음 (${res.attackQ},${res.attackR})`,'system');
    return;
  }
  if(unit.attackedThisTurn||unit.waitTurns>0)return;
  if(hexDist(sq,sr,res.attackQ,res.attackR)>unit.range){
    log(`📌 공격 예약 보류: 사거리 초과 (${res.attackQ},${res.attackR})`,'system');
    return;
  }
  if(isRangedMountainBlocked(unit,sq,sr,res.attackQ,res.attackR)){
    log('📌 공격 예약 취소: 산이 사선을 막음','system');
    return;
  }
  await animateCombatHex(res.attackQ,res.attackR);
  log(`📌 예약 공격: ${unit.name} → ${target.name}`,'combat');
  resolveCombat(unit,target,sq,sr,res.attackQ,res.attackR);
  unit.attackedThisTurn=true;
  if(target.hp<=0)targetCell.unit=null;
  if(unit.hp<=0)grid[ri(sq,sr)].unit=null;
  refreshAll();checkWinCondition();
}

function replaceReservationKey(oldKey,newKey,owner){
  const queue=owner==='p'?playerReservationQueue:aiReservationQueue;
  const idx=queue.indexOf(oldKey);
  if(idx>=0)queue[idx]=newKey;
}

async function resolveReservationDuel(atk,def,sq,sr,tq,tr){
  log(`⚔ 예약 충돌 전투: ${atk.name} vs ${def.name}`,'combat');
  while(atk.hp>0&&def.hp>0){
    await animateCombatHex(tq,tr);
    let dmg=Math.max(1,atk.atk-def.def);
    if(atk.name==='창병'&&def.name==='기마병')dmg+=20;
    def.hp-=dmg;
    if(def.hp<=0)break;
    await animateCombatHex(sq,sr);
    let ret=Math.max(1,def.atk-atk.def);
    if(def.name==='창병'&&atk.name==='기마병')ret+=20;
    atk.hp-=ret;
  }
  if(atk.hp>0){
    const dest=grid[ri(tq,tr)];
    if(dest.tower&&dest.tower.owner!==atk.owner){
      dest.tower.owner=atk.owner;
      log(`🗼 ${atk.name} 감시탑 점령 (${tq},${tr})`,atk.owner==='p'?'player':'enemy');
    }
    grid[ri(tq,tr)].unit=atk;grid[ri(sq,sr)].unit=null;
    log(`⚔ ${atk.name} 승리`,atk.owner==='p'?'player':'enemy');
  } else {
    grid[ri(sq,sr)].unit=null;
    log(`⚔ ${def.name} 방어 성공`,def.owner==='p'?'player':'enemy');
  }
  refreshAll();
}

function executeReservationsLegacy(){
  const toDel=[];
  for(const[key,{tq,tr}]of Object.entries(reservations)){
    const[sq,sr]=key.split(',').map(Number);
    const unit=grid[ri(sq,sr)].unit;
    if(!unit||unit.owner!=='p'){toDel.push(key);continue;}
    if(unit.waitTurns>0||unit.movedThisTurn||availableTokens()<1)continue;
    if(sq===tq&&sr===tr){toDel.push(key);continue;}
    const path=bfsPathHex(sq,sr,tq,tr,'p');if(!path||path.length===0)continue;
    let cq=sq,cr=sr,moveSpent=0,moved=false;
    for(const step of path){
      const dest=grid[ri(step.q,step.r)];
      const cost=moveCost(dest);
      if(moveSpent+cost>unit.move||availableTokens()<cost)break;
      if(dest.unit||dest.wall||dest.terrain==='mountain')break;
      grid[ri(step.q,step.r)].unit=unit;grid[ri(cq,cr)].unit=null;
      spendTokens(cost);moveSpent+=cost;moved=true;
      cq=step.q;cr=step.r;
      if(dest.terrain==='river'&&!dest.bridge){
        unit.waitTurns=2;
        log(`🌊 예약이동 강 진입`,'reserve');
        break;
      }
    }
    if(!moved)continue;
    unit.movedThisTurn=true;
    log(`📌 예약이동: ${unit.name} (${sq},${sr})→(${cq},${cr})`,'reserve');
    toDel.push(key);
    if(cq!==tq||cr!==tr)reservations[`${cq},${cr}`]={tq,tr};
  }
  toDel.forEach(k=>delete reservations[k]);
}

// ══════════════════════════════════════════════
