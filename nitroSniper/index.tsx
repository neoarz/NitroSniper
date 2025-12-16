/*
Made with ❤️ by neoarz
I am not responsible for any damage caused by this plugin; use at your own risk
Vencord does not endorse/support this plugin (Works with Equicord as well)
dm @neoarz if u need help or have any questions
https://github.com/neoarz/NitroSniper
*/

import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { findByProps } from "@webpack";

const logger = new Logger("NitroSniper");

export default definePlugin({
    name: "NitroSniper",
    description: "Automatically redeems Nitro gift links sent in chat",
    authors: [Devs.neoarz],
    enabledByDefault: false, // Safer to have off by default?

    start() {
        this.startTime = Date.now();
    },
    startTime: 0,

    flux: {
        MESSAGE_CREATE({ message }) {
            if (!message.content) return;

            // Currently Captures: discord.gift/CODE, discord.com/gifts/CODE, im not sure if there are more but add/change the regex here
            const giftRegex = /(?:discord\.gift\/|discord\.com\/gifts?\/)([a-zA-Z0-9]{16,24})/;

            const match = message.content.match(giftRegex);

            if (match) {
                // We dont wanna try to claim old messages duh (if the client loads history)
                const created = new Date(message.timestamp).getTime();
                if (created < (this as any).startTime) return;

                const code = match[1];
                logger.log(`Detected Nitro code: ${code}. Redeeming...`);

                const GiftActions = findByProps("redeemGiftCode");
                if (!GiftActions) {
                    logger.error("GiftActions module not found!");
                    return;
                }

                GiftActions.redeemGiftCode({ code })
                    .then(() => {
                        logger.log(`Successfully redeemed code: ${code}!`);
                    })
                    .catch((err) => {
                        logger.error(`Failed to redeem code ${code}:`, err);
                    });
            }
        }
    }
});
