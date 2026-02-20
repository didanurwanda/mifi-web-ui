package com.didanurwanda.mifiwebui;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "MifiBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        
        String action = intent.getAction();
        Log.d(TAG, "Received broadcast: " + action);
        
        if (action.equals("android.intent.action.BOOT_COMPLETED") ||
            action.equals("android.intent.action.QUICKBOOT_POWERON") ||
            action.equals("com.htc.intent.action.QUICKBOOT_POWERON")) {
            
            Intent serviceIntent = new Intent(context, MainService.class);
            context.startService(serviceIntent);
            Log.d(TAG, "MainService started");
        }
    }
}
