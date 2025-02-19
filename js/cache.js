// cache.js
(() => {

    let db;

    const stateKey = 'spectralTapestryState';

    const startDate = new Date('2024-10-24');


    /**
     * Initialize IndexedDB
     */
    function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('spectralTapestryDB', 4); // Ensure version matches your setup

            request.onupgradeneeded = function (event) {
                db = event.target.result;

                if (!db.objectStoreNames.contains('poems')) {
                    db.createObjectStore('poems', { keyPath: 'key' });
                }

                if (!db.objectStoreNames.contains('cacheMeta')) {
                    db.createObjectStore('cacheMeta', { keyPath: 'key' });
                }

                if (!db.objectStoreNames.contains('logs')) {
                    db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = function (event) {
                db = event.target.result;
                console.log(`[cache.js] IndexedDB initialized.`);
                resolve();
            };

            request.onerror = function (event) {
                console.error('IndexedDB error:', event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }


    /**
     * Retrieve cached data from 'poems' store
     * @param {string} key
     * @returns {Promise<any>}
     */
    function getCachedData(key) {
        return new Promise((resolve, reject) => {
            if (!db) {
                console.error('IndexedDB not ready.');
                reject('IndexedDB not ready.');
                return;
            }

            const transaction = db.transaction(['poems'], 'readonly');
            const store = transaction.objectStore('poems');
            const request = store.get(key);

            request.onsuccess = (event) => {
                resolve(event.target.result ? event.target.result.data : null);
            };

            request.onerror = (event) => {
                reject(event.target.errorCode);
            };
        });
    }


    /**
     * Store data in 'poems' store
     * @param {string} key
     * @param {any} data
     * @returns {Promise<void>}
     */
    function storeCachedData(key, data) {
        return new Promise((resolve, reject) => {
            if (!db) {
                console.error('IndexedDB not ready.');
                reject('IndexedDB not ready.');
                return;
            }

            const transaction = db.transaction(['poems'], 'readwrite');
            const store = transaction.objectStore('poems');
            const request = store.put({ key, data });

            request.onsuccess = () => {
                console.log(`[cache.js] Data stored for key: ${key}`);
                resolve();
            };

            request.onerror = (event) => {
                console.error(`[cache.js] Failed to store data for key: ${key},`, event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }


    /**
     * Store file version in 'cacheMeta' store
     * @param {string} fileKey
     * @param {string} versionValue
     * @returns {Promise<void>}
     */
    function storeFileVersion(fileKey, versionValue) {
        return new Promise((resolve, reject) => {
            if (!db) {
                console.error('IndexedDB not ready.');
                reject('IndexedDB not ready.');
                return;
            }

            const transaction = db.transaction(['cacheMeta'], 'readwrite');
            const store = transaction.objectStore('cacheMeta');
            const request = store.put({
                key: `version-${fileKey}`,
                data: versionValue
            });

            request.onsuccess = () => {
                console.log(`[cache.js] File version stored for key: ${fileKey}`);
                resolve();
            };

            request.onerror = (event) => {
                console.error(`[cache.js] Failed to store file version for key: ${fileKey},`, event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }


    /**
     * Retrieve file version from 'cacheMeta' store
     * @param {string} fileKey
     * @returns {Promise<string|null>}
     */
    function getFileVersion(fileKey) {
        return new Promise((resolve, reject) => {
            if (!db) {
                console.error('IndexedDB not ready.');
                reject('IndexedDB not ready.');
                return;
            }

            const transaction = db.transaction(['cacheMeta'], 'readonly');
            const store = transaction.objectStore('cacheMeta');
            const request = store.get(`version-${fileKey}`);

            request.onsuccess = (event) => {
                const result = event.target.result;
                resolve(result ? result.data : null);
            };

            request.onerror = (event) => reject(event.target.errorCode);
        });
    }


    /**
     * Clear JSON cache from 'poems' store
     * @returns {Promise<void>}
     */
    async function clearJsonCache() {
        if (!db) {
            console.error('IndexedDB not initialized.');
            return;
        }

        try {
            const transaction = db.transaction(['poems'], 'readwrite');
            const store = transaction.objectStore('poems');
            store.clear();

            await new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = (event) => reject(event.target.errorCode);
            });

            console.log(`[cache.js] Cleared JSON from "poems" store but left audio alone.`);
        } catch (error) {
            console.error('Error clearing JSON cache:', error);
        }
    }


    /**
     * Clear entire cache from 'poems' and 'cacheMeta' stores and LocalStorage/SessionStorage
     * @returns {Promise<void>}
     */
    async function clearCache() {
        if (!db) {
            console.error('IndexedDB not initialized.');
            return;
        }

        try {
            const transaction = db.transaction(['poems', 'cacheMeta'], 'readwrite');
            const poemsStore = transaction.objectStore('poems');
            const metaStore = transaction.objectStore('cacheMeta');
            poemsStore.clear();
            metaStore.clear();

            await new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = (event) => reject(event.target.errorCode);
            });

            // Clear LocalStorage and SessionStorage except the stateKey
            for (let key in localStorage) {
                if (key !== stateKey) {
                    localStorage.removeItem(key);
                }
            }
            for (let key in sessionStorage) {
                if (key !== stateKey) {
                    sessionStorage.removeItem(key);
                }
            }

            // Notify ServiceWorker to clear caches
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                const messageChannel = new MessageChannel();
                messageChannel.port1.onmessage = (event) => {
                    if (event.data && event.data.action === 'cachesCleared') {
                        console.log(`[Main Script] SW caches cleared. Reloading...`);
                        window.location.reload();
                    }
                };
                navigator.serviceWorker.controller.postMessage({ action: 'clearCaches' }, [
                    messageChannel.port2,
                ]);
            } else {
                window.location.reload();
            }
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    }


    /**
     * Get the last cache date from 'cacheMeta' store
     * @returns {Promise<Date|null>}
     */
    function getLastCacheDate() {
        return new Promise((resolve, reject) => {
            if (!db) {
                console.error('IndexedDB not ready.');
                reject('IndexedDB not ready.');
                return;
            }

            const transaction = db.transaction(['cacheMeta'], 'readonly');
            const store = transaction.objectStore('cacheMeta');
            const request = store.get('lastCacheDate');

            request.onsuccess = (event) => {
                const result = event.target.result;
                resolve(result ? new Date(result.data) : null);
            };

            request.onerror = (event) => reject(event.target.errorCode);
        });
    }


    /**
     * Set the last cache date in 'cacheMeta' store
     * @param {Date} date
     * @returns {Promise<void>}
     */
    function setLastCacheDate(date) {
        return new Promise((resolve, reject) => {
            if (!db) {
                console.error('IndexedDB not ready.');
                reject('IndexedDB not ready.');
                return;
            }

            const transaction = db.transaction(['cacheMeta'], 'readwrite');
            const store = transaction.objectStore('cacheMeta');
            const request = store.put({
                key: 'lastCacheDate',
                data: date.toISOString()
            });

            request.onsuccess = () => {
                console.log(`[cache.js] Last cache date set to: ${date.toISOString()}`);
                resolve();
            };

            request.onerror = (event) => {
                console.error(`[cache.js] Failed to set last cache date:`, event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }


    /**
     * Show a refresh popup to the user
     * @param {string} currentLanguage
     * @returns {Promise<boolean>}
     */
    function showRefreshPopup(currentLanguage) {
        return new Promise((resolve) => {
            let popupTheme = 'dark';
            if (
                window.matchMedia &&
                window.matchMedia('(prefers-color-scheme: dark)').matches
            ) {
                popupTheme = 'dark';
            } else if (
                window.matchMedia &&
                window.matchMedia('(prefers-color-scheme: light)').matches
            ) {
                popupTheme = 'light';
            }

            const popup = document.createElement('div');
            popup.classList.add('refresh-popup');
            popup.setAttribute('data-theme', popupTheme);

            const message = document.createElement('p');
            message.innerText =
                currentLanguage === 'en'
                    ? 'New content available, would you like to refresh?'
                    : 'Nuovi contenuti disponibili, vuoi aggiornare?';

            const buttonsContainer = document.createElement('div');
            buttonsContainer.classList.add('buttons-container');

            const yesButton = document.createElement('button');
            yesButton.innerText = currentLanguage === 'en' ? 'Yes' : 'Sì';

            const noButton = document.createElement('button');
            noButton.innerText = currentLanguage === 'en' ? 'No' : 'No';

            buttonsContainer.appendChild(yesButton);
            buttonsContainer.appendChild(noButton);
            popup.appendChild(message);
            popup.appendChild(buttonsContainer);
            document.body.appendChild(popup);

            setTimeout(() => {
                popup.classList.add('visible');
            }, 100);

            yesButton.addEventListener('click', () => {
                popup.classList.remove('visible');
                setTimeout(() => {
                    popup.remove();
                }, 500);
                resolve(true);
            });

            noButton.addEventListener('click', () => {
                popup.classList.remove('visible');
                setTimeout(() => {
                    popup.remove();
                }, 500);
                resolve(false);
            });
        });
    }


    /**
     * Alias for showRefreshPopup (assuming it's needed)
     */
    function showResetCachePopup(currentLanguage) {
        return showRefreshPopup(currentLanguage);
    }


    /**
     * Handle messages from Service Worker
     * @param {MessageEvent} event
     */
    function handleServiceWorkerMessages(event) {
        if (event.data && event.data.action === 'cacheAudioFilesComplete') {
            console.log(`[Main Script] Audio files caching complete.`);
        }
        if (event.data && event.data.action === 'cachesCleared') {
            console.log(`[Main Script] Caches have been cleared.`);
            window.location.reload();
        }
    }


    /**
     * Update cache with provided JSON files
     * @param {Array<string>} jsonFiles
     * @param {Function} setIsUpdating
     * @param {Function} updateCloudIconState
     * @param {Function} isPuzzlePoemInserted
     * @param {Function} insertPuzzlePoem
     * @param {Function} storeCachedDataFn
     * @param {Function} setLastCacheDateFn
     */
    async function updateCache(
        jsonFiles,
        setIsUpdating,
        updateCloudIconState,
        isPuzzlePoemInserted,
        insertPuzzlePoem,
        storeCachedDataFn,
        setLastCacheDateFn
    ) {
        setIsUpdating(true);
        updateCloudIconState();
        console.log(`[cache.js] Starting cache update.`);

        // Initialize BroadcastChannel for progress updates
        const progressChannel = new BroadcastChannel('cache-progress');

        const totalFiles = jsonFiles.length;
        let processedFiles = 0;

        for (const jsonFile of jsonFiles) {
            let storedETag = await getFileVersion(jsonFile);
            const headers = {};
            if (storedETag) {
                headers['If-None-Match'] = storedETag;
            }

            const url = `json/${jsonFile}`;
            try {
                const response = await fetch(url, { headers });
                if (response.status === 200) {
                    const data = await response.json();
                    const newETag = response.headers.get('ETag');
                    if (newETag) {
                        await storeFileVersion(jsonFile, newETag);
                    }

                    if (jsonFile === 'experiments.json' && !isPuzzlePoemInserted()) {
                        insertPuzzlePoem();
                    }

                    await storeCachedDataFn(jsonFile, data);
                    console.log(`[cache.js] Updated ${jsonFile} from the server (ETag changed).`);
                } else if (response.status === 304) {
                    console.log(`[cache.js] ${jsonFile} is unchanged (304). Using cached version.`);
                } else {
                    console.error(`Failed to fetch ${url}: ${response.status}`);
                }
            } catch (error) {
                console.error(`Error fetching ${url}:`, error);
            }

            processedFiles++;
            const percent = Math.round((processedFiles / totalFiles) * 100);
            progressChannel.postMessage({ type: 'progress', percent });
        }

        const today = new Date();
        await setLastCacheDateFn(today);

        // Send completion message
        progressChannel.postMessage({ type: 'complete' });

        setIsUpdating(false);
        updateCloudIconState();
        console.log(`[cache.js] Cache update completed.`);
    }


    /**
     * Check and refresh cache if needed
     * @param {Function} getLastCacheDateFn
     * @param {Function} updateCacheFunc
     * @param {string} currentLanguage
     */
    async function checkAndRefreshCache(
        getLastCacheDateFn,
        updateCacheFunc,
        currentLanguage
    ) {
        try {
            let lastCacheDate = await getLastCacheDateFn();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (!lastCacheDate) {
                console.log(`[cache.js] No previous cache date found. Performing initial cache.`);
                // No cache yet
                await updateCacheFunc([
                    'poetry.json',
                    'caliope.json',
                    'lupa.json',
                    'experiments.json',
                    'strands.json'
                ],
                window.script.setIsUpdating,
                window.PoemsManager.updateCloudIconState,
                window.PoemsManager.isPuzzlePoemInserted,
                window.PoemsManager.insertPuzzlePoem,
                window.CacheManager.storeCachedData,
                window.CacheManager.setLastCacheDate
                );
            } else {
                lastCacheDate.setHours(0, 0, 0, 0);
                if (lastCacheDate < today) {
                    console.log(`[cache.js] New day detected. Refreshing cache.`);
                    // Automatically update cache without popup
                    await updateCacheFunc([
                        'poetry.json',
                        'caliope.json',
                        'lupa.json',
                        'experiments.json',
                        'strands.json'
                    ],
                    window.script.setIsUpdating,
                    window.PoemsManager.updateCloudIconState,
                    window.PoemsManager.isPuzzlePoemInserted,
                    window.PoemsManager.insertPuzzlePoem,
                    window.CacheManager.storeCachedData,
                    window.CacheManager.setLastCacheDate
                    );
                } else {
                    console.log(`[cache.js] Cache is up to date for today.`);
                }
            }
        } catch (error) {
            console.error('Error in checkAndRefreshCache:', error);
        }
    }


    /**
     * Generate a list of audio files between startDate and endDate
     * @param {Date} startDate
     * @param {Date} endDate
     * @returns {Array<string>}
     */
    function generateAudioFileList(startDate, endDate) {
        const files = [];
        let date = new Date(endDate);
        while (date >= startDate) {
            const day = date.getDate();
            const monthIndex = date.getMonth();
            const year = date.getFullYear();

            const monthsEn = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const monthName = monthsEn[monthIndex];
            const fileName = `${day}_${monthName}_${year}.m4a`;
            files.push(`/audio/${fileName}`);
            date.setDate(date.getDate() - 1);
        }
        return files;
    }


    /**
     * Cache audio files up to the last cache date
     * @param {Function} getLastCacheDateFn
     * @returns {Promise<void>}
     */
    async function cacheAudioFilesUpToLastCacheDate(getLastCacheDateFn) {
        if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
            console.warn('Service Worker is not active.');
            return;
        }

        try {
            const lastCacheDate = await getLastCacheDateFn();
            if (!lastCacheDate) {
                console.warn('No last cache date found.');
                return;
            }
            const audioFiles = generateAudioFileList(startDate, lastCacheDate);
            console.log(`[cache.js] Caching audio files up to ${lastCacheDate.toISOString()}`);
            navigator.serviceWorker.controller.postMessage({
                action: 'cacheAudioFiles',
                files: audioFiles,
            });
        } catch (error) {
            console.error('Error caching audio files:', error);
        }
    }


    /**
     * Add a log entry to IndexedDB
     * @param {Object} logEntry - The log entry to store
     * @returns {Promise<void>}
     */
    function storeLogEntry(logEntry) {
        return new Promise((resolve, reject) => {
            if (!db) {
                console.error('IndexedDB not ready.');
                reject('IndexedDB not ready.');
                return;
            }

            const transaction = db.transaction(['logs'], 'readwrite');
            const store = transaction.objectStore('logs');
            const request = store.add(logEntry);

            request.onsuccess = () => {
                console.log(`[cache.js] Log entry stored in IndexedDB:`, logEntry);
                resolve();
            };

            request.onerror = (event) => {
                console.error(`[cache.js] Failed to store log entry:`, event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }


    /**
     * Retrieve all log entries from the 'logs' object store
     * @returns {Promise<Array>}
     */
    function getAllLogEntries() {
        return new Promise((resolve, reject) => {
            if (!db) {
                console.error('IndexedDB not ready.');
                reject('IndexedDB not ready.');
                return;
            }

            const transaction = db.transaction(['logs'], 'readonly');
            const store = transaction.objectStore('logs');
            const request = store.getAll();

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.errorCode);
        });
    }


    /**
     * Delete log entries by their IDs from the 'logs' object store
     * @param {Array<number>} ids - Array of log entry IDs to delete
     * @returns {Promise<void>}
     */
    function deleteLogEntries(ids) {
        return new Promise((resolve, reject) => {
            if (!db) {
                console.error('IndexedDB not ready.');
                reject('IndexedDB not ready.');
                return;
            }

            const transaction = db.transaction(['logs'], 'readwrite');
            const store = transaction.objectStore('logs');

            ids.forEach(id => {
                store.delete(id);
            });

            transaction.oncomplete = () => {
                console.log(`[cache.js] Deleted logs with IDs: ${ids.join(', ')}`);
                resolve();
            };

            transaction.onerror = (event) => {
                console.error(`[cache.js] Failed to delete logs:`, event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }


    /**
     * List of additional assets to cache dynamically
     */
    const ADDITIONAL_ASSETS = [
        // Add any additional assets not pre-cached by Service Worker
        // For example, dynamically loaded images or fonts
        // '/fonts/custom-font.woff2', // Example

        // Play/Pause Icons
        '/icons/play.png',
        '/icons/play_alt.png',
        '/icons/pause.png',
        '/icons/pause_alt.png',
    ];


    /**
     * Cache additional assets dynamically
     * @returns {Promise<void>}
     */
    async function cacheAdditionalAssets() {
        if (!db) {
            console.error('IndexedDB not initialized.');
            return;
        }

        try {
            const cache = await caches.open('dynamic-cache');
            for (const asset of ADDITIONAL_ASSETS) {
                try {
                    const response = await fetch(asset);
                    if (response.ok) {
                        await cache.put(asset, response.clone());
                        console.log(`[cache.js] Cached asset: ${asset}`);
                    }
                } catch (err) {
                    console.warn(`[cache.js] Could not cache asset: ${asset},`, err);
                }
            }
        } catch (error) {
            console.error('Error caching additional assets:', error);
        }
    }


    /**
     * Generic function to store data with fallback
     * @param {string} key
     * @param {any} data
     * @returns {Promise<void>}
     */
    function storeDataWithFallback(key, data) {
        return new Promise(async (resolve, reject) => {
            try {
                await storeCachedData(key, data); // Try IndexedDB
                resolve();
            } catch (error) {
                console.warn(`[cache.js] IndexedDB failed for key: ${key}. Trying localStorage.`);
                try {
                    localStorage.setItem(key, JSON.stringify(data));
                    resolve();
                } catch (err) {
                    console.warn(`[cache.js] localStorage failed for key: ${key}. Trying sessionStorage.`);
                    try {
                        sessionStorage.setItem(key, JSON.stringify(data));
                        resolve();
                    } catch (e) {
                        console.error(`[cache.js] All storage methods failed for key: ${key}.`, e);
                        reject(e);
                    }
                }
            }
        });
    }


    /**
     * Generic function to retrieve data with fallback
     * @param {string} key
     * @returns {Promise<any>}
     */
    function getDataWithFallback(key) {
        return new Promise(async (resolve, reject) => {
            try {
                const data = await getCachedData(key); // Try IndexedDB
                if (data !== null) {
                    resolve(data);
                    return;
                }
                console.warn(`[cache.js] No data in IndexedDB for key: ${key}. Trying localStorage.`);
                const localData = localStorage.getItem(key);
                if (localData) {
                    resolve(JSON.parse(localData));
                    return;
                }
                console.warn(`[cache.js] No data in localStorage for key: ${key}. Trying sessionStorage.`);
                const sessionData = sessionStorage.getItem(key);
                if (sessionData) {
                    resolve(JSON.parse(sessionData));
                    return;
                }
                resolve(null); // No data found
            } catch (error) {
                console.error(`[cache.js] Failed to retrieve data for key: ${key}.`, error);
                reject(error);
            }
        });
    }


    window.CacheManager = {
        initDB,
        getCachedData,
        storeCachedData,
        clearCache,
        clearJsonCache,
        getLastCacheDate,
        setLastCacheDate,
        showRefreshPopup, // Retained for other uses like manual cache reset
        showResetCachePopup,
        handleServiceWorkerMessages,
        updateCache, // Updated function with progress messaging
        checkAndRefreshCache, // Updated function
        generateAudioFileList,
        cacheAudioFilesUpToLastCacheDate,
        // Log management functions
        storeLogEntry,
        getAllLogEntries,
        deleteLogEntries,
        // Additional caching functions
        cacheAdditionalAssets,
        // Fallback storage functions
        storeDataWithFallback,
        getDataWithFallback
    };

})();
