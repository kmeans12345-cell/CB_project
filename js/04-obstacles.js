// ══════════════════════════════════════════════
//  RANDOM OBSTACLE SETUP
// ══════════════════════════════════════════════
function startObsPhase(){
  phase='obs-random';obsPhase='random';
  document.getElementById('obs-status').style.display='none';
  document.getElementById('btn-skip-obs').style.display='none';
  document.getElementById('phase-label').textContent='장애물 자동 배치';
  document.getElementById('phase-text').textContent='산과 강을 무작위로 배치 중...';
  setHint('시작 지점 주변을 제외한 빈 칸에 산과 강을 자동 배치합니다.');
  log('전투 전 장애물 자동 배치 시작','system');
  randomizeObstacles();
  refreshAll();updateHUD();
  setTimeout(()=>startBattle(),500);
}

function randomObstacleCandidates(){
  const spots=[];
  for(let r=0;r<ROWS;r++)for(let q=0;q<COLS;q++){
    if(isDeployNoGo(q,r))continue;
    if(grid[ri(q,r)].terrain)continue;
    spots.push({q,r});
  }
  return spots;
}

function placeRandomTerrain(type,count,store){
  let placed=0;
  for(let i=0;i<count;i++){
    const spots=randomObstacleCandidates();
    if(!spots.length)break;
    const pick=spots[Math.floor(Math.random()*spots.length)];
    grid[ri(pick.q,pick.r)].terrain=type;
    store.push(pick);
    placed++;
  }
  return placed;
}

function randomizeObstacles(){
  pMtnPlaced=[];eMtnPlaced=[];pRivPlaced=[];eRivPlaced=[];
  const mountains=placeRandomTerrain('mountain',MTN_QUOTA*2,pMtnPlaced);
  const rivers=placeRandomTerrain('river',RIV_QUOTA*2,pRivPlaced);
  pMtnLeft=eMtnLeft=pRivLeft=eRivLeft=0;
  log(`⛰️ 산 ${mountains}개 / 🌊 강 ${rivers}개 무작위 배치 완료`,'system');
}

function obsDoTurn(){
  updateObsPanel();
  if(obsCurrentTurn==='p'){
    // Player's turn — show valid hexes
    highlightObsValid();
    const left=obsPhase==='mountain'?pMtnLeft:pRivLeft;
    if(left===0){skipObsTurn();return;}
    document.getElementById('btn-skip-obs').style.display='block';
    setHint(obsPhase==='mountain'
      ?`⛰️ 산을 배치할 헥스를 클릭하세요 (남은 산: ${pMtnLeft}개)\n자기 진영(아군 구역) 내에만 가능`
      :`🌊 강을 배치할 헥스를 클릭하세요 (남은 강: ${pRivLeft}개)\n첫 강은 산에 인접, 이후는 연결 배치`,true);
    document.getElementById('phase-text').textContent=
      `내 턴 — ${obsPhase==='mountain'?'⛰️ 산':'🌊 강'} 배치`;
  } else {
    // AI's turn
    document.getElementById('btn-skip-obs').style.display='none';
    document.getElementById('phase-text').textContent=`AI 턴 — ${obsPhase==='mountain'?'⛰️ 산':'🌊 강'} 배치`;
    setHint('AI가 배치 중입니다...');
    highlighted.clear();attackTargets.clear();refreshAll();
    setTimeout(()=>aiObsPlace(),600);
  }
}

function highlightObsValid(){
  highlighted.clear();
  const isP=obsCurrentTurn==='p';
  for(let r=0;r<ROWS;r++)for(let q=0;q<COLS;q++){
    if(isDeployNoGo(q,r))continue;
    if(grid[ri(q,r)].terrain)continue;
    // zone restriction
    if(isP&&!playerZone(q,r))continue;
    if(!isP&&!enemyZone(q,r))continue;
    if(obsPhase==='mountain'){
      highlighted.add(`${q},${r}`);
    } else {
      // river: first tile must be adjacent to own mountain, subsequent must connect to own river chain
      if(isP){
        if(pRivPlaced.length===0){
          // first river must be adjacent to own mountain
          if(pMtnPlaced.some(m=>hexNeighbours(m.q,m.r).some(n=>n.q===q&&n.r===r)))
            highlighted.add(`${q},${r}`);
        } else {
          // must connect to existing river chain
          if(pRivPlaced.some(rv=>hexNeighbours(rv.q,rv.r).some(n=>n.q===q&&n.r===r)))
            highlighted.add(`${q},${r}`);
        }
      } else {
        if(eRivPlaced.length===0){
          if(eMtnPlaced.some(m=>hexNeighbours(m.q,m.r).some(n=>n.q===q&&n.r===r)))
            highlighted.add(`${q},${r}`);
        } else {
          if(eRivPlaced.some(rv=>hexNeighbours(rv.q,rv.r).some(n=>n.q===q&&n.r===r)))
            highlighted.add(`${q},${r}`);
        }
      }
    }
  }
  refreshAll();
}

// ── Player places obstacle ────────────────────
function playerPlaceObs(q,r){
  if(obsCurrentTurn!=='p')return;
  if(isDeployNoGo(q,r)){log('시작 지점 주변 2칸 이내 배치 불가','system');return;}
  if(!playerZone(q,r)){log('자기 진영에만 배치 가능','system');return;}
  if(grid[ri(q,r)].terrain){log('이미 지형이 있습니다','system');return;}

  if(obsPhase==='mountain'){
    if(pMtnLeft<=0){log('산 배치 완료','system');return;}
    grid[ri(q,r)].terrain='mountain';pMtnLeft--;pMtnPlaced.push({q,r});
    log(`⛰️ 산 배치 (${q},${r})  남은: ${pMtnLeft}개`,'player');
  } else {
    if(pRivLeft<=0){log('강 배치 완료','system');return;}
    // validate river placement
    if(pRivPlaced.length===0){
      if(!pMtnPlaced.some(m=>hexNeighbours(m.q,m.r).some(n=>n.q===q&&n.r===r))){
        log('첫 강은 반드시 아군 산에 인접해야 합니다','system');return;
      }
    } else {
      if(!pRivPlaced.some(rv=>hexNeighbours(rv.q,rv.r).some(n=>n.q===q&&n.r===r))){
        log('강은 기존 강에 연결하여 배치해야 합니다','system');return;
      }
    }
    grid[ri(q,r)].terrain='river';pRivLeft--;pRivPlaced.push({q,r});
    log(`🌊 강 배치 (${q},${r})  남은: ${pRivLeft}개`,'player');
  }
  consecutiveSkips=0;
  refreshAll();updateHUD();
  obsNextTurn();
}

// ── Skip obs turn ─────────────────────────────
function skipObsTurn(){
  if(obsCurrentTurn!=='p')return;
  log(`${obsPhase==='mountain'?'⛰️ 산':'🌊 강'} 배치 턴 건너뜀`,'system');
  consecutiveSkips++;
  obsNextTurn();
}

// ── Next obs turn ─────────────────────────────
function obsNextTurn(){
  // Alternate turns
  obsCurrentTurn=obsCurrentTurn==='p'?'e':'p';

  // Check if mountain phase is done: both players have 0 left OR both skipped
  const mtnDone=(pMtnLeft===0&&eMtnLeft===0)||(consecutiveSkips>=2);
  const rivDone=(pRivLeft===0&&eRivLeft===0)||(consecutiveSkips>=2&&obsPhase==='river');

  if(obsPhase==='mountain'&&mtnDone){
    consecutiveSkips=0;
    obsPhase='river';phase='obs-river';
    log('⛰️ 산 배치 완료 → 🌊 강 배치 시작!','system');
    // Reset to first player for river phase
    obsCurrentTurn=obsFirstPlayer;
    updateObsPanel();
    obsDoTurn();return;
  }
  if(obsPhase==='river'&&rivDone){
    // Both done → start battle
    startBattle();return;
  }

  // Skip player if they have nothing left to place
  if(obsPhase==='mountain'){
    if(obsCurrentTurn==='p'&&pMtnLeft===0){obsCurrentTurn='e';}
    else if(obsCurrentTurn==='e'&&eMtnLeft===0){obsCurrentTurn='p';}
  } else {
    if(obsCurrentTurn==='p'&&pRivLeft===0){obsCurrentTurn='e';}
    else if(obsCurrentTurn==='e'&&eRivLeft===0){obsCurrentTurn='p';}
  }

  obsDoTurn();
}

// ── AI places obstacle ───────────────────────
function aiObsPlace(){
  const isRiver=obsPhase==='river';
  let placed=false;

  if(isRiver){
    // AI river placement
    const valid=[];
    for(let r=0;r<ROWS;r++)for(let q=0;q<COLS;q++){
      if(isDeployNoGo(q,r)||!enemyZone(q,r)||grid[ri(q,r)].terrain)continue;
      if(eRivPlaced.length===0){
        if(eMtnPlaced.some(m=>hexNeighbours(m.q,m.r).some(n=>n.q===q&&n.r===r)))valid.push({q,r});
      } else {
        if(eRivPlaced.some(rv=>hexNeighbours(rv.q,rv.r).some(n=>n.q===q&&n.r===r)))valid.push({q,r});
      }
    }
    if(valid.length>0&&eRivLeft>0){
      const pick=valid[Math.floor(Math.random()*valid.length)];
      grid[ri(pick.q,pick.r)].terrain='river';eRivLeft--;eRivPlaced.push(pick);
      log(`AI 🌊 강 배치 (${pick.q},${pick.r})  남은: ${eRivLeft}개`,'enemy');
      placed=true;
    }
  } else {
    // AI mountain placement (any valid enemy zone hex)
    const valid=[];
    for(let r=0;r<ROWS;r++)for(let q=0;q<COLS;q++){
      if(!isDeployNoGo(q,r)&&enemyZone(q,r)&&!grid[ri(q,r)].terrain)valid.push({q,r});
    }
    if(valid.length>0&&eMtnLeft>0){
      const pick=valid[Math.floor(Math.random()*valid.length)];
      grid[ri(pick.q,pick.r)].terrain='mountain';eMtnLeft--;eMtnPlaced.push(pick);
      log(`AI ⛰️ 산 배치 (${pick.q},${pick.r})  남은: ${eMtnLeft}개`,'enemy');
      placed=true;
    }
  }

  if(!placed){log(`AI ${isRiver?'강':'산'} 배치 건너뜀`,'system');consecutiveSkips++;}
  else{consecutiveSkips=0;}

  refreshAll();updateHUD();
  obsNextTurn();
}

// ══════════════════════════════════════════════
//  START BATTLE
// ══════════════════════════════════════════════
function startBattle(){
  phase='battle';
  document.getElementById('obs-status').style.display='none';
  document.getElementById('reserve-panel').style.display='block';
  document.getElementById('btn-skip-obs').style.display='none';
  document.getElementById('btn-end-turn').style.display='block';
  document.getElementById('btn-end-turn').textContent='턴 종료';
  document.getElementById('phase-label').textContent='전투 단계';
  document.getElementById('phase-text').textContent=`전투 시작 — 턴 ${turn}/${MAX_TURNS}`;
  highlighted.clear();attackTargets.clear();
  refreshAll();renderHand();updateHUD();
  log('⚔ 전투 단계 시작!','system');
  setHint('기물 카드를 선택해 배치하거나, 기물을 클릭해 이동/공격하세요');
}
