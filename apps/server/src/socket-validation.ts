import { EVENTS } from "@tuneverse/shared";

// Signup caps names at 30, but older accounts can be longer.
const MAX_USERNAME = 64;
const MAX_ROOM_NAME = 60;
const MAX_QUERY = 200;
export const MAX_CHAT_LENGTH = 500;

const isText = (value: unknown, max: number): value is string =>
    typeof value === "string" && value.trim().length > 0 && value.length <= max;

const isOptionalText = (value: unknown, max: number) =>
    value === undefined || value === null || value === "" || isText(value, max);

const isTime = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0;

type Validator = (payload: any) => boolean;

// A handler that destructures a bad payload throws, and an uncaught throw takes
// the whole server down, so anything malformed gets dropped before it gets there.
const validators: Record<string, Validator> = {
    [EVENTS.SYNC_CLOCK]: (p) => isTime(p?.clientSendTime),
    [EVENTS.SYNC_PING]: (p) => isTime(p?.clientSendTime),
    [EVENTS.ROOM_CREATE]: (p) =>
        isText(p?.username, MAX_USERNAME) && isOptionalText(p?.roomName, MAX_ROOM_NAME),
    [EVENTS.ROOM_JOIN]: (p) => isText(p?.roomId, 64) && isText(p?.username, MAX_USERNAME),
    [EVENTS.JOIN_DECISION]: (p) =>
        isText(p?.userId, 64) && isText(p?.roomId, 64) && typeof p?.approved === "boolean",
    [EVENTS.PLAYER_PLAY]: (p) => isText(p?.videoId, 200) && isTime(p?.timestamp),
    [EVENTS.PLAYER_ENDED]: (p) => isText(p?.videoId, 200),
    [EVENTS.PLAYER_PAUSE]: (p) => isTime(p?.timestamp),
    [EVENTS.PLAYER_SEEK]: (p) => isTime(p?.timestamp),
    [EVENTS.QUEUE_ADD]: (p) => isText(p?.videoId, 200),
    [EVENTS.QUEUE_UPVOTE]: (p) => isText(p?.videoId, 200),
    [EVENTS.SEARCH_QUERY]: (p) => isText(p?.query, MAX_QUERY),
    [EVENTS.RECOMMENDATIONS_REQUEST]: (p) =>
        p === undefined || (typeof p === "object" && p !== null && (p.mood === undefined || isText(p.mood, 100))),
    [EVENTS.CHAT_SEND]: (p) => isText(p?.text, MAX_CHAT_LENGTH),
    [EVENTS.EMOJI_REACTION]: (p) => isText(p?.emoji, 16),
};

export const isValidPayload = (event: string, payload: unknown): boolean => {
    const validate = validators[event];
    return validate ? validate(payload) : true;
};
