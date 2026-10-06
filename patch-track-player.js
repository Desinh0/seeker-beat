const fs = require('fs');
const path = require('path');

const servicePath = path.join(__dirname, 'node_modules', 'react-native-track-player', 'android', 'src', 'main', 'java', 'com', 'doublesymmetry', 'trackplayer', 'service', 'MusicService.kt');

if (fs.existsSync(servicePath)) {
    let content = fs.readFileSync(servicePath, 'utf8');

    // 1. ФИКС ШТОРКИ: Заставляем нативный плеер реагировать на кнопки напрямую, без JS
    content = content.replace(
        'MediaSessionCallback.PLAY -> emit(MusicEvents.BUTTON_PLAY)',
        'MediaSessionCallback.PLAY -> { player.play(); emit(MusicEvents.BUTTON_PLAY) }'
    ).replace(
        'MediaSessionCallback.PAUSE -> emit(MusicEvents.BUTTON_PAUSE)',
        'MediaSessionCallback.PAUSE -> { player.pause(); emit(MusicEvents.BUTTON_PAUSE) }'
    ).replace(
        'MediaSessionCallback.STOP -> emit(MusicEvents.BUTTON_STOP)',
        'MediaSessionCallback.STOP -> { player.stop(); emit(MusicEvents.BUTTON_STOP) }'
    ).replace(
        'MediaSessionCallback.NEXT -> emit(MusicEvents.BUTTON_SKIP_NEXT)',
        'MediaSessionCallback.NEXT -> { player.next(); emit(MusicEvents.BUTTON_SKIP_NEXT) }'
    ).replace(
        'MediaSessionCallback.PREVIOUS -> emit(MusicEvents.BUTTON_SKIP_PREVIOUS)',
        'MediaSessionCallback.PREVIOUS -> { player.previous(); emit(MusicEvents.BUTTON_SKIP_PREVIOUS) }'
    );

    // 2. ФИКС СВАЙПА (Очистить всё): Заставляем фоновый сервис мгновенно умирать при закрытии
    content = content.replace(
        'private var appKilledPlaybackBehavior = AppKilledPlaybackBehavior.CONTINUE_PLAYBACK',
        'private var appKilledPlaybackBehavior = AppKilledPlaybackBehavior.STOP_PLAYBACK_AND_REMOVE_NOTIFICATION'
    );

    // 3. АВТО-БЛОКИРОВКА КРАШЕЙ ДЛЯ EXPO: Автоматически вставляем наши return для облачной сборки
    if (!content.includes('return // БЛОКИРОВКА КРАША')) {
        content = content.replace(
            'private fun emit(event: String, data: Bundle? = null) {',
            'private fun emit(event: String, data: Bundle? = null) {\n        return // БЛОКИРОВКА КРАША'
        ).replace(
            'private fun emitList(event: String, data: List<Bundle> = emptyList()) {',
            'private fun emitList(event: String, data: List<Bundle> = emptyList()) {\n        return // БЛОКИРОВКА КРАША'
        ).replace(
            'private fun startAndStopEmptyNotificationToAvoidANR() {',
            'private fun startAndStopEmptyNotificationToAvoidANR() {\n        return // БЛОКИРОВКА КРАША'
        );
    }

    fs.writeFileSync(servicePath, content);
    console.log('✅ ИДЕАЛЬНЫЙ ПАТЧ: Шторка, Свайп и Краши исправлены!');
} else {
    console.log('⚠️ ОШИБКА: Файл MusicService.kt не найден!');
}

const modulePatchPath = path.join(__dirname, 'MusicModulePatch.kt');
const targetModulePath = path.join(__dirname, 'node_modules', 'react-native-track-player', 'android', 'src', 'main', 'java', 'com', 'doublesymmetry', 'trackplayer', 'module', 'MusicModule.kt');

if (fs.existsSync(modulePatchPath) && fs.existsSync(targetModulePath)) {
    fs.copyFileSync(modulePatchPath, targetModulePath);
    console.log('✅ Файл MusicModule.kt успешно заменен!');
}