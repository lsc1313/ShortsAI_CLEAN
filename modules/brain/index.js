import { Brain } from "./brain.js";
import { Registry } from "./registry.js";

import { registerChannels } from "../channels/index.js";

export function createBrain({
    createShort,
    logger = console
}) {

    const registry = new Registry();

    registerChannels(registry);

    const brain = new Brain({
        registry,
        createShort,
        logger
    });

    return {
        brain,
        registry
    };

}

export { Brain };
export { Registry };
