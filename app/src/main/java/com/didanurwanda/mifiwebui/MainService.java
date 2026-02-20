package com.didanurwanda.mifiwebui;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import java.io.IOException;

public class MainService extends Service {

    private static final String TAG = "MifiMainService";
    private MifiWebServer server;
    private static final String CHANNEL_ID = "mifi_service_channel";
    private static final int NOTIFICATION_ID = 1;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "onCreate called");

        // Enable modern TLS/SSL untuk Android 4.4+
        try {
            java.security.Security.insertProviderAt(new org.conscrypt.OpenSSLProvider(), 1);
            Log.d(TAG, "Conscrypt provider installed successfully");
        } catch (Exception e) {
            Log.e(TAG, "Failed to install Conscrypt provider: " + e.getMessage());
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "MiFi Web Service",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("MiFi Web UI Server");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
            startForeground(NOTIFICATION_ID, createNotification());
        }

        server = new MifiWebServer(this, 9000);
        try {
            server.start();
            Log.d(TAG, "Server started on port 9000");
        } catch (IOException e) {
            Log.e(TAG, "Failed to start server: " + e.getMessage());
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "onStartCommand called");
        return START_STICKY;
    }

    private Notification createNotification() {
        Notification.Builder builder = new Notification.Builder(this)
            .setContentTitle("MiFi Web UI")
            .setContentText("Server running on port 9000")
            .setSmallIcon(android.R.drawable.ic_menu_manage)
            .setOngoing(true);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder.setChannelId(CHANNEL_ID);
        }

        return builder.build();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
