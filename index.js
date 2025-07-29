const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Webhook do Mercado Pago
app.post('/api/webhook', (req, res) => {
    const data = req.body;

    if (data.type === 'payment') {
        const payment = data.data.id;

        axios.get(`https://api.mercadopago.com/v1/payments/${payment}`, {
            headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
        }).then(response => {
            const info = response.data;
            if (info.status === 'approved') {
                const chatId = info.payer.email.split('@')[0]; // usamos chatId no email
                const valor = info.transaction_amount;

                if (db.users[chatId]) {
                    db.users[chatId].saldo += valor;
                    saveDB();
                    bot.sendMessage(chatId, `✅ Pagamento confirmado! Saldo: R$${db.users[chatId].saldo.toFixed(2)}`);
                    bot.sendMessage(ADMIN_ID, `💸 Usuário ${chatId} adicionou R$${valor}`);
                }
            }
        }).catch(err => console.error(err));
    }

    res.sendStatus(200);
});

// Inicia o servidor para Webhook
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Webhook rodando na porta ${PORT}`));
