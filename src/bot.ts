import "reflect-metadata"

import { getBot } from "./botlogic/session.js";
import * as Registration from "./botlogic/registration.js"
import * as Constants from "./constants.js";
import { onRegistrationMessage } from "./botlogic/registration.js"
import { onCheckThreads, addGetThreadCallback, addSendReactonCallback, sendCheckThreadsKeyboard } from "./botlogic/threads.js"

const bot = getBot()

Registration.addStartCommand(bot)
Registration.addDropCommand(bot)
addGetThreadCallback(bot)
addSendReactonCallback(bot)

/*
//TODO 
this style loose ctx typing which led to poor session update

bot.on("message", async (ctx, next) => {
  try {
    onRegistrationMessage(ctx)
    onCheckThreads(ctx)
  } catch (e) {
    await ctx.reply("smth went wrong, try /drop_me and /start\n" + e)
  }
  await next()
})
*/

onRegistrationMessage(bot)
onCheckThreads(bot)

bot.on("callback_query:data", async (ctx) => {
  sendCheckThreadsKeyboard(ctx, Constants.TEXT_CALLBACK_UNKNOWN)
})

bot.catch((errorHandler) => {
  const err_message = errorHandler.message
  errorHandler.ctx.reply(Constants.TEXT_EXCEPTION + err_message)
})

bot.start()