package com.fieldtrack.employee.network

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json

object SupabaseClient {
    private var url: String = ""
    private var anonKey: String = ""

    val httpClient by lazy {
        HttpClient(CIO) {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true })
            }
        }
    }

    fun init(url: String, anonKey: String) {
        this.url = url
        this.anonKey = anonKey
    }

    fun getUrl() = url
    fun getAnonKey() = anonKey
    fun getFunctionUrl(slug: String) = "$url/functions/v1/$slug"
}
