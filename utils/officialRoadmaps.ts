import { TournamentState } from '../types';
import { MeasureText, OfficialCard, PAPER, PaperDocument, PaperPage, wrappedLines } from './paperDocuments';
export function createOfficialRouteDocument(state: Pick<TournamentState, 'matches' | 'finalMatches' | 'officials' | 'teams'>, ids: string[], finals = false, measure?: MeasureText): PaperDocument {
  const matches = finals ? Object.values(state.finalMatches).flat() : state.matches;
  const sessions = [...new Set(matches.map(m => m.sessionNumber).filter((n): n is number => !!n))].sort((a,b)=>a-b);
  const people = (state.officials || []).filter(p => ids.includes(p.id));
  const teamName = (id: string | null) => state.teams.find(t=>t.id===id)?.name || 'À déterminer';
  const stage = finals ? 'Phases finales' : 'Poules', cards: OfficialCard[] = [];
  for (const person of people) {
    const name = `${person.firstName} ${person.lastName}`.trim(), overhead = 18 + wrappedLines(name, 480, measure)*4;
    const parts: OfficialCard[] = []; let rows: OfficialCard['rows'] = [], height = overhead;
    for (const session of sessions) {
      const duties = matches.filter(m => m.sessionNumber === session && (m.refereeId === person.id || m.scorerId === person.id));
      const row = { session, court: duties.map(m=>String(m.court ?? '—')).join('\n'), role: duties.map(m=>m.refereeId===person.id?'Arbitre':'Marqueur').join('\n') || 'Repos', match: duties.map(m=>`${teamName(m.team1Id)} / ${teamName(m.team2Id)}`).join('\n'), height: 0 };
      row.height = Math.max(6, wrappedLines(row.match, 260, measure)*3.3+2.4, wrappedLines(row.role, 90, measure)*3.3+2.4);
      if (overhead + row.height > PAPER.bodyHeight-2) throw Error(`Mission trop longue pour ${name}. Raccourcissez les noms avant d’imprimer.`);
      if (rows.length && height + row.height > PAPER.bodyHeight-2) { parts.push({kind:'official',id:person.id,name,stage,rows,part:parts.length+1,parts:0,height}); rows=[]; height=overhead; }
      rows.push(row); height+=row.height;
    }
    if (rows.length) parts.push({kind:'official',id:person.id,name,stage,rows,part:parts.length+1,parts:0,height});
    parts.forEach(c=>{c.parts=parts.length;cards.push(c);});
  }
  const pages: PaperPage[]=[];let current:OfficialCard[]=[], height=0;
  for(let i=0;i<cards.length;i+=2){const row=cards.slice(i,i+2), rowHeight=Math.max(...row.map(c=>c.height));
    if(current.length && height+PAPER.gap+rowHeight>PAPER.bodyHeight){pages.push({cards:current,columns:2});current=[];height=0;}
    if(current.length)height+=PAPER.gap;current.push(...row);height+=rowHeight;
  }
  if(current.length)pages.push({cards:current,columns:2});
  return {title:`Feuilles de route des officiels — ${stage}`,pages,preparedAt:Date.now(),kind:'officials',itemCount:sessions.length?people.length:0};
}
