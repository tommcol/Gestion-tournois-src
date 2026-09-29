import React from 'react';

interface LiveScore {
    court: number;
    team1Name: string;
    team2Name: string;
    score1: number;
    score2: number;
}

interface LiveScoresProps {
    scores: LiveScore[];
}

const LiveScores: React.FC<LiveScoresProps> = ({ scores }) => {
    if (scores.length === 0) return null;

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '3vh',
            gap: '2vh',
            background: '#0f172a',
        }}>
            <div style={{
                fontSize: '3vh',
                fontWeight: 500,
                color: 'white',
                textAlign: 'center',
                marginBottom: '1vh',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
            }}>
                Scores en direct
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: scores.length <= 2 ? '1fr' : '1fr 1fr',
                gap: '2vh',
                flex: 1,
            }}>
                {scores.map(s => (
                    <div key={s.court} style={{
                        background: '#1e293b',
                        borderRadius: '1vh',
                        border: '0.5px solid rgba(255,255,255,0.1)',
                        padding: '2vh',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                    }}>
                        <div style={{
                            fontSize: '1.8vh',
                            color: 'rgba(255,255,255,0.5)',
                            marginBottom: '1.5vh',
                            textAlign: 'center',
                        }}>
                            Terrain {s.court}
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1vh',
                        }}>
                            <div style={{ flex: 1, textAlign: 'right' }}>
                                <div style={{ fontSize: '2.5vh', fontWeight: 500, color: 'white', marginBottom: '0.5vh' }}>
                                    {s.team1Name}
                                </div>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1.5vh',
                                padding: '1vh 2vh',
                                background: '#0f172a',
                                borderRadius: '0.8vh',
                            }}>
                                <span style={{ fontSize: '6vh', fontWeight: 500, color: '#60a5fa', fontFamily: 'monospace' }}>
                                    {s.score1}
                                </span>
                                <span style={{ fontSize: '4vh', color: 'rgba(255,255,255,0.3)' }}>-</span>
                                <span style={{ fontSize: '6vh', fontWeight: 500, color: '#60a5fa', fontFamily: 'monospace' }}>
                                    {s.score2}
                                </span>
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <div style={{ fontSize: '2.5vh', fontWeight: 500, color: 'white', marginBottom: '0.5vh' }}>
                                    {s.team2Name}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LiveScores;
