//@ts-check
var playlists = [];
var currentPlaylistIndex = 0;
var currentTrackIndex = 0;
var mediaController = null;

function main() {
    window.socket = io("/musix");

    var xhr = new XMLHttpRequest();
    xhr.addEventListener("load", function () {
        playlists = JSON.parse(this.responseText);
    });
    xhr.open("GET", "/musix/playlists");
    xhr.send();

    mediaController = document.getElementById("mediaController");
    mediaController.addEventListener("ended", function () {
        skipTrack("next");
    });

    window.socket.on("remote-set-volume", function (params) {
        setVolume(params.volume);
    });

    window.socket.on("remote-load-track", function (params) {
        loadTrack(params.trackPosition, params.autoplay);
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

function loadTrack(trackPosition, autoplay) {
    //NOTE: Because the current directory is http://hostname/layouts/, going to parent directory is needed to load audio files
    mediaController.src = "/musix/" + playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex].path;
    currentTrackIndex = trackPosition.trackIndex;
    document.getElementById("trackDisplay").textContent = "TRACK: " + playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex].title;

    if (autoplay) {
        mediaController.play();
    }

    currentPlaylistIndex = trackPosition.playlistIndex;
    currentTrackIndex = trackPosition.trackIndex;
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
    const upcomingTrackPosition = this.cardInterface.getController("musicSource").queryRelativeTrackPosition(direction);

    this.loadTrack(upcomingTrackPosition, true);
}

function queryRelativePlaylistPosition(relativity) {
    if (relativity === "next") {
        if (currentPlaylistIndex === this.playlists.length) {
            //CASE: Current playlist is the last playlist
            return 0;
        } else {
            //CASE: Current playlist is not the last playlist
            return currentPlaylistIndex + 1;
        }
    } else if (relativity === "previous") {
        if (currentPlaylistIndex === 0) {
            //CASE: Current playlist is the first playlist
            return this.playlists.length - 1;
        } else {
            //CASE: Current playlist is not the first playlist
            return currentPlaylistIndex - 1;
        }
    }
}

function queryRelativeTrackPosition(relativity) {
    const currentPlaylist = this.playlists[currentPlaylistIndex];

    const upcomingTrackPosition = {
        playlistIndex: -1,
        trackIndex: -1
    };

    if (relativity === "next") {
        if (currentTrackIndex === currentPlaylist.tracks.length - 1) {
            //CASE: Now playing is the final track;
            upcomingTrackPosition.playlistIndex = this.queryRelativePlaylistPosition(relativity);
            upcomingTrackPosition.trackIndex = 0;
        } else {
            //CASE: Now playing is not the final track
            upcomingTrackPosition.playlistIndex = currentPlaylistIndex;
            upcomingTrackPosition.trackIndex = currentTrackIndex + 1;
        }
    } else if (relativity === "previous") {
        if (currentTrackIndex === 0) {
            //CASE: Now playing is the first track
            upcomingTrackPosition.playlistIndex = this.queryRelativePlaylistPosition(relativity);
            upcomingTrackPosition.trackIndex = this.playlists[upcomingTrackPosition.playlistIndex].tracks.length - 1;
        } else {
            //CASE: Now playing is not the first track
            upcomingTrackPosition.playlistIndex = currentPlaylistIndex;
            upcomingTrackPosition.trackIndex = currentTrackIndex - 1;
        }
    }

    return upcomingTrackPosition;
}