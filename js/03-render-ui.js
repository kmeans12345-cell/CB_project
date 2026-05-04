// ══════════════════════════════════════════════
//  SVG HEX MAP
// ══════════════════════════════════════════════
const NS='http://www.w3.org/2000/svg';
let hexEls={};
let reservationLineG=null;

function initSVG(){
  const svg=document.getElementById('hex-svg');
  svg.innerHTML='';hexEls={};
  const totalW=COLS*HX_STEP+HX_OFF+8;
  const totalH=ROWS*HY_STEP+HH*0.25+8;
  svg.setAttribute('width',totalW);svg.setAttribute('height',totalH);

  const style=document.createElementNS(NS,'style');
  style.textContent=`
    .hp{stroke:#2a2a2e;stroke-width:1;cursor:pointer;transition:fill 0.08s;}
    .hp:hover{filter:brightness(1.35);}
    .hp.sel{stroke:#f0cc6e;stroke-width:3;}
    .hp.hl{stroke:#c8a84b;stroke-width:2;fill-opacity:1;}
    .hp.atk{stroke:#e05050;stroke-width:2.5;}
    .hp.rv{stroke:#3a7a3a;stroke-width:2;}
    .hp.fog{fill:#050506;stroke:#101012;}
    .hp.memory{filter:brightness(0.45) saturate(0.7);}
    .hp.sp{stroke:#c8a84b;stroke-width:2;stroke-dasharray:5,2;}
    .hp.se{stroke:#e05050;stroke-width:2;stroke-dasharray:5,2;}
    .hp.unit-p{stroke:#3a9a3a;stroke-width:2.5;}
    .hp.unit-e{stroke:#e05050;stroke-width:2.5;}
    .hp.unit-p.sel{stroke:#f0cc6e;stroke-width:3;}
    .hp.unit-e.sel{stroke:#f0cc6e;stroke-width:3;}
    .hp.unit-p.hl{stroke:#c8a84b;stroke-width:2.5;}
    .hp.unit-e.hl{stroke:#c8a84b;stroke-width:2.5;}
    .reservation-line{fill:none;stroke-width:2;stroke-dasharray:5,3;pointer-events:none;opacity:0.9;}
    .reservation-line.move{stroke:#3a9a3a;}
    .reservation-line.attack{stroke:#e05050;}
    .reservation-line.e.move{stroke:#e05050;}
    .ht{pointer-events:none;text-anchor:middle;dominant-baseline:central;font-family:'JetBrains Mono',monospace;}
  `;
  svg.appendChild(style);

  reservationLineG=document.createElementNS(NS,'g');
  svg.appendChild(reservationLineG);

  const hexG=document.createElementNS(NS,'g');
  svg.appendChild(hexG);

  for(let r=0;r<ROWS;r++)for(let q=0;q<COLS;q++){
    const{x,y}=hexCenter(q,r);
    const g=document.createElementNS(NS,'g');
    const poly=document.createElementNS(NS,'polygon');
    poly.setAttribute('points',hexPoints(x,y));
    poly.setAttribute('class','hp');
    poly.setAttribute('fill','#1b1b1d');
    poly.dataset.q=q;poly.dataset.r=r;
    poly.addEventListener('click',()=>onHexClick(q,r));
    poly.addEventListener('mouseenter',()=>onHexHover(q,r));
    poly.addEventListener('mouseleave',()=>onHexLeave());

    const coord=document.createElementNS(NS,'text');
    coord.setAttribute('x',x);coord.setAttribute('y',y+HEX_SIZE*0.62);
    coord.setAttribute('class','ht');coord.setAttribute('font-size','7');coord.setAttribute('fill','#444');
    coord.textContent=`${q},${r}`;

    const unitTxt=document.createElementNS(NS,'text');
    unitTxt.setAttribute('x',x);unitTxt.setAttribute('y',y-2);
    unitTxt.setAttribute('class','ht');unitTxt.setAttribute('font-size','14');unitTxt.textContent='';

    const hpTxt=document.createElementNS(NS,'text');
    hpTxt.setAttribute('x',x);hpTxt.setAttribute('y',y+HEX_SIZE*0.35);
    hpTxt.setAttribute('class','ht');hpTxt.setAttribute('font-size','7');hpTxt.textContent='';

    g.appendChild(poly);g.appendChild(coord);g.appendChild(unitTxt);g.appendChild(hpTxt);
    hexG.appendChild(g);
    hexEls[`${q},${r}`]={poly,unitTxt,hpTxt,coord,cx:x,cy:y};
  }
}

function refreshHex(q,r){
  const key=`${q},${r}`,el=hexEls[key];if(!el)return;
  const cell=grid[ri(q,r)];const{poly,unitTxt,hpTxt,coord}=el;
  const visible=visibleHexes.has(key),explored=exploredHexes.has(key);

  if(!explored){
    poly.setAttribute('fill','#050506');
    poly.setAttribute('class','hp fog');
    unitTxt.textContent='';hpTxt.textContent='';coord.textContent='';
    return;
  }

  let fill='#1b1b1d';
  if(cell.terrain==='river')fill='#1a3a5a';
  else if(cell.terrain==='mountain')fill='#2a2020';
  else if(phase==='battle'&&isPlayerDeploy(q,r))fill='#1e2a1a';
  poly.setAttribute('fill',fill);

  let cls='hp';
  if(!visible)cls+=' memory';
  if(q===PLAYER_START.q&&r===PLAYER_START.r)cls+=' sp';
  else if(q===ENEMY_START.q&&r===ENEMY_START.r)cls+=' se';
  // FIX 1: unit border color by owner
  if(cell.unit){
    cls+=(cell.unit.owner==='p')?' unit-p':' unit-e';
  }
  if(highlighted.has(key))cls+=' hl';
  if(attackTargets.has(key))cls+=' atk';
  if(selectedUnit&&selectedUnit.q===q&&selectedUnit.r===r)cls+=' sel';
  if(Object.values(reservations).some(v=>v.tq===q&&v.tr===r))cls+=' rv';
  poly.setAttribute('class',cls);

  if(cell.unit&&visible){
    const u=cell.unit,def=UNIT_DEFS[u.name];
    unitTxt.textContent=def.emoji;
    unitTxt.setAttribute('fill',u.owner==='p'?'#f0cc6e':'#e05050');
    unitTxt.setAttribute('opacity',(u.movedThisTurn||u.attackedThisTurn)?'0.45':'1');
    hpTxt.textContent=`${u.hp}HP`;
    hpTxt.setAttribute('fill',u.hp/u.maxHp>0.5?'#888':'#e05050');
    coord.textContent=reservations[key]?((reservations[key].type==='attack'||reservations[key].type==='moveAttack')?`⚔${reservations[key].attackQ},${reservations[key].attackR}`:`→${reservations[key].tq},${reservations[key].tr}`):cell.tower?`🗼${cell.tower.hp}`:cell.bridge?`🌉${cell.bridge.hp}`:`${q},${r}`;
    coord.setAttribute('fill',cell.tower?(cell.tower.owner==='p'?'#3a9a3a':'#e05050'):cell.bridge?'#c8a84b':reservations[key]?'#3a7a3a':'#444');
  } else if(cell.wall&&visible){
    unitTxt.textContent=cell.wall.owner==='p'?'🪵':'🧱';unitTxt.setAttribute('fill','#888');
    hpTxt.textContent=`HP${cell.wall.hp}`;hpTxt.setAttribute('fill','#666');
    coord.textContent=`${q},${r}`;coord.setAttribute('fill','#444');
  } else if(cell.bridge&&visible){
    unitTxt.textContent='🌉';unitTxt.setAttribute('fill','#c8a84b');
    hpTxt.textContent=`HP${cell.bridge.hp}`;hpTxt.setAttribute('fill','#c8a84b');
    coord.textContent=`${q},${r}`;coord.setAttribute('fill','#c8a84b');
  } else if(cell.tower&&visible){
    unitTxt.textContent='🗼';unitTxt.setAttribute('fill',cell.tower.owner==='p'?'#3a9a3a':'#e05050');
    hpTxt.textContent=`HP${cell.tower.hp}`;hpTxt.setAttribute('fill',cell.tower.hp/cell.tower.maxHp>0.5?'#888':'#e05050');
    coord.textContent=`탐${cell.tower.sight}`;coord.setAttribute('fill',cell.tower.owner==='p'?'#3a9a3a':'#e05050');
  } else if(cell.terrain==='river'){
    unitTxt.textContent='🌊';unitTxt.setAttribute('fill','#5a8ab0');hpTxt.textContent='';
    coord.textContent=`${q},${r}`;coord.setAttribute('fill','#444');
  } else if(cell.terrain==='mountain'){
    unitTxt.textContent='⛰️';unitTxt.setAttribute('fill','#887');hpTxt.textContent='';
    coord.textContent=`${q},${r}`;coord.setAttribute('fill','#444');
  } else {
    unitTxt.textContent='';hpTxt.textContent='';
    coord.textContent=`${q},${r}`;coord.setAttribute('fill','#444');
  }
}

function refreshAll(){updateVision();for(let r=0;r<ROWS;r++)for(let q=0;q<COLS;q++)refreshHex(q,r);renderReservationLines();updateScoreBar();renderReserveList();}
function clearHighlights(){highlighted.clear();attackTargets.clear();refreshAll();}

function updateVision(){
  visibleHexes.clear();
  grid.forEach((cell,i)=>{
    const uq=i%COLS,ur=Math.floor(i/COLS);
    const reveal=(sight)=>{
      for(let r=0;r<ROWS;r++)for(let q=0;q<COLS;q++){
        if(hexDist(uq,ur,q,r)<=sight){
          const key=`${q},${r}`;
          visibleHexes.add(key);exploredHexes.add(key);
        }
      }
    };
    if(cell.unit&&cell.unit.owner==='p')reveal(unitSight(cell.unit));
    if(cell.tower&&cell.tower.owner==='p')reveal(cell.tower.sight);
  });
}

function renderReservationLines(){
  if(!reservationLineG)return;
  reservationLineG.innerHTML='';
  Object.entries(reservations).forEach(([key,res])=>{
    const[sq,sr]=key.split(',').map(Number);
    if(res.type==='attack'){
      appendReservationLine([{q:sq,r:sr},{q:res.attackQ,r:res.attackR}],res,'attack');
      return;
    }
    const path=bfsPathHex(sq,sr,res.tq,res.tr,res.owner);
    if(path&&path.length>0)appendReservationLine([{q:sq,r:sr},...path],res,'move');
    if(res.type==='moveAttack'){
      appendReservationLine([{q:sq,r:sr},{q:res.attackQ,r:res.attackR}],res,'attack');
    }
  });
}

function appendReservationLine(hexes,res,type){
  const points=hexes.map(({q,r})=>{
    const{x,y}=hexCenter(q,r);return `${x},${y}`;
  }).join(' ');
  const line=document.createElementNS(NS,'polyline');
  line.setAttribute('class',`reservation-line ${type} ${res.owner==='e'?'e':'p'}`);
  line.setAttribute('points',points);
  reservationLineG.appendChild(line);
}

// ══════════════════════════════════════════════
//  TOOLTIP
// ══════════════════════════════════════════════
const tooltip=document.getElementById('hex-tooltip');
function onHexHover(q,r){
  const cell=grid[ri(q,r)];
  const key=`${q},${r}`;
  if(!exploredHexes.has(key)){tooltip.textContent='미탐색 지역';tooltip.style.display='block';return;}
  let txt=`(${q},${r})`;
  if(cell.terrain)txt+=` | ${cell.terrain==='river'?'🌊 강':'⛰️ 산'}`;
  if(visibleHexes.has(key)&&cell.bridge)txt+=` | 🌉 다리 HP${cell.bridge.hp}`;
  if(visibleHexes.has(key)&&cell.tower)txt+=` | 🗼 감시탑 HP${cell.tower.hp} 탐${cell.tower.sight} [${cell.tower.owner==='p'?'아군':'적'}]`;
  if(visibleHexes.has(key)&&cell.unit)txt+=` | ${cell.unit.name} HP${cell.unit.hp} [${cell.unit.owner==='p'?'아군':'적'}]`;
  tooltip.textContent=txt;tooltip.style.display='block';
}
document.addEventListener('mousemove',e=>{tooltip.style.left=e.clientX+12+'px';tooltip.style.top=e.clientY+8+'px';});
function onHexLeave(){tooltip.style.display='none';}

// ══════════════════════════════════════════════
//  HUD
// ══════════════════════════════════════════════
function updateHUD(){
  document.getElementById('token-val').textContent=tokens;
  document.getElementById('piggy-val').textContent=piggy;
  document.getElementById('turn-num').textContent=turn;
  document.getElementById('mtn-count').textContent=obsCurrentTurn==='p'?pMtnLeft:eMtnLeft;
  document.getElementById('river-count').textContent=obsCurrentTurn==='p'?pRivLeft:eRivLeft;
}
function updateScoreBar(){
  let p=0,e=0;grid.forEach(c=>{if(c.unit){if(c.unit.owner==='p')p++;else e++;}});
  const pKing=grid[ri(PLAYER_START.q,PLAYER_START.r)].unit;
  const eKing=grid[ri(ENEMY_START.q,ENEMY_START.r)].unit;
  const pHp=pKing&&pKing.name==='킹'?pKing.hp:0;
  const eHp=eKing&&eKing.name==='킹'?eKing.hp:0;
  document.getElementById('p-count').textContent=p;
  document.getElementById('e-count').textContent=e;
  document.getElementById('p-base-hp').textContent=pHp;
  document.getElementById('e-base-hp').textContent=eHp;
  document.getElementById('p-base-hp').style.color=pHp<80?'#e05050':pHp<140?'#c8a84b':'#5aba5a';
  document.getElementById('e-base-hp').style.color=eHp<80?'#ff6060':eHp<140?'#e07070':'#e05050';
}
function renderHand(){
  const area=document.getElementById('hand-area');area.innerHTML='';
  document.getElementById('deck-count').textContent=`덱 ${playerDeck.length}장`;
  playerHand.forEach(card=>{
    const def=UNIT_DEFS[card.type];
    const div=document.createElement('div');
    div.className='hand-card'+(card===selectedCard?' selected':'')+(def.cost>availableTokens()?' disabled':'');
    div.innerHTML=`<div class="card-cost">${def.cost}</div>
      <div class="card-name">${def.emoji} ${card.type}</div>
      <div class="card-stats">공${def.atk} 방${def.def} HP${def.hp} 이동${def.move} 탐${def.sight}</div>
      <div class="card-special">${def.special}</div>`;
    div.onclick=()=>selectCard(card);area.appendChild(div);
  });
}
function renderReserveList(){
  if(phase!=='battle')return;
  document.getElementById('reserve-panel').style.display='block';
  const list=document.getElementById('reserve-list');
  const entries=playerReservationQueue.map(key=>[key,reservations[key]]).filter(([,res])=>res&&res.owner==='p');list.innerHTML='';
  if(!entries.length){list.innerHTML='<div style="font-size:9px;color:var(--text3)">예약 없음</div>';return;}
  entries.forEach(([key,res])=>{
    const{tq,tr}=res;
    const[sq,sr]=key.split(',').map(Number);const u=grid[ri(sq,sr)].unit;
    if(!u){delete reservations[key];return;}
    const item=document.createElement('div');item.className='reserve-item';
    const label=res.type==='attack'?`⚔(${res.attackQ},${res.attackR})`:res.type==='moveAttack'?`⚔(${res.attackQ},${res.attackR}) via (${tq},${tr})`:`→(${tq},${tr})`;
    item.innerHTML=`<span>${UNIT_DEFS[u.name].emoji}${u.name.slice(0,2)} ${label}</span>`;
    const del=document.createElement('button');del.textContent='✕';
    del.onclick=()=>{delete reservations[key];playerReservationQueue=playerReservationQueue.filter(k=>k!==key);refreshAll();};
    item.appendChild(del);list.appendChild(item);
  });
}
function showUnitInfo(def,name,unit=null,q=-1,r=-1){
  const hp=unit?unit.hp:def.hp,maxHp=unit?unit.maxHp:def.hp;
  const key=`${q},${r}`,res=reservations[key];
  document.getElementById('unit-info').innerHTML=`
    <div class="info-name">${def.emoji} ${name}</div>
    <div class="info-row"><span class="label">코스트</span><span class="value">${def.cost}</span></div>
    <div class="info-row"><span class="label">공격</span><span class="value">${def.atk}</span></div>
    <div class="info-row"><span class="label">방어</span><span class="value">${def.def}</span></div>
    <div class="info-row"><span class="label">HP</span><span class="value">${hp}/${maxHp}</span></div>
    <div class="info-row"><span class="label">이동</span><span class="value">${def.move}칸</span></div>
    <div class="info-row"><span class="label">사거리</span><span class="value">${def.range}칸</span></div>
    <div class="info-row"><span class="label">탐지</span><span class="value">${def.sight}칸</span></div>
    ${unit&&unit.waitTurns>0?`<div class="info-row"><span class="label">대기</span><span class="value" style="color:#3a5a8a">${unit.waitTurns}턴</span></div>`:''}
    ${unit&&unit.movedThisTurn?`<div class="info-row"><span class="label">상태</span><span class="value" style="color:#555">이동 완료</span></div>`:''}
    ${unit&&unit.attackedThisTurn?`<div class="info-row"><span class="label">상태</span><span class="value" style="color:#555">공격 완료</span></div>`:''}
    <div class="info-special">${def.special}</div>
    ${res?`<div class="info-reserve">📌 예약: →(${res.tq},${res.tr})</div>`:''}`;
}

// ══════════════════════════════════════════════
//  OBSTACLE PLACEMENT UI STATE
// ══════════════════════════════════════════════
function updateObsPanel(){
  const isP=obsCurrentTurn==='p';
  const lbl=document.getElementById('obs-turn-label');
  lbl.textContent=isP?'🟡 나 (플레이어)':'🔴 AI';
  lbl.className='obs-turn-val '+(isP?'p-turn':'e-turn');
  document.getElementById('obs-phase-label').textContent=obsPhase==='mountain'?'⛰️ 산 배치':'🌊 강 배치';
  document.getElementById('mtn-count').textContent=isP?pMtnLeft:eMtnLeft;
  document.getElementById('river-count').textContent=isP?pRivLeft:eRivLeft;

  if(obsPhase==='mountain'){
    document.getElementById('obs-rules-text').textContent=
      '• 자기 진영 절반에만 배치\n• 산은 개별 배치 가능\n• 시작 지점 2칸 이내 불가\n• 최대 5개';
  } else {
    document.getElementById('obs-rules-text').textContent=
      '• 자기 진영 절반에만 배치\n• 첫 강은 반드시 산에 인접\n• 강은 이어서 5개 연결 필수\n• 최대 5개';
  }

  // show/hide skip button — only player's turn
  document.getElementById('btn-skip-obs').style.display=isP?'block':'none';
  document.getElementById('btn-end-turn').style.display='none';
}
