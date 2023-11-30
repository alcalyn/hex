<template>
    <h1>Other Hex resources</h1>

    <p>
        Here is a list of external resources about Hex you may be interested in.
    </p>

    <div class="links">
        <div v-for="resource in resources" class="link">
            <div class="illustration">
                <i v-if="isIcon(resource.illustration)" :class="resource.illustration.icon"></i>
                <img v-else :src="resource.illustration.src" class="rounded" :alt="resource.illustration.alt" />
            </div>
            <div class="details">
                <h5 class="card-title">{{ resource.title }}</h5>
                <h6 class="card-subtitle mb-2 text-body-secondary">{{ resource.subTitle }}</h6>
                <p v-for="p in resource.paragraph" class="card-text">
                    {{ p }}
                </p>
                <a :href="resource.link" class="stretched-link" target="_blank">{{ resource.link }}</a>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
type Icon = { icon: string };
type Image = { src: string, alt: string };
type Resource = {
    link: string;
    title: string;
    subTitle: string;
    illustration: Icon | Image;
    paragraph: string | string[];
};

const isIcon = (illustration: Icon | Image): illustration is Icon => !!(illustration as Icon).icon;

const resources: Resource[] = [
    {
        link: 'http://www.mseymour.ca/hex_puzzle/',
        title: '500 Hex puzzles',
        subTitle: 'Hex puzzles from beginner to expert',
        illustration: { src: '/images/links/500-puzzles.png', alt: '500 Hex puzzles by Matthew Seymour' },
        paragraph: [
            `
                A collection of 500 puzzles made by hand by Matthew Seymour.
                Puzzles are designed to let you learn all tactics you must know,
                beginning with the most famous ones.
            `,
        ],
    },
    {
        link: 'http://www.mseymour.ca/hex_book/hexstrat.html',
        title: 'Hex: A Strategy Guide',
        subTitle: 'Guide to learn Hex basics and advanced tactics',
        illustration: { icon: 'bi-file-earmark-text' },
        paragraph: [
            'By the same author of "500 Hex puzzles" above, a very exhaustive guide to learn Hex rules.',
            `
                All knowns strategies and tactics are segmented in 9 chapters,
                like "Basic concepts", "Advanced tactics", "The opening", "Commented games", …
            `,
            'The guide is illustrated with lot of interactive examples.',
        ],
    },
    {
        link: 'https://discord.gg/59SJ9KwvVq',
        title: 'Hex Discord Server',
        subTitle: 'Discord server with ~200 Hex players',
        illustration: { icon: 'bi-discord' },
        paragraph: [
            'To talk to other Hex players, see tournaments or events related to Hex.',
        ],
    },
    {
        link: 'https://www.hexwiki.net',
        title: 'HexWiki',
        subTitle: 'Still maintained wiki dedicated to Hex',
        illustration: { icon: 'bi-wikipedia' },
        paragraph: [
            'Detailled wiki on Hex. See main page to have a list of good pages to explore.',
        ],
    },
];
</script>

<style lang="stylus" scoped>
.links
    .link
        display flex
        margin-bottom 4em
        position relative

        .illustration
            margin-right 1em
            text-align right

            min-width 20%
            height 4em

            @media (min-width: 576px)
                width 8em
                height 8em

            img
                max-height 100%
                max-width 100%

            i
                font-size 3em

        .details
            text-align left
</style>