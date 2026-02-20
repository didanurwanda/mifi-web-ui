const Utils = {
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 86400000) {
            return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 604800000) {
            const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
            return days[date.getDay()] + ' ' + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        }
    },

    getInitial(number) {
        const cleaned = number.replace(/\D/g, '');
        if (cleaned.length >= 2) {
            return cleaned.slice(-2);
        }
        return number.slice(0, 2).toUpperCase();
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    setButtonLoading(btn, loading) {
        const text = btn.querySelector('.btn-text');
        const loader = btn.querySelector('.btn-loader');
        btn.disabled = loading;
        if (text) text.style.display = loading ? 'none' : 'inline';
        if (loader) loader.style.display = loading ? 'inline-block' : 'none';
    }
};
