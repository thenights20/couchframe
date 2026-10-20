package com.couchframe.tv

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent

/**
 * Takes over the remote's Netflix button and opens CouchFrame instead.
 *
 * Google TV handles that button itself (it launches Netflix from anywhere), so a normal app never sees it;
 * an accessibility service with key filtering gets keys before the system does. Every other key is passed on.
 * Enable it in Settings → System → Accessibility, or over adb:
 *   adb shell settings put secure enabled_accessibility_services com.couchframe.tv/com.couchframe.tv.RemoteButtonService
 */
class RemoteButtonService : AccessibilityService() {

    override fun onKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode !in NETFLIX_BUTTONS) return false
        if (event.action == KeyEvent.ACTION_UP) {
            startActivity(
                Intent(this, MainActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
            )
        }
        return true // swallow both down and up, so Netflix doesn't open too
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}

    override fun onInterrupt() {}

    private companion object {
        val NETFLIX_BUTTONS = setOf(
            KeyEvent.KEYCODE_STEM_1, // the user's RemoteG10 (scan code 240), seen in a key capture
            KeyEvent.KEYCODE_BUTTON_4, // other Google TV remotes (`0x000c0078 BUTTON_4 #Netflix` key layouts)
        )
    }
}
