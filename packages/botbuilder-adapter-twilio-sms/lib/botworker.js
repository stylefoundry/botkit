"use strict";
/**
 * @module botbuilder-adapter-twilio-sms
 */
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const botkit_1 = require("botkit");
/**
 * This is a specialized version of [Botkit's core BotWorker class](core.md#BotWorker) that includes additional methods for interacting with Twilio SMS.
 * It includes all functionality from the base class, as well as the extension methods below.
 *
 * When using the TwilioAdapter with Botkit, all `bot` objects passed to handler functions will include these extensions.
 */ class TwilioBotWorker extends botkit_1.BotWorker {
    /**
     * Start a conversation with a given user identified by their phone number. Useful for sending pro-active messages:
     *
     * ```javascript
     * let bot = await controller.spawn();
     * await bot.startConversationWithUser(MY_PHONE_NUMBER);
     * await bot.send('An important update!');
     * ```
     *
     * @param userId A phone number in the form +1XXXYYYZZZZ
     */
    startConversationWithUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.changeContext({
                channelId: 'twilio-sms',
                // @ts-ignore
                conversation: { id: userId },
                bot: { id: this.controller.getConfig('twilio_number'), name: 'bot' },
                // @ts-ignore
                user: { id: userId }
            });
        });
    }
}
exports.TwilioBotWorker = TwilioBotWorker;
//# sourceMappingURL=botworker.js.map