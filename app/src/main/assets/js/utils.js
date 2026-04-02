const Utils = {
    getCurrentLocale() {
        var lang = 'en';
        if (typeof I18N !== 'undefined' && I18N.currentLanguage) {
            lang = I18N.currentLanguage;
        }

        var localeMap = {
            en: 'en-US',
            id: 'id-ID',
            zh: 'zh-CN',
            th: 'th-TH',
            ko: 'ko-KR',
            vi: 'vi-VN',
            ru: 'ru-RU',
            ja: 'ja-JP'
        };

        return localeMap[lang] || 'en-US';
    },

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const locale = this.getCurrentLocale();

        if (diff < 86400000) {
            return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 604800000) {
            const weekday = date.toLocaleDateString(locale, { weekday: 'short' });
            const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
            return weekday + ' ' + time;
        } else {
            return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
        }
    },

    getInitial(number) {
        const cleaned = number.replace(/\D/g, '');
        if (cleaned.length >= 2) {
            return cleaned.slice(-2);
        }
        return number.slice(0, 2).toUpperCase();
    },

    encode(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    escapeHtml(text) {
        return this.encode(text);
    },

    setButtonLoading(btn, loading) {
        const text = btn.querySelector('.btn-text');
        const loader = btn.querySelector('.btn-loader');
        btn.disabled = loading;
        if (text) text.style.display = loading ? 'none' : 'inline';
        if (loader) loader.style.display = loading ? 'inline-block' : 'none';
    }
};
