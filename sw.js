// sw.js

const CACHE_NAME = 'site-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/sections.json',
    '/patreon-poetry',
    // Icons
    '/icons/favicon.ico',
    '/icons/darkmode.png',
    '/icons/lightmode.png',
    '/icons/patreon.png',
    '/icons/patreon_alt.png',
    '/icons/menu.png',
    '/icons/about.png',
    '/icons/poetry.png',
    '/icons/books.png',
    '/icons/contact.png',
    '/icons/twitter.png',
    '/icons/instagram.png',
    // Images
    '/images/pane1.png',
    '/images/pane2.png',
    '/images/pane3.png',
    '/images/pane4.png',
    '/images/pane5.png',
    '/images/pane6.png',
    '/images/pane7.png',
    '/images/pane8.png',
    '/images/title.png',
    '/images/logo.png',
    '/images/preview.jpg',
    // Google Fonts
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap',
    // Add any additional static assets here
];

/**
 * Install Event - Caching Static Assets
 */
self.addEventListener('install', event => {
    console.log('[Service Worker] Install Event');
    self.skipWaiting(); // Force the waiting Service Worker to become the active Service Worker
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching all static assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch(error => {
                console.error('[Service Worker] Failed to cache static assets:', error);
            })
    );
});

/**
 * Activate Event - Cleaning Up Old Caches
 */
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activate Event');
    self.clients.claim(); // Become available to all pages
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

/**
 * Fetch Event - Serving Cached Assets and Caching Dynamic Content
 */
self.addEventListener('fetch', event => {
    const requestURL = new URL(event.request.url);

    // Handle API requests (e.g., /sections.json and /patreon-poetry)
    if (requestURL.pathname === '/sections.json' || requestURL.pathname === '/patreon-poetry') {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return fetch(event.request)
                    .then(response => {
                        if (response.ok) {
                            cache.put(event.request, response.clone());
                        }
                        return response;
                    })
                    .catch(() => {
                        return cache.match(event.request);
                    });
            })
        );
        return;
    }

    // Handle static assets
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response; // Return cached asset
                }
                return fetch(event.request)
                    .then(networkResponse => {
                        // Optionally cache the new resource
                        if (networkResponse.ok && shouldCache(requestURL.pathname)) {
                            return caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, networkResponse.clone());
                                return networkResponse;
                            });
                        }
                        return networkResponse;
                    })
                    .catch(error => {
                        console.error('[Service Worker] Fetch failed for:', event.request.url, error);
                        // Optionally, return a fallback page or asset
                    });
            })
    );
});

/**
 * Determines whether a given path should be cached.
 * @param {string} pathname - The path of the request.
 * @returns {boolean} - True if the path should be cached, false otherwise.
 */
function shouldCache(pathname) {
    // Define paths that should not be cached
    const blacklist = [
        '/sig', // Assuming /sig is an endpoint that shouldn't be cached
        // Add more paths as needed
    ];

    return !blacklist.includes(pathname);
}
