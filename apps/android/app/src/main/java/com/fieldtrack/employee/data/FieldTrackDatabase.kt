package com.fieldtrack.employee.data

import android.content.Context

/**
 * Backward-compatible facade for AppDatabase.
 */
object FieldTrackDatabase {
    fun getInstance(context: Context): AppDatabase = AppDatabase.getInstance(context)
    fun get(): AppDatabase = AppDatabase.getInstance(com.fieldtrack.employee.FieldTrackApp.instance)
    fun init(context: Context) {
        AppDatabase.getInstance(context)
    }
}
