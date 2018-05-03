const pms = require('./pms');
const config = require('./config');
const TelegramBot = require('node-telegram-bot-api');;
const streamToBuffer = require('stream-to-buffer');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, prettyPrint } = format;

const logger = createLogger({
    level: 'info',
    format: combine(
        timestamp(),
        prettyPrint()
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: config.log_file })
    ]
});

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

// Return status of all stations
bot.onText(/\/allstations/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        bot.sendMessage(chatId, 'Query requested, please wait...');
        pms.stream_all_stations((err, stream) => {
            if (err) {
                logger.error(err);
                bot.sendMessage(chatId, 'Something went wrong.');
            } else {
                streamToBuffer(stream, function (err, buffer) {
                    var fileOptions = {
                        filename: chatId + '.png',
                        contentType: 'image/png'
                    };
                    bot.sendPhoto(chatId, buffer, {}, fileOptions);
                });
            }
        });
    } catch (err) {
        logger.error(err);
        bot.sendMessage(chatId, 'Something went wrong.');
    }
});

// Return status of stations containing given name
bot.onText(/\/stations(@sustech_unifound_bot)?\s+([^\s]+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (match) {
        try {
            bot.sendMessage(chatId, 'Query requested, please wait...');
            pms.stream_query_stations(match[2], (err, stream) => {
                if (err) {
                    logger.error(err);
                    bot.sendMessage(chatId, 'Something went wrong.');
                } else {
                    streamToBuffer(stream, function (err, buffer) {
                        var fileOptions = {
                            filename: chatId + '.png',
                            contentType: 'image/png'
                        };
                        bot.sendPhoto(chatId, buffer, {}, fileOptions);
                    });
                }
            });
        } catch (err) {
            logger.error(err);
            bot.sendMessage(chatId, 'Something went wrong.');
        }
    } else {
        bot.sendMessage(chatId, 'Usage: /stations <name>');
    }
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    logger.info('[' + chatId + '] ' + msg.text);
});
