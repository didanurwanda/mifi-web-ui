package com.didanurwanda.mifiwebui;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.AsyncTask;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.telephony.TelephonyManager;
import android.util.Log;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;

public class SmsReceiver extends BroadcastReceiver {

    private static final String TAG = "SmsReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent.getAction() == null) return;
        
        if (intent.getAction().equals("android.provider.Telephony.SMS_RECEIVED")) {
            SharedPreferences prefs = context.getSharedPreferences("mifi_prefs", Context.MODE_PRIVATE);
            
            String callbackUrl = prefs.getString("callback_url", "");
            boolean callbackEnabled = prefs.getBoolean("callback_enabled", false);
            
            String telegramBotToken = prefs.getString("telegram_bot_token", "");
            String telegramChatId = prefs.getString("telegram_chat_id", "");
            boolean telegramEnabled = prefs.getBoolean("telegram_enabled", false);

            if (!callbackEnabled && !telegramEnabled) {
                Log.d(TAG, "Both callback and telegram disabled");
                return;
            }

            Bundle bundle = intent.getExtras();
            if (bundle != null) {
                Object[] pdus = (Object[]) bundle.get("pdus");
                if (pdus == null) return;

                String format = bundle.getString("format");
                
                for (Object pdu : pdus) {
                    byte[] pduBytes = (byte[]) pdu;
                    SmsMessage sms;
                    
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                        sms = SmsMessage.createFromPdu(pduBytes, format);
                    } else {
                        sms = SmsMessage.createFromPdu(pduBytes);
                    }

                    if (sms != null) {
                        String address = sms.getOriginatingAddress();
                        String body = sms.getMessageBody();
                        long date = sms.getTimestampMillis();
                        
                        // Get destination number (our number) with fallbacks
                        String destination = getOwnNumber(context, sms, prefs);
                        
                        if (callbackEnabled && !callbackUrl.isEmpty()) {
                            new CallbackTask(callbackUrl, address, body, date).execute();
                        }
                        
                        if (telegramEnabled && !telegramBotToken.isEmpty() && !telegramChatId.isEmpty()) {
                            new TelegramTask(telegramBotToken, telegramChatId, destination, address, body, date).execute();
                        }
                    }
                }
            }
        }
    }

    private String getOwnNumber(Context context, SmsMessage sms, SharedPreferences prefs) {
        String number = "";
        
        // Try getDestinationAddress via reflection for API 23+
        if (android.os.Build.VERSION.SDK_INT >= 23) {
            try {
                java.lang.reflect.Method method = SmsMessage.class.getMethod("getDestinationAddress");
                number = (String) method.invoke(sms);
            } catch (Exception e) {
                Log.e(TAG, "getDestinationAddress via reflection failed: " + e.getMessage());
            }
        }
        
        // Fallback to getLine1Number if still empty
        if (number == null || number.isEmpty()) {
            try {
                TelephonyManager tm = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
                if (tm != null) {
                    number = tm.getLine1Number();
                }
            } catch (Exception e) {
                Log.e(TAG, "getLine1Number failed: " + e.getMessage());
            }
        }
        
        // Final fallback to setting
        if (number == null || number.isEmpty()) {
            number = prefs.getString("telegram_own_number", "-");
        }
        
        return number != null ? number : "-";
    }

    private static javax.net.ssl.SSLSocketFactory getTLSSocketFactory() {
        try {
            javax.net.ssl.SSLContext sc = javax.net.ssl.SSLContext.getInstance("TLSv1.2");
            sc.init(null, null, null);
            return sc.getSocketFactory();
        } catch (Exception e) {
            Log.e(TAG, "getTLSSocketFactory error: " + e.getMessage());
            return null;
        }
    }

    private static void enableTLS(HttpURLConnection conn) {
        if (conn instanceof javax.net.ssl.HttpsURLConnection) {
            javax.net.ssl.SSLSocketFactory factory = getTLSSocketFactory();
            if (factory != null) {
                ((javax.net.ssl.HttpsURLConnection) conn).setSSLSocketFactory(factory);
            }
        }
    }

    private static class CallbackTask extends AsyncTask<Void, Void, Void> {
        private final String url;
        private final JSONObject body;

        CallbackTask(String url, String address, String body, long date) {
            this.url = url;
            this.body = new JSONObject();
            try {
                this.body.put("address", address);
                this.body.put("body", body);
                this.body.put("date", date);
            } catch (Exception e) {
                Log.e(TAG, "Error creating JSON: " + e.getMessage());
            }
        }

        @Override
        protected Void doInBackground(Void... voids) {
            HttpURLConnection conn = null;
            try {
                URL callbackUrl = new URL(url);
                conn = (HttpURLConnection) callbackUrl.openConnection();
                enableTLS(conn);
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                conn.setDoOutput(true);
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);

                OutputStream os = conn.getOutputStream();
                os.write(body.toString().getBytes("UTF-8"));
                os.flush();
                os.close();

                int responseCode = conn.getResponseCode();
                Log.d(TAG, "Callback sent to " + url + ", response: " + responseCode);

            } catch (Exception e) {
                Log.e(TAG, "Callback failed: " + e.getMessage());
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
            return null;
        }
    }

    private static class TelegramTask extends AsyncTask<Void, Void, Void> {
        private final String botToken;
        private final String chatId;
        private final String ownNumber;
        private final String fromNumber;
        private final String body;
        private final long date;

        TelegramTask(String botToken, String chatId, String ownNumber, String fromNumber, String body, long date) {
            this.botToken = botToken;
            this.chatId = chatId;
            this.ownNumber = ownNumber;
            this.fromNumber = fromNumber;
            this.body = body;
            this.date = date;
        }

        @Override
        protected Void doInBackground(Void... voids) {
            HttpURLConnection conn = null;
            try {
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
                String dateStr = sdf.format(new Date(date));
                
                String message = "📩 [SMS MASUK]\n"
                    + "Ke: " + ownNumber + "\n"
                    + "Dari: " + fromNumber + "\n"
                    + "Waktu: " + dateStr + "\n"
                    + "Pesan:\n" + body;
                
                URL url = new URL("https://api.telegram.org/bot" + botToken + "/sendMessage");
                conn = (HttpURLConnection) url.openConnection();
                enableTLS(conn);
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                conn.setDoOutput(true);
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);
                
                JSONObject jsonBody = new JSONObject();
                jsonBody.put("chat_id", chatId);
                jsonBody.put("text", message);
                
                OutputStream os = conn.getOutputStream();
                os.write(jsonBody.toString().getBytes("UTF-8"));
                os.flush();
                os.close();
                
                int responseCode = conn.getResponseCode();
                Log.d(TAG, "Telegram sent, response: " + responseCode);
            } catch (Exception e) {
                Log.e(TAG, "Telegram failed: " + e.getMessage());
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
            return null;
        }
    }
}
