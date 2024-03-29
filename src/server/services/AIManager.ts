import { GameOptionsData } from '@shared/app/GameOptions';
import prisma from './prisma';
import Player from '../../shared/app/models/Player';
import { Move, calcRandomMove } from '../../shared/game-engine';
import Container from 'typedi';
import RemoteApiPlayer from './RemoteApiPlayer';
import logger from './logger';
import { select as playerSelect } from '../persistance/PlayerPersister';
import { plainToInstance } from 'class-transformer';
import HostedGame from '../HostedGame';
import HexAiApiClient from './HexAiApiClient';

export class FindAIError extends Error {}

const findPlayerWithAIConfig = async (publicId: string): Promise<null | Player> => {
    return plainToInstance(Player, await prisma.player.findUnique({
        where: {
            publicId,
        },
        select: {
            ...playerSelect,
            aiConfig: true,
        },
    }));
};

export const findAIOpponent = async (gameOptions: GameOptionsData): Promise<null | Player> => {
    const { publicId } = gameOptions.opponent;

    if (!publicId) {
        throw new FindAIError('ai player publicId must be specified');
    }

    const player = await findPlayerWithAIConfig(publicId);

    if (null === player) {
        return null;
    }

    if (!player.aiConfig) {
        throw new FindAIError(`AI player with slug "${player.slug}" (publicId: ${player.publicId}) is missing its config in table AIConfig.`);
    }

    // AI is not on remote AI API, like random bot, moves are computed on this server
    if (!player.aiConfig.isRemote) {
        return player;
    }

    const aiConfigStatus = await Container.get(HexAiApiClient).getPeersStatus();

    // No peer at all
    if (0 === aiConfigStatus.totalPeers) {
        throw new FindAIError('Cannot use this remote AI player, AI api currently has no worker');
    }

    // AI requires more computation power, check there is powerful-enough peers, which should be the case of any primary peer.
    if (player.aiConfig.requireMorePower && 0 === aiConfigStatus.totalPeersPrimary) {
        throw new FindAIError('Cannot use this remote AI player, AI api currently has no powerful enough worker');
    }

    return player;
};

const validateConfigRandom = (config: unknown): config is { determinist: boolean } => {
    return 'object' === typeof config
        && null !== config
        && 'determinist' in config
        && 'boolean' === typeof config.determinist
    ;
};

export const makeAIPlayerMove = async (player: Player, hostedGame: HostedGame): Promise<null | Move> => {
    const { isBot } = player;
    let { aiConfig } = player;

    if (!isBot) {
        throw new Error('makeAIPlayerMove() called with a non bot player');
    }

    if (!aiConfig) {
        // Used when impersonating AI player to create AI vs AI games,
        // player.aiConfig won't be loaded when fetching authenticated player.
        const playerFull = await findPlayerWithAIConfig(player.publicId);

        if (null === playerFull || !playerFull.aiConfig) {
            throw new Error('makeAIPlayerMove() called with a ai player without ai config');
        }

        player = playerFull;
        aiConfig = playerFull.aiConfig;
    }

    if (aiConfig.isRemote) {
        return Container.get(RemoteApiPlayer).makeMove(aiConfig.engine, hostedGame, aiConfig.config);
    }

    const game = hostedGame.getGame();

    if (null === game) {
        throw new Error('makeAIPlayerMove() called with a HostedGame without game');
    }

    switch (aiConfig.engine) {
        case 'random':
            if (!validateConfigRandom(aiConfig.config)) {
                throw new Error('Invalid config for aiConfig');
            }

            return await calcRandomMove(game, 0, aiConfig.config.determinist);
    }

    logger.error(`No local AI play for bot with slug = "${player.slug}"`);
    return null;
};
