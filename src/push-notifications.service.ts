import {Injectable} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {PushNotification, Permission} from './push-notification.type';

declare const Notification, ServiceWorkerRegistration, navigator, window: any;

@Injectable()
export class PushNotificationsService {

    permission: Permission;

    private sw;

    constructor() {
        this.permission  = this.isSupported() ? Notification.permission : 'denied';
    }

    requestPermission(): void {
        if ('Notification' in window)
            Notification.requestPermission((status: any) => this.permission = status);
    }

    isSupported(): boolean {
        return 'Notification' in window || 'showNotification' in ServiceWorkerRegistration.prototype;
    }

    create(title: string, options?: PushNotification): Observable<any> {

        return new Observable((obs: any) => {

            if (!('Notification' in window)) {
                obs.error('Notifications are not available in this environment');
                obs.complete();
            }

            if (this.permission !== 'granted') {
                obs.error(`The user hasn't granted you permission to send push notifications`);
                obs.complete();
            }

            let n = this.createNotification(title, options);

            if (this.sw) {
                this.sw.getNotifications().then(notifications => {
                    n = notifications[notifications.length - 1];

                    n.onshow = (e: any) => obs.next({notification: n, event: e});
                    n.onclick = (e: any) => obs.next({notification: n, event: e});
                    n.onerror = (e: any) => obs.error({notification: n, event: e});
                    n.onclose = () => obs.complete();
                });
            } else {
                n.onshow = (e: any) => obs.next({notification: n, event: e});
                n.onclick = (e: any) => obs.next({notification: n, event: e});
                n.onerror = (e: any) => obs.error({notification: n, event: e});
                n.onclose = () => obs.complete();
            }
        });
    }

    registerServiceWorker(swUrl: string = '/push-notifications-sw.js'): Observable<any> {
        const observable = (new Observable((obs: any) => {
            if (!('serviceWorker' in navigator) || !('showNotification' in ServiceWorkerRegistration.prototype)) {
                obs.error('Error registering service worker, ' +
                    'ServiceWorker push notifications are not available in this environment');
                obs.complete();
            }

            try {
                navigator.serviceWorker.register(swUrl).then((sw) => {
                    this.sw = sw;

                    if (this.sw.active && this.sw.active.state === 'activated') {
                        // SW was already registered and installed
                        obs.next('Ready to show notifications');
                        obs.complete();
                    } else {
                        // wait for SW to install
                        navigator.serviceWorker.ready.then(sw => {
                            obs.next('Ready to show notifications');
                            obs.complete();
                        });
                    }
                });
            } catch (e) {
                obs.error('Error registering service worker');
                obs.complete();
            }
        }) as any).share();
        observable.first().subscribe(() => null); // activate lazy observable
        return observable;
    }

    deregisterServiceWorker() {
        this.sw && this.sw.deregister();
    }

    private createNotification(title: string, options?: PushNotification): any {
        return this.sw ? this.sw.showNotification(title, options) : new Notification(title, options);
    }
}
