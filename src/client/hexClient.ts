import { Game, GameLoop, Move, PlayerIndex, PlayerInterface } from '@shared/game-engine';
import { GameData, MoveData, PlayerData } from '@shared/game-engine/Types';
import { GameInstanceData } from '@shared/Types';
import { defineStore } from 'pinia';
import { Socket } from 'socket.io-client';
import FrontPlayer from './FrontPlayer';
import GameClientSocket from './GameClientSocket';
import socket from './socket';

const useHexClient = defineStore('hexClient', {
    state: () => ({
        /**
         * List of games visible on lobby
         */
        games: {} as {[key: string]: GameInstanceData},

        /**
         * List of loaded games
         */
        gameClientSockets: {} as {[key: string]: GameClientSocket},
    }),

    actions: {
        async createGame(): Promise<string>
        {
            const response = await fetch('/api/games/1v1', {
                method: 'post',
            });

            const gameData: GameInstanceData = await response.json();

            return gameData.id;
        },

        async createGameVsCPU(): Promise<string>
        {
            const response = await fetch('/api/games/cpu', {
                method: 'post',
            });

            const gameData: GameInstanceData = await response.json();

            return gameData.id;
        },

        async updateGames(): Promise<void>
        {
            const response = await fetch('/api/games');
            const games: GameInstanceData[] = await response.json();

            games.forEach(game => {
                this.games[game.id] = game;
            });
        },

        async retrieveGameClientSocket(gameId: string): Promise<null|GameClientSocket>
        {
            if (this.gameClientSockets[gameId]) {
                return this.gameClientSockets[gameId];
            }

            const response = await fetch(`/api/games/${gameId}`);

            if (!response.ok) {
                if (this.gameClientSockets[gameId]) {
                    delete this.gameClientSockets[gameId];
                }

                return null;
            }

            const gameInstanceData: GameInstanceData = await response.json();

            const players: [PlayerInterface, PlayerInterface] = [
                new FrontPlayer(true, gameInstanceData.game.players[0]),
                new FrontPlayer(true, gameInstanceData.game.players[1]),
            ];

            const game = Game.createFromGameData(players, gameInstanceData.game);

            if (gameInstanceData.game.started) {
                game.start();
            }

            const gameClientSocket = new GameClientSocket(gameId, game);

            this.gameClientSockets[gameId] = gameClientSocket;

            return gameClientSocket;
        },

        joinRoom(socket: Socket, join: 'join' | 'leave', gameId: string): void
        {
            socket.emit('room', join, gameId);
        },

        async joinGame(gameId: string, playerIndex: PlayerIndex): Promise<boolean>
        {
            return new Promise(resolve => {
                socket.emit('joinGame', gameId, playerIndex, (answer: boolean) => {
                    resolve(answer);
                });
            });
        },

        async move(gameId: string, move: Move): Promise<boolean>
        {
            return new Promise(resolve => {
                socket.emit('move', gameId, {row: move.getRow(), col: move.getCol()}, (answer: boolean) => {
                    resolve(answer);
                });
            });
        },

        listenSocket(socket: Socket): void
        {
            this.updateGames();

            socket.on('gameCreated', (game: GameInstanceData) => {
                if (!this.games[game.id]) {
                    this.games[game.id] = game;
                }
            });

            socket.on('gameJoined', (gameId: string, playerIndex: PlayerIndex, playerData: PlayerData) => {
                const gameClientSocket = this.gameClientSockets[gameId];

                if (!gameClientSocket) {
                    console.error('game not found', gameId);
                    return;
                }

                gameClientSocket.playerJoined(playerIndex, playerData);
            });

            socket.on('gameStarted', (gameId: string) => {
                const gameClientSocket = this.gameClientSockets[gameId];

                if (!gameClientSocket) {
                    console.error('game not found', gameId);
                    return;
                }

                gameClientSocket.gameStarted();
            });

            socket.on('moved', (gameId: string, move: MoveData, byPlayerIndex: PlayerIndex) => {
                const gameClientSocket = this.gameClientSockets[gameId];

                if (!gameClientSocket) {
                    console.error('game not found', gameId);
                    return;
                }

                gameClientSocket.gameMove(new Move(move.row, move.col), byPlayerIndex);
            });
        },
    },
});

export default useHexClient;