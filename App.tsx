import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trophy, 
  RotateCcw, 
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  ChevronDown
} from 'lucide-react';
import { Player, RoundScores } from './types';

// --- Utility Components ---

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = ({ 
  className = '', 
  variant = 'primary', 
  children, 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-primary-500 shadow-sm",
    danger: "bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-500",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
    {children}
  </div>
);

// --- Main App Component ---

type SortOption = 'default' | 'scoreDesc' | 'scoreAsc' | 'nameAsc';

export default function App() {
  // State - Initialized from LocalStorage if available
  const [players, setPlayers] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem('cardScore_players');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load players from storage', e);
      return [];
    }
  });

  const [rounds, setRounds] = useState<RoundScores[]>(() => {
    try {
      const saved = localStorage.getItem('cardScore_rounds');
      return saved ? JSON.parse(saved) : [{}];
    } catch (e) {
      console.error('Failed to load rounds from storage', e);
      return [{}];
    }
  });

  const [activeRoundIndex, setActiveRoundIndex] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cardScore_activeRoundIndex');
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      return 0;
    }
  });

  const [winCondition, setWinCondition] = useState<'high' | 'low'>(() => {
    try {
      const saved = localStorage.getItem('cardScore_winCondition');
      return (saved === 'high' || saved === 'low') ? saved : 'high';
    } catch (e) {
      return 'high';
    }
  });

  const [sortBy, setSortBy] = useState<SortOption>(() => {
    try {
      const saved = localStorage.getItem('cardScore_sortBy');
      return (saved && ['default', 'scoreDesc', 'scoreAsc', 'nameAsc'].includes(saved)) 
        ? (saved as SortOption) 
        : 'default';
    } catch (e) {
      return 'default';
    }
  });
  
  // UI State
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('cardScore_players', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem('cardScore_rounds', JSON.stringify(rounds));
  }, [rounds]);

  useEffect(() => {
    localStorage.setItem('cardScore_activeRoundIndex', activeRoundIndex.toString());
  }, [activeRoundIndex]);

  useEffect(() => {
    localStorage.setItem('cardScore_winCondition', winCondition);
  }, [winCondition]);

  useEffect(() => {
    localStorage.setItem('cardScore_sortBy', sortBy);
  }, [sortBy]);

  // Derived State
  const totalScores = useMemo(() => {
    const totals: { [key: string]: number } = {};
    players.forEach(p => totals[p.id] = 0);

    rounds.forEach(round => {
      Object.entries(round).forEach(([playerId, score]) => {
        if (totals[playerId] !== undefined) {
          totals[playerId] += (score as number);
        }
      });
    });
    return totals;
  }, [players, rounds]);

  const currentRoundScores = rounds[activeRoundIndex] || {};
  
  // Calculate leader based on win condition
  const leaderId = useMemo(() => {
    if (players.length === 0) return null;
    
    // If everyone has 0 points (start of game), don't show a leader
    const allZero = players.every(p => totalScores[p.id] === 0);
    if (allZero) return null;

    let bestScore = winCondition === 'high' ? -Infinity : Infinity;
    let leader = null;
    
    for (const p of players) {
      const score = totalScores[p.id];
      
      if (winCondition === 'high') {
        if (score > bestScore) {
          bestScore = score;
          leader = p.id;
        }
      } else {
        // Low score wins
        if (score < bestScore) {
          bestScore = score;
          leader = p.id;
        }
      }
    }
    return leader;
  }, [players, totalScores, winCondition]);

  // Sorted Players
  const sortedPlayers = useMemo(() => {
    const sorted = [...players];
    switch (sortBy) {
      case 'scoreDesc':
        return sorted.sort((a, b) => totalScores[b.id] - totalScores[a.id]);
      case 'scoreAsc':
        return sorted.sort((a, b) => totalScores[a.id] - totalScores[b.id]);
      case 'nameAsc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'default':
      default:
        // Keep original insertion order (based on players array)
        return sorted;
    }
  }, [players, totalScores, sortBy]);

  // Handlers
  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    
    const newPlayer: Player = {
      id: Date.now().toString(),
      name: newPlayerName.trim()
    };
    
    setPlayers([...players, newPlayer]);
    setNewPlayerName('');
    setIsAddPlayerModalOpen(false);
  };

  const handleScoreChange = (playerId: string, value: string) => {
    // Allow empty string for better typing experience, treat as 0 or undefined internally
    const numValue = value === '' ? 0 : parseInt(value, 10);
    
    if (isNaN(numValue)) return; // Prevent non-numeric input (though type="number" handles most)

    setRounds(prev => {
      const newRounds = [...prev];
      newRounds[activeRoundIndex] = {
        ...newRounds[activeRoundIndex],
        [playerId]: numValue
      };
      return newRounds;
    });
  };

  const handleNextRound = () => {
    // If we are at the last round, add a new one
    if (activeRoundIndex === rounds.length - 1) {
      setRounds([...rounds, {}]);
    }
    setActiveRoundIndex(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevRound = () => {
    if (activeRoundIndex > 0) {
      setActiveRoundIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDeletePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
    setShowDeleteConfirm(null);
  };

  const resetGame = () => {
    if (confirm("Are you sure you want to reset the entire game? This cannot be undone.")) {
      setRounds([{}]);
      setActiveRoundIndex(0);
      // We purposefully don't clear players here, usually people want to keep players for next game.
      // But if desired, setPlayers([]) could be added.
    }
  };

  const toggleWinCondition = () => {
    setWinCondition(prev => prev === 'high' ? 'low' : 'high');
  };

  // Focus input ref for new player modal
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isAddPlayerModalOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddPlayerModalOpen]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary-600 text-white p-2 rounded-lg">
              <Trophy size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight hidden sm:block">CardScore</h1>
          </div>
          
          <div className="flex items-center gap-2">
             {/* Win Condition Toggle */}
             <button
               onClick={toggleWinCondition}
               className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors mr-1 sm:mr-2"
               title={`Click to change: Winner has ${winCondition === 'high' ? 'highest' : 'lowest'} score`}
             >
               {winCondition === 'high' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
               <span className="hidden sm:inline">{winCondition === 'high' ? 'High Wins' : 'Low Wins'}</span>
               <span className="sm:hidden">{winCondition === 'high' ? 'High' : 'Low'}</span>
             </button>

             <div className="h-6 w-px bg-slate-200 mx-1"></div>

             <Button variant="ghost" onClick={resetGame} title="Reset Scores" className="px-2">
               <RotateCcw size={18} />
             </Button>
             <div className="hidden sm:block text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
               Round {activeRoundIndex + 1}
             </div>
             {/* Mobile Round indicator */}
             <div className="sm:hidden text-sm font-bold text-slate-500">
               R{activeRoundIndex + 1}
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        
        {/* Navigation / Round Info */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">
            {activeRoundIndex === rounds.length - 1 && activeRoundIndex > 0 
              ? "Current Round" 
              : `Round ${activeRoundIndex + 1}`
            }
          </h2>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              onClick={handlePrevRound}
              disabled={activeRoundIndex === 0}
            >
              <ChevronLeft size={16} className="mr-1" /> Prev
            </Button>
            <Button 
              variant="primary" 
              onClick={handleNextRound}
            >
              Next <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>

        {/* Empty State */}
        {players.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-300">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 text-primary-600 mb-4">
              <Users size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Players Added</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              Add players to start tracking scores for your game. You can add as many as you need.
            </p>
            <Button onClick={() => setIsAddPlayerModalOpen(true)}>
              <Plus size={18} className="mr-2" /> Add First Player
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            
            {/* Sort Controls */}
            <div className="flex justify-end">
              <div className="relative inline-block text-left">
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="cursor-pointer appearance-none bg-white border border-slate-200 text-slate-600 hover:border-slate-300 py-1.5 pl-3 pr-8 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm transition-all"
                >
                  <option value="default">Sort: Added Time</option>
                  <option value="scoreDesc">Sort: Highest Score</option>
                  <option value="scoreAsc">Sort: Lowest Score</option>
                  <option value="nameAsc">Sort: Name (A-Z)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                   <ChevronDown size={14} />
                </div>
              </div>
            </div>

            {/* Player List */}
            {sortedPlayers.map((player) => (
              <Card key={player.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md">
                <div className="flex items-center gap-4 flex-1">
                  {/* Rank/Avatar */}
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0
                    ${leaderId === player.id 
                      ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400 ring-offset-2' 
                      : 'bg-slate-100 text-slate-600'}
                  `}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 truncate text-lg">
                        {player.name}
                      </h3>
                      {leaderId === player.id && (
                        <Trophy size={14} className="text-amber-500 fill-amber-500" />
                      )}
                    </div>
                    <div className="text-sm text-slate-500">
                      Total Score: <span className="font-bold text-slate-700">{totalScores[player.id]}</span>
                    </div>
                  </div>
                </div>

                {/* Score Input */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <label htmlFor={`score-${player.id}`} className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                      Round {activeRoundIndex + 1}
                    </label>
                    <div className="relative">
                      <input
                        id={`score-${player.id}`}
                        type="number"
                        inputMode="numeric"
                        pattern="-?[0-9]*"
                        placeholder="0"
                        value={currentRoundScores[player.id] === undefined ? '' : currentRoundScores[player.id]}
                        onChange={(e) => handleScoreChange(player.id, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="block w-24 sm:w-32 rounded-lg border-slate-300 bg-slate-50 p-3 text-right text-lg font-bold text-slate-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-xl"
                      />
                    </div>
                  </div>
                  
                  {/* Quick Delete Option */}
                  <button 
                    onClick={() => setShowDeleteConfirm(player.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Remove Player"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </Card>
            ))}

            <div className="flex justify-center mt-6">
              <Button 
                variant="secondary" 
                className="w-full sm:w-auto"
                onClick={() => setIsAddPlayerModalOpen(true)}
              >
                <Plus size={18} className="mr-2" /> Add Another Player
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Add Player Modal */}
      {isAddPlayerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Add New Player</h3>
            <form onSubmit={handleAddPlayer}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Player Name</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-lg p-3"
                  placeholder="e.g. Grandma"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="ghost" onClick={() => setIsAddPlayerModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!newPlayerName.trim()}>
                  Add Player
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Remove Player?</h3>
            <p className="text-slate-600 mb-6">
              Are you sure you want to remove this player? Their score history will be lost.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => handleDeletePlayer(showDeleteConfirm)}>
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}