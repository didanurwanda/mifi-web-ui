const I18N = {
    currentLanguage: 'en',
    dict: {},

    async init() {
        let lang = 'en';
        try {
            const res = await API.getLanguage();
            if (res && res.language) {
                lang = res.language;
            }
        } catch (e) {
            lang = 'en';
        }
        await this.setLanguage(lang, false);
    },

    async setLanguage(lang, saveToServer) {
        const supported = ['en', 'id', 'zh', 'th', 'ko', 'vi', 'ru', 'ja'];
        const target = supported.indexOf(lang) >= 0 ? lang : 'en';
        this.currentLanguage = target;
        this.dict = await this.buildDict(target);
        this.applyStaticText();

        if (saveToServer) {
            try {
                await API.setLanguage(target);
            } catch (e) {}
        }
    },

    async loadDict(lang) {
        try {
            const res = await fetch('/i18n/' + lang + '.json');
            if (!res.ok) throw new Error('failed');
            return await res.json();
        } catch (e) {
            if (lang !== 'en') {
                return this.loadDict('en');
            }
            return {};
        }
    },

    async buildDict(lang) {
        if (lang === 'en' || lang === 'id') {
            return this.loadDict(lang);
        }

        const [enDict, idDict, targetDict] = await Promise.all([
            this.loadDict('en'),
            this.loadDict('id'),
            this.loadDict(lang)
        ]);

        const merged = {};
        const keys = new Set([
            ...Object.keys(enDict || {}),
            ...Object.keys(idDict || {}),
            ...Object.keys(targetDict || {})
        ]);

        keys.forEach(function(key) {
            const enVal = enDict ? enDict[key] : undefined;
            const idVal = idDict ? idDict[key] : undefined;
            const langVal = targetDict ? targetDict[key] : undefined;

            // If translation is missing or still identical to English, fallback to Indonesian.
            if (langVal === undefined || langVal === enVal) {
                merged[key] = idVal !== undefined ? idVal : enVal || key;
            } else {
                merged[key] = langVal;
            }
        });

        return merged;
    },

    t(key, params) {
        let text = this.dict[key] || key;
        if (params) {
            Object.keys(params).forEach(function(p) {
                text = text.replace(new RegExp('\\{\\{' + p + '\\}\\}', 'g'), String(params[p]));
            });
        }
        return text;
    },

    applyToSelector(selector, key, params) {
        const el = document.querySelector(selector);
        if (!el) return;
        el.textContent = this.t(key, params);
    },

    applyPlaceholder(selector, key) {
        const el = document.querySelector(selector);
        if (!el) return;
        el.placeholder = this.t(key);
    },

    applyStaticText() {
        document.documentElement.lang = this.currentLanguage;
        document.title = this.t('app.title');

        this.applyToSelector('.login-header p', 'login.subtitle');
        this.applyPlaceholder('#login-password', 'login.password_placeholder');
        this.applyToSelector('#login-btn .btn-text', 'common.login');
        this.applyToSelector('#sidebar-logout-label', 'common.logout');
        this.applyToSelector('#refresh-clients', 'common.refresh');
        this.applyToSelector('.btn-link[data-page="network"]', 'common.edit');

        this.applyToSelector('.sidebar-link[data-page="dashboard"] span:last-child', 'menu.dashboard');
        this.applyToSelector('.sidebar-link[data-page="sms"] span:last-child', 'menu.sms');
        this.applyToSelector('.sidebar-link[data-page="network"] span:last-child', 'menu.network');
        this.applyToSelector('.sidebar-link[data-page="tools"] span:last-child', 'menu.tools');
        this.applyToSelector('.sidebar-link[data-page="update"] span:last-child', 'menu.update');
        this.applyToSelector('.sidebar-link[data-page="settings"] span:last-child', 'menu.settings');

        this.applyToSelector('#sms-tab-inbox .sms-toolbar .checkbox-label span', 'sms.select_all');
        this.applyToSelector('#sms-tab-outbox .sms-toolbar .checkbox-label span', 'sms.select_all');
        this.applyToSelector('#inbox-delete-selected', 'sms.delete_selected');
        this.applyToSelector('#inbox-delete-all', 'sms.delete_all');
        this.applyToSelector('#outbox-delete-selected', 'sms.delete_selected');
        this.applyToSelector('#outbox-delete-all', 'sms.delete_all');
        this.applyToSelector('#sms-tab-compose label[for="sms-number"], #sms-tab-compose .form-group label', 'sms.destination_number');
        this.applyPlaceholder('#sms-number', 'sms.destination_placeholder');
        this.applyPlaceholder('#sms-message', 'sms.message_placeholder');
        this.applyToSelector('#send-sms-btn .btn-text', 'sms.send');
        this.applyToSelector('.sms-tab[data-tab="compose"]', 'sms.compose');
        this.applyToSelector('#inbox-page-info', 'sms.page', { page: 1, total: 1 });
        this.applyToSelector('#outbox-page-info', 'sms.page', { page: 1, total: 1 });

        const labels = document.querySelectorAll('#sms-tab-compose .form-group label');
        if (labels.length >= 2) {
            labels[0].textContent = this.t('sms.destination_number');
            labels[1].textContent = this.t('sms.message');
        }

        this.applyToSelector('#page-settings .password-card .card-header h2', 'password.title');
        this.applyToSelector('#change-pass-btn .btn-text', 'password.save');
        this.applyPlaceholder('#old-password', 'password.old_placeholder');
        this.applyPlaceholder('#new-password', 'password.new_placeholder');
        this.applyPlaceholder('#confirm-password', 'password.confirm_placeholder');

        const passLabels = document.querySelectorAll('#password-form .form-group label');
        if (passLabels.length >= 3) {
            passLabels[0].textContent = this.t('password.old');
            passLabels[1].textContent = this.t('password.new');
            passLabels[2].textContent = this.t('password.confirm');
        }

        this.applyToSelector('#callback-card-title', 'settings.callback_title');
        this.applyToSelector('#telegram-card-title', 'settings.telegram_title');
        this.applyToSelector('#sms-gateway-card-title', 'settings.sms_gateway_title');
        this.applyToSelector('#sms-gateway-desc', 'settings.sms_gateway_desc');
        this.applyToSelector('#sms-gateway-token-label', 'settings.sms_gateway_token');
        this.applyToSelector('#sms-gateway-enable-label', 'settings.sms_gateway_enable');
        this.applyToSelector('#sms-gateway-howto-label', 'settings.sms_gateway_howto');
        this.applyToSelector('#sms-gateway-header-hint', 'settings.sms_gateway_header_hint');
        this.applyToSelector('#save-callback-btn .btn-text', 'common.save');
        this.applyToSelector('#test-callback-btn .btn-text', 'settings.test_callback');
        this.applyToSelector('#save-sms-gateway-btn .btn-text', 'common.save');
        this.applyToSelector('#sms-gateway-regenerate-label', 'settings.sms_gateway_regenerate');
        this.applyToSelector('#save-telegram-btn .btn-text', 'common.save');
        this.applyToSelector('#test-telegram-btn .btn-text', 'settings.test');
        this.applyToSelector('.footer', 'footer.copyright');

        const statusLabels = document.querySelectorAll('.hero-status-row .status-label');
        if (statusLabels.length >= 1) {
            statusLabels[0].textContent = this.t('dashboard.internet');
        }
        this.applyToSelector('.section-row.sub-row .section-label', 'dashboard.password');

        const infoLabels = document.querySelectorAll('.hero-section .info-label');
        if (infoLabels.length >= 4) {
            infoLabels[0].textContent = this.t('dashboard.operator');
            infoLabels[1].textContent = this.t('dashboard.ip_address');
            infoLabels[2].textContent = this.t('dashboard.uptime');
            infoLabels[3].textContent = this.t('dashboard.connected');
        }
        this.applyToSelector('.section-title', 'dashboard.connected_devices');

        this.applyToSelector('#page-network .card-header h2', 'hotspot.title');
        this.applyToSelector('#save-hotspot-btn .btn-text', 'hotspot.save_changes');

        const hotspotLabels = document.querySelectorAll('#hotspot-form .form-group > label:not(.checkbox-label)');
        if (hotspotLabels.length >= 3) {
            hotspotLabels[0].textContent = this.t('hotspot.ssid');
            hotspotLabels[1].textContent = this.t('hotspot.security');
            hotspotLabels[2].textContent = this.t('hotspot.password');
        }
        this.applyToSelector('#password-group .form-hint', 'hotspot.password_hint');
        const hotspotHints = document.querySelectorAll('#hotspot-form .form-hint');
        if (hotspotHints.length >= 1) {
            hotspotHints[0].textContent = this.t('hotspot.ssid_hint');
        }
        this.applyToSelector('#hotspot-form .checkbox-label span', 'hotspot.broadcast');
        this.applyToSelector('#hotspot-form .checkbox-label + .form-hint', 'hotspot.hidden_hint');
        this.applyToSelector('.hotspot-info .info-label', 'hotspot.connected_clients');
        this.applyToSelector('#page-network .alert-warning', 'hotspot.alert');
        this.applyPlaceholder('#hotspot-ssid', 'hotspot.ssid_placeholder');
        this.applyPlaceholder('#hotspot-password', 'hotspot.password_placeholder');

        this.applyToSelector('#callback-desc', 'settings.callback_desc');
        this.applyToSelector('#telegram-desc', 'settings.telegram_desc');
        this.applyToSelector('#callback-form label:not(.checkbox-label)', 'settings.callback_url');
        this.applyToSelector('#callback-form .checkbox-label span', 'settings.callback_enable');
        this.applyPlaceholder('#callback-url', 'settings.callback_placeholder');
        this.applyToSelector('#telegram-form .checkbox-label span', 'settings.telegram_enable');
        this.applyPlaceholder('#telegram-bot-token', 'settings.bot_token_placeholder');
        this.applyPlaceholder('#telegram-chat-id', 'settings.chat_id_placeholder');
        this.applyPlaceholder('#telegram-own-number', 'settings.own_number_placeholder');

        const tgLabels = document.querySelectorAll('#telegram-form .form-group > label:not(.checkbox-label)');
        if (tgLabels.length >= 3) {
            tgLabels[0].textContent = this.t('settings.bot_token');
            tgLabels[1].textContent = this.t('settings.chat_id');
            tgLabels[2].textContent = this.t('settings.own_number');
        }
        this.applyToSelector('#telegram-form .form-hint', 'settings.own_number_hint');
        this.applyToSelector('#modal-body', 'sms.modal_placeholder');

        const smsTabs = document.querySelectorAll('.sms-tab');
        if (smsTabs.length >= 3) {
            smsTabs[0].textContent = this.t('sms.inbox');
            smsTabs[1].textContent = this.t('sms.outbox');
            smsTabs[2].textContent = this.t('sms.compose');
        }

        this.applyToSelector('#language-card-title', 'settings.language_title');
        this.applyToSelector('#language-label', 'settings.language_label');
        this.applyToSelector('#save-language-btn .btn-text', 'settings.apply_language');
        // Keep language names in their native form, regardless of current UI language.
        this.applyToSelector('#language-option-en', 'settings.lang_name_en');
        this.applyToSelector('#language-option-id', 'settings.lang_name_id');
        this.applyToSelector('#language-option-zh', 'settings.lang_name_zh');
        this.applyToSelector('#language-option-th', 'settings.lang_name_th');
        this.applyToSelector('#language-option-ko', 'settings.lang_name_ko');
        this.applyToSelector('#language-option-vi', 'settings.lang_name_vi');
        this.applyToSelector('#language-option-ru', 'settings.lang_name_ru');
        this.applyToSelector('#language-option-ja', 'settings.lang_name_ja');

        this.applyToSelector('#update-title', 'update.title');
        this.applyToSelector('#update-installed-label', 'update.installed');
        this.applyToSelector('#update-latest-label', 'update.latest');
        this.applyToSelector('#update-check-label', 'update.check');
        this.applyToSelector('#update-download-label', 'update.download');
        this.applyToSelector('#update-notes-label', 'update.notes');
        this.applyToSelector('#update-howto-label', 'update.howto');
    }
};
