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
const botbuilder_1 = require("botbuilder");
const Debug = require("debug");
const Twilio = require("twilio");
const botworker_1 = require("./botworker");
const debug = Debug('botkit:twilio');
/**
 * Connect [Botkit](https://www.npmjs.com/package/botkit) or [BotBuilder](https://www.npmjs.com/package/botbuilder) to Twilio's SMS service.
 */
class TwilioAdapter extends botbuilder_1.BotAdapter {
    /**
     * Create an adapter to handle incoming messages from Twilio's SMS service and translate them into a standard format for processing by your bot.
     *
     * Use with Botkit:
     *```javascript
     * const adapter = new TwilioAdapter({
     *      twilio_number: process.env.TWILIO_NUMBER,
     *      account_sid: process.env.TWILIO_ACCOUNT_SID,
     *      auth_token: process.env.TWILIO_AUTH_TOKEN,
     *      validation_url: process.env.TWILIO_VALIDATION_URL
     * });
     * const controller = new Botkit({
     *      adapter: adapter,
     *      // ... other configuration options
     * });
     * ```
     *
     * Use with BotBuilder:
     *```javascript
     * const adapter = new TwilioAdapter({
     *      twilio_number: process.env.TWILIO_NUMBER,
     *      account_sid: process.env.TWILIO_ACCOUNT_SID,
     *      auth_token: process.env.TWILIO_AUTH_TOKEN,
     *      validation_url: process.env.TWILIO_VALIDATION_URL
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
     * @param options An object containing API credentials, a webhook verification token and other options
     */
    constructor(options) {
        super();
        /**
         * Name used by Botkit plugin loader
         * @ignore
         */
        this.name = 'Twilio SMS Adapter';
        /**
         * A specialized BotWorker for Botkit that exposes Twilio specific extension methods.
         * @ignore
         */
        this.botkit_worker = botworker_1.TwilioBotWorker;
        this.options = options;
        if (!options.twilio_number) {
            throw new Error('twilio_number is a required part of the configuration.');
        }
        if (!options.account_sid) {
            throw new Error('account_sid  is a required part of the configuration.');
        }
        if (!options.auth_token) {
            throw new Error('auth_token is a required part of the configuration.');
        }
        this.api = Twilio(this.options.account_sid, this.options.auth_token);
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
     * Formats a BotBuilder activity into an outgoing Twilio SMS message.
     * @param activity A BotBuilder Activity object
     * @returns a Twilio message object with {body, from, to, mediaUrl}
     */
    activityToTwilio(activity) {
        let message = {
            body: activity.text,
            from: this.options.twilio_number,
            to: activity.conversation.id,
            mediaUrl: undefined
        };
        if (activity.channelData && activity.channelData.mediaUrl) {
            message.mediaUrl = activity.channelData.mediaUrl;
        }
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
                    const message = this.activityToTwilio(activity);
                    const res = yield this.api.messages.create(message);
                    responses.push({ id: res.sid });
                }
                else {
                    debug('Unknown message type encountered in sendActivities: ', activity.type);
                }
            }
            return responses;
        });
    }
    /**
     * Twilio SMS adapter does not support updateActivity.
     * @ignore
     */
    // eslint-disable-next-line
    updateActivity(context, activity) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('Twilio SMS does not support updating activities.');
        });
    }
    /**
     * Twilio SMS adapter does not support deleteActivity.
     * @ignore
     */
    // eslint-disable-next-line
    deleteActivity(context, reference) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('Twilio SMS does not support deleting activities.');
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
            if ((yield this.verifySignature(req, res)) === true) {
                const event = req.body;
                const activity = {
                    id: event.MessageSid,
                    timestamp: new Date(),
                    channelId: 'twilio-sms',
                    conversation: {
                        id: event.From
                    },
                    from: {
                        id: event.From
                    },
                    recipient: {
                        id: event.To
                    },
                    text: event.Body,
                    channelData: event,
                    type: botbuilder_1.ActivityTypes.Message
                };
                // Detect attachments
                if (event.NumMedia && parseInt(event.NumMedia) > 0) {
                    // specify a different event type for Botkit
                    activity.channelData.botkitEventType = 'picture_message';
                }
                // create a conversation reference
                const context = new botbuilder_1.TurnContext(this, activity);
                context.turnState.set('httpStatus', 200);
                yield this.runMiddleware(context, logic)
                    .catch((err) => { throw err; });
                // send http response back
                res.status(context.turnState.get('httpStatus'));
                if (context.turnState.get('httpBody')) {
                    res.send(context.turnState.get('httpBody'));
                }
                else {
                    res.end();
                }
            }
        });
    }
    /**
     * Validate that requests are coming from Twilio
     * @returns If signature is valid, returns true. Otherwise, sends a 400 error status via http response and then returns false.
     */
    verifySignature(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            let twilioSignature;
            let validation_url;
            // Restify style
            if (!req.headers) {
                twilioSignature = req.header('x-twilio-signature');
                validation_url = this.options.validation_url ||
                    (req.headers['x-forwarded-proto'] || (req.isSecure()) ? 'https' : 'http') + '://' + req.headers.host + req.url;
            }
            else {
                // express style
                twilioSignature = req.headers['x-twilio-signature'];
                validation_url = this.options.validation_url ||
                    ((req.headers['x-forwarded-proto'] || req.protocol) + '://' + req.hostname + req.originalUrl);
            }
            if (twilioSignature && Twilio.validateRequest(this.options.auth_token, twilioSignature, validation_url, req.body)) {
                return true;
            }
            else {
                debug('Signature verification failed, Ignoring message');
                res.status(400);
                res.send({
                    error: 'Invalid signature.'
                });
                return false;
            }
        });
    }
}
exports.TwilioAdapter = TwilioAdapter;
//# sourceMappingURL=twilio_adapter.js.map