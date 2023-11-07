
import { DirectInboxFeedResponseItemsItem, DirectInboxFeedResponseUsersItem, DirectInboxFeedResponseThreadsItem, DirectThreadFeedResponseThread } from 'instagram-private-api';
import { isUndefined } from 'util'

function stringNullGetOrElse(input: string | undefined): string {
    if (input == undefined) {
        return ""
    } else {
        return input
    }
}

enum MessageType {
    Text = 1,
    Clip = 2,
    XmaReelShare = 3,
    Other = 4,
    MediaShare = 5
}

const REELS_DESC_NUM_SYMBOLS = 80

const SENT_REELS = "sent 🎥: "
const SENT_TEXT = "✉️ sent: "
const SENT_OTHER = "Unsupported format raw text: "

const YOU_SENT = "You sent "

interface MessageDTO {
    item_type: MessageType;
    item_text: string;
    item_url: string;
    yours: boolean;
    datetime: Date;
    message_id: string;

    toTextRepresentation(): string;

}

class UserDTO {
    static userFromInst(user: DirectInboxFeedResponseUsersItem): UserDTO {
        return new UserDTO(user.username, user.full_name, user.profile_pic_url);
    }

    constructor(
        public user_name: string,
        public full_name: string,
        public pic_profile_link: string
    ) { }
}

class MediaShareDTO implements MessageDTO {
    item_type: MessageType = MessageType.MediaShare;
    constructor(
        public item_text: string,
        public item_url: string,
        public yours: boolean,
        public datetime: Date,
        public message_id: string
    ) { }

    toTextRepresentation(): string {
        const timeMark = this.datetime.toUTCString();
        const timeMarkText = `at ${timeMark} `;


        let text = `Shared a content with you at ${timeMarkText} \n`;
        text = text + `\n<a href="${this.item_url}">post</a>`

        return text
    }

    static fromDM(dm: DirectInboxFeedResponseItemsItem, isYours: boolean): MediaShareDTO {
        const shared = dm['media_share']
        const code = shared['code']

        return new MediaShareDTO(
            "Media shared",
            `https://www.instagram.com/p/${code}`,
            isYours,
            new Date(Number(dm.timestamp) / 1000),
            dm.item_id
        )
    }
}

class ClipMessageDTO implements MessageDTO {
    item_type = MessageType.Clip;

    constructor(
        public item_text: string,
        public item_url: string,
        public yours: boolean,
        public datetime: Date,
        public message_id: string
    ) { }

    toTextRepresentation(): string {
        const messageDTO = this;
        const url = messageDTO.item_url;
        let text = messageDTO.item_text;

        const timeMark = messageDTO.datetime.toUTCString();
        const timeMarkText = `at ${timeMark} `;

        if (text.length > REELS_DESC_NUM_SYMBOLS) {
            text = text.substring(0, REELS_DESC_NUM_SYMBOLS);
            text = `${text}...`;
        }

        return `${SENT_REELS} ${timeMarkText}\n${text}\n<a href="${url}">clip</a>`;

    }


    static getText(dm: DirectInboxFeedResponseItemsItem) {
        let clip_text = ""
        try {
            clip_text = dm['clip']['clip']['caption']['text']
        } finally {
            return clip_text
        }
    }
    static fromDM(dm: DirectInboxFeedResponseItemsItem, isYours: boolean): ClipMessageDTO {
        //TODO support with try catch option whatever
        const url = dm['clip']['clip']['video_versions'][0].url
        const clip_text = ClipMessageDTO.getText(dm)

        // TODO: Implement method
        return new ClipMessageDTO(stringNullGetOrElse("message text " + dm.text + " \n" + clip_text),
            stringNullGetOrElse(url),
            isYours,
            new Date(Number(dm.timestamp) / 1000),
            (dm.item_id)
        )
    }
}

class TextMessageDTO implements MessageDTO {
    item_type = MessageType.Text;

    constructor(
        public item_text: string,
        public item_url: string,
        public yours: boolean,
        public datetime: Date,
        public message_id: string
    ) { }

    toTextRepresentation(): string {
        const messageDTO = this;
        const timeMark = messageDTO.datetime.toUTCString();
        const timeMarkText = ` at ${timeMark} `;
        const text = messageDTO.item_text;

        return `${SENT_TEXT} ${timeMarkText}\n${text}`;
    }

    static fromDM(dm: DirectInboxFeedResponseItemsItem, isYours: boolean): TextMessageDTO {

        return new TextMessageDTO(stringNullGetOrElse(dm.text),
            stringNullGetOrElse(dm.link?.text),
            isYours,
            new Date(Number(dm.timestamp) / 1000),
            (dm.item_id)
        );
    }
}

class XmaReelShareDTO implements MessageDTO {
    item_type = MessageType.XmaReelShare;

    constructor(
        public item_text: string,
        public item_url: string,
        public yours: boolean,
        public datetime: Date,
        public message_id: string
    ) { }

    toTextRepresentation(): string {
        const messageDTO = this;
        let text = messageDTO.item_text;
        const timeMark = messageDTO.datetime.toUTCString();
        const timeMarkText = `at ${timeMark} `;

        if (text.length > REELS_DESC_NUM_SYMBOLS) {
            text = text.substring(0, REELS_DESC_NUM_SYMBOLS);
            text = `${text}...`;
            return `${SENT_REELS} ${timeMarkText}\n${text}\n<a href="${messageDTO.item_url}">clip</a>`;
        } else {
            return `${SENT_OTHER} ${timeMarkText}\n${text}`;
        }
    }

    static fromDM(dm: DirectInboxFeedResponseItemsItem, isYours: boolean): XmaReelShareDTO {
        return new XmaReelShareDTO(stringNullGetOrElse(dm.text),
            stringNullGetOrElse(dm.link?.text),
            isYours,
            new Date(Number(dm.timestamp) / 1000),
            (dm.item_id)
        );
    }
}

class OtherMessageDTO implements MessageDTO {
    item_type = MessageType.Other;

    constructor(
        public item_text: string,
        public item_url: string,
        public yours: boolean,
        public datetime: Date,
        public message_id: string
    ) { }

    toTextRepresentation(): string {
        const messageDTO = this;
        let text = messageDTO.item_text;
        const timeMark = messageDTO.datetime.toUTCString();
        const timeMarkText = `at ${timeMark} `;

        if (text.length > REELS_DESC_NUM_SYMBOLS) {
            text = text.substring(0, REELS_DESC_NUM_SYMBOLS);
            text = `${text}...`;
            return `${SENT_REELS} ${timeMarkText}\n${text}\n<a href="${messageDTO.item_url}">clip</a>`;
        } else {
            return `${SENT_OTHER} ${timeMarkText}\n${text}`;
        }
    }


    static fromDM(dm: DirectInboxFeedResponseItemsItem, isYours: boolean): OtherMessageDTO {
        // TODO: Implement method
        return new OtherMessageDTO(stringNullGetOrElse(dm.text),
            stringNullGetOrElse(dm.link?.text),
            isYours,
            new Date(Number(dm.timestamp) / 1000),
            (dm.item_id)
        );;
    }
}

export function fromDirectMessage(dm: DirectInboxFeedResponseItemsItem, yours: boolean): MessageDTO {
    const messageType: string = dm.item_type;
    // reel_share
    // media_share (how to generate url?)
    if (messageType == "media_share") {
        return MediaShareDTO.fromDM(dm, yours)
    }

    if (messageType === 'clip') {
        return ClipMessageDTO.fromDM(dm, yours);
    }

    if (messageType === 'text') {
        return TextMessageDTO.fromDM(dm, yours);
    }
    else if (messageType === 'xma_reel_share') {
        return XmaReelShareDTO.fromDM(dm, yours);
    }
    else {
        return OtherMessageDTO.fromDM(dm, yours);
    }
}

export class ThreadDTO {
    SINGLE_USER = "User ";
    MULTIPLE_USERS = "Chat with: ";

    constructor(public users: UserDTO[], public last_message_time: Date, public id: string, public isSeen: boolean) { }

    toTextRepresentation(): string {
        const thread_dto = this;
        let text = this.get_user();

        // TODO somehow access users tz
        let time_mark = thread_dto.last_message_time.toDateString();
        time_mark = `at ${time_mark}`;

        text = `${text}\n${time_mark}`
        if (!thread_dto.isSeen) {
            text = `${text}\nnew 👁️`
        }

        return `${text}\n${time_mark}`;
    }

    get_user(): string {
        const users = this.users;

        if (users.length === 1) {
            const user = users[0];
            const user_name = user.user_name;
            const user_full_name = user.full_name;

            const href_pattern = `https://www.instagram.com/${user_name}/`;
            const users_text = `${this.SINGLE_USER} ${user_full_name} <a href="${href_pattern}">${user_name}</a>`;
            return users_text;
        } else {
            const names = users.map(u => u.full_name).join(" ,");
            const users_text = `${this.MULTIPLE_USERS} ${names}`;
            return users_text;
        }
    }

    static fromThreadObject(thread: DirectInboxFeedResponseThreadsItem | DirectThreadFeedResponseThread, thisUserId: number) {
        const users = thread.users.map((user) => {
            return UserDTO.userFromInst(user)
        })

        const seen = this.getThreadSeenByUser(thread, thisUserId)
        const last_activity_at = Number(thread.last_activity_at) ?? -1

        const isSeen = seen > last_activity_at

        return new ThreadDTO(users, new Date(Number(thread.last_activity_at) / 1000), thread.thread_id, isSeen)
    }

    static getThreadSeenByUser(thread: DirectInboxFeedResponseThreadsItem | DirectThreadFeedResponseThread, thisUserId: number): number {
        const last_seen_at = (thread.last_seen_at[thisUserId] ?? {})['timestamp'] ?? "0"
        return Number(last_seen_at)
    }
}


export function toTextRepresentation(message: MessageDTO, thread: ThreadDTO) {
    const messageText = message.toTextRepresentation()
    let threadText: string

    if (message.yours) {
        threadText = YOU_SENT
    } else {
        threadText = thread.toTextRepresentation()
    }

    return `${threadText} \n${messageText}`
}