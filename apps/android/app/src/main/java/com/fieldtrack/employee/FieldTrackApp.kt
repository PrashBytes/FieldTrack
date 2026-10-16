package com.fieldtrack.employee

import android.app.Application
import com.fieldtrack.employee.data.AppDatabase
import com.fieldtrack.employee.network.SupabaseClient

class FieldTrackApp : Application() {

    companion object {
        lateinit var instance: FieldTrackApp
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        AppDatabase.getInstance(this)
        SupabaseClient.init(
            url = BuildConfig.SUPABASE_URL,
            anonKey = BuildConfig.SUPABASE_ANON_KEY
        )
    }
}
