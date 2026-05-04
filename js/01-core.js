// ══════════════════════════════════════════════
//  HEX GEOMETRY (offset, even-r, pointy-top)
// ══════════════════════════════════════════════
const COLS=10, ROWS=10;
const HEX_SIZE=30;
const HW=HEX_SIZE*Math.sqrt(3);
const HH=HEX_SIZE*2;
const HX_STEP=HW;
const HY_STEP=HH*0.75;
const HX_OFF=HW/2;

function hexCenter(q,r){
  const x=q*HX_STEP+(r%2===1?HX_OFF:0)+HW/2+4;
  const y=r*HY_STEP+HH/2+4;
  return{x,y};
}
function hexPoints(cx,cy){
  const pts=[];
  for(let i=0;i<6;i++){
    const a=Math.PI/180*(60*i-30);
    pts.push(`${(cx+HEX_SIZE*Math.cos(a)).toFixed(1)},${(cy+HEX_SIZE*Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}
function hexNeighbours(q,r){
  const even=r%2===0;
  const dirs=even?[[-1,-1],[0,-1],[-1,0],[1,0],[-1,1],[0,1]]:[[0,-1],[1,-1],[-1,0],[1,0],[0,1],[1,1]];
  return dirs.map(([dq,dr])=>({q:q+dq,r:r+dr})).filter(n=>inBounds(n.q,n.r));
}
function hexDist(q1,r1,q2,r2){
  const ax=q1-(r1-(r1&1))/2,az=r1,ay=-ax-az;
  const bx=q2-(r2-(r2&1))/2,bz=r2,by=-bx-bz;
  return Math.max(Math.abs(ax-bx),Math.abs(ay-by),Math.abs(az-bz));
}
function offsetToCube(q,r){
  const x=q-(r-(r&1))/2,z=r,y=-x-z;
  return{x,y,z};
}
function cubeToOffset(x,y,z){
  return{q:x+(z-(z&1))/2,r:z};
}
function moveCost(cell){
  return cell.terrain==='river'&&!cell.bridge?2:1;
}
function unitSight(unit){
  if(!unit)return 0;
  return unit.sight??UNIT_DEFS[unit.name]?.sight??1;
}
function isMountainBetweenOpposite(sq,sr,tq,tr){
  if(hexDist(sq,sr,tq,tr)!==2)return false;
  const a=offsetToCube(sq,sr),b=offsetToCube(tq,tr);
  const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,mz=(a.z+b.z)/2;
  if(!Number.isInteger(mx)||!Number.isInteger(my)||!Number.isInteger(mz))return false;
  const mid=cubeToOffset(mx,my,mz);
  return inBounds(mid.q,mid.r)&&grid[ri(mid.q,mid.r)].terrain==='mountain';
}
function isRangedMountainBlocked(unit,sq,sr,tq,tr){
  return unit&&['궁병','포병','트레뷰셋','마법사'].includes(unit.name)&&isMountainBetweenOpposite(sq,sr,tq,tr);
}
function hexReachable(q,r,steps,owner){
  const vis=new Map();vis.set(`${q},${r}`,0);
  const front=[{q,r,cost:0}],result=[];
  while(front.length>0){
    const cur=front.shift();
    for(const nb of hexNeighbours(cur.q,cur.r)){
      const key=`${nb.q},${nb.r}`,cell=grid[ri(nb.q,nb.r)];
      if(vis.has(key))continue;
      if(cell.terrain==='mountain')continue;
      if(cell.wall&&cell.wall.owner===owner)continue;
      if(cell.unit&&cell.unit.owner===owner)continue;
      const mc=moveCost(cell),nc=cur.cost+mc;
      if(nc>steps)continue;
      vis.set(key,nc);front.push({q:nb.q,r:nb.r,cost:nc});
      result.push({q:nb.q,r:nb.r});
    }
  }
  return result;
}
function bfsPathHex(sq,sr,tq,tr,owner){
  if(sq===tq&&sr===tr)return [];
  const best=new Map([[`${sq},${sr}`,0]]);
  const queue=[{q:sq,r:sr,path:[],score:0}];
  while(queue.length>0){
    queue.sort((a,b)=>a.score-b.score);
    const{q,r,path,score}=queue.shift();
    if(score>best.get(`${q},${r}`))continue;
    for(const nb of hexNeighbours(q,r)){
      const key=`${nb.q},${nb.r}`;
      const cell=grid[ri(nb.q,nb.r)];
      const isTarget=nb.q===tq&&nb.r===tr;
      if(cell.terrain==='mountain'||cell.wall)continue;
      if(cell.unit&&!isTarget)continue;
      const riverPenalty=cell.terrain==='river'&&!cell.bridge?100:0;
      const nextScore=score+1+riverPenalty;
      if(best.has(key)&&best.get(key)<=nextScore)continue;
      best.set(key,nextScore);
      const np=[...path,{q:nb.q,r:nb.r}];
      if(nb.q===tq&&nb.r===tr)return np;
      queue.push({q:nb.q,r:nb.r,path:np,score:nextScore});
    }
  }
  return null;
}
function bfsNextStepHex(sq,sr,tq,tr,owner){
  const path=bfsPathHex(sq,sr,tq,tr,owner);
  if(!path||path.length===0)return null;
  return path[0];
}

// ══════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════
const PLAYER_START={q:1,r:8};
const ENEMY_START ={q:8,r:1};
const PLAYER_ENGINEER_START={q:1,r:7};
const ENEMY_ENGINEER_START ={q:8,r:2};
const DEPLOY_RADIUS=1;
const MAX_TURNS=40;
const BASE_TOKENS=10;
const PIGGY_MAX=20;
const MTN_QUOTA=5;  // each player places up to 5 mountains
const RIV_QUOTA=5;  // each player places up to 5 river tiles (must form chain of 5)

// Half-map: player zone = hexes closer to PLAYER_START, enemy zone = closer to ENEMY_START
function playerZone(q,r){return hexDist(q,r,PLAYER_START.q,PLAYER_START.r)<=hexDist(q,r,ENEMY_START.q,ENEMY_START.r);}
function enemyZone(q,r) {return !playerZone(q,r);}

// FIX 4: atk, def, and hp ×10 from original values
const UNIT_DEFS={
  보병:    {cost:1,atk:30, def:10,hp:50, move:1,range:1,sight:1,emoji:'⚔️',special:'1칸 내 적 공격'},
  궁병:    {cost:1,atk:20, def:10,hp:40, move:2,range:2,sight:2,emoji:'🏹',special:'2칸 이동, 2칸 사거리 공격'},
  방패병:  {cost:1,atk:0,  def:10,hp:60, move:1,range:0,sight:1,emoji:'🛡️',special:'위치한 칸 봉쇄'},
  창병:    {cost:2,atk:30, def:10,hp:50, move:1,range:1,sight:1,emoji:'🗡️',special:'기마병에 +20 피해'},
  공병:    {cost:1,atk:10, def:10,hp:10, move:1,range:1,sight:1,emoji:'🔨',special:'건축물 건설(벽/다리/감시탑)'},
  포병:    {cost:4,atk:50, def:10,hp:40, move:1,range:2,sight:2,emoji:'💣',special:'2칸 광역 중심50/주변10'},
  기마병:  {cost:3,atk:30, def:10,hp:60, move:3,range:1,sight:1,emoji:'🐴',special:'이동력 3칸'},
  트레뷰셋:{cost:6,atk:50, def:0,hp:60, move:1,range:3,sight:2,emoji:'⚙️',special:'3칸, 건축물 2배 피해'},
  기사:    {cost:5,atk:50, def:30,hp:60, move:3,range:1,sight:1,emoji:'🗡️',special:'방어 30, 이동 3'},
  마법사:  {cost:5,atk:40, def:10,hp:40, move:1,range:2,sight:2,emoji:'🔮',special:'2칸+인접 스플래시 20'},
  킹:      {cost:0,atk:0,  def:10,hp:200,move:0,range:0,sight:1,emoji:'👑',special:'진영 핵심 기물, 이동 불가'},
};
const BASE_HP=200;
