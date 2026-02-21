const Update = {
    async load() {
        try {
            var res = await API.getAppVersion();
            document.getElementById('update-installed-version').textContent = 'v' + res.version;
        } catch (err) {
            document.getElementById('update-installed-version').textContent = '-';
        }
    },

    async check() {
        var btn = document.getElementById('check-update-btn');
        Utils.setButtonLoading(btn, true);
        
        document.getElementById('update-status-container').style.display = 'none';
        document.getElementById('release-notes-section').style.display = 'none';
        document.getElementById('update-instructions-section').style.display = 'none';
        document.getElementById('download-apk-btn').style.display = 'none';

        try {
            var installed = await API.getAppVersion();
            document.getElementById('update-installed-version').textContent = 'v' + installed.version;

            var response = await fetch('https://api.github.com/repos/didanurwanda/mifi-web-ui/releases/latest');
            var latest = await response.json();

            document.getElementById('update-latest-version').textContent = latest.name || latest.tag_name;

            var installedVer = installed.version;
            var latestVer = latest.tag_name.replace('v', '');

            if (this.compareVersions(latestVer, installedVer) > 0) {
                this.showUpdateAvailable(latest);
            } else {
                this.showUpToDate();
            }
        } catch (err) {
            this.showError(err.message);
        } finally {
            Utils.setButtonLoading(btn, false);
        }
    },

    compareVersions(a, b) {
        var aParts = a.split('.').map(Number);
        var bParts = b.split('.').map(Number);
        for (var i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            var aVal = aParts[i] || 0;
            var bVal = bParts[i] || 0;
            if (aVal > bVal) return 1;
            if (aVal < bVal) return -1;
        }
        return 0;
    },

    showUpdateAvailable(latest) {
        document.getElementById('update-status-container').style.display = 'block';
        var badge = document.getElementById('update-status-badge');
        badge.textContent = I18N.t('update.available');
        badge.className = 'status-badge update-available';

        var apk = latest.assets && latest.assets[0];
        if (apk) {
            var downloadBtn = document.getElementById('download-apk-btn');
            downloadBtn.href = apk.browser_download_url;
            downloadBtn.style.display = 'inline-flex';
        }

        document.getElementById('release-notes-section').style.display = 'block';
        document.getElementById('release-body').textContent = latest.body || '-';

        document.getElementById('update-instructions-section').style.display = 'block';
        document.getElementById('update-instructions-text').textContent = I18N.t('update.instructions_text');
    },

    showUpToDate() {
        document.getElementById('update-status-container').style.display = 'block';
        var badge = document.getElementById('update-status-badge');
        badge.textContent = I18N.t('update.up_to_date');
        badge.className = 'status-badge up-to-date';
        document.getElementById('download-apk-btn').style.display = 'none';
    },

    showError(message) {
        document.getElementById('update-status-container').style.display = 'block';
        var badge = document.getElementById('update-status-badge');
        badge.textContent = I18N.t('update.error') + ': ' + message;
        badge.className = 'status-badge error';
    }
};
