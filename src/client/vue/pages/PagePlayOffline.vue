<script setup lang="ts">
/* eslint-env browser */
import GameView from '@client/pixi-board/GameView';
import AppBoard from '../components/AppBoard.vue';
import { Game, IllegalMove, PlayerIndex, calcRandomMove } from '@shared/game-engine';
import { HostedGameOptions, Player } from '../../../shared/app/models';
import { Ref, onMounted, ref } from 'vue';
import useAuthStore from '../../stores/authStore';
import { useSeoMeta } from '@unhead/vue';

useSeoMeta({
    title: 'Play offline',
    robots: 'noindex',
});

const offlineBoardContainer = ref<HTMLElement>();
const gameView = ref<GameView>();
const selectedGameOptions: Partial<HostedGameOptions> = JSON.parse(history.state.gameOptionsJson ?? '{}');
const gameOptions: HostedGameOptions = { ...new HostedGameOptions(), ...selectedGameOptions };
const players: Ref<Player[]> = ref([]);

const makeAIMoveIfApplicable = async (game: Game, players: Player[]): Promise<void> => {
    const player = players[game.getCurrentPlayerIndex()];

    if (!player.isBot || game.isEnded()) {
        return;
    }

    const move = await calcRandomMove(game);

    game.move(move, game.getCurrentPlayerIndex());
};

const initGame = (gameContainer: HTMLElement) => {
    const player: Player = useAuthStore().loggedInPlayer ?? {
        publicId: '',
        isBot: false,
        pseudo: 'Player',
        isGuest: false,
        createdAt: new Date(),
        slug: '',
    };

    players.value = [
        player,
        {
            isBot: true,
            isGuest: false,
            pseudo: 'Random bot',
            slug: '',
            publicId: '',
            createdAt: new Date(),
        },
    ];

    if (1 === gameOptions.firstPlayer) {
        players.value.reverse();
    } else if (null === gameOptions.firstPlayer) {
        if (Math.random() < 0.5) {
            players.value.reverse();
        }
    }

    const playerIndex = players.value.indexOf(player);

    if (0 !== playerIndex && 1 !== playerIndex) {
        throw new Error('Unexpected player index');
    }

    const game = new Game(gameOptions.boardsize);

    game.setAllowSwap(gameOptions.swapRule);

    gameView.value = new GameView(game, gameContainer);

    gameView.value.on('hexClicked', coords => {
        const move = game.createMoveOrSwapMove(coords);

        try {
            game.move(move, playerIndex as PlayerIndex);
        } catch (e) {
            if (!(e instanceof IllegalMove)) {
                throw e;
            }
        }
    });

    makeAIMoveIfApplicable(game, players.value);
    game.on('played', () => makeAIMoveIfApplicable(game, players.value));
};

onMounted(() => {
    if (!offlineBoardContainer.value) {
        throw new Error('Missing element with ref="offlineBoardContainer"');
    }

    initGame(offlineBoardContainer.value);
});

/*
 * Rematch
 */
const reload = ref(0);

// TODO: Implement the rematch button for offline games
// eslint-disable-next-line
const rematch = () => {
    if (!offlineBoardContainer.value) {
        throw new Error('Missing element with ref="offlineBoardContainer"');
    }

    initGame(offlineBoardContainer.value);
    ++reload.value;
};
</script>

<template>
    <div class="offline-board-container" ref="offlineBoardContainer">
        <AppBoard
            :key="reload"
            v-if="gameView"
            :gameView="gameView"
            :players="players"
        />
    </div>
</template>

<style lang="stylus" scoped>
.offline-board-container
    position relative
    width 100vw
    height calc(100vh - 3rem)
    height calc(100dvh - 3rem)
    overflow hidden

    // Mobile UI fix: add margin at bottom if url bar is present,
    // so it is possible to scroll to hide url bar and set full height again,
    // then the UI will fit 100vh again.
    margin-bottom calc(100lvh - 100dvh)
</style>
