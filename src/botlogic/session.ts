import { Context, SessionFlavor, Bot, session } from "grammy"
import * as Registration from "./registration.js"

interface SessionData {
    user_state: number,
    inst_username: string | null,
    inst_id: number,
    tgMessageToInstMessageCache?: Map<Number, [string, string]>
}


// Flavor the context type to include sessions.
export type WithSessionContext = Context & SessionFlavor<SessionData>;

export function initial(): SessionData {
    return { user_state: Registration.REGISTRATION_STATE.UNKNOWN_STATE, inst_username: null, inst_id: -1 };
}

export function getBot() {
    const bot = new Bot<WithSessionContext>(process.env.TELEGRAM_TOKEN || "");

    bot.use(session({ initial }));

    return bot
}
