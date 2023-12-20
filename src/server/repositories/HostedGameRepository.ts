import { Service } from 'typedi';
import HostedGame from '../HostedGame';
import { Move } from '../../shared/game-engine';
import { MoveData, PlayerData } from '../../shared/app/Types';
import { HexServer } from '../server';
import { GameOptionsData } from '@shared/app/GameOptions';
import AppPlayer from '../../shared/app/AppPlayer';
import Rooms from '../../shared/app/Rooms';

@Service()
export default class HostedGameRepository
{
    private hostedGames: { [key: string]: HostedGame } = {};

    constructor(
        private io: HexServer,
    ) {}

    getGames()
    {
        return this.hostedGames;
    }

    getGame(id: string): null | HostedGame
    {
        return this.hostedGames[id] ?? null;
    }

    createGame(host: AppPlayer, gameOptions: GameOptionsData): HostedGame
    {
        const hostedGame = new HostedGame(this.io, gameOptions, host);
        this.hostedGames[hostedGame.getId()] = hostedGame;
        this.io.to(Rooms.lobby).emit('gameCreated', hostedGame.toData());

        return hostedGame;
    }

    playerJoinGame(playerDataOrAppPlayer: PlayerData | AppPlayer, gameId: string): true | string
    {
        const hostedGame = this.hostedGames[gameId];

        if (!hostedGame) {
            return 'no game ' + gameId;
        }

        const joinResult = hostedGame.playerJoin(playerDataOrAppPlayer);

        if ('string' === typeof joinResult) {
            return joinResult;
        }

        this.io.to([Rooms.lobby, Rooms.game(gameId)]).emit(
            'gameJoined',
            gameId,
            playerDataOrAppPlayer instanceof AppPlayer
                ? playerDataOrAppPlayer.getPlayerData()
                : playerDataOrAppPlayer
            ,
        );

        return true;
    }

    playerMove(playerDataOrAppPlayer: PlayerData | AppPlayer, gameId: string, move: MoveData): true | string
    {
        const hostedGame = this.hostedGames[gameId];

        if (!hostedGame) {
            return 'no game ' + gameId;
        }

        return hostedGame.playerMove(playerDataOrAppPlayer, new Move(move.row, move.col));
    }

    playerResign(playerDataOrAppPlayer: PlayerData | AppPlayer, gameId: string): true | string
    {
        const hostedGame = this.hostedGames[gameId];

        if (!hostedGame) {
            return 'no game ' + gameId;
        }

        return hostedGame.playerResign(playerDataOrAppPlayer);
    }

    playerCancel(playerDataOrAppPlayer: PlayerData | AppPlayer, gameId: string): true | string
    {
        const hostedGame = this.hostedGames[gameId];

        if (!hostedGame) {
            return 'no game ' + gameId;
        }

        return hostedGame.playerCancel(playerDataOrAppPlayer);
    }
}
