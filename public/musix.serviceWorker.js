//@ts-check
const cacheName = "musixV4";
const nonCachableURLSegments = [
    "/musix/playlists",
    "/musix/lyrics",
    ".mp3"
];

self.addEventListener("install", (event) => {
    console.log("ServiceWorker installation successful");
});

self.addEventListener("activate", (event) => {
    caches.keys().then((keys) => {
        for (const key of keys) {
            if (key !== cacheName) {
                caches.delete(key);
            }
        }
        
        console.log("ServiceWorker activation successful");
    });
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.open(cacheName).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    //CASE: A cached response already exists
                    // console.log("Serving: " + event.request.url);
                    return cachedResponse;
                } else {
                    //CASE: A cached response doesn't exist
                    let isCachable = true;
                    if (event.request.method === "GET") {
                        for (const urlSegment of nonCachableURLSegments) {
                            if (event.request.url.includes(urlSegment)) {
                                isCachable = false;
                                break;
                            }
                        }
                    }
                    if (isCachable) {
                        //CASE: A cached response doesn't exist and needs to be cached
                        //Request, cache and respond with required resource
                        return fetch(event.request).then((fetchedResponse) => {
                            // console.log("Caching: " + event.request.url);
                            cache.put(event.request, fetchedResponse.clone());
                            return fetchedResponse;
                        }).catch((error) => {
                            return new Response(JSON.stringify({
                                status: false,
                                error: { title: "Aw! snap", titleDescription: "Contact your system administrator", message: "We couldn't fetch some required data from the server. The most likely cause may be a network failure. If it is not the case, provide your system administrator with the following error\n\n" + error, technicalMessage: "Fetch failure from service worker" }
                            }));
                        });
                    } else {
                        //CASE: A cached response doesn't exist and no need of caching
                        //Request and respond with required resource without caching
                        // console.log("Fetching: " + event.request.url);
                        return fetch(event.request).catch((error) => {
                            return new Response(JSON.stringify({
                                status: false,
                                error: { title: "Aw! snap", titleDescription: "Contact your system administrator", message: "We couldn't fetch some required data from the server. The most likely cause may be a network failure. If it is not the case, provide your system administrator with the following error\n\n" + error, technicalMessage: "Fetch failure from service worker" }
                            }));
                        });
                    }
                }
            });
        })
    );
});