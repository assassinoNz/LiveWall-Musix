//@ts-check
import { NowPlayingController } from "./NowPlayingController.js";
import { Utility } from "./Utility.js";

export class PlaybackController {
    cardInterface = null;
    remotePlay = false;
    remoteOnly = false;
    playlist = {};
    boundedHandlers = {
        startSeek: this.startSeek.bind(this),
        handleTimeUpdate: this.handleTimeUpdate.bind(this)
    };

    mediaController = null;

    constructor(cardInterface, mediaController) {
        this.cardInterface = cardInterface;

        this.mediaController = mediaController;

        //Initiate localStorage if not exist
        if (!localStorage.getItem("hasPlaybackState")) {
            //CASE: Doesn't have a playback state
            //Playback state parameters must be initialized
            localStorage.setItem("hasPlaybackState", "true");
            localStorage.setItem("currentPlaylistIndex", "0");
            localStorage.setItem("currentTrackIndex", "0");
            localStorage.setItem("currentVolume", "0.5");
        }
        if (parseInt(localStorage.getItem("currentPlaylistIndex")) >= this.cardInterface.getController("musicSource").getPlaylists().length) {
            //CASE: User had a custom playlist in the previous session
            //Current playlistIndex, trackIndex and trackTime must be reset because there is no quickPlaylist in this session and we cannot continue it
            //Choose a random playlistIndex as currentPlaylistIndex
            localStorage.setItem("currentPlaylistIndex", Utility.getRandInt(0, this.cardInterface.getController("musicSource").getPlaylists().length).toString());
            localStorage.setItem("currentTrackIndex", "0");
        }
        //NOTE: quickPlaylistIndex must always be -1 in the beginning
        localStorage.setItem("quickPlaylistIndex", "-1");

        //Add eventListeners to the mediaController and seekSlider
        this.mediaController.addEventListener("loadstart", () => {
            //Remove ability to seek
            NowPlayingController.seekSlider.removeEventListener("pointerdown", this.boundedHandlers.startSeek);
        });
        this.mediaController.addEventListener("canplay", () => {
            //Add ability to seek
            NowPlayingController.seekSlider.addEventListener("pointerdown", this.boundedHandlers.startSeek);
        });
        //Add onplay to mediaController for displaying current state on navigationControl
        this.mediaController.addEventListener("play", () => {
            NowPlayingController.setState("playback", true);
            navigator.mediaSession.playbackState = "playing";
        });
        //Add ontimeupdate to mediaController for updating state and UI
        this.mediaController.addEventListener("timeupdate", this.boundedHandlers.handleTimeUpdate);
        //Add onwaiting to mediaController
        this.mediaController.addEventListener("waiting", () => {
            //Remove ability to seek
            NowPlayingController.seekSlider.removeEventListener("pointerdown", this.boundedHandlers.startSeek);
        });
        //Add onplay to mediaController for displaying current state on navigationControl
        this.mediaController.addEventListener("pause", () => {
            NowPlayingController.setState("playback", false);
            navigator.mediaSession.playbackState = "paused";
        });
        //Add onended to mediaController for playing next track
        this.mediaController.addEventListener("ended", () => {
            this.skipTrack("next");
        });

        //Reinstate mediaController to last position
        this.setVolume(parseFloat(localStorage.getItem("currentVolume")));
        this.setPlaylist(this.cardInterface.getController("musicSource").getPlaylistAt(parseInt(localStorage.getItem("currentPlaylistIndex"))));
        this.loadTrackAt(parseInt(localStorage.getItem("currentTrackIndex")), false);
    }

    setRemotePlay(remotePlay) {
        this.remotePlay = remotePlay;

        if (remotePlay) {
            //CASE: Enable RemotePlay on this client
            //Disable RemotePlay on all other clients
            this.cardInterface.getWebSocket().emit("broadcast-event", {
                eventName: "remote-disable"
            });
        } else {
            //CASE: Disable RemotePlay on this client
            //Also disable RemoteOnly mode
            this.setRemoteOnly(false);
        }

        //Update UI
        NowPlayingController.setState("remotePlay", remotePlay);

        navigator.vibrate(100);
    }

    isRemotePlay() {
        return this.remotePlay;
    }

    toggleRemotePlay() {
        if (this.remotePlay) {
            //CASE: RemotePlay is enabled
            this.setRemotePlay(false);
        } else {
            //CASE: RemotePlay is disabled
            this.setRemotePlay(true);
        }
    }

    setRemoteOnly(remoteOnly) {
        this.remoteOnly = remoteOnly;

        //NOTE: RemotePlay must be enabled along with RemoteOnly
        if (remoteOnly) {
            this.setRemotePlay(true);
        }

        NowPlayingController.updateViewSection("remoteOnly", remoteOnly);
    }

    toggleRemoteOnly() {
        if (this.remoteOnly) {
            //CASE: RemoteOnly is enabled
            this.setRemoteOnly(false);
        } else {
            //CASE: RemoteOnly is disabled
            this.setRemoteOnly(true);
        }
    }

    setVolume(volume) {
        if (this.remotePlay) {
            //CASE: RemotePlay is enabled
            this.cardInterface.getWebSocket().emit("broadcast-event", {
                eventName: "remote-set-volume",
                volume: volume
            });
        }

        this.mediaController.volume = volume;

        //Update playback state
        localStorage.setItem("currentVolume", volume.toString());

        //Update UI
        NowPlayingController.updateViewSection("volume", [1, volume]);
    }

    setPlayback(playback) {
        if (this.remotePlay) {
            //CASE: Only RemotePlay is enabled
            //Since we want to mirror our playback state to client, manually set the playback state
            //NOTE: If the client is already on the playback state it will be ignored
            this.cardInterface.getWebSocket().emit("broadcast-event", {
                eventName: "remote-set-playback",
                playback: playback
            });
        }

        //NOTE: Setting playback locally must be ignored when RemoteOnly is enabled
        if (!this.remoteOnly) {
            //CASE: RemoteOnly is disabled
            //NOTE: Vibration is needed only when there is a playback state change
            if (playback && this.mediaController.paused) {
                this.mediaController.play();
                navigator.vibrate(100);
            } else if (!playback && !this.mediaController.paused) {
                this.mediaController.pause();
                navigator.vibrate(100);
            }
        }
    }

    setPlaylist(playlist) {
        if (this.remotePlay) {
            //CASE: RemotePlay is enabled
            this.cardInterface.getWebSocket().emit("broadcast-event", {
                eventName: "remote-set-playlist",
                playlist: playlist
            });
        }

        //NOTE: Setting playlist locally must be ignored when RemoteOnly is enabled
        if (!this.remoteOnly) {
            //CASE: RemoteOnly is disabled
            this.playlist = playlist;
    
            //Update playback state
            localStorage.setItem("currentPlaylistIndex", playlist.index.toString());
    
            //Update UI
            NowPlayingController.updateViewSection("playlist", playlist);
        }
    }

    loadTrackAt(trackIndex, autoplay) {
        if (this.remotePlay) {
            //CASE: RemotePlay is enabled
            this.cardInterface.getWebSocket().emit("broadcast-event", {
                eventName: "remote-load-track-at",
                trackIndex: trackIndex,
                autoplay: autoplay
            });
        }

        //NOTE: Loading tracks locally must be ignored when RemoteOnly is enabled
        if (!this.remoteOnly) {
            //CASE: RemoteOnly is disabled
            const track = this.playlist.tracks[trackIndex];

            //Request lyrics if a URI is present
            // const lyricsDisplay = this.view.querySelector("#lyricsDisplay");
            // lyricsDisplay.scrollTo(0, 0);
            // if (track.lyricsFileName) {
            //     fetch(`/musix/lyrics/${encodeURIComponent(track.lyricsFileName)}`)
            //         .then(response => response.json())
            //         .then(data => {
            //             for (let i = 0; i < data.blocks.length; i++) {
            //                 if (data.blocks[i][0].startsWith("Chorus") || data.blocks[i][0].startsWith("(x")) {
            //                     data.blocks[i][0] = `<span style="color: var(--themeColor)">${data.blocks[i][0]}</span>`;
            //                 }
            //                 data.blocks[i] = data.blocks[i].join("<br />");
            //             }
            //             lyricsDisplay.innerHTML = data.blocks.join("<br /><br />");
            //         })
            //         .catch(() => {
            //             lyricsDisplay.innerHTML = '<span style="color: var(--themeColor)">Aw! Snap</span><br />Couldn\'t connect with the server';
            //         });
            // } else {
            //     lyricsDisplay.innerHTML = "";
            // }

            //Update mediaController
            this.cardInterface.getController("musicSource").determineTrackUrl(track).then((trackUrl) => {
                this.mediaController.src = trackUrl;
                this.mediaController.currentTime = 0;

                if (autoplay) {
                    this.mediaController.play();
                }
            });

            //Calculate media metadata
            const mediaMetadata = {
                title: track.title,
                artist: track.artist,
                album: this.playlist.name
            };

            if (track.artist) {
                mediaMetadata.artist = track.artist;
            } else {
                mediaMetadata.artist = "Unknown Artist";
            }

            if (track.title) {
                mediaMetadata.title = track.title;
            } else {
                mediaMetadata.title = track.path.slice(track.path.lastIndexOf("/") + 1, track.path.lastIndexOf("."));
            }

            //Update playback state
            localStorage.setItem("currentTrackIndex", trackIndex.toString());
            localStorage.setItem(localStorage.getItem("currentPlaylistIndex"), trackIndex.toString());

            //Update UI
            NowPlayingController.updateViewSection("track", mediaMetadata);
            // NowPlayingController.updateViewSection("position", [this.mediaController.duration, this.mediaController.playbackRate, this.mediaController.currentTime]);
        }
    }

    seekTo(time) {
        if (this.remotePlay && !this.remoteOnly) {
            this.cardInterface.getWebSocket().emit("broadcast-event", {
                eventName: "remote-seek-to",
                time: time
            });
        }

        this.mediaController.currentTime = time;

        //Update UI
        // NowPlayingController.updateViewSection("position", [this.mediaController.duration, this.mediaController.playbackRate, this.mediaController.currentTime]);
    }

    togglePlay() {
        if (this.remotePlay && this.remoteOnly) {
            //CASE: Both RemotePlay and RemoteOnly is enabled
            //Since we don't know the remote client's playback state, let the remote client toggle it
            this.cardInterface.getWebSocket().emit("broadcast-event", {
                eventName: "remote-toggle-play"
            });
        } else {
            if (this.mediaController.paused) {
                this.setPlayback(true);
            } else {
                this.setPlayback(false);
            }
        }
    }

    skipTrack(direction) {
        if (this.remotePlay && this.remoteOnly) {
            //CASE: Both RemotePlay and RemoteOnly is enabled
            //Since we don't know the remote client's current track, let the remote client skip it
            this.cardInterface.getWebSocket().emit("broadcast-event", {
                eventName: "remote-skip-track",
                direction: direction
            });
        } else {
            const upcomingTrackPosition = this.cardInterface.getController("musicSource").queryRelativeTrackPosition(direction);
    
            if (upcomingTrackPosition.playlistIndex !== parseInt(localStorage.getItem("currentPlaylistIndex"))) {
                const playlist = this.cardInterface.getController("musicSource").getPlaylistAt(upcomingTrackPosition.playlistIndex);
                this.setPlaylist(playlist);
            }

            this.loadTrackAt(upcomingTrackPosition.trackIndex, true);

            navigator.vibrate(100);
        }
    }

    //EVENT HANDLER METHODS
    startSeek(event) {
        //NOTE: Seek isn't done in realtime. It is done as soon as the user leaves the seekSlider
        NowPlayingController.startSlide(event, () => {
            //Remove ontimeupdate from mediaController
            this.mediaController.removeEventListener("timeupdate", this.boundedHandlers.handleTimeUpdate);
        }, () => {
            //Update the seeked time
            const seekedTime = Utility.formatTime(Utility.getCircularSliderValue(NowPlayingController.seekSlider, this.mediaController.duration));
            NowPlayingController.updateViewSection("time", seekedTime);
        }, () => {
            const seekedTime = Utility.getCircularSliderValue(NowPlayingController.seekSlider, this.mediaController.duration);
            this.seekTo(seekedTime);
            this.mediaController.addEventListener("timeupdate", this.boundedHandlers.handleTimeUpdate);
        });
    }

    handleTimeUpdate() {
        //Update UI
        NowPlayingController.updateViewSection("time", [this.mediaController.duration, this.mediaController.currentTime, ...Utility.formatTime(this.mediaController.currentTime)]);
    }
}