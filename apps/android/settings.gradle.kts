pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradle()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "FieldTrack"
include(":app")
