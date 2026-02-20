package com.didanurwanda.mifiwebui;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.net.wifi.WifiConfiguration;
import android.net.wifi.WifiManager;
import android.os.BatteryManager;
import android.os.SystemClock;
import android.telephony.PhoneStateListener;
import android.telephony.SignalStrength;
import android.telephony.SmsManager;
import android.telephony.TelephonyManager;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.lang.reflect.Method;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Collections;
import java.util.Map;

import fi.iki.elonen.NanoHTTPD;

public class MifiWebServer extends NanoHTTPD {

    private final Context context;
    private final SharedPreferences prefs;
    private int lastSignalStrength = 0;
    private String serverToken = ""; // Token sesi aktif

    public MifiWebServer(Context context, int port) {
        super(port);
        this.context = context;
        this.prefs = context.getSharedPreferences("mifi_prefs", Context.MODE_PRIVATE);
        initSignalListener();
    }

    @Override
    public Response serve(IHTTPSession session) {
        String uri = session.getUri();
        if (uri.startsWith("/api/")) {
            return handleApiRequests(uri, session);
        }
        return serveStaticAsset(uri);
    }

    private Response handleApiRequests(String uri, IHTTPSession session) {
        Map<String, String> params = session.getParms();
        try {
            String savedPass = prefs.getString("admin_password", "admin");

            // 1. API LOGIN (Dapatkan Token)
            if (uri.equals("/api/login")) {

                String password = params.get("message");
                if (session.getMethod() == Method.POST) {
                    Map<String, String> files = new HashMap<>();
                    session.parseBody(files);
                    String postData = files.get("postData");
                    if (postData != null) {
                        JSONObject json = new JSONObject(postData);
                        password = json.optString("password");
                    }
                }

                if (savedPass.equals(password)) {
                    serverToken = String.valueOf(System.currentTimeMillis()); // Token simpel
                    return jsonResponse("{\"status\":\"success\", \"token\":\"" + serverToken + "\"}");
                }
                return newFixedLengthResponse(Response.Status.UNAUTHORIZED, "application/json", "{\"status\":\"error\"}");
            }

            if (uri.equals("/api/language")) {
                if (session.getMethod() == Method.GET) {
                    return jsonResponse(getLanguageJson());
                } else if (session.getMethod() == Method.POST) {
                    Map<String, String> files = new HashMap<>();
                    session.parseBody(files);
                    String postData = files.get("postData");
                    if (postData != null) {
                        JSONObject json = new JSONObject(postData);
                        return jsonResponse(setLanguage(json).toString());
                    }
                }
                return jsonResponse("{\"status\":\"error\",\"message\":\"Method not allowed\"}");
            }

            // Di dalam handleApiRequests
            // 2. PROTEKSI TOKEN
            // NanoHTTPD menyimpan header dalam huruf kecil (lowercase)
            String userToken = session.getHeaders().get("authorization"); 

            // Jika di header tidak ada, coba cek di parameter URL sebagai cadangan
            if (userToken == null) {
                userToken = params.get("token");
            }

            if (serverToken.isEmpty() || !serverToken.equals(userToken)) {
                return newFixedLengthResponse(Response.Status.FORBIDDEN, "application/json", "{\"error\":\"Forbidden\", \"token\":\"" + userToken + "\"}");
            }

            // 3. API YANG DIPROTEKSI
            switch (uri) {
                case "/api/battery": return jsonResponse(getBatteryJson());
                case "/api/signal":  return jsonResponse(getSignalJson());
                case "/api/operator": return jsonResponse(getOperatorJson());
                case "/api/clients": return jsonResponse(getConnectedDevices());
                case "/api/ip": return jsonResponse(getIpJson());
                case "/api/network": return jsonResponse(getNetworkJson());
                case "/api/uptime": return jsonResponse(getUptimeJson());
                case "/api/change-password":
                    String oldP = params.get("old_password");
                    String newP = params.get("new_password");

                    if (session.getMethod() == Method.POST) {
                        Map<String, String> files = new HashMap<>();
                        session.parseBody(files);
                        String postData = files.get("postData");
                        if (postData != null) {
                            JSONObject json = new JSONObject(postData);
                            oldP = json.optString("old_password");
                            newP = json.optString("new_password");
                        }
                    }


                    if (!savedPass.equals(oldP)) return jsonResponse("{\"status\":\"error\",\"message\":\"Sandi lama salah\"}");
                    prefs.edit().putString("admin_password", newP).apply();
                    serverToken = ""; // Force logout setelah ganti password
                    return jsonResponse("{\"status\":\"success\"}");
                case "/api/sms/inbox":
                    int p = Integer.parseInt(params.get("page") != null ? params.get("page") : "1");
                    return jsonResponse(getInboxJson(context, p, 20).toString());
                case "/api/sms/outbox":
                    int pOut = Integer.parseInt(params.get("page") != null ? params.get("page") : "1");
                    return jsonResponse(getOutboxJson(context, pOut, 20).toString());
                case "/api/sms/send":
                    String number = params.get("number");
                    String message = params.get("message");
                    if (session.getMethod() == Method.POST) {
                        Map<String, String> files = new HashMap<>();
                        session.parseBody(files);
                        String postData = files.get("postData");
                        if (postData != null) {
                            JSONObject json = new JSONObject(postData);
                            number = json.optString("number");
                            message = json.optString("message");
                        }
                    }
                    return jsonResponse(sendSms(number, message).toString());
                case "/api/sms/delete":
                    if (session.getMethod() == Method.POST) {
                        Map<String, String> files = new HashMap<>();
                        session.parseBody(files);
                        String postData = files.get("postData");
                        if (postData != null) {
                            JSONObject json = new JSONObject(postData);
                            return jsonResponse(deleteSms(json).toString());
                        }
                    }
                    return jsonResponse("{\"status\":\"error\",\"message\":\"POST required\"}");
                case "/api/callback":
                    if (session.getMethod() == Method.GET) {
                        return jsonResponse(getCallbackSettings().toString());
                    } else if (session.getMethod() == Method.POST) {
                        Map<String, String> files = new HashMap<>();
                        session.parseBody(files);
                        String postData = files.get("postData");
                        if (postData != null) {
                            JSONObject json = new JSONObject(postData);
                            return jsonResponse(setCallback(json).toString());
                        }
                    } else if (session.getMethod() == Method.DELETE) {
                        return jsonResponse(deleteCallback().toString());
                    }
                    return jsonResponse("{\"status\":\"error\",\"message\":\"Method not allowed\"}");
                case "/api/callback/test":
                    if (session.getMethod() == Method.POST) {
                        return jsonResponse(testCallback().toString());
                    }
                    return jsonResponse("{\"status\":\"error\",\"message\":\"POST required\"}");
                case "/api/telegram":
                    if (session.getMethod() == Method.GET) {
                        return jsonResponse(getTelegramSettings().toString());
                    } else if (session.getMethod() == Method.POST) {
                        Map<String, String> files = new HashMap<>();
                        session.parseBody(files);
                        String postData = files.get("postData");
                        if (postData != null) {
                            JSONObject json = new JSONObject(postData);
                            return jsonResponse(setTelegram(json).toString());
                        }
                    } else if (session.getMethod() == Method.DELETE) {
                        return jsonResponse(deleteTelegram().toString());
                    }
                    return jsonResponse("{\"status\":\"error\",\"message\":\"Method not allowed\"}");
                case "/api/telegram/test":
                    if (session.getMethod() == Method.POST) {
                        return jsonResponse(testTelegram().toString());
                    }
                    return jsonResponse("{\"status\":\"error\",\"message\":\"POST required\"}");
                case "/api/hotspot":
                    if (session.getMethod() == Method.GET) {
                        return jsonResponse(getHotspotJson());
                    } else if (session.getMethod() == Method.POST) {
                        Map<String, String> files = new HashMap<>();
                        session.parseBody(files);
                        String postData = files.get("postData");
                        if (postData != null) {
                            JSONObject json = new JSONObject(postData);
                            return jsonResponse(setHotspotConfig(json).toString());
                        }
                    }
                    return jsonResponse("{\"status\":\"error\",\"message\":\"Method not allowed\"}");
                default:
                    return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not Found");
            }
        } catch (Exception e) {
            return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "application/json", "{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    // --- SISTEM SERVE FILE STATIC ---
    private Response serveStaticAsset(String uri) {
        if (uri.equals("/")) uri = "/index.html";
        try {
            String path = uri.startsWith("/") ? uri.substring(1) : uri;
            InputStream is = context.getAssets().open(path);
            return newChunkedResponse(Response.Status.OK, getMimeType(uri), is);
        } catch (IOException e) {
            return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "404");
        }
    }

    private String getMimeType(String uri) {
        if (uri.endsWith(".html")) return "text/html";
        if (uri.endsWith(".css")) return "text/css";
        if (uri.endsWith(".js")) return "application/javascript";
        return "text/plain";
    }

    private Response jsonResponse(String json) {
        return newFixedLengthResponse(Response.Status.OK, "application/json", json);
    }

    // --- LOGIC HARDWARE (Baterai, Sinyal, dll) ---
    private String getBatteryJson() {
        
        IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
        Intent batteryStatus = context.registerReceiver(null, ifilter);

        int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
        int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);

        int percentage = (int) ((level / (float) scale) * 100);

        int status = batteryStatus.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
        boolean isCharging = (status == BatteryManager.BATTERY_STATUS_CHARGING ||
                status == BatteryManager.BATTERY_STATUS_FULL);

        int chargePlug = batteryStatus.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1);

        String chargeType = "None";

        if (chargePlug == BatteryManager.BATTERY_PLUGGED_USB) {
            chargeType = "USB";
        } else if (chargePlug == BatteryManager.BATTERY_PLUGGED_AC) {
            chargeType = "AC";
        }

        int tempRaw = batteryStatus.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0);
        float temperature = tempRaw / 10.0f;

        return "{ " +
                "\"battery\": " + percentage + "," +
                "\"charging\": " + isCharging + "," +
                "\"chargeType\": \"" + chargeType + "\"," +
                "\"temperature\": " + temperature +
                " }";
    }

    private void initSignalListener() {
        TelephonyManager tm = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
        tm.listen(new PhoneStateListener() {
            @Override
            public void onSignalStrengthsChanged(SignalStrength s) {
                try {
                    String[] p = s.toString().split(" ");
                    if (Integer.parseInt(p[9]) != 0) lastSignalStrength = Integer.parseInt(p[9]);
                } catch (Exception ignored) {}
            }
        }, PhoneStateListener.LISTEN_SIGNAL_STRENGTHS);
    }

    private String getOperatorJson() {
        String op = ((TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE)).getNetworkOperatorName();
        return "{\"operator\": \"" + (op.isEmpty() ? "No Service" : op) + "\"}";
    }

    private String getNetworkJson() {
        String ssid = getTetheringSSID();
        String password = getTetheringPassword();
        String networkType = getNetworkTypeName();
        boolean hasInternet = hasInternetConnection();
        
        JSONObject json = new JSONObject();
        try {
            json.put("ssid", ssid);
            json.put("password", password);
            json.put("network_type", networkType);
            json.put("internet_connected", hasInternet);
        } catch (JSONException e) {
            return "{\"ssid\": \"-\", \"password\": \"-\", \"network_type\": \"Unknown\", \"internet_connected\": false}";
        }
        return json.toString();
    }

    private String getLanguageJson() {
        JSONObject json = new JSONObject();
        try {
            String lang = prefs.getString("ui_language", "en");
            if (!isSupportedLanguage(lang)) {
                lang = "en";
            }
            JSONArray available = new JSONArray();
            available.put("en");
            available.put("id");
            available.put("zh");
            available.put("th");
            available.put("ko");
            available.put("vi");
            available.put("ru");
            available.put("ja");
            json.put("language", lang);
            json.put("available", available);
            json.put("status", "success");
        } catch (JSONException e) {
            return "{\"status\":\"error\",\"language\":\"en\",\"available\":[\"en\",\"id\",\"zh\",\"th\",\"ko\",\"vi\",\"ru\",\"ja\"]}";
        }
        return json.toString();
    }

    private JSONObject setLanguage(JSONObject body) throws JSONException {
        JSONObject result = new JSONObject();
        String lang = body.optString("language", "en");
        if (!isSupportedLanguage(lang)) {
            return result.put("status", "error").put("message", "Invalid language");
        }
        prefs.edit().putString("ui_language", lang).apply();
        return result.put("status", "success").put("language", lang);
    }

    private boolean isSupportedLanguage(String lang) {
        if (lang == null) return false;
        return lang.equals("en")
            || lang.equals("id")
            || lang.equals("zh")
            || lang.equals("th")
            || lang.equals("ko")
            || lang.equals("vi")
            || lang.equals("ru")
            || lang.equals("ja");
    }

    private String getTetheringSSID() {
        try {
            WifiManager wifiManager = (WifiManager) context.getSystemService(Context.WIFI_SERVICE);
            if (wifiManager != null) {
                java.lang.reflect.Method getMethod = wifiManager.getClass().getDeclaredMethod("getWifiApConfiguration");
                getMethod.setAccessible(true);
                WifiConfiguration config = (WifiConfiguration) getMethod.invoke(wifiManager);
                if (config != null && config.SSID != null) {
                    return config.SSID.replace("\"", "");
                }
            }
        } catch (Exception e) {
            android.util.Log.e("MifiWebServer", "getTetheringSSID error: " + e.getMessage());
        }
        return "-";
    }

    private String getTetheringPassword() {
        try {
            WifiManager wifiManager = (WifiManager) context.getSystemService(Context.WIFI_SERVICE);
            if (wifiManager != null) {
                java.lang.reflect.Method getMethod = wifiManager.getClass().getDeclaredMethod("getWifiApConfiguration");
                getMethod.setAccessible(true);
                WifiConfiguration config = (WifiConfiguration) getMethod.invoke(wifiManager);
                if (config != null && config.preSharedKey != null) {
                    return config.preSharedKey.replace("\"", "");
                }
            }
        } catch (Exception e) {
            android.util.Log.e("MifiWebServer", "getTetheringPassword error: " + e.getMessage());
        }
        return "-";
    }

    private String getNetworkTypeName() {
        try {
            TelephonyManager tm = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
            if (tm != null) {
                int networkType = tm.getNetworkType();
                switch (networkType) {
                    case TelephonyManager.NETWORK_TYPE_GPRS:
                    case TelephonyManager.NETWORK_TYPE_EDGE:
                    case TelephonyManager.NETWORK_TYPE_CDMA:
                    case TelephonyManager.NETWORK_TYPE_1xRTT:
                    case TelephonyManager.NETWORK_TYPE_IDEN:
                        return "2G";
                    case TelephonyManager.NETWORK_TYPE_UMTS:
                    case TelephonyManager.NETWORK_TYPE_EVDO_0:
                    case TelephonyManager.NETWORK_TYPE_EVDO_A:
                    case TelephonyManager.NETWORK_TYPE_HSDPA:
                    case TelephonyManager.NETWORK_TYPE_HSUPA:
                    case TelephonyManager.NETWORK_TYPE_HSPA:
                    case TelephonyManager.NETWORK_TYPE_EVDO_B:
                    case TelephonyManager.NETWORK_TYPE_EHRPD:
                    case TelephonyManager.NETWORK_TYPE_HSPAP:
                        return "3G";
                    case TelephonyManager.NETWORK_TYPE_LTE:
                        return "4G LTE";
                    default:
                        return "Unknown";
                }
            }
        } catch (Exception e) {
            android.util.Log.e("MifiWebServer", "getNetworkTypeName error: " + e.getMessage());
        }
        return "-";
    }

    private boolean hasInternetConnection() {
        try {
            URL url = new URL("https://connectivitycheck.gstatic.com/generate_204");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(3000);
            conn.setReadTimeout(3000);
            conn.setRequestMethod("GET");
            int responseCode = conn.getResponseCode();
            conn.disconnect();
            return responseCode == 204;
        } catch (Exception e) {
            return false;
        }
    }

    private String getUptimeJson() {
        long elapsedMillis = SystemClock.elapsedRealtime();
        String uptime = formatUptime(elapsedMillis);
        long uptimeSeconds = elapsedMillis / 1000;
        
        JSONObject json = new JSONObject();
        try {
            json.put("uptime", uptime);
            json.put("uptime_seconds", uptimeSeconds);
        } catch (JSONException e) {
            return "{\"uptime\": \"-\", \"uptime_seconds\": 0}";
        }
        return json.toString();
    }

    private String formatUptime(long elapsedMillis) {
        long seconds = elapsedMillis / 1000;
        long days = seconds / 86400;
        long hours = (seconds % 86400) / 3600;
        long minutes = (seconds % 3600) / 60;
        long secs = seconds % 60;
        
        StringBuilder sb = new StringBuilder();
        if (days > 0) sb.append(days).append("h ");
        if (hours > 0 || days > 0) sb.append(hours).append("j ");
        sb.append(minutes).append("m ");
        sb.append(secs).append("d");
        return sb.toString();
    }

    private String getSignalJson() {
        int bars = 0;
        if (lastSignalStrength >= -90) bars = 4;
        else if (lastSignalStrength >= -105) bars = 2;
        else if (lastSignalStrength >= -120) bars = 1;
        return "{\"rssi\": " + lastSignalStrength + ", \"bars\": " + bars + "}";
    }

    private String getConnectedDevices() throws Exception {
        JSONArray arr = new JSONArray();
        BufferedReader br = new BufferedReader(new InputStreamReader(Runtime.getRuntime().exec("cat /proc/net/arp").getInputStream()));
        String line; br.readLine();
        while ((line = br.readLine()) != null) {
            String[] p = line.split("\\s+");
            if (p.length >= 6 && !p[3].equals("00:00:00:00:00:00")) {
                JSONObject obj = new JSONObject();
                obj.put("ip", p[0]); obj.put("mac", p[3]);
                arr.put(obj);
            }
        }
        return new JSONObject().put("clients", arr).toString();
    }


    private String getIpJson() {
        String localIp = "N/A", publicIp = "N/A";
        try { localIp = getLocalIp(); } catch (Exception ignored) {}
        try { publicIp = getPublicIp(); } catch (Exception ignored) {}
        return "{\"local_ip\":\"" + localIp + "\", \"public_ip\":\"" + publicIp + "\"}";
    }

    private String getLocalIp() throws Exception {

        
        for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {

            String name = ni.getName();

            if (name.contains("rmnet") || name.contains("lo"))
                continue;

            for (InetAddress addr : Collections.list(ni.getInetAddresses())) {

                String ip = addr.getHostAddress();

                if (!addr.isLoopbackAddress()
                        && ip.indexOf(':') < 0
                        && isPrivateIp(ip)) {

                    return ip;
                }
            }
        }
        throw new Exception("No Local IP found");
    }

    private boolean isPrivateIp(String ip) {

        return ip.startsWith("192.168.")
                || ip.startsWith("172.")
                || ip.startsWith("10.");
    }

    private String getPublicIp() throws Exception {

        for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {

            if (ni.getName().contains("rmnet")) {

                for (InetAddress addr : Collections.list(ni.getInetAddresses())) {

                    if (!addr.isLoopbackAddress() && addr.getHostAddress().indexOf(':') < 0) {

                        return addr.getHostAddress();
                    }
                }
            }
        }

        throw new Exception("No Public IP found");
    }


    @SuppressLint("Range")
    public JSONObject getInboxJson(Context ctx, int page, int limit) throws JSONException {
        JSONObject response = new JSONObject();
        JSONArray res = new JSONArray();
        Cursor c = ctx.getContentResolver().query(Uri.parse("content://sms/inbox"), null, null, null, "date DESC");
        int totalPage = 0;
        if (c != null) {
            int countTotal = c.getCount();
            totalPage = (int) Math.ceil((double) countTotal / limit);
            if (c.moveToPosition((page - 1) * limit)) {
                int count = 0;
                do {
                    JSONObject o = new JSONObject();
                    o.put("id", c.getString(c.getColumnIndex("_id")));
                    o.put("number", c.getString(c.getColumnIndex("address")));
                    o.put("body", c.getString(c.getColumnIndex("body")));
                    o.put("date", c.getLong(c.getColumnIndex("date")));
                    o.put("read", c.getInt(c.getColumnIndex("read")));
                    res.put(o);
                    count++;
                } while (c.moveToNext() && count < limit);
            }
            c.close();
        }
        response.put("current_page", page);
        response.put("total_page", totalPage);
        response.put("messages", res);
        return response;
    }

    @SuppressLint("Range")
    public JSONObject getOutboxJson(Context ctx, int page, int limit) throws JSONException {
        JSONObject response = new JSONObject();
        JSONArray res = new JSONArray();
        Cursor c = ctx.getContentResolver().query(Uri.parse("content://sms/sent"), null, null, null, "date DESC");
        int totalPage = 0;
        if (c != null) {
            int countTotal = c.getCount();
            totalPage = (int) Math.ceil((double) countTotal / limit);
            if (c.moveToPosition((page - 1) * limit)) {
                int count = 0;
                do {
                    JSONObject o = new JSONObject();
                    o.put("id", c.getString(c.getColumnIndex("_id")));
                    o.put("number", c.getString(c.getColumnIndex("address")));
                    o.put("body", c.getString(c.getColumnIndex("body")));
                    o.put("date", c.getLong(c.getColumnIndex("date")));
                    res.put(o);
                    count++;
                } while (c.moveToNext() && count < limit);
            }
            c.close();
        }
        response.put("current_page", page);
        response.put("total_page", totalPage);
        response.put("messages", res);
        return response;
    }

    public JSONObject sendSms(String n, String m) throws JSONException {
        JSONObject o = new JSONObject();
        try {
            SmsManager.getDefault().sendTextMessage(n, null, m, null, null);
            o.put("status", "success");
        } catch (Exception e) { o.put("status", "error"); }
        return o;
    }

    public JSONObject deleteSms(JSONObject body) throws JSONException {
        JSONObject result = new JSONObject();
        int deletedCount = 0;

        try {
            if (body.has("all") && body.getBoolean("all")) {
                Cursor c = context.getContentResolver().query(
                    Uri.parse("content://sms/"),
                    new String[]{"_id"}, null, null, null);
                if (c != null) {
                    while (c.moveToNext()) {
                        @SuppressLint("Range")
                        String id = c.getString(c.getColumnIndex("_id"));
                        int d = context.getContentResolver().delete(
                            Uri.parse("content://sms/" + id), null, null);
                        deletedCount += d;
                    }
                    c.close();
                }
            } else if (body.has("ids")) {
                JSONArray ids = body.getJSONArray("ids");
                for (int i = 0; i < ids.length(); i++) {
                    String id = ids.getString(i);
                    int d = context.getContentResolver().delete(
                        Uri.parse("content://sms/" + id), null, null);
                    deletedCount += d;
                }
            } else if (body.has("id")) {
                String id = body.getString("id");
                deletedCount = context.getContentResolver().delete(
                    Uri.parse("content://sms/" + id), null, null);
            } else {
                return result.put("status", "error").put("message", "No ID provided");
            }

            result.put("status", "success").put("deleted", deletedCount);
        } catch (Exception e) {
            result.put("status", "error").put("message", e.getMessage());
        }

        return result;
    }

    public JSONObject getCallbackSettings() throws JSONException {
        JSONObject result = new JSONObject();
        String url = prefs.getString("callback_url", "");
        boolean enabled = prefs.getBoolean("callback_enabled", false);
        result.put("url", url);
        result.put("enabled", enabled);
        return result;
    }

    public JSONObject setCallback(JSONObject body) throws JSONException {
        JSONObject result = new JSONObject();
        try {
            String url = body.optString("url", "");
            boolean enabled = body.optBoolean("enabled", true);
            
            prefs.edit()
                .putString("callback_url", url)
                .putBoolean("callback_enabled", enabled)
                .apply();
            
            result.put("status", "success");
            result.put("url", url);
            result.put("enabled", enabled);
        } catch (Exception e) {
            result.put("status", "error").put("message", e.getMessage());
        }
        return result;
    }

    public JSONObject deleteCallback() throws JSONException {
        JSONObject result = new JSONObject();
        try {
            prefs.edit()
                .remove("callback_url")
                .putBoolean("callback_enabled", false)
                .apply();
            result.put("status", "success");
        } catch (Exception e) {
            result.put("status", "error").put("message", e.getMessage());
        }
        return result;
    }

    public JSONObject testCallback() throws JSONException {
        JSONObject result = new JSONObject();
        try {
            String callbackUrl = prefs.getString("callback_url", "");
            
            if (callbackUrl.isEmpty()) {
                return result.put("status", "error").put("message", "Callback URL belum diset");
            }

            JSONObject testBody = new JSONObject();
            testBody.put("address", "TEST_NUMBER");
            testBody.put("body", "This is a test callback from MiFi Web UI");
            testBody.put("date", System.currentTimeMillis());

            java.net.URL url = new java.net.URL(callbackUrl);
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
            enableTLS(conn);
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            conn.setDoOutput(true);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);

            java.io.OutputStream os = conn.getOutputStream();
            os.write(testBody.toString().getBytes("UTF-8"));
            os.flush();
            os.close();

            int responseCode = conn.getResponseCode();
            conn.disconnect();
            
            if (responseCode >= 200 && responseCode < 300) {
                result.put("status", "success");
                result.put("message", "Test callback berhasil dikirim (HTTP " + responseCode + ")");
            } else {
                result.put("status", "error");
                result.put("message", "Callback gagal (HTTP " + responseCode + ")");
            }
            result.put("url", callbackUrl);
        } catch (Exception e) {
            result.put("status", "error").put("message", "Gagal koneksi: " + e.getMessage());
        }
        return result;
    }

    public JSONObject getTelegramSettings() throws JSONException {
        JSONObject result = new JSONObject();
        result.put("bot_token", prefs.getString("telegram_bot_token", ""));
        result.put("chat_id", prefs.getString("telegram_chat_id", ""));
        result.put("own_number", prefs.getString("telegram_own_number", ""));
        result.put("enabled", prefs.getBoolean("telegram_enabled", false));
        return result;
    }

    public JSONObject setTelegram(JSONObject body) throws JSONException {
        JSONObject result = new JSONObject();
        try {
            String botToken = body.optString("bot_token", "");
            String chatId = body.optString("chat_id", "");
            String ownNumber = body.optString("own_number", "");
            boolean enabled = body.optBoolean("enabled", true);
            
            prefs.edit()
                .putString("telegram_bot_token", botToken)
                .putString("telegram_chat_id", chatId)
                .putString("telegram_own_number", ownNumber)
                .putBoolean("telegram_enabled", enabled)
                .apply();
            
            result.put("status", "success");
        } catch (Exception e) {
            result.put("status", "error").put("message", e.getMessage());
        }
        return result;
    }

    public JSONObject deleteTelegram() throws JSONException {
        JSONObject result = new JSONObject();
        try {
            prefs.edit()
                .remove("telegram_bot_token")
                .remove("telegram_chat_id")
                .remove("telegram_own_number")
                .putBoolean("telegram_enabled", false)
                .apply();
            result.put("status", "success");
        } catch (Exception e) {
            result.put("status", "error").put("message", e.getMessage());
        }
        return result;
    }

    public JSONObject testTelegram() throws JSONException {
        JSONObject result = new JSONObject();
        try {
            String botToken = prefs.getString("telegram_bot_token", "");
            String chatId = prefs.getString("telegram_chat_id", "");
            
            if (botToken.isEmpty() || chatId.isEmpty()) {
                return result.put("status", "error").put("message", "Bot Token atau Chat ID belum diset");
            }
            
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
            String dateStr = sdf.format(new Date());
            
            String message = "📩 [SMS MASUK]\n"
                + "Ke: YOUR_NUMBER\n"
                + "Dari: TEST_NUMBER\n"
                + "Waktu: " + dateStr + "\n"
                + "Pesan:\n"
                + "This is a test message from MiFi Web UI";
            
            java.net.URL url = new java.net.URL("https://api.telegram.org/bot" + botToken + "/sendMessage");
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
            enableTLS(conn);
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            conn.setDoOutput(true);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);
            
            JSONObject body = new JSONObject();
            body.put("chat_id", chatId);
            body.put("text", message);
            
            OutputStream os = conn.getOutputStream();
            os.write(body.toString().getBytes("UTF-8"));
            os.flush();
            os.close();
            
            int responseCode = conn.getResponseCode();
            
            if (responseCode == 200) {
                result.put("status", "success");
                result.put("message", "Test message berhasil dikirim ke Telegram");
            } else {
                BufferedReader br = new BufferedReader(new InputStreamReader(conn.getErrorStream()));
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) {
                    response.append(line);
                }
                br.close();
                
                String errorMsg = "HTTP " + responseCode;
                try {
                    JSONObject errorResponse = new JSONObject(response.toString());
                    if (errorResponse.has("description")) {
                        errorMsg = errorResponse.getString("description");
                    }
                } catch (Exception ignored) {}
                
                result.put("status", "error");
                result.put("message", errorMsg);
            }
            conn.disconnect();
            
        } catch (Exception e) {
            result.put("status", "error");
            result.put("message", "Gagal koneksi: " + e.getMessage());
        }
        return result;
    }

    private String getHotspotJson() {
        JSONObject json = new JSONObject();
        try {
            WifiManager wifiManager = (WifiManager) context.getSystemService(Context.WIFI_SERVICE);
            if (wifiManager == null) {
                return "{\"ssid\": \"-\", \"password\": \"\", \"enabled\": false, \"hidden\": false, \"security\": \"WPA2_PSK\", \"connected_clients\": 0}";
            }
            
            java.lang.reflect.Method getMethod = wifiManager.getClass().getDeclaredMethod("getWifiApConfiguration");
            getMethod.setAccessible(true);
            WifiConfiguration config = (WifiConfiguration) getMethod.invoke(wifiManager);
            
            java.lang.reflect.Method isEnabledMethod = wifiManager.getClass().getDeclaredMethod("isWifiApEnabled");
            isEnabledMethod.setAccessible(true);
            boolean enabled = (boolean) isEnabledMethod.invoke(wifiManager);
            
            int clientCount = getConnectedClientCount();
            
            String ssid = "-";
            String password = "";
            boolean hidden = false;
            String security = "OPEN";
            
            if (config != null) {
                if (config.SSID != null) {
                    ssid = config.SSID.replace("\"", "");
                }
                if (config.preSharedKey != null) {
                    password = config.preSharedKey.replace("\"", "");
                }
                hidden = config.hiddenSSID;
                security = getSecurityType(config);
            }
            
            json.put("ssid", ssid);
            json.put("password", password);
            json.put("enabled", enabled);
            json.put("hidden", hidden);
            json.put("security", security);
            json.put("connected_clients", clientCount);
        } catch (Exception e) {
            android.util.Log.e("MifiWebServer", "getHotspotJson error: " + e.getMessage());
            try {
                json.put("ssid", "-");
                json.put("password", "");
                json.put("enabled", false);
                json.put("hidden", false);
                json.put("security", "OPEN");
                json.put("connected_clients", 0);
            } catch (JSONException ignored) {}
        }
        return json.toString();
    }

    private String getSecurityType(WifiConfiguration config) {
        if (config.allowedKeyManagement.get(WifiConfiguration.KeyMgmt.NONE)) {
            return "OPEN";
        }
        if (config.allowedProtocols.get(WifiConfiguration.Protocol.RSN)) {
            return "WPA2_PSK";
        }
        return "WPA_PSK";
    }

    private int getConnectedClientCount() {
        int count = 0;
        try {
            BufferedReader br = new BufferedReader(new InputStreamReader(
                Runtime.getRuntime().exec("cat /proc/net/arp").getInputStream()));
            String line;
            br.readLine();
            while ((line = br.readLine()) != null) {
                String[] p = line.split("\\s+");
                if (p.length >= 6 && !p[3].equals("00:00:00:00:00:00")) {
                    count++;
                }
            }
            br.close();
        } catch (Exception ignored) {}
        return count;
    }

    private javax.net.ssl.SSLSocketFactory getTLSSocketFactory() {
        try {
            javax.net.ssl.SSLContext sc = javax.net.ssl.SSLContext.getInstance("TLSv1.2");
            sc.init(null, null, null);
            return sc.getSocketFactory();
        } catch (Exception e) {
            android.util.Log.e("MifiWebServer", "getTLSSocketFactory error: " + e.getMessage());
            return null;
        }
    }

    private void enableTLS(java.net.HttpURLConnection conn) {
        if (conn instanceof javax.net.ssl.HttpsURLConnection) {
            javax.net.ssl.SSLSocketFactory factory = getTLSSocketFactory();
            if (factory != null) {
                ((javax.net.ssl.HttpsURLConnection) conn).setSSLSocketFactory(factory);
            }
        }
    }

    private JSONObject setHotspotConfig(JSONObject body) throws JSONException {
        JSONObject result = new JSONObject();
        
        String ssid = body.optString("ssid", "").trim();
        String password = body.optString("password", "");
        boolean hidden = body.optBoolean("hidden", false);
        String security = body.optString("security", "WPA2_PSK");
        
        if (ssid.isEmpty()) {
            return result.put("status", "error").put("message", "SSID tidak boleh kosong");
        }
        if (ssid.length() > 32) {
            return result.put("status", "error").put("message", "SSID maksimal 32 karakter");
        }
        if (!security.equals("OPEN") && password.length() < 8) {
            return result.put("status", "error").put("message", "Password minimal 8 karakter");
        }
        if (password.length() > 63) {
            return result.put("status", "error").put("message", "Password maksimal 63 karakter");
        }
        
        try {
            android.util.Log.d("MifiWebServer", "Step 1: Getting WifiManager...");
            WifiManager wifiManager = (WifiManager) context.getSystemService(Context.WIFI_SERVICE);
            if (wifiManager == null) {
                return result.put("status", "error").put("message", "WifiManager tidak tersedia");
            }
            
            android.util.Log.d("MifiWebServer", "Step 2: Checking hotspot status...");
            java.lang.reflect.Method isEnabledMethod = wifiManager.getClass().getDeclaredMethod("isWifiApEnabled");
            isEnabledMethod.setAccessible(true);
            boolean wasEnabled = (boolean) isEnabledMethod.invoke(wifiManager);
            android.util.Log.d("MifiWebServer", "Hotspot was enabled: " + wasEnabled);
            
            // Disable hotspot first if enabled
            if (wasEnabled) {
                android.util.Log.d("MifiWebServer", "Step 3: Disabling hotspot...");
                java.lang.reflect.Method setApMethod = wifiManager.getClass().getDeclaredMethod("setWifiApEnabled", WifiConfiguration.class, boolean.class);
                setApMethod.setAccessible(true);
                setApMethod.invoke(wifiManager, null, false);
                Thread.sleep(2000);
                android.util.Log.d("MifiWebServer", "Hotspot disabled");
            }
            
            android.util.Log.d("MifiWebServer", "Step 4: Getting current config...");
            java.lang.reflect.Method getMethod = wifiManager.getClass().getDeclaredMethod("getWifiApConfiguration");
            getMethod.setAccessible(true);
            WifiConfiguration config = (WifiConfiguration) getMethod.invoke(wifiManager);
            
            if (config == null) {
                android.util.Log.d("MifiWebServer", "Config is null, creating new...");
                config = new WifiConfiguration();
            }
            
            // Pastikan BitSet diinisialisasi (fix untuk Android 4.4)
            if (config.allowedKeyManagement == null) {
                config.allowedKeyManagement = new java.util.BitSet();
            }
            if (config.allowedProtocols == null) {
                config.allowedProtocols = new java.util.BitSet();
            }
            if (config.allowedAuthAlgorithms == null) {
                config.allowedAuthAlgorithms = new java.util.BitSet();
            }
            if (config.allowedGroupCiphers == null) {
                config.allowedGroupCiphers = new java.util.BitSet();
            }
            if (config.allowedPairwiseCiphers == null) {
                config.allowedPairwiseCiphers = new java.util.BitSet();
            }
            
            android.util.Log.d("MifiWebServer", "Step 5: Setting new config values...");
            config.SSID = ssid;
            config.hiddenSSID = hidden;
            
            config.allowedKeyManagement.clear();
            config.allowedProtocols.clear();
            config.allowedAuthAlgorithms.clear();
            config.allowedGroupCiphers.clear();
            config.allowedPairwiseCiphers.clear();
            
            if (security.equals("OPEN")) {
                config.allowedKeyManagement.set(WifiConfiguration.KeyMgmt.NONE);
                config.preSharedKey = null;
            } else {
                config.allowedKeyManagement.set(WifiConfiguration.KeyMgmt.WPA_PSK);
                if (security.equals("WPA2_PSK")) {
                    config.allowedProtocols.set(WifiConfiguration.Protocol.RSN);
                }
                config.preSharedKey = password;
            }
            
            android.util.Log.d("MifiWebServer", "Step 6: Saving config...");
            java.lang.reflect.Method setConfigMethod = wifiManager.getClass().getDeclaredMethod("setWifiApConfiguration", WifiConfiguration.class);
            setConfigMethod.setAccessible(true);
            boolean saved = (boolean) setConfigMethod.invoke(wifiManager, config);
            
            if (!saved) {
                return result.put("status", "error").put("message", "Gagal menyimpan konfigurasi");
            }
            android.util.Log.d("MifiWebServer", "Config saved: " + saved);
            
            // Re-enable hotspot if it was enabled before
            if (wasEnabled) {
                android.util.Log.d("MifiWebServer", "Step 7: Re-enabling hotspot...");
                Thread.sleep(1000);
                java.lang.reflect.Method setApMethod = wifiManager.getClass().getDeclaredMethod("setWifiApEnabled", WifiConfiguration.class, boolean.class);
                setApMethod.setAccessible(true);
                setApMethod.invoke(wifiManager, config, true);
                android.util.Log.d("MifiWebServer", "Hotspot re-enabled");
            }
            
            result.put("status", "success");
            android.util.Log.d("MifiWebServer", "setHotspotConfig completed successfully");
            
        } catch (java.lang.reflect.InvocationTargetException e) {
            Throwable target = e.getTargetException();
            String errorMsg = "Unknown error";
            if (target != null) {
                errorMsg = target.getClass().getSimpleName();
                if (target.getMessage() != null) {
                    errorMsg += ": " + target.getMessage();
                }
                android.util.Log.e("MifiWebServer", "InvocationTargetException target: " + errorMsg, target);
            }
            android.util.Log.e("MifiWebServer", "InvocationTargetException in setHotspotConfig", e);
            result.put("status", "error").put("message", "Error internal: " + errorMsg);
        } catch (NoSuchMethodException e) {
            android.util.Log.e("MifiWebServer", "Reflection method tidak ditemukan", e);
            result.put("status", "error").put("message", "Device tidak mendukung perubahan hotspot");
        } catch (NullPointerException e) {
            android.util.Log.e("MifiWebServer", "NullPointerException in setHotspotConfig", e);
            result.put("status", "error").put("message", "Konfigurasi tidak valid");
        } catch (Exception e) {
            String errorMsg = e.getMessage();
            if (errorMsg == null) errorMsg = e.getClass().getSimpleName();
            android.util.Log.e("MifiWebServer", "setHotspotConfig error: " + errorMsg, e);
            result.put("status", "error").put("message", "Gagal mengubah konfigurasi: " + errorMsg);
        }
        
        return result;
    }
}
