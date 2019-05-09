"use strict";
/**
 * @module botbuilder-adapter-facebook
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
const botworker_1 = require("./botworker");
const facebook_api_1 = require("./facebook_api");
const crypto = require("crypto");
const debug = Debug('botkit:facebook');
/**
 * Connect [Botkit](https://www.npmjs.com/package/botkit) or [BotBuilder](https://www.npmjs.com/package/botbuilder) to Facebook Messenger.
 */
class FacebookAdapter extends botbuilder_1.BotAdapter {
    /**
     * Create an adapter to handle incoming messages from Facebook and translate them into a standard format for processing by your bot.
     *
     * The Facebook Adapter can be used in 2 modes:
     * * bound to a single Facebook page
     * * multi-tenancy mode able to serve multiple pages
     *
     * To create an app bound to a single Facebook page, include that page's `access_token` in the options.
     *
     * To create an app that can be bound to multiple pages, include `getAccessTokenForPage` - a function in the form `async (pageId) => page_access_token`
     *
     * To use with Botkit:
     * ```javascript
     * const adapter = new FacebookAdapter({
     *      verify_token: process.env.FACEBOOK_VERIFY_TOKEN,
     *      app_secret: process.env.FACEBOOK_APP_SECRET,
     *      access_token: process.env.FACEBOOK_ACCESS_TOKEN
     * });
     * const controller = new Botkit({
     *      adapter: adapter,
     *      // other options
     * });
     * ```
     *
     * To use with BotBuilder:
     * ```javascript
     * const adapter = new FacebookAdapter({
     *      verify_token: process.env.FACEBOOK_VERIFY_TOKEN,
     *      app_secret: process.env.FACEBOOK_APP_SECRET,
     *      access_token: process.env.FACEBOOK_ACCESS_TOKEN
     * });
     * const server = restify.createServer();
     * server.use(restify.plugins.bodyParser());
     * server.post('/api/messages', (req, res) => {
     *      adapter.processActivity(req, res, async(context) => {
     *          // do your bot logic here!
     *      });
     * });
     * ```
     *
     * In multi-tenancy mode:
     * ```javascript
     * const adapter = new FacebookAdapter({
     *      verify_token: process.env.FACEBOOK_VERIFY_TOKEN,
     *      app_secret: process.env.FACEBOOK_APP_SECRET,
     *       getAccessTokenForPage: async(pageId) => {
     *           // do something to fetch the page access token for pageId.
     *           return token;
     *       })
     * });
     *```
     *
     * @param options Configuration options
     */
    constructor(options) {
        super();
        /**
         * Name used by Botkit plugin loader
         * @ignore
         */
        this.name = 'Facebook Adapter';
        /**
         * A customized BotWorker object that exposes additional utility methods.
         * @ignore
         */
        this.botkit_worker = botworker_1.FacebookBotWorker;
        this.options = Object.assign({ api_host: 'graph.facebook.com', api_version: 'v3.2' }, options);
        if (!this.options.access_token && !this.options.getAccessTokenForPage) {
            throw new Error('Adapter must receive either an access_token or a getAccessTokenForPage function.');
        }
        if (!this.options.app_secret) {
            throw new Error('Provide an app_secret in order to validate incoming webhooks and better secure api requests');
        }
        this.middlewares = {
            spawn: [
                (bot, next) => __awaiter(this, void 0, void 0, function* () {
                    bot.api = yield this.getAPI(bot.getConfig('activity'));
                    next();
                })
            ]
        };
    }
    /**
     * Botkit-only: Initialization function called automatically when used with Botkit.
     *      * Amends the webhook_uri with an additional behavior for responding to Facebook's webhook verification request.
     * @param botkit
     */
    init(botkit) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('Add GET webhook endpoint for verification at: ', botkit.getConfig('webhook_uri'));
            botkit.webserver.get(botkit.getConfig('webhook_uri'), (req, res) => {
                if (req.query['hub.mode'] === 'subscribe') {
                    if (req.query['hub.verify_token'] === this.options.verify_token) {
                        res.send(req.query['hub.challenge']);
                    }
                    else {
                        res.send('OK');
                    }
                }
            });
        });
    }
    /**
     * Get a Facebook API client with the correct credentials based on the page identified in the incoming activity.
     * This is used by many internal functions to get access to the Facebook API, and is exposed as `bot.api` on any BotWorker instances passed into Botkit handler functions.
     *
     * ```javascript
     * let api = adapter.getAPI(activity);
     * let res = api.callAPI('/me/messages', 'POST', message);
     * ```
     * @param activity An incoming message activity
     */
    getAPI(activity) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.options.access_token) {
                return new facebook_api_1.FacebookAPI(this.options.access_token, this.options.app_secret, this.options.api_host, this.options.api_version);
            }
            else {
                if (activity.recipient.id) {
                    let pageid = activity.recipient.id;
                    // if this is an echo, the page id is actually in the from field
                    if (activity.channelData && activity.channelData.message && activity.channelData.message.is_echo === true) {
                        pageid = activity.from.id;
                    }
                    const token = yield this.options.getAccessTokenForPage(pageid);
                    if (!token) {
                        throw new Error('Missing credentials for page.');
                    }
                    return new facebook_api_1.FacebookAPI(token, this.options.app_secret, this.options.api_host, this.options.api_version);
                }
                else {
                    // No API can be created, this is
                    debug('Unable to create API based on activity: ', activity);
                }
            }
        });
    }
    /**
     * Converts an Activity object to a Facebook messenger outbound message ready for the API.
     * @param activity
     */
    activityToFacebook(activity) {
        const message = {
            recipient: {
                id: activity.conversation.id
            },
            message: {
                text: activity.text,
                sticker_id: undefined,
                attachment: undefined,
                quick_replies: undefined
            },
            messaging_type: 'RESPONSE',
            tag: undefined,
            notification_type: undefined,
            persona_id: undefined,
            sender_action: undefined
        };
        // map these fields to their appropriate place
        if (activity.channelData) {
            if (activity.channelData.messaging_type) {
                message.messaging_type = activity.channelData.messaging_type;
            }
            if (activity.channelData.tag) {
                message.tag = activity.channelData.tag;
            }
            if (activity.channelData.sticker_id) {
                message.message.sticker_id = activity.channelData.sticker_id;
            }
            if (activity.channelData.attachment) {
                message.message.attachment = activity.channelData.attachment;
            }
            if (activity.channelData.persona_id) {
                message.persona_id = activity.channelData.persona_id;
            }
            if (activity.channelData.notification_type) {
                message.notification_type = activity.channelData.notification_type;
            }
            if (activity.channelData.sender_action) {
                message.sender_action = activity.channelData.sender_action;
            }
            // make sure the quick reply has a type
            if (activity.channelData.quick_replies) {
                message.message.quick_replies = activity.channelData.quick_replies.map(function (item) {
                    var quick_reply = Object.assign({}, item);
                    if (!item.content_type)
                        quick_reply.content_type = 'text';
                    return quick_reply;
                });
            }
        }
        debug('OUT TO FACEBOOK > ', message);
        return message;
    }
    /**
     * Standard BotBuilder adapter method to send a message from the bot to the messaging API.
     * [BotBuilder reference docs](https://docs.microsoft.com/en-us/javascript/api/botbuilder-core/botadapter?view=botbuilder-ts-latest#sendactivities).
     * @param context A TurnContext representing the current incoming message and environment.
     * @param activities An array of outgoing activities to be sent back to the messaging API.
     */
    sendActivities(context, activities) {
        return __awaiter(this, void 0, void 0, function* () {
            const responses = [];
            for (var a = 0; a < activities.length; a++) {
                const activity = activities[a];
                if (activity.type === botbuilder_1.ActivityTypes.Message) {
                    const message = this.activityToFacebook(activity);
                    try {
                        var api = yield this.getAPI(context.activity);
                        const res = yield api.callAPI('/me/messages', 'POST', message);
                        if (res) {
                            responses.push({ id: res.message_id });
                        }
                        debug('RESPONSE FROM FACEBOOK > ', res);
                    }
                    catch (err) {
                        console.error('Error sending activity to Facebook:', err);
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
     * Facebook adapter does not support updateActivity.
     * @ignore
     */
    // eslint-disable-next-line
    updateActivity(context, activity) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('Facebook adapter does not support updateActivity.');
        });
    }
    /**
     * Facebook adapter does not support updateActivity.
     * @ignore
     */
    // eslint-disable-next-line
    deleteActivity(context, reference) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('Facebook adapter does not support deleteActivity.');
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
            debug('IN FROM FACEBOOK >', req.body);
            if ((yield this.verifySignature(req, res)) === true) {
                let event = req.body;
                if (event.entry) {
                    for (var e = 0; e < event.entry.length; e++) {
                        let payload = null;
                        let entry = event.entry[e];
                        // handle normal incoming stuff
                        if (entry.changes) {
                            payload = entry.changes;
                        }
                        else if (entry.messaging) {
                            payload = entry.messaging;
                        }
                        for (let m = 0; m < payload.length; m++) {
                            yield this.processSingleMessage(payload[m], logic);
                        }
                        // handle standby messages (this bot is not the active receiver)
                        if (entry.standby) {
                            payload = entry.standyby;
                            for (let m = 0; m < payload.length; m++) {
                                let message = payload[m];
                                // indiciate that this message was received in standby mode rather than normal mode.
                                message.standby = true;
                                yield this.processSingleMessage(message, logic);
                            }
                        }
                    }
                    res.status(200);
                    res.end();
                }
            }
        });
    }
    /**
     * Handles each individual message inside a webhook payload (webhook may deliver more than one message at a time)
     * @param message
     * @param logic
     */
    processSingleMessage(message, logic) {
        return __awaiter(this, void 0, void 0, function* () {
            //  in case of Checkbox Plug-in sender.id is not present, instead we should look at optin.user_ref
            if (!message.sender && message.optin && message.optin.user_ref) {
                message.sender = { id: message.optin.user_ref };
            }
            const activity = {
                channelId: 'facebook',
                timestamp: new Date(),
                // @ts-ignore ignore missing optional fields
                conversation: {
                    id: message.sender.id
                },
                from: {
                    id: message.sender.id,
                    name: message.sender.id
                },
                recipient: {
                    id: message.recipient.id,
                    name: message.recipient.id
                },
                channelData: message,
                type: botbuilder_1.ActivityTypes.Event,
                text: null
            };
            if (message.message) {
                activity.type = botbuilder_1.ActivityTypes.Message;
                activity.text = message.message.text;
                if (activity.channelData.message.is_echo) {
                    activity.type = botbuilder_1.ActivityTypes.Event;
                }
                // copy fields like attachments, sticker, quick_reply, nlp, etc.
                for (let key in message.message) {
                    activity.channelData[key] = message.message[key];
                }
            }
            else if (message.postback) {
                activity.type = botbuilder_1.ActivityTypes.Message;
                activity.text = message.postback.payload;
            }
            const context = new botbuilder_1.TurnContext(this, activity);
            yield this.runMiddleware(context, logic)
                .catch((err) => { throw err; });
        });
    }
    /*
     * Verifies the SHA1 signature of the raw request payload before bodyParser parses it
     * Will abort parsing if signature is invalid, and pass a generic error to response
     */
    verifySignature(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var expected = req.headers['x-hub-signature'];
            var hmac = crypto.createHmac('sha1', this.options.app_secret);
            hmac.update(req.rawBody, 'utf8');
            let calculated = 'sha1=' + hmac.digest('hex');
            if (expected !== calculated) {
                res.status(401);
                debug('Token verification failed, Ignoring message');
                throw new Error('Invalid signature on incoming request');
            }
            else {
                return true;
            }
        });
    }
}
exports.FacebookAdapter = FacebookAdapter;
//# sourceMappingURL=facebook_adapter.js.map