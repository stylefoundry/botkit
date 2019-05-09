"use strict";
/**
 * @module botbuilder-adapter-hangouts
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
const botbuilder_1 = require("botbuilder");
const Debug = require("debug");
const googleapis_1 = require("googleapis");
const botworker_1 = require("./botworker");
const debug = Debug('botkit:hangouts');
const apiVersion = 'v1';
/**
 * Connect [Botkit](https://www.npmjs.com/package/botkit) or [BotBuilder](https://www.npmjs.com/package/botbuilder) to Google Hangouts
 *
 */
class HangoutsAdapter extends botbuilder_1.BotAdapter {
    /**
     * Create an adapter to handle incoming messages from Google Hangouts and translate them into a standard format for processing by your bot.
     *
     * Use with Botkit:
     *```javascript
     * const adapter = new HangoutsAdapter({
     *      token: process.env.GOOGLE_TOKEN,
     *      google_auth_params: {
     *          credentials: process.env.GOOGLE_CREDS
     *      }
     * });
     * const controller = new Botkit({
     *      adapter: adapter,
     *      // ... other configuration options
     * });
     * ```
     *
     * Use with BotBuilder:
     *```javascript
     * const adapter = new HangoutsAdapter({
     *      token: process.env.GOOGLE_TOKEN,
     *      google_auth_params: {
     *          credentials: process.env.GOOGLE_CREDS
     *      }
     * });
     * // set up restify...
     * const server = restify.createServer();
     * server.use(restify.plugins.bodyParser());
     * server.post('/api/messages', (req, res) => {
     *      adapter.processActivity(req, res, async(context) => {
     *          // do your bot logic here!
     *      });
     * });
     * ```
     *
     * @param options An object containing API credentials and a webhook verification token
     */
    constructor(options) {
        super();
        /**
         * Name used by Botkit plugin loader
         * @ignore
         */
        this.name = 'Google Hangouts Adapter';
        /**
         * A customized BotWorker object that exposes additional utility methods.
         * @ignore
         */
        this.botkit_worker = botworker_1.HangoutsBotWorker;
        this.options = options;
        if (!this.options.token) {
            const warning = [
                ``,
                `****************************************************************************************`,
                `* WARNING: Your bot is operating without recommended security mechanisms in place.     *`,
                `* Initialize your adapter with a token parameter to enable                             *`,
                `* verification that all incoming webhooks originate with Google:                       *`,
                `*                                                                                      *`,
                `* var adapter = new HangoutsAdapter({token: <my secret from Google>});                 *`,
                `*                                                                                      *`,
                `****************************************************************************************`,
                `>> Official docs: https://developers.google.com/hangouts/chat/how-tos/bots-develop?hl=en_US#verifying_bot_authenticity`,
                ``
            ];
            console.warn(warning.join('\n'));
            throw new Error('Required: include a verificationToken or clientSigningSecret to verify incoming Events API webhooks');
        }
        let params = Object.assign({ scopes: 'https://www.googleapis.com/auth/chat.bot' }, this.options.google_auth_params);
        googleapis_1.google
            .auth
            .getClient(params)
            .then(client => {
            this.api = googleapis_1.google.chat({ version: apiVersion, auth: client });
        })
            .catch(err => {
            console.error('Could not get google auth client !');
            throw new Error(err);
        });
        this.middlewares = {
            spawn: [
                (bot, next) => __awaiter(this, void 0, void 0, function* () {
                    bot.api = this.api;
                    next();
                })
            ]
        };
    }
    /**
     * Formats a BotBuilder activity into an outgoing Hangouts event.
     * @param activity A BotBuilder Activity object
     */
    activityToHangouts(activity) {
        const message = {
            parent: activity.conversation.id,
            // @ts-ignore Ignore the presence of this unofficial field
            threadKey: activity.conversation.threadKey || null,
            requestBody: {
                text: activity.text,
                // @ts-ignore Ignore the presence of this unofficial field
                thread: activity.conversation.thread ? { name: activity.conversation.thread } : null
            }
        };
        // if channelData is specified, overwrite any fields in message object
        if (activity.channelData) {
            Object.keys(activity.channelData).forEach(function (key) {
                message.requestBody[key] = activity.channelData[key];
            });
        }
        debug('OUT TO HANGOUTS > ', message);
        return message;
    }
    /**
     * Standard BotBuilder adapter method to send a message from the bot to the messaging API.
     * [BotBuilder reference docs](https://docs.microsoft.com/en-us/javascript/api/botbuilder-core/botadapter?view=botbuilder-ts-latest#sendactivities).
     * @param context A TurnContext representing the current incoming message and environment. (Not used)
     * @param activities An array of outgoing activities to be sent back to the messaging API.
     */
    sendActivities(context, activities) {
        return __awaiter(this, void 0, void 0, function* () {
            const responses = [];
            for (var a = 0; a < activities.length; a++) {
                const activity = activities[a];
                if (activity.type === botbuilder_1.ActivityTypes.Message) {
                    const message = this.activityToHangouts(activity);
                    try {
                        const res = yield this.api.spaces.messages.create(message);
                        responses.push({ id: res.data.name });
                    }
                    catch (err) {
                        console.error('Error sending activity to API:', err);
                    }
                }
                else {
                    // If there are ever any non-message type events that need to be sent, do it here.
                    debug('Unknown message type encountered in sendActivities: ', activity.type);
                }
            }
            return responses;
        });
    }
    /**
     * Standard BotBuilder adapter method to update a previous message with new content.
     * [BotBuilder reference docs](https://docs.microsoft.com/en-us/javascript/api/botbuilder-core/botadapter?view=botbuilder-ts-latest#updateactivity).
     * @param context A TurnContext representing the current incoming message and environment. (Not used)
     * @param activity The updated activity in the form `{id: <id of activity to update>, text: <updated text>, cards?: [<array of updated hangouts cards>]}`
     */
    updateActivity(context, activity) {
        return __awaiter(this, void 0, void 0, function* () {
            if (activity.id) {
                try {
                    const results = yield this.api.spaces.messages.update({
                        name: activity.id,
                        updateMask: 'text,cards',
                        resource: {
                            text: activity.text,
                            // @ts-ignore allow cards field
                            cards: activity.cards ? activity.cards : (activity.channelData ? activity.channelData.cards : null)
                        }
                    });
                    if (!results || results.status !== 200) {
                        throw new Error('updateActivity failed: ' + results.statusText);
                    }
                }
                catch (err) {
                    console.error('Error updating activity on Hangouts.');
                    throw (err);
                }
            }
            else {
                throw new Error('Cannot update activity: activity is missing id');
            }
        });
    }
    /**
     * Standard BotBuilder adapter method to delete a previous message.
     * [BotBuilder reference docs](https://docs.microsoft.com/en-us/javascript/api/botbuilder-core/botadapter?view=botbuilder-ts-latest#deleteactivity).
     * @param context A TurnContext representing the current incoming message and environment. (Not used)
     * @param reference An object in the form `{activityId: <id of message to delete>}`
     */
    deleteActivity(context, reference) {
        return __awaiter(this, void 0, void 0, function* () {
            if (reference.activityId) {
                try {
                    const results = yield this.api.spaces.messages.delete({
                        name: reference.activityId
                    });
                    console.log('results of delete', results);
                    if (!results || results.status !== 200) {
                        throw new Error('deleteActivity failed: ' + results.statusText);
                    }
                }
                catch (err) {
                    console.error('Error deleting activity', err);
                    throw err;
                }
            }
            else {
                throw new Error('Cannot delete activity: reference is missing activityId');
            }
        });
    }
    /**
     * Standard BotBuilder adapter method for continuing an existing conversation based on a conversation reference.
     * [BotBuilder reference docs](https://docs.microsoft.com/en-us/javascript/api/botbuilder-core/botadapter?view=botbuilder-ts-latest#continueconversation)
     * @param reference A conversation reference to be applied to future messages.
     * @param logic A bot logic function that will perform continuing action in the form `async(context) => { ... }`
     */
    continueConversation(reference, logic) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = botbuilder_1.TurnContext.applyConversationReference({ type: 'event', name: 'continueConversation' }, reference, true);
            const context = new botbuilder_1.TurnContext(this, request);
            return this.runMiddleware(context, logic);
        });
    }
    /**
     * Accept an incoming webhook request and convert it into a TurnContext which can be processed by the bot's logic.
     * @param req A request object from Restify or Express
     * @param res A response object from Restify or Express
     * @param logic A bot logic function in the form `async(context) => { ... }`
     */
    processActivity(req, res, logic) {
        return __awaiter(this, void 0, void 0, function* () {
            let event = req.body;
            debug('IN FROM HANGOUTS >', event);
            if (this.options.token && this.options.token !== event.token) {
                res.status(401);
                debug('Token verification failed, Ignoring message');
            }
            else {
                const activity = {
                    id: event.message ? event.message.name : event.eventTime,
                    timestamp: new Date(),
                    channelId: 'googlehangouts',
                    conversation: {
                        id: event.space.name,
                        // @ts-ignore
                        thread: (event.message && !event.threadKey) ? event.message.thread.name : null,
                        // @ts-ignore
                        threadKey: event.threadKey || null
                    },
                    from: {
                        id: event.user.name,
                        name: event.user.name
                    },
                    channelData: event,
                    text: event.message ? (event.message.argumentText ? event.message.argumentText.trim() : '') : '',
                    type: event.message ? botbuilder_1.ActivityTypes.Message : botbuilder_1.ActivityTypes.Event
                };
                // Change type of message event for private messages
                if (event.space.type === 'DM') {
                    activity.channelData.botkitEventType = 'direct_message';
                }
                if (event.type === 'ADDED_TO_SPACE') {
                    activity.type = botbuilder_1.ActivityTypes.Event;
                    activity.channelData.botkitEventType = event.space.type === 'ROOM' ? 'bot_room_join' : 'bot_dm_join';
                }
                if (event.type === 'REMOVED_FROM_SPACE') {
                    activity.type = botbuilder_1.ActivityTypes.Event;
                    activity.channelData.botkitEventType = event.space.type === 'ROOM' ? 'bot_room_leave' : 'bot_dm_leave';
                }
                if (event.type === 'CARD_CLICKED') {
                    activity.type = botbuilder_1.ActivityTypes.Event;
                    activity.channelData.botkitEventType = event.type.toLowerCase();
                }
                // create a conversation reference
                const context = new botbuilder_1.TurnContext(this, activity);
                if (event.type !== 'CARD_CLICKED') {
                    // send 200 status immediately, otherwise
                    // hangouts does not mark the incoming message as received
                    res.status(200);
                    res.end();
                }
                else {
                    context.turnState.set('httpStatus', 200);
                }
                yield this.runMiddleware(context, logic)
                    .catch((err) => { throw err; });
                if (event.type === 'CARD_CLICKED') {
                    // send http response back
                    res.status(context.turnState.get('httpStatus'));
                    if (context.turnState.get('httpBody')) {
                        res.send(context.turnState.get('httpBody'));
                    }
                    else {
                        res.end();
                    }
                }
            }
        });
    }
}
exports.HangoutsAdapter = HangoutsAdapter;
//# sourceMappingURL=hangouts_adapter.js.map