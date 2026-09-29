
import React, { useState, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Match, Category, Player, Team } from '../types';
import { getAdminTeamName } from '../utils/helpers';
import * as XLSX from 'xlsx';

const TeamRoadmaps: React.FC = () => {
    const { state } = useTournament();
    const { categories, teams, matches, pools } = state;
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || '');
    const [selectedSession, setSelectedSession] = useState<number>(1);
    const [printMode, setPrintMode] = useState<'session' | 'terrain'>('session');
    const [selectedCourt, setSelectedCourt] = useState<number>(1);

    const availableSessions = useMemo(() => {
        const sessions = new Set(matches.filter(m => m.sessionNumber).map(m => m.sessionNumber!));
        return Array.from(sessions).sort((a, b) => a - b);
    }, [matches]);

    const availableCourts = useMemo(() => {
        const courts = new Set(matches.filter(m => m.court).map(m => m.court!));
        return Array.from(courts).sort((a, b) => a - b);
    }, [matches]);

    const selectedCategory = useMemo(() => categories.find(c => c.id === selectedCategoryId), [categories, selectedCategoryId]);
    const categoryTeams = useMemo(() => teams.filter(t => t.categoryId === selectedCategoryId), [teams, selectedCategoryId]);

    const maxSession = useMemo(() => Math.max(0, ...matches.map(m => m.sessionNumber || 0)), [matches]);

    const showReferee = selectedCategory?.isRefereeMandatory ?? false;
    const showScorer = selectedCategory?.isScorerMandatory ?? false;

    const teamsPerRowCount = (!showReferee && !showScorer) ? 6
                  : (showReferee !== showScorer) ? 5
                  : 4;

    const getTeamName = (teamId: string | null) => teams.find(t => t.id === teamId)?.name || '';
    const getPlayerName = (playerId: string | null) => {
        if (!playerId || playerId === 'Staff') return playerId || '';
        const team = teams.find(t => t.players.some(p => p.id === playerId));
        const player = team?.players.find(p => p.id === playerId);
        return player ? `${player.firstName} ${player.lastName}` : '';
    };

    const getPoolLetter = (team: Team) => {
        if (!team.poolId) return '';
        const categoryPools = pools.filter(p => p.id.startsWith(team.categoryId));
        const poolIndex = categoryPools.findIndex(p => p.id === team.poolId);
        return poolIndex !== -1 ? ` (Poule ${String.fromCharCode(65 + poolIndex)})` : '';
    };

    const generateRoadmapData = (team: Team) => {
        const rows = [];
        const teamPlayerIds = new Set(team.players.map(p => p.id));

        for (let s = 1; s <= maxSession; s++) {
            const sessionMatches = matches.filter(m => m.sessionNumber === s);
            
            const playingMatch = sessionMatches.find(m => m.team1Id === team.id || m.team2Id === team.id);
            const refereeMatch = sessionMatches.find(m => m.refereeId && teamPlayerIds.has(m.refereeId));
            const scorerMatch = sessionMatches.find(m => m.scorerId && teamPlayerIds.has(m.scorerId));

            const row = {
                session: `Session ${s}`,
                team1: '',
                team2: '',
                arbitrage: '',
                marqueur: '',
                terrainMatch: '',
                terrainArb: '',
                terrainMarq: ''
            };

            if (playingMatch) {
                row.team1 = getTeamName(playingMatch.team1Id);
                row.team2 = getTeamName(playingMatch.team2Id);
                row.terrainMatch = playingMatch.court?.toString() || '';
            }

            if (refereeMatch) {
                row.arbitrage = getPlayerName(refereeMatch.refereeId);
                row.terrainArb = refereeMatch.court?.toString() || '';
            }

            if (scorerMatch) {
                row.marqueur = getPlayerName(scorerMatch.scorerId);
                row.terrainMarq = scorerMatch.court?.toString() || '';
            }

            rows.push(row);
        }
        return rows;
    };







    const exportOptimizedToExcel = () => {
        const wb = XLSX.utils.book_new();
        const wsData: any[][] = [];
        const merges: XLSX.Range[] = [];
        
        const teamsPerRow = teamsPerRowCount;
        const colOffset = 3 + (showReferee ? 2 : 0) + (showScorer ? 2 : 0) + 1; // +1 pour l'espace entre équipes
        
        for (let i = 0; i < categoryTeams.length; i += teamsPerRow) {
            const rowStart = wsData.length;
            const batch = categoryTeams.slice(i, i + teamsPerRow);
            
            const titleRow: any[] = [];
            const headerRow: any[] = [];
            
            batch.forEach((team, bIdx) => {
                const startCol = bIdx * colOffset;
                while (titleRow.length < startCol) titleRow.push('');
                titleRow.push(`Feuille de route ${team.name}${getPoolLetter(team)}`);
                merges.push({ s: { r: rowStart, c: startCol }, e: { r: rowStart, c: startCol + colOffset - 2 } });
                
                while (headerRow.length < startCol) headerRow.push('');
                const hs = ['', 'Equipe vs', 'T.Match'];
                if (showReferee) hs.push('Arbitrage', 'T.Arb.');
                if (showScorer) hs.push('Marqueur', 'T.Marq.');
                headerRow.push(...hs);
            });
            
            wsData.push(titleRow);
            wsData.push(headerRow);
            
            const teamRoadmaps = batch.map(t => generateRoadmapData(t));
            
            for (let s = 0; s < maxSession; s++) {
                const sessionRow: any[] = [];
                batch.forEach((_, bIdx) => {
                    const startCol = bIdx * colOffset;
                    const rData = teamRoadmaps[bIdx][s];
                    while (sessionRow.length < startCol) sessionRow.push('');
                    const equipeVs = rData.team1 ? `${rData.team1} vs ${rData.team2}` : '';
                    const sr = [rData.session, equipeVs, rData.terrainMatch];
                    if (showReferee) sr.push(rData.arbitrage, rData.terrainArb);
                    if (showScorer) sr.push(rData.marqueur, rData.terrainMarq);
                    sessionRow.push(...sr);
                });
                wsData.push(sessionRow);
            }
            
            // Add spacing
            wsData.push([]);
            wsData.push([]);
        }

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!merges'] = merges;
        
        // Column widths
        const wscols = [];
        for(let i = 0; i < teamsPerRow * colOffset; i++) {
            wscols.push({ wch: i % colOffset === 0 ? 12 : 10 });
        }
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, selectedCategory?.name.substring(0, 30) || "Export");
        XLSX.writeFile(wb, `Feuilles_Route_${selectedCategory?.name.replace(/\s+/g, '_')}.xlsx`);
    };

    const copyForGoogleSheets = () => {
        const wsData: any[][] = [];
        const teamsPerRow = teamsPerRowCount;
        const colOffset = 3 + (showReferee ? 2 : 0) + (showScorer ? 2 : 0) + 1; // +1 pour l'espace entre équipes
        
        for (let i = 0; i < categoryTeams.length; i += teamsPerRow) {
            const batch = categoryTeams.slice(i, i + teamsPerRow);
            const titleRow: any[] = [];
            const headerRow: any[] = [];
            
            batch.forEach((team, bIdx) => {
                const startCol = bIdx * colOffset;
                while (titleRow.length < startCol) titleRow.push('');
                titleRow.push(`Feuille de route ${team.name}${getPoolLetter(team)}`);
                while (headerRow.length < startCol) headerRow.push('');
                const hs = ['', 'Equipe vs', 'T.Match'];
                if (showReferee) hs.push('Arbitrage', 'T.Arb.');
                if (showScorer) hs.push('Marqueur', 'T.Marq.');
                headerRow.push(...hs);
            });
            
            wsData.push(titleRow);
            wsData.push(headerRow);
            
            const teamRoadmaps = batch.map(t => generateRoadmapData(t));
            for (let s = 0; s < maxSession; s++) {
                const sessionRow: any[] = [];
                batch.forEach((_, bIdx) => {
                    const startCol = bIdx * colOffset;
                    const rData = teamRoadmaps[bIdx][s];
                    while (sessionRow.length < startCol) sessionRow.push('');
                    const equipeVs = rData.team1 ? `${rData.team1} vs ${rData.team2}` : '';
                    const sr = [rData.session, equipeVs, rData.terrainMatch];
                    if (showReferee) sr.push(rData.arbitrage, rData.terrainArb);
                    if (showScorer) sr.push(rData.marqueur, rData.terrainMarq);
                    sessionRow.push(...sr);
                });
                wsData.push(sessionRow);
            }
            wsData.push([]);
            wsData.push([]);
        }

        const tsv = wsData.map(row => row.join('\t')).join('\n');
        navigator.clipboard.writeText(tsv).then(() => {
            alert('Copié ! Vous pouvez maintenant coller (Ctrl+V) dans Google Sheets.');
        });
    };

    const handlePrintSchedule = () => {
        const category = categories.find(c => c.id === selectedCategoryId);
        if (!category) return;

        const categoryMatches = matches
            .filter(m => {
                const pool = pools.find(p => p.id === m.poolId);
                return pool?.id.startsWith(selectedCategoryId) && m.sessionNumber;
            })
            .sort((a, b) => (a.sessionNumber || 0) - (b.sessionNumber || 0));

        const groupedBySessions: Record<number, typeof categoryMatches> = {};
        categoryMatches.forEach(m => {
            const s = m.sessionNumber!;
            if (!groupedBySessions[s]) groupedBySessions[s] = [];
            groupedBySessions[s].push(m);
        });

        const getTeamNameForPrint = (id: string) => {
            const team = teams.find(t => t.id === id);
            return team ? getAdminTeamName(team) : '?';
        };

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const rows = Object.entries(groupedBySessions).map(([session, sessionMatches]) =>
            sessionMatches.map(m => `
                <tr>
                    <td style="text-align:center;font-weight:bold;">${session}</td>
                    <td style="text-align:center;">${m.court ?? '-'}</td>
                    <td>${getTeamNameForPrint(m.team1Id)} <strong>vs</strong> ${getTeamNameForPrint(m.team2Id)}</td>
                    <td style="text-align:center;">${m.score1 !== null ? `${m.score1} - ${m.score2}` : ''}</td>
                </tr>
            `).join('')
        ).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Calendrier - ${category.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; font-size: 11px; margin: 10px; }
                    h2 { text-align: center; margin-bottom: 8px; font-size: 14px; }
                    table { width: 100%; border-collapse: collapse; }
                    th { background: #f0f0f0; padding: 4px 8px; border: 1px solid #ccc; font-size: 11px; }
                    td { padding: 3px 8px; border: 1px solid #ddd; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    @media print { body { margin: 5px; } }
                </style>
            </head>
            <body>
                <h2>Calendrier — ${category.name}</h2>
                <table>
                    <thead>
                        <tr>
                            <th style="width:8%">Session</th>
                            <th style="width:8%">Terrain</th>
                            <th>Match</th>
                            <th style="width:15%">Score</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const handlePrint = () => {
        window.print();
    };

    const handlePrintMatchSheets = () => {
        const sessionMatches = matches
            .filter(m => {
                if (printMode === 'session') return m.sessionNumber === selectedSession;
                if (printMode === 'terrain') return m.court === selectedCourt;
                return false;
            })
            .sort((a, b) => printMode === 'session'
                ? (a.court ?? 0) - (b.court ?? 0)
                : (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0)
            );
    
        if (sessionMatches.length === 0) {
            alert(printMode === 'session' 
                ? `Aucun match trouvé pour la session ${selectedSession}.` 
                : `Aucun match trouvé pour le terrain ${selectedCourt}.`
            );
            return;
        }
    
        const getTeam = (id: string) => teams.find(t => t.id === id);
        
        const getPoolLabel = (poolId: string) => {
            const category = categories.find(c => poolId.startsWith(c.id));
            const categoryPools = pools.filter(p => p.id.startsWith(category?.id || ''));
            const poolIndex = categoryPools.findIndex(p => p.id === poolId);
            return `${category?.name || ''} — Poule ${poolIndex + 1}`;
        };
    
        const getBonus = (team: Team | undefined) => {
            if (!team?.womenCount || team.womenCount === 0) return 0;
            return team.womenCount >= 2 ? 2 : 1;
        };
    
        const generateNumbers = (bonus: number = 0) => {
            const rows = [
                [1, 2, 3, 4, 5, 6],
                [7, 8, 9, 10, 11, 12],
                [13, 14, 15, 16, 17, 18],
                [19, 20, 21]
            ];
            let html = '<div class="scores-grid">';
            rows.forEach((row, rowIdx) => {
                html += `<div class="scores-row ${rowIdx === 3 ? 'scores-row-last' : ''}">`;
                row.forEach(n => {
                    const isBonus = n <= bonus;
                    html += `<div class="score-num${isBonus ? ' score-bonus' : ''}">${n}</div>`;
                });
                html += '</div>';
            });
            html += '</div>';
            return html;
        };
    
        const generateFouls = () => `
            <div class="fouls-row">${[1,2,3,4,5,6].map(n => `<span class="foul">${n}</span>`).join('')}</div>
            <div class="fouls-row">${[7,8,9,10,11,12,13].map(n => `<span class="foul">${n}</span>`).join('')}</div>
        `;
    
        const generateSheet = (match: Match) => {
            const team1 = getTeam(match.team1Id);
            const team2 = getTeam(match.team2Id);
            const team1Name = team1?.name || '?';
            const team2Name = team2?.name || '?';
            const bonus1 = getBonus(team1);
            const bonus2 = getBonus(team2);
            const category = categories.find(c => match.poolId.startsWith(c.id));
            const poolLabel = getPoolLabel(match.poolId);
    
            return `
            <div class="match-sheet">
                <div class="sheet-header">
                    <div class="header-top">
                        <span class="cat-badge">${category?.name || ''}</span>
                        <span class="session-label">Session ${match.sessionNumber} — Terrain ${match.court ?? '?'}</span>
                        <span class="pool-label">${poolLabel}</span>
                    </div>
                    <div class="teams-row">
                        <div class="team-name">${team1Name}${bonus1 > 0 ? ` <span class="bonus-tag">+${bonus1}</span>` : ''}</div>
                        <div class="vs-col">VS</div>
                        <div class="team-name" style="text-align: right;">${team2Name}${bonus2 > 0 ? ` <span class="bonus-tag">+${bonus2}</span>` : ''}</div>
                    </div>
                </div>
    
                <div class="fouls-section">
                    <div class="fouls-col">
                        <div class="fouls-title">Fautes d'équipe</div>
                        ${generateFouls()}
                    </div>
                    <div class="fouls-sep"></div>
                    <div class="fouls-col">
                        <div class="fouls-title">Fautes d'équipe</div>
                        ${generateFouls()}
                    </div>
                </div>
    
                <div class="marque-title">MARQUE</div>
    
                <div class="scores-section">
                    <div class="scores-col">${generateNumbers(bonus1)}</div>
                    <div class="scores-col">${generateNumbers(bonus2)}</div>
                </div>
    
                <div class="final-score">SCORE FINAL : ........... X ...........</div>
            </div>
            `;
        };
    
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
    
        let pagesHTML = '';
        for (let i = 0; i < sessionMatches.length; i += 4) {
            const pageMatches = sessionMatches.slice(i, i + 4);
            while (pageMatches.length < 4) pageMatches.push(null as any);
            pagesHTML += '<div class="page">';
            pagesHTML += '<div class="cut-line-h"></div>';
            pagesHTML += '<div class="cut-line-v"></div>';
            pagesHTML += pageMatches.map(m => m ? generateSheet(m) : '<div class="match-sheet empty"></div>').join('');
            pagesHTML += '</div>';
        }
    
        printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Feuilles de match — Session ${selectedSession}</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }

                html, body {
                    width: 297mm;
                    height: 210mm;
                    margin: 0;
                    padding: 0;
                    background: white;
                    color: black;
                    font-family: Arial, sans-serif;
                }

                @page { size: A4 landscape; margin: 0; }

                .page {
                    width: 297mm;
                    height: 210mm;
                    display: grid;
                    grid-template-columns: 146.5mm 146.5mm;
                    grid-template-rows: 103mm 103mm;
                    gap: 4mm;
                    page-break-after: always;
                    overflow: hidden;
                    background: white;
                }

                .match-sheet {
                    width: 146.5mm;
                    height: 103mm;
                    overflow: hidden;
                    border: 1px solid #333;
                    display: flex;
                    flex-direction: column;
                    background: white;
                    color: black;
                }

                .match-sheet.empty { background: #fafafa; }

                /* HEADER BLEU */
                .sheet-header {
                    background: #1d4ed8;
                    padding: 4px 6px 5px 6px;
                    flex-shrink: 0;
                }
                .header-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 3px;
                }
                .cat-badge {
                    font-size: 9px;
                    font-weight: bold;
                    color: white;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .session-label {
                    font-size: 10px;
                    font-weight: bold;
                    color: white;
                }
                .pool-label {
                    font-size: 8px;
                    color: #bfdbfe;
                }
                .teams-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .team-name {
                    font-size: 18px;
                    font-weight: bold;
                    color: white;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 45%;
                }
                .bonus-tag {
                    display: inline-block;
                    background: #f97316;
                    color: white;
                    padding: 1px 4px;
                    border-radius: 3px;
                    font-size: 8px;
                    font-weight: bold;
                    margin-left: 3px;
                    vertical-align: middle;
                }
                .vs-col {
                    font-size: 20px;
                    font-weight: 900;
                    color: white;
                    padding: 0 8px;
                }

                /* FAUTES */
                .fouls-section {
                    display: flex;
                    border-bottom: 1px solid #ccc;
                    padding: 4px 6px;
                    gap: 4px;
                    flex-shrink: 0;
                }
                .fouls-col { flex: 1; }
                .fouls-sep { width: 1px; background: #ccc; margin: 0 4px; }
                .fouls-title {
                    font-size: 9px;
                    font-weight: bold;
                    text-align: center;
                    text-transform: uppercase;
                    margin-bottom: 3px;
                    color: #333;
                }
                .fouls-row { display: flex; gap: 3px; margin-bottom: 3px; }
                .foul {
                    border: 1px solid #555;
                    width: 26px;
                    height: 26px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 13px;
                    font-weight: bold;
                    border-radius: 3px;
                    color: #333;
                }

                /* MARQUE */
                .marque-title {
                    text-align: center;
                    font-size: 11px;
                    font-weight: bold;
                    letter-spacing: 4px;
                    padding: 4px 0 3px 0;
                    border-bottom: 1px solid #333;
                    color: #333;
                    flex-shrink: 0;
                }
                .scores-section {
                    display: flex;
                    gap: 6px;
                    padding: 4px 6px;
                    flex: 1;
                }
                .scores-col { flex: 1; }
                .scores-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                }
                .scores-row {
                    display: flex;
                    gap: 3px;
                }
                .scores-row-last {
                    justify-content: center;
                    gap: 8px;
                }
                .score-num {
                    flex: 1;
                    height: 28px;
                    border: 1px solid #555;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 13px;
                    border-radius: 3px;
                    color: #333;
                    min-width: 28px;
                    max-width: 38px;
                }
                .scores-row-last .score-num {
                    flex: 0 0 38px;
                }
                .score-bonus {
                    background: #f97316;
                    color: white;
                    text-decoration: line-through;
                    border-color: #ea580c;
                }

                /* SCORE FINAL */
                .final-score {
                    background: #eff6ff;
                    border-top: 1px solid #1d4ed8;
                    text-align: center;
                    font-size: 14px;
                    font-weight: bold;
                    color: #1d4ed8;
                    letter-spacing: 1px;
                    padding: 10px 0;
                    margin-top: auto;
                    flex-shrink: 0;
                }

                /* LIGNES DE COUPE */
                .cut-line-h {
                    position: fixed;
                    left: 0; top: 105mm;
                    width: 297mm;
                    border-top: 1px dashed #aaa;
                    z-index: 100;
                }
                .cut-line-v {
                    position: fixed;
                    top: 0; left: 148.5mm;
                    height: 210mm;
                    border-left: 1px dashed #aaa;
                    z-index: 100;
                }

                @media print {
                    html, body { width: 297mm !important; height: 210mm !important; margin: 0 !important; }
                    .page {
                        width: 297mm !important;
                        height: 210mm !important;
                        grid-template-columns: 146.5mm 146.5mm !important;
                        grid-template-rows: 103mm 103mm !important;
                        gap: 4mm !important;
                    }
                    .match-sheet { width: 146.5mm !important; height: 103mm !important; overflow: hidden !important; }
                }
            </style>
        </head>
        <body>${pagesHTML}</body>
        </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };



    return (
        <div className="space-y-6">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: landscape; margin: 1cm; }
                    body * { visibility: hidden; }
                    #print-section, #print-section * { visibility: visible; }
                    #print-section { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%; 
                        background: white !important;
                    }
                    .print-page-break { page-break-after: always; }
                    .print-no-break { page-break-inside: avoid; break-inside: avoid; }
                }
            `}} />

            <div className="flex justify-between items-center print:hidden">
                <h1 className="text-3xl font-bold">Feuilles de Route</h1>
                <div className="flex gap-3 items-center">
                    {selectedCategory && categoryTeams.length > 0 && (
                        <>
                            <button
                                onClick={handlePrintSchedule}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm shadow-md"
                            >
                                🗓️ Imprimer le calendrier
                            </button>
                            <button 
                                onClick={handlePrint}
                                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center gap-2 shadow-md transition-all font-bold text-sm"
                                title="Imprimer directement les feuilles de route"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Imprimer (Direct)
                            </button>
                            <button 
                                onClick={copyForGoogleSheets}
                                className="bg-yellow-500 text-white py-2 px-4 rounded-md hover:bg-yellow-600 flex items-center gap-2 shadow-md transition-all font-bold text-sm"
                                title="Copie les données au format Google Sheets (utilisez Ctrl+V ensuite)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                                Copier pour Sheets
                            </button>
                            <button 
                                onClick={exportOptimizedToExcel}
                                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center gap-2 shadow-md transition-all font-bold text-sm"
                                title="Exporter toutes les équipes de la catégorie (2 par ligne)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Exporter (.xlsx)
                            </button>
                        </>
                    )}
                    <div className="flex items-center gap-2">
                        <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                            <button
                                onClick={() => setPrintMode('session')}
                                className={`px-3 py-1 text-sm font-bold ${
                                    printMode === 'session'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                Par session
                            </button>
                            <button
                                onClick={() => setPrintMode('terrain')}
                                className={`px-3 py-1 text-sm font-bold ${
                                    printMode === 'terrain'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                Par terrain
                            </button>
                        </div>

                        {printMode === 'session' ? (
                            <select
                                value={selectedSession}
                                onChange={(e) => setSelectedSession(Number(e.target.value))}
                                className="border rounded p-1 text-sm bg-white dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600"
                            >
                                {availableSessions.map(s => (
                                    <option key={s} value={s}>Session {s}</option>
                                ))}
                            </select>
                        ) : (
                            <select
                                value={selectedCourt}
                                onChange={(e) => setSelectedCourt(Number(e.target.value))}
                                className="border rounded p-1 text-sm bg-white dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600"
                            >
                                {availableCourts.map(c => (
                                    <option key={c} value={c}>Terrain {c}</option>
                                ))}
                            </select>
                        )}
                        <button
                            onClick={handlePrintMatchSheets}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold text-sm shadow-md transition-all whitespace-nowrap"
                        >
                            🏀 Feuilles de match
                        </button>
                    </div>


                </div>
            </div>




            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md print:hidden">
                <div role="tablist" className="flex items-center gap-2 flex-wrap">
                    {categories.map(category => (
                        <button
                            key={category.id}
                            role="tab"
                            aria-selected={selectedCategoryId === category.id}
                            onClick={() => setSelectedCategoryId(category.id)}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                selectedCategoryId === category.id
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <span style={{ backgroundColor: category.color }} className="w-3 h-3 rounded-full flex-shrink-0"></span>
                            <span>{category.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Hidden Print Section */}
            <div id="print-section" className="hidden print:block text-black p-4">
                <h1 className="text-2xl font-bold mb-6 text-center border-b-2 border-black pb-2">
                    Feuilles de Route - {selectedCategory?.name}
                </h1>
                
                {Array.from({ length: Math.ceil(categoryTeams.length / teamsPerRowCount) }).map((_, rowIndex) => {
                    const gridClass = teamsPerRowCount === 6 ? 'grid-cols-6' : teamsPerRowCount === 5 ? 'grid-cols-5' : 'grid-cols-4';
                    return (
                        <div key={rowIndex} className={`grid ${gridClass} gap-4 mb-8 print-no-break`}>
                            {categoryTeams.slice(rowIndex * teamsPerRowCount, rowIndex * teamsPerRowCount + teamsPerRowCount).map(team => {
                                const data = generateRoadmapData(team);
                                const colCount = (showReferee && showScorer) ? 7 : (showReferee || showScorer) ? 5 : 3;
                                const tableTextClass = colCount === 7 ? 'text-[8px]' : colCount === 5 ? 'text-[9px]' : 'text-[10px]';
                                const maxNameWidth = colCount === 7 ? 'max-w-[40px]' : colCount === 5 ? 'max-w-[55px]' : 'max-w-[70px]';
                                const subTextClass = colCount === 7 ? 'text-[7px]' : colCount === 5 ? 'text-[8px]' : 'text-[9px]';

                                return (
                                    <div key={team.id} className="border border-gray-400 p-2 rounded-md">
                                        <h2 className="text-sm font-bold text-center mb-2 bg-gray-100 py-1 border-b border-gray-400">
                                            {team.name}{getPoolLetter(team)}
                                        </h2>
                                        <table className={`w-full ${tableTextClass} border-collapse`}>
                                            <thead>
                                                <tr className="bg-gray-50">
                                                    <th className="border border-gray-400 p-0.5">S.</th>
                                                    <th className="border border-gray-400 p-0.5">Match</th>
                                                    <th className="border border-gray-400 p-0.5">T.M</th>
                                                    {showReferee && <th className="border border-gray-400 p-0.5">Arb.</th>}
                                                    {showReferee && <th className="border border-gray-400 p-0.5">T.A</th>}
                                                    {showScorer && <th className="border border-gray-400 p-0.5">Marq.</th>}
                                                    {showScorer && <th className="border border-gray-400 p-0.5" title="Terrain Marquage">T.Ma</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.map((row, idx) => (
                                                    <tr key={idx}>
                                                        <td className="border border-gray-400 p-0.5 text-center font-bold">{idx + 1}</td>
                                                        <td className="border border-gray-400 p-0.5">
                                                            {row.team1 && (
                                                                <div className="flex flex-col leading-tight">
                                                                    <span className={`truncate ${maxNameWidth}`}>{row.team1}</span>
                                                                    <span className={`${subTextClass} text-gray-500 truncate ${maxNameWidth}`}>vs {row.team2}</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="border border-gray-400 p-0.5 text-center font-bold">
                                                            {row.terrainMatch}
                                                        </td>
                                                        {showReferee && (
                                                            <td className="border border-gray-400 p-0.5 text-center truncate max-w-[30px]">
                                                                {row.arbitrage}
                                                            </td>
                                                        )}
                                                        {showReferee && (
                                                            <td className="border border-gray-400 p-0.5 text-center font-bold">
                                                                {row.terrainArb}
                                                            </td>
                                                        )}
                                                        {showScorer && (
                                                            <td className="border border-gray-400 p-0.5 text-center truncate max-w-[30px]">
                                                                {row.marqueur}
                                                            </td>
                                                        )}
                                                        {showScorer && (
                                                            <td className="border border-gray-400 p-0.5 text-center font-bold">
                                                                {row.terrainMarq}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TeamRoadmaps;
