export type TournamentPlayer = { id: string; name: string; rating?: number; school?: string };
export type Match = { id: string; round: number; board: number; white: string | null; black: string | null; result: "1-0" | "0-1" | "½-½" | "0-0" | null; bye?: boolean };
export type Result = Match["result"];

const score = (id: string, matches: Match[]) => matches.reduce((n, m) => n + (m.white === id && m.result === "1-0" || m.black === id && m.result === "0-1" ? 1 : m.result === "½-½" && (m.white === id || m.black === id) ? 0.5 : 0), 0);
const history = (id: string, matches: Match[]) => matches.filter(m => (m.white === id || m.black === id) && m.black && m.white).map(m => m.white === id ? m.black : m.white);
const match = (round: number, board: number, white: string | null, black: string | null, bye = false): Match => ({ id: `${round}-${board}-${white || "bye"}-${black || "bye"}`, round, board, white, black, result: bye ? "1-0" : null, bye });

export function swissPairings(players: TournamentPlayer[], previous: Match[], round: number, boards = players.length): Match[] {
  const played = previous.flatMap(m => m.result && !m.bye ? [m] : []);
  const ordered = [...players].sort((a,b) => score(b.id,played)-score(a.id,played) || (b.rating||0)-(a.rating||0) || a.name.localeCompare(b.name));
  let bye: TournamentPlayer | undefined;
  if (ordered.length % 2) {
    const hadBye = new Set(previous.filter(m=>m.bye).map(m=>m.white));
    bye = [...ordered].reverse().find(p=>!hadBye.has(p.id)) || ordered.at(-1);
    ordered.splice(ordered.findIndex(p=>p.id===bye!.id),1);
  }
  const pairs: [TournamentPlayer,TournamentPlayer][] = [];
  while (ordered.length) {
    const white = ordered.shift()!;
    let best = -1, penalty = Infinity;
    for (let i=0;i<ordered.length;i++) {
      const black=ordered[i]; const repeat=history(white.id,played).includes(black.id);
      const colorBalance = Math.abs(played.filter(m=>m.white===white.id).length-played.filter(m=>m.black===white.id).length);
      const p=(repeat?100000:0)+Math.abs(score(white.id,played)-score(black.id,played))*100+colorBalance*2+i;
      if(p<penalty){penalty=p;best=i;}
    }
    if(best>=0)pairs.push([white,ordered.splice(best,1)[0]]);
  }
  const color=(id:string)=>played.filter(m=>m.white===id).length-played.filter(m=>m.black===id).length;
  const result=pairs.map(([a,b],i)=>{const w=color(a.id)>color(b.id)?b:a;const black=w.id===a.id?b:a;return match(round,i%Math.max(1,boards)+1,w.id,black.id);});
  if(bye)result.push(match(round,result.length+1,bye.id,null,true));
  return result;
}

export function roundRobinPairings(players: TournamentPlayer[], boards = players.length): Match[][] {
  const rotation: (TournamentPlayer|null)[]=[...players]; if(rotation.length%2)rotation.push(null);
  const rounds: Match[][]=[]; const total=rotation.length;
  for(let round=0;round<total-1;round++){
    const games:Match[]=[];
    for(let i=0;i<total/2;i++){
      const a=rotation[i],b=rotation[total-1-i]; if(a&&b){const white=round%2===0?a:b,black=round%2===0?b:a;games.push(match(round+1,games.length+1,white.id,black.id));} else if(a||b){const bye=a||b;games.push(match(round+1,games.length+1,bye!.id,null,true));}
    }
    rounds.push(games.map((g,i)=>({...g,board:i%Math.max(1,boards)+1})));
    const fixed=rotation[0]; rotation.splice(1,0,rotation.pop()!); rotation[0]=fixed;
  }
  return rounds;
}

export function knockoutPairings(players: TournamentPlayer[], boards=players.length): Match[][] {
  const size=2**Math.ceil(Math.log2(Math.max(2,players.length)));
  const byeCount=size-players.length;
  const seeded=[...players].sort((a,b)=>(b.rating||0)-(a.rating||0)||a.name.localeCompare(b.name));
  const first:Match[]=[];
  for(let i=0;i<byeCount;i++){const g=match(1,first.length+1,seeded[i].id,null,true);first.push(g);}
  for(let i=byeCount;i<seeded.length;i+=2){const a=seeded[i],b=seeded[i+1];if(!b)continue;first.push(match(1,first.length+1,a.id,b.id));}
  return [first.map((g,i)=>({...g,board:i%Math.max(1,boards)+1}))];
}

export function tournamentStandings(players:TournamentPlayer[],matches:Match[]) {
  return players.map(p=>{const played=matches.filter(m=>m.result&&!m.bye&&(m.white===p.id||m.black===p.id));const wins=played.filter(m=>m.white===p.id&&m.result==="1-0"||m.black===p.id&&m.result==="0-1").length;const draws=played.filter(m=>m.result==="½-½").length;const losses=played.length-wins-draws;return { ...p, points:score(p.id,matches), wins, draws, losses, games:played.length };}).sort((a,b)=>b.points-a.points||b.wins-a.wins||(b.rating||0)-(a.rating||0)||a.name.localeCompare(b.name));
}

export function advanceKnockout(rounds:Match[][], updated:Match, boards=Number.MAX_SAFE_INTEGER): Match[][] {
  const next=rounds.map(r=>r.map(m=>m.id===updated.id?updated:m));
  const round=next.findIndex(r=>r.some(m=>m.id===updated.id)); const current=next[round];
  if(current.some(m=>!m.result))return next;
  const winners=current.map(m=>m.result==="1-0"?m.white:m.result==="0-1"?m.black:null).filter(Boolean) as string[];
  if(winners.length<2)return next;
  const nextRound=round+2; const games:Match[]=[];
  for(let i=0;i<winners.length;i+=2)games.push(match(nextRound,games.length+1,winners[i]||null,winners[i+1]||null,!winners[i+1]));
  next.push(games.map((g,i)=>({...g,board:i%Math.max(1,boards)+1})));
  return next;
}
