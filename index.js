const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');

// ===== CONFIGURAÇÕES =====
const TOKEN = '7354620083:AAFq7AVGfVOWvIA1R-pB8MplNpAUXITKuF4'; // Telegram Bot
const ADMIN_ID = '6959106314'; // Seu ID
const MERCADO_PAGO_TOKEN = 'APP_USR-4801322115121846-072702-0f7b429bb27f634e945d8cfea15b0f01-1883719234';
const WEBHOOK_URL = '/webhook';
const PORT = process.env.PORT || 3000;

// ===== INICIALIZA BOT E API =====
const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();
app.use(bodyParser.json());

// ===== BANCO DE DADOS (JSON) =====
let db = { users: {}, estoque: [] };
if (fs.existsSync('database.json')) {
    db = JSON.parse(fs.readFileSync('database.json'));
}

function saveDB() {
    fs.writeFileSync('database.json', JSON.stringify(db, null, 2));
}

// ===== COMANDOS DO BOT =====
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!db.users[chatId]) {
        db.users[chatId] = { saldo: 0, compras: [] };
        saveDB();
    }
    bot.sendMessage(chatId, `🔥 Bem-vindo ao VELOBOT 🔥\nSeu saldo: R$${db.users[chatId].saldo}`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: '➕ Adicionar Saldo (PIX)', callback_data: 'add_saldo' }],
                [{ text: '🛒 Comprar Produtos', callback_data: 'comprar' }],
                [{ text: '📦 Meu Saldo', callback_data: 'meu_saldo' }]
            ]
        }
    });
});

// ADM Painel
bot.onText(/\/painel/, (msg) => {
    if (msg.chat.id.toString() === ADMIN_ID) {
        bot.sendMessage(msg.chat.id, '📌 PAINEL ADMIN:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '➕ Adicionar Produto', callback_data: 'add_produto' }],
                    [{ text: '📋 Listar Usuários', callback_data: 'listar_users' }],
                    [{ text: '📦 Ver Estoque', callback_data: 'ver_estoque' }]
                ]
            }
        });
    }
});

// ===== CALLBACK BUTTONS =====
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === 'add_saldo') {
        // Gera PIX via MercadoPago
        const pixResponse = await axios.post('https://api.mercadopago.com/v1/payments', {
            transaction_amount: 10,
            description: 'Adicionar Saldo',
            payment_method_id: 'pix',
            payer: { email: 'teste@gmail.com' }
        }, { headers: { Authorization: `Bearer ${MERCADO_PAGO_TOKEN}` } });

        const qr = pixResponse.data.point_of_interaction.transaction_data.qr_code;
        bot.sendMessage(chatId, `💸 Pague via PIX:\n\`\`\`${qr}\`\`\`\nSaldo será adicionado após confirmação.`, { parse_mode: 'Markdown' });
    }

    if (data === 'comprar') {
        if (db.estoque.length === 0) {
            bot.sendMessage(chatId, '❌ Nenhum produto disponível.');
        } else {
            let lista = '📦 *Produtos Disponíveis:*\n';
            db.estoque.forEach((p, i) => {
                lista += `\n${i + 1}. ${p.nome} - R$${p.preco}`;
            });
            bot.sendMessage(chatId, lista, { parse_mode: 'Markdown' });
        }
    }

    if (data === 'meu_saldo') {
        bot.sendMessage(chatId, `Seu saldo: R$${db.users[chatId].saldo}`);
    }

    if (data === 'add_produto' && chatId.toString() === ADMIN_ID) {
        bot.sendMessage(chatId, 'Envie no formato: Nome|Preço|Código');
        bot.once('message', (msg) => {
            const [nome, preco, codigo] = msg.text.split('|');
            db.estoque.push({ nome, preco: parseFloat(preco), codigo });
            saveDB();
            bot.sendMessage(chatId, `✅ Produto ${nome} adicionado!`);
        });
    }
});

// ===== WEBHOOK MERCADO PAGO =====
app.post(WEBHOOK_URL, (req, res) => {
    const payment = req.body;
    if (payment.type === 'payment' && payment.data && payment.data.id) {
        // Simular adição de saldo
        const userId = payment.data.id; // Aqui você deve mapear com user correto
        if (db.users[userId]) {
            db.users[userId].saldo += 10; // valor fictício
            saveDB();
            bot.sendMessage(userId, `✅ Pagamento confirmado! Seu saldo foi atualizado.`);
            bot.sendMessage(ADMIN_ID, `💰 Novo pagamento confirmado para ID: ${userId}`);
        }
    }
    res.sendStatus(200);
});

// ===== INICIA SERVIDOR =====
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
