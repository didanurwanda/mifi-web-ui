const Dashboard = {
    intervalId: null,

    async load() {
        await Promise.all([
            this.loadBattery(),
            this.loadSignal(),
            this.loadOperator(),
            this.loadIP(),
            this.loadClients(),
            this.loadNetwork(),
            this.loadUptime()
        ]);
    },

    startAutoRefresh() {
        this.stopAutoRefresh();
        var self = this;
        this.intervalId = setInterval(function() {
            self.load();
        }, 30000);
    },

    stopAutoRefresh() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    },

    async loadBattery() {
        try {
            var res = await API.getBattery();
            document.getElementById('stat-battery').textContent = res.battery + '%';
            var chargeInfo = res.charging ? I18N.t('dashboard.charging') : I18N.t('dashboard.not_charging');
            if (res.charging && res.chargeType !== 'None') {
                chargeInfo += ' (' + res.chargeType + ')';
            }
            document.getElementById('stat-charging').textContent = chargeInfo;
            
            if (res.temperature !== undefined) {
                document.getElementById('stat-temp').textContent = res.temperature.toFixed(1) + '\u00B0C';
            }
        } catch (err) {
            console.error('Battery error:', err);
        }
    },

    async loadSignal() {
        try {
            var res = await API.getSignal();
            document.getElementById('stat-signal').textContent = res.rssi + ' dBm';

            var barsContainer = document.getElementById('signal-bars');
            var bars = barsContainer.querySelectorAll('.signal-bar');
            var level = Math.min(res.bars, 5);

            barsContainer.className = 'signal-bars';
            if (level > 0) {
                barsContainer.classList.add('level-' + level);
            }

            bars.forEach(function(bar, index) {
                bar.classList.toggle('active', index < level);
            });
        } catch (err) {
            console.error('Signal error:', err);
        }
    },

    async loadOperator() {
        try {
            var res = await API.getOperator();
            document.getElementById('stat-operator').textContent = res.operator;
        } catch (err) {
            console.error('Operator error:', err);
        }
    },

    async loadIP() {
        try {
            var res = await API.getIP();
            document.getElementById('stat-local-ip').textContent = res.local_ip || '-';
            document.getElementById('stat-public-ip').textContent = res.public_ip || '-';
        } catch (err) {
            console.error('IP error:', err);
        }
    },

    async loadNetwork() {
        try {
            var res = await API.getNetwork();
            document.getElementById('stat-ssid').textContent = res.ssid || '-';
            document.getElementById('stat-network-type').textContent = res.network_type || '-';
            
            var internetEl = document.getElementById('stat-internet');
            var internetDot = document.getElementById('internet-dot');
            
            if (res.internet_connected) {
                internetEl.textContent = I18N.t('dashboard.connected');
                if (internetDot) {
                    internetDot.className = 'status-dot connected';
                }
            } else {
                internetEl.textContent = I18N.t('dashboard.no_internet');
                if (internetDot) {
                    internetDot.className = 'status-dot disconnected';
                }
            }
            
            var passwordEl = document.getElementById('stat-wifi-password');
            var password = res.password || '-';
            passwordEl.dataset.password = password;
            passwordEl.dataset.visible = 'false';
            if (password !== '-') {
                passwordEl.textContent = this.maskPassword(password);
            } else {
                passwordEl.textContent = '-';
            }
        } catch (err) {
            console.error('Network error:', err);
        }
    },

    maskPassword(password) {
        if (!password || password === '-') return '-';
        var masked = '';
        for (var i = 0; i < password.length; i++) {
            masked += '\u2022';
        }
        return masked;
    },

    togglePassword() {
        var passwordEl = document.getElementById('stat-wifi-password');
        var toggleBtn = document.getElementById('toggle-password');
        
        if (!passwordEl || !toggleBtn) return;
        
        if (passwordEl.dataset.visible === 'false') {
            passwordEl.textContent = passwordEl.dataset.password || '-';
            toggleBtn.innerHTML = '&#128064;';
            passwordEl.dataset.visible = 'true';
        } else {
            passwordEl.textContent = this.maskPassword(passwordEl.dataset.password);
            toggleBtn.innerHTML = '&#128065;';
            passwordEl.dataset.visible = 'false';
        }
    },

    async loadUptime() {
        try {
            var res = await API.getUptime();
            document.getElementById('stat-uptime').textContent = res.uptime || '-';
        } catch (err) {
            console.error('Uptime error:', err);
        }
    },

    async loadClients() {
        var container = document.getElementById('clients-list');
        container.innerHTML = '<div class="loading">' + I18N.t('dashboard.loading_data') + '</div>';

        try {
            var res = await API.getClients();
            var clients = res.clients || [];

            var countEl = document.getElementById('stat-clients-count');
            if (countEl) {
                countEl.textContent = I18N.t('dashboard.devices_count', { count: clients.length });
            }

            if (clients.length === 0) {
                container.innerHTML = '<div class="no-data">' + I18N.t('dashboard.no_connected_devices') + '</div>';
                return;
            }

            var html = '';
            clients.forEach(function(c) {
                html += '<div class="client-item">' +
                    '<div class="client-info">' +
                    '<div class="client-ip">' + c.ip + '</div>' +
                    '<div class="client-mac">' + c.mac + '</div>' +
                    '</div></div>';
            });
            container.innerHTML = html;
        } catch (err) {
            container.innerHTML = '<div class="no-data">' + I18N.t('dashboard.failed_load_data') + '</div>';
            var countEl = document.getElementById('stat-clients-count');
            if (countEl) {
                countEl.textContent = I18N.t('dashboard.devices_count', { count: 0 });
            }
        }
    }
};
