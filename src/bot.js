"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var grammy_1 = require("grammy");
var lodash_1 = require("lodash");
var textEffects_1 = require("./textEffects");
var grammy_2 = require("grammy");
var bot = new grammy_1.Bot(process.env.TELEGRAM_TOKEN || "");
var introductionMessage = "Hello! I'm a Telegram bot.\nI'm powered by Cyclic, the next-generation serverless computing platform.\n\n<b>Commands</b>\n/yo - Be greeted by me\n/effect [text] - Show a keyboard to apply text effects to [text]";
var allEffects = [
    {
        code: "w",
        label: "Monospace",
    },
    {
        code: "b",
        label: "Bold",
    },
    {
        code: "i",
        label: "Italic",
    },
    {
        code: "d",
        label: "Doublestruck",
    },
    {
        code: "o",
        label: "Circled",
    },
    {
        code: "q",
        label: "Squared",
    },
];
var effectCallbackCodeAccessor = function (effectCode) {
    return "effect-".concat(effectCode);
};
var effectsKeyboardAccessor = function (effectCodes) {
    var effectsAccessor = function (effectCodes) {
        return effectCodes.map(function (code) {
            return allEffects.find(function (effect) { return effect.code === code; });
        });
    };
    var effects = effectsAccessor(effectCodes);
    var keyboard = new grammy_2.InlineKeyboard();
    var chunkedEffects = (0, lodash_1.chunk)(effects, 3);
    for (var _i = 0, chunkedEffects_1 = chunkedEffects; _i < chunkedEffects_1.length; _i++) {
        var effectsChunk = chunkedEffects_1[_i];
        for (var _a = 0, effectsChunk_1 = effectsChunk; _a < effectsChunk_1.length; _a++) {
            var effect = effectsChunk_1[_a];
            effect &&
                keyboard.text(effect.label, effectCallbackCodeAccessor(effect.code));
        }
        keyboard.row();
    }
    return keyboard;
};
var textEffectResponseAccessor = function (originalText, modifiedText) {
    return "Original: ".concat(originalText) +
        (modifiedText ? "\nModified: ".concat(modifiedText) : "");
};
var parseTextEffectResponse = function (response) {
    var originalText = response.match(/Original: (.*)/)[1];
    var modifiedTextMatch = response.match(/Modified: (.*)/);
    var modifiedText;
    if (modifiedTextMatch)
        modifiedText = modifiedTextMatch[1];
    if (!modifiedTextMatch)
        return { originalText: originalText };
    else
        return { originalText: originalText, modifiedText: modifiedText };
};
// Handle the /effect command to apply text effects using an inline keyboard
bot.command("effect", function (ctx) {
    return ctx.reply(textEffectResponseAccessor(ctx.match), {
        reply_markup: effectsKeyboardAccessor(allEffects.map(function (effect) { return effect.code; })),
    });
});
var _loop_1 = function (effect) {
    var allEffectCodes = allEffects.map(function (effect) { return effect.code; });
    bot.callbackQuery(effectCallbackCodeAccessor(effect.code), function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
        var originalText, modifiedText;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    originalText = parseTextEffectResponse(((_a = ctx.msg) === null || _a === void 0 ? void 0 : _a.text) || "").originalText;
                    modifiedText = (0, textEffects_1.applyTextEffect)(originalText, effect.code);
                    return [4 /*yield*/, ctx.editMessageText(textEffectResponseAccessor(originalText, modifiedText), {
                            reply_markup: effectsKeyboardAccessor(allEffectCodes.filter(function (code) { return code !== effect.code; })),
                        })];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); });
};
// Handle text effects from the effect keyboard
for (var _i = 0, allEffects_1 = allEffects; _i < allEffects_1.length; _i++) {
    var effect = allEffects_1[_i];
    _loop_1(effect);
}
bot.start();
