const TelegramApi = require('node-telegram-bot-api');

const TOKEN = '5851122636:AAEs3QRe7tQjnEAb30r-2rvhO-Q5JTzMs-c';
const bot = new TelegramApi(TOKEN, {polling: true})

enum Actions {
    SPENDING = 'Spending',
    INCOME = 'Income',
    SAVINGS = 'Savings'
}

type Data = {
    [chatId: string]: {
        [memberId: string]: {
            [action in Actions]: {
                [key: string]: number
            }
        }
    }
}

const data: Data = {};

const mainMenu = {
    reply_markup: JSON.stringify({
        inline_keyboard: [[
            {text: Actions.SPENDING, callback_data: Actions.SPENDING},
            {text: Actions.INCOME, callback_data: Actions.INCOME},
            {text: Actions.SAVINGS, callback_data: Actions.SAVINGS}
        ]]
    })
}

const category = {
    reply_markup: JSON.stringify({
        keyboard: [
            [{text: 'Transport', callback_data: 'Transport'}],
            [{text: 'Gift', callback_data: 'Gift'}],
            [{text: 'Caffe & restorations', callback_data: 'Caffe & restorations'}],
            [{text: 'Food', callback_data: 'Food'}],
            [{text: 'Utility bills', callback_data: 'Utility bills'}]
        ]
    })
}

const countMoney = {
    reply_markup: JSON.stringify({
        force_reply: true
    })
}

const getMemberId = (msg) => {
    return `${msg.from.first_name}_${msg.from.id}`;
}

bot.setMyCommands([
    {command: '/data', description: 'Data of your spending'},
    {command: '/menu', description: 'Actions menu'},
]);

const getAllDataMember = (memberData) => {
    return Object.entries(memberData).reduce((str, [action, categories]) => {
        return `${str}\n<b>${action}</b>\n${Object.entries(categories).reduce((categoryStr, [category, count]) => {
            return `${categoryStr}${category}: <span class="tg-spoiler">${count}</span>\n`
        }, '') || '0'}`
    }, '');
}

bot.onText(new RegExp(/(\/|\\)data/), msg => {
    const memberData = data[msg.chat.id] && Object.entries(Object.entries(data).find(([chatId]) => parseFloat(chatId) === msg.chat.id)[1]).find(([memberId]) => memberId === getMemberId(msg))[1];
    if (memberData) {
        return bot.sendMessage(msg.chat.id, `
            <b>${msg.from.first_name} ${msg.from.last_name}</b>
            ${getAllDataMember(memberData)}
        `, {parse_mode: 'HTML'});
    }
    return bot.sendMessage(msg.chat.id, 'Sorry, don\'t have your data');
})

bot.onText(new RegExp(/(\/|\\)menu/), async (msg) => {
    if (!data?.[msg.chat.id] || !data[msg.chat.id]?.[`${msg.from.first_name}_${msg.from.id}`]) {
        data[msg.chat.id] = {
            [`${msg.from.first_name}_${msg.from.id}`]: {
                [Actions.SPENDING]: {
                    ...data[msg.chat.id]?.[`${msg.from.first_name}_${msg.from.id}`]?.[Actions.SPENDING]
                },
                [Actions.INCOME]: {
                    ...data[msg.chat.id]?.[`${msg.from.first_name}_${msg.from.id}`]?.[Actions.INCOME]
                },
                [Actions.SAVINGS]: {
                    ...data[msg.chat.id]?.[`${msg.from.first_name}_${msg.from.id}`]?.[Actions.SAVINGS]
                }
            }
        }
    }
    await bot.sendMessage(msg.chat.id, 'Choose your action', mainMenu);
})

bot.on('callback_query', async (query) => {
    await bot.sendMessage(query.message.chat.id, 'Choose your spending category', category).then(replySpendingMsg => {
        bot.onReplyToMessage(replySpendingMsg.chat.id, replySpendingMsg.message_id, spendingMsg => {
            bot.sendMessage(replySpendingMsg.chat.id, 'Send count money', countMoney).then(replyCountMsg => {
                bot.onReplyToMessage(replyCountMsg.chat.id, replyCountMsg.message_id, countMsg => {
                    const allDataMember = data[countMsg.chat.id][`${countMsg.from.first_name}_${countMsg.from.id}`];
                    data[countMsg.chat.id][`${countMsg.from.first_name}_${countMsg.from.id}`] = {
                        ...allDataMember,
                        [query.data]: {
                            ...allDataMember[query.data],
                            [spendingMsg.text]: allDataMember[query.data]?.[spendingMsg.text] ? allDataMember[query.data][spendingMsg.text] + parseFloat(countMsg.text) : parseFloat(countMsg.text)
                        }
                    }
                })
            });
        })
    })
});

bot.on('polling_error', (error) => {
    console.log(error);
});