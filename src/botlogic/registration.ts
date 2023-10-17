import { CommandContext, Bot, } from "grammy";
import { WithSessionContext } from "./session.js"
import * as Constants from "../constants.js";
import { AppDataSource, User, getUserByTgId } from "../usermanagement.js"
import { sendCheckThreadsKeyboard } from "./threads.js"
import { loginClient } from "../instapi.js"

export enum REGISTRATION_STATE {
    UNKNOWN_STATE,
    REGISTERED,
    REGISTER_USERNAME_ASK,
    REGISTER_PASSWORD_ASK,
    FAILED_REGISTRATION,
};

export function addStartCommand(bot: Bot<WithSessionContext>) {
    bot.command(Constants.COMMAND_START, async (ctx) => {
        await bot.api.setMyCommands([
            { command: Constants.COMMAND_START, description: Constants.MENU_START_COMMAND_DESCRIPTION },
            { command: Constants.COMMAND_CHECK_THREADS, description: Constants.MENU_CHECK_THREADS_COMMAND_DESCRIPTION },
            { command: Constants.COMMAND_DROP_ME, description: Constants.MENU_DROP_ME_COMMAND_DESCRIPTION },
        ]);


        const id = ctx.from?.id;
        const userRep = AppDataSource.manager.getRepository(User)
        const userFound = await userRep.findOneBy({ tgId: id })

        if (userFound) {
            sendCheckThreadsKeyboard(ctx, Constants.TEXT_LOGGED_IN_READY_TO_DELIVER)
        } else {
            ctx.session = {
                user_state: REGISTRATION_STATE.REGISTER_USERNAME_ASK,
                inst_username: null,
                inst_id: -1,
                tgMessageToInstMessageCache: ctx.session.tgMessageToInstMessageCache
            }

            ctx.reply(Constants.TEXT_NO_USER_REGISTER_START)
        }

    })

}

export function addDropCommand(bot: Bot<WithSessionContext>) {
    bot.command(Constants.COMMAND_DROP_ME, async (ctx) => {
        const tgId = ctx.message.from.id
        const userRep = AppDataSource.manager.getRepository(User)
        const user = await userRep.findOneBy({ tgId: tgId })
        if (user) {
            await userRep.delete(user.id)
            ctx.reply(Constants.TEXT_USER_CREDS_DROPPED)
        } else {
            ctx.reply(Constants.TEXT_USER_DROP_NO_CREDS)
        }
    })
}

async function checkUserNotExists(tgId: number) {
    const user = await getUserByTgId(tgId)
    return user != null
}

export async function onRegistrationMessage(bot: Bot<WithSessionContext>) {
    bot.on("message", async (ctx, next) => {
        if (ctx.message.text == "/" + Constants.COMMAND_CHECK_THREADS && !checkUserNotExists(ctx.from?.id)) {
            ctx.session.user_state = REGISTRATION_STATE.REGISTERED //shitfix 
        }

        if (ctx.session.user_state == REGISTRATION_STATE.REGISTER_USERNAME_ASK) {
            const username = ctx.message.text
            if (username == null) {
                ctx.reply(Constants.TEXT_REGISTER_NO_USERNAME_PROVIDED)
            } else {

                ctx.session = {
                    user_state: REGISTRATION_STATE.REGISTER_PASSWORD_ASK,
                    inst_username: username.trim(),
                    inst_id: -1,
                    tgMessageToInstMessageCache: ctx.session.tgMessageToInstMessageCache
                }

                ctx.reply(Constants.TEXT_REGISTER_ENTER_PASSWORD)
                return
            }
        }

        if (ctx.session.user_state == REGISTRATION_STATE.REGISTER_PASSWORD_ASK) {
            const password = ctx.message.text

            if (password == null) {
                ctx.reply(Constants.TEXT_REGISTER_PASSWORD_NOT_PROVIDED)
            } else {
                //ctx.reply(Constants.TEXT_REGISTER_LOGIN_IN_PROCESS)
                try {
                    const log_client = await loginClient(ctx.session.inst_username!, password, ctx.from?.id)

                    ctx.session = {
                        user_state: REGISTRATION_STATE.REGISTERED,
                        inst_username: ctx.session.inst_username!.trim(),
                        inst_id: (await log_client.account.currentUser()).pk,
                        tgMessageToInstMessageCache: ctx.session.tgMessageToInstMessageCache
                    }
                    //ctx.reply(Constants.TEXT_LOGGED_IN_READY_TO_DELIVER)
                    await sendCheckThreadsKeyboard(ctx, Constants.TEXT_LOGGED_IN_READY_TO_DELIVER)
                } catch (e) {
                    await ctx.reply("smth went wrong, try /drop_me and /start")
                }
            }
        }
        await next()
    })
}

