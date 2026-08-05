import { searchPixabay } from "../providers/pixabayProvider.js";
import { searchPexels } from "../providers/pexelsProvider.js";
import { searchPollinations } from "../providers/pollinationsProvider.js";

export const providers = [
    {
        name:"Pixabay",
        search:searchPixabay
    },
    {
        name:"Pexels",
        search:searchPexels
    },
    {
        name:"Pollinations",
        search:searchPollinations
    }
];

