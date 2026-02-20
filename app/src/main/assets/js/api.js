const API = {
    baseUrl: '',
    token: '',

    setToken(token) {
        this.token = token;
    },

    getToken() {
        return this.token;
    },

    async fetch(endpoint, options) {
        var headers = {
            'Content-Type': 'application/json'
        };

        if (options && options.headers) {
            for (var key in options.headers) {
                headers[key] = options.headers[key];
            }
        }

        if (this.token && endpoint.indexOf('/login') === -1) {
            headers['Authorization'] = this.token;
        }

        var fetchOptions = options || {};
        fetchOptions.headers = headers;

        var res = await fetch('/api' + endpoint, fetchOptions);
        var text = await res.text();
        var data;

        try {
            data = JSON.parse(text);
        } catch (e) {
            data = { error: text };
        }

        if (res.status === 403 || res.status === 401) {
            if (typeof App !== 'undefined' && App.logout) {
                App.logout();
            }
            throw new Error('Session expired');
        }

        if (!res.ok && !data.status) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    },

    async login(password) {
        return this.fetch('/login', {
            method: 'POST',
            body: JSON.stringify({ password: password })
        });
    },

    async getBattery() {
        return this.fetch('/battery');
    },

    async getSignal() {
        return this.fetch('/signal');
    },

    async getOperator() {
        return this.fetch('/operator');
    },

    async getClients() {
        return this.fetch('/clients');
    },

    async getIP() {
        return this.fetch('/ip');
    },

    async getNetwork() {
        return this.fetch('/network');
    },

    async getUptime() {
        return this.fetch('/uptime');
    },

    async getSMSInbox(page) {
        page = page || 1;
        return this.fetch('/sms/inbox?page=' + page);
    },

    async getSMSOutbox(page) {
        page = page || 1;
        return this.fetch('/sms/outbox?page=' + page);
    },

    async sendSMS(number, message) {
        return this.fetch('/sms/send', {
            method: 'POST',
            body: JSON.stringify({ number: number, message: message })
        });
    },

    async deleteSMS(id) {
        return this.fetch('/sms/delete', {
            method: 'POST',
            body: JSON.stringify({ id: id })
        });
    },

    async deleteMultipleSMS(ids) {
        return this.fetch('/sms/delete', {
            method: 'POST',
            body: JSON.stringify({ ids: ids })
        });
    },

    async deleteAllSMS() {
        return this.fetch('/sms/delete', {
            method: 'POST',
            body: JSON.stringify({ all: true })
        });
    },

    async changePassword(old_password, new_password) {
        return this.fetch('/change-password', {
            method: 'POST',
            body: JSON.stringify({ old_password: old_password, new_password: new_password })
        });
    },

    async getCallback() {
        return this.fetch('/callback');
    },

    async setCallback(url, enabled) {
        return this.fetch('/callback', {
            method: 'POST',
            body: JSON.stringify({ url: url, enabled: enabled })
        });
    },

    async deleteCallback() {
        return this.fetch('/callback', {
            method: 'DELETE'
        });
    },

    async testCallback() {
        return this.fetch('/callback/test', {
            method: 'POST'
        });
    },

    async getTelegram() {
        return this.fetch('/telegram');
    },

    async setTelegram(bot_token, chat_id, own_number, enabled) {
        return this.fetch('/telegram', {
            method: 'POST',
            body: JSON.stringify({
                bot_token: bot_token,
                chat_id: chat_id,
                own_number: own_number,
                enabled: enabled
            })
        });
    },

    async deleteTelegram() {
        return this.fetch('/telegram', {
            method: 'DELETE'
        });
    },

    async testTelegram() {
        return this.fetch('/telegram/test', {
            method: 'POST'
        });
    },

    async getHotspot() {
        return this.fetch('/hotspot');
    },

    async setHotspot(ssid, password, hidden, security) {
        return this.fetch('/hotspot', {
            method: 'POST',
            body: JSON.stringify({
                ssid: ssid,
                password: password,
                hidden: hidden,
                security: security
            })
        });
    },

    async getLanguage() {
        return this.fetch('/language');
    },

    async setLanguage(language) {
        return this.fetch('/language', {
            method: 'POST',
            body: JSON.stringify({ language: language })
        });
    },

    async getSmsGateway() {
        return this.fetch('/sms-gateway');
    },

    async setSmsGateway(enabled) {
        return this.fetch('/sms-gateway', {
            method: 'POST',
            body: JSON.stringify({ enabled: enabled })
        });
    },

    async regenerateSmsGatewayToken() {
        return this.fetch('/sms-gateway/regenerate', {
            method: 'POST'
        });
    }
};
