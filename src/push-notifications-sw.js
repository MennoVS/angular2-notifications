// angular2-notifications service worker

'use strict';

self.addEventListener('notificationclick', function(event) {
    event.notification.close()
});