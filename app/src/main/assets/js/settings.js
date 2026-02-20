const Settings = {
    renderSmsGatewayExample(token) {
        var origin = window.location.origin || '';
        var endpoint = origin + '/api/sms-gateway/send';
        var endpointEl = document.getElementById('sms-gateway-endpoint');
        var exampleEl = document.getElementById('sms-gateway-example');

        if (endpointEl) endpointEl.textContent = endpoint;
        if (exampleEl) {
            exampleEl.textContent =
                'curl -X POST "' + endpoint + '" \\\n' +
                '  -H "Content-Type: application/json" \\\n' +
                '  -H "X-Gateway-Token: ' + token + '" \\\n' +
                '  -d \'{"number":"08xxxxxxxxxx","message":"Hello from API"}\'';
        }
    },

    async loadSmsGateway() {
        try {
            var res = await API.getSmsGateway();
            document.getElementById('sms-gateway-enabled').checked = res.enabled || false;
            document.getElementById('sms-gateway-token').value = res.token || '';
            this.renderSmsGatewayExample(res.token || '');
        } catch (err) {
            console.error('Load SMS gateway error:', err);
        }
    },

    async saveSmsGateway() {
        var enabled = document.getElementById('sms-gateway-enabled').checked;
        var btn = document.getElementById('save-sms-gateway-btn');

        Utils.setButtonLoading(btn, true);

        try {
            var res = await API.setSmsGateway(enabled);
            if (res.status === 'success') {
                document.getElementById('sms-gateway-token').value = res.token || '';
                this.renderSmsGatewayExample(res.token || '');
                Toast.success(I18N.t('toast.sms_gateway_saved'));
            } else {
                Toast.error(I18N.t('toast.settings_save_failed'));
            }
        } catch (err) {
            Toast.error(I18N.t('toast.error_prefix', { message: err.message }));
        } finally {
            Utils.setButtonLoading(btn, false);
        }
    },

    async regenerateSmsGatewayToken() {
        var btn = document.getElementById('regen-sms-gateway-btn');
        Utils.setButtonLoading(btn, true);

        try {
            var res = await API.regenerateSmsGatewayToken();
            if (res.status === 'success') {
                document.getElementById('sms-gateway-token').value = res.token || '';
                this.renderSmsGatewayExample(res.token || '');
                Toast.success(I18N.t('toast.sms_gateway_token_regenerated'));
            } else {
                Toast.error(I18N.t('toast.sms_gateway_regen_failed'));
            }
        } catch (err) {
            Toast.error(I18N.t('toast.error_prefix', { message: err.message }));
        } finally {
            Utils.setButtonLoading(btn, false);
        }
    },

    async loadLanguage() {
        try {
            var res = await API.getLanguage();
            document.getElementById('app-language').value = res.language || 'en';
        } catch (err) {
            document.getElementById('app-language').value = I18N.currentLanguage || 'en';
        }
    },

    async saveLanguage() {
        var lang = document.getElementById('app-language').value;
        var btn = document.getElementById('save-language-btn');
        Utils.setButtonLoading(btn, true);

        try {
            await I18N.setLanguage(lang, true);
            Toast.success(I18N.t('toast.language_saved'));
            await this.loadAll();
            if (App.currentPage === 'dashboard') {
                Dashboard.load();
            }
        } catch (err) {
            Toast.error(I18N.t('toast.error_prefix', { message: err.message }));
        } finally {
            Utils.setButtonLoading(btn, false);
        }
    },

    async loadCallback() {
        try {
            var res = await API.getCallback();
            document.getElementById('callback-url').value = res.url || '';
            document.getElementById('callback-enabled').checked = res.enabled || false;
        } catch (err) {
            console.error('Load callback error:', err);
        }
    },

    async saveCallback() {
        var url = document.getElementById('callback-url').value.trim();
        var enabled = document.getElementById('callback-enabled').checked;
        var btn = document.getElementById('save-callback-btn');

        Utils.setButtonLoading(btn, true);

        try {
            var res = await API.setCallback(url, enabled);
            if (res.status === 'success') {
                Toast.success(I18N.t('toast.callback_saved'));
            } else {
                Toast.error(I18N.t('toast.settings_save_failed'));
            }
        } catch (err) {
            Toast.error(I18N.t('toast.error_prefix', { message: err.message }));
        } finally {
            Utils.setButtonLoading(btn, false);
        }
    },

    async testCallback() {
        var url = document.getElementById('callback-url').value.trim();
        var btn = document.getElementById('test-callback-btn');

        if (!url) {
            Toast.warning(I18N.t('toast.callback_url_required'));
            return;
        }

        Utils.setButtonLoading(btn, true);

        try {
            var res = await API.testCallback();
            if (res.status === 'success') {
                Toast.success(I18N.t('toast.callback_test_sent'));
            } else {
                Toast.error(res.message || I18N.t('toast.callback_test_failed'));
            }
        } catch (err) {
            Toast.error(I18N.t('toast.error_prefix', { message: err.message }));
        } finally {
            Utils.setButtonLoading(btn, false);
        }
    },

    async loadTelegram() {
        try {
            var res = await API.getTelegram();
            document.getElementById('telegram-bot-token').value = res.bot_token || '';
            document.getElementById('telegram-chat-id').value = res.chat_id || '';
            document.getElementById('telegram-own-number').value = res.own_number || '';
            document.getElementById('telegram-enabled').checked = res.enabled || false;
        } catch (err) {
            console.error('Load telegram error:', err);
        }
    },

    async saveTelegram() {
        var botToken = document.getElementById('telegram-bot-token').value.trim();
        var chatId = document.getElementById('telegram-chat-id').value.trim();
        var ownNumber = document.getElementById('telegram-own-number').value.trim();
        var enabled = document.getElementById('telegram-enabled').checked;
        var btn = document.getElementById('save-telegram-btn');

        Utils.setButtonLoading(btn, true);

        try {
            var res = await API.setTelegram(botToken, chatId, ownNumber, enabled);
            if (res.status === 'success') {
                Toast.success(I18N.t('toast.telegram_saved'));
            } else {
                Toast.error(I18N.t('toast.settings_save_failed'));
            }
        } catch (err) {
            Toast.error(I18N.t('toast.error_prefix', { message: err.message }));
        } finally {
            Utils.setButtonLoading(btn, false);
        }
    },

    async testTelegram() {
        var botToken = document.getElementById('telegram-bot-token').value.trim();
        var chatId = document.getElementById('telegram-chat-id').value.trim();
        var btn = document.getElementById('test-telegram-btn');

        if (!botToken || !chatId) {
            Toast.warning(I18N.t('toast.telegram_require_token_chat'));
            return;
        }

        Utils.setButtonLoading(btn, true);

        try {
            var res = await API.testTelegram();
            if (res.status === 'success') {
                Toast.success(I18N.t('toast.telegram_test_sent'));
            } else {
                Toast.error(res.message || I18N.t('toast.telegram_test_failed'));
            }
        } catch (err) {
            Toast.error(I18N.t('toast.error_prefix', { message: err.message }));
        } finally {
            Utils.setButtonLoading(btn, false);
        }
    },

    async loadAll() {
        await Promise.all([
            this.loadLanguage(),
            this.loadSmsGateway(),
            this.loadCallback(),
            this.loadTelegram()
        ]);
    }
};
