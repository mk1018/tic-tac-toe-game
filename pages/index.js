import { useState, useEffect } from 'react';
import { supabase, signInWithGoogle, signOut } from '../supabaseClient';

export default function Home() {
  const [user, setUser] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState(null);
  const [gameId, setGameId] = useState(null);

  useEffect(() => {
    const initializeUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData?.user);
    };

    initializeUser();
  }, []);


  useEffect(() => {
    if (!gameId) return;

    const initializeGame = async () => {
      const { data, error } = await supabase
        .from('game')
        .select('*')
        .eq('id', gameId);

      if (error) {
        console.error('Error fetching game data:', error);
        return;
      }

      if (data.length === 0) {
        const { error: insertError } = await supabase
          .from('game')
          .insert([{ board: JSON.stringify(Array(9).fill(null)), isxnext: true, winner: null }]);

        if (insertError) {
          console.error('Error inserting initial data:', insertError);
        } else {
          console.log('Initial game data inserted.');
        }
      } else {
        const game = data[0];
        setBoard(JSON.parse(game.board));
        setIsXNext(game.isxnext);
        setWinner(game.winner);
      }
    };

    initializeGame();

    const channel = supabase
      .channel('game')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game' }, (payload) => {
        console.log('Realtime update:', payload);
        const game = payload.new;
        setBoard(JSON.parse(game.board));
        setIsXNext(game.isxnext);
        setWinner(game.winner);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

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
      .eq('id', gameId);

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
    for (const [a, b, c] of lines) {
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
      .eq('id', gameId);

    if (error) {
      console.error('Error resetting game:', error);
    }
  };

  const handleNewGame = async () => {
    if (!user) {
      console.error('User must be logged in to start a new game.');
      return;
    }

    const { data, error } = await supabase
      .from('game')
      .insert([
        {
          board: JSON.stringify(Array(9).fill(null)),
          isxnext: true,
          winner: null,
          player1: user.id,
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.error('Error creating new game:', error);
    } else {
      console.log('New game created successfully:', data);
      setGameId(data.id);
    }
  };

  const handleGoogleLogin = async () => {
    const { user: loggedInUser, error } = await signInWithGoogle();
    if (error) {
      console.error('Google login error:', error.message);
    } else {
      console.log('Login successful:', loggedInUser);
      setUser(loggedInUser);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Logout error:', error.message);
    } else {
      console.log('Logout successful');
      setUser(null);
    }
  };

  return (
    <div>
      <h1>Tic Tac Toe</h1>
      {!user ? (
        <button onClick={handleGoogleLogin} style={{ marginBottom: '20px', padding: '10px 20px', fontSize: '16px' }}>
          Login with Google
        </button>
      ) : (
        <button onClick={handleSignOut} style={{ marginBottom: '20px', padding: '10px 20px', fontSize: '16px' }}>
          Logout
        </button>
      )}
      {user && (
        <div>
          <p>User: {user.email}</p>
        </div>
      )}
      {gameId && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 100px)', gap: '5px' }}>
        {board.map((value, index) => (
          <button key={index} onClick={() => handleClick(index)} style={{ width: '100px', height: '100px', fontSize: '24px' }}>
            {value}
          </button>
        ))}
      </div>
      )}
      <button onClick={handleNewGame} style={{ marginTop: '20px', padding: '10px 20px', fontSize: '16px' }}>
        New Game
      </button>
      <button onClick={resetGame} style={{ marginTop: '20px', padding: '10px 20px', fontSize: '16px' }}>
        Reset Game
      </button>
      <div style={{ marginTop: '20px', fontSize: '18px' }}>
        {winner ? `Winner: ${winner}` : `Next player: ${isXNext ? 'X' : 'O'}`}
      </div>
    </div>
  );
}
