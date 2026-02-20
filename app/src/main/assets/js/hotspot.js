const Hotspot = {
    passwordVisible: false,

    async load() {
        try {
            var res = await API.getHotspot();

            document.getElementById('hotspot-ssid').value = res.ssid || '';
            document.getElementById('hotspot-password').value = res.password || '';
            document.getElementById('hotspot-hidden').checked = !res.hidden;
            document.getElementById('hotspot-security').value = res.security || 'WPA2_PSK';
            document.getElementById('hotspot-clients').textContent = res.connected_clients || 0;

            var statusEl = document.getElementById('hotspot-status');
            if (res.enabled) {
                statusEl.innerHTML = '<span style="color:#22c55e">&#9679; ' + I18N.t('hotspot.active') + '</span>';
            } else {
                statusEl.innerHTML = '<span style="color:#ef4444">&#9679; ' + I18N.t('hotspot.inactive') + '</span>';
            }

            this.togglePasswordField(res.security);
            this.maskPassword();
        } catch (err) {
            Toast.error(I18N.t('toast.hotspot_load_failed'));
            console.error('Hotspot load error:', err);
        }
    },

    togglePasswordVisibility() {
        var input = document.getElementById('hotspot-password');
        var btn = document.getElementById('toggle-hotspot-password');

        if (!input || !btn) return;

        if (this.passwordVisible) {
            input.type = 'password';
            btn.innerHTML = '&#128065;';
            this.passwordVisible = false;
        } else {
            input.type = 'text';
            btn.innerHTML = '&#128064;';
            this.passwordVisible = true;
        }
    },

    maskPassword() {
        var input = document.getElementById('hotspot-password');
        var btn = document.getElementById('toggle-hotspot-password');

        if (input) {
            input.type = 'password';
        }
        if (btn) {
            btn.innerHTML = '&#128065;';
        }
        this.passwordVisible = false;
    },

    onSecurityChange() {
        var security = document.getElementById('hotspot-security').value;
        this.togglePasswordField(security);
    },

    togglePasswordField(security) {
        var passwordGroup = document.getElementById('password-group');
        var passwordInput = document.getElementById('hotspot-password');

        if (!passwordGroup || !passwordInput) return;

        if (security === 'OPEN') {
            passwordGroup.style.opacity = '0.5';
            passwordInput.disabled = true;
        } else {
            passwordGroup.style.opacity = '1';
            passwordInput.disabled = false;
        }
    },

    async save() {
        var ssid = document.getElementById('hotspot-ssid').value.trim();
        var password = document.getElementById('hotspot-password').value;
        var hidden = !document.getElementById('hotspot-hidden').checked;
        var security = document.getElementById('hotspot-security').value;
        var clients = parseInt(document.getElementById('hotspot-clients').textContent) || 0;

        if (!ssid) {
            Toast.warning(I18N.t('toast.hotspot_ssid_required'));
            return;
        }
        if (ssid.length > 32) {
            Toast.warning(I18N.t('toast.hotspot_ssid_max'));
            return;
        }
        if (security !== 'OPEN' && password.length < 8) {
            Toast.warning(I18N.t('toast.hotspot_pass_min'));
            return;
        }
        if (password.length > 63) {
            Toast.warning(I18N.t('toast.hotspot_pass_max'));
            return;
        }

        var suffix = '';
        if (clients > 0) {
            suffix = I18N.t('hotspot.disconnect_clients_suffix', { count: clients });
        }
        var message = I18N.t('confirm.hotspot_change', { suffix: suffix });

        if (!confirm(message)) return;

        var btn = document.getElementById('save-hotspot-btn');
        Utils.setButtonLoading(btn, true);

        var self = this;
        var timeoutMs = 10000;

        var timeoutPromise = new Promise(function(resolve) {
            setTimeout(function() {
                resolve({ timeout: true });
            }, timeoutMs);
        });

        try {
            var result = await Promise.race([
                API.setHotspot(ssid, password, hidden, security),
                timeoutPromise
            ]);

            if (result.timeout) {
                Toast.success(I18N.t('toast.hotspot_updated_restart'));
            } else if (result.status === 'success') {
                Toast.success(I18N.t('toast.hotspot_updated'));
                self.load();
            } else {
                Toast.error(result.message || I18N.t('toast.hotspot_update_failed'));
            }
        } catch (err) {
            Toast.error(I18N.t('toast.error_prefix', { message: err.message }));
        } finally {
            Utils.setButtonLoading(btn, false);
        }
    }
};
