import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './vue/App.vue';
import useHexClient from '@client/hexClient';
import routes from './vue/routes';

const pinia = createPinia();
const router = createRouter({
    history: createWebHistory(),
    routes,
});

const vueApp = createApp(App);
vueApp.use(router);
vueApp.use(pinia);

useHexClient().listenSocket();

(async () => {
    await useHexClient().getUserOrLoginAsGuest();

    useHexClient().reconnectSocket();
})();

vueApp.mount('#vue-app');
