const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

let orders = [];

// Функция для форматирования цены с пробелами
function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Главная страница
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "🛍️ Olivka Dreams Backend API",
        version: "1.0.0",
        status: "работает"
    });
});

// Создание заказа
app.post("/api/orders", async (req, res) => {
    try {
        const orderData = req.body;
        
        // Проверка данных
        if (!orderData.customerInfo || !orderData.items || orderData.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Неверные данные заказа"
            });
        }

        // Генерация ID заказа
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
        const orderId = `OD${timestamp.slice(-6)}${random}`;
        
        // Создание объекта заказа
        const order = {
            orderId,
            customerInfo: orderData.customerInfo,
            items: orderData.items,
            subtotal: orderData.subtotal || 0,
            deliveryCost: orderData.deliveryCost || 0,
            grandTotal: orderData.grandTotal || 0,
            createdAt: new Date(),
            status: "новый"
        };

        // Сохраняем заказ
        orders.push(order);
        console.log("✅ Новый заказ создан:", orderId);
        
        // 🔥 ОТПРАВКА В TELEGRAM
        try {
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            const chatId = process.env.TELEGRAM_CHAT_ID;
            
            if (botToken && chatId) {
                // Формируем красивое сообщение
                let message = `🎁 *НОВЫЙ ЗАКАЗ №${orderId}* 🎁\n\n`;
                
                // Информация о клиенте
                message += `*👤 КЛИЕНТ:*\n`;
                message += `├ Имя: ${order.customerInfo.name}\n`;
                message += `├ Телефон: ${order.customerInfo.phone}\n`;
                
                // Адрес в зависимости от типа доставки
                if (order.customerInfo.deliveryType === "pickup") {
                    message += `├ Адрес самовывоза:\n`;
                    message += `│   ${order.customerInfo.address}\n`;
                    message += `└ Способ: 🏪 Самовывоз\n`;
                } else {
                    message += `├ Адрес доставки:\n`;
                    message += `│   ${order.customerInfo.address}\n`;
                    message += `└ Способ: 🚚 Доставка\n`;
                }
                
                // Комментарий если есть
                if (order.customerInfo.comment && order.customerInfo.comment !== "Без комментария") {
                    message += `💬 *Комментарий:* ${order.customerInfo.comment}\n`;
                }
                
                message += `\n`;
                
                // Товары
                message += `🛍️ *ТОВАРЫ:*\n`;
                order.items.forEach((item, index) => {
                    message += `${index + 1}. *${item.name}*\n`;
                    message += `   └ ${item.quantity} × ${formatPrice(item.price)} ₽ = ${formatPrice(item.total)} ₽\n`;
                });
                
                message += `\n`;
                
                // Итоговая сумма
                message += `💰 *ИТОГО:*\n`;
                message += `├ Товары: ${formatPrice(order.subtotal)} ₽\n`;
                
                if (order.deliveryCost > 0) {
                    message += `├ Доставка: ${formatPrice(order.deliveryCost)} ₽\n`;
                } else {
                    message += `├ Доставка: 🎁 Бесплатно\n`;
                }
                
                message += `└ *Общая сумма: ${formatPrice(order.grandTotal)} ₽*\n\n`;
                
                // Дополнительная информация
                message += `📅 *Дата:* ${order.createdAt.toLocaleString("ru-RU", {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}\n`;
                message += `📊 *Статус:* 🆕 Новый`;
                
                // Отправляем в Telegram
                const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    chat_id: chatId,
                    text: message,
                    parse_mode: "Markdown"
                });
                
                console.log("✅ Сообщение успешно отправлено в Telegram");
            } else {
                console.log("⚠️ Telegram токен не настроен, сообщение не отправлено");
            }
        } catch (telegramError) {
            console.log("⚠️ Ошибка отправки в Telegram:", telegramError.message);
        }

        // Успешный ответ
        res.status(201).json({
            success: true,
            message: "Заказ успешно создан! Сообщение отправлено в Telegram.",
            orderId: orderId,
            order: order
        });

    } catch (error) {
        console.error("❌ Ошибка создания заказа:", error);
        res.status(500).json({
            success: false,
            message: "Ошибка сервера",
            error: error.message
        });
    }
});

// Получение всех заказов
app.get("/api/orders", (req, res) => {
    res.json({
        success: true,
        count: orders.length,
        orders: orders.sort((a, b) => b.createdAt - a.createdAt)
    });
});

// Статистика
app.get("/api/stats", (req, res) => {
    const totalRevenue = orders.reduce((sum, order) => sum + order.grandTotal, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = orders.filter(order => new Date(order.createdAt) >= today);
    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.grandTotal, 0);
    
    res.json({
        success: true,
        stats: {
            totalOrders: orders.length,
            totalRevenue: formatPrice(totalRevenue),
            todayOrders: todayOrders.length,
            todayRevenue: formatPrice(todayRevenue)
        }
    });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Сервер запущен!`);
    console.log(`📡 Адрес: http://localhost:${PORT}`);
    console.log(`🤖 Telegram: ${process.env.TELEGRAM_BOT_TOKEN ? "✅ ВКЛЮЧЕН" : "❌ ВЫКЛЮЧЕН"}`);
    console.log(`\n🛍️ Olivka Dreams готов к работе!`);
});