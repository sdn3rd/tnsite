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
    '/icons/darkmode_alt.png',
    '/icons/lightmode.png',
    '/icons/lightmode_alt.png',
    '/icons/patreon.png',
    '/icons/patreon_alt.png',
    '/icons/menu.png',
    '/icons/menu_alt.png',
    '/icons/about.png',
    '/icons/about_alt.png',
    '/icons/poetry.png',
    '/icons/poetry_alt.png',
    '/icons/books.png',
    '/icons/books_alt.png',
    '/icons/contact.png',
    '/icons/contact_alt.png',
    '/icons/twitter.png',
    '/icons/twitter_alt.png',
    '/icons/instagram.png',
    '/icons/instagram_alt.png',
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
    self.skipWaiting(); // Force the waiting Service Worker to become active
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
    self.clients.claim();
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

function shouldCache(pathname) {
    // Define any paths that should NOT be cached
    const blacklist = [
        '/sig'  // example endpoint not to cache
    ];
    return !blacklist.includes(pathname);
}
