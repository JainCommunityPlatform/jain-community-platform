package com.nipun.jcp

import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import io.flutter.embedding.android.FlutterActivity
import java.security.MessageDigest

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        logSigningCertificateSha1()
    }

    private fun logSigningCertificateSha1() {
        try {
            val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val packageInfo = packageManager.getPackageInfo(
                    packageName,
                    PackageManager.GET_SIGNING_CERTIFICATES,
                )
                packageInfo.signingInfo?.apkContentsSigners.orEmpty()
            } else {
                @Suppress("DEPRECATION")
                packageManager.getPackageInfo(
                    packageName,
                    PackageManager.GET_SIGNATURES,
                ).signatures.orEmpty()
            }

            if (signatures.isEmpty()) {
                Log.w(TAG, "JCP_SIGNING: no signing certificate found for $packageName")
                return
            }

            signatures.forEachIndexed { index, signature ->
                val sha1 = MessageDigest.getInstance("SHA-1")
                    .digest(signature.toByteArray())
                    .joinToString(":") { byte -> "%02X".format(byte.toInt() and 0xFF) }

                Log.i(TAG, "JCP_SIGNING: package=$packageName signerIndex=$index SHA1=$sha1")
            }
        } catch (error: Exception) {
            Log.e(TAG, "JCP_SIGNING: failed to read signing certificate", error)
        }
    }

    private companion object {
        const val TAG = "MyJinalayAuth"
    }
}
