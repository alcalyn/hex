import AppPlayer from '@shared/app/AppPlayer';
import { PlayerData } from '@shared/app/Types';
import useAuthStore from './stores/authStore';

export default class ClientPlayer extends AppPlayer {
    static fromPlayerData(playerData: null | PlayerData): ClientPlayer
    {
        const player = new ClientPlayer();

        player.setPlayerData(playerData);
        player.setReady();

        return player;
    }
    isLocal(): boolean
    {
        if (null === this.playerData) {
            return false;
        }

        return this.playerData.id === useAuthStore().loggedInUser?.id;
    }
}
