package com.fieldtrack.employee

import android.app.Application
import com.fieldtrack.employee.data.FieldTrackDatabase
import com.fieldtrack.employee.network.SupabaseClient

class FieldTrackApp : Application() {
    override fun onCreate() {
        super.onCreate()
        FieldTrackDatabase.init(this)
        SupabaseClient.init(
            url = BuildConfig.SUPABASE_URL,
            anonKey = BuildConfig.SUPABASE_ANON_KEY
        )
    }
}
