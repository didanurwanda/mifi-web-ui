# MiFi Web UI (Android 4.4, Snapdragon 410/MSM8916)

### Screenshots

<img src="images/dashboard.png" alt="Dashboard" width="640" />
<img src="images/sms-inbox.png" alt="SMS Inbox" width="640" />

## English

This project is a Web UI for China ODM 4G LTE WiFi modems running Android 4.4, especially devices using Qualcomm Snapdragon 410 / MSM8916.

### Key Advantages

- Full SMS support from Web UI: **Inbox, Outbox, and Send SMS**
- **SMS Callback/Webhook**: automatically sends incoming SMS data to your HTTP endpoint
- **Telegram Forwarder**: automatically forwards incoming SMS to Telegram

These SMS capabilities are a major advantage because many stock modem firmwares do not provide complete SMS features.

### Tested Devices

This project has been tested on:

- MF800 modem
- Mifi with label **Telkomsel 4G LTE**
- Mifi with label **4G/5G WiFi**

### Device Installation (via ADB)

Installation is done through ADB because these devices are headless (no screen).

1. Make sure ADB is available on your computer.

```bash
adb version
```

2. Enable ADB on the modem. This depends on firmware/device, but commonly by:

- disabling USB tethering in the stock Web UI, or
- opening `http://192.168.100.1/usbdebug.html` on older firmware

3. Verify the device is detected.

```bash
adb devices
```

4. Install APK to the device.

```bash
adb install -r ~/Downloads/mifi-webui-xxx.apk
```

5. Launch app (optional via ADB shell, first-time setup only).

```bash
adb shell am start -n com.didanurwanda.mifiwebui/.MainActivity
```

After the first launch, the app will auto-run again when the modem reboots.

6. Open Web UI at:

`http://192.168.100.1:9000`

### Update

To update to a newer version, use the same command as first installation (replace the APK file with the new one):  
Untuk update ke versi terbaru, gunakan perintah yang sama seperti instalasi awal (ganti file APK dengan versi terbaru):

```bash
adb install -r ~/Downloads/mifi-webui-xxx.apk
```

Note: hotspot, SMS, and telephony API behavior can vary across ODM firmwares.

---

## Bahasa Indonesia

Project ini adalah Web UI untuk modem WiFi 4G LTE ODM China berbasis Android 4.4, khususnya perangkat dengan chipset Qualcomm Snapdragon 410 / MSM8916.

### Keunggulan Utama

- Dukungan SMS lengkap dari Web UI: **Inbox, Outbox, dan Kirim SMS**
- **SMS Callback/Webhook**: otomatis mengirim data SMS masuk ke endpoint HTTP Anda
- **Telegram Forwarder**: otomatis meneruskan SMS masuk ke Telegram

Fitur SMS ini adalah nilai utama karena banyak firmware bawaan modem tidak menyediakan fitur SMS lengkap.

### Perangkat yang Sudah Diuji

Project ini sudah diuji pada:

- Modem MF800
- Modem dengan label **Telkomsel 4G LTE**
- Modem dengan label **4G/5G WiFi**

### Instalasi ke Device (via ADB)

Instalasi dilakukan menggunakan ADB karena device target bersifat headless (tanpa layar).

1. Pastikan ADB di komputer tersedia.

```bash
adb version
```

2. Aktifkan ADB pada modem. Cara ini tergantung firmware/device, tetapi umumnya dengan:

- mematikan USB tethering di Web UI bawaan, atau
- mengakses `http://192.168.100.1/usbdebug.html` pada firmware lama

3. Cek apakah device terdeteksi.

```bash
adb devices
```

4. Install APK ke device.

```bash
adb install -r ~/Downloads/mifi-webui-xxx.apk
```

5. Jalankan aplikasi (opsional via ADB shell, hanya untuk setup awal).

```bash
adb shell am start -n com.didanurwanda.mifiwebui/.MainActivity
```

Setelah pertama kali dijalankan, aplikasi akan otomatis berjalan lagi saat modem reboot.

6. Akses Web UI di:

`http://192.168.100.1:9000`

### Update

Untuk update ke versi terbaru, caranya sama seperti instalasi pertama (cukup ganti file APK dengan versi terbaru):

```bash
adb install -r ~/Downloads/mifi-webui-xxx.apk
```

Catatan: perilaku API hotspot, SMS, dan telephony dapat berbeda antar firmware ODM.

---

## License / Lisensi

This project is licensed under **GNU AGPL v3.0**. See [`LICENSE`](LICENSE).  
Project ini menggunakan lisensi **GNU AGPL v3.0**. Lihat file [`LICENSE`](LICENSE).

## Contribution Rules / Aturan Kontribusi

Contributions are welcome via Issues and Pull Requests.  
Kontribusi terbuka melalui Issue dan Pull Request.

- Keep changes focused and easy to review.  
  Buat perubahan yang fokus dan mudah direview.
- Explain what was changed and why in the PR description.  
  Jelaskan apa yang diubah dan alasannya pada deskripsi PR.
- Test your changes before submitting (at minimum, ensure app/build still works).  
  Uji perubahan sebelum submit (minimal pastikan aplikasi/build tetap berjalan).
- Do not include secrets, keystore files, or credentials in commits.  
  Jangan commit secret, file keystore, atau kredensial.

Maintainer may request revisions before merge.  
Maintainer berhak meminta revisi sebelum merge.

---

## Credits

**Dida Nurwanda**  
**Email:** didanurwanda@gmail.com  
**LinkedIn:** https://www.linkedin.com/in/didanurwanda
