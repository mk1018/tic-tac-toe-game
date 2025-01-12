import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Home() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    const insertInitialData = async () => {
      const { data, error } = await supabase
        .from('game')
        .select('*')
        .eq('id', 1);

      if (error) {
        console.error('Error fetching game data:', error);
        return;
      }

      if (data.length === 0) {
        const { error: insertError } = await supabase
          .from('game')
          .insert([
            { board: '["", "", "", "", "", "", "", "", ""]', isxnext: true, winner: null }
          ]);

        if (insertError) {
          console.error('Error inserting initial data:', insertError);
        } else {
          console.log('Initial data inserted successfully.');
        }
      } else {
        // 初期データをStateに反映
        const game = data[0];
        setBoard(JSON.parse(game.board));
        setIsXNext(game.isxnext);
        setWinner(game.winner);
      }
    };

    insertInitialData();

    const channel = supabase
      .channel('game')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game' }, (payload) => {
        console.log('Realtime update received:', payload);
        if (payload.eventType === 'UPDATE') {
          setBoard(JSON.parse(payload.new.board));
          setIsXNext(payload.new.isxnext);
          setWinner(payload.new.winner);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleClick = async (index) => {
    if (board[index] || winner) return;

    const newBoard = board.slice();
    newBoard[index] = isXNext ? 'X' : 'O';
    const newIsXNext = !isXNext;
    const newWinner = calculateWinner(newBoard);

    setBoard(newBoard);
    setIsXNext(newIsXNext);
    setWinner(newWinner);

    const { error } = await supabase
      .from('game')
      .update({ board: JSON.stringify(newBoard), isxnext: newIsXNext, winner: newWinner })
      .eq('id', 1);
    if (error) {
      console.error('Error updating game:', error);
    }
  };

  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const resetGame = async () => {
    const initialBoard = Array(9).fill(null);
    setBoard(initialBoard);
    setIsXNext(true);
    setWinner(null);

    const { error } = await supabase
      .from('game')
      .update({ board: JSON.stringify(initialBoard), isxnext: true, winner: null })
      .eq('id', 1);
    if (error) {
      console.error('Error resetting game:', error);
    }
  };

  return (
    <div>
      <h1>Tic Tac Toe</h1>
      <div className="board" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 100px)', gap: '10px' }}>
        {board.map((value, index) => (
          <button key={index} onClick={() => handleClick(index)} style={{ width: '100px', height: '100px', fontSize: '24px' }}>
            {value}
          </button>
        ))}
      </div>
      <button onClick={resetGame} style={{ marginTop: '20px', padding: '10px 20px', fontSize: '16px' }}>
        Reset Game
      </button>
      <div>
        {winner ? `Winner: ${winner}` : `Next player: ${isXNext ? 'X' : 'O'}`}
      </div>
    </div>
  );
}
