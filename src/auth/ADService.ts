import * as ActiveDirectory from 'activedirectory';

class ADServiceConfig {
    server: string;
    baseDN: string;
    port: string;
    username: string;
    password: string;
    attributes: string;
}

export class ADService {
    private ad: any;

    constructor(config: ADServiceConfig) {
        let adConfig: any = {
            url: config.server,
            baseDN: config.baseDN,
            port: config.port,
            username: config.username,
            password: config.password
        };

        if (config.attributes) {
            let attributes = [];
            let parts = config.attributes.split(',');

            for (let i = 0; i < parts.length; i++) {
                attributes.push(parts[i].trim());
            }

            adConfig.attributes = {
                user: attributes
            };
        }

        this.ad = new ActiveDirectory(adConfig);
    }

    findBySIP(sip) {
        return new Promise(async (resolve, reject) => {
            if (!this.ad) {
                return reject('AD was not started properly.');
            }

            this.ad.findUsers('proxyAddresses=' + sip, (err, users) => {
                if (err) {
                    return reject(err);
                }
                if ((!users) || (users.length === 0)) {
                    return reject('No users found.');
                }
                return resolve(users[0]);
            });
        });
    }

    getUser(uid: string) {
        return new Promise((resolve, reject) => {
            if (!uid) {
                return reject('no uid provided.');
            }

            this.ad.findUser(uid, (error, user) => {
                if (error) {
                    return reject('ERROR: ' + JSON.stringify(error));
                }
                if (!user) {
                    return reject('No user found.');
                }
                return resolve(user);
            });
        });
    }
}
