// service-worker.js

// 1. Определение имени кэша. Меняйте версию при каждом обновлении файлов, которые должны быть перекэшированы.
const CACHE_NAME = 'my-radio-app-v1.1'; // Увеличивайте версию, если изменяете файлы приложения

// 2. Список файлов, которые будут кэшироваться при установке сервис-воркера.
// Убедитесь, что здесь указаны ВСЕ основные файлы вашего PWA.
const urlsToCache = [
    '/', // Главная страница
    'index.html',
    'style.css',
    'script.js',
    'manifest.json',
    '/icons/icon-192x192.png', // Пример, добавьте все ваши иконки
    '/icons/icon-512x512.png'  // Пример
    // Добавьте сюда другие важные файлы, например, шрифты, если они локальные
];

// Событие 'install': происходит, когда сервис-воркер устанавливается.
// Используется для кэширования статической оболочки приложения.
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Кэширование оболочки приложения');
                // Добавляем все указанные URL в кэш
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                // Активируем сервис-воркер немедленно, без ожидания закрытия всех вкладок.
                console.log('Service Worker: Installation complete, skipping waiting.');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Кэширование не удалось', error);
            })
    );
});

// Событие 'fetch': перехватывает все сетевые запросы.
// Здесь мы используем стратегию "кэш, затем сеть" (Cache-First).
self.addEventListener('fetch', event => {
    // ВАЖНО: Мы кэшируем только СТАТИЧЕСКИЕ файлы приложения.
    // Аудиопоток радио не следует кэшировать, так как он динамический и потоковый.
    // Проверяем, является ли запрос одним из тех, что мы хотим кэшировать или обслуживать из кэша.
    // Обычно это запросы GET к HTTP/HTTPS ресурсам.
    if (event.request.url.startsWith('http') && event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    // Возвращаем из кэша, если найдено совпадение
                    if (response) {
                        console.log(ⓃService Worker: Обслуживаем из кэша: ${event.request.url}Ⓝ);
                        return response;
                    }
                    // Если нет в кэше, загружаем из сети
                    console.log(ⓃService Worker: Загружаем из сети: ${event.request.url}Ⓝ);
                    return fetch(event.request);
                })
                .catch(error => {
                    console.error('Service Worker: Ошибка при обработке fetch-запроса:', error);
                    // Можно вернуть запасную страницу или сообщение об ошибке, если запрос не удался
                    // Например, return caches.match('/offline.html');
                })
        );
    }
    // Для остальных запросов (например, для потокового аудио), не перехватываем и позволяем им идти в сеть напрямую.
    // Если ваш аудиопоток также начинается с 'http', то добавьте здесь дополнительную проверку,
    // чтобы исключить его из кэширования, например:
    // if (event.request.url.includes('.mp3') || event.request.url.includes('.ogg')) {
    //     return fetch(event.request); // Просто загрузить из сети
    // }
});

// Событие 'activate': происходит, когда сервис-воркер активируется.
// Используется для очистки старых кэшей.
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    const cacheWhitelist = [CACHE_NAME]; // Список актуальных кэшей
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Если имя кэша не входит в белый список, удаляем его
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log(ⓃService Worker: Удаляем старый кэш: ${cacheName}Ⓝ);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            // Захватываем контроль над всеми страницами, открытыми в браузере.
            // Это гарантирует, что новый сервис-воркер немедленно начнет работать.
            console.log('Service Worker: Claiming clients.');
            return self.clients.claim();
        })
    );
});
