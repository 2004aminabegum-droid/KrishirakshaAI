package com.krishirakshak.ai;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Locale;

public class MainActivity extends BridgeActivity implements TextToSpeech.OnInitListener {
    private static final int SPEECH_REQUEST_CODE = 2001;
    private static final int PERMISSION_REQUEST_RECORD_AUDIO = 2002;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private String pendingSpeechLang = "hi-IN";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            tts = new TextToSpeech(this, this);
        } catch (Exception e) {
            e.printStackTrace();
        }

        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().addJavascriptInterface(new NativeSpeechInterface(), "AndroidNativeSpeech");

            this.bridge.getWebView().setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        try {
                            request.grant(request.getResources());
                        } catch (Exception ignored) {}
                    });
                }
            });
        }
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS && tts != null) {
            ttsReady = true;
            tts.setLanguage(new Locale("hi", "IN"));
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override
                public void onStart(String utteranceId) {
                    notifyJs("window.handleNativeSpeechStart && window.handleNativeSpeechStart();");
                }

                @Override
                public void onDone(String utteranceId) {
                    notifyJs("window.handleNativeSpeechEnd && window.handleNativeSpeechEnd();");
                }

                @Override
                public void onError(String utteranceId) {
                    notifyJs("window.handleNativeSpeechEnd && window.handleNativeSpeechEnd();");
                }
            });
        }
    }

    public class NativeSpeechInterface {
        @JavascriptInterface
        public boolean isNativeSpeechAvailable() {
            return true;
        }

        @JavascriptInterface
        public void startRecognition(String speechLocale) {
            runOnUiThread(() -> {
                pendingSpeechLang = (speechLocale != null && !speechLocale.isEmpty()) ? speechLocale : "hi-IN";
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                        != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(
                            MainActivity.this,
                            new String[]{Manifest.permission.RECORD_AUDIO},
                            PERMISSION_REQUEST_RECORD_AUDIO
                    );
                    return;
                }
                launchRecognizer(pendingSpeechLang);
            });
        }

        @JavascriptInterface
        public void speak(String text, String langCode) {
            runOnUiThread(() -> {
                if (tts == null || text == null || text.trim().isEmpty()) {
                    return;
                }
                Locale loc = getLocaleFromCode(langCode);
                try {
                    tts.setLanguage(loc);
                    tts.setSpeechRate(0.95f);
                    tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "TTS_" + System.currentTimeMillis());
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }

        @JavascriptInterface
        public void stopSpeaking() {
            runOnUiThread(() -> {
                if (tts != null) {
                    try {
                        tts.stop();
                    } catch (Exception ignored) {}
                }
            });
        }
    }

    private Locale getLocaleFromCode(String langCode) {
        if (langCode == null) return new Locale("hi", "IN");
        switch (langCode.toLowerCase()) {
            case "en": return new Locale("en", "IN");
            case "bn": return new Locale("bn", "IN");
            case "te": return new Locale("te", "IN");
            case "ta": return new Locale("ta", "IN");
            case "mr": return new Locale("mr", "IN");
            case "gu": return new Locale("gu", "IN");
            case "kn": return new Locale("kn", "IN");
            case "ml": return new Locale("ml", "IN");
            case "pa": return new Locale("pa", "IN");
            case "or": return new Locale("or", "IN");
            default: return new Locale("hi", "IN");
        }
    }

    private void launchRecognizer(String speechLocale) {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, speechLocale);
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak your crop question to Kisan Mitra AI...");
        try {
            startActivityForResult(intent, SPEECH_REQUEST_CODE);
        } catch (Exception e) {
            notifyJsError("Speech recognition is not installed or enabled on this device.");
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_RECORD_AUDIO) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                launchRecognizer(pendingSpeechLang);
            } else {
                notifyJsError("Microphone permission was denied.");
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == SPEECH_REQUEST_CODE) {
            if (resultCode == RESULT_OK && data != null) {
                ArrayList<String> matches = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                if (matches != null && !matches.isEmpty()) {
                    String transcript = matches.get(0);
                    notifyJsResult(transcript);
                    return;
                }
            }
            notifyJs("window.handleNativeSpeechEnd && window.handleNativeSpeechEnd();");
        }
    }

    private void notifyJsResult(String transcript) {
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().post(() -> {
                String safe = JSONObject.quote(transcript);
                this.bridge.getWebView().evaluateJavascript(
                        "window.handleNativeSpeechResult && window.handleNativeSpeechResult(" + safe + ");",
                        null
                );
            });
        }
    }

    private void notifyJsError(String errMsg) {
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().post(() -> {
                String safe = JSONObject.quote(errMsg);
                this.bridge.getWebView().evaluateJavascript(
                        "window.handleNativeSpeechError && window.handleNativeSpeechError(" + safe + ");",
                        null
                );
            });
        }
    }

    private void notifyJs(String jsCode) {
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().post(() -> {
                this.bridge.getWebView().evaluateJavascript(jsCode, null);
            });
        }
    }

    @Override
    public void onDestroy() {
        if (tts != null) {
            try {
                tts.stop();
                tts.shutdown();
            } catch (Exception ignored) {}
        }
        super.onDestroy();
    }
}
