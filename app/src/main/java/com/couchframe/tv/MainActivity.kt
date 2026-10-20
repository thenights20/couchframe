package com.couchframe.tv

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Message
import android.os.SystemClock
import android.view.KeyCharacterMap
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.view.inputmethod.InputMethodManager
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import java.io.ByteArrayInputStream

private const val HOME = "https://framextv.cc/"
private const val BG = 0xFF09090B.toInt()

/** The site and its own mirrors; main-frame navigation anywhere else (ad redirects) is blocked. */
private val OWN_HOSTS = listOf("framextv.cc", "framextv.xyz", "framextv.tech")

/** Common pop-under / ad networks that embed players load. Matched as host suffixes. */
private val AD_HOSTS = listOf(
    "doubleclick.net", "googlesyndication.com", "googleadservices.com", "adservice.google.com",
    "popads.net", "popcash.net", "propellerads.com", "propellerclick.com", "adsterra.com",
    "exoclick.com", "exdynsrv.com", "juicyads.com", "trafficjunky.net", "onclickads.net",
    "onclkds.com", "adcash.com", "hilltopads.net", "a-ads.com", "mgid.com", "revcontent.com",
    "taboola.com", "outbrain.com", "clickadu.com", "highperformanceformat.com",
    "profitablegatecpm.com", "effectivegatecpm.com", "realsrv.com", "tsyndicate.com",
    "adnxs.com", "pubmatic.com", "rubiconproject.com", "zeydoo.com", "galaksion.com",
)

private val TRACKER_HOSTS = listOf(
    "googletagmanager.com", "google-analytics.com", "cloudflareinsights.com",
)

class MainActivity : Activity() {

    private lateinit var root: FrameLayout
    private lateinit var web: WebView
    private lateinit var tvScript: String
    private var injectAtStart = false

    private var customView: View? = null
    private var customCallback: WebChromeClient.CustomViewCallback? = null
    private var lastBackAt = 0L

    /** When the remote's OK button last went through the activity; lets the page tell it apart from the on-screen keyboard's Enter. */
    @Volatile private var lastRemoteOkAt = 0L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        root = FrameLayout(this).apply { setBackgroundColor(BG) }
        web = WebView(this)
        root.addView(web, MATCH_PARENT, MATCH_PARENT)
        setContentView(root)
        hideSystemBars()
        setupWebView()
        web.loadUrl(startUrl(intent) ?: HOME)
        web.requestFocus()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        startUrl(intent)?.let { web.loadUrl(it) }
    }

    /** A framextv link passed in the launch intent (e.g. `adb shell am start -d <url>`). */
    private fun startUrl(intent: Intent?): String? {
        val uri = intent?.data ?: return null
        return if (uri.scheme == "https" && isOwnHost(uri.host)) uri.toString() else null
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        if (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0) {
            WebView.setWebContentsDebuggingEnabled(true)
        }
        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            // window.open() goes to onCreateWindow, which refuses it: popups are blocked instead of replacing the page.
            setSupportMultipleWindows(true)
            javaScriptCanOpenWindowsAutomatically = false
            useWideViewPort = true
            loadWithOverviewMode = true
            builtInZoomControls = false
            // Look like regular Chrome; some embed players refuse Android WebView.
            userAgentString = userAgentString.replace("; wv", "").replace(Regex("Version/\\d+\\.\\d+ "), "")
        }
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(web, true)
        }
        web.setBackgroundColor(BG)
        web.isFocusable = true
        web.isFocusableInTouchMode = true
        web.addJavascriptInterface(Bridge(), "TVApp")

        tvScript = assets.open("tv.js").bufferedReader().use { it.readText() }
        // Injecting into every frame lets the remote also control the video inside the embed iframes.
        injectAtStart = WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)
        if (injectAtStart) WebViewCompat.addDocumentStartJavaScript(web, tvScript, setOf("*"))

        web.webViewClient = Client()
        web.webChromeClient = Chrome()
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        val code = event.keyCode
        val down = event.action == KeyEvent.ACTION_DOWN
        if (down && isRemoteOk(event)) lastRemoteOkAt = SystemClock.uptimeMillis()

        if (code == KeyEvent.KEYCODE_BACK) {
            if (down && event.repeatCount == 0) handleBack()
            return true
        }
        val media = when (code) {
            KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE, KeyEvent.KEYCODE_HEADSETHOOK -> "playpause"
            KeyEvent.KEYCODE_MEDIA_PLAY -> "play"
            KeyEvent.KEYCODE_MEDIA_PAUSE, KeyEvent.KEYCODE_MEDIA_STOP -> "pause"
            KeyEvent.KEYCODE_MEDIA_FAST_FORWARD, KeyEvent.KEYCODE_MEDIA_NEXT,
            KeyEvent.KEYCODE_MEDIA_SKIP_FORWARD, KeyEvent.KEYCODE_MEDIA_STEP_FORWARD -> "ff"
            KeyEvent.KEYCODE_MEDIA_REWIND, KeyEvent.KEYCODE_MEDIA_PREVIOUS,
            KeyEvent.KEYCODE_MEDIA_SKIP_BACKWARD, KeyEvent.KEYCODE_MEDIA_STEP_BACKWARD -> "rew"
            else -> null
        }
        if (media != null) {
            if (down) js("window.__tv&&__tv.media('$media')")
            return true
        }
        // Arrows and OK go to the page, where tv.js does the Netflix-style focus movement.
        return super.dispatchKeyEvent(event)
    }

    private fun isRemoteOk(e: KeyEvent): Boolean = when (e.keyCode) {
        KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_BUTTON_A -> true
        KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_NUMPAD_ENTER ->
            e.flags and KeyEvent.FLAG_SOFT_KEYBOARD == 0 && e.deviceId != KeyCharacterMap.VIRTUAL_KEYBOARD
        else -> false
    }

    /** Back: leave fullscreen video → close the open dialog → previous page → (twice) exit. */
    private fun handleBack() {
        if (customView != null) {
            hideCustomView()
            return
        }
        web.evaluateJavascript("(function(){try{return !!(window.__tv&&__tv.back())}catch(e){return false}})()") { handled ->
            if (handled == "true") return@evaluateJavascript
            if (web.canGoBack()) {
                web.goBack()
            } else {
                val now = SystemClock.uptimeMillis()
                if (now - lastBackAt < 2000) finish()
                else {
                    lastBackAt = now
                    Toast.makeText(this, "Press BACK again to exit", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun js(code: String) = web.evaluateJavascript(code, null)

    private fun hideCustomView() {
        val view = customView ?: return
        customView = null
        root.removeView(view)
        customCallback?.onCustomViewHidden()
        customCallback = null
        web.visibility = View.VISIBLE
        web.requestFocus()
        hideSystemBars()
    }

    @Suppress("DEPRECATION")
    private fun hideSystemBars() {
        if (Build.VERSION.SDK_INT >= 30) {
            window.insetsController?.let {
                it.hide(WindowInsets.Type.systemBars())
                it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        }
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
        hideSystemBars()
    }

    override fun onPause() {
        js("window.__tv&&__tv.media('pause')")
        web.onPause()
        CookieManager.getInstance().flush()
        super.onPause()
    }

    override fun onDestroy() {
        root.removeView(web)
        web.destroy()
        super.onDestroy()
    }

    private fun isOwnHost(host: String?) =
        host != null && OWN_HOSTS.any { host == it || host.endsWith(".$it") }

    private fun isAdHost(host: String?) =
        host != null && AD_HOSTS.any { host == it || host.endsWith(".$it") }

    /** Analytics and the Chromecast *sender* library: pure CPU cost on a TV that is itself the screen. */
    private fun isUselessOnTv(url: Uri): Boolean {
        val host = url.host ?: return false
        if (TRACKER_HOSTS.any { host == it || host.endsWith(".$it") }) return true
        return host == "www.gstatic.com" && url.path.orEmpty().startsWith("/cv/js/sender")
    }

    private inner class Client : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            if (!request.isForMainFrame) return false
            val url = request.url
            val web = url.scheme == "https" || url.scheme == "http"
            return !(web && isOwnHost(url.host))
        }

        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
            if (!isAdHost(request.url.host) && !isUselessOnTv(request.url)) return null
            return WebResourceResponse("text/plain", "utf-8", ByteArrayInputStream(ByteArray(0)))
        }

        override fun onPageFinished(view: WebView, url: String) {
            // Older WebView without document-start scripts: inject into the top page only.
            if (!injectAtStart) view.evaluateJavascript(tvScript, null)
        }

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            if (request.isForMainFrame) showError(view, request.url, error.description.toString())
        }
    }

    private fun showError(view: WebView, url: Uri, reason: String) {
        val safeReason = reason.replace("<", "&lt;")
        val html = """
            <html><body style="background:#09090b;color:#fff;font-family:sans-serif;display:flex;
            flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0">
            <h2>Can't reach frameXTV</h2><p style="color:#a1a1aa">$safeReason</p>
            <button id="r" autofocus style="font-size:20px;padding:12px 32px;border-radius:8px;border:0;
            background:#e50914;color:#fff" onclick="location.href='$HOME'">Retry</button>
            <script>document.getElementById('r').focus()</script></body></html>
        """.trimIndent()
        view.loadDataWithBaseURL(HOME, html, "text/html", "utf-8", url.toString())
    }

    private inner class Chrome : WebChromeClient() {
        override fun onCreateWindow(view: WebView, isDialog: Boolean, isUserGesture: Boolean, resultMsg: Message) = false

        override fun onShowCustomView(view: View, callback: CustomViewCallback) {
            if (customView != null) {
                callback.onCustomViewHidden()
                return
            }
            customView = view
            customCallback = callback
            root.addView(view, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
            view.isFocusable = true
            view.requestFocus()
            hideSystemBars()
        }

        override fun onHideCustomView() = hideCustomView()

        // Without this, paused videos show WebView's grey "play" placeholder.
        override fun getDefaultVideoPoster(): Bitmap = Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888)

        override fun onPermissionRequest(request: PermissionRequest) = request.deny()
    }

    /** Exposed to page scripts as window.TVApp. */
    private inner class Bridge {
        @JavascriptInterface
        fun remoteOk(): Boolean = SystemClock.uptimeMillis() - lastRemoteOkAt < 600

        @JavascriptInterface
        fun showKeyboard() = runOnUiThread {
            web.requestFocus()
            (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager).showSoftInput(web, 0)
        }

        /** Keeps the projector from dimming / starting the screensaver while a video plays. */
        @JavascriptInterface
        fun playing(on: Boolean) = runOnUiThread {
            if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }
}
