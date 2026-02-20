const App = {
    token: localStorage.getItem('token') || '',
    currentPage: 'dashboard',
    isLoggingOut: false,

    async init() {
        await I18N.init();

        if (this.token) {
            API.setToken(this.token);
            this.showMainApp();
            Dashboard.load();
            Dashboard.startAutoRefresh();
        } else {
            this.showLogin();
        }
        this.bindEvents();
    },

    bindEvents() {
        var self = this;

        document.getElementById('login-form').addEventListener('submit', function(e) {
            e.preventDefault();
            self.login();
        });

        document.getElementById('menu-toggle').addEventListener('click', function() {
            self.toggleSidebar();
        });

        document.getElementById('sidebar-overlay').addEventListener('click', function() {
            self.closeSidebar();
        });

        document.querySelectorAll('.sidebar-link').forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                var page = link.dataset.page;
                if (page) self.navigateTo(page);
            });
        });

        document.querySelectorAll('.btn-link').forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                var page = link.dataset.page;
                if (page) self.navigateTo(page);
            });
        });

        document.getElementById('logout-btn').addEventListener('click', function() {
            self.logout();
        });

        document.getElementById('refresh-clients').addEventListener('click', function() {
            Dashboard.loadClients();
        });

        document.getElementById('toggle-password').addEventListener('click', function() {
            Dashboard.togglePassword();
        });

        document.querySelectorAll('.sms-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                self.switchSMSTab(tab.dataset.tab);
            });
        });

        document.getElementById('inbox-select-all').addEventListener('change', function(e) {
            SMS.toggleSelectAll('inbox', e.target.checked);
        });
        document.getElementById('inbox-delete-selected').addEventListener('click', function() {
            SMS.deleteSelected('inbox');
        });
        document.getElementById('inbox-delete-all').addEventListener('click', function() {
            SMS.deleteAll('inbox');
        });
        document.getElementById('inbox-prev').addEventListener('click', function() {
            SMS.prevPage('inbox');
        });
        document.getElementById('inbox-next').addEventListener('click', function() {
            SMS.nextPage('inbox');
        });

        document.getElementById('outbox-select-all').addEventListener('change', function(e) {
            SMS.toggleSelectAll('outbox', e.target.checked);
        });
        document.getElementById('outbox-delete-selected').addEventListener('click', function() {
            SMS.deleteSelected('outbox');
        });
        document.getElementById('outbox-delete-all').addEventListener('click', function() {
            SMS.deleteAll('outbox');
        });
        document.getElementById('outbox-prev').addEventListener('click', function() {
            SMS.prevPage('outbox');
        });
        document.getElementById('outbox-next').addEventListener('click', function() {
            SMS.nextPage('outbox');
        });

        document.getElementById('sms-form').addEventListener('submit', function(e) {
            e.preventDefault();
            SMS.send();
        });

        document.getElementById('sms-message').addEventListener('input', function(e) {
            document.getElementById('sms-char-count').textContent = e.target.value.length;
        });

        document.getElementById('password-form').addEventListener('submit', function(e) {
            e.preventDefault();
            self.changePassword();
        });

        document.getElementById('callback-form').addEventListener('submit', function(e) {
            e.preventDefault();
            Settings.saveCallback();
        });

        document.getElementById('sms-gateway-form').addEventListener('submit', function(e) {
            e.preventDefault();
            Settings.saveSmsGateway();
        });

        document.getElementById('regen-sms-gateway-btn').addEventListener('click', function() {
            Settings.regenerateSmsGatewayToken();
        });

        document.getElementById('test-callback-btn').addEventListener('click', function() {
            Settings.testCallback();
        });

        document.getElementById('telegram-form').addEventListener('submit', function(e) {
            e.preventDefault();
            Settings.saveTelegram();
        });

        document.getElementById('language-form').addEventListener('submit', function(e) {
            e.preventDefault();
            Settings.saveLanguage();
        });

        document.getElementById('test-telegram-btn').addEventListener('click', function() {
            Settings.testTelegram();
        });

        document.getElementById('hotspot-security').addEventListener('change', function() {
            Hotspot.onSecurityChange();
        });

        document.getElementById('toggle-hotspot-password').addEventListener('click', function() {
            Hotspot.togglePasswordVisibility();
        });

        document.getElementById('hotspot-form').addEventListener('submit', function(e) {
            e.preventDefault();
            Hotspot.save();
        });

        document.getElementById('sms-modal').addEventListener('click', function(e) {
            if (e.target.id === 'sms-modal') {
                SMS.closeModal();
            }
        });
        document.getElementById('modal-close').addEventListener('click', function() {
            SMS.closeModal();
        });
    },

    async login() {
        var password = document.getElementById('login-password').value;
        var btn = document.getElementById('login-btn');

        Utils.setButtonLoading(btn, true);

        try {
            var res = await API.login(password);
            if (res.status === 'success' && res.token) {
                this.token = res.token;
                API.setToken(this.token);
                localStorage.setItem('token', this.token);
                this.showMainApp();
                Dashboard.load();
                Dashboard.startAutoRefresh();
                Toast.success(I18N.t('toast.login_success'));
            } else {
                Toast.error(I18N.t('toast.password_wrong'));
            }
        } catch (err) {
            Toast.error(I18N.t('toast.login_failed', { message: err.message }));
        } finally {
            Utils.setButtonLoading(btn, false);
        }
    },

    logout() {
        if (this.isLoggingOut) return;
        this.isLoggingOut = true;

        this.token = '';
        API.setToken('');
        localStorage.removeItem('token');
        Dashboard.stopAutoRefresh();
        this.showLogin();
        Toast.success(I18N.t('toast.logout_success'));

        var self = this;
        setTimeout(function() {
            self.isLoggingOut = false;
        }, 1000);
    },

    showLogin() {
        document.getElementById('page-login').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
        document.getElementById('login-password').value = '';
    },

    showMainApp() {
        document.getElementById('page-login').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        this.navigateTo('dashboard');
    },

    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('sidebar-overlay').classList.toggle('show');
    },

    closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('show');
    },

    navigateTo(page) {
        this.currentPage = page;

        document.querySelectorAll('.page-content').forEach(function(p) {
            p.classList.remove('active');
        });
        document.querySelectorAll('.sidebar-link').forEach(function(l) {
            l.classList.remove('active');
        });

        var pageEl = document.getElementById('page-' + page);
        if (pageEl) pageEl.classList.add('active');

        var link = document.querySelector('.sidebar-link[data-page="' + page + '"]');
        if (link) link.classList.add('active');

        this.closeSidebar();

        if (page === 'dashboard') {
            Dashboard.load();
            Dashboard.startAutoRefresh();
        } else {
            Dashboard.stopAutoRefresh();
        }

        if (page === 'sms') {
            SMS.resetPagination();
            this.switchSMSTab('inbox');
        }

        if (page === 'network') {
            Hotspot.load();
        }

        if (page === 'tools') {
            Settings.loadSmsGateway();
            Settings.loadCallback();
            Settings.loadTelegram();
        }

        if (page === 'settings') {
            Settings.loadAll();
        }
    },

    switchSMSTab(tab) {
        SMS.currentTab = tab;

        document.querySelectorAll('.sms-tab').forEach(function(t) {
            t.classList.remove('active');
        });
        document.querySelector('.sms-tab[data-tab="' + tab + '"]').classList.add('active');

        document.querySelectorAll('.sms-tab-content').forEach(function(c) {
            c.classList.remove('active');
        });
        document.getElementById('sms-tab-' + tab).classList.add('active');

        if (tab === 'inbox') SMS.loadInbox();
        if (tab === 'outbox') SMS.loadOutbox();
        if (tab === 'compose') {
            document.getElementById('sms-number').value = '';
            document.getElementById('sms-message').value = '';
            document.getElementById('sms-char-count').textContent = '0';
        }
    },

    async changePassword() {
        var oldPass = document.getElementById('old-password').value;
        var newPass = document.getElementById('new-password').value;
        var confirmPass = document.getElementById('confirm-password').value;
        var btn = document.getElementById('change-pass-btn');

        if (!oldPass || !newPass || !confirmPass) {
            Toast.error(I18N.t('toast.all_fields_required'));
            return;
        }

        if (newPass !== confirmPass) {
            Toast.error(I18N.t('toast.password_mismatch'));
            return;
        }

        if (newPass.length < 4) {
            Toast.error(I18N.t('toast.password_min_4'));
            return;
        }

        Utils.setButtonLoading(btn, true);

        try {
            var res = await API.changePassword(oldPass, newPass);
            if (res.status === 'success') {
                Toast.success(I18N.t('toast.password_changed'));
                var self = this;
                setTimeout(function() {
                    self.logout();
                }, 1500);
            } else {
                Toast.error(res.message || I18N.t('toast.password_change_failed'));
            }
        } catch (err) {
            Toast.error(I18N.t('toast.error_prefix', { message: err.message }));
        } finally {
            Utils.setButtonLoading(btn, false);
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    App.init();
});
