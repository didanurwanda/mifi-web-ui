package com.didanurwanda.mifiwebui;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

public class MainActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.d("MifiMainActivity", "onCreate called");
        
        Intent intent = new Intent(this, MainService.class);
        startService(intent);
        finish();
    }
}
