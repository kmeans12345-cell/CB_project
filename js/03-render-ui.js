// ══════════════════════════════════════════════
//  SVG HEX MAP
// ══════════════════════════════════════════════
const NS='http://www.w3.org/2000/svg';
let hexEls={};
let reservationLineG=null;
let combatFxG=null;

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
    .hp.heal{stroke:#4ab8e8;stroke-width:2.5;}
    .hp.unit-p.sel{stroke:#f0cc6e;stroke-width:3;}
    .hp.unit-e.sel{stroke:#f0cc6e;stroke-width:3;}
    .hp.unit-p.hl{stroke:#c8a84b;stroke-width:2.5;}
    .hp.unit-e.hl{stroke:#c8a84b;stroke-width:2.5;}
    .reservation-line{fill:none;stroke-width:2;stroke-dasharray:5,3;pointer-events:none;opacity:0.9;}
    .reservation-line.move{stroke:#3a9a3a;}
    .reservation-line.attack{stroke:#e05050;}
    .reservation-line.e.move{stroke:#e05050;}
    .res-dest-move{fill:#3a9a3a;fill-opacity:0.22;stroke:#3a9a3a;stroke-width:2;pointer-events:none;opacity:0.9;}
    .res-dest-move.e{fill:#e05050;fill-opacity:0.22;stroke:#e05050;}
    .res-dest-atk{fill:#e05050;fill-opacity:0.18;stroke:#e05050;stroke-width:2;stroke-dasharray:3,2;pointer-events:none;opacity:0.9;}
    .res-src-ring{fill:none;stroke-width:1.5;stroke-dasharray:4,2;pointer-events:none;opacity:0.6;}
    .res-src-ring.p{stroke:#4aaa4a;}
    .res-src-ring.e{stroke:#e05050;}
    .combat-line{fill:none;stroke:#ff5050;stroke-width:4;stroke-linecap:round;pointer-events:none;opacity:0;animation:combatLine 0.38s ease-out forwards;}
    .combat-impact{fill:none;stroke:#ffdf70;stroke-width:3;pointer-events:none;opacity:0;animation:combatImpact 0.38s ease-out forwards;}
    @keyframes combatLine{0%{opacity:0;stroke-dasharray:1 180;}25%{opacity:1;}100%{opacity:0;stroke-dasharray:180 1;}}
    @keyframes combatImpact{0%{opacity:0;r:2;}35%{opacity:1;r:7;}100%{opacity:0;r:18;}}
    .ht{pointer-events:none;text-anchor:middle;dominant-baseline:central;font-family:'JetBrains Mono',monospace;}
  `;
  svg.appendChild(style);

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

    // 유닛 아이콘용 컬러 원 배경
    const unitCircle=document.createElementNS(NS,'circle');
    unitCircle.setAttribute('cx',x);unitCircle.setAttribute('cy',y-5);
    unitCircle.setAttribute('r','9');unitCircle.setAttribute('fill','none');
    unitCircle.setAttribute('stroke','none');unitCircle.setAttribute('pointer-events','none');

    // HP 바 배경 (회색)
    const hpBarBg=document.createElementNS(NS,'rect');
    hpBarBg.setAttribute('x',x-9);hpBarBg.setAttribute('y',y+6);
    hpBarBg.setAttribute('width','18');hpBarBg.setAttribute('height','3');
    hpBarBg.setAttribute('rx','1');hpBarBg.setAttribute('fill','none');
    hpBarBg.setAttribute('pointer-events','none');

    // HP 바 채움 (비율에 따라 색상 변화)
    const hpBarFill=document.createElementNS(NS,'rect');
    hpBarFill.setAttribute('x',x-9);hpBarFill.setAttribute('y',y+6);
    hpBarFill.setAttribute('width','0');hpBarFill.setAttribute('height','3');
    hpBarFill.setAttribute('rx','1');hpBarFill.setAttribute('fill','none');
    hpBarFill.setAttribute('pointer-events','none');

    // 좌표/예약 정보 텍스트 (최하단)
    const coord=document.createElementNS(NS,'text');
    coord.setAttribute('x',x);coord.setAttribute('y',y+21);
    coord.setAttribute('class','ht');coord.setAttribute('font-size','6.5');coord.setAttribute('fill','#444');
    coord.textContent=`${q},${r}`;

    // 유닛 약자 or 지형/건축물 이모지 (원 중앙)
    const unitTxt=document.createElementNS(NS,'text');
    unitTxt.setAttribute('x',x);unitTxt.setAttribute('y',y-5);
    unitTxt.setAttribute('class','ht');unitTxt.setAttribute('font-size','14');unitTxt.textContent='';

    // HP 수치 텍스트 (HP바 아래)
    const hpTxt=document.createElementNS(NS,'text');
    hpTxt.setAttribute('x',x);hpTxt.setAttribute('y',y+12);
    hpTxt.setAttribute('class','ht');hpTxt.setAttribute('font-size','6.5');hpTxt.textContent='';

    g.appendChild(poly);g.appendChild(unitCircle);g.appendChild(hpBarBg);g.appendChild(hpBarFill);g.appendChild(coord);g.appendChild(unitTxt);g.appendChild(hpTxt);
    hexG.appendChild(g);
    hexEls[`${q},${r}`]={poly,unitTxt,hpTxt,coord,unitCircle,hpBarBg,hpBarFill,cx:x,cy:y};
  }

  // 예약 라인/마커 그룹: hexG 위, combatFx 아래
  reservationLineG=document.createElementNS(NS,'g');
  svg.appendChild(reservationLineG);

  combatFxG=document.createElementNS(NS,'g');
  svg.appendChild(combatFxG);
}

function refreshHex(q,r){
  const key=`${q},${r}`,el=hexEls[key];if(!el)return;
  const cell=grid[ri(q,r)];const{poly,unitTxt,hpTxt,coord,unitCircle,hpBarBg,hpBarFill}=el;
  const visible=visibleHexes.has(key),explored=exploredHexes.has(key);

  if(!explored){
    poly.setAttribute('fill','#050506');
    poly.setAttribute('class','hp fog');
    unitTxt.textContent='';hpTxt.textContent='';coord.textContent='';
    unitCircle.setAttribute('fill','none');unitCircle.setAttribute('stroke','none');
    hpBarBg.setAttribute('fill','none');hpBarFill.setAttribute('fill','none');
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
  if(cell.unit&&visible){
    cls+=(cell.unit.owner==='p')?' unit-p':' unit-e';
  }
  if(highlighted.has(key))cls+=' hl';
  if(healTargets.has(key))cls+=' heal';
  if(attackTargets.has(key))cls+=' atk';
  if(selectedUnit&&selectedUnit.q===q&&selectedUnit.r===r)cls+=' sel';
  if(Object.values(reservations).some(v=>v.tq===q&&v.tr===r))cls+=' rv';
  poly.setAttribute('class',cls);

  // 매 갱신 시 유닛 전용 요소 초기화 (비유닛 칸에선 숨김)
  unitCircle.setAttribute('fill','none');unitCircle.setAttribute('stroke','none');
  hpBarBg.setAttribute('fill','none');hpBarFill.setAttribute('fill','none');hpBarFill.setAttribute('width','0');
  unitTxt.setAttribute('opacity','1');hpTxt.setAttribute('opacity','1');coord.setAttribute('opacity','1');
  unitTxt.setAttribute('font-size','14');  // 지형/건축물 이모지 기본 크기

  if(cell.unit&&visible){
    const u=cell.unit,def=UNIT_DEFS[u.name];
    const acted=u.movedThisTurn||u.attackedThisTurn;
    const op=acted?'0.4':'1';
    // 컬러 원 배경 (소유자 색상)
    unitCircle.setAttribute('fill',u.owner==='p'?'#1a4a1a':'#4a1a1a');
    unitCircle.setAttribute('stroke',u.owner==='p'?'#3a9a3a':'#e05050');
    unitCircle.setAttribute('stroke-width','1.5');
    unitCircle.setAttribute('opacity',op);
    // 유닛 이모지 (원 중앙, 이모지 아이콘)
    unitTxt.textContent=def.emoji;
    unitTxt.setAttribute('fill','#fff');
    unitTxt.setAttribute('font-size','11');
    unitTxt.setAttribute('opacity',op);
    // HP 바
    const ratio=Math.max(0,u.hp/u.maxHp);
    hpBarBg.setAttribute('fill','#2a2a2a');hpBarBg.setAttribute('opacity',op);
    hpBarFill.setAttribute('width',String(Math.round(18*ratio)));
    hpBarFill.setAttribute('fill',ratio>0.5?'#3a9a3a':ratio>0.25?'#c8a84b':'#e05050');
    hpBarFill.setAttribute('opacity',op);
    // HP 수치 (바 아래 소형 텍스트)
    hpTxt.textContent=`${u.hp}`;
    hpTxt.setAttribute('fill',ratio>0.5?'#7a9a7a':'#e05050');
    hpTxt.setAttribute('opacity',op);
    // 좌표/예약/건축물 정보 (최하단, 이모지 중첩 방지: 건축물은 텍스트로 표시)
    coord.textContent=reservations[key]?((reservations[key].type==='attack'||reservations[key].type==='moveAttack')?`⚔${reservations[key].attackQ},${reservations[key].attackR}`:`→${reservations[key].tq},${reservations[key].tr}`):cell.tower?`탑${cell.tower.hp}`:cell.bridge?`교${cell.bridge.hp}`:`${q},${r}`;
    coord.setAttribute('fill',cell.tower?(cell.tower.owner==='p'?'#3a9a3a':'#e05050'):cell.bridge?'#c8a84b':reservations[key]?'#3a7a3a':'#444');
    coord.setAttribute('opacity',op);
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
  } else {
    // 건설 예약/진행 중인 칸 우선 체크
    const pending=visible?pendingBuildings.find(c=>c.tq===q&&c.tr===r):null;
    if(pending){
      const bEmoji=pending.type==='wall'?'🪵':pending.type==='bridge'?'🌉':'🗼';
      const bColor=pending.owner==='p'?'#4a9a4a':'#c05050';
      if(!pending.started){
        // 공병 이동 중 — 건설 예약됨, 아직 미시작
        unitTxt.textContent=bEmoji;unitTxt.setAttribute('fill','#555');unitTxt.setAttribute('font-size','14');
        hpTxt.textContent='예약';hpTxt.setAttribute('fill','#555');
        coord.textContent=`${q},${r}`;coord.setAttribute('fill','#444');
      } else {
        // 건설 진행 중 — 진행바 + 남은 턴 표시
        const totalTurns=pending.type==='wall'?1:pending.type==='bridge'?3:2;
        const turnsLeft=Math.max(0,pending.completeTurn-turn);
        const ratio=totalTurns>0?Math.min(1,(totalTurns-turnsLeft)/totalTurns):1;
        unitTxt.textContent=bEmoji;unitTxt.setAttribute('fill',bColor);unitTxt.setAttribute('font-size','14');
        hpBarBg.setAttribute('fill','#2a2a2a');
        hpBarFill.setAttribute('fill','#c8a84b');
        hpBarFill.setAttribute('width',String(Math.round(18*ratio)));
        hpTxt.textContent=`${turnsLeft}턴`;hpTxt.setAttribute('fill','#c8a84b');
        coord.textContent='건설중';coord.setAttribute('fill',bColor);
      }
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
}

function refreshAll(){updateVision();for(let r=0;r<ROWS;r++)for(let q=0;q<COLS;q++)refreshHex(q,r);renderReservationLines();updateScoreBar();renderReserveList();}
function clearHighlights(){highlighted.clear();attackTargets.clear();healTargets.clear();refreshAll();}

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
    if(res.owner==='e')return; // 적 예약 경로는 표시하지 않음
    const[sq,sr]=key.split(',').map(Number);
    if(res.type==='attack'){
      appendReservationLine([{q:sq,r:sr},{q:res.attackQ,r:res.attackR}],res,'attack');
      appendReservationMarker(res.attackQ,res.attackR,'atk',res.owner);
      appendReservationSrcRing(sq,sr,res.owner);
      return;
    }
    // 안개 속 지형 노출 방지: BFS 우회 경로 대신 출발→목적지 직선으로만 표시
    appendReservationLine([{q:sq,r:sr},{q:res.tq,r:res.tr}],res,'move');
    appendReservationMarker(res.tq,res.tr,'move',res.owner);
    appendReservationSrcRing(sq,sr,res.owner);
    if(res.type==='moveAttack'){
      appendReservationLine([{q:sq,r:sr},{q:res.attackQ,r:res.attackR}],res,'attack');
      appendReservationMarker(res.attackQ,res.attackR,'atk',res.owner);
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

function appendReservationMarker(q,r,type,owner){
  const{x,y}=hexCenter(q,r);
  const circle=document.createElementNS(NS,'circle');
  circle.setAttribute('cx',x);circle.setAttribute('cy',y);
  circle.setAttribute('r','9');
  circle.setAttribute('class',type==='atk'?'res-dest-atk':`res-dest-move${owner==='e'?' e':''}`);
  reservationLineG.appendChild(circle);
}

function appendReservationSrcRing(q,r,owner){
  const{x,y}=hexCenter(q,r);
  const ring=document.createElementNS(NS,'circle');
  ring.setAttribute('cx',x);ring.setAttribute('cy',y-5); // 유닛 원 중심에 정렬
  ring.setAttribute('r','13');
  ring.setAttribute('class',`res-src-ring ${owner==='e'?'e':'p'}`);
  reservationLineG.appendChild(ring);
}

function animateCombat(sq,sr,tq,tr){
  if(!combatFxG)return Promise.resolve();
  const a=hexCenter(sq,sr),b=hexCenter(tq,tr);
  const line=document.createElementNS(NS,'line');
  line.setAttribute('class','combat-line');
  line.setAttribute('x1',a.x);line.setAttribute('y1',a.y);
  line.setAttribute('x2',b.x);line.setAttribute('y2',b.y);
  const impact=document.createElementNS(NS,'circle');
  impact.setAttribute('class','combat-impact');
  impact.setAttribute('cx',b.x);impact.setAttribute('cy',b.y);impact.setAttribute('r','2');
  combatFxG.appendChild(line);combatFxG.appendChild(impact);
  return new Promise(resolve=>setTimeout(()=>{
    line.remove();impact.remove();resolve();
  },390));
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
