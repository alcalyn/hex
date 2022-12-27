import { Game, IllegalMove, Move } from '@shared/game-engine';
import FrontPlayer from '@client/FrontPlayer';
import MoveControllerInterface from '@client/MoveController/MoveControllerInterface';

export default class RemotePlayMoveController implements MoveControllerInterface
{
    public constructor(
        private gameId: string,
        private hexClient: any,
    ) {}

    public move(game: Game, move: Move): void
    {
        const currentPlayer = game.getCurrentPlayer();

        try {
            if (
                !(currentPlayer instanceof FrontPlayer)
                || !currentPlayer.interactive
            ) {
                throw new IllegalMove('not your turn');
            }

            game.checkMove(move);

            //game.setCell(move, game.getCurrentPlayerIndex());

            this.hexClient.move(this.gameId, move);
        } catch (e) {
            if (e instanceof IllegalMove) {
                console.error(e.message);
            } else {
                throw e;
            }
        }
    }
}
