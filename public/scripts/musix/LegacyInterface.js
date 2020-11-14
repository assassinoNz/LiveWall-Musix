//@ts-check
var currentPlaylist = {};
var currentTrackIndex = 0;
var mediaController = null;

function main() {
    window.socket = io("/musix");

    mediaController = document.getElementById("mediaController");
    mediaController.addEventListener("ended", function () {
        skipTrack("next");
    });

    window.socket.on("remote-set-volume", function (params) {
        setVolume(params.volume);
    });

    window.socket.on("remote-set-playlist", function (params) {
        setPlaylist(params.playlist);
    });

    window.socket.on("remote-load-track-at", function (params) {
        loadTrackAt(params.trackIndex, params.autoplay);
    });

    window.socket.on("remote-seek-to", function (params) {
        seekTo(params.time);
    });

    window.socket.on("remote-set-playback", function (params) {
        setPlayback(params.playback);
    });
}

function setVolume(volume) {
    mediaController.volume = volume;
    document.getElementById("volumeDisplay").textContent = "VOLUME: " + volume;
}

function setPlaylist(playlist) {
    currentPlaylist = playlist;
    document.getElementById("playlistDisplay").textContent = "PLAYLIST: " + playlist.name;
}

function loadTrackAt(trackIndex, autoplay) {
    //NOTE: Because the current directory is http://hostname/layouts/, going to parent directory is needed to load audio files
    mediaController.src = "/musix/" + currentPlaylist.tracks[trackIndex].path;
    currentTrackIndex = trackIndex;
    document.getElementById("trackDisplay").textContent = "TRACK: " + currentPlaylist.tracks[trackIndex].title;

    if (autoplay) {
        mediaController.play();
    }
}

function seekTo(time) {
    mediaController.currentTime = time;
}

function setPlayback(playback) {
    if (playback) {
        mediaController.play();
    } else {
        mediaController.pause();
    }
}

function skipTrack(direction) {
    if (direction === "next") {
        if (currentTrackIndex === currentPlaylist.tracks.length - 1) {
            loadTrackAt(0, true);
        } else {
            loadTrackAt(currentTrackIndex + 1, true);
        }
    } else if (direction === "previous") {
        if (currentTrackIndex === 0) {
            loadTrackAt(currentPlaylist.tracks.length - 1, true);
        } else {
            loadTrackAt(currentTrackIndex - 1, true);
        }
    }
}