const pms = require('./pms');
const config = require('./config');
const TelegramBot = require('node-telegram-bot-api');;
const streamToBuffer = require('stream-to-buffer');


// replace the value below with the Telegram token you receive from @BotFather
const token = config.tg_bot_token;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Welcome to use SUSTech Unifound Bot!');
});

// Matches "/echo [whatever]"
bot.onText(/\/echo (.+)/, (msg, match) => {
    // 'msg' is the received Message from Telegram
    // 'match' is the result of executing the regexp above on the text content
    // of the message

    const chatId = msg.chat.id;
    const resp = match[1]; // the captured "whatever"

    // send back the matched "whatever" to the chat
    bot.sendMessage(chatId, resp);
});

bot.onText(/\/allstations/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        bot.sendMessage(chatId, 'Query requested, please wait...');
        var stream = await pms.stream_all_stations();
        streamToBuffer(stream, function (err, buffer) {
            bot.sendPhoto(chatId, buffer);
        });
    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, 'Something went wrong.');
    }
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    console.log('['+chatId+'] '+msg.text);
});
