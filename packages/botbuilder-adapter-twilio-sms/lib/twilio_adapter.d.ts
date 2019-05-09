/**
 * @module botbuilder-adapter-twilio-sms
 */
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { Activity, BotAdapter, TurnContext, ConversationReference, ResourceResponse } from 'botbuilder';
import { TwilioBotWorker } from './botworker';
/**
 * Connect [Botkit](https://www.npmjs.com/package/botkit) or [BotBuilder](https://www.npmjs.com/package/botbuilder) to Twilio's SMS service.
 */
export declare class TwilioAdapter extends BotAdapter {
    /**
     * Name used by Botkit plugin loader
     * @ignore
     */
    name: string;
    /**
     * Object containing one or more Botkit middlewares to bind automatically.
     * @ignore
     */
    middlewares: any;
    /**
     * A specialized BotWorker for Botkit that exposes Twilio specific extension methods.
     * @ignore
     */
    botkit_worker: typeof TwilioBotWorker;
    private options;
    private api;
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
    constructor(options: TwilioAdapterOptions);
    /**
     * Formats a BotBuilder activity into an outgoing Twilio SMS message.
     * @param activity A BotBuilder Activity object
     * @returns a Twilio message object with {body, from, to, mediaUrl}
     */
    private activityToTwilio;
    /**
     * Standard BotBuilder adapter method to send a message from the bot to the messaging API.
     * [BotBuilder reference docs](https://docs.microsoft.com/en-us/javascript/api/botbuilder-core/botadapter?view=botbuilder-ts-latest#sendactivities).
     * @param context A TurnContext representing the current incoming message and environment. (Not used)
     * @param activities An array of outgoing activities to be sent back to the messaging API.
     */
    sendActivities(context: TurnContext, activities: Partial<Activity>[]): Promise<ResourceResponse[]>;
    /**
     * Twilio SMS adapter does not support updateActivity.
     * @ignore
     */
    updateActivity(context: TurnContext, activity: Partial<Activity>): Promise<void>;
    /**
     * Twilio SMS adapter does not support deleteActivity.
     * @ignore
     */
    deleteActivity(context: TurnContext, reference: Partial<ConversationReference>): Promise<void>;
    /**
     * Standard BotBuilder adapter method for continuing an existing conversation based on a conversation reference.
     * [BotBuilder reference docs](https://docs.microsoft.com/en-us/javascript/api/botbuilder-core/botadapter?view=botbuilder-ts-latest#continueconversation)
     * @param reference A conversation reference to be applied to future messages.
     * @param logic A bot logic function that will perform continuing action in the form `async(context) => { ... }`
     */
    continueConversation(reference: Partial<ConversationReference>, logic: (context: TurnContext) => Promise<void>): Promise<void>;
    /**
     * Accept an incoming webhook request and convert it into a TurnContext which can be processed by the bot's logic.
     * @param req A request object from Restify or Express
     * @param res A response object from Restify or Express
     * @param logic A bot logic function in the form `async(context) => { ... }`
     */
    processActivity(req: any, res: any, logic: (context: TurnContext) => Promise<void>): Promise<void>;
    /**
     * Validate that requests are coming from Twilio
     * @returns If signature is valid, returns true. Otherwise, sends a 400 error status via http response and then returns false.
     */
    private verifySignature;
}
/**
 * Parameters passed to the TwilioAdapter constructor.
 */
export interface TwilioAdapterOptions {
    /**
     * The phone number associated with this Twilio app, in the format 1XXXYYYZZZZ
     */
    twilio_number: string;
    /**
     * The account SID from the twilio account
     */
    account_sid: string;
    /**
     * An api auth token associated with the twilio account
     */
    auth_token: string;
    /**
     * An optional url to override the automatically generated url signature used to validate incoming requests -- [See Twilio docs about securing your endpoint.](https://www.twilio.com/docs/usage/security#validating-requests)
     */
    validation_url?: string;
}
