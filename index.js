const crypto = require('crypto');

module.exports = function messengerSim(...params) {
    return class messengerSim extends require('ut-port-webhook')(...params) {
        get defaults() {
            return {
                namespace: 'messengerSim',
                path: '/v2.6/me/messages',
                hook: 'botSim.messengerFlow',
                mode: 'reply',
                async: false,
                server: {
                    port: 8182
                },
                request: {
                    json: false
                }
            };
        }

        handlers() {
            let lastReply;
            let id = 0;
            return {
                [`${this.config.hook}.identity.request.receive`]: () => {
                    return {
                        clientId: this.config.clientId,
                        appId: this.config.appId,
                        platform: 'messenger',
                        accessToken: this.config.accessToken
                    };
                },
                [`${this.config.hook}.message.request.receive`]: msg => {
                    lastReply = {
                        platform: 'messenger',
                        receiver: msg.recipient.id,
                        text: msg.message.text,
                        request: msg
                    };
                    return msg;
                },
                [`${this.config.namespace}.message.request.send`]: async(msg) => {
                    lastReply = undefined;
                    const timestamp = new Date().getTime();
                    let body = {
                        object: 'page',
                        entry: [{
                            id: msg.clientId || this.config.clientId,
                            time: timestamp,
                            messaging: [{
                                sender: {
                                    id: '2152159991519793'
                                },
                                recipient: {
                                    id: msg.clientId || this.config.clientId
                                },
                                timestamp,
                                message: {
                                    mid: timestamp + '-' + id++,
                                    seq: id
                                }
                            }]
                        }]
                    };
                    switch (msg.type) {
                        case 'text':
                            body.entry[0].messaging[0].message.text = msg.text;
                            break;
                        case 'image':
                            body.entry[0].messaging[0].message.attachments = [{
                                type: 'image',
                                payload: {
                                    url: msg.url
                                }
                            }];
                            break;
                        case 'location':
                            body.entry[0].messaging[0].message.attachments = [{
                                type: 'location',
                                payload: {
                                    coordinates: {
                                        lat: msg.location.lat,
                                        long: msg.location.lon
                                    }
                                }
                            }];
                            break;
                    }
                    body = Buffer.from(JSON.stringify(body));
                    return {
                        url: 'http://localhost:8082/messenger/' + (msg.appId || this.config.appId),
                        body,
                        headers: {
                            'x-hub-signature': 'sha1=' + crypto
                                .createHmac('sha1', this.config.secret)
                                .update(body)
                                .digest()
                                .toString('hex')
                        }
                    };
                },
                [`${this.config.namespace}.message.response.receive`]: async(msg) => {
                    return {
                        httpResponse: msg,
                        reply: lastReply
                    };
                }
            };
        }
    };
};
