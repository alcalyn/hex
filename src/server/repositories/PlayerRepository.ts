import { PlayerData } from '@shared/app/Types';
import prisma from '../services/prisma';
import { Service } from 'typedi';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../services/security/authentication';
import logger from '../services/logger';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { checkPseudo, pseudoSlug } from '../../shared/app/pseudoUtils';
import HandledError from '../../shared/app/Errors';

export class PseudoAlreadyTakenError extends HandledError {}
export class MustBeGuestError extends HandledError {}

const select = {
    pseudo: true,
    publicId: true,
    isGuest: true,
    isBot: true,
    slug: true,
    createdAt: true,
};

@Service()
export default class PlayerRepository
{
    /**
     * Cached players indexed by publicId
     */
    private playersCache: { [key: string]: PlayerData } = {};

    async getPlayer(publicId: string): Promise<null | PlayerData>
    {
        if (this.playersCache[publicId]) {
            return this.playersCache[publicId];
        }

        const player = await prisma.player.findUnique({
            select,
            where: {
                publicId,
            },
        });

        if (null !== player) {
            this.playersCache[publicId] = player;
        }

        return player;
    }

    async getPlayerBySlug(slug: string): Promise<null | PlayerData>
    {
        return await prisma.player.findUnique({
            select,
            where: {
                slug,
            },
        });
    }

    async createGuest(): Promise<PlayerData>
    {
        let exponent = 3;

        while (exponent < 12) {
            try {
                const pseudo = String(10 ** exponent + Math.floor(Math.random() * 9 * (10 ** exponent)));
                const publicId = uuidv4();

                return this.playersCache[publicId] = await prisma.player.create({
                    select,
                    data: {
                        publicId,
                        pseudo,
                        slug: pseudoSlug(pseudo),
                        isGuest: true,
                    },
                });
            } catch (e) {
                if (e instanceof PrismaClientKnownRequestError && e.message.includes('Unique constraint failed')) {
                    ++exponent;
                    continue;
                }

                throw e;
            }
        }

        logger.error('Unable to create a guest');
        throw new Error('Unable to create a guest');
    }

    /**
     * @throws {PseudoAlreadyTakenError}
     * @throws {PseudoTooShortError}
     * @throws {PseudoTooLongError}
     */
    async createPlayer(pseudo: string, password: string): Promise<PlayerData>
    {
        checkPseudo(pseudo);

        try {
            const publicId = uuidv4();

            return this.playersCache[publicId] = await prisma.player.create({
                select,
                data: {
                    publicId,
                    pseudo,
                    slug: pseudoSlug(pseudo),
                    password: await hashPassword(password),
                },
            });
        } catch (e) {
            if (e instanceof PrismaClientKnownRequestError && e.message.includes('Unique constraint failed')) {
                throw new PseudoAlreadyTakenError();
            }

            throw e;
        }
    }

    /**
     * @throws {MustBeGuestError}
     * @throws {PseudoAlreadyTakenError}
     * @throws {PseudoTooShortError}
     * @throws {PseudoTooLongError}
     */
    async upgradeGuest(publicId: string, pseudo: string, password: string): Promise<PlayerData>
    {
        checkPseudo(pseudo);

        const player = await this.getPlayer(publicId);

        if (null === player) {
            // Should not happen: a session linked to a non-existing player
            throw new Error('Player not found');
        }

        if (!player.isGuest) {
            throw new MustBeGuestError();
        }

        try {
            return this.playersCache[publicId] = await prisma.player.update({
                select,
                where: {
                    publicId,
                },
                data: {
                    isGuest: false,
                    pseudo,
                    slug: pseudoSlug(pseudo),
                    password: await hashPassword(password),
                    createdAt: new Date(),
                },
            });
        } catch (e) {
            if (e instanceof PrismaClientKnownRequestError && e.message.includes('Unique constraint failed')) {
                throw new PseudoAlreadyTakenError();
            }

            throw e;
        }
    }
}
