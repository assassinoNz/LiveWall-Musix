//@ts-check
import { NowPlayingController } from "./NowPlayingController.js";
import { Utility } from "./Utility.js";

export class PlaybackController {
    cardInterface = null;

    //NOTE: RemotePlay mirrors all the activity of the master device in all the slave devices
    remotePlay = false;
    relativeTrackPositions = {
        previous: {
            playlistIndex: -1, trackIndex: -1
        },
        current: {
            playlistIndex: -1, trackIndex: -1
        },
        next: {
            playlistIndex: -1, trackIndex: -1
        }
    };

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
            localStorage.setItem("currentVolume", "1");
        }

        //Add eventListeners to the mediaController and seekSlider
        this.mediaController.addEventListener("loadstart", () => {
            //Remove ability to seek
            NowPlayingController.setState("playback", false);
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
        this.loadTrack({ playlistIndex: 0, trackIndex: 0 }, false);
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

    toggleRemoteOnly() {
        if (this.remoteOnly) {
            //CASE: RemoteOnly is enabled
            this.setRemoteOnly(false);
        } else {
            //CASE: RemoteOnly is disabled
            this.setRemoteOnly(true);
        }
    }

    setRelativeTrackPositions(trackPositions) {
        this.relativeTrackPositions.previous = trackPositions.previous;
        this.relativeTrackPositions.next = trackPositions.next;
    }

    getRelativeTrackPositions() {
        return this.relativeTrackPositions;
    }

    seekTo(time) {
        this.mediaController.currentTime = time;

        //Update UI
        // NowPlayingController.updateViewSection("position", [this.mediaController.duration, this.mediaController.playbackRate, this.mediaController.currentTime]);
    }

    setPlayback(playback) {
        //NOTE: Vibration is needed only when there is a playback state change
        if (playback && this.mediaController.paused) {
            this.mediaController.play();
            navigator.vibrate(100);
        } else if (!playback && !this.mediaController.paused) {
            this.mediaController.pause();
            navigator.vibrate(100);
        }
    }

    //BROADCASTABLE METHODS
    //WARNING: The volume will be changed in the master device regardless of the remotePlay mode
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

    loadTrack(trackPosition, autoplay) {
        if (this.remotePlay) {
            //CASE: RemotePlay is enabled
            this.cardInterface.getWebSocket().emit("broadcast-event", {
                eventName: "remote-load-track",
                trackPosition: trackPosition,
                autoplay: autoplay
            });
        } else {
            //NOTE: Only set the playlist styling when the playlist differs from the current playlist
            if (this.relativeTrackPositions.current.playlistIndex !== trackPosition.playlistIndex) {
                //Update UI
                NowPlayingController.updateViewSection("playlist", trackPosition.playlistIndex);
            }

            //CASE: RemotePlay is disabled
            this.relativeTrackPositions.previous = this.cardInterface.getController("musicSource").queryRelativeTrackPosition(trackPosition, "previous");
            this.relativeTrackPositions.current = trackPosition;
            this.relativeTrackPositions.next = this.cardInterface.getController("musicSource").queryRelativeTrackPosition(trackPosition, "next");
            
            const track = this.cardInterface.getController("musicSource").getTrackAt(trackPosition);
            
            //Update mediaController
            this.cardInterface.getController("musicSource").determineTrackUrl(trackPosition).then((trackUrl) => {
                this.mediaController.autoplay = autoplay;
                this.mediaController.src = trackUrl;
                this.mediaController.currentTime = 0;
            });
    
            //Calculate media metadata
            const mediaMetadata = {
                title: track.title,
                artist: track.artist,
                album: this.cardInterface.getController("musicSource").getPlaylistAt(trackPosition.playlistIndex).name
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
            localStorage.setItem(this.cardInterface.getController("musicSource").getPlaylistAt(trackPosition.playlistIndex).name, trackPosition.trackIndex.toString());
    
            //Update UI
            NowPlayingController.updateViewSection("track", mediaMetadata);
            // NowPlayingController.updateViewSection("position", [this.mediaController.duration, this.mediaController.playbackRate, this.mediaController.currentTime]);
        }
    }

    togglePlay() {
        if (this.remotePlay) {
            //CASE: RemotePlay is enabled
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
        if (this.remotePlay) {
            //CASE: RemotePlay is enabled
            this.cardInterface.getWebSocket().emit("broadcast-event", {
                eventName: "remote-skip-track",
                direction: direction
            });
        } else {
            if (direction === "next") {
                this.loadTrack(this.relativeTrackPositions.next, true);
            } else if (direction === "previous") {
                this.loadTrack(this.relativeTrackPositions.previous, true);
            }
    
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
            NowPlayingController.updateViewSection("time", [this.mediaController.duration, seekedTime, ...Utility.formatTime(this.mediaController.currentTime)]);
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