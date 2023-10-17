
import { IgApiClient, DirectThreadFeed, DirectThreadFeedResponseItemsItem } from 'instagram-private-api';
import { SkywalkerSubscriptions, GraphQLSubscriptions, withRealtime, IgApiClientExt, IgApiClientRealtime, MessageSyncMessageTypes } from 'instagram_mqtt';
import { AppDataSource, User, getUserByTgId } from './usermanagement.js';
import { ThreadDTO, fromDirectMessage } from "./dtos.js"
import { FILTER_ONLY_UNSEEN, MARK_SEEN } from './constants.js';

export const loginClient = async (username: string, password: string, tgId: number): Promise<IgApiClient> => {
    const ig: IgApiClientRealtime = withRealtime((new IgApiClient()));

    ig.state.generateDevice(tgId.toString());
    ig.request.end$.subscribe();
    const login = await ig.account.login(username, password);
    await saveState(ig, username, tgId)

    const threads = await ig.feed.directInbox().items() //sample request to check it's working

    return ig
}

const clientFromTgId = async (tgId: number): Promise<IgApiClientRealtime | null> => {

    const user = await AppDataSource.manager.getRepository(User).findOneBy({ tgId: tgId })

    if (user != null) {
        const state = user.state

        const ig = withRealtime(new IgApiClient())

        // generate device const stable for tgId
        ig.state.generateDevice(tgId.toString());

        /*
            There are some known bugs with ig
            1) outdated constants, updated by hands 
        */
        const state_obj = JSON.parse(state)

        state_obj.constants = {}
        state_obj.constants.APP_VERSION = '222.0.0.13.114'
        state_obj.constants.APP_VERSION_CODE = '350696709'
        state_obj.constants.BLOKS_VERSION_ID = '388ece79ebc0e70e87873505ed1b0ff335ae2868a978cc951b6721c41d46a30a'
        delete state_obj.cookies.rejectPublicSuffixes
        state_obj.cookies.enableLooseMode = true

        await ig.state.deserialize(state_obj)

        /*
            2) Overload extractCookieValue to ours. Cookie jar unable to find existed data after deserialization.
            Seems they forgot to set needed default options on create.
        */
        ig.state.extractCookieValue = ((key: string) => {
            return JSON.parse(state)["cookies"]["cookies"].filter((obj) =>
                obj['key'] == key
            )[0]['value']
        })

        await ig.realtime.connect({
            // optional
            graphQlSubs: [
                // these are some subscriptions
                GraphQLSubscriptions.getAppPresenceSubscription(),
                GraphQLSubscriptions.getZeroProvisionSubscription(ig.state.phoneId),
                GraphQLSubscriptions.getDirectStatusSubscription(),
                GraphQLSubscriptions.getDirectTypingSubscription(ig.state.cookieUserId),
                GraphQLSubscriptions.getAsyncAdSubscription(ig.state.cookieUserId),
            ],
            // optional
            skywalkerSubs: [
                SkywalkerSubscriptions.directSub(ig.state.cookieUserId),
                SkywalkerSubscriptions.liveSub(ig.state.cookieUserId),
            ],
            // optional
            // this enables you to get direct messages
            irisData: await ig.feed.directInbox().request(),
            // optional
            // in here you can change connect options
            // available are all properties defined in MQTToTConnectionClientInfo
            connectOverrides: {}

            //,

            // optional
            // use this proxy
            //socksOptions: {
            //    type: 5,
            //    port: 12345,
            //    host: '...'
            //}
        })

        return ig
    }

    return null
}

export const getThreads = async (tgId: number): Promise<ThreadDTO[]> => {
    const [ig, thisUser] = await Promise.all([clientFromTgId(tgId), getUserByTgId(tgId)])

    if (!ig) {
        throw new Error("You are not in login state, start with /start")
    }

    //TODO can we map results inside promise? 
    let threads = (ig.feed.directInbox().items());
    const thisUserId = thisUser.instId

    const answerThreads = (await threads).reverse()
        .map((thread) => {
            return ThreadDTO.fromThreadObject(thread, thisUserId)
        })

    if (FILTER_ONLY_UNSEEN) {
        return answerThreads.filter((thread) => {
            return !thread.isSeen
        })
    } else {
        return answerThreads
    }
}

export const sendReaction = async (tgId: number, thread_id: string, message_id: string, emoji: string) => {
    const ig = await clientFromTgId(tgId)

    //TODO no idea how to check correctness 
    ig.realtime.direct.sendReaction({
        itemId: message_id,
        threadId: thread_id,
        reactionType: "like",
        reactionStatus: "created",
        targetItemType: MessageSyncMessageTypes.ReelShare,
        emoji: emoji
    })
}

async function getThreadMessagesUnread(
    ig: IgApiClient,
    thread_id: string,
    cursor: string,
    userId: number): Promise<[DirectThreadFeedResponseItemsItem[], number]> {
    const directThread = new DirectThreadFeed(ig)
    directThread.id = thread_id

    directThread.cursor = cursor

    const th_request = directThread.request()

    th_request.catch(err => {
        console.log(err)
    })
    const thread = (await th_request).thread
    const seen_at = ThreadDTO.getThreadSeenByUser(thread, userId)

    let messagesRaw = thread.items

    let message_last = messagesRaw[messagesRaw.length - 1]

    while (Number(message_last['timestamp']) > seen_at && directThread.isMoreAvailable()) {
        messagesRaw = messagesRaw.concat((await directThread.request()).thread.items)
        message_last = messagesRaw[messagesRaw.length - 1]
    }

    return [messagesRaw, seen_at]
}

export async function getThreadMessages(tgId: number, thread_id: string) {
    const ig = await clientFromTgId(tgId)

    if (!ig) {
        throw new Error("You are not in login state, start with /start")
    }
    const directThread = new DirectThreadFeed(ig)
    directThread.id = thread_id

    const [user, directThreadResponse] = await Promise.all([
        ig.account.currentUser(),
        directThread.request()
    ])

    const userId = user.pk
    const thread = directThreadResponse.thread

    let [messagesRaw, seen_at] = await getThreadMessagesUnread(ig, thread_id, '', userId)


    messagesRaw = messagesRaw
        .reverse()
        .filter((message) => {
            //TODO thinkabout it 
            return (FILTER_ONLY_UNSEEN && (seen_at < Number(message.timestamp))) || (!FILTER_ONLY_UNSEEN)
        })

    const messages = messagesRaw
        .map((message) => {
            return fromDirectMessage(message, message.user_id == userId)
        })

    if (MARK_SEEN) {
        messagesRaw.forEach(m => {
            ig.directThread.markItemSeen(
                thread_id,
                m.item_id
            )
        })
    }

    //TODO less requests to thread
    return { 'messages': messages, thread: ThreadDTO.fromThreadObject(thread, userId) }

}


async function saveState(ig: IgApiClientExt, username: string, tgId: number) {
    const coockieJar = await ig.state.serializeCookieJar()
    const stateHandMade = await ig.state.serialize()
    delete stateHandMade.constants
    delete stateHandMade.coockies
    stateHandMade.cookies = coockieJar


    let user = await getUserByTgId(tgId)

    if (!user) {
        user = new User()
    }

    user.tgId = tgId
    user.instUserName = username
    user.state = JSON.stringify(stateHandMade)
    user.instId = await (await ig.account.currentUser()).pk

    if (ig.state.authorization != null) {
        user.auth = ig.state.authorization
    }

    await AppDataSource.manager.save(user)
}

