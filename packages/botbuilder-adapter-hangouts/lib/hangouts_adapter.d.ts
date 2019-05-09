/**
 * @module botbuilder-adapter-hangouts
 */
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { Activity, BotAdapter, TurnContext, ConversationReference, ResourceResponse } from 'botbuilder';
import { HangoutsBotWorker } from './botworker';
/**
 * Connect [Botkit](https://www.npmjs.com/package/botkit) or [BotBuilder](https://www.npmjs.com/package/botbuilder) to Google Hangouts
 *
 */
export declare class HangoutsAdapter extends BotAdapter {
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
     * A customized BotWorker object that exposes additional utility methods.
     * @ignore
     */
    botkit_worker: typeof HangoutsBotWorker;
    /**
     * Location of configuration options.
     */
    private options;
    /**
     * A copy of the Google Chat client.
     */
    private api;
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
    constructor(options: HangoutsAdapterOptions);
    /**
     * Formats a BotBuilder activity into an outgoing Hangouts event.
     * @param activity A BotBuilder Activity object
     */
    private activityToHangouts;
    /**
     * Standard BotBuilder adapter method to send a message from the bot to the messaging API.
     * [BotBuilder reference docs](https://docs.microsoft.com/en-us/javascript/api/botbuilder-core/botadapter?view=botbuilder-ts-latest#sendactivities).
     * @param context A TurnContext representing the current incoming message and environment. (Not used)
     * @param activities An array of outgoing activities to be sent back to the messaging API.
     */
    sendActivities(context: TurnContext, activities: Partial<Activity>[]): Promise<ResourceResponse[]>;
    /**
     * Standard BotBuilder adapter method to update a previous message with new content.
     * [BotBuilder reference docs](https://docs.microsoft.com/en-us/javascript/api/botbuilder-core/botadapter?view=botbuilder-ts-latest#updateactivity).
     * @param context A TurnContext representing the current incoming message and environment. (Not used)
     * @param activity The updated activity in the form `{id: <id of activity to update>, text: <updated text>, cards?: [<array of updated hangouts cards>]}`
     */
    updateActivity(context: TurnContext, activity: Partial<Activity>): Promise<void>;
    /**
     * Standard BotBuilder adapter method to delete a previous message.
     * [BotBuilder reference docs](https://docs.microsoft.com/en-us/javascript/api/botbuilder-core/botadapter?view=botbuilder-ts-latest#deleteactivity).
     * @param context A TurnContext representing the current incoming message and environment. (Not used)
     * @param reference An object in the form `{activityId: <id of message to delete>}`
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
}
export interface HangoutsAdapterOptions {
    /**
     * Parameters passed to the [Google API client library](https://www.npmjs.com/package/googleapis) which is in turn used to send messages.
     * Define credentials per [the GoogleAuthOptions defined here](https://github.com/googleapis/google-auth-library-nodejs/blob/master/src/auth/googleauth.ts#L54),
     * OR, specify GOOGLE_APPLICATION_CREDENTIALS in environment [as described in the Google docs](https://cloud.google.com/docs/authentication/getting-started).
     */
    google_auth_params?: {
        client_email?: string;
        private_key?: string;
    };
    /**
     * Shared secret token used to validate the origin of incoming webhooks.
     * Get this from the [Google API console for your bot app](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat) - it is found on the Configuration tab under the heading "Verification Token".
     * If defined, the origin of all incoming webhooks will be validated and any non-matching requests will be rejected.
     */
    token: string;
}
