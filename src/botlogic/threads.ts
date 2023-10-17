import { Keyboard } from "grammy";
import * as Constants from "../constants.js";
import { CommandContext, Bot, Filter, InlineKeyboard } from "grammy"
import { createCallbackData } from "callback-data";
import { getThreads, getThreadMessages, sendReaction } from "../instapi.js"
import { WithSessionContext } from "./session.js"
import { Chance } from 'chance';

const keyboard_check_threads = new Keyboard()
    .text("/" + Constants.COMMAND_CHECK_THREADS)
    .resized();

export async function sendCheckThreadsKeyboard(ctx: CommandContext<any> | Filter<any, any>, text: string) {
    ctx.reply(text, { reply_markup: keyboard_check_threads })
}


const threadIdCallbackData = createCallbackData(Constants.CALLBACK_DATA_CHECK_THREAD, {
    type: String,
    threadId: String,
});

const messageIdCallbackData = createCallbackData(Constants.CALLBACK_DATA_MESSAGE_ID, {
    type: String,
    messageGuid: String,
    emoji: String
})

export async function onCheckThreads(bot: Bot<WithSessionContext>) {
    bot.on("message", async (ctx, next) => {
        const message_text = ctx.message.text
        if (!message_text) {
            return
        }
        if (message_text == `/${Constants.COMMAND_CHECK_THREADS}`) {
            const threads = await getThreads(ctx.from.id);

            for (let i = 0; i < threads.length; i++) {
                const thread = threads[i];
                const data = threadIdCallbackData.pack({ type: "th", threadId: thread.id })

                const keyboard = new InlineKeyboard().text(`/${Constants.COMMAND_CHECK_SINGLE_THREAD}`, data)

                await ctx.reply("Message from " + thread.toTextRepresentation(), { parse_mode: "HTML", reply_markup: keyboard })
            }

            sendCheckThreadsKeyboard(ctx, Constants.TEXT_CHECK_YOUR_THREADS)

        }
        next()
    })
}


const emojis = ['❤️', '😂', '😮', '🥲', '😡', '👍']
function getKeyboardForButton(message_id: string) {
    return InlineKeyboard.from([
        emojis
            .map((emoji) => InlineKeyboard.text(emoji, messageIdCallbackData.pack({
                type: "react",
                messageGuid: message_id,
                emoji: emoji
            })))])
}


export function addGetThreadCallback(bot: Bot<WithSessionContext>) {
    bot.callbackQuery(
        threadIdCallbackData.filter({
            type: "th",
        }),
        async (ctx) => {
            const unpackedData = threadIdCallbackData.unpack(ctx.callbackQuery.data)
            const messagesThread = await getThreadMessages(ctx.from.id, unpackedData.threadId)

            const session_object = ctx.session
            let message_cache = session_object.tgMessageToInstMessageCache
            if (!message_cache) {
                message_cache = new Map()
            }

            if (messagesThread == undefined) {
                ctx.reply(Constants.TEXT_SMTH_WENT_WRONG)
            } else {
                const messages = messagesThread?.messages
                const thread = messagesThread?.thread!

                for (let i = 0; i < messages.length; i++) {
                    const message_object = messages[i]
                    const message_text_repr = message_object.toTextRepresentation()

                    const guid = new Chance(message_object.message_id + "_" + i.toString());
                    const generated_guid = String(guid.integer())

                    message_cache[generated_guid] = [thread.id, message_object.message_id]

                    const reencoded = Buffer.from(message_text_repr).toString("utf-8")
                    await ctx.reply(reencoded, { parse_mode: "HTML", reply_markup: getKeyboardForButton(generated_guid) })
                }
            }

            ctx.session.tgMessageToInstMessageCache = message_cache
            sendCheckThreadsKeyboard(ctx, Constants.TEXT_CHECK_YOUR_THREADS)
        },
    );

}

export function addSendReactonCallback(bot: Bot<WithSessionContext>) {
    bot.callbackQuery(messageIdCallbackData.filter({ type: "react" }), async (ctx) => {
        const session_data = ctx.session
        const callback_data = messageIdCallbackData.unpack(ctx.callbackQuery.data)

        if (callback_data.messageGuid in session_data.tgMessageToInstMessageCache) {
            const emoji = callback_data.emoji
            const message_info = session_data.tgMessageToInstMessageCache![callback_data.messageGuid]
            sendReaction(ctx.from.id!, message_info[0], message_info[1], emoji)
            ctx.reply(Constants.TEXT_REACTION_SEND)
        }
    })

}